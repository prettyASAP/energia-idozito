/* =====================================================================
   Energia Időzítő — app.js v12
   4-tab mobile-first app, Industry design system
   ===================================================================== */
'use strict';

// ── State ──────────────────────────────────────────────────────────────
const S = {
  tab: 'ma',
  planTab: 'klima',
  prices: [],          // 48h price array: {timestamp, price_huf_kwh, is_forecast}
  selHour: null,
  // Onboarding
  obsOpen: false, obsStep: 1,
  obsDevices: [], obsTariff: 'rezsi', obsFlex: 'elore',
  // Advisor
  advOpen: false, advStep: 1,
  advHome: 'haz', advArea: 'm60', advHeat: 'gaz',
  advDevices: [], advBill: 15000, advTariff: 'rezsi',
  advBudget: 'barmennyi', advPriority: 'sporolas',
  // Savings
  savedAmt: 0,
};

// ── Device definitions ─────────────────────────────────────────────────
const DEVICES = [
  { id: 'mosogep',       label: 'Mosógép',       kwh: 1.0, hours: 2, annualSave: 6000,
    icon: 'M5 3h14v18H5z M8 6h.01 M11 6h.01 M12 14m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0' },
  { id: 'mosogatogep',   label: 'Mosogatógép',   kwh: 1.2, hours: 2, annualSave: 5000,
    icon: 'M5 3h14v18H5z M5 8h14 M12 15m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0' },
  { id: 'bojler',        label: 'Bojler',         kwh: 8.0, hours: 3, annualSave: 18000,
    icon: 'M7 2h10a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2H7a2 2 0 0 1 -2 -2V4a2 2 0 0 1 2 -2z M9 20v2 M15 20v2 M9 9c1 -1 2 -1 3 0s2 1 3 0' },
  { id: 'legkondicionalo', label: 'Klíma',        kwh: 2.5, hours: 4, annualSave: 9000,
    icon: 'M3 5h18v6H3z M6 8h.01 M17 8h.01 M7 14c0 2 -1 2 -1 4 M12 14c0 2 -1 2 -1 4 M17 14c0 2 -1 2 -1 4' },
  { id: 'ev_tolto',      label: 'EV töltő',       kwh: 11.0, hours: 4, annualSave: 30000,
    icon: 'M13 2 3 14h7l-1 8 10 -12h-7l1 -8' },
  { id: 'szarito',       label: 'Szárítógép',     kwh: 2.5, hours: 2, annualSave: 7000,
    icon: 'M5 3h14v18H5z M12 13m-5 0a5 5 0 1 0 10 0a5 5 0 1 0 -10 0 M12 13m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0' },
  { id: 'hoszivattyu',   label: 'Hőszivattyú',    kwh: 3.0, hours: 6, annualSave: 15000,
    icon: 'M12 3v18 M5 8l7 -5 7 5 M8 21v-6h8v6' },
  { id: 'napelem',       label: 'Napelem',         kwh: 0,   hours: 0, annualSave: 12000,
    icon: 'M4 6h16l2 9H2z M12 15v6 M8 21h8 M8 9h.01 M12 9h.01 M16 9h.01' },
];

// Main 6 devices shown on Ma tab
const MAIN_DEVICES = DEVICES.slice(0, 6);

