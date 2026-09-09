import { parseXlsxRows, type Cell } from './xlsx';
import type { GridFlows, GridLoad, GridMix, GridRenewables, GridState, TsValue } from '../domain/grid';
import { solarForecastByHour } from '../domain/grid';
import { zonedToDate } from '../domain/time';

// Magyar villamosenergia-rendszer adatok a MAVIR nyilvános RTDW chart-exportjából.
//   GET https://rtdwweb.mavir.hu/rtdwweb/webuser/chart/{chart_id}/export
//       ?exportType=xlsx&fromTime={ms}&toTime={ms}&periodType=min&period=15
// Chart azonosítók: 7678 terhelés · 9404 termelési mix · 11838 nap · 11840 szél · 5229 határkeresztező
// A MAVIR ~1 kérés / 2,5 mp felett 429-et ad, ezért a kéréseket sorba állítjuk.

const MAVIR_CHART_URL = 'https://rtdwweb.mavir.hu/rtdwweb/webuser/chart/{id}/export';
export const CHART_LOAD = 7678;
export const CHART_GENERATION_MIX = 9404;
export const CHART_SOLAR = 11838;
export const CHART_WIND = 11840;
export const CHART_CROSSBORDER = 5229;

const CACHE_TTL_MS = 15 * 60 * 1000;
const MIN_REQUEST_GAP_MS = 2500;
const FETCH_TIMEOUT_MS = 30000;

export const FUEL_COLUMNS: Record<string, string> = {
  'Nukleáris erőművek': 'nuclear',
  'Barnakőszén-lignit erőművek': 'lignite',
  'Gáz (fosszilis) erőművek': 'gas',
  'Feketekőszén erőművek': 'hard_coal',
  'Olaj (fosszilis) erőművek': 'oil',
  'Szárazföldi szélerőművek': 'wind',
  'Biomassza erőművek': 'biomass',
  'Ipari PV': 'solar_pv',
  'Szemétégető erőművek': 'waste',
  'Folyóvizes erőművek': 'hydro_run_of_river',
  'Víztározós vízerőművek': 'hydro_reservoir',
  'Egyéb megújuló erőművek': 'other_renewable',
  'Egyéb erőművek': 'other',
};
const RENEWABLE_FUELS = new Set(['wind', 'biomass', 'solar_pv', 'hydro_run_of_river', 'hydro_reservoir', 'other_renewable']);
const BORDER_COUNTRIES = ['AT', 'SK', 'UK', 'RO', 'RS', 'HR', 'SI'];

export type MavirRow = { timestamp: string } & Record<string, number | string | null>;

/** '2026.08.25 12:15:00 +0200' → ISO-8601. Excel-sorszámot (Budapest helyi idő) is elfogad. */
export function parseMavirTimestamp(raw: Cell): string | null {
  if (raw == null) return null;
  if (typeof raw === 'number') {
    const ms = Math.round((raw - 25569) * 86400000);
    const d = new Date(ms);
    return zonedToDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes()).toISOString();
  }
  const m = String(raw).trim().match(/^(\d{4})\.(\d{2})\.(\d{2}) (\d{2}):(\d{2}):(\d{2}) ([+-])(\d{2})(\d{2})$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s, sign, oh, om] = m;
  const offsetMin = (sign === '-' ? -1 : 1) * (parseInt(oh, 10) * 60 + parseInt(om, 10));
  const utc = Date.UTC(+y, +mo - 1, +d, +h, +mi, +s) - offsetMin * 60000;
  return new Date(utc).toISOString();
}

/** XLSX sorok → [{timestamp, <oszlopnév>: szám|null}] */
export function rowsToRecords(rows: Cell[][]): MavirRow[] {
  if (!rows.length) return [];
  const headers = rows[0].map((h) => (h == null ? '' : String(h)));
  const out: MavirRow[] = [];
  for (const row of rows.slice(1)) {
    if (!row || !row.length) continue;
    const ts = parseMavirTimestamp(row[0]);
    if (!ts) continue;
    const rec: MavirRow = { timestamp: ts };
    for (let i = 1; i < headers.length; i++) {
      const header = headers[i];
      if (!header) continue;
      const v = row[i];
      if (v == null || v === '') rec[header] = null;
      else if (typeof v === 'number') rec[header] = v;
      else {
        const n = parseFloat(String(v).replace(',', '.'));
        rec[header] = Number.isFinite(n) ? n : null;
      }
    }
    out.push(rec);
  }
  return out;
}

