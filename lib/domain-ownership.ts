export const DOMAIN_OWNER_TOKENS = ['@client', '@agency', '@third_party', '@unknown'] as const;
export const REGISTRAR_ACCESS_TOKENS = ['@client', '@agency', '@both', '@unknown'] as const;

type OwnershipField = 'domain_owner' | 'registrar_access';
export function isToken<T extends readonly string[]>(value: string | null | undefined, tokens: T): value is T[number] {
  return typeof value === 'string' && (tokens as readonly string[]).includes(value);
}

export function defaultsKeyFor(field: OwnershipField, value: string | null | undefined): string | null {
  if (field === 'domain_owner' && isToken(value, DOMAIN_OWNER_TOKENS)) {
    return `domain_owner_${value.slice(1)}`;
  }
  if (field === 'registrar_access' && isToken(value, REGISTRAR_ACCESS_TOKENS)) {
    return `registrar_access_${value.slice(1)}`;
  }
  return null;
}

export function optionLabelKey(field: OwnershipField, value: string | null | undefined): string | null {
  if (field === 'domain_owner' && isToken(value, DOMAIN_OWNER_TOKENS)) {
    const suffix = value.slice(1) === 'third_party' ? 'thirdParty' : value.slice(1);
    return `domainOwner.option.${suffix}`;
  }
  if (field === 'registrar_access' && isToken(value, REGISTRAR_ACCESS_TOKENS)) {
    return `registrarAccess.option.${value.slice(1)}`;
  }
  return null;
}

