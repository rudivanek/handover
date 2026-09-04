export type Locale = 'en' | 'es';

export type Profile = {
  user_id: string;
  agency_name: string | null;
  logo_url: string | null;
  logo_storage_path: string | null;
  agency_website: string | null;
  heading_font_key: string;
  body_font_key: string;
  custom_font_name: string | null;
  custom_font_url: string | null;
  brand_color: string | null;
  support_email: string | null;
  support_hours: string | null;
  emergency_phone: string | null;
  plan: string | null;
  ui_locale: Locale;
};

export type Manual = {
  id: string;
  user_id: string;
  slug: string;
  client_name: string;
  site_name: string | null;
  site_url: string | null;
  platform: string | null;
  framework_or_theme: string | null;
  key_plugins: string[] | null;
  registrar: string | null;
  domain_expiry: string | null;
  domain_owner: string | null;
  nameservers: string | null;
  host: string | null;
  host_plan: string | null;
  host_renewal: string | null;
  email_provider: string | null;
  emergency_name: string | null;
  emergency_role: string | null;
  emergency_phone: string | null;
  emergency_email: string | null;
  locale: Locale;
  created_at: string;
  updated_at: string;
};

export type Account = {
  id: string;
  manual_id: string;
  service: string | null;
  account_owner: string | null;
  admin_email: string | null;
};

export type EditBlock = {
  id: string;
  manual_id: string;
  block_name: string | null;
  instructions: string | null;
};

export type Coverage = {
  id: string;
  manual_id: string;
  item: string | null;
  included: boolean;
};

export type CustomSection = {
  id: string;
  manual_id: string;
  title: string;
  position: number;
  created_at: string;
};

export type CustomField = {
  id: string;
  manual_id: string;
  section_type: 'builtin' | 'custom';
  section_key: string;
  label: string;
  value: string;
  position: number;
  created_at: string;
};

export type Asset = {
  id: string;
  manual_id: string;
  label: string;
  url: string | null;
  asset_owner: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
};

export type ManualWithRelations = Manual & {
  accounts: Account[];
  edit_blocks: EditBlock[];
  coverage: Coverage[];
  custom_sections: CustomSection[];
  custom_fields: CustomField[];
  assets: Asset[];
};
