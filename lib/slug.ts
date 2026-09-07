export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function randomSuffix(len: number = 10): string {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
  const values = new Uint32Array(len);
  crypto.getRandomValues(values);
  let result = '';
  for (let i = 0; i < len; i++) {
    result += chars[values[i] % chars.length];
  }
  return result;
}

export function uniqueSlug(base: string, existing: string[] = []): string {
  const baseSlug = slugify(base) || 'manual';
  for (let i = 0; i < 5; i++) {
    const candidate = `${baseSlug}-${randomSuffix()}`;
    if (!existing.includes(candidate)) return candidate;
  }
  return `${baseSlug}-${randomSuffix()}`;
}