// ── Advisor actions ────────────────────────────────────────────────────
const ADVISOR_RECS = [
  { id: 'ev',          label: 'EV töltési ablak',    costLabel: 'Ingyenes', save: 30000,
    desc: 'Éjszakai töltéssel HT/NT áron tölts — akár 30 000 Ft/év megtakarítás.',
    cond: (d) => d.includes('ev_tolto'), prio: ['sporolas','gyors'] },
  { id: 'bojler',      label: 'Bojler időzítő',       costLabel: '~5 000 Ft', save: 18000,
    desc: 'Sonoff / Shelly okos relével éjszaka NT áron melegítsd.', cost: 5000,
    cond: (d) => d.includes('bojler'), prio: ['sporolas','kenyelem'] },
  { id: 'htnt',        label: 'HT/NT mérő csere',    costLabel: 'Ingyenes', save: 20000,
    desc: 'Kérd az elosztótól ingyen — HT 54,27 / NT 36,18 Ft/kWh tarifán azonnal spórolsz.',
    cond: (d, t) => t !== 'htnt', prio: ['sporolas','gyors'] },
  { id: 'mosogep',     label: 'Mosógép időzítő',      costLabel: 'Ingyenes', save: 6000,
    desc: 'Indítsd a napi legolcsóbb sávban — 22-6h között.', cost: 0,
    cond: (d) => d.includes('mosogep'), prio: ['sporolas','gyors'] },
  { id: 'mosogatogep', label: 'Mosogatógép ablak',    costLabel: 'Ingyenes', save: 5000,
    desc: 'Késleltetett indítással az olcsó éjszakai ablakba tereld.', cost: 0,
    cond: (d) => d.includes('mosogatogep'), prio: ['sporolas','gyors'] },
  { id: 'szarito',     label: 'Szárítógép ablak',     costLabel: 'Ingyenes', save: 7000,
    desc: 'A nap legolcsóbb 2 órájában futtasd.',
    cond: (d) => d.includes('szarito'), prio: ['sporolas','kornyezet'] },
  { id: 'smart_plug',  label: 'Okos dugó',             costLabel: '~8 000 Ft', save: 4000,
    desc: 'Shelly Plug S — mérés + automatizálás bármely eszközre.', cost: 8000,
    cond: () => true, prio: ['kenyelem','gyors'] },
  { id: 'led',         label: 'LED váltás',             costLabel: '~25 000 Ft', save: 12000,
    desc: 'Izzók cseréje LED-re: 2-3 éves megtérülés.', cost: 25000,
    cond: () => true, prio: ['sporolas','kornyezet'] },
  { id: 'thermostat',  label: 'Okos termosztát',       costLabel: '~30 000 Ft', save: 15000,
    desc: 'Tado / Honeywell — 15-20% fűtési megtakarítás automatikusan.', cost: 30000,
    cond: (d, t, h) => h === 'gaz' || h === 'tavfutes', prio: ['kenyelem','sporolas'] },
  { id: 'insulation',  label: 'Hőszigetelés',           costLabel: '~1,5 M Ft', save: 50000,
    desc: 'Fal- és tetőszigetelés: 15-20 éves megtérülés, CO₂ csökkentés.', cost: 1500000,
    cond: (d, t, h, home) => home === 'haz', prio: ['kornyezet','sporolas'] },
  { id: 'solar',       label: 'Napelem rendszer',       costLabel: '~3,5 M Ft', save: 80000,
    desc: '5 kWp rendszer: ~8-10 éves megtérülés, 5000 kWh/év termelés.', cost: 3500000,
    cond: (d, t, h, home) => home === 'haz', prio: ['kornyezet','sporolas'] },
  { id: 'heat_pump',   label: 'Hőszivattyú',            costLabel: '~4 M Ft', save: 120000,
    desc: 'Gáz helyett hőszivattyú: 3× hatékonyabb, 8-12 éves megtérülés.', cost: 4000000,
    cond: (d, t, h) => h === 'gaz', prio: ['kornyezet','sporolas'] },
  { id: 'battery',     label: 'Akkumulátor tároló',     costLabel: '~2,5 M Ft', save: 40000,
    desc: '10 kWh home battery: napelem önfogyasztás +30%.', cost: 2500000,
    cond: (d) => d.includes('napelem'), prio: ['kornyezet','kenyelem'] },
];

// ── Helpers ────────────────────────────────────────────────────────────
const el = id => document.getElementById(id);
const fmt = n => Math.round(n).toLocaleString('hu-HU');

function svgIcon(path, size = 20) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>`;
}

function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * p / 100);
  return sorted[Math.min(idx, sorted.length - 1)];
}

function priceLevel(price, p33, p67) {
  if (price <= p33) return 'cheap';
  if (price <= p67) return 'avg';
  return 'exp';
}

function levelColors(lvl) {
  if (lvl === 'cheap') return { bg: 'oklch(0.62 0.13 155)', text: '#fff' };
  if (lvl === 'exp')   return { bg: 'oklch(0.58 0.17 25)',  text: '#fff' };
  return { bg: '#b5d9fd', text: '#1d2d3d' };
}

function hhmm(ts) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2,'0')}:00`;
}

// Best sliding window: find cheapest N-hour block in next 24h
function bestWindow(prices, hours) {
  const now = new Date();
  const next24 = prices.filter(p => {
    const ts = new Date(p.timestamp);
    return ts >= now && ts < new Date(now.getTime() + 24 * 3600000);
  });
  if (next24.length < hours) return null;
  let best = null, bestAvg = Infinity;
  for (let i = 0; i <= next24.length - hours; i++) {
    const window = next24.slice(i, i + hours);
    const avg = window.reduce((s, p) => s + p.price_huf_kwh, 0) / hours;
    if (avg < bestAvg) { bestAvg = avg; best = { start: new Date(window[0].timestamp), avg }; }
  }
  return best;
}

