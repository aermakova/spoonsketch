# Spoon & Sketch — Backend & API Plan

> Senior backend architect reference. Optimised for a mobile-first app on Supabase.
> Read alongside PLAN.md (full schema) and ARCHITECTURE.md (client side).

---

## Stack decision

| Concern | Choice | Reason |
|---|---|---|
| Database | Supabase PostgreSQL | RLS handles multi-tenant isolation. No custom auth server. |
| Auth | Supabase Auth | Magic link + Apple + Google. JWT auto-refresh. PKCE flow for mobile. |
| File storage | Supabase Storage | CDN-backed. Signed URLs. Same SDK as DB. |
| Realtime | Supabase Realtime | Pushes DB changes to client. Used for recipe import + print status. |
| Serverless functions | Supabase Edge Functions (Deno) | Co-located with DB. Low latency. No cold start penalty on Supabase Pro. |
| AI jobs | BullMQ + Redis (Upstash) | Async queue. Haiku calls never block the mobile UI. |
| Telegram bot | Telegraf.js on Railway | Always-on Node.js. Receives webhooks, pushes jobs to queue. |
| Push notifications | Expo Push Notification Service | Free. Handles APNs + FCM in one API call. |
| Payments | RevenueCat webhooks → Supabase | Single source of truth for subscription state. |
| Admin | Supabase Studio + custom Retool dashboard | Zero-build admin for v1. |

**Principle:** No custom API server. Every endpoint is a Supabase Edge Function or a Supabase PostgREST auto-generated REST call. The Telegram bot is the only always-on service.

---

## 1. Database Entities & Relationships

### Entity map

```
users
  ├── cookbooks (1:many)
  │     ├── recipes (1:many)
  │     │     ├── recipe_canvases (1:1)
  │     │     │     ├── canvas_elements (1:many)
  │     │     │     └── drawing_layers (1:many)
  │     │     │           └── drawing_strokes (1:many)
  │     │     └── book_pages (recipe pages reference recipe)
  │     └── book_pages (1:many — cover, dedication, etc.)
  ├── user_images (1:many)
  ├── pdf_exports (1:many)
  ├── print_orders (1:many)
  ├── telegram_connections (1:1)
  ├── telegram_jobs (1:many)
  └── ai_jobs (1:many)
```

### Full schema (production-ready)

