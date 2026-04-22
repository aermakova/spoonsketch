import { supabase } from './client';
import { ApiError } from './auth';
import type {
  AutoStickerErrorCode,
  AutoStickerResponse,
  ExtractedRecipe,
  ExtractErrorCode,
} from '../types/ai';

interface EdgeErrorBody {
  error?: string;
  message?: string;
  used?: number;
  limit?: number;
  reset_at?: string;
  retry_after_seconds?: number;
}

export class AiError extends ApiError {
  constructor(
    message: string,
    public readonly errorCode: ExtractErrorCode | AutoStickerErrorCode,
    public readonly details?: EdgeErrorBody,
  ) {
    super(message, errorCode);
    this.name = 'AiError';
  }
}

export async function extractRecipeFromUrl(
  url: string,
  locale = 'en',
): Promise<ExtractedRecipe> {
  const { data, error } = await supabase.functions.invoke<
    ExtractedRecipe | EdgeErrorBody
  >('extract-recipe', {
    body: { url, locale },
  });

  if (error) {
    // functions.invoke surfaces non-2xx responses as FunctionsHttpError.
    // The response body is on `error.context` on recent SDK versions.
    const body = await readEdgeErrorBody(error);
    throw mapEdgeError(body);
  }

  if (!data) {
    throw new AiError('Empty response from extract-recipe', 'unknown');
  }

  return data as ExtractedRecipe;
}

async function readEdgeErrorBody(err: unknown): Promise<EdgeErrorBody> {
  try {
    const maybeCtx = (err as { context?: { json?: () => Promise<unknown> } })
      ?.context;
    if (maybeCtx?.json) {
      const parsed = await maybeCtx.json();
      if (parsed && typeof parsed === 'object') return parsed as EdgeErrorBody;
    }
  } catch {
    /* noop */
  }
  return {};
}

function mapEdgeError(body: EdgeErrorBody): AiError {
  const code = body.error ?? '';
  switch (code) {
    case 'invalid_url':
      return new AiError(body.message ?? 'That doesn’t look like a recipe URL.', 'invalid_url', body);
    case 'monthly_limit_reached':
      return new AiError(
        body.message ?? 'You’ve used all your imports this month.',
        'monthly_limit_reached',
        body,
      );
    case 'rate_limited':
      return new AiError(body.message ?? 'Too many requests.', 'rate_limited', body);
    case 'ai_unavailable':
      return new AiError(body.message ?? 'AI service unavailable.', 'ai_unavailable', body);
    case 'ai_failed':
      return new AiError(body.message ?? 'AI couldn’t pick any stickers.', 'ai_failed', body);
    case 'recipe_empty':
      return new AiError(
        body.message ?? 'Add a title or ingredients first.',
        'recipe_empty',
        body,
      );
    case 'recipe_not_found':
      return new AiError(body.message ?? 'Recipe not found.', 'recipe_not_found', body);
    default:
      return new AiError(body.message ?? 'Something went wrong.', 'unknown', body);
  }
}

export async function autoSticker(
  recipeId: string,
): Promise<AutoStickerResponse> {
  const { data, error } = await supabase.functions.invoke<
    AutoStickerResponse | EdgeErrorBody
  >('auto-sticker', {
    body: { recipe_id: recipeId },
  });

  if (error) {
    const body = await readEdgeErrorBody(error);
    throw mapEdgeError(body);
  }
  if (!data || !('elements' in data) || !Array.isArray((data as AutoStickerResponse).elements)) {
    throw new AiError('Empty response from auto-sticker', 'unknown');
  }
  return data as AutoStickerResponse;
}
