import os
import sys
from datetime import datetime, timedelta, timezone
from typing import Optional
from pathlib import Path

import pandas as pd
from fastapi import FastAPI, Query, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

load_dotenv(Path(__file__).parent.parent.parent / ".env")

sys.path.insert(0, str(Path(__file__).parent.parent))
from data.entso_fetcher import fetch_day_ahead_prices, fetch_eur_huf_rate
from data.weather_fetcher import fetch_weather_forecast, get_city_coords, HUNGARIAN_CITIES
from analysis.price_analyzer import analyze_prices, daily_summary, weekly_pattern
from analysis.recommender import recommend
from analysis.predictor import predict_prices, combined_forecast, compute_model_accuracy
from analysis.cooling_planner import build_cooling_plan, AC_POWER_KW_DEFAULT, COP_DEFAULT, COMFORT_TEMP_C
from analysis.solar_planner import build_solar_plan, TYPICAL_HOUSEHOLD_KW
from services.grid_data import (
    fetch_system_load,
    fetch_renewables_forecast,
    fetch_crossborder_flows,
    fetch_generation_mix,
)

import logging
logging.basicConfig(level=logging.INFO)

# ---------------------------------------------------------------------------
# Rate limiter: 60 kérés/perc/IP az összes /api/* útvonalra
# ---------------------------------------------------------------------------
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="Energia Optimalizáló API", version="2.0.0")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _get_entso_api_key() -> str:
    """ENTSO-E API kulcs kizárólag környezeti változóból — soha nem kerül a kliensnek."""
    return os.getenv("ENTSO_E_API_KEY") or os.getenv("ENTSOE_API_KEY", "")

FRONTEND_DIR = Path(__file__).parent.parent.parent.parent / "frontend"

# ---------------------------------------------------------------------------
# Előre definiált eszközprofilok
# ---------------------------------------------------------------------------

DEVICE_PROFILES = [
    {
        "id": "mosogep",
        "name": "Mosógép",
        "power_kw": 2.0,
        "hours_per_use": 2,
        "flexibility": "high",
        "flexibility_label": "Szabadon időzíthető",
        "description": "Szabadon időzíthető, ideálisan éjszaka 22:00 után vagy hétvégén.",
        "annual_saving_min_huf": 8000,
        "annual_saving_max_huf": 10000,
        "tip": "Programozd be éjszakára a késleltetett indítással!",
    },
    {
        "id": "bojler",
        "name": "Bojler",
        "power_kw": 2.5,
        "hours_per_use": 4,
        "flexibility": "high",
        "flexibility_label": "Szabadon időzíthető",
        "description": "A legnagyobb megtakarítási potenciálú háztartási eszköz. Éjszakai felfűtéssel 30 000–40 000 Ft/év spórolható.",
        "annual_saving_min_huf": 30000,
        "annual_saving_max_huf": 40000,
        "tip": "Éjszakai időzítővel akár 40 000 Ft/év megtakarítás!",
    },
    {
        "id": "ev_tolto",
        "name": "EV töltő",
        "power_kw": 11.0,
        "hours_per_use": 8,
        "flexibility": "high",
        "flexibility_label": "Szabadon időzíthető",
        "description": "Az EV éjszakai töltése a legnagyobb egyéni megtakarítási lehetőség. 3 töltés/hét esetén 25 000–30 000 Ft/év megtakarítás.",
        "annual_saving_min_huf": 25000,
        "annual_saving_max_huf": 30000,
        "tip": "Töltsd éjjel 23:00 és 6:00 között!",
    },
    {
        "id": "mosogatogep",
        "name": "Mosogatógép",
        "power_kw": 1.8,
        "hours_per_use": 2,
        "flexibility": "high",
        "flexibility_label": "Szabadon időzíthető",
        "description": "Könnyen időzíthető éjszakára késleltetett indítással.",
        "annual_saving_min_huf": 6000,
        "annual_saving_max_huf": 8000,
        "tip": "Este indítsd el, mire reggel felébredsz, kész!",
    },
    {
        "id": "legkondicionalo",
        "name": "Légkondicionáló",
        "power_kw": 2.0,
        "hours_per_use": 4,
        "flexibility": "low",
        "flexibility_label": "Korlátosan időzíthető",
        "description": "Nem halasztható, de előhűtés stratégiával (14:00 körül) 10–15% megtakarítható.",
        "annual_saving_min_huf": 5000,
        "annual_saving_max_huf": 8000,
        "tip": "Hűtsd be a lakást 14:00-kor, mielőtt a csúcsidő kezdődik!",
    },
    {
        "id": "hoszivattyu",
        "name": "Hőszivattyú",
        "power_kw": 3.5,
        "hours_per_use": 8,
        "flexibility": "medium",
        "flexibility_label": "Részben időzíthető",
        "description": "Okos vezérléssel a fűtési csúcsot olcsóbb sávra tolhatod.",
        "annual_saving_min_huf": 15000,
        "annual_saving_max_huf": 25000,
        "tip": "Okos termosztáttal automatizálható a megtakarítás!",
    },
]

