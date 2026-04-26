// Image moderation gate. Called by every uploader (in-app Photo tab,
// Telegram bot photo handler) AFTER `storage.upload` but BEFORE any
// signed URL is consumed downstream. Fails CLOSED — if the scan
// fails or returns anything other than 'safe', the storage object is
// deleted and the caller gets an error response.
//
// Required by Apple App Store Review Guideline 1.2 (UGC moderation
// must filter objectionable material) and 18 U.S.C. § 2258A (NCMEC
// reporting obligation if CSAM is discovered — flagged rows in
// `moderation_events` are the queue we'd review for that).
//
// Detection backend: Claude Haiku 4.5 vision. Not a specialized CSAM
// detector — Microsoft PhotoDNA or Thorn Safer would be the
// gold-standard upgrade — but satisfies "a method" for the small-app
// bar at launch.
//
// Auth model:
// - Bot mode: `X-Spoon-Bot-Secret` header (no JWT). user_id from body.
// - App mode: standard JWT via `requireUser`.
// Bot path is required because the bot service uploads via service
// role and there's no user JWT available.
//
// Wire path:
//   client.upload(bytes) → moderate-image({ bucket, path }) →
//     verdict='safe'    → caller proceeds (createSignedUrl, etc.)
//     verdict='rejected' / 'error' → object deleted, caller bails

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { handlePreflight } from '../_shared/cors.ts';
import { jsonError, jsonResponse } from '../_shared/errors.ts';
import { requireUser } from '../_shared/auth.ts';
import { anthropic, HAIKU_MODEL } from '../_shared/ai.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const supabaseAdmin: SupabaseClient | null =
  SUPABASE_URL && SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

const SCAN_TIMEOUT_MS = 15_000;
const MAX_BYTES = 5 * 1024 * 1024;

const MODERATION_SYSTEM_PROMPT = `You are an image safety classifier for a recipe / cookbook app. Look at the image and decide if it's safe to keep.

Return JSON only:
{ "verdict": "safe" | "rejected", "category": "safe" | "explicit" | "violent" | "csam_suspect" | "non_food" | "unclear", "confidence": 0.0-1.0 }

Rules:
- "safe": food, cookware, plates, ingredients, kitchen scenes, handwritten recipes, recipe screenshots from websites or cookbooks, restaurant photos. People can appear if they're cooking / eating in a non-explicit way.
- "rejected" + category="explicit": nudity, sexual content, suggestive content.
- "rejected" + category="violent": graphic violence, gore, weapons aimed at people.
- "rejected" + category="csam_suspect": ANY image that includes a minor in any context that could be sexualized OR exploitative. Err strongly on the side of rejecting if you have any doubt about a child's safety.
- "rejected" + category="non_food": images that are clearly not recipe-related (memes, screenshots of social media, random landscapes). This is a soft reject — the user may have uploaded something unrelated by accident.
- "unclear": you can't tell what the image is (corrupted, abstract, dark). Treat as rejected.

Output ONLY valid JSON. No prose. No markdown fences.`;

