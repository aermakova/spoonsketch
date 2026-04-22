export interface ExtractedIngredient {
  name: string;
  amount: string | null;
  unit: string | null;
  group: string | null;
}

export interface ExtractedInstruction {
  step: number;
  text: string;
}

export interface ExtractedRecipe {
  title: string;
  description: string | null;
  servings: number | null;
  prep_minutes: number | null;
  cook_minutes: number | null;
  ingredients: ExtractedIngredient[];
  instructions: ExtractedInstruction[];
  tags: string[];
  confidence: number | null;
  source_url: string;
  /** True when the extractor could not produce a full recipe. */
  partial?: boolean;
  /** Short machine-readable reason when partial === true. */
  reason?: string;
}

export type ExtractErrorCode =
  | 'invalid_url'
  | 'monthly_limit_reached'
  | 'rate_limited'
  | 'ai_unavailable'
  | 'network'
  | 'unknown';

export type AutoStickerErrorCode =
  | 'monthly_limit_reached'
  | 'rate_limited'
  | 'ai_unavailable'
  | 'ai_failed'
  | 'recipe_empty'
  | 'recipe_not_found'
  | 'network'
  | 'unknown';

/**
 * Placement returned by the auto-sticker Edge Function. Coordinates are
 * normalised (0..1) relative to canvas width/height so the client can apply
 * them regardless of the actual canvas size.
 */
export interface AutoStickerElement {
  sticker_key: string;
  x_frac: number;
  y_frac: number;
  rotation: number;
  scale: number;
  z_index_offset: number;
  reasoning: string;
}

export interface AutoStickerResponse {
  elements: AutoStickerElement[];
}
