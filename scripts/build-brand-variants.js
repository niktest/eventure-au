// Render three sparkle-weight variants of the wordmark for board review.
// Reuses the same build setup (Plus Jakarta ExtraBold + custom stem/sparkle).

const fs = require('fs');
const path = require('path');
const opentype = require('opentype.js');
const sharp = require('sharp');

const FONT = opentype.parse(fs.readFileSync('/paperclip/.fonts/PlusJakartaSans-ExtraBold.ttf').buffer);
const FONT_SEMI = opentype.parse(fs.readFileSync('/paperclip/.fonts/PlusJakartaSans-SemiBold.ttf').buffer);

const COLOR = {
  neonCoral: '#FF5A36',
  neonMagenta: '#FF3FA4',
  ink: '#0B1C30',
  inkSoft: '#3F465C',
  white: '#FFFFFF',
};

const OUT = path.resolve(__dirname, '..', 'public', 'brand');

function getGlyphs(font, text) { const out = []; for (const ch of text) out.push(font.charToGlyph(ch)); return out; }

function textPath(font, text, fontSize, x = 0, y = 0, opts = {}) {
  const tracking = opts.letterSpacing ?? 0;
  const glyphs = getGlyphs(font, text);
  const scale = fontSize / font.unitsPerEm;
  let cursor = x;
  const segs = [];
  for (let i = 0; i < glyphs.length; i++) {
    const g = glyphs[i];
    const p = g.getPath(Math.round(cursor * 1000) / 1000, y, fontSize);
    let d = p.toPathData(2);
    if (d.includes('NaN')) d = g.getPath(Math.round(cursor), y, fontSize).toPathData(2);
    segs.push(d);
    cursor += g.advanceWidth * scale + tracking * fontSize;
    if (i < glyphs.length - 1) cursor += font.getKerningValue(g, glyphs[i + 1]) * scale;
  }
  return { d: segs.join(' '), width: cursor - x };
}

// Sparkle drawer: 4-point star with adjustable outer/inner ratio
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

function buildWordmark({ sparkleROverFontSize, sparkleInnerOverOuter, dotCenterOffsetEm }) {
  const fontSize = 200;
  const ls = -0.005;
  const fest = textPath(FONT, 'Festl', fontSize, 0, 0, { letterSpacing: ls });
  const stemW = fontSize * 0.13;
  const iAdvance = (() => {
    const g = FONT.charToGlyph('i');
    const scale = fontSize / FONT.unitsPerEm;
    return g.advanceWidth * scale + 2 * (ls * fontSize);
  })();
  const iStemX = fest.width + (iAdvance - stemW) / 2 + fontSize * 0.005;
  const stemTopY = -fontSize * 0.535;
  const stemBottomY = 0;
  const stemRadius = stemW / 2;
  const dotCx = iStemX + stemW / 2;
  const dotCy = -fontSize * dotCenterOffsetEm;
  const sparkleR = fontSize * sparkleROverFontSize;
  const sparkleInner = sparkleR * sparkleInnerOverOuter;
  const sparkleD = sparklePath(dotCx, dotCy, sparkleR, sparkleInner);
  const oX = fest.width + iAdvance;
  const oPath = textPath(FONT, 'o', fontSize, oX, 0, { letterSpacing: ls });
  const totalWidth = oX + oPath.width;
  const stemD = [
    `M ${iStemX} ${stemTopY + stemRadius}`,
    `a ${stemRadius} ${stemRadius} 0 0 1 ${stemW} 0`,
    `L ${iStemX + stemW} ${stemBottomY - stemRadius}`,
    `a ${stemRadius} ${stemRadius} 0 0 1 ${-stemW} 0`,
    `Z`,
  ].join(' ');
  const xMin = -fontSize * 0.04;
  const xMax = totalWidth + fontSize * 0.04;
  const yMin = dotCy - sparkleR - fontSize * 0.05;
  const yMax = fontSize * 0.05;
  return {
    letterPathD: fest.d + ' ' + oPath.d,
    stemD, sparkleD,
    w: xMax - xMin, h: yMax - yMin,
    viewBox: `${xMin} ${yMin} ${xMax - xMin} ${yMax - yMin}`,
  };
}

