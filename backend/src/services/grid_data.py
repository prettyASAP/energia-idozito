"""
Magyar villamosenergia-rendszer adatok a MAVIR nyilvános RTDW exportjából.

A MAVIR (rtdwweb.mavir.hu) chart-export végpontja nyilvános, auth nélkül
elérhető XLSX exportokat ad minden grafikonhoz:

    GET https://rtdwweb.mavir.hu/rtdwweb/webuser/chart/{chart_id}/export
        ?exportType=xlsx&fromTime={epoch_ms}&toTime={epoch_ms}
        &periodType=min&period=15

Használt chart azonosítók:
    7678  – Rendszerterhelés (bruttó/nettó tény, terv, dayahead becslés)
    9404  – Bruttó termelés energiaforrás szerint (14 kategória)
    11838 – Naperőművek (tény + aktuális/intraday/dayahead becslés)
    11840 – Szélerőművek (tény + aktuális/intraday/dayahead becslés)
    5229  – Határkeresztező fizikai áramlások + menetrendek (HU-XX)

Megjegyzések:
    - A MAVIR ~1 kérés / 2,5 mp fölött 429-et ad, ezért a kimenő kérések
      között minimum térközt tartunk.
    - Az rtdwweb SSL tanúsítványlánca hiányos, ezért a tanúsítvány-ellenőrzés
      ki van kapcsolva (nyilvános, csak olvasható adat).
    - Minden lekérés memóriában cache-elődik (TTL: 15 perc).
"""

import io
import ssl
import time
import logging
import threading
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from typing import Optional

logger = logging.getLogger(__name__)

MAVIR_CHART_URL = "https://rtdwweb.mavir.hu/rtdwweb/webuser/chart/{chart_id}/export"

CHART_LOAD = 7678
CHART_GENERATION_MIX = 9404
CHART_SOLAR = 11838
CHART_WIND = 11840
CHART_CROSSBORDER = 5229

CACHE_TTL_SECONDS = 15 * 60  # 15 perc
FETCH_TIMEOUT_SECONDS = 30
MIN_REQUEST_GAP_SECONDS = 2.5  # MAVIR throttle: ~1 kérés / 2,5 mp

# Energiaforrás oszlopok (chart 9404): magyar fejléc -> API kulcs
FUEL_COLUMNS = {
    "Nukleáris erőművek": "nuclear",
    "Barnakőszén-lignit erőművek": "lignite",
    "Gáz (fosszilis) erőművek": "gas",
    "Feketekőszén erőművek": "hard_coal",
    "Olaj (fosszilis) erőművek": "oil",
    "Szárazföldi szélerőművek": "wind",
    "Biomassza erőművek": "biomass",
    "Ipari PV": "solar_pv",
    "Szemétégető erőművek": "waste",
    "Folyóvizes erőművek": "hydro_run_of_river",
    "Víztározós vízerőművek": "hydro_reservoir",
    "Egyéb megújuló erőművek": "other_renewable",
    "Egyéb erőművek": "other",
}
RENEWABLE_FUELS = {
    "wind", "biomass", "solar_pv", "hydro_run_of_river",
    "hydro_reservoir", "other_renewable",
}

# Határmetszékek (chart 5229): "HU-XX" tény, "HU-XX menetrend" menetrend.
# Előjel-konvenció a MAVIR exportban: pozitív = import Magyarországra.
BORDER_COUNTRIES = ["AT", "SK", "UK", "RO", "RS", "HR", "SI"]

# ---------------------------------------------------------------------------
# Cache + kérés-ütemezés
# ---------------------------------------------------------------------------

_cache: dict = {}
_cache_lock = threading.Lock()
_last_fetch_ts = 0.0
_pace_lock = threading.Lock()

# A MAVIR rtdwweb szervere hiányos tanúsítványláncot küld, ezért a szigorú
# ellenőrzés jelenleg elbukik. Először mindig érvényes ellenőrzéssel próbálkozunk,
# és CSAK tanúsítványhiba esetén, KIZÁRÓLAG a rtdwweb.mavir.hu hostra esünk
# vissza ellenőrzés nélküli kapcsolatra (nyilvános, csak olvasható adat).
_ssl_ctx_verified = ssl.create_default_context()
_ssl_ctx_insecure = ssl.create_default_context()
_ssl_ctx_insecure.check_hostname = False
_ssl_ctx_insecure.verify_mode = ssl.CERT_NONE

_MAVIR_HOST = "rtdwweb.mavir.hu"


def _open_mavir(req: urllib.request.Request, timeout: float):
    """Verify-first HTTPS: érvényes lánccal próbál, cert-hibánál MAVIR-only fallback."""
    try:
        return urllib.request.urlopen(req, timeout=timeout, context=_ssl_ctx_verified)
    except urllib.error.URLError as e:
        is_cert_error = isinstance(getattr(e, "reason", None), ssl.SSLCertVerificationError)
        host = urllib.parse.urlparse(req.full_url).hostname
        if is_cert_error and host == _MAVIR_HOST:
            return urllib.request.urlopen(req, timeout=timeout, context=_ssl_ctx_insecure)
        raise


