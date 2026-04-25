import { handlePreflight } from '../_shared/cors.ts';
import { jsonError, jsonResponse } from '../_shared/errors.ts';
import { requireUser } from '../_shared/auth.ts';
import {
  checkQuotaAllowed,
  checkRateLimit,
  getQuota,
} from '../_shared/tier.ts';
import { anthropic, HAIKU_MODEL, logAiJob } from '../_shared/ai.ts';

const MAX_SCRAPE_BYTES = 200_000;
const MAX_SCRAPE_CHARS = 20_000;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;
const USER_AGENT =
  'Mozilla/5.0 (compatible; SpoonsketchBot/1.0; +https://spoonsketch.app)';

const EXTRACTION_SYSTEM_PROMPT = `You are a recipe extraction assistant. The input is either scraped text from a recipe webpage OR an image of a recipe (a screenshot, photo, scanned cookbook page, etc.). Extract exactly this JSON shape and nothing else:

{
  "title": string,
  "description": string | null,
  "servings": number | null,
  "prep_minutes": number | null,
  "cook_minutes": number | null,
  "ingredients": [{ "name": string, "amount": string | null, "unit": string | null, "group": string | null }],
  "instructions": [{ "step": number, "text": string }],
  "tags": string[],
  "confidence": number
}

Rules:
- "tags" is at most 5 short lower-case tokens (e.g. "italian", "vegetarian", "quick").
- "confidence" is between 0 and 1. Lower it when content is ambiguous or incomplete.
- Preserve the original language of the recipe content in title / ingredients / instructions.
- If you cannot find a recipe in the content, return this instead and nothing else: { "partial": true, "reason": "<short reason>" }.
- Output valid JSON only. No prose. No markdown fences.`;

// Bot-mode auth: pulls user_id from the body, validates it exists in
// auth.users, returns an AuthContext shaped like requireUser's. The
// outer handler has already verified the shared secret header.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const botModeAdmin: SupabaseClient | null = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

interface BotAuthContext {
  userId: string;
  jwt: string; // empty for bot mode — kept for type compat with requireUser
  supabaseAdmin: SupabaseClient;
}

async function botContext(req: Request): Promise<BotAuthContext | Response> {
  if (!botModeAdmin) return jsonError(500, 'server_misconfigured', 'Missing Supabase env');
  // We need to read user_id from the body without consuming the stream the
  // main handler will read later. Clone first.
  let body: { user_id?: unknown };
  try {
    body = await req.clone().json();
  } catch {
    return jsonError(400, 'bad_request', 'Invalid JSON body');
  }
  const userId = typeof body.user_id === 'string' ? body.user_id.trim() : '';
  if (!userId) return jsonError(400, 'invalid_input', 'bot mode requires user_id in body');

  // Cheap existence check — confirms the user_id is real before we start
  // racking up Anthropic spend on a bogus id.
  const { data, error } = await botModeAdmin.auth.admin.getUserById(userId);
  if (error || !data?.user) {
    return jsonError(404, 'user_not_found', 'No user with that id');
  }
  return { userId, jwt: '', supabaseAdmin: botModeAdmin };
}

