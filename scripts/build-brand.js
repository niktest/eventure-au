// Festlio brand asset builder
// Produces wordmark SVGs, monogram, favicons, OG card.
//
// Run from the repo root:
//   node scripts/build-brand.js
//
// Requires `opentype.js` and `sharp`. The repo already depends on `sharp`;
// add `opentype.js` as a devDependency if you need to re-run this.
// Plus Jakarta Sans ExtraBold + SemiBold TTFs must be installed at the paths
// hard-coded below (or edit the FONT_PATH constants).

const fs = require('fs');
const path = require('path');
const opentype = require('opentype.js');
const sharp = require('sharp');

const FONT_EXTRABOLD = process.env.FESTLIO_FONT_EXTRABOLD || '/paperclip/.fonts/PlusJakartaSans-ExtraBold.ttf';
const FONT_SEMIBOLD  = process.env.FESTLIO_FONT_SEMIBOLD  || '/paperclip/.fonts/PlusJakartaSans-SemiBold.ttf';

const OUT = path.resolve(__dirname, '..', 'public');
const BRAND_OUT = path.join(OUT, 'brand');
fs.mkdirSync(BRAND_OUT, { recursive: true });

// --- Brand tokens (mirror src/app/globals.css) ------------------------------
const COLOR = {
  neonCoral: '#FF5A36',
  neonMagenta: '#FF3FA4',
  neonOcean: '#1FE3D6',
  neonSunshine: '#FFD23F',
  surface0: '#0B0D12',
  surface1: '#13161D',
  ink: '#0B1C30',          // on-surface (dark text)
  inkSoft: '#3F465C',
  white: '#FFFFFF',
  onDarkStrong: '#F4F6FB',
  onDarkMuted: '#A8B0C0',
};

const FONT = opentype.parse(fs.readFileSync(FONT_EXTRABOLD).buffer);
const FONT_SEMI = opentype.parse(fs.readFileSync(FONT_SEMIBOLD).buffer);

// --- Helpers ---------------------------------------------------------------
function getGlyphs(font, text) {
  // Bypass stringToGlyphs (which trips on the cmap CCMP feature) by going
  // char-by-char via charToGlyph.
  const out = [];
  for (const ch of text) out.push(font.charToGlyph(ch));
  return out;
}

function textPath(font, text, fontSize, x = 0, y = 0, opts = {}) {
  // opentype.js' getPath() at fractional offsets occasionally produces NaN
  // coordinates. Build the path glyph-by-glyph at integer offsets, then
  // assemble the per-glyph paths into one `d` string using `M`-translate
  // arithmetic via a transform applied at SVG time (we just round cursor).
  const tracking = opts.letterSpacing ?? 0;
  const glyphs = getGlyphs(font, text);
  const scale = fontSize / font.unitsPerEm;
  let cursor = x;
  const segments = [];
  for (let i = 0; i < glyphs.length; i++) {
    const g = glyphs[i];
    // Round to avoid floating-point oddities in opentype.js
    const p = g.getPath(Math.round(cursor * 1000) / 1000, y, fontSize);
    const d = p.toPathData(2);
    if (d.includes('NaN')) {
      // Fall back: render at integer cursor.
      const p2 = g.getPath(Math.round(cursor), y, fontSize);
      segments.push(p2.toPathData(2));
    } else {
      segments.push(d);
    }
    cursor += g.advanceWidth * scale + tracking * fontSize;
    if (i < glyphs.length - 1) {
      const kern = font.getKerningValue(g, glyphs[i + 1]);
      cursor += kern * scale;
    }
  }
  const d = segments.join(' ');
  return { d, width: cursor - x };
}

function measure(font, text, fontSize, letterSpacing = 0) {
  const glyphs = getGlyphs(font, text);
  const scale = fontSize / font.unitsPerEm;
  let w = 0;
  for (let i = 0; i < glyphs.length; i++) {
    w += glyphs[i].advanceWidth * scale;
    if (i < glyphs.length - 1) {
      const kern = font.getKerningValue(glyphs[i], glyphs[i + 1]);
      w += kern * scale;
    }
    if (i < glyphs.length - 1) w += letterSpacing * fontSize;
  }
  return w;
}

