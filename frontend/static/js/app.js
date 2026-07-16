/* =====================================================================
   Energia Optimalizáló — app.js v5
   Mobil-first, okos döntési UI
   ===================================================================== */

'use strict';

// -----------------------------------------------------------------------
// ÁLLAPOT
// -----------------------------------------------------------------------
let _forecastData      = null;
let _devices           = [];
let _statusData        = null;
let _summaryData       = null;
let _userProfile       = null;
let _priceChart        = null;
let _hourlyChart       = null;
let _chartJsLoaded     = false;
let _expertOpen        = false;
let _coachStep         = 0;
let _countdownInterval = null;
let _countdownTarget   = null;

// Coach marks lépések
const COACH_STEPS = [
  {
    targetId: 'heroSection',
    icon: '',
    title: 'Az aktuális ár',
    text: 'Ez az oldal jobb oldalán látható szám mutatja, mennyibe kerül most 1 kWh áram. Zöld = olcsó, sárga = átlagos, piros = drága.',
    position: 'below',
  },
  {
    targetId: 'deviceSection',
    icon: '',
    title: 'Mikor kapcsold be?',
    text: 'Minden kártyán pontosan megírjuk: most indítsd el, vagy mennyit várj. Zöld kártya = mehet most, sárga = érdemes várni.',
    position: 'below',
  },
  {
    targetId: 'kpiSection',
    icon: '',
    title: 'Mennyi pénzt spórolsz?',
    text: 'Ez a szekció megmutatja, mennyit takaríthatsz meg évente, ha követed az ajánlásokat. Akár 100 000 Ft+ is lehetséges!',
    position: 'above',
  },
  {
    targetId: 'htntSection',
    icon: '',
    title: 'A legnagyobb megtakarítás',
    text: 'Ha HT/NT (kétmérős) mérőd van vagy lesz, azzal spórolhatsz a legtöbbet. Kérd ingyen a hálózati elosztódtól!',
    position: 'above',
  },
];

// Közösségi widget alap megtakarítás / háztartás (Ft/év) — az eszközprofilok összeadva
const COMMUNITY_BASE_SAVING_PER_HH = 15000;  // konzervatív átlag
const COMMUNITY_CO2_KG_PER_HH      = 35;     // kg CO2/év megtakarítás

// -----------------------------------------------------------------------
// MAGYAR ENERGIAÁR-KONSTANSOK (2024, tájékoztató, bruttó ÁFÁ-val)
// Forrás: MEKH határozatok, elosztói díjszabások, E.ON/NKM/Elmű piaci ajánlatok
// -----------------------------------------------------------------------

// ÁLLANDÓ DÍJKOMPONENSEK — ezek az időzítéstől FÜGGETLENÜL fizetendők (bruttó, ÁFÁ-val)
// Forrás: MEKH díjhatározatok, MAVIR ÁROD-tarifa, elosztói üzletszabályzatok (2024)
const FIXED = {
  erosd_huf_kwh:      9.5,   // Elosztói hálózathasználati díj (EROSD) — kisfeszültségű átlag
                              // (elosztónként eltér: E.ON ~8,5 / Elmű ~8,2 / NKM ~9,2 Ft/kWh)
  arod_huf_kwh:       3.0,   // Átviteli hálózathasználati díj (MAVIR ÁROD, A-tarifa)
  kat_metaar_huf_kwh: 2.1,   // KÁT/METÁR megújuló-támogatási pótdíj (MEKH éves határozat)
  rssd_huf_kwh:       0.9,   // Rendszerszintű szolgáltatások díja
  vea_afa_huf_kwh:    3.94,  // VEA: 3,1 Ft/kWh nettó × 1,27 ÁFA = 3,937 → 3,94 Ft/kWh
  total_huf_kwh:      19.44, // Fix stack összesen (9,5+3,0+2,1+0,9+3,94)
};

// ENERGIA-KOMPONENSEK tarifonként (bruttó) — ez változik az időzítéssel
// Forrás: 192/2022. (VI.4.) Korm. rendelet (rezsivédett), piaci ajánlatok átlaga (HT/NT)
const ENERGY = {
  regulated_huf_kwh:  26.74, // Rezsivédett energia-ár = 46,18 − 19,44 Ft/kWh
  ht_huf_kwh:         55.56, // Piaci HT energia = 75,0 − 19,44 Ft/kWh
  nt_huf_kwh:         25.56, // Piaci NT energia = 45,0 − 19,44 Ft/kWh
  ht_nt_diff_huf_kwh: 30.0,  // HT→NT energia-megtakarítás (fix, tarifafüggő)
};

// TELJES DÍJAK (energia + FIXED.total), bruttó, ÁFÁ-val
const TOTAL = {
  regulated_huf_kwh: 46.18, // 192/2022. Korm. rendelet: 36,36 Ft/kWh nettó × 1,27 = 46,18
  ht_huf_kwh:        75.0,  // Piaci HT teljes ár (tájékoztató átlag, 2024)
  nt_huf_kwh:        45.0,  // Piaci NT teljes ár (tájékoztató átlag, 2024)
};

// ÁLLAMI SZUBVENCIÓ küszöbe: az állam azt kompenzálja, ha a tőzsdei ENERGIA-ÁR
// (nem a teljes ár!) meghaladja a rezsivédett ENERGIA-ÁRat.
// Almát almával: wholesale energia (Ft/kWh) vs. szabályozott energia (Ft/kWh)
const SUBSIDY_ENERGY_THRESHOLD_HUF_KWH = ENERGY.regulated_huf_kwh; // 26,74 Ft/kWh

// -----------------------------------------------------------------------
// COACH MARKS — végigvezetési élmény
// -----------------------------------------------------------------------
function initCoachMarks() {
  if (localStorage.getItem('energia_tour_done')) return;
  setTimeout(startCoachTour, 1800);
}

function startCoachTour() {
  _coachStep = 0;
  window.scrollTo({ top: 0, behavior: 'instant' });
  const overlay = el('coachOverlay');
  if (overlay) overlay.classList.remove('hidden');
  showCoachStep(_coachStep);
}

function showCoachStep(step) {
  const steps = COACH_STEPS;
  if (step >= steps.length) { finishCoachTour(); return; }

  const cfg       = steps[step];
  const target    = el(cfg.targetId);
  const spotlight = el('coachSpotlight');
  const bubble    = el('coachBubble');
  const stepLabel = el('coachStepLabel');
  const icon      = el('coachIcon');
  const title     = el('coachTitle');
  const text      = el('coachText');
  const nextBtn   = el('coachNextBtn');
  if (!target || !spotlight || !bubble) return;

  // Unlock scroll, scroll element to just below header (80px), re-lock
  document.body.classList.remove('coach-active');
  const docTop = target.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({ top: Math.max(0, docTop - 90), behavior: 'instant' });
  document.body.classList.add('coach-active');

  const rect = target.getBoundingClientRect();
  const pad  = 8;
  const vw   = Math.max(window.innerWidth,  document.documentElement.clientWidth)  || 390;
  const vh   = Math.max(window.innerHeight, document.documentElement.clientHeight) || 800;

  // Spotlight
  spotlight.style.left   = `${rect.left - pad}px`;
  spotlight.style.top    = `${rect.top  - pad}px`;
  spotlight.style.width  = `${rect.width  + pad * 2}px`;
  spotlight.style.height = `${rect.height + pad * 2}px`;

  // Bubble sizing
  const bubbleW  = Math.min(300, vw - 24);
  const maxBubH  = Math.max(200, Math.round(vh * 0.45));  // min 200px fallback
  bubble.style.maxHeight = `${maxBubH}px`;
  bubble.style.width     = `${bubbleW}px`;

  // Horizontal position: align with target, clamped to viewport
  const bubbleLeft = Math.max(12, Math.min(rect.left, vw - bubbleW - 12));
  bubble.style.left = `${bubbleLeft}px`;

  // Vertical: prefer below, flip above if needed, clamp to viewport
  const measuredH  = 240;  // conservative estimate
  let bubbleTop;
  if (cfg.position === 'above' || (rect.bottom + measuredH + 16 > vh)) {
    bubbleTop = rect.top - measuredH - 12;
  } else {
    bubbleTop = rect.bottom + 12;
  }
  bubbleTop = Math.max(8, Math.min(bubbleTop, vh - measuredH - 8));
  bubble.style.top = `${bubbleTop}px`;

  // Content
  if (stepLabel) stepLabel.textContent = `${step + 1} / ${steps.length}`;
  if (icon)      icon.textContent      = cfg.icon;
  if (title)     title.textContent     = cfg.title;
  if (text)      text.textContent      = cfg.text;
  if (nextBtn)   nextBtn.textContent   = step < steps.length - 1 ? 'Következő →' : 'Értem, kezdjük!';
}

function nextCoachStep() {
  _coachStep++;
  if (_coachStep >= COACH_STEPS.length) { finishCoachTour(); return; }
  showCoachStep(_coachStep);
}

function skipCoachMarks() { finishCoachTour(); }

