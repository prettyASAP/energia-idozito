import type { PricePoint } from './types';
import { getPrArr, fillDay, sortedDay, level } from './prices';
import { zonedParts } from './time';
import { pad2 } from './format';

export type PlanTab = 'klima' | 'napelem';

/** Szín-token kulcs a fázissávhoz */
export type PlanColor = 'accent500' | 'accent200' | 'accent100' | 'neutral800' | 'neutral200' | 'bad500';

export interface PlanRow {
  phase: string;
  color: PlanColor;
  start: number;
  end: number;
}

export const PHASE_DESCS: Record<string, string> = {
  'Előhűtés': 'Hűtsd 1–2 fokkal a komfort alá — olcsó a déli áram.',
  'Bekapcsolhatod': 'Olcsó sáv — mehet a klíma, ha kell.',
  'Hőtartalékon': 'Kapcsold ki — a lakás hőtartaléka viszi.',
  'Hagyd kikapcsolva': 'Nincs teendő — hűvös éjszakai órák.',
  'Napelem csúcs': 'Ekkor menjenek a nagy fogyasztók: mosógép, autótöltés.',
  'Részleges termelés': 'Kisebb gépek mehetnek napelemről.',
  'Olcsó hálózat': 'Éjszakai olcsó áram — EV-töltésre ideális.',
  'Kerüld!': 'Drága hálózati áram — halaszd későbbre.',
  'Semleges': 'Nincs teendő.',
};

export const PLAN_TIPS: Record<PlanTab, string> = {
  klima: 'Tipp: 11:00–15:00 között hűts 1–2 fokkal a komfort alá, 17:00–21:00 között kapcsold ki — a falak hőtárolása kitart.',
  napelem: 'Tipp: mosógépet, mosogatót 11:00–15:00 közé, az autótöltést éjszakára vagy délre időzítsd.',
};

export const planTimeStr = (r: PlanRow) => `${pad2(r.start)}:00–${pad2(r.end % 24)}:00`;

export interface PlanModel {
  rows: PlanRow[];
  cur: PlanRow | null;
  next: PlanRow | null;
  nowPct: number;
  legend: { phase: string; color: PlanColor }[];
  tip: string;
}

export function buildDayPlan(prices: PricePoint[] | Map<string, number>, now: Date, tab: PlanTab): PlanModel {
  const pr = getPrArr(prices, now);
  const p = zonedParts(now);
  const today = fillDay(pr.slice(0, 24));
  const sorted = sortedDay(pr.slice(0, 24));
  const isKlima = tab === 'klima';

  const blocks: { phase: string; color: PlanColor }[] = [];
  for (let h = 0; h < 24; h++) {
    const l = level(today[h], sorted);
    if (isKlima) {
      if (l === 'draga') blocks.push({ phase: 'Hőtartalékon', color: 'neutral800' });
      else if (h >= 10 && h <= 15) blocks.push({ phase: 'Előhűtés', color: 'accent500' });
      else if (l === 'olcso') blocks.push({ phase: 'Bekapcsolhatod', color: 'accent200' });
      else blocks.push({ phase: 'Hagyd kikapcsolva', color: 'neutral200' });
    } else {
      if (h >= 10 && h <= 15) blocks.push({ phase: 'Napelem csúcs', color: 'accent500' });
      else if (h >= 8 && h <= 17) blocks.push({ phase: 'Részleges termelés', color: 'accent200' });
      else if (l === 'draga') blocks.push({ phase: 'Kerüld!', color: 'bad500' });
      else if (l === 'olcso') blocks.push({ phase: 'Olcsó hálózat', color: 'accent100' });
      else blocks.push({ phase: 'Semleges', color: 'neutral200' });
    }
  }

  const rows: PlanRow[] = [];
  blocks.forEach((b, h) => {
    const last = rows[rows.length - 1];
    if (last && last.phase === b.phase) last.end = h + 1;
    else rows.push({ phase: b.phase, color: b.color, start: h, end: h + 1 });
  });

  const curIdx = rows.findIndex((r) => p.hour >= r.start && p.hour < r.end);
  const cur = curIdx >= 0 ? rows[curIdx] : null;
  const next = curIdx >= 0 ? rows[curIdx + 1] ?? null : null;
  const nowPct = ((p.hour + p.minute / 60) / 24) * 100;
  const seen: string[] = [];
  for (const r of rows) if (!seen.includes(r.phase)) seen.push(r.phase);
  const legend = seen.map((phase) => ({ phase, color: rows.find((r) => r.phase === phase)!.color }));

  return { rows, cur, next, nowPct, legend, tip: PLAN_TIPS[tab] };
}
