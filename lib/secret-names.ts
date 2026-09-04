const BLOCKED = /(password|passwd|pwd|contrase|secreto|secret|api[ _-]?key|apikey|token|credencial|credential|cvv)/i;
const WARNED = /(\bclave\b|\bkey\b|\blogin\b|\bftp\b|\bssh\b|\bacceso\b|\bpin\b)/i;

export type NameCheckLevel = 'ok' | 'warn' | 'block';

export type NameCheck = { level: NameCheckLevel };

export function checkFieldName(name: string): NameCheck {
  if (BLOCKED.test(name)) return { level: 'block' };
  if (WARNED.test(name)) return { level: 'warn' };
  return { level: 'ok' };
}

const SHARE_LINK_MARKERS = [
  'rlkey=',
  '/scl/fi/',
  'dropbox.com/s/',
  'usp=sharing',
  'usp=drive_link',
  '/file/d/',
  'box.com/s/',
  '1drv.ms',
  'we.tl',
  'share_link_id=',
  'figma.com/file/',
  'figma.com/design/',
  '.notion.site',
];

export function checkAssetUrl(url: string): NameCheck {
  const lower = url.toLowerCase();
  if (SHARE_LINK_MARKERS.some((m) => lower.includes(m))) return { level: 'warn' };
  return { level: 'ok' };
}

export function isSecretConstraintError(message: string): boolean {
  return message.includes('custom_fields_no_secret_names') || message.includes('custom_sections_no_secret_names');
}
