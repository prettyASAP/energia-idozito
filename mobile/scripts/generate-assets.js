#!/usr/bin/env node
/* eslint-disable */
// App-ikon, adaptív ikon, splash, értesítési ikon és Play feature graphic generálása SVG-ből.
// Futtatás: node scripts/generate-assets.js   (Chromium kell: a Playwright csomag globálisan vagy lokálisan)
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function loadPlaywright() {
  try { return require('playwright'); } catch (_) {}
  const root = execSync('npm root -g').toString().trim();
  return require(path.join(root, 'playwright'));
}

const BOLT = 'M13 2L3 14h7l-1 8 10-12h-7l1-8';
const NAVY = '#1d2d3d';
const BLUE = '#b5d9fd';

const bolt = (size, color, scale, strokeW, offsetY = 0) => {
  const s = size * scale;
  const tx = (size - s) / 2;
  const ty = (size - s) / 2 + offsetY;
  return `<g transform="translate(${tx} ${ty}) scale(${s / 24})"><path d="${BOLT}" fill="${color}" stroke="${color}" stroke-width="${strokeW}" stroke-linejoin="round" stroke-linecap="round"/></g>`;
};

const svgs = {
  'icon.png': (S = 1024) => `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
    <defs><radialGradient id="g" cx="88%" cy="-12%" r="110%"><stop offset="0" stop-color="#749dc4" stop-opacity=".55"/><stop offset=".62" stop-color="#749dc4" stop-opacity="0"/></radialGradient>
    <pattern id="grid" width="${S / 12}" height="${S / 12}" patternUnits="userSpaceOnUse"><path d="M ${S / 12} 0 L 0 0 0 ${S / 12}" fill="none" stroke="${BLUE}" stroke-opacity=".08" stroke-width="3"/></pattern></defs>
    <rect width="${S}" height="${S}" fill="${NAVY}"/><rect width="${S}" height="${S}" fill="url(#grid)"/><rect width="${S}" height="${S}" fill="url(#g)"/>
    ${bolt(S, '#98e2b1', 0.62, 0.9)}</svg>`,
  'android-icon-foreground.png': (S = 1024) => `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${bolt(S, '#98e2b1', 0.42, 0.9)}</svg>`,
  'android-icon-background.png': (S = 1024) => `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}"><defs><radialGradient id="g" cx="88%" cy="-12%" r="110%"><stop offset="0" stop-color="#749dc4" stop-opacity=".55"/><stop offset=".62" stop-color="#749dc4" stop-opacity="0"/></radialGradient></defs><rect width="${S}" height="${S}" fill="${NAVY}"/><rect width="${S}" height="${S}" fill="url(#g)"/></svg>`,
  'android-icon-monochrome.png': (S = 1024) => `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${bolt(S, '#ffffff', 0.42, 0.9)}</svg>`,
  'splash-icon.png': (S = 1024) => `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${bolt(S, '#98e2b1', 0.7, 0.9)}</svg>`,
  'notification-icon.png': (S = 96) => `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${bolt(S, '#ffffff', 0.85, 1.2)}</svg>`,
  'favicon.png': (S = 48) => `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}"><rect width="${S}" height="${S}" rx="${S * 0.22}" fill="${NAVY}"/>${bolt(S, '#98e2b1', 0.65, 0.9)}</svg>`,
};

const featureGraphic = () => `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
  <defs><radialGradient id="g" cx="88%" cy="-12%" r="110%"><stop offset="0" stop-color="#749dc4" stop-opacity=".55"/><stop offset=".62" stop-color="#749dc4" stop-opacity="0"/></radialGradient>
  <pattern id="grid" width="44" height="44" patternUnits="userSpaceOnUse"><path d="M 44 0 L 0 0 0 44" fill="none" stroke="${BLUE}" stroke-opacity=".08" stroke-width="2"/></pattern></defs>
  <rect width="1024" height="500" fill="${NAVY}"/><rect width="1024" height="500" fill="url(#grid)"/><rect width="1024" height="500" fill="url(#g)"/>
  <g transform="translate(120 130) scale(10)"><path d="${BOLT}" fill="#98e2b1" stroke="#98e2b1" stroke-width=".9" stroke-linejoin="round"/></g>
  <text x="400" y="228" font-family="'Barlow Condensed', 'Arial Narrow', Arial, sans-serif" font-weight="700" font-size="78" fill="#f5f5f8">Energia Időzítő</text>
  <text x="402" y="288" font-family="Barlow, Arial, sans-serif" font-size="27" fill="#d6ebff">Mikor olcsó az áram? Indítsd akkor a gépeket.</text>
</svg>`;

(async () => {
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const assetsDir = path.join(__dirname, '..', 'assets');
  const storeDir = path.join(__dirname, '..', 'store');
  fs.mkdirSync(assetsDir, { recursive: true });
  fs.mkdirSync(storeDir, { recursive: true });
  const render = async (svg, file, w, h, transparent) => {
    await page.setViewportSize({ width: w, height: h });
    await page.setContent(`<html><body style="margin:0;background:${transparent ? 'transparent' : NAVY}">${svg}</body></html>`);
    await page.screenshot({ path: file, omitBackground: !!transparent, clip: { x: 0, y: 0, width: w, height: h } });
    console.log('✓', path.relative(process.cwd(), file));
  };
  for (const [name, fn] of Object.entries(svgs)) {
    const size = name === 'notification-icon.png' ? 96 : name === 'favicon.png' ? 48 : 1024;
    const transparent = /foreground|monochrome|splash|notification|favicon/.test(name);
    await render(fn(size), path.join(assetsDir, name), size, size, transparent);
  }
  await render(featureGraphic(), path.join(storeDir, 'feature-graphic.png'), 1024, 500, false);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
