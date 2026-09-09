import type { WeatherHour, PriceHour } from './types';
import { joinWeatherPrices } from './cooling';

// Napelem önfogyasztási terv — a backend solar_planner.py portja.

export const PV_EFFICIENCY = 0.8;
export const PV_PEAK_IRRADIANCE = 1000.0;
export const TYPICAL_HOUSEHOLD_KW = 0.4;
export const ANNUAL_YIELD_KWH_PER_KWP = 1050.0;
export const IRRADIANCE_PEAK = 600.0;
export const IRRADIANCE_MILD = 150.0;

export type SolarAction = 'solar_peak' | 'solar_mild' | 'cheap_grid' | 'avoid' | 'night' | 'neutral';

export interface SolarHourlyPlan {
  timestamp: string;
  local_time: string;
  hour: number;
  irradiance_wm2: number;
  solar_production_kwh: number;
  price_huf_kwh: number;
  is_cheap: boolean;
  is_expensive: boolean;
  action: SolarAction;
  action_label: string;
  action_detail: string;
  cost_with_solar_huf: number;
  cost_without_solar_huf: number;
  solar_covers_pct: number;
}

export interface LoadWindow {
  start: string;
  end: string;
  start_hour: number;
  end_hour: number;
  avg_production_kwh: number;
  avg_price_huf_kwh: number;
  avg_solar_covers_pct: number;
  score: number;
}

export interface SolarPlan {
  city_name: string;
  solar_kwp: number;
  household_kw: number;
  hours: SolarHourlyPlan[];
  total_production_kwh_48h: number;
  total_savings_huf_48h: number;
  daily_production_kwh_estimate: number;
  annual_production_kwh_estimate: number;
  annual_savings_huf_estimate: number;
  best_load_windows: LoadWindow[];
  summary: string;
  tip: string;
}