// --- Wordmark "Festlio" -----------------------------------------------------
// We render "Festl" + "o" as outlined paths and replace the "i" with a custom
// stem (vertical bar) topped by a 4-pointed sparkle in the brand gradient.
// This gives the wordmark a single signature mark that doubles as the brand
// glyph (sparkle) — it appears in every other application of the identity.

function buildWordmark({ fontSize = 200, letterSpacing = -0.005 } = {}) {
  const ls = letterSpacing;

  // Slice "Festl" and "o" so the "i" is custom.
  const fest = textPath(FONT, 'Festl', fontSize, 0, 0, { letterSpacing: ls });
  const festWidth = fest.width;

  // The "i" stem: width matches font's lowercase i stem roughly.
  // Plus Jakarta ExtraBold lowercase 'i' has a stem ~ 0.13em wide.
  const stemW = fontSize * 0.13;
  // x-height baseline: 'i' baseline is at y=0; cap of 'i' stem ends ~0.72 em above baseline.
  // We want the stem to sit between the same x-height as other lowercase letters.
  // Insert a small advance gap before/after to mimic original spacing.
  const iAdvance = measure(FONT, 'i', fontSize) + 2 * (ls * fontSize);
  // letter 'i' centre relative to its advance — stem is centred-ish
  const iStemX = festWidth + (iAdvance - stemW) / 2 + fontSize * 0.005;
  // x-height of Plus Jakarta ExtraBold ~ 0.5 em → stem top
  const stemTopY = -fontSize * 0.535;
  const stemBottomY = 0;
  const stemRadius = stemW / 2;

  // Sparkle (4-point star): centered above the stem at the dot height.
  const dotCx = iStemX + stemW / 2;
  const dotCy = -fontSize * 0.78; // dot centre
  const sparkleR = fontSize * 0.13;       // outer radius
  const sparkleInner = sparkleR * 0.35;   // inner radius (waist)
  function sparklePath(cx, cy, R, r) {
    // 4-point star with cubic concave sides for a soft sparkle look.
    const top = `M ${cx} ${cy - R}`;
    // Top → right via inner
    const seg = (a, b) => `Q ${cx + (a) * 0} ${cy + (a) * 0} ${cx + b.x} ${cy + b.y}`;
    // Use simple polygon with curved sides via Q with control at (cx,cy) — gives soft star.
    const pts = [
      { x: 0, y: -R },
      { x: r, y: -r },
      { x: R, y: 0 },
      { x: r, y: r },
      { x: 0, y: R },
      { x: -r, y: r },
      { x: -R, y: 0 },
      { x: -r, y: -r },
    ];
    let d = `M ${cx + pts[0].x} ${cy + pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      d += ` L ${cx + pts[i].x} ${cy + pts[i].y}`;
    }
    d += ' Z';
    return d;
  }
  const sparkleD = sparklePath(dotCx, dotCy, sparkleR, sparkleInner);

  // 'o' after the i.
  const oStartX = iStemX - stemW / 2 + iAdvance + fontSize * 0.005; // small visual nudge
  // Actually we should place 'o' at festWidth + iAdvance to keep advance integrity:
  const oX = festWidth + iAdvance;
  const oPath = textPath(FONT, 'o', fontSize, oX, 0, { letterSpacing: ls });
  const totalWidth = oX + oPath.width;

  // Stem path: rounded-end vertical bar via two semicircles
  // (we use a path with arcs for crisp ends).
  const stemD = [
    `M ${iStemX} ${stemTopY + stemRadius}`,
    `a ${stemRadius} ${stemRadius} 0 0 1 ${stemW} 0`,
    `L ${iStemX + stemW} ${stemBottomY - stemRadius}`,
    `a ${stemRadius} ${stemRadius} 0 0 1 ${-stemW} 0`,
    `Z`,
  ].join(' ');

  // Combined letter path (Festl + o), excluding i's custom parts.
  const letterPathD = fest.d + ' ' + oPath.d;

  // Bounding box: ascender ~ -0.78em (sparkle outer), descender 0; pad.
  const xMin = -fontSize * 0.04;
  const xMax = totalWidth + fontSize * 0.04;
  const yMin = dotCy - sparkleR - fontSize * 0.05;
  const yMax = fontSize * 0.05;
  const w = xMax - xMin;
  const h = yMax - yMin;

  return { letterPathD, stemD, sparkleD, totalWidth, viewBox: `${xMin} ${yMin} ${w} ${h}`, w, h, fontSize, dotCx, dotCy, sparkleR };
}

const wm = buildWordmark({ fontSize: 200 });

// --- SVG templates ----------------------------------------------------------
function svgWordmark({ inkColor, useGradientSparkle = true, sparkleColor }) {
  const gradId = 'fl-grad';
  const grad = `<defs>
    <linearGradient id="${gradId}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${COLOR.neonCoral}"/>
      <stop offset="1" stop-color="${COLOR.neonMagenta}"/>
    </linearGradient>
  </defs>`;
  const sparkleFill = useGradientSparkle ? `url(#${gradId})` : (sparkleColor ?? COLOR.neonCoral);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${wm.viewBox}" role="img" aria-label="Festlio">
  ${useGradientSparkle ? grad : ''}
  <g>
    <path d="${wm.letterPathD}" fill="${inkColor}"/>
    <path d="${wm.stemD}" fill="${inkColor}"/>
    <path d="${wm.sparkleD}" fill="${sparkleFill}"/>
  </g>
</svg>`;
}

// 1. Primary wordmark — dark ink + gradient sparkle (for light backgrounds)
fs.writeFileSync(path.join(BRAND_OUT, 'festlio-wordmark.svg'),
  svgWordmark({ inkColor: COLOR.ink, useGradientSparkle: true }));

// 2. Light wordmark — white ink + gradient sparkle (for dark backgrounds)
fs.writeFileSync(path.join(BRAND_OUT, 'festlio-wordmark-light.svg'),
  svgWordmark({ inkColor: COLOR.white, useGradientSparkle: true }));

// 3. Mono dark — single colour (ink only) for embossing / single-colour uses
fs.writeFileSync(path.join(BRAND_OUT, 'festlio-wordmark-mono-dark.svg'),
  svgWordmark({ inkColor: COLOR.ink, useGradientSparkle: false, sparkleColor: COLOR.ink }));

// 4. Mono light — single colour (white only)
fs.writeFileSync(path.join(BRAND_OUT, 'festlio-wordmark-mono-light.svg'),
  svgWordmark({ inkColor: COLOR.white, useGradientSparkle: false, sparkleColor: COLOR.white }));

// 5. Lockup with tagline ----------------------------------------------------
function svgLockup({ inkColor, taglineColor, useGradientSparkle = true }) {
  const gradId = 'fl-grad-lk';
  const grad = `<defs>
    <linearGradient id="${gradId}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${COLOR.neonCoral}"/>
      <stop offset="1" stop-color="${COLOR.neonMagenta}"/>
    </linearGradient>
  </defs>`;
  const sparkleFill = useGradientSparkle ? `url(#${gradId})` : inkColor;
  // Tagline below baseline, set in SemiBold ~0.18em
  const taglineSize = wm.fontSize * 0.16;
  const tagline = textPath(FONT_SEMI, 'EVENTS & ENTERTAINMENT', taglineSize, 0, 0, { letterSpacing: 0.16 });
  // Center the tagline under the wordmark
  const tagX = (wm.totalWidth - tagline.width) / 2;
  const tagY = wm.fontSize * 0.18; // below baseline
  // Adjust viewbox to include tagline
  const yMin = wm.viewBox.split(' ')[1];
  const newH = parseFloat(wm.h) + tagY + taglineSize * 0.4;
  const newViewBox = wm.viewBox.split(' ').slice(0,3).join(' ') + ' ' + newH;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${newViewBox}" role="img" aria-label="Festlio Events &amp; Entertainment">
  ${grad}
  <path d="${wm.letterPathD}" fill="${inkColor}"/>
  <path d="${wm.stemD}" fill="${inkColor}"/>
  <path d="${wm.sparkleD}" fill="${sparkleFill}"/>
  <g transform="translate(${tagX}, ${tagY})"><path d="${tagline.d}" fill="${taglineColor}"/></g>
</svg>`;
}

fs.writeFileSync(path.join(BRAND_OUT, 'festlio-lockup.svg'),
  svgLockup({ inkColor: COLOR.ink, taglineColor: COLOR.inkSoft }));
fs.writeFileSync(path.join(BRAND_OUT, 'festlio-lockup-light.svg'),
  svgLockup({ inkColor: COLOR.white, taglineColor: COLOR.onDarkMuted }));

// --- Monogram glyph --------------------------------------------------------
// "F" + sparkle accent on a rounded-square gradient tile.
// Designed to read clearly down to 32×32 (sparkle visible) and 16×16 (just F).

function buildMonogram({ size = 512, withSparkle = true, withTile = true, simplified = false }) {
  const radius = size * 0.22;
  // Plus Jakarta Sans ExtraBold "F" sized to fill ~62% of tile height.
  const fSize = size * 0.74;
  const fGlyph = FONT.charToGlyph('F');
  const fbb = fGlyph.getPath(0, 0, fSize).getBoundingBox();
  const fW = fbb.x2 - fbb.x1;
  const fH = fbb.y2 - fbb.y1;
  // Centre the F glyph
  const fX = (size - fW) / 2 - fbb.x1;
  const fY = (size + fH) / 2 - fbb.y2;
  const fPath = fGlyph.getPath(fX, fY, fSize);
  const fPathD = fPath.toPathData(2);

  // Sparkle: top-right corner of the F, picking up the gradient (or white if on gradient tile)
  const sparkleR = size * 0.085;
  const sparkleInner = sparkleR * 0.35;
  // place over the top-right area inside the tile
  const sparkleCx = size * 0.78;
  const sparkleCy = size * 0.27;
  function sparklePath(cx, cy, R, r) {
    const pts = [
      { x: 0, y: -R }, { x: r, y: -r },
      { x: R, y: 0 },  { x: r, y: r },
      { x: 0, y: R },  { x: -r, y: r },
      { x: -R, y: 0 }, { x: -r, y: -r },
    ];
    let d = `M ${cx + pts[0].x} ${cy + pts[0].y}`;
    for (let i = 1; i < pts.length; i++) d += ` L ${cx + pts[i].x} ${cy + pts[i].y}`;
    return d + ' Z';
  }
  const sparkleD = sparklePath(sparkleCx, sparkleCy, sparkleR, sparkleInner);

  return { fPathD, sparkleD, radius, size };
}

function svgMonogramOnGradient({ size = 512, withSparkle = true, includeBg = true, padding = 0 }) {
  const m = buildMonogram({ size });
  const gradId = 'mn-bg';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="Festlio">
  <defs>
    <linearGradient id="${gradId}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${COLOR.neonCoral}"/>
      <stop offset="1" stop-color="${COLOR.neonMagenta}"/>
    </linearGradient>
  </defs>
  ${includeBg ? `<rect width="${size}" height="${size}" rx="${m.radius}" ry="${m.radius}" fill="url(#${gradId})"/>` : ''}
  <path d="${m.fPathD}" fill="${COLOR.white}"/>
  ${withSparkle ? `<path d="${m.sparkleD}" fill="${COLOR.white}" opacity="0.92"/>` : ''}
</svg>`;
}

function svgMonogramSimple({ size = 512, ink = COLOR.ink }) {
  // No tile, no sparkle — flat F for monochrome use.
  const m = buildMonogram({ size });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="Festlio">
  <path d="${m.fPathD}" fill="${ink}"/>
</svg>`;
}

fs.writeFileSync(path.join(BRAND_OUT, 'festlio-mark.svg'),
  svgMonogramOnGradient({ size: 512, withSparkle: true }));
fs.writeFileSync(path.join(BRAND_OUT, 'festlio-mark-no-tile.svg'),
  svgMonogramOnGradient({ size: 512, withSparkle: true, includeBg: false }));
fs.writeFileSync(path.join(BRAND_OUT, 'festlio-mark-mono-dark.svg'),
  svgMonogramSimple({ size: 512, ink: COLOR.ink }));
fs.writeFileSync(path.join(BRAND_OUT, 'festlio-mark-mono-light.svg'),
  svgMonogramSimple({ size: 512, ink: COLOR.white }));

// --- Favicon set -----------------------------------------------------------
// Source SVG = monogram on gradient tile.
// For 16/32, use a *simplified* version with no sparkle to keep the F readable.

const faviconSourceFull = svgMonogramOnGradient({ size: 512, withSparkle: true });
const faviconSourceSimple = svgMonogramOnGradient({ size: 512, withSparkle: false });

async function buildPng(svg, size, outPath) {
  const buf = await sharp(Buffer.from(svg), { density: 384 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
  fs.writeFileSync(outPath, buf);
  return buf;
}

// Minimal ICO writer: bundles raw PNG payloads into an ICONDIR.
function writeIco(pngBuffers, outPath) {
  // ICONDIR: 6 bytes
  // ICONDIRENTRY: 16 bytes per image
  const n = pngBuffers.length;
  const headerSize = 6 + 16 * n;
  const buffers = [];
  const dir = Buffer.alloc(headerSize);
  dir.writeUInt16LE(0, 0);     // reserved
  dir.writeUInt16LE(1, 2);     // type 1 = icon
  dir.writeUInt16LE(n, 4);     // count
  let offset = headerSize;
  pngBuffers.forEach((entry, i) => {
    const { size, png } = entry;
    const w = size === 256 ? 0 : size;
    const h = size === 256 ? 0 : size;
    const e = i * 16;
    dir.writeUInt8(w, 6 + e);              // width
    dir.writeUInt8(h, 7 + e);              // height
    dir.writeUInt8(0, 8 + e);              // colour count (0 for >=256 colours)
    dir.writeUInt8(0, 9 + e);              // reserved
    dir.writeUInt16LE(1, 10 + e);          // color planes
    dir.writeUInt16LE(32, 12 + e);         // bits per pixel
    dir.writeUInt32LE(png.length, 14 + e); // size of image data
    dir.writeUInt32LE(offset, 18 + e);     // offset
    offset += png.length;
  });
  buffers.push(dir);
  for (const e of pngBuffers) buffers.push(e.png);
  fs.writeFileSync(outPath, Buffer.concat(buffers));
}

(async () => {
  // PNGs at multiple sizes. 16/32/48 use the simplified mark.
  const png16 = await buildPng(faviconSourceSimple, 16, path.join(BRAND_OUT, 'icon-16.png'));
  const png32 = await buildPng(faviconSourceSimple, 32, path.join(BRAND_OUT, 'icon-32.png'));
  const png48 = await buildPng(faviconSourceSimple, 48, path.join(BRAND_OUT, 'icon-48.png'));
  const png180 = await buildPng(faviconSourceFull, 180, path.join(OUT, 'apple-touch-icon.png'));
  const png192 = await buildPng(faviconSourceFull, 192, path.join(OUT, 'icon-192.png'));
  const png512 = await buildPng(faviconSourceFull, 512, path.join(OUT, 'icon-512.png'));

  writeIco([
    { size: 16, png: png16 },
    { size: 32, png: png32 },
    { size: 48, png: png48 },
  ], path.join(OUT, 'favicon.ico'));

  // SVG favicon (modern browsers): use the simplified mark for clarity at small sizes.
  fs.writeFileSync(path.join(OUT, 'favicon.svg'), faviconSourceSimple);

  // --- OG / social card 1200×630 ------------------------------------------
  // Layout: dark hero gradient background. Wordmark sits horizontally
  // centred-left; tagline sits beneath with a clear gap. Sparkle motifs
  // scatter top-right and bottom-left to balance the composition.
  const ogW = 1200, ogH = 630;
  const padX = 96;

  // Wordmark target width ~640px. Scale & place so its baseline sits at y=300.
  const wmTargetW = 640;
  const wmScale = wmTargetW / wm.w;
  const wmHeightScaled = wm.h * wmScale;
  const wmX = padX;
  const wmBaselineY = 308; // baseline of the wordmark (where 'F' sits)
  // wm viewBox starts at yMin (negative). wm.h spans yMin..yMax (yMax≈10).
  // We want baseline (y=0 in wm coords) to land at wmBaselineY.
  // Translate so that (0,0) maps to (wmX, wmBaselineY), then scale.
  const wmVbX = parseFloat(wm.viewBox.split(' ')[0]); // -8
  const wordmarkInner = `<g transform="translate(${wmX} ${wmBaselineY}) scale(${wmScale})">
    <g transform="translate(${-wmVbX} 0)">
      <path d="${wm.letterPathD}" fill="${COLOR.white}"/>
      <path d="${wm.stemD}" fill="${COLOR.white}"/>
      <path d="${wm.sparkleD}" fill="url(#og-sparkle-grad)"/>
    </g>
  </g>`;

  // Tagline below baseline of wordmark
  const tagSize = 44;
  const tag = textPath(FONT_SEMI, 'Find what’s on near you.', tagSize, 0, 0, { letterSpacing: -0.005 });
  const tagY = wmBaselineY + 110; // baseline of tagline

  const subSize = 22;
  const sub = textPath(FONT_SEMI, 'EVENTS · MUSIC · FESTIVALS · AUSTRALIA', subSize, 0, 0, { letterSpacing: 0.18 });
  const subY = tagY + 60;

  function sparklePts(cx, cy, R, r) {
    const pts = [
      { x: 0, y: -R }, { x: r, y: -r },
      { x: R, y: 0 },  { x: r, y: r },
      { x: 0, y: R },  { x: -r, y: r },
      { x: -R, y: 0 }, { x: -r, y: -r },
    ];
    let d = `M ${cx + pts[0].x} ${cy + pts[0].y}`;
    for (let i = 1; i < pts.length; i++) d += ` L ${cx + pts[i].x} ${cy + pts[i].y}`;
    return d + ' Z';
  }
  // Deterministic sparkle layout (no Math.random so output is stable)
  const sparkles = [
    { cx: 1020, cy: 90,  r: 36, op: 0.95 },
    { cx: 1110, cy: 200, r: 18, op: 0.75 },
    { cx: 990,  cy: 220, r: 12, op: 0.6  },
    { cx: 1080, cy: 360, r: 24, op: 0.85 },
    { cx: 970,  cy: 470, r: 14, op: 0.55 },
    { cx: 1140, cy: 520, r: 10, op: 0.5  },
  ];
  const sparklesD = sparkles.map(s => `<path d="${sparklePts(s.cx, s.cy, s.r, s.r * 0.35)}" fill="url(#og-sparkle-grad)" opacity="${s.op}"/>`).join('\n  ');

  const og = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ogW} ${ogH}" width="${ogW}" height="${ogH}">
  <defs>
    <linearGradient id="og-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0B0D12"/>
      <stop offset="0.55" stop-color="#1B0F1A"/>
      <stop offset="1" stop-color="#2A0E18"/>
    </linearGradient>
    <linearGradient id="og-sparkle-grad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${COLOR.neonCoral}"/>
      <stop offset="1" stop-color="${COLOR.neonMagenta}"/>
    </linearGradient>
    <radialGradient id="og-glow" cx="0.85" cy="0.25" r="0.6">
      <stop offset="0" stop-color="${COLOR.neonMagenta}" stop-opacity="0.35"/>
      <stop offset="1" stop-color="${COLOR.neonMagenta}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="og-glow2" cx="0.15" cy="0.85" r="0.5">
      <stop offset="0" stop-color="${COLOR.neonCoral}" stop-opacity="0.30"/>
      <stop offset="1" stop-color="${COLOR.neonCoral}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${ogW}" height="${ogH}" fill="url(#og-bg)"/>
  <rect width="${ogW}" height="${ogH}" fill="url(#og-glow)"/>
  <rect width="${ogW}" height="${ogH}" fill="url(#og-glow2)"/>
  ${sparklesD}
  ${wordmarkInner}
  <g transform="translate(${padX} ${tagY})"><path d="${tag.d}" fill="${COLOR.onDarkStrong}"/></g>
  <g transform="translate(${padX} ${subY})"><path d="${sub.d}" fill="${COLOR.onDarkMuted}"/></g>
  <rect x="${padX}" y="${ogH - 56}" width="140" height="6" rx="3" fill="url(#og-sparkle-grad)"/>
</svg>`;

  fs.writeFileSync(path.join(BRAND_OUT, 'og-card.svg'), og);
  await sharp(Buffer.from(og), { density: 192 })
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, 'og-image.png'));
  // Also write a copy in brand for portability
  await sharp(Buffer.from(og), { density: 192 })
    .png({ compressionLevel: 9 })
    .toFile(path.join(BRAND_OUT, 'og-card.png'));

  // --- Wordmark preview PNGs (for the comment thread) ---------------------
  // Render wordmark on a couple of background swatches.
  const previewBg = (label, bg, svgInner) => {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 480" width="1600" height="480">
      <rect width="1600" height="480" fill="${bg}"/>
      <g transform="translate(160, 240) scale(${1100/wm.w})">
        <g transform="translate(${-parseFloat(wm.viewBox.split(' ')[0])}, ${-parseFloat(wm.viewBox.split(' ')[1]) - wm.h/2})">
          ${svgInner}
        </g>
      </g>
    </svg>`;
  };

  const lightBgPreview = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 480" width="1600" height="480">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${COLOR.neonCoral}"/><stop offset="1" stop-color="${COLOR.neonMagenta}"/></linearGradient></defs>
    <rect width="1600" height="480" fill="#F8F9FF"/>
    <g transform="translate(180, 320) scale(${1240/wm.w})">
      <g transform="translate(${-parseFloat(wm.viewBox.split(' ')[0])}, ${-parseFloat(wm.viewBox.split(' ')[1]) - wm.h * 0.92})">
        <path d="${wm.letterPathD}" fill="${COLOR.ink}"/>
        <path d="${wm.stemD}" fill="${COLOR.ink}"/>
        <path d="${wm.sparkleD}" fill="url(#g)"/>
      </g>
    </g>
  </svg>`;
  const darkBgPreview = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 480" width="1600" height="480">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0B0D12"/><stop offset="1" stop-color="#1B0F1A"/></linearGradient>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${COLOR.neonCoral}"/><stop offset="1" stop-color="${COLOR.neonMagenta}"/></linearGradient>
    </defs>
    <rect width="1600" height="480" fill="url(#bg)"/>
    <g transform="translate(180, 320) scale(${1240/wm.w})">
      <g transform="translate(${-parseFloat(wm.viewBox.split(' ')[0])}, ${-parseFloat(wm.viewBox.split(' ')[1]) - wm.h * 0.92})">
        <path d="${wm.letterPathD}" fill="${COLOR.white}"/>
        <path d="${wm.stemD}" fill="${COLOR.white}"/>
        <path d="${wm.sparkleD}" fill="url(#g)"/>
      </g>
    </g>
  </svg>`;

  await sharp(Buffer.from(lightBgPreview), { density: 144 }).png().toFile(path.join(BRAND_OUT, 'preview-wordmark-light-bg.png'));
  await sharp(Buffer.from(darkBgPreview), { density: 144 }).png().toFile(path.join(BRAND_OUT, 'preview-wordmark-dark-bg.png'));

  // Mark variants preview (monogram on tile + simplified)
  function markInner({ withSparkle, includeBg, ink }) {
    const m = buildMonogram({ size: 512 });
    const tile = includeBg ? `<rect width="512" height="512" rx="${m.radius}" fill="url(#mp-grad)"/>` : '';
    const fillF = includeBg ? COLOR.white : (ink || COLOR.ink);
    const sparkle = withSparkle ? `<path d="${m.sparkleD}" fill="${COLOR.white}" opacity="0.92"/>` : '';
    return `${tile}<path d="${m.fPathD}" fill="${fillF}"/>${sparkle}`;
  }
  const lblTagline = textPath(FONT_SEMI, 'Primary mark', 24, 0, 0, { letterSpacing: 0 });
  const lblFavi = textPath(FONT_SEMI, 'Favicon variant', 24, 0, 0, { letterSpacing: 0 });
  const lblMono = textPath(FONT_SEMI, 'Mono', 24, 0, 0, { letterSpacing: 0 });
  const markPreview = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 600" width="1600" height="600">
    <defs>
      <linearGradient id="mp-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${COLOR.neonCoral}"/><stop offset="1" stop-color="${COLOR.neonMagenta}"/>
      </linearGradient>
    </defs>
    <rect width="1600" height="600" fill="#F8F9FF"/>
    <g transform="translate(120, 100) scale(${320/512})">${markInner({ withSparkle: true, includeBg: true })}</g>
    <g transform="translate(560, 100) scale(${320/512})">${markInner({ withSparkle: false, includeBg: true })}</g>
    <g transform="translate(1000, 100) scale(${320/512})">${markInner({ withSparkle: false, includeBg: false, ink: COLOR.ink })}</g>
    <g transform="translate(${280 - lblTagline.width/2}, 470)"><path d="${lblTagline.d}" fill="${COLOR.inkSoft}"/></g>
    <g transform="translate(${720 - lblFavi.width/2}, 470)"><path d="${lblFavi.d}" fill="${COLOR.inkSoft}"/></g>
    <g transform="translate(${1160 - lblMono.width/2}, 470)"><path d="${lblMono.d}" fill="${COLOR.inkSoft}"/></g>
  </svg>`;
  await sharp(Buffer.from(markPreview), { density: 144 }).png().toFile(path.join(BRAND_OUT, 'preview-marks.png'));

  console.log('Brand assets written to', OUT);
})().catch(e => { console.error(e); process.exit(1); });
