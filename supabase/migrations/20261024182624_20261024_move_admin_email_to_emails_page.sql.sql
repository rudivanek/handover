/*
# Move admin email to /emails page — remove opt-out management

## Purpose
The per-account email on/off switch is being removed from the UI.
The email_optouts table and admin_send_email() stay (the function
still skips anyone in the table), but the two functions that managed
opt-outs are no longer called from any page and are dropped.

## Changes
- delete from public.email_optouts — the five rows were set by accident
  during testing, and with the switch gone there is no way to see or
  undo them.
- drop function public.admin_set_email_optout(uuid, boolean)
- drop function public.admin_email_optouts()

## What stays
- email_optouts table (empty after this migration)
- admin_send_email() unchanged — still skips anyone in email_optouts
- admin_email_log table unchanged
- admin_email_log_list() unchanged
- No other function, table, policy, grant, or trigger is touched.
*/

delete from public.email_optouts;

drop function if exists public.admin_set_email_optout(uuid, boolean);
drop function if exists public.admin_email_optouts();
