import { buildAdvisorResults, DEFAULT_ADVISOR } from '../advisor';

describe('tanácsadó', () => {
  it('legfeljebb 5 ajánlás, kereten belül', () => {
    const r = buildAdvisorResults({ ...DEFAULT_ADVISOR, budget: 5000000, devices: ['mosogep', 'bojler', 'klima', 'ev'], tariff: 'htnt' });
    expect(r.recs.length).toBeLessThanOrEqual(5);
    expect(r.recs.every((c) => c.cost <= 5000000)).toBe(true);
    expect(r.summary).toContain('ajánlás');
  });
  it('nulla keretnél csak ingyenes lépések', () => {
    const r = buildAdvisorResults({ ...DEFAULT_ADVISOR, budget: 0, devices: ['bojler'] });
    expect(r.recs.every((c) => c.cost === 0)).toBe(true);
    expect(r.recs.some((c) => c.t.includes('Vezérelt'))).toBe(true);
  });
  it('megtakarítás szerint rendez', () => {
    const r = buildAdvisorResults({ ...DEFAULT_ADVISOR, budget: 5000000, priority: 'megtakaritas', devices: ['mosogep', 'klima', 'bojler'] });
    for (let i = 1; i < r.recs.length; i++) expect(r.recs[i - 1].save).toBeGreaterThanOrEqual(r.recs[i].save);
  });
  it('lakásban nincs napelem/hőszivattyú ajánlás', () => {
    const r = buildAdvisorResults({ ...DEFAULT_ADVISOR, budget: 5000000, homeType: 'lakas_panel', priority: 'kornyezet' });
    expect(r.recs.some((c) => c.t.includes('Napelem'))).toBe(false);
    expect(r.recs.some((c) => c.t.includes('Hőszivattyú'))).toBe(false);
  });
});
