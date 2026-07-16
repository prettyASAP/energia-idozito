# Handoff: Energia Időzítő — mobil app design

## Áttekintés
Az Energia Időzítő reszponzív, mobil-fókuszú webalkalmazás új UI designja. A cél: a felhasználó 3 mp alatt lássa, **mikor érdemes bekapcsolnia az eszközeit** az órás áramárak alapján. A meglévő alkalmazás (frontend/index.html + style.css + app.js) funkcióit tartja meg, átszervezve 4 tabos app-szerkezetbe.

## A design fájlokról
A csomagban lévő fájlok **HTML-ben készült design referenciák** (prototípusok), NEM production kód. A feladat: **újraépíteni ezt a designt a meglévő kódbázis környezetében** (jelenleg vanilla JS + CSS a frontend/ mappában — abban, vagy ha váltotok, az általatok választott keretrendszerben).

**FONTOS — nem implementálandó elemek:** az `Energia App iOS.dc.html`-ben látható **iPhone készülékkeret, státuszsor (9:41, térerő, akku), Dynamic Island és home indicator** csak prezentációs keret (`ios-frame.jsx`). Ezeket TILOS lefejleszteni — az app a böngésző natív viewportjában fut. A `.blueprint > .corner` "+" jelölők szintén rejtettek, hagyd ki őket.

## Fidelity
**High-fidelity.** Színek, tipográfia, térközök, lekerekítések, animációk véglegesek — pixelpontosan követendők.

## Design tokenek

Fontok (Google Fonts): **Barlow Condensed** 600 (headings, számok, címkék), **Barlow** 400/500 (body).

Színek (világos téma):
- Háttér `#f2f2f3` · felület `#e9e9ea` · szöveg `#1d1f20`
- Acélkék accent ramp: 100 `#eef6ff`, 200 `#d6ebff`, 300 `#b5d9fd`, 500 `#749dc4`, 600 `#597ea3`, 700 `#416180`, 800 `#2c455d`, 900 `#1d2d3d`
- Zöld (olcsó/spórolás): 100 `oklch(0.95 0.05 155)`, 300 `oklch(0.85 0.1 155)`, 500 `oklch(0.62 0.13 155)`, 700 `oklch(0.47 0.12 155)`
- Piros (drága/kerüld): 100 `oklch(0.95 0.04 25)`, 300 `oklch(0.83 0.09 25)`, 500 `oklch(0.58 0.17 25)`, 700 `oklch(0.46 0.15 25)`
- Elválasztó: `color-mix(in srgb, #1d1f20 16%, transparent)`

Dark téma (CSS-változó felülírás, `.theme-dark`):
- Háttér `#141619` · felület `#1e2126` · szöveg `#e8e9eb`
- accent-100→`#1d2d3d`, accent-200→`#2c455d`, accent-700→`#94bce3`, accent-800→`#b5d9fd`
- good-100→`oklch(0.3 0.05 155)`, good-700→`oklch(0.8 0.11 155)`; bad ugyanígy tükrözve
- A sötét mezős boxok (hero, KPI) szövege fix `#f5f5f8` — témafüggetlen

Színszemantika: **zöld = olcsó / indítsd / megtakarítás · acélkék = semleges / várj / átlagos · piros = drága / kerüld**.

Lekerekítés: kártyák/boxok 16px · gombok/chipek 12px · címkék (tag) pill (999px) · inputok 10px · hőtérkép-cellák és ikonlapkák 9px · bottom sheet felül 22px.
Árnyék: kártyák `0 1px 2px rgba(43,43,45,.14)`; sheet `0 12px 32px rgba(43,43,45,.22)`.
Érintési célok: min. 44px.

## Szerkezet
- **Fejléc** (felül rögzített, üveghatás: `background: color-mix(in srgb, <bg> 72%, transparent); backdrop-filter: blur(16px) saturate(160%)`): ⚡ logó + "Energia Időzítő" (Barlow Condensed 19px) balra, "ENTSO-E · élő" outline pill jobbra.
- **Alsó tab-sáv** (rögzített, ugyanaz az üveghatás, 4 egyenlő oszlop): Ma ⚡ · Árak ▦ · Spórolás $ · Tervek 🗓 — vékony (1.5 stroke) Lucide-stílusú ikon 21px + 10px UPPERCASE felirat; aktív: accent-700 szín + 2px felső accent csík; inaktív: neutral-600.
- A tartalom a két sáv ALATT görgethető, a lista végén ~104px ráhagyás.

