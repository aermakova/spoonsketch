// RecipePage — canonical JSON description of a rendered recipe page.
//
// Phase F foundation. Both renderers (RN/Skia for the editor, HTML/CSS for
// print) consume this shape so text/pattern/stroke/sticker positions can't
// drift between screen and paper. Editor mutates the underlying canvas state
// (Zustand stores); on export/preview we serialize to a RecipePage via
// `serializeRecipePage` below.
//
// All positional fields are stored as fractions of page dimensions so the
// renderer can scale to any physical size (A4 for Lulu print, screen for the
// editor preview, Letter if we ever ship to US print-on-demand).

import type { Recipe } from '../types/recipe';
import type { DrawingLayer, BlendMode } from '../types/drawing';
import type {
  CanvasEl,
  TemplateKey,
  FontPresetKey,
  StepOverride,
  IngOverride,
} from './canvasStore';
import type { BlockOverride } from './blockDefs';
import type { Cookbook, CookbookPaperType, CookbookSectionTitles } from '../types/cookbook';
import { DEFAULT_SECTION_TITLES } from '../types/cookbook';
import type { Palette } from './store';
import type { PaletteName } from '../theme/colors';
import { colors } from '../theme/colors';

export const RECIPE_PAGE_VERSION = 1 as const;
export const A4_ASPECT_RATIO = 1.4142135; // 297/210

export interface RecipePageStyle {
  template: TemplateKey;
  font: FontPresetKey;
  // Resolved colours so the renderer doesn't need the theme store.
  paletteName: PaletteName;
  paletteAccent: string;
  paletteBg: string;
  paletteBg2: string;       // softer surface — used for pill backgrounds in PDF
  palettePaper: string;
  paletteInk: string;      // from theme/colors — not the palette variant
  paletteInkSoft: string;
  paletteInkFaint: string;
  paperType: CookbookPaperType;
  sectionTitles: CookbookSectionTitles;
}

export interface RecipePageContent {
  title: string;
  description: string | null;
  prepMinutes: number | null;
  cookMinutes: number | null;
  servings: number | null;
  coverImageUrl: string | null;
  // Post-override, visible-only. Order preserved.
  ingredients: Array<{ id: string; text: string; group: string | null }>;
  instructions: Array<{ step: number; text: string; tip: string | null }>;
  tags: string[];
}

export type RecipePageBlocks = Record<string, BlockOverride>;

export interface RecipePageSticker {
  id: string;
  kind: string;     // sticker key — renderer looks up the SVG
  cx: number;       // fraction of pageWidth
  cy: number;       // fraction of pageHeight
  rotation: number; // radians
  scale: number;
  zIndex: number;
}

export interface RecipePageStrokePoint {
  x: number; // fraction of pageWidth
  y: number; // fraction of pageHeight
  pressure: number;
}

export interface RecipePageStroke {
  id: string;
  color: string;
  // Fraction of pageWidth so stroke thickness scales with page size.
  widthFrac: number;
  opacity: number;
  isEraser: boolean;
  points: RecipePageStrokePoint[];
}

export interface RecipePageDrawingLayer {
  id: string;
  name: string;
  zIndex: number;
  visible: boolean;
  opacity: number;
  blendMode: BlendMode;
  strokes: RecipePageStroke[];
}

export interface RecipePage {
  version: typeof RECIPE_PAGE_VERSION;
  recipeId: string;
  style: RecipePageStyle;
  content: RecipePageContent;
  // Layout overrides keyed by blockId. Shape matches canvasStore's blockOverrides
  // (fractions of pageWidth for cx/w/h, fraction of pageHeight for cy).
  blocks: RecipePageBlocks;
  stickers: RecipePageSticker[];
  drawingLayers: RecipePageDrawingLayer[];
  // A4 by default; renderer may reflow for other page sizes but fractions hold.
  pageAspectRatio: number;
}

// ─── Serializer ───────────────────────────────────────────────────────────

export interface SerializeInput {
  recipe: Recipe;
  cookbook: Cookbook | null;
  palette: Palette;
  paletteName: PaletteName;
  // Canvas state (flat, not the whole store object — lets callers snapshot).
  elements: CanvasEl[];
  blockOverrides: Record<string, BlockOverride>;
  stepOverrides: Record<number, StepOverride>;
  ingOverrides: Record<string, IngOverride>;
  templateKey: TemplateKey;
  recipeFont: FontPresetKey;
  // Drawing state.
  drawingLayers: DrawingLayer[];
  // Authoring canvas size — used to convert absolute-pixel sticker/stroke
  // coordinates into page-width fractions.
  canvasWidth: number;
  canvasHeight: number;
}

