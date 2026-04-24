// Phase F — HTML/CSS renderer for RecipePage.
//
// Pure function: RecipePage → self-contained HTML document string. Intended
// consumers:
//  - Editor preview: load the HTML into a WebView to see "what will print".
//  - iOS export: same HTML, user taps native share → Save to Files → PDF.
//  - Server-side (future): Puppeteer on Railway consumes the same string and
//    outputs a Lulu-ready PDF at the requested DPI.
//
// All three consumers share one renderer, so paper pattern + text + strokes +
// stickers share one coordinate system — no drift between screen and paper.
//
// Scope of this commit: Classic template with full block layout + paper
// pattern. Other templates, stickers, and drawing strokes come in follow-ups.

import type { RecipePage, RecipePageStroke } from './recipePage';
import { TEMPLATE_BLOCKS } from './blockDefs';
import { getStroke } from 'perfect-freehand';
import { fontFaceCSS, type FontDataUriMap } from './pdfFontEmbed';

export interface RenderOptions {
  // Physical page width in pixels. Defaults to A4 at 96 DPI (screen preview
  // quality). For print, pass 2480 (A4 @ 300 DPI).
  widthPx?: number;
  // Show a subtle drop shadow around the page in a grey background —
  // matches how browsers preview print pages. Disable for actual printing.
  previewChrome?: boolean;
  // Resolve a sticker kind to an image URL the WebView can load. For the
  // print path on iOS, this needs to be a `data:image/png;base64,…` URI —
  // expo-print's WKWebView refuses `file://`. Returning null/undefined
  // skips the sticker (no broken-image placeholder).
  stickerSrc?: (kind: string) => string | null | undefined;
  // Inlined @font-face entries. Required for the print path; optional for
  // a hypothetical server renderer that has its own font supply.
  fontDataUris?: FontDataUriMap;
}

const DEFAULT_WIDTH_PX = 794; // A4 @ 96 DPI

export function renderRecipePage(page: RecipePage, opts: RenderOptions = {}): string {
  const pageWidth = opts.widthPx ?? DEFAULT_WIDTH_PX;
  const pageHeight = Math.round(pageWidth * page.pageAspectRatio);
  const previewChrome = opts.previewChrome ?? true;

  const inlineFontFaces = opts.fontDataUris ? fontFaceCSS(opts.fontDataUris) : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(page.content.title || 'Recipe')}</title>
  ${inlineFontFaces ? '' : fontLinks()}
  <style>${inlineFontFaces}\n${baseCSS(pageWidth, pageHeight, page, previewChrome)}</style>
</head>
<body>
  <div class="page t-${page.style.template}">
    ${renderPaperPattern(page, pageWidth, pageHeight)}
    ${renderTemplate(page, pageWidth, pageHeight)}
    ${renderDrawingLayers(page, pageWidth, pageHeight)}
    ${renderStickers(page, pageWidth, pageHeight, opts.stickerSrc)}
    ${renderCornerDecoration(opts.stickerSrc)}
  </div>
</body>
</html>`;
}

// Decorative leaf in the bottom-right of every page — matches the Scrapbook
// preview's hardcoded sticker at app/recipe/[id].tsx:83-84. Falls through
// silently if the sticker resolver doesn't have a 'leaf' entry.
function renderCornerDecoration(stickerSrc?: RenderOptions['stickerSrc']): string {
  const src = stickerSrc?.('leaf');
  if (!src) return '';
  return `<img class="corner-leaf" src="${escapeAttr(src)}" alt="">`;
}

// ─── Font imports ────────────────────────────────────────────────────────────

function fontLinks(): string {
  // All Google Fonts — same families the app uses in React Native. Cyrillic
  // subset included so translated recipes render correctly. latin + cyrillic
  // subsets are fetched; Puppeteer needs these cached during render.
  return `
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Nunito:wght@400;500;600;700&family=Caveat:wght@400;700&family=Marck+Script&family=Bad+Script&family=Amatic+SC:wght@400;700&display=swap&subset=latin,cyrillic">`;
}

// ─── Base CSS (page geometry + typography + print rules) ─────────────────────