## Képernyők

### 1. Ma (főképernyő)
- **Hero box**: accent-900 háttér + finom 22px-es rácsminta (`#b5d9fd` 6%-os vonalak) + jobb felső radiális fény; 16px radius. Tartalma: státusz pill (Most olcsó = zöld/fehér · Átlagos ár = `#d6ebff`/`#2c455d` · Most drága = piros/fehér) és jobbra "● Élő ár" (pulzáló pötty, 2.2s); alatta az ár **62px Barlow Condensed** (szín: zöld-300/`#d6ebff`/piros-300 a szint szerint) + "FT / KWH" egység + jobbra trend `▲ +x,x%` (növekvés zöld, csökkenés piros, előző órához képest); alul elválasztó vonal + 13px magyarázó szöveg. Betöltéskor az ár 900ms alatt számlálóval pörög fel (ease-out cubic).
- **"Mikor kapcsoljam be?"** szekció (kicker: 11px UPPERCASE accent-700 "AJÁNLÁS", cím 22px): 2 oszlopos kártyarács, 12px gap. Kártya: 16px radius, tartalom: ikonlapka (32px, 9px radius) + státusz pill jobbra; eszköznév 16px BC; "Legjobb ablak" felirat + időintervallum (14px, accent-700); elválasztó; spórolás sor (10.5px, zöld-700, pl. "~12 Ft / futtatás · 6000 Ft / év"). Állapotok: **Indítsd most** → zöld-100 kártyaháttér, zöld-500 ikonlapka és pill; **Várj X ó** → accent-100 háttér, accent-500 lapka, accent-200/accent-800 pill. Eszközök: Mosógép (1.0 kWh, 2ó), Mosogatógép (1.2, 2), Bojler (8, 3), Klíma (2.5, 4), EV töltő (11, 4), Szárítógép (2.5, 2). "Legjobb ablak" = a következő 24 óra legolcsóbb összefüggő sávja az eszköz futásidejére.
- **CTA**: teljes szélességű primary gomb (accent-500 kitöltés, fehér BC szöveg, 48px) → onboarding sheet.

### 2. Árak
- **Hőtérkép**: felület-háttérű kártyában 6×4 rács (24 óra), cella: óraszám (13px BC) + ár (9px); szín: olcsó zöld-500/fehér, átlagos accent-200/accent-900, drága piros-500/fehér. Szintek: napi árak alsó/felső tercilise. Aktuális óra: szaggatott sötét outline; koppintásra kijelölés + alatta részletsor ("14:00–15:00 · 23,4 Ft/kWh · olcsó"). Jelmagyarázat 3 színponttal.
- **48 órás oszlopdiagram**: SVG, oszloponként szint-szín, holnapi 24 óra 45% opacitással; tengelyfeliratok 6 óránként. Betöltéskor oszlopok alulról nőnek (scaleY, 0.5s, 12ms stagger).
- Források lábjegyzet linkekkel (ENTSO-E, EKB, MEKH, MAVIR).

### 3. Spórolás
- **KPI dark box** (accent-900): balra 40px BC zöld-300 összeg + "FT / ÉV BECSÜLT MEGTAKARÍTÁS"; jobbra **88px kördiagram**: 6px vastag gyűrű (háttér: `#b5d9fd` 18%), zöld-300 ív animáltan telik (1s), közepén HTML-rétegben középre igazítva "X%" (19px BC) + "a számládból" (9px). % = éves spórolás / 180 000 Ft.
- Két kis KPI kártya (accent-100 háttér): Ft/hó és kg CO₂/év, zöld-700 számok.
- CTA → onboarding sheet.
- **HT/NT kalkulátor**: 2 number input (Havi fogyasztás kWh = 200, Éjszakára áttehető % = 40), élőben számol: `kWh × %/100 × (42−26) Ft × 12` → zöld eredmény (26px BC) + havi bontás + MEKH link.

