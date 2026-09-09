import type { PricePoint } from '../types';
import { bestWindow, bestWindowDay, cheapBands, deviceCards, getPrArr, heroModel, level, sortedDay, heatmapModel, barChartModel } from '../prices';
import { startOfZonedDay } from '../time';

/** 48 órás szintetikus árlista: 00–08 olcsó (15), este drága (60), nappal 30–36. */
function makePrices(now: Date): PricePoint[] {
  const dayStart = startOfZonedDay(now).getTime();
  const out: PricePoint[] = [];
  for (let i = 0; i < 48; i++) {
    const h = i % 24;
    const p = h < 8 ? 15 : h >= 17 && h <= 21 ? 60 : 30 + (h % 7);
    out.push({
      timestamp: new Date(dayStart + i * 3600000).toISOString(),
      price_eur_mwh: p * 2.5, price_huf_mwh: p * 1000, price_huf_kwh: p,
      is_cheap: p < 20, is_expensive: p > 50, is_forecast: i >= 24, ci_lower_huf_kwh: p, ci_upper_huf_kwh: p,
    });
  }
  return out;
}

const NOW = new Date('2026-09-09T08:30:00Z'); // 10:30 Budapest

describe('árak', () => {
  const prices = makePrices(NOW);

  it('48 órás tömb a mai nap kezdetétől', () => {
    const pr = getPrArr(prices, NOW);
    expect(pr).toHaveLength(48);
    expect(pr[0]).toBe(15);
    expect(pr[18]).toBe(60);
    expect(pr[24]).toBe(15);
  });

  it('szint a rendezett tömb 8. és 17. eleme szerint', () => {
    const sorted = sortedDay(getPrArr(prices, NOW).slice(0, 24));
    expect(level(15, sorted)).toBe('olcso');
    expect(level(60, sorted)).toBe('draga');
    expect(level(32, sorted)).toBe('atlagos');
  });

  it('a legolcsóbb ablak éjjelre esik, a nappali kizárja az éjszakát', () => {
    const pr = getPrArr(prices, NOW);
    const w = bestWindow(pr, 10, 2);
    expect(w.start).toBe(24); // holnap 00:00 (a mai 8 olcsó óra már elmúlt)
    expect(w.avg).toBe(15);
    const wd = bestWindowDay(pr, 10, 2);
    expect(wd).not.toBeNull();
    expect(wd!.start % 24).toBeGreaterThanOrEqual(6);
    expect(wd!.start % 24).toBeLessThan(22);
  });

  it('hero modell', () => {
    const h = heroModel(prices, NOW);
    expect(h.nowH).toBe(10);
    expect(h.cur).toBe(33);
    expect(h.lvl).toBe('atlagos');
    expect(h.statusLabel).toBe('Átlagos ár');
    expect(h.nextCheapIn).toBeGreaterThan(0);
    const cards = deviceCards(h, () => false);
    expect(cards).toHaveLength(6);
    expect(cards.every((c) => c.winStr.includes('–'))).toBe(true);
  });

  it('hőtérkép és oszlopdiagram', () => {
    const hm = heatmapModel(prices, NOW, null);
    expect(hm.cells).toHaveLength(24);
    expect(hm.cells[10].isCur).toBe(true);
    expect(hm.detail).toContain('Most (10:00)');
    const bc = barChartModel(prices, NOW);
    expect(bc.bars).toHaveLength(72);
    expect(bc.bars.slice(0, 24).every((b) => b.missing)).toBe(true); // tegnapra nincs adat
  });

  it('olcsó sávok csak a jelen óra után, sávonként egyszer', () => {
    const bands = cheapBands(prices, NOW);
    expect(bands.length).toBe(1);
    expect(bands[0].idx).toBe(24);
    expect(bands[0].start.getTime()).toBeGreaterThan(NOW.getTime());
  });
});
