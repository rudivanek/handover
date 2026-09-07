'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useI18n, persistUiLocale } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Settings, LogOut, BookOpen, ChevronDown, Globe, Mail, HelpCircle } from 'lucide-react';
import type { Locale } from '@/lib/types';
import { HandoverLogo } from '@/components/Logo';
import { APP_VERSION } from '@/lib/version';

const PLAN_LABELS: Record<string, { en: string; es: string }> = {
  free: { en: 'Free', es: 'Gratis' },
  freelancer: { en: 'Freelancer', es: 'Freelancer' },
  agency: { en: 'Agency', es: 'Agencia' },
};

const PLAN_LIMITS: Record<string, number | null> = {
  free: 1,
  freelancer: 3,
  agency: null,
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, profile, signOut } = useAuth();
  const { locale, setLocale, t } = useI18n();
  const pathname = usePathname();
  const [liveCount, setLiveCount] = useState<number | null>(null);

  const fetchLiveCount = async () => {
    if (!user) return;
    const { count } = await supabase
      .from('manuals')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_published', true)
      .is('archived_at', null);
    setLiveCount(count ?? 0);
  };

  useEffect(() => {
    fetchLiveCount();
  }, [user, pathname]);

  useEffect(() => {
    const handler = () => fetchLiveCount();
    window.addEventListener('manuals-changed', handler);
    return () => window.removeEventListener('manuals-changed', handler);
  }, [user]);

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale);
    if (user) {
      persistUiLocale(user.id, newLocale);
    }
  };

  const plan = profile?.plan || 'free';
  const planLimit = PLAN_LIMITS[plan] ?? null;
  const planLabel = PLAN_LABELS[plan]?.[locale] || plan;
  const atOrOverLimit = planLimit !== null && liveCount !== null && liveCount >= planLimit;

  const renderPlanIndicator = () => {
    if (liveCount === null) return null;
    const countText = planLimit === null
      ? `${liveCount} ${locale === 'es' ? 'publicados' : 'live'}`
      : `${liveCount}/${planLimit}`;
    const fullText = `${planLabel} · ${countText}`;
    const shortText = planLabel;

    return (
      <span
        className={`hidden sm:inline text-xs font-medium px-2 py-1 rounded ${
          atOrOverLimit
            ? 'bg-amber-100 text-amber-800'
            : 'bg-secondary text-muted-foreground'
        }`}
      >
        {fullText}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <a href="https://handover.agency/" className="flex items-center">
            <HandoverLogo size={28} />
            <span className="ml-2 hidden sm:inline text-[11px] text-right text-muted-foreground" title={`Version ${APP_VERSION}`}>
              v. {APP_VERSION}
            </span>
          </a>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/manuals">
                <BookOpen className="mr-1.5 h-4 w-4" />
                <span className="hidden sm:inline">{t('nav.manuals')}</span>
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/scripts">
                <Mail className="mr-1.5 h-4 w-4" />
                <span className="hidden sm:inline">{t('nav.scripts')}</span>
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/settings">
                <Settings className="mr-1.5 h-4 w-4" />
                <span className="hidden sm:inline">{t('nav.settings')}</span>
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <a href="https://handover.agency/help.html" target="_blank" rel="noopener noreferrer">
                <HelpCircle className="mr-1.5 h-4 w-4" />
                <span className="hidden sm:inline">{t('nav.help')}</span>
              </a>
            </Button>
            {renderPlanIndicator()}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1">
                  <Globe className="h-4 w-4" />
                  <span className="hidden sm:inline">{locale === 'en' ? 'EN' : 'ES'}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => handleLocaleChange('en')}
                  className={locale === 'en' ? 'font-semibold' : ''}
                >
                  English
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleLocaleChange('es')}
                  className={locale === 'es' ? 'font-semibold' : ''}
                >
                  Español
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1">
                  <span className="hidden sm:inline">
                    {profile?.agency_name || user?.email}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="text-muted-foreground text-xs">
                  {user?.email}
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">{t('nav.agencySettings')}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => signOut()}
                  className="text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('nav.signOut')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
