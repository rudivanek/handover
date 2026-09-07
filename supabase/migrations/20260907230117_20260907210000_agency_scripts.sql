/*
# Agency email scripts

## What this migration does

1. Creates `public.agency_scripts` — an agency's own email scripts.
   Each row is either an override of a built-in (base_key set, name null)
   or a custom script the agency invented (base_key null, name required).
   Owner-scoped to the agency via user_id.

2. Enables RLS with four owner-scoped policies (select/insert/update/delete),
   matching the manuals pattern.

3. REVOKE ALL on public.agency_scripts FROM anon — this platform grants
   everything to anon by default on new tables. Scripts are never public
   and this table is never read anonymously.

4. Adds a unique index on (user_id, base_key, language) where base_key is
   not null — one override per built-in script per language.

5. Adds CHECK constraints:
   - base_key is null or one of the four built-in keys
   - base_key is null or language is 'en'/'es' (overrides only for languages we ship)
   - base_key is not null OR name is a non-empty string (custom scripts need a title)

6. Does NOT add any CHECK constraint on subject or body. These are prose the
   agency writes and sends; a blocked-tier constraint would refuse the
   sentence "we never send passwords by email", which is exactly the
   sentence a good agency writes. Screening is warn-only, in the UI.
   This decision is recorded in a comment on the table so nobody later
   assumes it is enforced.

7. Adds an updated_at trigger (SECURITY DEFINER, SET search_path TO 'public'),
   matching the manuals pattern. updated_at is left out of the column-level
   grant so the client cannot forge it.

8. No plan gate. Editing and creating scripts is available on every plan,
   including free. No trigger, no check — a script is the agency's own
   writing and gating it would block exactly the agencies who need it most.

## What this migration does NOT do
- Does not modify get_public_manual.
- Does not touch data/email-scripts.json.
- Does not touch any existing RLS policy, column grant, or function.
- Does not touch the manuals or profiles tables.
*/

-- 1. agency_scripts table
create table if not exists public.agency_scripts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  base_key text,  -- 'presale' | 'launch' | 'postlaunch' | 'renewal', or null for a custom script
  language text not null,  -- 'en', 'es', or a free-text label like 'Français'
  name text,  -- title for custom scripts; null for overrides (takes built-in's title)
  subject text not null default '',
  body text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- base_key must be null or one of the four built-in keys
  constraint agency_scripts_base_key_check
    check (base_key is null or base_key in ('presale','launch','postlaunch','renewal')),

  -- overrides can only exist for languages the built-in exists in
  constraint agency_scripts_override_language_check
    check (base_key is null or language in ('en','es')),

  -- custom scripts (base_key is null) must have a non-empty name
  constraint agency_scripts_custom_name_required
    check (base_key is not null or (name is not null and btrim(name) <> ''))
);

comment on table public.agency_scripts is
  'Agency email scripts. No CHECK constraint on subject or body: these are prose the agency writes and sends, and a blocked-tier constraint would refuse legitimate sentences like "we never send passwords by email". Screening is warn-only in the UI.';

comment on column public.agency_scripts.base_key is
  'One of presale/launch/postlaunch/renewal for an override, or null for a custom script the agency invented.';

comment on column public.agency_scripts.language is
  'en, es, or a free-text label for a language we do not ship (e.g. Français).';

comment on column public.agency_scripts.name is
  'Title for custom scripts (required when base_key is null). Null for overrides, which take their title from the built-in.';

-- 2. Unique index: one override per built-in per language
create unique index if not exists agency_scripts_override_unique
  on public.agency_scripts (user_id, base_key, language)
  where base_key is not null;

-- 3. Enable RLS
alter table public.agency_scripts enable row level security;

-- 4. Four owner-scoped policies
drop policy if exists "select_own_agency_scripts" on public.agency_scripts;
create policy "select_own_agency_scripts" on public.agency_scripts
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "insert_own_agency_scripts" on public.agency_scripts;
create policy "insert_own_agency_scripts" on public.agency_scripts
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "update_own_agency_scripts" on public.agency_scripts;
create policy "update_own_agency_scripts" on public.agency_scripts
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "delete_own_agency_scripts" on public.agency_scripts;
create policy "delete_own_agency_scripts" on public.agency_scripts
  for delete to authenticated using (auth.uid() = user_id);

-- 5. REVOKE anon — scripts are never public
revoke all on public.agency_scripts from anon;

-- 6. updated_at trigger (SECURITY DEFINER, SET search_path)
create or replace function public.agency_scripts_set_updated_at()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_agency_scripts_updated_at on public.agency_scripts;
create trigger trg_agency_scripts_updated_at
  before update on public.agency_scripts
  for each row
  execute function public.agency_scripts_set_updated_at();
