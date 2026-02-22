"use client";

import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { User, Session } from '@supabase/supabase-js';
import { 
  signIn as signInAction, 
  signUp as signUpAction, 
  signOut as signOutAction,
  setActiveProfile as setActiveProfileAction,
  getActiveProfile as getActiveProfileAction,
  getUserProfiles as getUserProfilesAction
} from '@/app/actions/auth';
import type { Profile, UserProfile } from '@/lib/auth-types';

// ============================================================================
// Types
// ============================================================================

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  activeUserProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setActiveProfile: (profileId: string) => Promise<{ success: boolean; error: Error | null }>;
  refreshActiveProfile: () => Promise<void>;
}

// ============================================================================
// Context
// ============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [activeUserProfile, setActiveUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Memoize the Supabase client to prevent recreation on every render
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          setSession(session);
          setUser(session.user);
          
          // Fetch profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          setProfile(profile);
          
          // Fetch active user profile
          const activeProfile = await getActiveProfileAction();
          setActiveUserProfile(activeProfile);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch profile on auth change
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          setProfile(profile);
          
          // Fetch active user profile
          const activeProfile = await getActiveProfileAction();
          setActiveUserProfile(activeProfile);
        } else {
          setProfile(null);
          setActiveUserProfile(null);
        }
        
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Sign in function
  const signIn = async (email: string, password: string) => {
    const result = await signInAction({ email, password });
    
    if (result.error) {
      return { error: result.error };
    }
    
    // Profile will be updated via onAuthStateChange
    return { error: null };
  };

  // Sign up function (client wrapper)
  const signUp = async (email: string, password: string) => {
    const result = await signUpAction({ email, password });
    
    return { 
      error: result.error, 
      needsConfirmation: !result.session 
    };
  };

  // Sign out function
  const signOut = async () => {
    await signOutAction();
    setUser(null);
    setProfile(null);
    setSession(null);
    setActiveUserProfile(null);
  };

  // Refresh profile
  const refreshProfile = async () => {
    if (!user) return;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    setProfile(profile);
  };

  // Set active profile
  const setActiveProfile = async (profileId: string) => {
    const result = await setActiveProfileAction(profileId);
    
    if (result.success && result.profile) {
      setActiveUserProfile(result.profile);
    }
    
    return { success: result.success, error: result.error };
  };

  // Refresh active profile
  const refreshActiveProfile = async () => {
    const activeProfile = await getActiveProfileAction();
    setActiveUserProfile(activeProfile);
  };

  const value: AuthContextType = {
    user,
    profile,
    session,
    activeUserProfile,
    loading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    setActiveProfile,
    refreshActiveProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}
