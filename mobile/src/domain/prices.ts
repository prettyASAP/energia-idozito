import type { Level, PricePoint, Device } from './types';
import { MAIN_DEV } from './devices';
import { hourKey, startOfZonedDay, zonedParts } from './time';
import { fmt, fmt1, hhmm, windowStr } from './format';

const FILL = 30; // hiányzó óra helyettesítő ára (mint a webes appban)
const HOUR = 3600000;

/** hourKey → Ft/kWh index, hogy ne O(n·m) legyen a párosítás. */
export function indexPrices(prices: PricePoint[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of prices) m.set(hourKey(new Date(p.timestamp)), p.price_huf_kwh);
  return m;
}

/** Órák tömbje a magyar nap kezdetétől: startDayOffset = 0 → [0..23]=ma, [24..47]=holnap */
export function hourArray(
  prices: PricePoint[] | Map<string, number>,
  now: Date,
  startDayOffset: number,
  count: number,
): (number | null)[] {
  const idx = prices instanceof Map ? prices : indexPrices(prices);
  const dayStart = startOfZonedDay(now, startDayOffset).getTime();
  const out: (number | null)[] = [];
  for (let i = 0; i < count; i++) {
    const v = idx.get(hourKey(new Date(dayStart + i * HOUR)));
    out.push(v ?? null);
  }
  return out;
}

export const getPrArr = (prices: PricePoint[] | Map<string, number>, now: Date) => hourArray(prices, now, 0, 48);
export const getPrArrWithYesterday = (prices: PricePoint[] | Map<string, number>, now: Date) => hourArray(prices, now, -1, 72);

/** Árszint a rendezett napi tömb 8. és 17. eleme alapján (design: sorted[7], sorted[16]). */
export function level(p: number, sorted24: number[]): Level {
  return p <= sorted24[7] ? 'olcso' : p >= sorted24[16] ? 'draga' : 'atlagos';
}

export function sortedArr(arr: number[]): number[] {
  return [...arr].sort((a, b) => a - b);
}

export function fillDay(arr: (number | null)[]): number[] {
  return arr.map((x) => x ?? FILL);
}

/** Napi rendezett tömb: hiányzók 30-cal pótolva, 24 elemre kitöltve. */
export function sortedDay(arr: (number | null)[]): number[] {
  const s = sortedArr(fillDay(arr));
  while (s.length < 24) s.push(s[s.length - 1] ?? FILL);
  return s;
}

export interface Window {
  start: number;
  avg: number;
}

/** A `from` órától induló 24 órán belüli legolcsóbb `dur` hosszú összefüggő sáv. */
export function bestWindow(pr: (number | null)[], from: number, dur: number): Window {
  let best = from;
  let bestAvg = 1e9;
  const limit = Math.min(from + 24 - dur + 1, pr.length - dur + 1);
  for (let s = from; s < limit; s++) {
    const slice = pr.slice(s, s + dur);
    if (slice.some((x) => x == null)) continue;
    const avg = (slice as number[]).reduce((a, b) => a + b, 0) / dur;
    if (avg < bestAvg) {
      bestAvg = avg;
      best = s;
    }
  }
  return { start: best, avg: bestAvg < 1e9 ? bestAvg : pr[from] ?? FILL };
}

/** Csak nappali (06:00–21:00 közti) indulással. */
export function bestWindowDay(pr: (number | null)[], from: number, dur: number): Window | null {
  let best: number | null = null;
  let bestAvg = 1e9;
  const limit = Math.min(from + 24 - dur + 1, pr.length - dur + 1);
  for (let s = from; s < limit; s++) {
    const h = s % 24;
    if (h < 6 || h >= 22) continue;
    const slice = pr.slice(s, s + dur);
    if (slice.some((x) => x == null)) continue;
    const avg = (slice as number[]).reduce((a, b) => a + b, 0) / dur;
    if (avg < bestAvg) {
      bestAvg = avg;
      best = s;
    }
  }
  return best === null ? null : { start: best, avg: bestAvg };
}

// ── Hero ────────────────────────────────────────────────────────────────

export interface GridContext {
  solarMW: number | null;
  netImportMW: number | null;
}

export interface HeroModel {
  cur: number;
  prev: number;
  lvl: Level;
  avg24: number;
  deltaPct: number;
  statusLabel: string;
  sub: string;
  why: string;
  nextCheapIn: number;
  nowH: number;
  pr: (number | null)[];
  sorted: number[];
}

