'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { interpolate, getDefault } from '@/lib/defaults';
import type { Manual, Account, EditBlock, Coverage, CustomSection, CustomField, Asset, Locale } from '@/lib/types';
import { fonts, getFontDef, inferFontFormat, SYSTEM_STACK, SERIF_STACK } from '@/lib/fonts';
import { Button } from '@/components/ui/button';
import { Printer, FileText, Globe, Server, Users, PencilLine, CheckSquare, Phone, FolderOpen } from 'lucide-react';
import enMessages from '@/locales/en.json';
import esMessages from '@/locales/es.json';

const messages: Record<Locale, Record<string, string>> = {
  en: enMessages,
  es: esMessages,
};

type Agency = {
  agency_name: string | null;
  agency_website: string | null;
  logo_url: string | null;
  brand_color: string | null;
  support_email: string | null;
  support_hours: string | null;
  emergency_phone: string | null;
  show_footer: boolean;
  heading_font_key: string | null;
  body_font_key: string | null;
  custom_font_name: string | null;
  custom_font_url: string | null;
};

type PublicManualData = {
  manual: Manual;
  agency: Agency;
  accounts: Account[];
  edit_blocks: EditBlock[];
  coverage: Coverage[];
  custom_sections: CustomSection[];
  custom_fields: CustomField[];
  assets: Asset[];
};