### 4. Tervek
- **Klíma / Napelem** szegmens-kapcsoló (aktív: accent kitöltés).
- **Idősávos menetrend** (nem blokk-csík!): soronként 12×38px színes jelölősáv + fázisnév (15px BC) + rövid teendő (11.5px muted) + időintervallum jobbra (15px BC accent-700). Fázisok klíma: Előhűtés (accent-500) / Futtathatod (accent-200) / Hőtartalékon (neutral-800, "Kapcsold ki — a lakás hőtartaléka viszi.") / Hagyd kikapcsolva (neutral-200, "Nincs teendő — hűvös éjszakai órák."). Napelem: Napelem csúcs (accent-500) / Részleges termelés (accent-200) / Olcsó hálózat (accent-100) / Kerüld! (piros-500) / Semleges. Egymást követő azonos fázisú órák összevonva egy sorba. Alul 1 soros tipp.
- CTA → tanácsadó sheet.

## Bottom sheet-ek (modálok)
Mindkettő alulról csúszik fel (0.5s `cubic-bezier(.32,1.2,.42,1)`, enyhe túllendülés), háttér 50% sötétítés fade-del, sheet felül 22px radius, max-height 82–88%, belül görgethető.

**Onboarding (3 lépés, "X / 3 · Kalkulátor" + ✕):**
1. Eszközválasztó chip-rács 2 oszlopban (8 eszköz, multi-select; kiválasztva accent kitöltés fehér szöveggel) — Kihagyom / Tovább.
2. Tarifa (Rezsivédett/HT-NT/Piaci, single) + rugalmasság (Előre tervezem/Néha igen/Nehézkes) — Vissza / Számítsd ki.
3. Eredmény dark boxban (40px zöld-300 összeg) + tarifafüggő magyarázat + forrás — Vissza / Mutasd az ablakokat (bezár, Ma tabra vált).
Számítás: Σ eszköz-éves-érték × tarifaszorzó (rezsi 0.45 / htnt 1.0 / piaci 1.3) × rugalmasság (1.0/0.7/0.4). Eszközértékek: mosógép 6000, mosogatógép 5000, bojler 18000, klíma 9000, EV 30000, szárító 7000, hőszivattyú 15000, napelem 12000 Ft/év.

**Tanácsadó (5 lépés, progress bar + "X / 5"):**
1. Otthon: ingatlantípus (Ház/Tégla/Panel), alapterület (4 opció), fűtés (Gáz/Hőszivattyú/Elektromos/Távfűtés).
2. Eszközök (multi chip).
3. Havi számla (number input, default 15 000 Ft) + tarifa.
4. Befektetési keret (0 / ~100e / ~500e / bármennyi) + prioritás (spórolás/gyors/környezet/kényelem).
5. Eredmény: max 5 rangsorolt ajánláskártya — sorszám + cím (15px BC), költség-pill (Ingyenes / ~25e Ft / ~3,5 M Ft), leírás, zöld megtakarítás-sor; felül összegző mondat. Szűrés: költség ≤ keret és feltételek (pl. napelem csak háznál); rendezés prioritás szerint. A pontos szabálylista a design fájl logic osztályában (`advRecsList`).

## Animációk
- Belépés: szekciók `fadeUp` 0.4s (opacity + 10px translateY), 2. szekció +0.08s késleltetés; eszközkártyák 60ms, hőtérkép-cellák 15ms stagger.
- Gombok: nyomásra `scale(.96)` 0.12s.
- Élő pötty: 2.2s box-shadow pulzus. Ár: 900ms count-up. Gyűrű: 1s dashoffset. Oszlopok: 0.5s scaleY.

## State
- `tab` (ma/arak/sporolas/tervek), `selHour`, `planTab`, `htntKwh/htntPct`, onboarding (open/step/devices/tariff/flex/done), advisor (open/step/válaszok), dark mode flag.
- Adat: 48 órás árlista (ENTSO-E day-ahead + EUR/HUF a meglévő backendből); a designban demó áradat van — a valós API-ra kötendő. Percenkénti újraszámolás (aktuális óra).

## Assets
Nincsenek képek. Ikonok: Lucide (lucide.dev), stroke-width 1.5. A design fájlban inline SVG path-ok vannak — cserélhetők a megfelelő Lucide ikonokra (washing-machine, zap, air-vent stb.).

## Fájlok
- `Energia App iOS.dc.html` — a teljes design (markup + logika); a `<x-dc>` blokk a UI, a `data-dc-script` blokk a viselkedés referenciája
- `styles.css` — a design system token- és komponensrétege (Industry)
- `ios-frame.jsx` — CSAK prezentációs iPhone-keret, NEM implementálandó
