import type { PriceHour, WeatherHour } from '../types';
import { buildCoolingPlan, copAtTemp } from '../cooling';
import { buildSolarPlan } from '../solar';

function hours(n: number): { weather: WeatherHour[]; prices: PriceHour[] } {
  const start = Date.UTC(2026, 6, 15, 0);
  const weather: WeatherHour[] = [];
  const prices: PriceHour[] = [];
  for (let i = 0; i < n; i++) {
    const t = new Date(start + i * 3600000);
    const h = (i + 2) % 24; // ~Budapest óra
    const temp = 22 + 10 * Math.max(0, Math.sin(((h - 6) / 24) * Math.PI * 2));
    const irr = h >= 7 && h <= 19 ? 900 * Math.sin(((h - 7) / 12) * Math.PI) : 0;
    const price = h < 6 ? 12 : h >= 17 && h <= 21 ? 65 : 30;
    weather.push({ timestamp: t.toISOString(), local_time: t.toISOString().slice(0, 16), hour: h, temp_c: temp, apparent_temp_c: temp + 1, humidity_pct: 50, irradiance_wm2: irr });
    prices.push({ timestamp: t.toISOString(), price_huf_kwh: price, is_cheap: price < 20, is_expensive: price > 50 });
  }
  return { weather, prices };
}

describe('klíma tervező', () => {
  it('COP korrekció 35 °C felett', () => {
    expect(copAtTemp(3.5, 30)).toBe(3.5);
    expect(copAtTemp(3.5, 40)).toBeCloseTo(3.5 * (1 - 0.022 * 5), 6);
    expect(copAtTemp(3.5, 80)).toBeCloseTo(3.5 * 0.6, 6);
  });
  it('48 órás terv konzisztens költségekkel és előhűtéssel', () => {
    const { weather, prices } = hours(48);
    const plan = buildCoolingPlan(weather, prices, 'Teszt');
    expect(plan.hours).toHaveLength(48);
    const smartCost = plan.hours.reduce((a, h) => a + h.energy_kwh * h.price_huf_kwh, 0);
    const naiveCost = plan.hours.reduce((a, h) => a + h.naive_energy_kwh * h.price_huf_kwh, 0);
    expect(plan.smart_total_cost_huf).toBe(Math.round(smartCost));
    expect(plan.naive_total_cost_huf).toBe(Math.round(naiveCost));
    expect(plan.saving_huf).toBe(Math.round(naiveCost - smartCost));
    expect(plan.hours.some((h) => h.action === 'precool')).toBe(true);
    expect(plan.hours.some((h) => h.action === 'coast')).toBe(true);
    expect(plan.summary.length).toBeGreaterThan(0);
    expect(plan.tip.length).toBeGreaterThan(0);
  });
  it('üres bemenetre üres terv', () => {
    expect(buildCoolingPlan([], [], 'X').hours).toHaveLength(0);
  });
});

describe('napelem tervező', () => {
  it('délben napelem csúcs, éjjel éjszaka', () => {
    const { weather, prices } = hours(48);
    const plan = buildSolarPlan(weather, prices, 'Teszt', 4);
    expect(plan.hours).toHaveLength(48);
    expect(plan.hours.some((h) => h.action === 'solar_peak')).toBe(true);
    expect(plan.hours.some((h) => h.action === 'night')).toBe(true);
    expect(plan.total_production_kwh_48h).toBeGreaterThan(0);
    expect(plan.annual_production_kwh_estimate).toBe(4200);
    expect(plan.best_load_windows.length).toBeGreaterThan(0);
    expect(plan.best_load_windows.length).toBeLessThanOrEqual(3);
  });
});
