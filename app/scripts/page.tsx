'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRequireAuth } from '@/lib/use-require-auth';
import { useI18n } from '@/lib/i18n';
import { AppShell } from '@/components/app-shell';
import { supabase } from '@/lib/supabase';
import type { Manual, Locale } from '@/lib/types';
import { getScripts, fillScript, scriptToPlainText, type EmailScript } from '@/lib/email-scripts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Mail, Copy, FileText } from 'lucide-react';
import enMessages from '@/locales/en.json';
import esMessages from '@/locales/es.json';

const localeMessages: Record<Locale, Record<string, string>> = {
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

export default function ScriptsPage() {
  const { profile } = useAuth();
  const { loading } = useRequireAuth();
  const { locale: uiLocale, t } = useI18n();
  const { toast } = useToast();

  const [manuals, setManuals] = useState<ManualOption[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [selectedManual, setSelectedManual] = useState<Manual | null>(null);
  const [scriptLocale, setScriptLocale] = useState<Locale>(uiLocale);
  const [fetchingManual, setFetchingManual] = useState(false);

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
  const scripts = getScripts(scriptLocale);
  const filledScripts = scripts.map((s) => fillScript(s, selectedManual, profile, origin, scriptLocale));

  const copyAll = async (script: EmailScript) => {
    try {
      await navigator.clipboard.writeText(scriptToPlainText(script, scriptLocale));
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
              <div className="flex rounded-lg border border-border p-0.5">
                <button
                  type="button"
                  onClick={() => setScriptLocale('en')}
                  className={`rounded-md px-3 py-1.5 text-sm transition-colors ${scriptLocale === 'en' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setScriptLocale('es')}
                  className={`rounded-md px-3 py-1.5 text-sm transition-colors ${scriptLocale === 'es' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  ES
                </button>
              </div>
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

      <div className="space-y-4">
        {filledScripts.map((script, idx) => (
          <Card key={script.key}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-muted-foreground">
                      {idx + 1}
                    </span>
                    <span className="text-sm text-muted-foreground">{localeMessages[scriptLocale][`scripts.stage.${script.key}`]}</span>
                  </div>
                  <CardTitle className="text-base font-semibold leading-snug">
                    {script.subject}
                  </CardTitle>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" size="sm" onClick={() => copyBody(script)}>
                    <FileText className="mr-1.5 h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{t('scripts.copyBody')}</span>
                  </Button>
                  <Button size="sm" onClick={() => copyAll(script)}>
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{t('scripts.copy')}</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-secondary/30 p-4">
                <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">
                  {script.body}
                </pre>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