DEVICE_MAP = {d["id"]: d for d in DEVICE_PROFILES}


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/")
def root():
    index = FRONTEND_DIR / "index.html"
    if index.exists():
        return FileResponse(str(index))
    return {"status": "ok", "message": "Energia Optimalizáló API v2"}


@app.get("/api/devices")
@limiter.limit("60/minute")
def get_devices(request: Request):
    """Előre definiált eszközprofilok listája."""
    return {
        "devices": DEVICE_PROFILES,
        "count": len(DEVICE_PROFILES),
    }


@app.get("/api/status")
@limiter.limit("60/minute")
def get_status(request: Request):
    """
    Aktuális áram státusz: most érdemes-e bekapcsolni?
    Visszaadja az aktuális Ft/kWh árat és a zöld/sárga/piros státuszt.
    """
    api_key = _get_entso_api_key()
    if not api_key:
        raise HTTPException(status_code=503, detail="ENTSO_E_API_KEY environment variable not set")

    now = datetime.now(tz=timezone.utc)
    # 24 óra visszafelé + 24 óra előre az aktuális helyzet kontextusához
    start = now - timedelta(hours=24)
    end = now + timedelta(hours=25)

    eur_huf = fetch_eur_huf_rate()
    series = fetch_day_ahead_prices(start, end, api_key=api_key)
    if series.empty:
        raise HTTPException(status_code=503, detail="Nem sikerült áradatot lekérni.")

    # Aktuális óra ára: a most-hoz legközelebb eső múltbeli időpont
    try:
        now_pd = pd.Timestamp.now(tz=series.index.tz)
        current_hour = now_pd.floor("h")
        # A sorozatból a legközelebbi érték
        past_prices = series[series.index <= current_hour]
        if past_prices.empty:
            past_prices = series
        current_price_eur = float(past_prices.iloc[-1])
    except Exception:
        current_price_eur = float(series.mean())

    current_price_huf_mwh = current_price_eur * eur_huf
    current_price_huf_kwh = current_price_huf_mwh / 1000.0

    # Státusz meghatározása: a sorozat 33./67. percentilis alapján
    q33 = float(series.quantile(0.33))
    q67 = float(series.quantile(0.67))

    # Következő olcsó ablak meghatározása
    try:
        now_pd_ref = pd.Timestamp.now(tz=series.index.tz)
        future = series[series.index > now_pd_ref]
    except Exception:
        future = pd.Series(dtype=float)

    hours_to_cheap: Optional[int] = None
    next_cheap_hour: Optional[int] = None
    if not future.empty:
        cheap_future = future[future <= q33]
        if not cheap_future.empty:
            next_cheap_ts = cheap_future.index[0]
            try:
                now_pd_ref2 = pd.Timestamp.now(tz=series.index.tz)
                delta_h = (next_cheap_ts - now_pd_ref2).total_seconds() / 3600
                hours_to_cheap = max(0, int(delta_h))
            except Exception:
                hours_to_cheap = None
            next_cheap_hour = next_cheap_ts.hour

    if current_price_eur <= q33:
        status = "green"
        title = "Most érdemes bekapcsolni!"
        subtitle = "Az ár jelenleg a napi legolcsóbbak közé tartozik — tökéletes idő az energiaigényes eszközökhöz."
    elif current_price_eur >= q67:
        status = "red"
        if hours_to_cheap is not None and next_cheap_hour is not None:
            wait_text = f"{hours_to_cheap} óra" if hours_to_cheap > 0 else "hamarosan"
            title = f"Várj még {wait_text}!"
            subtitle = f"A következő olcsó időszak {next_cheap_hour}:00-kor kezdődik. Ha lehet, halaszd el az energiaigényes feladatokat."
        else:
            title = "Az ár most magasabb"
            subtitle = "Ha lehet, halaszd el az energiaigényes feladatokat az olcsóbb sávra."
    else:
        status = "yellow"
        if hours_to_cheap is not None and hours_to_cheap <= 3 and next_cheap_hour is not None:
            title = f"Hamarosan olcsóbb lesz ({next_cheap_hour}:00-tól)"
            subtitle = f"Az ár most átlagos. {hours_to_cheap} órán belül olcsóbb időszak jön — megéri várni."
        else:
            title = "Az ár most átlagos"
            subtitle = "Nem a legolcsóbb, de nem is a legdrágább időszak. Kis rugalmassággal spórolhatsz."

    # Ajánlott következő olcsó ablak összesítve
    cheap_window_summary = None
    if hours_to_cheap is not None and next_cheap_hour is not None:
        cheap_window_summary = {
            "hours_to_wait": hours_to_cheap,
            "start_hour": next_cheap_hour,
        }

    return {
        "current_price_huf_kwh": round(current_price_huf_kwh, 1),
        "current_price_huf_mwh": round(current_price_huf_mwh, 0),
        "current_price_eur_mwh": round(current_price_eur, 2),
        "status": status,
        "title": title,
        "subtitle": subtitle,
        "cheap_window": cheap_window_summary,
        "eur_huf_rate": eur_huf,
        "demo_mode": os.getenv("DEMO_MODE", "true").lower() == "true",
    }


