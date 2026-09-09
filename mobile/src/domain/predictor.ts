import type { HourPoint, ModelAccuracy, PricePoint } from './types';
import { zonedParts } from './time';

const HOUR = 3600000;
const DAY = 24 * HOUR;

// Determinisztikus véletlengenerátor (a Python np.random.seed(42) megfelelője célra:
// azonos bemenetre azonos előrejelzés).
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rng: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/** numpy/pandas-féle lineáris interpolációs kvantilis. */
export function quantile(values: number[], q: number): number {
  if (!values.length) return NaN;
  const s = [...values].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return s[lo];
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

/** Minta-szórás (ddof = 1), mint a pandas std(). 1 elemnél NaN. */
function sampleStd(xs: number[]): number {
  if (xs.length < 2) return NaN;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
}

interface Pattern {
  meanBy: Map<number, number>;
  stdBy: Map<number, number>;
}

const groupKey = (t: number) => {
  const p = zonedParts(new Date(t));
  return p.dow * 24 + p.hour;
};

function buildPattern(hist: HourPoint[]): Pattern {
  const groups = new Map<number, number[]>();
  for (const h of hist) {
    const k = groupKey(h.t);
    const g = groups.get(k);
    if (g) g.push(h.p);
    else groups.set(k, [h.p]);
  }
  const meanBy = new Map<number, number>();
  const stdBy = new Map<number, number>();
  for (const [k, xs] of groups) {
    meanBy.set(k, mean(xs));
    const s = sampleStd(xs);
    stdBy.set(k, Number.isNaN(s) ? 5.0 : s);
  }
  return { meanBy, stdBy };
}

/**
 * Árelőrejelzés: (hét napja, óra) szerinti átlag × az elmúlt 7 nap trendje + kis zaj.
 * A historikus sor utolsó órája utáni órától indul.
 */
export function predictPrices(hist: HourPoint[], daysAhead = 7): HourPoint[] {
  if (!hist.length) return [];
  const sorted = [...hist].sort((a, b) => a.t - b.t);
  const { meanBy, stdBy } = buildPattern(sorted);
  const last = sorted[sorted.length - 1].t;
  const cutoff = last - 7 * DAY;
  const recent = sorted.filter((h) => h.t >= cutoff).map((h) => h.p);
  const overallMean = mean(sorted.map((h) => h.p));
  const recentMean = recent.length ? mean(recent) : overallMean;
  const trend = overallMean !== 0 ? recentMean / overallMean : 1.0;

  const rng = mulberry32(42);
  const start = Math.floor((last + HOUR) / HOUR) * HOUR;
  const out: HourPoint[] = [];
  for (let i = 0; i < daysAhead * 24; i++) {
    const t = start + i * HOUR;
    const k = groupKey(t);
    const base = meanBy.get(k) ?? overallMean;
    const std = stdBy.get(k) ?? 5.0;
    const noise = gaussian(rng) * std * 0.3;
    out.push({ t, p: base * trend + noise });
  }
  return out;
}

/** Konfidencia-sáv az előrejelzett pontokhoz a historikus szórás alapján. */
export function confidenceIntervals(hist: HourPoint[], forecast: HourPoint[], sigma = 1.0) {
  const { stdBy } = buildPattern(hist);
  return forecast.map((f) => {
    const std = stdBy.get(groupKey(f.t)) ?? 5.0;
    return { t: f.t, lower: Math.max(0, f.p - sigma * std), upper: f.p + sigma * std };
  });
}

/** Walk-forward validáció: az utolsó 7 nap a megelőző időszakból előrejelezve (MAPE %). */
export function computeModelAccuracy(hist: HourPoint[]): ModelAccuracy {
  const MIN_DAYS = 14;
  const ps = hist.map((h) => h.p);
  if (hist.length < MIN_DAYS * 24) {
    const m = mean(ps);
    const s = sampleStd(ps);
    const cv = m > 0 && !Number.isNaN(s) ? Math.round((s / m) * 1000) / 10 : 20.0;
    return { mape_pct: cv, validation_days: 0, method: 'cv' };
  }
  const sorted = [...hist].sort((a, b) => a.t - b.t);
  const cutoff = sorted[sorted.length - 1].t - 7 * DAY;
  const train = sorted.filter((h) => h.t < cutoff);
  const test = sorted.filter((h) => h.t >= cutoff);
  if (!train.length || !test.length) return { mape_pct: 20.0, validation_days: 0, method: 'fallback' };
  const pred = new Map(predictPrices(train, 8).map((h) => [h.t, h.p]));
  const errs: number[] = [];
  for (const h of test) {
    const p = pred.get(h.t);
    if (p == null || Math.abs(h.p) <= 1.0) continue;
    errs.push(Math.abs((h.p - p) / h.p));
  }
  if (!errs.length) return { mape_pct: 20.0, validation_days: 7, method: 'walkforward' };
  const mape = mean(errs) * 100;
  return { mape_pct: Math.round(Math.min(mape, 99.0) * 10) / 10, validation_days: 7, method: 'walkforward' };
}

const r2 = (x: number) => Math.round(x * 100) / 100;

/** Historikus (utolsó history_days nap) + előrejelzett órák egy listában, olcsó/drága jelöléssel. */
export function combinedForecast(hist: HourPoint[], forecast: HourPoint[], eurHuf: number, historyDays = 7): PricePoint[] {
  if (!hist.length) return [];
  const sorted = [...hist].sort((a, b) => a.t - b.t);
  const all = [...sorted.map((h) => h.p), ...forecast.map((h) => h.p)];
  const qLow = quantile(all, 0.25);
  const qHigh = quantile(all, 0.75);
  const ci = new Map(confidenceIntervals(sorted, forecast).map((c) => [c.t, c]));
  const cutoff = sorted[sorted.length - 1].t - historyDays * DAY;
  const out: PricePoint[] = [];
  for (const h of sorted) {
    if (h.t < cutoff) continue;
    const hufMwh = Math.round(h.p * eurHuf);
    out.push({
      timestamp: new Date(h.t).toISOString(),
      price_eur_mwh: r2(h.p),
      price_huf_mwh: hufMwh,
      price_huf_kwh: r2(hufMwh / 1000),
      is_cheap: h.p <= qLow,
      is_expensive: h.p >= qHigh,
      is_forecast: false,
      ci_lower_huf_kwh: r2(hufMwh / 1000),
      ci_upper_huf_kwh: r2(hufMwh / 1000),
    });
  }
  for (const f of forecast) {
    const c = ci.get(f.t);
    const hufMwh = Math.round(f.p * eurHuf);
    out.push({
      timestamp: new Date(f.t).toISOString(),
      price_eur_mwh: r2(f.p),
      price_huf_mwh: hufMwh,
      price_huf_kwh: r2(hufMwh / 1000),
      is_cheap: f.p <= qLow,
      is_expensive: f.p >= qHigh,
      is_forecast: true,
      ci_lower_huf_kwh: r2(Math.round((c?.lower ?? f.p) * eurHuf) / 1000),
      ci_upper_huf_kwh: r2(Math.round((c?.upper ?? f.p) * eurHuf) / 1000),
    });
  }
  return out;
}
