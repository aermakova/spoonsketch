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

import type { RecipePage } from './recipePage';
import { TEMPLATE_BLOCKS } from './blockDefs';

export interface RenderOptions {
  // Physical page width in pixels. Defaults to A4 at 96 DPI (screen preview
  // quality). For print, pass 2480 (A4 @ 300 DPI).
  widthPx?: number;
  // Show a subtle drop shadow around the page in a grey background —
  // matches how browsers preview print pages. Disable for actual printing.
  previewChrome?: boolean;
}

const DEFAULT_WIDTH_PX = 794; // A4 @ 96 DPI

export function renderRecipePage(page: RecipePage, opts: RenderOptions = {}): string {
  const pageWidth = opts.widthPx ?? DEFAULT_WIDTH_PX;
  const pageHeight = Math.round(pageWidth * page.pageAspectRatio);
  const previewChrome = opts.previewChrome ?? true;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(page.content.title || 'Recipe')}</title>
  ${fontLinks()}
  <style>${baseCSS(pageWidth, pageHeight, page, previewChrome)}</style>
</head>
<body>
  <div class="page t-${page.style.template}">
    ${renderPaperPattern(page, pageWidth, pageHeight)}
    ${renderTemplate(page, pageWidth, pageHeight)}
  </div>
</body>
</html>`;
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
  const { paletteAccent, palettePaper, paletteInk, paletteInkSoft, paletteInkFaint } = page.style;

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
      .page { box-shadow: none !important; }
    }

    .page {
      position: relative;
      width: ${pageWidth}px;
      height: ${pageHeight}px;
      background: ${palettePaper};
      margin: 0 auto;
      overflow: hidden;
      ${preview ? `box-shadow: 0 8px 32px rgba(0,0,0,0.3);` : ''}
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
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .t-classic .pill {
      display: inline-flex;
      gap: 4px;
      padding: 4px 10px;
      border-radius: 8px;
      background: ${paletteAccent}22;
      font-size: 13px;
      color: ${paletteInkSoft};
    }
    .t-classic .pill strong {
      color: ${paletteAccent};
      font-weight: 700;
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
      display: flex; align-items: flex-start; gap: 6px; margin-bottom: 4px;
    }
    .t-classic .ing-row .dot {
      width: 5px; height: 5px; border-radius: 50%;
      background: ${paletteAccent}; margin-top: 7px; flex-shrink: 0;
    }
    .t-classic .block-method-list {
      font-family: 'Nunito', sans-serif;
      font-size: 14px;
      line-height: 18px;
      color: ${paletteInk};
    }
    .t-classic .step-row {
      display: flex; align-items: flex-start; gap: 10px; margin-bottom: 6px;
    }
    .t-classic .step-badge {
      width: 20px; height: 20px; border-radius: 50%;
      background: ${paletteAccent};
      color: #fff; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; flex-shrink: 0; margin-top: 1px;
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

    .page-number {
      position: absolute;
      bottom: 18px;
      right: 24px;
      color: ${paletteInkFaint};
      font-size: 11px;
      font-family: 'Nunito', sans-serif;
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
    case 'classic':
      return renderClassic(page, pageWidth, pageHeight);
    default:
      // Phase F HTML renderer ships Classic only in this commit. Until the
      // other templates land, fall back to Classic layout so the page still
      // renders something sensible in preview / export.
      return renderClassic(page, pageWidth, pageHeight);
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

// ─── Escaping helpers ────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, '&quot;');
}
