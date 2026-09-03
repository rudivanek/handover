export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function randomSuffix(len: number = 6): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < len; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export function uniqueSlug(base: string, existing: string[] = []): string {
  const baseSlug = slugify(base) || 'manual';
  const slug = `${baseSlug}-${randomSuffix()}`;
  if (!existing.includes(slug)) return slug;
  let i = 2;
  while (existing.includes(`${baseSlug}-${randomSuffix()}`)) i++;
  return `${baseSlug}-${randomSuffix()}`;
}
