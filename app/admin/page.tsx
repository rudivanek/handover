'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { AppShell } from '@/components/app-shell';
import { FileText } from 'lucide-react';

type AdminRow = {
  email: string | null;
  agency_name: string | null;
  plan: string | null;
  signed_up_at: string | null;
  manual_count: number | null;
  manual_dates: string[] | null;
};

export default function AdminPage() {
  const { loading: authLoading, user } = useAuth();
  const [rows, setRows] = useState<AdminRow[] | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
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
    })();
  }, [authLoading, user]);

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

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl tracking-tight">Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aggregate overview of all accounts. Read-only.
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

        <p className="mt-4 text-xs text-muted-foreground">
          Plan is set manually; it does not read from Stripe.
        </p>

        <div className="mt-6 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/20">
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Agency</th>
                <th className="px-4 py-3 text-left font-medium">Plan</th>
                <th className="px-4 py-3 text-left font-medium">Signed up</th>
                <th className="px-4 py-3 text-left font-medium">Manuals</th>
              </tr>
            </thead>
            <tbody>
              {rows?.map((r, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">{r.email || '—'}</td>
                  <td className="px-4 py-3">{r.agency_name || '—'}</td>
                  <td className="px-4 py-3">{r.plan || '—'}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