// Restrict accepted image URLs to our own Supabase Storage host, computed from
// SUPABASE_URL (e.g. https://<project-ref>.supabase.co). Stops attackers from
// pointing the Haiku call at arbitrary URLs to inflate our bill or fetch
// internal hosts. Bot uploads land in Storage first, then hand the URL here.
const SUPABASE_HOST = (() => {
  try {
    return new URL(Deno.env.get('SUPABASE_URL') ?? '').host;
  } catch {
    return '';
  }
})();

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  if (req.method !== 'POST') return jsonError(405, 'method_not_allowed');

  // Auth path: regular client calls present a JWT in Authorization. The
  // Telegram bot service (Phase 8.2) instead presents a shared secret
  // header + a `user_id` field in the body, and we trust it to act on that
  // user's behalf. The bot already authenticated the user via the
  // /telegram-auth flow, so re-authing is redundant.
  const botSecret = req.headers.get('X-Spoon-Bot-Secret') ?? '';
  const expectedBotSecret = Deno.env.get('TELEGRAM_BOT_SHARED_SECRET') ?? '';
  const isBotCall = !!expectedBotSecret && botSecret === expectedBotSecret;

  let ctx: Awaited<ReturnType<typeof requireUser>>;
  if (isBotCall) {
    // Bot mode: pull user_id from the body, skip JWT verification.
    // We still need the supabaseAdmin handle for quota / logging.
    ctx = await botContext(req);
    if (ctx instanceof Response) return ctx;
  } else {
    ctx = await requireUser(req);
    if (ctx instanceof Response) return ctx;
  }

  // Parse body. Accepts EITHER `url` (scrape + extract) OR `image_url`
  // (Haiku reads the image directly — no scrape). Mutually exclusive.
  let body: { url?: unknown; image_url?: unknown; locale?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonError(400, 'bad_request', 'Invalid JSON body');
  }
  const rawUrl = typeof body.url === 'string' ? body.url.trim() : '';
  const rawImageUrl = typeof body.image_url === 'string' ? body.image_url.trim() : '';
  const locale = typeof body.locale === 'string' ? body.locale : 'en';

  if (!rawUrl && !rawImageUrl) {
    return jsonError(400, 'invalid_input', 'url or image_url is required');
  }
  if (rawUrl && rawImageUrl) {
    return jsonError(400, 'invalid_input', 'Pass either url or image_url, not both');
  }

  const isImageMode = !!rawImageUrl;
  const jobType = isImageMode ? 'image_extract' as const : 'url_extract' as const;

  // Validate input per-mode
  let validatedTarget: string;
  if (isImageMode) {
    const v = validateImageUrl(rawImageUrl);
    if (!v.ok) return jsonError(400, 'invalid_image_url', v.reason);
    validatedTarget = v.url;
  } else {
    const v = validateUrl(rawUrl);
    if (!v.ok) return jsonError(400, 'invalid_url', v.reason);
    validatedTarget = v.url;
  }

  // Rate limit: single user hammering the endpoint (per job type)
  const rate = await checkRateLimit(ctx.supabaseAdmin, ctx.userId, jobType);
  if (!rate.ok) {
    return jsonError(429, 'rate_limited', 'Too many requests', {
      retry_after_seconds: rate.retryAfterSeconds,
    });
  }

  // Monthly quota (per job type — image_extract has its own counter)
  const quota = await getQuota(ctx.supabaseAdmin, ctx.userId, jobType);
  const capped = checkQuotaAllowed(quota);
  if (capped) return jsonError(429, capped.error, undefined, capped);

  // Build the input the model sees:
  // - URL mode: scrape the page → text payload.
  // - Image mode: skip scrape; emit an image content block referencing the
  //   storage URL. Haiku fetches the bytes itself.
  const inputForLog: Record<string, unknown> = isImageMode
    ? { image_url: rawImageUrl }
    : { url: rawUrl };

  let userMessageContent: string | Array<Record<string, unknown>>;

  if (isImageMode) {
    userMessageContent = [
      {
        type: 'image',
        source: { type: 'url', url: validatedTarget },
      },
      {
        type: 'text',
        text: `Locale: ${locale}\n\nExtract the recipe from this image.`,
      },
    ];
  } else {
    let scraped: string;
    try {
      scraped = await scrapeUrl(validatedTarget);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await logAiJob({
        supabaseAdmin: ctx.supabaseAdmin,
        userId: ctx.userId,
        jobType,
        status: 'failed',
        input: inputForLog,
        errorMessage: `scrape_failed: ${message}`,
      });
      return jsonResponse(
        {
          partial: true,
          reason: 'scrape_failed',
          title: 'Untitled Recipe',
          ingredients: [],
          instructions: [],
        },
        206,
      );
    }

    if (scraped.length < 50) {
      // Empty-ish response (paywalled, JS-only, 404 masquerading as 200, etc.)
      await logAiJob({
        supabaseAdmin: ctx.supabaseAdmin,
        userId: ctx.userId,
        jobType,
        status: 'failed',
        input: inputForLog,
        errorMessage: 'empty_scrape',
      });
      return jsonResponse(
        {
          partial: true,
          reason: 'empty_page',
          title: 'Untitled Recipe',
          ingredients: [],
          instructions: [],
        },
        206,
      );
    }

    userMessageContent = `Locale: ${locale}\nSource URL: ${validatedTarget}\n\nScraped content:\n${scraped}`;
  }

  // Haiku extraction (text or image input — same prompt, same response shape)
  let haikuResponse;
  try {
    haikuResponse = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 1024,
      temperature: 0,
      system: [
        {
          type: 'text',
          text: EXTRACTION_SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: userMessageContent as never,
        },
      ],
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await logAiJob({
      supabaseAdmin: ctx.supabaseAdmin,
      userId: ctx.userId,
      jobType,
      status: 'failed',
      input: inputForLog,
      errorMessage: `haiku_call_failed: ${message}`,
    });
    return jsonError(502, 'ai_unavailable', 'AI service unavailable');
  }

  const textBlock = haikuResponse.content.find((b) => b.type === 'text');
  const rawText = textBlock && 'text' in textBlock ? textBlock.text : '';
  const tokensUsed =
    (haikuResponse.usage?.input_tokens ?? 0) +
    (haikuResponse.usage?.output_tokens ?? 0);

  const parsed = safeJsonParse(rawText);
  if (!parsed) {
    await logAiJob({
      supabaseAdmin: ctx.supabaseAdmin,
      userId: ctx.userId,
      jobType,
      status: 'failed',
      input: inputForLog,
      output: { raw: rawText.slice(0, 500) },
      tokensUsed,
      errorMessage: 'json_parse_failed',
    });
    return jsonResponse(
      {
        partial: true,
        reason: 'extraction_failed',
        title: 'Untitled Recipe',
        ingredients: [],
        instructions: [],
      },
      206,
    );
  }

  // Image mode never has a "source URL" worth storing on the recipe — the
  // image is a one-shot input. URL mode keeps the canonical source link.
  const sourceUrlPatch = isImageMode ? {} : { source_url: validatedTarget };

  // Haiku returned an explicit partial
  if (parsed && typeof parsed === 'object' && (parsed as { partial?: boolean }).partial) {
    await logAiJob({
      supabaseAdmin: ctx.supabaseAdmin,
      userId: ctx.userId,
      jobType,
      status: 'done',
      input: inputForLog,
      output: parsed,
      tokensUsed,
    });
    return jsonResponse(
      {
        partial: true,
        reason:
          (parsed as { reason?: string }).reason ?? 'no_recipe_found',
        title: 'Untitled Recipe',
        ingredients: [],
        instructions: [],
        ...sourceUrlPatch,
      },
      206,
    );
  }

  const recipe = {
    ...(parsed as Record<string, unknown>),
    ...sourceUrlPatch,
  };

  await logAiJob({
    supabaseAdmin: ctx.supabaseAdmin,
    userId: ctx.userId,
    jobType,
    status: 'done',
    input: inputForLog,
    output: recipe,
    tokensUsed,
  });

  return jsonResponse(recipe);
});