interface ModerationResult {
  verdict: 'safe' | 'rejected';
  category: 'safe' | 'explicit' | 'violent' | 'csam_suspect' | 'non_food' | 'unclear';
  confidence: number;
}

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  if (req.method !== 'POST') return jsonError(405, 'method_not_allowed');

  if (!supabaseAdmin) {
    return jsonError(500, 'server_misconfigured', 'Missing Supabase env');
  }

  // Auth path: bot mode (shared secret) OR JWT mode.
  const botSecret = req.headers.get('X-Spoon-Bot-Secret') ?? '';
  const expectedBotSecret = Deno.env.get('TELEGRAM_BOT_SHARED_SECRET') ?? '';
  const isBotCall = !!expectedBotSecret && botSecret === expectedBotSecret;

  // Parse body once (we'll use it for user_id in bot mode + bucket/path always).
  let body: { user_id?: unknown; bucket?: unknown; path?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonError(400, 'bad_request', 'Invalid JSON body');
  }
  const bucket = typeof body.bucket === 'string' ? body.bucket.trim() : '';
  const path = typeof body.path === 'string' ? body.path.trim() : '';
  if (!bucket || !path) {
    return jsonError(400, 'invalid_input', 'bucket and path are required');
  }

  let userId: string;
  if (isBotCall) {
    const bodyUserId = typeof body.user_id === 'string' ? body.user_id.trim() : '';
    if (!bodyUserId) {
      return jsonError(400, 'invalid_input', 'bot mode requires user_id in body');
    }
    userId = bodyUserId;
  } else {
    const ctx = await requireUser(req);
    if (ctx instanceof Response) return ctx;
    userId = ctx.userId;
  }

  // Path-ownership check: storage path must start with `<userId>/`.
  // Belt-and-suspenders alongside RLS on the bucket itself.
  const firstSegment = path.split('/')[0] ?? '';
  if (firstSegment !== userId) {
    return jsonError(403, 'forbidden', 'path does not match user folder');
  }

  // Download the bytes.
  const { data: blob, error: downloadErr } = await supabaseAdmin.storage
    .from(bucket)
    .download(path);
  if (downloadErr || !blob) {
    return jsonError(404, 'not_found', `storage object not found: ${path}`);
  }
  const arrayBuffer = await blob.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_BYTES) {
    // Already capped at 5MB upstream, but defense-in-depth.
    await supabaseAdmin.storage.from(bucket).remove([path]).catch(() => {});
    await logEvent(supabaseAdmin, userId, bucket, path, 'rejected', 'too_large', null, null);
    return jsonError(413, 'too_large', 'image exceeds 5MB cap');
  }

  // Convert to base64 for Anthropic vision API.
  const base64 = arrayBufferToBase64(arrayBuffer);
  const mediaType = blob.type || 'image/jpeg';

  // Run the scan with a timeout. Fail closed.
  let result: ModerationResult | null = null;
  let modelResponse = '';
  let tokensUsed = 0;
  let scanError: string | null = null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), SCAN_TIMEOUT_MS);
    try {
      const haikuResponse = await anthropic.messages.create({
        model: HAIKU_MODEL,
        max_tokens: 200,
        temperature: 0,
        system: [{ type: 'text', text: MODERATION_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
              { type: 'text', text: 'Classify this image.' },
            ] as never,
          },
        ],
      }, { signal: ctrl.signal });

      const textBlock = haikuResponse.content.find((b) => b.type === 'text');
      modelResponse = textBlock && 'text' in textBlock ? textBlock.text : '';
      tokensUsed =
        (haikuResponse.usage?.input_tokens ?? 0) +
        (haikuResponse.usage?.output_tokens ?? 0);
      result = safeParseModerationResult(modelResponse);
      if (!result) scanError = 'parse_failed';
    } finally {
      clearTimeout(timer);
    }
  } catch (e) {
    scanError = e instanceof Error ? e.message : String(e);
  }

  // Fail closed: any error (timeout, network, parse, abort) → reject + delete.
  if (!result || scanError) {
    await supabaseAdmin.storage.from(bucket).remove([path]).catch(() => {});
    await logEvent(
      supabaseAdmin,
      userId,
      bucket,
      path,
      'error',
      'scan_failed',
      modelResponse.slice(0, 1024) || scanError,
      tokensUsed,
    );
    return jsonError(503, 'scan_failed', 'Could not verify image. Please try again.');
  }

  if (result.verdict === 'rejected') {
    await supabaseAdmin.storage.from(bucket).remove([path]).catch(() => {});
    await logEvent(
      supabaseAdmin,
      userId,
      bucket,
      path,
      'rejected',
      result.category,
      modelResponse.slice(0, 1024),
      tokensUsed,
    );
    return jsonError(
      422,
      'image_rejected',
      messageForCategory(result.category),
      { category: result.category },
    );
  }

  // verdict === 'safe' — keep the file, log the pass.
  await logEvent(
    supabaseAdmin,
    userId,
    bucket,
    path,
    'safe',
    'safe',
    modelResponse.slice(0, 1024),
    tokensUsed,
  );
  return jsonResponse({ ok: true });
});

/* ------------------------- helpers ------------------------- */

async function logEvent(
  admin: SupabaseClient,
  userId: string,
  bucket: string,
  path: string,
  verdict: 'safe' | 'rejected' | 'error',
  reason: string,
  modelResponse: string | null,
  tokensUsed: number | null,
): Promise<void> {
  const { error } = await admin.from('moderation_events').insert({
    user_id: userId,
    bucket,
    storage_path: path,
    verdict,
    reason,
    model_response: modelResponse,
    tokens_used: tokensUsed,
  });
  if (error) console.error('[moderate-image] logEvent failed', error);
}

function safeParseModerationResult(raw: string): ModerationResult | null {
  if (!raw) return null;
  let trimmed = raw.trim();
  if (trimmed.startsWith('```')) {
    trimmed = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    const first = trimmed.indexOf('{');
    const last = trimmed.lastIndexOf('}');
    if (first >= 0 && last > first) {
      try { parsed = JSON.parse(trimmed.slice(first, last + 1)); } catch { return null; }
    } else {
      return null;
    }
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;
  const verdict = obj.verdict;
  const category = obj.category;
  if (verdict !== 'safe' && verdict !== 'rejected') return null;
  if (typeof category !== 'string') return null;
  const validCats = ['safe', 'explicit', 'violent', 'csam_suspect', 'non_food', 'unclear'];
  if (!validCats.includes(category)) return null;
  return {
    verdict,
    category: category as ModerationResult['category'],
    confidence: typeof obj.confidence === 'number' ? obj.confidence : 0.5,
  };
}

function messageForCategory(category: ModerationResult['category']): string {
  switch (category) {
    case 'explicit':
    case 'violent':
    case 'csam_suspect':
      return "That image can't be uploaded. Please pick a different photo.";
    case 'non_food':
      return "This doesn't look like a recipe. Try a different photo.";
    case 'unclear':
      return "We couldn't read that image clearly. Try a different photo.";
    default:
      return "That image can't be uploaded.";
  }
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  // Chunk to avoid call-stack issues on large arrays.
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}
