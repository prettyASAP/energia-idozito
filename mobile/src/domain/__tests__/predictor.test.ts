import type { HourPoint } from '../types';
import { combinedForecast, computeModelAccuracy, predictPrices, quantile } from '../predictor';

function synth(days: number, start = Date.UTC(2026, 7, 1)): HourPoint[] {
  const out: HourPoint[] = [];
  for (let i = 0; i < days * 24; i++) {
    const h = i % 24;
    out.push({ t: start + i * 3600000, p: 80 + 40 * Math.sin(((h - 6) / 24) * 2 * Math.PI) + (i % 7) });
  }
  return out;
}

describe('előrejelző', () => {
  it('kvantilis lineáris interpolációval (numpy)', () => {
    expect(quantile([1, 2, 3, 4], 0.5)).toBe(2.5);
    expect(quantile([1, 2, 3, 4, 5], 0.25)).toBe(2);
    expect(quantile([10], 0.75)).toBe(10);
  });

  it('determinisztikus, az utolsó óra után indul', () => {
    const hist = synth(21);
    const a = predictPrices(hist, 2);
    const b = predictPrices(hist, 2);
    expect(a).toHaveLength(48);
    expect(a).toEqual(b);
    expect(a[0].t).toBe(hist[hist.length - 1].t + 3600000);
    expect(a.every((x) => Number.isFinite(x.p))).toBe(true);
  });

  it('kombinált lista: historikus + előrejelzett, olcsó/drága jelöléssel', () => {
    const hist = synth(10);
    const fc = predictPrices(hist, 1);
    const all = combinedForecast(hist, fc, 400, 7);
    expect(all.filter((p) => p.is_forecast)).toHaveLength(24);
    expect(all.filter((p) => !p.is_forecast).length).toBeGreaterThanOrEqual(7 * 24);
    expect(all.some((p) => p.is_cheap)).toBe(true);
    expect(all.some((p) => p.is_expensive)).toBe(true);
    const f = all.find((p) => p.is_forecast)!;
    expect(f.ci_lower_huf_kwh).toBeLessThanOrEqual(f.price_huf_kwh);
    expect(f.ci_upper_huf_kwh).toBeGreaterThanOrEqual(f.price_huf_kwh);
  });

  it('modellpontosság: kevés adatnál CV, sok adatnál walk-forward', () => {
    expect(computeModelAccuracy(synth(5)).method).toBe('cv');
    const acc = computeModelAccuracy(synth(21));
    expect(acc.method).toBe('walkforward');
    expect(acc.validation_days).toBe(7);
    expect(acc.mape_pct).toBeGreaterThan(0);
    expect(acc.mape_pct).toBeLessThan(99);
  });
});
