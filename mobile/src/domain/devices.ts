import type { Device } from './types';

// Eszközdefiníciók — az azonosítók megegyeznek a webes app és a design azonosítóival.
export const MAIN_DEV: Device[] = [
  { id: 'mosogep', name: 'Mosógép', kwh: 1.0, dur: 2, annual: 6000,
    icon: 'M5 3h14v18H5z M8 6h.01 M11 6h.01 M12 14m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0' },
  { id: 'mosogatogep', name: 'Mosogatógép', kwh: 1.2, dur: 2, annual: 5000,
    icon: 'M5 3h14v18H5z M5 8h14 M12 15m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0' },
  { id: 'bojler', name: 'Bojler', kwh: 6, dur: 3, annual: 18000,
    icon: 'M7 2h10a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2H7a2 2 0 0 1 -2 -2V4a2 2 0 0 1 2 -2z M9 20v2 M15 20v2 M9 9c1 -1 2 -1 3 0s2 1 3 0' },
  { id: 'klima', name: 'Klíma', kwh: 2.5, dur: 4, annual: 9000,
    icon: 'M3 5h18v6H3z M6 8h.01 M17 8h.01 M7 14c0 2 -1 2 -1 4 M12 14c0 2 -1 2 -1 4 M17 14c0 2 -1 2 -1 4' },
  { id: 'ev', name: 'E-autó töltő', kwh: 11, dur: 4, annual: 30000,
    icon: 'M13 2 3 14h7l-1 8 10 -12h-7l1 -8' },
  { id: 'szarito', name: 'Szárítógép', kwh: 2.0, dur: 2, annual: 7000,
    icon: 'M5 3h14v18H5z M12 13m-5 0a5 5 0 1 0 10 0a5 5 0 1 0 -10 0 M12 13m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0' },
];

export const EXTRA_DEV: Device[] = [
  { id: 'hoszivattyu', name: 'Hőszivattyú', kwh: 0, dur: 0, annual: 15000, extra: true,
    icon: 'M12 3v18 M5 8l7 -5 7 5 M8 21v-6h8v6' },
  { id: 'napelemek', name: 'Napelem', kwh: 0, dur: 0, annual: 12000, extra: true,
    icon: 'M4 6h16l2 9H2z M12 15v6 M8 21h8 M8 9h.01 M12 9h.01 M16 9h.01' },
];

export const ALL_DEV: Device[] = [...MAIN_DEV, ...EXTRA_DEV];

export function deviceById(id: string): Device | undefined {
  return ALL_DEV.find((d) => d.id === id);
}
