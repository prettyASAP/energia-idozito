import type { WeatherHour } from '../domain/types';
import { localTimeString, zonedParts } from '../domain/time';

// Open-Meteo időjárás-előrejelzés — ingyenes, kulcs nélküli.

export interface City {
  key: string;
  name: string;
  lat: number;
  lon: number;
}

export const HUNGARIAN_CITIES: City[] = [
  { key: 'budapest', name: 'Budapest', lat: 47.4979, lon: 19.0402 },
  { key: 'debrecen', name: 'Debrecen', lat: 47.5316, lon: 21.6273 },
  { key: 'szeged', name: 'Szeged', lat: 46.253, lon: 20.1414 },
  { key: 'miskolc', name: 'Miskolc', lat: 48.1035, lon: 20.7784 },
  { key: 'pecs', name: 'Pécs', lat: 46.0727, lon: 18.2323 },
  { key: 'gyor', name: 'Győr', lat: 47.6875, lon: 17.6504 },
  { key: 'nyiregyhaza', name: 'Nyíregyháza', lat: 47.9495, lon: 21.7244 },
  { key: 'kecskemet', name: 'Kecskemét', lat: 46.9067, lon: 19.6915 },
  { key: 'szekesfehervar', name: 'Székesfehérvár', lat: 47.186, lon: 18.4221 },
  { key: 'szombathely', name: 'Szombathely', lat: 47.2307, lon: 16.6218 },
  { key: 'szolnok', name: 'Szolnok', lat: 47.1767, lon: 20.1852 },
  { key: 'tatabanya', name: 'Tatabánya', lat: 47.5853, lon: 18.4044 },
  { key: 'kaposvar', name: 'Kaposvár', lat: 46.359, lon: 17.7965 },
  { key: 'eger', name: 'Eger', lat: 47.9025, lon: 20.3772 },
  { key: 'veszprem', name: 'Veszprém', lat: 47.1028, lon: 17.9093 },
  { key: 'zalaegerszeg', name: 'Zalaegerszeg', lat: 46.8417, lon: 16.8416 },
  { key: 'sopron', name: 'Sopron', lat: 47.6849, lon: 16.5897 },
  { key: 'bekescsaba', name: 'Békéscsaba', lat: 46.6833, lon: 21.0833 },
  { key: 'szekszard', name: 'Szekszárd', lat: 46.3492, lon: 18.7068 },
  { key: 'dunaujvaros', name: 'Dunaújváros', lat: 46.9619, lon: 18.9355 },
];

export function cityByKey(key: string): City {
  return HUNGARIAN_CITIES.find((c) => c.key === key) ?? HUNGARIAN_CITIES[0];
}

interface OpenMeteoResponse {
  hourly?: {
    time?: number[];
    temperature_2m?: (number | null)[];
    apparent_temperature?: (number | null)[];
    relative_humidity_2m?: (number | null)[];
    shortwave_radiation?: (number | null)[];
  };
}

export function openMeteoUrl(lat: number, lon: number, days = 3): string {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    hourly: 'temperature_2m,apparent_temperature,relative_humidity_2m,shortwave_radiation',
    forecast_days: String(days),
    timezone: 'Europe/Budapest',
    timeformat: 'unixtime',
    wind_speed_unit: 'kmh',
  });
  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
}

export function parseOpenMeteo(data: OpenMeteoResponse): WeatherHour[] {
  const h = data.hourly ?? {};
  const times = h.time ?? [];
  const out: WeatherHour[] = [];
  for (let i = 0; i < times.length; i++) {
    const d = new Date(times[i] * 1000);
    out.push({
      timestamp: d.toISOString(),
      local_time: localTimeString(d),
      hour: zonedParts(d).hour,
      temp_c: h.temperature_2m?.[i] ?? null,
      apparent_temp_c: h.apparent_temperature?.[i] ?? null,
      humidity_pct: h.relative_humidity_2m?.[i] ?? null,
      irradiance_wm2: h.shortwave_radiation?.[i] ?? null,
    });
  }
  return out;
}

export async function fetchWeatherForecast(lat: number, lon: number, days = 3, timeoutMs = 10000): Promise<WeatherHour[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(openMeteoUrl(lat, lon, days), { signal: ctrl.signal });
    if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
    return parseOpenMeteo((await res.json()) as OpenMeteoResponse);
  } finally {
    clearTimeout(timer);
  }
}