/* ---------------------------- helpers ---------------------------- */

interface UrlOk {
  ok: true;
  url: string;
}
interface UrlBad {
  ok: false;
  reason: string;
}

// Image URLs must point at our own Supabase Storage host. Anthropic's Files /
// `image.url` mode happily fetches arbitrary HTTPS, but we don't want to be
// the proxy for someone using their bot quota to scrape the internet — and
// we want a place to enforce per-bucket access policy later.
function validateImageUrl(raw: string): UrlOk | UrlBad {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, reason: 'image_url is malformed' };
  }
  if (parsed.protocol !== 'https:') {
    return { ok: false, reason: 'image_url must be https' };
  }
  if (!SUPABASE_HOST) {
    // Server config issue; fail closed.
    return { ok: false, reason: 'server cannot validate image hosts' };
  }
  if (parsed.host !== SUPABASE_HOST) {
    return { ok: false, reason: 'image_url must be on this project’s Supabase Storage' };
  }
  return { ok: true, url: parsed.toString() };
}

function validateUrl(raw: string): UrlOk | UrlBad {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, reason: 'URL is malformed' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, reason: 'Only http(s) URLs are supported' };
  }
  if (parsed.port && parsed.port !== '80' && parsed.port !== '443') {
    return { ok: false, reason: 'Non-standard ports are not allowed' };
  }
  if (isPrivateHost(parsed.hostname)) {
    return { ok: false, reason: 'Private or local hosts are not allowed' };
  }

  return { ok: true, url: parsed.toString() };
}