function countUp(el, target, ms = 900) {
  const start = performance.now();
  const from = 0;
  function step(now) {
    const t = Math.min(1, (now - start) / ms);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = fmt(Math.round(from + (target - from) * eased));
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ── Tab switching ──────────────────────────────────────────────────────
function setTab(tab) {
  ['ma','arak','sporolas','tervek'].forEach(t => {
    el(`tab-${t}`).classList.toggle('active', t === tab);
    el(`tbtn-${t}`).classList.toggle('active', t === tab);
  });
  S.tab = tab;
  if (tab === 'arak' && S.prices.length) {
    renderHeatmap();
    renderBarChart();
  }
  if (tab === 'sporolas') {
    updateKpi(S.savedAmt);
    updateHtnt();
  }
  if (tab === 'tervek') renderPlan();
}

// ── Hero ───────────────────────────────────────────────────────────────
function renderHero(prices) {
  const now = new Date();
  const curH = now.getHours();
  const todayStr = now.toISOString().slice(0, 10);

  const todayPrices = prices.filter(p => new Date(p.timestamp).toISOString().slice(0, 10) === todayStr);
  const cur = todayPrices.find(p => new Date(p.timestamp).getHours() === curH);
  const prev = todayPrices.find(p => new Date(p.timestamp).getHours() === curH - 1);

  if (!cur) return;

  const vals = todayPrices.map(p => p.price_huf_kwh);
  const p33 = percentile(vals, 33);
  const p67 = percentile(vals, 67);
  const lvl = priceLevel(cur.price_huf_kwh, p33, p67);
  const { text: levelText, bg: levelBg } = levelColors(lvl);

  // Status pill
  const pillEl = el('heroStatusPill');
  const labels = { cheap: 'Most olcsó', avg: 'Átlagos ár', exp: 'Most drága' };
  pillEl.textContent = labels[lvl];
  pillEl.style.background = levelBg;
  pillEl.style.color = levelText;
  pillEl.style.border = 'none';

  // Price (count-up animation)
  const priceEl = el('heroPrice');
  priceEl.style.color = lvl === 'cheap' ? 'oklch(0.85 0.1 155)' : lvl === 'exp' ? 'oklch(0.83 0.09 25)' : '#d6ebff';
  let displayed = 0;
  const target = cur.price_huf_kwh;
  const startTime = performance.now();
  function animPrice(now) {
    const t = Math.min(1, (now - startTime) / 900);
    const eased = 1 - Math.pow(1 - t, 3);
    const val = (displayed + (target - displayed) * eased).toFixed(1);
    priceEl.textContent = val.replace('.', ',');
    if (t < 1) requestAnimationFrame(animPrice);
  }
  requestAnimationFrame(animPrice);

  // Trend
  const trendEl = el('heroTrend');
  if (prev) {
    const diff = ((cur.price_huf_kwh - prev.price_huf_kwh) / prev.price_huf_kwh * 100).toFixed(1);
    const up = diff > 0;
    trendEl.textContent = `${up ? '▲' : '▼'} ${Math.abs(parseFloat(diff)).toFixed(1).replace('.', ',')}%`;
    trendEl.style.color = up ? 'oklch(0.83 0.09 25)' : 'oklch(0.85 0.1 155)';
  }

  // Sub text
  const maxP = Math.max(...vals).toFixed(1);
  const minP = Math.min(...vals).toFixed(1);
  const nextCheap = prices.find(p => {
    const ts = new Date(p.timestamp);
    return ts > now && priceLevel(p.price_huf_kwh, p33, p67) === 'cheap';
  });
  let sub = `Mai napi min. ${minP.replace('.', ',')} · max. ${maxP.replace('.', ',')} Ft/kWh`;
  if (nextCheap) {
    sub += ` · Következő olcsó sáv: ${hhmm(nextCheap.timestamp)}`;
  }
  el('heroSub').textContent = sub;
}

// ── Device grid ────────────────────────────────────────────────────────
function renderDeviceGrid(prices) {
  const grid = el('deviceGrid');
  if (!grid || !prices.length) return;

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const todayPrices = prices.filter(p => new Date(p.timestamp).toISOString().slice(0, 10) === todayStr);
  const vals = todayPrices.map(p => p.price_huf_kwh);
  const p33 = percentile(vals, 33);
  const p67 = percentile(vals, 67);
  const curH = now.getHours();
  const curP = todayPrices.find(p => new Date(p.timestamp).getHours() === curH);

  grid.innerHTML = MAIN_DEVICES.map((dev, i) => {
    const win = bestWindow(prices, dev.hours);
    let isNow = false, waitH = 0, winStr = '—';
    if (win) {
      const diffMs = win.start.getTime() - now.getTime();
      const diffH = Math.round(diffMs / 3600000);
      isNow = diffH <= 0;
      waitH = Math.max(0, diffH);
      winStr = `${hhmm(win.start.toISOString())}–${String((win.start.getHours() + dev.hours) % 24).padStart(2,'0')}:00`;
    }

    const savePerRun = win ? (curP ? ((curP.price_huf_kwh - win.avg) * dev.kwh).toFixed(0) : null) : null;
    const cardBg = isNow ? 'background:oklch(0.95 0.05 155);border-color:oklch(0.85 0.1 155)' : '';
    const iconBg = isNow ? 'oklch(0.62 0.13 155)' : 'var(--color-accent-200)';
    const iconColor = isNow ? '#fff' : 'var(--color-accent-800)';
    const pillBg = isNow ? 'oklch(0.62 0.13 155)' : 'var(--color-accent-200)';
    const pillTxt = isNow ? '#fff' : 'var(--color-accent-800)';
    const pillLabel = isNow ? 'Indítsd most' : (waitH > 0 ? `Várj ${waitH} ó` : 'Ma');

    return `<div class="device-card" style="${cardBg};animation-delay:${i * 60}ms">
      <div class="device-card-top">
        <div class="device-icon" style="background:${iconBg};color:${iconColor}">
          ${svgIcon(dev.icon, 18)}
        </div>
        <span class="tag" style="font-size:10px;background:${pillBg};color:${pillTxt};border:none">${pillLabel}</span>
      </div>
      <div class="device-name">${dev.label}</div>
      <div class="device-window">
        <span class="text-muted" style="font-size:11px">Legjobb ablak</span>
        <strong>${winStr}</strong>
      </div>
      ${savePerRun && savePerRun > 0 ? `<div class="device-save">~${savePerRun} Ft / futtatás · ${fmt(dev.annualSave)} Ft / év</div>` : `<div class="device-save">${fmt(dev.annualSave)} Ft / év becsült</div>`}
    </div>`;
  }).join('');
}

// ── Heatmap ────────────────────────────────────────────────────────────
function renderHeatmap() {
  const grid = el('heatmapGrid');
  if (!grid) return;

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const curH = now.getHours();

  const todayPrices = S.prices.filter(p =>
    new Date(p.timestamp).toISOString().slice(0, 10) === todayStr
  );

  // Fill missing hours with forecast
  const allHours = [];
  for (let h = 0; h < 24; h++) {
    const found = todayPrices.find(p => new Date(p.timestamp).getHours() === h);
    if (found) allHours.push(found);
    else allHours.push({ timestamp: null, price_huf_kwh: null, is_forecast: true });
  }

  const vals = allHours.filter(p => p.price_huf_kwh !== null).map(p => p.price_huf_kwh);
  const p33 = percentile(vals, 33);
  const p67 = percentile(vals, 67);

  grid.innerHTML = allHours.map((p, h) => {
    if (!p.price_huf_kwh) {
      return `<div class="hm-cell" style="background:var(--color-neutral-200)">
        <span class="hm-hour" style="color:var(--color-neutral-600)">${String(h).padStart(2,'0')}</span>
      </div>`;
    }
    const lvl = priceLevel(p.price_huf_kwh, p33, p67);
    const { bg, text } = levelColors(lvl);
    const isCur = h === curH;
    const outline = isCur ? `box-shadow:0 0 0 2px var(--color-text) inset` : '';
    const opacity = p.is_forecast ? 'opacity:.65' : '';
    return `<div class="hm-cell" style="background:${bg};color:${text};${outline};${opacity}"
      onclick="selectHour(${h},${p.price_huf_kwh},'${lvl}')">
      <span class="hm-hour">${String(h).padStart(2,'0')}</span>
      <span class="hm-price">${p.price_huf_kwh.toFixed(1)}</span>
    </div>`;
  }).join('');
}

function selectHour(h, price, lvl) {
  S.selHour = h;
  const labels = { cheap: 'olcsó', avg: 'átlagos', exp: 'drága' };
  el('heatmapDetail').textContent = `${String(h).padStart(2,'0')}:00–${String(h+1).padStart(2,'0')}:00 · ${price.toFixed(1).replace('.',',')} Ft/kWh · ${labels[lvl]}`;
}

// ── Bar chart ──────────────────────────────────────────────────────────
function renderBarChart() {
  const svg = el('barChart');
  if (!svg || !S.prices.length) return;

  const now = new Date();
  const next48 = S.prices
    .filter(p => {
      const ts = new Date(p.timestamp);
      return ts >= new Date(now.getFullYear(), now.getMonth(), now.getDate()) &&
             ts < new Date(now.getTime() + 48 * 3600000);
    })
    .slice(0, 48);

  if (!next48.length) return;

  const vals = next48.map(p => p.price_huf_kwh);
  const maxV = Math.max(...vals);
  const p33 = percentile(vals, 33);
  const p67 = percentile(vals, 67);

  const W = svg.parentElement.offsetWidth || 340;
  const H = 120;
  const barW = Math.max(2, Math.floor((W - 8) / next48.length) - 1);
  const nowH = now.getHours();

  svg.setAttribute('viewBox', `0 0 ${W} ${H + 20}`);

  const bars = next48.map((p, i) => {
    const ts = new Date(p.timestamp);
    const h = ts.getHours();
    const isToday = ts.toISOString().slice(0, 10) === now.toISOString().slice(0, 10);
    const lvl = priceLevel(p.price_huf_kwh, p33, p67);
    const { bg } = levelColors(lvl);
    const barH = Math.max(2, Math.round((p.price_huf_kwh / maxV) * H));
    const x = 4 + i * (barW + 1);
    const y = H - barH;
    const opacity = !isToday ? 0.45 : 1;
    const isCur = isToday && h === nowH;
    const delay = i * 12;
    const label = (h % 6 === 0) ? `<text x="${x + barW/2}" y="${H + 14}" text-anchor="middle" font-size="9" fill="currentColor" opacity=".5">${String(h).padStart(2,'0')}</text>` : '';
    return `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="2" fill="${bg}" opacity="${opacity}"
      style="animation-delay:${delay}ms" ${isCur ? 'stroke="var(--color-text)" stroke-width="1"' : ''}/>
      ${label}`;
  }).join('');

  svg.innerHTML = bars;
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
    const offset = 232 * (1 - pct);
    ringEl.style.strokeDashoffset = offset;
    if (pctEl) pctEl.textContent = Math.round(pct * 100) + '%';
  }

  const monthEl = el('kpiMonth');
  if (monthEl) countUp(monthEl, Math.round(amt / 12));

  const co2El = el('kpiCo2');
  if (co2El) {
    const co2 = Math.round(amt / 500);
    countUp(co2El, co2);
  }
}

// ── HT/NT calculator ───────────────────────────────────────────────────
function updateHtnt() {
  const kwh = parseFloat(el('htntKwh')?.value) || 0;
  const pct = parseFloat(el('htntPct')?.value) || 0;
  const transferred = kwh * (pct / 100);
  const saving = transferred * (54.27 - 36.18) * 12;
  const resEl = el('htntResult');
  const noteEl = el('htntNote');
  if (resEl) resEl.textContent = `${fmt(saving)} Ft / év`;
  if (noteEl) noteEl.innerHTML = `≈ ${fmt(saving / 12)} Ft / hó · <a href="https://mekh.hu" target="_blank" rel="noopener">MEKH</a> HT 54,27 / NT 36,18 Ft/kWh`;
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

  const now = new Date();
  const curH = now.getHours();

  if (S.planTab === 'klima') {
    renderKlimaPlan(container, curH);
  } else {
    renderNapelemPlan(container, curH);
  }
}

function klimaPhase(h) {
  // Simple heuristic: precool cheap hours, run moderate, coast hot hours, off night
  if (S.prices.length) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayP = S.prices.filter(p => new Date(p.timestamp).toISOString().slice(0, 10) === todayStr);
    const vals = todayP.map(p => p.price_huf_kwh);
    const p33 = percentile(vals, 33);
    const p67 = percentile(vals, 67);
    const ph = todayP.find(p => new Date(p.timestamp).getHours() === h);
    if (ph) {
      const lvl = priceLevel(ph.price_huf_kwh, p33, p67);
      if (lvl === 'cheap') return 'precool';
      if (lvl === 'avg') return 'run';
      return 'coast';
    }
  }
  if (h >= 22 || h < 6) return 'off';
  if (h >= 6 && h < 10) return 'precool';
  if (h >= 10 && h < 16) return 'run';
  if (h >= 16 && h < 20) return 'coast';
  return 'off';
}

