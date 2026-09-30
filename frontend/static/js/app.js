'use strict';

/* Energia Időzítő
   Adat: HUPX másnapi negyedórás ár (nettó Ft/kWh) a /api/prices/quarterly végpontról,
   hálózat: MAVIR a /api/grid/mix és /api/grid/flows végpontról. */

// ── Állandók ─────────────────────────────────────────────────────────────
const Q_MS = 15 * 60 * 1000;
const H_MS = 60 * 60 * 1000;

// Tarifák 2026 (4/2011. NFM r., 20/2022. MEKH r., MVM Next D árszabás)
const T = {
  cap: 2523,          // kWh/év kedvezményes keret
  a1: 36.4,           // Ft/kWh bruttó a keretig (elosztónként 35,3 és 36,4 között)
  a1Over: 70.1,       // Ft/kWh bruttó a keret felett
  b: 23.0,            // vezérelt, keretig
  bOver: 60.9,        // vezérelt, keret felett
  bBase: 602,         // vezérelt mérő alapdíja, Ft/év bruttó
  spread: 13.7,       // D kereskedői díj, nettó (hirdetmény 2026.09.10.)
  grid: 23.4,         // lakossági hálózati díj, nettó
  vat: 1.27,
  fixEnergy: 31.8,    // lakossági piaci energiaár, nettó
};
const BREAK_EVEN = T.fixEnergy - T.spread; // 18,1 Ft nettó súlyozott tőzsdei átlag

// Havi tőzsdei átlagok 2025.09.01. és 2026.08.31. között, nettó Ft/kWh, kereskedői díj nélkül
// (HUPX másnapi ár az Energy-Charts adatából, EKB napi árfolyammal; eltérés az MVM listától 0,02% alatt).
// [esti csúcsú háztartási profil súlyozott átlaga, a nap legolcsóbb 4 órájának átlaga], hónap szerint.
// A profil súlyai: 0 és 6 óra 0,5; 6 és 9 óra 1,2; 9 és 17 óra 0,8; 17 és 22 óra 2,0; 22 és 24 óra 0,9 (feltevés).
const MONTHS = [
  [62.38, 37.61], [46.11, 30.37], [52.84, 12.49], [42.31, -2.80], [43.62, 0.80], [52.76, 12.41],
  [48.90, 14.38], [61.20, 24.54], [47.85, 15.77], [55.45, 25.98], [51.58, 32.10], [47.20, 32.86],
];
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
// Havi fogyasztási szorzó: január a legnagyobb, nyár közepe a legkisebb, arányuk 1,57
// (MEKH 2024: januárban kb. 1 570 GWh, júniusban kb. 1 000 GWh). Átlaga 1.
const SEASON = MONTH_DAYS.map((_, m) => 1 + 0.2218 * Math.cos(2 * Math.PI * m / 12));
const SHIFTS = [0, 0.1, 0.25, 0.5];
const VSHARES = [0, 0.25, 0.5];
const snap = (v, list, d) => (list.includes(v) ? v : d);

const DEVICES = [
  { id: 'mosogep', name: 'Mosógép', h: 2, icon: 'M5 3h14a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM8 6.5h.01M11 6.5h.01M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' },
  { id: 'mosogatogep', name: 'Mosogatógép', h: 2, icon: 'M5 3h14a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM4 8h16M9 13h6M9 16.5h6' },
  { id: 'szarito', name: 'Szárítógép', h: 2, icon: 'M5 3h14a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM12 18a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM10 13c1-1 3 1 4 0' },
  { id: 'bojler', name: 'Bojler', h: 3, icon: 'M8 2h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM9 20v2M15 20v2M12 7c-1.5 2-2 3-2 4a2 2 0 0 0 4 0c0-1-.5-2-2-4z' },
  { id: 'ev', name: 'Elektromos autó', h: 4, icon: 'M5 16h14M6 16l1.5-5.5A2 2 0 0 1 9.4 9h5.2a2 2 0 0 1 1.9 1.5L18 16M5 16v3M19 16v3M8 13h.01M16 13h.01' },
];
const DEFAULT_DEVICES = ['mosogep', 'mosogatogep', 'bojler'];

// ── Állapot ──────────────────────────────────────────────────────────────
const S = {
  q: [],               // [{ t: Date, p: nettó Ft/kWh }] időrendben
  loadedAt: null,
  loadError: false,
  mix: null,
  flows: null,
  view: 'most',
  day: 0,
  sel: null,           // kijelölt negyedóra index a napi grafikonon
  devices: loadPref('ei.devices', DEFAULT_DEVICES),
  calc: {
    kwh: loadPref('ei.kwh', 250),
    shift: snap(loadPref('ei.shift', 0.1), SHIFTS, 0.1),
    vshare: snap(loadPref('ei.vshare', 0), VSHARES, 0),
    period: '365',
  },
  fx: null,            // { rate, date, status } az árak lekéréséből
};

// ── Segédek ──────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const nf0 = new Intl.NumberFormat('hu-HU', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('hu-HU', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmt = n => nf0.format(Math.round(n)).replace('-', '−');
const fmt1 = n => nf1.format(n).replace('-', '−');
const fmtK = n => fmt(Math.round(n / 100) * 100); // kerekített, becsült összeg
const hhmm = d => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const pad2 = n => String(n).padStart(2, '0');

function loadPref(key, fallback) {
  try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
}
function savePref(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* privát mód */ }
}
function icon(path) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;
}
function dayStart(offset = 0) {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate() + offset);
}
function dayWord(d) {
  const diff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - dayStart(0)) / 864e5);
  return diff === 0 ? 'ma' : diff === 1 ? 'holnap' : diff === -1 ? 'tegnap' : `${d.getMonth() + 1}. ${d.getDate()}.`;
}
function avg(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : NaN; }

