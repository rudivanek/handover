import type { Locale } from '@/lib/types';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function parseDateValue(val: string): Date {
  const trimmed = val.trim();
  if (DATE_ONLY.test(trimmed)) {
    const [y, m, d] = trimmed.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(val);
}

export function formatDateValue(
  val: string | null | undefined,
  locale: Locale,
  fallback = ''
): string {
  if (!val) return fallback;
  try {
    const d = parseDateValue(val);
    if (isNaN(d.getTime())) return val;
    const localeStr = locale === 'es' ? 'es-MX' : 'en-US';
    return d.toLocaleDateString(localeStr, { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return val;
  }
}
