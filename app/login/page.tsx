'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { Mail, Lock, ArrowRight, Globe } from 'lucide-react';
import enMessages from '@/locales/en.json';
import esMessages from '@/locales/es.json';
import type { Locale } from '@/lib/types';
import { HandoverLogo } from '@/components/Logo';

const messages: Record<Locale, Record<string, string>> = {
  en: enMessages,
  es: esMessages,
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [locale, setLocale] = useState<Locale>('en');
  const router = useRouter();

  const t = (key: string): string => messages[locale][key] ?? messages.en[key] ?? key;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
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
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">{t('login.title')}</CardTitle>
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
                  Espa\u00f1ol
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <CardDescription>
            {t('login.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                  placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-9"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('login.signingIn') : t('login.submit')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="mt-8 text-xs text-muted-foreground">
        {t('login.tagline')}
      </p>
    </div>
  );
}