function napelemPhase(h) {
  if (h >= 10 && h <= 14) return 'peak';
  if ((h >= 8 && h < 10) || (h > 14 && h <= 17)) return 'mild';
  if (S.prices.length) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayP = S.prices.filter(p => new Date(p.timestamp).toISOString().slice(0, 10) === todayStr);
    const vals = todayP.map(p => p.price_huf_kwh);
    const p33 = percentile(vals, 33);
    const ph = todayP.find(p => new Date(p.timestamp).getHours() === h);
    if (ph && ph.price_huf_kwh <= p33) return 'cheap';
    const p67 = percentile(vals, 67);
    if (ph && ph.price_huf_kwh > p67) return 'exp';
  }
  return 'neutral';
}

const KLIMA_PHASES = {
  precool: { label: 'Előhűtés', desc: 'Hűtsd le a lakást a csúcsidő előtt.', color: 'var(--color-accent-500)' },
  run:     { label: 'Futtathatod', desc: 'Átlagos ár — normál üzem.', color: 'var(--color-accent-200)' },
  coast:   { label: 'Hőtartalékon', desc: 'Kapcsold ki — a lakás hőtartaléka viszi.', color: 'var(--color-neutral-800)' },
  off:     { label: 'Hagyd kikapcsolva', desc: 'Nincs teendő — hűvös éjszakai órák.', color: 'var(--color-neutral-200)' },
};

