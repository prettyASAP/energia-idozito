import type { Flex, Tariff, PricePoint } from './types';
import { ALL_DEV } from './devices';
import { fmt } from './format';

export function tariffMult(t: Tariff): number {
  return t === 'htnt' ? 1.0 : t === 'piaci' ? 1.3 : 0.0;
}

export function flexMult(f: Flex): number {
  return f === 'kozepes' ? 0.7 : f === 'alacsony' ? 0.4 : 1.0;
}

/** Onboarding becslés: Σ eszköz éves érték × tarifaszorzó × rugalmasság. */
export function calcOnboardingSavings(devices: string[], tariff: Tariff, flex: Flex): number {
  const base = devices.reduce((sum, id) => sum + (ALL_DEV.find((d) => d.id === id)?.annual ?? 0), 0);
  return Math.round(base * tariffMult(tariff) * flexMult(flex));
}

/** KPI gyűrű aránya: éves megtakarítás / 180 000 Ft. */
export function kpiRatio(amount: number): number {
  return Math.min(1, amount / 180000);
}

// 2026-os lakossági egységárak (MEKH H2995/2025), bruttó Ft/kWh
export const TARIFFS = {
  CAP: 2523, // rezsivédett éves keret kWh
  REZSI: 36.4, // A1 rezsivédett a keretig
  PIACI: 70.1, // A1 keret felett
  NT: 23.0, // vezérelt (éjszakai) a keretig
  NT_PIACI: 60.9, // B alap keret felett (MVM Next 2026: 60,935 Ft)
  NETFEE_NET: 25.4, // D tarifa hálózati díj nettó
  VAT: 1.27,
} as const;

/** Éjszakai áram kalkulátor: kWh × %/100 × (36,4 − 23,0) × 12 */
export function htntSaving(kwhMonth: number, pct: number): number {
  return kwhMonth * (pct / 100) * (TARIFFS.REZSI - TARIFFS.NT) * 12;
}

export const TARIFF_OPTIONS: { id: Tariff; label: string }[] = [
  { id: 'rezsi', label: 'Rezsivédett (normál)' },
  { id: 'htnt', label: 'Éjszakai áram (vezérelt)' },
  { id: 'piaci', label: 'Dinamikus (okosmérős)' },
];

export const FLEX_OPTIONS: { id: Flex; label: string }[] = [
  { id: 'magas', label: 'Előre tervezem' },
  { id: 'kozepes', label: 'Néha igen' },
  { id: 'alacsony', label: 'Nehézkes' },
];

export const TARIFF_INFO: Record<Tariff, string> = {
  rezsi: 'A normál lakossági áram — ezt fizeti szinte mindenki, fix kedvezményes egységáron.',
  htnt: 'Az „éjszakai áram": külön mért áramkör bojlerhez, hőszivattyúhoz, EV-töltőhöz — a szolgáltató éjjel és napközbeni sávokban kapcsolja, kedvezményes áron. Bárki igényelheti, de külön mérőkör szükséges.',
  piaci: 'Óránként változó tőzsdei ár — okosmérő kell hozzá. 2026. szeptember 1-jétől igényelhető az MVM Next-nél (D árszabás), 2027. január 1-jén lép életbe. Az ár euróban képződik (EUR/MWh), a forintra váltás az MNB napi deviza-középárfolyamán történik — az euró erősödése a számlát is emeli.',
};

export const RESULT_DESCS: Record<Tariff, string> = {
  rezsi: 'Rezsivédett tarifán az egységár napszaktól függetlenül fix — az időzítés a jelenlegi tarifán nem csökkenti közvetlenül a számlát. Vezérelt (éjszakai) vagy dinamikus tarifán ez az összeg valóban megjelenne.',
  htnt: 'Éjszakai (vezérelt) áramkörre kötött gépeknél a kedvezményes ár közvetlenül a számládon jelentkezik — a fenti összeg ebből jön.',
  piaci: 'Dinamikus (piaci áras) tarifán az órás árkülönbség teljes egészében a tiéd — az app ajánlott idősávjai pontosan ezt az árat követik.',
};

export interface TariffOption {
  key: Tariff;
  name: string;
  bill: number;
}

export interface TariffComparison {
  opts: TariffOption[];
  best: TariffOption;
  mine: TariffOption;
  savedBySwitch: number;
  annualKwh: number;
  overCap: number;
  underCap: number;
  spot30: number;
  maxBill: number;
  verdict: string;
  verdictHighlight: string | null;
  footnote: string;
}

