"""
Open-Meteo időjárás adatok lekérése – ingyenes, nyílt forrású, API kulcs nélkül.
https://open-meteo.com/
"""

import logging
from datetime import datetime, timezone
from typing import Optional
import httpx

log = logging.getLogger(__name__)

# Magyar városok koordinátái
HUNGARIAN_CITIES = {
    "budapest":   {"lat": 47.4979, "lon": 19.0402, "name": "Budapest"},
    "debrecen":   {"lat": 47.5316, "lon": 21.6273, "name": "Debrecen"},
    "pecs":       {"lat": 46.0727, "lon": 18.2323, "name": "Pécs"},
    "miskolc":    {"lat": 48.1035, "lon": 20.7784, "name": "Miskolc"},
    "gyor":       {"lat": 47.6875, "lon": 17.6504, "name": "Győr"},
    "szeged":     {"lat": 46.2530, "lon": 20.1414, "name": "Szeged"},
    "nyiregyhaza":{"lat": 47.9495, "lon": 21.7244, "name": "Nyíregyháza"},
    "kecskemet":  {"lat": 46.9067, "lon": 19.6915, "name": "Kecskemét"},
    "szekesfehervar": {"lat": 47.1860, "lon": 18.4221, "name": "Székesfehérvár"},
    "szombathely":{"lat": 47.2307, "lon": 16.6218, "name": "Szombathely"},
    "szolnok":    {"lat": 47.1767, "lon": 20.1852, "name": "Szolnok"},
    "tatabanya":  {"lat": 47.5853, "lon": 18.4044, "name": "Tatabánya"},
    "kaposvar":   {"lat": 46.3590, "lon": 17.7965, "name": "Kaposvár"},
    "eger":       {"lat": 47.9025, "lon": 20.3772, "name": "Eger"},
    "veszprem":   {"lat": 47.1028, "lon": 17.9093, "name": "Veszprém"},
    "zalaegerszeg":{"lat": 46.8417, "lon": 16.8416, "name": "Zalaegerszeg"},
    "sopron":     {"lat": 47.6849, "lon": 16.5897, "name": "Sopron"},
    "bekescsaba": {"lat": 46.6833, "lon": 21.0833, "name": "Békéscsaba"},
    "szekszard":  {"lat": 46.3492, "lon": 18.7068, "name": "Szekszárd"},
    "dunaujvaros":{"lat": 46.9619, "lon": 18.9355, "name": "Dunaújváros"},
}


def get_city_coords(city_key: str) -> Optional[dict]:
    return HUNGARIAN_CITIES.get(city_key.lower().replace(" ", "").replace("-", ""))


def fetch_weather_forecast(lat: float, lon: float, days: int = 3) -> list[dict]:
    """
    48-72 óra hőmérséklet + látszólagos hőmérséklet előrejelzés.
    Visszaad egy listát {timestamp, temp_c, apparent_temp_c} dict-ekből.
    """
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": "temperature_2m,apparent_temperature,relative_humidity_2m,shortwave_radiation",
        "forecast_days": days,
        "timezone": "Europe/Budapest",
        "wind_speed_unit": "kmh",
    }

    try:
        resp = httpx.get(url, params=params, timeout=10.0)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        log.error("Open-Meteo hiba: %s", e)
        return []

    hourly = data.get("hourly", {})
    times = hourly.get("time", [])
    temps = hourly.get("temperature_2m", [])
    apparent = hourly.get("apparent_temperature", [])
    humidity = hourly.get("relative_humidity_2m", [])
    irradiance = hourly.get("shortwave_radiation", [])

    result = []
    for i, ts_str in enumerate(times):
        try:
            # Open-Meteo local time string: "2024-07-15T14:00"
            dt = datetime.fromisoformat(ts_str)
            # Convert to UTC-aware for consistency with ENTSO-E
            dt_utc = dt.astimezone(timezone.utc)
        except Exception:
            continue
        result.append({
            "timestamp": dt_utc.isoformat(),
            "local_time": ts_str,
            "hour": dt.hour,
            "temp_c": temps[i] if i < len(temps) else None,
            "apparent_temp_c": apparent[i] if i < len(apparent) else None,
            "humidity_pct": humidity[i] if i < len(humidity) else None,
            "irradiance_wm2": irradiance[i] if i < len(irradiance) else None,
        })

    return result
