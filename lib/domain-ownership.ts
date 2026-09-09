export const DOMAIN_OWNER_TOKENS = ['@client', '@agency', '@third_party', '@unknown'] as const;
export const REGISTRAR_ACCESS_TOKENS = ['@client', '@agency', '@both', '@unknown'] as const;
export const DNS_MANAGED_AT_TOKENS = ['@registrar', '@host', '@cloudflare'] as const;
export const DNS_ACCESS_TOKENS = ['@client', '@agency', '@both', '@unknown'] as const;
export const DNS_CHANGE_TOKENS = ['@nameservers', '@records', '@none'] as const;

type OwnershipField = 'domain_owner' | 'registrar_access' | 'dns_managed_at' | 'dns_access';
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
  if (field === 'dns_managed_at' && isToken(value, DNS_MANAGED_AT_TOKENS)) {
    return `dns_managed_${value.slice(1)}`;
  }
  if (field === 'dns_access' && isToken(value, DNS_ACCESS_TOKENS)) {
    return `dns_access_${value.slice(1)}`;
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
  if (field === 'dns_managed_at' && isToken(value, DNS_MANAGED_AT_TOKENS)) {
    return `dnsManagedAt.option.${value.slice(1)}`;
  }
  if (field === 'dns_access' && isToken(value, DNS_ACCESS_TOKENS)) {
    return `dnsAccess.option.${value.slice(1)}`;
  }
  return null;
}

