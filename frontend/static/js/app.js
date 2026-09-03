'use strict';

// ── Device definitions (IDs match design exactly) ──────────────────────
const MAIN_DEV = [
  { id: 'mosogep',     name: 'Mosógép',     kwh: 1.0, dur: 2, annual: 6000,
    icon: 'M5 3h14v18H5z M8 6h.01 M11 6h.01 M12 14m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0' },
  { id: 'mosogatogep', name: 'Mosogatógép', kwh: 1.2, dur: 2, annual: 5000,
    icon: 'M5 3h14v18H5z M5 8h14 M12 15m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0' },
  { id: 'bojler',      name: 'Bojler',       kwh: 6,   dur: 3, annual: 18000,
    icon: 'M7 2h10a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2H7a2 2 0 0 1 -2 -2V4a2 2 0 0 1 2 -2z M9 20v2 M15 20v2 M9 9c1 -1 2 -1 3 0s2 1 3 0' },
  { id: 'klima',       name: 'Klíma',        kwh: 2.5, dur: 4, annual: 9000,
    icon: 'M3 5h18v6H3z M6 8h.01 M17 8h.01 M7 14c0 2 -1 2 -1 4 M12 14c0 2 -1 2 -1 4 M17 14c0 2 -1 2 -1 4' },
  { id: 'ev',          name: 'E-autó töltő',     kwh: 11,  dur: 4, annual: 30000,
    icon: 'M13 2 3 14h7l-1 8 10 -12h-7l1 -8' },
  { id: 'szarito',     name: 'Szárítógép',   kwh: 2.0, dur: 2, annual: 7000,
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
  obsTariff: 'htnt',
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
  // Push notifications
  pushOptIn: false,
  pushLastAlertKey: null,
  // Élő hálózati adatok (MAVIR)
  grid: { mix: null, renewables: null, flows: null, solarForecastByHour: {} },
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

// Extract 72-element array from S.prices: [0..23]=yesterday, [24..47]=today, [48..71]=tomorrow
function getPrArrWithYesterday() {
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const pr = [];
  for (let i = 0; i < 72; i++) {
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

let _freshnessTimer = null;
function startFreshness() {
  const updEl = el('heroUpdated');
  if (!updEl) return;
  if (_freshnessTimer) clearInterval(_freshnessTimer);
  const fetchedAt = Date.now();
  function tick() {
    const mins = Math.floor((Date.now() - fetchedAt) / 60000);
    updEl.textContent = mins === 0 ? 'frissítve most' : `frissítve ${mins} perce`;
  }
  tick();
  _freshnessTimer = setInterval(tick, 60000);
}

function tariffMult(t) { return t === 'htnt' ? 1.0 : t === 'piaci' ? 1.3 : 0.0; }
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

// ── Élő hálózati adatok (MAVIR) ────────────────────────────────────────
async function loadGrid() {
  const get = async ep => {
    try {
      const r = await fetch(`/api/grid/${ep}`);
      if (!r.ok) return null;
      const d = await r.json();
      return d && d.available ? d : null;
    } catch (e) { return null; }
  };
  const [mix, renewables, flows] = await Promise.all([get('mix'), get('renewables'), get('flows')]);
  S.grid.mix = mix;
  S.grid.renewables = renewables;
  S.grid.flows = flows;

  // Óránkénti nap-előrejelzés a zöld órákhoz
  S.grid.solarForecastByHour = {};
  const fc = renewables?.solar?.series?.forecast_current || [];
  fc.forEach(pt => {
    const d = new Date(pt.timestamp);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
    const cur = S.grid.solarForecastByHour[key];
    S.grid.solarForecastByHour[key] = cur == null ? pt.value : Math.max(cur, pt.value);
  });

  renderGridPanel();
  if (S.prices.length) renderHero(); // magyarázat frissítése valós grid adattal
}

const MIX_GROUPS = [
  { key: 'nuclear', label: 'Paks (atom)', color: '#7c6ff0' },
  { key: 'gas',     label: 'Gáz',         color: '#e0a83c' },
  { key: '_renew',  label: 'Megújuló',    color: 'oklch(0.62 0.13 155)' },
  { key: '_other',  label: 'Egyéb',       color: 'var(--color-neutral-300)' },
];

function renderGridPanel() {
  const sec = el('gridPanelSection');
  if (!sec) return;
  const mix = S.grid.mix;
  if (!mix) { sec.style.display = 'none'; return; }
  sec.style.display = '';

  const m = mix.mix || {};
  const nuclearPct = m.nuclear?.share_pct ?? 0;
  const gasPct = m.gas?.share_pct ?? 0;
  const renewPct = mix.renewable_share_pct ?? 0;
  const otherPct = Math.max(0, 100 - nuclearPct - gasPct - renewPct);
  const shares = { nuclear: nuclearPct, gas: gasPct, _renew: renewPct, _other: otherPct };

  el('gridMixBar').innerHTML = MIX_GROUPS.map(g =>
    `<div style="width:${shares[g.key]}%;background:${g.color}" title="${g.label}: ${fmt1(shares[g.key])}%"></div>`
  ).join('');
  el('gridMixLegend').innerHTML = MIX_GROUPS.map(g =>
    `<span style="display:inline-flex;align-items:center;gap:5px">
      <span style="width:9px;height:9px;border-radius:3px;background:${g.color};display:inline-block"></span>
      ${g.label} <strong>${fmt1(shares[g.key])}%</strong>
    </span>`
  ).join('');

  const solarMW = S.grid.renewables?.solar?.latest_actual?.value;
  const windMW = S.grid.renewables?.wind?.latest_actual?.value;
  const netImp = S.grid.flows?.net_import?.actual?.value;
  const stat = (lbl, val, unit, sub) => val == null ? '' :
    `<div style="background:var(--color-neutral-100);border-radius:10px;padding:9px 12px">
      <div style="font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;font-family:var(--font-heading);color:var(--color-neutral-600)">${lbl}</div>
      <div style="font-size:17px;font-weight:600;font-family:var(--font-heading)">${fmt(val)} <span style="font-size:11px;font-weight:400">${unit}</span></div>
      ${sub ? `<div style="font-size:10px;color:var(--color-neutral-600);margin-top:1px">${sub}</div>` : ''}
    </div>`;
  el('gridStats').innerHTML =
    stat('Naptermelés', solarMW, 'MW', 'napelemek most') +
    stat('Széltermelés', windMW, 'MW', 'szélerőművek most') +
    stat(netImp != null && netImp >= 0 ? 'Import' : 'Export', netImp != null ? Math.abs(netImp) : null, 'MW',
      netImp != null && netImp >= 0 ? 'külföldről vesszük' : 'külföldre adjuk') +
    stat('Hazai termelés', mix.total_mw, 'MW', 'összes erőmű együtt');
}

// Zöld óra: a nap-előrejelzés az ablak alatt eléri-e a napi csúcs 60%-át
function isGreenWindow(startIdx, dur) {
  const map = S.grid.solarForecastByHour;
  const vals = Object.values(map);
  if (!vals.length) return false;
  const dayMax = Math.max(...vals);
  if (dayMax <= 0) return false;
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let sum = 0, n = 0;
  for (let i = startIdx; i < startIdx + dur; i++) {
    const slot = new Date(dayStart.getTime() + i * 3600000);
    const key = `${slot.getFullYear()}-${slot.getMonth()}-${slot.getDate()}-${slot.getHours()}`;
    if (map[key] != null) { sum += map[key]; n++; }
  }
  return n > 0 && (sum / n) >= dayMax * 0.6;
}

// ── Tab switching ──────────────────────────────────────────────────────
function setTab(tab) {
  ['ma', 'arak', 'sporolas', 'tervek'].forEach(t => {
    el(`tab-${t}`).classList.toggle('active', t === tab);
    el(`tbtn-${t}`).classList.toggle('active', t === tab);
  });
  S.tab = tab;
  window.scrollTo({ top: 0 });
  if (tab === 'arak' && S.prices.length) { renderHeatmap(); renderBarChart(); renderTrendChart(); }
  if (tab === 'sporolas') { updateKpi(S.savedAmt); updateHtnt(); }
  if (tab === 'tervek') renderPlan();
  // Az animáció csak először fusson le — visszaváltásnál ne villogjon
  const pane = el(`tab-${tab}`);
  setTimeout(() => pane && pane.classList.add('seen'), 700);
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

  maybeNotifyCheapPrice(lvl);

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

  // Avg24
  const avgEl = el('heroAvg');
  if (avgEl) avgEl.textContent = `${fmt1(avg24)} Ft/kWh`;

  // Freshness timestamp (restarts each render)
  startFreshness();

  // Sub
  let nextCheap = 0;
  for (let h = nowH + 1; h < 48; h++) {
    const p = pr[h];
    if (p != null && p < cur * 0.85) { nextCheap = h - nowH; break; }
  }
  el('heroSub').textContent = lvl === 'olcso'
    ? 'A mai nap egyik legolcsóbb órájában vagyunk. Mosógép, bojler, autótöltés — most éri meg.'
    : nextCheap
    ? `Kb. ${nextCheap} óra múlva jön jelentősen olcsóbb sáv. Addig az alábbi ajánlásokat kövesd.`
    : 'Az aktuális piaci ár alapján megmondjuk, mikor érdemes bekapcsolni.';

  // Why explanation — valós árból, nem órából
  const reasonEl = el('heroReason');
  if (reasonEl) {
    const h = nowH;
    const diffPct = Math.round(((cur - avg24) / avg24) * 100);
    const pctStr = `${Math.abs(diffPct)}%-kal ${diffPct >= 0 ? 'a mai átlag felett' : 'a mai átlag alatt'}`;
    let why;
    if (diffPct >= 15) {
      why = h >= 17 && h <= 22
        ? `Esti csúcsfogyasztás, a naptermelés leállt — az ár ${pctStr} van.`
        : `Magas kereslet vagy gyenge naptermelés — az ár ${pctStr} van.`;
    } else if (diffPct <= -15) {
      why = h >= 9 && h <= 16
        ? `A napelemek csúcson termelnek — az ár ${pctStr} van.`
        : `Alacsony kereslet — az ár ${pctStr} van.`;
    } else {
      why = 'Az ár a mai átlag közelében mozog.';
    }
    // Élő hálózati kontextus, ha van
    const solarMW = S.grid.renewables?.solar?.latest_actual?.value;
    const netImp = S.grid.flows?.net_import?.actual?.value;
    if (solarMW != null && netImp != null) {
      why += ` Naptermelés most: ${fmt(solarMW)} MW, ${netImp >= 0 ? 'import' : 'export'}: ${fmt(Math.abs(netImp))} MW.`;
    }
    reasonEl.textContent = why;
  }

  renderDeviceGrid(pr, sorted, nowH, avg24);
}

// ── Device grid ────────────────────────────────────────────────────────
function renderDeviceGrid(pr, sorted, nowH, avg24) {
  const grid = el('deviceGrid');
  if (!grid) return;
  // Újrarendereléskor ne fusson le megint a belépő animáció (percenként villogna)
  const rerender = grid.dataset.rendered === '1';
  grid.dataset.rendered = '1';

  // Összefoglaló: ha a legtöbb gép legjobb ablaka egybeesik, egy sorban a lényeg
  const summaryEl = el('deviceSummary');
  if (summaryEl) {
    const counts = {};
    MAIN_DEV.forEach(d => {
      const w = bestWindow(pr, nowH, d.dur);
      const key = `${w.start}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    const topStart = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
    if (topStart != null && counts[topStart] >= 3) {
      const s = parseInt(topStart);
      const day = s < 24 ? 'ma' : 'holnap';
      const green = isGreenWindow(s, 2) ? ' — olcsó és 🌱 zöld' : '';
      summaryEl.innerHTML = `💡 A legtöbb gépet <strong>${day} ${String(s % 24).padStart(2, '0')}:00 körül</strong> éri meg indítani${green}.`;
      summaryEl.style.display = '';
    } else {
      summaryEl.style.display = 'none';
    }
  }

  grid.innerHTML = MAIN_DEV.map((d, i) => {
    const w = bestWindow(pr, nowH, d.dur);
    const wDay = bestWindowDay(pr, nowH, d.dur);
    const nowOk = level(pr[nowH] ?? 30, sorted) === 'olcso' || w.start === nowH;
    const savePerRun = Math.max(0, (avg24 - w.avg) * d.kwh);
    const winStr = `${String(w.start % 24).padStart(2, '0')}:00–${String((w.start + d.dur) % 24).padStart(2, '0')}:00`;
    const startDay = w.start < 24 ? 'Ma' : 'Holnap';
    const tag = nowOk ? 'Indítsd most' : `${startDay} ${String(w.start % 24).padStart(2, '0')}:00`;
    const tagBg = nowOk ? 'var(--good-500)' : 'var(--color-accent-200)';
    const tagFg = nowOk ? '#fff' : 'var(--color-accent-800)';
    const cardStyle = nowOk ? 'background:var(--good-100);border-color:oklch(0.62 0.13 155)' : '';
    const iconBg = nowOk ? 'var(--good-500)' : 'var(--color-accent-500)';

    const showDay = wDay && wDay.start !== w.start;
    const dayStr = wDay ? `${String(wDay.start % 24).padStart(2, '0')}:00–${String((wDay.start + d.dur) % 24).padStart(2, '0')}:00` : null;
    const greenBest = isGreenWindow(w.start, d.dur);
    const greenDay = showDay && isGreenWindow(wDay.start, d.dur);
    const leaf = `<span title="Zöld óra — magas naptermelés" style="font-size:11px">🌱</span>`;

    return `<div class="device-card" style="${cardStyle};${rerender ? 'animation:none' : `animation-delay:${i * 60}ms`}">
      <div class="device-card-top">
        <div class="device-icon" style="background:${iconBg};color:#fff">${svgIcon(d.icon)}</div>
        <span class="tag" style="font-size:9.5px;background:${tagBg};color:${tagFg};border:none;letter-spacing:.05em;text-transform:uppercase;font-family:var(--font-heading);white-space:nowrap;padding:2px 7px">${tag}</span>
      </div>
      <div class="device-name">${d.name}</div>
      <div class="device-window">
        <span class="text-muted">Legolcsóbb sáv</span>
        <strong>${winStr}${greenBest ? ' ' + leaf : ''}</strong>
      </div>
      ${showDay ? `<div class="device-window" style="opacity:0.65;margin-top:3px">
        <span class="text-muted">Napközben</span>
        <strong>${dayStr}${greenDay ? ' ' + leaf : ''}</strong>
      </div>` : ''}
      <div class="device-save">~${fmt(savePerRun)} Ft alkalmanként (tőzsdei áron) · ${fmt(d.annual)} Ft évente vezérelt/dinamikus tarifán</div>
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

  // [0..23]=yesterday, [24..47]=today, [48..71]=tomorrow
  const pr = getPrArrWithYesterday();
  const filled = pr.map(x => x ?? 30);
  const maxP = Math.max(...filled);
  const todaySorted = sortedArr(filled.slice(24, 48));
  while (todaySorted.length < 24) todaySorted.push(todaySorted[todaySorted.length - 1]);

  const W = 720, H = 140;
  svg.setAttribute('viewBox', `0 0 ${W} 170`);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '170');

  const lvlFill = {
    olcso:   'var(--good-500)',
    atlagos: 'var(--color-accent-300)',
    draga:   'var(--bad-500)',
  };

  const dayLabels = { 0: 'Tegnap', 24: 'Ma', 48: 'Holnap' };

  svg.innerHTML = filled.map((p, i) => {
    const h = i % 24;
    const isYesterday = i < 24;
    const isTomorrow = i >= 48;
    const barH = Math.max(2, (p / maxP) * H);
    const x = i * 10;
    const y = 155 - barH;
    // Yesterday: gray/faded, regardless of price level (context only).
    // Today: full-color, full opacity. Tomorrow: full-color, faded (forecast).
    const fill = isYesterday ? 'var(--color-neutral-600)' : lvlFill[level(p, todaySorted)];
    const op = isYesterday ? 0.4 : isTomorrow ? 0.45 : 1;
    const label = dayLabels[i]
      ? `<text x="${x}" y="10" font-size="10" font-weight="600" fill="var(--color-neutral-600)" font-family="Barlow">${dayLabels[i]}</text>`
      : '';
    const tick = h % 6 === 0
      ? `<text x="${x}" y="168" font-size="10" fill="var(--color-neutral-600)" font-family="Barlow">${h}h</text>`
      : '';
    return `${label}<rect x="${x}" y="${y}" width="8" height="${barH}" fill="${fill}" opacity="${op}" style="transform-box:fill-box;transform-origin:bottom;animation:growBar .5s ease both;animation-delay:${i * 8}ms"/>${tick}`;
  }).join('');
}

// ── 30 napos trend ─────────────────────────────────────────────────────
function renderTrendChart() {
  const svg = el('trendChart');
  if (!svg || !S.prices.length) return;

  // Napi átlagok az elmúlt 30 napra (a mai napot kihagyva, mert csonka lehet)
  const byDay = {};
  // Helyi dátum szerint — a toISOString() UTC-t adna, ami éjfél után a tegnapot is levágná
  const tNow = new Date();
  const todayKey = `${tNow.getFullYear()}-${String(tNow.getMonth() + 1).padStart(2, '0')}-${String(tNow.getDate()).padStart(2, '0')}`;
  S.prices.forEach(p => {
    const d = new Date(p.timestamp);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (key >= todayKey) return;
    (byDay[key] = byDay[key] || []).push(p.price_huf_kwh);
  });
  const days = Object.keys(byDay).sort().slice(-30);
  if (days.length < 2) return;

  const avgs = days.map(k => byDay[k].reduce((a, b) => a + b, 0) / byDay[k].length);
  const maxA = Math.max(...avgs), minA = Math.min(...avgs);
  const range = Math.max(1, maxA - minA);

  const W = 480, H = 110, TOP = 14, BOT = 26;
  const stepX = W / (days.length - 1);
  const pts = avgs.map((a, i) => {
    const x = i * stepX;
    const y = TOP + H - ((a - minA) / range) * H;
    return [x, y];
  });

  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${path} L${pts[pts.length - 1][0].toFixed(1)},${TOP + H + 8} L0,${TOP + H + 8} Z`;

  // Tengelyfeliratok: első, középső, utolsó nap + min/max érték
  const lbl = i => {
    const [y, m, d] = days[i].split('-');
    return `${parseInt(m)}.${parseInt(d)}.`;
  };
  const mid = Math.floor(days.length / 2);
  const lastAvg = avgs[avgs.length - 1];
  const firstAvg = avgs[0];
  const trendUp = lastAvg > firstAvg;

  svg.innerHTML = `
    <path d="${area}" fill="var(--color-accent-200)" opacity="0.35"/>
    <path d="${path}" fill="none" stroke="var(--color-accent-500)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${pts[pts.length - 1][0]}" cy="${pts[pts.length - 1][1]}" r="3.5" fill="var(--color-accent-500)"/>
    <text x="0" y="${TOP + H + 22}" font-size="10" fill="var(--color-neutral-600)" font-family="Barlow">${lbl(0)}</text>
    <text x="${mid * stepX}" y="${TOP + H + 22}" font-size="10" fill="var(--color-neutral-600)" font-family="Barlow" text-anchor="middle">${lbl(mid)}</text>
    <text x="${W}" y="${TOP + H + 22}" font-size="10" fill="var(--color-neutral-600)" font-family="Barlow" text-anchor="end">${lbl(days.length - 1)}</text>
    <text x="0" y="10" font-size="10" fill="var(--color-neutral-600)" font-family="Barlow">havi csúcs: ${fmt1(maxA)} Ft</text>
    <text x="${W}" y="10" font-size="10" font-weight="600" fill="${trendUp ? 'var(--bad-500)' : 'var(--good-500)'}" font-family="Barlow" text-anchor="end">tegnapi átlag: ${fmt1(lastAvg)} Ft ${trendUp ? '▲ emelkedő' : '▼ csökkenő'}</text>
  `;
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
  const saving = kwh * (pct / 100) * (36.4 - 23.0) * 12; // 36,4 Ft rezsivédett − 23,0 Ft NT = 13,4 Ft/kWh megtakarítás
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
  const title = el('planTitle');
  if (title) title.textContent = tab === 'klima' ? 'Klíma hűtési terv' : 'Napelem kihasználási terv';
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
      else if (l === 'olcso')      { phase = 'Bekapcsolhatod';   bg = 'var(--color-accent-200)'; }
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
    'Bekapcsolhatod':   'Olcsó sáv — mehet a klíma, ha kell.',
    'Hőtartalékon':     'Kapcsold ki — a lakás hőtartaléka viszi.',
    'Hagyd kikapcsolva':'Nincs teendő — hűvös éjszakai órák.',
    'Napelem csúcs':    'Ekkor menjenek a nagy fogyasztók: mosógép, autótöltés.',
    'Részleges termelés':'Kisebb gépek mehetnek napelemről.',
    'Olcsó hálózat':    'Éjszakai olcsó áram — EV-töltésre ideális.',
    'Kerüld!':          'Drága hálózati áram — halaszd későbbre.',
    'Semleges':         'Nincs teendő.',
  };

  const tip = isKlima
    ? 'Tipp: 11:00–15:00 között hűts 1–2 fokkal a komfort alá, 17:00–21:00 között kapcsold ki — a falak hőtárolása kitart.'
    : 'Tipp: mosógépet, mosogatót 11:00–15:00 közé, az autótöltést éjszakára vagy délre időzítsd.';

  const timeStr = r => `${String(r.start).padStart(2, '0')}:00–${String(r.end % 24).padStart(2, '0')}:00`;

  // Aktuális és következő szakasz
  const curIdx = planRows.findIndex(r => nowH >= r.start && nowH < r.end);
  const cur = planRows[curIdx];
  const next = planRows[curIdx + 1] || null;

  // 24 órás idősáv szegmensekkel + "most" jelölő
  const segs = planRows.map(r =>
    `<div style="flex:${r.end - r.start};background:${r.bg}" title="${r.phase} (${timeStr(r)})"></div>`
  ).join('');
  const nowPct = ((nowH + new Date().getMinutes() / 60) / 24 * 100).toFixed(1);
  const ticks = [0, 6, 12, 18, 24].map(h =>
    `<span style="position:absolute;left:${h / 24 * 100}%;transform:translateX(${h === 24 ? '-100%' : h === 0 ? '0' : '-50%'});font-size:9.5px;color:var(--color-neutral-600)">${h}</span>`
  ).join('');

  const timeline = `
    <div style="position:relative;padding-top:12px;margin-bottom:6px">
      <div style="position:absolute;top:0;left:${nowPct}%;transform:translateX(-50%);font-size:9px;font-weight:600;font-family:var(--font-heading);letter-spacing:.05em;color:var(--color-accent-800)">▼ MOST</div>
      <div style="display:flex;height:22px;border-radius:8px;overflow:hidden">${segs}</div>
      <div style="position:relative;height:14px;margin-top:3px">${ticks}</div>
    </div>`;

  // Jelmagyarázat — csak a ma előforduló fázisok
  const seen = [...new Set(planRows.map(r => r.phase))];
  const legend = `<div style="display:flex;flex-wrap:wrap;gap:6px 14px;font-size:11px;margin-bottom:14px">${
    seen.map(ph => {
      const bg = planRows.find(r => r.phase === ph).bg;
      return `<span style="display:inline-flex;align-items:center;gap:5px"><span style="width:9px;height:9px;border-radius:3px;background:${bg};display:inline-block"></span>${ph}</span>`;
    }).join('')
  }</div>`;

  const bigCard = (kicker, r, accent) => r ? `
    <div style="background:${accent ? 'var(--color-accent-100)' : 'var(--color-neutral-100)'};border-radius:12px;padding:12px 14px;margin-bottom:8px;display:flex;align-items:center;gap:12px">
      <div style="width:6px;align-self:stretch;border-radius:3px;background:${r.bg}"></div>
      <div style="flex:1">
        <div style="font-size:10px;letter-spacing:.07em;text-transform:uppercase;font-family:var(--font-heading);color:var(--color-neutral-600)">${kicker}</div>
        <div style="font-size:15.5px;font-weight:600;font-family:var(--font-heading)">${r.phase}</div>
        <div style="font-size:12px;color:var(--color-neutral-600);line-height:1.4">${phaseDescs[r.phase] || ''}</div>
      </div>
      <div style="font-size:12.5px;font-weight:600;font-family:var(--font-heading);white-space:nowrap">${timeStr(r)}</div>
    </div>` : '';

  container.innerHTML = `<div class="plan-card" style="padding:16px">
    ${timeline}
    ${legend}
    ${bigCard('Most', cur, true)}
    ${bigCard('Következő', next, false)}
    <p class="plan-tip text-muted">${tip}</p>
  </div>`;
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
    // Őszinte, tarifa-specifikus magyarázat: mikor számít az ár és mikor nem
    const descs = {
      rezsi: 'Rezsivédett tarifán az egységár napszaktól függetlenül fix — az időzítés a jelenlegi tarifán nem csökkenti közvetlenül a számlát. Vezérelt (éjszakai) vagy dinamikus tarifára váltva a lenti összeg már ténylegesen megjelenne.',
      htnt:  'Éjszakai (vezérelt) áramkörre kötött gépeknél a kedvezményes ár közvetlenül a számládon jelentkezik — a fenti összeg ebből jön.',
      piaci: 'Dinamikus (piaci áras) tarifán az órás árkülönbség teljes egészében a tiéd — az app ajánlott idősávjai pontosan ezt az árat követik.',
    };
    el('obsResultDesc').textContent = descs[S.obsTariff] || '';

    // Melyik tarifa éri meg? — éves számla becslés mindhárom opcióra
    const cmpEl = el('obsTariffCompare');
    if (cmpEl) {
      const kwhMonth = Math.max(50, parseInt(el('obsKwh')?.value) || 200);
      const annualKwh = kwhMonth * 12;
      const flexShare = 0.3 * flexMult(S.obsFlex); // a fogyasztás mozgatható hányada

      // 30 napos spot átlag a betöltött árakból (csak historikus)
      const hist = S.prices.filter(p => !p.is_forecast).map(p => p.price_huf_kwh);
      const spot30 = hist.length ? hist.reduce((a, b) => a + b, 0) / hist.length : 60;
      const cheapAvg = spot30 * 0.55; // olcsó sávok tipikus átlaga

      // 2026-os lakossági egységárak (MEKH H2995/2025):
      //   A1 (rezsivédett): 36,386 Ft/kWh keretig, 70,104 Ft/kWh felett
      //   Vezérelt NT: ~23,0 Ft/kWh (MVM: 22,68–23,52)
      //   D tarifa hálózati díj (nettó): elosztói 20,01 + átviteli 3,39 + KÁT ~1,5 + adó ~0,5 = ~25,4 Ft/kWh
      //   spot30 a nagykereskedelmi ár ÁFA nélkül → D tarifa fogyasztói ár = (spot + 25,4) × 1,27
      const CAP = 2523, REZSI = 36.4, PIACI = 70.1, NT = 23.0, NT_PIACI = 60.9, NETFEE_NET = 25.4, VAT = 1.27;
      // NT_PIACI: B alap (vezérelt) tarifa 2523 kWh-es kereten felüli ára (MVM Next 2026: 60.935 Ft)
      const rezsiBill = Math.min(annualKwh, CAP) * REZSI + Math.max(0, annualKwh - CAP) * PIACI;
      const ntKwh = annualKwh * flexShare;
      const htntBill =
        Math.min(ntKwh, CAP) * NT + Math.max(0, ntKwh - CAP) * NT_PIACI +
        Math.min(annualKwh * (1 - flexShare), CAP) * REZSI +
        Math.max(0, annualKwh * (1 - flexShare) - CAP) * PIACI;
      // D tarifa: az első 2523 kWh/év rezsivédett áron, felette (spot + hálózati) × ÁFA
      const overCap = Math.max(0, annualKwh - CAP);
      const underCap = Math.min(annualKwh, CAP);
      const dynBill = underCap * REZSI + overCap * (
        (1 - flexShare) * (spot30 + NETFEE_NET) * VAT +
        flexShare * (cheapAvg + NETFEE_NET) * VAT
      );

      const opts = [
        { key: 'rezsi', name: 'Rezsivédett', bill: rezsiBill },
        { key: 'htnt',  name: 'Éjszakai áram (vezérelt)', bill: htntBill },
        { key: 'piaci', name: 'Dinamikus D tarifa (2027-től)', bill: dynBill },
      ];
      const best = opts.reduce((a, b) => (b.bill < a.bill ? b : a));
      const mineOpt = opts.find(o => o.key === S.obsTariff) || opts[0];
      const savedBySwitch = Math.round(mineOpt.bill - best.bill);

      // Ha a fogyasztás a kereten belül van, a D tarifa ugyanannyit ér mint a rezsivédett
      const dynNote = annualKwh <= CAP
        ? ` (${annualKwh} kWh/év — te a ${CAP} kWh-es kereten belül vagy, a D tarifa esetén neked is rezsivédett ár érvényes a teljes fogyasztásra.)`
        : ` (A keret feletti ${fmt(overCap)} kWh-ra érvényes a tőzsdei ár.)`;
      const verdict = best.key === S.obsTariff
        ? `✅ Jó helyen vagy: a mostani tarifád a legolcsóbb.${mineOpt.key === 'piaci' ? ' A Dinamikus D tarifa 2027-ben lép életbe — addig vezérelt vagy rezsivédett áron is optimalizálhatsz.' : annualKwh <= CAP ? ' A D tarifa a te fogyasztásoddal nem hoz különbséget (kereten belül vagy).' : ' A D tarifa a te fogyasztásoddal nem érné meg.'}`
        : best.key === 'piaci'
          ? `💡 A <strong>Dinamikus D tarifa</strong> lenne a legolcsóbb — ${fmt(savedBySwitch)} Ft/év megtakarítás a keret feletti ${fmt(overCap)} kWh-on.${overCap > 0 ? ' 2026. szept. 1-jétől igényelhető, 2027. jan. 1-jén lép életbe.' : ''}`
          : `💡 Neked a(z) <strong>${best.name}</strong> tarifa lenne a legolcsóbb — váltással évente kb. <strong>${fmt(savedBySwitch)} Ft</strong>-tal kevesebbet fizetnél.`;

      const maxBill = Math.max(...opts.map(o => o.bill));
      cmpEl.innerHTML = `
        <div class="cmp-verdict" style="font-size:13px;line-height:1.5;background:var(--color-accent-100);border-radius:10px;padding:10px 12px;margin-bottom:14px;animation:fadeUp .4s ease both">${verdict}</div>
        <div style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;font-family:var(--font-heading);color:var(--color-neutral-600);margin-bottom:8px">Éves villanyszámla havi ${fmt(kwhMonth)} kWh fogyasztással</div>` +
        opts.map((o, i) => {
          const isBest = o === best;
          const mine = o.key === S.obsTariff;
          const diff = Math.round(o.bill - best.bill);
          const dynCapNote = o.key === 'piaci' && annualKwh <= CAP
            ? ` <span style="font-size:10px;color:var(--color-neutral-600)">(${annualKwh} kWh/év — kereten belül, teljes fogyasztás rezsivédett áron)</span>`
            : '';
          return `<div style="padding:7px 0;animation:fadeUp .4s ease both;animation-delay:${200 + i * 150}ms">
            <div style="display:flex;justify-content:space-between;align-items:baseline;font-size:12.5px;margin-bottom:4px">
              <span${isBest ? ' style="font-weight:600"' : ''}>${isBest ? '🏆 ' : ''}${o.name}${mine ? ' <span style="font-size:10px;color:var(--color-accent-800)">— a tiéd</span>' : ''}${dynCapNote}</span>
              <span>
                <strong class="cmp-count" data-target="${Math.round(o.bill)}" style="font-family:var(--font-heading);font-size:15px">0</strong>
                <span style="font-size:11px;color:var(--color-neutral-600)"> Ft/év</span>
                ${!isBest ? `<span style="font-size:10.5px;color:var(--bad-500);font-weight:600" title="Ennyivel drágább évente a legjobb opciónál"> +${fmt(diff)} Ft drágább</span>` : ''}
              </span>
            </div>
            <div style="height:14px;border-radius:7px;background:var(--color-neutral-200);overflow:hidden">
              <div class="cmp-fill" data-w="${(o.bill / maxBill * 100).toFixed(1)}"
                style="width:0%;height:100%;border-radius:7px;transition:width 1s cubic-bezier(.22,1,.36,1) ${300 + i * 150}ms;background:${isBest
                  ? 'linear-gradient(90deg, oklch(0.62 0.13 155), oklch(0.72 0.14 155))'
                  : 'linear-gradient(90deg, var(--color-accent-300), var(--color-accent-200))'}"></div>
            </div>
          </div>`;
        }).join('') +
        `<p class="text-muted" style="font-size:11px;margin-top:10px;line-height:1.45;animation:fadeUp .4s ease both;animation-delay:.8s">Közelítő becslés. Rezsivédett: 36,4 Ft/kWh a 2523 kWh/év keretig, felette 70,1 Ft (MEKH 2026). Vezérelt (NT): ~23 Ft. Dinamikus D tarifa: 2523 kWh-ig rezsivédett ár, felette (tőzsdei ár ${fmt1(spot30)} Ft + ~25,4 Ft hálózati díj) × 1,27 ÁFA — igényelhető 2026. szept. 1-jétől, hatályba lép 2027. jan. 1-én (<a href="https://www.mvmnext.hu/aram/dinamikus" target="_blank" style="color:inherit;text-decoration:underline">mvmnext.hu/aram/dinamikus</a>).</p>`;

      // Animációk indítása: sávok kinövése + számlálók felpörgése.
      // setTimeout fallback is fut, mert rejtett fülön a rAF szünetel.
      const startBars = () => cmpEl.querySelectorAll('.cmp-fill').forEach(b => { b.style.width = b.dataset.w + '%'; });
      requestAnimationFrame(startBars);
      setTimeout(startBars, 80);
      cmpEl.querySelectorAll('.cmp-count').forEach((c, i) => {
        const target = parseInt(c.dataset.target);
        const t0 = performance.now() + 300 + i * 150;
        (function tick(now) {
          const t = Math.min(1, Math.max(0, (now - t0) / 1000));
          const e = 1 - Math.pow(1 - t, 3);
          c.textContent = fmt(Math.round(target * e));
          if (t < 1) requestAnimationFrame(tick);
        })(performance.now());
        // Végérték garantálva akkor is, ha az animáció nem fut le
        setTimeout(() => { c.textContent = fmt(target); }, 1600 + i * 150);
      });
    }
    // A nagy szám is számlálóval pörögjön fel
    const amtEl = el('obsResultAmt');
    if (amtEl) countUp(amtEl, amt, 1000);
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

const TARIFF_INFO = {
  rezsi: 'A normál lakossági áram — ezt fizeti szinte mindenki, fix kedvezményes egységáron.',
  htnt:  'Az „éjszakai áram": külön mért áramkör bojlerhez, hőszivattyúhoz, EV-töltőhöz — a szolgáltató éjjel + napközbeni sávokban kapcsolja, kedvezményes áron. Bárki igényelheti, külön áramkör kiépítése kell hozzá.',
  piaci: 'Óránként változó tőzsdei ár — okosmérő kell hozzá. 2026. szeptember 1-jétől igényelhető az MVM Next-nél (D árszabás), 2027. január 1-jén lép életbe.',
};

function buildObsTariffGrid() {
  const opts = [
    { id: 'rezsi', label: 'Rezsivédett (normál)' },
    { id: 'htnt',  label: 'Éjszakai áram (vezérelt)' },
    { id: 'piaci', label: 'Dinamikus (okosmérős)' },
  ];
  el('obsTariffGrid').innerHTML = opts.map(o => {
    const sel = S.obsTariff === o.id;
    return `<button class="chip-btn ${sel ? 'sel' : ''}" onclick="setObsTariff('${o.id}')">${o.label}</button>`;
  }).join('') + `<p id="obsTariffInfo" class="text-muted" style="font-size:11.5px;line-height:1.45;margin:8px 0 0;flex-basis:100%">${TARIFF_INFO[S.obsTariff] || ''}</p>`;
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
    { id: 'piaci', label: 'Dinamikus / Piaci' },
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
    { id: 'megtakaritas', label: 'Minél nagyobb megtakarítás' },
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
      d: 'A bojler csak éjszaka fűtsön — az egyik legnagyobb egyedi tétel.',
      cost: 15000, save: 18000 * billMult, ok: has('bojler') },
    { t: 'Okos termosztát a gázkazánhoz',
      d: 'Ütemezett, helyiségenkénti fűtés — 10–15% megtakarítás.',
      cost: 60000, save: 25000, ok: a.heating === 'gaz', comfort: 1 },
    { t: 'Inverteres klímára csere',
      d: 'Régi klíma cseréje 30–50%-kal kevesebb áramot fogyaszt.',
      cost: 350000, save: 20000, ok: has('klima') },
    { t: 'Napelem rendszer (~4 kWp)',
      d: 'Állami támogatással (50-60%) kb. 10–14 év megtérülés, támogatás nélkül ~20–25 év (bruttó elszámolás, 2024 óta nincs nettó elszámolás). Utána évtizedekig termel.',
      cost: 3500000, save: 130000, ok: !has('napelemek') && a.homeType === 'haz', eco: 1 },
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

// ── Push notifications ────────────────────────────────────────────────
// Placeholder VAPID public key — base64url-encoded random bytes, NOT a
// real elliptic-curve key. It lets pushManager.subscribe() run so the
// bell opt-in works end-to-end in the browser, but no server can use it
// to actually deliver push messages yet. Before wiring up real
// server-sent push, generate a genuine pair with the `web-push` library
// (`npx web-push generate-vapid-keys`), swap the public key in here, and
// keep the private key on the backend only — never ship it to the client.
const VAPID_PUBLIC_KEY = 'BAjrt03nfBKUDZb0jl1U-MvABcBPj8TQFX94rEwj0ZYFGl5UTxsiHuwz7wwnOO9m6qoJobnvQr1YUC_rmmN3McI';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

function updatePushBellUI() {
  const btn = el('pushOptInBtn');
  if (!btn) return;
  const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
  btn.style.display = supported ? '' : 'none';
  btn.classList.toggle('active', supported && Notification.permission === 'granted' && S.pushOptIn);
}

function initPushUI() {
  if (!('Notification' in window)) return;
  S.pushOptIn = Notification.permission === 'granted';
  updatePushBellUI();
}

async function togglePushOptIn() {
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    alert('A böngésződ nem támogatja az értesítéseket.');
    return;
  }

  if (Notification.permission === 'denied') {
    alert('Az értesítések le vannak tiltva — engedélyezd a böngésző beállításaiban.');
    return;
  }

  if (Notification.permission !== 'granted') {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { updatePushBellUI(); return; }
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
    S.pushOptIn = true;
    S.pushLastAlertKey = null;
    if (S.prices.length) renderHero();
  } catch (e) {
    console.warn('Push feliratkozás sikertelen:', e);
    S.pushOptIn = false;
  }
  updatePushBellUI();
}

function maybeNotifyCheapPrice(lvl) {
  if (!S.pushOptIn || lvl !== 'olcso') return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const now = new Date();
  const alertKey = `${now.toDateString()}-${now.getHours()}`;
  if (S.pushLastAlertKey === alertKey) return; // already notified for this hour
  S.pushLastAlertKey = alertKey;

  const title = 'Energia Időzítő';
  const body = 'Most olcsó — indítsd a mosógépet!';
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(reg => reg.showNotification(title, { body, tag: 'price-alert', renotify: true }));
  } else {
    new Notification(title, { body });
  }
}

// ── Data loading ───────────────────────────────────────────────────────
async function loadPrices() {
  try {
    const res = await fetch('/api/forecast?history_days=31&forecast_days=2');
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    S.prices = data.prices || [];
    return S.prices;
  } catch (e) {
    // Nincs demo fallback — hibaállapotot mutatunk valós adat helyett
    S.prices = [];
    const sub = el('heroSub');
    if (sub) sub.textContent = 'Nem sikerült áradatot betölteni. Próbáld újra pár perc múlva.';
    const pill = el('heroStatusPill');
    if (pill) pill.textContent = 'Nincs adat';
    return S.prices;
  }
}

// ── Boot ───────────────────────────────────────────────────────────────
async function init() {
  ['htntKwh', 'htntPct'].forEach(id => {
    const inp = el(id);
    if (inp) inp.addEventListener('input', updateHtnt);
  });

  initPushUI();

  await loadPrices();

  if (S.prices.length) renderHero();

  loadGrid(); // háttérben — nem blokkolja az árakat

  // Default savings from design's initial onboarding state
  const defaultSave = calcOnboardingSavings();
  updateKpi(defaultSave);
  updateHtnt();
  renderPlan();

  setInterval(async () => {
    await loadPrices();
    if (S.prices.length) renderHero();
    if (S.tab === 'arak') { renderHeatmap(); renderBarChart(); renderTrendChart(); }
    if (S.tab === 'tervek') renderPlan();
  }, 60000);

  setInterval(loadGrid, 15 * 60000); // MAVIR adatok 15 percenként
}

document.addEventListener('DOMContentLoaded', init);