def _pace() -> None:
    """Minimum térköz tartása a kimenő MAVIR kérések között (429 elkerülése)."""
    global _last_fetch_ts
    with _pace_lock:
        gap = time.time() - _last_fetch_ts
        if gap < MIN_REQUEST_GAP_SECONDS:
            time.sleep(MIN_REQUEST_GAP_SECONDS - gap)
        _last_fetch_ts = time.time()


def _parse_mavir_timestamp(raw) -> Optional[str]:
    """'2026.08.25 12:15:00 +0200' -> ISO-8601 string."""
    try:
        dt = datetime.strptime(str(raw).strip(), "%Y.%m.%d %H:%M:%S %z")
        return dt.isoformat()
    except (ValueError, TypeError):
        return None


def _fetch_chart_rows(
    chart_id: int,
    hours_back: int = 12,
    hours_ahead: int = 24,
    period_minutes: int = 15,
) -> list:
    """
    Egy MAVIR chart letöltése és feldolgozása.

    Visszaad: [{"timestamp": iso_str, "<magyar oszlopnév>": float|None, ...}]
    időrendben. Cache-elt (TTL 15 perc), sikertelen frissítésnél a lejárt
    cache-t adja vissza, ha van.
    """
    now = datetime.now(timezone.utc)
    # Negyedórás rácsra igazítás, hogy a cache kulcs futások között stabil legyen
    now = now.replace(minute=now.minute - now.minute % 15, second=0, microsecond=0)
    cache_key = (chart_id, hours_back, hours_ahead, period_minutes)

    with _cache_lock:
        entry = _cache.get(cache_key)
        if entry and time.time() - entry["time"] < CACHE_TTL_SECONDS:
            return entry["rows"]

    from_ms = int((now - timedelta(hours=hours_back)).timestamp() * 1000)
    to_ms = int((now + timedelta(hours=hours_ahead)).timestamp() * 1000)
    url = MAVIR_CHART_URL.format(chart_id=chart_id) + "?" + urllib.parse.urlencode({
        "exportType": "xlsx",
        "fromTime": from_ms,
        "toTime": to_ms,
        "periodType": "min",
        "period": period_minutes,
    })

    try:
        _pace()
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (energia-app)"})
        with _open_mavir(req, FETCH_TIMEOUT_SECONDS) as resp:
            body = resp.read()
        if not body.startswith(b"PK"):
            raise RuntimeError("A válasz nem XLSX (hibás magic bytes)")

        import openpyxl  # helyi import — a betöltése nem olcsó
        wb = openpyxl.load_workbook(io.BytesIO(body), read_only=True, data_only=True)
        ws = wb.active
        row_iter = ws.iter_rows(values_only=True)
        headers = [str(h) if h is not None else "" for h in (next(row_iter, []) or [])]
        rows = []
        for row in row_iter:
            if not row:
                continue
            ts = _parse_mavir_timestamp(row[0])
            if ts is None:
                continue
            rec = {"timestamp": ts}
            for header, value in zip(headers[1:], row[1:]):
                if not header:
                    continue
                try:
                    rec[header] = None if value is None else float(value)
                except (TypeError, ValueError):
                    rec[header] = None
            rows.append(rec)
        wb.close()

        logger.info(f"MAVIR chart {chart_id}: {len(rows)} sor lekérve.")
        with _cache_lock:
            _cache[cache_key] = {"rows": rows, "time": time.time()}
        return rows

    except Exception as e:
        logger.error(f"MAVIR chart {chart_id} lekérés sikertelen: {type(e).__name__}: {e}")
        with _cache_lock:
            entry = _cache.get(cache_key)
            if entry:
                logger.info(f"MAVIR chart {chart_id}: lejárt cache használata.")
                return entry["rows"]
        raise


def _latest_value(rows: list, column: str) -> Optional[dict]:
    """A legfrissebb nem-null érték egy oszlopban: {timestamp, value}."""
    for rec in reversed(rows):
        val = rec.get(column)
        if val is not None:
            return {"timestamp": rec["timestamp"], "value": round(val, 1)}
    return None


def _series(rows: list, column: str) -> list:
    """Egy oszlop idősora: [{timestamp, value}] — a null értékek kihagyva."""
    return [
        {"timestamp": rec["timestamp"], "value": round(rec[column], 1)}
        for rec in rows
        if rec.get(column) is not None
    ]


# ---------------------------------------------------------------------------
# Publikus fetcherek — mindegyik kész API-válasz dict-et ad vissza
# ---------------------------------------------------------------------------


def fetch_system_load() -> dict:
    """Rendszerterhelés: tény + terv + dayahead becslés (chart 7678)."""
    rows = _fetch_chart_rows(CHART_LOAD)
    actual_col = "Bruttó tény rendszerterhelés"
    plan_col = "Bruttó terv rendszerterhelés"
    dayahead_col = "Bruttó rendszerterhelés becslés (dayahead)"
    net_actual_col = "Nettó rendszerterhelés tény - üzemirányítási"

    return {
        "available": True,
        "source": "MAVIR RTDW (chart 7678)",
        "unit": "MW",
        "latest": {
            "gross_actual": _latest_value(rows, actual_col),
            "net_actual": _latest_value(rows, net_actual_col),
        },
        "series": {
            "gross_actual": _series(rows, actual_col),
            "gross_plan": _series(rows, plan_col),
            "gross_dayahead_estimate": _series(rows, dayahead_col),
        },
    }


