import pandas as pd
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class TimeWindow:
    start_hour: int
    end_hour: int
    avg_price_eur: float
    avg_price_huf: float
    total_cost_huf: float
    savings_vs_worst_pct: float


@dataclass
class SavingsBreakdown:
    """
    Kettős megtakarítás-számítás:
    - resident_*: amit a lakos ténylegesen lát a számláján
    - state_*: amit az állam (MVM/energia-alap) fizet vagy spórol
    """
    # --- LAKOS OLDAL ---
    # HT/NT kétmérős tarifával rendelkezők tényleges számla-megtakarítása
    resident_htnt_daily_huf: float
    resident_htnt_annual_huf: float
    # Piaci (határ feletti) áron vásárlók megtakarítása (tőzsdei különbség)
    resident_market_daily_huf: float
    resident_market_annual_huf: float
    # Rezsivédett (fix áras) fogyasztónál nincs közvetlen számla-megtakarítás
    resident_regulated_daily_huf: float  # = 0

    # --- ÁLLAMI / RENDSZERSZINT ---
    # Az energia-rendszer (MVM) olcsóbban tud energiát beszerezni off-peak-ben
    # = a tőzsdei csúcs-völgy különbség × eltolt energia
    state_procurement_saving_daily_huf: float
    state_procurement_saving_annual_huf: float
    # Rezsivédett szubvenció csökkentése: ha csúcsidőben a tőzsdei ár > 46.5 Ft/kWh,
    # az állam fizette a különbözetet; off-peak-re tolva ez a szubvenció csökken
    state_subsidy_saving_daily_huf: float
    state_subsidy_saving_annual_huf: float

    # Segédadatok a UI számára
    ht_price_huf_kwh: float
    nt_price_huf_kwh: float
    regulated_price_huf_kwh: float
    wholesale_peak_huf_kwh: float
    wholesale_offpeak_huf_kwh: float
    wholesale_diff_huf_kwh: float


@dataclass
class Recommendation:
    date: str
    operation_hours: int
    power_kw: float
    best_windows: List[TimeWindow]
    worst_window: Optional[TimeWindow]
    potential_daily_saving_huf: float
    annual_saving_huf: float
    daily_co2_saving_g: float
    annual_co2_saving_kg: float
    social_annual_saving_huf_100k: float
    social_annual_co2_saving_tonnes_100k: float
    savings_breakdown: Optional[SavingsBreakdown]
    summary: str


DEFAULT_EUR_HUF = 395.0

# Magyarország átlagos CO2-kibocsátási intenzitása a villamosenergia-hálózaton
# Forrás: ENTSO-E Transparency Platform / EEA — ~250g CO2/kWh (2023)
CO2_FACTOR_G_PER_KWH = 250.0

# Társadalmi szorzó
SOCIAL_MULTIPLIER = 100_000  # 100 000 háztartás

# -------------------------------------------------------------------------
# Magyar energiaár-konstansok (2024, bruttó ÁFÁ-val, tájékoztató jellegű)
# Forrás: 192/2022. (VI.4.) Korm. rendelet, MEKH díjhatározatok, MAVIR ÁROD-tarifa,
#         elosztói üzletszabályzatok, piaci kereskedői ajánlatok átlaga
# -------------------------------------------------------------------------

# ÁLLANDÓ DÍJKOMPONENSEK — időzítéstől FÜGGETLEN, mindig fizetendő (Ft/kWh, bruttó)
EROSD_HUF_KWH      = 9.5    # Elosztói hálózathasználati díj (kisfeszültségű A-tarifa, átlag)
AROD_HUF_KWH       = 3.0    # Átviteli hálózathasználati díj (MAVIR, kisfeszültségű átlag)
KAT_METAAR_HUF_KWH = 2.1    # KÁT/METÁR megújuló-támogatási pótdíj (MEKH éves határozat)
RSSD_HUF_KWH       = 0.9    # Rendszerszintű szolgáltatások díja
VEA_AFA_HUF_KWH    = 3.94   # Villamosenergia-adó (3,1 Ft/kWh nettó × 1,27 ÁFA = 3,937)
FIXED_STACK_HUF_KWH = 19.44  # Fix díjak összesen (EROSD+ÁROD+KÁT+RSSD+VEA+ÁFA)

