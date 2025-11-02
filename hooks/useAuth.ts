import { useEffect, useState } from 'react';
import { supabase, type Profile } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthUser extends User {
  is_admin?: boolean;
  free_listings_count?: number;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    console.log('[useAuth] Setting up auth listener...');
    
    let mounted = true;
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      console.log('[useAuth] Initial session check:', session ? `Session found for ${session.user.email}` : 'No session');
      
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
        setIsReady(true);
      }
      setInitialized(true);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      
      console.log('[useAuth] Auth state changed:', _event, session ? `Session for ${session.user.email}` : 'No session', 'initialized:', initialized);
      
      // Always reflect the current session; this avoids bounce and race issues
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        // On any event without a session, clear profile and stop loading
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      console.log('[useAuth] Fetching profile for user:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[useAuth] Error fetching profile:', error);
        // Don't throw - user can still be authenticated without profile
        // Profile might not exist yet for new users
      } else {
        console.log('[useAuth] Profile fetched successfully');
        setProfile(data);
      }
    } catch (error) {
      console.error('[useAuth] Error fetching profile:', error);
    } finally {
      setLoading(false);
      setIsReady(true);
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log('[useAuth] signIn called for:', email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (data?.session) {
      console.log('[useAuth] Sign in successful, session created:', {
        userId: data.user?.id,
        expiresAt: data.session.expires_at
      });
    } else {
      console.log('[useAuth] Sign in failed or no session:', error);
    }
    
    return { data, error };
  };

  const signUp = async (
    email: string, 
    password: string, 
    username: string, 
    fullName: string,
    firstName?: string,
    surname?: string,
    classGroup?: string,
    yearGroup?: string,
    house?: string
  ) => {
    // Sign up the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) return { data: null, error: authError };

    // Profile will be created automatically by the auth trigger
    // But we can update it with additional info
    if (authData.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          username,
          full_name: fullName,
          first_name: firstName,
          surname,
          class: classGroup,
          year_group: yearGroup,
          house,
        })
        .eq('id', authData.user.id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
      }
    }

    return { data: authData, error: null };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    user,
    profile,
    loading,
    isReady,
    signIn,
    signUp,
    signOut,
  };
}