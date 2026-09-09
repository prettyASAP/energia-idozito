/** Magyar ezres tagolás: 6000 → "6 000" (nem törő szóközzel), mint a toLocaleString('hu-HU'). */
export function fmt(n: number): string {
  const rounded = Math.round(n);
  const sign = rounded < 0 ? '−' : '';
  const digits = String(Math.abs(rounded));
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** Egy tizedes, magyar tizedesvesszővel: 23.44 → "23,4" */
export function fmt1(n: number): string {
  return n.toFixed(1).replace('.', ',');
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** 48 órás index → "HH:00" */
export function hhmm(idx: number): string {
  return `${pad2(((idx % 24) + 24) % 24)}:00`;
}

/** "14:00–16:00" */
export function windowStr(start: number, dur: number): string {
  return `${hhmm(start)}–${hhmm(start + dur)}`;
}

/** Költségcímke a tanácsadóhoz: 0 → Ingyenes, 25000 → ~25e Ft, 3500000 → ~3,5 M Ft */
export function costTag(cost: number): string {
  if (cost === 0) return 'Ingyenes';
  if (cost < 1e6) return `~${fmt(Math.round(cost / 1000))}e Ft`;
  return `~${(cost / 1e6).toFixed(1).replace('.', ',')} M Ft`;
}
