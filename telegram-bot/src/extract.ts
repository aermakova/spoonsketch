// Wrapper around the extract-recipe Edge Function.
//
// We authenticate via the X-Spoon-Bot-Secret header + a `user_id` field in
// the body. The Edge Function checks the secret, then trusts the user_id
// (the bot already verified it via the /telegram-auth flow). This keeps
// the Haiku prompt + quota counters server-authoritative — no duplication
// of extraction logic in the bot.

import { config } from './config.js';

export interface ExtractedRecipe {
  title: string;
  description: string | null;
  servings: number | null;
  prep_minutes: number | null;
  cook_minutes: number | null;
  ingredients: Array<{ name: string; amount: string | null; unit: string | null; group: string | null }>;
  instructions: Array<{ step: number; text: string }>;
  tags: string[];
  confidence?: number;
  source_url?: string | null;
  partial?: boolean;
  reason?: string;
}

interface ExtractInput {
  userId: string;
  url?: string;
  imageUrl?: string;
}

export type ExtractResult =
  | { ok: true; recipe: ExtractedRecipe }
  | { ok: false; errorCode: string; message?: string; status: number };

export async function callExtractRecipe(input: ExtractInput): Promise<ExtractResult> {
  const body: Record<string, unknown> = { user_id: input.userId };
  if (input.url) body.url = input.url;
  if (input.imageUrl) body.image_url = input.imageUrl;

  // Function is deployed with verify_jwt=false (the gateway's JWT check is
  // skipped); auth is via X-Spoon-Bot-Secret + body user_id, enforced inside
  // the Edge Function code.
  const res = await fetch(config.extractRecipeFunctionUrl, {
    method: 'POST',
    headers: {
      'X-Spoon-Bot-Secret': config.botSharedSecret,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json().catch(() => null)) as
    | ExtractedRecipe
    | { error?: string; message?: string }
    | null;

  if (!res.ok || !json) {
    const e = (json ?? {}) as { error?: string; message?: string };
    return {
      ok: false,
      errorCode: e.error ?? `http_${res.status}`,
      message: e.message,
      status: res.status,
    };
  }

  return { ok: true, recipe: json as ExtractedRecipe };
}