function baseCSS(pageWidth: number, pageHeight: number, page: RecipePage, preview: boolean): string {
  const { paletteAccent, paletteBg2, palettePaper, paletteInk, paletteInkSoft, paletteInkFaint } = page.style;
  // Defensive fallbacks: if a colour is missing the page should still look
  // like the editor's default cream paper rather than collapsing to white.
  const paperBg = palettePaper || '#faf4e6';
  const pillBg  = paletteBg2 || '#ede2ce';

  return `
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      background: ${preview ? '#999' : '#fff'};
      padding: ${preview ? '16px' : '0'};
      font-family: 'Nunito', system-ui, sans-serif;
      color: ${paletteInk};
    }
    @page { size: A4; margin: 0; }
    @media print {
      body { margin: 0; padding: 0; background: #fff; }
      .page { box-shadow: none !important; background: ${paperBg} !important; }
    }

    .page {
      position: relative;
      width: ${pageWidth}px;
      height: ${pageHeight}px;
      background: ${paperBg};
      margin: 0 auto;
      overflow: hidden;
      ${preview ? `box-shadow: 0 8px 32px rgba(0,0,0,0.3);` : ''}
    }

    /* Decorative corner leaf — matches Scrapbook preview's hardcoded
       <Sticker kind="leaf"> at app/recipe/[id].tsx:83-84. */
    .corner-leaf {
      position: absolute;
      bottom: 18px;
      right: 18px;
      width: 44px;
      height: 44px;
      transform: rotate(15deg);
      transform-origin: center;
      pointer-events: none;
    }

    .paper-pattern {
      position: absolute; inset: 0; pointer-events: none;
    }

    .block {
      position: absolute;
      transform-origin: center;
      box-sizing: border-box;
    }

    /* ── Font preset classes (handwriting for recipe title) ───────────── */
    .f-caveat     { font-family: 'Caveat', cursive; }
    .f-marck      { font-family: 'Marck Script', cursive; }
    .f-bad-script { font-family: 'Bad Script', cursive; }
    .f-amatic     { font-family: 'Amatic SC', cursive; }

    /* ── Classic template ────────────────────────────────────────────── */
    .t-classic .block-title {
      font-family: 'Fraunces', serif;
      font-weight: 700;
      color: ${paletteInk};
      font-size: 28px;
      line-height: 34px;
    }
    .t-classic .block-description {
      font-family: 'Caveat', cursive;
      color: ${paletteInkSoft};
      font-size: 18px;
      line-height: 24px;
    }
    .t-classic .block-pills {
      /* Block-level container; pills space themselves with margin-right.
         Avoids inline-flex which renders inconsistently in expo-print. */
    }
    .t-classic .pill {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 8px;
      background: ${pillBg};
      font-size: 13px;
      color: ${paletteInkSoft};
      margin-right: 8px;
    }
    .t-classic .pill strong {
      color: ${paletteAccent};
      font-weight: 700;
      margin-left: 4px;
    }
    .t-classic .block-image img {
      width: 100%; height: 100%; object-fit: cover;
      transform: rotate(-1.5deg);
      box-shadow: 0 3px 8px rgba(0,0,0,0.15);
      background: #fff;
      padding: 6px 6px 18px 6px;
    }
    .t-classic .block-ingredients-heading,
    .t-classic .block-method-heading {
      font-family: 'Caveat', cursive;
      color: ${paletteAccent};
      font-size: 20px;
      line-height: 24px;
    }
    .t-classic .block-ingredients-list {
      font-family: 'Nunito', sans-serif;
      font-size: 14px;
      line-height: 18px;
      color: ${paletteInk};
    }
    .t-classic .ing-row {
      margin-bottom: 4px;
    }
    .t-classic .ing-row .dot {
      display: inline-block;
      width: 5px; height: 5px; border-radius: 50%;
      background: ${paletteAccent};
      margin-right: 6px;
      vertical-align: middle;
    }
    .t-classic .block-method-list {
      font-family: 'Nunito', sans-serif;
      font-size: 14px;
      line-height: 18px;
      color: ${paletteInk};
    }
    .t-classic .step-row {
      margin-bottom: 6px;
    }
    .t-classic .step-badge {
      display: inline-block;
      width: 20px; height: 20px;
      line-height: 20px;
      text-align: center;
      border-radius: 50%;
      background: ${paletteAccent};
      color: #fff; font-weight: 700;
      font-size: 12px;
      vertical-align: top;
      margin-right: 10px;
    }
    .t-classic .block-tags {
      background: #fff;
      padding: 6px 12px;
      transform: rotate(-1.2deg);
      box-shadow: 0 2px 6px rgba(0,0,0,0.08);
      font-family: 'Caveat', cursive;
      color: ${paletteInkSoft};
      font-size: 16px;
      border-radius: 2px;
    }

    /* ── Photo Hero template ─────────────────────────────────────────── */
    .t-photo-hero .block-image {
      overflow: hidden;
    }
    .t-photo-hero .block-image .img-wrap { position: relative; width: 100%; height: 100%; }
    .t-photo-hero .block-image img { width: 100%; height: 100%; object-fit: cover; }
    .t-photo-hero .block-image .overlay {
      position: absolute; inset: 0;
      background: ${paletteAccent}; opacity: 0.6;
    }
    .t-photo-hero .block-title {
      font-family: 'Fraunces', serif; font-weight: 700;
      color: ${paletteInk}; font-size: 26px; line-height: 30px;
      text-align: center;
    }
    .t-photo-hero .block-description {
      font-family: 'Caveat', cursive; color: ${paletteInkSoft};
      font-size: 17px; line-height: 22px; text-align: center;
    }
    .t-photo-hero .block-pills { text-align: center; }
    .t-photo-hero .pill {
      display: inline-block; padding: 3px 8px; border-radius: 6px;
      background: ${pillBg}; font-size: 11px; color: ${paletteInkSoft};
      margin-right: 6px;
    }
    .t-photo-hero .pill strong { color: ${paletteAccent}; font-weight: 700; margin-left: 3px; }
    .t-photo-hero .block-ingredients-heading,
    .t-photo-hero .block-method-heading {
      font-family: 'Caveat', cursive; color: ${paletteAccent};
      font-size: 18px; line-height: 22px;
    }
    .t-photo-hero .block-ingredients-list,
    .t-photo-hero .block-method-list {
      font-family: 'Nunito', sans-serif; font-size: 13px; line-height: 17px; color: ${paletteInk};
    }
    .t-photo-hero .ing-row { margin-bottom: 3px; }
    .t-photo-hero .ing-row .dot {
      display: inline-block; width: 4px; height: 4px; border-radius: 50%;
      background: ${paletteAccent}; margin-right: 5px; vertical-align: middle;
    }
    .t-photo-hero .step-row { margin-bottom: 5px; }
    .t-photo-hero .step-badge {
      display: inline-block;
      width: 16px; height: 16px; line-height: 16px; text-align: center;
      border-radius: 50%; background: ${paletteAccent};
      color: #fff; font-weight: 700; font-size: 10px;
      vertical-align: top; margin-right: 6px;
    }

    /* ── Minimal template ────────────────────────────────────────────── */
    .t-minimal .block-title {
      font-family: 'Fraunces', serif; font-weight: 400;
      color: ${paletteInk}; font-size: 30px; line-height: 36px;
      border-bottom: 2px solid ${paletteAccent}; padding-bottom: 6px;
    }
    .t-minimal .block-description {
      font-family: 'Nunito', sans-serif; color: ${paletteInkSoft};
      font-size: 14px; line-height: 20px; font-style: italic;
    }
    .t-minimal .block-pills { /* row of pills as inline-block elements */ }
    .t-minimal .pill {
      display: inline-block; font-size: 11px; color: ${paletteInkSoft};
      text-transform: uppercase; letter-spacing: 0.5px;
      margin-right: 10px;
    }
    .t-minimal .pill strong { color: ${paletteAccent}; font-weight: 700; margin-left: 4px; }
    .t-minimal .block-ingredients-heading,
    .t-minimal .block-method-heading {
      font-family: 'Nunito', sans-serif; font-weight: 700;
      color: ${paletteAccent}; font-size: 12px; line-height: 16px;
      text-transform: uppercase; letter-spacing: 1px;
    }
    .t-minimal .block-ingredients-list { font-family: 'Nunito', sans-serif; font-size: 13px; line-height: 20px; color: ${paletteInk}; }
    .t-minimal .ing-row { margin-bottom: 2px; }
    .t-minimal .block-method-list { font-family: 'Nunito', sans-serif; font-size: 13px; line-height: 19px; color: ${paletteInk}; }
    .t-minimal .step-row { margin-bottom: 6px; }
    .t-minimal .step-num { color: ${paletteAccent}; font-weight: 700; margin-right: 8px; }

    /* ── Two Column template ─────────────────────────────────────────── */
    .t-two-column .block-title {
      font-family: 'Fraunces', serif; font-weight: 700;
      color: ${paletteInk}; font-size: 26px; line-height: 30px;
      border-bottom: 2px solid ${paletteAccent}44; padding-bottom: 4px;
    }
    .t-two-column .block-description {
      font-family: 'Caveat', cursive; color: ${paletteInkSoft};
      font-size: 16px; line-height: 20px;
    }
    .t-two-column .block-image img {
      width: 100%; height: 100%; object-fit: cover; border-radius: 6px;
    }
    .t-two-column .block-pills { /* inline-block pills wrap naturally */ }
    .t-two-column .pill {
      display: inline-block; padding: 2px 6px; border-radius: 4px;
      background: ${pillBg}; font-size: 10px; color: ${paletteInkSoft};
      margin-right: 6px;
    }
    .t-two-column .pill strong { color: ${paletteAccent}; font-weight: 700; margin-left: 3px; }
    .t-two-column .block-ingredients-heading,
    .t-two-column .block-method-heading {
      font-family: 'Caveat', cursive; color: ${paletteAccent};
      font-size: 18px; line-height: 22px;
    }
    .t-two-column .block-ingredients-list { font-family: 'Nunito', sans-serif; font-size: 12px; line-height: 17px; color: ${paletteInk}; }
    .t-two-column .ing-row { margin-bottom: 3px; }
    .t-two-column .ing-row .dot {
      display: inline-block; width: 4px; height: 4px; border-radius: 50%;
      background: ${paletteAccent}; margin-right: 5px; vertical-align: middle;
    }
    .t-two-column .block-method-list { font-family: 'Nunito', sans-serif; font-size: 12px; line-height: 16px; color: ${paletteInk}; }
    .t-two-column .step-row { margin-bottom: 4px; }
    .t-two-column .step-badge {
      display: inline-block;
      width: 14px; height: 14px; line-height: 14px; text-align: center;
      border-radius: 50%; background: ${paletteAccent};
      color: #fff; font-weight: 700; font-size: 9px;
      vertical-align: top; margin-right: 5px;
    }

    /* ── Journal template ────────────────────────────────────────────── */
    .t-journal .block-title {
      font-family: 'Fraunces', serif; font-weight: 700;
      color: ${paletteAccent}; font-size: 28px; line-height: 32px;
    }
    .t-journal .block-description {
      font-family: 'Caveat', cursive; color: ${paletteInkSoft};
      font-size: 16px; line-height: 20px;
    }
    .t-journal .block-photo img {
      width: 100%; height: 100%; object-fit: cover; border-radius: 4px;
    }
    .t-journal .block-pills { /* inline-block pills */ }
    .t-journal .pill {
      display: inline-block; padding: 2px 7px; border-radius: 4px;
      background: ${pillBg}; font-size: 10px; color: ${paletteInkSoft};
      margin-right: 5px;
    }
    .t-journal .pill strong { color: ${paletteAccent}; font-weight: 700; margin-left: 3px; }
    .t-journal .block-ingredients-heading,
    .t-journal .block-method-heading {
      font-family: 'Caveat', cursive; color: ${paletteAccent};
      font-size: 16px; line-height: 20px;
    }
    .t-journal .block-ingredients-list {
      font-family: 'Caveat', cursive; font-size: 16px; line-height: 22px; color: ${paletteInk};
    }
    .t-journal .ing-row { margin-bottom: 2px; }
    .t-journal .block-method-list { font-family: 'Nunito', sans-serif; font-size: 13px; line-height: 22px; color: ${paletteInk}; }
    .t-journal .step-row {
      margin-bottom: 4px;
      border-bottom: 1px dashed ${paletteAccent}22;
      padding-bottom: 4px;
    }
    .t-journal .step-num { color: ${paletteAccent}; font-weight: 700; font-family: 'Fraunces', serif; font-size: 15px; margin-right: 8px; }
    .t-journal .block-tags {
      background: #fff; padding: 4px 10px; transform: rotate(-1.2deg);
      box-shadow: 0 2px 4px rgba(0,0,0,0.08); font-family: 'Caveat', cursive;
      color: ${paletteInkSoft}; font-size: 14px; border-radius: 2px;
    }

    /* ── Recipe Card template ────────────────────────────────────────── */
    .t-recipe-card .block-title {
      background: ${paletteAccent}; color: #fff;
      font-family: 'Fraunces', serif; font-weight: 700;
      font-size: 24px; line-height: 1;
      text-align: center;
      padding-top: 14px;
    }
    .t-recipe-card .block-description {
      font-family: 'Nunito', sans-serif; color: ${paletteInkSoft};
      font-size: 13px; line-height: 18px; font-style: italic; text-align: center;
    }
    .t-recipe-card .block-image img { width: 100%; height: 100%; object-fit: cover; border-radius: 6px; }
    .t-recipe-card .block-ingredients-heading,
    .t-recipe-card .block-method-heading {
      font-family: 'Nunito', sans-serif; font-weight: 700;
      color: ${paletteAccent}; font-size: 13px;
      text-transform: uppercase; letter-spacing: 1px;
    }
    .t-recipe-card .block-ingredients-list { font-family: 'Nunito', sans-serif; font-size: 12px; line-height: 16px; color: ${paletteInk}; }
    .t-recipe-card .ing-row { margin-bottom: 2px; }
    .t-recipe-card .block-method-list { font-family: 'Nunito', sans-serif; font-size: 12px; line-height: 16px; color: ${paletteInk}; }
    .t-recipe-card .step-row { margin-bottom: 4px; }
    .t-recipe-card .step-badge {
      display: inline-block;
      width: 16px; height: 16px; line-height: 16px; text-align: center;
      border-radius: 50%; background: ${paletteAccent};
      color: #fff; font-weight: 700; font-size: 10px;
      vertical-align: top; margin-right: 6px;
    }
    .t-recipe-card .block-tags {
      background: #fff; padding: 6px 12px; transform: rotate(-1.2deg);
      box-shadow: 0 2px 6px rgba(0,0,0,0.08); font-family: 'Caveat', cursive;
      color: ${paletteInkSoft}; font-size: 15px; border-radius: 2px;
    }

    .page-number {
      position: absolute;
      bottom: 18px;
      right: 24px;
      color: ${paletteInkFaint};
      font-size: 11px;
      font-family: 'Nunito', sans-serif;
    }

    /* Per-preset font overrides — BUG-021. Editor uses preset.title for
       titles and preset.section for all body copy; pre-fix CSS hard-coded
       Fraunces / Nunito which only matched the default caveat preset for
       a couple of selectors. Append matching overrides last so they win
       on equal specificity. */
    ${presetOverrideCSS(page.style.template, page.style.font)}
  `;
}