const NAPELEM_PHASES = {
  peak:    { label: 'Napelem csúcs', desc: 'Futtasd a nagy fogyasztókat most.', color: 'var(--color-accent-500)' },
  mild:    { label: 'Részleges termelés', desc: 'Közepes napelemes hozam.', color: 'var(--color-accent-200)' },
  cheap:   { label: 'Olcsó hálózat', desc: 'Érdemes bekapcsolni — kedvező ár.', color: 'var(--color-accent-100)' },
  exp:     { label: 'Kerüld!', desc: 'Drága hálózati ár — kapcsolj ki mindent.', color: 'oklch(0.58 0.17 25)' },
  neutral: { label: 'Semleges', desc: 'Normál fogyasztás.', color: 'var(--color-neutral-300)' },
};

function renderKlimaPlan(container, curH) {
  const phases = [];
  for (let h = 0; h < 24; h++) phases.push({ h, phase: klimaPhase(h) });

  // Group consecutive same phases
  const groups = [];
  let cur = null;
  for (const { h, phase } of phases) {
    if (cur && cur.phase === phase) { cur.end = h + 1; }
    else { cur = { phase, start: h, end: h + 1 }; groups.push(cur); }
  }

  const cfg = KLIMA_PHASES;
  const rows = groups.map(g => {
    const c = cfg[g.phase];
    const isCur = curH >= g.start && curH < g.end;
    return `<div class="plan-row" ${isCur ? 'style="background:color-mix(in srgb,var(--color-accent) 6%,transparent);border-radius:8px"' : ''}>
      <div class="plan-bar" style="background:${c.color}"></div>
      <div class="plan-info">
        <div class="plan-phase">${c.label}</div>
        <div class="plan-desc">${c.desc}</div>
      </div>
      <div class="plan-time">${String(g.start).padStart(2,'0')}–${String(g.end % 24).padStart(2,'0')}</div>
    </div>`;
  }).join('');

  container.innerHTML = `<div class="plan-card">${rows}
    <p class="plan-tip text-muted">Tipp: az előhűtéses stratégiával akár 30% klímaenergiát spórolhatsz csúcsnapokon.</p>
  </div>`;
}

