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

function orDash(val: string | null | undefined): string {
  return val && val.trim() ? val : '\u2014';
}

export function interpolate(
  template: string,
  manual: Partial<Manual>,
  profile?: Partial<Profile> | null,
  locale: Locale = 'en'
): string {
  const m = {
    site_name: orDash(manual.site_name),
    site_url: orDash(manual.site_url),
    platform: orDash(manual.platform),
    framework_or_theme: orDash(manual.framework_or_theme),
    key_plugins: fmtPlugins(manual.key_plugins, locale),
    registrar: orDash(manual.registrar),
    domain_expiry: fmtDate(manual.domain_expiry, locale),
    domain_owner: orDash(manual.domain_owner),
    nameservers: orDash(manual.nameservers),
    host: orDash(manual.host),
    host_plan: orDash(manual.host_plan),
    host_renewal: fmtDate(manual.host_renewal, locale),
    email_provider: orDash(manual.email_provider),
    client_name: orDash(manual.client_name),
    emergency_name: orDash(manual.emergency_name),
    emergency_role: orDash(manual.emergency_role),
    emergency_phone: orDash(manual.emergency_phone),
    emergency_email: orDash(manual.emergency_email),
    agency_name: orDash(profile?.agency_name),
    support_email: orDash(profile?.support_email),
    support_hours: orDash(profile?.support_hours),
  };

  let result = template;
  for (const [key, value] of Object.entries(m)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }

  if (locale === 'es') {
    const pluginsClause = manual.key_plugins && manual.key_plugins.length > 0
      ? `Usa los siguientes plugins: ${fmtPlugins(manual.key_plugins, locale)}.`
      : '';
    result = result.replace(/\{plugins_clause\}/g, pluginsClause);

    const domainOwnerClause = manual.domain_owner
      ? `El dominio es propiedad de ${manual.domain_owner}, as\u00ed que solo ellos (o alguien que ellos autoricen) pueden renovarlo o transferirlo.`
      : '';
    result = result.replace(/\{domain_owner_clause\}/g, domainOwnerClause);
  } else {
    const pluginsClause = manual.key_plugins && manual.key_plugins.length > 0
      ? `It relies on the following plugins: ${fmtPlugins(manual.key_plugins, locale)}.`
      : '';
    result = result.replace(/\{plugins_clause\}/g, pluginsClause);

    const domainOwnerClause = manual.domain_owner
      ? `The domain is owned by ${manual.domain_owner}, so only they (or someone they authorize) can renew or transfer it.`
      : '';
    result = result.replace(/\{domain_owner_clause\}/g, domainOwnerClause);
  }

  return result;
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