interface PresetFontMapping {
  family: string;
  weight: number;
}

interface PresetFonts {
  title: PresetFontMapping;
  section: PresetFontMapping;
}

function presetFonts(key: RecipePage['style']['font']): PresetFonts {
  switch (key) {
    case 'marck':      return { title: { family: 'Marck Script', weight: 400 }, section: { family: 'Marck Script', weight: 400 } };
    case 'bad-script': return { title: { family: 'Bad Script',   weight: 400 }, section: { family: 'Bad Script',   weight: 400 } };
    case 'amatic':     return { title: { family: 'Amatic SC',    weight: 700 }, section: { family: 'Amatic SC',    weight: 400 } };
    case 'caveat':
    default:           return { title: { family: 'Caveat',       weight: 700 }, section: { family: 'Caveat',       weight: 400 } };
  }
}

// Emit a CSS block that targets the current template + assigns the recipe's
// font preset to title and body blocks. Higher-specificity-equal-but-later
// rules win the cascade, matching the editor's inline-style `{ fontFamily:
// preset.title }` / `{ fontFamily: preset.section }` overrides.
function presetOverrideCSS(template: RecipePage['style']['template'], presetKey: RecipePage['style']['font']): string {
  const p = presetFonts(presetKey);
  const t = `.t-${template}`;
  // Two passes: the body-text selector list assigns family + the section
  // weight (400 by default for our handwriting fonts). The pill `strong` and
  // step-badge selectors then re-pin font-family but leave their existing
  // bold weight from the template CSS untouched — so the prep/cook number
  // and the step number stay visually emphasised.
  return `
    ${t} .block-title { font-family: '${p.title.family}', cursive; font-weight: ${p.title.weight}; }
    ${t} .block-description,
    ${t} .block-pills,
    ${t} .pill,
    ${t} .block-ingredients-heading,
    ${t} .block-ingredients-list,
    ${t} .ing-row,
    ${t} .block-method-heading,
    ${t} .block-method-list,
    ${t} .step-row,
    ${t} .block-tags {
      font-family: '${p.section.family}', cursive;
      font-weight: ${p.section.weight};
    }
    ${t} .pill strong,
    ${t} .step-badge,
    ${t} .step-num {
      font-family: '${p.section.family}', cursive;
    }
  `;
}

