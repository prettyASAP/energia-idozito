import pandas as pd
import numpy as np
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class PredictedHour:
    timestamp: str
    price_eur_mwh: float
    price_huf_mwh: float
    is_cheap: bool
    is_expensive: bool
    is_forecast: bool
    ci_lower_huf_mwh: float = 0.0
    ci_upper_huf_mwh: float = 0.0


def predict_prices(historical: pd.Series, days_ahead: int = 7) -> pd.Series:
    """
    Előre jelzi az árakat az elmúlt időszak mintázata alapján.

    Modell:
      - (hét napja, óra) szerinti átlagos árakon alapul
      - az elmúlt 7 nap trendjével korrigálva
      - kis véletlenszerű zajjal a realisztikusabb megjelenés érdekében
    """
    if historical.empty:
        return pd.Series(dtype=float, name="price_eur_mwh")

    df = historical.to_frame("price")
    df["hour"] = df.index.hour
    df["dayofweek"] = df.index.dayofweek

    # Alap minta: (hét napja, óra) szerinti átlag
    pattern = df.groupby(["dayofweek", "hour"])["price"].mean()

    # Trend: elmúlt 7 nap vs. teljes időszak átlag
    cutoff = historical.index[-1] - pd.Timedelta(days=7)
    recent = historical[historical.index >= cutoff]
    overall_mean = float(historical.mean())
    recent_mean = float(recent.mean()) if not recent.empty else overall_mean
    trend_factor = recent_mean / overall_mean if overall_mean != 0 else 1.0

    # Szórás a historikus adatokból
    hourly_std = df.groupby(["dayofweek", "hour"])["price"].std().fillna(5.0)

    # Előrejelzési idősor: holnaptól számítva
    tz = historical.index.tz
    start = (historical.index[-1] + pd.Timedelta(hours=1)).floor("h")
    future_index = pd.date_range(start=start, periods=days_ahead * 24, freq="1h", tz=tz)

    np.random.seed(42)
    predictions = []
    for ts in future_index:
        dow = ts.dayofweek
        hour = ts.hour
        base = pattern.get((dow, hour), overall_mean)
        std = float(hourly_std.get((dow, hour), 5.0))
        noise = np.random.normal(0, std * 0.3)
        pred = base * trend_factor + noise
        predictions.append(float(pred))

    return pd.Series(predictions, index=future_index, name="price_eur_mwh")


def compute_confidence_intervals(
    historical: pd.Series,
    forecast: pd.Series,
    sigma: float = 1.0,
) -> tuple:
    """
    Konfidencia intervallum az előrejelzett pontokhoz a historikus szórás alapján.

    Args:
        historical: Historikus árak
        forecast: Előrejelzett árak (pd.Series)
        sigma: Szórás szorzó (1.0 ≈ 68%-os CI, 1.96 ≈ 95%-os CI)

    Returns:
        (ci_lower, ci_upper) tuple of pd.Series
    """
    df = historical.to_frame("price")
    df["hour"] = df.index.hour
    df["dayofweek"] = df.index.dayofweek
    hourly_std = df.groupby(["dayofweek", "hour"])["price"].std().fillna(5.0)

    ci_lowers = []
    ci_uppers = []
    for ts, price in forecast.items():
        dow = ts.dayofweek
        hour = ts.hour
        std = float(hourly_std.get((dow, hour), 5.0))
        ci_lowers.append(max(0.0, price - sigma * std))
        ci_uppers.append(price + sigma * std)

    return (
        pd.Series(ci_lowers, index=forecast.index),
        pd.Series(ci_uppers, index=forecast.index),
    )


def compute_model_accuracy(historical: pd.Series) -> dict:
    """
    Becsüli a modell pontosságát walk-forward validációval.
    Az utolsó 7 nap adatait az azt megelőző időszak alapján jelzi előre,
    majd összeveti a valódi értékekkel.

    Returns:
        dict: mape_pct (MAPE %) és validation_days
    """
    MIN_DAYS = 14
    if len(historical) < MIN_DAYS * 24:
        # Nincs elég adat a validációhoz — CV alapú becslés
        mean = float(historical.mean())
        std = float(historical.std())
        cv_pct = round((std / mean) * 100, 1) if mean > 0 else 20.0
        return {"mape_pct": cv_pct, "validation_days": 0, "method": "cv"}

    # Train: minden adat az utolsó 7 nap előtt, Test: utolsó 7 nap
    cutoff = historical.index[-1] - pd.Timedelta(days=7)
    train = historical[historical.index < cutoff]
    test = historical[historical.index >= cutoff]

    if train.empty or test.empty:
        return {"mape_pct": 20.0, "validation_days": 0, "method": "fallback"}

    # Előrejelzés a train alapján
    pred = predict_prices(train, days_ahead=8)

    # Közös időpontok
    common_idx = test.index.intersection(pred.index)
    if len(common_idx) == 0:
        return {"mape_pct": 20.0, "validation_days": 0, "method": "fallback"}

    actual = test[common_idx].values
    predicted = pred[common_idx].values

    # MAPE kiszámítása (nullával való osztás elkerülése)
    mask = np.abs(actual) > 1.0
    if not mask.any():
        return {"mape_pct": 20.0, "validation_days": 7, "method": "walkforward"}

    mape = float(np.mean(np.abs((actual[mask] - predicted[mask]) / actual[mask])) * 100)
    return {
        "mape_pct": round(min(mape, 99.0), 1),
        "validation_days": 7,
        "method": "walkforward",
    }


def combined_forecast(
    historical: pd.Series,
    forecast: pd.Series,
    eur_huf: float,
    days_ahead: int = 7,
    history_days: int = 7,
) -> List[PredictedHour]:
    """Összekapcsolt historikus + előrejelzett adatsor a frontendnek, konfidencia intervalumokkal."""

    CHEAP_Q = 0.25
    EXP_Q = 0.75

    combined = pd.concat([historical, forecast])
    q_low = float(combined.quantile(CHEAP_Q))
    q_high = float(combined.quantile(EXP_Q))

    # Konfidencia intervallumok az előrejelzett adatokra
    ci_lower, ci_upper = compute_confidence_intervals(historical, forecast, sigma=1.0)

    result = []

    # Historikus adatok (utolsó history_days nap)
    cutoff = historical.index[-1] - pd.Timedelta(days=history_days)
    hist_slice = historical[historical.index >= cutoff]
    for ts, price in hist_slice.items():
        huf = round(float(price) * eur_huf, 0)
        result.append(PredictedHour(
            timestamp=ts.isoformat(),
            price_eur_mwh=round(float(price), 2),
            price_huf_mwh=huf,
            is_cheap=bool(float(price) <= q_low),
            is_expensive=bool(float(price) >= q_high),
            is_forecast=False,
            ci_lower_huf_mwh=huf,
            ci_upper_huf_mwh=huf,
        ))

    # Előrejelzett adatok CI-vel
    for ts, price in forecast.items():
        cl = float(ci_lower.get(ts, price))
        cu = float(ci_upper.get(ts, price))
        result.append(PredictedHour(
            timestamp=ts.isoformat(),
            price_eur_mwh=round(float(price), 2),
            price_huf_mwh=round(float(price) * eur_huf, 0),
            is_cheap=bool(float(price) <= q_low),
            is_expensive=bool(float(price) >= q_high),
            is_forecast=True,
            ci_lower_huf_mwh=round(cl * eur_huf, 0),
            ci_upper_huf_mwh=round(cu * eur_huf, 0),
        ))

    return result
