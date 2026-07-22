import type { Session } from '@supabase/supabase-js';
import { createContext, use, useEffect, useState } from 'react';

import type { Profile } from '@/services/database.types';
import { supabase } from '@/services/supabase';
import { useRouter } from 'expo-router';

type AuthState = {
  /** True until the initial session + profile load resolves. */
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  /** Refetch the current user's profile (e.g. after role selection or edit). */
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const router = useRouter();

  async function loadProfile(userId: string | undefined) {
    if (!userId) {
      setProfile(null);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    setProfile(data ?? null);
  }

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadProfile(data.session?.user.id);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, next) => {
      setSession(next);
      await loadProfile(next?.user.id);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext
      value={{
        loading,
        session,
        profile,
        refreshProfile: () => loadProfile(session?.user.id),
        signOut: async () => {
          await supabase.auth.signOut();
          router.replace('/(auth)/sign-in');
        },
      }}>
      {children}
    </AuthContext>
  );
}

export function useAuth() {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