// ── Cache + kérés-ütemezés ─────────────────────────────────────────────

const cache = new Map<string, { rows: MavirRow[]; time: number }>();
let queue: Promise<unknown> = Promise.resolve();
let lastFetch = 0;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function paced<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const gap = Date.now() - lastFetch;
    if (gap < MIN_REQUEST_GAP_MS) await sleep(MIN_REQUEST_GAP_MS - gap);
    lastFetch = Date.now();
    return fn();
  });
  queue = run.catch(() => undefined);
  return run;
}

export function chartUrl(chartId: number, fromMs: number, toMs: number, periodMinutes = 15): string {
  const q = new URLSearchParams({
    exportType: 'xlsx', fromTime: String(fromMs), toTime: String(toMs), periodType: 'min', period: String(periodMinutes),
  });
  return `${MAVIR_CHART_URL.replace('{id}', String(chartId))}?${q.toString()}`;
}

async function fetchChartRows(chartId: number, hoursBack = 12, hoursAhead = 24): Promise<MavirRow[]> {
  const now = new Date();
  now.setUTCMinutes(now.getUTCMinutes() - (now.getUTCMinutes() % 15), 0, 0);
  const key = `${chartId}:${hoursBack}:${hoursAhead}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.time < CACHE_TTL_MS) return hit.rows;

  const fromMs = now.getTime() - hoursBack * 3600000;
  const toMs = now.getTime() + hoursAhead * 3600000;
  try {
    const rows = await paced(async () => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
      try {
        const res = await fetch(chartUrl(chartId, fromMs, toMs), {
          signal: ctrl.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (energia-idozito-app)' },
        });
        if (!res.ok) throw new Error(`MAVIR HTTP ${res.status}`);
        const buf = new Uint8Array(await res.arrayBuffer());
        if (buf[0] !== 0x50 || buf[1] !== 0x4b) throw new Error('A válasz nem XLSX');
        return rowsToRecords(parseXlsxRows(buf));
      } finally {
        clearTimeout(timer);
      }
    });
    cache.set(key, { rows, time: Date.now() });
    return rows;
  } catch (e) {
    if (hit) return hit.rows; // lejárt cache jobb, mint semmi
    throw e;
  }
}

function latestValue(rows: MavirRow[], column: string): TsValue | null {
  for (let i = rows.length - 1; i >= 0; i--) {
    const v = rows[i][column];
    if (typeof v === 'number') return { timestamp: rows[i].timestamp, value: Math.round(v * 10) / 10 };
  }
  return null;
}

function series(rows: MavirRow[], column: string): TsValue[] {
  const out: TsValue[] = [];
  for (const r of rows) {
    const v = r[column];
    if (typeof v === 'number') out.push({ timestamp: r.timestamp, value: Math.round(v * 10) / 10 });
  }
  return out;
}

// ── Publikus fetcherek ─────────────────────────────────────────────────

export async function fetchSystemLoad(): Promise<GridLoad> {
  const rows = await fetchChartRows(CHART_LOAD);
  return {
    available: true, source: 'MAVIR RTDW (chart 7678)', unit: 'MW',
    latest: {
      gross_actual: latestValue(rows, 'Bruttó tény rendszerterhelés'),
      net_actual: latestValue(rows, 'Nettó rendszerterhelés tény - üzemirányítási'),
    },
    series: {
      gross_actual: series(rows, 'Bruttó tény rendszerterhelés'),
      gross_plan: series(rows, 'Bruttó terv rendszerterhelés'),
      gross_dayahead_estimate: series(rows, 'Bruttó rendszerterhelés becslés (dayahead)'),
    },
  };
}

export async function fetchRenewablesForecast(): Promise<GridRenewables> {
  const solar = await fetchChartRows(CHART_SOLAR);
  const wind = await fetchChartRows(CHART_WIND);
  return {
    available: true, source: 'MAVIR RTDW (chart 11838, 11840)', unit: 'MW',
    solar: {
      latest_actual: latestValue(solar, 'Naperőművek nettó üzemirányítási'),
      series: {
        actual: series(solar, 'Naperőművek nettó üzemirányítási'),
        forecast_current: series(solar, 'Naperőművek becsült termelése (aktuális)'),
        forecast_dayahead: series(solar, 'Naperőművek becsült termelése (dayahead)'),
      },
    },
    wind: {
      latest_actual: latestValue(wind, 'Szélerőművek tény - nettó üzemirányítási'),
      series: {
        actual: series(wind, 'Szélerőművek tény - nettó üzemirányítási'),
        forecast_current: series(wind, 'Szélerőművek becsült termelése (aktuális)'),
        forecast_dayahead: series(wind, 'Szélerőművek becsült termelése (dayahead)'),
      },
    },
  };
}

export async function fetchCrossborderFlows(): Promise<GridFlows> {
  const rows = await fetchChartRows(CHART_CROSSBORDER);
  const schedCol = (cc: string) => (cc === 'SI' ? 'HU-SI menetrend (RIR NT)' : `HU-${cc} menetrend`);
  const borders: GridFlows['borders'] = {};
  for (const cc of BORDER_COUNTRIES) {
    borders[cc] = { actual: latestValue(rows, `HU-${cc}`), scheduled: latestValue(rows, schedCol(cc)) };
  }
  const net = (field: 'actual' | 'scheduled'): TsValue | null => {
    const cols = BORDER_COUNTRIES.map((cc) => (field === 'scheduled' ? schedCol(cc) : `HU-${cc}`));
    for (let i = rows.length - 1; i >= 0; i--) {
      const vals = cols.map((c) => rows[i][c]);
      if (vals.every((v) => typeof v === 'number')) {
        return { timestamp: rows[i].timestamp, value: Math.round((vals as number[]).reduce((a, b) => a + b, 0) * 10) / 10 };
      }
    }
    return null;
  };
  return {
    available: true, source: 'MAVIR RTDW (chart 5229)', unit: 'MW', sign_convention: 'pozitív = import Magyarországra',
    net_import: { actual: net('actual'), scheduled: net('scheduled') },
    borders,
  };
}

export function buildGenerationMix(rows: MavirRow[]): GridMix {
  const totalCol = 'Hazai termelés (erőművi szumma)';
  let latest: MavirRow | null = null;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (typeof rows[i][totalCol] === 'number') {
      latest = rows[i];
      break;
    }
  }
  if (!latest) throw new Error('Nincs termelési adat a MAVIR válaszban.');
  const total = latest[totalCol] as number;
  const mix: GridMix['mix'] = {};
  let renewable = 0;
  for (const [huCol, key] of Object.entries(FUEL_COLUMNS)) {
    const mw = latest[huCol];
    if (typeof mw !== 'number') continue;
    mix[key] = { mw: Math.round(mw * 10) / 10, share_pct: total ? Math.round((mw / total) * 1000) / 10 : null };
    if (RENEWABLE_FUELS.has(key)) renewable += mw;
  }
  return {
    available: true, source: 'MAVIR RTDW (chart 9404)', unit: 'MW', timestamp: latest.timestamp,
    total_mw: Math.round(total * 10) / 10,
    renewable_mw: Math.round(renewable * 10) / 10,
    renewable_share_pct: total ? Math.round((renewable / total) * 1000) / 10 : null,
    mix,
  };
}

export async function fetchGenerationMix(): Promise<GridMix> {
  return buildGenerationMix(await fetchChartRows(CHART_GENERATION_MIX, 12, 1));
}

/** Minden hálózati adat egyben; ami nem jön össze, az null (a UI elrejti). */
export async function loadGridState(): Promise<GridState> {
  const safe = async <T,>(fn: () => Promise<T>): Promise<T | null> => {
    try {
      return await fn();
    } catch {
      return null;
    }
  };
  const mix = await safe(fetchGenerationMix);
  const renewables = await safe(fetchRenewablesForecast);
  const flows = await safe(fetchCrossborderFlows);
  return { mix, renewables, flows, solarForecastByHour: solarForecastByHour(renewables) };
}