@app.get("/api/prices")
@limiter.limit("60/minute")
def get_prices(
    request: Request,
    days: int = Query(default=7, ge=1, le=30),
):
    api_key = _get_entso_api_key()
    if not api_key:
        raise HTTPException(status_code=503, detail="ENTSO_E_API_KEY environment variable not set")

    end = datetime.now(tz=timezone.utc)
    start = end - timedelta(days=days)

    eur_huf = fetch_eur_huf_rate()
    series = fetch_day_ahead_prices(start, end, api_key=api_key)
    if series.empty:
        raise HTTPException(status_code=503, detail="Nem sikerült áradatot lekérni.")

    hourly = analyze_prices(series, eur_huf=eur_huf)
    return {
        "prices": [
            {
                "timestamp": h.timestamp,
                "price_eur_mwh": h.price_eur_mwh,
                "price_huf_mwh": h.price_huf_mwh,
                "price_huf_kwh": round(h.price_huf_mwh / 1000, 2),
                "is_cheap": h.is_cheap,
                "is_expensive": h.is_expensive,
            }
            for h in hourly
        ],
        "count": len(hourly),
        "eur_huf_rate": eur_huf,
        "demo_mode": os.getenv("DEMO_MODE", "true").lower() == "true",
    }


@app.get("/api/summary")
@limiter.limit("60/minute")
def get_summary(
    request: Request,
    days: int = Query(default=7, ge=1, le=30),
):
    api_key = _get_entso_api_key()
    if not api_key:
        raise HTTPException(status_code=503, detail="ENTSO_E_API_KEY environment variable not set")

    end = datetime.now(tz=timezone.utc)
    start = end - timedelta(days=days)

    eur_huf = fetch_eur_huf_rate()
    series = fetch_day_ahead_prices(start, end, api_key=api_key)
    if series.empty:
        raise HTTPException(status_code=503, detail="Nem sikerült áradatot lekérni.")

    return {
        "daily": [
            {
                "date": d.date,
                "min_price_eur": d.min_price,
                "max_price_eur": d.max_price,
                "avg_price_eur": d.avg_price,
                "min_price_huf": round(d.min_price * eur_huf, 0),
                "max_price_huf": round(d.max_price * eur_huf, 0),
                "avg_price_huf": round(d.avg_price * eur_huf, 0),
                "min_price_huf_kwh": round(d.min_price * eur_huf / 1000, 2),
                "avg_price_huf_kwh": round(d.avg_price * eur_huf / 1000, 2),
                "max_price_huf_kwh": round(d.max_price * eur_huf / 1000, 2),
                "cheapest_hours": d.cheapest_hours,
                "most_expensive_hours": d.most_expensive_hours,
            }
            for d in daily_summary(series)
        ],
        "weekly_pattern": weekly_pattern(series),
        "eur_huf_rate": eur_huf,
        "demo_mode": os.getenv("DEMO_MODE", "true").lower() == "true",
    }


