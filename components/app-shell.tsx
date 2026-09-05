'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useI18n, persistUiLocale } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Settings, LogOut, BookOpen, ChevronDown, Globe, Mail } from 'lucide-react';
import type { Locale } from '@/lib/types';
import { HandoverLogo } from '@/components/Logo';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, profile, signOut } = useAuth();
  const { locale, setLocale, t } = useI18n();

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale);
    if (user) {
      persistUiLocale(user.id, newLocale);
    }
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <a href="https://handover.agency/">
            <HandoverLogo size={28} />
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
