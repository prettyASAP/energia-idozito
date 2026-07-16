import pandas as pd
import numpy as np
from dataclasses import dataclass
from typing import List


@dataclass
class HourlyPrice:
    timestamp: str
    price_eur_mwh: float
    price_huf_mwh: float
    is_cheap: bool
    is_expensive: bool


@dataclass
class DaySummary:
    date: str
    min_price: float
    max_price: float
    avg_price: float
    cheapest_hours: List[int]
    most_expensive_hours: List[int]


DEFAULT_EUR_HUF = 395.0
CHEAP_THRESHOLD = 0.25
EXPENSIVE_THRESHOLD = 0.75


def analyze_prices(series: pd.Series, eur_huf: float = DEFAULT_EUR_HUF) -> List[HourlyPrice]:
    if series.empty:
        return []

    q_low = series.quantile(CHEAP_THRESHOLD)
    q_high = series.quantile(EXPENSIVE_THRESHOLD)

    result = []
    for ts, price in series.items():
        result.append(HourlyPrice(
            timestamp=ts.isoformat(),
            price_eur_mwh=round(float(price), 2),
            price_huf_mwh=round(float(price) * eur_huf, 0),
            is_cheap=bool(float(price) <= q_low),
            is_expensive=bool(float(price) >= q_high),
        ))
    return result


def daily_summary(series: pd.Series) -> List[DaySummary]:
    if series.empty:
        return []

    summaries = []
    for date, group in series.groupby(series.index.date):
        sorted_hours = group.sort_values()
        n = max(1, len(group) // 4)

        cheapest = [ts.hour for ts in sorted_hours.head(n).index]
        expensive = [ts.hour for ts in sorted_hours.tail(n).index]

        summaries.append(DaySummary(
            date=str(date),
            min_price=round(float(group.min()), 2),
            max_price=round(float(group.max()), 2),
            avg_price=round(float(group.mean()), 2),
            cheapest_hours=sorted(cheapest),
            most_expensive_hours=sorted(expensive),
        ))
    return summaries


def weekly_pattern(series: pd.Series) -> dict:
    """Heti átlagos óránkénti árprofil."""
    if series.empty:
        return {}

    df = series.to_frame(name="price")
    df["hour"] = df.index.hour
    df["dayofweek"] = df.index.dayofweek

    hourly_avg = df.groupby("hour")["price"].mean().round(2)
    daily_avg = df.groupby("dayofweek")["price"].mean().round(2)

    days = ["Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat", "Vasárnap"]
    return {
        "hourly_avg": hourly_avg.to_dict(),
        "daily_avg": {days[k]: v for k, v in daily_avg.to_dict().items()},
        "overall_avg": round(float(series.mean()), 2),
        "overall_min": round(float(series.min()), 2),
        "overall_max": round(float(series.max()), 2),
    }