// Egy nap negyedórái
function dayQ(offset) {
  const a = dayStart(offset), b = dayStart(offset + 1);
  return S.q.filter(x => x.t >= a && x.t < b);
}
// Szintek a nap saját árai alapján: alsó és felső harmad
function thresholds(list) {
  const s = list.map(x => x.p).sort((a, b) => a - b);
  if (!s.length) return null;
  return { lo: s[Math.floor(s.length / 3)], hi: s[Math.floor(s.length * 2 / 3)] };
}
function level(p, th) {
  if (!th) return 'mid';
  return p <= th.lo ? 'cheap' : p >= th.hi ? 'dear' : 'mid';
}
const thCache = {};
function thFor(date) {
  const k = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  if (!(k in thCache)) {
    const off = Math.round((new Date(date.getFullYear(), date.getMonth(), date.getDate()) - dayStart(0)) / 864e5);
    const list = dayQ(off);
    thCache[k] = list.length >= 48 ? thresholds(list) : null;
  }
  return thCache[k];
}
function nowIndex() {
  const now = Date.now();
  let idx = -1;
  for (let i = 0; i < S.q.length; i++) {
    if (S.q[i].t.getTime() <= now) idx = i; else break;
  }
  if (idx >= 0 && now - S.q[idx].t.getTime() >= Q_MS) return -1; // nincs aktuális negyedóra
  return idx;
}

// ── Adat ─────────────────────────────────────────────────────────────────
async function loadPrices() {
  try {
    const r = await fetch('/api/prices/quarterly?days=31', { cache: 'no-store' });
    if (!r.ok) throw new Error(r.status);
    const d = await r.json();
    const seen = new Set();
    S.q = (d.prices || [])
      .map(x => ({ t: new Date(x.timestamp), p: x.price_huf_kwh }))
      .filter(x => Number.isFinite(x.p) && !seen.has(+x.t) && seen.add(+x.t))
      .sort((a, b) => a.t - b.t);
    S.fx = { rate: d.eur_huf_rate, date: d.eur_huf_date, status: d.eur_huf_status || 'ecb' };
    for (const k in thCache) delete thCache[k];
    S.loadedAt = new Date();
    S.loadError = false;
  } catch (e) {
    S.loadError = true;
  }
}
async function loadGrid() {
  const get = async ep => {
    try {
      const r = await fetch(`/api/grid/${ep}`);
      if (!r.ok) return null;
      const d = await r.json();
      return d && d.available ? d : null;
    } catch (e) { return null; }
  };
  const [mix, flows] = await Promise.all([get('mix'), get('flows')]);
  S.mix = mix; S.flows = flows;
  renderGrid();
}

