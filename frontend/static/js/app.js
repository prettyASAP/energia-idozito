'use strict';

// ── Device definitions (IDs match design exactly) ──────────────────────
const MAIN_DEV = [
  { id: 'mosogep',     name: 'Mosógép',     kwh: 1.0, dur: 2, annual: 6000,
    icon: 'M5 3h14v18H5z M8 6h.01 M11 6h.01 M12 14m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0' },
  { id: 'mosogatogep', name: 'Mosogatógép', kwh: 1.2, dur: 2, annual: 5000,
    icon: 'M5 3h14v18H5z M5 8h14 M12 15m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0' },
  { id: 'bojler',      name: 'Bojler',       kwh: 8,   dur: 3, annual: 18000,
    icon: 'M7 2h10a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2H7a2 2 0 0 1 -2 -2V4a2 2 0 0 1 2 -2z M9 20v2 M15 20v2 M9 9c1 -1 2 -1 3 0s2 1 3 0' },
  { id: 'klima',       name: 'Klíma',        kwh: 2.5, dur: 4, annual: 9000,
    icon: 'M3 5h18v6H3z M6 8h.01 M17 8h.01 M7 14c0 2 -1 2 -1 4 M12 14c0 2 -1 2 -1 4 M17 14c0 2 -1 2 -1 4' },
  { id: 'ev',          name: 'EV töltő',     kwh: 11,  dur: 4, annual: 30000,
    icon: 'M13 2 3 14h7l-1 8 10 -12h-7l1 -8' },
  { id: 'szarito',     name: 'Szárítógép',   kwh: 2.5, dur: 2, annual: 7000,
    icon: 'M5 3h14v18H5z M12 13m-5 0a5 5 0 1 0 10 0a5 5 0 1 0 -10 0 M12 13m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0' },
];

const EXTRA_DEV = [
  { id: 'hoszivattyu', name: 'Hőszivattyú', annual: 15000,
    icon: 'M12 3v18 M5 8l7 -5 7 5 M8 21v-6h8v6' },
  { id: 'napelemek',   name: 'Napelem',      annual: 12000,
    icon: 'M4 6h16l2 9H2z M12 15v6 M8 21h8 M8 9h.01 M12 9h.01 M16 9h.01' },
];

const ALL_DEV = [...MAIN_DEV, ...EXTRA_DEV];

// ── State ──────────────────────────────────────────────────────────────
const S = {
  tab: 'ma',
  planTab: 'klima',
  prices: [],
  selHour: null,
  // Onboarding
  obsStep: 0,
  obsDevices: ['mosogep', 'bojler', 'klima'],
  obsTariff: 'rezsi',
  obsFlex: 'magas',
  obsDone: false,
  // Advisor
  advStep: 1,
  adv: {
    homeType: 'haz', homeSize: 'medium', heating: 'gaz',
    devices: ['mosogep', 'klima'], bill: 15000, tariff: 'rezsi',
    budget: 100000, priority: 'megtakaritas'
  },
  savedAmt: 0,
};

// ── Helpers ────────────────────────────────────────────────────────────
const el = id => document.getElementById(id);
const fmt = n => Math.round(n).toLocaleString('hu-HU');
const fmt1 = n => n.toFixed(1).replace('.', ',');

