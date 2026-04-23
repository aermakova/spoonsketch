import { handlePreflight } from '../_shared/cors.ts';
import { jsonError, jsonResponse } from '../_shared/errors.ts';
import { requireUser } from '../_shared/auth.ts';
import {
  checkQuotaAllowed,
  checkRateLimit,
  getQuota,
} from '../_shared/tier.ts';
import { anthropic, HAIKU_MODEL, logAiJob } from '../_shared/ai.ts';

const VALID_STICKER_KEYS = [
  'tomato', 'lemon', 'garlic', 'basil', 'whisk', 'spoon',
  'pan', 'wheat', 'strawberry', 'flower', 'leaf', 'heart',
  'star', 'mushroom', 'bread', 'cherry',
] as const;
type StickerKey = typeof VALID_STICKER_KEYS[number];

const STICKER_AI_GUIDANCE = `
Built-in sticker catalogue and typical matches:
- tomato: tomato, pasta, sauce, pizza, marinara, bruschetta
- lemon: lemon, citrus, lime, curd, sorbet, dressing
- garlic: garlic, aioli, roast, mediterranean, italian
- basil: basil, pesto, italian, caprese, herb
- whisk: cake, baking, eggs, custard, meringue, batter
- spoon: soup, stew, porridge, sauce, risotto
- pan: fry, sauté, stir-fry, pancake, omelette
- wheat: bread, pasta, flour, pizza, baking, grain
- strawberry: strawberry, berry, jam, smoothie, dessert
- flower: floral, lavender, elderflower, rose, chamomile
- leaf: salad, green, herb, vegetarian, vegan, fresh
- heart: favourite, love, family, special, grandma
- star: special, celebration, birthday, christmas, festive
- mushroom: mushroom, umami, risotto, forager, fungi
- bread: bread, sourdough, toast, sandwich, bake
- cherry: cherry, berry, clafoutis, pie, dessert
`;

const AUTO_STICKER_SYSTEM_PROMPT = `You are a scrapbook sticker picker. Given a recipe's title, description, ingredients, and tags, pick 3 to 5 stickers from the exact catalogue below that best decorate the page.

${STICKER_AI_GUIDANCE}

Rules:
- Pick only from that catalogue — never invent sticker names.
- Prefer variety. Don't pick 3 produce stickers for a produce dish; mix in a tool (whisk, spoon, pan) or a mood (heart, star, flower).
- Return JSON only — no prose, no markdown fences — with this exact shape: [{ "sticker_key": "...", "reasoning": "short phrase" }]. Between 3 and 5 entries.`;