function finishCoachTour() {
  localStorage.setItem('energia_tour_done', '1');
  document.body.classList.remove('coach-active');
  const overlay = el('coachOverlay');
  if (overlay) overlay.classList.add('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// -----------------------------------------------------------------------
// VISSZASZÁMLÁLÓ — következő olcsó ablakig
// -----------------------------------------------------------------------
function initCountdown(prices) {
  if (_countdownInterval) clearInterval(_countdownInterval);
  const countdownEl = el('heroCountdown');
  const timeEl      = el('countdownTime');
  const labelEl     = el('countdownLabel');
  if (!countdownEl || !timeEl || !prices) return;

  const now  = new Date();
  // Keressük a legközelebbi is_cheap = true órát a jövőben
  const next = prices.find(p => new Date(p.timestamp) > now && p.is_cheap);
  // Ha most is olcsó, keressük az első nem-olcsó majd ismét olcsó időpontot
  const currentCheap = prices.find(p => {
    const ts = new Date(p.timestamp);
    return ts <= now && ts > new Date(now - 3600000) && p.is_cheap;
  });

  if (currentCheap) {
    // Most olcsó — megmutatjuk meddig tart
    const nextExp = prices.find(p => new Date(p.timestamp) > now && !p.is_cheap);
    if (nextExp) {
      _countdownTarget = new Date(nextExp.timestamp);
      if (labelEl) labelEl.textContent = 'Olcsó időszak még';
      countdownEl.classList.remove('hidden');
      countdownEl.classList.add('countdown-cheap');
    }
  } else if (next) {
    _countdownTarget = new Date(next.timestamp);
    if (labelEl) labelEl.textContent = 'Olcsóbb ár';
    countdownEl.classList.remove('hidden');
    countdownEl.classList.remove('countdown-cheap');
  } else {
    countdownEl.classList.add('hidden');
    return;
  }

  function tick() {
    const diff = _countdownTarget - new Date();
    if (diff <= 0) {
      clearInterval(_countdownInterval);
      countdownEl.classList.add('hidden');
      return;
    }
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    if (timeEl) timeEl.textContent =
      `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }
  tick();
  _countdownInterval = setInterval(tick, 1000);
}

// -----------------------------------------------------------------------
// KETTŐS MEGTAKARÍTÁS-SZÁMÍTÁS (kliens oldal)
// -----------------------------------------------------------------------
function computeSavingsBreakdown(worstHufMwh, bestHufMwh, powerKw, hours) {
  const energyKwh  = powerKw * hours;

  // Tőzsdei energia-ár bruttóban (Ft/kWh) — nettó wholesale × EUR/HUF / 1000
  // Megjegyzés: a tőzsdei ár az energia-komponenst jelenti, nem tartalmazza
  // a hálózati díjat és az adókat — ezért a FIXED stackkel kell összehasonlítani
  const peakEnKwh    = worstHufMwh / 1000;
  const offpeakEnKwh = bestHufMwh  / 1000;
  const wholeDiffKwh = Math.max(0, peakEnKwh - offpeakEnKwh);

  // --- LAKOS (HT/NT kétmérős) ---
  // Csak az energia-komponens változik, a ~19.4 Ft/kWh fix stack nem
  const htntEnergyDiff  = ENERGY.ht_nt_diff_huf_kwh;   // 30 Ft/kWh
  const residentHtntDaily  = htntEnergyDiff * energyKwh;
  const residentHtntAnnual = residentHtntDaily * 365;

  // --- LAKOS (piaci, tőzsdei alapú) ---
  const residentMarketDaily  = wholeDiffKwh * energyKwh;
  const residentMarketAnnual = residentMarketDaily * 365;

  // --- ÁLLAM (szubvenció-csökkentés) ---
  // Az állam akkor fizet, ha tőzsdei energia-ár > rezsivédett energia-ár (27.1 Ft/kWh)
  const subsidyPeak    = Math.max(0, peakEnKwh    - SUBSIDY_ENERGY_THRESHOLD_HUF_KWH) * energyKwh;
  const subsidyOffpeak = Math.max(0, offpeakEnKwh - SUBSIDY_ENERGY_THRESHOLD_HUF_KWH) * energyKwh;
  const stateSubsidyDaily  = Math.max(0, subsidyPeak - subsidyOffpeak);
  const stateSubsidyAnnual = stateSubsidyDaily * 365;

  return {
    residentHtntDaily, residentHtntAnnual,
    residentMarketDaily, residentMarketAnnual,
    stateSubsidyDaily, stateSubsidyAnnual,
    peakEnKwh, offpeakEnKwh, wholeDiffKwh,
    fixedStackHufKwh: FIXED.total_huf_kwh,
  };
}

// -----------------------------------------------------------------------
// DÍJÖSSZETÉTEL VIZUALIZÁCIÓ
// -----------------------------------------------------------------------
function renderPriceBreakdown(currentWholesaleHufMwh) {
  const wrap = el('priceBreakdown');
  if (!wrap) return;

  const maxBar = TOTAL.ht_huf_kwh; // 75 Ft/kWh — a referencia maximum

  // Aktuális tőzsdei ár bruttóban (energia-komponens becslése)
  const curEn = currentWholesaleHufMwh != null ? currentWholesaleHufMwh / 1000 : null;
  const curTotal = curEn != null ? curEn + FIXED.total_huf_kwh : null;

  function bar(energyHuf, label, colorClass, note, showSaving) {
    const totalHuf   = energyHuf + FIXED.total_huf_kwh;
    const fixedPct   = (FIXED.total_huf_kwh / maxBar * 100).toFixed(1);
    const energyPct  = (energyHuf / maxBar * 100).toFixed(1);

    const fixedBreak = `
      <div class="pb-bar-seg pb-seg-network"  style="width:${(FIXED.erosd_huf_kwh/maxBar*100).toFixed(1)}%" title="Elosztói hálózat (EROSD): ${FIXED.erosd_huf_kwh} Ft/kWh"></div>
      <div class="pb-bar-seg pb-seg-trans"    style="width:${(FIXED.arod_huf_kwh/maxBar*100).toFixed(1)}%"  title="Átviteli hálózat (ÁROD): ${FIXED.arod_huf_kwh} Ft/kWh"></div>
      <div class="pb-bar-seg pb-seg-kat"      style="width:${(FIXED.kat_metaar_huf_kwh/maxBar*100).toFixed(1)}%" title="KÁT/METÁR pótdíj: ${FIXED.kat_metaar_huf_kwh} Ft/kWh"></div>
      <div class="pb-bar-seg pb-seg-rssd"     style="width:${(FIXED.rssd_huf_kwh/maxBar*100).toFixed(1)}%" title="Rendszerszintű szolg.: ${FIXED.rssd_huf_kwh} Ft/kWh"></div>
      <div class="pb-bar-seg pb-seg-vea"      style="width:${(FIXED.vea_afa_huf_kwh/maxBar*100).toFixed(1)}%" title="VEA + ÁFA: ${FIXED.vea_afa_huf_kwh} Ft/kWh"></div>`;

    const savingHtml = showSaving ? `
      <div class="pb-saving-arrow">
        <span class="pb-saving-label">Időzítéssel spórolható: <strong>30 Ft/kWh</strong> (csak az energia-kompomens)</span>
      </div>` : '';

    return `
      <div class="pb-row">
        <div class="pb-row-label">
          <span class="pb-tariff-name">${label}</span>
          <span class="pb-tariff-total">${totalHuf.toFixed(1)} Ft/kWh</span>
        </div>
        <div class="pb-bar-track">
          ${fixedBreak}
          <div class="pb-bar-seg ${colorClass}" style="width:${energyPct}%" title="Energia-ár: ${energyHuf.toFixed(1)} Ft/kWh"></div>
        </div>
        <div class="pb-row-note">${note}</div>
        ${savingHtml}
      </div>`;
  }

  const wholesaleRow = curEn != null ? `
    <div class="pb-row pb-row-live">
      <div class="pb-row-label">
        <span class="pb-tariff-name">Tőzsdei most <span class="badge-live-dot"></span></span>
        <span class="pb-tariff-total">${curTotal.toFixed(1)} Ft/kWh</span>
      </div>
      <div class="pb-bar-track">
        <div class="pb-bar-seg pb-seg-network"  style="width:${(FIXED.erosd_huf_kwh/maxBar*100).toFixed(1)}%"></div>
        <div class="pb-bar-seg pb-seg-trans"    style="width:${(FIXED.arod_huf_kwh/maxBar*100).toFixed(1)}%"></div>
        <div class="pb-bar-seg pb-seg-kat"      style="width:${(FIXED.kat_metaar_huf_kwh/maxBar*100).toFixed(1)}%"></div>
        <div class="pb-bar-seg pb-seg-rssd"     style="width:${(FIXED.rssd_huf_kwh/maxBar*100).toFixed(1)}%"></div>
        <div class="pb-bar-seg pb-seg-vea"      style="width:${(FIXED.vea_afa_huf_kwh/maxBar*100).toFixed(1)}%"></div>
        <div class="pb-bar-seg pb-seg-wholesale" style="width:${Math.min(curEn/maxBar*100,99).toFixed(1)}%" title="Tőzsdei energia-ár: ${curEn.toFixed(1)} Ft/kWh"></div>
      </div>
      <div class="pb-row-note">ENTSO-E spot ár + állandó díjak — ez a nagy-/ipari fogyasztók referenciája</div>
    </div>` : '';

  wrap.innerHTML = `
    <div class="pb-legend">
      <span class="pb-legend-item"><span class="pb-dot pb-seg-network"></span>Elosztói hálózat (EROSD) ${FIXED.erosd_huf_kwh} Ft</span>
      <span class="pb-legend-item"><span class="pb-dot pb-seg-trans"></span>Átviteli hálózat (ÁROD) ${FIXED.arod_huf_kwh} Ft</span>
      <span class="pb-legend-item"><span class="pb-dot pb-seg-kat"></span>KÁT/METÁR pótdíj ${FIXED.kat_metaar_huf_kwh} Ft</span>
      <span class="pb-legend-item"><span class="pb-dot pb-seg-rssd"></span>Rendszerszintű szolg. ${FIXED.rssd_huf_kwh} Ft</span>
      <span class="pb-legend-item"><span class="pb-dot pb-seg-vea"></span>VEA + ÁFA ${FIXED.vea_afa_huf_kwh} Ft</span>
      <span class="pb-legend-item"><span class="pb-dot pb-seg-energy-fixed"></span>Energia (rezsivédett/szabályozott)</span>
      <span class="pb-legend-item"><span class="pb-dot pb-seg-ht"></span>Energia (HT, nappal)</span>
      <span class="pb-legend-item"><span class="pb-dot pb-seg-nt"></span>Energia (NT, éjszaka/hétvége)</span>
    </div>

    <div class="pb-fixed-note">
      Állandó díjak összesen: <strong>${FIXED.total_huf_kwh} Ft/kWh</strong> — hálózat, megújuló-pótdíj, adók.
      Ezt fizeted akkor is, ha nappal, akkor is, ha éjszaka kapcsolod be a mosógépet.
    </div>

    <div class="pb-bars">
      ${bar(ENERGY.regulated_huf_kwh, 'Rezsivédett (első 210 kWh/hó)', 'pb-seg-energy-fixed',
            'Fix, szabályozott ár — az időzítés NEM segít, mindegy mikor fogyasztod', false)}
      ${bar(ENERGY.ht_huf_kwh, 'Piaci HT (hétköznap nappal)', 'pb-seg-ht',
            'Drágább sáv — hétköznap 06:00–22:00', false)}
      ${bar(ENERGY.nt_huf_kwh, 'Piaci NT (éjszaka, hétvége)', 'pb-seg-nt',
            'Olcsóbb sáv — 22:00–06:00 + szombat–vasárnap + ünnepnapok', true)}
      ${wholesaleRow}
    </div>

    <div class="pb-state-note">
      <strong>Állami szubvenció:</strong>
      Az állam akkor fizet pótlást a rezsivédett fogyasztóknak, ha a tőzsdei energia-ár
      meghaladja a rezsivédett energia-árat (<strong>${SUBSIDY_ENERGY_THRESHOLD_HUF_KWH} Ft/kWh</strong>).
      ${curEn != null
        ? curEn > SUBSIDY_ENERGY_THRESHOLD_HUF_KWH
          ? `Jelenleg: ${curEn.toFixed(1)} Ft/kWh tőzsdei ár — <span class="text-red">az állam fizet ${(curEn - SUBSIDY_ENERGY_THRESHOLD_HUF_KWH).toFixed(1)} Ft/kWh szubvenciót.</span>`
          : `Jelenleg: ${curEn.toFixed(1)} Ft/kWh tőzsdei ár — <span class="text-green">nincs szubvenció-igény, a tőzsde olcsóbb a rezsivédett árnál.</span>`
        : ''}
    </div>

    <p class="pb-disclaimer">
      Tájékoztató jellegű, bruttó (ÁFÁ-val) értékek.
      Forrás: MEKH díjszabások, elosztói üzletszabályzatok, piaci ajánlatok átlaga (2024).
      A tényleges díjak kereskedőnként és régiónként eltérhetnek.
    </p>`;
}

// -----------------------------------------------------------------------
// SEGÉDFÜGGVÉNYEK
// -----------------------------------------------------------------------
function fmtHUF(v) {
  return new Intl.NumberFormat('hu-HU').format(Math.round(v));
}

function fmtKwh(mwh) {
  // EUR/MWh → Ft/kWh konverzió (/ 1000 az MWh→kWh átváltás)
  return (mwh / 1000).toFixed(1);
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

function loadChartJs() {
  return new Promise((resolve, reject) => {
    if (_chartJsLoaded || typeof Chart !== 'undefined') {
      _chartJsLoaded = true;
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js';
    s.onload  = () => { _chartJsLoaded = true; resolve(); };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function el(id) { return document.getElementById(id); }

// -----------------------------------------------------------------------
// ONBOARDING
// -----------------------------------------------------------------------
function loadProfile() {
  const raw = localStorage.getItem('energia_profile');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function saveProfile(p) {
  localStorage.setItem('energia_profile', JSON.stringify(p));
  _userProfile = p;
}

function initOnboarding(devices) {
  // Chip-ek megjelenítése
  const wrap = el('deviceChips');
  if (wrap) {
    wrap.innerHTML = devices.map(d => `
      <div class="device-chip" data-id="${d.id}" data-action="toggle-device">
        <span>${d.name}</span>
      </div>`).join('');
  }

  // Ha már van profil, nem mutatjuk az onboardingot
  const profile = loadProfile();
  if (profile) {
    _userProfile = profile;
    return;
  }

  // Onboarding megjelenítés rövid késleltetéssel
  setTimeout(() => {
    const overlay = el('onboardingOverlay');
    if (overlay) overlay.classList.remove('hidden');
  }, 800);
}

function toggleDeviceChip(chip) {
  chip.classList.toggle('selected');
}

function selectFlex(chip) {
  document.querySelectorAll('[data-flex]').forEach(c => c.classList.remove('selected'));
  chip.classList.add('selected');
}

function selectTariff(chip) {
  document.querySelectorAll('[data-tariff]').forEach(c => c.classList.remove('selected'));
  chip.classList.add('selected');
}

function onboardingNext(step) {
  // Mentjük az aktuális lépés adatait
  if (step === 2) {
    const selected = [...document.querySelectorAll('.device-chip.selected[data-id]')].map(c => c.dataset.id);
    const flex    = (document.querySelector('.device-chip.selected[data-flex]')   || {}).dataset?.flex   || 'kozepes';
    const tariff  = (document.querySelector('.device-chip.selected[data-tariff]') || {}).dataset?.tariff || 'rezsi';

    _userProfile = { devices: selected, flexibility: flex, tariff };

    // Megtakarítás megjelenítés a 3. lépésben — tarifa-függő, statikus fallback azonnali megjelenítéssel
    const savEl   = el('onboardingSaving');
    const descEl  = el('onboardingSavingDesc');
    if (savEl) {
      if (selected.length === 0) {
        savEl.textContent = 'Válassz eszközt a számításhoz';
        if (descEl) descEl.textContent = '';
      } else if (tariff === 'rezsi') {
        // Rezsivédett: egységár, időzítés nem segít — mutassuk a HT/NT potenciált
        const htntMin = _devices.filter(d => selected.includes(d.id)).reduce((s, d) => s + d.annual_saving_min_huf, 0);
        const htntMax = _devices.filter(d => selected.includes(d.id)).reduce((s, d) => s + d.annual_saving_max_huf, 0);
        savEl.innerHTML = `${fmtHUF(htntMin)} – ${fmtHUF(htntMax)} Ft <span class="source-badge badge-estimated">BECSÜLT</span>`;
        if (descEl) descEl.innerHTML = `<span style="color:var(--yellow)">Rezsivédett (egységáras) tarifán az időzítés önmagában nem csökkenti a számlát.</span><br>
          Ennyit spórolhatnál, <strong>ha kétmérős HT/NT tarifára váltanál.</strong>`;
      } else {
        const totalMin = _devices.filter(d => selected.includes(d.id)).reduce((s, d) => s + d.annual_saving_min_huf, 0);
        const totalMax = _devices.filter(d => selected.includes(d.id)).reduce((s, d) => s + d.annual_saving_max_huf, 0);
        savEl.innerHTML = `${fmtHUF(totalMin)} – ${fmtHUF(totalMax)} Ft <span class="source-badge badge-estimated">BECSÜLT</span>`;
        if (descEl) descEl.textContent = tariff === 'htnt'
          ? 'Ez a HT (nappal) → NT (éjszaka/hétvége) áttöltéssel elérhető megtakarítás.'
          : 'Tőzsdei fogyasztóként az ENTSO-E csúcs–völgy különbségből adódó megtakarítás.';
      }

      // Élő ajánlás lekérése háttérben — ha sikeres, felváltja a statikus becslést
      if (selected.length > 0) {
        fetchRecommendForOnboarding(selected, tariff, savEl, descEl);
      }
    }
  }

  // Lépésváltás
  document.querySelectorAll('.onboarding-step').forEach((s, i) => {
    s.classList.toggle('active', i === step);
  });
  document.querySelectorAll('.progress-dot').forEach((d, i) => {
    d.classList.toggle('done', i < step);
    d.classList.toggle('active', i === step);
  });
}

function onboardingBack(step) {
  onboardingNext(step);
}

function finishOnboarding() {
  if (_userProfile) saveProfile(_userProfile);
  const overlay = el('onboardingOverlay');
  if (overlay) overlay.classList.add('hidden');
  updateKPIs();
  updateHeroHint();
}

function skipOnboarding() {
  saveProfile({ devices: [], flexibility: 'kozepes' });
  const overlay = el('onboardingOverlay');
  if (overlay) overlay.classList.add('hidden');
}

// -----------------------------------------------------------------------
// HERO STÁTUSZ CHIP
// -----------------------------------------------------------------------
function renderHero(status) {
  const chip     = el('statusChip');
  const dot      = el('statusDot');
  const label    = el('statusChipLabel');
  const hero     = el('heroSection');
  const title    = el('heroTitle');
  const subtitle = el('heroSubtitle');
  const priceEl  = el('currentPrice');

  if (!status) return;

  if (chip) {
    chip.className = `status-chip chip-${status.status}`;
    const labels = { green: 'Most olcsó', yellow: 'Átlagos ár', red: 'Drága most' };
    if (label) label.textContent = labels[status.status] || 'Betöltés...';
  }

  if (hero) hero.className = `hero-section status-${status.status}`;
  if (title) title.textContent = status.title;
  if (subtitle) subtitle.textContent = status.subtitle;
  if (priceEl) priceEl.textContent = status.current_price_huf_kwh !== undefined
    ? status.current_price_huf_kwh.toFixed(1)
    : '—';
}

// -----------------------------------------------------------------------
// ESZKÖZKÁRTYÁK
// -----------------------------------------------------------------------
function computeDeviceRec(device, prices) {
  const now  = new Date();
  const n    = device.hours_per_use;

  // Következő 24 óra árai (előrejelzett + historikus ami jövőbeli)
  const next24 = prices
    .filter(p => new Date(p.timestamp) >= now)
    .slice(0, 24);

  if (next24.length < n) {
    return { action: 'unknown', hours: null, priceKwh: null };
  }

  // Legjobb n-órás ablak keresése
  let bestStart = 0;
  let bestAvg   = Infinity;

  for (let i = 0; i <= next24.length - n; i++) {
    const window = next24.slice(i, i + n);
    const avg = window.reduce((s, p) => s + p.price_huf_mwh, 0) / n;
    if (avg < bestAvg) {
      bestAvg   = avg;
      bestStart = i;
    }
  }

  // Legrosszabb n-órás ablak keresése
  let worstStart = 0;
  let worstAvg   = -Infinity;
  for (let i = 0; i <= next24.length - n; i++) {
    const win = next24.slice(i, i + n);
    const avg = win.reduce((s, p) => s + p.price_huf_mwh, 0) / n;
    if (avg > worstAvg) { worstAvg = avg; worstStart = i; }
  }

  const priceKwh = bestAvg / 1000;
  const bestTs   = new Date(next24[bestStart].timestamp);

  // Ha a legjobb ablak most (0-1 óra): "Indítsd el!"
  if (bestStart <= 1) {
    return { action: 'now', hours: 0, startHour: bestTs.getHours(), priceKwh,
             bestHufMwh: bestAvg, worstHufMwh: worstAvg };
  }

  return { action: 'wait', hours: bestStart, startHour: bestTs.getHours(), priceKwh,
           bestHufMwh: bestAvg, worstHufMwh: worstAvg };
}

function renderDeviceGrid(devices, prices) {
  const grid = el('deviceGrid');
  if (!grid) return;

  if (!prices || prices.length === 0) {
    grid.innerHTML = '<p class="empty-msg">Nincs áradat a javaslathoz.</p>';
    return;
  }

  const profile = _userProfile || loadProfile();
  const tariff  = profile ? (profile.tariff || 'rezsi') : 'rezsi';

  grid.innerHTML = devices.map(device => {
    const rec       = computeDeviceRec(device, prices);
    const isLowFlex = device.flexibility === 'low';

    // Action banner — ez a dominant vizuális elem
    let bannerClass, bannerIcon, bannerMain, bannerSub;
    if (isLowFlex) {
      bannerClass = 'action-hard';
      bannerIcon  = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="8" stroke="currentColor" stroke-width="1.5"/><path d="M9 6v4M9 12v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
      bannerMain  = 'Nehezebben időzíthető';
      bannerSub   = 'Inkább más eszközöket priorizálj';
    } else if (rec.action === 'now') {
      bannerClass = 'action-now';
      bannerIcon  = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 9l4.5 4.5L15 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      bannerMain  = 'Most indítsd el!';
      bannerSub   = 'Az árak most kedvezőek';
    } else if (rec.action === 'wait' && rec.hours !== null) {
      const h = rec.hours;
      bannerClass = 'action-wait';
      bannerIcon  = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7.5" stroke="currentColor" stroke-width="1.5"/><path d="M9 5v4l2.5 2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      bannerMain  = h === 1 ? 'Várj még 1 órát' : `Várj még ${h} órát`;
      bannerSub   = `${rec.startHour}:00-tól érdemes bekapcsolni`;
    } else {
      bannerClass = 'action-wait';
      bannerIcon  = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7.5" stroke="currentColor" stroke-width="1.5"/><path d="M9 5v4l2.5 2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      bannerMain  = 'Adat hamarosan';
      bannerSub   = '';
    }

    // Megtakarítás sor
    let savingHtml = '';
    if (rec.bestHufMwh != null && rec.worstHufMwh != null && rec.worstHufMwh > rec.bestHufMwh) {
      const bd = computeSavingsBreakdown(rec.worstHufMwh, rec.bestHufMwh, device.power_kw, device.hours_per_use);
      if (tariff === 'rezsi') {
        savingHtml = `<div class="device-saving-line muted">HT/NT tarifával: <strong>${fmtHUF(Math.round(bd.residentHtntAnnual))} Ft/év</strong></div>`;
      } else {
        const annual = tariff === 'piaci' ? bd.residentMarketAnnual : bd.residentHtntAnnual;
        savingHtml = `<div class="device-saving-line"><strong>${fmtHUF(Math.round(annual))} Ft/év</strong> megtakarítás</div>`;
      }
    } else {
      const avg = Math.round((device.annual_saving_min_huf + device.annual_saving_max_huf) / 2);
      savingHtml = `<div class="device-saving-line muted">kb. <strong>${fmtHUF(avg)} Ft/év</strong> spórolható</div>`;
    }

    const cardClass = (!isLowFlex && rec.action === 'now') ? 'device-card rec-now' : 'device-card';
    return `
      <div class="${cardClass}" aria-label="${device.name}">
        <div class="device-action-banner ${bannerClass}">
          <span class="action-banner-icon">${bannerIcon}</span>
          <div class="action-banner-text">
            <span class="action-banner-main">${bannerMain}</span>
            <span class="action-banner-sub">${bannerSub}</span>
          </div>
        </div>
        <div class="device-card-body">
          <div class="device-card-header">
            <span class="device-card-name">${device.name}</span>
          </div>
          ${savingHtml}
        </div>
      </div>`;
  }).join('');
}

// -----------------------------------------------------------------------
// 24 ÓRÁS HŐTÉRKÉP
// -----------------------------------------------------------------------
function renderHeatmap(prices) {
  const grid = el('heatmapGrid');
  if (!grid) return;

  const now = new Date();
  const currentHour = now.getHours();

  // Szűrjük a ma és holnap órákat (24 cella)
  // Elsősorban a tényleges mai dátum óráit keressük
  const today = new Date(now);
  today.setMinutes(0, 0, 0);

  const todayStr = today.toISOString().slice(0, 10);

  // Mai nap összes ára
  const todayPrices = prices
    .filter(p => p.timestamp.slice(0, 10) === todayStr)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  // Ha nincsenek mai árak, vegyük az összes aktuálistól számított következőt
  const displayPrices = todayPrices.length >= 12
    ? todayPrices
    : prices
        .filter(p => new Date(p.timestamp) >= new Date(today.getTime() - 2 * 3600000))
        .slice(0, 24);

  if (displayPrices.length === 0) {
    grid.innerHTML = '<div class="empty-msg">Nincs adat.</div>';
    return;
  }

  // Skálázás: min–max a megjelenített adatokra
  const vals = displayPrices.map(p => p.price_huf_mwh);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const range = maxV - minV || 1;

  const q33 = minV + range * 0.33;
  const q67 = minV + range * 0.67;

  grid.innerHTML = displayPrices.map(p => {
    const ts    = new Date(p.timestamp);
    const hour  = ts.getHours();
    const isCurrent = (ts.toISOString().slice(0, 10) === todayStr && hour === currentHour);

    // Szín
    let colorClass, colorHex;
    if (p.price_huf_mwh <= q33)   { colorClass = 'hm-cheap';     colorHex = '#3fb950'; }
    else if (p.price_huf_mwh >= q67) { colorClass = 'hm-expensive'; colorHex = '#f85149'; }
    else                           { colorClass = 'hm-normal';    colorHex = '#58a6ff'; }

    // Bar magassága: normalizált 20–56px
    const normalized = (p.price_huf_mwh - minV) / range;
    const barH = Math.round(20 + normalized * 36);

    const kwh = (p.price_huf_mwh / 1000).toFixed(1);
    const forecastTag = p.is_forecast ? ' [előrejelzés]' : '';

    return `
      <div class="heatmap-cell${isCurrent ? ' current-hour' : ''}" tabindex="0" role="button"
           aria-label="${hour}:00 — ${kwh} Ft/kWh">
        <div class="hm-bar ${colorClass}" style="height:${barH}px;background:${colorHex}${p.is_forecast ? '99' : 'cc'}"></div>
        <div class="hm-label">${String(hour).padStart(2, '0')}</div>
        <div class="hm-tooltip">${hour}:00${forecastTag}<br /><strong>${kwh} Ft/kWh</strong></div>
      </div>`;
  }).join('');
}

// -----------------------------------------------------------------------
// MEGTAKARÍTÁS KPI-K
// -----------------------------------------------------------------------
function updateKPIs() {
  const grid = el('kpiGrid');
  if (!grid) return;

  const profile = _userProfile || loadProfile();
  const selectedIds = profile ? profile.devices : [];

  let totalMin = 0;
  let totalMax = 0;
  let deviceCount = 0;

  if (selectedIds && selectedIds.length > 0 && _devices.length > 0) {
    _devices
      .filter(d => selectedIds.includes(d.id))
      .forEach(d => {
        totalMin += d.annual_saving_min_huf;
        totalMax += d.annual_saving_max_huf;
        deviceCount++;
      });
  } else if (_devices.length > 0) {
    // Ha nincs profil, átlag-becsléssel dolgozunk (bojler + mosógép)
    const defaults = ['bojler', 'mosogep'];
    _devices.filter(d => defaults.includes(d.id)).forEach(d => {
      totalMin += d.annual_saving_min_huf;
      totalMax += d.annual_saving_max_huf;
      deviceCount++;
    });
  }

  const subtitle = el('savingSubtitle');
  if (subtitle) {
    subtitle.textContent = deviceCount > 0
      ? `${deviceCount} kiválasztott eszköz alapján becsült megtakarítás okos időzítéssel.`
      : 'Becsült éves megtakarítás a leggyakoribb eszközökre (bojler + mosógép).';
  }

  // Ha van élő áradat, kettős számítást adunk
  const prices = _forecastData && _forecastData.prices;
  let residentAnnual = 0;
  let marketAnnual   = 0;
  let stateAnnual    = 0;
  let usedBreakdown  = false;

  const targetDevices = _devices.filter(d => selectedIds && selectedIds.length > 0
    ? selectedIds.includes(d.id)
    : ['bojler', 'mosogep'].includes(d.id));

  if (prices && prices.length > 0 && targetDevices.length > 0) {
    targetDevices.forEach(device => {
      const rec = computeDeviceRec(device, prices);
      if (rec.bestHufMwh != null && rec.worstHufMwh != null && rec.worstHufMwh > rec.bestHufMwh) {
        const bd = computeSavingsBreakdown(rec.worstHufMwh, rec.bestHufMwh, device.power_kw, device.hours_per_use);
        residentAnnual += bd.residentHtntAnnual;
        marketAnnual   += bd.residentMarketAnnual;
        stateAnnual    += bd.stateSubsidyAnnual;
        usedBreakdown   = true;
      }
    });
  }

  if (!usedBreakdown) {
    // Statikus fallback az eszközprofilokból
    const annualAvg  = Math.round((totalMin + totalMax) / 2);
    const monthlyAvg = Math.round(annualAvg / 12);
    grid.innerHTML = `
      <div class="kpi-card kpi-primary" data-source="estimated">
        <div class="kpi-label">Éves megtakarítás potenciál</div>
        <div class="kpi-value">${fmtHUF(totalMin)} – ${fmtHUF(totalMax)}</div>
        <div class="kpi-unit">Ft / év (becsült)</div>
        <span class="tariff-source">Forrás: MEKH 2024 szabályozott tarifa</span>
      </div>
      <div class="kpi-card" data-source="estimated">
        <div class="kpi-label">Havi átlag</div>
        <div class="kpi-value">${fmtHUF(monthlyAvg)}</div>
        <div class="kpi-unit">Ft / hó</div>
        <span class="tariff-source">Forrás: MEKH 2024 szabályozott tarifa</span>
      </div>
      <div class="kpi-card" data-source="estimated">
        <div class="kpi-label">Eszközök száma</div>
        <div class="kpi-value">${deviceCount || '2+'}</div>
        <div class="kpi-unit">optimalizálható</div>
      </div>`;
    return;
  }

  // Főgrid: tarifa-függő fő kártya
  const tariffKpi = (profile && profile.tariff) || 'rezsi';
  let kpiLabel, kpiNote, kpiValue;
  if (tariffKpi === 'rezsi') {
    kpiLabel = 'Ha HT/NT tarifára váltanál';
    kpiNote  = 'Rezsivédett egységáron az időzítés nem csökkenti a számlát — ez a kétmérős HT/NT potenciál';
    kpiValue = fmtHUF(Math.round(residentAnnual));
  } else if (tariffKpi === 'piaci') {
    kpiLabel = 'Te spórolhatsz évente (tőzsdei)';
    kpiNote  = 'Piaci fogyasztóként az ENTSO-E csúcs–völgy energia-ár különbségéből';
    kpiValue = fmtHUF(Math.round(marketAnnual));
  } else {
    kpiLabel = 'Te spórolhatsz évente';
    kpiNote  = 'Kétmérős HT/NT tarifával: drágább nappalról olcsóbb éjszakára tolva a fogyasztást';
    kpiValue = fmtHUF(Math.round(residentAnnual));
  }

  grid.innerHTML = `
    <div class="kpi-card kpi-primary${tariffKpi === 'rezsi' ? ' kpi-potential' : ''}" data-source="live">
      <div class="kpi-label">${kpiLabel}</div>
      <div class="kpi-value">${kpiValue}</div>
      <div class="kpi-unit">Ft / év</div>
      <span class="tariff-source">Forrás: MEKH 2024 szabályozott tarifa</span>
      <div class="kpi-note">${kpiNote}</div>
      ${tariffKpi === 'rezsi' ? '<div class="kpi-rezsi-badge">Rezsivédett tarifán</div>' : ''}
    </div>`;

  // Részletek panel: piaci + állami (szakértői)
  const detailsGrid = el('kpiGridDetails');
  if (detailsGrid) {
    detailsGrid.innerHTML = `
      <div class="kpi-card" data-source="live">
        <div class="kpi-label">Tőzsdei energia-megtakarítás</div>
        <div class="kpi-value">${fmtHUF(Math.round(marketAnnual))}</div>
        <div class="kpi-unit">Ft / év</div>
        <div class="kpi-note">Piaci fogyasztóknál: ENTSO-E csúcs vs. völgyár különbség az energia-komponensen</div>
      </div>
      <div class="kpi-card kpi-state" data-source="live">
        <div class="kpi-label">Állami szubvenció-csökkentés</div>
        <div class="kpi-value">${fmtHUF(Math.round(stateAnnual))}</div>
        <div class="kpi-unit">Ft / év</div>
        <div class="kpi-note">Ha tőzsdei energia-ár &gt; ${SUBSIDY_ENERGY_THRESHOLD_HUF_KWH} Ft/kWh (rezsivédett energia-ár), az állam fizeti a különbözetet</div>
      </div>`;
  }

  // Részletek toggle mutatása
  const toggleEl = el('kpiDetailsToggle');
  if (toggleEl) toggleEl.style.display = 'block';

  // Közösségi widget frissítés
  updateCommunityWidget();
}

// -----------------------------------------------------------------------
// HETI NAPTÁR
// -----------------------------------------------------------------------
function renderWeeklyCalendar(forecastDaily, histDaily) {
  const wrap = el('weeklyCalendar');
  if (!wrap) return;

  // Összevonjuk a historikus és előrejelzett napi adatokat
  const allDays = [];

  if (histDaily && histDaily.length > 0) {
    histDaily.slice(-3).forEach(d => allDays.push({ ...d, is_forecast: false }));
  }
  if (forecastDaily && forecastDaily.length > 0) {
    forecastDaily.slice(0, 7 - allDays.length).forEach(d => allDays.push(d));
  }

  if (allDays.length === 0) {
    wrap.innerHTML = '<div class="empty-msg">Nincs naptáradat.</div>';
    return;
  }

  // Normalizálás a sávhoz
  const avgs = allDays.map(d => d.avg_price_huf || 0);
  const minA  = Math.min(...avgs);
  const maxA  = Math.max(...avgs);
  const rangeA = maxA - minA || 1;

  const bestAvg = Math.min(...avgs);
  const todayStr = new Date().toISOString().slice(0, 10);

  const dayNames = ['V', 'H', 'K', 'Sz', 'Cs', 'P', 'Sz'];

  wrap.innerHTML = allDays.map(d => {
    const dt       = new Date(d.date + 'T12:00:00');
    const dayName  = dayNames[dt.getDay()];
    const dayNum   = dt.getDate();
    const isToday  = d.date === todayStr;
    const isBest   = d.avg_price_huf === bestAvg;

    const normalized = ((d.avg_price_huf || 0) - minA) / rangeA;
    const fillH = Math.round(20 + normalized * 36);  // px

    let dayClass = 'day-col avg-day';
    if (isBest) dayClass = 'day-col best-day';
    else if (normalized > 0.67) dayClass = 'day-col bad-day';

    const kwh = d.avg_price_huf_kwh != null ? d.avg_price_huf_kwh.toFixed(1) : (d.avg_price_huf / 1000).toFixed(1);
    const forecastMark = d.is_forecast ? '*' : '';

    return `
      <div class="${dayClass}">
        <div class="day-name">${dayName}</div>
        <div class="day-date">${dayNum}.${forecastMark}</div>
        <div class="day-bar-wrap">
          <div class="day-bar-fill" style="height:${fillH}px"></div>
        </div>
        <div class="day-price-kwh">${kwh} Ft</div>
        ${isBest ? '<div class="best-day-tag">Legjobb</div>' : ''}
        ${isToday ? '<div class="today-tag">Ma</div>' : ''}
      </div>`;
  }).join('');
}

// -----------------------------------------------------------------------
// HT/NT KALKULÁTOR
// -----------------------------------------------------------------------
function setHtNt(mode) {
  const yesBtn   = el('htntYesBtn');
  const noBtn    = el('htntNoBtn');
  const yesContent = el('htntYesContent');
  const noContent  = el('htntNoContent');

  if (mode === 'yes') {
    yesBtn.classList.add('active');
    noBtn.classList.remove('active');
    yesContent.classList.add('visible');
    noContent.classList.remove('visible');
    calcHtNt();
  } else {
    noBtn.classList.add('active');
    yesBtn.classList.remove('active');
    noContent.classList.add('visible');
    yesContent.classList.remove('visible');
  }
}

function calcHtNt() {
  const kwh    = parseFloat(el('htntKwh')?.value || 200);
  const pct    = parseFloat(el('htntPct')?.value || 40) / 100;
  const result = el('htntResult');
  if (!result) return;

  // Tipikus magyar HT/NT árak (tájékoztató):
  // HT (nappal): ~54 Ft/kWh bruttó (rezsivédett fogyasztóknál ~41,7 Ft)
  // NT (éjszaka): ~36 Ft/kWh bruttó (rezsivédett fogyasztóknál ~32,5 Ft)
  // Szabad piacon a különbség nagyobb lehet
  const htPrice = 54;
  const ntPrice = 36;
  const diff    = htPrice - ntPrice;

  const shiftedKwh = kwh * pct;
  const monthlySaving = Math.round(shiftedKwh * diff);
  const annualSaving  = monthlySaving * 12;

  result.innerHTML = `
    <div class="htnt-saving-amount">${fmtHUF(monthlySaving)} Ft / hó</div>
    <div class="htnt-saving-label">
      Ha ${fmtHUF(Math.round(shiftedKwh))} kWh fogyasztást tolsz át éjszakai sávba
      (NT ${ntPrice} Ft/kWh vs. HT ${htPrice} Ft/kWh).
    </div>
    <div style="margin-top:8px;font-size:13px;color:var(--green);font-weight:700">
      Éves szinten: ${fmtHUF(annualSaving)} Ft megtakarítás
    </div>
    <div style="margin-top:6px;font-size:12px;color:var(--text-subtle)">
      Az árak tájékoztató jellegűek. Tényleges megtakarítás a kereskedő tarifáitól függ.
    </div>`;
}

// -----------------------------------------------------------------------
// KÖZÖSSÉGI WIDGET
// -----------------------------------------------------------------------
function updateCommunityWidget() {
  const slider = el('communitySlider');
  if (!slider) return;

  const hh = parseInt(slider.value, 10);
  el('communityHhLabel').textContent = fmtHUF(hh);

  const totalMoney = Math.round(hh * COMMUNITY_BASE_SAVING_PER_HH);
  const totalCo2kg = Math.round(hh * COMMUNITY_CO2_KG_PER_HH);
  const totalCo2t  = totalCo2kg / 1000;

  el('commMoney').textContent = totalMoney >= 1e9
    ? `${(totalMoney / 1e9).toFixed(1)} Mrd Ft`
    : totalMoney >= 1e6
      ? `${(totalMoney / 1e6).toFixed(1)} M Ft`
      : `${fmtHUF(totalMoney)} Ft`;

  el('commCo2').textContent = totalCo2t >= 1000
    ? `${(totalCo2t / 1000).toFixed(0)} kt`
    : `${fmtHUF(Math.round(totalCo2t))} t`;

  // Összehasonlítás
  const cars = Math.round(totalCo2t / 1.9);  // ~1.9 tonna CO2 / autó / év
  const comp = el('commComparison');
  if (comp) {
    if (totalCo2t >= 1000) {
      comp.textContent = `Ez nagyjából ${fmtHUF(cars)} személyautó éves kibocsátásával egyenértékű.`;
    } else {
      comp.textContent = `Ez nagyjából ${fmtHUF(cars)} személyautó éves kibocsátásával egyenértékű.`;
    }
  }
}

// -----------------------------------------------------------------------
// SZAKÉRTŐI NÉZET
// -----------------------------------------------------------------------
async function toggleExpertView() {
  _expertOpen = !_expertOpen;
  const view     = el('expertView');
  const chevron  = el('expertChevron');
  const btnLabel = el('expertToggleBtn');

  view.classList.toggle('open', _expertOpen);
  if (chevron) chevron.classList.toggle('open', _expertOpen);

  if (_expertOpen && _forecastData && !_priceChart) {
    await loadChartJs().catch(() => {});
    if (typeof Chart !== 'undefined') {
      renderCombinedChart(_forecastData.prices, _forecastData.model_accuracy);
      if (_summaryData) renderHourlyChart(_summaryData.weekly_pattern.hourly_avg, _summaryData.eur_huf_rate);
      if (_summaryData) renderDailyTable(_summaryData.daily, 'dailyTableWrap', false);
    }
  }
}

// -----------------------------------------------------------------------
// CHARTOK (csak szakértői nézetben)
// -----------------------------------------------------------------------
function renderCombinedChart(prices, accuracy) {
  const ctx = el('priceChart');
  if (!ctx || typeof Chart === 'undefined') return;

  const forecastStart = prices.findIndex(p => p.is_forecast);
  const labels = prices.map(p => {
    const d = new Date(p.timestamp);
    return d.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit' });
  });
  const values = prices.map(p => p.price_huf_kwh ?? (p.price_huf_mwh / 1000));
  const colors = prices.map(p => {
    if (p.is_forecast)          return '#e3b34188';
    if (p.price_eur_mwh < 0)   return '#bc8cff99';
    if (p.is_cheap)             return '#3fb95088';
    if (p.is_expensive)         return '#f8514988';
    return '#58a6ff55';
  });

  // Modell pontossági badge
  const badge = el('modelAccuracyBadge');
  if (badge && accuracy) {
    badge.innerHTML = `
      <div class="model-accuracy-badge">
        <span class="dot"></span>
        Modell pontossága: ±${accuracy.mape_pct}%
        ${accuracy.validation_days > 0 ? `(${accuracy.validation_days} napos walk-forward validáció)` : '(variációs együttható)'}
      </div>`;
  }

  // Alcím
  const subtitle = el('forecastSubtitle');
  if (subtitle) {
    const lastHist = [...prices].reverse().find(p => !p.is_forecast);
    const lastFc   = [...prices].reverse().find(p => p.is_forecast);
    if (lastHist && lastFc) {
      const from = new Date(lastHist.timestamp).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' });
      const to   = new Date(lastFc.timestamp).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' });
      subtitle.textContent = `Historikus: elmúlt 7 nap | Előrejelzés: ${to}-ig`;
    }
  }

  const dividerPlugin = {
    id: 'forecastDivider',
    afterDraw(chart) {
      if (forecastStart < 0) return;
      const { ctx: c, chartArea, scales } = chart;
      const x = scales.x.getPixelForValue(forecastStart);
      c.save();
      c.beginPath();
      c.strokeStyle = '#e3b34199';
      c.lineWidth = 1.5;
      c.setLineDash([5, 4]);
      c.moveTo(x, chartArea.top);
      c.lineTo(x, chartArea.bottom);
      c.stroke();
      c.fillStyle = '#e3b341';
      c.font = '11px system-ui, sans-serif';
      c.fillText('Előrejelzés ▶', x + 4, chartArea.top + 14);
      c.restore();
    }
  };

  if (_priceChart) _priceChart.destroy();
  _priceChart = new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Ár (Ft/kWh)',
        data: values,
        backgroundColor: colors,
        borderRadius: 2,
        borderSkipped: false,
      }]
    },
    plugins: [dividerPlugin],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: c => {
              const p = prices[c.dataIndex];
              const tag = p.is_forecast ? ' [előrejelzés]' : '';
              const neg = p.price_eur_mwh < 0 ? ' negatív ár!' : '';
              return `${c.parsed.y.toFixed(1)} Ft/kWh${tag}${neg}`;
            }
          }
        }
      },
      scales: {
        x: { ticks: { color: '#8892a4', maxTicksLimit: 12, font: { size: 10 } }, grid: { color: '#30363d44' } },
        y: {
          ticks: { color: '#8892a4', callback: v => `${v.toFixed(1)} Ft` },
          grid: { color: '#30363d44' },
          title: { display: true, text: 'Ft/kWh', color: '#8892a4', font: { size: 11 } }
        }
      }
    }
  });

  // Negatív ár megjegyzés
  const noticeEl = el('negativeNotice');
  if (noticeEl) {
    noticeEl.innerHTML = '';
    const hasNeg = prices.some(p => !p.is_forecast && p.price_eur_mwh < 0);
    if (hasNeg) {
      noticeEl.innerHTML = `
        <div style="background:#bc8cff12;border:1px solid #bc8cff44;border-radius:8px;padding:10px 14px;font-size:13px;color:#bc8cff;">
          Negatív árak fordultak elő ebben az időszakban — ilyenkor az áramszolgáltató fizet a fogyasztásért!
          Kiváló időablak energiaigényes üzemek számára.
        </div>`;
    }
  }
}

function renderHourlyChart(hourlyAvg, eurHuf) {
  const ctx = el('hourlyChart');
  if (!ctx || typeof Chart === 'undefined') return;

  const hours  = Array.from({ length: 24 }, (_, i) => i);
  const values = hours.map(h => ((hourlyAvg[h] || 0) * eurHuf) / 1000);
  const minV   = Math.min(...values);
  const maxV   = Math.max(...values);
  const colors = values.map(v => {
    const ratio = (v - minV) / (maxV - minV || 1);
    if (ratio < 0.33) return '#3fb95088';
    if (ratio > 0.67) return '#f8514988';
    return '#58a6ff66';
  });

  if (_hourlyChart) _hourlyChart.destroy();
  _hourlyChart = new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: {
      labels: hours.map(h => `${h}:00`),
      datasets: [{ label: 'Átlag ár (Ft/kWh)', data: values, backgroundColor: colors, borderRadius: 3 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => `${c.parsed.y.toFixed(1)} Ft/kWh` } }
      },
      scales: {
        x: { ticks: { color: '#8892a4', font: { size: 10 } }, grid: { color: '#30363d44' } },
        y: { ticks: { color: '#8892a4', callback: v => `${v.toFixed(1)}` }, grid: { color: '#30363d44' } }
      }
    }
  });
}

function renderDailyTable(daily, containerId, showForecastTag) {
  const container = el(containerId);
  if (!container || !daily || !daily.length) {
    if (container) container.innerHTML = '<p class="empty-msg">Nincs adat.</p>';
    return;
  }

  const rows = daily.map(d => {
    const tag = showForecastTag ? '<span style="font-size:10px;color:#e3b341;border:1px solid #e3b34155;border-radius:4px;padding:1px 6px;margin-left:6px;">becslés</span>' : '';
    const avgKwh = d.avg_price_huf_kwh ?? (d.avg_price_huf / 1000).toFixed(2);
    return `
      <tr style="${showForecastTag ? 'opacity:0.85' : ''}">
        <td>${d.date}${tag}</td>
        <td>${fmtHUF(d.min_price_huf)}</td>
        <td style="font-weight:600">${fmtHUF(d.avg_price_huf)}</td>
        <td>${fmtHUF(d.max_price_huf)}</td>
        <td>${(d.cheapest_hours || []).slice(0, 4).map(h => `<span style="background:#3fb95020;color:#3fb950;border-radius:4px;padding:1px 5px;font-size:11px;margin:1px;display:inline-block">${h}:00</span>`).join('')}</td>
      </tr>`;
  }).join('');

  container.innerHTML = `
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead>
        <tr style="color:#8892a4;font-size:11px;font-weight:500;border-bottom:1px solid #30363d">
          <th style="padding:8px 10px;text-align:left">Dátum</th>
          <th style="padding:8px 10px;text-align:left">Min (HUF/MWh)</th>
          <th style="padding:8px 10px;text-align:left">Átlag</th>
          <th style="padding:8px 10px;text-align:left">Max</th>
          <th style="padding:8px 10px;text-align:left">Legolcsóbb órák</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// -----------------------------------------------------------------------
// FŐ BETÖLTŐ
// -----------------------------------------------------------------------
async function loadAll() {
  try {
    // Párhuzamos lekérések — allSettled, hogy egy hiba ne blokkolja a többit
    const [statusRes, forecastRes, devicesRes] = await Promise.allSettled([
      fetchJSON('/api/status'),
      fetchJSON('/api/forecast?history_days=30&forecast_days=7'),
      fetchJSON('/api/devices'),
    ]);

    const statusData   = statusRes.status   === 'fulfilled' ? statusRes.value   : null;
    const forecastData = forecastRes.status === 'fulfilled' ? forecastRes.value : null;
    const devicesData  = devicesRes.status  === 'fulfilled' ? devicesRes.value  : null;

    if (!statusData && !forecastData) throw new Error('Nem sikerült betölteni az adatokat');

    _statusData   = statusData;
    _forecastData = forecastData;
    _devices      = devicesData ? (devicesData.devices || []) : [];

    // Header badge — csak demo módban mutatjuk, élő adatnál nem zavaró
    const srcBadge = el('sourceBadge');
    if (srcBadge && forecastData) {
      if (forecastData.demo_mode) {
        srcBadge.textContent = 'Bemutató adatok';
        srcBadge.className   = 'badge-pill badge-demo';
        srcBadge.style.display = '';
      } else {
        srcBadge.style.display = 'none';
      }
    }

    // Demo mód sárga banner a KPI szekció előtt
    if (forecastData && forecastData.demo_mode) {
      showDemoBanner();
    }

    // Hero chip
    if (statusData) renderHero(statusData);

    // Eszközkártyák
    if (forecastData) renderDeviceGrid(_devices, forecastData.prices);

    // 24h hőtérkép
    if (forecastData) renderHeatmap(forecastData.prices);

    // Heti naptár (historikus summary is kell)
    if (forecastData) renderWeeklyCalendar(forecastData.forecast_daily, []);

    // Visszaszámláló a következő olcsó időszakig
    if (forecastData) initCountdown(forecastData.prices);

    // Onboarding
    initOnboarding(_devices);

    // KPI-k (profil alapján)
    updateKPIs();

    // Hero megtakarítási hint
    updateHeroHint();

    // Díjösszetétel vizualizáció
    const currentPrice = statusData ? statusData.current_price_huf_kwh : null;
    const currentWholesaleHufMwh = currentPrice != null ? currentPrice * 1000 : null;
    renderPriceBreakdown(currentWholesaleHufMwh);

    // HT/NT kalkulátor
    calcHtNt();

    // Közösségi widget
    updateCommunityWidget();

    // Coach marks — csak első látogatáskor
    initCoachMarks();

    // Summary lekérés a naptárhoz és hourly charthoz (háttérben)
    fetchJSON('/api/summary?days=30').then(summary => {
      _summaryData = summary;
      if (forecastData) renderWeeklyCalendar(forecastData.forecast_daily, summary.daily || []);
    }).catch(() => {});

  } catch (e) {
    console.error('Betöltési hiba:', e);
    document.querySelectorAll('.skeleton-device').forEach(s => s.remove());
    const errorState = el('errorState');
    if (errorState) errorState.style.display = 'block';
    const chip = el('statusChip');
    const label = el('statusChipLabel');
    if (chip) chip.className = 'status-chip chip-yellow';
    if (label) label.textContent = 'Nem sikerült betölteni';
  }
}

// -----------------------------------------------------------------------
// MEGOSZTÁS
// -----------------------------------------------------------------------
function shareApp() {
  const shareData = {
    title: 'Energia Időzítő — Mikor a legolcsóbb az áram?',
    text: 'Nézd meg, mikor érdemes bekapcsolni a mosógépet vagy a bojlert — ingyen, valós tőzsdei árak alapján!',
    url: window.location.href,
  };
  if (navigator.share) {
    navigator.share(shareData).catch(() => {});
  } else {
    navigator.clipboard.writeText(window.location.href).then(() => {
      const btn = el('shareBtn');
      if (btn) {
        btn.textContent = 'Link másolva!';
        setTimeout(() => { btn.textContent = 'Megmutatom ismerőseimnek →'; }, 2500);
      }
    }).catch(() => {});
  }
}

// -----------------------------------------------------------------------
// KPI RÉSZLETEK TOGGLE
// -----------------------------------------------------------------------
function toggleKpiDetails() {
  const panel = el('kpiDetailsPanel');
  const btn   = el('kpiDetailsBtn');
  if (!panel || !btn) return;
  const open = panel.style.display === 'block';
  panel.style.display = open ? 'none' : 'block';
  btn.textContent = open ? 'Részletek szakértőknek ▾' : 'Részletek elrejtése ▴';
}

// -----------------------------------------------------------------------
// ONBOARDING MEGNYITÁS
// -----------------------------------------------------------------------
function openOnboarding() {
  const overlay = el('onboardingOverlay');
  if (overlay) {
    overlay.classList.remove('hidden');
    onboardingNext(1);
  }
}

// -----------------------------------------------------------------------
// ÚJRATÖLTÉS (hiba esetén)
// -----------------------------------------------------------------------
function retryLoad() {
  const errorState = el('errorState');
  if (errorState) errorState.style.display = 'none';
  document.querySelectorAll('.device-card-skeleton').forEach(s => { s.style.display = ''; });
  loadAll();
}

// -----------------------------------------------------------------------
// HERO MEGTAKARÍTÁSI HINT
// -----------------------------------------------------------------------
function updateHeroHint() {
  const hintEl = el('heroSavingHint');
  const ctaEl  = el('heroCta');
  if (!hintEl || !ctaEl) return;

  const profile = _userProfile || loadProfile();
  const hasProfile = profile && profile.devices && profile.devices.length > 0;

  if (!hasProfile) {
    hintEl.style.display = 'block';
    hintEl.textContent = 'Megtudhatod, mennyit spórolhatsz a te eszközeidre szabva →';
    ctaEl.style.display = 'inline-block';
    ctaEl.textContent   = 'Számítsd ki, te mennyit spórolhatsz →';
    return;
  }

  const prices = _forecastData && _forecastData.prices;
  if (!prices || prices.length === 0 || !_devices.length) return;

  const targetDevices = _devices.filter(d => profile.devices.includes(d.id));
  if (!targetDevices.length) return;

  let totalAnnual = 0;
  let used = false;
  targetDevices.forEach(device => {
    const rec = computeDeviceRec(device, prices);
    if (rec.bestHufMwh != null && rec.worstHufMwh != null && rec.worstHufMwh > rec.bestHufMwh) {
      const bd = computeSavingsBreakdown(rec.worstHufMwh, rec.bestHufMwh, device.power_kw, device.hours_per_use);
      totalAnnual += bd.residentHtntAnnual;
      used = true;
    }
  });

  if (!used) return;
  const tariff = profile.tariff || 'rezsi';
  hintEl.style.display = 'block';
  if (tariff === 'rezsi') {
    hintEl.textContent = `Rezsivédett tarifán — HT/NT váltással kb. ${fmtHUF(Math.round(totalAnnual))} Ft/év potenciál`;
  } else {
    hintEl.textContent = `A te eszközeidre becsült megtakarítás: kb. ${fmtHUF(Math.round(totalAnnual))} Ft/év`;
  }
  ctaEl.style.display = 'none';
}

// -----------------------------------------------------------------------
// INICIALIZÁLÁS + ESEMÉNY-DELEGÁLÁS
// -----------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  loadAll();
  updateCommunityWidget();
  calcHtNt();

  // Egyetlen delegált listener minden data-action attribútumhoz
  document.body.addEventListener('click', e => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;

    switch (action) {
      case 'toggle-device':
        target.classList.toggle('selected');
        break;
      case 'select-tariff':
        document.querySelectorAll('[data-tariff]').forEach(c => c.classList.remove('selected'));
        target.classList.add('selected');
        break;
      case 'select-flex':
        document.querySelectorAll('[data-flex]').forEach(c => c.classList.remove('selected'));
        target.classList.add('selected');
        break;
      case 'onboarding-next':
        onboardingNext(parseInt(target.dataset.step, 10));
        break;
      case 'onboarding-back':
        onboardingNext(parseInt(target.dataset.step, 10));
        break;
      case 'skip-onboarding':
        skipOnboarding();
        break;
      case 'finish-onboarding':
        finishOnboarding();
        break;
      case 'open-onboarding':
        openOnboarding();
        break;
      case 'share-app':
        shareApp();
        break;
      case 'toggle-kpi-details':
        toggleKpiDetails();
        break;
      case 'retry-load':
        retryLoad();
        break;
      case 'toggle-expert':
        toggleExpertView();
        break;
      case 'set-htnt':
        setHtNt(target.dataset.mode);
        break;
      case 'coach-next':
        nextCoachStep();
        break;
      case 'coach-skip':
        skipCoachMarks();
        break;
      case 'start-tour':
        localStorage.removeItem('energia_tour_done');
        _coachStep = 0;
        el('coachOverlay').classList.remove('hidden');
        showCoachStep(0);
        break;
      case 'load-cooling-plan':
        loadCoolingPlan();
        break;
      case 'load-solar-plan':
        loadSolarPlan();
        break;
    }
  });
});

// -----------------------------------------------------------------------
// KLÍMA HŰTÉSI TERV
// -----------------------------------------------------------------------

let _coolingFetch = null;

async function loadCoolingPlan() {
  const citySelect  = el('coolingCitySelect');
  const acSelect    = el('coolingAcPower');
  const resultDiv   = el('coolingResult');
  const loadingDiv  = el('coolingLoading');
  const btn         = document.querySelector('[data-action="load-cooling-plan"]');
  if (!citySelect || !acSelect) return;

  // Cancel previous in-flight request
  if (_coolingFetch) { _coolingFetch.abort(); }
  _coolingFetch = new AbortController();

  const city    = citySelect.value;
  const acPower = acSelect.value;

  if (btn) btn.disabled = true;
  resultDiv.classList.add('hidden');
  loadingDiv.classList.remove('hidden');

  try {
    const resp = await fetch(
      `/api/cooling-plan?city=${encodeURIComponent(city)}&ac_power_kw=${acPower}`,
      { signal: _coolingFetch.signal }
    );
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    renderCoolingPlan(data);
    resultDiv.classList.remove('hidden');
  } catch (err) {
    if (err.name === 'AbortError') return;
    resultDiv.innerHTML = `<p style="color:var(--red);padding:12px 0">Nem sikerült betölteni: ${err.message}</p>`;
    resultDiv.classList.remove('hidden');
  } finally {
    loadingDiv.classList.add('hidden');
    if (btn) btn.disabled = false;
    _coolingFetch = null;
  }
}

function renderCoolingPlan(data) {
  // Összefoglaló számok
  const summaryRow = el('coolingSummaryRow');
  if (summaryRow) {
    const savingPct = data.saving_pct > 0 ? ` (${data.saving_pct}%)` : '';
    summaryRow.innerHTML = `
      <div class="cooling-stat">
        <div class="cooling-stat-label">Okos hűtés</div>
        <div class="cooling-stat-value">${Math.round(data.smart_total_cost_huf).toLocaleString('hu')} Ft</div>
        <div class="cooling-stat-delta">${data.smart_total_kwh} kWh / 48 óra</div>
      </div>
      <div class="cooling-stat">
        <div class="cooling-stat-label">Naiv (mindig megy)</div>
        <div class="cooling-stat-value">${Math.round(data.naive_total_cost_huf).toLocaleString('hu')} Ft</div>
        <div class="cooling-stat-delta">${data.naive_total_kwh} kWh / 48 óra</div>
      </div>
      <div class="cooling-stat">
        <div class="cooling-stat-label">Megtakarítás</div>
        <div class="cooling-stat-value saving">${Math.round(data.saving_huf).toLocaleString('hu')} Ft${savingPct}</div>
        <div class="cooling-stat-delta">előhűtési stratégiával</div>
      </div>`;
  }

  // Tipp szöveg
  const tipDiv = el('coolingTip');
  if (tipDiv) tipDiv.textContent = data.tip || data.summary;

  // Timeline
  const timeline = el('coolingTimeline');
  if (!timeline || !data.hours) return;

  const ACTION_ICON = {
    precool: '*',
    run:     '>',
    coast:   '~',
    off:     '–',
  };

  let lastDate = null;
  const cells = [];

  for (const h of data.hours) {
    // Nap-elválasztó
    const date = h.local_time.slice(0, 10);
    if (lastDate && date !== lastDate) {
      const dayLabel = new Date(date).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' });
      cells.push(`<div class="ct-day-divider"><div class="ct-day-line"></div><span>${dayLabel}</span><div class="ct-day-line"></div></div>`);
    }
    lastDate = date;

    // Akció osztály
    let actionClass = 'action-off';
    if (h.action === 'precool') actionClass = 'action-precool';
    else if (h.action === 'run' && !h.is_expensive) actionClass = 'action-run';
    else if (h.action === 'run' && h.is_expensive) actionClass = 'action-run-expensive';
    else if (h.action === 'coast') actionClass = 'action-coast';

    const icon = ACTION_ICON[h.action] || '–';
    const timeStr = String(h.hour).padStart(2, '0') + ':00';
    const tempStr = h.outdoor_temp_c != null ? `${Math.round(h.outdoor_temp_c)}°` : '–';
    const priceStr = h.price_huf_kwh != null ? `${Math.round(h.price_huf_kwh)} Ft` : '–';

    cells.push(`
      <div class="ct-hour ${actionClass}" title="${h.action_detail}">
        <span class="ct-time">${timeStr}</span>
        <span class="ct-action-icon">${icon}</span>
        <span class="ct-temp">${tempStr}</span>
        <span class="ct-price">${priceStr}</span>
      </div>`);
  }

  timeline.innerHTML = cells.join('');
}

// -----------------------------------------------------------------------
// NAPELEM ÖNFOGYASZTÁSI TERV
// -----------------------------------------------------------------------

let _solarFetch = null;

async function loadSolarPlan() {
  const citySelect  = el('solarCitySelect');
  const kwpSelect   = el('solarKwpSelect');
  const resultDiv   = el('solarResult');
  const loadingDiv  = el('solarLoading');
  const btn         = document.querySelector('[data-action="load-solar-plan"]');
  if (!citySelect || !kwpSelect) return;

  if (_solarFetch) { _solarFetch.abort(); }
  _solarFetch = new AbortController();

  const city   = citySelect.value;
  const kwp    = kwpSelect.value;

  if (btn) btn.disabled = true;
  resultDiv.classList.add('hidden');
  loadingDiv.classList.remove('hidden');

  try {
    const resp = await fetch(
      `/api/solar-plan?city=${encodeURIComponent(city)}&solar_kwp=${kwp}`,
      { signal: _solarFetch.signal }
    );
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    renderSolarPlan(data);
    resultDiv.classList.remove('hidden');
  } catch (err) {
    if (err.name === 'AbortError') return;
    resultDiv.innerHTML = `<p style="color:var(--red);padding:12px 0">Nem sikerült betölteni: ${err.message}</p>`;
    resultDiv.classList.remove('hidden');
  } finally {
    loadingDiv.classList.add('hidden');
    if (btn) btn.disabled = false;
    _solarFetch = null;
  }
}

function renderSolarPlan(data) {
  // KPI összefoglaló
  const summaryRow = el('solarSummaryRow');
  if (summaryRow) {
    const annualSavings = data.annual_savings_huf_estimate || 0;
    const annualProd    = data.annual_production_kwh_estimate || 0;
    summaryRow.innerHTML = `
      <div class="cooling-stat">
        <div class="cooling-stat-label">Termelés / 48h</div>
        <div class="cooling-stat-value">${(data.total_production_kwh_48h || 0).toFixed(1)} kWh</div>
        <div class="cooling-stat-delta">~${(data.daily_production_kwh_estimate || 0).toFixed(1)} kWh/nap átlag</div>
      </div>
      <div class="cooling-stat">
        <div class="cooling-stat-label">Spórolás / 48h</div>
        <div class="cooling-stat-value saving">${Math.round(data.total_savings_huf_48h || 0).toLocaleString('hu')} Ft</div>
        <div class="cooling-stat-delta">önfogyasztással</div>
      </div>
      <div class="cooling-stat">
        <div class="cooling-stat-label">Éves becslés</div>
        <div class="cooling-stat-value">${Math.round(annualProd).toLocaleString('hu')} kWh</div>
        <div class="cooling-stat-delta">~${Math.round(annualSavings / 1000)}k Ft/év</div>
      </div>`;
  }

  // Tipp
  const tipDiv = el('solarTip');
  if (tipDiv) tipDiv.textContent = data.tip || data.summary;

  // Legjobb ablakok
  const windowsWrap = el('solarWindowsWrap');
  if (windowsWrap && data.best_load_windows && data.best_load_windows.length) {
    const cards = data.best_load_windows.map((w, i) => {
      const label = i === 0 ? 'Legjobb ablak' : i === 1 ? '2. ablak' : '3. ablak';
      const startStr = w.start ? w.start.slice(11, 16) : `${String(w.start_hour).padStart(2,'0')}:00`;
      const endStr   = `${String(w.end_hour).padStart(2,'0')}:00`;
      return `
        <div class="solar-window-card${i === 0 ? ' solar-window-best' : ''}">
          <div class="swc-rank">${i + 1 + '.'}</div>
          <div class="swc-time">${startStr}–${endStr}</div>
          <div class="swc-detail">
            <span class="swc-prod">${w.avg_production_kwh} kWh/h</span>
            <span class="swc-covers">${w.avg_solar_covers_pct}% fedezve</span>
            <span class="swc-price">${w.avg_price_huf_kwh} Ft/kWh</span>
          </div>
          <div class="swc-label">${label}</div>
        </div>`;
    }).join('');
    windowsWrap.innerHTML = `
      <div class="solar-windows-title">Legjobb időablakok nagy fogyasztóknak (2h)</div>
      <div class="solar-windows-grid">${cards}</div>`;
  } else if (windowsWrap) {
    windowsWrap.innerHTML = '';
  }

  // 48h Timeline
  const timeline = el('solarTimeline');
  if (!timeline || !data.hours) return;

  const ACTION_ICON = {
    solar_peak:  '+',
    solar_mild:  '~',
    cheap_grid:  '↓',
    avoid:       '-',
    neutral:     '·',
    night:       'n',
  };

  let lastDate = null;
  const cells = [];

  for (const h of data.hours) {
    const date = h.local_time.slice(0, 10);
    if (lastDate && date !== lastDate) {
      const dayLabel = new Date(date).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' });
      cells.push(`<div class="ct-day-divider"><div class="ct-day-line"></div><span>${dayLabel}</span><div class="ct-day-line"></div></div>`);
    }
    lastDate = date;

    let actionClass = 'action-solar-night';
    if (h.action === 'solar_peak')  actionClass = 'action-solar-peak';
    else if (h.action === 'solar_mild') actionClass = 'action-solar-mild';
    else if (h.action === 'cheap_grid') actionClass = 'action-cheap-grid';
    else if (h.action === 'avoid')  actionClass = 'action-avoid';

    const icon = ACTION_ICON[h.action] || '·';
    const timeStr = String(h.hour).padStart(2, '0') + ':00';
    const prodStr = h.solar_production_kwh > 0.01 ? `${h.solar_production_kwh.toFixed(2)}` : '–';
    const priceStr = `${Math.round(h.price_huf_kwh)} Ft`;

    cells.push(`
      <div class="ct-hour ${actionClass}" title="${h.action_detail}">
        <span class="ct-time">${timeStr}</span>
        <span class="ct-action-icon">${icon}</span>
        <span class="ct-temp">${prodStr}</span>
        <span class="ct-price">${priceStr}</span>
      </div>`);
  }

  timeline.innerHTML = cells.join('');
}

// -----------------------------------------------------------------------
// ENERGIA TANÁCSADÓ WIZARD
// -----------------------------------------------------------------------

const ADV_TOTAL_STEPS = 5;

let _advStep = 0;
let _advProfile = {
  homeType: null, homeSize: null, heating: null,
  devices: [],
  monthlyBill: 15000, tariff: null,
  budget: null, priority: null,
};

// Akció adatbázis
const ADVISOR_ACTIONS = [
  // ── AZONNALI (0 Ft, azonnal bevezethető) ─────────────────────────────
  {
    id: 'timing_washer', tier: 'instant', icon: '',
    title: 'Mosógép éjszakára időzítése',
    requires_devices: ['mosogep'],
    not_tariff: ['rezsi'],
    investment: 0,
    saving_fn: p => p.tariff === 'htnt' ? 9500 : 4500,
    difficulty: 1,
    payback: 0,
    first_step: 'Állítsd be a <strong>késleltetett indítást</strong> este 22:00-ra — szinte minden modern mosógépen elérhető.',
    co2_kg: 45,
  },
  {
    id: 'timing_dishwasher', tier: 'instant', icon: '',
    title: 'Mosogatógép éjszakára',
    requires_devices: ['mosogatogep'],
    not_tariff: ['rezsi'],
    investment: 0,
    saving_fn: p => p.tariff === 'htnt' ? 7200 : 3400,
    difficulty: 1,
    payback: 0,
    first_step: 'Kapcsold be a <strong>késleltetett indítást</strong> — este töltsd be, éjjelre időzítsd.',
    co2_kg: 34,
  },
  {
    id: 'cooling_precool', tier: 'instant', icon: '',
    title: 'Klíma előhűtési stratégia',
    requires_devices: ['klima'],
    investment: 0,
    saving_fn: p => 8000 + (p.homeSize === 'large' || p.homeSize === 'xlarge' ? 4000 : 0),
    difficulty: 2,
    payback: 0,
    first_step: 'Hűtsd be a lakást <strong>13–15:00 között</strong> (olcsóbb ár), majd kapcsold ki 18:00-tól. Az oldalon lévő Klíma terv mutatja az ideális ablakot.',
    co2_kg: 30,
  },
  {
    id: 'ev_timing', tier: 'instant', icon: '',
    title: 'EV éjszakai töltési időzítő',
    requires_devices: ['ev'],
    investment: 0,
    saving_fn: p => p.tariff === 'htnt' ? 140000 : 45000,
    difficulty: 1,
    payback: 0,
    first_step: 'Állítsd be az autó vagy a töltő időzítőjét <strong>23:00–06:00 közé</strong>.',
    co2_kg: 280,
  },
  {
    id: 'dryer_timing', tier: 'instant', icon: '',
    title: 'Szárítógép éjszakai program',
    requires_devices: ['szarito'],
    not_tariff: ['rezsi'],
    investment: 0,
    saving_fn: p => p.tariff === 'htnt' ? 12000 : 5500,
    difficulty: 1,
    payback: 0,
    first_step: 'A szárítógép 3–5 kWh-t fogyaszt menetenként — éjszakai NT-sávba tolva <strong>30–40%</strong> megtakarítás.',
    co2_kg: 55,
  },

  // ── KIS BEFEKTETÉS (0–50k Ft) ────────────────────────────────────────
  {
    id: 'htnt_switch', tier: 'small', icon: '',
    title: 'Váltás HT/NT (kétmérős) tarifára',
    not_tariff: ['htnt'],
    investment: 0,
    saving_fn: p => {
      const kwh = (p.monthlyBill / 46) * 12;
      return Math.round(kwh * 0.40 * 18);
    },
    difficulty: 2,
    payback: 0,
    first_step: 'Kérj <strong>ingyenes</strong> mérőcserét a hálózati elosztódtól (E.ON, NKM, Elmű-Émász). Online vagy telefonon intézhető, 1–3 hónap.',
    co2_kg: 120,
  },
  {
    id: 'boiler_timer', tier: 'small', icon: '',
    title: 'Digitális időzítő a bojlerhez',
    requires_devices: ['bojler'],
    investment: 5000,
    saving_fn: p => p.tariff === 'htnt' ? 42000 : 18000,
    difficulty: 2,
    payback: 1,
    first_step: '<strong>5 000 Ft-os mechanikus időzítő dugó</strong> (pl. Conrad, OBI) — dugd be a bojler elé, időzítsd 23:00–06:00-ra.',
    co2_kg: 190,
  },
  {
    id: 'smart_plug', tier: 'small', icon: '',
    title: 'Okos dugók + automatikus időzítők',
    investment: 15000,
    saving_fn: p => 14000,
    difficulty: 1,
    payback: 12,
    first_step: 'Vegyél <strong>2–3 WiFi-s okos dugót</strong> (Shelly, Gosund, ~5 000 Ft/db) — mobilalkalmazásból ütemezd be az eszközöket.',
    co2_kg: 65,
  },
  {
    id: 'led_retrofit', tier: 'small', icon: '',
    title: 'LED csere (halogén és izzósok)',
    investment: 20000,
    saving_fn: p => {
      const m = { small: 14000, medium: 20000, large: 28000, xlarge: 38000 };
      return m[p.homeSize] || 20000;
    },
    difficulty: 1,
    payback: 14,
    first_step: '<strong>Cseréld le</strong> a halogén/izzós lámpákat 2700K-es LED-ekre. 10 lámpa ~15–20 000 Ft, visszatérül 1–1,5 év alatt.',
    co2_kg: 90,
  },

  // ── KÖZEPES BEFEKTETÉS (50k–500k Ft) ────────────────────────────────
  {
    id: 'smart_thermostat', tier: 'medium', icon: '',
    title: 'Okos termosztát',
    requires_heating: ['gaz', 'hoszivattyu'],
    investment: 65000,
    saving_fn: p => p.heating === 'gaz' ? 38000 : 26000,
    difficulty: 3,
    payback: 20,
    first_step: 'Vegyél <strong>Google Nest Thermostat vagy Tado</strong> (~50–80 000 Ft) termosztátot, és szeresd be szerelővel (1–2 óra).',
    co2_kg: 150,
  },
  {
    id: 'insulation', tier: 'medium', icon: '',
    title: 'Hőszigetelés javítása',
    requires_home: ['haz'],
    investment: 300000,
    saving_fn: p => {
      const m = { gaz: 80000, elektromos: 60000, hoszivattyu: 45000, tavfutes: 40000 };
      return m[p.heating] || 55000;
    },
    difficulty: 4,
    payback: 48,
    first_step: '<strong>Kérj energetikai felmérést</strong> egy tanúsítótól (15–30 000 Ft) — ez megmutatja, hol a legnagyobb veszteség.',
    co2_kg: 320,
  },

  // ── NAGY BEFEKTETÉS (500k+) ──────────────────────────────────────────
  {
    id: 'solar', tier: 'large', icon: '',
    title: 'Napelem rendszer (4 kWp)',
    requires_home: ['haz'],
    investment: 2500000,
    saving_fn: p => {
      const m = { small: 130000, medium: 160000, large: 200000, xlarge: 240000 };
      return m[p.homeSize] || 160000;
    },
    difficulty: 5,
    payback: 192,
    first_step: 'Kérj legalább <strong>3 árajánlatot</strong> napelemszerelőtől (min. 4 kWp, mikroinverterrel). Fontos: helyszíni árnyékvizsgálat.',
    co2_kg: 720,
  },
  {
    id: 'heat_pump', tier: 'large', icon: '',
    title: 'Hőszivattyú (gázkazán váltás)',
    requires_heating: ['gaz'],
    investment: 3200000,
    saving_fn: () => 185000,
    difficulty: 5,
    payback: 216,
    first_step: 'Kérj <strong>felmérést és méretezést</strong> tanúsított hőszivattyú-telepítőtől. 25–35% állami támogatás elérhető.',
    co2_kg: 870,
  },
  {
    id: 'battery', tier: 'large', icon: '',
    title: 'Akkumulátor tárolás (napelem mellé)',
    requires_devices: ['napelemek'],
    investment: 2000000,
    saving_fn: () => 85000,
    difficulty: 5,
    payback: 288,
    first_step: 'Kérj <strong>10 kWh-s akkumulátor ajánlatot</strong> (LiFePO4 kémia) a napelem-szerelőtől. Rendszercsomag olcsóbb.',
    co2_kg: 380,
  },
];

// Utility
function advHuf(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.', ',') + ' M Ft';
  if (n >= 10000)   return Math.round(n / 1000) + ' ezer Ft';
  return n.toLocaleString('hu') + ' Ft';
}

function computeApplicableActions() {
  const p = _advProfile;
  return ADVISOR_ACTIONS.filter(a => {
    if (a.requires_devices && !a.requires_devices.some(d => p.devices.includes(d))) return false;
    if (a.not_tariff && a.not_tariff.includes(p.tariff)) return false;
    if (a.requires_home && !a.requires_home.includes(p.homeType)) return false;
    if (a.requires_heating && !a.requires_heating.includes(p.heating)) return false;
    if (parseInt(p.budget, 10) < a.investment) return false;
    return true;
  }).map(a => ({ ...a, annual_saving: a.saving_fn(p) }));
}

function openAdvisor() {
  _advStep = 0;
  _advProfile = { homeType: null, homeSize: null, heating: null, devices: [], monthlyBill: 15000, tariff: null, budget: null, priority: null };
  const ov = el('advOverlay');
  if (ov) ov.classList.remove('hidden');
  document.body.classList.add('coach-active');
  renderAdvStep();
}

function closeAdvisor() {
  const ov = el('advOverlay');
  if (ov) ov.classList.add('hidden');
  document.body.classList.remove('coach-active');
}

function renderAdvStep() {
  const totalSteps = ADV_TOTAL_STEPS;
  // Show/hide steps
  for (let i = 0; i < totalSteps; i++) {
    const s = el('advStep' + i);
    if (s) s.classList.toggle('hidden', i !== _advStep);
  }

  // Progress
  const fill = el('advProgressFill');
  if (fill) fill.style.width = ((_advStep + 1) / totalSteps * 100) + '%';
  const lbl = el('advStepLabel');
  if (lbl) lbl.textContent = (_advStep + 1) + ' / ' + totalSteps;

  // Back button
  const back = el('advBtnBack');
  if (back) back.classList.toggle('hidden', _advStep === 0);

  // Next button label
  const next = el('advBtnNext');
  if (next) {
    next.textContent = _advStep === totalSteps - 2 ? 'Tervemet kérem →' : (_advStep === totalSteps - 1 ? 'Bezárás' : 'Következő →');
    next.disabled = !advStepValid();
  }
}

function advStepValid() {
  switch (_advStep) {
    case 0: return _advProfile.homeType && _advProfile.homeSize && _advProfile.heating;
    case 1: return true; // devices are optional
    case 2: return _advProfile.tariff;
    case 3: return _advProfile.budget !== null && _advProfile.priority;
    case 4: return true;
    default: return true;
  }
}

function advNext() {
  if (_advStep === ADV_TOTAL_STEPS - 1) { closeAdvisor(); return; }
  if (!advStepValid()) return;

  if (_advStep === 1) {
    // collect device checkboxes
    _advProfile.devices = [];
    document.querySelectorAll('#advDeviceGrid input:checked').forEach(cb => {
      _advProfile.devices.push(cb.value);
    });
  }
  if (_advStep === 2) {
    const inp = el('advMonthlyBill');
    if (inp) _advProfile.monthlyBill = parseInt(inp.value, 10) || 15000;
  }

  _advStep++;

  if (_advStep === ADV_TOTAL_STEPS - 1) {
    buildAdvResults();
  }

  renderAdvStep();
}

function advBack() {
  if (_advStep === 0) return;
  _advStep--;
  renderAdvStep();
}

function buildAdvResults() {
  const actions = computeApplicableActions();

  // Sort: priority modifier
  const priorityBoost = { megtakaritas: a => -a.annual_saving, gyors: a => a.payback, kornyezet: a => -a.co2_kg, kenyelem: a => a.difficulty };
  const sortFn = priorityBoost[_advProfile.priority] || (a => -a.annual_saving);
  actions.sort((a, b) => sortFn(a) - sortFn(b));

  const totalSaving = actions.reduce((s, a) => s + a.annual_saving, 0);
  const freeCount   = actions.filter(a => a.investment === 0).length;
  const freeTotal   = actions.filter(a => a.investment === 0).reduce((s, a) => s + a.annual_saving, 0);

  // Summary
  const sumEl = el('advResultsSummary');
  if (sumEl) {
    const tierColors = { instant: '#34d058', small: '#58a6ff', medium: '#e3b341', large: '#bc8cff' };
    const tierNames  = { instant: 'Azonnali', small: 'Kis befektetés', medium: 'Közepes', large: 'Nagy befektetés' };
    const perTier = {};
    actions.forEach(a => { perTier[a.tier] = (perTier[a.tier] || 0) + a.annual_saving; });

    sumEl.innerHTML = `
      <div class="adv-summary-total">${advHuf(totalSaving)} / év</div>
      <div class="adv-summary-label">összesített éves megtakarítási potenciál — ${freeCount} intézkedés <strong>ingyenes</strong></div>
      <div class="adv-summary-breakdown">
        ${Object.entries(perTier).map(([t, v]) => `
          <div class="adv-sb-item">
            <div class="adv-sb-dot" style="background:${tierColors[t]}"></div>
            ${tierNames[t]}: <strong>${advHuf(v)}</strong>
          </div>`).join('')}
      </div>`;
  }

  // Action list
  const listEl = el('advResultsList');
  if (!listEl) return;

  const TIERS = ['instant', 'small', 'medium', 'large'];
  const TIER_LABELS = { instant: 'Azonnali — 0 Ft, holnaptól bevezethető', small: 'Kis befektetés — rövid visszafizetés', medium: 'Közepes projekt', large: 'Nagy befektetés — hosszú táv' };
  let html = '';

  TIERS.forEach(tier => {
    const tierActions = actions.filter(a => a.tier === tier);
    if (!tierActions.length) return;
    html += `<div class="adv-tier-label">${TIER_LABELS[tier]}</div>`;
    tierActions.forEach(a => {
      const diffDots = Array.from({length: 5}, (_, i) =>
        `<div class="adv-diff-dot${i < a.difficulty ? ' filled' : ''}"></div>`).join('');
      const paybackStr = a.payback === 0 ? 'Azonnal megtérül' : a.payback < 12 ? `${a.payback} hónap` : `${Math.round(a.payback / 12)} év`;
      const investStr  = a.investment === 0 ? 'Ingyenes' : advHuf(a.investment) + ' befektetés';

      html += `
        <div class="adv-action-card tier-${tier}">
          <div class="adv-action-top">
            <span class="adv-action-icon">${a.icon}</span>
            <span class="adv-action-title">${a.title}</span>
            <span class="adv-action-saving">+${advHuf(a.annual_saving)}/év</span>
          </div>
          <div class="adv-action-meta">
            <span class="adv-meta-pill">${investStr}</span>
            <span class="adv-meta-pill">${paybackStr}</span>
            <span class="adv-meta-pill">Nehézség: <span class="adv-difficulty">${diffDots}</span></span>
          </div>
          <div class="adv-action-step">Első lépés: ${a.first_step}</div>
        </div>`;
    });
  });

  listEl.innerHTML = html || '<p style="color:var(--text-muted);padding:16px 0">Nincs alkalmazható ajánlás — próbálj kisebb eszközlistát vagy nagyobb büdzsét.</p>';
}

// Option grid click delegation (wizard-specific, delegated from body)
document.addEventListener('DOMContentLoaded', () => {
  document.body.addEventListener('click', e => {
    // Advisor option grids
    const optionEl = e.target.closest('.adv-option');
    if (optionEl) {
      const grid = optionEl.closest('[data-key]');
      if (!grid) return;
      const key = grid.dataset.key;
      grid.querySelectorAll('.adv-option').forEach(o => o.classList.remove('selected'));
      optionEl.classList.add('selected');
      _advProfile[key] = optionEl.dataset.val;
      // Revalidate next button
      const next = el('advBtnNext');
      if (next) next.disabled = !advStepValid();
      return;
    }

    const action = e.target.closest('[data-action]')?.dataset?.action;
    switch (action) {
      case 'open-advisor':  openAdvisor();  break;
      case 'advisor-next':  advNext();      break;
      case 'advisor-back':  advBack();      break;
      case 'advisor-close': closeAdvisor(); break;
    }
  });
});

// -----------------------------------------------------------------------
// DEMO MÓD BANNER
// -----------------------------------------------------------------------
function showDemoBanner() {
  const existing = document.getElementById('demo-mode-banner');
  if (existing) {
    // Statikus placeholder megjelenítése és szöveg feltöltése
    if (!existing.textContent.trim()) {
      existing.textContent = 'Demo mód — az árak szimuláltak, nem valós ENTSO-E adat';
    }
    existing.style.display = 'flex';
    return;
  }
  // Fallback: dinamikus létrehozás, ha a placeholder hiányzik
  const kpiSection = el('kpiSection');
  if (!kpiSection) return;
  const banner = document.createElement('div');
  banner.id = 'demo-mode-banner';
  banner.textContent = 'Demo mód — az árak szimuláltak, nem valós ENTSO-E adat';
  kpiSection.parentNode.insertBefore(banner, kpiSection);
}

// -----------------------------------------------------------------------
// ONBOARDING ÉLŐADAT-LEKÉRÉS (/api/recommend)
// -----------------------------------------------------------------------
async function fetchRecommendForOnboarding(selectedIds, tariff, savEl, descEl) {
  try {
    // Lekérjük az összes kiválasztott eszközhöz a javaslatot párhuzamosan
    const results = await Promise.allSettled(
      selectedIds.map(id =>
        fetch(`/api/recommend?device_id=${encodeURIComponent(id)}&use_forecast=true`, { signal: AbortSignal.timeout(8000) })
          .then(r => r.ok ? r.json() : Promise.reject(r.status))
      )
    );

    // Sikeres lekérések összegzése
    let totalAnnual = 0;
    let successCount = 0;
    results.forEach(res => {
      if (res.status === 'fulfilled' && res.value) {
        const data = res.value;
        // annual_saving_estimate_huf az éves becslés; savings_huf mező esetén * 52
        const annual = data.savings_huf != null
          ? Math.round(data.savings_huf * 52)
          : (data.annual_saving_estimate_huf || 0);
        totalAnnual += annual;
        successCount++;
      }
    });

    if (successCount === 0) return; // ha minden kérés sikertelen, marad a statikus

    // Élő adatot mentjük globálisan (a savings_huf heti értékként tárolva a spec szerint)
    window._lastRecommendData = {
      savings_huf: Math.round(totalAnnual / 52),
      annual_saving_estimate_huf: totalAnnual,
      is_live: true,
    };

    // UI frissítés ÉLŐ badge-dzsel
    const annualEstimate = Math.round(window._lastRecommendData.savings_huf * 52);
    if (savEl) {
      if (tariff === 'rezsi') {
        savEl.innerHTML = `${fmtHUF(annualEstimate)} Ft <span class="source-badge badge-live">ÉLŐ</span>`;
        if (descEl) descEl.innerHTML = `<span style="color:var(--yellow)">Rezsivédett (egységáras) tarifán az időzítés önmagában nem csökkenti a számlát.</span><br>
          Ennyit spórolhatnál, <strong>ha kétmérős HT/NT tarifára váltanál.</strong><br>
          <small style="color:var(--text-muted)">ENTSO-E valós árak alapján számolva</small>`;
      } else {
        savEl.innerHTML = `${fmtHUF(annualEstimate)} Ft <span class="source-badge badge-live">ÉLŐ</span>`;
        if (descEl) {
          const baseDesc = tariff === 'htnt'
            ? 'Ez a HT (nappal) → NT (éjszaka/hétvége) áttöltéssel elérhető megtakarítás.'
            : 'Tőzsdei fogyasztóként az ENTSO-E csúcs–völgy különbségből adódó megtakarítás.';
          descEl.innerHTML = `${baseDesc}<br><small style="color:var(--text-muted)">Élő ENTSO-E árfolyam alapján számolva</small>`;
        }
      }
    }
  } catch (err) {
    // Hálózati hiba: csendesen marad a statikus becslés, nem dob hibaüzenetet
    console.warn('Onboarding recommend fetch sikertelen, statikus becsléssel folytatódik:', err);
  }
}
