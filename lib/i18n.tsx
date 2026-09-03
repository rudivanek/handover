'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import enMessages from '@/locales/en.json';
import esMessages from '@/locales/es.json';
import type { Locale } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

type Messages = Record<string, string>;

const messages: Record<Locale, Messages> = {
  en: enMessages,
  es: esMessages,
};

type I18nContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextType>({
  locale: 'en',
  setLocale: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    if (profile?.ui_locale) {
      setLocaleState(profile.ui_locale as Locale);
    }
  }, [profile]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const msg = messages[locale]?.[key] ?? messages.en[key] ?? key;
    if (!params) return msg;
    return msg.replace(/\{(\w+)\}/g, (_, k: string) => {
      const val = params[k];
      return val !== undefined ? String(val) : `{${k}}`;
    });
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

export function persistUiLocale(user_id: string, locale: Locale) {
  return supabase.from('profiles').update({ ui_locale: locale }).eq('user_id', user_id);
}