function bestLoadWindows(hours: SolarHourlyPlan[], windowH = 2): LoadWindow[] {
  const scored: LoadWindow[] = [];
  for (let i = 0; i <= hours.length - windowH; i++) {
    const w = hours.slice(i, i + windowH);
    const avgProd = w.reduce((a, h) => a + h.solar_production_kwh, 0) / windowH;
    const avgPrice = w.reduce((a, h) => a + h.price_huf_kwh, 0) / windowH;
    const avgCovers = w.reduce((a, h) => a + h.solar_covers_pct, 0) / windowH;
    const score = avgProd * 10 - avgPrice * 0.1;
    if (avgProd > 0) {
      scored.push({
        start: w[0].local_time, end: w[w.length - 1].local_time,
        start_hour: w[0].hour, end_hour: w[w.length - 1].hour + 1,
        avg_production_kwh: Math.round(avgProd * 100) / 100,
        avg_price_huf_kwh: Math.round(avgPrice * 10) / 10,
        avg_solar_covers_pct: Math.round(avgCovers),
        score: Math.round(score * 100) / 100,
      });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3);
}

export function buildSolarPlan(
  weather: WeatherHour[],
  prices: PriceHour[],
  cityName: string,
  solarKwp: number,
  householdKw = TYPICAL_HOUSEHOLD_KW,
): SolarPlan {
  const joined = joinWeatherPrices(weather, prices);
  const empty: SolarPlan = {
    city_name: cityName, solar_kwp: solarKwp, household_kw: householdKw, hours: [],
    total_production_kwh_48h: 0, total_savings_huf_48h: 0, daily_production_kwh_estimate: 0,
    annual_production_kwh_estimate: 0, annual_savings_huf_estimate: 0, best_load_windows: [],
    summary: 'Nem sikerült adatot lekérni.', tip: '',
  };
  if (!joined.length) return empty;

  const hours: SolarHourlyPlan[] = [];
  let totalProd = 0;
  let totalWith = 0;
  let totalWithout = 0;

  for (const h of joined) {
    const irr = h.irradiance_wm2 ?? 0;
    const price = h.price_huf_kwh;
    const solarProd = solarKwp * (irr / PV_PEAK_IRRADIANCE) * PV_EFFICIENCY;
    const gridNeeded = Math.max(0, householdKw - solarProd);
    const costWith = gridNeeded * price;
    const costWithout = householdKw * price;
    const covers = householdKw > 0 ? Math.min(100, (solarProd / householdKw) * 100) : 0;
    totalProd += solarProd;
    totalWith += costWith;
    totalWithout += costWithout;

    let action: SolarAction;
    let label: string;
    let detail: string;
    if (irr >= IRRADIANCE_PEAK) {
      action = 'solar_peak';
      label = 'Napelem csúcson!';
      detail = `~${solarProd.toFixed(2)} kWh termelés (${irr.toFixed(0)} W/m²). Most futtasd a mosógépet, mosogatót, töltsd az autót!`;
    } else if (irr >= IRRADIANCE_MILD) {
      action = 'solar_mild';
      label = 'Részleges termelés';
      detail = `~${solarProd.toFixed(2)} kWh termelés (${irr.toFixed(0)} W/m²). Az alapterhelés ${covers.toFixed(0)}%-a fedezve.`;
    } else if (h.hour < 6 || h.hour >= 22) {
      action = 'night';
      label = 'Éjszaka';
      detail = 'Nincs napelem-termelés. ' + (h.is_cheap
        ? `Olcsó áram (${price.toFixed(0)} Ft/kWh) — éjszakai vezérelt sávot használj.`
        : `Áram: ${price.toFixed(0)} Ft/kWh.`);
    } else if (h.is_cheap) {
      action = 'cheap_grid';
      label = 'Olcsó hálózat';
      detail = `Nincs nap, de olcsó az áram (${price.toFixed(0)} Ft/kWh). Jó alkalom fogyasztásra.`;
    } else if (h.is_expensive) {
      action = 'avoid';
      label = 'Kerüld!';
      detail = `Nincs nap és drága az áram (${price.toFixed(0)} Ft/kWh). Minimalizáld a fogyasztást.`;
    } else {
      action = 'neutral';
      label = 'Normál';
      detail = `Közepes ár (${price.toFixed(0)} Ft/kWh), nincs napelem-termelés.`;
    }

    hours.push({
      timestamp: h.timestamp, local_time: h.local_time, hour: h.hour,
      irradiance_wm2: Math.round(irr), solar_production_kwh: Math.round(solarProd * 1000) / 1000,
      price_huf_kwh: price, is_cheap: h.is_cheap, is_expensive: h.is_expensive,
      action, action_label: label, action_detail: detail,
      cost_with_solar_huf: Math.round(costWith * 100) / 100,
      cost_without_solar_huf: Math.round(costWithout * 100) / 100,
      solar_covers_pct: Math.round(covers),
    });
  }

  const totalSavings = totalWithout - totalWith;
  const daytime = hours.filter((h) => h.irradiance_wm2 > 0);
  const daysWithSun = new Set(daytime.map((h) => h.local_time.slice(0, 10))).size;
  const dailyProd = daysWithSun > 0 ? totalProd / daysWithSun : 0;
  const annualProd = solarKwp * ANNUAL_YIELD_KWH_PER_KWP;
  const avgPrice = hours.length ? hours.reduce((a, h) => a + h.price_huf_kwh, 0) / hours.length : 40;
  const annualSavings = annualProd * avgPrice * PV_EFFICIENCY;

  let summary: string;
  if (totalSavings > 100) {
    summary = `A ${solarKwp} kWp rendszer ~${totalProd.toFixed(1)} kWh-t termel a következő 48 órában, és kb. ${totalSavings.toFixed(0)} Ft-ot spórol az alapterhelésen.`;
  } else if (totalProd > 0) {
    summary = `A rendszer ~${totalProd.toFixed(1)} kWh-t termel 48 óra alatt. Éves szinten kb. ${annualProd.toFixed(0)} kWh hozamra számíthatsz.`;
  } else {
    summary = 'Az előrejelzési ablakban nincs elegendő napfény a termeléshez.';
  }
  const tip = `Az éves ${annualProd.toFixed(0)} kWh termelés becsült megtakarítása: ~${Math.round(annualSavings).toLocaleString('hu-HU')} Ft/év (${avgPrice.toFixed(0)} Ft/kWh átlagáron). A déli csúcs (10–14h) az önfogyasztás aranykora — ekkor futtasd a mosógépet és tölts!`;

  return {
    ...empty,
    hours,
    total_production_kwh_48h: Math.round(totalProd * 100) / 100,
    total_savings_huf_48h: Math.round(totalSavings),
    daily_production_kwh_estimate: Math.round(dailyProd * 10) / 10,
    annual_production_kwh_estimate: Math.round(annualProd),
    annual_savings_huf_estimate: Math.round(annualSavings),
    best_load_windows: bestLoadWindows(hours),
    summary,
    tip,
  };
}