function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost')) return true;
  if (h.endsWith('.local')) return true;

  // IPv6 literal checks — only trigger when the hostname is actually an IPv6
  // literal (has a colon or is wrapped in brackets). Without this guard a
  // hostname like `fc-support.com` would match `h.startsWith('fc')` and get
  // wrongly blocked.
  const isIPv6Literal = h.includes(':') || (h.startsWith('[') && h.endsWith(']'));
  if (isIPv6Literal) {
    // Strip brackets if present, for substring matching.
    const v6 = h.replace(/^\[|\]$/g, '');
    if (v6 === '::1') return true;                     // loopback
    if (v6.startsWith('fc') || v6.startsWith('fd')) return true; // unique local
    if (v6.startsWith('fe80:')) return true;           // link-local
    if (v6.startsWith('::ffff:')) {                     // IPv4-mapped — recurse on the v4 part
      const mapped = v6.slice('::ffff:'.length);
      return isPrivateHost(mapped);
    }
    return false;
  }

  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (!ipv4) return false;
  const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 0) return true;
  return false;
}

async function scrapeUrl(url: string): Promise<string> {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(current, {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
    } finally {
      clearTimeout(timer);
    }

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (!loc) throw new Error(`redirect with no location (${res.status})`);
      const next = new URL(loc, current).toString();
      const v = validateUrl(next);
      if (!v.ok) throw new Error(`redirect to invalid host: ${v.reason}`);
      current = v.url;
      continue;
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    // Read up to MAX_SCRAPE_BYTES
    const reader = res.body?.getReader();
    if (!reader) throw new Error('no body');
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (total < MAX_SCRAPE_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.length;
    }
    try {
      await reader.cancel();
    } catch { /* noop */ }

    const merged = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) {
      merged.set(c.subarray(0, Math.min(c.length, MAX_SCRAPE_BYTES - off)), off);
      off += c.length;
      if (off >= MAX_SCRAPE_BYTES) break;
    }
    const html = new TextDecoder('utf-8', { fatal: false }).decode(merged);
    return htmlToText(html);
  }
  throw new Error('too many redirects');
}

function htmlToText(html: string): string {
  // Rough, good-enough pass for Haiku consumption. Not a real HTML parser.
  let s = html;
  // Prefer <article> or <main> content when present; otherwise strip body.
  const article = matchBlock(s, 'article') ?? matchBlock(s, 'main');
  if (article) s = article;

  // Drop non-content regions
  s = s
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
    .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, ' ')
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, ' ');

  // Strip remaining tags
  s = s.replace(/<[^>]+>/g, ' ');

  // Decode a handful of common entities. Leave the rest to Haiku.
  s = s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  s = s.replace(/\s+/g, ' ').trim();
  if (s.length > MAX_SCRAPE_CHARS) s = s.slice(0, MAX_SCRAPE_CHARS);
  return s;
}

function matchBlock(html: string, tag: string): string | null {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = re.exec(html);
  return m ? m[1] : null;
}

function safeJsonParse(raw: string): unknown | null {
  if (!raw) return null;
  let trimmed = raw.trim();
  // Tolerate accidental markdown fences even though we asked for none.
  if (trimmed.startsWith('```')) {
    trimmed = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    // Haiku sometimes returns a leading/trailing sentence around JSON.
    const first = trimmed.indexOf('{');
    const last = trimmed.lastIndexOf('}');
    if (first >= 0 && last > first) {
      try {
        return JSON.parse(trimmed.slice(first, last + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}
