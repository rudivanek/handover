'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Mail, Lock, ArrowRight, MailCheck } from 'lucide-react';
import enMessages from '@/locales/en.json';
import esMessages from '@/locales/es.json';
import type { Locale } from '@/lib/types';
import { HandoverLogo } from '@/components/Logo';
import { MARKETING_URL } from '@/lib/utils';

const messages: Record<Locale, Record<string, string>> = {
  en: enMessages,
  es: esMessages,
};

export default function ResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [locale, setLocale] = useState<Locale>('en');
  const [sent, setSent] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);

  const t = (key: string): string => messages[locale][key] ?? messages.en[key] ?? key;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.recovery_sent_at || session?.user?.aud === 'authenticated') {
        const url = new URL(window.location.href);
        const type = url.searchParams.get('type');
        if (type === 'recovery') {
          setHasRecoverySession(true);
        }
      }
    });
  }, []);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://app.handover.agency/reset-password',
    });

    setLoading(false);
    setSent(true);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError(t('login.passwordTooShort'));
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    setLoading(false);

    if (error) {
      setError(t('reset.updateError'));
      return;
    }

    router.replace('/manuals');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-secondary/30 px-4">
      <div className="mb-8">
        <HandoverLogo size={26} />
      </div>

      <Card className="w-full max-w-md shadow-sm">
        <CardHeader className="space-y-3">
          <CardTitle className="text-2xl">
            {hasRecoverySession ? t('reset.setNewPassword') : t('reset.title')}
          </CardTitle>
          <CardDescription>
            {hasRecoverySession ? t('reset.setNewPasswordDescription') : t('reset.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasRecoverySession ? (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">{t('reset.newPassword')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="pl-9"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-muted-foreground">{t('login.passwordHint')}</p>
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t('reset.updating') : t('reset.update')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          ) : sent ? (
            <div className="space-y-4 text-center">
              <MailCheck className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {t('reset.sent')}
              </p>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => router.push('/login')}
              >
                {t('reset.backToLogin')}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleRequest} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('login.email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@agency.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-9"
                    autoFocus
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t('reset.sending') : t('reset.send')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <p className="mt-8 text-xs text-muted-foreground">
        {t('login.tagline')}
      </p>
      <a
        href={MARKETING_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 text-xs text-muted-foreground underline transition-colors hover:text-foreground"
      >
        {t('login.whatIs')}
      </a>
    </div>
  );
}
