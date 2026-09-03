-- ============================================================
-- 1. Table
-- ============================================================
create table public.assets (
  id          uuid primary key default gen_random_uuid(),
  manual_id   uuid not null references public.manuals(id) on delete cascade,
  label       text not null,
  url         text,
  asset_owner text,
  notes       text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),

  -- Only real web links. Blocks javascript:, data:, vbscript: — the
  -- public page renders these as anchors for anonymous visitors, so an
  -- unvalidated scheme here is stored XSS on an agency's branded page.
  constraint assets_url_scheme
    check (url is null or url = '' or url ~* '^https?://'),

  -- Same secret-name screening as custom fields.
  constraint assets_no_secret_labels
    check (lower(label) !~ '(password|passwd|pwd|contrase|secreto|secret|api[ _-]?key|apikey|credencial|credential|cvv)')
);

create index assets_manual_id_idx on public.assets(manual_id, sort_order);

-- ============================================================
-- 2. RLS — owner-scoped only. No anon policies, ever.
-- ============================================================
alter table public.assets enable row level security;

create policy assets_select_own on public.assets
  for select to authenticated using (exists (
    select 1 from public.manuals m
    where m.id = assets.manual_id and m.user_id = auth.uid()));
create policy assets_insert_own on public.assets
  for insert to authenticated with check (exists (
    select 1 from public.manuals m
    where m.id = assets.manual_id and m.user_id = auth.uid()));
create policy assets_update_own on public.assets
  for update to authenticated using (exists (
    select 1 from public.manuals m
    where m.id = assets.manual_id and m.user_id = auth.uid()))
  with check (exists (
    select 1 from public.manuals m
    where m.id = assets.manual_id and m.user_id = auth.uid()));
create policy assets_delete_own on public.assets
  for delete to authenticated using (exists (
    select 1 from public.manuals m
    where m.id = assets.manual_id and m.user_id = auth.uid()));

revoke all on public.assets from anon;