// ── Nézetek ──────────────────────────────────────────────────────────────
function setView(view, push = true) {
  if (!['most', 'arak', 'megeri'].includes(view)) view = 'most';
  S.view = view;
  document.querySelectorAll('.view').forEach(v => { v.hidden = v.dataset.view !== view; });
  document.querySelectorAll('.tab').forEach(b => {
    if (b.dataset.tab === view) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  if (push && location.hash !== `#${view}`) history.pushState(null, '', `#${view}`);
  window.scrollTo(0, 0);
  renderView();
}
function renderView() {
  if (S.view === 'most') { renderNow(); renderDevices(); }
  if (S.view === 'arak') { renderDay(); renderTrend(); renderGrid(); }
  if (S.view === 'megeri') renderCalc();
}
function renderFresh() {
  const f = $('fresh');
  if (!S.loadedAt) { f.textContent = S.loadError ? 'Nincs kapcsolat' : ''; f.classList.toggle('stale', S.loadError); return; }
  const stale = Date.now() - S.loadedAt > 30 * 60 * 1000 || S.loadError;
  f.classList.toggle('stale', stale);
  f.textContent = `Frissítve ${hhmm(S.loadedAt)}`;
}

// ── MOST ─────────────────────────────────────────────────────────────────
function renderNow() {
  renderFresh();
  const card = $('nowCard');
  const i = nowIndex();
  if (i < 0) {
    card.className = 'now card-dark';
    $('nowSlot').textContent = S.loadError ? 'Nem sikerült betölteni az árakat' : 'Nincs aktuális ár';
    $('nowLevel').hidden = true;
    $('nowPrice').innerHTML = '&nbsp;';
    $('nowLine').innerHTML = `<span class="err">Próbáld újra pár perc múlva. <button class="btn" id="retryBtn">Újra</button></span>`;
    $('strip').innerHTML = '';
    $('nowNext').textContent = '';
    const rb = $('retryBtn');
    if (rb) rb.onclick = async () => { await loadPrices(); renderView(); };
    return;
  }
  const cur = S.q[i];
  const today = dayQ(0);
  const th = thresholds(today);
  const lvl = level(cur.p, th);
  const dayAvg = avg(today.map(x => x.p));

  card.className = `now card-dark lvl-${lvl}`;
  $('nowSlot').textContent = `Most, ${hhmm(cur.t)}–${hhmm(new Date(+cur.t + Q_MS))}`;
  const chip = $('nowLevel');
  chip.hidden = false;
  chip.className = `chip chip-${lvl}`;
  chip.textContent = { cheap: 'Olcsó', mid: 'Átlagos', dear: 'Drága' }[lvl];
  $('nowPrice').textContent = fmt1(cur.p);

  const diff = dayAvg > 1 ? Math.round((cur.p - dayAvg) / dayAvg * 100) : 0;
  $('nowLine').textContent = Math.abs(diff) < 8
    ? 'Nagyjából a mai átlag.'
    : `A mai átlagnál ${Math.abs(diff)}%-kal ${diff < 0 ? 'olcsóbb' : 'drágább'}.`;

  const fxn = fxNote();
  if (fxn) $('nowLine').textContent += ` ${fxn}`;
  renderStrip(i);
  $('nowNext').innerHTML = nextText(i);
}

// Óránkénti szint: az óra negyedóráinak átlaga a nap saját árai alapján
function hourLevel(startMs) {
  const vals = S.q.filter(x => +x.t >= startMs && +x.t < startMs + H_MS).map(x => x.p);
  if (!vals.length) return null;
  return { lvl: level(avg(vals), thFor(new Date(startMs))), a: avg(vals) };
}
function hourStart(i) { const d = new Date(S.q[i].t); d.setMinutes(0, 0, 0); return +d; }

function renderStrip(i) {
  const start = hourStart(i);
  let html = '';
  for (let k = 0; k < 12; k++) {
    const a = start + k * H_MS, d = new Date(a), hl = hourLevel(a);
    const title = hl ? `${pad2(d.getHours())}:00, átlag ${fmt1(hl.a)} Ft/kWh` : `${pad2(d.getHours())}:00, még nincs ár`;
    html += `<div class="strip-c${k === 0 ? ' is-now' : ''}" title="${title}"><div class="strip-bar ${hl ? hl.lvl : 'none'}"></div><span class="strip-h">${pad2(d.getHours())}</span></div>`;
  }
  $('strip').innerHTML = html;
}

function nextText(i) {
  const start = hourStart(i);
  const cur = hourLevel(start);
  const last = +S.q[S.q.length - 1].t;
  if (cur && cur.lvl === 'cheap') {
    let a = start + H_MS;
    while (a <= last) { const hl = hourLevel(a); if (!hl || hl.lvl !== 'cheap') break; a += H_MS; }
    const end = new Date(a);
    return `Az olcsó sáv <b>${dayWord(end) === 'ma' ? '' : dayWord(end) + ' '}${hhmm(end)}-ig</b> tart.`;
  }
  for (let a = start + H_MS; a <= last; a += H_MS) {
    const hl = hourLevel(a);
    if (hl && hl.lvl === 'cheap') {
      const t = new Date(a);
      const hrs = Math.round((a - Date.now()) / H_MS);
      const inTxt = hrs < 1 ? 'egy órán belül' : `${hrs} óra múlva`;
      return `Legközelebb olcsó: <b>${dayWord(t)} ${hhmm(t)}-tól</b>, ${inTxt}.`;
    }
  }
  return 'A holnapi árak délután 1 óra körül jelennek meg.';
}

// Legolcsóbb összefüggő sáv a következő 24 órában
function bestWindow(i0, hours) {
  const L = hours * 4;
  const end = Math.min(S.q.length, i0 + 96);
  let best = null;
  for (let s = i0; s + L <= end; s++) {
    if (+S.q[s + L - 1].t - +S.q[s].t !== (L - 1) * Q_MS) continue;
    let sum = 0;
    for (let k = s; k < s + L; k++) sum += S.q[k].p;
    const a = sum / L;
    if (!best || a < best.avg - 1e-9) best = { s, avg: a };
  }
  return best;
}
function windowAvg(s, hours) {
  const L = hours * 4;
  if (s + L > S.q.length || +S.q[s + L - 1].t - +S.q[s].t !== (L - 1) * Q_MS) return null;
  let sum = 0;
  for (let k = s; k < s + L; k++) sum += S.q[k].p;
  return sum / L;
}

function renderDevices() {
  const chips = $('devChips');
  chips.innerHTML = DEVICES.map(d =>
    `<button class="chip-b" data-dev="${d.id}" aria-pressed="${S.devices.includes(d.id)}">${icon(d.icon)}${d.name}</button>`
  ).join('');

  const list = $('devList');
  const i = nowIndex();
  const mine = DEVICES.filter(d => S.devices.includes(d.id));
  if (!mine.length) { list.innerHTML = '<li class="dev-empty">Nincs kiválasztott gép. Koppints a Gépek gombra.</li>'; return; }
  if (i < 0) { list.innerHTML = '<li class="dev-empty">Árak nélkül nem tudunk időpontot ajánlani.</li>'; return; }

  list.innerHTML = mine.map(d => {
    const best = bestWindow(i, d.h);
    const nowAvg = windowAvg(i, d.h);
    if (!best) {
      return `<li class="dev"><span class="dev-ic">${icon(d.icon)}</span><div><div class="dev-name">${d.name}</div><div class="dev-sub">${d.h} óra futás</div></div><div class="dev-when"><b>Később</b><span>még nincs ár</span></div></li>`;
    }
    const go = best.s === i || (nowAvg != null && nowAvg <= best.avg + Math.max(0.5, Math.abs(best.avg) * 0.05));
    const st = S.q[best.s].t, en = new Date(+st + d.h * H_MS);
    let sub;
    if (go) sub = `${d.h} óra futás, most van a legolcsóbb sáv`;
    else if (nowAvg != null && nowAvg > 5) sub = `${d.h} óra futás, ${Math.round((1 - best.avg / nowAvg) * 100)}%-kal olcsóbb, mint most`;
    else if (nowAvg != null) sub = `${d.h} óra futás, ${fmt1(nowAvg - best.avg)} Ft/kWh-val olcsóbb, mint most`;
    else sub = `${d.h} óra futás`;
    const when = go
      ? `<b>Most</b><span>${hhmm(S.q[i].t)}–${hhmm(new Date(+S.q[i].t + d.h * H_MS))}</span>`
      : `<b>${hhmm(st)}</b><span>${dayWord(st)}, ${hhmm(en)}-ig</span>`;
    return `<li class="dev${go ? ' go' : ''}"><span class="dev-ic">${icon(d.icon)}</span><div><div class="dev-name">${d.name}</div><div class="dev-sub">${sub}</div></div><div class="dev-when">${when}</div></li>`;
  }).join('');
}

// ── ÁRAK: napi grafikon ──────────────────────────────────────────────────
function renderDay() {
  const tomorrow = dayQ(1);
  const segBtns = document.querySelectorAll('[data-day]');
  const hasTomorrow = tomorrow.length >= 90;
  segBtns.forEach(b => {
    const d = +b.dataset.day;
    b.setAttribute('aria-pressed', String(d === S.day));
    if (d === 1) { b.disabled = !hasTomorrow; b.title = hasTomorrow ? '' : 'A holnapi árak délután 1 óra körül jelennek meg'; }
  });
  if (S.day === 1 && !hasTomorrow) S.day = 0;

  const list = dayQ(S.day);
  const box = $('dayChart');
  if (!list.length) {
    box.innerHTML = `<svg viewBox="0 0 300 190"><text class="empty" x="150" y="95" text-anchor="middle">Nincs adat erre a napra</text></svg>`;
    $('readout').innerHTML = ''; $('dayStats').innerHTML = '';
    return;
  }
  const th = thresholds(list);
  const W = Math.max(280, box.clientWidth || 600), H = box.clientHeight || 190;
  const padL = 34, padR = 6, padT = 8, padB = 22;
  const cw = W - padL - padR, ch = H - padT - padB;
  const vals = list.map(x => x.p);
  const lo = Math.min(0, ...vals), hi = Math.max(...vals) * 1.05 || 1;
  const y = v => padT + ch - (v - lo) / (hi - lo) * ch;
  const slot = cw / 96; // mindig 96 hely, hogy a tengely egységes legyen
  const t0 = +dayStart(S.day);
  const xOf = t => padL + ((+t - t0) / Q_MS) * slot;

  const step = niceStep(hi - lo);
  let g = '';
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) {
    g += `<line class="grid" x1="${padL}" x2="${W - padR}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${padL - 6}" y="${y(v) + 4}" text-anchor="end">${fmt(v)}</text>`;
  }
  for (let h = 0; h <= 24; h += 6) {
    const x = padL + h * 4 * slot;
    g += `<text class="ax" x="${x}" y="${H - 5}" text-anchor="${h === 0 ? 'start' : h === 24 ? 'end' : 'middle'}">${pad2(h % 24 === 0 && h ? 24 : h)}:00</text>`;
  }
  const now = Date.now();
  const bw = Math.max(1, slot - (slot > 4 ? 1.2 : 0.4));
  const bars = list.map(q => {
    const lv = level(q.p, th);
    const top = Math.min(y(q.p), y(0)), hgt = Math.max(1, Math.abs(y(q.p) - y(0)));
    const past = S.day === 0 && +q.t + Q_MS <= now ? ' past' : '';
    return `<rect class="b-${lv}${past}" x="${xOf(q.t).toFixed(2)}" y="${top.toFixed(2)}" width="${bw.toFixed(2)}" height="${hgt.toFixed(2)}" rx="${Math.min(2, bw / 3)}"/>`;
  }).join('');
  let marks = '';
  if (S.day === 0 && now >= t0 && now < t0 + 864e5) {
    const x = padL + ((now - t0) / Q_MS) * slot;
    marks += `<line class="nowline" x1="${x}" x2="${x}" y1="${padT}" y2="${padT + ch}"/>`;
  }
  if (S.sel != null && list[S.sel]) {
    const x = xOf(list[S.sel].t) + bw / 2;
    marks += `<line class="selline" x1="${x}" x2="${x}" y1="${padT}" y2="${padT + ch}"/>`;
  }
  box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${g}${bars}${marks}</svg>`;
  box._geom = { padL, slot, t0, list };

  renderReadout(list, th);
  renderDayStats(list);
}
function niceStep(range) {
  const raw = range / 3;
  const pow = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const n = raw / pow;
  return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * pow;
}
function renderReadout(list, th) {
  let q = S.sel != null ? list[S.sel] : null;
  if (!q && S.day === 0) { const i = nowIndex(); if (i >= 0) q = S.q[i]; }
  const names = { cheap: 'olcsó', mid: 'átlagos', dear: 'drága' };
  if (!q) {
    $('readout').innerHTML = `<span>Válassz egy időpontot a grafikonon.</span>`;
    return;
  }
  const lv = level(q.p, th);
  const lead = S.sel == null && S.day === 0 ? 'Most, ' : '';
  $('readout').innerHTML = `<b>${fmt1(q.p)} Ft/kWh</b><span>${lead}${hhmm(q.t)}–${hhmm(new Date(+q.t + Q_MS))}</span><span class="tagc ${lv}">${names[lv]}</span>`;
}
function renderDayStats(list) {
  const mn = list.reduce((a, b) => (b.p < a.p ? b : a));
  const mx = list.reduce((a, b) => (b.p > a.p ? b : a));
  const idx0 = S.q.indexOf(list[0]);
  let best2 = null;
  for (let s = idx0; s + 8 <= idx0 + list.length; s++) {
    const a = windowAvg(s, 2);
    if (a != null && (!best2 || a < best2.a)) best2 = { s, a };
  }
  const b2 = best2 ? `${hhmm(S.q[best2.s].t)}–${hhmm(new Date(+S.q[best2.s].t + 2 * H_MS))}` : 'nincs adat';
  $('dayStats').innerHTML = `
    <div class="stat stat-wide"><div><div class="stat-l">Legolcsóbb 2 óra</div><div class="stat-v">${b2}</div></div><div class="stat-s">${best2 ? `átlag ${fmt1(best2.a)} Ft/kWh` : ''}</div></div>
    <div class="stat"><div class="stat-l">Napi átlag</div><div class="stat-v">${fmt1(avg(list.map(x => x.p)))}</div><div class="stat-s">Ft/kWh</div></div>
    <div class="stat"><div class="stat-l">Legdrágább</div><div class="stat-v">${fmt1(mx.p)}</div><div class="stat-s">${hhmm(mx.t)}-kor</div></div>`;
}
function chartPick(ev) {
  const box = $('dayChart'), g = box._geom;
  if (!g) return;
  const rect = box.getBoundingClientRect();
  const x = (ev.clientX - rect.left) * ((box.clientWidth || rect.width) / rect.width);
  const t = g.t0 + Math.floor((x - g.padL) / g.slot) * Q_MS;
  let best = 0, bd = Infinity;
  g.list.forEach((q, k) => { const d = Math.abs(+q.t - t); if (d < bd) { bd = d; best = k; } });
  if (S.sel !== best) { S.sel = best; renderDay(); }
}

// ── ÁRAK: 30 nap ─────────────────────────────────────────────────────────
function dailyAverages(days) {
  const out = [];
  for (let off = -days; off < 0; off++) {
    const l = dayQ(off);
    if (l.length >= 80) out.push({ d: dayStart(off), a: avg(l.map(x => x.p)) });
  }
  return out;
}
function renderTrend() {
  const box = $('trendChart');
  const pts = dailyAverages(30);
  if (pts.length < 3) { box.innerHTML = ''; $('trendNote').textContent = 'Még nincs elég adat.'; return; }
  const W = Math.max(280, box.clientWidth || 600), H = box.clientHeight || 150;
  const padL = 34, padR = 10, padT = 10, padB = 22;
  const cw = W - padL - padR, ch = H - padT - padB;
  const vals = pts.map(p => p.a);
  const lo = Math.min(0, Math.min(...vals) * 0.9), hi = Math.max(...vals) * 1.08;
  const x = k => padL + k / (pts.length - 1) * cw;
  const y = v => padT + ch - (v - lo) / (hi - lo) * ch;
  const step = niceStep(hi - lo);
  let g = '';
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) {
    g += `<line class="grid" x1="${padL}" x2="${W - padR}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${padL - 6}" y="${y(v) + 4}" text-anchor="end">${fmt(v)}</text>`;
  }
  const lbl = k => `${pts[k].d.getMonth() + 1}. ${pts[k].d.getDate()}.`;
  [0, Math.floor((pts.length - 1) / 2), pts.length - 1].forEach((k, n) => {
    g += `<text class="ax" x="${x(k)}" y="${H - 5}" text-anchor="${n === 0 ? 'start' : n === 2 ? 'end' : 'middle'}">${lbl(k)}</text>`;
  });
  const line = pts.map((p, k) => `${k ? 'L' : 'M'}${x(k).toFixed(1)},${y(p.a).toFixed(1)}`).join(' ');
  const area = `${line} L${x(pts.length - 1).toFixed(1)},${y(lo).toFixed(1)} L${x(0).toFixed(1)},${y(lo).toFixed(1)} Z`;
  const last = pts[pts.length - 1];
  box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${g}<path class="trend-area" d="${area}"/><path class="trend-line" d="${line}"/><circle class="trend-dot" cx="${x(pts.length - 1)}" cy="${y(last.a)}" r="4"/></svg>`;
  const mean = avg(vals);
  $('trendNote').textContent = `Tegnap átlagosan ${fmt1(last.a)} Ft/kWh, a 30 napos átlag ${fmt1(mean)} Ft/kWh.`;
}

// ── ÁRAK: hálózat ────────────────────────────────────────────────────────
const MIX = [
  { k: 'nuclear', n: 'Paks', c: '#6C63D9' },
  { k: 'gas', n: 'Gáz', c: '#E0A83C' },
  { k: 'coal', n: 'Szén', c: '#8A7866' },
  { k: 'renew', n: 'Nap, szél, biomassza, víz', c: 'var(--cheap)' },
  { k: 'other', n: 'Egyéb', c: 'var(--mid)' },
];
function renderGrid() {
  const block = $('gridBlock');
  if (!block) return;
  const m = S.mix;
  if (!m) { block.hidden = true; return; }
  block.hidden = false;
  const mx = m.mix || {};
  const pct = k => mx[k]?.share_pct || 0;
  const shares = { nuclear: pct('nuclear'), gas: pct('gas'), coal: pct('lignite') + pct('hard_coal'), renew: m.renewable_share_pct || 0 };
  shares.other = Math.max(0, 100 - shares.nuclear - shares.gas - shares.coal - shares.renew);
  $('mixBar').innerHTML = MIX.map(g => `<div style="width:${shares[g.k]}%;background:${g.c}" title="${g.n}: ${fmt1(shares[g.k])}%"></div>`).join('');
  $('mixLegend').innerHTML = MIX.filter(g => shares[g.k] >= 0.5).map(g =>
    `<span><i class="sw" style="background:${g.c}"></i>${g.n} <b>${fmt(shares[g.k])}%</b></span>`).join('');

  const prod = m.total_mw;
  const net = S.flows?.net_import?.actual?.value;
  const at = m.timestamp ? hhmm(new Date(m.timestamp)) : '';
  let txt = `A hazai erőművek most <b>${fmt(prod)} MW</b>-ot termelnek`;
  if (net != null) {
    txt += net >= 0
      ? `, és <b>${fmt(net)} MW</b>-ot hozunk be külföldről. A fogyasztás <b>${fmt(net / (prod + net) * 100)}%</b>-a import.`
      : `, és <b>${fmt(-net)} MW</b>-ot adunk el külföldre.`;
  } else txt += '.';
  $('gridLine').innerHTML = `${txt} <span class="hint">MAVIR, ${at}-s adat.</span>`;
}

// ── MEGÉRI? ──────────────────────────────────────────────────────────────
function profileWeight(h) { return h < 6 ? 0.5 : h < 9 ? 1.2 : h < 17 ? 0.8 : h < 22 ? 2.0 : 0.9; }

// A háztartás súlyozott tőzsdei átlaga (nettó Ft/kWh, kereskedői díj nélkül) az elmúlt napokon
function weightedHupx(days, shift) {
  let total = 0, n = 0;
  for (let off = -days; off < 0; off++) {
    const l = dayQ(off);
    if (l.length < 80) continue;
    const ws = l.map(q => profileWeight(q.t.getHours()));
    const wsum = ws.reduce((a, b) => a + b, 0);
    const prof = l.reduce((s, q, k) => s + q.p * ws[k], 0) / wsum;
    const cheap = l.map(q => q.p).sort((a, b) => a - b).slice(0, 16);
    total += (1 - shift) * prof + shift * avg(cheap);
    n++;
  }
  return n >= 10 ? { v: total / n, days: n } : null;
}

// Lépcsős díj: keretig az egyik, felette a másik egységár
const tier = (q, cap, lo, hi) => Math.min(q, cap) * lo + Math.max(0, q - cap) * hi;

// Éves modell: havi fogyasztás szezonális szorzóval, a D árszabásnál havi naparányos kerettel.
// A rezsivédett és a vezérelt keret az éves elszámolásban egyenlítődik ki.
function yearModel(c) {
  const annual = c.kwh * 12;
  let dBill = 0, dOver = 0, dOverCost = 0, dMonths = 0, dHupxSum = 0;
  MONTHS.forEach(([prof, cheap], m) => {
    const q = c.kwh * SEASON[m];
    const cap = T.cap * MONTH_DAYS[m] / 365;
    const over = Math.max(0, q - cap);
    const h = (1 - c.shift) * prof + c.shift * cheap;
    dBill += Math.min(q, cap) * T.a1 + over * (h + T.spread + T.grid) * T.vat;
    if (over > 0.5) { dMonths++; dOver += over; dHupxSum += over * h; dOverCost += over * (h + T.spread + T.grid) * T.vat; }
  });
  const nt = annual * c.vshare, rest = annual - nt;
  return {
    unit: 'Ft/év', annual,
    rezsi: tier(annual, T.cap, T.a1, T.a1Over),
    vez: tier(nt, T.cap, T.b, T.bOver) + tier(rest, T.cap, T.a1, T.a1Over) + (c.vshare > 0 ? T.bBase : 0),
    dBill, dOver, dMonths,
    dHupx: dOver ? dHupxSum / dOver : null,
    dUnit: dOver ? dOverCost / dOver : null,
    basis: 'a 2025. szeptember és 2026. augusztus közötti tőzsdei árakon, hónaponként',
  };
}

// Havi modell: egy átlagos hónap az elmúlt 30 nap áraival, naparányos kerettel, évesítés nélkül
function monthModel(c) {
  const w = weightedHupx(30, c.shift);
  if (!w) return null;
  const q = c.kwh, cap = T.cap * 30 / 365;
  const over = Math.max(0, q - cap);
  const dUnit = (w.v + T.spread + T.grid) * T.vat;
  const nt = q * c.vshare, rest = q - nt;
  return {
    unit: 'Ft/hó', annual: q * 12,
    rezsi: tier(q, cap, T.a1, T.a1Over),
    vez: tier(nt, cap, T.b, T.bOver) + tier(rest, cap, T.a1, T.a1Over) + (c.vshare > 0 ? T.bBase / 12 : 0),
    dBill: tier(q, cap, T.a1, dUnit),
    dOver: over, dMonths: over > 0.5 ? 1 : 0,
    dHupx: w.v, dUnit: over ? dUnit : null,
    basis: `az elmúlt ${w.days} nap tőzsdei árain, 30 napos hónapra`,
  };
}

function fxNote() {
  const f = S.fx;
  if (!f || f.status === 'ecb') return '';
  return f.status === 'cached'
    ? `Az árfolyam most nem frissült, a legutóbbi ismert EKB-értékkel (${fmt1(f.rate)} Ft/EUR) számolunk.`
    : `Az árfolyamot most nem sikerült lekérni, becsült ${fmt(f.rate)} Ft/EUR értékkel számolunk. A forintos árak pontatlanok lehetnek.`;
}

function renderCalc() {
  const c = S.calc;
  $('kwh').value = c.kwh;
  $('kwhOut').textContent = fmt(c.kwh);
  document.querySelectorAll('[data-shift]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.shift === c.shift)));
  document.querySelectorAll('[data-vshare]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.vshare === c.vshare)));
  document.querySelectorAll('[data-period]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.period === c.period)));

  const annual = c.kwh * 12;
  const monthCap = T.cap * 30 / 365;
  $('kwhHint').textContent = `Évi kb. ${fmt(annual)} kWh. A kedvezményes keret évi 2 523 kWh, a D árszabásnál havonta, naparányosan kb. ${fmt(monthCap)} kWh.`;

  let r = c.period === '30' ? monthModel(c) : null;
  const fallback = c.period === '30' && !r;
  if (!r) r = yearModel(c);
  const yearly = r.unit === 'Ft/év';

  const pctTxt = `${Math.round(c.shift * 100)}%`;
  const rows = [
    { k: 'rezsi', n: 'Rezsivédett', v: r.rezsi, note: 'fix ár, napszaktól független' },
    { k: 'vez', n: 'Vezérelt mérővel', v: r.vez, note: c.vshare > 0 ? `ha a fogyasztás ${Math.round(c.vshare * 100)}%-a külön vezérelt körre kerül, a mérő alapdíjával` : 'külön vezérelt kör nélkül nincs különbség' },
    { k: 'd', n: 'D árszabás, 2027-től', v: r.dBill, note: r.dOver > 0 ? `a keret felett átlagosan ${fmt1(r.dUnit)} Ft/kWh (a fix ár 70,1)` : 'a havi kereten belül a fix árral azonos' },
  ];
  const minV = Math.min(...rows.map(x => x.v)), maxV = Math.max(...rows.map(x => x.v));
  const tol = yearly ? 500 : 50;
  const best = rows.find(x => x.v === minV);
  $('bills').innerHTML = rows.map(x => {
    const isBest = x === best && maxV - minV >= tol;
    return `<div class="bill${isBest ? ' is-best' : ''}">
      <div class="bill-n">${x.n}${isBest ? '<span class="best">Legolcsóbb</span>' : ''}</div>
      <div class="bill-v">${fmt(x.v)} ${r.unit}</div>
      <div class="bill-bar"><i style="width:${(x.v / maxV * 100).toFixed(1)}%"></i></div>
      <div class="bill-note">${x.note}</div>
    </div>`;
  }).join('');

  // Döntés, egyszerű szavakkal
  const per = yearly ? 'évi' : 'havi';
  const kb = n => (yearly ? fmtK(n) : fmt(Math.round(n / 10) * 10));
  const dDiff = r.dBill - r.rezsi, vDiff = r.rezsi - r.vez;
  const vezTxt = c.vshare > 0 && vDiff >= tol ? ` Vezérelt mérővel ${per} kb. ${kb(vDiff)} Ft-tal kevesebbet fizetnél. A vezérelt mérő és a D árszabás az MVM feltételei szerint együtt nem választható.` : '';
  let cls = 'neutral', html;
  if (r.dOver <= 0.5) {
    html = yearly
      ? `<strong>Nálad a D árszabás nem változtat semmin.</strong> Egyik hónapban sem lépsz a havi keret fölé, a teljes fogyasztásod fix áron megy.`
      : `<strong>Ebben a hónapban a D árszabás nem változtatna semmin.</strong> ${fmt(c.kwh)} kWh a havi kb. ${fmt(monthCap)} kWh-s kereten belül van.`;
  } else if (dDiff < -tol) {
    cls = '';
    html = `<strong>A D árszabás ${per} kb. ${kb(-dDiff)} Ft-tal olcsóbb lehet</strong> a rezsivédettnél, ha a fogyasztásod ${pctTxt}-át tényleg olcsó órákra teszed. A tőzsdei ár és az árfolyam változik, a különbség hónapról hónapra más.`;
  } else {
    cls = 'warn';
    const lead = c.shift === 0 ? 'Időzítés nélkül a D árszabás' : 'A D árszabás így is';
    html = `<strong>${lead} ${per} kb. ${kb(Math.max(0, dDiff))} Ft-tal drágább lenne</strong> a rezsivédettnél. `;
    if (yearly && annual <= T.cap) html += `Évesen a kereten belül vagy, de a D árszabásnál a keret havonta számít: ${r.dMonths} hónapban, főleg télen, összesen kb. ${fmt(r.dOver)} kWh megy fölé. `;
    html += `A keret feletti fogyasztásod átlagos tőzsdei ára ${fmt1(r.dHupx)} Ft/kWh, a D árszabás 18,1 Ft alatt érné meg.`;
  }
  html += vezTxt;
  const v = $('verdict');
  v.className = `verdict ${cls}`;
  const note = fallback ? 'Az elmúlt 30 nap adata most nem elérhető, ezért a 12 havi árakon számoltunk. ' : '';
  v.innerHTML = `${html} <span class="hint">${note}Számítás ${r.basis}. ${fxNote()}</span>`;

  $('howText').innerHTML = `
    <p><b>Rezsivédett:</b> 2 523 kWh/év-ig 36,4 Ft/kWh (elosztónként 35,3 és 36,4 Ft között), felette 70,1 Ft. A keret az éves elszámolásban egyenlítődik ki.</p>
    <p><b>Vezérelt:</b> külön mért, az elosztó által kapcsolt körön 23,0 Ft/kWh a saját 2 523 kWh-s keretéig, felette 60,9 Ft, plusz évi kb. 600 Ft alapdíj. Jellemzően fixen bekötött bojler, hőtárolós kályha vagy hőszivattyú kerül rá. A kiépítés egyszeri költségével nem számolunk.</p>
    <p><b>D árszabás:</b> a keretig ugyanaz a fix ár. A keret havonta, a naptári napokkal arányosan számít (évi 2 523 kWh 1/365 része naponta). Hogy az év végén van-e kiegyenlítés, az MVM feltételeiből nem derül ki egyértelműen, ezért a szigorúbb esettel számolunk: a nyáron ki nem használt keret nem segít télen. A keret feletti részre havonta egy egységár jár: a teljes havi fogyasztásod negyedórás tőzsdei árakkal súlyozott átlaga, plusz 13,70 Ft kereskedői díj és 23,40 Ft hálózati díj, 27% áfával. Akkor olcsóbb a fix árnál, ha a súlyozott tőzsdei átlag 18,1 Ft/kWh alatt van.</p>
    <p><b>Feltevések:</b> télen több, nyáron kevesebb fogyasztás (január és július aránya 1,57); esti csúcsú háztartási profil; az időzített rész a nap legolcsóbb 4 órájába kerül. A tényleges eltolás ennél kisebb szokott lenni, mert a gépek egyben futnak. A profil súlyai nem hivatalosak, egyenletes fogyasztással a D évente kb. 10 000 Ft-tal kedvezőbbnek látszana 4 000 kWh mellett.</p>
    <ul>
      <li>Okosmérő kell hozzá. 4 000 kWh/év felett az elosztó kötelezően lecseréli a mérőt, egyébként felhasználónként egy helyre egyszer ingyen kérhető, a felszerelés akár egy évig is tarthat. Más távleolvasható mérővel a hálózati díj évente több százezer forinttal magasabb lehet, erre a számítás nem vonatkozik.</li>
      <li>Az MVM feltételei szerint vezérelt (B) vagy H mérő mellett nem választható. A2 (kétzónás) tarifáról előbb A1-re kell váltani.</li>
      <li>2026. szeptember 1-jétől igényelhető, legkorábban 2027. január 1-jétől él.</li>
      <li>Ha az első 12 hónapban visszalépsz, utána 12 hónapig nem kérheted újra. Ez nem vonatkozik arra, aki áremelés miatt lép vissza.</li>
      <li>A kereskedői díjat az MVM 60 nappal előre hirdetményben módosíthatja. Ilyenkor felmondhatsz, vagy visszatérhetsz a fix árra. Az ár euróban képződik, az árfolyam is hat rá.</li>
    </ul>
    <p>Forrás: <a href="https://www.mvmnext.hu/aram/pages/aloldal.jsp?id=16455187" target="_blank" rel="noopener">az MVM Next D árszabása</a>. Becslés, nem ajánlat.</p>`;
}

// ── Események ────────────────────────────────────────────────────────────
function bind() {
  document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => setView(b.dataset.tab)));
  window.addEventListener('popstate', () => setView(location.hash.slice(1) || 'most', false));

  // Nappali és éjszakai mód: alapból a rendszer beállítása, a gomb felülírja
  const isDark = () => (document.documentElement.dataset.theme
    || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark';
  const syncTheme = () => {
    $('themeBtn').setAttribute('aria-label', isDark() ? 'Váltás nappali módra' : 'Váltás éjszakai módra');
    document.querySelector('meta[name="theme-color"]').content = isDark() ? '#0A121C' : '#F3F5F8';
  };
  $('themeBtn').addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    savePref('ei.theme', next);
    syncTheme();
  });
  syncTheme();

  $('devEditBtn').addEventListener('click', () => {
    const box = $('devEdit'), open = box.hidden;
    box.hidden = !open;
    $('devEditBtn').setAttribute('aria-expanded', String(open));
    $('devEditBtn').textContent = open ? 'Kész' : 'Gépek';
  });
  $('devChips').addEventListener('click', e => {
    const b = e.target.closest('[data-dev]');
    if (!b) return;
    const id = b.dataset.dev;
    S.devices = S.devices.includes(id) ? S.devices.filter(x => x !== id) : [...S.devices, id];
    savePref('ei.devices', S.devices);
    renderDevices();
  });

  document.querySelectorAll('[data-day]').forEach(b => b.addEventListener('click', () => {
    if (b.disabled) return;
    S.day = +b.dataset.day; S.sel = null; renderDay();
  }));
  const chart = $('dayChart');
  chart.addEventListener('pointerdown', e => { chart.setPointerCapture?.(e.pointerId); chartPick(e); });
  chart.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' || e.buttons) chartPick(e); });
  chart.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { S.sel = null; renderDay(); } });
  chart.addEventListener('keydown', e => {
    const n = dayQ(S.day).length;
    if (!n) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const base = S.sel ?? (S.day === 0 ? Math.max(0, dayQ(0).indexOf(S.q[nowIndex()])) : 0);
      S.sel = Math.min(n - 1, Math.max(0, base + (e.key === 'ArrowRight' ? 1 : -1)));
      renderDay();
    }
    if (e.key === 'Escape') { S.sel = null; renderDay(); }
  });

  $('kwh').addEventListener('input', e => { S.calc.kwh = +e.target.value; savePref('ei.kwh', S.calc.kwh); renderCalc(); });
  document.querySelectorAll('[data-shift]').forEach(b => b.addEventListener('click', () => {
    S.calc.shift = +b.dataset.shift; savePref('ei.shift', S.calc.shift); renderCalc();
  }));
  document.querySelectorAll('[data-vshare]').forEach(b => b.addEventListener('click', () => {
    S.calc.vshare = +b.dataset.vshare; savePref('ei.vshare', S.calc.vshare); renderCalc();
  }));
  document.querySelectorAll('[data-period]').forEach(b => b.addEventListener('click', () => {
    S.calc.period = b.dataset.period; renderCalc();
  }));

  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (S.view === 'arak') { renderDay(); renderTrend(); } }, 120); });
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && (!S.loadedAt || Date.now() - S.loadedAt > 5 * 60 * 1000)) {
      await loadPrices(); renderView();
    }
  });
}

// ── Indulás ──────────────────────────────────────────────────────────────
async function init() {
  // A korábbi verzió service workerét eltávolítjuk
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister())).catch(() => {});
  }
  bind();
  setView(location.hash.slice(1) || 'most', false);
  await loadPrices();
  renderView();
  loadGrid();

  setInterval(renderView, 60 * 1000);                                   // aktuális negyedóra
  setInterval(async () => { await loadPrices(); renderView(); }, 10 * 60 * 1000);
  setInterval(loadGrid, 15 * 60 * 1000);
}
document.addEventListener('DOMContentLoaded', init);
