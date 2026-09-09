import { calcOnboardingSavings, compareTariffs, htntSaving, kpiRatio, TARIFFS } from '../savings';

describe('megtakarítás', () => {
  it('onboarding becslés', () => {
    expect(calcOnboardingSavings(['mosogep', 'bojler', 'klima'], 'htnt', 'magas')).toBe(33000);
    expect(calcOnboardingSavings(['mosogep', 'bojler', 'klima'], 'rezsi', 'magas')).toBe(0);
    expect(calcOnboardingSavings(['ev'], 'piaci', 'kozepes')).toBe(Math.round(30000 * 1.3 * 0.7));
  });
  it('éjszakai kalkulátor', () => {
    expect(htntSaving(200, 40)).toBeCloseTo(200 * 0.4 * 13.4 * 12, 5);
  });
  it('KPI arány 180 000 Ft-hoz', () => {
    expect(kpiRatio(90000)).toBe(0.5);
    expect(kpiRatio(500000)).toBe(1);
  });
  it('kereten belül a D tarifa = rezsivédett', () => {
    const c = compareTariffs(200, 'magas', 'rezsi', 60);
    expect(c.annualKwh).toBe(2400);
    expect(c.overCap).toBe(0);
    const rezsi = c.opts.find((o) => o.key === 'rezsi')!;
    const piaci = c.opts.find((o) => o.key === 'piaci')!;
    expect(piaci.bill).toBeCloseTo(rezsi.bill, 5);
    expect(rezsi.bill).toBeCloseTo(2400 * TARIFFS.REZSI, 5);
    expect(c.best.key).toBe('htnt');
    expect(c.verdict).toContain('Éjszakai áram');
  });
  it('kereten felül a tőzsdei ár számít', () => {
    const c = compareTariffs(500, 'magas', 'rezsi', 30);
    expect(c.overCap).toBe(6000 - TARIFFS.CAP);
    const rezsi = c.opts.find((o) => o.key === 'rezsi')!;
    const piaci = c.opts.find((o) => o.key === 'piaci')!;
    expect(piaci.bill).toBeLessThan(rezsi.bill);
    expect(c.best.key).toBe('htnt');
    expect(c.savedBySwitch).toBeGreaterThan(0);
  });
  it('alacsony rugalmasságnál és olcsó tőzsdénél a D tarifa a legjobb', () => {
    const c = compareTariffs(500, 'alacsony', 'rezsi', 10);
    expect(c.best.key).toBe('piaci');
    expect(c.verdict).toContain('Dinamikus D tarifa');
    expect(c.verdictHighlight).toBe('Dinamikus D tarifa');
  });
  it('ha már a legjobb tarifán vagy', () => {
    const c = compareTariffs(200, 'magas', 'htnt', 60);
    expect(c.best.key).toBe('htnt');
    expect(c.verdict).toContain('Jó helyen vagy');
    expect(c.savedBySwitch).toBe(0);
  });
});
