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
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  isAdmin: false,
  isSuperAdmin: false,
  profile: null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;

      if (data) {
        setProfile(data);
        setIsAdmin(data.role === 'admin');
        setIsSuperAdmin(!!data.is_superadmin);
      } else {
        setProfile(null);
        setIsAdmin(false);
        setIsSuperAdmin(false);
      }
    } catch (err) {
      console.error('Error fetching profile in AuthProvider:', err);
      setProfile(null);
      setIsAdmin(false);
      setIsSuperAdmin(false);
    }
  };

  useEffect(() => {
    let active = true;

    const initializeAuth = async () => {
      try {
        const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) =>
          setTimeout(() => resolve({ data: { session: null } }), 2500)
        );
        const sessionPromise = supabase.auth.getSession();
        const res = (await Promise.race([sessionPromise, timeoutPromise])) as any;
        const session = res?.data?.session ?? null;

        if (!active) return;
        setSession(session);

        if (session?.user) {
          const profileTimeout = new Promise<{ data: null }>((resolve) =>
            setTimeout(() => resolve({ data: null }), 2000)
          );
          const profilePromise = supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          const profileRes = (await Promise.race([profilePromise, profileTimeout])) as any;

          if (profileRes?.data) {
            setProfile(profileRes.data);
            setIsAdmin(profileRes.data.role === 'admin');
            setIsSuperAdmin(!!profileRes.data.is_superadmin);
          } else {
            setProfile(null);
            setIsAdmin(false);
            setIsSuperAdmin(false);
          }
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!active) return;
      setLoading(true);
      setSession(newSession);
      if (newSession?.user) {
        await fetchProfile(newSession.user.id);
      } else {
        setProfile(null);
        setIsAdmin(false);
        setIsSuperAdmin(false);
      }
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    session,
    user: session?.user ?? null,
    loading,
    isAdmin,
    isSuperAdmin,
    profile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