```sql
-- ================================================================
-- EXTENSIONS
-- ================================================================
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";   -- fast text search on recipe titles

-- ================================================================
-- USERS
-- ================================================================
create table public.users (
  id               uuid primary key references auth.users(id) on delete cascade,
  email            text unique not null,
  username         text unique,
  avatar_url       text,
  tier             text not null default 'free'
                     check (tier in ('free', 'premium')),
  palette          text not null default 'terracotta'
                     check (palette in ('terracotta','sage','blush','cobalt')),
  paper_texture    text not null default 'medium'
                     check (paper_texture in ('low','medium','high')),
  language         text not null default 'en'
                     check (language in ('en','uk')),
  push_token       text,                     -- Expo push token
  revenuecat_id    text unique,              -- RevenueCat customer ID
  telegram_id      bigint unique,
  recipes_count    integer not null default 0,
  cookbooks_count  integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Trigger: keep updated_at current
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger users_updated_at
  before update on public.users
  for each row execute function update_updated_at();

-- ================================================================
-- COOKBOOKS
-- ================================================================
create table public.cookbooks (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.users(id) on delete cascade,
  title            text not null,
  description      text,
  cover_url        text,
  palette          text not null default 'terracotta'
                     check (palette in ('terracotta','sage','blush','cobalt')),
  intent           text check (intent in ('gift','personal')),
  recipient_name   text,                     -- "For grandma" — set during onboarding
  is_public        boolean not null default false,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index on public.cookbooks(user_id);
create trigger cookbooks_updated_at before update on public.cookbooks
  for each row execute function update_updated_at();

-- ================================================================
-- RECIPES
-- ================================================================
create table public.recipes (
  id               uuid primary key default gen_random_uuid(),
  cookbook_id      uuid references public.cookbooks(id) on delete set null,
  user_id          uuid not null references public.users(id) on delete cascade,
  title            text not null,
  description      text,
  source_url       text,
  source_type      text not null default 'manual'
                     check (source_type in (
                       'manual','url_import','screenshot_import',
                       'telegram_link','telegram_screenshot'
                     )),
  cover_image_url  text,
  ingredients      jsonb not null default '[]',
  -- [{id: uuid, name: text, amount: text, unit: text, group: text|null}]
  instructions     jsonb not null default '[]',
  -- [{step: int, text: text, tip: text|null, image_url: text|null}]
  servings         integer,
  prep_minutes     integer,
  cook_minutes     integer,
  tags             text[] not null default '{}',
  is_favorite      boolean not null default false,
  position         integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index on public.recipes(user_id);
create index on public.recipes(cookbook_id);
create index on public.recipes using gin(tags);
create index on public.recipes using gin(
  to_tsvector('simple', title || ' ' || coalesce(description,''))
);  -- full-text search

create trigger recipes_updated_at before update on public.recipes
  for each row execute function update_updated_at();

-- Counter maintenance
create or replace function sync_recipe_count() returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update public.users set recipes_count = recipes_count + 1 where id = NEW.user_id;
  elsif TG_OP = 'DELETE' then
    update public.users set recipes_count = recipes_count - 1 where id = OLD.user_id;
  end if;
  return null;
end; $$;
create trigger recipes_count_trigger after insert or delete on public.recipes
  for each row execute function sync_recipe_count();

-- ================================================================
-- CANVAS (one per recipe page)
-- ================================================================
create table public.recipe_canvases (
  id                uuid primary key default gen_random_uuid(),
  recipe_id         uuid unique not null references public.recipes(id) on delete cascade,
  user_id           uuid not null references public.users(id) on delete cascade,
  width             integer not null default 794,
  height            integer not null default 1123,
  background_color  text not null default '#faf4e6',
  template_key      text,
  thumbnail_url     text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create trigger canvas_updated_at before update on public.recipe_canvases
  for each row execute function update_updated_at();

create table public.canvas_elements (
  id               uuid primary key default gen_random_uuid(),
  canvas_id        uuid not null references public.recipe_canvases(id) on delete cascade,
  element_type     text not null
                     check (element_type in ('sticker','text','user_image','washi_tape')),
  sticker_key      text,
  user_image_id    uuid references public.user_images(id) on delete set null,
  pos_x            float not null default 0,
  pos_y            float not null default 0,
  rotation         float not null default 0,
  scale_x          float not null default 1,
  scale_y          float not null default 1,
  z_index          integer not null default 0,
  text_content     text,
  text_style       jsonb,   -- {fontFamily, fontSize, color, align, bold, italic}
  washi_style      jsonb,   -- {color, pattern, width, angle}
  created_at       timestamptz not null default now()
);
create index on public.canvas_elements(canvas_id);

create table public.drawing_layers (
  id               uuid primary key default gen_random_uuid(),
  canvas_id        uuid not null references public.recipe_canvases(id) on delete cascade,
  name             text not null default 'Layer',
  position         integer not null default 0,
  opacity          float not null default 1.0 check (opacity between 0 and 1),
  blend_mode       text not null default 'normal'
                     check (blend_mode in ('normal','multiply','overlay','screen','soft-light')),
  visible          boolean not null default true,
  created_at       timestamptz not null default now()
);
create index on public.drawing_layers(canvas_id);

create table public.drawing_strokes (
  id               uuid primary key default gen_random_uuid(),
  layer_id         uuid not null references public.drawing_layers(id) on delete cascade,
  points           jsonb not null,  -- [{x, y, pressure}]
  stroke_width     float not null default 4,
  color            text not null default '#3b2a1f',
  opacity          float not null default 1.0,
  smoothed_path    text,            -- cached SVG path from perfect-freehand
  created_at       timestamptz not null default now()
);
create index on public.drawing_strokes(layer_id);

-- ================================================================
-- USER IMAGES (uploaded photos + custom stickers)
-- ================================================================
create table public.user_images (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.users(id) on delete cascade,
  storage_path     text not null,   -- path inside Supabase Storage bucket
  url              text not null,   -- public CDN URL
  thumb_url        text,
  file_size        integer,
  mime_type        text,
  width            integer,
  height           integer,
  is_sticker       boolean not null default false,
  created_at       timestamptz not null default now()
);
create index on public.user_images(user_id);

-- ================================================================
-- BOOK PAGES
-- ================================================================
create table public.book_pages (
  id               uuid primary key default gen_random_uuid(),
  cookbook_id      uuid not null references public.cookbooks(id) on delete cascade,
  user_id          uuid not null references public.users(id) on delete cascade,
  page_type        text not null
                     check (page_type in (
                       'cover','dedication','about',
                       'chapter_divider','recipe','blank',
                       'table_of_contents','closing'
                     )),
  recipe_id        uuid references public.recipes(id) on delete set null,
  canvas_id        uuid references public.recipe_canvases(id) on delete set null,
  template_key     text,
  title            text,           -- chapter title, etc.
  position         integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index on public.book_pages(cookbook_id);
create trigger book_pages_updated_at before update on public.book_pages
  for each row execute function update_updated_at();

-- ================================================================
-- PDF EXPORTS
-- ================================================================
create table public.pdf_exports (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.users(id) on delete cascade,
  cookbook_id      uuid references public.cookbooks(id) on delete set null,
  recipe_ids       uuid[],
  style            text not null check (style in ('scrapbook','clean')),
  paper_size       text not null default 'a5' check (paper_size in ('a4','a5')),
  page_count       integer,
  pdf_url          text,
  storage_path     text,
  status           text not null default 'pending'
                     check (status in ('pending','processing','done','failed')),
  watermarked      boolean not null default true,
  expires_at       timestamptz default now() + interval '7 days',
  error_message    text,
  created_at       timestamptz not null default now()
);
create index on public.pdf_exports(user_id);

-- ================================================================
-- PRINT ORDERS
-- ================================================================
create table public.print_orders (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete cascade,
  cookbook_id       uuid references public.cookbooks(id) on delete set null,
  pdf_export_id     uuid references public.pdf_exports(id) on delete set null,
  lulu_order_id     text unique,
  recipient_name    text not null,
  recipient_email   text,
  shipping_address  jsonb not null,
  -- {line1, line2, city, state, postal_code, country_code}
  format            text not null
                      check (format in ('a5_softcover','a5_hardcover','a4_hardcover')),
  page_count        integer,
  gift_message      text,
  price_cents       integer not null,
  currency          text not null default 'usd',
  status            text not null default 'pending'
                      check (status in (
                        'pending','payment_pending','paid',
                        'submitted','printing','shipped','delivered','failed','refunded'
                      )),
  tracking_url      text,
  lulu_status_raw   jsonb,
  paid_at           timestamptz,
  shipped_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index on public.print_orders(user_id);
create trigger print_orders_updated_at before update on public.print_orders
  for each row execute function update_updated_at();

-- ================================================================
-- TELEGRAM
-- ================================================================
create table public.telegram_connections (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid unique not null references public.users(id) on delete cascade,
  telegram_id      bigint unique not null,
  username         text,
  connected_at     timestamptz not null default now()
);

create table public.telegram_jobs (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references public.users(id) on delete cascade,
  telegram_id      bigint not null,
  input_type       text not null check (input_type in ('link','screenshot')),
  raw_url          text,
  image_storage_path text,
  status           text not null default 'queued'
                     check (status in ('queued','processing','done','failed')),
  recipe_id        uuid references public.recipes(id) on delete set null,
  error_message    text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index on public.telegram_jobs(user_id);
create index on public.telegram_jobs(telegram_id);

-- ================================================================
-- AI JOBS (all Haiku calls)
-- ================================================================
create table public.ai_jobs (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references public.users(id) on delete cascade,
  job_type         text not null
                     check (job_type in ('url_extract','image_extract','auto_sticker')),
  input_data       jsonb,
  output_data      jsonb,
  status           text not null default 'queued'
                     check (status in ('queued','processing','done','failed')),
  tokens_used      integer,
  model            text,
  error_message    text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index on public.ai_jobs(user_id);
```

