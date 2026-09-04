import defaultsData from '@/data/defaults.json';
import type { Manual, Profile, Locale } from '@/lib/types';

type LocaleEntry = { en: string; es: string };
type DefaultsMap = Record<string, LocaleEntry>;

const defaults = defaultsData as DefaultsMap;

function fmtDate(val: string | null | undefined, locale: Locale): string {
  if (!val) return '';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    const localeStr = locale === 'es' ? 'es-MX' : 'en-US';
    return d.toLocaleDateString(localeStr, { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return val;
  }
}

function fmtPlugins(val: string[] | null | undefined, locale: Locale): string {
  if (!val || val.length === 0) return '';
  if (locale === 'es') {
    if (val.length === 1) return val[0];
    if (val.length === 2) return `${val[0]} y ${val[1]}`;
    return `${val.slice(0, -1).join(', ')} y ${val[val.length - 1]}`;
  }
  if (val.length === 1) return val[0];
  if (val.length === 2) return `${val[0]} and ${val[1]}`;
  return `${val.slice(0, -1).join(', ')}, and ${val[val.length - 1]}`;
}

function isEmpty(val: string): boolean {
  return !val || val.trim().length === 0;
}

export function interpolate(
  template: string,
  manual: Partial<Manual>,
  profile?: Partial<Profile> | null,
  locale: Locale = 'en'
): { text: string; complete: boolean } {
  const values: Record<string, string> = {
    site_name: manual.site_name ?? '',
    site_url: manual.site_url ?? '',
    platform: manual.platform ?? '',
    framework_or_theme: manual.framework_or_theme ?? '',
    key_plugins: fmtPlugins(manual.key_plugins, locale),
    registrar: manual.registrar ?? '',
    domain_expiry: fmtDate(manual.domain_expiry, locale),
    domain_owner: manual.domain_owner ?? '',
    nameservers: manual.nameservers ?? '',
    host: manual.host ?? '',
    host_plan: manual.host_plan ?? '',
    host_renewal: fmtDate(manual.host_renewal, locale),
    email_provider: manual.email_provider ?? '',
    client_name: manual.client_name ?? '',
    emergency_name: manual.emergency_name ?? '',
    emergency_role: manual.emergency_role ?? '',
    emergency_phone: manual.emergency_phone ?? '',
    emergency_email: manual.emergency_email ?? '',
    agency_name: profile?.agency_name ?? '',
    support_email: profile?.support_email ?? '',
    support_hours: profile?.support_hours ?? '',
  };

  let result = template;
  let complete = true;

  for (const [key, rawValue] of Object.entries(values)) {
    const token = `{${key}}`;
    if (!template.includes(token)) continue;
    if (isEmpty(rawValue)) {
      complete = false;
    }
    result = result.split(token).join(rawValue);
  }

  return { text: result, complete };
}

export function getDefault(key: string, locale: Locale = 'en'): string {
  const entry = defaults[key];
  if (!entry) return '';
  return entry[locale] ?? entry.en ?? '';
}

export function getDefaultRaw(key: string, locale: Locale = 'en'): string {
  return getDefault(key, locale);
}

export function getDefaultsForLocale(locale: Locale): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, entry] of Object.entries(defaults)) {
    result[key] = entry[locale] ?? entry.en;
  }
  return result;
}

export { defaults };
