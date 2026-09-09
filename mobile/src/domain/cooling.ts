import type { WeatherHour, PriceHour } from './types';

// Klíma hűtési terv — a backend cooling_planner.py portja.
// Stratégia: olcsó sávban előhűtés a drága+meleg órák előtt, csúcsban hőtartalékon (coast).

export const COMFORT_TEMP_C = 24.0;
export const PRECOOL_TEMP_TARGET = 21.0;
export const THERMAL_DRIFT_PER_H = 1.2;
export const COP_DEFAULT = 3.5;
export const AC_POWER_KW_DEFAULT = 2.0;

export type CoolingAction = 'precool' | 'run' | 'coast' | 'off';

export interface HourlyPlan {
  timestamp: string;
  local_time: string;
  hour: number;
  outdoor_temp_c: number;
  apparent_temp_c: number | null;
  price_huf_kwh: number;
  is_cheap: boolean;
  is_expensive: boolean;
  action: CoolingAction;
  action_label: string;
  action_detail: string;
  ac_on: boolean;
  energy_kwh: number;
  cost_huf: number;
  naive_ac_on: boolean;
  naive_energy_kwh: number;
  naive_cost_huf: number;
  cop_actual: number;
}

export interface CoolingPlan {
  city_name: string;
  ac_power_kw: number;
  cop: number;
  comfort_temp_c: number;
  hours: HourlyPlan[];
  smart_total_cost_huf: number;
  naive_total_cost_huf: number;
  saving_huf: number;
  saving_pct: number;
  smart_total_kwh: number;
  naive_total_kwh: number;
  precool_windows: { precool_start: string | null; coast_start: string; reason: string }[];
  summary: string;
  tip: string;
}

/** Hőmérsékletfüggő COP: 35 °C felett fokonként ~2,2% romlás. */
export function copAtTemp(copRated: number, outdoorC: number): number {
  return copRated * Math.max(0.6, 1.0 - 0.022 * Math.max(0.0, outdoorC - 35.0));
}

type Joined = WeatherHour & { price_huf_kwh: number; is_cheap: boolean; is_expensive: boolean };

export function joinWeatherPrices(weather: WeatherHour[], prices: PriceHour[]): Joined[] {
  const map = new Map<string, PriceHour>();
  for (const ph of prices) map.set(ph.timestamp.slice(0, 13), ph);
  const out: Joined[] = [];
  for (const wh of weather) {
    const ph = map.get(wh.timestamp.slice(0, 13));
    if (!ph) continue;
    out.push({ ...wh, price_huf_kwh: ph.price_huf_kwh ?? 0, is_cheap: !!ph.is_cheap, is_expensive: !!ph.is_expensive });
  }
  return out;
}

function anyExpensiveHotAhead(hours: Joined[], i: number, lookahead: number, q67: number, comfort: number): boolean {
  for (let j = i + 1; j < Math.min(i + 1 + lookahead, hours.length); j++) {
    const h = hours[j];
    const temp = h.apparent_temp_c ?? h.temp_c ?? 0;
    if (h.price_huf_kwh >= q67 && temp >= comfort) return true;
  }
  return false;
}

