'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth-context';
import { AppShell } from '@/components/app-shell';
import { FileText, KeyRound, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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

type DeleteResult = {
  manuals_deleted: number;
  active_deleted: number;
  auth_deleted: boolean;
};

const PLAN_LIMITS: Record<string, number | null> = {
  free: 1,
  freelancer: 3,
  studio: 10,
  agency: null,
};

export default function AdminPage() {
  const { loading: authLoading, user } = useAuth();
  const { t } = useI18n();
  const [rows, setRows] = useState<AdminRow[] | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [keyStatus, setKeyStatus] = useState<boolean | null>(null);
  const [keyInput, setKeyInput] = useState('');
  const [keySaving, setKeySaving] = useState(false);
  const [keyMsg, setKeyMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminRow | null>(null);
  const [deleteEmail, setDeleteEmail] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState<{ type: 'ok' | 'partial' | 'err'; text: string } | null>(null);

  const fetchKeyStatus = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_resend_key_status');
    if (error) {
      setKeyStatus(null);
    } else {
      setKeyStatus(data as boolean);
    }
  }, []);

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

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchOverview();
    fetchKeyStatus();
  }, [authLoading, user, fetchOverview, fetchKeyStatus]);

  const handlePlanChange = async (userId: string, newPlan: string, prevPlan: string) => {
    const { error } = await supabase.rpc('admin_set_plan', {
      p_user_id: userId,
      p_plan: newPlan,
    });
    if (error) {
      console.error('admin_set_plan RPC error:', error);
      setRows((prev) =>
        prev ? prev.map((r) => (r.user_id === userId ? { ...r, plan: prevPlan } : r)) : prev,
      );
      return;
    }
    fetchOverview();
  };

  const handleSaveKey = async () => {
    if (!keyInput.trim()) return;
    setKeySaving(true);
    setKeyMsg(null);
    const { error } = await supabase.rpc('admin_set_resend_key', { p_key: keyInput });
    setKeyInput('');
    if (error) {
      setKeyMsg({ type: 'err', text: error.message || 'Failed to save key.' });
    } else {
      setKeyMsg({ type: 'ok', text: 'Key saved.' });
      fetchKeyStatus();
    }
    setKeySaving(false);
  };

  const handleDeleteAccount = async () => {
    if (!deleteTarget?.email || deleteEmail !== deleteTarget.email) return;

    setDeleteBusy(true);
    setDeleteMsg(null);

    const { data, error } = await supabase.rpc('admin_delete_account', {
      p_user_id: deleteTarget.user_id,
    });

    if (error) {
      console.error('admin_delete_account RPC error:', error);
      setDeleteMsg({ type: 'err', text: error.message });
      setDeleteBusy(false);
      return;
    }

    const result = data as DeleteResult;
    setDeleteTarget(null);
    setDeleteEmail('');
    setDeleteMsg({
      type: result.auth_deleted ? 'ok' : 'partial',
      text: result.auth_deleted
        ? t('admin.deleteSuccess', {
            manuals: result.manuals_deleted,
            active: result.active_deleted,
          })
        : t('admin.deletePartial', {
            manuals: result.manuals_deleted,
            active: result.active_deleted,
          }),
    });
    await fetchOverview();
    setDeleteBusy(false);
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

  const totalAccounts = rows?.length ?? 0;
  const totalManuals = rows?.reduce((sum, r) => sum + (r.manual_count || 0), 0) ?? 0;

  const fmtDate = (val: string | null) => {
    if (!val) return '—';
    try {
      return new Date(val).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch {
      return val;
    }
  };

  const isOverLimit = (plan: string | null, liveCount: number) => {
    const limit = plan ? PLAN_LIMITS[plan] : null;
    if (limit === null || limit === undefined) return false;
    return liveCount > limit;
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl tracking-tight">Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aggregate overview of all accounts.
        </p>

        <div className="mt-6 flex gap-6">
          <div>
            <p className="text-3xl font-semibold">{totalAccounts}</p>
            <p className="text-sm text-muted-foreground">Accounts</p>
          </div>
          <div>
            <p className="text-3xl font-semibold">{totalManuals}</p>
            <p className="text-sm text-muted-foreground">Manuals</p>
          </div>
        </div>

        {deleteMsg && (
          <p className={`mt-4 text-sm ${deleteMsg.type === 'err' ? 'text-destructive' : deleteMsg.type === 'partial' ? 'text-amber-700' : 'text-green-700'}`}>
            {deleteMsg.text}
          </p>
        )}

        <div className="mt-6 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/20">
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Agency</th>
                <th className="px-4 py-3 text-left font-medium">Plan</th>
                <th className="px-4 py-3 text-left font-medium">Signed up</th>
                <th className="px-4 py-3 text-left font-medium">Manuals</th>
                <th className="px-4 py-3 text-left font-medium">Live</th>
                <th className="px-4 py-3 text-left font-medium">{t('admin.delete')}</th>
              </tr>
            </thead>
            <tbody>
              {rows?.map((r) => {
                const overLimit = isOverLimit(r.plan, r.live_count || 0);
                return (
                  <tr key={r.user_id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">{r.email || '—'}</td>
                    <td className="px-4 py-3">{r.agency_name || '—'}</td>
                    <td className="px-4 py-3">
                      <Select
                        value={r.plan || 'free'}
                        onValueChange={(value) => handlePlanChange(r.user_id, value, r.plan || 'free')}
                      >
                        <SelectTrigger className="h-8 w-32 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="freelancer">Freelancer</SelectItem>
                          <SelectItem value="studio">Studio</SelectItem>
                          <SelectItem value="agency">Agency</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{fmtDate(r.signed_up_at)}</td>
                    <td className="px-4 py-3 align-top">
                      <span className="font-medium">{r.manual_count || 0}</span>
                      {r.manual_dates && r.manual_dates.length > 0 && (
                        <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                          {r.manual_dates.map((d, j) => (
                            <li key={j}>{fmtDate(d)}</li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium">{r.live_count || 0}</span>
                      {overLimit && (
                        <span className="ml-2 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                          over limit
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => {
                          setDeleteTarget(r);
                          setDeleteEmail('');
                          setDeleteMsg(null);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {t('admin.delete')}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Card className="mt-6 max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <KeyRound className="h-5 w-5 text-muted-foreground" />
              Signup notification key
            </CardTitle>
            <CardDescription>
              The Resend API key used by the new-signup email trigger.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {keyStatus === null
                ? 'Checking status…'
                : keyStatus
                  ? 'A key is set.'
                  : 'No key set — signup emails are not being sent.'}
            </p>
            <div className="flex items-center gap-2">
              <Input
                type="password"
                autoComplete="off"
                placeholder="Paste Resend API key"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                disabled={keySaving}
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={handleSaveKey}
                disabled={keySaving || !keyInput.trim()}
              >
                {keySaving ? 'Saving…' : 'Save'}
              </Button>
            </div>
            {keyMsg && (
              <p className={`text-sm ${keyMsg.type === 'ok' ? 'text-green-600' : 'text-destructive'}`}>
                {keyMsg.text}
              </p>
            )}
          </CardContent>
        </Card>

        <AlertDialog
          open={deleteTarget !== null}
          onOpenChange={(open) => {
            if (!open && !deleteBusy) {
              setDeleteTarget(null);
              setDeleteEmail('');
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('admin.deleteTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('admin.deleteDescription')}
              </AlertDialogDescription>
            </AlertDialogHeader>

            {deleteTarget && (
              <div className="space-y-3 rounded-md border border-border bg-secondary/20 p-4 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">{t('admin.deleteEmail')}</span>
                  <span className="font-medium text-right">{deleteTarget.email || '—'}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">{t('admin.deleteAgency')}</span>
                  <span className="font-medium text-right">{deleteTarget.agency_name || '—'}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">{t('admin.deleteManuals')}</span>
                  <span className="font-medium">{deleteTarget.manual_count || 0}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">{t('admin.deleteActive')}</span>
                  <span className="font-medium">{deleteTarget.live_count || 0}</span>
                </div>
              </div>
            )}

            <p className="text-sm font-medium text-destructive">
              {t('admin.deleteWarning')}
            </p>

            <div className="space-y-2">
              <label htmlFor="delete-email" className="text-sm font-medium">
                {t('admin.deleteEmailInstruction')}
              </label>
              <Input
                id="delete-email"
                type="email"
                autoComplete="off"
                value={deleteEmail}
                onChange={(e) => setDeleteEmail(e.target.value)}
                disabled={deleteBusy}
              />
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteBusy}>{t('admin.deleteCancel')}</AlertDialogCancel>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={deleteBusy || !deleteTarget?.email || deleteEmail !== deleteTarget.email}
              >
                {deleteBusy ? t('admin.deleteDeleting') : t('admin.deleteConfirm')}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppShell>
  );
}
