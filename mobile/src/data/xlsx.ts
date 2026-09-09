import { unzipSync, strFromU8 } from 'fflate';

// Minimális XLSX-olvasó (első munkalap, cellaértékek) — a MAVIR exportokhoz elég,
// nem kell hozzá a teljes SheetJS.

export type Cell = string | number | null;

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&amp;/g, '&');
}

function colIndex(letters: string): number {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export function parseXlsxRows(bytes: Uint8Array): Cell[][] {
  const files = unzipSync(bytes);
  const shared: string[] = [];
  const ssFile = files['xl/sharedStrings.xml'];
  if (ssFile) {
    const ss = strFromU8(ssFile);
    for (const m of ss.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
      const texts = [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => decodeXml(x[1]));
      shared.push(texts.join(''));
    }
  }
  const sheetName = Object.keys(files)
    .filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k))
    .sort((a, b) => parseInt(a.replace(/\D/g, ''), 10) - parseInt(b.replace(/\D/g, ''), 10))[0];
  if (!sheetName) throw new Error('XLSX: nincs munkalap');
  const xml = strFromU8(files[sheetName]);
  const rows: Cell[][] = [];
  for (const rowM of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row: Cell[] = [];
    for (const c of rowM[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = c[1];
      const inner = c[2] ?? '';
      const ref = attrs.match(/\br="([A-Z]+)\d+"/);
      const type = attrs.match(/\bt="(\w+)"/)?.[1];
      const idx = ref ? colIndex(ref[1]) : row.length;
      let value: Cell = null;
      if (type === 'inlineStr') {
        const t = inner.match(/<t[^>]*>([\s\S]*?)<\/t>/);
        value = t ? decodeXml(t[1]) : null;
      } else {
        const v = inner.match(/<v>([\s\S]*?)<\/v>/);
        if (v) {
          if (type === 's') value = shared[parseInt(v[1], 10)] ?? null;
          else if (type === 'str' || type === 'b') value = decodeXml(v[1]);
          else {
            const num = parseFloat(v[1]);
            value = Number.isFinite(num) ? num : decodeXml(v[1]);
          }
        }
      }
      while (row.length < idx) row.push(null);
      row[idx] = value;
    }
    rows.push(row);
  }
  return rows;
}
