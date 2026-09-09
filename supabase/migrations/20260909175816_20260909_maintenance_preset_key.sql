/* Add stable preset keys and backfill unchanged maintenance rows. */

ALTER TABLE public.maintenance_tasks ADD COLUMN IF NOT EXISTS preset_key text;
ALTER TABLE public.template_maintenance_tasks ADD COLUMN IF NOT EXISTS preset_key text;

ALTER TABLE public.maintenance_tasks DISABLE TRIGGER touch_manual_on_maintenance_change;

WITH presets(key, en_text, es_text) AS (VALUES
  ('uptime_monitoring', 'Uptime and security monitoring', 'Monitoreo de disponibilidad y seguridad'),
  ('automated_backups', 'Automated backups run', 'Copias de seguridad automáticas'),
  ('check_enquiries', 'Check that enquiries and form submissions have arrived', 'Revisa que hayan llegado las consultas y los envíos de formularios'),
  ('apply_updates', 'Apply platform, theme and plugin updates, tested on a copy of the site first', 'Aplica actualizaciones de plataforma, plantilla y plugins, probadas antes en una copia del sitio'),
  ('confirm_backups', 'Confirm the week''s backups completed', 'Confirma que las copias de seguridad de la semana se completaron'),
  ('test_forms_weekly', 'Send a test enquiry through each form on the site', 'Envía una consulta de prueba por cada formulario del sitio'),
  ('clear_spam', 'Review and clear spam or pending comments', 'Revisa y elimina spam y comentarios pendientes'),
  ('check_mobile', 'Check that anything newly published looks right on a phone', 'Revisa en el celular que lo que publicaste se vea bien'),
  ('review_traffic', 'Review traffic, most-visited pages and enquiry numbers', 'Revisa las visitas, las páginas más vistas y cuántas consultas llegaron'),
  ('test_all_paths', 'Test every form, booking and payment path from start to finish', 'Prueba de principio a fin cada formulario, reserva y pago'),
  ('fix_broken_links', 'Fix broken links and add redirects for pages that have moved', 'Corrige enlaces rotos y agrega redirecciones para las páginas que cambiaron de dirección'),
  ('review_speed', 'Review page speed and oversized images', 'Revisa la velocidad de carga y las imágenes demasiado pesadas'),
  ('update_content', 'Update anything that has changed: staff, prices, opening hours, photos', 'Actualiza lo que haya cambiado: equipo, precios, horarios, fotos'),
  ('review_users', 'Review who can sign in to the site and remove anyone who has left', 'Revisa quién puede entrar al sitio y quita a quien ya no trabaje contigo'),
  ('renew_domain', 'Renew the domain and confirm the registrant contact details are still current', 'Renueva el dominio y confirma que los datos de contacto del titular sigan vigentes'),
  ('renew_hosting', 'Renew hosting and confirm the SSL certificate is valid', 'Renueva el hosting y confirma que el certificado SSL esté vigente'),
  ('renew_licences', 'Renew theme and plugin licences', 'Renueva las licencias de plantilla y plugins'),
  ('restore_backup_test', 'Restore a backup to a test site, to prove the backups actually work', 'Restaura una copia de seguridad en un sitio de prueba, para comprobar que las copias sirven'),
  ('review_policies', 'Review the privacy policy, cookie notice and terms', 'Revisa el aviso de privacidad, el aviso de cookies y los términos'),
  ('review_accessibility', 'Review the site against WCAG 2.2 AA accessibility guidelines', 'Revisa el sitio contra las pautas de accesibilidad WCAG 2.2 AA'),
  ('annual_review', 'Review what the website achieved this year and plan the next round of work', 'Revisa qué logró el sitio este año y planea el siguiente tramo de trabajo')
)
UPDATE public.maintenance_tasks AS mt
SET preset_key = p.key
FROM presets p
WHERE mt.task = p.en_text OR mt.task = p.es_text;

