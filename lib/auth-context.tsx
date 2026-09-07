'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  profileLoaded: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  profileLoaded: false,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    const timeout = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 5000);

    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      clearTimeout(timeout);
      if (!mounted) return;
      if (error) {
        setSession(null);
        setUser(null);
        setProfileLoaded(true);
      } else {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await ensureProfile(session.user);
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', session.user.id)
            .maybeSingle();
          if (mounted) {
            setProfile(profileData as Profile | null);
            setProfileLoaded(true);
          }
        } else {
          if (mounted) setProfileLoaded(true);
        }
      }
      setLoading(false);
    }).catch(() => {
      clearTimeout(timeout);
      if (!mounted) return;
      setLoading(false);
      setProfileLoaded(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (session?.user) {
          await ensureProfile(session.user);
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', session.user.id)
            .maybeSingle();
          if (mounted) {
            setProfile(data as Profile | null);
            setProfileLoaded(true);
          }
        } else {
          if (mounted) {
            setProfile(null);
            setProfileLoaded(true);
          }
        }
      })();
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const ensureProfile = async (authUser: User) => {
    const { data: existing } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('user_id', authUser.id)
      .maybeSingle();

    if (existing) return;

    const agencyName =
      (authUser.user_metadata?.agency_name as string | undefined) ||
      authUser.email?.split('@')[0] ||
      'My Agency';

    await supabase.from('profiles').insert({
      user_id: authUser.id,
      agency_name: agencyName,
      plan: 'free',
    });
  };

  const refreshProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    setProfile(data as Profile | null);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, profileLoaded, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
