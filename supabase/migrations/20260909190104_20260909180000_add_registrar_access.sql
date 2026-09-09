ALTER TABLE public.manuals ADD COLUMN IF NOT EXISTS registrar_access text;

REVOKE UPDATE ON public.manuals FROM authenticated;
GRANT UPDATE (
  client_name, site_name, site_url, platform, framework_or_theme, key_plugins,
  registrar, domain_expiry, domain_owner, registrar_access, nameservers, host,
  host_plan, host_renewal, email_provider, emergency_name, emergency_role,
  emergency_phone, emergency_email, is_published, archived_at, locale,
  signoff_domain, signoff_hosting, signoff_accounts, signoff_credentials,
  signoff_maintenance, signoff_files, signoff_person, signoff_at
) ON public.manuals TO authenticated;