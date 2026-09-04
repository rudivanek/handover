'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useRequireAuth } from '@/lib/use-require-auth';
import { useI18n } from '@/lib/i18n';
import { AppShell } from '@/components/app-shell';
import { supabase } from '@/lib/supabase';
import { interpolate, getDefault, getDefaultsForLocale } from '@/lib/defaults';
import { computeCompletion, isDraft } from '@/lib/completion';
import type { Manual, Account, EditBlock, Coverage, CustomSection, CustomField, Asset, Locale } from '@/lib/types';
import { checkFieldName, isSecretConstraintError } from '@/lib/secret-names';
import type { NameCheckLevel } from '@/lib/secret-names';
import { EXAMPLE_MANUAL_URL } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Globe,
  Server,
  Mail,
  Users,
  PencilLine,
  CheckSquare,
  Phone,
  Plus,
  Trash2,
  ExternalLink,
  ChevronLeft,
  AlertTriangle,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  FolderOpen,
  Link2,
  ArrowUpRight,
} from 'lucide-react';

const BUILTIN_SECTION_KEYS: Record<string, string> = {
  site: 'site_stack',
  domain: 'domain_dns',
  hosting: 'hosting_email',
  accounts: 'accounts',
  edit: 'how_to_edit',
  coverage: 'coverage',
  emergency: 'emergency',
};

