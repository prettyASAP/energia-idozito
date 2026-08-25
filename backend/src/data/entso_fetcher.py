import os
import logging
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
import pandas as pd
from datetime import datetime, timedelta, timezone
from typing import Optional

logger = logging.getLogger(__name__)

HUNGARY_ZONE = "10YHU-MAVIR----U"
ENTSOE_API_URL = "https://web-api.tp.entsoe.eu/api"

try:
    from entsoe import EntsoePandasClient
    ENTSOE_AVAILABLE = True
except ImportError:
    ENTSOE_AVAILABLE = False


def _fetch_energy_charts(start: datetime, end: datetime) -> pd.Series:
    """
    Day-ahead árak az energy-charts.info API-ról (Fraunhofer ISE).
    Kulcs nélküli, CC BY 4.0 licencű forrás — adat: Bundesnetzagentur | SMARD.de.
    15 perces felbontású választ ad, óránkénti átlagra resample-öljük.
    """
    import json

    url = (
        "https://api.energy-charts.info/price?bzn=HU"
        f"&start={urllib.parse.quote(start.isoformat(timespec='minutes'))}"
        f"&end={urllib.parse.quote(end.isoformat(timespec='minutes'))}"
    )
    with urllib.request.urlopen(url, timeout=15) as r:
        data = json.loads(r.read().decode("utf-8"))

    ts_list = data.get("unix_seconds") or []
    pr_list = data.get("price") or []
    prices = {
        pd.Timestamp(t, unit="s", tz="UTC").tz_convert("Europe/Budapest"): p
        for t, p in zip(ts_list, pr_list)
        if p is not None
    }
    if not prices:
        return pd.Series(dtype=float, name="price_eur_mwh")

    series = pd.Series(prices, name="price_eur_mwh").sort_index()
    if len(series) > 1 and (series.index[1] - series.index[0]) < pd.Timedelta("1h"):
        series = series.resample("1h").mean().dropna()
        series.name = "price_eur_mwh"
    return series


def _fetch_raw_xml(key: str, start: datetime, end: datetime) -> str:
    """Nyers XML lekérése az ENTSO-E API-tól."""
    fmt = "%Y%m%d%H%M"
    period_start = start.strftime(fmt)
    period_end = end.strftime(fmt)
    url = (
        f"{ENTSOE_API_URL}"
        f"?securityToken={key}"
        f"&documentType=A44"
        f"&in_Domain={HUNGARY_ZONE}"
        f"&out_Domain={HUNGARY_ZONE}"
        f"&periodStart={period_start}"
        f"&periodEnd={period_end}"
    )
    with urllib.request.urlopen(url, timeout=15) as r:
        return r.read().decode("utf-8")


def _parse_prices(xml_text: str) -> pd.Series:
    """XML válasz feldolgozása óránkénti ársorozattá."""
    NS = {
        "ns": "urn:iec62325.351:tc57wg16:451-3:publicationdocument:7:3"
    }
    root = ET.fromstring(xml_text)

    # Hibakód ellenőrzés
    reason = root.find(".//ns:Reason/ns:text", NS)
    if reason is not None and "No matching data found" in reason.text:
        return pd.Series(dtype=float, name="price_eur_mwh")

    prices = {}
    for ts_elem in root.findall(".//ns:TimeSeries", NS):
        period = ts_elem.find("ns:Period", NS)
        if period is None:
            continue
        start_str = period.find("ns:timeInterval/ns:start", NS).text
        resolution = period.find("ns:resolution", NS).text  # pl. "PT60M"
        minutes = int(resolution.replace("PT", "").replace("M", ""))

        # Start időpont parse
        start_dt = pd.Timestamp(start_str).tz_convert("Europe/Budapest")

        for pt in period.findall("ns:Point", NS):
            pos = int(pt.find("ns:position", NS).text)
            price = float(pt.find("ns:price.amount", NS).text)
            ts = start_dt + pd.Timedelta(minutes=minutes * (pos - 1))
            prices[ts] = price

    if not prices:
        return pd.Series(dtype=float, name="price_eur_mwh")

    series = pd.Series(prices, name="price_eur_mwh").sort_index()
    return series


def fetch_eur_huf_rate() -> float:
    """Lekéri az aktuális EUR/HUF árfolyamot az EKB-tól."""
    try:
        url = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml"
        with urllib.request.urlopen(url, timeout=5) as r:
            tree = ET.parse(r)
        ns = {"ecb": "http://www.ecb.int/vocabulary/2002-08-01/eurofxref"}
        for cube in tree.findall(".//ecb:Cube[@currency='HUF']", ns):
            rate = float(cube.attrib["rate"])
            logger.info(f"EUR/HUF árfolyam (EKB): {rate}")
            return rate
    except Exception as e:
        logger.warning(f"EUR/HUF lekérés sikertelen, 395.0 használata: {e}")
    return 395.0


def fetch_day_ahead_prices(
    start: datetime,
    end: datetime,
    api_key: Optional[str] = None,
) -> pd.Series:
    """
    Lekéri a magyarországi day-ahead áramárakat EUR/MWh-ban.
    Források: energy-charts.info (elsődleges), ENTSO-E (fallback). Hibánál üres sorozat.
    """
    key = api_key or os.getenv("ENTSOE_API_KEY", "")

    # Elsődleges forrás: energy-charts.info (nem igényel API kulcsot)
    try:
        series = _fetch_energy_charts(start, end)
        if not series.empty:
            logger.info(
                f"energy-charts.info valódi adatok: {len(series)} óránkénti adatpont, "
                f"{series.index[0]} – {series.index[-1]}"
            )
            return series
        logger.warning("energy-charts.info: üres válasz, ENTSO-E-re visszaállás.")
    except Exception as e:
        logger.warning(f"energy-charts.info hiba ({type(e).__name__}: {e}), ENTSO-E-re visszaállás.")

    if not key:
        logger.error("Nincs ENTSO-E kulcs és az energy-charts.info sem elérhető — nincs áradat.")
        return pd.Series(dtype=float, name="price_eur_mwh")

    try:
        # UTC-ben adjuk meg a dátumokat
        start_utc = start.replace(minute=0, second=0, microsecond=0)
        end_utc = end.replace(minute=0, second=0, microsecond=0)

        xml_text = _fetch_raw_xml(key, start_utc, end_utc)
        series = _parse_prices(xml_text)

        if series.empty:
            logger.warning("ENTSO-E: üres válasz — nincs áradat.")
            return series

        # 15 perces adatok → óránkénti átlag
        if len(series) > 1:
            delta = series.index[1] - series.index[0]
            if delta < pd.Timedelta("1h"):
                series = series.resample("1h").mean().dropna()
                series.name = "price_eur_mwh"
                logger.info("15 perces → óránkénti resample elvégezve.")

        logger.info(
            f"ENTSO-E valódi adatok: {len(series)} óránkénti adatpont, "
            f"{series.index[0]} – {series.index[-1]}"
        )
        return series

    except Exception as e:
        logger.error(f"ENTSO-E API hiba ({type(e).__name__}: {e}) — nincs áradat.")
        return pd.Series(dtype=float, name="price_eur_mwh")
