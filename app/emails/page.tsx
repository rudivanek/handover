'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { AppShell } from '@/components/app-shell';
import { FileText, Mail, KeyRound } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type AdminRow = {
  user_id: string;
  email: string | null;
  agency_name: string | null;
  plan: string | null;
  signed_up_at: string | null;
  manual_count: number | null;
  manual_dates: string[] | null;
  live_count: number | null;
};

type EmailLogRow = {
  id: number;
  sent_at: string;
  subject: string;
  recipient_count: number;
  skipped_optout: number;
  requests: number;
  requests_ok: number;
  requests_failed: number;
};

type SendEmailResult = {
  queued: number;
  skipped_optout: number;
  log_id: number;
};

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  freelancer: 'Freelancer',
  studio: 'Studio',
  agency: 'Agency',
};

const UNSUBSCRIBE_LINE = 'You\'re receiving this because you have a Handover account. To stop these emails, reply with "unsubscribe".';

export default function EmailsPage() {
  const { toast } = useToast();
  const { loading: authLoading, user } = useAuth();
  const { t } = useI18n();
  const [rows, setRows] = useState<AdminRow[] | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [planFilter, setPlanFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailLog, setEmailLog] = useState<EmailLogRow[] | null>(null);
  const [signature, setSignature] = useState('');
  const [savedSignature, setSavedSignature] = useState('');
  const [signatureSaving, setSignatureSaving] = useState(false);
  const [signatureMsg, setSignatureMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const fetchOverview = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_overview');
    if (error) {
      console.error('admin_overview RPC error:', error);
      setError(true);
      setRows(null);
    } else {
      setError(false);
      setRows((data as AdminRow[]) ?? []);
    }
    setLoading(false);
  }, []);

  const fetchEmailLog = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_email_log_list');
    if (error) {
      console.error('admin_email_log_list RPC error:', error);
      return;
    }
    setEmailLog((data as EmailLogRow[]) ?? []);
  }, []);

  const fetchSignature = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_get_email_signature');
    if (error) {
      console.error('admin_get_email_signature RPC error:', error);
      return;
    }
    const value = (data as string) ?? '';
    setSignature(value);
    setSavedSignature(value);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchOverview();
    fetchEmailLog();
    fetchSignature();
  }, [authLoading, user, fetchOverview, fetchEmailLog, fetchSignature]);

  const filteredRows = (() => {
    if (!rows) return [];
    if (planFilter === 'all') return rows;
    return rows.filter((r) => (r.plan || 'free') === planFilter);
  })();

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredRows.map((r) => r.user_id)));
  };

  const unselectAll = () => {
    setSelectedIds(new Set());
  };

  const openEmailDialog = () => {
    setEmailSubject('');
    setEmailBody('');
    setEmailError(null);
    setEmailDialogOpen(true);
  };

  const handleSendEmail = async () => {
    if (selectedIds.size === 0 || !emailSubject.trim() || !emailBody.trim()) return;

    setEmailSending(true);
    setEmailError(null);

    const { data, error } = await supabase.rpc('admin_send_email', {
      p_user_ids: Array.from(selectedIds),
      p_subject: emailSubject,
      p_body: emailBody,
    });

    if (error) {
      setEmailError(error.message || t('emails.error'));
      setEmailSending(false);
      return;
    }

    const result = data as SendEmailResult;
    setEmailDialogOpen(false);
    setSelectedIds(new Set());
    setEmailSubject('');
    setEmailBody('');
    setEmailSending(false);

    toast({ title: t('emails.sent', { queued: result.queued }) });

    fetchEmailLog();
  };

  const handleSaveSignature = async () => {
    if (signature === savedSignature) return;
    setSignatureSaving(true);
    setSignatureMsg(null);
    const { error } = await supabase.rpc('admin_set_email_signature', { p_value: signature });
    if (error) {
      setSignatureMsg({ type: 'err', text: error.message || t('emails.signatureError') });
    } else {
      setSavedSignature(signature);
      setSignatureMsg({ type: 'ok', text: t('emails.signatureSaved') });
    }
    setSignatureSaving(false);
  };

  const footerPreview = (() => {
    const sig = savedSignature.trim();
    if (sig) {
      return `—\n${sig}\n\n${UNSUBSCRIBE_LINE}`;
    }
    return `—\n${UNSUBSCRIBE_LINE}`;
  })();

  const signatureDirty = signature !== savedSignature;

  const fmtDateTime = (val: string) => {
    try {
      return new Date(val).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return val;
    }
  };

  if (loading || authLoading) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-muted-foreground">Loading…</p>
        </div>
      </AppShell>
    );
  }

  if (!user || error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-secondary/30 px-4">
        <FileText className="mb-4 h-12 w-12 text-muted-foreground/50" strokeWidth={1} />
        <h1 className="text-2xl">Not found</h1>
        <p className="mt-2 text-muted-foreground">This page may have been moved or deleted.</p>
      </div>
    );
  }

  const emailLogStatus = (row: EmailLogRow): { label: string; className: string } => {
    if (row.requests === 0 || (row.requests_ok === 0 && row.requests_failed === 0)) {
      return { label: t('emails.statusUnknown'), className: 'text-muted-foreground' };
    }
    if (row.requests_failed > 0) {
      return { label: t('emails.statusFailed'), className: 'text-destructive' };
    }
    return { label: t('emails.statusSent'), className: 'text-green-700' };
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl tracking-tight">{t('emails.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('emails.subtitle')}
        </p>

        {/* Filter and selection bar */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="h-9 w-40 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('emails.allPlans')}</SelectItem>
              <SelectItem value="free">{t('emails.planFree')}</SelectItem>
              <SelectItem value="freelancer">{t('emails.planFreelancer')}</SelectItem>
              <SelectItem value="studio">{t('emails.planStudio')}</SelectItem>
              <SelectItem value="agency">{t('emails.planAgency')}</SelectItem>
            </SelectContent>
          </Select>

          <Button type="button" variant="outline" size="sm" onClick={selectAll}>
            {t('emails.selectAll')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={unselectAll}
            disabled={selectedIds.size === 0}
          >
            {t('emails.unselectAll')}
          </Button>

          <span className="text-sm text-muted-foreground">
            {t('emails.selectedCount', { count: selectedIds.size })}
          </span>

          <Button
            type="button"
            size="sm"
            className="ml-auto gap-1.5"
            disabled={selectedIds.size === 0}
            onClick={openEmailDialog}
          >
            <Mail className="h-4 w-4" />
            {t('emails.compose', { count: selectedIds.size })}
          </Button>
        </div>

        {/* Table */}
        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/20">
                <th className="px-4 py-3 text-left font-medium"></th>
                <th className="px-4 py-3 text-left font-medium">{t('emails.colEmail')}</th>
                <th className="px-4 py-3 text-left font-medium">{t('emails.colAgency')}</th>
                <th className="px-4 py-3 text-left font-medium">{t('emails.colPlan')}</th>
                <th className="px-4 py-3 text-left font-medium">{t('emails.colManuals')}</th>
                <th className="px-4 py-3 text-left font-medium">{t('emails.colActive')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r) => {
                const isSelected = selectedIds.has(r.user_id);
                return (
                  <tr
                    key={r.user_id}
                    className={`cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-secondary/20 ${isSelected ? 'bg-secondary/40' : ''}`}
                    onClick={() => toggleSelectOne(r.user_id)}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelectOne(r.user_id)}
                        aria-label={`Select ${r.email || r.user_id}`}
                      />
                    </td>
                    <td className="px-4 py-3">{r.email || '—'}</td>
                    <td className="px-4 py-3">{r.agency_name || '—'}</td>
                    <td className="px-4 py-3">{PLAN_LABELS[r.plan || 'free'] || r.plan || '—'}</td>
                    <td className="px-4 py-3">{r.manual_count || 0}</td>
                    <td className="px-4 py-3">{r.live_count || 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Email signature card */}
        <Card className="mt-6 max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <KeyRound className="h-5 w-5 text-muted-foreground" />
              {t('emails.signatureTitle')}
            </CardTitle>
            <CardDescription>
              {t('emails.signatureDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              rows={6}
              disabled={signatureSaving}
            />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleSaveSignature}
                disabled={signatureSaving || !signatureDirty}
              >
                {signatureSaving ? t('emails.signatureSaving') : t('emails.signatureSave')}
              </Button>
              {signatureMsg && (
                <p className={`text-sm ${signatureMsg.type === 'ok' ? 'text-green-600' : 'text-destructive'}`}>
                  {signatureMsg.text}
                </p>
              )}
            </div>
            <div className="rounded-md border border-border bg-secondary/20 p-3">
              <p className="whitespace-pre-wrap text-xs text-muted-foreground">
                {UNSUBSCRIBE_LINE}
              </p>
              <p className="mt-1 text-xs text-muted-foreground italic">
                {t('emails.signatureUnsubscribeNote')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Recent emails card */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="h-5 w-5 text-muted-foreground" />
              {t('emails.recent')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {emailLog === null ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : emailLog.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('emails.recentEmpty')}</p>
            ) : (
              <div className="space-y-3">
                {emailLog.map((row) => {
                  const status = emailLogStatus(row);
                  const recipientText = row.recipient_count === 1
                    ? t('emails.oneRecipient')
                    : t('emails.nRecipients', { count: row.recipient_count });
                  return (
                    <div
                      key={row.id}
                      className="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{row.subject}</p>
                        <p className="text-xs text-muted-foreground">
                          {fmtDateTime(row.sent_at)} · {recipientText}
                        </p>
                      </div>
                      <span className={`shrink-0 text-sm font-medium ${status.className}`}>
                        {status.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Compose dialog */}
        <Dialog open={emailDialogOpen} onOpenChange={(open) => {
          if (!emailSending) {
            setEmailDialogOpen(open);
            if (!open) setEmailError(null);
          }
        }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t('emails.composeTitle')}</DialogTitle>
              <DialogDescription>{t('emails.composeDescription')}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email-subject" className="text-sm font-medium">
                  {t('emails.subject')}
                </label>
                <Input
                  id="email-subject"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder={t('emails.subjectPlaceholder')}
                  disabled={emailSending}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email-body" className="text-sm font-medium">
                  {t('emails.body')}
                </label>
                <Textarea
                  id="email-body"
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder={t('emails.bodyPlaceholder')}
                  disabled={emailSending}
                  rows={10}
                />
              </div>

              <div className="rounded-md border border-border bg-secondary/20 p-3">
                <p className="whitespace-pre-wrap text-xs text-muted-foreground">
                  {footerPreview}
                </p>
                {signatureDirty && (
                  <p className="mt-2 text-xs text-amber-700">
                    {t('emails.signatureUnsaved')}
                  </p>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                {selectedIds.size === 1
                  ? t('emails.goesToOne')
                  : t('emails.goesToMany', { count: selectedIds.size })}
              </p>

              {emailError && (
                <p className="text-sm text-destructive">{emailError}</p>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  if (!emailSending) {
                    setEmailDialogOpen(false);
                    setEmailError(null);
                  }
                }}
                disabled={emailSending}
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleSendEmail}
                disabled={emailSending || selectedIds.size === 0 || !emailSubject.trim() || !emailBody.trim()}
              >
                {emailSending
                  ? t('emails.sending')
                  : t('emails.send', { count: selectedIds.size })}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