const MAX_STICKERS = 5;
const MIN_STICKERS = 3;

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  if (req.method !== 'POST') return jsonError(405, 'method_not_allowed');

  const ctx = await requireUser(req);
  if (ctx instanceof Response) return ctx;

  let body: { recipe_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonError(400, 'bad_request', 'Invalid JSON body');
  }
  const recipeId = typeof body.recipe_id === 'string' ? body.recipe_id : '';
  if (!recipeId) {
    return jsonError(400, 'bad_request', 'recipe_id is required');
  }

  // Rate limit + quota
  const rate = await checkRateLimit(ctx.supabaseAdmin, ctx.userId, 'auto_sticker');
  if (!rate.ok) {
    return jsonError(429, 'rate_limited', 'Too many requests', {
      retry_after_seconds: rate.retryAfterSeconds,
    });
  }
  const quota = await getQuota(ctx.supabaseAdmin, ctx.userId, 'auto_sticker');
  const capped = checkQuotaAllowed(quota);
  if (capped) return jsonError(429, capped.error, undefined, capped);

  // Fetch the recipe server-side (don't trust client-sent content — prevents
  // a free user from crafting a fake payload to burn our Anthropic budget).
  const { data: recipe, error: recipeErr } = await ctx.supabaseAdmin
    .from('recipes')
    .select('id, title, description, ingredients, tags, user_id')
    .eq('id', recipeId)
    .eq('user_id', ctx.userId)
    .maybeSingle();

  if (recipeErr) {
    return jsonError(500, 'db_error', recipeErr.message);
  }
  if (!recipe) {
    return jsonError(404, 'recipe_not_found', 'Recipe not found');
  }

  const prompt = buildRecipeSummary(recipe);
  if (!prompt) {
    return jsonError(422, 'recipe_empty', 'Nothing to match on yet — add a title or ingredients first.');
  }

  let haikuResponse;
  try {
    haikuResponse = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 400,
      temperature: 0.4,
      system: [
        {
          type: 'text',
          text: AUTO_STICKER_SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: prompt }],
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await logAiJob({
      supabaseAdmin: ctx.supabaseAdmin,
      userId: ctx.userId,
      jobType: 'auto_sticker',
      status: 'failed',
      input: { recipe_id: recipeId },
      errorMessage: `haiku_call_failed: ${message}`,
    });
    return jsonError(502, 'ai_unavailable', 'AI service unavailable');
  }

  const textBlock = haikuResponse.content.find((b) => b.type === 'text');
  const rawText = textBlock && 'text' in textBlock ? textBlock.text : '';
  const tokensUsed =
    (haikuResponse.usage?.input_tokens ?? 0) +
    (haikuResponse.usage?.output_tokens ?? 0);

  const picks = parseStickerPicks(rawText);
  if (!picks.length) {
    await logAiJob({
      supabaseAdmin: ctx.supabaseAdmin,
      userId: ctx.userId,
      jobType: 'auto_sticker',
      status: 'failed',
      input: { recipe_id: recipeId },
      output: { raw: rawText.slice(0, 500) },
      tokensUsed,
      errorMessage: 'no_valid_picks',
    });
    return jsonError(502, 'ai_failed', 'AI returned no usable stickers');
  }

  const placed = rollPlacements(picks);

  await logAiJob({
    supabaseAdmin: ctx.supabaseAdmin,
    userId: ctx.userId,
    jobType: 'auto_sticker',
    status: 'done',
    input: { recipe_id: recipeId },
    output: { elements: placed },
    tokensUsed,
  });

  return jsonResponse({ elements: placed });
});

/* ---------------------------- helpers ---------------------------- */

interface RecipeForPrompt {
  title: string | null;
  description: string | null;
  ingredients: Array<{ name?: string }> | unknown;
  tags: string[] | unknown;
}

// Cap lengths before building the Haiku prompt so a pathologically long
// recipe title or description can't blow the input-token budget.
const MAX_TITLE_CHARS = 200;
const MAX_DESCRIPTION_CHARS = 500;
const MAX_INGREDIENT_NAME_CHARS = 80;

function buildRecipeSummary(recipe: RecipeForPrompt): string {
  const bits: string[] = [];
  if (recipe.title) bits.push(`Title: ${recipe.title.slice(0, MAX_TITLE_CHARS)}`);
  if (recipe.description) {
    bits.push(`Description: ${recipe.description.slice(0, MAX_DESCRIPTION_CHARS)}`);
  }
  if (Array.isArray(recipe.ingredients) && recipe.ingredients.length) {
    const names = (recipe.ingredients as Array<{ name?: string }>)
      .map((i) => i.name)
      .filter((n): n is string => !!n)
      .slice(0, 20)
      .map((n) => n.slice(0, MAX_INGREDIENT_NAME_CHARS));
    if (names.length) bits.push(`Ingredients: ${names.join(', ')}`);
  }
  if (Array.isArray(recipe.tags) && recipe.tags.length) {
    const tags = (recipe.tags as string[]).slice(0, 10).map((t) => t.slice(0, 40));
    bits.push(`Tags: ${tags.join(', ')}`);
  }
  return bits.join('\n');
}

interface Pick {
  sticker_key: StickerKey;
  reasoning: string;
}

