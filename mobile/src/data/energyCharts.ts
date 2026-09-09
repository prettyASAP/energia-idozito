import type { HourPoint } from '../domain/types';

// Day-ahead árak az energy-charts.info API-ról (Fraunhofer ISE).
// Kulcs nélküli, CC BY 4.0 licencű forrás — adat: Bundesnetzagentur | SMARD.de.
// 15 perces felbontás; alapból óránkénti átlagra összegezzük.

const BASE = 'https://api.energy-charts.info/price?bzn=HU';

interface EnergyChartsResponse {
  unix_seconds?: number[];
  price?: (number | null)[];
  license_info?: string;
}

/** "2026-09-09T07:55+00:00" — perc pontosságú UTC ISO, ahogy a Python isoformat(timespec='minutes') adja. */
export function isoMinutes(d: Date): string {
  return d.toISOString().slice(0, 16) + '+00:00';
}

export function energyChartsUrl(start: Date, end: Date): string {
  return `${BASE}&start=${encodeURIComponent(isoMinutes(start))}&end=${encodeURIComponent(isoMinutes(end))}`;
}

/** Nyers válasz → óránkénti átlagolt pontok (ms, EUR/MWh), időrendben. */
export function parseEnergyCharts(data: EnergyChartsResponse, hourly = true): HourPoint[] {
  const ts = data.unix_seconds ?? [];
  const pr = data.price ?? [];
  const buckets = new Map<number, { sum: number; n: number }>();
  for (let i = 0; i < ts.length; i++) {
    const p = pr[i];
    if (p == null || Number.isNaN(p)) continue;
    const t = hourly ? Math.floor(ts[i] / 3600) * 3600 : ts[i];
    const b = buckets.get(t);
    if (b) {
      b.sum += p;
      b.n += 1;
    } else buckets.set(t, { sum: p, n: 1 });
  }
  return [...buckets.entries()]
    .map(([t, b]) => ({ t: t * 1000, p: b.sum / b.n }))
    .sort((a, b) => a.t - b.t);
}

export async function fetchDayAheadPrices(start: Date, end: Date, hourly = true, timeoutMs = 20000): Promise<HourPoint[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(energyChartsUrl(start, end), { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`energy-charts HTTP ${res.status}`);
    const json = (await res.json()) as EnergyChartsResponse;
    return parseEnergyCharts(json, hourly);
  } finally {
    clearTimeout(timer);
  }
}
