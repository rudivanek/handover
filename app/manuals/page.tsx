'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useRequireAuth } from '@/lib/use-require-auth';
import { useI18n } from '@/lib/i18n';
import { AppShell } from '@/components/app-shell';
import { supabase } from '@/lib/supabase';
import { uniqueSlug } from '@/lib/slug';
import { computeCompletion, isDraft } from '@/lib/completion';
import type { Manual, Account, EditBlock, Coverage, CustomField, Asset, Locale } from '@/lib/types';
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
import { useToast } from '@/hooks/use-toast';
import { Plus, Copy, ExternalLink, Pencil, FileText, Calendar, Lock, AlertTriangle } from 'lucide-react';

type ManualWithChildren = Manual & {
  accounts?: Account[];
  edit_blocks?: EditBlock[];
  coverage?: Coverage[];
  custom_fields?: CustomField[];
  assets?: Asset[];
};

export default function ManualsPage() {
  const { profile } = useAuth();
  const { loading } = useRequireAuth();
  const { locale, t } = useI18n();
  const { toast } = useToast();

  const [manuals, setManuals] = useState<ManualWithChildren[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [newOpen, setNewOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [creating, setCreating] = useState(false);
  const [shareWarnManual, setShareWarnManual] = useState<ManualWithChildren | null>(null);

  const isFree = !profile || profile.plan !== 'paid';
  const manualLimit = isFree ? 1 : Infinity;
  const atLimit = manuals.length >= manualLimit;
  const stripeLink = profile?.stripe_payment_link;

  const fetchManuals = useCallback(async () => {
    const { data, error } = await supabase
      .from('manuals')
      .select(`
        *,
        accounts (*),
        edit_blocks (*),
        coverage (*),
        custom_fields (*),
        assets (*)
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;
    if (atLimit) return;
    setCreating(true);

    const existingSlugs = manuals.map((m) => m.slug);
    const slug = uniqueSlug(newClientName, existingSlugs);
    const manualLocale: Locale = (profile?.ui_locale as Locale) || 'en';

    const { data, error } = await supabase
      .from('manuals')
      .insert({
        slug,
        client_name: newClientName.trim(),
        site_name: newClientName.trim(),
        locale: manualLocale,
      })
      .select()
      .single();

    setCreating(false);

    if (error) {
      const msg = error.message || '';
      if (msg.includes('FREE_PLAN_LIMIT')) {
        toast({ title: t('manuals.limitReached'), description: t('manuals.limitDescription'), variant: 'destructive' });
      } else {
        toast({ title: t('manuals.couldNotCreate'), description: msg, variant: 'destructive' });
      }
      return;
    }

    toast({ title: t('manuals.created'), description: t('manuals.createdDesc', { name: newClientName }) });
    setNewOpen(false);
    setNewClientName('');

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
      })
      .select()
      .single();

    if (manualError || !newManual) {
      toast({ title: t('manuals.couldNotDuplicate'), description: manualError?.message, variant: 'destructive' });
      return;
    }

    const [accountsRes, blocksRes, coverageRes, assetsRes] = await Promise.all([
      supabase.from('accounts').select('*').eq('manual_id', manual.id),
      supabase.from('edit_blocks').select('*').eq('manual_id', manual.id),
      supabase.from('coverage').select('*').eq('manual_id', manual.id),
      supabase.from('assets').select('*').eq('manual_id', manual.id),
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

    toast({ title: t('manuals.duplicated'), description: t('manuals.duplicatedDesc', { name: manual.client_name || t('manuals.untitled') }) });
    window.location.href = `/manuals/${newManual.id}/edit`;
  };

  const handleViewClick = (e: React.MouseEvent, manual: ManualWithChildren) => {
    const completion = computeCompletion(manual, manual.accounts || [], manual.edit_blocks || [], manual.coverage || [], manual.custom_fields || [], locale);
    if (isDraft(completion.percentage)) {
      e.preventDefault();
      setShareWarnManual(manual);
    }
  };

  if (loading || loadingList) {
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
          <h1 className="text-3xl tracking-tight-app">{t('manuals.title')}</h1>
          <p className="mt-1 text-muted-foreground">
            {profile?.agency_name
              ? t('manuals.subtitle', { agency: profile.agency_name })
              : t('manuals.subtitleGeneric')}
          </p>
        </div>
        {atLimit ? (
          <Button disabled title={isFree ? t('manuals.limitReached') : undefined}>
            <Lock className="mr-2 h-4 w-4" />
            {t('manuals.new')}
          </Button>
        ) : (
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('manuals.new')}
          </Button>
        )}
      </div>

      {atLimit && isFree && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="flex items-center justify-between gap-4 py-5">
            <div className="flex items-start gap-3">
              <Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-900">{t('manuals.limitReached')}</p>
                <p className="text-sm text-amber-800">
                  {t('manuals.limitDescription')}
                </p>
              </div>
            </div>
            {stripeLink && (
              <Button asChild size="sm">
                <a href={stripeLink} target="_blank" rel="noopener noreferrer">
                  {t('manuals.upgrade')}
                </a>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {manuals.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground/50" strokeWidth={1} />
            <h3 className="text-xl">{t('manuals.empty')}</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {t('manuals.emptyDescription')}
            </p>
            {!atLimit && (
              <Button className="mt-6" onClick={() => setNewOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t('manuals.createFirst')}
              </Button>
            )}
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
                        {draft && (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200">
                            {t('manuals.draft')}
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
                        <span className="text-xs">{t('manuals.complete', { percent: completion.percentage })}</span>
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
                      onClick={() => handleDuplicate(manual)}
                      title={t('manuals.duplicate')}
                    >
                      <Copy className="h-4 w-4" />
                      <span className="hidden sm:inline ml-1.5">{t('manuals.duplicate')}</span>
                    </Button>
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
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
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
              <Button asChild>
                <Link href={`/m/${shareWarnManual.slug}`} target="_blank" onClick={() => setShareWarnManual(null)}>
                  {t('manuals.draftWarn.openAnyway')}
                </Link>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
