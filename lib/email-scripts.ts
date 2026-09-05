import type { Manual, Profile, Locale } from '@/lib/types';
import emailScriptsData from '@/data/email-scripts.json';

export type EmailScriptKey = 'presale' | 'launch' | 'postlaunch' | 'renewal';

export type EmailScript = {
  key: EmailScriptKey;
  subject: string;
  body: string;
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
  }));
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
  return { key: script.key, subject, body };
}

export function scriptToPlainText(script: EmailScript): string {
  return `Subject: ${script.subject}\n\n${script.body}`;
}
