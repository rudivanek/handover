import type { Manual, Account, EditBlock, Coverage, CustomField, Locale } from '@/lib/types';
import { isFieldHidden, isSectionHidden, fieldsInSection, type FieldKey, type SectionKey } from '@/lib/manual-shape';

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

  const hiddenFields = manual.hidden_fields ?? [];
  const hiddenSections = manual.hidden_sections ?? [];

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

  const fieldLabelMap: Record<FieldKey, string> = {
    client_name: labels.clientName,
    site_name: labels.siteName,
    site_url: labels.siteUrl,
    platform: labels.platform,
    framework_or_theme: labels.frameworkOrTheme,
    key_plugins: labels.keyPlugins,
    registrar: labels.registrar,
    domain_expiry: labels.domainExpiry,
    domain_owner: labels.domainOwner,
    nameservers: labels.nameservers,
    host: labels.host,
    host_plan: labels.hostPlan,
    host_renewal: labels.hostRenewal,
    email_provider: labels.emailProvider,
    emergency_name: labels.emergencyName,
    emergency_role: labels.emergencyRole,
    emergency_phone: labels.emergencyPhone,
    emergency_email: labels.emergencyEmail,
  };

  const fieldValueMap: Record<FieldKey, string | string[] | null> = {
    client_name: manual.client_name,
    site_name: manual.site_name,
    site_url: manual.site_url,
    platform: manual.platform,
    framework_or_theme: manual.framework_or_theme,
    key_plugins: manual.key_plugins && manual.key_plugins.length > 0 ? 'filled' : null,
    registrar: manual.registrar,
    domain_expiry: manual.domain_expiry,
    domain_owner: manual.domain_owner,
    nameservers: manual.nameservers,
    host: manual.host,
    host_plan: manual.host_plan,
    host_renewal: manual.host_renewal,
    email_provider: manual.email_provider,
    emergency_name: manual.emergency_name,
    emergency_role: manual.emergency_role,
    emergency_phone: manual.emergency_phone,
    emergency_email: manual.emergency_email,
  };

  const visibleFields: FieldKey[] = (Object.keys(fieldValueMap) as FieldKey[]).filter(
    (key) => !isFieldHidden(key, hiddenFields, hiddenSections)
  );

  for (const key of visibleFields) {
    const val = fieldValueMap[key];
    if (!val || (typeof val === 'string' && !val.trim())) {
      missing.push(fieldLabelMap[key]);
    }
  }

  let extraChecks = 0;

  if (!isSectionHidden('accounts', hiddenSections)) {
    if (accounts.length === 0) missing.push(labels.atLeastOneAccount);
    else {
      const hasFilled = accounts.some((a) => a.service || a.account_owner || a.admin_email);
      if (!hasFilled) missing.push(labels.atLeastOneAccount);
    }
    extraChecks++;
  }

  if (!isSectionHidden('edit', hiddenSections)) {
    if (editBlocks.length === 0) missing.push(labels.atLeastOneEditBlock);
    else {
      const hasFilled = editBlocks.some((b) => b.block_name || b.instructions);
      if (!hasFilled) missing.push(labels.atLeastOneEditBlock);
    }
    extraChecks++;
  }

  if (!isSectionHidden('coverage', hiddenSections)) {
    if (coverage.length === 0) missing.push(labels.atLeastOneCoverageItem);
    else {
      const hasFilled = coverage.some((c) => c.item);
      if (!hasFilled) missing.push(labels.atLeastOneCoverageItem);
    }
    extraChecks++;
  }

  for (const cf of customFields) {
    if (cf.label && cf.label.trim() && (!cf.value || !cf.value.trim())) {
      missing.push(cf.label);
    }
  }

  const totalFields = visibleFields.length + extraChecks + customFields.length;
  const filledFields = totalFields - missing.length;
  const percentage = Math.round((filledFields / totalFields) * 100);

  return { percentage, missing };
}

export function isDraft(percentage: number): boolean {
  return percentage < 60;
}
