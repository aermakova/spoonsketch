-- ================================================================
-- AUTH TRIGGER: create public.users row on signup
-- ================================================================
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

-- ================================================================
-- RLS: USERS
-- ================================================================
alter table public.users enable row level security;

create policy "users read own row"
  on public.users for select using (auth.uid() = id);

create policy "users update own row"
  on public.users for update using (auth.uid() = id);

-- ================================================================
-- RLS: COOKBOOKS
-- ================================================================
alter table public.cookbooks enable row level security;

create policy "users read own cookbooks"
  on public.cookbooks for select using (auth.uid() = user_id);

create policy "users insert own cookbooks"
  on public.cookbooks for insert with check (auth.uid() = user_id);

create policy "users update own cookbooks"
  on public.cookbooks for update using (auth.uid() = user_id);

create policy "users delete own cookbooks"
  on public.cookbooks for delete using (auth.uid() = user_id);

-- ================================================================
-- RLS: RECIPES
-- ================================================================
alter table public.recipes enable row level security;

create policy "users read own recipes"
  on public.recipes for select using (auth.uid() = user_id);

create policy "users insert own recipes"
  on public.recipes for insert with check (auth.uid() = user_id);

create policy "users update own recipes"
  on public.recipes for update using (auth.uid() = user_id);

create policy "users delete own recipes"
  on public.recipes for delete using (auth.uid() = user_id);

-- ================================================================
-- RLS: RECIPE CANVASES
-- ================================================================
alter table public.recipe_canvases enable row level security;

create policy "users read own canvases"
  on public.recipe_canvases for select using (auth.uid() = user_id);

create policy "users insert own canvases"
  on public.recipe_canvases for insert with check (auth.uid() = user_id);

create policy "users update own canvases"
  on public.recipe_canvases for update using (auth.uid() = user_id);

create policy "users delete own canvases"
  on public.recipe_canvases for delete using (auth.uid() = user_id);

-- ================================================================
-- RLS: CANVAS ELEMENTS
-- ================================================================
alter table public.canvas_elements enable row level security;

create policy "users read own canvas elements"
  on public.canvas_elements for select
  using (exists (
    select 1 from public.recipe_canvases c
    where c.id = canvas_id and c.user_id = auth.uid()
  ));

create policy "users insert own canvas elements"
  on public.canvas_elements for insert
  with check (exists (
    select 1 from public.recipe_canvases c
    where c.id = canvas_id and c.user_id = auth.uid()
  ));

create policy "users update own canvas elements"
  on public.canvas_elements for update
  using (exists (
    select 1 from public.recipe_canvases c
    where c.id = canvas_id and c.user_id = auth.uid()
  ));

create policy "users delete own canvas elements"
  on public.canvas_elements for delete
  using (exists (
    select 1 from public.recipe_canvases c
    where c.id = canvas_id and c.user_id = auth.uid()
  ));

-- ================================================================
-- RLS: DRAWING LAYERS
-- ================================================================
alter table public.drawing_layers enable row level security;

create policy "users read own drawing layers"
  on public.drawing_layers for select
  using (exists (
    select 1 from public.recipe_canvases c
    where c.id = canvas_id and c.user_id = auth.uid()
  ));

create policy "users insert own drawing layers"
  on public.drawing_layers for insert
  with check (exists (
    select 1 from public.recipe_canvases c
    where c.id = canvas_id and c.user_id = auth.uid()
  ));

create policy "users update own drawing layers"
  on public.drawing_layers for update
  using (exists (
    select 1 from public.recipe_canvases c
    where c.id = canvas_id and c.user_id = auth.uid()
  ));

create policy "users delete own drawing layers"
  on public.drawing_layers for delete
  using (exists (
    select 1 from public.recipe_canvases c
    where c.id = canvas_id and c.user_id = auth.uid()
  ));

-- ================================================================
-- RLS: DRAWING STROKES
-- ================================================================
alter table public.drawing_strokes enable row level security;

create policy "users read own strokes"
  on public.drawing_strokes for select
  using (exists (
    select 1 from public.drawing_layers l
    join public.recipe_canvases c on c.id = l.canvas_id
    where l.id = layer_id and c.user_id = auth.uid()
  ));

create policy "users insert own strokes"
  on public.drawing_strokes for insert
  with check (exists (
    select 1 from public.drawing_layers l
    join public.recipe_canvases c on c.id = l.canvas_id
    where l.id = layer_id and c.user_id = auth.uid()
  ));

create policy "users delete own strokes"
  on public.drawing_strokes for delete
  using (exists (
    select 1 from public.drawing_layers l
    join public.recipe_canvases c on c.id = l.canvas_id
    where l.id = layer_id and c.user_id = auth.uid()
  ));

-- ================================================================
-- RLS: USER IMAGES
-- ================================================================
alter table public.user_images enable row level security;

create policy "users read own images"
  on public.user_images for select using (auth.uid() = user_id);

create policy "users insert own images"
  on public.user_images for insert with check (auth.uid() = user_id);

create policy "users delete own images"
  on public.user_images for delete using (auth.uid() = user_id);

-- ================================================================
-- RLS: BOOK PAGES
-- ================================================================
alter table public.book_pages enable row level security;

create policy "users read own book pages"
  on public.book_pages for select using (auth.uid() = user_id);

create policy "users insert own book pages"
  on public.book_pages for insert with check (auth.uid() = user_id);

create policy "users update own book pages"
  on public.book_pages for update using (auth.uid() = user_id);

create policy "users delete own book pages"
  on public.book_pages for delete using (auth.uid() = user_id);

-- ================================================================
-- RLS: PDF EXPORTS
-- ================================================================
alter table public.pdf_exports enable row level security;

create policy "users read own pdf exports"
  on public.pdf_exports for select using (auth.uid() = user_id);

create policy "users insert own pdf exports"
  on public.pdf_exports for insert with check (auth.uid() = user_id);

-- ================================================================
-- RLS: PRINT ORDERS
-- ================================================================
alter table public.print_orders enable row level security;

create policy "users read own print orders"
  on public.print_orders for select using (auth.uid() = user_id);

create policy "users insert own print orders"
  on public.print_orders for insert with check (auth.uid() = user_id);

-- ================================================================
-- RLS: TELEGRAM
-- ================================================================
alter table public.telegram_connections enable row level security;

create policy "users read own telegram connection"
  on public.telegram_connections for select using (auth.uid() = user_id);

alter table public.telegram_jobs enable row level security;

create policy "users read own telegram jobs"
  on public.telegram_jobs for select using (auth.uid() = user_id);

-- ================================================================
-- RLS: AI JOBS
-- ================================================================
alter table public.ai_jobs enable row level security;

create policy "users read own ai jobs"
  on public.ai_jobs for select using (auth.uid() = user_id);
