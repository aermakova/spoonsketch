// Phase F — Client export helper.
//
// End-to-end: editor state → RecipePage JSON → HTML → iOS/Android native
// print dialog → user saves as PDF (or prints).
//
// Uses expo-print which is bundled in Expo Go for SDK 54 (no native rebuild).

import * as Print from 'expo-print';
import { Asset } from 'expo-asset';
import type { Recipe } from '../types/recipe';
import type { Cookbook } from '../types/cookbook';
import type { Palette } from './store';
import type { PaletteName } from '../theme/colors';
import { serializeRecipePage } from './recipePage';
import { renderRecipePage } from './renderRecipePage';
import { useCanvasStore } from './canvasStore';
import { useDrawingStore } from './drawingStore';
import { getStickerSource } from './stickerRegistry';

export interface ExportArgs {
  recipe: Recipe;
  cookbook: Cookbook | null;
  palette: Palette;
  paletteName: PaletteName;
  canvasWidth: number;
  canvasHeight: number;
}

// Open the iOS/Android native print dialog with the recipe as HTML. User
// taps the system share sheet from there to save as PDF to Files, email,
// AirDrop, etc.
export async function exportRecipePdf(args: ExportArgs): Promise<void> {
  const html = await buildHtml(args);
  await Print.printAsync({ html });
}

// Alternative: write the PDF directly to a file without opening the share
// dialog. Returns the file URI on disk — caller can then share via
// expo-sharing if needed, or attach to a Lulu order, etc.
export async function exportRecipePdfToFile(args: ExportArgs): Promise<string> {
  const html = await buildHtml(args);
  const { uri } = await Print.printToFileAsync({ html });
  return uri;
}

// Resolve the sticker PNGs the recipe uses into local file:// URIs the print
// WebView can load. Pre-downloads each unique sticker so the resolver can
// stay synchronous when renderRecipePage calls back.
async function resolveStickerUris(kinds: string[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(kinds));
  const entries = await Promise.all(
    unique.map(async kind => {
      const source = getStickerSource(kind);
      if (source == null) return null;
      try {
        const asset = Asset.fromModule(source);
        if (!asset.localUri) await asset.downloadAsync();
        const uri = asset.localUri ?? asset.uri;
        return uri ? ([kind, uri] as const) : null;
      } catch {
        return null;
      }
    }),
  );
  const out: Record<string, string> = {};
  for (const e of entries) {
    if (e) out[e[0]] = e[1];
  }
  return out;
}

async function buildHtml({ recipe, cookbook, palette, paletteName, canvasWidth, canvasHeight }: ExportArgs): Promise<string> {
  // Canvas and drawing state may belong to a different recipe (the editor's
  // "working copy"). Prefer the per-recipe canonical entries keyed by recipe.id.
  // Fall back to defaults when no customisation exists yet.
  const canvas = useCanvasStore.getState();
  const drawing = useDrawingStore.getState();

  const canvasState = canvas.recipeStates[recipe.id];
  const drawingState = drawing.drawings[recipe.id];

  const page = serializeRecipePage({
    recipe,
    cookbook,
    palette,
    paletteName,
    elements: canvasState?.elements ?? [],
    blockOverrides: canvasState?.blockOverrides ?? {},
    stepOverrides: canvasState?.stepOverrides ?? {},
    ingOverrides: canvasState?.ingOverrides ?? {},
    templateKey: canvasState?.templateKey ?? cookbook?.default_template_key ?? 'classic',
    recipeFont: canvasState?.recipeFont ?? cookbook?.default_recipe_font ?? 'caveat',
    drawingLayers: drawingState?.layers ?? [],
    canvasWidth,
    canvasHeight,
  });

  // Pre-resolve sticker PNGs so the render callback is synchronous.
  const stickerUris = await resolveStickerUris(page.stickers.map(s => s.kind));

  // Print output never wants the preview chrome.
  return renderRecipePage(page, {
    previewChrome: false,
    stickerSrc: kind => stickerUris[kind] ?? null,
  });
}
