import { hourKey, startOfZonedDay } from './time';

// A MAVIR-alapú hálózati adatok típusai — a korábbi /api/grid/* válaszok szerkezete.

export interface TsValue {
  timestamp: string;
  value: number;
}

export interface GridMix {
  available: true;
  source: string;
  unit: 'MW';
  timestamp: string;
  total_mw: number;
  renewable_mw: number;
  renewable_share_pct: number | null;
  mix: Record<string, { mw: number; share_pct: number | null }>;
}

export interface RenewableBlock {
  latest_actual: TsValue | null;
  series: { actual: TsValue[]; forecast_current: TsValue[]; forecast_dayahead: TsValue[] };
}

export interface GridRenewables {
  available: true;
  source: string;
  unit: 'MW';
  solar: RenewableBlock;
  wind: RenewableBlock;
}

export interface GridFlows {
  available: true;
  source: string;
  unit: 'MW';
  sign_convention: string;
  net_import: { actual: TsValue | null; scheduled: TsValue | null };
  borders: Record<string, { actual: TsValue | null; scheduled: TsValue | null }>;
}

export interface GridLoad {
  available: true;
  source: string;
  unit: 'MW';
  latest: { gross_actual: TsValue | null; net_actual: TsValue | null };
  series: { gross_actual: TsValue[]; gross_plan: TsValue[]; gross_dayahead_estimate: TsValue[] };
}

export interface GridState {
  mix: GridMix | null;
  renewables: GridRenewables | null;
  flows: GridFlows | null;
  solarForecastByHour: Record<string, number>;
}

export const EMPTY_GRID: GridState = { mix: null, renewables: null, flows: null, solarForecastByHour: {} };

export type MixGroupKey = 'nuclear' | 'gas' | '_renew' | '_other';
export const MIX_GROUPS: { key: MixGroupKey; label: string }[] = [
  { key: 'nuclear', label: 'Paks (atom)' },
  { key: 'gas', label: 'Gáz' },
  { key: '_renew', label: 'Megújuló' },
  { key: '_other', label: 'Egyéb' },
];

export function mixShares(mix: GridMix): Record<MixGroupKey, number> {
  const nuclear = mix.mix.nuclear?.share_pct ?? 0;
  const gas = mix.mix.gas?.share_pct ?? 0;
  const renew = mix.renewable_share_pct ?? 0;
  const other = Math.max(0, 100 - nuclear - gas - renew);
  return { nuclear, gas, _renew: renew, _other: other };
}

/** Óránkénti nap-előrejelzés (max a negyedórákból) a zöld órák meghatározásához. */
export function solarForecastByHour(renewables: GridRenewables | null): Record<string, number> {
  const out: Record<string, number> = {};
  const fc = renewables?.solar?.series?.forecast_current ?? [];
  for (const pt of fc) {
    const key = hourKey(new Date(pt.timestamp));
    const cur = out[key];
    out[key] = cur == null ? pt.value : Math.max(cur, pt.value);
  }
  return out;
}

/** Zöld óra: az ablak alatti nap-előrejelzés eléri a napi csúcs 60%-át. */
export function isGreenWindow(map: Record<string, number>, startIdx: number, dur: number, now: Date): boolean {
  const vals = Object.values(map);
  if (!vals.length) return false;
  const dayMax = Math.max(...vals);
  if (dayMax <= 0) return false;
  const dayStart = startOfZonedDay(now).getTime();
  let sum = 0;
  let n = 0;
  for (let i = startIdx; i < startIdx + dur; i++) {
    const key = hourKey(new Date(dayStart + i * 3600000));
    if (map[key] != null) {
      sum += map[key];
      n++;
    }
  }
  return n > 0 && sum / n >= dayMax * 0.6;
}

export function gridContext(grid: GridState) {
  return {
    solarMW: grid.renewables?.solar?.latest_actual?.value ?? null,
    netImportMW: grid.flows?.net_import?.actual?.value ?? null,
    windMW: grid.renewables?.wind?.latest_actual?.value ?? null,
  };
}
