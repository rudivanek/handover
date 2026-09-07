/*
# Admin Resend API key management

## 1. admin_set_resend_key(p_key text) returns void
SECURITY DEFINER, SET search_path TO 'public', LANGUAGE plpgsql.
- is_admin() check as first statement
- rejects empty/whitespace-only key
- upserts into vault.secrets under name 'resend_api_key'
- never logs, returns, or raises the key value

## 2. admin_resend_key_status() returns boolean
Same security settings, admin-gated.
- returns true if a secret named 'resend_api_key' exists, false otherwise
- never returns the secret value, not even masked

Both functions: grant execute to authenticated; revoke from anon and public.
The is_admin() check inside each function is the real gate — the grant is not.
*/

-- 1. admin_set_resend_key()
create or replace function public.admin_set_resend_key(p_key text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  if p_key is null or btrim(p_key) = '' then
    raise exception 'key must not be empty';
  end if;

  select id into v_id from vault.secrets where name = 'resend_api_key';

  if v_id is not null then
    perform vault.update_secret(v_id, p_key);
  else
    perform vault.create_secret(p_key, 'resend_api_key', 'Resend key for signup notifications');
  end if;
end;
$$;

grant execute on function public.admin_set_resend_key(text) to authenticated;
revoke execute on function public.admin_set_resend_key(text) from anon, public;

-- 2. admin_resend_key_status()
create or replace function public.admin_resend_key_status()
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_exists boolean;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  select exists(select 1 from vault.secrets where name = 'resend_api_key') into v_exists;

  return v_exists;
end;
$$;

grant execute on function public.admin_resend_key_status() to authenticated;
revoke execute on function public.admin_resend_key_status() from anon, public;