function svgIcon(path, size = 19) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>`;
}

// Price level using sorted indices (design: sorted[7] and sorted[16])
function level(p, sorted24) {
  return p <= sorted24[7] ? 'olcso' : p >= sorted24[16] ? 'draga' : 'atlagos';
}

function sortedArr(arr) {
  return [...arr].sort((a, b) => a - b);
}

// Extract 48-element array from S.prices: [0..23]=today, [24..47]=tomorrow
function getPrArr() {
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const pr = [];
  for (let i = 0; i < 48; i++) {
    const slot = new Date(dayStart.getTime() + i * 3600000);
    const found = S.prices.find(p => {
      const pd = new Date(p.timestamp);
      return pd.getFullYear() === slot.getFullYear() &&
             pd.getMonth() === slot.getMonth() &&
             pd.getDate() === slot.getDate() &&
             pd.getHours() === slot.getHours();
    });
    pr.push(found ? found.price_huf_kwh : null);
  }
  return pr;
}

// Index-based best window (from design: slides from `from` over 24h)
function bestWindow(pr, from, dur) {
  let best = from, bestAvg = 1e9;
  const limit = Math.min(from + 24 - dur + 1, pr.length - dur + 1);
  for (let s = from; s < limit; s++) {
    const slice = pr.slice(s, s + dur);
    if (slice.some(x => x == null)) continue;
    const avg = slice.reduce((a, b) => a + b, 0) / dur;
    if (avg < bestAvg) { bestAvg = avg; best = s; }
  }
  return { start: best, avg: bestAvg < 1e9 ? bestAvg : (pr[from] || 30) };
}

// Best window excluding 00:00–05:59 (realistic daytime hours)
function bestWindowDay(pr, from, dur) {
  let best = null, bestAvg = 1e9;
  const limit = Math.min(from + 24 - dur + 1, pr.length - dur + 1);
  for (let s = from; s < limit; s++) {
    const h = s % 24;
    if (h < 6 || h >= 22) continue; // only 06:00–21:00 starts
    const slice = pr.slice(s, s + dur);
    if (slice.some(x => x == null)) continue;
    const avg = slice.reduce((a, b) => a + b, 0) / dur;
    if (avg < bestAvg) { bestAvg = avg; best = s; }
  }
  if (best === null) return null;
  return { start: best, avg: bestAvg };
}

function tariffMult(t) { return t === 'htnt' ? 1.0 : t === 'piaci' ? 1.3 : 0.45; }
function flexMult(f) { return f === 'kozepes' ? 0.7 : f === 'alacsony' ? 0.4 : 1.0; }

function countUp(elem, target, ms = 900) {
  const start = performance.now();
  function step(now) {
    const t = Math.min(1, (now - start) / ms);
    const e = 1 - Math.pow(1 - t, 3);
    elem.textContent = fmt(Math.round(target * e));
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ── Tab switching ──────────────────────────────────────────────────────
function setTab(tab) {
  ['ma', 'arak', 'sporolas', 'tervek'].forEach(t => {
    el(`tab-${t}`).classList.toggle('active', t === tab);
    el(`tbtn-${t}`).classList.toggle('active', t === tab);
  });
  S.tab = tab;
  if (tab === 'arak' && S.prices.length) { renderHeatmap(); renderBarChart(); }
  if (tab === 'sporolas') { updateKpi(S.savedAmt); updateHtnt(); }
  if (tab === 'tervek') renderPlan();
}

// ── Hero ───────────────────────────────────────────────────────────────
function renderHero() {
  const pr = getPrArr();
  const nowH = new Date().getHours();
  const todayRaw = pr.slice(0, 24);
  const todayFilled = todayRaw.map(x => x ?? 30);
  const sorted = sortedArr(todayFilled);
  while (sorted.length < 24) sorted.push(sorted[sorted.length - 1]);

  const cur = todayFilled[nowH];
  const prev = todayFilled[(nowH - 1 + 24) % 24];
  const lvl = level(cur, sorted);
  const avg24 = todayFilled.reduce((a, b) => a + b, 0) / 24;

  // Status pill
  const statusMap = {
    olcso:   ['Most olcsó', 'var(--good-500)', '#fff'],
    atlagos: ['Átlagos ár', '#d6ebff', '#2c455d'],
    draga:   ['Most drága', 'var(--bad-500)', '#fff'],
  };
  const [statusLabel, statusBg, statusFg] = statusMap[lvl];
  const pillEl = el('heroStatusPill');
  pillEl.textContent = statusLabel;
  pillEl.style.background = statusBg;
  pillEl.style.color = statusFg;
  pillEl.style.border = 'none';

  // Price count-up
  const priceEl = el('heroPrice');
  const priceColor = lvl === 'olcso' ? 'var(--good-300)' : lvl === 'draga' ? 'var(--bad-300)' : '#d6ebff';
  priceEl.style.color = priceColor;
  const startT = performance.now();
  (function animPrice(now) {
    const t = Math.min(1, (now - startT) / 900);
    const e = 1 - Math.pow(1 - t, 3);
    priceEl.textContent = fmt1(cur * e);
    if (t < 1) requestAnimationFrame(animPrice);
  })(performance.now());

  // Trend
  const deltaPct = ((cur - prev) / prev) * 100;
  const trendEl = el('heroTrend');
  trendEl.textContent = `${deltaPct >= 0 ? '▲' : '▼'} ${deltaPct >= 0 ? '+' : '−'}${Math.abs(deltaPct).toFixed(1).replace('.', ',')}%`;
  trendEl.style.color = deltaPct >= 0 ? 'var(--good-300)' : 'var(--bad-300)';

  // Sub
  let nextCheap = 0;
  for (let h = nowH + 1; h < 48; h++) {
    const p = pr[h];
    if (p != null && p < cur * 0.85) { nextCheap = h - nowH; break; }
  }
  el('heroSub').textContent = lvl === 'olcso'
    ? 'A mai nap egyik legolcsóbb órájában vagyunk. Mosógép, bojler, EV töltés — most éri meg.'
    : nextCheap
    ? `Kb. ${nextCheap} óra múlva jön jelentősen olcsóbb sáv. Addig az alábbi ajánlásokat kövesd.`
    : 'Az aktuális piaci ár alapján megmondjuk, mikor érdemes bekapcsolni.';

  renderDeviceGrid(pr, sorted, nowH, avg24);
}

// ── Device grid ────────────────────────────────────────────────────────
function renderDeviceGrid(pr, sorted, nowH, avg24) {
  const grid = el('deviceGrid');
  if (!grid) return;

  grid.innerHTML = MAIN_DEV.map((d, i) => {
    const w = bestWindow(pr, nowH, d.dur);
    const wDay = bestWindowDay(pr, nowH, d.dur);
    const nowOk = level(pr[nowH] ?? 30, sorted) === 'olcso' || w.start === nowH;
    const savePerRun = Math.max(0, (avg24 - w.avg) * d.kwh);
    const winStr = `${String(w.start % 24).padStart(2, '0')}:00–${String((w.start + d.dur) % 24).padStart(2, '0')}:00`;
    const waitH = w.start - nowH;
    const tag = nowOk ? 'Indítsd most' : `Várj ${waitH} ó`;
    const tagBg = nowOk ? 'var(--good-500)' : 'var(--color-accent-200)';
    const tagFg = nowOk ? '#fff' : 'var(--color-accent-800)';
    const cardStyle = nowOk ? 'background:var(--good-100);border-color:oklch(0.62 0.13 155)' : '';
    const iconBg = nowOk ? 'var(--good-500)' : 'var(--color-accent-500)';

    const showDay = wDay && wDay.start !== w.start;
    const dayStr = wDay ? `${String(wDay.start % 24).padStart(2, '0')}:00–${String((wDay.start + d.dur) % 24).padStart(2, '0')}:00` : null;

    return `<div class="device-card" style="${cardStyle};animation-delay:${i * 60}ms">
      <div class="device-card-top">
        <div class="device-icon" style="background:${iconBg};color:#fff">${svgIcon(d.icon)}</div>
        <span class="tag" style="font-size:9.5px;background:${tagBg};color:${tagFg};border:none;letter-spacing:.05em;text-transform:uppercase;font-family:var(--font-heading);white-space:nowrap;padding:2px 7px">${tag}</span>
      </div>
      <div class="device-name">${d.name}</div>
      <div class="device-window">
        <span class="text-muted">Legjobb ablak</span>
        <strong>${winStr}</strong>
      </div>
      ${showDay ? `<div class="device-window" style="opacity:0.65;margin-top:3px">
        <span class="text-muted">Napközben</span>
        <strong>${dayStr}</strong>
      </div>` : ''}
      <div class="device-save">~${fmt(savePerRun)} Ft / futtatás · ${fmt(d.annual)} Ft / év</div>
    </div>`;
  }).join('');
}

// ── Heatmap ────────────────────────────────────────────────────────────
function renderHeatmap() {
  const grid = el('heatmapGrid');
  if (!grid) return;

  const pr = getPrArr();
  const nowH = new Date().getHours();
  const today = pr.slice(0, 24).map(x => x ?? 30);
  const sorted = sortedArr(today);
  while (sorted.length < 24) sorted.push(sorted[sorted.length - 1]);

  const lvlColors = {
    olcso:   ['var(--good-500)', '#fff'],
    atlagos: ['var(--color-accent-200)', 'var(--color-accent-900)'],
    draga:   ['var(--bad-500)', '#fff'],
  };

  grid.innerHTML = today.map((p, h) => {
    const lvl = level(p, sorted);
    const [bg, fg] = lvlColors[lvl];
    const isSel = S.selHour === h;
    const isCur = h === nowH;
    const outline = isSel
      ? 'outline:2px solid var(--color-accent-900);outline-offset:-2px'
      : isCur ? 'outline:2px dashed var(--color-accent-900);outline-offset:-2px' : '';
    return `<div class="hm-cell" style="background:${bg};color:${fg};${outline};animation-delay:${h * 15}ms" onclick="selectHour(${h},${p},'${lvl}')">
      <span class="hm-hour">${h}</span>
      <span class="hm-price">${fmt1(p)}</span>
    </div>`;
  }).join('');

  updateHeatDetail(today, sorted, nowH);
}

function updateHeatDetail(today, sorted, nowH) {
  const lvlNames = { olcso: 'olcsó', atlagos: 'átlagos', draga: 'drága' };
  const detEl = el('heatmapDetail');
  if (!detEl) return;
  if (S.selHour == null) {
    const cur = today[nowH];
    detEl.textContent = `Most (${nowH}:00): ${fmt1(cur)} Ft/kWh · ${lvlNames[level(cur, sorted)]}`;
  } else {
    const p = today[S.selHour];
    detEl.textContent = `${S.selHour}:00–${S.selHour + 1}:00 · ${fmt1(p)} Ft/kWh · ${lvlNames[level(p, sorted)]}`;
  }
}

function selectHour(h, price, lvl) {
  S.selHour = S.selHour === h ? null : h;
  renderHeatmap();
}

// ── Bar chart ──────────────────────────────────────────────────────────
function renderBarChart() {
  const svg = el('barChart');
  if (!svg) return;

  const pr = getPrArr();
  const filled = pr.map(x => x ?? 30);
  const maxP = Math.max(...filled);
  const sorted = sortedArr(filled.slice(0, 24));
  while (sorted.length < 24) sorted.push(sorted[sorted.length - 1]);

  const H = 140;
  svg.setAttribute('viewBox', '0 0 480 170');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '170');

  const lvlFill = {
    olcso:   'var(--good-500)',
    atlagos: 'var(--color-accent-300)',
    draga:   'var(--bad-500)',
  };

  svg.innerHTML = filled.map((p, i) => {
    const h = i % 24;
    const lvl = level(p, sorted);
    const barH = Math.max(2, (p / maxP) * H);
    const x = i * 10;
    const y = 155 - barH;
    const op = i >= 24 ? 0.45 : 1;
    const tick = h % 6 === 0
      ? `<text x="${x}" y="168" font-size="10" fill="var(--color-neutral-600)" font-family="Barlow">${h}h</text>`
      : '';
    return `<rect x="${x}" y="${y}" width="8" height="${barH}" fill="${lvlFill[lvl]}" opacity="${op}" style="transform-box:fill-box;transform-origin:bottom;animation:growBar .5s ease both;animation-delay:${i * 12}ms"/>${tick}`;
  }).join('');
}

// ── KPI (Spórolás) ─────────────────────────────────────────────────────
function updateKpi(amt) {
  S.savedAmt = amt;
  const yearEl = el('kpiYear');
  if (yearEl) countUp(yearEl, amt);

  const ringEl = el('ringCircle');
  const pctEl = el('ringPct');
  if (ringEl) {
    const pct = Math.min(1, amt / 180000);
    ringEl.style.strokeDashoffset = 232 * (1 - pct);
    if (pctEl) pctEl.textContent = Math.round(pct * 100) + '%';
  }

  const monthEl = el('kpiMonth');
  if (monthEl) countUp(monthEl, Math.round(amt / 12));

  const co2El = el('kpiCo2');
  if (co2El) countUp(co2El, Math.round((amt / 46) * 0.25));

  const subEl = el('kpiSubtitle');
  if (subEl) {
    subEl.textContent = S.obsDone
      ? `A megadott ${S.obsDevices.length} eszközöd és tarifád alapján.`
      : 'Tipikus háztartás becslése — pontosítsd a saját eszközeiddel.';
  }
}

// ── HT/NT calculator ───────────────────────────────────────────────────
function updateHtnt() {
  const kwh = parseFloat(el('htntKwh')?.value) || 0;
  const pct = parseFloat(el('htntPct')?.value) || 0;
  const saving = kwh * (pct / 100) * (42 - 26) * 12;
  const resEl = el('htntResult');
  const noteEl = el('htntNote');
  if (resEl) resEl.textContent = `${fmt(saving)} Ft / év`;
  if (noteEl) noteEl.textContent = `havi ${fmt(saving / 12)} Ft — ha a fogyasztás ${pct}%-a éjszakára kerül`;
}

// ── Plan tab ───────────────────────────────────────────────────────────
function setPlanTab(tab) {
  S.planTab = tab;
  el('seg-klima').classList.toggle('active', tab === 'klima');
  el('seg-napelem').classList.toggle('active', tab === 'napelem');
  renderPlan();
}

function renderPlan() {
  const container = el('planContent');
  if (!container) return;

  const pr = getPrArr();
  const nowH = new Date().getHours();
  const today = pr.slice(0, 24).map(x => x ?? 30);
  const sorted = sortedArr(today);
  while (sorted.length < 24) sorted.push(sorted[sorted.length - 1]);

  const isKlima = S.planTab === 'klima';
  const planBlocks = [];
  for (let h = 0; h < 24; h++) {
    const l = level(today[h], sorted);
    let phase, bg;
    if (isKlima) {
      if (l === 'draga')           { phase = 'Hőtartalékon';    bg = 'var(--color-neutral-800)'; }
      else if (h >= 10 && h <= 15) { phase = 'Előhűtés';        bg = 'var(--color-accent-500)'; }
      else if (l === 'olcso')      { phase = 'Futtathatod';      bg = 'var(--color-accent-200)'; }
      else                         { phase = 'Hagyd kikapcsolva'; bg = 'var(--color-neutral-200)'; }
    } else {
      if (h >= 10 && h <= 15)      { phase = 'Napelem csúcs';       bg = 'var(--color-accent-500)'; }
      else if (h >= 8 && h <= 17)  { phase = 'Részleges termelés';  bg = 'var(--color-accent-200)'; }
      else if (l === 'draga')      { phase = 'Kerüld!';             bg = 'var(--bad-500)'; }
      else if (l === 'olcso')      { phase = 'Olcsó hálózat';       bg = 'var(--color-accent-100)'; }
      else                         { phase = 'Semleges';             bg = 'var(--color-neutral-200)'; }
    }
    planBlocks.push({ phase, bg });
  }

  const planRows = [];
  planBlocks.forEach((b, h) => {
    const last = planRows[planRows.length - 1];
    if (last && last.phase === b.phase) last.end = h + 1;
    else planRows.push({ phase: b.phase, bg: b.bg, start: h, end: h + 1 });
  });

  const phaseDescs = {
    'Előhűtés':         'Hűtsd 1–2 fokkal a komfort alá — olcsó a déli áram.',
    'Futtathatod':      'Olcsó sáv — mehet a klíma, ha kell.',
    'Hőtartalékon':     'Kapcsold ki — a lakás hőtartaléka viszi.',
    'Hagyd kikapcsolva':'Nincs teendő — hűvös éjszakai órák.',
    'Napelem csúcs':    'Futtasd a nagy fogyasztókat: mosógép, EV.',
    'Részleges termelés':'Kisebb gépek mehetnek napelemről.',
    'Olcsó hálózat':    'Éjszakai olcsó áram — EV-töltésre ideális.',
    'Kerüld!':          'Drága hálózati áram — halaszd későbbre.',
    'Semleges':         'Nincs teendő.',
  };

  const tip = isKlima
    ? 'Tipp: 11:00–15:00 között hűts 1–2 fokkal a komfort alá, 17:00–21:00 között kapcsold ki — a falak hőtárolása kitart.'
    : 'Tipp: mosógépet, mosogatót 11:00–15:00 közé, EV töltést éjszakára vagy délre időzíts.';

  const rows = planRows.map((r, i) => {
    const isCur = nowH >= r.start && nowH < r.end;
    const timeStr = `${String(r.start).padStart(2, '0')}:00–${String(r.end % 24).padStart(2, '0')}:00`;
    return `<div class="plan-row" style="animation-delay:${i * 50}ms${isCur ? ';background:color-mix(in srgb,var(--color-accent) 6%,transparent);border-radius:8px' : ''}">
      <div class="plan-bar" style="background:${r.bg}"></div>
      <div class="plan-info">
        <div class="plan-phase">${r.phase}</div>
        <div class="plan-desc">${phaseDescs[r.phase] || ''}</div>
      </div>
      <div class="plan-time">${timeStr}</div>
    </div>`;
  }).join('');

  container.innerHTML = `<div class="plan-card">${rows}<p class="plan-tip text-muted">${tip}</p></div>`;
}

// ── Sheet utilities ────────────────────────────────────────────────────
function overlayClose(e, id) {
  if (e.target.id === id) {
    if (id === 'onboardingOverlay') closeOnboarding();
    else closeAdvisor();
  }
}

// ── Onboarding sheet ───────────────────────────────────────────────────
function openOnboarding() {
  S.obsStep = 0;
  S.obsDevices = ['mosogep', 'bojler', 'klima'];
  S.obsTariff = 'rezsi';
  S.obsFlex = 'magas';
  buildObsDeviceGrid();
  buildObsTariffGrid();
  buildObsFlexGrid();
  showObsStep(0);
  el('onboardingOverlay').classList.remove('hidden');
}

function closeOnboarding() {
  el('onboardingOverlay').classList.add('hidden');
}

function obsNext(currentStep) {
  if (currentStep === 1) {
    const amt = calcOnboardingSavings();
    S.savedAmt = amt;
    el('obsResultAmt').textContent = fmt(amt);
    const descs = {
      rezsi: 'Rezsivédett tarifán az egységár miatt kisebb a mozgástér — de a HT/NT váltás így is sokat hozhat.',
      htnt:  'A HT/NT méréseddel az éjszakai időzítés közvetlenül a számládon jelentkezik.',
      piaci: 'Piaci tarifán az órás árkülönbség teljes egészében a te megtakarításod.',
    };
    el('obsResultDesc').textContent = descs[S.obsTariff] || '';
    updateKpi(amt);
  }
  showObsStep(currentStep + 1);
}

function obsBack(currentStep) { showObsStep(currentStep - 1); }

function showObsStep(step) {
  [0, 1, 2].forEach(s => el(`obs${s + 1}`).style.display = s === step ? '' : 'none');
  S.obsStep = step;
}

function obsDone() {
  S.obsDone = true;
  closeOnboarding();
  setTab('ma');
}

function calcOnboardingSavings() {
  return Math.round(
    S.obsDevices.reduce((sum, id) => {
      const d = ALL_DEV.find(d => d.id === id);
      return sum + (d ? d.annual : 0);
    }, 0) * tariffMult(S.obsTariff) * flexMult(S.obsFlex)
  );
}

function buildObsDeviceGrid() {
  const grid = el('obsDeviceGrid');
  grid.innerHTML = ALL_DEV.map(d => {
    const sel = S.obsDevices.includes(d.id);
    return `<button class="chip-btn ${sel ? 'sel' : ''}" onclick="toggleObs('${d.id}')" style="display:flex;align-items:center;gap:8px">
      ${svgIcon(d.icon, 17)}
      <span>${d.name}</span>
    </button>`;
  }).join('');
}

function buildObsTariffGrid() {
  const opts = [
    { id: 'rezsi', label: 'Rezsivédett (egységár)' },
    { id: 'htnt',  label: 'Kétmérős HT/NT' },
    { id: 'piaci', label: 'Piaci (tőzsdei)' },
  ];
  el('obsTariffGrid').innerHTML = opts.map(o => {
    const sel = S.obsTariff === o.id;
    return `<button class="chip-btn ${sel ? 'sel' : ''}" onclick="setObsTariff('${o.id}')">${o.label}</button>`;
  }).join('');
}

function buildObsFlexGrid() {
  const opts = [
    { id: 'magas',    label: 'Előre tervezem' },
    { id: 'kozepes',  label: 'Néha igen' },
    { id: 'alacsony', label: 'Nehézkes' },
  ];
  el('obsFlexGrid').innerHTML = opts.map(o => {
    const sel = S.obsFlex === o.id;
    return `<button class="chip-btn ${sel ? 'sel' : ''}" onclick="setObsFlex('${o.id}')">${o.label}</button>`;
  }).join('');
}

function toggleObs(id) {
  S.obsDevices = S.obsDevices.includes(id)
    ? S.obsDevices.filter(x => x !== id)
    : [...S.obsDevices, id];
  buildObsDeviceGrid();
}

function setObsTariff(v) { S.obsTariff = v; buildObsTariffGrid(); }
function setObsFlex(v) { S.obsFlex = v; buildObsFlexGrid(); }

// ── Advisor sheet ──────────────────────────────────────────────────────
function openAdvisor() {
  S.advStep = 1;
  S.adv.devices = [];
  buildAdvStep1();
  buildAdvStep2();
  buildAdvStep3Tariff();
  buildAdvStep4();
  showAdvStep(1);
  el('advisorOverlay').classList.remove('hidden');
}

function closeAdvisor() { el('advisorOverlay').classList.add('hidden'); }

function advNext(step) {
  if (step === 4) buildAdvResults();
  showAdvStep(step + 1);
}

function advBack(step) { showAdvStep(step - 1); }

function showAdvStep(step) {
  [1, 2, 3, 4, 5].forEach(s => el(`adv${s}`).style.display = s === step ? '' : 'none');
  S.advStep = step;
  el('advStepLbl').textContent = `${step} / 5`;
  el('advProgFill').style.width = `${step * 20}%`;
}

function buildAdvStep1() {
  const a = S.adv;
  const homes = [
    { id: 'haz',         label: 'Ház' },
    { id: 'lakas_tegla', label: 'Téglaházi lakás' },
    { id: 'lakas_panel', label: 'Panellakás' },
  ];
  el('advHomeGrid').innerHTML = homes.map(o => {
    const sel = a.homeType === o.id;
    return `<button class="chip-btn ${sel ? 'sel' : ''}" onclick="setAdv('homeType','${o.id}')">${o.label}</button>`;
  }).join('');

  const sizes = [
    { id: 'small',  label: '60 m² alatt' },
    { id: 'medium', label: '60–100 m²' },
    { id: 'large',  label: '100–150 m²' },
    { id: 'xlarge', label: '150 m² felett' },
  ];
  el('advAreaGrid').innerHTML = sizes.map(o => {
    const sel = a.homeSize === o.id;
    return `<button class="chip-btn ${sel ? 'sel' : ''}" onclick="setAdv('homeSize','${o.id}')">${o.label}</button>`;
  }).join('');

  const heats = [
    { id: 'gaz',         label: 'Gázkazán' },
    { id: 'hoszivattyu', label: 'Hőszivattyú' },
    { id: 'elektromos',  label: 'Elektromos' },
    { id: 'tavfutes',    label: 'Távfűtés' },
  ];
  el('advHeatGrid').innerHTML = heats.map(o => {
    const sel = a.heating === o.id;
    return `<button class="chip-btn ${sel ? 'sel' : ''}" onclick="setAdv('heating','${o.id}')">${o.label}</button>`;
  }).join('');
}

function buildAdvStep2() {
  const a = S.adv;
  el('advDeviceGrid').innerHTML = ALL_DEV.map(d => {
    const sel = a.devices.includes(d.id);
    return `<button class="chip-btn ${sel ? 'sel' : ''}" onclick="toggleAdv('${d.id}')" style="display:flex;align-items:center;gap:8px">
      ${svgIcon(d.icon, 17)}
      <span>${d.name}</span>
    </button>`;
  }).join('');
}

function buildAdvStep3Tariff() {
  const opts = [
    { id: 'rezsi', label: 'Rezsivédett' },
    { id: 'htnt',  label: 'HT/NT kétmérős' },
    { id: 'piaci', label: 'Piaci / NKTP' },
  ];
  const grid = el('advTariffGrid');
  if (!grid) return;
  grid.innerHTML = opts.map(o => {
    const sel = S.adv.tariff === o.id;
    return `<button class="chip-btn ${sel ? 'sel' : ''}" onclick="setAdv('tariff','${o.id}')">${o.label}</button>`;
  }).join('');
}

function buildAdvStep4() {
  const a = S.adv;
  const budgets = [
    { val: 0,       label: 'Semmit',       sub: 'csak ingyenes lépések' },
    { val: 100000,  label: '~100 ezer Ft', sub: 'kisebb eszközök' },
    { val: 500000,  label: '~500 ezer Ft', sub: 'közepes projekt' },
    { val: 5000000, label: 'Bármennyit',   sub: 'napelem, hőszivattyú' },
  ];
  el('advBudgetGrid').innerHTML = budgets.map(o => {
    const sel = a.budget === o.val;
    return `<button class="chip-btn budget-chip ${sel ? 'sel' : ''}" onclick="setAdv('budget',${o.val})">
      <strong>${o.label}</strong><span class="sub">${o.sub}</span>
    </button>`;
  }).join('');

  const prios = [
    { id: 'megtakaritas', label: 'Minél több spórolás' },
    { id: 'gyors',        label: 'Azonnali eredmény' },
    { id: 'kornyezet',    label: 'Környezetbarát' },
    { id: 'kenyelem',     label: 'Kényelem, automatizálás' },
  ];
  el('advPriorityGrid').innerHTML = prios.map(o => {
    const sel = a.priority === o.id;
    return `<button class="chip-btn ${sel ? 'sel' : ''}" onclick="setAdv('priority','${o.id}')">${o.label}</button>`;
  }).join('');
}

function buildAdvResults() {
  const a = S.adv;
  const has = id => a.devices.includes(id);
  const billMult = Math.min(2.5, Math.max(0.5, a.bill / 15000));
  const devSave = a.devices.reduce((s, id) => {
    const d = ALL_DEV.find(d => d.id === id);
    return s + (d ? d.annual : 0);
  }, 0) * tariffMult(a.tariff) * billMult;

  const cands = [
    { t: 'Eszközök időzítése olcsó órákra',
      d: 'A mosást, bojlert, töltést told az éjszakai és déli olcsó sávokba — ehhez csak ez az app kell.',
      cost: 0, save: Math.max(devSave, 5000), eco: 1, fast: 1 },
    { t: 'HT/NT kétmérős tarifa igénylése',
      d: 'Ingyenesen igényelhető az elosztódtól; az éjszakai sáv 30–40%-kal olcsóbb.',
      cost: 0, save: 45000 * billMult,
      ok: a.tariff !== 'htnt' && (has('bojler') || has('ev') || has('hoszivattyu')), fast: 1 },
    { t: 'Eco programok + teli gép',
      d: 'A mosó- és mosogatógép eco programja futtatásonként 20–40% energiát spórol.',
      cost: 0, save: 8000, ok: has('mosogep') || has('mosogatogep'), eco: 1, fast: 1 },
    { t: 'Okoskonnektorok időzítéssel',
      d: 'Okosdugalj automatikusan a legolcsóbb órában indítja a gépeket.',
      cost: 25000, save: 12000, ok: a.devices.length >= 2, comfort: 1, fast: 1 },
    { t: 'Bojler időzítő beépítése',
      d: 'A bojler csak éjszaka fűtsön — az egyik legnagyobb egyedi tétel.',
      cost: 15000, save: 18000 * billMult, ok: has('bojler') },
    { t: 'Okos termosztát a gázkazánhoz',
      d: 'Ütemezett, helyiségenkénti fűtés — 10–15% megtakarítás.',
      cost: 60000, save: 25000, ok: a.heating === 'gaz', comfort: 1 },
    { t: 'Inverteres klímára csere',
      d: 'Régi klíma cseréje 30–50%-kal kevesebb áramot fogyaszt.',
      cost: 350000, save: 20000, ok: has('klima') },
    { t: 'Napelem rendszer (~4 kWp)',
      d: 'Önfogyasztásra optimalizálva 8–10 év megtérülés, utána évtizedekig termel.',
      cost: 3500000, save: 180000, ok: !has('napelemek') && a.homeType === 'haz', eco: 1 },
    { t: 'Hőszivattyú a gáz kiváltására',
      d: 'Hosszú távon a legnagyobb megtakarítás — és a legzöldebb fűtés.',
      cost: 4500000, save: 250000,
      ok: ['gaz', 'elektromos'].includes(a.heating) && a.homeType === 'haz', eco: 1, comfort: 1 },
  ].filter(c => (c.ok ?? true) && c.cost <= a.budget);

  const p = a.priority;
  cands.sort((x, y) =>
    p === 'megtakaritas' ? y.save - x.save :
    p === 'gyors'        ? (x.cost - y.cost) || ((y.fast || 0) - (x.fast || 0)) :
    p === 'kornyezet'    ? ((y.eco || 0) - (x.eco || 0)) || (y.save - x.save) :
                           ((y.comfort || 0) - (x.comfort || 0)) || (y.save - x.save)
  );
  const recs = cands.slice(0, 5);

  const totalSave = recs.reduce((s, r) => s + r.save, 0);
  el('advSummary').textContent = recs.length
    ? `${recs.length} ajánlás a válaszaid alapján — együtt akár ${fmt(totalSave)} Ft megtakarítás évente.`
    : 'Nincs a szűrőfeltételeidnek megfelelő ajánlás.';

  el('advRecsList').innerHTML = recs.map((r, i) => {
    const costTag = r.cost === 0
      ? 'Ingyenes'
      : r.cost < 1e6
      ? `~${fmt(Math.round(r.cost / 1000))}e Ft`
      : `~${(r.cost / 1e6).toFixed(1).replace('.', ',')} M Ft`;
    return `<div class="rec-card">
      <div class="rec-card-top">
        <strong>${i + 1}. ${r.t}</strong>
        <span class="tag tag-acc" style="white-space:nowrap;font-size:10px">${costTag}</span>
      </div>
      <p class="rec-desc">${r.d}</p>
      <div class="rec-save">~${fmt(Math.round(r.save))} Ft megtakarítás / év</div>
    </div>`;
  }).join('');
}

function setAdv(key, val) {
  S.adv[key] = val;
  if (['homeType', 'homeSize', 'heating'].includes(key)) buildAdvStep1();
  if (key === 'tariff') buildAdvStep3Tariff();
  if (key === 'budget' || key === 'priority') buildAdvStep4();
}

function toggleAdv(id) {
  S.adv.devices = S.adv.devices.includes(id)
    ? S.adv.devices.filter(x => x !== id)
    : [...S.adv.devices, id];
  buildAdvStep2();
}

// ── Data loading ───────────────────────────────────────────────────────
const BASE_H = [20,18,17,16,17,19,26,34,38,34,28,24,22,21,22,26,33,44,55,58,48,36,28,23];

async function loadPrices() {
  try {
    const res = await fetch('/api/forecast?history_days=7&forecast_days=2');
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    S.prices = data.prices || [];
    return S.prices;
  } catch (e) {
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    S.prices = [];
    for (let d = 0; d < 2; d++) {
      for (let h = 0; h < 24; h++) {
        const ts = new Date(dayStart.getTime() + (d * 24 + h) * 3600000);
        let p = BASE_H[h] * (d ? 1.06 : 1);
        p += Math.sin((h + d * 7) * 2.1) * 1.4;
        S.prices.push({
          timestamp: ts.toISOString(),
          price_huf_kwh: Math.max(10, parseFloat(p.toFixed(2))),
          is_forecast: d > 0 || h > now.getHours(),
        });
      }
    }
    return S.prices;
  }
}

// ── Boot ───────────────────────────────────────────────────────────────
async function init() {
  ['htntKwh', 'htntPct'].forEach(id => {
    const inp = el(id);
    if (inp) inp.addEventListener('input', updateHtnt);
  });

  await loadPrices();

  if (S.prices.length) renderHero();

  // Default savings from design's initial onboarding state
  const defaultSave = calcOnboardingSavings();
  updateKpi(defaultSave);
  updateHtnt();
  renderPlan();

  setInterval(async () => {
    await loadPrices();
    if (S.prices.length) renderHero();
    if (S.tab === 'arak') { renderHeatmap(); renderBarChart(); }
    if (S.tab === 'tervek') renderPlan();
  }, 60000);
}

document.addEventListener('DOMContentLoaded', init);