// ─── Paper pattern (SVG background — matches the editor's PaperPattern) ──────

function renderPaperPattern(page: RecipePage, pageWidth: number, pageHeight: number): string {
  const type = page.style.paperType;
  if (type === 'blank') return '';

  const mmToPx = pageWidth / 210; // A4 is 210mm wide
  const lineStep = 8 * mmToPx;
  const dotStep = 5 * mmToPx;
  const gridStep = 5 * mmToPx;
  const strokeColour = page.style.paletteInkFaint;

  if (type === 'lined') {
    const lines: string[] = [];
    for (let y = 0; y < pageHeight; y += lineStep) {
      lines.push(`<line x1="0" y1="${y}" x2="${pageWidth}" y2="${y}" stroke="${strokeColour}" stroke-width="0.75" stroke-opacity="0.4"/>`);
    }
    return `<svg class="paper-pattern" xmlns="http://www.w3.org/2000/svg" width="${pageWidth}" height="${pageHeight}">${lines.join('')}</svg>`;
  }

  if (type === 'dotted') {
    return `<svg class="paper-pattern" xmlns="http://www.w3.org/2000/svg" width="${pageWidth}" height="${pageHeight}">
      <defs>
        <pattern id="dotted" x="0" y="0" width="${dotStep}" height="${dotStep}" patternUnits="userSpaceOnUse">
          <circle cx="${dotStep / 2}" cy="${dotStep / 2}" r="0.5" fill="${strokeColour}" fill-opacity="0.6"/>
        </pattern>
      </defs>
      <rect x="0" y="0" width="${pageWidth}" height="${pageHeight}" fill="url(#dotted)"/>
    </svg>`;
  }

  if (type === 'grid') {
    return `<svg class="paper-pattern" xmlns="http://www.w3.org/2000/svg" width="${pageWidth}" height="${pageHeight}">
      <defs>
        <pattern id="grid" x="0" y="0" width="${gridStep}" height="${gridStep}" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="${gridStep}" y2="0" stroke="${strokeColour}" stroke-width="0.5" stroke-opacity="0.3"/>
          <line x1="0" y1="0" x2="0" y2="${gridStep}" stroke="${strokeColour}" stroke-width="0.5" stroke-opacity="0.3"/>
        </pattern>
      </defs>
      <rect x="0" y="0" width="${pageWidth}" height="${pageHeight}" fill="url(#grid)"/>
    </svg>`;
  }

  return '';
}

// ─── Template dispatch ───────────────────────────────────────────────────────

function renderTemplate(page: RecipePage, pageWidth: number, pageHeight: number): string {
  switch (page.style.template) {
    case 'photo-hero':  return renderPhotoHero(page, pageWidth, pageHeight);
    case 'minimal':     return renderMinimal(page, pageWidth, pageHeight);
    case 'two-column':  return renderTwoColumn(page, pageWidth, pageHeight);
    case 'journal':     return renderJournal(page, pageWidth, pageHeight);
    case 'recipe-card': return renderRecipeCard(page, pageWidth, pageHeight);
    case 'classic':
    default:            return renderClassic(page, pageWidth, pageHeight);
  }
}

