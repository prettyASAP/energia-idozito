"""
Napelem önfogyasztási optimalizáló: mikor érdemes nagy fogyasztókat futtatni
a napelem-termelési csúcs kihasználásához, és mikor érdemes a hálózatból venni.

Adatforrások:
  - Open-Meteo shortwave_radiation (W/m²) → becsült PV-termelés
  - ENTSO-E villanyár-előrejelzés
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional

# Napelemes rendszer alapkonstansok
PV_EFFICIENCY       = 0.80    # Rendszerhatásfok (inverter + kábelv. + szennyeződés, tipikus)
PV_PEAK_IRRADIANCE  = 1000.0  # W/m² STC referencia sugárzás
TYPICAL_HOUSEHOLD_KW = 0.40   # Átlagos háztartási alapterhelés (kW) — tartalmaz hűtőt, készenléti stb.

# Magyar napelemes hozam becslés (déli tájolás, 35° dőlésszög, alföldi átlag)
ANNUAL_YIELD_KWH_PER_KWP = 1050.0  # kWh/kWp/év — PVGIS EU átlag Mo.-ra

# Sugárzási küszöbök a cselekvési logikához
IRRADIANCE_PEAK   = 600.0   # W/m² — napelem csúcson: időszak nagy fogyasztókhoz
IRRADIANCE_MILD   = 150.0   # W/m² — részleges termelés
IRRADIANCE_NONE   = 10.0    # W/m² — gyakorlatilag nincs termelés (éjjel, felhős)


@dataclass
class SolarHourlyPlan:
    timestamp: str
    local_time: str
    hour: int
    irradiance_wm2: float
    solar_production_kwh: float   # becsült termelés az adott órában (kWh)
    price_huf_kwh: float
    is_cheap: bool
    is_expensive: bool
    action: str         # "solar_peak" | "solar_mild" | "cheap_grid" | "avoid" | "night"
    action_label: str
    action_detail: str
    cost_with_solar_huf: float       # háztartási villanyszámla napelemmmel
    cost_without_solar_huf: float    # háztartási villanyszámla napelem nélkül
    solar_covers_pct: float          # napelem fedezeti arány az alapterhelésre (0–100 %)


@dataclass
class SolarPlan:
    city_name: str
    lat: float
    lon: float
    solar_kwp: float
    household_kw: float
    hours: list[SolarHourlyPlan]
    total_production_kwh_48h: float
    total_savings_huf_48h: float          # 48h alatt spórolt Ft vs. napelem nélkül
    daily_production_kwh_estimate: float  # átlagos napi termelés a mért adatból
    annual_production_kwh_estimate: float # éves hozambecslés
    annual_savings_huf_estimate: float    # éves megtakarítás-becslés
    best_load_windows: list[dict]         # top 3 ablak nagy fogyasztókhoz
    summary: str
    tip: str


def build_solar_plan(
    weather_hours: list[dict],
    price_hours: list[dict],
    city_name: str,
    lat: float,
    lon: float,
    solar_kwp: float,
    household_kw: float = TYPICAL_HOUSEHOLD_KW,
) -> SolarPlan:
    """
    Összepárosítja az időjárás + villanyár adatokat a napelem stratégiához.

    weather_hours: [{timestamp, local_time, hour, temp_c, irradiance_wm2, ...}]
    price_hours:   [{timestamp, price_huf_kwh, is_cheap, is_expensive}]
    """
    # Ár-index az időbélyeg első 13 karaktere alapján
    price_map: dict[str, dict] = {}
    for ph in price_hours:
        price_map[ph["timestamp"][:13]] = ph

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
        return _empty_plan(city_name, lat, lon, solar_kwp, household_kw)

    plan_hours: list[SolarHourlyPlan] = []
    total_production = 0.0
    total_savings    = 0.0
    total_with       = 0.0
    total_without    = 0.0

    for h in joined:
        irr = h.get("irradiance_wm2") or 0.0
        price = h["price_huf_kwh"]
        is_cheap    = h["is_cheap"]
        is_expensive = h["is_expensive"]
        hour = h["hour"]

        # PV termelés az adott órában (kWh)
        solar_prod = solar_kwp * (irr / PV_PEAK_IRRADIANCE) * PV_EFFICIENCY

        # Háztartási alapterhelés — napelem fedezi, ami marad a hálózatból jön
        grid_needed = max(0.0, household_kw - solar_prod)

        cost_with    = grid_needed * price
        cost_without = household_kw * price

        solar_covers_pct = min(100.0, (solar_prod / household_kw * 100)) if household_kw > 0 else 0.0

        total_production += solar_prod
        total_with    += cost_with
        total_without += cost_without

        # --- Cselekvési logika ---
        if irr >= IRRADIANCE_PEAK:
            action = "solar_peak"
            action_label = "Napelem csúcson!"
            action_detail = (
                f"~{solar_prod:.2f} kWh termelés ({irr:.0f} W/m²). "
                f"Most futtasd a mosógépet, mosogatót, töltsd az EV-t!"
            )
        elif irr >= IRRADIANCE_MILD:
            action = "solar_mild"
            action_label = "Részleges termelés"
            action_detail = (
                f"~{solar_prod:.2f} kWh termelés ({irr:.0f} W/m²). "
                f"Az alapterhelés {solar_covers_pct:.0f}%-a fedezve."
            )
        elif hour < 6 or hour >= 22:
            action = "night"
            action_label = "Éjszaka"
            action_detail = "Nincs napelem-termelés. " + (
                f"Olcsó áram ({price:.0f} Ft/kWh) — éjszakai NT-sávot használj."
                if is_cheap else
                f"Áram: {price:.0f} Ft/kWh."
            )
        elif is_cheap:
            action = "cheap_grid"
            action_label = "Olcsó hálózat"
            action_detail = f"Nincs nap, de olcsó az áram ({price:.0f} Ft/kWh). Jó alkalom fogyasztásra."
        elif is_expensive:
            action = "avoid"
            action_label = "Kerüld!"
            action_detail = f"Nincs nap és drága az áram ({price:.0f} Ft/kWh). Minimalizáld a fogyasztást."
        else:
            action = "neutral"
            action_label = "Normál"
            action_detail = f"Közepes ár ({price:.0f} Ft/kWh), nincs napelem-termelés."

        plan_hours.append(SolarHourlyPlan(
            timestamp=h["timestamp"],
            local_time=h["local_time"],
            hour=hour,
            irradiance_wm2=round(irr, 0),
            solar_production_kwh=round(solar_prod, 3),
            price_huf_kwh=price,
            is_cheap=is_cheap,
            is_expensive=is_expensive,
            action=action,
            action_label=action_label,
            action_detail=action_detail,
            cost_with_solar_huf=round(cost_with, 2),
            cost_without_solar_huf=round(cost_without, 2),
            solar_covers_pct=round(solar_covers_pct, 0),
        ))

    total_savings = total_without - total_with

    # Napi átlagos termelés (csak a nappali órákból becsülve)
    daytime_hours = [h for h in plan_hours if h.irradiance_wm2 > 0]
    days_with_sun = len(set(h.local_time[:10] for h in daytime_hours))
    daily_prod = (total_production / days_with_sun) if days_with_sun > 0 else 0.0

    # Éves hozambecslés PVGIS-alapú konstanssal
    annual_prod = solar_kwp * ANNUAL_YIELD_KWH_PER_KWP

    # Átlagos ár a 48h ablakból → éves megtakarítás becslés
    prices = [h.price_huf_kwh for h in plan_hours]
    avg_price = sum(prices) / len(prices) if prices else 40.0
    annual_savings = annual_prod * avg_price * PV_EFFICIENCY

    # Top 3 legjobb ablak nagy fogyasztókhoz (2 órás csúszóablak, max termelés + min ár)
    best_load_windows = _find_best_load_windows(plan_hours)

    # Összefoglaló szöveg
    if total_savings > 100:
        summary = (
            f"A {solar_kwp} kWp rendszer ~{total_production:.1f} kWh-t termel a következő 48 órában, "
            f"és kb. {total_savings:.0f} Ft-ot spórol az alapterhelésen."
        )
    elif total_production > 0:
        summary = (
            f"A rendszer ~{total_production:.1f} kWh-t termel 48 óra alatt. "
            f"Éves szinten kb. {annual_prod:.0f} kWh hozamra számíthatsz."
        )
    else:
        summary = "Az előrejelzési ablakban nincs elegendő napfény a termeléshez."

    tip = (
        f"Az éves {annual_prod:.0f} kWh termelés becsült megtakarítása: "
        f"~{annual_savings:,.0f} Ft/év ({avg_price:.0f} Ft/kWh átlagáron). "
        "A déli csúcs (10–14h) az önfogyasztás aranykora — ekkor futtasd a mosógépet és tölts!"
    )

    return SolarPlan(
        city_name=city_name,
        lat=lat,
        lon=lon,
        solar_kwp=solar_kwp,
        household_kw=household_kw,
        hours=plan_hours,
        total_production_kwh_48h=round(total_production, 2),
        total_savings_huf_48h=round(total_savings, 0),
        daily_production_kwh_estimate=round(daily_prod, 1),
        annual_production_kwh_estimate=round(annual_prod, 0),
        annual_savings_huf_estimate=round(annual_savings, 0),
        best_load_windows=best_load_windows,
        summary=summary,
        tip=tip,
    )


def _find_best_load_windows(hours: list[SolarHourlyPlan], window_h: int = 2) -> list[dict]:
    """Top 3 kétórás ablak nagy fogyasztóknak (magas termelés, alacsony ár kombinációja)."""
    scored = []
    for i in range(len(hours) - window_h + 1):
        window = hours[i:i + window_h]
        avg_prod    = sum(h.solar_production_kwh for h in window) / window_h
        avg_price   = sum(h.price_huf_kwh for h in window) / window_h
        avg_covers  = sum(h.solar_covers_pct for h in window) / window_h
        # Pontszám: sok termelés + alacsony ár = jobb
        score = avg_prod * 10 - avg_price * 0.1
        if avg_prod > 0:
            scored.append({
                "start": window[0].local_time,
                "end": window[-1].local_time,
                "start_hour": window[0].hour,
                "end_hour": window[-1].hour + 1,
                "avg_production_kwh": round(avg_prod, 2),
                "avg_price_huf_kwh": round(avg_price, 1),
                "avg_solar_covers_pct": round(avg_covers, 0),
                "score": round(score, 2),
            })
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:3]


def _empty_plan(city_name, lat, lon, solar_kwp, household_kw) -> SolarPlan:
    return SolarPlan(
        city_name=city_name, lat=lat, lon=lon,
        solar_kwp=solar_kwp, household_kw=household_kw,
        hours=[], total_production_kwh_48h=0, total_savings_huf_48h=0,
        daily_production_kwh_estimate=0, annual_production_kwh_estimate=0,
        annual_savings_huf_estimate=0, best_load_windows=[],
        summary="Nem sikerült adatot lekérni.", tip="",
    )