# REZSIVÉDETT ÁR — 192/2022. (VI.4.) Korm. rendelet, 36,36 Ft/kWh nettó × 1,27 = 46,18 Ft/kWh
# Az első 210 kWh/hó fogyasztásra érvényes szabályozott ár
REGULATED_PRICE_HUF_KWH   = 46.18   # teljes ár, bruttó (energia + hálózat + adók)
REGULATED_ENERGY_HUF_KWH  = REGULATED_PRICE_HUF_KWH - FIXED_STACK_HUF_KWH  # ≈ 26.74 Ft/kWh
REGULATED_THRESHOLD_KWH_MONTH = 210

# HT/NT kétmérős tarifa — MEKH 2024 szabályozott ár, bruttó (ÁFÁ-val)
# Forrás: MEKH H-ES/462/2023 határozat, hatályos 2024. január 1-jétől
# HT: hétköznap 06:00–22:00 | NT: 22:00–06:00, hétvége, ünnepnap
HT_PRICE_HUF_KWH = 54.27  # Háztartási Tarifa (HT)
NT_PRICE_HUF_KWH = 36.18  # Éjszakai/Mérsékelt Tarifa (NT)
HT_ENERGY_HUF_KWH = HT_PRICE_HUF_KWH - FIXED_STACK_HUF_KWH   # ≈ 34.83 Ft/kWh energia
NT_ENERGY_HUF_KWH = NT_PRICE_HUF_KWH - FIXED_STACK_HUF_KWH   # ≈ 16.74 Ft/kWh energia