function renderNapelemPlan(container, curH) {
  const phases = [];
  for (let h = 0; h < 24; h++) phases.push({ h, phase: napelemPhase(h) });

  const groups = [];
  let cur = null;
  for (const { h, phase } of phases) {
    if (cur && cur.phase === phase) { cur.end = h + 1; }
    else { cur = { phase, start: h, end: h + 1 }; groups.push(cur); }
  }

  const cfg = NAPELEM_PHASES;
  const rows = groups.map(g => {
    const c = cfg[g.phase];
    const isCur = curH >= g.start && curH < g.end;
    return `<div class="plan-row" ${isCur ? 'style="background:color-mix(in srgb,var(--color-accent) 6%,transparent);border-radius:8px"' : ''}>
      <div class="plan-bar" style="background:${c.color}"></div>
      <div class="plan-info">
        <div class="plan-phase">${c.label}</div>
        <div class="plan-desc">${c.desc}</div>
      </div>
      <div class="plan-time">${String(g.start).padStart(2,'0')}–${String(g.end % 24).padStart(2,'0')}</div>
    </div>`;
  }).join('');

  container.innerHTML = `<div class="plan-card">${rows}
    <p class="plan-tip text-muted">Tipp: 10–14h között futtasd a mosógépet, mosogatógépet — a napelem csúcsteljesítményén ingyen megy.</p>
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
  S.obsStep = 1;
  S.obsDevices = [];
  S.obsTariff = 'rezsi';
  S.obsFlex = 'elore';
  buildObsDeviceGrid();
  buildObsTariffGrid();
  buildObsFlexGrid();
  showObsStep(1);
  el('onboardingOverlay').classList.remove('hidden');
}

function closeOnboarding() {
  el('onboardingOverlay').classList.add('hidden');
}

function obsNext(step) {
  if (step === 2) {
    const amt = calcOnboardingSavings();
    S.savedAmt = amt;
    el('obsResultAmt').textContent = fmt(amt);
    const tariffLabels = { rezsi: 'Rezsivédett tarifán', htnt: 'HT/NT tarifán', piaci: 'Piaci tarifán' };
    const flexLabels = { elore: 'előre tervező', nha: 'néha rugalmas', nehez: 'nehézkes' };
    el('obsResultDesc').textContent = `${tariffLabels[S.obsTariff]}, ${flexLabels[S.obsFlex] || ''} háztartásra becsült éves megtakarítás a kiválasztott eszközök okos időzítésével.`;
    updateKpi(amt);
  }
  showObsStep(step + 1);
}

function obsBack(step) { showObsStep(step - 1); }

function showObsStep(step) {
  [1, 2, 3].forEach(s => el(`obs${s}`).style.display = s === step ? '' : 'none');
  S.obsStep = step;
}

function obsDone() {
  closeOnboarding();
  setTab('ma');
}

function calcOnboardingSavings() {
  const tariffMult = { rezsi: 0.45, htnt: 1.0, piaci: 1.3 }[S.obsTariff] || 1;
  const flexMult = { elore: 1.0, nha: 0.7, nehez: 0.4 }[S.obsFlex] || 1;
  const total = S.obsDevices.reduce((sum, id) => {
    const d = DEVICES.find(d => d.id === id);
    return sum + (d ? d.annualSave : 0);
  }, 0);
  return Math.round(total * tariffMult * flexMult);
}

function buildObsDeviceGrid() {
  const grid = el('obsDeviceGrid');
  grid.innerHTML = DEVICES.map(d => {
    const sel = S.obsDevices.includes(d.id);
    return `<button class="chip-btn ${sel ? 'sel' : ''}" onclick="toggleObs('${d.id}')"
      style="flex-direction:column;align-items:flex-start;padding:10px 12px;min-height:52px">
      <strong style="font-size:13px">${d.label}</strong>
    </button>`;
  }).join('');
}

function buildObsTariffGrid() {
  const opts = [
    { id: 'rezsi', label: 'Rezsivédett' },
    { id: 'htnt',  label: 'HT / NT' },
    { id: 'piaci', label: 'Piaci' },
  ];
  el('obsTariffGrid').innerHTML = opts.map(o => {
    const sel = S.obsTariff === o.id;
    return `<button class="chip-btn ${sel ? 'sel' : ''}" onclick="setObsTariff('${o.id}')">${o.label}</button>`;
  }).join('');
}

function buildObsFlexGrid() {
  const opts = [
    { id: 'elore', label: 'Előre tervezem' },
    { id: 'nha',   label: 'Néha igen' },
    { id: 'nehez', label: 'Nehézkes' },
    { id: 'auto',  label: 'Automatizálom' },
  ];
  el('obsFlexGrid').innerHTML = opts.map(o => {
    const sel = S.obsFlex === o.id;
    return `<button class="chip-btn ${sel ? 'sel' : ''}" onclick="setObsFlex('${o.id}')">${o.label}</button>`;
  }).join('');
}


function toggleObs(id) {
  if (S.obsDevices.includes(id)) S.obsDevices = S.obsDevices.filter(x => x !== id);
  else S.obsDevices.push(id);
  buildObsDeviceGrid();
}

function setObsTariff(v) { S.obsTariff = v; buildObsTariffGrid(); }
function setObsFlex(v) { S.obsFlex = v; buildObsFlexGrid(); }

// ── Advisor sheet ──────────────────────────────────────────────────────
function openAdvisor() {
  S.advStep = 1;
  S.advDevices = [];
  buildAdvStep1();
  buildAdvStep2();
  buildAdvStep3Tariff();
  buildAdvStep4();
  showAdvStep(1);
  el('advisorOverlay').classList.remove('hidden');
}

function closeAdvisor() { el('advisorOverlay').classList.add('hidden'); }

function advNext(step) {
  if (step === 3) {
    S.advBill = parseInt(el('advBill')?.value) || 15000;
  }
  if (step === 4) {
    buildAdvResults();
  }
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
  const homes = [{ id: 'haz', label: 'Ház' }, { id: 'tegla', label: 'Tégla lakás' }, { id: 'panel', label: 'Panel lakás' }];
  el('advHomeGrid').innerHTML = homes.map(o => {
    const sel = S.advHome === o.id;
    return `<button class="chip-btn ${sel ? 'sel' : ''}" onclick="setAdv('advHome','${o.id}')">${o.label}</button>`;
  }).join('');

  const areas = [{ id: 'm40', label: 'max 40 m²' }, { id: 'm60', label: '40–80 m²' }, { id: 'm100', label: '80–120 m²' }, { id: 'm100p', label: '120 m² felett' }];
  el('advAreaGrid').innerHTML = areas.map(o => {
    const sel = S.advArea === o.id;
    return `<button class="chip-btn ${sel ? 'sel' : ''}" onclick="setAdv('advArea','${o.id}')">${o.label}</button>`;
  }).join('');

  const heats = [{ id: 'gaz', label: 'Gáz' }, { id: 'hoszivattyu', label: 'Hőszivattyú' }, { id: 'elektromos', label: 'Elektromos' }, { id: 'tavfutes', label: 'Távfűtés' }];
  el('advHeatGrid').innerHTML = heats.map(o => {
    const sel = S.advHeat === o.id;
    return `<button class="chip-btn ${sel ? 'sel' : ''}" onclick="setAdv('advHeat','${o.id}')">${o.label}</button>`;
  }).join('');
}

function buildAdvStep2() {
  el('advDeviceGrid').innerHTML = DEVICES.map(d => {
    const sel = S.advDevices.includes(d.id);
    return `<button class="chip-btn ${sel ? 'sel' : ''}" onclick="toggleAdv('${d.id}')">${d.label}</button>`;
  }).join('');
}

function buildAdvStep3Tariff() {
  const opts = [{ id: 'rezsi', label: 'Rezsivédett' }, { id: 'htnt', label: 'HT / NT' }, { id: 'piaci', label: 'Piaci' }];
  const grid = el('advTariffGrid');
  if (!grid) return;
  grid.innerHTML = opts.map(o => {
    const sel = S.advTariff === o.id;
    return `<button class="chip-btn ${sel ? 'sel' : ''}" onclick="setAdv('advTariff','${o.id}')">${o.label}</button>`;
  }).join('');
}

function buildAdvStep4() {
  const budgets = [
    { id: 'zero',      label: '0 Ft',       sub: 'Csak ingyenes megoldások' },
    { id: 'k100',      label: '~100 000 Ft', sub: 'Kis beruházás' },
    { id: 'k500',      label: '~500 000 Ft', sub: 'Közepes beruházás' },
    { id: 'barmennyi', label: 'Bármennyi',   sub: 'Maximális megtakarítás' },
  ];
  el('advBudgetGrid').innerHTML = budgets.map(o => {
    const sel = S.advBudget === o.id;
    return `<button class="chip-btn budget-chip ${sel ? 'sel' : ''}" onclick="setAdv('advBudget','${o.id}')">
      <strong>${o.label}</strong><span class="sub">${o.sub}</span>
    </button>`;
  }).join('');

  const prios = [{ id: 'sporolas', label: 'Spórolás' }, { id: 'gyors', label: 'Gyors megtérülés' }, { id: 'kornyezet', label: 'Környezet' }, { id: 'kenyelem', label: 'Kényelem' }];
  el('advPriorityGrid').innerHTML = prios.map(o => {
    const sel = S.advPriority === o.id;
    return `<button class="chip-btn ${sel ? 'sel' : ''}" onclick="setAdv('advPriority','${o.id}')">${o.label}</button>`;
  }).join('');
}

function buildAdvResults() {
  const budgetMax = { zero: 0, k100: 100000, k500: 500000, barmennyi: Infinity }[S.advBudget] ?? Infinity;

  const recs = ADVISOR_RECS
    .filter(r => {
      const costOk = (r.cost ?? 0) <= budgetMax;
      const condOk = r.cond(S.advDevices, S.advTariff, S.advHeat, S.advHome);
      return costOk && condOk;
    })
    .sort((a, b) => {
      const pa = b.prio.includes(S.advPriority) ? 1 : 0;
      const pb = a.prio.includes(S.advPriority) ? 1 : 0;
      if (pa !== pb) return pb - pa;
      return b.save - a.save;
    })
    .slice(0, 5);

  const totalSave = recs.reduce((s, r) => s + r.save, 0);
  el('advSummary').textContent = `${recs.length} személyre szabott ajánlás, összesen ~${fmt(totalSave)} Ft/év becsült megtakarítás.`;

  el('advRecsList').innerHTML = recs.map((r, i) => `
    <div class="rec-card">
      <div class="rec-card-top">
        <strong>${i + 1}. ${r.label}</strong>
        <span class="tag tag-acc" style="font-size:10px;white-space:nowrap">${r.costLabel}</span>
      </div>
      <p class="rec-desc">${r.desc}</p>
      <div class="rec-save">~${fmt(r.save)} Ft / év megtakarítás</div>
    </div>`).join('');
}

function setAdv(key, val) {
  S[key] = val;
  if (key === 'advHome' || key === 'advArea' || key === 'advHeat') buildAdvStep1();
  if (key === 'advTariff') buildAdvStep3Tariff();
  if (key === 'advBudget' || key === 'advPriority') buildAdvStep4();
}

function toggleAdv(id) {
  if (S.advDevices.includes(id)) S.advDevices = S.advDevices.filter(x => x !== id);
  else S.advDevices.push(id);
  buildAdvStep2();
}

// ── Data loading ───────────────────────────────────────────────────────
async function loadPrices() {
  try {
    const res = await fetch('/api/forecast?history_days=7&forecast_days=2');
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    S.prices = data.prices || [];
    return S.prices;
  } catch (e) {
    // Fallback: generate demo prices
    const base = new Date();
    base.setMinutes(0, 0, 0);
    S.prices = [];
    for (let i = -2; i < 46; i++) {
      const ts = new Date(base.getTime() + i * 3600000);
      // Sinusoidal pattern with noise
      const h = ts.getHours();
      const peak = h >= 17 && h <= 21;
      const night = h >= 22 || h < 6;
      let p = 35 + 15 * Math.sin((h / 24) * Math.PI * 2 - 1) + (Math.random() - 0.5) * 8;
      if (peak) p += 15;
      if (night) p -= 10;
      p = Math.max(10, p);
      S.prices.push({ timestamp: ts.toISOString(), price_huf_kwh: parseFloat(p.toFixed(2)), is_forecast: i >= 0 });
    }
    return S.prices;
  }
}

// ── Boot ───────────────────────────────────────────────────────────────
async function init() {
  // HT/NT calculator live update
  ['htntKwh', 'htntPct'].forEach(id => {
    const inp = el(id);
    if (inp) inp.addEventListener('input', updateHtnt);
  });

  // Advisor step 3 tariff grid (rendered lazily when sheet opens)
  document.getElementById('adv3')?.addEventListener('animationstart', buildAdvStep3Tariff);

  const prices = await loadPrices();

  if (prices.length) {
    renderHero(prices);
    renderDeviceGrid(prices);
  }

  // Default savings estimate (all devices, htnt tariff, moderate flex)
  const defaultSave = DEVICES.slice(0, 6).reduce((s, d) => s + d.annualSave, 0) * 0.7;
  S.savedAmt = defaultSave;

  updateHtnt();
  renderPlan();

  // Re-render every minute to update current hour
  setInterval(async () => {
    const fresh = await loadPrices();
    if (fresh.length) {
      renderHero(fresh);
      renderDeviceGrid(fresh);
      if (S.tab === 'arak') { renderHeatmap(); renderBarChart(); }
      if (S.tab === 'tervek') renderPlan();
    }
  }, 60000);
}

document.addEventListener('DOMContentLoaded', init);
