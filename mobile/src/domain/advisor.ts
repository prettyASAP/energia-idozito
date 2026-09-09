import type { AdvisorAnswers } from './types';
import { ALL_DEV } from './devices';
import { tariffMult } from './savings';

export const HOME_OPTIONS = [
  { id: 'haz', label: 'Ház' },
  { id: 'lakas_tegla', label: 'Téglaházi lakás' },
  { id: 'lakas_panel', label: 'Panellakás' },
] as const;

export const SIZE_OPTIONS = [
  { id: 'small', label: '60 m² alatt' },
  { id: 'medium', label: '60–100 m²' },
  { id: 'large', label: '100–150 m²' },
  { id: 'xlarge', label: '150 m² felett' },
] as const;

export const HEAT_OPTIONS = [
  { id: 'gaz', label: 'Gázkazán' },
  { id: 'hoszivattyu', label: 'Hőszivattyú' },
  { id: 'elektromos', label: 'Elektromos' },
  { id: 'tavfutes', label: 'Távfűtés' },
] as const;

export const ADV_TARIFF_OPTIONS = [
  { id: 'rezsi', label: 'Rezsivédett' },
  { id: 'htnt', label: 'HT/NT kétmérős' },
  { id: 'piaci', label: 'Dinamikus / Piaci' },
] as const;

export const BUDGET_OPTIONS = [
  { val: 0, label: 'Semmit', sub: 'csak ingyenes lépések' },
  { val: 100000, label: '~100 ezer Ft', sub: 'kisebb eszközök' },
  { val: 500000, label: '~500 ezer Ft', sub: 'közepes projekt' },
  { val: 5000000, label: 'Bármennyit', sub: 'napelem, hőszivattyú' },
] as const;

export const PRIORITY_OPTIONS = [
  { id: 'megtakaritas', label: 'Minél nagyobb megtakarítás' },
  { id: 'gyors', label: 'Azonnali eredmény' },
  { id: 'kornyezet', label: 'Környezetbarát' },
  { id: 'kenyelem', label: 'Kényelem, automatizálás' },
] as const;

export const DEFAULT_ADVISOR: AdvisorAnswers = {
  homeType: 'haz',
  homeSize: 'medium',
  heating: 'gaz',
  devices: ['mosogep', 'klima'],
  bill: 15000,
  tariff: 'rezsi',
  budget: 100000,
  priority: 'megtakaritas',
};

export interface Candidate {
  t: string;
  d: string;
  cost: number;
  save: number;
  eco?: number;
  fast?: number;
  comfort?: number;
  ok?: boolean;
}

export interface AdvisorResult {
  recs: Candidate[];
  totalSave: number;
  summary: string;
}

export function buildAdvisorResults(a: AdvisorAnswers): AdvisorResult {
  const has = (id: string) => a.devices.includes(id);
  const billMult = Math.min(2.5, Math.max(0.5, a.bill / 15000));
  const devSave = a.devices.reduce((s, id) => s + (ALL_DEV.find((d) => d.id === id)?.annual ?? 0), 0)
    * tariffMult(a.tariff) * billMult;

  const cands: Candidate[] = [
    { t: 'Eszközök időzítése olcsó órákra',
      d: 'A mosást, bojlert, töltést told az éjszakai és déli olcsó sávokba — ehhez csak ez az app kell.',
      cost: 0, save: Math.max(devSave, 5000), eco: 1, fast: 1, ok: a.tariff !== 'rezsi' },
    { t: 'Vezérelt (éjszakai) tarifa igénylése',
      d: 'Ingyenesen igényelhető az elosztódtól; a kedvezményes sávban kb. 37%-kal olcsóbb az éjszakai áram (23 vs. 36,4 Ft/kWh).',
      cost: 0, save: 45000 * billMult,
      ok: a.tariff !== 'htnt' && (has('bojler') || has('ev') || has('hoszivattyu')), fast: 1 },
    { t: 'Öko programok és teli gép',
      d: 'A mosó- és mosogatógép öko programja alkalmanként 20–40%-kal kevesebb energiát használ.',
      cost: 0, save: 8000, ok: has('mosogep') || has('mosogatogep'), eco: 1, fast: 1 },
    { t: 'Okoskonnektorok időzítéssel',
      d: 'Okosdugalj automatikusan a legolcsóbb órában indítja a gépeket.',
      cost: 25000, save: 12000, ok: a.devices.length >= 2, comfort: 1, fast: 1 },
    { t: 'Bojler időzítő beépítése',
      d: 'A bojler csak éjszaka fűtsön — a háztartás egyik legnagyobb fogyasztója.',
      cost: 15000, save: 18000 * billMult, ok: has('bojler') },
    { t: 'Okos termosztát a gázkazánhoz',
      d: 'Ütemezett, helyiségenkénti fűtés — 10–15% megtakarítás.',
      cost: 60000, save: 25000, ok: a.heating === 'gaz', comfort: 1 },
    { t: 'Inverteres klímára csere',
      d: 'Inverteres klíma 30–50%-kal kevesebb áramot fogyaszt a régi, fixfordulatú gépeknél.',
      cost: 350000, save: 20000, ok: has('klima') },
    { t: 'Napelemes rendszer (~4 kWp)',
      d: 'Állami támogatással (50-60%) kb. 10–14 év megtérülés, támogatás nélkül ~20–25 év (bruttó elszámolás, 2024 óta nincs nettó elszámolás). Utána évtizedekig termel.',
      cost: 3500000, save: 130000, ok: !has('napelemek') && a.homeType === 'haz', eco: 1 },
    { t: 'Hőszivattyú a gáz kiváltására',
      d: 'Hosszú távon a legnagyobb megtakarítás — és a legzöldebb fűtés.',
      cost: 4500000, save: 250000,
      ok: (a.heating === 'gaz' || a.heating === 'elektromos') && a.homeType === 'haz', eco: 1, comfort: 1 },
  ].filter((c) => (c.ok ?? true) && c.cost <= a.budget);

  const p = a.priority;
  cands.sort((x, y) =>
    p === 'megtakaritas' ? y.save - x.save :
    p === 'gyors' ? (x.cost - y.cost) || ((y.fast || 0) - (x.fast || 0)) :
    p === 'kornyezet' ? ((y.eco || 0) - (x.eco || 0)) || (y.save - x.save) :
    ((y.comfort || 0) - (x.comfort || 0)) || (y.save - x.save),
  );
  const recs = cands.slice(0, 5);
  const totalSave = recs.reduce((s, r) => s + r.save, 0);
  const summary = recs.length
    ? `${recs.length} ajánlás a válaszaid alapján — együtt akár ${Math.round(totalSave).toLocaleString('hu-HU')} Ft megtakarítás évente.`
    : 'Nincs ajánlás a megadott szempontokra.';
  return { recs, totalSave, summary };
}