// ─── Block resolution (reuses blockDefs.ts defaults + overrides) ────────────

interface ResolvedPos {
  left: number; top: number; width: number;
  // height is optional — text-heavy blocks flow; the caller decides whether
  // to apply it. For non-text blocks (image), always apply.
  heightPx: number;
  rotationRad: number;
  scale: number;
  fontScale: number;
}

function resolveBlock(
  page: RecipePage,
  blockId: string,
  pageWidth: number,
  pageHeight: number,
): ResolvedPos | null {
  const defs = TEMPLATE_BLOCKS[page.style.template] ?? [];
  const def = defs.find(d => d.blockId === blockId);
  if (!def) return null;

  const ov = page.blocks[blockId];
  if (ov?.hidden) return null;

  const base = def.getDefault(pageWidth);
  const cx = ov?.cx != null ? ov.cx * pageWidth  : base.cx;
  const cy = ov?.cy != null ? ov.cy * pageHeight : base.cy;
  const w  = ov?.w  != null ? ov.w  * pageWidth  : base.w;
  const h  = ov?.h  != null ? ov.h  * pageWidth  : base.h;
  return {
    left: cx - w / 2,
    top: cy - h / 2,
    width: w,
    heightPx: h,
    rotationRad: ov?.rotation ?? base.rotation,
    scale: ov?.scale ?? base.scale,
    fontScale: ov?.fontScale ?? 1,
  };
}

function blockStyle(pos: ResolvedPos, fixedHeight: boolean, fontScaleInline = true): string {
  const rotateDeg = (pos.rotationRad * 180) / Math.PI;
  const transform = `translate(0,0) rotate(${rotateDeg}deg) scale(${pos.scale})`;
  const heightStyle = fixedHeight ? `height:${pos.heightPx}px;` : '';
  const fontStyle = fontScaleInline && pos.fontScale !== 1
    ? `font-size:${Math.round(pos.fontScale * 100)}%;`
    : '';
  return `left:${pos.left}px;top:${pos.top}px;width:${pos.width}px;${heightStyle}transform:${transform};${fontStyle}`;
}

// ─── Classic template ────────────────────────────────────────────────────────

function renderClassic(page: RecipePage, pageWidth: number, pageHeight: number): string {
  const c = page.content;
  const titles = page.style.sectionTitles;
  const fontClass = `f-${page.style.font}`;

  const parts: string[] = [];

  const title = resolveBlock(page, 'title', pageWidth, pageHeight);
  if (title) {
    parts.push(`<div class="block block-title ${fontClass}" style="${blockStyle(title, false)}">${escapeHtml(c.title)}</div>`);
  }

  const description = resolveBlock(page, 'description', pageWidth, pageHeight);
  if (description && c.description) {
    parts.push(`<div class="block block-description" style="${blockStyle(description, false)}">${escapeHtml(c.description)}</div>`);
  }

  const pills = resolveBlock(page, 'pills', pageWidth, pageHeight);
  if (pills) {
    const pillParts: string[] = [];
    if (c.prepMinutes != null) pillParts.push(`<span class="pill">prep <strong>${c.prepMinutes}m</strong></span>`);
    if (c.cookMinutes != null) pillParts.push(`<span class="pill">cook <strong>${c.cookMinutes}m</strong></span>`);
    if (c.servings != null)   pillParts.push(`<span class="pill">serves <strong>${c.servings}</strong></span>`);
    parts.push(`<div class="block block-pills" style="${blockStyle(pills, false)}">${pillParts.join('')}</div>`);
  }

  const image = resolveBlock(page, 'image', pageWidth, pageHeight);
  if (image && c.coverImageUrl) {
    parts.push(`<div class="block block-image" style="${blockStyle(image, true, false)}"><img src="${escapeAttr(c.coverImageUrl)}" alt=""></div>`);
  }

  const ingHeading = resolveBlock(page, 'ingredients-heading', pageWidth, pageHeight);
  if (ingHeading) {
    parts.push(`<div class="block block-ingredients-heading" style="${blockStyle(ingHeading, false)}">${escapeHtml(titles.ingredients)}</div>`);
  }

  const ingList = resolveBlock(page, 'ingredients-list', pageWidth, pageHeight);
  if (ingList && c.ingredients.length > 0) {
    const rows = c.ingredients
      .map(i => `<div class="ing-row"><span class="dot"></span><span>${escapeHtml(i.text)}</span></div>`)
      .join('');
    parts.push(`<div class="block block-ingredients-list" style="${blockStyle(ingList, false)}">${rows}</div>`);
  }

  const methodHeading = resolveBlock(page, 'method-heading', pageWidth, pageHeight);
  if (methodHeading) {
    parts.push(`<div class="block block-method-heading" style="${blockStyle(methodHeading, false)}">${escapeHtml(titles.method)}</div>`);
  }

  const methodList = resolveBlock(page, 'method-list', pageWidth, pageHeight);
  if (methodList && c.instructions.length > 0) {
    const rows = c.instructions
      .map(s => `<div class="step-row"><span class="step-badge">${s.step}</span><span>${escapeHtml(s.text)}</span></div>`)
      .join('');
    parts.push(`<div class="block block-method-list" style="${blockStyle(methodList, false)}">${rows}</div>`);
  }

  const tags = resolveBlock(page, 'tags', pageWidth, pageHeight);
  if (tags && c.tags.length > 0) {
    parts.push(`<div class="block block-tags" style="${blockStyle(tags, false)}">${escapeHtml(c.tags.join(' · '))}</div>`);
  }

  parts.push(`<div class="page-number">1</div>`);

  return parts.join('\n    ');
}

// ─── Shared render helpers ───────────────────────────────────────────────────

function pillsInline(c: RecipePage['content']): string {
  const parts: string[] = [];
  if (c.prepMinutes != null) parts.push(`<span class="pill">prep <strong>${c.prepMinutes}m</strong></span>`);
  if (c.cookMinutes != null) parts.push(`<span class="pill">cook <strong>${c.cookMinutes}m</strong></span>`);
  if (c.servings != null)    parts.push(`<span class="pill">serves <strong>${c.servings}</strong></span>`);
  return parts.join('');
}

