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

// Stored as fractions: cx/pageWidth, cy/pageHeight, w/pageWidth, h/pageWidth
export interface BlockOverride extends BlockAbsoluteLayout {
  hidden?: boolean; // soft-delete: block stays in registry but is not rendered
}

export interface BlockDef {
  blockId: string;
  label: string;
  getDefault: (pw: number) => BlockAbsoluteLayout;
  minScale: number;
  maxScale: number;
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
// Layout: [title] / [header (desc+pills)] / [photo | ingredients] / [method] / [tags]
const classicBlocks: BlockDef[] = [
  {
    blockId: 'title',
    label: 'Title',
    getDefault: (pw) => {
      const h = Math.round(usable(pw) * 0.08);
      return { cx: pw / 2, cy: PAD + h / 2, w: pw - PAD * 2, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
  },
  {
    blockId: 'header',
    label: 'Description',
    getDefault: (pw) => {
      const titleH = Math.round(usable(pw) * 0.08);
      const h = Math.round(usable(pw) * 0.09);
      return { cx: pw / 2, cy: PAD + titleH + GAP + h / 2, w: pw - PAD * 2, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
  },
  {
    blockId: 'image',
    label: 'Photo',
    getDefault: (pw) => {
      const titleH = Math.round(usable(pw) * 0.08);
      const descH = Math.round(usable(pw) * 0.09);
      const rowH = Math.round(usable(pw) * 0.29);
      const imgSize = Math.round(pw * 0.34);
      const w = imgSize + 10;
      const cx = PAD + w / 2;
      const cy = PAD + titleH + GAP + descH + GAP + rowH / 2;
      return { cx, cy, w, h: rowH, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
  },
  {
    blockId: 'ingredients',
    label: 'Ingredients',
    getDefault: (pw) => {
      const titleH = Math.round(usable(pw) * 0.08);
      const descH = Math.round(usable(pw) * 0.09);
      const rowH = Math.round(usable(pw) * 0.29);
      const imgSize = Math.round(pw * 0.34);
      const imgBlockW = imgSize + 10;
      const xStart = PAD + imgBlockW + GAP;
      const w = pw - PAD - xStart;
      const cx = xStart + w / 2;
      const cy = PAD + titleH + GAP + descH + GAP + rowH / 2;
      return { cx, cy, w, h: rowH, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
  },
  {
    blockId: 'steps',
    label: 'Method',
    getDefault: (pw) => {
      const u = usable(pw);
      const titleH = Math.round(u * 0.08);
      const descH = Math.round(u * 0.09);
      const rowH = Math.round(u * 0.29);
      const h = Math.round(u * 0.39);
      const top = PAD + titleH + GAP + descH + GAP + rowH + GAP;
      return { cx: pw / 2, cy: top + h / 2, w: pw - PAD * 2, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
  },
  {
    blockId: 'tags',
    label: 'Tags',
    getDefault: (pw) => {
      const u = usable(pw);
      const titleH = Math.round(u * 0.08);
      const descH = Math.round(u * 0.09);
      const rowH = Math.round(u * 0.29);
      const stepsH = Math.round(u * 0.39);
      const h = 28;
      const top = PAD + titleH + GAP + descH + GAP + rowH + GAP + stepsH + GAP;
      const w = Math.round(pw * 0.42);
      return { cx: PAD + w / 2, cy: top + h / 2, w, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
  },
];

// ─── Photo Hero ───────────────────────────────────────────────────────────────
// Layout: [hero — full width] / [ingredients | method] (columns)
const photoHeroBlocks: BlockDef[] = [
  {
    blockId: 'hero',
    label: 'Hero (image + title)',
    getDefault: (pw) => {
      const h = Math.round(usable(pw) * 0.44);
      return { cx: pw / 2, cy: PAD + h / 2, w: pw, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 2,
  },
  {
    blockId: 'ingredients',
    label: 'Ingredients',
    getDefault: (pw) => {
      const heroH = Math.round(usable(pw) * 0.44);
      const top = PAD + heroH + GAP;
      const colW = Math.round((pw - PAD * 2 - GAP) / 2);
      const h = usable(pw) - heroH - GAP;
      return { cx: PAD + colW / 2, cy: top + h / 2, w: colW, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
  },
  {
    blockId: 'method',
    label: 'Method',
    getDefault: (pw) => {
      const heroH = Math.round(usable(pw) * 0.44);
      const top = PAD + heroH + GAP;
      const colW = Math.round((pw - PAD * 2 - GAP) / 2);
      const h = usable(pw) - heroH - GAP;
      const cx = PAD + colW + GAP + colW / 2;
      return { cx, cy: top + h / 2, w: colW, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
  },
];

// ─── Minimal ──────────────────────────────────────────────────────────────────
// Layout: [title] / [header (desc+pills)] / [ingredients] / [method]
const minimalBlocks: BlockDef[] = [
  {
    blockId: 'title',
    label: 'Title',
    getDefault: (pw) => {
      const h = Math.round(usable(pw) * 0.10);
      return { cx: pw / 2, cy: PAD + h / 2, w: pw - PAD * 2, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
  },
  {
    blockId: 'header',
    label: 'Description',
    getDefault: (pw) => {
      const titleH = Math.round(usable(pw) * 0.10);
      const h = Math.round(usable(pw) * 0.10);
      const top = PAD + titleH + GAP;
      return { cx: pw / 2, cy: top + h / 2, w: pw - PAD * 2, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
  },
  {
    blockId: 'ingredients',
    label: 'Ingredients',
    getDefault: (pw) => {
      const titleH = Math.round(usable(pw) * 0.10);
      const descH = Math.round(usable(pw) * 0.10);
      const h = Math.round(usable(pw) * 0.18);
      const top = PAD + titleH + GAP + descH + GAP;
      return { cx: pw / 2, cy: top + h / 2, w: pw - PAD * 2, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
  },
  {
    blockId: 'method',
    label: 'Method',
    getDefault: (pw) => {
      const titleH = Math.round(usable(pw) * 0.10);
      const descH = Math.round(usable(pw) * 0.10);
      const ingH = Math.round(usable(pw) * 0.18);
      const h = usable(pw) - titleH - descH - ingH - GAP * 3;
      const top = PAD + titleH + GAP + descH + GAP + ingH + GAP;
      return { cx: pw / 2, cy: top + h / 2, w: pw - PAD * 2, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
  },
];

// ─── Two Column ───────────────────────────────────────────────────────────────
// Layout: [title — full width] / [left (photo+ingredients) | right (steps)]
const twoColumnBlocks: BlockDef[] = [
  {
    blockId: 'title',
    label: 'Title',
    getDefault: (pw) => {
      const h = Math.round(usable(pw) * 0.08);
      return { cx: pw / 2, cy: PAD + h / 2, w: pw - PAD * 2, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
  },
  {
    blockId: 'left-col',
    label: 'Left (photo + ingredients)',
    getDefault: (pw) => {
      const titleH = Math.round(usable(pw) * 0.08);
      const top = PAD + titleH + GAP;
      const colW = Math.round((pw - PAD * 2 - GAP) / 2);
      const h = usable(pw) - titleH - GAP;
      return { cx: PAD + colW / 2, cy: top + h / 2, w: colW, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
  },
  {
    blockId: 'right-col',
    label: 'Right (method)',
    getDefault: (pw) => {
      const titleH = Math.round(usable(pw) * 0.08);
      const top = PAD + titleH + GAP;
      const colW = Math.round((pw - PAD * 2 - GAP) / 2);
      const h = usable(pw) - titleH - GAP;
      const cx = PAD + colW + GAP + colW / 2;
      return { cx, cy: top + h / 2, w: colW, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
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
  },
];

// ─── Recipe Card ──────────────────────────────────────────────────────────────
// Layout: [banner — edge-to-edge] / [photo | ingredients] / [method] / [tags]
const recipeCardBlocks: BlockDef[] = [
  {
    blockId: 'banner',
    label: 'Banner',
    getDefault: (pw) => {
      const h = Math.round(usable(pw) * 0.12);
      return { cx: pw / 2, cy: h / 2, w: pw, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
  },
  {
    blockId: 'image',
    label: 'Photo',
    getDefault: (pw) => {
      const bannerH = Math.round(usable(pw) * 0.12);
      const rowH = Math.round(usable(pw) * 0.30);
      const imgW = Math.round(pw * 0.42);
      const top = bannerH + GAP;
      return { cx: PAD + imgW / 2, cy: top + rowH / 2, w: imgW, h: rowH, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
  },
  {
    blockId: 'ingredients',
    label: 'Ingredients',
    getDefault: (pw) => {
      const bannerH = Math.round(usable(pw) * 0.12);
      const rowH = Math.round(usable(pw) * 0.30);
      const imgW = Math.round(pw * 0.42);
      const xStart = PAD + imgW + GAP;
      const w = pw - PAD - xStart;
      const top = bannerH + GAP;
      return { cx: xStart + w / 2, cy: top + rowH / 2, w, h: rowH, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
  },
  {
    blockId: 'steps',
    label: 'Method',
    getDefault: (pw) => {
      const u = usable(pw);
      const bannerH = Math.round(u * 0.12);
      const rowH = Math.round(u * 0.30);
      const h = Math.round(u * 0.40);
      const top = bannerH + GAP + rowH + GAP;
      return { cx: pw / 2, cy: top + h / 2, w: pw - PAD * 2, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
  },
  {
    blockId: 'tags',
    label: 'Tags',
    getDefault: (pw) => {
      const u = usable(pw);
      const bannerH = Math.round(u * 0.12);
      const rowH = Math.round(u * 0.30);
      const stepsH = Math.round(u * 0.40);
      const h = 28;
      const top = bannerH + GAP + rowH + GAP + stepsH + GAP;
      const w = Math.round(pw * 0.42);
      return { cx: PAD + w / 2, cy: top + h / 2, w, h, rotation: 0, scale: 1 };
    },
    minScale: 0.4, maxScale: 3,
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