/** 30 napos tőzsdei átlag a betöltött (nem előrejelzett) árakból. */
export function spotAverage(prices: PricePoint[]): number {
  const hist = prices.filter((p) => !p.is_forecast).map((p) => p.price_huf_kwh);
  return hist.length ? hist.reduce((a, b) => a + b, 0) / hist.length : 60;
}

/** Melyik tarifa éri meg? — éves számla becslés mindhárom opcióra. */
export function compareTariffs(kwhMonthRaw: number, flex: Flex, tariff: Tariff, spot30: number): TariffComparison {
  const { CAP, REZSI, PIACI, NT, NT_PIACI, NETFEE_NET, VAT } = TARIFFS;
  const kwhMonth = Math.max(50, Math.round(kwhMonthRaw) || 200);
  const annualKwh = kwhMonth * 12;
  const flexShare = 0.3 * flexMult(flex);
  const cheapAvg = spot30 * 0.55;

  const rezsiBill = Math.min(annualKwh, CAP) * REZSI + Math.max(0, annualKwh - CAP) * PIACI;
  const ntKwh = annualKwh * flexShare;
  const htntBill =
    Math.min(ntKwh, CAP) * NT + Math.max(0, ntKwh - CAP) * NT_PIACI +
    Math.min(annualKwh * (1 - flexShare), CAP) * REZSI +
    Math.max(0, annualKwh * (1 - flexShare) - CAP) * PIACI;
  const overCap = Math.max(0, annualKwh - CAP);
  const underCap = Math.min(annualKwh, CAP);
  const dynBill = underCap * REZSI + overCap * (
    (1 - flexShare) * (spot30 + NETFEE_NET) * VAT +
    flexShare * (cheapAvg + NETFEE_NET) * VAT
  );

  const opts: TariffOption[] = [
    { key: 'rezsi', name: 'Rezsivédett', bill: rezsiBill },
    { key: 'htnt', name: 'Éjszakai áram (vezérelt)', bill: htntBill },
    { key: 'piaci', name: 'Dinamikus D tarifa (2027-től)', bill: dynBill },
  ];
  const best = opts.reduce((a, b) => (b.bill < a.bill ? b : a));
  const mine = opts.find((o) => o.key === tariff) ?? opts[0];
  const savedBySwitch = Math.round(mine.bill - best.bill);

  let verdict: string;
  let verdictHighlight: string | null = null;
  if (best.key === tariff) {
    verdict = '✅ Jó helyen vagy: a mostani tarifád a legolcsóbb.' + (
      mine.key === 'piaci'
        ? ' A Dinamikus D tarifa 2027-ben lép életbe — addig vezérelt vagy rezsivédett áron is optimalizálhatsz.'
        : annualKwh <= CAP
          ? ' A D tarifa a te fogyasztásoddal nem hoz különbséget (kereten belül vagy).'
          : ' A D tarifa a te fogyasztásoddal nem érné meg.'
    );
  } else if (best.key === 'piaci') {
    verdictHighlight = 'Dinamikus D tarifa';
    verdict = `💡 A Dinamikus D tarifa lenne a legolcsóbb — ${fmt(savedBySwitch)} Ft/év megtakarítás a keret feletti ${fmt(overCap)} kWh-on.${overCap > 0 ? ' 2026. szept. 1-jétől igényelhető, 2027. jan. 1-jén lép életbe.' : ''} Figyelj arra, hogy az ár euróban képződik — az árfolyam is befolyásolja a számlát.`;
  } else {
    verdictHighlight = best.name;
    verdict = `💡 Neked a(z) ${best.name} tarifa lenne a legolcsóbb — váltással évente kb. ${fmt(savedBySwitch)} Ft-tal kevesebbet fizetnél.`;
  }

  const footnote = `Közelítő becslés. Rezsivédett: 36,4 Ft/kWh a 2523 kWh/év keretig, felette 70,1 Ft (MEKH 2026). Vezérelt (NT): ~23 Ft. Dinamikus D tarifa: 2523 kWh-ig rezsivédett ár, felette (tőzsdei ár ${spot30.toFixed(1).replace('.', ',')} Ft + ~25,4 Ft hálózati díj) × 1,27 ÁFA — igényelhető 2026. szept. 1-jétől, hatályba lép 2027. jan. 1-én (mvmnext.hu/aram/dinamikus). A tőzsdei ár euróban képződik, MNB napi deviza-középárfolyamon váltva — árfolyamkockázat terheli.`;

  return {
    opts, best, mine, savedBySwitch, annualKwh, overCap, underCap, spot30,
    maxBill: Math.max(...opts.map((o) => o.bill)),
    verdict, verdictHighlight, footnote,
  };
}
