do $$
declare
  v_user   uuid := '2d941a8a-272e-42f5-8e08-c6b7305865c5';
  v_manual uuid := gen_random_uuid();
  s_booking uuid := gen_random_uuid();
  s_analytics uuid := gen_random_uuid();
  s_access uuid := gen_random_uuid();
  s_wrong uuid := gen_random_uuid();
begin

-- ============================================================
-- Agency profile (fictional)
-- ============================================================
insert into public.profiles (
  user_id, agency_name, brand_color, support_email, support_hours,
  emergency_phone, agency_website, plan, ui_locale,
  heading_font_key, body_font_key
) values (
  v_user, 'Northsmith & Co', '#B4472F',
  'support@northsmith.example', 'Monday to Friday, 9am–6pm (GMT)',
  '+44 20 7946 0812', 'https://northsmith.example', 'paid', 'en',
  'lora', 'work-sans'
)
on conflict (user_id) do update set
  agency_name = excluded.agency_name,
  brand_color = excluded.brand_color,
  support_email = excluded.support_email,
  support_hours = excluded.support_hours,
  emergency_phone = excluded.emergency_phone,
  agency_website = excluded.agency_website,
  plan = 'paid',
  heading_font_key = excluded.heading_font_key,
  body_font_key = excluded.body_font_key;

-- Remove any previous copy so this migration can be re-run safely
delete from public.manuals where slug = 'aurora-dental-4k2m9x';

-- ============================================================
-- The manual
-- ============================================================
insert into public.manuals (
  id, user_id, slug, client_name, site_name, site_url, platform,
  framework_or_theme, key_plugins, registrar, domain_expiry, domain_owner,
  nameservers, host, host_plan, host_renewal, email_provider,
  emergency_name, emergency_role, emergency_phone, emergency_email, locale
) values (
  v_manual, v_user, 'aurora-dental-4k2m9x',
  'Aurora Dental Studio',
  'Aurora Dental Studio',
  'https://www.auroradental.example',
  'WordPress 6.6',
  'Kadence, with a child theme built by Northsmith & Co',
  array['Kadence Blocks','WP Rocket','Rank Math SEO','Gravity Forms','UpdraftPlus','Wordfence'],
  'Hover',
  '2027-03-14',
  'Aurora Dental Studio Ltd — account held by Dr. Elena Okafor',
  'ns1.cloudflare.com, ns2.cloudflare.com',
  'Kinsta',
  'Starter (20,000 visits/month)',
  '2027-01-09',
  'Google Workspace',
  'Marcus Reed', 'Account lead, Northsmith & Co',
  '+44 20 7946 0812', 'marcus@northsmith.example',
  'en'
);

-- ============================================================
-- Accounts — who owns what. No passwords, ever.
-- ============================================================
insert into public.accounts (manual_id, service, account_owner, admin_email) values
  (v_manual, 'Domain registrar (Hover)', 'Aurora Dental Studio', 'elena@auroradental.example'),
  (v_manual, 'DNS (Cloudflare)', 'Aurora Dental Studio', 'elena@auroradental.example'),
  (v_manual, 'Hosting (Kinsta)', 'Northsmith & Co, billed to Aurora', 'ops@northsmith.example'),
  (v_manual, 'WordPress admin', 'Aurora Dental Studio', 'elena@auroradental.example'),
  (v_manual, 'Google Workspace', 'Aurora Dental Studio', 'elena@auroradental.example'),
  (v_manual, 'Google Business Profile', 'Aurora Dental Studio', 'reception@auroradental.example'),
  (v_manual, 'Booking system (Dentally)', 'Aurora Dental Studio', 'reception@auroradental.example');

-- ============================================================
-- How to edit your site
-- ============================================================
insert into public.edit_blocks (manual_id, block_name, instructions) values
  (v_manual, 'Page text and images',
   'Sign in at auroradental.example/wp-admin and choose Pages. Hover the page you want and click Edit. Text blocks can be typed into directly; to swap an image, click it and choose Replace. Click Update at the top right to publish. Changes are live immediately — there is no separate publish step.'),
  (v_manual, 'Treatment pages',
   'Each treatment has its own page under Pages → Treatments. Copy an existing one (Duplicate) rather than starting from scratch, so the layout and enquiry form come with it. Update the heading, body text and price, then set the featured image before publishing.'),
  (v_manual, 'Team members',
   'Team → All Team Members. Each entry needs a name, role, short bio and a portrait at least 800px wide. Order is set by the number in the Order field — lower numbers appear first. New members appear on the About page automatically.'),
  (v_manual, 'Opening hours and holiday closures',
   'Appearance → Customise → Site Settings → Opening Hours. This single block feeds the footer, the contact page and your Google Business Profile listing, so change it here rather than editing each page. For a holiday closure, add a note in the Announcement field — it shows as a banner across the top of the site until you clear it.'),
  (v_manual, 'Blog posts and news',
   'Posts → Add New. Write the post, set a featured image at 1200×630 for social sharing, choose a category, then Publish. Posts appear on the News page newest first, and the three most recent show on the homepage.'),
  (v_manual, 'Forms and where enquiries go',
   'Forms are built in Gravity Forms and send to reception@auroradental.example. To change that address, go to Forms → the form → Settings → Notifications. Every submission is also stored in Forms → Entries as a backup, so nothing is lost if an email bounces.');

