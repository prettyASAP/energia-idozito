import type { PricePoint } from '../types';
import { buildDayPlan } from '../plan';
import { startOfZonedDay } from '../time';

const NOW = new Date('2026-07-15T12:00:00Z'); // 14:00 Budapest

function prices(): PricePoint[] {
  const start = startOfZonedDay(NOW).getTime();
  return Array.from({ length: 24 }, (_, h) => {
    const p = h < 6 ? 10 : h >= 18 ? 70 : 30;
    return { timestamp: new Date(start + h * 3600000).toISOString(), price_eur_mwh: p, price_huf_mwh: p * 1000, price_huf_kwh: p, is_cheap: p < 20, is_expensive: p > 50, is_forecast: false, ci_lower_huf_kwh: p, ci_upper_huf_kwh: p };
  });
}

describe('napi terv', () => {
  it('a sorok lefedik a 24 órát', () => {
    for (const tab of ['klima', 'napelem'] as const) {
      const plan = buildDayPlan(prices(), NOW, tab);
      expect(plan.rows[0].start).toBe(0);
      expect(plan.rows[plan.rows.length - 1].end).toBe(24);
      for (let i = 1; i < plan.rows.length; i++) expect(plan.rows[i].start).toBe(plan.rows[i - 1].end);
      expect(plan.cur).not.toBeNull();
      expect(plan.nowPct).toBeCloseTo((14 / 24) * 100, 1);
    }
  });
  it('klíma: 14:00-kor előhűtés, este hőtartalék', () => {
    const plan = buildDayPlan(prices(), NOW, 'klima');
    expect(plan.cur!.phase).toBe('Előhűtés');
    expect(plan.rows.find((r) => r.start === 18)!.phase).toBe('Hőtartalékon');
  });
  it('napelem: éjjel olcsó hálózat', () => {
    const plan = buildDayPlan(prices(), NOW, 'napelem');
    expect(plan.rows[0].phase).toBe('Olcsó hálózat');
    expect(plan.legend.length).toBeGreaterThan(1);
  });
});