export function heroModel(prices: PricePoint[] | Map<string, number>, now: Date, grid?: GridContext | null): HeroModel {
  const pr = getPrArr(prices, now);
  const nowH = zonedParts(now).hour;
  const todayFilled = fillDay(pr.slice(0, 24));
  const sorted = sortedDay(pr.slice(0, 24));
  const cur = todayFilled[nowH];
  const prev = todayFilled[(nowH - 1 + 24) % 24];
  const lvl = level(cur, sorted);
  const avg24 = todayFilled.reduce((a, b) => a + b, 0) / 24;
  const deltaPct = prev !== 0 ? ((cur - prev) / prev) * 100 : 0;

  const statusLabel = lvl === 'olcso' ? 'Most olcsó' : lvl === 'draga' ? 'Most drága' : 'Átlagos ár';

  let nextCheapIn = 0;
  for (let h = nowH + 1; h < 48; h++) {
    const p = pr[h];
    if (p != null && p < cur * 0.85) {
      nextCheapIn = h - nowH;
      break;
    }
  }
  const sub =
    lvl === 'olcso'
      ? 'A mai nap egyik legolcsóbb órájában vagyunk. Mosógép, bojler, autótöltés — most éri meg.'
      : nextCheapIn
        ? `Kb. ${nextCheapIn} óra múlva jön olcsóbb sáv. Addig nézd a lenti tippeket.`
        : 'Az élő piaci ár alapján mutatjuk, mikor éri meg bekapcsolni.';

  const diffPct = Math.round(((cur - avg24) / avg24) * 100);
  const pctStr = `${Math.abs(diffPct)}%-kal ${diffPct >= 0 ? 'a mai átlag felett' : 'a mai átlag alatt'}`;
  let why: string;
  if (diffPct >= 15) {
    why = nowH >= 17 && nowH <= 22
      ? `Esti csúcsfogyasztás, a naptermelés leállt — az ár ${pctStr} van.`
      : `Magas kereslet vagy gyenge naptermelés — az ár ${pctStr} van.`;
  } else if (diffPct <= -15) {
    why = nowH >= 9 && nowH <= 16
      ? `A napelemek csúcson termelnek — az ár ${pctStr} van.`
      : `Alacsony kereslet — az ár ${pctStr} van.`;
  } else {
    why = 'Az ár a mai átlag közelében mozog.';
  }
  if (grid && grid.solarMW != null && grid.netImportMW != null) {
    why += ` Naptermelés most: ${fmt(grid.solarMW)} MW, ${grid.netImportMW >= 0 ? 'import' : 'export'}: ${fmt(Math.abs(grid.netImportMW))} MW.`;
  }

  return { cur, prev, lvl, avg24, deltaPct, statusLabel, sub, why, nextCheapIn, nowH, pr, sorted };
}

// ── Eszközkártyák ───────────────────────────────────────────────────────

export type GreenFn = (startIdx: number, dur: number) => boolean;

export interface DeviceCardModel {
  dev: Device;
  win: Window;
  nowOk: boolean;
  savePerRun: number;
  winStr: string;
  tag: string;
  showDay: boolean;
  dayStr: string | null;
  greenBest: boolean;
  greenDay: boolean;
}

export function deviceCards(hero: HeroModel, isGreen: GreenFn): DeviceCardModel[] {
  const { pr, sorted, nowH, avg24 } = hero;
  return MAIN_DEV.map((d) => {
    const w = bestWindow(pr, nowH, d.dur);
    const wDay = bestWindowDay(pr, nowH, d.dur);
    const nowOk = level(pr[nowH] ?? FILL, sorted) === 'olcso' || w.start === nowH;
    const savePerRun = Math.max(0, (avg24 - w.avg) * d.kwh);
    const startDay = w.start < 24 ? 'Ma' : 'Holnap';
    const tag = nowOk ? 'Indítsd most' : `${startDay} ${hhmm(w.start)}`;
    const showDay = !!wDay && wDay.start !== w.start;
    return {
      dev: d,
      win: w,
      nowOk,
      savePerRun,
      winStr: windowStr(w.start, d.dur),
      tag,
      showDay,
      dayStr: wDay ? windowStr(wDay.start, d.dur) : null,
      greenBest: isGreen(w.start, d.dur),
      greenDay: showDay && !!wDay && isGreen(wDay.start, d.dur),
    };
  });
}

export interface DeviceSummary {
  day: 'ma' | 'holnap';
  hour: string;
  green: boolean;
}

/** Ha a gépek többségének legjobb ablaka egybeesik, egy soros összefoglaló. */
export function deviceSummary(hero: HeroModel, isGreen: GreenFn): DeviceSummary | null {
  const counts: Record<string, number> = {};
  for (const d of MAIN_DEV) {
    const w = bestWindow(hero.pr, hero.nowH, d.dur);
    counts[String(w.start)] = (counts[String(w.start)] || 0) + 1;
  }
  const topStart = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
  if (topStart == null || counts[topStart] < 3) return null;
  const s = parseInt(topStart, 10);
  return { day: s < 24 ? 'ma' : 'holnap', hour: hhmm(s), green: isGreen(s, 2) };
}