-- ============================================================
-- What the retainer covers
-- ============================================================
insert into public.coverage (manual_id, item, included) values
  (v_manual, 'WordPress core, theme and plugin updates, applied monthly after testing on a staging copy', true),
  (v_manual, 'Daily offsite backups, kept for 30 days, with restore on request', true),
  (v_manual, 'Security monitoring, malware scanning and firewall rules', true),
  (v_manual, 'Uptime monitoring with alerts to Northsmith & Co within 5 minutes', true),
  (v_manual, 'Up to 2 hours of small content changes each month', true),
  (v_manual, 'Emergency response within 4 working hours for a site that is down', true),
  (v_manual, 'Quarterly performance and SEO health report', true),
  (v_manual, 'New pages, new templates or design changes beyond small edits', false),
  (v_manual, 'Copywriting, photography and video production', false),
  (v_manual, 'Paid advertising, Google Ads management and social media', false),
  (v_manual, 'Third-party licence and subscription fees (hosting, plugins, booking system)', false),
  (v_manual, 'Recovering the site after changes made by someone outside Northsmith & Co', false);

-- ============================================================
-- Files & assets — where things live, never the files themselves
-- ============================================================
insert into public.assets (manual_id, label, url, asset_owner, notes, sort_order) values
  (v_manual, 'Brand guidelines (PDF)', 'https://drive.google.com/drive/folders/example-brand', 'Aurora Dental Studio — Google Drive', 'Colours, logo usage and typography', 1),
  (v_manual, 'Logo files (SVG, PNG)', 'https://drive.google.com/drive/folders/example-logos', 'Aurora Dental Studio — Google Drive', 'Full colour, single colour and reversed versions', 2),
  (v_manual, 'Website design files', 'https://www.figma.com/file/example-aurora', 'Northsmith & Co — Figma', 'Read-only link. Ask us for edit access.', 3),
  (v_manual, 'Practice photography', 'https://drive.google.com/drive/folders/example-photos', 'Aurora Dental Studio — Google Drive', 'Shot March 2026. Licence is unlimited and perpetual.', 4);

-- ============================================================
-- Custom sections
-- ============================================================
insert into public.custom_sections (id, manual_id, title, position) values
  (s_booking,   v_manual, 'Online booking',          1),
  (s_analytics, v_manual, 'Analytics and reporting', 2),
  (s_access,    v_manual, 'Accessibility',           3),
  (s_wrong,     v_manual, 'When something goes wrong', 4);

insert into public.custom_fields (manual_id, section_type, section_key, label, value, position) values
  (v_manual, 'custom', s_booking::text, 'Booking provider', 'Dentally, embedded on the Book Online page', 1),
  (v_manual, 'custom', s_booking::text, 'Who manages availability', 'Your reception team, in the Dentally dashboard. Slots on the website update within a few minutes of any change.', 2),
  (v_manual, 'custom', s_booking::text, 'If the booking widget stops loading', 'It is almost always Dentally rather than the website. Check status.dentally.example first, then contact us if their status page looks normal.', 3),

  (v_manual, 'custom', s_analytics::text, 'Analytics', 'Google Analytics 4, property "Aurora Dental Studio". Access is under your Google Workspace account.', 1),
  (v_manual, 'custom', s_analytics::text, 'Search Console', 'Verified via the DNS record on Cloudflare. Do not remove that record — verification is lost and search reporting stops.', 2),
  (v_manual, 'custom', s_analytics::text, 'Cookie consent', 'Analytics only loads after a visitor accepts cookies, so figures are lower than raw traffic. This is deliberate and required.', 3),
  (v_manual, 'custom', s_analytics::text, 'Your quarterly report', 'Sent by email in the first week of January, April, July and October. It covers traffic, enquiries, page speed and anything we recommend changing.', 4),

  (v_manual, 'custom', s_access::text, 'Standard the site was built to', 'WCAG 2.2 level AA at handover, tested with keyboard navigation and a screen reader.', 1),
  (v_manual, 'custom', s_access::text, 'What can undo it', 'Uploading images without alt text, pasting coloured text from Word, or embedding a third-party widget we have not checked. If in doubt, ask before publishing.', 2),
  (v_manual, 'custom', s_access::text, 'Adding alt text', 'When you upload an image in WordPress, fill the "Alternative text" box with a plain description of what the image shows. Leave it empty only for decorative images.', 3),

  (v_manual, 'custom', s_wrong::text, 'The site is completely down', 'Call the emergency number in this manual. Our monitoring usually alerts us before you notice, but call anyway — it tells us it is affecting you.', 1),
  (v_manual, 'custom', s_wrong::text, 'A page looks broken after an edit', 'In WordPress, open the page, click the three dots at the top right and choose Revisions. Select the version from before your change and restore it. Nothing is lost permanently.', 2),
  (v_manual, 'custom', s_wrong::text, 'You cannot sign in', 'Use the "Lost your password" link on the login page first. If the reset email does not arrive, contact us — it usually means the address on the account has changed.', 3),
  (v_manual, 'custom', s_wrong::text, 'Someone has left the practice', 'Tell us and we will remove their access from the website, hosting and any connected services on the same day. Do not simply change the shared password — there is not one.', 4);

end $$;