export function serializeRecipePage(input: SerializeInput): RecipePage {
  const {
    recipe, cookbook, palette, paletteName,
    elements, blockOverrides, stepOverrides, ingOverrides,
    templateKey, recipeFont,
    drawingLayers,
    canvasWidth, canvasHeight,
  } = input;

  const sectionTitles = cookbook?.section_titles ?? DEFAULT_SECTION_TITLES;

  const visibleIngredients = recipe.ingredients
    .filter(i => !ingOverrides[i.id]?.hidden)
    .map(i => ({
      id: i.id,
      group: i.group,
      text: ingOverrides[i.id]?.text ?? [i.amount, i.unit, i.name].filter(Boolean).join(' '),
    }));

  const visibleInstructions = recipe.instructions
    .filter(s => !stepOverrides[s.step]?.hidden)
    .map(s => ({
      step: s.step,
      tip: s.tip,
      text: stepOverrides[s.step]?.text ?? s.text,
    }));

  const style: RecipePageStyle = {
    template: templateKey,
    font: recipeFont,
    paletteName,
    paletteAccent: palette.accent,
    paletteBg: palette.bg,
    paletteBg2: palette.bg2,
    palettePaper: palette.paper,
    paletteInk: colors.ink,
    paletteInkSoft: colors.inkSoft,
    paletteInkFaint: colors.inkFaint,
    paperType: cookbook?.paper_type ?? 'blank',
    sectionTitles,
  };

  const content: RecipePageContent = {
    title: recipe.title,
    description: recipe.description,
    prepMinutes: recipe.prep_minutes,
    cookMinutes: recipe.cook_minutes,
    servings: recipe.servings,
    coverImageUrl: recipe.cover_image_url,
    ingredients: visibleIngredients,
    instructions: visibleInstructions,
    tags: recipe.tags,
  };

  // blockOverrides already store fractions by canvasStore convention — pass through.
  const blocks: RecipePageBlocks = { ...blockOverrides };

  // Stickers: CanvasEl.x / .y are absolute pixels on the authoring canvas.
  // Normalize to fractions so the renderer can place them on any page size.
  const stickers: RecipePageSticker[] = elements.map(el => ({
    id: el.id,
    kind: el.stickerKey,
    cx: el.x / canvasWidth,
    cy: el.y / canvasHeight,
    rotation: el.rotation,
    scale: el.scale,
    zIndex: el.zIndex,
  }));

  // Drawing strokes: same normalization. Width becomes a fraction of page
  // width so the stroke looks proportional regardless of render size.
  const serializedLayers: RecipePageDrawingLayer[] = drawingLayers
    .slice()
    .sort((a, b) => a.zIndex - b.zIndex)
    .map(layer => ({
      id: layer.id,
      name: layer.name,
      zIndex: layer.zIndex,
      visible: layer.visible,
      opacity: layer.opacity,
      blendMode: layer.blendMode,
      strokes: layer.strokes.map(stroke => ({
        id: stroke.id,
        color: stroke.color,
        widthFrac: stroke.width / canvasWidth,
        opacity: stroke.opacity,
        isEraser: stroke.isEraser ?? false,
        points: stroke.points.map(p => ({
          x: p.x / canvasWidth,
          y: p.y / canvasHeight,
          pressure: p.pressure,
        })),
      })),
    }));

  return {
    version: RECIPE_PAGE_VERSION,
    recipeId: recipe.id,
    style,
    content,
    blocks,
    stickers,
    drawingLayers: serializedLayers,
    pageAspectRatio: A4_ASPECT_RATIO,
  };
}

// ─── Deserialization helpers ──────────────────────────────────────────────
// When a renderer knows the physical page width it wants to render at
// (e.g. 2480px for A4 at 300dpi), these convert fractions back to pixels.

export function resolveStickerPosition(
  sticker: RecipePageSticker,
  pageWidthPx: number,
  pageHeightPx: number,
): { x: number; y: number } {
  return { x: sticker.cx * pageWidthPx, y: sticker.cy * pageHeightPx };
}

export function resolveStrokeWidth(
  stroke: RecipePageStroke,
  pageWidthPx: number,
): number {
  return stroke.widthFrac * pageWidthPx;
}

export function resolveStrokePoint(
  pt: RecipePageStrokePoint,
  pageWidthPx: number,
  pageHeightPx: number,
): { x: number; y: number; pressure: number } {
  return { x: pt.x * pageWidthPx, y: pt.y * pageHeightPx, pressure: pt.pressure };
}
