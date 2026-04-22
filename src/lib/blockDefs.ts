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
// Layout: [title] / [description] / [pills] / [photo | ingredients] / [method] / [tags]
//
// Phase A: `header` mega-block (desc + pills) split into separate `description`
// and `pills` blocks. Downstream row heights rebalanced to make room.
const classicTitleH   = (pw: number) => Math.round(usable(pw) * 0.08);
const classicDescH    = (pw: number) => Math.round(usable(pw) * 0.08);
const classicPillsH   = (pw: number) => Math.round(usable(pw) * 0.05);
const classicRowH     = (pw: number) => Math.round(usable(pw) * 0.28);
const classicStepsH   = (pw: number) => Math.round(usable(pw) * 0.37);
const classicRowTop   = (pw: number) =>
  PAD + classicTitleH(pw) + GAP + classicDescH(pw) + GAP + classicPillsH(pw) + GAP;

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
    blockId: 'ingredients',
    label: 'Ingredients',
    getDefault: (pw) => {
      const imgBlockW = Math.round(pw * 0.34) + 10;
      const xStart = PAD + imgBlockW + GAP;
      const w = pw - PAD - xStart;
      const cx = xStart + w / 2;
      const cy = classicRowTop(pw) + classicRowH(pw) / 2;
      return { cx, cy, w, h: classicRowH(pw), rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
  {
    blockId: 'steps',
    label: 'Method',
    getDefault: (pw) => {
      const h = classicStepsH(pw);
      const top = classicRowTop(pw) + classicRowH(pw) + GAP;
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
      const top = classicRowTop(pw) + classicRowH(pw) + GAP + classicStepsH(pw) + GAP;
      const w = Math.round(pw * 0.42);
      return { cx: PAD + w / 2, cy: top + h / 2, w, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
];

// ─── Photo Hero ───────────────────────────────────────────────────────────────
// Layout: [hero — full width (image+title+pills overlay)] / [description] / [ingredients | method]
//
// Phase A: description extracted from the hero mega-block into its own block,
// positioned between hero and the ingredient/method columns. Hero keeps image,
// title overlay and pill overlay.
const photoHeroHeroH = (pw: number) => Math.round(usable(pw) * 0.44);
const photoHeroDescH = (pw: number) => Math.round(usable(pw) * 0.06);

const photoHeroBlocks: BlockDef[] = [
  {
    blockId: 'hero',
    label: 'Hero (image + title)',
    getDefault: (pw) => {
      const h = photoHeroHeroH(pw);
      return { cx: pw / 2, cy: PAD + h / 2, w: pw, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 2,
    isTextHeavy: false,
  },
  {
    blockId: 'description',
    label: 'Description',
    getDefault: (pw) => {
      const heroH = photoHeroHeroH(pw);
      const h = photoHeroDescH(pw);
      const top = PAD + heroH + GAP;
      return { cx: pw / 2, cy: top + h / 2, w: pw - PAD * 2, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
  {
    blockId: 'ingredients',
    label: 'Ingredients',
    getDefault: (pw) => {
      const heroH = photoHeroHeroH(pw);
      const descH = photoHeroDescH(pw);
      const top = PAD + heroH + GAP + descH + GAP;
      const colW = Math.round((pw - PAD * 2 - GAP) / 2);
      const h = usable(pw) - heroH - GAP - descH - GAP;
      return { cx: PAD + colW / 2, cy: top + h / 2, w: colW, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
  {
    blockId: 'method',
    label: 'Method',
    getDefault: (pw) => {
      const heroH = photoHeroHeroH(pw);
      const descH = photoHeroDescH(pw);
      const top = PAD + heroH + GAP + descH + GAP;
      const colW = Math.round((pw - PAD * 2 - GAP) / 2);
      const h = usable(pw) - heroH - GAP - descH - GAP;
      const cx = PAD + colW + GAP + colW / 2;
      return { cx, cy: top + h / 2, w: colW, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
];

// ─── Minimal ──────────────────────────────────────────────────────────────────
// Layout: [title] / [description] / [pills] / [ingredients] / [method]
//
// Phase A: header mega-block split into `description` + `pills`. Ingredients /
// method take the remaining vertical space.
const minimalTitleH = (pw: number) => Math.round(usable(pw) * 0.10);
const minimalDescH  = (pw: number) => Math.round(usable(pw) * 0.08);
const minimalPillsH = (pw: number) => Math.round(usable(pw) * 0.06);
const minimalIngH   = (pw: number) => Math.round(usable(pw) * 0.18);

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
    blockId: 'ingredients',
    label: 'Ingredients',
    getDefault: (pw) => {
      const h = minimalIngH(pw);
      const top = PAD + minimalTitleH(pw) + GAP + minimalDescH(pw) + GAP + minimalPillsH(pw) + GAP;
      return { cx: pw / 2, cy: top + h / 2, w: pw - PAD * 2, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
  {
    blockId: 'method',
    label: 'Method',
    getDefault: (pw) => {
      const titleH = minimalTitleH(pw);
      const descH  = minimalDescH(pw);
      const pillsH = minimalPillsH(pw);
      const ingH   = minimalIngH(pw);
      const h = usable(pw) - titleH - descH - pillsH - ingH - GAP * 4;
      const top = PAD + titleH + GAP + descH + GAP + pillsH + GAP + ingH + GAP;
      return { cx: pw / 2, cy: top + h / 2, w: pw - PAD * 2, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
];

// ─── Two Column ───────────────────────────────────────────────────────────────
// Layout: [title — full width] / [description — full width] /
//         [left (photo+ingredients) | right (steps)]
//
// Phase A: adds a `description` block between the title and the two columns.
// Columns shrink vertically to make room.
const twoColTitleH = (pw: number) => Math.round(usable(pw) * 0.08);
const twoColDescH  = (pw: number) => Math.round(usable(pw) * 0.06);

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
    blockId: 'left-col',
    label: 'Left (photo + ingredients)',
    getDefault: (pw) => {
      const titleH = twoColTitleH(pw);
      const descH  = twoColDescH(pw);
      const top = PAD + titleH + GAP + descH + GAP;
      const colW = Math.round((pw - PAD * 2 - GAP) / 2);
      const h = usable(pw) - titleH - GAP - descH - GAP;
      return { cx: PAD + colW / 2, cy: top + h / 2, w: colW, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: false,
  },
  {
    blockId: 'right-col',
    label: 'Right (method)',
    getDefault: (pw) => {
      const titleH = twoColTitleH(pw);
      const descH  = twoColDescH(pw);
      const top = PAD + titleH + GAP + descH + GAP;
      const colW = Math.round((pw - PAD * 2 - GAP) / 2);
      const h = usable(pw) - titleH - GAP - descH - GAP;
      const cx = PAD + colW + GAP + colW / 2;
      return { cx, cy: top + h / 2, w: colW, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
];

// ─── Journal ──────────────────────────────────────────────────────────────────
// Layout: [title] / [description] / [photo | meta] / [steps] / [tags]
const journalBlocks: BlockDef[] = [
  {
    blockId: 'title',
    label: 'Title',
    getDefault: (pw) => {
      const h = Math.round(usable(pw) * 0.08);
      return { cx: pw / 2, cy: PAD + h / 2, w: pw - PAD * 2, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
  {
    blockId: 'description',
    label: 'Description',
    getDefault: (pw) => {
      const titleH = Math.round(usable(pw) * 0.08);
      const h = Math.round(usable(pw) * 0.08);
      return { cx: pw / 2, cy: PAD + titleH + GAP + h / 2, w: pw - PAD * 2, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
  {
    blockId: 'photo',
    label: 'Photo',
    getDefault: (pw) => {
      const titleH = Math.round(usable(pw) * 0.08);
      const descH = Math.round(usable(pw) * 0.08);
      const rowH = Math.round(usable(pw) * 0.28);
      const imgW = Math.round(pw * 0.42);
      const top = PAD + titleH + GAP + descH + GAP;
      return { cx: PAD + imgW / 2, cy: top + rowH / 2, w: imgW, h: rowH, rotation: 0.017, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: false,
  },
  {
    blockId: 'meta',
    label: 'Meta (time + ingredients)',
    getDefault: (pw) => {
      const titleH = Math.round(usable(pw) * 0.08);
      const descH = Math.round(usable(pw) * 0.08);
      const rowH = Math.round(usable(pw) * 0.28);
      const imgW = Math.round(pw * 0.42);
      const xStart = PAD + imgW + GAP;
      const w = pw - PAD - xStart;
      const top = PAD + titleH + GAP + descH + GAP;
      return { cx: xStart + w / 2, cy: top + rowH / 2, w, h: rowH, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
  {
    blockId: 'steps',
    label: 'Method',
    getDefault: (pw) => {
      const u = usable(pw);
      const titleH = Math.round(u * 0.08);
      const descH = Math.round(u * 0.08);
      const rowH = Math.round(u * 0.28);
      const h = Math.round(u * 0.38);
      const top = PAD + titleH + GAP + descH + GAP + rowH + GAP;
      return { cx: pw / 2, cy: top + h / 2, w: pw - PAD * 2, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
  {
    blockId: 'tags',
    label: 'Tags',
    getDefault: (pw) => {
      const u = usable(pw);
      const titleH = Math.round(u * 0.08);
      const descH = Math.round(u * 0.08);
      const rowH = Math.round(u * 0.28);
      const stepsH = Math.round(u * 0.38);
      const h = 28;
      const top = PAD + titleH + GAP + descH + GAP + rowH + GAP + stepsH + GAP;
      const w = Math.round(pw * 0.42);
      return { cx: PAD + w / 2, cy: top + h / 2, w, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
];

// ─── Recipe Card ──────────────────────────────────────────────────────────────
// Layout: [banner — edge-to-edge] / [description] / [photo | ingredients] /
//         [method] / [tags]
//
// Phase A: description extracted from the banner mega-block into its own block
// between banner and the photo/ingredients row. Banner keeps title + accent
// background; row heights rebalanced to make room.
const cardBannerH = (pw: number) => Math.round(usable(pw) * 0.12);
const cardDescH   = (pw: number) => Math.round(usable(pw) * 0.07);
const cardRowH    = (pw: number) => Math.round(usable(pw) * 0.27);
const cardStepsH  = (pw: number) => Math.round(usable(pw) * 0.37);

const recipeCardBlocks: BlockDef[] = [
  {
    blockId: 'banner',
    label: 'Banner',
    getDefault: (pw) => {
      const h = cardBannerH(pw);
      return { cx: pw / 2, cy: h / 2, w: pw, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: false,
  },
  {
    blockId: 'description',
    label: 'Description',
    getDefault: (pw) => {
      const h = cardDescH(pw);
      const top = cardBannerH(pw) + GAP;
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
      const top = cardBannerH(pw) + GAP + cardDescH(pw) + GAP;
      return { cx: PAD + imgW / 2, cy: top + cardRowH(pw) / 2, w: imgW, h: cardRowH(pw), rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: false,
  },
  {
    blockId: 'ingredients',
    label: 'Ingredients',
    getDefault: (pw) => {
      const imgW = Math.round(pw * 0.42);
      const xStart = PAD + imgW + GAP;
      const w = pw - PAD - xStart;
      const top = cardBannerH(pw) + GAP + cardDescH(pw) + GAP;
      return { cx: xStart + w / 2, cy: top + cardRowH(pw) / 2, w, h: cardRowH(pw), rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
    isTextHeavy: true,
  },
  {
    blockId: 'steps',
    label: 'Method',
    getDefault: (pw) => {
      const h = cardStepsH(pw);
      const top = cardBannerH(pw) + GAP + cardDescH(pw) + GAP + cardRowH(pw) + GAP;
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
      const top = cardBannerH(pw) + GAP + cardDescH(pw) + GAP + cardRowH(pw) + GAP + cardStepsH(pw) + GAP;
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
