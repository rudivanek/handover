/*
# Seed example manual

1. Purpose
   Creates a demo agency user (demo@handover.app) and one complete example
   manual so the app is not empty on first run. The user can sign in with
   the magic link flow using demo@handover.app.

2. What's inserted
   - One auth.users row (demo@handover.app) with a fixed UUID for idempotency.
   - A profiles row with agency branding (Northwind Studio, brand color, etc.).
   - One complete manual (Acme Corporation) with all fields filled in.
   - Three accounts, three edit blocks, and coverage items (included + excluded).

3. Notes
   - Uses a fixed UUID so re-running is idempotent (ON CONFLICT do nothing).
   - The auth user has email_confirmed_at set so magic link sign-in works.
*/

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'demo@handover.app',
  '',
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (user_id, agency_name, logo_url, brand_color, support_email, support_hours, emergency_phone)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Northwind Studio',
  NULL,
  '#1d4e89',
  'support@northwindstudio.com',
  'Mon–Fri, 9am–5pm GMT',
  '+44 20 7946 0123'
)
ON CONFLICT (user_id) DO NOTHING;

-- Check if the example manual already exists
DO $$
DECLARE
  manual_uuid uuid;
BEGIN
  SELECT id INTO manual_uuid FROM manuals WHERE slug = 'acme-corporation' LIMIT 1;
  IF manual_uuid IS NULL THEN
    INSERT INTO manuals (
      id, user_id, slug, client_name, site_name, site_url, platform,
      framework_or_theme, key_plugins, registrar, domain_expiry, domain_owner,
      nameservers, host, host_plan, host_renewal, email_provider,
      emergency_name, emergency_role, emergency_phone, emergency_email
    ) VALUES (
      'b2c3d4e5-f6a7-8901-bcde-f23456789012',
      'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      'acme-corporation',
      'Acme Corporation',
      'Acme Corporation Website',
      'https://acme.com',
      'WordPress',
      'Astra Theme',
      ARRAY['WooCommerce', 'Yoast SEO', 'WP Rocket', 'Gravity Forms'],
      'GoDaddy',
      '2026-03-15',
      'Client owns the domain',
      'ns1.kinsta.com, ns2.kinsta.com',
      'Kinsta',
      'Starter',
      '2026-01-20',
      'Google Workspace',
      'Jane Smith',
      'Lead Developer',
      '+44 20 7946 0123',
      'urgent@northwindstudio.com'
    );

    INSERT INTO accounts (manual_id, service, account_owner, admin_email) VALUES
    ('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'Google Analytics', 'Agency', 'analytics@northwindstudio.com'),
    ('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'Google Search Console', 'Client', 'marketing@acme.com'),
    ('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'Cloudflare', 'Agency', 'devops@northwindstudio.com');

    INSERT INTO edit_blocks (manual_id, block_name, instructions) VALUES
    ('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'Editing a page',
     'Log in at https://acme.com/wp-admin using your editor account. Go to Pages in the left sidebar, click the page you want to edit, make your changes in the visual editor, and click the blue Update button in the top right. Always click Update — if you navigate away without saving, your changes will be lost.'),
    ('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'Adding a blog post',
     'Go to Posts > Add New. Enter your title and content. Set a featured image on the right sidebar if you have one. Choose a category and any tags. When you are happy with the post, click Publish. The post will appear on your blog immediately.'),
    ('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'Changing the navigation menu',
     'Go to Appearance > Menus. Select the Main Menu from the dropdown at the top. You can drag menu items to reorder them, or add new pages from the left panel. Click Save Menu when you are done. Changes take effect immediately on the live site.');

    INSERT INTO coverage (manual_id, item, included) VALUES
    ('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'Core WordPress updates', true),
    ('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'Plugin updates', true),
    ('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'Daily backups', true),
    ('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'Security monitoring', true),
    ('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'Uptime monitoring', true),
    ('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'New landing page design', false),
    ('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'Custom functionality development', false),
    ('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'Content writing', false),
    ('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'SEO strategy and audits', false);
  END IF;
END $$;
