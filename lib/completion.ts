import type { Manual, Account, EditBlock, Coverage, CustomField, Locale } from '@/lib/types';

export type CompletionResult = {
  percentage: number;
  missing: string[];
};

export function computeCompletion(
  manual: Manual | null,
  accounts: Account[],
  editBlocks: EditBlock[],
  coverage: Coverage[],
  customFields: CustomField[] = [],
  locale: Locale = 'en'
): CompletionResult {
  const missing: string[] = [];

  if (!manual) return { percentage: 0, missing: ['Manual data'] };

  const labels = locale === 'es' ? {
    clientName: 'Nombre del cliente',
    siteName: 'Nombre del sitio',
    siteUrl: 'URL del sitio',
    platform: 'Plataforma',
    frameworkOrTheme: 'Framework o plantilla',
    keyPlugins: 'Plugins clave',
    registrar: 'Registrador',
    domainExpiry: 'Vencimiento del dominio',
    domainOwner: 'Propietario del dominio',
    nameservers: 'Nameservers',
    host: 'Proveedor de hosting',
    hostPlan: 'Plan de hosting',
    hostRenewal: 'Renovaci\u00f3n del hosting',
    emailProvider: 'Proveedor de correo',
    emergencyName: 'Nombre de contacto de emergencia',
    emergencyRole: 'Rol de emergencia',
    emergencyPhone: 'Tel\u00e9fono de emergencia',
    emergencyEmail: 'Correo de emergencia',
    atLeastOneAccount: 'Al menos una cuenta',
    atLeastOneEditBlock: 'Al menos un bloque de edici\u00f3n',
    atLeastOneCoverageItem: 'Al menos un art\u00edculo de cobertura',
  } : {
    clientName: 'Client name',
    siteName: 'Site name',
    siteUrl: 'Site URL',
    platform: 'Platform',
    frameworkOrTheme: 'Framework or theme',
    keyPlugins: 'Key plugins',
    registrar: 'Registrar',
    domainExpiry: 'Domain expiry',
    domainOwner: 'Domain owner',
    nameservers: 'Nameservers',
    host: 'Hosting provider',
    hostPlan: 'Hosting plan',
    hostRenewal: 'Hosting renewal',
    emailProvider: 'Email provider',
    emergencyName: 'Emergency contact name',
    emergencyRole: 'Emergency role',
    emergencyPhone: 'Emergency phone',
    emergencyEmail: 'Emergency email',
    atLeastOneAccount: 'At least one account',
    atLeastOneEditBlock: 'At least one edit block',
    atLeastOneCoverageItem: 'At least one coverage item',
  };

  const fields: [string, string | string[] | null][] = [
    [labels.clientName, manual.client_name],
    [labels.siteName, manual.site_name],
    [labels.siteUrl, manual.site_url],
    [labels.platform, manual.platform],
    [labels.frameworkOrTheme, manual.framework_or_theme],
    [labels.keyPlugins, manual.key_plugins && manual.key_plugins.length > 0 ? 'filled' : null],
    [labels.registrar, manual.registrar],
    [labels.domainExpiry, manual.domain_expiry],
    [labels.domainOwner, manual.domain_owner],
    [labels.nameservers, manual.nameservers],
    [labels.host, manual.host],
    [labels.hostPlan, manual.host_plan],
    [labels.hostRenewal, manual.host_renewal],
    [labels.emailProvider, manual.email_provider],
    [labels.emergencyName, manual.emergency_name],
    [labels.emergencyRole, manual.emergency_role],
    [labels.emergencyPhone, manual.emergency_phone],
    [labels.emergencyEmail, manual.emergency_email],
  ];

  for (const [label, val] of fields) {
    if (!val || (typeof val === 'string' && !val.trim())) {
      missing.push(label);
    }
  }

  if (accounts.length === 0) missing.push(labels.atLeastOneAccount);
  else {
    const hasFilled = accounts.some((a) => a.service || a.account_owner || a.admin_email);
    if (!hasFilled) missing.push(labels.atLeastOneAccount);
  }

  if (editBlocks.length === 0) missing.push(labels.atLeastOneEditBlock);
  else {
    const hasFilled = editBlocks.some((b) => b.block_name || b.instructions);
    if (!hasFilled) missing.push(labels.atLeastOneEditBlock);
  }

  if (coverage.length === 0) missing.push(labels.atLeastOneCoverageItem);
  else {
    const hasFilled = coverage.some((c) => c.item);
    if (!hasFilled) missing.push(labels.atLeastOneCoverageItem);
  }

  for (const cf of customFields) {
    if (cf.label && cf.label.trim() && (!cf.value || !cf.value.trim())) {
      missing.push(cf.label);
    }
  }

  const totalFields = fields.length + 3 + customFields.length;
  const filledFields = totalFields - missing.length;
  const percentage = Math.round((filledFields / totalFields) * 100);

  return { percentage, missing };
}

export function isDraft(percentage: number): boolean {
  return percentage < 60;
}
