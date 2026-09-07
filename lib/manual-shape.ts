export const SECTION_KEYS = [
  'site',
  'domain',
  'hosting',
  'accounts',
  'edit',
  'coverage',
  'maintenance',
  'emergency',
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

export const HIDEABLE_SECTIONS: SectionKey[] = [
  'site',
  'domain',
  'hosting',
  'accounts',
  'edit',
  'coverage',
  'maintenance',
];

export type FieldKey =
  | 'client_name'
  | 'site_name'
  | 'site_url'
  | 'platform'
  | 'framework_or_theme'
  | 'key_plugins'
  | 'registrar'
  | 'domain_expiry'
  | 'domain_owner'
  | 'nameservers'
  | 'host'
  | 'host_plan'
  | 'host_renewal'
  | 'email_provider'
  | 'emergency_name'
  | 'emergency_role'
  | 'emergency_phone'
  | 'emergency_email';

export type FieldDef = {
  key: FieldKey;
  section: SectionKey;
};

export const FIELD_KEYS: FieldDef[] = [
  { key: 'client_name', section: 'site' },
  { key: 'site_name', section: 'site' },
  { key: 'site_url', section: 'site' },
  { key: 'platform', section: 'site' },
  { key: 'framework_or_theme', section: 'site' },
  { key: 'key_plugins', section: 'site' },
  { key: 'registrar', section: 'domain' },
  { key: 'domain_expiry', section: 'domain' },
  { key: 'domain_owner', section: 'domain' },
  { key: 'nameservers', section: 'domain' },
  { key: 'host', section: 'hosting' },
  { key: 'host_plan', section: 'hosting' },
  { key: 'host_renewal', section: 'hosting' },
  { key: 'email_provider', section: 'hosting' },
  { key: 'emergency_name', section: 'emergency' },
  { key: 'emergency_role', section: 'emergency' },
  { key: 'emergency_phone', section: 'emergency' },
  { key: 'emergency_email', section: 'emergency' },
];

export const HIDEABLE_FIELDS: FieldKey[] = FIELD_KEYS
  .filter((f) => f.key !== 'client_name')
  .map((f) => f.key);

export function fieldsInSection(section: SectionKey): FieldKey[] {
  return FIELD_KEYS.filter((f) => f.section === section).map((f) => f.key);
}

export function isFieldHidden(
  field: FieldKey,
  hiddenFields: string[] | null,
  hiddenSections: string[] | null,
): boolean {
  const def = FIELD_KEYS.find((f) => f.key === field);
  if (!def) return false;
  if (hiddenSections?.includes(def.section)) return true;
  return hiddenFields?.includes(field) ?? false;
}

export function isSectionHidden(
  section: SectionKey,
  hiddenSections: string[] | null,
): boolean {
  return hiddenSections?.includes(section) ?? false;
}