function ingRowsDotted(ingredients: RecipePage['content']['ingredients']): string {
  return ingredients
    .map(i => `<div class="ing-row"><span class="dot"></span><span>${escapeHtml(i.text)}</span></div>`)
    .join('');
}

function ingRowsPlain(ingredients: RecipePage['content']['ingredients']): string {
  return ingredients
    .map(i => `<div class="ing-row">${escapeHtml(i.text)}</div>`)
    .join('');
}

function ingRowsJournal(ingredients: RecipePage['content']['ingredients']): string {
  return ingredients
    .map(i => `<div class="ing-row">— ${escapeHtml(i.text)}</div>`)
    .join('');
}

function stepRowsBadged(instructions: RecipePage['content']['instructions']): string {
  return instructions
    .map(s => `<div class="step-row"><span class="step-badge">${s.step}</span><span>${escapeHtml(s.text)}</span></div>`)
    .join('');
}

function stepRowsNumeric(instructions: RecipePage['content']['instructions']): string {
  return instructions
    .map(s => `<div class="step-row"><span class="step-num">${s.step}.</span><span>${escapeHtml(s.text)}</span></div>`)
    .join('');
}

// ─── Photo Hero ──────────────────────────────────────────────────────────────

function renderPhotoHero(page: RecipePage, pageWidth: number, pageHeight: number): string {
  const c = page.content;
  const titles = page.style.sectionTitles;
  const fontClass = `f-${page.style.font}`;
  const parts: string[] = [];

  const image = resolveBlock(page, 'image', pageWidth, pageHeight);
  if (image) {
    const img = c.coverImageUrl
      ? `<img src="${escapeAttr(c.coverImageUrl)}" alt="">`
      : `<div style="width:100%;height:100%;background:${page.style.paletteAccent}44"></div>`;
    parts.push(`<div class="block block-image" style="${blockStyle(image, true, false)}"><div class="img-wrap">${img}<div class="overlay"></div></div></div>`);
  }

  const title = resolveBlock(page, 'title', pageWidth, pageHeight);
  if (title) {
    parts.push(`<div class="block block-title ${fontClass}" style="${blockStyle(title, false)}">${escapeHtml(c.title)}</div>`);
  }

  const description = resolveBlock(page, 'description', pageWidth, pageHeight);
  if (description && c.description) {
    parts.push(`<div class="block block-description" style="${blockStyle(description, false)}">${escapeHtml(c.description)}</div>`);
  }

  const pills = resolveBlock(page, 'pills', pageWidth, pageHeight);
  if (pills) {
    parts.push(`<div class="block block-pills" style="${blockStyle(pills, false)}">${pillsInline(c)}</div>`);
  }

  const ingHeading = resolveBlock(page, 'ingredients-heading', pageWidth, pageHeight);
  if (ingHeading) {
    parts.push(`<div class="block block-ingredients-heading" style="${blockStyle(ingHeading, false)}">${escapeHtml(titles.ingredients)}</div>`);
  }

  const ingList = resolveBlock(page, 'ingredients-list', pageWidth, pageHeight);
  if (ingList && c.ingredients.length > 0) {
    parts.push(`<div class="block block-ingredients-list" style="${blockStyle(ingList, false)}">${ingRowsDotted(c.ingredients)}</div>`);
  }

  const methodHeading = resolveBlock(page, 'method-heading', pageWidth, pageHeight);
  if (methodHeading) {
    parts.push(`<div class="block block-method-heading" style="${blockStyle(methodHeading, false)}">${escapeHtml(titles.method)}</div>`);
  }

  const methodList = resolveBlock(page, 'method-list', pageWidth, pageHeight);
  if (methodList && c.instructions.length > 0) {
    parts.push(`<div class="block block-method-list" style="${blockStyle(methodList, false)}">${stepRowsBadged(c.instructions)}</div>`);
  }

  parts.push(`<div class="page-number">1</div>`);
  return parts.join('\n    ');
}

// ─── Minimal ─────────────────────────────────────────────────────────────────

function renderMinimal(page: RecipePage, pageWidth: number, pageHeight: number): string {
  const c = page.content;
  const titles = page.style.sectionTitles;
  const fontClass = `f-${page.style.font}`;
  const parts: string[] = [];

  const title = resolveBlock(page, 'title', pageWidth, pageHeight);
  if (title) {
    parts.push(`<div class="block block-title" style="${blockStyle(title, false)}">${escapeHtml(c.title)}</div>`);
  }

  const description = resolveBlock(page, 'description', pageWidth, pageHeight);
  if (description && c.description) {
    parts.push(`<div class="block block-description" style="${blockStyle(description, false)}">${escapeHtml(c.description)}</div>`);
  }

  const pills = resolveBlock(page, 'pills', pageWidth, pageHeight);
  if (pills) {
    parts.push(`<div class="block block-pills" style="${blockStyle(pills, false)}">${pillsInline(c)}</div>`);
  }

  const ingHeading = resolveBlock(page, 'ingredients-heading', pageWidth, pageHeight);
  if (ingHeading) {
    parts.push(`<div class="block block-ingredients-heading" style="${blockStyle(ingHeading, false)}">${escapeHtml(titles.ingredients)}</div>`);
  }

  const ingList = resolveBlock(page, 'ingredients-list', pageWidth, pageHeight);
  if (ingList && c.ingredients.length > 0) {
    parts.push(`<div class="block block-ingredients-list" style="${blockStyle(ingList, false)}">${ingRowsPlain(c.ingredients)}</div>`);
  }

  const methodHeading = resolveBlock(page, 'method-heading', pageWidth, pageHeight);
  if (methodHeading) {
    parts.push(`<div class="block block-method-heading" style="${blockStyle(methodHeading, false)}">${escapeHtml(titles.method)}</div>`);
  }

  const methodList = resolveBlock(page, 'method-list', pageWidth, pageHeight);
  if (methodList && c.instructions.length > 0) {
    parts.push(`<div class="block block-method-list" style="${blockStyle(methodList, false)}">${stepRowsNumeric(c.instructions)}</div>`);
  }

  parts.push(`<div class="page-number">1</div>`);
  // Silence unused in this template — kept for parity with other templates if font-preset title ever reintroduced
  void fontClass;
  return parts.join('\n    ');
}

