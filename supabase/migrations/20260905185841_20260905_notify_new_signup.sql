/*
# Notify hello@handover.agency on new agency signup

## Purpose
Sends an internal notification email to hello@handover.agency whenever a new
agency signs up (i.e., whenever a row is inserted into public.profiles). This
is entirely database-side: no new API route, no new page, no service-role key
in the application, and no change to any application file.

## How it works
1. Enables the pg_net extension (schema: extensions) for async HTTP calls.
2. Creates a SECURITY DEFINER trigger function, notify_new_signup(), that:
   - Reads the Resend API key from Supabase Vault (vault.decrypted_secrets).
   - If the key is null/missing, returns NEW immediately — signup still succeeds.
   - Reads the new user's email from auth.users.
   - POSTs to https://api.resend.com/emails via net.http_post (async, non-blocking).
   - Wraps everything in an exception handler so no failure can ever abort the
     insert.
3. Attaches the function as an AFTER INSERT trigger on public.profiles.
4. Revokes all privileges on the function from public, anon, and authenticated —
   only the trigger itself can call it.

## Secret
The Resend API key is NOT stored in this repository or in this migration.
It must be inserted manually via:

  select vault.create_secret('<Resend API key>', 'resend_api_key', 'Resend key for signup notifications');

The function reads it from vault.decrypted_secrets by name 'resend_api_key'.

## Security
- The function is SECURITY DEFINER so it can read auth.users and vault secrets.
- search_path is locked to 'public, extensions' to prevent search_path injection.
- All privileges on the function are revoked from public, anon, authenticated.
- No failure in the notification path can block a signup (exception handler
  swallows all errors and returns NEW).
- No new table is created. No existing policy or grant is changed.
*/

-- 1. Enable pg_net for async HTTP calls
create extension if not exists pg_net with schema extensions;

-- 2. SECURITY DEFINER trigger function
create or replace function public.notify_new_signup()
returns trigger
language plpgsql
security definer
set search_path to 'public, extensions'
as $$
declare
  v_key   text;
  v_email text;
  v_body  jsonb;
begin
  -- Read the Resend API key from Vault
  select decrypted_secret into v_key
  from vault.decrypted_secrets
  where name = 'resend_api_key';

  -- If the key is not configured, signup still succeeds
  if v_key is null then
    return NEW;
  end if;

  -- Read the new user's email from auth.users
  select email into v_email
  from auth.users
  where id = NEW.user_id;

  -- Build the email body
  v_body := jsonb_build_object(
    'from',    'Handover <hello@handover.agency>',
    'to',      'hello@handover.agency',
    'subject', 'New signup: ' || coalesce(NEW.agency_name, 'Unknown agency'),
    'text',    concat(
      'Agency: ', coalesce(NEW.agency_name, '(no name)'), E'\n',
      'Email: ', coalesce(v_email, '(unknown)'), E'\n',
      'Plan: ',  coalesce(NEW.plan, 'free'), E'\n',
      'Signed up: ', to_char(NEW.created_at, 'YYYY-MM-DD HH24:MI:SS UTC')
    )
  );

  -- Send the email asynchronously (pg_net is non-blocking)
  perform net.http_post(
    url     := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_key,
      'Content-Type',   'application/json'
    ),
    body    := v_body
  );

  return NEW;

exception when others then
  -- Never let a notification failure block a signup
  return NEW;
end;
$$;

-- 3. Attach the trigger (drop first for idempotency)
drop trigger if exists notify_on_new_profile on public.profiles;
create trigger notify_on_new_profile
  after insert on public.profiles
  for each row
  execute function public.notify_new_signup();

-- 4. Revoke all privileges — only the trigger can call it
revoke all on function public.notify_new_signup() from public, anon, authenticated;

-- 5. Comment documenting the secret
comment on function public.notify_new_signup() is
  'Sends a signup notification email to hello@handover.agency via Resend. '
  'The API key is stored in Supabase Vault under the name ''resend_api_key'' '
  'and is NOT committed to the application repository.';