export default function PublicManualPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [data, setData] = useState<PublicManualData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: rpcData, error } = await supabase.rpc('get_public_manual', { p_slug: slug });

      if (error || !rpcData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setData(rpcData as unknown as PublicManualData);
      setLoading(false);
    })();
  }, [slug]);

  const manual = data?.manual ?? null;
  const agency = data?.agency ?? null;
  const accounts = data?.accounts ?? [];
  const editBlocks = data?.edit_blocks ?? [];
  const coverage = data?.coverage ?? [];
  const customSections = data?.custom_sections ?? [];
  const customFields = data?.custom_fields ?? [];
  const assets = data?.assets ?? [];

  const locale: Locale = (manual?.locale as Locale) || 'en';
  const t = (key: string, params?: Record<string, string | number>): string => {
    const msg = messages[locale]?.[key] ?? messages.en[key] ?? key;
    if (!params) return msg;
    return msg.replace(/\{(\w+)\}/g, (_, k: string) => {
      const val = params[k];
      return val !== undefined ? String(val) : `{${k}}`;
    });
  };

  useEffect(() => {
    if (manual) {
      document.documentElement.lang = locale;
    }
  }, [locale, manual]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary/30">
        <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
          <FileText className="h-6 w-6" strokeWidth={1.5} />
          <span className="font-serif text-xl">{t('public.loadingManual')}</span>
        </div>
      </div>
    );
  }

  if (notFound || !manual || !agency) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-secondary/30 px-4">
        <FileText className="mb-4 h-12 w-12 text-muted-foreground/50" strokeWidth={1} />
        <h1 className="font-serif text-2xl">{t('public.manualNotFound')}</h1>
        <p className="mt-2 text-muted-foreground">{t('public.manualNotFoundDesc')}</p>
      </div>
    );
  }

  const brandColor = agency.brand_color || '#1f2937';
  const agencyName = agency.agency_name || (locale === 'es' ? 'Tu agencia' : 'Your Agency');
  const logoUrl = agency.logo_url;
  const agencyWebsite = agency.agency_website;
  const showFooter = agency.show_footer;

  const headingFontKey = agency.heading_font_key ?? 'system';
  const bodyFontKey = agency.body_font_key ?? 'system';
  const customReady = !!(agency.custom_font_name && agency.custom_font_url);
  const headingIsCustom = headingFontKey === 'custom' && customReady;
  const bodyIsCustom = bodyFontKey === 'custom' && customReady;
  const headingFontDef = getFontDef(headingFontKey);
  const bodyFontDef = getFontDef(bodyFontKey);

  const headingVarName = headingIsCustom ? null : (headingFontDef.variable || null);
  const bodyVarName = bodyIsCustom ? null : (bodyFontDef.variable || null);
  const manualFontClasses = [
    headingVarName ? fonts[headingFontKey]?.variable : '',
    bodyVarName ? fonts[bodyFontKey]?.variable : '',
  ].filter(Boolean).join(' ');

  const customFontName = agency.custom_font_name?.replace(/'/g, '') || '';
  const customFontUrl = agency.custom_font_url?.replace(/'/g, '') || '';
  const customFontFace = (headingIsCustom || bodyIsCustom) && customFontUrl
    ? `@font-face { font-family: '${customFontName}'; src: url('${customFontUrl}') format('${inferFontFormat(customFontUrl)}'); font-display: swap; }`
    : null;

  const headingFontFamily = headingIsCustom
    ? `'${customFontName}', ${SERIF_STACK}`
    : headingFontDef.stack;
  const bodyFontFamily = bodyIsCustom
    ? `'${customFontName}', ${SYSTEM_STACK}`
    : bodyFontDef.stack;

  const manualStyle: React.CSSProperties = {
    minWidth: 0,
    '--manual-heading-font': headingIsCustom ? `'${customFontName}'` : (headingFontDef.fontFamily || 'inherit'),
    '--manual-body-font': bodyIsCustom ? `'${customFontName}'` : (bodyFontDef.fontFamily || 'inherit'),
  } as React.CSSProperties;

  const includedItems = coverage.filter((c) => c.included);
  const excludedItems = coverage.filter((c) => !c.included);

  const profileForInterpolate = {
    agency_name: agency.agency_name,
    support_email: agency.support_email,
    support_hours: agency.support_hours,
  };

  const renderInterpolated = (key: string) =>
    interpolate(getDefault(key, locale), manual, profileForInterpolate, locale);

  const dateLocale = locale === 'es' ? 'es-MX' : 'en-US';

  const fmtDate = (val: string | null) => {
    if (!val) return '\u2014';
    try {
      return new Date(val).toLocaleDateString(dateLocale, {
        year: 'numeric', month: 'long', day: 'numeric',
      });
    } catch {
      return val;
    }
  };

  const fmtPlugins = (val: string[] | null) => {
    if (!val || val.length === 0) return '\u2014';
    if (locale === 'es') {
      if (val.length === 1) return val[0];
      if (val.length === 2) return `${val[0]} y ${val[1]}`;
      return `${val.slice(0, -1).join(', ')} y ${val[val.length - 1]}`;
    }
    if (val.length === 1) return val[0];
    if (val.length === 2) return `${val[0]} and ${val[1]}`;
    return `${val.slice(0, -1).join(', ')}, and ${val[val.length - 1]}`;
  };

  const sectionHeadingStyle = { color: brandColor };
  const sectionRuleStyle = { backgroundColor: brandColor, opacity: 0.2 };
  const linkStyle = { color: brandColor };

  const getFilledBuiltinFields = (sectionKey: string): CustomField[] => {
    return customFields
      .filter((f) => f.section_type === 'builtin' && f.section_key === sectionKey && f.label && f.label.trim() && f.value && f.value.trim())
      .sort((a, b) => a.position - b.position);
  };

  const renderBuiltinCustomFieldRows = (sectionKey: string) => {
    const fields = getFilledBuiltinFields(sectionKey);
    return fields.map((field, i) => (
      <tr key={field.id} className={i % 2 === 0 ? 'bg-secondary/20' : ''}>
        <td className="px-3 py-2 font-medium sm:px-4 sm:py-2.5">{field.label}</td>
        <td className="whitespace-pre-wrap px-3 py-2 sm:px-4 sm:py-2.5">{field.value}</td>
      </tr>
    ));
  };

  const renderBuiltinCustomFieldParagraphs = (sectionKey: string) => {
    const fields = getFilledBuiltinFields(sectionKey);
    return fields.map((field) => (
      <p key={field.id} className="text-sm leading-relaxed sm:text-base">
        <span className="font-medium">{field.label}:</span>{' '}
        <span className="whitespace-pre-wrap">{field.value}</span>
      </p>
    ));
  };

  const renderCustomSection = (section: CustomSection) => {
    const fields = customFields
      .filter((f) => f.section_type === 'custom' && f.section_key === section.id && f.label && f.label.trim() && f.value && f.value.trim())
      .sort((a, b) => a.position - b.position);

    if (fields.length === 0) return null;

    return (
      <section key={section.id} className="manual-section mb-8 sm:mb-10">
        <h2 className="mb-3 flex items-center gap-2 text-xl sm:mb-4 sm:text-2xl" style={sectionHeadingStyle}>
          <FileText className="h-5 w-5 shrink-0" style={{ color: brandColor }} />
          {section.title}
        </h2>
        <div className="space-y-3 sm:space-y-4">
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-xs sm:text-sm">
              <tbody>
                {fields.map((field, i) => (
                  <tr key={field.id} className={i % 2 === 0 ? 'border-b border-border bg-secondary/20' : 'border-b border-border'}>
                    <td className="px-3 py-2 font-medium sm:px-4 sm:py-2.5">{field.label}</td>
                    <td className="whitespace-pre-wrap px-3 py-2 sm:px-4 sm:py-2.5">{field.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    );
  };

  const accountsCustomFields = getFilledBuiltinFields('accounts');
  const editCustomFields = getFilledBuiltinFields('how_to_edit');
  const coverageCustomFields = getFilledBuiltinFields('coverage');
  const emergencyCustomFields = getFilledBuiltinFields('emergency');

  return (
    <div className="min-h-screen bg-secondary/20">
      {/* Top bar - hidden on print */}
      <div className="no-print sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-3 sm:px-6">
          <span className="truncate text-sm text-muted-foreground">
            {manual.client_name} \u2014 {t('public.websiteOwnersManual')}
          </span>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="shrink-0">
            <Printer className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">{t('public.print')}</span>
            <span className="sm:hidden">{t('public.printShort')}</span>
          </Button>
        </div>
      </div>

      {customFontFace && (
        <style dangerouslySetInnerHTML={{ __html: customFontFace }} />
      )}
      <style dangerouslySetInnerHTML={{ __html: `
        [data-manual] { font-family: var(--manual-body-font, ${SYSTEM_STACK}); }
        [data-manual] h1, [data-manual] h2, [data-manual] h3, [data-manual] h4 { font-family: var(--manual-heading-font, var(--manual-body-font, ${SYSTEM_STACK})); }
        [data-manual] td, [data-manual] th, [data-manual] li, [data-manual] button { font-family: inherit; }
      ` }} />
      <div data-manual className={`manual-page mx-auto max-w-3xl px-3 py-8 sm:px-6 sm:py-16 ${manualFontClasses}`} style={manualStyle}>
        {/* Header / Cover */}
        <div className="manual-header mb-8 sm:mb-12">
          {logoUrl && (
            agencyWebsite ? (
              <a href={agencyWebsite} target="_blank" rel="noopener noreferrer" className="mb-4 inline-block">
                <img
                  src={logoUrl}
                  alt={agencyName}
                  className="max-h-16 max-w-[200px] object-contain sm:max-h-20 sm:max-w-xs"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </a>
            ) : (
              <img
                src={logoUrl}
                alt={agencyName}
                className="mb-4 max-h-16 max-w-[200px] object-contain sm:max-h-20 sm:max-w-xs"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )
          )}
          {!logoUrl && (
            <p className="mb-3 text-sm font-medium tracking-wide uppercase" style={{ color: brandColor }}>
              {agencyWebsite ? (
                <a href={agencyWebsite} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  {agencyName}
                </a>
              ) : (
                agencyName
              )}
            </p>
          )}
          <h1 className="text-3xl leading-tight tracking-tight sm:text-5xl" style={{ color: brandColor }}>
            {manual.client_name}
          </h1>
          <p className="mt-2 text-lg text-muted-foreground sm:mt-3 sm:text-xl">
            {t('public.websiteOwnersManual')}
          </p>
          <div className="mt-4 h-px w-full sm:mt-6" style={sectionRuleStyle} />
        </div>

        {/* Intro */}
        <div className="manual-section mb-8 sm:mb-10">
          <p className="text-sm leading-relaxed text-foreground sm:text-base">
            {renderInterpolated('site_intro')}
          </p>
        </div>

        {/* Site & Stack */}
        <section className="manual-section mb-8 sm:mb-10">
          <h2 className="mb-3 flex items-center gap-2 text-xl sm:mb-4 sm:text-2xl" style={sectionHeadingStyle}>
            <Globe className="h-5 w-5 shrink-0" style={{ color: brandColor }} />
            {t('public.sections.site')}
          </h2>
          <div className="space-y-3 sm:space-y-4">
            <p className="text-sm leading-relaxed sm:text-base">{renderInterpolated('site_overview')}</p>
            <p className="text-sm leading-relaxed sm:text-base">{renderInterpolated('platform')}</p>
            <p className="text-sm leading-relaxed sm:text-base">{renderInterpolated('framework_or_theme')}</p>
            <p className="text-sm leading-relaxed sm:text-base">{renderInterpolated('key_plugins')}</p>

            <div className="mt-4 overflow-hidden rounded-lg border border-border">
              <table className="w-full text-xs sm:text-sm">
                <tbody>
                  <tr className="border-b border-border bg-secondary/20">
                    <td className="px-3 py-2 font-medium sm:px-4 sm:py-2.5">{t('public.fields.siteName')}</td>
                    <td className="px-3 py-2 sm:px-4 sm:py-2.5">{manual.site_name || '\u2014'}</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-3 py-2 font-medium sm:px-4 sm:py-2.5">{t('public.fields.url')}</td>
                    <td className="break-all px-3 py-2 sm:px-4 sm:py-2.5">{manual.site_url || '\u2014'}</td>
                  </tr>
                  <tr className="border-b border-border bg-secondary/20">
                    <td className="px-3 py-2 font-medium sm:px-4 sm:py-2.5">{t('public.fields.platform')}</td>
                    <td className="px-3 py-2 sm:px-4 sm:py-2.5">{manual.platform || '\u2014'}</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-3 py-2 font-medium sm:px-4 sm:py-2.5">{t('public.fields.themeFramework')}</td>
                    <td className="px-3 py-2 sm:px-4 sm:py-2.5">{manual.framework_or_theme || '\u2014'}</td>
                  </tr>
                  <tr className="bg-secondary/20">
                    <td className="px-3 py-2 font-medium sm:px-4 sm:py-2.5">{t('public.fields.keyPlugins')}</td>
                    <td className="px-3 py-2 sm:px-4 sm:py-2.5">{fmtPlugins(manual.key_plugins)}</td>
                  </tr>
                  {renderBuiltinCustomFieldRows('site_stack')}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Domain & DNS */}
        <section className="manual-section mb-8 sm:mb-10">
          <h2 className="mb-3 flex items-center gap-2 text-xl sm:mb-4 sm:text-2xl" style={sectionHeadingStyle}>
            <Globe className="h-5 w-5 shrink-0" style={{ color: brandColor }} />
            {t('public.sections.domain')}
          </h2>
          <div className="space-y-3 sm:space-y-4">
            <p className="text-sm leading-relaxed sm:text-base">{renderInterpolated('domain')}</p>
            {manual.domain_owner && <p className="text-sm leading-relaxed sm:text-base">{renderInterpolated('domain_owner')}</p>}
            <p className="text-sm leading-relaxed sm:text-base">{renderInterpolated('nameservers')}</p>

            <div className="mt-4 overflow-hidden rounded-lg border border-border">
              <table className="w-full text-xs sm:text-sm">
                <tbody>
                  <tr className="border-b border-border bg-secondary/20">
                    <td className="px-3 py-2 font-medium sm:px-4 sm:py-2.5">{t('public.fields.registrar')}</td>
                    <td className="px-3 py-2 sm:px-4 sm:py-2.5">{manual.registrar || '\u2014'}</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-3 py-2 font-medium sm:px-4 sm:py-2.5">{t('public.fields.domainExpiry')}</td>
                    <td className="px-3 py-2 sm:px-4 sm:py-2.5">{fmtDate(manual.domain_expiry)}</td>
                  </tr>
                  <tr className="border-b border-border bg-secondary/20">
                    <td className="px-3 py-2 font-medium sm:px-4 sm:py-2.5">{t('public.fields.domainOwner')}</td>
                    <td className="px-3 py-2 sm:px-4 sm:py-2.5">{manual.domain_owner || '\u2014'}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium sm:px-4 sm:py-2.5">{t('public.fields.nameservers')}</td>
                    <td className="break-all px-3 py-2 sm:px-4 sm:py-2.5">{manual.nameservers || '\u2014'}</td>
                  </tr>
                  {renderBuiltinCustomFieldRows('domain_dns')}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Hosting & Email */}
        <section className="manual-section mb-8 sm:mb-10">
          <h2 className="mb-3 flex items-center gap-2 text-xl sm:mb-4 sm:text-2xl" style={sectionHeadingStyle}>
            <Server className="h-5 w-5 shrink-0" style={{ color: brandColor }} />
            {t('public.sections.hosting')}
          </h2>
          <div className="space-y-3 sm:space-y-4">
            <p className="text-sm leading-relaxed sm:text-base">{renderInterpolated('host')}</p>
            <p className="text-sm leading-relaxed sm:text-base">{renderInterpolated('host_renewal')}</p>
            <p className="text-sm leading-relaxed sm:text-base">{renderInterpolated('email_provider')}</p>

            <div className="mt-4 overflow-hidden rounded-lg border border-border">
              <table className="w-full text-xs sm:text-sm">
                <tbody>
                  <tr className="border-b border-border bg-secondary/20">
                    <td className="px-3 py-2 font-medium sm:px-4 sm:py-2.5">{t('public.fields.hostingProvider')}</td>
                    <td className="px-3 py-2 sm:px-4 sm:py-2.5">{manual.host || '\u2014'}</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-3 py-2 font-medium sm:px-4 sm:py-2.5">{t('public.fields.hostingPlan')}</td>
                    <td className="px-3 py-2 sm:px-4 sm:py-2.5">{manual.host_plan || '\u2014'}</td>
                  </tr>
                  <tr className="border-b border-border bg-secondary/20">
                    <td className="px-3 py-2 font-medium sm:px-4 sm:py-2.5">{t('public.fields.hostingRenewal')}</td>
                    <td className="px-3 py-2 sm:px-4 sm:py-2.5">{fmtDate(manual.host_renewal)}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium sm:px-4 sm:py-2.5">{t('public.fields.emailProvider')}</td>
                    <td className="px-3 py-2 sm:px-4 sm:py-2.5">{manual.email_provider || '\u2014'}</td>
                  </tr>
                  {renderBuiltinCustomFieldRows('hosting_email')}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Accounts & Ownership */}
        <section className="manual-section mb-8 sm:mb-10">
          <h2 className="mb-3 flex items-center gap-2 text-xl sm:mb-4 sm:text-2xl" style={sectionHeadingStyle}>
            <Users className="h-5 w-5 shrink-0" style={{ color: brandColor }} />
            {t('public.sections.accounts')}
          </h2>
          <p className="mb-3 text-sm leading-relaxed sm:mb-4 sm:text-base">{renderInterpolated('accounts_intro')}</p>

          {accounts.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="px-3 py-2 text-left font-medium sm:px-4 sm:py-2.5">{t('public.fields.service')}</th>
                    <th className="px-3 py-2 text-left font-medium sm:px-4 sm:py-2.5">{t('public.fields.owner')}</th>
                    <th className="px-3 py-2 text-left font-medium sm:px-4 sm:py-2.5">{t('public.fields.adminEmail')}</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((a, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-secondary/10' : ''}>
                      <td className="px-3 py-2 sm:px-4 sm:py-2.5">{a.service || '\u2014'}</td>
                      <td className="px-3 py-2 sm:px-4 sm:py-2.5">{a.account_owner || '\u2014'}</td>
                      <td className="break-all px-3 py-2 sm:px-4 sm:py-2.5">{a.admin_email || '\u2014'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('public.noAccounts')}</p>
          )}

          {accountsCustomFields.length > 0 && (
            <div className="mt-4 overflow-hidden rounded-lg border border-border">
              <table className="w-full text-xs sm:text-sm">
                <tbody>
                  {accountsCustomFields.map((field, i) => (
                    <tr key={field.id} className={i % 2 === 0 ? 'border-b border-border bg-secondary/20' : 'border-b border-border'}>
                      <td className="px-3 py-2 font-medium sm:px-4 sm:py-2.5">{field.label}</td>
                      <td className="whitespace-pre-wrap px-3 py-2 sm:px-4 sm:py-2.5">{field.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 sm:mt-4">
            <p className="text-xs text-amber-900 sm:text-sm">{getDefault('accounts_note', locale)}</p>
          </div>
        </section>

        {/* How To Edit */}
        {editBlocks.length > 0 && (
          <section className="manual-section mb-8 sm:mb-10">
            <h2 className="mb-3 flex items-center gap-2 text-xl sm:mb-4 sm:text-2xl" style={sectionHeadingStyle}>
              <PencilLine className="h-5 w-5 shrink-0" style={{ color: brandColor }} />
              {t('public.sections.edit')}
            </h2>
            <p className="mb-3 text-sm leading-relaxed sm:mb-4 sm:text-base">{renderInterpolated('edit_blocks_intro')}</p>
            <div className="space-y-3 sm:space-y-4">
              {editBlocks.map((block, i) => (
                <div key={i} className="rounded-lg border border-border p-3 sm:p-5">
                  <h3 className="mb-2 text-base sm:text-lg" style={{ color: brandColor }}>
                    {block.block_name}
                  </h3>
                  <p className="whitespace-pre-wrap text-xs leading-relaxed sm:text-sm">
                    {block.instructions}
                  </p>
                </div>
              ))}
            </div>
            {editCustomFields.length > 0 && (
              <div className="mt-4 space-y-3">
                {renderBuiltinCustomFieldParagraphs('how_to_edit')}
              </div>
            )}
          </section>
        )}

        {/* What's Covered */}
        {(includedItems.length > 0 || excludedItems.length > 0 || coverageCustomFields.length > 0) && (
          <section className="manual-section mb-8 sm:mb-10">
            <h2 className="mb-3 flex items-center gap-2 text-xl sm:mb-4 sm:text-2xl" style={sectionHeadingStyle}>
              <CheckSquare className="h-5 w-5 shrink-0" style={{ color: brandColor }} />
              {t('public.sections.coverage')}
            </h2>
            <p className="mb-3 text-sm leading-relaxed sm:mb-4 sm:text-base">{renderInterpolated('coverage_intro')}</p>
            <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
              {includedItems.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-medium sm:mb-3" style={{ color: brandColor }}>
                    {getDefault('coverage_included', locale)}
                  </h3>
                  <ul className="space-y-1.5 sm:space-y-2">
                    {includedItems.map((c, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs sm:text-sm">
                        <span className="mt-0.5 text-green-600">&#10003;</span>
                        <span>{c.item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {excludedItems.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-medium text-muted-foreground sm:mb-3">
                    {getDefault('coverage_excluded', locale)}
                  </h3>
                  <ul className="space-y-1.5 sm:space-y-2">
                    {excludedItems.map((c, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs sm:text-sm">
                        <span className="mt-0.5 text-amber-600">&#8212;</span>
                        <span>{c.item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {coverageCustomFields.length > 0 && (
              <div className="mt-4 overflow-hidden rounded-lg border border-border">
                <table className="w-full text-xs sm:text-sm">
                  <tbody>
                    {coverageCustomFields.map((field, i) => (
                      <tr key={field.id} className={i % 2 === 0 ? 'border-b border-border bg-secondary/20' : 'border-b border-border'}>
                        <td className="px-3 py-2 font-medium sm:px-4 sm:py-2.5">{field.label}</td>
                        <td className="whitespace-pre-wrap px-3 py-2 sm:px-4 sm:py-2.5">{field.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Emergency Contacts */}
        <section className="manual-section mb-8 sm:mb-10">
          <h2 className="mb-3 flex items-center gap-2 text-xl sm:mb-4 sm:text-2xl" style={sectionHeadingStyle}>
            <Phone className="h-5 w-5 shrink-0" style={{ color: brandColor }} />
            {t('public.sections.emergency')}
          </h2>
          <p className="mb-3 text-sm leading-relaxed sm:mb-4 sm:text-base">{renderInterpolated('emergency_intro')}</p>
          <p className="mb-3 text-sm leading-relaxed sm:mb-4 sm:text-base">{renderInterpolated('emergency_contact')}</p>

          <div className="rounded-lg border border-border p-3 sm:p-5">
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">{t('public.fields.emergencyContact')}</p>
                <p className="mt-1 text-sm font-medium">{manual.emergency_name || '\u2014'}</p>
                {manual.emergency_role && (
                  <p className="text-xs text-muted-foreground sm:text-sm">{manual.emergency_role}</p>
                )}
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">{t('public.fields.phone')}</p>
                <p className="mt-1 text-sm font-medium">{manual.emergency_phone || '\u2014'}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">{t('public.fields.email')}</p>
                <p className="mt-1 break-all text-sm font-medium">{manual.emergency_email || '\u2014'}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">{t('public.fields.generalSupport')}</p>
                <p className="mt-1 break-all text-sm font-medium">{agency.support_email || '\u2014'}</p>
                <p className="text-xs text-muted-foreground sm:text-sm">{agency.support_hours || ''}</p>
              </div>
            </div>
          </div>

          {emergencyCustomFields.length > 0 && (
            <div className="mt-4 overflow-hidden rounded-lg border border-border">
              <table className="w-full text-xs sm:text-sm">
                <tbody>
                  {emergencyCustomFields.map((field, i) => (
                    <tr key={field.id} className={i % 2 === 0 ? 'border-b border-border bg-secondary/20' : 'border-b border-border'}>
                      <td className="px-3 py-2 font-medium sm:px-4 sm:py-2.5">{field.label}</td>
                      <td className="whitespace-pre-wrap px-3 py-2 sm:px-4 sm:py-2.5">{field.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Files & assets */}
        {assets.length > 0 && (
          <section className="manual-section mb-8 sm:mb-10">
            <h2 className="mb-3 flex items-center gap-2 text-xl sm:mb-4 sm:text-2xl" style={sectionHeadingStyle}>
              <FolderOpen className="h-5 w-5 shrink-0" style={{ color: brandColor }} />
              {t('public.sections.assets')}
            </h2>
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-xs sm:text-sm">
                <tbody>
                  {[...assets].sort((a, b) => a.sort_order - b.sort_order).map((asset, i) => (
                    <tr key={asset.id} className={i % 2 === 0 ? 'border-b border-border bg-secondary/20' : 'border-b border-border'}>
                      <td className="px-3 py-2 sm:px-4 sm:py-2.5">
                        <p className="font-medium">{asset.label}</p>
                        {asset.asset_owner && (
                          <p className="text-xs text-muted-foreground sm:text-sm">{t('public.fields.assetOwner')}: {asset.asset_owner}</p>
                        )}
                        {asset.notes && (
                          <p className="text-xs text-muted-foreground sm:text-sm">{t('public.fields.assetNotes')}: {asset.notes}</p>
                        )}
                      </td>
                      <td className="break-all px-3 py-2 sm:px-4 sm:py-2.5">
                        {asset.url ? (
                          <a href={asset.url} target="_blank" rel="noopener noreferrer" className="underline" style={linkStyle}>
                            {asset.url}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">{'\u2014'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Custom sections */}
        {[...customSections].sort((a, b) => a.position - b.position).map((section) => renderCustomSection(section))}

        {/* Footer - hidden for paid accounts */}
        {showFooter && (
          <footer className="mt-12 border-t border-border pt-4 text-center sm:mt-16 sm:pt-6">
            <p className="text-xs text-muted-foreground sm:text-sm">
              <a
                href="https://handover.app"
                className="underline transition-colors hover:text-foreground"
                style={linkStyle}
              >
                {getDefault('made_with', locale)}
              </a>
            </p>
          </footer>
        )}

        {/* Print-only agency website */}
        {agencyWebsite && (
          <p className="print-only mt-4 text-center text-xs text-muted-foreground" style={{ display: 'none' }}>
            {agencyWebsite}
          </p>
        )}
      </div>
    </div>
  );
}