@app.get("/api/forecast")
@limiter.limit("60/minute")
def get_forecast(
    request: Request,
    history_days: int = Query(default=30, ge=7, le=90, description="Hány nap historikus adat alapján"),
    forecast_days: int = Query(default=7, ge=1, le=14, description="Hány napra előre"),
):
    """
    Előrejelzett árak a következő napokra a historikus minták alapján.
    Konfidencia intervallumot és modell-pontosságot is tartalmaz.
    """
    api_key = _get_entso_api_key()
    if not api_key:
        raise HTTPException(status_code=503, detail="ENTSO_E_API_KEY environment variable not set")

    end = datetime.now(tz=timezone.utc)
    start = end - timedelta(days=history_days)

    eur_huf = fetch_eur_huf_rate()
    historical = fetch_day_ahead_prices(start, end, api_key=api_key)
    if historical.empty:
        raise HTTPException(status_code=503, detail="Nem sikerült historikus adatot lekérni.")

    forecast = predict_prices(historical, days_ahead=forecast_days)
    hours = combined_forecast(historical, forecast, eur_huf=eur_huf)

    # Modell pontossága
    accuracy = compute_model_accuracy(historical)

    # Napi összesítő az előrejelzett napokra
    forecast_daily = []
    for date, group in forecast.groupby(forecast.index.date):
        sorted_h = group.sort_values()
        n = max(1, len(group) // 4)
        forecast_daily.append({
            "date": str(date),
            "is_forecast": True,
            "min_price_huf": round(float(sorted_h.iloc[0]) * eur_huf, 0),
            "avg_price_huf": round(float(group.mean()) * eur_huf, 0),
            "max_price_huf": round(float(sorted_h.iloc[-1]) * eur_huf, 0),
            "min_price_huf_kwh": round(float(sorted_h.iloc[0]) * eur_huf / 1000, 2),
            "avg_price_huf_kwh": round(float(group.mean()) * eur_huf / 1000, 2),
            "max_price_huf_kwh": round(float(sorted_h.iloc[-1]) * eur_huf / 1000, 2),
            "cheapest_hours": sorted([ts.hour for ts in sorted_h.head(n).index]),
            "most_expensive_hours": sorted([ts.hour for ts in sorted_h.tail(n).index]),
        })

    return {
        "prices": [
            {
                "timestamp": h.timestamp,
                "price_eur_mwh": h.price_eur_mwh,
                "price_huf_mwh": h.price_huf_mwh,
                "price_huf_kwh": round(h.price_huf_mwh / 1000, 2),
                "is_cheap": h.is_cheap,
                "is_expensive": h.is_expensive,
                "is_forecast": h.is_forecast,
                "ci_lower_huf_mwh": h.ci_lower_huf_mwh,
                "ci_upper_huf_mwh": h.ci_upper_huf_mwh,
                "ci_lower_huf_kwh": round(h.ci_lower_huf_mwh / 1000, 2),
                "ci_upper_huf_kwh": round(h.ci_upper_huf_mwh / 1000, 2),
            }
            for h in hours
        ],
        "forecast_daily": forecast_daily,
        "eur_huf_rate": eur_huf,
        "history_days_used": history_days,
        "forecast_days": forecast_days,
        "model_accuracy": accuracy,
        "demo_mode": os.getenv("DEMO_MODE", "true").lower() == "true",
    }


@app.get("/api/recommend")
@limiter.limit("60/minute")
def get_recommendation(
    request: Request,
    device_id: Optional[str] = Query(default=None, description="Eszköz azonosítója (pl. 'mosogep', 'bojler')"),
    power_kw: Optional[float] = Query(default=None, description="Üzem teljesítménye kW-ban", gt=0),
    hours_per_day: Optional[int] = Query(default=None, description="Napi szükséges üzemórák", ge=1, le=24),
    use_forecast: bool = Query(default=True, description="Előrejelzett adatokat is használjon"),
    history_days: int = Query(default=30, ge=7, le=90),
):
    """
    Mikor érdemes bekapcsolni az üzemet?
    Elfogad device_id-t az előre definiált eszközprofilokból,
    vagy egyedi power_kw + hours_per_day paramétereket.
    """
    api_key = _get_entso_api_key()
    if not api_key:
        raise HTTPException(status_code=503, detail="ENTSO_E_API_KEY environment variable not set")

    # Eszközprofil alapú paraméter feloldás
    if device_id and device_id in DEVICE_MAP:
        device = DEVICE_MAP[device_id]
        resolved_power_kw = device["power_kw"]
        resolved_hours = device["hours_per_use"]
        device_info = device
    elif power_kw is not None and hours_per_day is not None:
        resolved_power_kw = power_kw
        resolved_hours = hours_per_day
        device_info = None
    else:
        raise HTTPException(
            status_code=422,
            detail="Adj meg device_id-t, VAGY power_kw + hours_per_day paramétereket."
        )

    end = datetime.now(tz=timezone.utc)
    start = end - timedelta(days=history_days)

    eur_huf = fetch_eur_huf_rate()
    historical = fetch_day_ahead_prices(start, end, api_key=api_key)
    if historical.empty:
        raise HTTPException(status_code=503, detail="Nem sikerült áradatot lekérni.")

    if use_forecast:
        forecast = predict_prices(historical, days_ahead=7)
        series = forecast
        label = "elorejelzett"
    else:
        series = historical
        label = "historikus"

    recs = recommend(series, power_kw=resolved_power_kw, operation_hours_per_day=resolved_hours, eur_huf=eur_huf)
    total_saving = sum(r.potential_daily_saving_huf for r in recs)

    # Éves megtakarítás aggregált (az összes nap átlaga * 365)
    avg_daily_saving = total_saving / len(recs) if recs else 0
    annual_saving_estimate = round(avg_daily_saving * 365, 0)

    # CO2 aggregálás
    total_annual_co2_kg = sum(r.annual_co2_saving_kg for r in recs) / len(recs) if recs else 0

    return {
        "device_id": device_id,
        "device_info": device_info,
        "power_kw": resolved_power_kw,
        "hours_per_day": resolved_hours,
        "data_type": label,
        "total_potential_saving_huf": round(total_saving, 0),
        "annual_saving_estimate_huf": annual_saving_estimate,
        "annual_co2_saving_kg": round(total_annual_co2_kg, 2),
        "social_annual_saving_huf_100k": round(annual_saving_estimate * 100_000, 0),
        "eur_huf_rate": eur_huf,
        "recommendations": [
            {
                "date": r.date,
                "summary": r.summary,
                "potential_saving_huf": r.potential_daily_saving_huf,
                "annual_saving_huf": r.annual_saving_huf,
                "daily_co2_saving_g": r.daily_co2_saving_g,
                "annual_co2_saving_kg": r.annual_co2_saving_kg,
                "social_annual_saving_huf_100k": r.social_annual_saving_huf_100k,
                "social_annual_co2_saving_tonnes_100k": r.social_annual_co2_saving_tonnes_100k,
                "best_windows": [
                    {
                        "start_hour": w.start_hour,
                        "end_hour": w.end_hour,
                        "avg_price_eur": w.avg_price_eur,
                        "avg_price_huf": w.avg_price_huf,
                        "avg_price_huf_kwh": round(w.avg_price_huf / 1000, 2),
                        "total_cost_huf": w.total_cost_huf,
                        "savings_pct": w.savings_vs_worst_pct,
                    }
                    for w in r.best_windows
                ],
                "worst_window": {
                    "start_hour": r.worst_window.start_hour,
                    "end_hour": r.worst_window.end_hour,
                    "avg_price_huf": r.worst_window.avg_price_huf,
                    "avg_price_huf_kwh": round(r.worst_window.avg_price_huf / 1000, 2),
                    "total_cost_huf": r.worst_window.total_cost_huf,
                } if r.worst_window else None,
                "savings_breakdown": {
                    "resident": {
                        "htnt_annual_huf":       r.savings_breakdown.resident_htnt_annual_huf,
                        "htnt_daily_huf":        r.savings_breakdown.resident_htnt_daily_huf,
                        "market_annual_huf":     r.savings_breakdown.resident_market_annual_huf,
                        "market_daily_huf":      r.savings_breakdown.resident_market_daily_huf,
                        "regulated_annual_huf":  0,
                        "ht_price_huf_kwh":      r.savings_breakdown.ht_price_huf_kwh,
                        "nt_price_huf_kwh":      r.savings_breakdown.nt_price_huf_kwh,
                        "regulated_price_huf_kwh": r.savings_breakdown.regulated_price_huf_kwh,
                    },
                    "state": {
                        "procurement_saving_annual_huf": r.savings_breakdown.state_procurement_saving_annual_huf,
                        "procurement_saving_daily_huf":  r.savings_breakdown.state_procurement_saving_daily_huf,
                        "subsidy_saving_annual_huf":     r.savings_breakdown.state_subsidy_saving_annual_huf,
                        "subsidy_saving_daily_huf":      r.savings_breakdown.state_subsidy_saving_daily_huf,
                        "note": (
                            "Ha a csúcsidei tőzsdei ár meghaladta a rezsivédett árat (46.5 Ft/kWh), "
                            "az állam fizette a különbözetet. Az off-peak sávra tolással ez csökken."
                        ),
                    },
                    "context": {
                        "wholesale_peak_huf_kwh":    r.savings_breakdown.wholesale_peak_huf_kwh,
                        "wholesale_offpeak_huf_kwh": r.savings_breakdown.wholesale_offpeak_huf_kwh,
                        "wholesale_diff_huf_kwh":    r.savings_breakdown.wholesale_diff_huf_kwh,
                    },
                } if r.savings_breakdown else None,
            }
            for r in recs
        ],
        "demo_mode": os.getenv("DEMO_MODE", "true").lower() == "true",
    }


@app.get("/api/cities")
@limiter.limit("60/minute")
def get_cities(request: Request):
    """Támogatott magyar városok listája."""
    return {
        "cities": [
            {"key": k, "name": v["name"], "lat": v["lat"], "lon": v["lon"]}
            for k, v in HUNGARIAN_CITIES.items()
        ]
    }


@app.get("/api/cooling-plan")
@limiter.limit("60/minute")
def get_cooling_plan(
    request: Request,
    city: str = Query(default="budapest", description="Város kulcs (pl. budapest, debrecen)"),
    lat: Optional[float] = Query(default=None, description="Szélesség (ha nem városkulcs alapján)"),
    lon: Optional[float] = Query(default=None, description="Hosszúság"),
    ac_power_kw: float = Query(default=AC_POWER_KW_DEFAULT, gt=0, le=20, description="Klíma felvett teljesítménye kW-ban"),
    cop: float = Query(default=COP_DEFAULT, gt=1, le=8, description="Hatásfok (COP), modern inverteres AC ≈ 3.5"),
    comfort_temp_c: float = Query(default=COMFORT_TEMP_C, ge=18, le=30, description="Kényelmi hőmérséklet felső határa °C"),
):
    """
    Klíma hűtési terv: időjárás + villanyár alapján optimális hűtési ütemterv.

    Visszaadja óránként:
    - Kültéri hőmérséklet
    - Villanyszár (Ft/kWh)
    - Javasolt akció: előhűtés / futtasd / hőtartalékon coast / kikapcs
    - Naiv vs. okos stratégia összehasonlítása (megtakarítás Ft-ban)
    """
    api_key = _get_entso_api_key()
    if not api_key:
        raise HTTPException(status_code=503, detail="ENTSO_E_API_KEY environment variable not set")

    # Koordináta feloldás
    if lat is not None and lon is not None:
        resolved_lat, resolved_lon = lat, lon
        city_name = f"{lat:.2f}°N, {lon:.2f}°E"
    else:
        coords = get_city_coords(city)
        if coords is None:
            raise HTTPException(status_code=404, detail=f"Ismeretlen város: '{city}'. Használd a /api/cities endpoint-ot a listáért.")
        resolved_lat = coords["lat"]
        resolved_lon = coords["lon"]
        city_name = coords["name"]

    # Időjárás lekérése (Open-Meteo, 3 nap = ~72 óra)
    weather_hours = fetch_weather_forecast(resolved_lat, resolved_lon, days=3)
    if not weather_hours:
        raise HTTPException(status_code=503, detail="Nem sikerült időjárás-adatot lekérni (Open-Meteo).")

    # Villanyár-előrejelzés (következő 3 nap)
    end = datetime.now(tz=timezone.utc) + timedelta(days=3)
    start = datetime.now(tz=timezone.utc) - timedelta(hours=1)
    eur_huf = fetch_eur_huf_rate()
    historical = fetch_day_ahead_prices(start - timedelta(days=30), end, api_key=api_key)
    if historical.empty:
        raise HTTPException(status_code=503, detail="Nem sikerült áradatot lekérni.")

    forecast_series = predict_prices(historical, days_ahead=3)
    price_hours_raw = combined_forecast(historical, forecast_series, eur_huf=eur_huf)
    price_hours = [
        {
            "timestamp": h.timestamp,
            "price_huf_kwh": round(h.price_huf_mwh / 1000, 2),
            "is_cheap": h.is_cheap,
            "is_expensive": h.is_expensive,
        }
        for h in price_hours_raw
    ]

    # Hűtési terv összeállítása
    plan = build_cooling_plan(
        weather_hours=weather_hours,
        price_hours=price_hours,
        city_name=city_name,
        lat=resolved_lat,
        lon=resolved_lon,
        ac_power_kw=ac_power_kw,
        cop=cop,
        comfort_temp_c=comfort_temp_c,
    )

    return {
        "city": city_name,
        "lat": resolved_lat,
        "lon": resolved_lon,
        "ac_power_kw": ac_power_kw,
        "cop": cop,
        "comfort_temp_c": comfort_temp_c,
        "smart_total_cost_huf": plan.smart_total_cost_huf,
        "naive_total_cost_huf": plan.naive_total_cost_huf,
        "saving_huf": plan.saving_huf,
        "saving_pct": plan.saving_pct,
        "smart_total_kwh": plan.smart_total_kwh,
        "naive_total_kwh": plan.naive_total_kwh,
        "summary": plan.summary,
        "tip": plan.tip,
        "precool_windows": plan.precool_windows,
        "hours": [
            {
                "timestamp": h.timestamp,
                "local_time": h.local_time,
                "hour": h.hour,
                "outdoor_temp_c": round(h.outdoor_temp_c, 1),
                "apparent_temp_c": round(h.apparent_temp_c, 1) if h.apparent_temp_c is not None else None,
                "price_huf_kwh": round(h.price_huf_kwh, 1),
                "is_cheap": h.is_cheap,
                "is_expensive": h.is_expensive,
                "action": h.action,
                "action_label": h.action_label,
                "action_detail": h.action_detail,
                "ac_on": h.ac_on,
                "energy_kwh": h.energy_kwh,
                "cost_huf": round(h.cost_huf, 1),
                "cop_actual": h.cop_actual,
                "naive_ac_on": h.naive_ac_on,
                "naive_cost_huf": round(h.naive_cost_huf, 1),
            }
            for h in plan.hours
        ],
        "demo_mode": os.getenv("DEMO_MODE", "true").lower() == "true",
        "eur_huf_rate": eur_huf,
    }


@app.get("/api/solar-plan")
@limiter.limit("60/minute")
def get_solar_plan(
    request: Request,
    city: str = Query(default="budapest", description="Város kulcs (pl. budapest, pecs)"),
    lat: Optional[float] = Query(default=None, description="Szélesség (opcionális, város helyett)"),
    lon: Optional[float] = Query(default=None, description="Hosszúság"),
    solar_kwp: float = Query(default=4.0, gt=0, le=30.0, description="Napelemes rendszer csúcsteljesítménye (kWp)"),
    household_kw: float = Query(default=TYPICAL_HOUSEHOLD_KW, gt=0, le=10.0, description="Átlagos háztartási alapterhelés (kW)"),
):
    """
    Napelem önfogyasztási terv: mikor érdemes nagy fogyasztókat futtatni
    a napelem-termelési csúcs kihasználásához.

    Visszaad:
    - Óránkénti sugárzás + becsült PV-termelés
    - Cselekvési javaslat (solar_peak / solar_mild / cheap_grid / avoid / night)
    - Napelem vs. napelem-nélküli költség összehasonlítás
    - Éves hozam- és megtakarítás-becslés
    - Top 3 legjobb időablak nagy fogyasztókhoz
    """
    api_key = _get_entso_api_key()
    if not api_key:
        raise HTTPException(status_code=503, detail="ENTSO_E_API_KEY environment variable not set")

    # Koordináta feloldás
    if lat is not None and lon is not None:
        resolved_lat, resolved_lon = lat, lon
        city_name = f"{lat:.2f}°N, {lon:.2f}°E"
    else:
        coords = get_city_coords(city)
        if coords is None:
            raise HTTPException(
                status_code=404,
                detail=f"Ismeretlen város: '{city}'. Használd a /api/cities endpoint-ot a listáért.",
            )
        resolved_lat = coords["lat"]
        resolved_lon = coords["lon"]
        city_name = coords["name"]

    # Időjárás + sugárzás lekérése (Open-Meteo, 3 nap)
    weather_hours = fetch_weather_forecast(resolved_lat, resolved_lon, days=3)
    if not weather_hours:
        raise HTTPException(status_code=503, detail="Nem sikerült időjárás-adatot lekérni (Open-Meteo).")

    # Villanyár-előrejelzés (következő 3 nap)
    end = datetime.now(tz=timezone.utc) + timedelta(days=3)
    start_dt = datetime.now(tz=timezone.utc) - timedelta(hours=1)
    eur_huf = fetch_eur_huf_rate()
    historical = fetch_day_ahead_prices(start_dt - timedelta(days=30), end, api_key=api_key)
    if historical.empty:
        raise HTTPException(status_code=503, detail="Nem sikerült áradatot lekérni.")

    forecast_series = predict_prices(historical, days_ahead=3)
    price_hours_raw = combined_forecast(historical, forecast_series, eur_huf=eur_huf)
    price_hours = [
        {
            "timestamp": h.timestamp,
            "price_huf_kwh": round(h.price_huf_mwh / 1000, 2),
            "is_cheap": h.is_cheap,
            "is_expensive": h.is_expensive,
        }
        for h in price_hours_raw
    ]

    plan = build_solar_plan(
        weather_hours=weather_hours,
        price_hours=price_hours,
        city_name=city_name,
        lat=resolved_lat,
        lon=resolved_lon,
        solar_kwp=solar_kwp,
        household_kw=household_kw,
    )

    return {
        "city": city_name,
        "lat": resolved_lat,
        "lon": resolved_lon,
        "solar_kwp": solar_kwp,
        "household_kw": household_kw,
        "total_production_kwh_48h": plan.total_production_kwh_48h,
        "total_savings_huf_48h": plan.total_savings_huf_48h,
        "daily_production_kwh_estimate": plan.daily_production_kwh_estimate,
        "annual_production_kwh_estimate": plan.annual_production_kwh_estimate,
        "annual_savings_huf_estimate": plan.annual_savings_huf_estimate,
        "best_load_windows": plan.best_load_windows,
        "summary": plan.summary,
        "tip": plan.tip,
        "hours": [
            {
                "timestamp": h.timestamp,
                "local_time": h.local_time,
                "hour": h.hour,
                "irradiance_wm2": h.irradiance_wm2,
                "solar_production_kwh": h.solar_production_kwh,
                "price_huf_kwh": h.price_huf_kwh,
                "is_cheap": h.is_cheap,
                "is_expensive": h.is_expensive,
                "action": h.action,
                "action_label": h.action_label,
                "action_detail": h.action_detail,
                "cost_with_solar_huf": h.cost_with_solar_huf,
                "cost_without_solar_huf": h.cost_without_solar_huf,
                "solar_covers_pct": h.solar_covers_pct,
            }
            for h in plan.hours
        ],
        "demo_mode": os.getenv("DEMO_MODE", "true").lower() == "true",
        "eur_huf_rate": eur_huf,
    }


# ---------------------------------------------------------------------------
# Magyar VER (villamosenergia-rendszer) adatok — MAVIR RTDW
# A fetcherek 15 perces memória-cache-t használnak; hiba esetén sosem 500,
# hanem {"available": false, ...} válasz megy vissza.
# ---------------------------------------------------------------------------


def _grid_response(fetcher) -> dict:
    """Fetcher futtatása kecses hibakezeléssel."""
    try:
        return fetcher()
    except Exception as e:
        logging.getLogger(__name__).error(f"Grid adat lekérés sikertelen: {type(e).__name__}: {e}")
        return {"available": False, "error": "A MAVIR adatforrás jelenleg nem elérhető."}


@app.get("/api/grid/load")
@limiter.limit("60/minute")
def get_grid_load(request: Request):
    """
    Rendszerterhelés (MAVIR): bruttó/nettó tény + terv + dayahead becslés.

    Idősor: elmúlt 12 óra + következő 24 óra, 15 perces felbontásban, MW-ban.
    """
    return _grid_response(fetch_system_load)


@app.get("/api/grid/renewables")
@limiter.limit("60/minute")
def get_grid_renewables(request: Request):
    """
    Nap- és szélerőművi termelés (MAVIR): tény + aktuális/dayahead becslés.

    Idősor: elmúlt 12 óra + következő 24 óra, 15 perces felbontásban, MW-ban.
    """
    return _grid_response(fetch_renewables_forecast)


@app.get("/api/grid/flows")
@limiter.limit("60/minute")
def get_grid_flows(request: Request):
    """
    Határkeresztező áramlások (MAVIR): tény + menetrend határonként,
    valamint nettó import/export. Pozitív = import Magyarországra.
    """
    return _grid_response(fetch_crossborder_flows)


@app.get("/api/grid/mix")
@limiter.limit("60/minute")
def get_grid_mix(request: Request):
    """
    Termelési mix energiaforrás szerint (MAVIR): MW + részarány (%),
    külön megújuló összesítéssel.
    """
    return _grid_response(fetch_generation_mix)


if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR / "static")), name="static")
