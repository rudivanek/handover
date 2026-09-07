'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRequireAuth } from '@/lib/use-require-auth';
import { useI18n } from '@/lib/i18n';
import { AppShell } from '@/components/app-shell';
import { supabase } from '@/lib/supabase';
import type { Manual, Locale, AgencyScript } from '@/lib/types';
import { mergeScripts, getCustomLanguages, fillScript, scriptToPlainText, type EmailScript } from '@/lib/email-scripts';
import { checkScriptContent } from '@/lib/secret-names';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Mail, Copy, FileText, Pencil, RotateCcw, Plus, Trash2, AlertTriangle } from 'lucide-react';
import enMessages from '@/locales/en.json';
import esMessages from '@/locales/es.json';

const localeMessages: Record<string, Record<string, string>> = {
  en: enMessages,
  es: esMessages,
};

type ManualOption = {
  id: string;
  client_name: string;
  site_name: string | null;
  slug: string;
  locale: Locale;
  updated_at: string;
};

const BUILT_IN_LANGUAGES: { value: string; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
];

export default function ScriptsPage() {
  const { profile } = useAuth();
  const { loading } = useRequireAuth();
  const { locale: uiLocale, t } = useI18n();
  const { toast } = useToast();

  const [manuals, setManuals] = useState<ManualOption[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [selectedManual, setSelectedManual] = useState<Manual | null>(null);
  const [scriptLocale, setScriptLocale] = useState<string>(uiLocale);
  const [fetchingManual, setFetchingManual] = useState(false);
  const [agencyScripts, setAgencyScripts] = useState<AgencyScript[]>([]);
  const [loadingScripts, setLoadingScripts] = useState(true);

  // Editing state
  const [editingScript, setEditingScript] = useState<EmailScript | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [saving, setSaving] = useState(false);

  // New script dialog
  const [showNewScript, setShowNewScript] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLanguage, setNewLanguage] = useState<string>('en');
  const [newCustomLang, setNewCustomLang] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newBody, setNewBody] = useState('');
  const [creating, setCreating] = useState(false);

  // Delete dialog
  const [deleteScript, setDeleteScript] = useState<AgencyScript | null>(null);

  useEffect(() => {
    if (loading) return;
    (async () => {
      const { data } = await supabase
        .from('manuals')
        .select('id, client_name, site_name, slug, locale, updated_at')
        .order('updated_at', { ascending: false });
      const list = (data as ManualOption[]) || [];
      setManuals(list);
      if (list.length > 0) {
        setSelectedId(list[0].id);
      }
    })();
  }, [loading]);

  const fetchAgencyScripts = useCallback(async () => {
    setLoadingScripts(true);
    const { data, error } = await supabase
      .from('agency_scripts')
      .select('*')
      .order('sort_order', { ascending: true });
    if (!error && data) {
      setAgencyScripts(data as AgencyScript[]);
    }
    setLoadingScripts(false);
  }, []);

  useEffect(() => {
    if (loading) return;
    fetchAgencyScripts();
  }, [loading, fetchAgencyScripts]);

  const fetchManual = useCallback(async (manualId: string) => {
    if (!manualId) {
      setSelectedManual(null);
      return;
    }
    setFetchingManual(true);
    const { data } = await supabase
      .from('manuals')
      .select('*')
      .eq('id', manualId)
      .maybeSingle();
    setSelectedManual(data as Manual | null);
    if (data) {
      setScriptLocale((data as Manual).locale as Locale);
    }
    setFetchingManual(false);
  }, []);

  useEffect(() => {
    if (selectedId) {
      fetchManual(selectedId);
    } else {
      setSelectedManual(null);
    }
  }, [selectedId, fetchManual]);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const customLanguages = getCustomLanguages(agencyScripts);
  const allLanguages = [
    ...BUILT_IN_LANGUAGES,
    ...customLanguages.map((l) => ({ value: l, label: l })),
  ];
  const isBuiltInLang = scriptLocale === 'en' || scriptLocale === 'es';
  const currentLocale = isBuiltInLang ? (scriptLocale as Locale) : 'en';

  const scripts = isBuiltInLang
    ? mergeScripts(scriptLocale as Locale, agencyScripts)
    : agencyScripts
        .filter((s) => s.base_key === null && s.language === scriptLocale)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((s) => ({
          key: null,
          subject: s.subject,
          body: s.body,
          name: s.name,
          isOverride: false,
          scriptId: s.id,
        }));

  const filledScripts = scripts.map((s) =>
    fillScript(s, selectedManual, profile, origin, currentLocale),
  );

  const copyAll = async (script: EmailScript) => {
    try {
      await navigator.clipboard.writeText(scriptToPlainText(script, currentLocale));
      toast({ title: t('scripts.copied'), description: t('scripts.copiedDesc') });
    } catch {
      toast({ title: t('scripts.copyFailed'), description: t('scripts.copyFailedDesc') });
    }
  };

  const copyBody = async (script: EmailScript) => {
    try {
      await navigator.clipboard.writeText(script.body);
      toast({ title: t('scripts.copiedBody'), description: t('scripts.copiedBodyDesc') });
    } catch {
      toast({ title: t('scripts.copyFailed'), description: t('scripts.copyFailedDesc') });
    }
  };

  const startEdit = (script: EmailScript) => {
    setEditingScript(script);
    setEditSubject(script.subject);
    setEditBody(script.body);
  };

  const cancelEdit = () => {
    setEditingScript(null);
    setEditSubject('');
    setEditBody('');
  };

  const handleSaveEdit = async () => {
    if (!editingScript) return;
    setSaving(true);
    const baseKey = editingScript.key as string | null;

    if (baseKey && editingScript.isOverride && editingScript.scriptId) {
      // Update existing override
      const { error } = await supabase
        .from('agency_scripts')
        .update({ subject: editSubject, body: editBody })
        .eq('id', editingScript.scriptId);
      if (error) {
        toast({ title: t('scripts.couldNotSave'), description: error.message });
      } else {
        toast({ title: t('scripts.scriptSaved') });
        await fetchAgencyScripts();
        cancelEdit();
      }
    } else if (baseKey && !editingScript.isOverride) {
      // Create new override
      const { error } = await supabase
        .from('agency_scripts')
        .insert({
          base_key: baseKey,
          language: scriptLocale,
          subject: editSubject,
          body: editBody,
        });
      if (error) {
        toast({ title: t('scripts.couldNotSave'), description: error.message });
      } else {
        toast({ title: t('scripts.scriptSaved') });
        await fetchAgencyScripts();
        cancelEdit();
      }
    } else if (!baseKey && editingScript.scriptId) {
      // Update custom script
      const { error } = await supabase
        .from('agency_scripts')
        .update({ subject: editSubject, body: editBody })
        .eq('id', editingScript.scriptId);
      if (error) {
        toast({ title: t('scripts.couldNotSave'), description: error.message });
      } else {
        toast({ title: t('scripts.scriptSaved') });
        await fetchAgencyScripts();
        cancelEdit();
      }
    }
    setSaving(false);
  };

  const handleReset = async (script: EmailScript) => {
    if (!script.scriptId) return;
    const { error } = await supabase
      .from('agency_scripts')
      .delete()
      .eq('id', script.scriptId);
    if (error) {
      toast({ title: t('scripts.couldNotReset'), description: error.message });
    } else {
      toast({ title: t('scripts.scriptReset') });
      await fetchAgencyScripts();
    }
  };

  const handleCreateScript = async () => {
    const lang = newLanguage === '__custom' ? newCustomLang.trim() : newLanguage;
    if (!lang) return;
    if (newLanguage === '__custom' && !newCustomLang.trim()) return;
    setCreating(true);
    const maxSort = agencyScripts
      .filter((s) => s.base_key === null)
      .reduce((max, s) => Math.max(max, s.sort_order), 0);
    const { error } = await supabase
      .from('agency_scripts')
      .insert({
        base_key: null,
        language: lang,
        name: newName.trim(),
        subject: newSubject,
        body: newBody,
        sort_order: maxSort + 1,
      });
    if (error) {
      toast({ title: t('scripts.couldNotCreate'), description: error.message });
    } else {
      toast({ title: t('scripts.scriptCreated') });
      setScriptLocale(lang);
      setShowNewScript(false);
      setNewName('');
      setNewCustomLang('');
      setNewSubject('');
      setNewBody('');
      await fetchAgencyScripts();
    }
    setCreating(false);
  };

  const handleDeleteScript = async () => {
    if (!deleteScript) return;
    const { error } = await supabase
      .from('agency_scripts')
      .delete()
      .eq('id', deleteScript.id);
    if (error) {
      toast({ title: t('scripts.couldNotDeleteScript'), description: error.message });
    } else {
      toast({ title: t('scripts.scriptDeleted') });
      setDeleteScript(null);
      await fetchAgencyScripts();
    }
  };

  const editHasWarning = checkScriptContent(editSubject) || checkScriptContent(editBody);
  const newHasWarning = checkScriptContent(newSubject) || checkScriptContent(newBody);

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{t('scripts.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('scripts.subtitle')}</p>
      </div>

      <Card className="mb-6">
        <CardContent className="py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">{t('scripts.selectManual')}</label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('scripts.noManual')} />
                </SelectTrigger>
                <SelectContent>
                  {manuals.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.client_name || t('manuals.untitled')}
                      {m.site_name ? ` — ${m.site_name}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('scripts.language')}</label>
              <Select value={scriptLocale} onValueChange={setScriptLocale}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allLanguages.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {selectedManual && (
            <p className="mt-3 text-xs text-muted-foreground">
              {t('scripts.tokensFrom', {
                client: selectedManual.client_name || t('manuals.untitled'),
                site: selectedManual.site_name || '—',
              })}
            </p>
          )}
          {!selectedManual && manuals.length > 0 && fetchingManual === false && (
            <p className="mt-3 text-xs text-muted-foreground">{t('scripts.noManualSelected')}</p>
          )}
          {manuals.length === 0 && (
            <p className="mt-3 text-xs text-muted-foreground">{t('scripts.noManualsHint')}</p>
          )}
        </CardContent>
      </Card>

      <div className="mb-4 flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setShowNewScript(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          {t('scripts.newScript')}
        </Button>
      </div>

      {filledScripts.length === 0 && !loadingScripts ? (
        <p className="text-sm text-muted-foreground">{t('scripts.noScriptsInLang')}</p>
      ) : (
        <div className="space-y-4">
          {filledScripts.map((script, idx) => {
            const sourceScript = scripts[idx];
            const isEditing = editingScript?.key === script.key && editingScript?.scriptId === script.scriptId;
            const stageLabel = script.key
              ? localeMessages[currentLocale]?.[`scripts.stage.${script.key}`] || script.key
              : t('scripts.customScript');

            return (
              <Card key={(script.key || 'custom') + '-' + (script.scriptId || idx)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-muted-foreground">
                          {idx + 1}
                        </span>
                        <span className="text-sm text-muted-foreground">{stageLabel}</span>
                        {script.isOverride && (
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                            {t('scripts.edited')}
                          </span>
                        )}
                        {script.key === null && script.name && (
                          <span className="rounded bg-secondary px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                            {script.name}
                          </span>
                        )}
                      </div>
                      {isEditing ? (
                        <div className="space-y-2">
                          <div>
                            <Label className="text-xs text-muted-foreground">{t('scripts.subject')}</Label>
                            <Input
                              value={editSubject}
                              onChange={(e) => setEditSubject(e.target.value)}
                              className="mt-1"
                            />
                          </div>
                        </div>
                      ) : (
                        <CardTitle className="text-base font-semibold leading-snug">
                          {script.subject}
                        </CardTitle>
                      )}
                    </div>
                    {!isEditing && (
                      <div className="flex shrink-0 gap-2">
                        <Button variant="ghost" size="sm" onClick={() => startEdit(sourceScript)}>
                          <Pencil className="mr-1.5 h-3.5 w-3.5" />
                          <span className="hidden sm:inline">{t('scripts.edit')}</span>
                        </Button>
                        {script.isOverride && (
                          <Button variant="ghost" size="sm" onClick={() => handleReset(script)}>
                            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                            <span className="hidden sm:inline">{t('scripts.reset')}</span>
                          </Button>
                        )}
                        {script.key === null && script.scriptId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              const s = agencyScripts.find((a) => a.id === script.scriptId);
                              if (s) setDeleteScript(s);
                            }}
                          >
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                            <span className="hidden sm:inline">{t('scripts.deleteScript')}</span>
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => copyBody(script)}>
                          <FileText className="mr-1.5 h-3.5 w-3.5" />
                          <span className="hidden sm:inline">{t('scripts.copyBody')}</span>
                        </Button>
                        <Button size="sm" onClick={() => copyAll(script)}>
                          <Copy className="mr-1.5 h-3.5 w-3.5" />
                          <span className="hidden sm:inline">{t('scripts.copy')}</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">{t('scripts.body')}</Label>
                        <Textarea
                          value={editBody}
                          onChange={(e) => setEditBody(e.target.value)}
                          rows={12}
                          className="mt-1 font-sans text-sm"
                        />
                      </div>
                      {editHasWarning && (
                        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950/50">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                          <p className="text-sm text-amber-800 dark:text-amber-200">
                            {t('scripts.credentialWarning')}
                          </p>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">{t('scripts.tokenHelp')}</p>
                      <p className="text-xs text-muted-foreground">{t('scripts.editorSourceNote')}</p>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveEdit} disabled={saving}>
                          {saving ? t('common.saving') : t('scripts.saveEdit')}
                        </Button>
                        <Button variant="outline" size="sm" onClick={cancelEdit}>
                          {t('scripts.cancelEdit')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg bg-secondary/30 p-4">
                      <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">
                        {script.body}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* New script dialog */}
      <AlertDialog open={showNewScript} onOpenChange={setShowNewScript}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('scripts.newScriptTitle')}</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">{t('scripts.scriptName')}</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t('scripts.scriptNamePlaceholder')}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">{t('scripts.scriptLanguage')}</Label>
              <Select value={newLanguage} onValueChange={setNewLanguage}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUILT_IN_LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                  {customLanguages.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                  <SelectItem value="__custom">{t('scripts.customLanguage')}</SelectItem>
                </SelectContent>
              </Select>
              {newLanguage === '__custom' && (
                <Input
                  value={newCustomLang}
                  onChange={(e) => setNewCustomLang(e.target.value)}
                  placeholder={t('scripts.customLanguagePlaceholder')}
                  className="mt-2"
                />
              )}
            </div>
            <div>
              <Label className="text-sm font-medium">{t('scripts.subject')}</Label>
              <Input
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">{t('scripts.body')}</Label>
              <Textarea
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                rows={8}
                className="mt-1 font-sans text-sm"
              />
            </div>
            {newHasWarning && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950/50">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  {t('scripts.credentialWarning')}
                </p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">{t('scripts.tokenHelp')}</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleCreateScript();
              }}
              disabled={creating || !newName.trim() || (newLanguage === '__custom' && !newCustomLang.trim())}
            >
              {creating ? t('scripts.creatingScript') : t('scripts.createScript')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete script confirmation */}
      <AlertDialog open={!!deleteScript} onOpenChange={(open) => !open && setDeleteScript(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('scripts.deleteScriptTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('scripts.deleteScriptBody')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteScript();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('scripts.deleteScriptConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
