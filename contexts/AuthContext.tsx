import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  profile: any;
  /** Superadmins and admins without a module list have every module */
  hasModule: (module: string) => boolean;
  signIn: (email: string, password: string) => Promise<{
    success: boolean;
    error?: string;
    isAdmin?: boolean;
    isSuperAdmin?: boolean;
    user?: User;
  }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<any>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  isAdmin: false,
  isSuperAdmin: false,
  profile: null,
  hasModule: () => false,
  signIn: async () => ({ success: false, error: 'Auth not initialized' }),
  signOut: async () => {},
  refreshProfile: async () => null,
});

export const useAuth = () => useContext(AuthContext);

// Translate Supabase auth errors to friendly Azerbaijani messages
const formatAuthError = (err: any): string => {
  if (!err) return 'Xəta baş verdi';
  const msg = err.message || String(err);
  if (msg.includes('Invalid login credentials')) {
    return 'Email və ya şifrə yanlışdır.';
  }
  if (msg.includes('Email not confirmed')) {
    return 'Bu email ünvanı hələ təsdiqlənməyib. Zəhmət olmasa email qutunuzu yoxlayın.';
  }
  if (msg.includes('rate limit') || msg.includes('Too many requests')) {
    return 'Həddindən artıq cəhd edildi. Zəhmət olmasa bir qədər sonra yenidən cəhd edin.';
  }
  if (msg.includes('Network request failed') || msg.includes('Failed to fetch')) {
    return 'İnternet bağlantısı problemi. Zəhmət olmasa şəbəkənizi yoxlayın.';
  }
  return msg;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const fetchProfile = async (userId: string, currentUser?: User | null) => {
    try {
      // Use maybeSingle so missing row does not throw PGRST116
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        // Don't fall back to a guessed profile on a failed read: upserting it
        // could overwrite the real row.
        console.warn('Error fetching profile from DB:', error.message);
        setProfile(null);
        setIsAdmin(false);
        setIsSuperAdmin(false);
        return null;
      }

      if (data) {
        setProfile(data);
        const adminFlag = data.role === 'admin' || !!data.is_superadmin;
        const superAdminFlag = !!data.is_superadmin;
        setIsAdmin(adminFlag);
        setIsSuperAdmin(superAdminFlag);
        return data;
      }

      // Fallback: no profile row yet, create a basic one.
      // Never take role from user_metadata: users can edit their own metadata.
      const usr = currentUser || session?.user;
      const userMeta = usr?.user_metadata || {};
      const fallbackProfile = {
        id: userId,
        email: usr?.email || '',
        full_name: userMeta.full_name || usr?.email?.split('@')[0] || 'İstifadəçi',
        role: 'user',
        is_superadmin: false,
      };

      setProfile(fallbackProfile);
      setIsAdmin(false);
      setIsSuperAdmin(false);

      // Attempt to upsert the profile in background so future queries find it
      supabase
        .from('profiles')
        .upsert(fallbackProfile)
        .then(() => {}, () => {});

      return fallbackProfile;
    } catch (err) {
      console.error('Error fetching profile in AuthProvider:', err);
      setProfile(null);
      setIsAdmin(false);
      setIsSuperAdmin(false);
      return null;
    }
  };

  useEffect(() => {
    let active = true;

    const initializeAuth = async () => {
      try {
        const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) =>
          setTimeout(() => resolve({ data: { session: null } }), 3000)
        );
        const sessionPromise = supabase.auth.getSession();
        const res = (await Promise.race([sessionPromise, timeoutPromise])) as any;
        const currentSession = res?.data?.session ?? null;

        if (!active) return;
        setSession(currentSession);

        if (currentSession?.user) {
          await fetchProfile(currentSession.user.id, currentSession.user);
        } else {
          setProfile(null);
          setIsAdmin(false);
          setIsSuperAdmin(false);
        }
      } catch (err) {
        console.error('Error getting initial session:', err);
      } finally {
        if (active) setLoading(false);
      }
    };

    initializeAuth();

    // The callback runs while supabase-js holds its auth lock. Awaiting a query in
    // here deadlocks every request on a cold start with a stored session (the app
    // only worked after a restart), so the profile load is deferred out of it.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, newSession: Session | null) => {
      if (!active) return;
      setSession(newSession);
      if (newSession?.user) {
        const user = newSession.user;
        setTimeout(() => {
          if (!active) return;
          fetchProfile(user.id, user).finally(() => active && setLoading(false));
        }, 0);
      } else {
        setProfile(null);
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setLoading(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        throw error;
      }

      setSession(data.session);

      // Synchronously resolve profile and admin flags before returning
      const userProfile = await fetchProfile(data.user.id, data.user);
      const adminFlag = userProfile?.role === 'admin' || !!userProfile?.is_superadmin;
      const superAdminFlag = !!userProfile?.is_superadmin;

      setIsAdmin(adminFlag);
      setIsSuperAdmin(superAdminFlag);

      return {
        success: true,
        session: data.session,
        user: data.user,
        profile: userProfile,
        isAdmin: adminFlag,
        isSuperAdmin: superAdminFlag,
      };
    } catch (err: any) {
      return {
        success: false,
        error: formatAuthError(err),
      };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setSession(null);
      setProfile(null);
      setIsAdmin(false);
      setIsSuperAdmin(false);
    } catch (e) {
      console.error('SignOut error:', e);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (session?.user) {
      return await fetchProfile(session.user.id, session.user);
    }
    return null;
  };

  const hasModule = (module: string) => {
    if (isSuperAdmin) return true;
    if (!isAdmin) return false;
    const modules = profile?.modules;
    return !Array.isArray(modules) || modules.includes(module);
  };

  const value = {
    session,
    user: session?.user ?? null,
    loading,
    isAdmin,
    isSuperAdmin,
    profile,
    hasModule,
    signIn,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
