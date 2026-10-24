/*
# Fix admin_send_email — chunk extraction and request id capture

## Purpose
Fixes two bugs in public.admin_send_email() introduced in migration
20261024180013_20261017_admin_email_accounts.sql.

## Bug 1 — chunk extraction fails (error 42883)
The chunking line used jsonb_path_query_array(v_recipients, text),
but Postgres has no overload taking (jsonb, text) — it requires a
jsonpath literal. Every call raised error 42883, so no email was ever
sent. Replaced with jsonb_array_elements with ordinality to extract
elements in positions i*100+1 through (i+1)*100.

## Bug 2 — request_ids always empty
net.http_post(...) returns a bigint request id, not jsonb. The old code
assigned the result to v_response jsonb and read v_response->>'id',
which was always null, so request_ids was always '{}' and the send log
could never show Sent or Failed. Now assigns the bigint directly to
v_req_id and appends it. The v_response variable is removed.

## Sequence grant
Revokes all on admin_email_log_id_seq from anon, authenticated, public.
The log is written only inside the SECURITY DEFINER function, so no
client role needs sequence access.

## What is NOT changed
- Same signature, return type, SECURITY DEFINER, search_path, grants, revokes.
- is_admin() check remains the first statement.
- Validation, opt-out counting, one recipient per email object,
  sender, reply_to, footer, zero-recipient log path, and no error
  swallowing are all unchanged.
- No other function, table, policy, or page is touched.
*/

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

-- Revoke sequence access — the log is written only inside the SECURITY DEFINER function
revoke all on sequence public.admin_email_log_id_seq from anon, authenticated, public;
