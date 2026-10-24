/*
# Editable email signature on /emails

## Purpose
The admin can edit an email signature on /emails. admin_send_email()
appends it to every email above the fixed unsubscribe line.

## New table: public.admin_settings
- key text primary key
- value text not null
- updated_at timestamptz not null default now()
- RLS on, no policies, all privileges revoked from anon, authenticated, public.
- Seeded with email_signature row.

## New functions
- admin_get_email_signature() returns text — STABLE, SECURITY DEFINER,
  is_admin() gate. Returns the signature value or ''.
- admin_set_email_signature(p_value text) returns void — SECURITY DEFINER,
  is_admin() gate. Validates not null, max 2000 chars. Upserts.

## Replaced function
- admin_send_email(uuid[], text, text) — same signature, security, grants.
  Only the footer construction changes: reads email_signature once,
  builds body + separator + signature (if non-empty) + unsubscribe lines.

## What is NOT changed
- admin_overview(), admin_email_log_list(), notify_new_signup(),
  email_optouts table, admin_email_log table — all untouched.
- No other function, table, policy, grant, or trigger is modified.
*/

-- 1. admin_settings table
create table if not exists public.admin_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.admin_settings enable row level security;
revoke all on public.admin_settings from anon, authenticated, public;

comment on table public.admin_settings is
  'Admin-only settings, key/value. RLS on with no policies by design: '
  'read and written only through admin_* SECURITY DEFINER functions.';

-- Seed the email signature
insert into public.admin_settings (key, value)
values (
  'email_signature',
  'Rudolf Vanek
Handover · https://handover.agency

Your manuals: https://app.handover.agency
Help & how-tos: https://handover.agency/help.html'
)
on conflict (key) do nothing;

-- 2. admin_get_email_signature()
create or replace function public.admin_get_email_signature()
returns text
language plpgsql
security definer
stable
set search_path to 'public'
as $$
declare
  v_value text;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  select value into v_value
  from public.admin_settings
  where key = 'email_signature';

  return coalesce(v_value, '');
end;
$$;

grant execute on function public.admin_get_email_signature() to authenticated;
revoke execute on function public.admin_get_email_signature() from anon, public;

-- 3. admin_set_email_signature()
create or replace function public.admin_set_email_signature(p_value text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  if p_value is null then
    raise exception 'signature cannot be null';
  end if;

  if length(p_value) > 2000 then
    raise exception 'signature must be at most 2000 characters';
  end if;

  insert into public.admin_settings (key, value, updated_at)
  values ('email_signature', p_value, now())
  on conflict (key) do update
    set value = excluded.value,
        updated_at = now();
end;
$$;

grant execute on function public.admin_set_email_signature(text) to authenticated;
revoke execute on function public.admin_set_email_signature(text) from anon, public;

-- 4. Replace admin_send_email() — only the footer construction changes
create or replace function public.admin_send_email(
  p_user_ids uuid[],
  p_subject text,
  p_body text
) returns jsonb
language plpgsql
security definer
set search_path to 'public, extensions'
as $$
declare
  v_key text;
  v_ids uuid[];
  v_recipients jsonb;
  v_recipient_count int;
  v_skipped_optout int;
  v_request_ids bigint[] := '{}';
  v_chunk jsonb;
  v_req_id bigint;
  v_log_id bigint;
  v_signature text;
  v_footer text;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  -- Validate subject
  if length(btrim(coalesce(p_subject, ''))) < 1
     or length(btrim(coalesce(p_subject, ''))) > 200 then
    raise exception 'subject must be 1–200 characters';
  end if;

  -- Validate body
  if length(btrim(coalesce(p_body, ''))) < 1
     or length(btrim(coalesce(p_body, ''))) > 10000 then
    raise exception 'body must be 1–10000 characters';
  end if;

  -- De-duplicate and remove nulls from user_ids
  select array_agg(distinct x) into v_ids
  from unnest(p_user_ids) as x
  where x is not null;

  if v_ids is null or array_length(v_ids, 1) < 1 or array_length(v_ids, 1) > 500 then
    raise exception 'user_ids must contain 1–500 unique non-null values';
  end if;

  -- Read the Resend API key from Vault
  select decrypted_secret into v_key
  from vault.decrypted_secrets
  where name = 'resend_api_key';

  if v_key is null then
    raise exception 'email key not set';
  end if;

  -- Count opted-out ids
  select count(*)::int into v_skipped_optout
  from public.email_optouts
  where user_id = any(v_ids);

  -- Read the email signature once per call
  select value into v_signature
  from public.admin_settings
  where key = 'email_signature';

  v_signature := btrim(coalesce(v_signature, ''));

  -- Build the footer: separator + signature (if non-empty) + unsubscribe lines
  if v_signature = '' then
    v_footer := E'\n\n—\nYou''re receiving this because you have a Handover account.\nTo stop these emails, reply with "unsubscribe".';
  else
    v_footer := E'\n\n—\n' || v_signature || E'\n\nYou''re receiving this because you have a Handover account.\nTo stop these emails, reply with "unsubscribe".';
  end if;

  -- Build recipient list: join to auth.users, exclude opt-outs and null emails
  select jsonb_agg(jsonb_build_object(
    'from', 'Handover <news@handover.agency>',
    'reply_to', 'hello@handover.agency',
    'to', u.email,
    'subject', p_subject,
    'text', p_body || v_footer
  ))
  into v_recipients
  from auth.users u
  where u.id = any(v_ids)
    and u.email is not null
    and not exists (
      select 1 from public.email_optouts eo where eo.user_id = u.id
    );

  v_recipient_count := coalesce(jsonb_array_length(v_recipients), 0);

  if v_recipient_count = 0 then
    -- Still log the attempt
    insert into public.admin_email_log (sent_by, subject, body, recipient_count, skipped_optout, request_ids)
    values (auth.uid(), p_subject, p_body, 0, v_skipped_optout, '{}')
    returning id into v_log_id;

    return jsonb_build_object(
      'queued', 0,
      'skipped_optout', v_skipped_optout,
      'log_id', v_log_id
    );
  end if;

  -- Send in chunks of 100
  for i in 0..((v_recipient_count - 1) / 100) loop
    -- Extract chunk of up to 100 using array_elements with ordinality
    select jsonb_agg(e order by ord)
    into v_chunk
    from jsonb_array_elements(v_recipients) with ordinality as t(e, ord)
    where ord > i * 100
      and ord <= (i + 1) * 100;

    -- Send via Resend batch endpoint — net.http_post returns a bigint request id
    v_req_id := net.http_post(
      url := 'https://api.resend.com/emails/batch',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || v_key,
        'Content-Type', 'application/json'
      ),
      body := v_chunk
    );
    v_request_ids := array_append(v_request_ids, v_req_id);
  end loop;

  -- Log the send
  insert into public.admin_email_log (sent_by, subject, body, recipient_count, skipped_optout, request_ids)
  values (auth.uid(), p_subject, p_body, v_recipient_count, v_skipped_optout, v_request_ids)
  returning id into v_log_id;

  return jsonb_build_object(
    'queued', v_recipient_count,
    'skipped_optout', v_skipped_optout,
    'log_id', v_log_id
  );
end;
$$;

grant execute on function public.admin_send_email(uuid[], text, text) to authenticated;
revoke execute on function public.admin_send_email(uuid[], text, text) from anon, public;
