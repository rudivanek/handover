'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { interpolate, getDefault } from '@/lib/defaults';
import { MARKETING_URL } from '@/lib/utils';
import type { Manual, Account, EditBlock, Coverage, CustomSection, CustomField, Asset, MaintenanceTask, MaintenanceCadence, Locale } from '@/lib/types';
import { fonts, getFontDef, inferFontFormat, SYSTEM_STACK, SERIF_STACK } from '@/lib/fonts';
import { Button } from '@/components/ui/button';
import { Printer, FileText, Globe, Server, Users, PencilLine, CheckSquare, Phone, FolderOpen, CalendarCheck } from 'lucide-react';
import { HandoverMark } from '@/components/Logo';
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
  maintenance_tasks: MaintenanceTask[];
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
  const maintenanceTasks = data?.maintenance_tasks ?? [];

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
          <span className="text-xl">{t('public.loadingManual')}</span>
        </div>
      </div>
    );
  }

  if (notFound || !manual || !agency) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-secondary/30 px-4">
        <FileText className="mb-4 h-12 w-12 text-muted-foreground/50" strokeWidth={1} />
        <h1 className="text-2xl">{t('public.manualNotFound')}</h1>
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

  const renderInterpolated = (key: string): string | null => {
    const { text, complete } = interpolate(getDefault(key, locale), manual, profileForInterpolate, locale);
    return complete ? text : null;
  };

  const siteIntro = renderInterpolated('site_intro');
  const siteOverview = renderInterpolated('site_overview');
  const platformText = renderInterpolated('platform');
  const frameworkText = renderInterpolated('framework_or_theme');
  const keyPluginsText = renderInterpolated('key_plugins');
  const domainText = renderInterpolated('domain');
  const domainExpiryText = renderInterpolated('domain_expiry');
  const domainOwnerText = renderInterpolated('domain_owner');
  const nameserversText = renderInterpolated('nameservers');
  const hostText = renderInterpolated('host');
  const hostPlanText = renderInterpolated('host_plan');
  const hostRenewalText = renderInterpolated('host_renewal');
  const emailProviderText = renderInterpolated('email_provider');
  const accountsIntroText = renderInterpolated('accounts_intro');
  const editBlocksIntroText = renderInterpolated('edit_blocks_intro');
  const coverageIntroText = renderInterpolated('coverage_intro');
  const emergencyIntroText = renderInterpolated('emergency_intro');
  const emergencyContactText = renderInterpolated('emergency_contact');
  const supportGeneralText = renderInterpolated('support_general');
  const assetsNoteText = renderInterpolated('assets_note');
  const maintenanceIntroText = renderInterpolated('maintenance_intro');
  const maintenanceNoteText = renderInterpolated('maintenance_note');

  const hasEmergencyCard = !!(
    manual.emergency_name || manual.emergency_role ||
    manual.emergency_phone || manual.emergency_email ||
    agency.support_email
  );

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

  const renderCustomSection = (section: CustomSection, num: number) => {
    const fields = customFields
      .filter((f) => f.section_type === 'custom' && f.section_key === section.id && f.label && f.label.trim() && f.value && f.value.trim())
      .sort((a, b) => a.position - b.position);

    if (fields.length === 0) return null;

    return (
      <section key={section.id} id={`custom-${section.id}`} className="manual-section mb-8 sm:mb-10 scroll-mt-20">
        <h2 className="mb-3 flex items-center gap-2 text-xl sm:mb-4 sm:text-2xl" style={sectionHeadingStyle}>
          <FileText className="h-5 w-5 shrink-0" style={{ color: brandColor }} />
          <span className="text-sm font-normal text-muted-foreground sm:text-base">{num}.</span>
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
  const maintenanceCustomFields = getFilledBuiltinFields('maintenance');

  const customSectionsInOrder = [...customSections].sort((a, b) => a.position - b.position);
  const hasFieldsFor = (section: CustomSection): boolean => {
    return customFields.some(
      (f) => f.section_type === 'custom' && f.section_key === section.id && f.label && f.label.trim() && f.value && f.value.trim()
    );
  };

  const sectionList = [
    { id: 'site',        label: t('public.sections.site'),        present: true },
    { id: 'domain',      label: t('public.sections.domain'),      present: true },
    { id: 'hosting',     label: t('public.sections.hosting'),     present: true },
    { id: 'accounts',    label: t('public.sections.accounts'),    present: accounts.length > 0 || accountsCustomFields.length > 0 },
    { id: 'edit',        label: t('public.sections.edit'),        present: editBlocks.length > 0 || editCustomFields.length > 0 },
    { id: 'coverage',    label: t('public.sections.coverage'),    present: includedItems.length > 0 || excludedItems.length > 0 || coverageCustomFields.length > 0 },
    { id: 'maintenance', label: t('public.sections.maintenance'), present: maintenanceTasks.length > 0 },
    { id: 'emergency',   label: t('public.sections.emergency'),   present: true },
    { id: 'assets',      label: t('public.sections.assets'),      present: assets.length > 0 },
    ...customSectionsInOrder.map((s) => ({ id: `custom-${s.id}`, label: s.title, present: hasFieldsFor(s) })),
  ].filter((s) => s.present);

  const sectionNumber = (id: string): number => {
    const idx = sectionList.findIndex((s) => s.id === id);
    return idx >= 0 ? idx + 1 : 0;
  };

  const maintenanceCadenceOrder: MaintenanceCadence[] = ['daily', 'weekly', 'monthly', 'annual'];
  const maintenanceByCadence = maintenanceCadenceOrder
    .map((cadence) => ({ cadence, tasks: maintenanceTasks.filter((t) => t.cadence === cadence).sort((a, b) => a.sort_order - b.sort_order) }))
    .filter((group) => group.tasks.length > 0);

  const maintenanceOwnerName = (owner: string): string => {
    if (owner === 'agency') return agency.agency_name || t('maintenance.owner.agency');
    if (owner === 'client') return manual.client_name || t('maintenance.owner.client');
    return t('maintenance.owner.shared');
  };

  const handlePrint = () => {
    const previous = document.title;
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
    document.title = `${manual.slug}-${stamp}`;
    const restore = () => { document.title = previous; window.removeEventListener('afterprint', restore); };
    window.addEventListener('afterprint', restore);
    window.print();
    setTimeout(restore, 1000);
  };

  return (
    <div className="min-h-screen bg-secondary/20">
      <meta name="referrer" content="no-referrer" />
      {/* Top bar - hidden on print */}
      <div className="no-print sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-3 sm:px-6">
          <span className="truncate text-sm text-muted-foreground">
            {manual.client_name} {'\u2014'} {t('public.websiteOwnersManual')}
          </span>
          <Button variant="outline" size="sm" onClick={handlePrint} className="shrink-0">
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
          {manual.updated_at && (
            <p className="mt-1 text-sm text-muted-foreground">
              {t('public.lastUpdated')} {fmtDate(manual.updated_at)}
            </p>
          )}
          <div className="mt-4 h-px w-full sm:mt-6" style={sectionRuleStyle} />
        </div>

        {/* Intro */}
        {siteIntro && (
          <div className="manual-intro mb-8 sm:mb-10">
            <p className="text-sm leading-relaxed text-foreground sm:text-base">
              {siteIntro}
            </p>
          </div>
        )}

        {/* Table of contents */}
        {sectionList.length >= 4 && (
          <div className="manual-contents mb-8 sm:mb-10">
            <h2 className="mb-3 text-lg font-medium text-muted-foreground sm:mb-4 sm:text-xl">
              {t('public.contents')}
            </h2>
            <ol className="space-y-1.5 sm:space-y-2">
              {sectionList.map((s, i) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="text-sm underline transition-colors hover:opacity-80 sm:text-base"
                    style={linkStyle}
                  >
                    {i + 1}. {s.label}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Site & Stack */}
        <section id="site" className={`manual-section ${siteIntro ? '' : 'manual-section-first'} mb-8 sm:mb-10 scroll-mt-20`}>
          <h2 className="mb-3 flex items-center gap-2 text-xl sm:mb-4 sm:text-2xl" style={sectionHeadingStyle}>
            <Globe className="h-5 w-5 shrink-0" style={{ color: brandColor }} />
            <span className="text-sm font-normal text-muted-foreground sm:text-base">{sectionNumber('site')}.</span>
            {t('public.sections.site')}
          </h2>
          <div className="space-y-3 sm:space-y-4">
            {siteOverview && <p className="text-sm leading-relaxed sm:text-base">{siteOverview}</p>}
            {platformText && <p className="text-sm leading-relaxed sm:text-base">{platformText}</p>}
            {frameworkText && <p className="text-sm leading-relaxed sm:text-base">{frameworkText}</p>}
            {keyPluginsText && <p className="text-sm leading-relaxed sm:text-base">{keyPluginsText}</p>}

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
        <section id="domain" className="manual-section mb-8 sm:mb-10 scroll-mt-20">
          <h2 className="mb-3 flex items-center gap-2 text-xl sm:mb-4 sm:text-2xl" style={sectionHeadingStyle}>
            <Globe className="h-5 w-5 shrink-0" style={{ color: brandColor }} />
            <span className="text-sm font-normal text-muted-foreground sm:text-base">{sectionNumber('domain')}.</span>
            {t('public.sections.domain')}
          </h2>
          <div className="space-y-3 sm:space-y-4">
            {domainText && <p className="text-sm leading-relaxed sm:text-base">{domainText}</p>}
            {domainExpiryText && <p className="text-sm leading-relaxed sm:text-base">{domainExpiryText}</p>}
            {manual.domain_owner && domainOwnerText && <p className="text-sm leading-relaxed sm:text-base">{domainOwnerText}</p>}
            {nameserversText && <p className="text-sm leading-relaxed sm:text-base">{nameserversText}</p>}

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
        <section id="hosting" className="manual-section mb-8 sm:mb-10 scroll-mt-20">
          <h2 className="mb-3 flex items-center gap-2 text-xl sm:mb-4 sm:text-2xl" style={sectionHeadingStyle}>
            <Server className="h-5 w-5 shrink-0" style={{ color: brandColor }} />
            <span className="text-sm font-normal text-muted-foreground sm:text-base">{sectionNumber('hosting')}.</span>
            {t('public.sections.hosting')}
          </h2>
          <div className="space-y-3 sm:space-y-4">
            {hostText && <p className="text-sm leading-relaxed sm:text-base">{hostText}</p>}
            {hostPlanText && <p className="text-sm leading-relaxed sm:text-base">{hostPlanText}</p>}
            {hostRenewalText && <p className="text-sm leading-relaxed sm:text-base">{hostRenewalText}</p>}
            {emailProviderText && <p className="text-sm leading-relaxed sm:text-base">{emailProviderText}</p>}

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
        <section id="accounts" className="manual-section mb-8 sm:mb-10 scroll-mt-20">
          <h2 className="mb-3 flex items-center gap-2 text-xl sm:mb-4 sm:text-2xl" style={sectionHeadingStyle}>
            <Users className="h-5 w-5 shrink-0" style={{ color: brandColor }} />
            <span className="text-sm font-normal text-muted-foreground sm:text-base">{sectionNumber('accounts')}.</span>
            {t('public.sections.accounts')}
          </h2>
          {accountsIntroText && <p className="mb-3 text-sm leading-relaxed sm:mb-4 sm:text-base">{accountsIntroText}</p>}

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
          <section id="edit" className="manual-section mb-8 sm:mb-10 scroll-mt-20">
            <h2 className="mb-3 flex items-center gap-2 text-xl sm:mb-4 sm:text-2xl" style={sectionHeadingStyle}>
              <PencilLine className="h-5 w-5 shrink-0" style={{ color: brandColor }} />
              <span className="text-sm font-normal text-muted-foreground sm:text-base">{sectionNumber('edit')}.</span>
              {t('public.sections.edit')}
            </h2>
            {editBlocksIntroText && <p className="mb-3 text-sm leading-relaxed sm:mb-4 sm:text-base">{editBlocksIntroText}</p>}
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
          <section id="coverage" className="manual-section mb-8 sm:mb-10 scroll-mt-20">
            <h2 className="mb-3 flex items-center gap-2 text-xl sm:mb-4 sm:text-2xl" style={sectionHeadingStyle}>
              <CheckSquare className="h-5 w-5 shrink-0" style={{ color: brandColor }} />
              <span className="text-sm font-normal text-muted-foreground sm:text-base">{sectionNumber('coverage')}.</span>
              {t('public.sections.coverage')}
            </h2>
            {coverageIntroText && <p className="mb-3 text-sm leading-relaxed sm:mb-4 sm:text-base">{coverageIntroText}</p>}
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

        {/* Maintenance schedule */}
        {maintenanceTasks.length > 0 && (
          <section id="maintenance" className="manual-section mb-8 sm:mb-10 scroll-mt-20">
            <h2 className="mb-3 flex items-center gap-2 text-xl sm:mb-4 sm:text-2xl" style={sectionHeadingStyle}>
              <CalendarCheck className="h-5 w-5 shrink-0" style={{ color: brandColor }} />
              <span className="text-sm font-normal text-muted-foreground sm:text-base">{sectionNumber('maintenance')}.</span>
              {t('public.sections.maintenance')}
            </h2>
            {maintenanceIntroText && <p className="mb-3 text-sm leading-relaxed sm:mb-4 sm:text-base">{maintenanceIntroText}</p>}
            <div className="space-y-5 sm:space-y-6">
              {maintenanceByCadence.map((group) => {
                const hasNotes = group.tasks.some((t) => t.notes && t.notes.trim());
                return (
                  <div key={group.cadence} className="break-inside-avoid">
                    <h3 className="mb-2 text-sm font-medium sm:mb-3" style={{ color: brandColor }}>
                      {t(`maintenance.cadence.${group.cadence}`)}
                    </h3>
                    <div className="overflow-hidden rounded-lg border border-border">
                      <table className="w-full text-xs sm:text-sm">
                        <thead>
                          <tr className="border-b border-border bg-secondary/30">
                            <th className="px-3 py-2 text-left font-medium sm:px-4 sm:py-2.5">{t('maintenance.columns.task')}</th>
                            <th className="px-3 py-2 text-left font-medium sm:px-4 sm:py-2.5">{t('maintenance.columns.who')}</th>
                            {hasNotes && <th className="px-3 py-2 text-left font-medium sm:px-4 sm:py-2.5">{t('maintenance.columns.notes')}</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {group.tasks.map((task, i) => (
                            <tr key={task.id} className={i % 2 === 0 ? 'border-b border-border bg-secondary/20' : 'border-b border-border'}>
                              <td className="px-3 py-2 sm:px-4 sm:py-2.5">{task.task || '\u2014'}</td>
                              <td className="px-3 py-2 sm:px-4 sm:py-2.5">{maintenanceOwnerName(task.owner)}</td>
                              {hasNotes && <td className="whitespace-pre-wrap px-3 py-2 sm:px-4 sm:py-2.5">{task.notes || '\u2014'}</td>}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
            {maintenanceCustomFields.length > 0 && (
              <div className="mt-4 overflow-hidden rounded-lg border border-border">
                <table className="w-full text-xs sm:text-sm">
                  <tbody>
                    {maintenanceCustomFields.map((field, i) => (
                      <tr key={field.id} className={i % 2 === 0 ? 'border-b border-border bg-secondary/20' : 'border-b border-border'}>
                        <td className="px-3 py-2 font-medium sm:px-4 sm:py-2.5">{field.label}</td>
                        <td className="whitespace-pre-wrap px-3 py-2 sm:px-4 sm:py-2.5">{field.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {maintenanceNoteText && <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:mt-4">{maintenanceNoteText}</p>}
          </section>
        )}

        {/* Emergency Contacts */}
        <section id="emergency" className="manual-section mb-8 sm:mb-10 scroll-mt-20">
          <h2 className="mb-3 flex items-center gap-2 text-xl sm:mb-4 sm:text-2xl" style={sectionHeadingStyle}>
            <Phone className="h-5 w-5 shrink-0" style={{ color: brandColor }} />
            <span className="text-sm font-normal text-muted-foreground sm:text-base">{sectionNumber('emergency')}.</span>
            {t('public.sections.emergency')}
          </h2>
          {emergencyIntroText && <p className="mb-3 text-sm leading-relaxed sm:mb-4 sm:text-base">{emergencyIntroText}</p>}
          {emergencyContactText && <p className="mb-3 text-sm leading-relaxed sm:mb-4 sm:text-base">{emergencyContactText}</p>}
          {supportGeneralText && <p className="mb-3 text-sm leading-relaxed sm:mb-4 sm:text-base">{supportGeneralText}</p>}

          {hasEmergencyCard && (
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
          )}

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
          <section id="assets" className="manual-section mb-8 sm:mb-10 scroll-mt-20">
            <h2 className="mb-3 flex items-center gap-2 text-xl sm:mb-4 sm:text-2xl" style={sectionHeadingStyle}>
              <FolderOpen className="h-5 w-5 shrink-0" style={{ color: brandColor }} />
              <span className="text-sm font-normal text-muted-foreground sm:text-base">{sectionNumber('assets')}.</span>
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
            {assetsNoteText && <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:mt-4">{assetsNoteText}</p>}
          </section>
        )}

        {/* Custom sections */}
        {customSectionsInOrder.map((section) => renderCustomSection(section, sectionNumber(`custom-${section.id}`)))}

        {/* Footer - hidden for paid accounts */}
        {showFooter && (
          <footer className="mt-12 border-t border-border pt-4 text-center sm:mt-16 sm:pt-6">
            <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground sm:text-sm">
              <HandoverMark size={13} color="currentColor" />
              <a
                href={MARKETING_URL}
                target="_blank"
                rel="noopener"
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
