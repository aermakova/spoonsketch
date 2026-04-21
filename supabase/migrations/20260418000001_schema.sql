-- ================================================================
-- EXTENSIONS
-- ================================================================
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ================================================================
-- UPDATED_AT TRIGGER FUNCTION (shared by all tables)
-- ================================================================
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- ================================================================
-- USERS
-- ================================================================
create table public.users (
  id               uuid primary key references auth.users(id) on delete cascade,
  email            text unique not null,
  username         text unique,
  avatar_url       text,
  tier             text not null default 'free' check (tier in ('free','premium')),
  palette          text not null default 'terracotta' check (palette in ('terracotta','sage','blush','cobalt')),
  paper_texture    text not null default 'medium' check (paper_texture in ('low','medium','high')),
  language         text not null default 'en' check (language in ('en','uk')),
  push_token       text,
  revenuecat_id    text unique,
  telegram_id      bigint unique,
  recipes_count    integer not null default 0,
  cookbooks_count  integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create trigger users_updated_at before update on public.users
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
  palette          text not null default 'terracotta' check (palette in ('terracotta','sage','blush','cobalt')),
  intent           text check (intent in ('gift','personal')),
  recipient_name   text,
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
  instructions     jsonb not null default '[]',
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
);
create trigger recipes_updated_at before update on public.recipes
  for each row execute function update_updated_at();

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
-- USER IMAGES
-- ================================================================
create table public.user_images (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.users(id) on delete cascade,
  storage_path     text not null,
  url              text not null,
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
-- CANVAS
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
  element_type     text not null check (element_type in ('sticker','text','user_image','washi_tape')),
  sticker_key      text,
  user_image_id    uuid references public.user_images(id) on delete set null,
  pos_x            float not null default 0,
  pos_y            float not null default 0,
  rotation         float not null default 0,
  scale_x          float not null default 1,
  scale_y          float not null default 1,
  z_index          integer not null default 0,
  text_content     text,
  text_style       jsonb,
  washi_style      jsonb,
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
  points           jsonb not null,
  stroke_width     float not null default 4,
  color            text not null default '#3b2a1f',
  opacity          float not null default 1.0,
  smoothed_path    text,
  created_at       timestamptz not null default now()
);
create index on public.drawing_strokes(layer_id);

-- ================================================================
-- BOOK PAGES
-- ================================================================
create table public.book_pages (
  id               uuid primary key default gen_random_uuid(),
  cookbook_id      uuid not null references public.cookbooks(id) on delete cascade,
  user_id          uuid not null references public.users(id) on delete cascade,
  page_type        text not null check (page_type in (
                     'cover','dedication','about','chapter_divider',
                     'recipe','blank','table_of_contents','closing'
                   )),
  recipe_id        uuid references public.recipes(id) on delete set null,
  canvas_id        uuid references public.recipe_canvases(id) on delete set null,
  template_key     text,
  title            text,
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
  format            text not null check (format in ('a5_softcover','a5_hardcover','a4_hardcover')),
  page_count        integer,
  gift_message      text,
  price_cents       integer not null,
  currency          text not null default 'usd',
  status            text not null default 'pending'
                      check (status in (
                        'pending','payment_pending','paid','submitted',
                        'printing','shipped','delivered','failed','refunded'
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
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid references public.users(id) on delete cascade,
  telegram_id          bigint not null,
  input_type           text not null check (input_type in ('link','screenshot')),
  raw_url              text,
  image_storage_path   text,
  status               text not null default 'queued'
                         check (status in ('queued','processing','done','failed')),
  recipe_id            uuid references public.recipes(id) on delete set null,
  error_message        text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index on public.telegram_jobs(user_id);
create index on public.telegram_jobs(telegram_id);

-- ================================================================
-- AI JOBS
-- ================================================================
create table public.ai_jobs (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references public.users(id) on delete cascade,
  job_type         text not null check (job_type in ('url_extract','image_extract','auto_sticker')),
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