// ─── Two Column ──────────────────────────────────────────────────────────────

function renderTwoColumn(page: RecipePage, pageWidth: number, pageHeight: number): string {
  const c = page.content;
  const titles = page.style.sectionTitles;
  const parts: string[] = [];

  const title = resolveBlock(page, 'title', pageWidth, pageHeight);
  if (title) {
    parts.push(`<div class="block block-title" style="${blockStyle(title, false)}">${escapeHtml(c.title)}</div>`);
  }

  const description = resolveBlock(page, 'description', pageWidth, pageHeight);
  if (description && c.description) {
    parts.push(`<div class="block block-description" style="${blockStyle(description, false)}">${escapeHtml(c.description)}</div>`);
  }

  const image = resolveBlock(page, 'image', pageWidth, pageHeight);
  if (image && c.coverImageUrl) {
    parts.push(`<div class="block block-image" style="${blockStyle(image, true, false)}"><img src="${escapeAttr(c.coverImageUrl)}" alt=""></div>`);
  }

  const pills = resolveBlock(page, 'pills', pageWidth, pageHeight);
  if (pills) {
    parts.push(`<div class="block block-pills" style="${blockStyle(pills, false)}">${pillsInline(c)}</div>`);
  }

  const ingHeading = resolveBlock(page, 'ingredients-heading', pageWidth, pageHeight);
  if (ingHeading) {
    parts.push(`<div class="block block-ingredients-heading" style="${blockStyle(ingHeading, false)}">${escapeHtml(titles.ingredients)}</div>`);
  }

  const ingList = resolveBlock(page, 'ingredients-list', pageWidth, pageHeight);
  if (ingList && c.ingredients.length > 0) {
    parts.push(`<div class="block block-ingredients-list" style="${blockStyle(ingList, false)}">${ingRowsDotted(c.ingredients)}</div>`);
  }

  const methodHeading = resolveBlock(page, 'method-heading', pageWidth, pageHeight);
  if (methodHeading) {
    parts.push(`<div class="block block-method-heading" style="${blockStyle(methodHeading, false)}">${escapeHtml(titles.method)}</div>`);
  }

  const methodList = resolveBlock(page, 'method-list', pageWidth, pageHeight);
  if (methodList && c.instructions.length > 0) {
    parts.push(`<div class="block block-method-list" style="${blockStyle(methodList, false)}">${stepRowsBadged(c.instructions)}</div>`);
  }

  parts.push(`<div class="page-number">1</div>`);
  return parts.join('\n    ');
}

// ─── Journal ─────────────────────────────────────────────────────────────────

function renderJournal(page: RecipePage, pageWidth: number, pageHeight: number): string {
  const c = page.content;
  const titles = page.style.sectionTitles;
  const fontClass = `f-${page.style.font}`;
  const parts: string[] = [];

  const title = resolveBlock(page, 'title', pageWidth, pageHeight);
  if (title) {
    parts.push(`<div class="block block-title ${fontClass}" style="${blockStyle(title, false)}">${escapeHtml(c.title)}</div>`);
  }

  const description = resolveBlock(page, 'description', pageWidth, pageHeight);
  if (description && c.description) {
    parts.push(`<div class="block block-description" style="${blockStyle(description, false)}">${escapeHtml(c.description)}</div>`);
  }

  const photo = resolveBlock(page, 'photo', pageWidth, pageHeight);
  if (photo && c.coverImageUrl) {
    parts.push(`<div class="block block-photo" style="${blockStyle(photo, true, false)}"><img src="${escapeAttr(c.coverImageUrl)}" alt=""></div>`);
  }

  const pills = resolveBlock(page, 'pills', pageWidth, pageHeight);
  if (pills) {
    parts.push(`<div class="block block-pills" style="${blockStyle(pills, false)}">${pillsInline(c)}</div>`);
  }

  const ingHeading = resolveBlock(page, 'ingredients-heading', pageWidth, pageHeight);
  if (ingHeading) {
    parts.push(`<div class="block block-ingredients-heading" style="${blockStyle(ingHeading, false)}">${escapeHtml(titles.ingredients)}:</div>`);
  }

  const ingList = resolveBlock(page, 'ingredients-list', pageWidth, pageHeight);
  if (ingList && c.ingredients.length > 0) {
    parts.push(`<div class="block block-ingredients-list" style="${blockStyle(ingList, false)}">${ingRowsJournal(c.ingredients)}</div>`);
  }

  const methodHeading = resolveBlock(page, 'method-heading', pageWidth, pageHeight);
  if (methodHeading) {
    parts.push(`<div class="block block-method-heading" style="${blockStyle(methodHeading, false)}">${escapeHtml(titles.method)}:</div>`);
  }

  const methodList = resolveBlock(page, 'method-list', pageWidth, pageHeight);
  if (methodList && c.instructions.length > 0) {
    parts.push(`<div class="block block-method-list" style="${blockStyle(methodList, false)}">${stepRowsNumeric(c.instructions)}</div>`);
  }

  const tags = resolveBlock(page, 'tags', pageWidth, pageHeight);
  if (tags && c.tags.length > 0) {
    parts.push(`<div class="block block-tags" style="${blockStyle(tags, false)}">${escapeHtml(c.tags.join(' · '))}</div>`);
  }

  parts.push(`<div class="page-number">1</div>`);
  return parts.join('\n    ');
}

// ─── Recipe Card ─────────────────────────────────────────────────────────────