// ── Hőtérkép ────────────────────────────────────────────────────────────

export interface HeatCell {
  h: number;
  p: number;
  lvl: Level;
  isCur: boolean;
}

export const LEVEL_NAMES: Record<Level, string> = { olcso: 'olcsó', atlagos: 'átlagos', draga: 'drága' };

export function heatmapModel(prices: PricePoint[] | Map<string, number>, now: Date, selHour: number | null) {
  const pr = getPrArr(prices, now);
  const nowH = zonedParts(now).hour;
  const today = fillDay(pr.slice(0, 24));
  const sorted = sortedDay(pr.slice(0, 24));
  const cells: HeatCell[] = today.map((p, h) => ({ h, p, lvl: level(p, sorted), isCur: h === nowH }));
  const detail =
    selHour == null
      ? `Most (${nowH}:00): ${fmt1(today[nowH])} Ft/kWh · ${LEVEL_NAMES[level(today[nowH], sorted)]}`
      : `${selHour}:00–${selHour + 1}:00 · ${fmt1(today[selHour])} Ft/kWh · ${LEVEL_NAMES[level(today[selHour], sorted)]}`;
  return { cells, detail, nowH };
}

// ── 72 órás oszlopdiagram ───────────────────────────────────────────────

export interface BarModel {
  i: number;
  h: number;
  p: number;
  lvl: Level;
  isYesterday: boolean;
  isTomorrow: boolean;
  missing: boolean;
}

export function barChartModel(prices: PricePoint[] | Map<string, number>, now: Date) {
  const pr = getPrArrWithYesterday(prices, now);
  const filled = fillDay(pr);
  const maxP = Math.max(...filled, 1);
  const todaySorted = sortedDay(pr.slice(24, 48));
  const bars: BarModel[] = filled.map((p, i) => ({
    i,
    h: i % 24,
    p,
    lvl: level(p, todaySorted),
    isYesterday: i < 24,
    isTomorrow: i >= 48,
    missing: pr[i] == null,
  }));
  return { bars, maxP };
}

// ── 30 napos trend ──────────────────────────────────────────────────────

export interface TrendModel {
  days: string[];
  avgs: number[];
  maxA: number;
  minA: number;
  trendUp: boolean;
}

export function trendModel(prices: PricePoint[], now: Date): TrendModel | null {
  const byDay: Record<string, number[]> = {};
  const p0 = zonedParts(now);
  const todayKey = `${p0.year}-${String(p0.month).padStart(2, '0')}-${String(p0.day).padStart(2, '0')}`;
  for (const p of prices) {
    const d = zonedParts(new Date(p.timestamp));
    const key = `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
    if (key >= todayKey) continue;
    (byDay[key] = byDay[key] || []).push(p.price_huf_kwh);
  }
  const days = Object.keys(byDay).sort().slice(-30);
  if (days.length < 2) return null;
  const avgs = days.map((k) => byDay[k].reduce((a, b) => a + b, 0) / byDay[k].length);
  const maxA = Math.max(...avgs);
  const minA = Math.min(...avgs);
  return { days, avgs, maxA, minA, trendUp: avgs[avgs.length - 1] > avgs[0] };
}

// ── Értesítési ablakok ──────────────────────────────────────────────────

export interface CheapBand {
  /** 48 órás index */
  idx: number;
  start: Date;
  price: number;
}

/**
 * A következő 48 órában (a jelen órát követően) kezdődő olcsó sávok kezdőidőpontjai.
 * Holnapra csak akkor, ha a holnapi day-ahead árak már megvannak.
 */
export function cheapBands(prices: PricePoint[] | Map<string, number>, now: Date): CheapBand[] {
  const pr = getPrArr(prices, now);
  const nowH = zonedParts(now).hour;
  const dayStart = startOfZonedDay(now).getTime();
  const sortedToday = sortedDay(pr.slice(0, 24));
  const tomorrowRaw = pr.slice(24, 48);
  const hasTomorrow = tomorrowRaw.filter((x) => x != null).length >= 20;
  const sortedTomorrow = hasTomorrow ? sortedDay(tomorrowRaw) : null;
  const out: CheapBand[] = [];
  let prevCheap = level(pr[nowH] ?? FILL, sortedToday) === 'olcso';
  for (let i = nowH + 1; i < 48; i++) {
    const p = pr[i];
    const sorted = i < 24 ? sortedToday : sortedTomorrow;
    if (p == null || !sorted) {
      prevCheap = false;
      continue;
    }
    const cheap = level(p, sorted) === 'olcso';
    if (cheap && !prevCheap) out.push({ idx: i, start: new Date(dayStart + i * HOUR), price: p });
    prevCheap = cheap;
  }
  return out;
}
