/*
# Admin email — send to selected accounts + opt-out management

## Purpose
Adds the ability for the admin to select accounts on /admin and send them
an email through Resend, with per-account opt-out management and a send log.
All email sending happens inside the database via pg_net + Resend, exactly
like notify_new_signup(). No API route, no server action, no edge function,
no service-role key in the app.

## New tables

### public.email_optouts
- user_id uuid primary key references auth.users(id) on delete cascade
- created_at timestamptz not null default now()
- RLS enabled, NO policies. All privileges revoked from anon, authenticated, public.
  Read and written only through admin_* SECURITY DEFINER functions.
- Comment documents purpose and design.

### public.admin_email_log
- id bigserial primary key
- sent_at timestamptz not null default now()
- sent_by uuid not null
- subject text not null
- body text not null
- recipient_count int not null
- skipped_optout int not null default 0
- request_ids bigint[] not null default '{}'
- RLS enabled, NO policies. All privileges revoked from anon, authenticated, public.
- No CHECK constraints on subject/body — these are admin-written prose.

## New functions

### public.admin_send_email(p_user_ids uuid[], p_subject text, p_body text) returns jsonb
- SECURITY DEFINER, set search_path to 'public, extensions', language plpgsql.
- is_admin() check as first statement.
- Validates subject (1–200 trimmed), body (1–10000 trimmed), user_ids (1–500 after dedup/null removal).
- Reads resend_api_key from vault.decrypted_secrets. Raises 'email key not set' if null.
- Joins ids to auth.users for email, excludes opt-outs and null emails.
- Each recipient gets their own email object (one address per `to`).
- From: Handover <news@handover.agency>, reply_to: hello@handover.agency.
- Footer appended to body text.
- Sends via Resend batch endpoint, chunks of 100.
- Collects request ids, inserts one admin_email_log row.
- Returns { queued, skipped_optout, log_id }.
- Does NOT swallow errors.

### public.admin_set_email_optout(p_user_id uuid, p_opted_out boolean) returns void
- SECURITY DEFINER, set search_path to 'public'. is_admin() check first.
- true → insert (on conflict do nothing); false → delete.

### public.admin_email_optouts() returns setof uuid
- SECURITY DEFINER, stable, set search_path to 'public'. is_admin() check first.
- Returns all user_id values from email_optouts.

### public.admin_email_log_list() returns table(...)
- SECURITY DEFINER, stable, set search_path to 'public, extensions'. is_admin() check first.
- Returns 50 most recent log rows, newest first.
- Counts requests_ok (status 200–299 in net._http_response) and requests_failed.

## Security
- All functions: is_admin() gate, EXECUTE granted to authenticated only,
  revoked from anon and public.
- Tables: RLS on, no policies, all privileges revoked.
- No existing function, policy, grant, trigger, or table is changed.
*/

-- 1. email_optouts table
create table if not exists public.email_optouts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.email_optouts enable row level security;
revoke all on public.email_optouts from anon, authenticated, public;

comment on table public.email_optouts is
  'Accounts the admin has marked as not wanting admin emails. '
  'RLS on with no policies by design: read and written only through '
  'admin_* SECURITY DEFINER functions.';

-- 2. admin_email_log table
create table if not exists public.admin_email_log (
  id bigserial primary key,
  sent_at timestamptz not null default now(),
  sent_by uuid not null,
  subject text not null,
  body text not null,
  recipient_count int not null,
  skipped_optout int not null default 0,
  request_ids bigint[] not null default '{}'
);

alter table public.admin_email_log enable row level security;
revoke all on public.admin_email_log from anon, authenticated, public;

-- 3. admin_send_email()
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
  v_response jsonb;
  v_req_id bigint;
  v_log_id bigint;
  v_footer text := E'\n\n—\nYou''re receiving this because you have a Handover account.\nTo stop these emails, reply with "unsubscribe".';
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
    -- Extract chunk of up to 100
    select jsonb_path_query_array(
      v_recipients,
      '$[' || (i * 100) || ' to ' || least((i + 1) * 100 - 1, v_recipient_count - 1) || ']'
    ) into v_chunk;

    -- Send via Resend batch endpoint
    v_response := net.http_post(
      url := 'https://api.resend.com/emails/batch',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || v_key,
        'Content-Type', 'application/json'
      ),
      body := v_chunk
    );

    -- Extract request id from the response
    v_req_id := (v_response->>'id')::bigint;
    if v_req_id is not null then
      v_request_ids := array_append(v_request_ids, v_req_id);
    end if;
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

-- 4. admin_set_email_optout()
create or replace function public.admin_set_email_optout(
  p_user_id uuid,
  p_opted_out boolean
) returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  if p_opted_out then
    insert into public.email_optouts (user_id)
    values (p_user_id)
    on conflict (user_id) do nothing;
  else
    delete from public.email_optouts where user_id = p_user_id;
  end if;
end;
$$;

grant execute on function public.admin_set_email_optout(uuid, boolean) to authenticated;
revoke execute on function public.admin_set_email_optout(uuid, boolean) from anon, public;

-- 5. admin_email_optouts()
create or replace function public.admin_email_optouts()
returns setof uuid
language plpgsql
security definer
stable
set search_path to 'public'
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  return query
  select user_id from public.email_optouts;
end;
$$;

grant execute on function public.admin_email_optouts() to authenticated;
revoke execute on function public.admin_email_optouts() from anon, public;

-- 6. admin_email_log_list()
create or replace function public.admin_email_log_list()
returns table (
  id bigint,
  sent_at timestamptz,
  subject text,
  recipient_count int,
  skipped_optout int,
  requests int,
  requests_ok int,
  requests_failed int
)
language plpgsql
security definer
stable
set search_path to 'public, extensions'
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  return query
  select
    l.id,
    l.sent_at,
    l.subject,
    l.recipient_count,
    l.skipped_optout,
    coalesce(array_length(l.request_ids, 1), 0) as requests,
    (
      select count(*)::int
      from net._http_response r
      where r.id = any(l.request_ids)
        and r.status_code between 200 and 299
    ) as requests_ok,
    (
      select count(*)::int
      from net._http_response r
      where r.id = any(l.request_ids)
        and (r.status_code < 200 or r.status_code > 299)
    ) as requests_failed
  from public.admin_email_log l
  order by l.sent_at desc
  limit 50;
end;
$$;

grant execute on function public.admin_email_log_list() to authenticated;
revoke execute on function public.admin_email_log_list() from anon, public;
