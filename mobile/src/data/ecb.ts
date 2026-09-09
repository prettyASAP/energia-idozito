// EUR/HUF árfolyam az Európai Központi Bank napi referencia-XML-jéből.

export const DEFAULT_EUR_HUF = 395.0;
const ECB_URL = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';

export function parseEcbHuf(xml: string): number | null {
  const m = xml.match(/<Cube[^>]*currency=['"]HUF['"][^>]*rate=['"]([\d.]+)['"]/) ?? xml.match(/rate=['"]([\d.]+)['"][^>]*currency=['"]HUF['"]/);
  if (!m) return null;
  const v = parseFloat(m[1]);
  return Number.isFinite(v) && v > 0 ? v : null;
}

export async function fetchEurHuf(timeoutMs = 8000): Promise<number> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(ECB_URL, { signal: ctrl.signal });
    if (!res.ok) return DEFAULT_EUR_HUF;
    const rate = parseEcbHuf(await res.text());
    return rate ?? DEFAULT_EUR_HUF;
  } catch {
    return DEFAULT_EUR_HUF;
  } finally {
    clearTimeout(timer);
  }
}
