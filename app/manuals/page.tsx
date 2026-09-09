'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useRequireAuth } from '@/lib/use-require-auth';
import { useI18n } from '@/lib/i18n';
import { AppShell } from '@/components/app-shell';
import { supabase } from '@/lib/supabase';
import { uniqueSlug } from '@/lib/slug';
import { presetText } from '@/lib/maintenance-presets';
import { computeCompletion, isDraft } from '@/lib/completion';
import type { Manual, Account, EditBlock, Coverage, CustomField, Asset, MaintenanceTask, Locale, ManualTemplate, TemplateCustomField, TemplateMaintenanceTask, TemplateCoverage, TemplateEditBlock, TemplateAccount } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Copy, ExternalLink, Pencil, FileText, Calendar, AlertTriangle, Link2, ArrowUpRight, Trash2, Archive, ArchiveRestore, BookmarkPlus, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { EXAMPLE_MANUAL_URL } from '@/lib/utils';
import { HIDEABLE_FIELDS, HIDEABLE_SECTIONS, type FieldKey, type SectionKey } from '@/lib/manual-shape';

type ManualWithChildren = Manual & {
  accounts?: Account[];
  edit_blocks?: EditBlock[];
  coverage?: Coverage[];
  custom_fields?: CustomField[];
  assets?: Asset[];
  maintenance_tasks?: MaintenanceTask[];
};

