const BLOCKED = /(password|passwd|pwd|contrase|secreto|secret|api[ _-]?key|apikey|token|credencial|credential|cvv)/i;
const WARNED = /(\bclave\b|\bkey\b|\blogin\b|\bftp\b|\bssh\b|\bacceso\b|\bpin\b)/i;

export type NameCheckLevel = 'ok' | 'warn' | 'block';

export type NameCheck = { level: NameCheckLevel };

export function checkFieldName(name: string): NameCheck {
  if (BLOCKED.test(name)) return { level: 'block' };
  if (WARNED.test(name)) return { level: 'warn' };
  return { level: 'ok' };
}

export function isSecretConstraintError(message: string): boolean {
  return message.includes('custom_fields_no_secret_names') || message.includes('custom_sections_no_secret_names');
}