---

## 2. Row Level Security (RLS)

Every table is locked by default. Users can only touch their own rows.

```sql
-- Pattern: enable RLS, then grant access only to the row owner.
-- Apply this pattern to every table.

alter table public.recipes enable row level security;

create policy "users read own recipes"
  on public.recipes for select
  using (auth.uid() = user_id);

create policy "users insert own recipes"
  on public.recipes for insert
  with check (auth.uid() = user_id);

create policy "users update own recipes"
  on public.recipes for update
  using (auth.uid() = user_id);

create policy "users delete own recipes"
  on public.recipes for delete
  using (auth.uid() = user_id);

-- Repeat for: cookbooks, recipe_canvases, canvas_elements,
-- drawing_layers, drawing_strokes, user_images, book_pages,
-- pdf_exports, print_orders, telegram_connections, telegram_jobs, ai_jobs

-- Service role (Edge Functions + Telegram bot) bypasses RLS automatically.
-- Never expose the service role key to the client.
```

---

## 3. Auth System

### Flow: Magic link (primary)

```
1. Client calls supabase.auth.signInWithOtp({ email })
2. Supabase sends email with magic link
3. User taps link → Universal Link opens app
4. App receives URL → supabase.auth.exchangeCodeForSession(code)
5. Session stored in expo-secure-store
6. Supabase auto-refreshes JWT before expiry
```

### Flow: Apple Sign In

```
1. Client calls expo-apple-authentication → returns identityToken
2. Client calls supabase.auth.signInWithIdToken({ provider: 'apple', token })
3. Supabase validates token with Apple, returns session
4. Same session storage as magic link
```

### Flow: Post-signup user row creation

```sql
-- Supabase Auth trigger: creates public.users row after auth.users insert
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

### JWT claims for tier checking

```sql
-- Edge Function reads user tier from JWT custom claim
-- Set via Supabase Auth hook (custom_access_token_hook)
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable as $$
declare
  user_tier text;