export default function ManualsPage() {
  const { profile, profileLoaded } = useAuth();
  const { loading } = useRequireAuth();
  const { locale, t } = useI18n();
  const { toast } = useToast();

  const [manuals, setManuals] = useState<ManualWithChildren[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [newOpen, setNewOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [creating, setCreating] = useState(false);
  const [templates, setTemplates] = useState<ManualTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('standard');
  const [shareWarnManual, setShareWarnManual] = useState<ManualWithChildren | null>(null);
  const [notPublishedCopyManual, setNotPublishedCopyManual] = useState<ManualWithChildren | null>(null);
  const [deleteManual, setDeleteManual] = useState<ManualWithChildren | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [archiveManual, setArchiveManual] = useState<ManualWithChildren | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [planLimitOpen, setPlanLimitOpen] = useState(false);
  const [planLimitInfo, setPlanLimitInfo] = useState<{ count: number; plan: string }>({ count: 0, plan: 'free' });
  const [saveAsTplManual, setSaveAsTplManual] = useState<ManualWithChildren | null>(null);
  const [saveAsTplName, setSaveAsTplName] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  const plan = profile?.plan || 'free';
  const liveManuals = manuals.filter((m) => m.is_published && !m.archived_at);
  const liveCount = liveManuals.length;
  const planLimit = plan === 'free' ? 1 : plan === 'freelancer' ? 3 : null;

  const fetchManuals = useCallback(async () => {
    const { data, error } = await supabase
      .from('manuals')
      .select(`
        *,
        accounts (*),
        edit_blocks (*),
        coverage (*),
        custom_fields (*),
        assets (*),
        maintenance_tasks (*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: t('manuals.couldNotLoad'), description: error.message, variant: 'destructive' });
      return;
    }
    setManuals((data as ManualWithChildren[]) || []);
    setLoadingList(false);
  }, [toast, t]);

  useEffect(() => {
    if (loading) return;
    fetchManuals();
  }, [loading, fetchManuals]);

  useEffect(() => {
    if (loading) return;
    if (plan === 'free') return;
    supabase
      .from('manual_templates')
      .select(`
        *,
        template_custom_fields (*),
        template_maintenance_tasks (*),
        template_coverage (*),
        template_edit_blocks (*),
        template_accounts (*)
      `)
      .order('name')
      .then(({ data }: { data: ManualTemplate[] | null }) => {
        setTemplates(data || []);
      });
  }, [loading, plan]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;
    setCreating(true);

    const existingSlugs = manuals.map((m) => m.slug);
    const slug = uniqueSlug(newClientName, existingSlugs);
    const manualLocale: Locale = (profile?.ui_locale as Locale) || 'en';

    const template = selectedTemplateId === 'standard' ? null : templates.find((t) => t.id === selectedTemplateId);

    const { data, error } = await supabase
      .from('manuals')
      .insert({
        slug,
        client_name: newClientName.trim(),
        locale: manualLocale,
        hidden_fields: template?.hidden_fields || [],
        hidden_sections: template?.hidden_sections || [],
      })
      .select()
      .single();

    if (!error && data && template) {
      const failedParts: string[] = [];

      if (template.template_custom_fields && template.template_custom_fields.length > 0) {
        const cfRes = await supabase.from('custom_fields').insert(
          template.template_custom_fields.map((cf: TemplateCustomField) => ({
            manual_id: data.id,
            section_key: cf.section_key,
            label: cf.label,
            position: cf.position,
            value: '',
          }))
        );
        if (cfRes.error) failedParts.push(t('manuals.newDialog.customFields'));
      }

      if (template.template_maintenance_tasks && template.template_maintenance_tasks.length > 0) {
        const mtRes = await supabase.from('maintenance_tasks').insert(
          template.template_maintenance_tasks.map((m: TemplateMaintenanceTask, i: number) => ({
            manual_id: data.id,
            task: presetText(m.preset_key, manualLocale) ?? m.task,
            cadence: m.cadence,
            owner: m.owner,
            notes: m.notes,
            sort_order: i,
            preset_key: m.preset_key,
          }))
        );
        if (mtRes.error) failedParts.push(t('manuals.newDialog.maintenance'));
      }

      if (template.template_coverage && template.template_coverage.length > 0) {
        const cvRes = await supabase.from('coverage').insert(
          template.template_coverage.map((c: TemplateCoverage) => ({
            manual_id: data.id,
            item: c.item,
            included: c.included,
          }))
        );
        if (cvRes.error) failedParts.push(t('manuals.newDialog.coverage'));
      }

      if (template.template_edit_blocks && template.template_edit_blocks.length > 0) {
        const ebRes = await supabase.from('edit_blocks').insert(
          template.template_edit_blocks.map((b: TemplateEditBlock) => ({
            manual_id: data.id,
            block_name: b.block_name,
            instructions: b.instructions,
          }))
        );
        if (ebRes.error) failedParts.push(t('manuals.newDialog.editBlocks'));
      }

      if (template.template_accounts && template.template_accounts.length > 0) {
        const acRes = await supabase.from('accounts').insert(
          template.template_accounts.map((a: TemplateAccount) => ({
            manual_id: data.id,
            service: a.service,
            account_owner: a.account_owner,
            admin_email: null,
          }))
        );
        if (acRes.error) failedParts.push(t('manuals.newDialog.accounts'));
      }

      if (failedParts.length > 0) {
        toast({ title: t('manuals.newDialog.partialCopy'), description: failedParts.join(', '), variant: 'destructive' });
      }
    }

    setCreating(false);

    if (error) {
      toast({ title: t('manuals.couldNotCreate'), description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: t('manuals.created'), description: t('manuals.createdDesc', { name: newClientName }) });
    setNewOpen(false);
    setNewClientName('');
    setSelectedTemplateId('standard');

    window.location.href = `/manuals/${data.id}/edit`;
  };

  const handleDuplicate = async (manual: ManualWithChildren) => {
    const existingSlugs = manuals.map((m) => m.slug);
    const newSlug = uniqueSlug('untitled-template', existingSlugs);

    const { data: newManual, error: manualError } = await supabase
      .from('manuals')
      .insert({
        slug: newSlug,
        client_name: '',
        site_name: manual.site_name,
        site_url: null,
        platform: manual.platform,
        framework_or_theme: manual.framework_or_theme,
        key_plugins: manual.key_plugins,
        registrar: manual.registrar,
        domain_expiry: null,
        domain_owner: manual.domain_owner,
        nameservers: manual.nameservers,
        host: manual.host,
        host_plan: manual.host_plan,
        host_renewal: null,
        email_provider: manual.email_provider,
        emergency_name: manual.emergency_name,
        emergency_role: manual.emergency_role,
        emergency_phone: manual.emergency_phone,
        emergency_email: manual.emergency_email,
        locale: manual.locale,
        hidden_fields: manual.hidden_fields || [],
        hidden_sections: manual.hidden_sections || [],
      })
      .select()
      .single();

    if (manualError || !newManual) {
      toast({ title: t('manuals.couldNotDuplicate'), description: manualError?.message, variant: 'destructive' });
      return;
    }

    const [accountsRes, blocksRes, coverageRes, assetsRes, maintenanceRes] = await Promise.all([
      supabase.from('accounts').select('*').eq('manual_id', manual.id),
      supabase.from('edit_blocks').select('*').eq('manual_id', manual.id),
      supabase.from('coverage').select('*').eq('manual_id', manual.id),
      supabase.from('assets').select('*').eq('manual_id', manual.id),
      supabase.from('maintenance_tasks').select('*').eq('manual_id', manual.id),
    ]);

    if (accountsRes.data && accountsRes.data.length > 0) {
      await supabase
        .from('accounts')
        .insert(accountsRes.data.map((a) => ({
          manual_id: newManual.id,
          service: a.service,
          account_owner: a.account_owner,
          admin_email: null,
        })));
    }
    if (blocksRes.data && blocksRes.data.length > 0) {
      await supabase
        .from('edit_blocks')
        .insert(blocksRes.data.map((b) => ({
          manual_id: newManual.id,
          block_name: b.block_name,
          instructions: b.instructions,
        })));
    }
    if (coverageRes.data && coverageRes.data.length > 0) {
      await supabase
        .from('coverage')
        .insert(coverageRes.data.map((c) => ({
          manual_id: newManual.id,
          item: c.item,
          included: c.included,
        })));
    }
    if (assetsRes.data && assetsRes.data.length > 0) {
      await supabase
        .from('assets')
        .insert(assetsRes.data.map((a) => ({
          manual_id: newManual.id,
          label: a.label,
          url: null,
          asset_owner: a.asset_owner,
          notes: a.notes,
          sort_order: a.sort_order,
        })));
    }
    if (maintenanceRes.data && maintenanceRes.data.length > 0) {
      await supabase
        .from('maintenance_tasks')
        .insert(maintenanceRes.data.map((t) => ({
          manual_id: newManual.id,
          task: t.task,
          cadence: t.cadence,
          owner: t.owner,
          notes: t.notes,
          sort_order: t.sort_order,
          preset_key: t.preset_key,
        })));
    }

    toast({ title: t('manuals.duplicated'), description: t('manuals.duplicatedDesc', { name: manual.client_name || t('manuals.untitled') }) });
    window.location.href = `/manuals/${newManual.id}/edit`;
  };

  const handleSaveAsTemplate = async () => {
    if (!saveAsTplManual || !saveAsTplName.trim()) return;
    setSavingTemplate(true);

    const { data: tpl, error: tplError } = await supabase
      .from('manual_templates')
      .insert({
        name: saveAsTplName.trim(),
        hidden_fields: (saveAsTplManual.hidden_fields || []).filter((f) => HIDEABLE_FIELDS.includes(f as FieldKey)),
        hidden_sections: (saveAsTplManual.hidden_sections || []).filter((s) => HIDEABLE_SECTIONS.includes(s as SectionKey)),
      })
      .select()
      .single();

    if (tplError || !tpl) {
      setSavingTemplate(false);
      toast({ title: t('manuals.couldNotSaveTemplate'), description: tplError?.message, variant: 'destructive' });
      return;
    }

    const failedParts: string[] = [];

    const customFields = (saveAsTplManual.custom_fields || []).filter((cf) => cf.section_type === 'builtin' && cf.label.trim());
    if (customFields.length > 0) {
      const res = await supabase.from('template_custom_fields').insert(
        customFields.map((cf, i) => ({
          template_id: tpl.id,
          section_key: cf.section_key,
          label: cf.label,
          position: i,
        }))
      );
      if (res.error) failedParts.push(t('manuals.newDialog.customFields'));
    }

    const maintenance = saveAsTplManual.maintenance_tasks || [];
    if (maintenance.length > 0) {
      const res = await supabase.from('template_maintenance_tasks').insert(
        maintenance.map((m, i) => ({
          template_id: tpl.id,
          task: m.task,
          cadence: m.cadence,
          owner: m.owner,
          notes: m.notes,
          sort_order: i,
          preset_key: m.preset_key,
        }))
      );
      if (res.error) failedParts.push(t('manuals.newDialog.maintenance'));
    }

    const coverage = saveAsTplManual.coverage || [];
    if (coverage.length > 0) {
      const res = await supabase.from('template_coverage').insert(
        coverage.map((c) => ({
          template_id: tpl.id,
          item: c.item,
          included: c.included,
        }))
      );
      if (res.error) failedParts.push(t('manuals.newDialog.coverage'));
    }

    const blocks = saveAsTplManual.edit_blocks || [];
    if (blocks.length > 0) {
      const res = await supabase.from('template_edit_blocks').insert(
        blocks.map((b) => ({
          template_id: tpl.id,
          block_name: b.block_name,
          instructions: b.instructions,
        }))
      );
      if (res.error) failedParts.push(t('manuals.newDialog.editBlocks'));
    }

    const accounts = saveAsTplManual.accounts || [];
    if (accounts.length > 0) {
      const res = await supabase.from('template_accounts').insert(
        accounts.map((a) => ({
          template_id: tpl.id,
          service: a.service,
          account_owner: a.account_owner,
        }))
      );
      if (res.error) failedParts.push(t('manuals.newDialog.accounts'));
    }

    setSavingTemplate(false);
    setSaveAsTplManual(null);
    setSaveAsTplName('');

    if (failedParts.length > 0) {
      toast({ title: t('manuals.templateSavedPartial'), description: failedParts.join(', '), variant: 'destructive' });
    } else {
      toast({ title: t('manuals.templateSaved'), description: saveAsTplName.trim() });
    }
  };

  const handleDelete = async () => {
    if (!deleteManual) return;
    setDeleting(true);
    const { error } = await supabase
      .from('manuals')
      .delete()
      .eq('id', deleteManual.id);
    setDeleting(false);
    if (error) {
      toast({ title: t('manuals.couldNotDelete'), description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: t('manuals.deleted'), description: t('manuals.deletedDesc', { name: deleteManual.client_name || t('manuals.untitled') }) });
    setDeleteManual(null);
    setDeleteConfirmName('');
    refreshList();
  };

  const handleArchive = async () => {
    if (!archiveManual) return;
    setArchiving(true);
    const { error } = await supabase
      .from('manuals')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', archiveManual.id);
    setArchiving(false);
    if (error) {
      toast({ title: t('manuals.couldNotArchive'), description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: t('manuals.archived'), description: t('manuals.archivedDesc', { name: archiveManual.client_name || t('manuals.untitled') }) });
    setArchiveManual(null);
    refreshList();
  };

  const handleRestore = async (manual: ManualWithChildren) => {
    setArchiving(true);
    const { error } = await supabase
      .from('manuals')
      .update({ archived_at: null })
      .eq('id', manual.id);
    setArchiving(false);
    if (error) {
      if (error.message.includes('PLAN_LIMIT')) {
        const plan = profile?.plan || 'free';
        const { count } = await supabase
          .from('manuals')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', manual.user_id)
          .eq('is_published', true)
          .is('archived_at', null);
        setPlanLimitInfo({ count: count || 0, plan });
        setPlanLimitOpen(true);
      } else {
        toast({ title: t('manuals.couldNotRestore'), description: error.message, variant: 'destructive' });
      }
      return;
    }
    toast({ title: t('manuals.restored'), description: t('manuals.restoredDesc', { name: manual.client_name || t('manuals.untitled') }) });
    refreshList();
  };

  const refreshList = () => {
    fetchManuals();
    window.dispatchEvent(new Event('manuals-changed'));
  };

  const handleViewClick = (e: React.MouseEvent, manual: ManualWithChildren) => {
    const completion = computeCompletion(manual, manual.accounts || [], manual.edit_blocks || [], manual.coverage || [], manual.custom_fields || [], locale);
    if (isDraft(completion.percentage)) {
      e.preventDefault();
      setShareWarnManual(manual);
    }
  };

  const copyManualLink = async (manual: ManualWithChildren) => {
    const url = `${window.location.origin}/m/${manual.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: t('manuals.linkCopied'), description: t('manuals.linkCopiedDesc') });
    } catch {
      toast({ title: t('manuals.linkCopyFailed'), description: url });
    }
  };

  const handleCopyLinkClick = (manual: ManualWithChildren) => {
    const completion = computeCompletion(manual, manual.accounts || [], manual.edit_blocks || [], manual.coverage || [], manual.custom_fields || [], locale);
    if (isDraft(completion.percentage)) {
      setShareWarnManual(manual);
    } else if (!manual.is_published) {
      setNotPublishedCopyManual(manual);
    } else {
      copyManualLink(manual);
    }
  };

  if (loading || !profileLoaded || loadingList) {
    return (
      <AppShell>
        <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>
      </AppShell>
    );
  }

  const dateLocale = locale === 'es' ? 'es-MX' : 'en-US';

  return (
    <AppShell>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[31px] tracking-tight-app">{t('manuals.title')}</h1>
          <p className="mt-1 text-muted-foreground">
            {profile?.agency_name
              ? t('manuals.subtitle', { agency: profile.agency_name })
              : t('manuals.subtitleGeneric')}
          </p>
          <a
            href={EXAMPLE_MANUAL_URL}
            target="_blank"
            rel="noopener"
            className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted-foreground/70 transition-colors hover:text-muted-foreground"
          >
            {t('manuals.seeExample')}
            <ArrowUpRight className="h-3 w-3" />
          </a>
        </div>
        {(() => {
          if (planLimit === null) {
            return <span className="text-sm text-muted-foreground">{t(liveCount === 1 ? 'manuals.liveCountUnlimitedSingular' : 'manuals.liveCountUnlimited', { live: liveCount })}</span>;
          }
          return <span className="text-sm text-muted-foreground">{t(liveCount === 1 ? 'manuals.liveCountSingular' : 'manuals.liveCount', { live: liveCount, limit: planLimit })}</span>;
        })()}
        <Button onClick={() => setNewOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('manuals.new')}
        </Button>
      </div>

      {manuals.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground/50" strokeWidth={1} />
            <h3 className="text-xl">{t('manuals.empty')}</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {t('manuals.emptyDescription')}
            </p>
            <a
              href={EXAMPLE_MANUAL_URL}
              target="_blank"
              rel="noopener"
              className="mt-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t('manuals.seeExample')}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
            <Button className="mt-4" onClick={() => setNewOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('manuals.createFirst')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {manuals.map((manual) => {
            const completion = computeCompletion(manual, manual.accounts || [], manual.edit_blocks || [], manual.coverage || [], manual.custom_fields || [], locale);
            const draft = isDraft(completion.percentage);
            return (
              <Card key={manual.id} className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center justify-between gap-4 py-5">
                  <div className="min-w-0 flex-1">
                    <Link href={`/manuals/${manual.id}/edit`} className="block">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg hover:underline">{manual.client_name || t('manuals.untitled')}</h3>
                        {manual.archived_at ? (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
                            {t('manuals.archived')}
                          </Badge>
                        ) : manual.is_published ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                            {t('manuals.live')}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-muted text-muted-foreground">
                            {t('manuals.draftState')}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        {manual.site_name && <span>{manual.site_name}</span>}
                        {manual.site_url && (
                          <span className="truncate">{manual.site_url}</span>
                        )}
                        {manual.created_at && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(manual.created_at).toLocaleDateString(dateLocale, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        )}
                        <span className="text-xs">
                          {t('manuals.complete', { percent: completion.percentage })}
                          {draft && <span className="ml-1 text-amber-600">· {t('manuals.incomplete')}</span>}
                        </span>
                      </div>
                    </Link>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" asChild>
                      <Link
                        href={`/m/${manual.slug}`}
                        target="_blank"
                        onClick={(e) => handleViewClick(e, manual)}
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span className="hidden sm:inline ml-1.5">{t('manuals.view')}</span>
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/manuals/${manual.id}/edit`}>
                        <Pencil className="h-4 w-4" />
                        <span className="hidden sm:inline ml-1.5">{t('manuals.edit')}</span>
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyLinkClick(manual)}
                      title={t('manuals.copyLink')}
                    >
                      <Link2 className="h-4 w-4" />
                      <span className="hidden sm:inline ml-1.5">{t('manuals.copyLink')}</span>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="px-2">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDuplicate(manual)}>
                          <Copy className="mr-2 h-4 w-4" />
                          {t('manuals.duplicate')}
                        </DropdownMenuItem>
                        {plan !== 'free' && (
                          <DropdownMenuItem onClick={() => { setSaveAsTplManual(manual); setSaveAsTplName(manual.client_name || ''); }}>
                            <BookmarkPlus className="mr-2 h-4 w-4" />
                            {t('manuals.saveAsTemplate')}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {manual.archived_at ? (
                          <DropdownMenuItem onClick={() => handleRestore(manual)} disabled={archiving}>
                            <ArchiveRestore className="mr-2 h-4 w-4" />
                            {t('manuals.restore')}
                          </DropdownMenuItem>
                        ) : manual.is_published ? (
                          <DropdownMenuItem onClick={() => setArchiveManual(manual)}>
                            <Archive className="mr-2 h-4 w-4" />
                            {t('manuals.archive')}
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => { setDeleteManual(manual); setDeleteConfirmName(''); }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('manuals.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl">{t('manuals.newDialog.title')}</DialogTitle>
            <DialogDescription>{t('manuals.newDialog.description')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            {templates.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="template">{t('manuals.newDialog.startFrom')}</Label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger id="template">
                    <SelectValue placeholder={t('manuals.newDialog.standard')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">{t('manuals.newDialog.standard')}</SelectItem>
                    {templates.map((tpl) => (
                      <SelectItem key={tpl.id} value={tpl.id}>{tpl.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="client_name">{t('manuals.newDialog.clientName')}</Label>
              <Input
                id="client_name"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder={t('manuals.newDialog.clientNamePlaceholder')}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                {t('manuals.newDialog.clientNameHelp')}
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setNewOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={creating || !newClientName.trim()}>
                {creating ? t('manuals.newDialog.creating') : t('manuals.newDialog.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!shareWarnManual} onOpenChange={(open) => !open && setShareWarnManual(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {t('manuals.draftWarn.title')}
            </DialogTitle>
            <DialogDescription>
              {shareWarnManual && (() => {
                const c = computeCompletion(shareWarnManual, shareWarnManual.accounts || [], shareWarnManual.edit_blocks || [], shareWarnManual.coverage || [], shareWarnManual.custom_fields || [], locale);
                return t('manuals.draftWarn.body', { percent: c.percentage });
              })()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShareWarnManual(null)}>
              {t('manuals.draftWarn.goBack')}
            </Button>
            {shareWarnManual && (
              <>
                <Button onClick={() => { copyManualLink(shareWarnManual); setShareWarnManual(null); }}>
                  {t('manuals.draftWarn.copyAnyway')}
                </Button>
                <Button asChild>
                  <Link href={`/m/${shareWarnManual.slug}`} target="_blank" onClick={() => setShareWarnManual(null)}>
                    {t('manuals.draftWarn.openAnyway')}
                  </Link>
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!notPublishedCopyManual} onOpenChange={(open) => !open && setNotPublishedCopyManual(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {t('manuals.notPublished')}
            </DialogTitle>
            <DialogDescription>
              {t('manuals.copyLinkNotLive')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNotPublishedCopyManual(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => { if (notPublishedCopyManual) copyManualLink(notPublishedCopyManual); setNotPublishedCopyManual(null); }}>
              {t('manuals.draftWarn.copyAnyway')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!archiveManual} onOpenChange={(open) => !open && setArchiveManual(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Archive className="h-5 w-5 text-amber-500" />
              {t('manuals.archiveTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('manuals.archiveBody', { name: archiveManual?.client_name || t('manuals.untitled') })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setArchiveManual(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleArchive} disabled={archiving}>
              {archiving ? t('common.saving') : t('manuals.archive')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteManual} onOpenChange={(open) => { if (!open) { setDeleteManual(null); setDeleteConfirmName(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {t('manuals.deleteTitle')}
            </DialogTitle>
            <DialogDescription>
              {deleteManual?.is_published || deleteManual?.archived_at
                ? t('manuals.deleteBodyLive', { name: deleteManual?.client_name || t('manuals.untitled') })
                : t('manuals.deleteBodyDraft')}
            </DialogDescription>
          </DialogHeader>
          {(deleteManual?.is_published || deleteManual?.archived_at) && (
            <div className="space-y-2">
              <Label htmlFor="delete_confirm">
                {t('manuals.deleteConfirm', { name: deleteManual?.client_name || t('manuals.untitled') })}
              </Label>
              <Input
                id="delete_confirm"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder={deleteManual?.client_name || t('manuals.untitled')}
                autoFocus
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setDeleteManual(null); setDeleteConfirmName(''); }}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting || ((deleteManual?.is_published || !!deleteManual?.archived_at) && deleteConfirmName !== (deleteManual?.client_name || t('manuals.untitled')))}
            >
              {deleting ? t('common.saving') : t('manuals.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!saveAsTplManual} onOpenChange={(open) => { if (!open) { setSaveAsTplManual(null); setSaveAsTplName(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <BookmarkPlus className="h-5 w-5" />
              {t('manuals.saveAsTemplateTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('manuals.saveAsTemplateDesc', { name: saveAsTplManual?.client_name || t('manuals.untitled') })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="tpl_name">{t('manuals.templateName')}</Label>
            <Input
              id="tpl_name"
              value={saveAsTplName}
              onChange={(e) => setSaveAsTplName(e.target.value)}
              placeholder={t('manuals.templateNamePlaceholder')}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setSaveAsTplManual(null); setSaveAsTplName(''); }}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveAsTemplate} disabled={savingTemplate || !saveAsTplName.trim()}>
              {savingTemplate ? t('common.saving') : t('manuals.saveAsTemplate')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={planLimitOpen} onOpenChange={setPlanLimitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {t('planLimit.title')}
            </DialogTitle>
            <DialogDescription>
              {t('planLimit.body', { n: planLimitInfo.count, plan: planLimitInfo.plan })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="ghost" onClick={() => setPlanLimitOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button asChild>
              <Link href="/manuals">
                {t('planLimit.archive')}
              </Link>
            </Button>
            <Button asChild>
              <a href="https://handover.agency/pricing" target="_blank" rel="noopener noreferrer">
                {planLimitInfo.plan === 'free'
                  ? t('planLimit.upgradeFree')
                  : t('planLimit.upgradeFreelancer')}
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