export default function EditManualPage() {
  const { profile } = useAuth();
  const { loading } = useRequireAuth();
  const { locale: uiLocale, t } = useI18n();
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();

  const [manual, setManual] = useState<Manual | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [editBlocks, setEditBlocks] = useState<EditBlock[]>([]);
  const [coverage, setCoverage] = useState<Coverage[]>([]);
  const [customSections, setCustomSections] = useState<CustomSection[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openSection, setOpenSection] = useState<string>('site');
  const [shareWarnOpen, setShareWarnOpen] = useState(false);
  const [deleteSectionId, setDeleteSectionId] = useState<string | null>(null);
  const [localeWarnOpen, setLocaleWarnOpen] = useState(false);
  const [pendingLocale, setPendingLocale] = useState<Locale | null>(null);
  const [fieldCheckResults, setFieldCheckResults] = useState<Record<string, NameCheckLevel>>({});
  const [sectionCheckResults, setSectionCheckResults] = useState<Record<string, NameCheckLevel>>({});
  const [assetCheckResults, setAssetCheckResults] = useState<Record<string, NameCheckLevel>>({});

  const manualLocale: Locale = (manual?.locale as Locale) || 'en';

  const fetchData = useCallback(async () => {
    const [manualRes, accountsRes, blocksRes, coverageRes, sectionsRes, fieldsRes, assetsRes] = await Promise.all([
      supabase.from('manuals').select('*').eq('id', id).maybeSingle(),
      supabase.from('accounts').select('*').eq('manual_id', id).order('created_at'),
      supabase.from('edit_blocks').select('*').eq('manual_id', id).order('created_at'),
      supabase.from('coverage').select('*').eq('manual_id', id).order('created_at'),
      supabase.from('custom_sections').select('*').eq('manual_id', id).order('position'),
      supabase.from('custom_fields').select('*').eq('manual_id', id).order('position'),
      supabase.from('assets').select('*').eq('manual_id', id).order('sort_order'),
    ]);

    if (manualRes.data) setManual(manualRes.data as Manual);
    setAccounts((accountsRes.data as Account[]) || []);
    setEditBlocks((blocksRes.data as EditBlock[]) || []);
    setCoverage((coverageRes.data as Coverage[]) || []);
    setCustomSections((sectionsRes.data as CustomSection[]) || []);
    setCustomFields((fieldsRes.data as CustomField[]) || []);
    setAssets((assetsRes.data as Asset[]) || []);
    setFetching(false);
  }, [id]);

  useEffect(() => {
    if (loading) return;
    fetchData();
  }, [loading, fetchData]);

  // Auto-save debounced for manual fields
  useEffect(() => {
    if (!manual) return;
    const timer = setTimeout(async () => {
      setSaving(true);
      const { error } = await supabase
        .from('manuals')
        .update({
          client_name: manual.client_name,
          site_name: manual.site_name,
          site_url: manual.site_url,
          platform: manual.platform,
          framework_or_theme: manual.framework_or_theme,
          key_plugins: manual.key_plugins,
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
          locale: manual.locale,
        })
        .eq('id', manual.id);
      setSaving(false);
      if (error) {
        toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [manual, toast]);

  const updateManual = (field: keyof Manual, value: string | string[]) => {
    setManual((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  // Accounts
  const addAccount = () => {
    setAccounts((prev) => [
      ...prev,
      { id: '', manual_id: id, service: '', account_owner: '', admin_email: '' },
    ]);
  };

  const updateAccount = (idx: number, field: keyof Account, value: string) => {
    setAccounts((prev) => prev.map((a, i) => (i === idx ? { ...a, [field]: value } : a)));
  };

  const removeAccount = async (idx: number) => {
    const account = accounts[idx];
    if (account.id) {
      await supabase.from('accounts').delete().eq('id', account.id);
    }
    setAccounts((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveAccount = async (idx: number) => {
    const a = accounts[idx];
    if (!a.service && !a.account_owner && !a.admin_email) return;
    if (a.id) {
      await supabase.from('accounts').update({
        service: a.service,
        account_owner: a.account_owner,
        admin_email: a.admin_email,
      }).eq('id', a.id);
    } else {
      const { data } = await supabase.from('accounts').insert({
        manual_id: id,
        service: a.service,
        account_owner: a.account_owner,
        admin_email: a.admin_email,
      }).select().single();
      if (data) {
        setAccounts((prev) => prev.map((x, i) => (i === idx ? data as Account : x)));
      }
    }
  };

  // Edit blocks
  const addEditBlock = () => {
    setEditBlocks((prev) => [
      ...prev,
      { id: '', manual_id: id, block_name: '', instructions: '' },
    ]);
  };

  const updateEditBlock = (idx: number, field: keyof EditBlock, value: string) => {
    setEditBlocks((prev) => prev.map((b, i) => (i === idx ? { ...b, [field]: value } : b)));
  };

  const removeEditBlock = async (idx: number) => {
    const block = editBlocks[idx];
    if (block.id) {
      await supabase.from('edit_blocks').delete().eq('id', block.id);
    }
    setEditBlocks((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveEditBlock = async (idx: number) => {
    const b = editBlocks[idx];
    if (!b.block_name && !b.instructions) return;
    if (b.id) {
      await supabase.from('edit_blocks').update({
        block_name: b.block_name,
        instructions: b.instructions,
      }).eq('id', b.id);
    } else {
      const { data } = await supabase.from('edit_blocks').insert({
        manual_id: id,
        block_name: b.block_name,
        instructions: b.instructions,
      }).select().single();
      if (data) {
        setEditBlocks((prev) => prev.map((x, i) => (i === idx ? data as EditBlock : x)));
      }
    }
  };

  // Coverage
  const addCoverage = (included: boolean) => {
    setCoverage((prev) => [
      ...prev,
      { id: '', manual_id: id, item: '', included },
    ]);
  };

  const updateCoverage = (idx: number, field: keyof Coverage, value: string | boolean) => {
    setCoverage((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  };

  const removeCoverage = async (idx: number) => {
    const c = coverage[idx];
    if (c.id) {
      await supabase.from('coverage').delete().eq('id', c.id);
    }
    setCoverage((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveCoverage = async (idx: number) => {
    const c = coverage[idx];
    if (!c.item) return;
    if (c.id) {
      await supabase.from('coverage').update({
        item: c.item,
        included: c.included,
      }).eq('id', c.id);
    } else {
      const { data } = await supabase.from('coverage').insert({
        manual_id: id,
        item: c.item,
        included: c.included,
      }).select().single();
      if (data) {
        setCoverage((prev) => prev.map((x, i) => (i === idx ? data as Coverage : x)));
      }
    }
  };

  // Assets
  const addAsset = async () => {
    const sortOrder = assets.length;
    const { data } = await supabase.from('assets').insert({
      manual_id: id,
      label: '',
      url: '',
      asset_owner: '',
      notes: '',
      sort_order: sortOrder,
    }).select().single();
    if (data) {
      setAssets((prev) => [...prev, data as Asset]);
    }
  };

  const updateAsset = (assetId: string, field: keyof Asset, value: string) => {
    setAssets((prev) => prev.map((a) => (a.id === assetId ? { ...a, [field]: value } : a)));
  };

  const saveAsset = async (assetId: string) => {
    const a = assets.find((x) => x.id === assetId);
    if (!a) return;
    const check = checkFieldName(a.label);
    setAssetCheckResults((prev) => ({ ...prev, [assetId]: check.level }));
    if (check.level === 'block') return;
    let url = a.url;
    if (url && url.trim() && !url.match(/^[a-z]+:\/\//i) && !url.includes('@')) {
      url = `https://${url.trim()}`;
      setAssets((prev) => prev.map((x) => (x.id === assetId ? { ...x, url } : x)));
    }
    const { error } = await supabase.from('assets').update({
      label: a.label,
      url,
      asset_owner: a.asset_owner,
      notes: a.notes,
    }).eq('id', assetId);
    if (error && (isSecretConstraintError(error.message) || error.message.includes('assets_url_scheme'))) {
      setAssetCheckResults((prev) => ({ ...prev, [assetId]: 'block' }));
    }
  };

  const removeAsset = async (assetId: string) => {
    await supabase.from('assets').delete().eq('id', assetId);
    setAssets((prev) => prev.filter((a) => a.id !== assetId));
  };

  const moveAsset = async (assetId: string, direction: 'up' | 'down') => {
    const sorted = [...assets].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex((a) => a.id === assetId);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const assetA = sorted[idx];
    const assetB = sorted[swapIdx];
    const posA = assetA.sort_order;
    const posB = assetB.sort_order;
    await Promise.all([
      supabase.from('assets').update({ sort_order: posB }).eq('id', assetA.id),
      supabase.from('assets').update({ sort_order: posA }).eq('id', assetB.id),
    ]);
    setAssets((prev) => prev.map((a) => {
      if (a.id === assetA.id) return { ...a, sort_order: posB };
      if (a.id === assetB.id) return { ...a, sort_order: posA };
      return a;
    }));
  };

  // Custom fields (builtin sections)
  const getFieldsForBuiltin = (sectionKey: string): CustomField[] => {
    return customFields
      .filter((f) => f.section_type === 'builtin' && f.section_key === sectionKey)
      .sort((a, b) => a.position - b.position);
  };

  const addCustomFieldBuiltin = async (sectionKey: string) => {
    const existing = getFieldsForBuiltin(sectionKey);
    const position = existing.length;
    const { data } = await supabase.from('custom_fields').insert({
      manual_id: id,
      section_type: 'builtin',
      section_key: sectionKey,
      label: '',
      value: '',
      position,
    }).select().single();
    if (data) {
      setCustomFields((prev) => [...prev, data as CustomField]);
    }
  };

  const updateCustomField = (fieldId: string, field: 'label' | 'value', value: string) => {
    setCustomFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, [field]: value } : f)));
  };

  const saveCustomField = async (fieldId: string) => {
    const cf = customFields.find((f) => f.id === fieldId);
    if (!cf) return;
    const check = checkFieldName(cf.label);
    setFieldCheckResults((prev) => ({ ...prev, [fieldId]: check.level }));
    if (check.level === 'block') return;
    const { error } = await supabase.from('custom_fields').update({
      label: cf.label,
      value: cf.value,
    }).eq('id', fieldId);
    if (error && isSecretConstraintError(error.message)) {
      setFieldCheckResults((prev) => ({ ...prev, [fieldId]: 'block' }));
    }
  };

  const removeCustomField = async (fieldId: string) => {
    await supabase.from('custom_fields').delete().eq('id', fieldId);
    setCustomFields((prev) => prev.filter((f) => f.id !== fieldId));
  };

  const moveCustomField = async (fieldId: string, direction: 'up' | 'down') => {
    const cf = customFields.find((f) => f.id === fieldId);
    if (!cf) return;
    const sectionKey = cf.section_key;
    const sectionType = cf.section_type;
    const fields = customFields
      .filter((f) => f.section_type === sectionType && f.section_key === sectionKey)
      .sort((a, b) => a.position - b.position);
    const idx = fields.findIndex((f) => f.id === fieldId);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= fields.length) return;

    const fieldA = fields[idx];
    const fieldB = fields[swapIdx];
    const posA = fieldA.position;
    const posB = fieldB.position;

    await Promise.all([
      supabase.from('custom_fields').update({ position: posB }).eq('id', fieldA.id),
      supabase.from('custom_fields').update({ position: posA }).eq('id', fieldB.id),
    ]);

    setCustomFields((prev) => prev.map((f) => {
      if (f.id === fieldA.id) return { ...f, position: posB };
      if (f.id === fieldB.id) return { ...f, position: posA };
      return f;
    }));
  };

  // Custom sections
  const addCustomSection = async () => {
    const position = customSections.length;
    const { data } = await supabase.from('custom_sections').insert({
      manual_id: id,
      title: '',
      position,
    }).select().single();
    if (data) {
      setCustomSections((prev) => [...prev, data as CustomSection]);
    }
  };

  const updateCustomSectionTitle = (sectionId: string, title: string) => {
    setCustomSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, title } : s)));
  };

  const saveCustomSectionTitle = async (sectionId: string) => {
    const s = customSections.find((s) => s.id === sectionId);
    if (!s) return;
    const check = checkFieldName(s.title);
    setSectionCheckResults((prev) => ({ ...prev, [sectionId]: check.level }));
    if (check.level === 'block') return;
    const { error } = await supabase.from('custom_sections').update({ title: s.title }).eq('id', sectionId);
    if (error && isSecretConstraintError(error.message)) {
      setSectionCheckResults((prev) => ({ ...prev, [sectionId]: 'block' }));
    }
  };

  const moveCustomSection = async (sectionId: string, direction: 'up' | 'down') => {
    const sorted = [...customSections].sort((a, b) => a.position - b.position);
    const idx = sorted.findIndex((s) => s.id === sectionId);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const sectionA = sorted[idx];
    const sectionB = sorted[swapIdx];
    const posA = sectionA.position;
    const posB = sectionB.position;

    await Promise.all([
      supabase.from('custom_sections').update({ position: posB }).eq('id', sectionA.id),
      supabase.from('custom_sections').update({ position: posA }).eq('id', sectionB.id),
    ]);

    setCustomSections((prev) => prev.map((s) => {
      if (s.id === sectionA.id) return { ...s, position: posB };
      if (s.id === sectionB.id) return { ...s, position: posA };
      return s;
    }));
  };

  const confirmDeleteCustomSection = async () => {
    if (!deleteSectionId) return;
    await Promise.all([
      supabase.from('custom_fields').delete().eq('section_type', 'custom').eq('section_key', deleteSectionId),
      supabase.from('custom_sections').delete().eq('id', deleteSectionId),
    ]);
    setCustomSections((prev) => prev.filter((s) => s.id !== deleteSectionId));
    setCustomFields((prev) => prev.filter((f) => !(f.section_type === 'custom' && f.section_key === deleteSectionId)));
    setDeleteSectionId(null);
  };

  const getFieldsForCustomSection = (sectionId: string): CustomField[] => {
    return customFields
      .filter((f) => f.section_type === 'custom' && f.section_key === sectionId)
      .sort((a, b) => a.position - b.position);
  };

  const addCustomFieldToSection = async (sectionId: string) => {
    const existing = getFieldsForCustomSection(sectionId);
    const position = existing.length;
    const { data } = await supabase.from('custom_fields').insert({
      manual_id: id,
      section_type: 'custom',
      section_key: sectionId,
      label: '',
      value: '',
      position,
    }).select().single();
    if (data) {
      setCustomFields((prev) => [...prev, data as CustomField]);
    }
  };

  // Locale change
  const handleLocaleChangeRequest = (newLocale: Locale) => {
    if (newLocale === manualLocale) return;
    setPendingLocale(newLocale);
    setLocaleWarnOpen(true);
  };

  const confirmLocaleChange = async () => {
    if (!pendingLocale || !manual) return;
    setManual((prev) => prev ? { ...prev, locale: pendingLocale } : prev);
    setLocaleWarnOpen(false);
    setPendingLocale(null);
  };

  if (loading || fetching || !manual) {
    return (
      <AppShell>
        <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>
      </AppShell>
    );
  }

  const previewInterpolated = (key: string) => {
    return interpolate(getDefault(key, manualLocale), manual, profile, manualLocale).text;
  };

  const pluginsString = (manual.key_plugins || []).join(', ');

  const completion = computeCompletion(manual, accounts, editBlocks, coverage, customFields, uiLocale);
  const draft = isDraft(completion.percentage);

  const handlePreviewClick = (e: React.MouseEvent) => {
    if (draft) {
      e.preventDefault();
      setShareWarnOpen(true);
    }
  };

  const copyManualLink = async () => {
    if (!manual) return;
    const url = `${window.location.origin}/m/${manual.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: t('manuals.linkCopied'), description: t('manuals.linkCopiedDesc') });
    } catch {
      toast({ title: t('manuals.linkCopyFailed'), description: url });
    }
  };

  const handleCopyLinkClick = () => {
    if (draft) {
      setShareWarnOpen(true);
    } else {
      copyManualLink();
    }
  };

  const localeLabel = (l: Locale) => l === 'es' ? 'Espa\u00f1ol' : 'English';

  // Render custom field rows for a builtin section
  const renderBuiltinCustomFields = (sectionKey: string) => {
    const fields = getFieldsForBuiltin(sectionKey);
    if (fields.length === 0) return null;
    return (
      <div className="mt-4 space-y-2 border-t border-dashed border-border pt-4">
        <p className="text-xs font-medium text-muted-foreground">{t('edit.customFields')}</p>
        {fields.map((field, i) => (
          <div key={field.id} className="flex items-start gap-2 rounded-lg border border-border p-3">
            <div className="flex flex-col gap-0.5 pt-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                disabled={i === 0}
                onClick={() => moveCustomField(field.id, 'up')}
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                disabled={i === fields.length - 1}
                onClick={() => moveCustomField(field.id, 'down')}
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex-1 space-y-2">
              <Input
                value={field.label}
                onChange={(e) => {
                  updateCustomField(field.id, 'label', e.target.value);
                  if (fieldCheckResults[field.id]) {
                    setFieldCheckResults((prev) => { const next = { ...prev }; delete next[field.id]; return next; });
                  }
                }}
                onBlur={() => saveCustomField(field.id)}
                placeholder={t('edit.fieldLabelPlaceholder')}
                className={`text-sm ${fieldCheckResults[field.id] === 'block' ? 'border-destructive' : ''}`}
              />
              {fieldCheckResults[field.id] === 'block' && (
                <p className="text-xs text-destructive">{t('secretName.blocked')}</p>
              )}
              {fieldCheckResults[field.id] === 'warn' && (
                <p className="text-xs text-muted-foreground">{t('secretName.warned')}</p>
              )}
              <Textarea
                value={field.value}
                onChange={(e) => updateCustomField(field.id, 'value', e.target.value)}
                onBlur={() => saveCustomField(field.id)}
                placeholder={t('edit.fieldValuePlaceholder')}
                rows={2}
                className="text-sm"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => removeCustomField(field.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    );
  };

  // Render the "+ Add field" button for a builtin section
  const renderAddFieldButton = (sectionKey: string) => (
    <Button
      variant="outline"
      size="sm"
      className="mt-3"
      onClick={() => addCustomFieldBuiltin(sectionKey)}
    >
      <Plus className="mr-2 h-4 w-4" />
      {t('edit.addField')}
    </Button>
  );

  return (
    <AppShell>
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-2 text-muted-foreground">
          <Link href="/manuals">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t('common.allManuals')}
          </Link>
        </Button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl tracking-tight-app">{manual.client_name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('edit.subtitle')}
              {saving ? `  ${t('edit.savingStatus')}` : `  ${t('edit.savedStatus')}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Manual locale selector */}
            <div className="flex items-center gap-1 rounded-lg border border-border p-1">
              <Globe className="h-4 w-4 text-muted-foreground ml-1" />
              <Button
                variant={manualLocale === 'en' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => handleLocaleChangeRequest('en')}
              >
                EN
              </Button>
              <Button
                variant={manualLocale === 'es' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => handleLocaleChangeRequest('es')}
              >
                ES
              </Button>
            </div>
            <Button variant="outline" asChild>
              <Link href={`/m/${manual.slug}`} target="_blank" onClick={handlePreviewClick}>
                <ExternalLink className="mr-2 h-4 w-4" />
                {t('common.preview')}
              </Link>
            </Button>
            <Button variant="outline" onClick={handleCopyLinkClick}>
              <Link2 className="mr-2 h-4 w-4" />
              {t('manuals.copyLink')}
            </Button>
          </div>
        </div>
      </div>

      {/* Completion meter */}
      <Card className="mb-6">
        <CardContent className="py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {draft ? (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {t('edit.completion.complete', { percent: completion.percentage })}
                  {draft && <span className="ml-2 text-amber-600">{t('edit.completion.draft')}</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {completion.missing.length === 0
                    ? t('edit.completion.allFilled')
                    : t('edit.completion.missing', { count: completion.missing.length })}
                </p>
                <a
                  href={EXAMPLE_MANUAL_URL}
                  target="_blank"
                  rel="noopener"
                  className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground/70 transition-colors hover:text-muted-foreground"
                >
                  {t('manuals.seeExample')}
                  <ArrowUpRight className="h-3 w-3" />
                </a>
              </div>
            </div>
            <div className="w-24 sm:w-40">
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${completion.percentage}%` }}
                />
              </div>
            </div>
          </div>
          {completion.missing.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {completion.missing.map((field, i) => (
                <span key={i} className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs text-amber-700 border border-amber-200">
                  {field}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Share warning dialog */}
      <Dialog open={shareWarnOpen} onOpenChange={setShareWarnOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {t('edit.draftWarn.title')}
            </DialogTitle>
            <DialogDescription>
              {t('edit.draftWarn.body', { percent: completion.percentage })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShareWarnOpen(false)}>
              {t('edit.draftWarn.keepEditing')}
            </Button>
            <Button onClick={() => { copyManualLink(); setShareWarnOpen(false); }}>
              {t('manuals.draftWarn.copyAnyway')}
            </Button>
            <Button asChild>
              <Link href={`/m/${manual.slug}`} target="_blank" onClick={() => setShareWarnOpen(false)}>
                {t('edit.draftWarn.previewAnyway')}
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Locale change warning */}
      <Dialog open={localeWarnOpen} onOpenChange={setLocaleWarnOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Globe className="h-5 w-5 text-muted-foreground" />
              {t('edit.localeWarn.title')}
            </DialogTitle>
            <DialogDescription>
              {pendingLocale && t('edit.localeWarn.body', { locale: localeLabel(pendingLocale) })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setLocaleWarnOpen(false); setPendingLocale(null); }}>
              {t('edit.localeWarn.cancel')}
            </Button>
            <Button onClick={confirmLocaleChange}>
              {t('edit.localeWarn.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete custom section confirmation */}
      <Dialog open={!!deleteSectionId} onOpenChange={(open) => !open && setDeleteSectionId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {t('edit.deleteSection.title')}
            </DialogTitle>
            <DialogDescription>
              {t('edit.deleteSection.body')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteSectionId(null)}>
              {t('edit.deleteSection.cancel')}
            </Button>
            <Button variant="destructive" onClick={confirmDeleteCustomSection}>
              {t('edit.deleteSection.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Accordion
        type="single"
        collapsible
        value={openSection}
        onValueChange={setOpenSection}
        className="space-y-3"
      >
        {/* Site & Stack */}
        <AccordionItem value="site" className="rounded-lg border border-border bg-card">
          <AccordionTrigger className="px-5 py-4 hover:no-underline">
            <span className="flex items-center gap-2 text-lg">
              <Globe className="h-5 w-5 text-muted-foreground" />
              {t('edit.sections.site')}
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="client_name">{t('edit.fields.clientName')}</Label>
                <Input id="client_name" value={manual.client_name || ''} onChange={(e) => updateManual('client_name', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="site_name">{t('edit.fields.siteName')}</Label>
                <Input id="site_name" value={manual.site_name || ''} onChange={(e) => updateManual('site_name', e.target.value)} placeholder="Acme Corporation Website" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="site_url">{t('edit.fields.siteUrl')}</Label>
                <Input id="site_url" value={manual.site_url || ''} onChange={(e) => updateManual('site_url', e.target.value)} placeholder="https://acme.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="platform">{t('edit.fields.platform')}</Label>
                <Input id="platform" value={manual.platform || ''} onChange={(e) => updateManual('platform', e.target.value)} placeholder="WordPress" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="framework_or_theme">{t('edit.fields.frameworkOrTheme')}</Label>
                <Input id="framework_or_theme" value={manual.framework_or_theme || ''} onChange={(e) => updateManual('framework_or_theme', e.target.value)} placeholder="Astra Theme" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="key_plugins">{t('edit.fields.keyPlugins')}</Label>
                <Input id="key_plugins" value={pluginsString} onChange={(e) => updateManual('key_plugins', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} placeholder="WooCommerce, Yoast SEO, WP Rocket" />
              </div>
            </div>
            <div className="mt-4 rounded-lg bg-secondary/50 p-4">
              <p className="text-xs font-medium text-muted-foreground">{t('edit.preview')}</p>
              <p className="mt-1 text-sm leading-relaxed">{previewInterpolated('site_overview')}</p>
            </div>
            {renderBuiltinCustomFields(BUILTIN_SECTION_KEYS.site)}
            {renderAddFieldButton(BUILTIN_SECTION_KEYS.site)}
          </AccordionContent>
        </AccordionItem>

        {/* Domain & DNS */}
        <AccordionItem value="domain" className="rounded-lg border border-border bg-card">
          <AccordionTrigger className="px-5 py-4 hover:no-underline">
            <span className="flex items-center gap-2 text-lg">
              <Globe className="h-5 w-5 text-muted-foreground" />
              {t('edit.sections.domain')}
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="registrar">{t('edit.fields.registrar')}</Label>
                <Input id="registrar" value={manual.registrar || ''} onChange={(e) => updateManual('registrar', e.target.value)} placeholder="GoDaddy" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="domain_expiry">{t('edit.fields.domainExpiry')}</Label>
                <Input id="domain_expiry" type="date" value={manual.domain_expiry || ''} onChange={(e) => updateManual('domain_expiry', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="domain_owner">{t('edit.fields.domainOwner')}</Label>
                <Input id="domain_owner" value={manual.domain_owner || ''} onChange={(e) => updateManual('domain_owner', e.target.value)} placeholder="Client owns the domain" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nameservers">{t('edit.fields.nameservers')}</Label>
                <Input id="nameservers" value={manual.nameservers || ''} onChange={(e) => updateManual('nameservers', e.target.value)} placeholder="ns1.example.com, ns2.example.com" />
              </div>
            </div>
            <div className="mt-4 rounded-lg bg-secondary/50 p-4">
              <p className="text-xs font-medium text-muted-foreground">{t('edit.preview')}</p>
              <p className="mt-1 text-sm leading-relaxed">{previewInterpolated('domain')}</p>
              <p className="mt-1 text-sm leading-relaxed">{previewInterpolated('domain_expiry')}</p>
            </div>
            {renderBuiltinCustomFields(BUILTIN_SECTION_KEYS.domain)}
            {renderAddFieldButton(BUILTIN_SECTION_KEYS.domain)}
          </AccordionContent>
        </AccordionItem>

        {/* Hosting & Email */}
        <AccordionItem value="hosting" className="rounded-lg border border-border bg-card">
          <AccordionTrigger className="px-5 py-4 hover:no-underline">
            <span className="flex items-center gap-2 text-lg">
              <Server className="h-5 w-5 text-muted-foreground" />
              {t('edit.sections.hosting')}
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="host">{t('edit.fields.host')}</Label>
                <Input id="host" value={manual.host || ''} onChange={(e) => updateManual('host', e.target.value)} placeholder="Kinsta" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="host_plan">{t('edit.fields.hostPlan')}</Label>
                <Input id="host_plan" value={manual.host_plan || ''} onChange={(e) => updateManual('host_plan', e.target.value)} placeholder="Starter" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="host_renewal">{t('edit.fields.hostRenewal')}</Label>
                <Input id="host_renewal" type="date" value={manual.host_renewal || ''} onChange={(e) => updateManual('host_renewal', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email_provider">{t('edit.fields.emailProvider')}</Label>
                <Input id="email_provider" value={manual.email_provider || ''} onChange={(e) => updateManual('email_provider', e.target.value)} placeholder="Google Workspace" />
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-secondary/50 p-4">
                <p className="text-xs font-medium text-muted-foreground">{t('edit.hostingPreview')}</p>
                <p className="mt-1 text-sm leading-relaxed">{previewInterpolated('host')}</p>
                <p className="mt-1 text-sm leading-relaxed">{previewInterpolated('host_plan')}</p>
              </div>
              <div className="rounded-lg bg-secondary/50 p-4">
                <p className="text-xs font-medium text-muted-foreground">{t('edit.emailPreview')}</p>
                <p className="mt-1 text-sm leading-relaxed">{previewInterpolated('email_provider')}</p>
              </div>
            </div>
            {renderBuiltinCustomFields(BUILTIN_SECTION_KEYS.hosting)}
            {renderAddFieldButton(BUILTIN_SECTION_KEYS.hosting)}
          </AccordionContent>
        </AccordionItem>

        {/* Accounts & Ownership */}
        <AccordionItem value="accounts" className="rounded-lg border border-border bg-card">
          <AccordionTrigger className="px-5 py-4 hover:no-underline">
            <span className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-muted-foreground" />
              {t('edit.sections.accounts')}
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5">
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm text-amber-900">{getDefault('accounts_note', manualLocale)}</p>
            </div>
            <div className="mb-4 rounded-lg border border-border bg-secondary/30 p-3">
              <p className="text-xs text-muted-foreground">{t('edit.accountsMicrocopy')}</p>
            </div>
            <div className="space-y-3">
              {accounts.map((account, idx) => (
                <div key={idx} className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-[1fr_1fr_1fr_auto]">
                  <div className="space-y-1">
                    <Label className="text-xs">{t('edit.fields.service')}</Label>
                    <Input value={account.service || ''} onChange={(e) => updateAccount(idx, 'service', e.target.value)} onBlur={() => saveAccount(idx)} placeholder="Google Analytics" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t('edit.fields.accountOwner')}</Label>
                    <Input value={account.account_owner || ''} onChange={(e) => updateAccount(idx, 'account_owner', e.target.value)} onBlur={() => saveAccount(idx)} placeholder="Agency" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t('edit.fields.adminEmail')}</Label>
                    <Input value={account.admin_email || ''} onChange={(e) => updateAccount(idx, 'admin_email', e.target.value)} onBlur={() => saveAccount(idx)} placeholder="admin@acme.com" />
                  </div>
                  <Button variant="ghost" size="icon" className="mt-5 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeAccount(idx)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="mt-4" onClick={addAccount}>
              <Plus className="mr-2 h-4 w-4" />
              {t('edit.fields.addAccount')}
            </Button>
            {renderBuiltinCustomFields(BUILTIN_SECTION_KEYS.accounts)}
            {renderAddFieldButton(BUILTIN_SECTION_KEYS.accounts)}
          </AccordionContent>
        </AccordionItem>

        {/* Files & assets */}
        <AccordionItem value="assets" className="rounded-lg border border-border bg-card">
          <AccordionTrigger className="px-5 py-4 hover:no-underline">
            <span className="flex items-center gap-2 text-lg">
              <FolderOpen className="h-5 w-5 text-muted-foreground" />
              {t('edit.sections.assets')}
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5">
            {assets.length === 0 && (
              <p className="mb-3 text-sm text-muted-foreground">{t('edit.assetsEmpty')}</p>
            )}
            <div className="space-y-3">
              {[...assets].sort((a, b) => a.sort_order - b.sort_order).map((asset, i, sortedArr) => (
                <div key={asset.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-start gap-2">
                    <div className="flex flex-col gap-0.5 pt-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" disabled={i === 0} onClick={() => moveAsset(asset.id, 'up')}>
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" disabled={i === sortedArr.length - 1} onClick={() => moveAsset(asset.id, 'down')}>
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">{t('edit.fields.assetLabel')}</Label>
                        <Input
                          value={asset.label}
                          onChange={(e) => {
                            updateAsset(asset.id, 'label', e.target.value);
                            if (assetCheckResults[asset.id]) {
                              setAssetCheckResults((prev) => { const next = { ...prev }; delete next[asset.id]; return next; });
                            }
                          }}
                          onBlur={() => saveAsset(asset.id)}
                          placeholder="Brand guidelines"
                          className={`text-sm ${assetCheckResults[asset.id] === 'block' ? 'border-destructive' : ''}`}
                        />
                        {assetCheckResults[asset.id] === 'block' && (
                          <p className="text-xs text-destructive">{t('secretName.blocked')}</p>
                        )}
                        {assetCheckResults[asset.id] === 'warn' && (
                          <p className="text-xs text-muted-foreground">{t('secretName.warned')}</p>
                        )}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs">{t('edit.fields.assetUrl')}</Label>
                          <Input
                            value={asset.url || ''}
                            onChange={(e) => updateAsset(asset.id, 'url', e.target.value)}
                            onBlur={() => saveAsset(asset.id)}
                            placeholder="https://drive.google.com/..."
                            className="text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">{t('edit.fields.assetOwner')}</Label>
                          <Input
                            value={asset.asset_owner || ''}
                            onChange={(e) => updateAsset(asset.id, 'asset_owner', e.target.value)}
                            onBlur={() => saveAsset(asset.id)}
                            placeholder="Client's Google Workspace"
                            className="text-sm"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{t('edit.fields.assetNotes')}</Label>
                        <Input
                          value={asset.notes || ''}
                          onChange={(e) => updateAsset(asset.id, 'notes', e.target.value)}
                          onBlur={() => saveAsset(asset.id)}
                          placeholder=""
                          className="text-sm"
                        />
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeAsset(asset.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="mt-4" onClick={addAsset}>
              <Plus className="mr-2 h-4 w-4" />
              {t('edit.fields.addAsset')}
            </Button>
          </AccordionContent>
        </AccordionItem>

        {/* How To Edit */}
        <AccordionItem value="edit" className="rounded-lg border border-border bg-card">
          <AccordionTrigger className="px-5 py-4 hover:no-underline">
            <span className="flex items-center gap-2 text-lg">
              <PencilLine className="h-5 w-5 text-muted-foreground" />
              {t('edit.sections.edit')}
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5">
            <div className="space-y-3">
              {editBlocks.map((block, idx) => (
                <div key={idx} className="rounded-lg border border-border p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">{t('edit.fields.blockName')}</Label>
                        <Input value={block.block_name || ''} onChange={(e) => updateEditBlock(idx, 'block_name', e.target.value)} onBlur={() => saveEditBlock(idx)} placeholder="Editing a page" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{t('edit.fields.instructions')}</Label>
                        <Textarea value={block.instructions || ''} onChange={(e) => updateEditBlock(idx, 'instructions', e.target.value)} onBlur={() => saveEditBlock(idx)} placeholder="Log in at /wp-admin, go to Pages, click the page you want to edit, make your changes, and click Update." rows={3} />
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeEditBlock(idx)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="mt-4" onClick={addEditBlock}>
              <Plus className="mr-2 h-4 w-4" />
              {t('edit.fields.addEditBlock')}
            </Button>
            {renderBuiltinCustomFields(BUILTIN_SECTION_KEYS.edit)}
            {renderAddFieldButton(BUILTIN_SECTION_KEYS.edit)}
          </AccordionContent>
        </AccordionItem>

        {/* What's Covered */}
        <AccordionItem value="coverage" className="rounded-lg border border-border bg-card">
          <AccordionTrigger className="px-5 py-4 hover:no-underline">
            <span className="flex items-center gap-2 text-lg">
              <CheckSquare className="h-5 w-5 text-muted-foreground" />
              {t('edit.sections.coverage')}
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <h4 className="mb-3 text-sm font-medium text-green-700">{t('edit.fields.includedInRetainer')}</h4>
                <div className="space-y-2">
                  {coverage.filter((c) => c.included).map((c, idx) => {
                    const realIdx = coverage.indexOf(c);
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <Input value={c.item || ''} onChange={(e) => updateCoverage(realIdx, 'item', e.target.value)} onBlur={() => saveCoverage(realIdx)} placeholder="Security updates" className="flex-1" />
                        <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeCoverage(realIdx)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => addCoverage(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('edit.fields.addIncludedItem')}
                </Button>
              </div>
              <div>
                <h4 className="mb-3 text-sm font-medium text-amber-700">{t('edit.fields.billedSeparately')}</h4>
                <div className="space-y-2">
                  {coverage.filter((c) => !c.included).map((c, idx) => {
                    const realIdx = coverage.indexOf(c);
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <Input value={c.item || ''} onChange={(e) => updateCoverage(realIdx, 'item', e.target.value)} onBlur={() => saveCoverage(realIdx)} placeholder="New landing page design" className="flex-1" />
                        <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeCoverage(realIdx)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => addCoverage(false)}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('edit.fields.addBilledItem')}
                </Button>
              </div>
            </div>
            {renderBuiltinCustomFields(BUILTIN_SECTION_KEYS.coverage)}
            {renderAddFieldButton(BUILTIN_SECTION_KEYS.coverage)}
          </AccordionContent>
        </AccordionItem>

        {/* Emergency Contacts */}
        <AccordionItem value="emergency" className="rounded-lg border border-border bg-card">
          <AccordionTrigger className="px-5 py-4 hover:no-underline">
            <span className="flex items-center gap-2 text-lg">
              <Phone className="h-5 w-5 text-muted-foreground" />
              {t('edit.sections.emergency')}
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="emergency_name">{t('edit.fields.emergencyName')}</Label>
                <Input id="emergency_name" value={manual.emergency_name || ''} onChange={(e) => updateManual('emergency_name', e.target.value)} placeholder="Jane Smith" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergency_role">{t('edit.fields.emergencyRole')}</Label>
                <Input id="emergency_role" value={manual.emergency_role || ''} onChange={(e) => updateManual('emergency_role', e.target.value)} placeholder="Lead Developer" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergency_phone">{t('edit.fields.emergencyPhone')}</Label>
                <Input id="emergency_phone" value={manual.emergency_phone || ''} onChange={(e) => updateManual('emergency_phone', e.target.value)} placeholder="+44 20 1234 5678" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergency_email">{t('edit.fields.emergencyEmail')}</Label>
                <Input id="emergency_email" type="email" value={manual.emergency_email || ''} onChange={(e) => updateManual('emergency_email', e.target.value)} placeholder="urgent@youragency.com" />
              </div>
            </div>
            <div className="mt-4 rounded-lg bg-secondary/50 p-4">
              <p className="text-xs font-medium text-muted-foreground">{t('edit.preview')}</p>
              <p className="mt-1 text-sm leading-relaxed">{previewInterpolated('emergency_intro')}</p>
              <p className="mt-1 text-sm leading-relaxed">{previewInterpolated('emergency_contact')}</p>
              <p className="mt-1 text-sm leading-relaxed">{previewInterpolated('support_general')}</p>
            </div>
            {renderBuiltinCustomFields(BUILTIN_SECTION_KEYS.emergency)}
            {renderAddFieldButton(BUILTIN_SECTION_KEYS.emergency)}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Custom sections */}
      {[...customSections].sort((a, b) => a.position - b.position).map((section, sIdx) => (
        <div key={section.id} className="mt-3 rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-0.5">
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" disabled={sIdx === 0} onClick={() => moveCustomSection(section.id, 'up')}>
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" disabled={sIdx === customSections.length - 1} onClick={() => moveCustomSection(section.id, 'down')}>
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex-1">
                <Input value={section.title} onChange={(e) => {
                  updateCustomSectionTitle(section.id, e.target.value);
                  if (sectionCheckResults[section.id]) {
                    setSectionCheckResults((prev) => { const next = { ...prev }; delete next[section.id]; return next; });
                  }
                }} onBlur={() => saveCustomSectionTitle(section.id)} placeholder={t('edit.sectionTitlePlaceholder')} className={`border-0 px-1 text-lg shadow-none focus-visible:ring-0 ${sectionCheckResults[section.id] === 'block' ? 'border-destructive' : ''}`} />
                {sectionCheckResults[section.id] === 'block' && (
                  <p className="mt-1 px-1 text-xs text-destructive">{t('secretName.blocked')}</p>
                )}
                {sectionCheckResults[section.id] === 'warn' && (
                  <p className="mt-1 px-1 text-xs text-muted-foreground">{t('secretName.warned')}</p>
                )}
              </div>
            </div>
            <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-destructive" onClick={() => setDeleteSectionId(section.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="px-5 pb-5">
            <div className="space-y-2">
              {getFieldsForCustomSection(section.id).map((field, i) => {
                const fields = getFieldsForCustomSection(section.id);
                return (
                  <div key={field.id} className="flex items-start gap-2 rounded-lg border border-border p-3">
                    <div className="flex flex-col gap-0.5 pt-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" disabled={i === 0} onClick={() => moveCustomField(field.id, 'up')}>
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" disabled={i === fields.length - 1} onClick={() => moveCustomField(field.id, 'down')}>
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="flex-1 space-y-2">
                      <Input value={field.label} onChange={(e) => {
                        updateCustomField(field.id, 'label', e.target.value);
                        if (fieldCheckResults[field.id]) {
                          setFieldCheckResults((prev) => { const next = { ...prev }; delete next[field.id]; return next; });
                        }
                      }} onBlur={() => saveCustomField(field.id)} placeholder={t('edit.fieldLabelPlaceholder')} className={`text-sm ${fieldCheckResults[field.id] === 'block' ? 'border-destructive' : ''}`} />
                      {fieldCheckResults[field.id] === 'block' && (
                        <p className="text-xs text-destructive">{t('secretName.blocked')}</p>
                      )}
                      {fieldCheckResults[field.id] === 'warn' && (
                        <p className="text-xs text-muted-foreground">{t('secretName.warned')}</p>
                      )}
                      <Textarea value={field.value} onChange={(e) => updateCustomField(field.id, 'value', e.target.value)} onBlur={() => saveCustomField(field.id)} placeholder={t('edit.fieldValuePlaceholder')} rows={2} className="text-sm" />
                    </div>
                    <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeCustomField(field.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => addCustomFieldToSection(section.id)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('edit.addField')}
            </Button>
          </div>
        </div>
      ))}

      {/* Add section button */}
      <Button variant="outline" className="mt-4 w-full" onClick={addCustomSection}>
        <Plus className="mr-2 h-4 w-4" />
        {t('edit.addSection')}
      </Button>
    </AppShell>
  );
}