function parseStickerPicks(raw: string): Pick[] {
  let trimmed = raw.trim();
  if (trimmed.startsWith('```')) {
    trimmed = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  }
  let data: unknown;
  try {
    data = JSON.parse(trimmed);
  } catch {
    const first = trimmed.indexOf('[');
    const last = trimmed.lastIndexOf(']');
    if (first < 0 || last <= first) return [];
    try {
      data = JSON.parse(trimmed.slice(first, last + 1));
    } catch {
      return [];
    }
  }
  if (!Array.isArray(data)) return [];

  const seen = new Set<string>();
  const picks: Pick[] = [];
  for (const entry of data) {
    if (!entry || typeof entry !== 'object') continue;
    const key = (entry as { sticker_key?: unknown }).sticker_key;
    const reasoning = (entry as { reasoning?: unknown }).reasoning;
    if (typeof key !== 'string') continue;
    const normalized = key.toLowerCase().trim();
    if (!(VALID_STICKER_KEYS as readonly string[]).includes(normalized)) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    picks.push({
      sticker_key: normalized as StickerKey,
      reasoning: typeof reasoning === 'string' ? reasoning.slice(0, 80) : '',
    });
    if (picks.length >= MAX_STICKERS) break;
  }
  // Pass through even if the count is below MIN_STICKERS — the outer handler
  // treats an empty result as ai_failed, and <MIN but >0 is better than nothing.
  return picks;
}

interface PlacedSticker {
  sticker_key: StickerKey;
  /** Fraction of canvas width, 0..1 (centre of sticker). */
  x_frac: number;
  /** Fraction of canvas height, 0..1 (centre of sticker). */
  y_frac: number;
  /** Radians. */
  rotation: number;
  /** Uniform scale. */
  scale: number;
  /** Relative z offset from the current max; client adds its own base. */
  z_index_offset: number;
  reasoning: string;
}

// Perimeter zones — we want stickers on the edges, not over the recipe text
// in the middle. Each zone is [xMin, xMax, yMin, yMax] in normalised 0..1.
const SAFE_ZONES: Array<[number, number, number, number]> = [
  [0.05, 0.95, 0.04, 0.18], // top band
  [0.05, 0.95, 0.82, 0.96], // bottom band
  [0.03, 0.18, 0.20, 0.80], // left column
  [0.82, 0.97, 0.20, 0.80], // right column
];

const MIN_SEPARATION = 0.16; // normalised min distance between two stickers

function rollPlacements(picks: Pick[]): PlacedSticker[] {
  const placed: PlacedSticker[] = [];
  picks.forEach((pick, i) => {
    let attempt = 0;
    let spot: { x: number; y: number } | null = null;
    while (attempt < 12) {
      const candidate = randomPointInZone(
        SAFE_ZONES[Math.floor(Math.random() * SAFE_ZONES.length)],
      );
      if (placed.every((p) => dist(candidate, { x: p.x_frac, y: p.y_frac }) >= MIN_SEPARATION)) {
        spot = candidate;
        break;
      }
      attempt++;
    }
    if (!spot) {
      // Fallback: accept a closer spot rather than drop the sticker.
      spot = randomPointInZone(
        SAFE_ZONES[Math.floor(Math.random() * SAFE_ZONES.length)],
      );
    }
    placed.push({
      sticker_key: pick.sticker_key,
      x_frac: spot.x,
      y_frac: spot.y,
      rotation: (Math.random() - 0.5) * 0.52, // ±~15°
      scale: 0.9 + Math.random() * 0.3, // 0.9..1.2
      z_index_offset: i + 1,
      reasoning: pick.reasoning,
    });
  });
  return placed;
}

function randomPointInZone([xMin, xMax, yMin, yMax]: [number, number, number, number]) {
  return {
    x: xMin + Math.random() * (xMax - xMin),
    y: yMin + Math.random() * (yMax - yMin),
  };
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}