function renderRecipeCard(page: RecipePage, pageWidth: number, pageHeight: number): string {
  const c = page.content;
  const titles = page.style.sectionTitles;
  const fontClass = `f-${page.style.font}`;
  const parts: string[] = [];

  const title = resolveBlock(page, 'title', pageWidth, pageHeight);
  if (title) {
    parts.push(`<div class="block block-title ${fontClass}" style="${blockStyle(title, true, false)}">${escapeHtml(c.title)}</div>`);
  }

  const description = resolveBlock(page, 'description', pageWidth, pageHeight);
  if (description && c.description) {
    parts.push(`<div class="block block-description" style="${blockStyle(description, false)}">${escapeHtml(c.description)}</div>`);
  }

  const image = resolveBlock(page, 'image', pageWidth, pageHeight);
  if (image && c.coverImageUrl) {
    parts.push(`<div class="block block-image" style="${blockStyle(image, true, false)}"><img src="${escapeAttr(c.coverImageUrl)}" alt=""></div>`);
  }

  const ingHeading = resolveBlock(page, 'ingredients-heading', pageWidth, pageHeight);
  if (ingHeading) {
    parts.push(`<div class="block block-ingredients-heading" style="${blockStyle(ingHeading, false)}">${escapeHtml(titles.ingredients)}</div>`);
  }

  const ingList = resolveBlock(page, 'ingredients-list', pageWidth, pageHeight);
  if (ingList && c.ingredients.length > 0) {
    const rows = c.ingredients
      .map(i => `<div class="ing-row">· ${escapeHtml(i.text)}</div>`)
      .join('');
    parts.push(`<div class="block block-ingredients-list" style="${blockStyle(ingList, false)}">${rows}</div>`);
  }

  const methodHeading = resolveBlock(page, 'method-heading', pageWidth, pageHeight);
  if (methodHeading) {
    parts.push(`<div class="block block-method-heading" style="${blockStyle(methodHeading, false)}">${escapeHtml(titles.method)}</div>`);
  }

  const methodList = resolveBlock(page, 'method-list', pageWidth, pageHeight);
  if (methodList && c.instructions.length > 0) {
    parts.push(`<div class="block block-method-list" style="${blockStyle(methodList, false)}">${stepRowsBadged(c.instructions)}</div>`);
  }

  const tags = resolveBlock(page, 'tags', pageWidth, pageHeight);
  if (tags && c.tags.length > 0) {
    parts.push(`<div class="block block-tags" style="${blockStyle(tags, false)}">${escapeHtml(c.tags.join(' · '))}</div>`);
  }

  parts.push(`<div class="page-number">1</div>`);
  return parts.join('\n    ');
}

// ─── Drawing strokes ─────────────────────────────────────────────────────────

// Reuses perfect-freehand (already in deps) to turn the stroke's fractional
// points into a polygon, then serializes to an SVG path `d` attribute with
// the same quadratic-Bezier smoothing used by the RN/Skia renderer in
// `src/components/canvas/DrawingStroke.tsx`.
function renderDrawingLayers(page: RecipePage, pageWidth: number, pageHeight: number): string {
  if (page.drawingLayers.length === 0) return '';

  const layerGroups = page.drawingLayers
    .filter(layer => layer.visible)
    .map(layer => {
      const paths = layer.strokes
        // V1 print: eraser strokes are skipped — correct output would require
        // SVG masks, deferred to a follow-up. Non-eraser strokes render fine.
        .filter(s => !s.isEraser)
        .map(s => renderStrokePath(s, pageWidth, pageHeight))
        .join('');
      if (!paths) return '';
      const blend = cssBlendMode(layer.blendMode);
      return `<g style="mix-blend-mode:${blend};opacity:${layer.opacity}">${paths}</g>`;
    })
    .filter(g => g.length > 0)
    .join('');

  if (!layerGroups) return '';

  return `<svg class="drawing" xmlns="http://www.w3.org/2000/svg" width="${pageWidth}" height="${pageHeight}" style="position:absolute;inset:0;pointer-events:none">${layerGroups}</svg>`;
}

function renderStrokePath(stroke: RecipePageStroke, pageWidth: number, pageHeight: number): string {
  const pts = stroke.points.map(p => [p.x * pageWidth, p.y * pageHeight, p.pressure] as [number, number, number]);
  if (pts.length < 2) return '';
  const polygon = getStroke(pts, {
    size: stroke.widthFrac * pageWidth,
    thinning: 0.7,
    smoothing: 0.5,
    streamline: 0.4,
    simulatePressure: false,
  });
  const d = polygonToPathD(polygon);
  if (!d) return '';
  return `<path d="${d}" fill="${stroke.color}" opacity="${stroke.opacity}"/>`;
}

function polygonToPathD(polygon: number[][]): string {
  if (polygon.length < 3) return '';
  const avg = (a: number, b: number) => (a + b) / 2;
  const first = polygon[0];
  const second = polygon[1];
  const parts: string[] = [];
  parts.push(`M${avg(first[0], second[0])},${avg(first[1], second[1])}`);
  for (let i = 1; i < polygon.length - 1; i++) {
    const a = polygon[i];
    const b = polygon[i + 1];
    parts.push(`Q${a[0]},${a[1]} ${avg(a[0], b[0])},${avg(a[1], b[1])}`);
  }
  parts.push('Z');
  return parts.join(' ');
}

function cssBlendMode(mode: string): string {
  switch (mode) {
    case 'multiply':   return 'multiply';
    case 'screen':     return 'screen';
    case 'overlay':    return 'overlay';
    case 'soft-light': return 'soft-light';
    case 'normal':
    default:           return 'normal';
  }
}

// ─── Stickers ────────────────────────────────────────────────────────────────

function renderStickers(
  page: RecipePage,
  pageWidth: number,
  pageHeight: number,
  stickerSrc: RenderOptions['stickerSrc'],
): string {
  if (page.stickers.length === 0) return '';
  const STICKER_DISPLAY_PX = 64; // matches the RN canvas's STICKER_SIZE

  const parts = page.stickers
    .slice()
    .sort((a, b) => a.zIndex - b.zIndex)
    .map(s => {
      const src = stickerSrc?.(s.kind);
      if (!src) return '';
      const x = s.cx * pageWidth;
      const y = s.cy * pageHeight;
      const size = STICKER_DISPLAY_PX;
      const rotDeg = (s.rotation * 180) / Math.PI;
      return `<img
        class="sticker"
        src="${escapeAttr(src)}"
        style="position:absolute;left:${x - size / 2}px;top:${y - size / 2}px;width:${size}px;height:${size}px;transform:rotate(${rotDeg}deg) scale(${s.scale});transform-origin:center;pointer-events:none;z-index:${20 + s.zIndex};"
        alt=""
      >`;
    })
    .filter(Boolean);

  return parts.join('\n    ');
}

// ─── Escaping helpers ────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Attribute values need the same full escape set as text content — &, <, >,
// ", '. Anything less lets user content break out of an attribute via an
// HTML-entity form (e.g. &quot; decodes to " and closes the attribute).
function escapeAttr(s: string): string {
  return escapeHtml(s);
}
