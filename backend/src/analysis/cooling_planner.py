"""
Klíma hűtési terv: optimális hűtési ütemterv időjárás + villanyár alapján.

Stratégia:
  1. Azonosítja a "meleg ablakokat" (>= comfort_temp fokos időszakokat)
  2. Megkeresi az olcsó villanysávokat előtte
  3. "Előhűtési" ütemtervet javasol: olcsón betárol hideget, csúcsban kikapcsol
  4. Összehasonlítja a naiv (igény szerinti) és az okos (előhűtéses) stratégiát
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional


# Fizikai konstansok / alapértelmezések
COMFORT_TEMP_C       = 24.0   # fok felett kellemes a hűtés
PRECOOL_TEMP_TARGET  = 21.0   # előhűtéssel elérendő belső hőmérséklet
THERMAL_DRIFT_PER_H  = 1.2    # fok/óra, amennyit bemelegszik a lakás kikapcsolt AC mellett nyáron
COP_DEFAULT          = 3.5    # modern inverteres AC hatásfoka (hűtési teljesítmény / villany)
AC_POWER_KW_DEFAULT  = 2.0    # tipikus split klíma felvett teljesítménye


@dataclass
class HourlyPlan:
    timestamp: str
    local_time: str
    hour: int
    outdoor_temp_c: float
    apparent_temp_c: Optional[float]
    price_huf_kwh: float
    is_cheap: bool
    is_expensive: bool
    action: str          # "precool" | "run" | "coast" | "off"
    action_label: str
    action_detail: str
    ac_on: bool
    energy_kwh: float    # elfogyasztott villany az adott órában
    cost_huf: float      # ára ennek az órának
    naive_ac_on: bool    # naiv stratégia: AC megy ha meleg van
    naive_energy_kwh: float
    naive_cost_huf: float
    cop_actual: float = 3.5   # pillanatnyi COP a kültéri hőmérsékleten


@dataclass
class CoolingPlan:
    city_name: str
    lat: float
    lon: float
    ac_power_kw: float
    cop: float
    comfort_temp_c: float
    hours: list[HourlyPlan]
    smart_total_cost_huf: float
    naive_total_cost_huf: float
    saving_huf: float
    saving_pct: float
    smart_total_kwh: float
    naive_total_kwh: float
    precool_windows: list[dict]    # [{start, end, reason}]
    summary: str
    tip: str


def _cop_at_temp(cop_rated: float, outdoor_c: float) -> float:
    """
    Hőmérsékletfüggő COP korrekció inverteres split klímára.
    Empirikus közelítés: 35°C felett minden fokkal kb. 2,2%-ot romlik a hatásfok.
    Forrás: AHRI 210/240 mérési adatok, inverter AC részterhelés-korrekció.
    """
    return cop_rated * max(0.6, 1.0 - 0.022 * max(0.0, outdoor_c - 35.0))


def build_cooling_plan(
    weather_hours: list[dict],
    price_hours: list[dict],
    city_name: str,
    lat: float,
    lon: float,
    ac_power_kw: float = AC_POWER_KW_DEFAULT,
    cop: float = COP_DEFAULT,
    comfort_temp_c: float = COMFORT_TEMP_C,
) -> CoolingPlan:
    """
    Összeilleszti az időjárás és árjelzők alapján a hűtési tervet.

    weather_hours: [{timestamp, local_time, hour, temp_c, apparent_temp_c, ...}]
    price_hours:   [{timestamp, price_huf_kwh, is_cheap, is_expensive, ...}]
    """

    # Ár-index az időbélyeg első 13 karaktere alapján (óra pontossággal)
    price_map: dict[str, dict] = {}
    for ph in price_hours:
        key = ph["timestamp"][:13]  # "2024-07-15T14"
        price_map[key] = ph

    # Időjárás + ár párosítása
    joined = []
    for wh in weather_hours:
        key = wh["timestamp"][:13]
        ph = price_map.get(key)
        if ph is None:
            continue
        joined.append({**wh, **{
            "price_huf_kwh": ph.get("price_huf_kwh", 0),
            "is_cheap": ph.get("is_cheap", False),
            "is_expensive": ph.get("is_expensive", False),
        }})

    if not joined:
        return _empty_plan(city_name, lat, lon, ac_power_kw, cop, comfort_temp_c)

    # Ár percentilisek (az aktuális 48h ablakra)
    prices = [h["price_huf_kwh"] for h in joined]
    if prices:
        sorted_p = sorted(prices)
        n = len(sorted_p)
        q33 = sorted_p[int(n * 0.33)]
        q67 = sorted_p[int(n * 0.67)]
    else:
        q33, q67 = 20.0, 35.0

    # Előhűtési logika
    # Belső hőmérséklet szimulációja (egyszerűsített termikus modell)
    indoor_temp = joined[0].get("temp_c", 22.0)  # induló belső hőmérséklet
    indoor_temp = min(indoor_temp, comfort_temp_c + 2)  # reggel általában nem forró belül

    plan_hours: list[HourlyPlan] = []
    smart_cost = 0.0
    naive_cost = 0.0
    smart_kwh  = 0.0
    naive_kwh  = 0.0
    precool_windows = []
    precool_active = False
    last_precool_start = None

    # Következő N óra előretekintése az előhűtési döntéshez
    LOOKAHEAD = 4  # hány óra előre nézünk csúcsot keresve

    for i, h in enumerate(joined):
        outdoor = h.get("temp_c") or 20.0
        apparent = h.get("apparent_temp_c")
        price = h["price_huf_kwh"]
        is_cheap = price <= q33
        is_expensive = price >= q67
        hour = h["hour"]
        cop_now = _cop_at_temp(cop, outdoor)

        # --- Naiv stratégia: AC fut ha meleg van és nappali idő (8-22h) ---
        feels_hot = (apparent or outdoor) >= comfort_temp_c
        naive_on = feels_hot and (8 <= hour <= 22)
        naive_e = ac_power_kw if naive_on else 0.0
        naive_c = naive_e * price
        naive_kwh  += naive_e
        naive_cost += naive_c

        # --- Belső hőmérséklet drift (ha AC nem megy, bemelegszik) ---
        # (frissítjük az előző lépés döntése alapján)
        if i > 0 and not plan_hours[-1].ac_on:
            drift = min(THERMAL_DRIFT_PER_H, outdoor - indoor_temp)
            indoor_temp = min(outdoor, indoor_temp + max(0.0, drift))
        elif i > 0 and plan_hours[-1].ac_on:
            # AC hűti: beltér közelít a célhőmérséklethez
            indoor_temp = max(PRECOOL_TEMP_TARGET, indoor_temp - 1.5)

        # --- Okos stratégia logika ---
        # 1. Ha olcsó ÉS a következő órákban drága+meleg lesz → ELŐHŰTÉS
        future_expensive_hot = _any_expensive_hot_ahead(joined, i, LOOKAHEAD, q67, comfort_temp_c)

        # 2. Ha most meleg van benn ÉS nagyon drága → COAST (belső hő tartja még)
        indoor_too_hot = indoor_temp >= comfort_temp_c + 2

        if is_cheap and future_expensive_hot:
            action = "precool"
            action_label = "Előhűtés most!"
            action_detail = (
                f"Olcsó áram ({price:.0f} Ft/kWh), COP={cop_now:.1f} — "
                f"hűtsd be most, hogy a csúcsban ne kelljen!"
            )
            ac_on = True
            if not precool_active:
                last_precool_start = h["local_time"]
                precool_active = True
        elif is_cheap and indoor_temp >= comfort_temp_c:
            action = "run"
            action_label = "Futtasd"
            action_detail = f"Meleg van és olcsó az áram ({price:.0f} Ft/kWh)."
            ac_on = True
        elif is_expensive and not indoor_too_hot:
            action = "coast"
            action_label = "Kikapcs. (hőtartalék)"
            action_detail = f"Drága az áram ({price:.0f} Ft/kWh) — a betárolt hideg kiviseli még."
            ac_on = False
            if precool_active:
                precool_windows.append({
                    "precool_start": last_precool_start,
                    "coast_start": h["local_time"],
                    "reason": f"Előhűtve, most kényelmes ({indoor_temp:.1f}°C beltér)",
                })
                precool_active = False
        elif indoor_temp >= comfort_temp_c or outdoor >= comfort_temp_c + 3:
            action = "run"
            action_label = "Futtasd"
            action_detail = f"Meleg van ({outdoor:.0f}°C kint, {indoor_temp:.0f}°C benn)."
            ac_on = True
        else:
            action = "off"
            action_label = "Kikapcs."
            action_detail = f"Kellemes az idő ({outdoor:.0f}°C) — nem kell hűtés."
            ac_on = False
            if precool_active:
                precool_active = False

        smart_e = ac_power_kw if ac_on else 0.0
        smart_c = smart_e * price
        smart_kwh  += smart_e
        smart_cost += smart_c

        plan_hours.append(HourlyPlan(
            timestamp=h["timestamp"],
            local_time=h["local_time"],
            hour=hour,
            outdoor_temp_c=outdoor,
            apparent_temp_c=apparent,
            price_huf_kwh=price,
            is_cheap=is_cheap,
            is_expensive=is_expensive,
            action=action,
            action_label=action_label,
            action_detail=action_detail,
            ac_on=ac_on,
            energy_kwh=smart_e,
            cost_huf=smart_c,
            naive_ac_on=naive_on,
            naive_energy_kwh=naive_e,
            naive_cost_huf=naive_c,
            cop_actual=round(cop_now, 2),
        ))

    saving = naive_cost - smart_cost
    saving_pct = (saving / naive_cost * 100) if naive_cost > 0 else 0.0

    # Összefoglaló szöveg
    if saving > 50:
        summary = f"Az okos hűtéssel {saving:.0f} Ft-ot spórolhatsz a következő 48 órában."
        tip = f"Hűtsd be a lakást előre a {q33:.0f} Ft/kWh alatti sávokban, és kapcsold ki {q67:.0f} Ft felett!"
    elif saving > 0:
        summary = f"Az előhűtéssel kb. {saving:.0f} Ft megtakarítható a következő 48 órában."
        tip = "Az árszórás most kisebb, de az előhűtési stratégia mindig kifizetődő nyáron."
    else:
        summary = "Az árszórás most kicsi — bármikor futtasd a klímát kényelmed szerint."
        tip = "Kövesd figyelemmel a villanysár-előrejelzést: forró napokon ez sokat számít!"

    return CoolingPlan(
        city_name=city_name,
        lat=lat,
        lon=lon,
        ac_power_kw=ac_power_kw,
        cop=cop,
        comfort_temp_c=comfort_temp_c,
        hours=plan_hours,
        smart_total_cost_huf=round(smart_cost, 0),
        naive_total_cost_huf=round(naive_cost, 0),
        saving_huf=round(saving, 0),
        saving_pct=round(saving_pct, 1),
        smart_total_kwh=round(smart_kwh, 2),
        naive_total_kwh=round(naive_kwh, 2),
        precool_windows=precool_windows,
        summary=summary,
        tip=tip,
    )


def _any_expensive_hot_ahead(hours: list[dict], i: int, lookahead: int, q67: float, comfort_c: float) -> bool:
    """Igaz, ha a következő `lookahead` órán belül drága ÉS meleg időszak jön."""
    for j in range(i + 1, min(i + 1 + lookahead, len(hours))):
        h = hours[j]
        if h["price_huf_kwh"] >= q67 and (h.get("apparent_temp_c") or h.get("temp_c") or 0) >= comfort_c:
            return True
    return False


def _empty_plan(city_name, lat, lon, ac_power_kw, cop, comfort_temp_c) -> CoolingPlan:
    return CoolingPlan(
        city_name=city_name, lat=lat, lon=lon,
        ac_power_kw=ac_power_kw, cop=cop, comfort_temp_c=comfort_temp_c,
        hours=[], smart_total_cost_huf=0, naive_total_cost_huf=0,
        saving_huf=0, saving_pct=0, smart_total_kwh=0, naive_total_kwh=0,
        precool_windows=[], summary="Nem sikerült adatot lekérni.", tip="",
    )
