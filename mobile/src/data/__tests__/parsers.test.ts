import fs from 'fs';
import path from 'path';
import { energyChartsUrl, parseEnergyCharts } from '../energyCharts';
import { parseEcbHuf } from '../ecb';
import { openMeteoUrl, parseOpenMeteo } from '../openMeteo';
import { parseXlsxRows } from '../xlsx';
import { buildGenerationMix, chartUrl, parseMavirTimestamp, rowsToRecords } from '../mavir';

describe('energy-charts', () => {
  it('URL perc pontosságú UTC-vel', () => {
    const u = energyChartsUrl(new Date('2026-09-08T07:55:12Z'), new Date('2026-09-10T07:55:00Z'));
    expect(u).toContain('bzn=HU');
    expect(u).toContain(encodeURIComponent('2026-09-08T07:55+00:00'));
  });
  it('negyedórák óránkénti átlaggá', () => {
    const base = 1788818400; // teljes óra
    const pts = parseEnergyCharts({ unix_seconds: [base, base + 900, base + 1800, base + 2700, base + 3600], price: [10, 20, 30, 40, null] });
    expect(pts).toHaveLength(1);
    expect(pts[0]).toEqual({ t: base * 1000, p: 25 });
  });
});

describe('EKB', () => {
  it('HUF árfolyam kiolvasása', () => {
    expect(parseEcbHuf(`<Cube currency='USD' rate='1.1'/><Cube currency='HUF' rate='395.55'/>`)).toBe(395.55);
    expect(parseEcbHuf('<Cube currency="HUF" rate="401"/>')).toBe(401);
    expect(parseEcbHuf('<x/>')).toBeNull();
  });
});

describe('Open-Meteo', () => {
  it('unix idő → helyi óra', () => {
    expect(openMeteoUrl(47.5, 19.04)).toContain('timeformat=unixtime');
    const h = parseOpenMeteo({ hourly: { time: [Date.UTC(2026, 6, 1, 10) / 1000], temperature_2m: [30], apparent_temperature: [32], relative_humidity_2m: [40], shortwave_radiation: [700] } });
    expect(h).toHaveLength(1);
    expect(h[0].hour).toBe(12);
    expect(h[0].local_time).toBe('2026-07-01T12:00');
    expect(h[0].timestamp).toBe('2026-07-01T10:00:00.000Z');
  });
});

describe('MAVIR', () => {
  const fixture = new Uint8Array(fs.readFileSync(path.join(__dirname, '..', '__fixtures__', 'mavir-9404.xlsx')));

  it('időbélyeg', () => {
    expect(parseMavirTimestamp('2026.08.25 12:15:00 +0200')).toBe('2026-08-25T10:15:00.000Z');
    expect(parseMavirTimestamp('rossz')).toBeNull();
    expect(parseMavirTimestamp(null)).toBeNull();
  });
  it('chart URL', () => {
    expect(chartUrl(9404, 1, 2)).toBe('https://rtdwweb.mavir.hu/rtdwweb/webuser/chart/9404/export?exportType=xlsx&fromTime=1&toTime=2&periodType=min&period=15');
  });
  it('XLSX export feldolgozása és termelési mix', () => {
    const rows = parseXlsxRows(fixture);
    expect(rows[0][0]).toBe('Időpont');
    expect(rows[0][1]).toBe('Hazai termelés (erőművi szumma)');
    const recs = rowsToRecords(rows);
    expect(recs.length).toBeGreaterThan(10);
    expect(recs[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    const mix = buildGenerationMix(recs);
    expect(mix.total_mw).toBeGreaterThan(0);
    expect(mix.mix.nuclear.mw).toBeGreaterThan(0);
    const sum = Object.values(mix.mix).reduce((a, m) => a + (m.share_pct ?? 0), 0);
    expect(sum).toBeGreaterThan(95);
    expect(sum).toBeLessThan(105);
  });
});
