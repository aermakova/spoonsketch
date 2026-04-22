// Block system — per-template layout definitions for Phase 4.5c
// All getDefault(pw) functions use proportional allocation so every block
// is fully visible on any screen size (SE → Pro Max → iPad) without overflow.

export interface BlockAbsoluteLayout {
  cx: number;       // center x, absolute px
  cy: number;       // center y, absolute px
  w: number;        // width, absolute px
  h: number;        // height, absolute px
  rotation: number; // radians
  scale: number;
}

// Stored as fractions: cx/pageWidth, cy/pageHeight, w/pageWidth, h/pageWidth.
// All layout fields optional so a fontScale-only override doesn't require writing layout.
// Resolver falls back to BlockDef.getDefault() for any missing field.
export interface BlockOverride extends Partial<BlockAbsoluteLayout> {
  hidden?: boolean;
  fontScale?: number; // 1 = default, clamped 0.6–1.8
}

export const FONT_SCALE_MIN = 0.6;
export const FONT_SCALE_MAX = 1.8;
export const FONT_SCALE_STEP = 0.1;

export interface BlockDef {
  blockId: string;
  label: string;
  getDefault: (pw: number) => BlockAbsoluteLayout;
  minScale: number;
  maxScale: number;
  // Text-heavy blocks get side-drag width handles and the font-size toolbar.
  // Blocks containing a fixed-aspect-ratio photo set this false.
  isTextHeavy: boolean;
}

const PAD = 16;   // matches canvas padding in editor and scrapbook view
const GAP = 8;    // vertical gap between stacked blocks

function pageH(pw: number) {
  return Math.round(pw * 1.4142);
}

// Returns usable content height after top + bottom canvas padding
function usable(pw: number) {
  return pageH(pw) - PAD - 28; // top PAD + paddingBottom 28
}

// ─── Classic ─────────────────────────────────────────────────────────────────
// Phase B atomization. Layout:
//   [title] / [description] / [pills] / [photo | ing-heading + ing-list] /
//   [method-heading] / [method-list] / [tags]
const classicTitleH     = (pw: number) => Math.round(usable(pw) * 0.08);
const classicDescH      = (pw: number) => Math.round(usable(pw) * 0.08);
const classicPillsH     = (pw: number) => Math.round(usable(pw) * 0.05);
const classicRowH       = (pw: number) => Math.round(usable(pw) * 0.28);
const classicMethHdrH   = (pw: number) => Math.round(usable(pw) * 0.05);
const classicMethListH  = (pw: number) => Math.round(usable(pw) * 0.32);
const classicIngHdrH    = (pw: number) => Math.round(usable(pw) * 0.05);
const classicRowTop     = (pw: number) =>
  PAD + classicTitleH(pw) + GAP + classicDescH(pw) + GAP + classicPillsH(pw) + GAP;
const classicMethTop    = (pw: number) => classicRowTop(pw) + classicRowH(pw) + GAP;