WITH presets(key, en_text, es_text) AS (VALUES
  ('uptime_monitoring', 'Uptime and security monitoring', 'Monitoreo de disponibilidad y seguridad'),
  ('automated_backups', 'Automated backups run', 'Copias de seguridad automáticas'),
  ('check_enquiries', 'Check that enquiries and form submissions have arrived', 'Revisa que hayan llegado las consultas y los envíos de formularios'),
  ('apply_updates', 'Apply platform, theme and plugin updates, tested on a copy of the site first', 'Aplica actualizaciones de plataforma, plantilla y plugins, probadas antes en una copia del sitio'),
  ('confirm_backups', 'Confirm the week''s backups completed', 'Confirma que las copias de seguridad de la semana se completaron'),
  ('test_forms_weekly', 'Send a test enquiry through each form on the site', 'Envía una consulta de prueba por cada formulario del sitio'),
  ('clear_spam', 'Review and clear spam or pending comments', 'Revisa y elimina spam y comentarios pendientes'),
  ('check_mobile', 'Check that anything newly published looks right on a phone', 'Revisa en el celular que lo que publicaste se vea bien'),
  ('review_traffic', 'Review traffic, most-visited pages and enquiry numbers', 'Revisa las visitas, las páginas más vistas y cuántas consultas llegaron'),
  ('test_all_paths', 'Test every form, booking and payment path from start to finish', 'Prueba de principio a fin cada formulario, reserva y pago'),
  ('fix_broken_links', 'Fix broken links and add redirects for pages that have moved', 'Corrige enlaces rotos y agrega redirecciones para las páginas que cambiaron de dirección'),
  ('review_speed', 'Review page speed and oversized images', 'Revisa la velocidad de carga y las imágenes demasiado pesadas'),
  ('update_content', 'Update anything that has changed: staff, prices, opening hours, photos', 'Actualiza lo que haya cambiado: equipo, precios, horarios, fotos'),
  ('review_users', 'Review who can sign in to the site and remove anyone who has left', 'Revisa quién puede entrar al sitio y quita a quien ya no trabaje contigo'),
  ('renew_domain', 'Renew the domain and confirm the registrant contact details are still current', 'Renueva el dominio y confirma que los datos de contacto del titular sigan vigentes'),
  ('renew_hosting', 'Renew hosting and confirm the SSL certificate is valid', 'Renueva el hosting y confirma que el certificado SSL esté vigente'),
  ('renew_licences', 'Renew theme and plugin licences', 'Renueva las licencias de plantilla y plugins'),
  ('restore_backup_test', 'Restore a backup to a test site, to prove the backups actually work', 'Restaura una copia de seguridad en un sitio de prueba, para comprobar que las copias sirven'),
  ('review_policies', 'Review the privacy policy, cookie notice and terms', 'Revisa el aviso de privacidad, el aviso de cookies y los términos'),
  ('review_accessibility', 'Review the site against WCAG 2.2 AA accessibility guidelines', 'Revisa el sitio contra las pautas de accesibilidad WCAG 2.2 AA'),
  ('annual_review', 'Review what the website achieved this year and plan the next round of work', 'Revisa qué logró el sitio este año y planea el siguiente tramo de trabajo')
)
UPDATE public.template_maintenance_tasks AS tmt
SET preset_key = p.key
FROM presets p
WHERE tmt.task = p.en_text OR tmt.task = p.es_text;

WITH presets(key, en_text, es_text) AS (VALUES
  ('uptime_monitoring', 'Uptime and security monitoring', 'Monitoreo de disponibilidad y seguridad'),
  ('automated_backups', 'Automated backups run', 'Copias de seguridad automáticas'),
  ('check_enquiries', 'Check that enquiries and form submissions have arrived', 'Revisa que hayan llegado las consultas y los envíos de formularios'),
  ('apply_updates', 'Apply platform, theme and plugin updates, tested on a copy of the site first', 'Aplica actualizaciones de plataforma, plantilla y plugins, probadas antes en una copia del sitio'),
  ('confirm_backups', 'Confirm the week''s backups completed', 'Confirma que las copias de seguridad de la semana se completaron'),
  ('test_forms_weekly', 'Send a test enquiry through each form on the site', 'Envía una consulta de prueba por cada formulario del sitio'),
  ('clear_spam', 'Review and clear spam or pending comments', 'Revisa y elimina spam y comentarios pendientes'),
  ('check_mobile', 'Check that anything newly published looks right on a phone', 'Revisa en el celular que lo que publicaste se vea bien'),
  ('review_traffic', 'Review traffic, most-visited pages and enquiry numbers', 'Revisa las visitas, las páginas más vistas y cuántas consultas llegaron'),
  ('test_all_paths', 'Test every form, booking and payment path from start to finish', 'Prueba de principio a fin cada formulario, reserva y pago'),
  ('fix_broken_links', 'Fix broken links and add redirects for pages that have moved', 'Corrige enlaces rotos y agrega redirecciones para las páginas que cambiaron de dirección'),
  ('review_speed', 'Review page speed and oversized images', 'Revisa la velocidad de carga y las imágenes demasiado pesadas'),
  ('update_content', 'Update anything that has changed: staff, prices, opening hours, photos', 'Actualiza lo que haya cambiado: equipo, precios, horarios, fotos'),
  ('review_users', 'Review who can sign in to the site and remove anyone who has left', 'Revisa quién puede entrar al sitio y quita a quien ya no trabaje contigo'),
  ('renew_domain', 'Renew the domain and confirm the registrant contact details are still current', 'Renueva el dominio y confirma que los datos de contacto del titular sigan vigentes'),
  ('renew_hosting', 'Renew hosting and confirm the SSL certificate is valid', 'Renueva el hosting y confirma que el certificado SSL esté vigente'),
  ('renew_licences', 'Renew theme and plugin licences', 'Renueva las licencias de plantilla y plugins'),
  ('restore_backup_test', 'Restore a backup to a test site, to prove the backups actually work', 'Restaura una copia de seguridad en un sitio de prueba, para comprobar que las copias sirven'),
  ('review_policies', 'Review the privacy policy, cookie notice and terms', 'Revisa el aviso de privacidad, el aviso de cookies y los términos'),
  ('review_accessibility', 'Review the site against WCAG 2.2 AA accessibility guidelines', 'Revisa el sitio contra las pautas de accesibilidad WCAG 2.2 AA'),
  ('annual_review', 'Review what the website achieved this year and plan the next round of work', 'Revisa qué logró el sitio este año y planea el siguiente tramo de trabajo')
)
UPDATE public.maintenance_tasks AS mt
SET task = CASE WHEN m.locale = 'es' THEN p.es_text ELSE p.en_text END
FROM presets p, public.manuals m
WHERE m.id = mt.manual_id
  AND mt.preset_key = p.key
  AND mt.task <> CASE WHEN m.locale = 'es' THEN p.es_text ELSE p.en_text END;

ALTER TABLE public.maintenance_tasks ENABLE TRIGGER touch_manual_on_maintenance_change;
