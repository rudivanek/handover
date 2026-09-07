import type { Manual, Profile, Locale, AgencyScript } from '@/lib/types';
import emailScriptsData from '@/data/email-scripts.json';

export type EmailScriptKey = 'presale' | 'launch' | 'postlaunch' | 'renewal';

export type EmailScript = {
  key: EmailScriptKey | null;
  subject: string;
  body: string;
  name: string | null;
  isOverride: boolean;
  scriptId: string | null;
};

type RawScript = {
  key: EmailScriptKey;
  en: { subject: string; body: string };
  es: { subject: string; body: string };
};

const rawScripts = emailScriptsData as RawScript[];

const placeholders: Record<Locale, Record<string, string>> = {
  en: {
    client_name: '[client name]',
    site_name: '[site name]',
    site_url: '[site URL]',
    manual_url: '[manual URL]',
    support_email: '[support email]',
  },
  es: {
    client_name: '[nombre del cliente]',
    site_name: '[nombre del sitio]',
    site_url: '[URL del sitio]',
    manual_url: '[URL del manual]',
    support_email: '[correo de soporte]',
  },
};

export function getScripts(locale: Locale): EmailScript[] {
  return rawScripts.map((s) => ({
    key: s.key,
    subject: s[locale].subject,
    body: s[locale].body,
    name: null,
    isOverride: false,
    scriptId: null,
  }));
}

export function getScriptTitle(key: EmailScriptKey, locale: Locale): string {
  const raw = rawScripts.find((s) => s.key === key);
  if (!raw) return key;
  return raw[locale].subject;
}

export function mergeScripts(
  locale: Locale,
  overrides: AgencyScript[],
): EmailScript[] {
  const builtInKeys: EmailScriptKey[] = ['presale', 'launch', 'postlaunch', 'renewal'];
  const overrideMap = new Map<string, AgencyScript>();
  for (const o of overrides) {
    if (o.base_key && o.language === locale) {
      overrideMap.set(o.base_key, o);
    }
  }

  const result: EmailScript[] = builtInKeys.map((key) => {
    const override = overrideMap.get(key);
    if (override) {
      return {
        key,
        subject: override.subject,
        body: override.body,
        name: null,
        isOverride: true,
        scriptId: override.id,
      };
    }
    const raw = rawScripts.find((s) => s.key === key)!;
    return {
      key,
      subject: raw[locale].subject,
      body: raw[locale].body,
      name: null,
      isOverride: false,
      scriptId: null,
    };
  });

  const customs = overrides
    .filter((o) => o.base_key === null && o.language === locale)
    .sort((a, b) => a.sort_order - b.sort_order);

  for (const c of customs) {
    result.push({
      key: null,
      subject: c.subject,
      body: c.body,
      name: c.name,
      isOverride: false,
      scriptId: c.id,
    });
  }

  return result;
}

export function getCustomLanguages(overrides: AgencyScript[]): string[] {
  const builtIn = new Set(['en', 'es']);
  const customs = new Set<string>();
  for (const o of overrides) {
    if (o.base_key === null && !builtIn.has(o.language)) {
      customs.add(o.language);
    }
  }
  return Array.from(customs).sort();
}

export function fillToken(text: string, token: string, value: string | null | undefined, locale: Locale): string {
  const replacement = value && value.trim() ? value : placeholders[locale][token];
  return text.split(`{${token}}`).join(replacement);
}

export function fillScript(
  script: EmailScript,
  manual: Manual | null,
  profile: Profile | null,
  origin: string,
  locale: Locale,
): EmailScript {
  const manualUrl = manual ? `${origin}/m/${manual.slug}` : null;
  let subject = script.subject;
  let body = script.body;
  subject = fillToken(subject, 'client_name', manual?.client_name, locale);
  subject = fillToken(subject, 'site_name', manual?.site_name, locale);
  subject = fillToken(subject, 'site_url', manual?.site_url, locale);
  subject = fillToken(subject, 'manual_url', manualUrl, locale);
  subject = fillToken(subject, 'support_email', profile?.support_email, locale);
  body = fillToken(body, 'client_name', manual?.client_name, locale);
  body = fillToken(body, 'site_name', manual?.site_name, locale);
  body = fillToken(body, 'site_url', manual?.site_url, locale);
  body = fillToken(body, 'manual_url', manualUrl, locale);
  body = fillToken(body, 'support_email', profile?.support_email, locale);
  return { key: script.key, subject, body, name: script.name, isOverride: script.isOverride, scriptId: script.scriptId };
}

export function scriptToPlainText(script: EmailScript, locale: Locale): string {
  const label = locale === 'es' ? 'Asunto' : 'Subject';
  return `${label}: ${script.subject}\n\n${script.body}`;
}