const variants = [
  { name: 'soft',    label: 'Softer (subtle dot)',    sparkleROverFontSize: 0.105, sparkleInnerOverOuter: 0.55, dotCenterOffsetEm: 0.74 },
  { name: 'current', label: 'Current (recommended)',  sparkleROverFontSize: 0.130, sparkleInnerOverOuter: 0.35, dotCenterOffsetEm: 0.78 },
  { name: 'bold',    label: 'Bolder (festival)',      sparkleROverFontSize: 0.165, sparkleInnerOverOuter: 0.25, dotCenterOffsetEm: 0.82 },
];

(async () => {
  // Side-by-side comparison: 3 panels stacked vertically.
  // Each panel: label above, wordmark centred horizontally inside the surface.
  const panelW = 1600;
  const labelGap = 40;          // height reserved above each panel for the label
  const panelH = 320;           // surface area for the wordmark
  const blockH = labelGap + panelH + 24; // label + panel + bottom padding
  const totalH = blockH * variants.length + 40;

  const panels = variants.map((v, i) => {
    const wm = buildWordmark(v);
    const targetW = 920;
    const scale = targetW / wm.w;
    const wmHeightScaled = wm.h * scale;
    const xOffset = -parseFloat(wm.viewBox.split(' ')[0]);
    const yOffset = -parseFloat(wm.viewBox.split(' ')[1]);
    const labelPath = textPath(FONT_SEMI, v.label, 22, 0, 0, { letterSpacing: 0.04 });

    const blockY = 20 + i * blockH;
    const labelY = blockY + 28;          // baseline of label
    const surfaceY = blockY + labelGap;  // top of light surface
    // Center wordmark vertically inside the surface
    const wmTopInSurface = (panelH - wmHeightScaled) / 2;
    const wmGroupY = surfaceY + wmTopInSurface; // where the (translated) wordmark group's y origin sits

    return `
      <g>
        <g transform="translate(80, ${labelY})"><path d="${labelPath.d}" fill="${COLOR.inkSoft}"/></g>
        <rect x="40" y="${surfaceY}" width="1520" height="${panelH}" fill="#F8F9FF" rx="20"/>
        <g transform="translate(${(panelW - targetW) / 2}, ${wmGroupY}) scale(${scale})">
          <g transform="translate(${xOffset}, ${yOffset})">
            <path d="${wm.letterPathD}" fill="${COLOR.ink}"/>
            <path d="${wm.stemD}" fill="${COLOR.ink}"/>
            <path d="${wm.sparkleD}" fill="url(#vg-grad)"/>
          </g>
        </g>
      </g>
    `;
  }).join('\n');

  const compSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${panelW} ${totalH}" width="${panelW}" height="${totalH}">
    <defs>
      <linearGradient id="vg-grad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="${COLOR.neonCoral}"/>
        <stop offset="1" stop-color="${COLOR.neonMagenta}"/>
      </linearGradient>
    </defs>
    <rect width="${panelW}" height="${totalH}" fill="#FFFFFF"/>
    ${panels}
  </svg>`;
  fs.writeFileSync(path.join(OUT, 'preview-sparkle-variants.svg'), compSvg);
  await sharp(Buffer.from(compSvg), { density: 144 }).png({ compressionLevel: 9 }).toFile(path.join(OUT, 'preview-sparkle-variants.png'));

  // Also write each variant as its own SVG so a chosen one can be plugged
  // straight in as the new wordmark source if the board doesn't pick "current".
  for (const v of variants) {
    const wm = buildWordmark(v);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${wm.viewBox}" role="img" aria-label="Festlio">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${COLOR.neonCoral}"/><stop offset="1" stop-color="${COLOR.neonMagenta}"/></linearGradient></defs>
      <path d="${wm.letterPathD}" fill="${COLOR.ink}"/>
      <path d="${wm.stemD}" fill="${COLOR.ink}"/>
      <path d="${wm.sparkleD}" fill="url(#g)"/>
    </svg>`;
    fs.writeFileSync(path.join(OUT, `festlio-wordmark-variant-${v.name}.svg`), svg);
  }

  console.log('Variants written to', OUT);
})().catch(e => { console.error(e); process.exit(1); });