def fetch_renewables_forecast() -> dict:
    """Nap- és szélerőművi termelés: tény + becslések (chart 11838 + 11840)."""
    solar_rows = _fetch_chart_rows(CHART_SOLAR)
    wind_rows = _fetch_chart_rows(CHART_WIND)

    solar_actual_col = "Naperőművek nettó üzemirányítási"
    solar_current_fc_col = "Naperőművek becsült termelése (aktuális)"
    solar_dayahead_col = "Naperőművek becsült termelése (dayahead)"
    wind_actual_col = "Szélerőművek tény - nettó üzemirányítási"
    wind_current_fc_col = "Szélerőművek becsült termelése (aktuális)"
    wind_dayahead_col = "Szélerőművek becsült termelése (dayahead)"

    return {
        "available": True,
        "source": "MAVIR RTDW (chart 11838, 11840)",
        "unit": "MW",
        "solar": {
            "latest_actual": _latest_value(solar_rows, solar_actual_col),
            "series": {
                "actual": _series(solar_rows, solar_actual_col),
                "forecast_current": _series(solar_rows, solar_current_fc_col),
                "forecast_dayahead": _series(solar_rows, solar_dayahead_col),
            },
        },
        "wind": {
            "latest_actual": _latest_value(wind_rows, wind_actual_col),
            "series": {
                "actual": _series(wind_rows, wind_actual_col),
                "forecast_current": _series(wind_rows, wind_current_fc_col),
                "forecast_dayahead": _series(wind_rows, wind_dayahead_col),
            },
        },
    }


def fetch_crossborder_flows() -> dict:
    """
    Határkeresztező áramlások (chart 5229).

    Előjel: pozitív = import Magyarországra, negatív = export.
    A "menetrend" oszlopok előre is elérhetők, a tény csak visszamenőleg.
    """
    rows = _fetch_chart_rows(CHART_CROSSBORDER)

    borders = {}
    for cc in BORDER_COUNTRIES:
        actual = _latest_value(rows, f"HU-{cc}")
        # Az SI menetrend oszlop neve eltér: "HU-SI menetrend (RIR NT)"
        sched_col = f"HU-{cc} menetrend (RIR NT)" if cc == "SI" else f"HU-{cc} menetrend"
        scheduled = _latest_value(rows, sched_col)
        borders[cc] = {"actual": actual, "scheduled": scheduled}

    def _net(field: str) -> Optional[dict]:
        """Nettó import az utolsó olyan sorból, ahol minden határon van adat."""
        cols = {
            cc: (f"HU-{cc} menetrend (RIR NT)" if cc == "SI" else f"HU-{cc} menetrend")
            if field == "scheduled" else f"HU-{cc}"
            for cc in BORDER_COUNTRIES
        }
        for rec in reversed(rows):
            values = [rec.get(col) for col in cols.values()]
            if all(v is not None for v in values):
                return {"timestamp": rec["timestamp"], "value": round(sum(values), 1)}
        return None

    return {
        "available": True,
        "source": "MAVIR RTDW (chart 5229)",
        "unit": "MW",
        "sign_convention": "pozitív = import Magyarországra",
        "net_import": {
            "actual": _net("actual"),
            "scheduled": _net("scheduled"),
        },
        "borders": borders,
    }


def fetch_generation_mix() -> dict:
    """Bruttó termelés energiaforrás szerint + részarányok (chart 9404)."""
    rows = _fetch_chart_rows(CHART_GENERATION_MIX, hours_ahead=1)
    total_col = "Hazai termelés (erőművi szumma)"

    # Az utolsó sor, ahol a szumma nem null (a jövőbeli sorok üresek)
    latest = None
    for rec in reversed(rows):
        if rec.get(total_col) is not None:
            latest = rec
            break
    if latest is None:
        raise RuntimeError("Nincs termelési adat a MAVIR válaszban.")

    total = latest[total_col]
    mix = {}
    renewable_mw = 0.0
    for hu_col, key in FUEL_COLUMNS.items():
        mw = latest.get(hu_col)
        if mw is None:
            continue
        mix[key] = {
            "mw": round(mw, 1),
            "share_pct": round(mw / total * 100, 1) if total else None,
        }
        if key in RENEWABLE_FUELS:
            renewable_mw += mw

    return {
        "available": True,
        "source": "MAVIR RTDW (chart 9404)",
        "unit": "MW",
        "timestamp": latest["timestamp"],
        "total_mw": round(total, 1),
        "renewable_mw": round(renewable_mw, 1),
        "renewable_share_pct": round(renewable_mw / total * 100, 1) if total else None,
        "mix": mix,
    }