const classicBlocks: BlockDef[] = [
  {
    blockId: 'title',
    label: 'Title',
    getDefault: (pw) => {
      const h = classicTitleH(pw);
      return { cx: pw / 2, cy: PAD + h / 2, w: pw - PAD * 2, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
  {
    blockId: 'description',
    label: 'Description',
    getDefault: (pw) => {
      const h = classicDescH(pw);
      const top = PAD + classicTitleH(pw) + GAP;
      return { cx: pw / 2, cy: top + h / 2, w: pw - PAD * 2, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
  {
    blockId: 'pills',
    label: 'Time & servings',
    getDefault: (pw) => {
      const h = classicPillsH(pw);
      const top = PAD + classicTitleH(pw) + GAP + classicDescH(pw) + GAP;
      return { cx: pw / 2, cy: top + h / 2, w: pw - PAD * 2, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
  {
    blockId: 'image',
    label: 'Photo',
    getDefault: (pw) => {
      const imgSize = Math.round(pw * 0.34);
      const w = imgSize + 10;
      const cx = PAD + w / 2;
      const cy = classicRowTop(pw) + classicRowH(pw) / 2;
      return { cx, cy, w, h: classicRowH(pw), rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: false,
  },
  {
    blockId: 'ingredients-heading',
    label: 'Ingredients heading',
    getDefault: (pw) => {
      const imgBlockW = Math.round(pw * 0.34) + 10;
      const xStart = PAD + imgBlockW + GAP;
      const w = pw - PAD - xStart;
      const cx = xStart + w / 2;
      const h = classicIngHdrH(pw);
      const cy = classicRowTop(pw) + h / 2;
      return { cx, cy, w, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
  {
    blockId: 'ingredients-list',
    label: 'Ingredients',
    getDefault: (pw) => {
      const imgBlockW = Math.round(pw * 0.34) + 10;
      const xStart = PAD + imgBlockW + GAP;
      const w = pw - PAD - xStart;
      const cx = xStart + w / 2;
      const hdrH = classicIngHdrH(pw);
      const h = classicRowH(pw) - hdrH - GAP;
      const top = classicRowTop(pw) + hdrH + GAP;
      return { cx, cy: top + h / 2, w, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
  {
    blockId: 'method-heading',
    label: 'Method heading',
    getDefault: (pw) => {
      const h = classicMethHdrH(pw);
      const top = classicMethTop(pw);
      return { cx: pw / 2, cy: top + h / 2, w: pw - PAD * 2, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
  {
    blockId: 'method-list',
    label: 'Method',
    getDefault: (pw) => {
      const h = classicMethListH(pw);
      const top = classicMethTop(pw) + classicMethHdrH(pw) + GAP;
      return { cx: pw / 2, cy: top + h / 2, w: pw - PAD * 2, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
  {
    blockId: 'tags',
    label: 'Tags',
    getDefault: (pw) => {
      const h = 28;
      const top = classicMethTop(pw) + classicMethHdrH(pw) + GAP + classicMethListH(pw) + GAP;
      const w = Math.round(pw * 0.42);
      return { cx: PAD + w / 2, cy: top + h / 2, w, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
];

// ─── Photo Hero ───────────────────────────────────────────────────────────────
// Phase B: `hero` split into `image` (keeps dark-overlay decoration), `title`
// overlay near bottom of image, plus description + pills atoms below. Ingredient
// and method columns split into heading + list pairs.
const phHeroH       = (pw: number) => Math.round(usable(pw) * 0.42);
const phTitleH      = (pw: number) => Math.round(usable(pw) * 0.08);
const phDescH       = (pw: number) => Math.round(usable(pw) * 0.06);
const phPillsH      = (pw: number) => Math.round(usable(pw) * 0.05);
const phColHdrH     = (pw: number) => Math.round(usable(pw) * 0.05);
const phColsTop     = (pw: number) =>
  PAD + phHeroH(pw) + GAP + phTitleH(pw) + GAP + phDescH(pw) + GAP + phPillsH(pw) + GAP;

const photoHeroBlocks: BlockDef[] = [
  {
    blockId: 'image',
    label: 'Photo',
    getDefault: (pw) => {
      const h = phHeroH(pw);
      return { cx: pw / 2, cy: PAD + h / 2, w: pw, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 2,
    isTextHeavy: false,
  },
  {
    blockId: 'title',
    label: 'Title',
    getDefault: (pw) => {
      const h = phTitleH(pw);
      const top = PAD + phHeroH(pw) + GAP;
      return { cx: pw / 2, cy: top + h / 2, w: pw - PAD * 2, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
  {
    blockId: 'description',
    label: 'Description',
    getDefault: (pw) => {
      const h = phDescH(pw);
      const top = PAD + phHeroH(pw) + GAP + phTitleH(pw) + GAP;
      return { cx: pw / 2, cy: top + h / 2, w: pw - PAD * 2, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
  {
    blockId: 'pills',
    label: 'Time & servings',
    getDefault: (pw) => {
      const h = phPillsH(pw);
      const top = PAD + phHeroH(pw) + GAP + phTitleH(pw) + GAP + phDescH(pw) + GAP;
      return { cx: pw / 2, cy: top + h / 2, w: pw - PAD * 2, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
  {
    blockId: 'ingredients-heading',
    label: 'Ingredients heading',
    getDefault: (pw) => {
      const colW = Math.round((pw - PAD * 2 - GAP) / 2);
      const h = phColHdrH(pw);
      const top = phColsTop(pw);
      return { cx: PAD + colW / 2, cy: top + h / 2, w: colW, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
  {
    blockId: 'ingredients-list',
    label: 'Ingredients',
    getDefault: (pw) => {
      const colW = Math.round((pw - PAD * 2 - GAP) / 2);
      const hdrH = phColHdrH(pw);
      const top = phColsTop(pw) + hdrH + GAP;
      const h = usable(pw) - (phColsTop(pw) - PAD) - hdrH - GAP;
      return { cx: PAD + colW / 2, cy: top + h / 2, w: colW, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
  {
    blockId: 'method-heading',
    label: 'Method heading',
    getDefault: (pw) => {
      const colW = Math.round((pw - PAD * 2 - GAP) / 2);
      const h = phColHdrH(pw);
      const top = phColsTop(pw);
      const cx = PAD + colW + GAP + colW / 2;
      return { cx, cy: top + h / 2, w: colW, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
  {
    blockId: 'method-list',
    label: 'Method',
    getDefault: (pw) => {
      const colW = Math.round((pw - PAD * 2 - GAP) / 2);
      const hdrH = phColHdrH(pw);
      const top = phColsTop(pw) + hdrH + GAP;
      const h = usable(pw) - (phColsTop(pw) - PAD) - hdrH - GAP;
      const cx = PAD + colW + GAP + colW / 2;
      return { cx, cy: top + h / 2, w: colW, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
];

// ─── Minimal ──────────────────────────────────────────────────────────────────
// Phase B: ingredients and method split into heading + list pairs.
const minimalTitleH     = (pw: number) => Math.round(usable(pw) * 0.10);
const minimalDescH      = (pw: number) => Math.round(usable(pw) * 0.08);
const minimalPillsH     = (pw: number) => Math.round(usable(pw) * 0.06);
const minimalIngHdrH    = (pw: number) => Math.round(usable(pw) * 0.05);
const minimalIngListH   = (pw: number) => Math.round(usable(pw) * 0.14);
const minimalMethHdrH   = (pw: number) => Math.round(usable(pw) * 0.05);
const minimalIngTop     = (pw: number) =>
  PAD + minimalTitleH(pw) + GAP + minimalDescH(pw) + GAP + minimalPillsH(pw) + GAP;
const minimalMethTop    = (pw: number) =>
  minimalIngTop(pw) + minimalIngHdrH(pw) + GAP + minimalIngListH(pw) + GAP;

const minimalBlocks: BlockDef[] = [
  {
    blockId: 'title',
    label: 'Title',
    getDefault: (pw) => {
      const h = minimalTitleH(pw);
      return { cx: pw / 2, cy: PAD + h / 2, w: pw - PAD * 2, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
  {
    blockId: 'description',
    label: 'Description',
    getDefault: (pw) => {
      const h = minimalDescH(pw);
      const top = PAD + minimalTitleH(pw) + GAP;
      return { cx: pw / 2, cy: top + h / 2, w: pw - PAD * 2, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
  {
    blockId: 'pills',
    label: 'Time & servings',
    getDefault: (pw) => {
      const h = minimalPillsH(pw);
      const top = PAD + minimalTitleH(pw) + GAP + minimalDescH(pw) + GAP;
      return { cx: pw / 2, cy: top + h / 2, w: pw - PAD * 2, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
  {
    blockId: 'ingredients-heading',
    label: 'Ingredients heading',
    getDefault: (pw) => {
      const h = minimalIngHdrH(pw);
      const top = minimalIngTop(pw);
      return { cx: pw / 2, cy: top + h / 2, w: pw - PAD * 2, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
  {
    blockId: 'ingredients-list',
    label: 'Ingredients',
    getDefault: (pw) => {
      const h = minimalIngListH(pw);
      const top = minimalIngTop(pw) + minimalIngHdrH(pw) + GAP;
      return { cx: pw / 2, cy: top + h / 2, w: pw - PAD * 2, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
  {
    blockId: 'method-heading',
    label: 'Method heading',
    getDefault: (pw) => {
      const h = minimalMethHdrH(pw);
      const top = minimalMethTop(pw);
      return { cx: pw / 2, cy: top + h / 2, w: pw - PAD * 2, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
  {
    blockId: 'method-list',
    label: 'Method',
    getDefault: (pw) => {
      const top = minimalMethTop(pw) + minimalMethHdrH(pw) + GAP;
      const h = usable(pw) - (top - PAD);
      return { cx: pw / 2, cy: top + h / 2, w: pw - PAD * 2, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
];

// ─── Two Column ───────────────────────────────────────────────────────────────
// Phase B: `left-col` / `right-col` atomized.
// Layout:
//   [title — full width] / [description — full width] /
//   [left: image + pills + ingredients-heading + ingredients-list] |
//   [right: method-heading + method-list]
const twoColTitleH    = (pw: number) => Math.round(usable(pw) * 0.08);
const twoColDescH     = (pw: number) => Math.round(usable(pw) * 0.06);
const twoColTop       = (pw: number) => PAD + twoColTitleH(pw) + GAP + twoColDescH(pw) + GAP;
const twoColW         = (pw: number) => Math.round((pw - PAD * 2 - GAP) / 2);
const twoColImgH      = (pw: number) => Math.round(twoColW(pw) * 0.72);
const twoColPillsH    = (pw: number) => Math.round(usable(pw) * 0.05);
const twoColIngHdrH   = (pw: number) => Math.round(usable(pw) * 0.05);
const twoColMethHdrH  = (pw: number) => Math.round(usable(pw) * 0.05);

const twoColumnBlocks: BlockDef[] = [
  {
    blockId: 'title',
    label: 'Title',
    getDefault: (pw) => {
      const h = twoColTitleH(pw);
      return { cx: pw / 2, cy: PAD + h / 2, w: pw - PAD * 2, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
  {
    blockId: 'description',
    label: 'Description',
    getDefault: (pw) => {
      const h = twoColDescH(pw);
      const top = PAD + twoColTitleH(pw) + GAP;
      return { cx: pw / 2, cy: top + h / 2, w: pw - PAD * 2, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
  {
    blockId: 'image',
    label: 'Photo',
    getDefault: (pw) => {
      const colW = twoColW(pw);
      const h = twoColImgH(pw);
      const top = twoColTop(pw);
      return { cx: PAD + colW / 2, cy: top + h / 2, w: colW, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: false,
  },
  {
    blockId: 'pills',
    label: 'Time & servings',
    getDefault: (pw) => {
      const colW = twoColW(pw);
      const h = twoColPillsH(pw);
      const top = twoColTop(pw) + twoColImgH(pw) + GAP;
      return { cx: PAD + colW / 2, cy: top + h / 2, w: colW, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
  {
    blockId: 'ingredients-heading',
    label: 'Ingredients heading',
    getDefault: (pw) => {
      const colW = twoColW(pw);
      const h = twoColIngHdrH(pw);
      const top = twoColTop(pw) + twoColImgH(pw) + GAP + twoColPillsH(pw) + GAP;
      return { cx: PAD + colW / 2, cy: top + h / 2, w: colW, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
  {
    blockId: 'ingredients-list',
    label: 'Ingredients',
    getDefault: (pw) => {
      const colW = twoColW(pw);
      const top = twoColTop(pw) + twoColImgH(pw) + GAP + twoColPillsH(pw) + GAP + twoColIngHdrH(pw) + GAP;
      const h = usable(pw) - (top - PAD);
      return { cx: PAD + colW / 2, cy: top + h / 2, w: colW, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
  {
    blockId: 'method-heading',
    label: 'Method heading',
    getDefault: (pw) => {
      const colW = twoColW(pw);
      const h = twoColMethHdrH(pw);
      const top = twoColTop(pw);
      const cx = PAD + colW + GAP + colW / 2;
      return { cx, cy: top + h / 2, w: colW, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
  {
    blockId: 'method-list',
    label: 'Method',
    getDefault: (pw) => {
      const colW = twoColW(pw);
      const top = twoColTop(pw) + twoColMethHdrH(pw) + GAP;
      const h = usable(pw) - (top - PAD);
      const cx = PAD + colW + GAP + colW / 2;
      return { cx, cy: top + h / 2, w: colW, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
];

// ─── Journal ──────────────────────────────────────────────────────────────────
// Phase B: `meta` mega-block split into `pills` + `ingredients-heading` +
// `ingredients-list`; `steps` split into `method-heading` + `method-list`.
// Photo keeps its subtle rotation for the signature journal-page look.
const jTitleH     = (pw: number) => Math.round(usable(pw) * 0.08);
const jDescH      = (pw: number) => Math.round(usable(pw) * 0.08);
const jRowH       = (pw: number) => Math.round(usable(pw) * 0.28);
const jImgW       = (pw: number) => Math.round(pw * 0.42);
const jPillsH     = (pw: number) => Math.round(usable(pw) * 0.05);
const jIngHdrH    = (pw: number) => Math.round(usable(pw) * 0.05);
const jMethHdrH   = (pw: number) => Math.round(usable(pw) * 0.05);
const jMethListH  = (pw: number) => Math.round(usable(pw) * 0.32);
const jRowTop     = (pw: number) => PAD + jTitleH(pw) + GAP + jDescH(pw) + GAP;
const jMethTop    = (pw: number) => jRowTop(pw) + jRowH(pw) + GAP;

const journalBlocks: BlockDef[] = [
  {
    blockId: 'title',
    label: 'Title',
    getDefault: (pw) => {
      const h = jTitleH(pw);
      return { cx: pw / 2, cy: PAD + h / 2, w: pw - PAD * 2, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
  {
    blockId: 'description',
    label: 'Description',
    getDefault: (pw) => {
      const h = jDescH(pw);
      return { cx: pw / 2, cy: PAD + jTitleH(pw) + GAP + h / 2, w: pw - PAD * 2, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
  {
    blockId: 'photo',
    label: 'Photo',
    getDefault: (pw) => {
      const imgW = jImgW(pw);
      const top = jRowTop(pw);
      return { cx: PAD + imgW / 2, cy: top + jRowH(pw) / 2, w: imgW, h: jRowH(pw), rotation: 0.017, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: false,
  },
  {
    blockId: 'pills',
    label: 'Time & servings',
    getDefault: (pw) => {
      const imgW = jImgW(pw);
      const xStart = PAD + imgW + GAP;
      const w = pw - PAD - xStart;
      const h = jPillsH(pw);
      const top = jRowTop(pw);
      return { cx: xStart + w / 2, cy: top + h / 2, w, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
  {
    blockId: 'ingredients-heading',
    label: 'Ingredients heading',
    getDefault: (pw) => {
      const imgW = jImgW(pw);
      const xStart = PAD + imgW + GAP;
      const w = pw - PAD - xStart;
      const h = jIngHdrH(pw);
      const top = jRowTop(pw) + jPillsH(pw) + GAP;
      return { cx: xStart + w / 2, cy: top + h / 2, w, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
  {
    blockId: 'ingredients-list',
    label: 'Ingredients',
    getDefault: (pw) => {
      const imgW = jImgW(pw);
      const xStart = PAD + imgW + GAP;
      const w = pw - PAD - xStart;
      const top = jRowTop(pw) + jPillsH(pw) + GAP + jIngHdrH(pw) + GAP;
      const h = jRowH(pw) - jPillsH(pw) - GAP - jIngHdrH(pw) - GAP;
      return { cx: xStart + w / 2, cy: top + h / 2, w, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
  {
    blockId: 'method-heading',
    label: 'Method heading',
    getDefault: (pw) => {
      const h = jMethHdrH(pw);
      const top = jMethTop(pw);
      return { cx: pw / 2, cy: top + h / 2, w: pw - PAD * 2, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
  {
    blockId: 'method-list',
    label: 'Method',
    getDefault: (pw) => {
      const h = jMethListH(pw);
      const top = jMethTop(pw) + jMethHdrH(pw) + GAP;
      return { cx: pw / 2, cy: top + h / 2, w: pw - PAD * 2, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
  {
    blockId: 'tags',
    label: 'Tags',
    getDefault: (pw) => {
      const h = 28;
      const top = jMethTop(pw) + jMethHdrH(pw) + GAP + jMethListH(pw) + GAP;
      const w = Math.round(pw * 0.42);
      return { cx: PAD + w / 2, cy: top + h / 2, w, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
];

// ─── Recipe Card ──────────────────────────────────────────────────────────────
// Phase B: `banner` retained as a non-block decorative accent painted behind
// the title block (in PageTemplates.tsx). `ingredients` split into heading +
// list; `steps` split into method-heading + method-list.
const cardTitleH     = (pw: number) => Math.round(usable(pw) * 0.10);
const cardDescH      = (pw: number) => Math.round(usable(pw) * 0.07);
const cardRowH       = (pw: number) => Math.round(usable(pw) * 0.24);
const cardIngHdrH    = (pw: number) => Math.round(usable(pw) * 0.05);
const cardMethHdrH   = (pw: number) => Math.round(usable(pw) * 0.05);
const cardMethListH  = (pw: number) => Math.round(usable(pw) * 0.32);
const cardRowTop     = (pw: number) => PAD + cardTitleH(pw) + GAP + cardDescH(pw) + GAP;
const cardMethTop    = (pw: number) => cardRowTop(pw) + cardRowH(pw) + GAP;

const recipeCardBlocks: BlockDef[] = [
  {
    blockId: 'title',
    label: 'Title',
    getDefault: (pw) => {
      const h = cardTitleH(pw);
      return { cx: pw / 2, cy: PAD + h / 2, w: pw - PAD * 2, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
  {
    blockId: 'description',
    label: 'Description',
    getDefault: (pw) => {
      const h = cardDescH(pw);
      const top = PAD + cardTitleH(pw) + GAP;
      return { cx: pw / 2, cy: top + h / 2, w: pw - PAD * 2, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
  {
    blockId: 'image',
    label: 'Photo',
    getDefault: (pw) => {
      const imgW = Math.round(pw * 0.42);
      const top = cardRowTop(pw);
      return { cx: PAD + imgW / 2, cy: top + cardRowH(pw) / 2, w: imgW, h: cardRowH(pw), rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: false,
  },
  {
    blockId: 'ingredients-heading',
    label: 'Ingredients heading',
    getDefault: (pw) => {
      const imgW = Math.round(pw * 0.42);
      const xStart = PAD + imgW + GAP;
      const w = pw - PAD - xStart;
      const h = cardIngHdrH(pw);
      const top = cardRowTop(pw);
      return { cx: xStart + w / 2, cy: top + h / 2, w, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
  {
    blockId: 'ingredients-list',
    label: 'Ingredients',
    getDefault: (pw) => {
      const imgW = Math.round(pw * 0.42);
      const xStart = PAD + imgW + GAP;
      const w = pw - PAD - xStart;
      const hdrH = cardIngHdrH(pw);
      const h = cardRowH(pw) - hdrH - GAP;
      const top = cardRowTop(pw) + hdrH + GAP;
      return { cx: xStart + w / 2, cy: top + h / 2, w, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
  {
    blockId: 'method-heading',
    label: 'Method heading',
    getDefault: (pw) => {
      const h = cardMethHdrH(pw);
      const top = cardMethTop(pw);
      return { cx: pw / 2, cy: top + h / 2, w: pw - PAD * 2, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
  {
    blockId: 'method-list',
    label: 'Method',
    getDefault: (pw) => {
      const h = cardMethListH(pw);
      const top = cardMethTop(pw) + cardMethHdrH(pw) + GAP;
      return { cx: pw / 2, cy: top + h / 2, w: pw - PAD * 2, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
  {
    blockId: 'tags',
    label: 'Tags',
    getDefault: (pw) => {
      const h = 28;
      const top = cardMethTop(pw) + cardMethHdrH(pw) + GAP + cardMethListH(pw) + GAP;
      const w = Math.round(pw * 0.42);
      return { cx: PAD + w / 2, cy: top + h / 2, w, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
];

// ─── Registry ─────────────────────────────────────────────────────────────────
export const TEMPLATE_BLOCKS: Record<string, BlockDef[]> = {
  'classic': classicBlocks,
  'photo-hero': photoHeroBlocks,
  'minimal': minimalBlocks,
  'two-column': twoColumnBlocks,
  'journal': journalBlocks,
  'recipe-card': recipeCardBlocks,
};

export function getBlockDefs(templateKey: string): BlockDef[] {
  return TEMPLATE_BLOCKS[templateKey] ?? [];
}