begin
  select tier into user_tier from public.users where id = (event->>'user_id')::uuid;
  return jsonb_set(event, '{claims,user_tier}', to_jsonb(user_tier));
end; $$;
-- Register in Supabase Dashboard: Auth > Hooks > Custom Access Token
```

---

## 4. API Endpoints

### Auto-generated (Supabase PostgREST — no code needed)

```
GET    /rest/v1/recipes?cookbook_id=eq.{id}&order=position
GET    /rest/v1/recipes?id=eq.{id}&select=*,recipe_canvases(*)
POST   /rest/v1/recipes
PATCH  /rest/v1/recipes?id=eq.{id}
DELETE /rest/v1/recipes?id=eq.{id}

GET    /rest/v1/cookbooks?user_id=eq.{id}
POST   /rest/v1/cookbooks
PATCH  /rest/v1/cookbooks?id=eq.{id}

GET    /rest/v1/canvas_elements?canvas_id=eq.{id}&order=z_index
POST   /rest/v1/canvas_elements
PATCH  /rest/v1/canvas_elements?id=eq.{id}
DELETE /rest/v1/canvas_elements?id=eq.{id}

GET    /rest/v1/book_pages?cookbook_id=eq.{id}&order=position
POST   /rest/v1/book_pages
PATCH  /rest/v1/book_pages?id=eq.{id}
DELETE /rest/v1/book_pages?id=eq.{id}
```

All PostgREST calls respect RLS automatically. Client passes JWT in `Authorization: Bearer {token}`.

---

### Edge Functions (custom logic)

All Edge Functions share a set of helpers under `supabase/functions/_shared/`:
- `cors.ts` — preflight + shared headers
- `errors.ts` — `jsonError` / `jsonResponse` wrappers with the consistent `{ error, message, ... }` shape
- `auth.ts` — `requireUser(req)` returns `{ userId, jwt, supabaseAdmin }` from the `Authorization: Bearer` header or a ready-to-return 401
- `ai.ts` — shared Anthropic client (`HAIKU_MODEL = 'claude-haiku-4-5-20251001'`) + `logAiJob(...)` writer
- `tier.ts` — `getQuota` / `checkQuotaAllowed` / `checkRateLimit` and the `FREE_MONTHLY_LIMITS` table (20 url_extract, 20 image_extract, 5 auto_sticker)

Secrets to set on the Supabase project:
- `ANTHROPIC_API_KEY` — set manually via `supabase secrets set`
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — auto-injected by the platform at runtime

Local dev: `supabase functions serve extract-recipe --env-file supabase/.env.local`. See `docs/edge-functions.md` for the full flow.

#### `POST /functions/v1/extract-recipe`

Extracts a recipe from a URL or image using Claude Haiku.

**Request:**
```json
{ "url": "https://www.bbcgoodfood.com/recipes/tomato-soup" }
// OR
{ "image_url": "https://storage.supabase.../telegram_screenshots/abc.jpg" }
```

**Response (200):**
```json
{
  "title": "Tomato Soup",
  "description": "A warming classic.",
  "servings": 4,
  "prep_minutes": 10,
  "cook_minutes": 30,
  "ingredients": [
    { "name": "tomatoes", "amount": "800", "unit": "g", "group": null },
    { "name": "onion", "amount": "1", "unit": "large", "group": null }
  ],
  "instructions": [
    { "step": 1, "text": "Dice the onion and fry in olive oil for 5 minutes." },
    { "step": 2, "text": "Add tomatoes and simmer for 25 minutes." }
  ],
  "tags": ["soup", "vegetarian", "quick"],
  "confidence": 0.94,
  "source_url": "https://www.bbcgoodfood.com/recipes/tomato-soup"
}
```

**Response (206 Partial — paywall/blocked site):**
```json
{
  "title": "Untitled Recipe",
  "ingredients": [],
  "instructions": [],
  "partial": true,
  "reason": "Could not access page content"
}
```

**Edge Function logic:**
```typescript
// supabase/functions/extract-recipe/index.ts
import Anthropic from 'npm:@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })

Deno.serve(async (req) => {
  const { url, image_url } = await req.json()

  // Auth check
  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '')
  const { data: { user } } = await supabaseAdmin.auth.getUser(jwt)
  if (!user) return new Response('Unauthorized', { status: 401 })

  // Rate limit: free tier = 20 imports/month
  const tier = await getUserTier(user.id)
  if (tier === 'free') {
    const count = await getMonthlyImportCount(user.id)
    if (count >= 20) return new Response(
      JSON.stringify({ error: 'monthly_limit_reached' }),
      { status: 429 }
    )
  }

  const content = url
    ? await scrapeUrl(url)
    : [{ type: 'image', source: { type: 'url', url: image_url } }]

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: EXTRACTION_SYSTEM_PROMPT,  // cached
    messages: [{ role: 'user', content }],
  })

  const recipe = parseRecipeJson(message.content[0].text)

  // Log AI job
  await supabaseAdmin.from('ai_jobs').insert({
    user_id: user.id,
    job_type: url ? 'url_extract' : 'image_extract',
    input_data: { url, image_url },
    output_data: recipe,
    status: 'done',
    tokens_used: message.usage.input_tokens + message.usage.output_tokens,
    model: 'claude-haiku-4-5-20251001',
  })

  return new Response(JSON.stringify(recipe), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

---

#### `POST /functions/v1/auto-sticker`

AI places stickers on a recipe canvas automatically.

**Request:**
```json
{
  "recipe_id": "uuid",
  "canvas_id": "uuid"
}
```

**Response (200):**
```json
{
  "elements": [
    { "sticker_key": "tomato", "pos_x": 240, "pos_y": 80,  "rotation": 12,  "scale_x": 1.2, "scale_y": 1.2, "z_index": 10 },
    { "sticker_key": "basil",  "pos_x": 60,  "pos_y": 340, "rotation": -8,  "scale_x": 0.9, "scale_y": 0.9, "z_index": 11 },
    { "sticker_key": "spoon",  "pos_x": 300, "pos_y": 500, "rotation": 20,  "scale_x": 1.0, "scale_y": 1.0, "z_index": 12 }
  ]
}
```

**Haiku prompt pattern:**
```typescript
const STICKER_AI_KEYWORDS: Record<string, string[]> = {
  tomato:     ['tomato', 'pasta', 'sauce', 'pizza', 'marinara', 'bruschetta'],
  lemon:      ['lemon', 'citrus', 'lime', 'curd', 'sorbet', 'dressing'],
  garlic:     ['garlic', 'aioli', 'roast', 'mediterranean', 'italian'],
  basil:      ['basil', 'pesto', 'italian', 'caprese', 'herb'],
  whisk:      ['cake', 'baking', 'eggs', 'custard', 'meringue', 'batter'],
  spoon:      ['soup', 'stew', 'porridge', 'sauce', 'risotto'],
  pan:        ['fry', 'sauté', 'stir-fry', 'pancake', 'omelette'],
  wheat:      ['bread', 'pasta', 'flour', 'pizza', 'baking', 'grain'],
  strawberry: ['strawberry', 'berry', 'jam', 'smoothie', 'dessert'],
  flower:     ['floral', 'lavender', 'elderflower', 'rose', 'chamomile'],
  leaf:       ['salad', 'green', 'herb', 'vegetarian', 'vegan', 'fresh'],
  heart:      ['favourite', 'love', 'family', 'special', 'grandma'],
  star:       ['special', 'celebration', 'birthday', 'christmas', 'festive'],
  mushroom:   ['mushroom', 'umami', 'risotto', 'forager', 'fungi'],
  bread:      ['bread', 'sourdough', 'toast', 'sandwich', 'bake'],
  cherry:     ['cherry', 'berry', 'clafoutis', 'pie', 'dessert'],
}
```

---

#### `POST /functions/v1/generate-pdf`

Generates a PDF from book pages.

**Request:**
```json
{
  "cookbook_id": "uuid",
  "style": "scrapbook",
  "paper_size": "a5",
  "canvas_snapshots": [
    { "page_id": "uuid", "image_base64": "data:image/png;base64,..." }
  ]
}
```

**Response (200):**
```json
{
  "export_id": "uuid",
  "pdf_url": "https://storage.supabase.../pdf-exports/abc.pdf",
  "page_count": 12,
  "expires_at": "2026-04-25T00:00:00Z"
}
```

**Logic:**
1. Receive canvas snapshots (PNG, sent from client via Skia `makeImageSnapshot`)
2. Render HTML template per page (recipe data + embedded PNG for decorated pages)
3. Puppeteer generates PDF from HTML
4. Upload PDF to Supabase Storage (`pdf-exports/` bucket, private)
5. Create signed URL (7-day expiry) → return to client
6. Record in `pdf_exports` table
7. If free tier: apply watermark text via HTML overlay before Puppeteer render

---

#### `POST /functions/v1/lulu-webhook`

Receives print order status updates from Lulu xPress.

**Request (from Lulu):**
```json
{
  "order_id": "LULU-12345",
  "status": "SHIPPED",
  "tracking_number": "1Z999...",
  "carrier": "UPS",
  "tracking_url": "https://www.ups.com/track?..."
}
```

**Logic:**
```typescript
Deno.serve(async (req) => {
  // Verify Lulu webhook signature
  const sig = req.headers.get('X-Lulu-Signature')
  if (!verifyLuluSignature(sig, await req.text())) {
    return new Response('Invalid signature', { status: 401 })
  }

  const { order_id, status, tracking_url } = await req.json()

  // Update print_orders table
  const { data: order } = await supabaseAdmin
    .from('print_orders')
    .update({ status: mapLuluStatus(status), tracking_url, lulu_status_raw: body })
    .eq('lulu_order_id', order_id)
    .select('user_id')
    .single()

  // Push notification to user
  if (status === 'SHIPPED' && order?.user_id) {
    await sendPushNotification(order.user_id, {
      title: 'Your book is on its way!',
      body: 'Your printed cookbook has shipped. Track your order →',
      data: { screen: 'print_order', order_id },
    })
  }

  return new Response('OK')
})
```

---

#### `POST /functions/v1/revenuecat-webhook`

Syncs subscription state from RevenueCat.

**Request (from RevenueCat):**
```json
{
  "event": {
    "type": "INITIAL_PURCHASE",
    "app_user_id": "user-uuid",
    "product_id": "premium_monthly",
    "period_type": "NORMAL",
    "expiration_at_ms": 1756000000000
  }
}
```

**Logic:**
```typescript
const UPGRADE_EVENTS = ['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION']
const DOWNGRADE_EVENTS = ['CANCELLATION', 'EXPIRATION', 'BILLING_ISSUE']

const newTier = UPGRADE_EVENTS.includes(event.type) ? 'premium' : 'free'

await supabaseAdmin
  .from('users')
  .update({ tier: newTier })
  .eq('id', event.app_user_id)
```

**This webhook is the single source of truth for tier.** Client never sets tier directly.

---

#### `POST /functions/v1/telegram-auth`

Exchanges Telegram auth token for a connection.

**Request:**
```json
{ "token": "one-time-token-from-bot", "telegram_id": 123456789, "username": "anhelina" }
```

**Response:**
```json
{ "connected": true }
```

---

## 5. File Upload Handling

### Bucket structure

```
Supabase Storage buckets:

recipe-images/          PUBLIC CDN
  {userId}/{recipeId}.jpg

user-images/            PRIVATE (signed URLs)
  {userId}/{imageId}.jpg
  {userId}/{imageId}_thumb.jpg

canvas-thumbnails/      PUBLIC CDN
  {userId}/{canvasId}.png

pdf-exports/            PRIVATE (signed URLs, 7-day expiry)
  {userId}/{exportId}.pdf

telegram-screenshots/   PRIVATE (Edge Function access only)
  {telegramId}/{jobId}.jpg
```

### Upload flow (client)

```typescript
// src/api/storage.ts
export async function uploadRecipeImage(
  userId: string,
  recipeId: string,
  file: { uri: string; mimeType: string }
): Promise<string> {
  const path = `${userId}/${recipeId}.jpg`
  const blob = await uriToBlob(file.uri)

  const { error } = await supabase.storage
    .from('recipe-images')
    .upload(path, blob, {
      contentType: 'image/jpeg',
      upsert: true,               // replace if exists (editing recipe)
    })

  if (error) throw new ApiError(error.message)

  const { data } = supabase.storage
    .from('recipe-images')
    .getPublicUrl(path)

  return data.publicUrl
}
```

### Canvas thumbnail (server-side from Skia snapshot)

```typescript
// Called from client after canvas save
export async function uploadCanvasThumbnail(
  canvasId: string,
  base64Png: string
): Promise<string> {
  const buffer = Buffer.from(base64Png.replace(/^data:image\/png;base64,/, ''), 'base64')
  const path = `${supabase.auth.getUser()}/canvas/${canvasId}.png`

  const { error } = await supabase.storage
    .from('canvas-thumbnails')
    .upload(path, buffer, { contentType: 'image/png', upsert: true })

  if (error) throw new ApiError(error.message)
  return supabase.storage.from('canvas-thumbnails').getPublicUrl(path).data.publicUrl
}
```

### RLS on storage

```sql
-- recipe-images: owner can read/write, public can read
create policy "public read recipe images"
  on storage.objects for select
  using (bucket_id = 'recipe-images');

create policy "owner write recipe images"
  on storage.objects for insert
  with check (bucket_id = 'recipe-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- user-images: owner only
create policy "owner only user images"
  on storage.objects for all
  using (bucket_id = 'user-images' AND auth.uid()::text = (storage.foldername(name))[1]);
```

---

## 6. Push Notification Flow

```
1. App opens → call Expo.Notifications.getExpoPushTokenAsync()
2. Store token: PATCH /rest/v1/users?id=eq.{id} { push_token: token }
3. Token stored in users.push_token
```

```typescript
// supabase/functions/_shared/notifications.ts
export async function sendPushNotification(
  userId: string,
  message: { title: string; body: string; data?: Record<string, unknown> }
) {
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('push_token')
    .eq('id', userId)
    .single()

  if (!user?.push_token) return   // User hasn't granted permission

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: user.push_token,
      title: message.title,
      body: message.body,
      data: message.data ?? {},
      sound: 'default',
      badge: 1,
    }),
  })

  if (!response.ok) {
    console.error('Push failed:', await response.text())
  }
}
```

### When notifications are sent

| Trigger | Sender | Message |
|---|---|---|
| Telegram recipe imported | `telegram_jobs` completion in bot | "📥 Recipe saved: {title}" |
| Print order shipped | `lulu-webhook` Edge Function | "📦 Your book is on its way!" |
| AI extraction complete (>10s) | `extract-recipe` Edge Function | "✓ Recipe ready to review" |
| Print order delivered | `lulu-webhook` Edge Function | "📚 Your book has arrived!" |
| Day 3 re-engagement | Cron job (pg_cron) | "Your recipes are waiting to be beautiful ✨" |

```sql
-- pg_cron for re-engagement (runs daily at 10:00 UTC)
select cron.schedule(
  'day-3-reengagement',
  '0 10 * * *',
  $$
    select net.http_post(
      url := 'https://your-project.supabase.co/functions/v1/send-reengagement',
      headers := '{"Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb
    )
  $$
);
```

---

## 7. Subscription & Payment Logic

### Architecture

```
App → RevenueCat SDK → App Store / Google Play / Stripe
                  ↓ webhook
       RevenueCat → POST /functions/v1/revenuecat-webhook
                          ↓
                   UPDATE users SET tier = 'premium'
```

**RevenueCat is the broker. Supabase is the record of truth. Never the other way around.**

### Tier enforcement (server-side, not client-side)

```sql
-- Edge Function checks tier before allowing premium action
create or replace function check_premium_limit(
  p_user_id uuid,
  p_table text,
  p_column text,
  p_free_limit integer
) returns boolean language plpgsql as $$
declare
  user_tier text;
  current_count integer;
begin
  select tier into user_tier from public.users where id = p_user_id;
  if user_tier = 'premium' then return true; end if;

  execute format('select count(*) from public.%I where user_id = $1', p_table)
    into current_count using p_user_id;

  return current_count < p_free_limit;
end; $$;
```

### Free tier limits (enforced in Edge Functions)

| Resource | Free limit | Enforcement point |
|---|---|---|
| Cookbooks | 3 | `POST /rest/v1/cookbooks` → RLS check function |
| Recipes | 30 | `POST /rest/v1/recipes` → RLS check function |
| AI imports | 20/month | `extract-recipe` Edge Function |
| Make me Sketch | 5/month | `auto-sticker` Edge Function |
| Print orders | 1/month | `generate-pdf` Edge Function |
| PDF export | Watermarked | `generate-pdf` Edge Function — applies watermark |

---

## 8. Telegram Bot Service

Separate Node.js process on Railway (always-on, needed for webhooks).

```typescript
// telegram-bot/src/bot.ts
import { Telegraf } from 'telegraf'
import { Queue } from 'bullmq'
import Redis from 'ioredis'

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!)
const redis = new Redis(process.env.REDIS_URL!)
const recipeQueue = new Queue('recipe-extract', { connection: redis })

bot.on('text', async (ctx) => {
  const text = ctx.message.text
  const telegramId = ctx.from.id

  // Auth: check telegram_connections table
  const user = await getUserByTelegramId(telegramId)
  if (!user) {
    return ctx.reply(
      "I don't know you yet! Connect your account first → open Spoon & Sketch > Settings > Telegram"
    )
  }

  if (isUrl(text)) {
    await ctx.reply('Got it! Extracting your recipe…')
    await recipeQueue.add('url', {
      userId: user.id,
      telegramId,
      url: text,
      chatId: ctx.chat.id,
    })
  } else {
    await ctx.reply("Send me a recipe link or a photo of a recipe and I'll save it for you.")
  }
})

bot.on('photo', async (ctx) => {
  const telegramId = ctx.from.id
  const user = await getUserByTelegramId(telegramId)
  if (!user) return ctx.reply('Connect your account first in Spoon & Sketch.')

  await ctx.reply('Got it! Reading this for you…')
  const fileId = ctx.message.photo.at(-1)!.file_id   // largest size
  const fileUrl = await bot.telegram.getFileLink(fileId)

  // Upload to Supabase Storage
  const storagePath = await uploadTelegramPhoto(fileUrl.href, user.id)

  await recipeQueue.add('screenshot', {
    userId: user.id,
    telegramId,
    storagePath,
    chatId: ctx.chat.id,
  })
})

// Worker processes jobs and calls extract-recipe Edge Function
// On success: saves recipe to DB, sends confirmation with deep link
// On failure: sends friendly error message
```

---

## 9. Admin Panel

v1 uses zero-code tools. Build a custom dashboard only after launch when you know what you need.

### Supabase Studio (built-in, free)
- Browse all tables
- Run SQL queries
- View Edge Function logs
- Monitor storage buckets
- View auth users

### Retool dashboard (connect to Supabase via PostgREST)

Build these 4 views in Retool in ~2 hours:

| View | Data | Use |
|---|---|---|
| **User overview** | users + tier + recipe/cookbook counts | See active users, free vs paid breakdown |
| **AI usage** | ai_jobs grouped by day + model + tokens_used | Monitor Haiku costs, catch abuse |
| **Print orders** | print_orders + status + lulu_order_id | Customer support for order issues |
| **Flagged content** | recipes with `is_flagged = true` | Moderation (add flag column before launch) |

---

## 10. Security Best Practices

### API key protection
```
Never in client bundle:   ANTHROPIC_API_KEY, LULU_API_KEY,
                          SUPABASE_SERVICE_ROLE_KEY, TELEGRAM_BOT_TOKEN

Safe in client bundle:    EXPO_PUBLIC_SUPABASE_URL,
                          EXPO_PUBLIC_SUPABASE_ANON_KEY (RLS protects data),
                          EXPO_PUBLIC_POSTHOG_KEY,
                          EXPO_PUBLIC_REVENUECAT_IOS_KEY
```

### Input validation in Edge Functions
```typescript
import { z } from 'npm:zod'

const extractSchema = z.object({
  url: z.string().url().optional(),
  image_url: z.string().url().optional(),
}).refine(d => d.url || d.image_url, 'Provide url or image_url')

// In handler:
const parsed = extractSchema.safeParse(body)
if (!parsed.success) return new Response(
  JSON.stringify({ error: parsed.error.flatten() }), { status: 400 }
)
```

### Rate limiting
```typescript
// Per-user rate limit using Redis (Upstash)
async function checkRateLimit(userId: string, action: string, limit: number, windowSecs: number) {
  const key = `ratelimit:${userId}:${action}`
  const count = await redis.incr(key)
  if (count === 1) await redis.expire(key, windowSecs)
  if (count > limit) throw new ApiError('Rate limit exceeded', 'RATE_LIMITED', 429)
}

// Usage:
await checkRateLimit(user.id, 'extract-recipe', 10, 60)  // 10 extractions/minute
```

### Webhook signature verification
```typescript
// Verify Lulu and RevenueCat webhooks — never trust unsigned payloads
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(payload).digest('hex')
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}
```

### GDPR / data deletion
```sql
-- Cascade deletes handle most cleanup via FK constraints.
-- "Delete account" triggers:
-- 1. delete from auth.users where id = userId  (cascades to public.users)
-- 2. supabase.storage.empty('recipe-images/{userId}/')
-- 3. supabase.storage.empty('user-images/{userId}/')
-- 4. supabase.storage.empty('canvas-thumbnails/{userId}/')
-- All handled in a single Edge Function: DELETE /functions/v1/delete-account
```

---

## 11. Scalable Hosting

### Current (v1 — Supabase Pro, ~$30/month total)

| Service | Plan | Cost | Limit |
|---|---|---|---|
| Supabase | Pro | $25/mo | 8GB DB, 100GB storage, 2M Edge Function calls |
| Railway | Hobby | $5/mo | Telegram bot (512MB RAM, always-on) |
| Upstash Redis | Pay-per-use | ~$0–5/mo | BullMQ queue |

This handles ~10,000 MAU comfortably.

### Scale path (if you grow)

| MAU | Change | Cost |
|---|---|---|
| 10k → 50k | Supabase Pro stays, add read replica | +$25/mo |
| 50k → 200k | Supabase Team plan + connection pooling (pgBouncer, built-in) | ~$150/mo |
| 200k+ | Dedicated Supabase instance or migrate to self-hosted Postgres on Fly.io | Custom |
| High AI volume | Anthropic prompt caching (already in plan) + BullMQ concurrency tuning | No extra infra |
| High PDF volume | Add more Edge Function concurrency (Supabase auto-scales) | Pay-per-invocation |

### What you do NOT need at launch
- Custom API server (Supabase PostgREST + Edge Functions covers everything)
- Separate CDN (Supabase Storage has it built-in)
- Custom email service (Supabase Auth magic link emails are fine for v1)
- Kubernetes / Docker orchestration
- Separate Redis cluster (Upstash scales automatically)