def compute_savings_breakdown(
    worst_price_eur_mwh: float,
    best_price_eur_mwh: float,
    power_kw: float,
    hours: int,
    eur_huf: float,
) -> SavingsBreakdown:
    """
    Kiszámolja, ki mennyit nyer az időzítéssel:
      - a lakos (HT/NT tarifán, piaci áron, ill. rezsivédett áron)
      - az állam/rendszer (energia-beszerzési megtakarítás + szubvenció-csökkentés)
    """
    energy_kwh = power_kw * hours

    # Tőzsdei energia-ár Ft/kWh-ban (CSAK az energia-komponens, hálózat + adók nélkül)
    # Az ENTSO-E wholesale ár ≈ energia-komponens, a FIXED_STACK_HUF_KWH (19,44 Ft/kWh)
    # rárakódik a fogyasztóra ettől függetlenül — azt itt nem számítjuk
    peak_en_kwh    = worst_price_eur_mwh * eur_huf / 1000.0   # tőzsdei csúcs energia (Ft/kWh)
    offpeak_en_kwh = best_price_eur_mwh  * eur_huf / 1000.0   # tőzsdei völgy energia (Ft/kWh)
    wholesale_diff = max(0.0, peak_en_kwh - offpeak_en_kwh)

    # ---------------------------------------------------------------
    # LAKOS OLDAL
    # ---------------------------------------------------------------
    # 1. HT/NT mérős lakos: az energia-tarifa különbsége (fix ~30 Ft/kWh)
    #    A hálózati díj (FIXED_STACK_HUF_KWH) mindkét periódusban azonos → nem számít
    htnt_energy_diff = HT_ENERGY_HUF_KWH - NT_ENERGY_HUF_KWH  # ≈ 30 Ft/kWh
    resident_htnt_daily  = htnt_energy_diff * energy_kwh
    resident_htnt_annual = resident_htnt_daily * 365

    # 2. Piaci (tőzsdei alapú) áras lakos: a wholesale energia-ár különbsége
    resident_market_daily  = wholesale_diff * energy_kwh
    resident_market_annual = resident_market_daily * 365

    # 3. Rezsivédett fogyasztó: fix ár → nincs közvetlen számla-megtakarítás
    resident_regulated_daily = 0.0

    # ---------------------------------------------------------------
    # ÁLLAMI / RENDSZERSZINT
    # ---------------------------------------------------------------
    # 1. MVM/energia-rendszer olcsóbb wholesale energia-beszerzése off-peak időszakban
    state_procurement_daily  = wholesale_diff * energy_kwh
    state_procurement_annual = state_procurement_daily * 365

    # 2. Rezsivédett szubvenció csökkentése
    #    Az állam akkor fizet pótlékot, ha a TŐZSDEI ENERGIA-ÁR meghaladja
    #    a REZSIVÉDETT ENERGIA-ÁRat (≈26,74 Ft/kWh, = 46,18 − 19,44 Ft/kWh).
    #    FONTOS: almát almával kell hasonlítani — tőzsdei energia vs. szabályozott energia,
    #    nem a tőzsdei energia-ár vs. teljes szabályozott retail ár (kategóriatévesztés lenne).
    subsidy_peak    = max(0.0, peak_en_kwh    - REGULATED_ENERGY_HUF_KWH) * energy_kwh
    subsidy_offpeak = max(0.0, offpeak_en_kwh - REGULATED_ENERGY_HUF_KWH) * energy_kwh
    state_subsidy_saving_daily  = max(0.0, subsidy_peak - subsidy_offpeak)
    state_subsidy_saving_annual = state_subsidy_saving_daily * 365

    return SavingsBreakdown(
        resident_htnt_daily_huf             = round(resident_htnt_daily, 0),
        resident_htnt_annual_huf            = round(resident_htnt_annual, 0),
        resident_market_daily_huf           = round(resident_market_daily, 0),
        resident_market_annual_huf          = round(resident_market_annual, 0),
        resident_regulated_daily_huf        = 0.0,
        state_procurement_saving_daily_huf  = round(state_procurement_daily, 0),
        state_procurement_saving_annual_huf = round(state_procurement_annual, 0),
        state_subsidy_saving_daily_huf      = round(state_subsidy_saving_daily, 0),
        state_subsidy_saving_annual_huf     = round(state_subsidy_saving_annual, 0),
        ht_price_huf_kwh          = HT_PRICE_HUF_KWH,
        nt_price_huf_kwh          = NT_PRICE_HUF_KWH,
        regulated_price_huf_kwh   = REGULATED_PRICE_HUF_KWH,
        wholesale_peak_huf_kwh    = round(peak_en_kwh, 1),
        wholesale_offpeak_huf_kwh = round(offpeak_en_kwh, 1),
        wholesale_diff_huf_kwh    = round(wholesale_diff, 1),
    )


def _find_windows(day_series: pd.Series, window_hours: int, eur_huf: float) -> List[dict]:
    """Megkeresi az összes lehetséges időablakot egy napon belül."""
    windows = []
    for start in range(24 - window_hours + 1):
        end = start + window_hours
        subset = day_series[day_series.index.hour.isin(range(start, end))]
        if len(subset) < window_hours:
            continue
        avg = float(subset.mean())
        windows.append({
            "start_hour": start,
            "end_hour": end,
            "avg_price_eur": round(avg, 2),
            "avg_price_huf": round(avg * eur_huf, 0),
        })
    return windows


