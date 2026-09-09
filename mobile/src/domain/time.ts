// Európa/Budapest időzóna-kezelés Intl-lel (Hermes támogatja), lokális idő fallbackkal.
// Az árak mindig magyar idő szerinti órákra vonatkoznak, a készülék zónájától függetlenül.

export const TZ = 'Europe/Budapest';

export interface ZonedParts {
  year: number;
  month: number; // 1–12
  day: number;
  hour: number; // 0–23
  minute: number;
  /** 0 = hétfő … 6 = vasárnap (pandas dayofweek konvenció) */
  dow: number;
}

const DOW: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

let cachedFmt: Intl.DateTimeFormat | null | undefined;

function getFmt(): Intl.DateTimeFormat | null {
  if (cachedFmt !== undefined) return cachedFmt;
  try {
    cachedFmt = new Intl.DateTimeFormat('en-US', {
      timeZone: TZ,
      hourCycle: 'h23',
      hour12: false,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      weekday: 'short',
    });
  } catch {
    cachedFmt = null;
  }
  return cachedFmt;
}

export function zonedParts(d: Date): ZonedParts {
  const f = getFmt();
  if (f) {
    try {
      const parts = f.formatToParts(d);
      const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
      const hourRaw = parseInt(get('hour'), 10);
      const weekday = get('weekday');
      if (weekday in DOW && !Number.isNaN(hourRaw)) {
        return {
          year: parseInt(get('year'), 10),
          month: parseInt(get('month'), 10),
          day: parseInt(get('day'), 10),
          hour: hourRaw === 24 ? 0 : hourRaw,
          minute: parseInt(get('minute'), 10),
          dow: DOW[weekday],
        };
      }
    } catch {
      // esik a lokális fallbackra
    }
  }
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
    hour: d.getHours(),
    minute: d.getMinutes(),
    dow: (d.getDay() + 6) % 7,
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Óra-kulcs: "2026-9-9-14" — az árak és az időpontok párosításához. */
export function hourKey(d: Date): string {
  const p = zonedParts(d);
  return `${p.year}-${p.month}-${p.day}-${p.hour}`;
}

/** Nap-kulcs: "2026-09-09" */
export function dayKey(d: Date): string {
  const p = zonedParts(d);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** "2026-09-09T14:00" — Open-Meteo stílusú helyi idő */
export function localTimeString(d: Date): string {
  const p = zonedParts(d);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** Budapesti naptári időpont → Date (UTC pillanat). A napok túlcsordulhatnak (pl. day = 32). */
export function zonedToDate(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const asUtc = (ms: number) => {
    const p = zonedParts(new Date(ms));
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  };
  let result = guess - (asUtc(guess) - guess);
  // Második kör az óraátállítás körüli esetekre
  const check = asUtc(result);
  if (check !== guess) result = result - (check - guess);
  return new Date(result);
}

/** A nap kezdete (00:00 magyar idő) a megadott nap-eltolással. */
export function startOfZonedDay(d: Date, offsetDays = 0): Date {
  const p = zonedParts(d);
  return zonedToDate(p.year, p.month, p.day + offsetDays);
}

export function zonedHour(d: Date): number {
  return zonedParts(d).hour;
}