export function buildCoolingPlan(
  weather: WeatherHour[],
  prices: PriceHour[],
  cityName: string,
  acPowerKw = AC_POWER_KW_DEFAULT,
  cop = COP_DEFAULT,
  comfortTempC = COMFORT_TEMP_C,
): CoolingPlan {
  const joined = joinWeatherPrices(weather, prices);
  const empty: CoolingPlan = {
    city_name: cityName, ac_power_kw: acPowerKw, cop, comfort_temp_c: comfortTempC,
    hours: [], smart_total_cost_huf: 0, naive_total_cost_huf: 0, saving_huf: 0, saving_pct: 0,
    smart_total_kwh: 0, naive_total_kwh: 0, precool_windows: [], summary: 'Nem sikerült adatot lekérni.', tip: '',
  };
  if (!joined.length) return empty;

  const sortedP = joined.map((h) => h.price_huf_kwh).sort((a, b) => a - b);
  const n = sortedP.length;
  const q33 = sortedP[Math.floor(n * 0.33)];
  const q67 = sortedP[Math.floor(n * 0.67)];

  let indoor = Math.min(joined[0].temp_c ?? 22.0, comfortTempC + 2);
  const hours: HourlyPlan[] = [];
  let smartCost = 0;
  let naiveCost = 0;
  let smartKwh = 0;
  let naiveKwh = 0;
  const precoolWindows: CoolingPlan['precool_windows'] = [];
  let precoolActive = false;
  let lastPrecoolStart: string | null = null;
  const LOOKAHEAD = 4;

  joined.forEach((h, i) => {
    const outdoor = h.temp_c ?? 20.0;
    const apparent = h.apparent_temp_c;
    const price = h.price_huf_kwh;
    const isCheap = price <= q33;
    const isExpensive = price >= q67;
    const hour = h.hour;
    const copNow = copAtTemp(cop, outdoor);

    const feelsHot = (apparent ?? outdoor) >= comfortTempC;
    const naiveOn = feelsHot && hour >= 8 && hour <= 22;
    const naiveE = naiveOn ? acPowerKw : 0;
    const naiveC = naiveE * price;
    naiveKwh += naiveE;
    naiveCost += naiveC;

    if (i > 0 && !hours[i - 1].ac_on) {
      const drift = Math.min(THERMAL_DRIFT_PER_H, outdoor - indoor);
      indoor = Math.min(outdoor, indoor + Math.max(0, drift));
    } else if (i > 0 && hours[i - 1].ac_on) {
      indoor = Math.max(PRECOOL_TEMP_TARGET, indoor - 1.5);
    }

    const futureExpensiveHot = anyExpensiveHotAhead(joined, i, LOOKAHEAD, q67, comfortTempC);
    const indoorTooHot = indoor >= comfortTempC + 2;

    let action: CoolingAction;
    let label: string;
    let detail: string;
    let acOn: boolean;
    if (isCheap && futureExpensiveHot) {
      action = 'precool';
      label = 'Előhűtés most!';
      detail = `Olcsó áram (${price.toFixed(0)} Ft/kWh), COP=${copNow.toFixed(1)} — hűtsd be most, hogy a csúcsban ne kelljen!`;
      acOn = true;
      if (!precoolActive) {
        lastPrecoolStart = h.local_time;
        precoolActive = true;
      }
    } else if (isCheap && indoor >= comfortTempC) {
      action = 'run';
      label = 'Futtasd';
      detail = `Meleg van és olcsó az áram (${price.toFixed(0)} Ft/kWh).`;
      acOn = true;
    } else if (isExpensive && !indoorTooHot) {
      action = 'coast';
      label = 'Kikapcs. (hőtartalék)';
      detail = `Drága az áram (${price.toFixed(0)} Ft/kWh) — a betárolt hideg kiviseli még.`;
      acOn = false;
      if (precoolActive) {
        precoolWindows.push({ precool_start: lastPrecoolStart, coast_start: h.local_time, reason: `Előhűtve, most kényelmes (${indoor.toFixed(1)}°C beltér)` });
        precoolActive = false;
      }
    } else if (indoor >= comfortTempC || outdoor >= comfortTempC + 3) {
      action = 'run';
      label = 'Futtasd';
      detail = `Meleg van (${outdoor.toFixed(0)}°C kint, ${indoor.toFixed(0)}°C benn).`;
      acOn = true;
    } else {
      action = 'off';
      label = 'Kikapcs.';
      detail = `Kellemes az idő (${outdoor.toFixed(0)}°C) — nem kell hűtés.`;
      acOn = false;
      precoolActive = false;
    }

    const smartE = acOn ? acPowerKw : 0;
    const smartC = smartE * price;
    smartKwh += smartE;
    smartCost += smartC;

    hours.push({
      timestamp: h.timestamp, local_time: h.local_time, hour, outdoor_temp_c: outdoor, apparent_temp_c: apparent,
      price_huf_kwh: price, is_cheap: isCheap, is_expensive: isExpensive, action, action_label: label, action_detail: detail,
      ac_on: acOn, energy_kwh: smartE, cost_huf: smartC, naive_ac_on: naiveOn, naive_energy_kwh: naiveE, naive_cost_huf: naiveC,
      cop_actual: Math.round(copNow * 100) / 100,
    });
  });

  const saving = naiveCost - smartCost;
  const savingPct = naiveCost > 0 ? (saving / naiveCost) * 100 : 0;
  let summary: string;
  let tip: string;
  if (saving > 50) {
    summary = `Az okos hűtéssel ${saving.toFixed(0)} Ft-ot spórolhatsz a következő 48 órában.`;
    tip = `Hűtsd be a lakást előre a ${q33.toFixed(0)} Ft/kWh alatti sávokban, és kapcsold ki ${q67.toFixed(0)} Ft felett!`;
  } else if (saving > 0) {
    summary = `Az előhűtéssel kb. ${saving.toFixed(0)} Ft megtakarítható a következő 48 órában.`;
    tip = 'Az árszórás most kisebb, de az előhűtési stratégia mindig kifizetődő nyáron.';
  } else {
    summary = 'Az árszórás most kicsi — bármikor futtasd a klímát kényelmed szerint.';
    tip = 'Kövesd figyelemmel a villanyár-előrejelzést: forró napokon ez sokat számít!';
  }

  return {
    ...empty,
    hours,
    smart_total_cost_huf: Math.round(smartCost),
    naive_total_cost_huf: Math.round(naiveCost),
    saving_huf: Math.round(saving),
    saving_pct: Math.round(savingPct * 10) / 10,
    smart_total_kwh: Math.round(smartKwh * 100) / 100,
    naive_total_kwh: Math.round(naiveKwh * 100) / 100,
    precool_windows: precoolWindows,
    summary,
    tip,
  };
}
