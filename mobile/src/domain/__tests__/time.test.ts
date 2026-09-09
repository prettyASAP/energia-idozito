import { dayKey, hourKey, startOfZonedDay, zonedParts, zonedToDate } from '../time';

describe('Budapest időzóna', () => {
  it('nyári időszámítás (CEST, UTC+2)', () => {
    const p = zonedParts(new Date('2026-07-01T10:00:00Z'));
    expect(p).toMatchObject({ year: 2026, month: 7, day: 1, hour: 12, minute: 0, dow: 2 });
  });
  it('téli időszámítás (CET, UTC+1)', () => {
    const p = zonedParts(new Date('2026-01-15T10:30:00Z'));
    expect(p).toMatchObject({ year: 2026, month: 1, day: 15, hour: 11, minute: 30, dow: 3 });
  });
  it('éjfél körül nem ad 24-es órát', () => {
    expect(zonedParts(new Date('2026-07-01T22:00:00Z')).hour).toBe(0);
    expect(zonedParts(new Date('2026-07-01T22:00:00Z')).day).toBe(2);
  });
  it('a nap kezdete magyar idő szerint', () => {
    expect(startOfZonedDay(new Date('2026-07-01T10:00:00Z')).toISOString()).toBe('2026-06-30T22:00:00.000Z');
    expect(startOfZonedDay(new Date('2026-07-01T10:00:00Z'), 1).toISOString()).toBe('2026-07-01T22:00:00.000Z');
    expect(startOfZonedDay(new Date('2026-01-15T10:00:00Z'), -1).toISOString()).toBe('2026-01-13T23:00:00.000Z');
  });
  it('zonedToDate oda-vissza', () => {
    const d = zonedToDate(2026, 3, 29, 12, 0); // óraátállítás napja
    expect(zonedParts(d)).toMatchObject({ year: 2026, month: 3, day: 29, hour: 12 });
  });
  it('kulcsok', () => {
    const d = new Date('2026-09-09T05:00:00Z');
    expect(hourKey(d)).toBe('2026-9-9-7');
    expect(dayKey(d)).toBe('2026-09-09');
  });
});