def recommend(
    series: pd.Series,
    power_kw: float,
    operation_hours_per_day: int,
    top_n: int = 3,
    eur_huf: float = DEFAULT_EUR_HUF,
) -> List[Recommendation]:
    """
    Megmondja naponta mikor érdemes bekapcsolni az üzemet.

    Args:
        series: Óránkénti ársor (EUR/MWh)
        power_kw: Teljesítmény kilowattban
        operation_hours_per_day: Napi szükséges üzemórák száma
        top_n: Hány legjobb időablakot adjon vissza
        eur_huf: EUR/HUF árfolyam

    Returns:
        Napi ajánlások listája éves megtakarítással és CO2 adatokkal.
    """
    results = []

    for date, group in series.groupby(series.index.date):
        windows = _find_windows(group, operation_hours_per_day, eur_huf)
        if not windows:
            continue

        windows_sorted = sorted(windows, key=lambda w: w["avg_price_eur"])
        best = windows_sorted[:top_n]
        worst = windows_sorted[-1]

        power_mw = power_kw / 1000.0

        best_windows = []
        for w in best:
            total_huf = w["avg_price_eur"] * eur_huf * power_mw * operation_hours_per_day
            saving_pct = (1 - w["avg_price_eur"] / worst["avg_price_eur"]) * 100 if worst["avg_price_eur"] != 0 else 0
            best_windows.append(TimeWindow(
                start_hour=w["start_hour"],
                end_hour=w["end_hour"],
                avg_price_eur=w["avg_price_eur"],
                avg_price_huf=w["avg_price_huf"],
                total_cost_huf=round(total_huf, 0),
                savings_vs_worst_pct=round(saving_pct, 1),
            ))

        worst_total_huf = worst["avg_price_eur"] * eur_huf * power_mw * operation_hours_per_day
        worst_window = TimeWindow(
            start_hour=worst["start_hour"],
            end_hour=worst["end_hour"],
            avg_price_eur=worst["avg_price_eur"],
            avg_price_huf=worst["avg_price_huf"],
            total_cost_huf=round(worst_total_huf, 0),
            savings_vs_worst_pct=0.0,
        )

        # Napi megtakarítás (tőzsdei alapú)
        saving_huf = worst_total_huf - best_windows[0].total_cost_huf

        # Éves megtakarítás (napi * 365)
        annual_saving_huf = round(saving_huf * 365, 0)

        # CO2 megtakarítás
        savings_ratio = best_windows[0].savings_vs_worst_pct / 100.0
        energy_kwh = power_kw * operation_hours_per_day
        daily_co2_saving_g = round(energy_kwh * CO2_FACTOR_G_PER_KWH * savings_ratio, 1)
        annual_co2_saving_kg = round(daily_co2_saving_g * 365 / 1000, 2)

        # Társadalmi szorzó
        social_annual_saving_huf_100k = round(annual_saving_huf * SOCIAL_MULTIPLIER, 0)
        social_annual_co2_saving_tonnes_100k = round(annual_co2_saving_kg * SOCIAL_MULTIPLIER / 1000, 1)

        # Kettős megtakarítás-számítás: lakos vs. állam
        breakdown = compute_savings_breakdown(
            worst_price_eur_mwh=worst["avg_price_eur"],
            best_price_eur_mwh=best_windows[0].avg_price_eur,
            power_kw=power_kw,
            hours=operation_hours_per_day,
            eur_huf=eur_huf,
        )

        best_start = best_windows[0].start_hour
        best_end = best_windows[0].end_hour
        summary = (
            f"Legjobb időablak: {best_start}:00–{best_end}:00 "
            f"({best_windows[0].avg_price_huf:,.0f} HUF/MWh átlag). "
            f"Napi megtakarítás a legdrágábbhoz képest: "
            f"{saving_huf:,.0f} HUF ({best_windows[0].savings_vs_worst_pct}%)."
        )

        results.append(Recommendation(
            date=str(date),
            operation_hours=operation_hours_per_day,
            power_kw=power_kw,
            best_windows=best_windows,
            worst_window=worst_window,
            potential_daily_saving_huf=round(saving_huf, 0),
            annual_saving_huf=annual_saving_huf,
            daily_co2_saving_g=daily_co2_saving_g,
            annual_co2_saving_kg=annual_co2_saving_kg,
            social_annual_saving_huf_100k=social_annual_saving_huf_100k,
            social_annual_co2_saving_tonnes_100k=social_annual_co2_saving_tonnes_100k,
            savings_breakdown=breakdown,
            summary=summary,
        ))

    return results
