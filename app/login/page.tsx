'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Mail, Lock, ArrowRight, Globe, Building2, MailCheck } from 'lucide-react';
import enMessages from '@/locales/en.json';
import esMessages from '@/locales/es.json';
import type { Locale } from '@/lib/types';
import { HandoverLogo } from '@/components/Logo';
import { MARKETING_URL } from '@/lib/utils';

const messages: Record<Locale, Record<string, string>> = {
  en: enMessages,
  es: esMessages,
};

type Mode = 'signin' | 'signup';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode: Mode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin';

  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [locale, setLocale] = useState<Locale>('en');
  const [confirmationState, setConfirmationState] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const t = (key: string): string => messages[locale][key] ?? messages.en[key] ?? key;

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0 || !email) return;
    setResendCooldown(60);
    await supabase.auth.resend({ type: 'signup', email });
  }, [resendCooldown, email]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      setError(t('login.invalidCredentials'));
      return;
    }

    router.replace('/manuals');
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!EMAIL_RE.test(email)) {
      setError(t('login.invalidEmail'));
      return;
    }
    if (password.length < 8) {
      setError(t('login.passwordTooShort'));
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'https://app.handover.agency/manuals',
        data: { agency_name: agencyName },
      },
    });

    setLoading(false);

    if (error) {
      if (
        error.message.toLowerCase().includes('already') ||
        error.message.toLowerCase().includes('registered') ||
        error.message.toLowerCase().includes('exists')
      ) {
        setConfirmationState(true);
        return;
      }
      setError(t('login.signupError'));
      return;
    }

    setConfirmationState(true);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-secondary/30 px-4">
      <div className="mb-8">
        <HandoverLogo size={26} />
      </div>

      <Card className="w-full max-w-md shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">
              {mode === 'signin' ? t('login.title') : t('login.signupTitle')}
            </CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1">
                  <Globe className="h-4 w-4" />
                  <span>{locale === 'en' ? 'EN' : 'ES'}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setLocale('en')}
                  className={locale === 'en' ? 'font-semibold' : ''}
                >
                  English
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setLocale('es')}
                  className={locale === 'es' ? 'font-semibold' : ''}
                >
                  Español
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <CardDescription>
            {mode === 'signin' ? t('login.description') : t('login.signupDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {confirmationState ? (
            <div className="space-y-4 text-center">
              <MailCheck className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {t('login.checkEmail')}
                <br />
                <span className="font-medium text-foreground">{email}</span>
                <br />
                {t('login.checkEmailExpires')}
              </p>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={resendCooldown > 0}
                onClick={handleResend}
              >
                {resendCooldown > 0
                  ? t('login.resendIn').replace('{seconds}', String(resendCooldown))
                  : t('login.resend')}
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setError(null); }}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    mode === 'signin' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  {t('login.tabSignin')}
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setError(null); }}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    mode === 'signup' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  {t('login.tabSignup')}
                </button>
              </div>

              <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp} className="space-y-4">
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

                <div className="space-y-2">
                  <Label htmlFor="password">{t('login.password')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pl-9"
                    />
                  </div>
                  {mode === 'signup' && (
                    <p className="text-xs text-muted-foreground">{t('login.passwordHint')}</p>
                  )}
                </div>

                {mode === 'signup' && (
                  <div className="space-y-2">
                    <Label htmlFor="agencyName">{t('login.agencyName')}</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="agencyName"
                        type="text"
                        placeholder={t('login.agencyNamePlaceholder')}
                        value={agencyName}
                        onChange={(e) => setAgencyName(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                )}

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading
                    ? (mode === 'signin' ? t('login.signingIn') : t('login.signingUp'))
                    : (mode === 'signin' ? t('login.submit') : t('login.signupSubmit'))}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>

              {mode === 'signin' && (
                <div className="mt-4 text-center">
                  <a
                    href="/reset-password"
                    className="text-sm text-muted-foreground underline transition-colors hover:text-foreground"
                  >
                    {t('login.forgotPassword')}
                  </a>
                </div>
              )}
            </>
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
