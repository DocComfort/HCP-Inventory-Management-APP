import React, { useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { AuthContext, AuthContextType } from './AuthContextType';
import type { UserRole, AppUser } from './AuthContextType';

export type { UserRole, AppUser } from './AuthContextType';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        loadUserProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        loadUserProfile(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (authUser: User) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('role, organization_id, technician_id')
        .eq('id', authUser.id)
        .single();

      if (error) throw error;

      setUser({
        ...authUser,
        role: data.role,
        organizationId: data.organization_id,
        technicianId: data.technician_id
      });
    } catch (error) {
      console.error('Error loading user profile:', error);
      setUser(authUser as AppUser);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  };

  const signUp = async (email: string, password: string, role: UserRole, organizationId: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    if (data.user) {
      // Create user profile
      const { error: profileError } = await supabase.from('users').insert({
        id: data.user.id,
        email,
        role,
        organization_id: organizationId,
      });

      if (profileError) throw profileError;
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (requiredRole: UserRole): boolean => {
    if (!user?.role) return false;

    const roleHierarchy: Record<UserRole, number> = {
      admin: 3,
      manager: 2,
      technician: 1,
    };

    return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
