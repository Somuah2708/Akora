import { useEffect, useState } from 'react';
import { supabase, type Profile } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthUser extends User {
  is_admin?: boolean;
  free_listings_count?: number;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        setUser(session.user as AuthUser);
        setProfile(profileData);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          setUser(session.user as AuthUser);
          setProfile(profileData);
        } else {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
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
    // TEMPORARILY DISABLED: Alumni validation
    // This allows sign-up without checking alumni_records table
    console.log('Sign up attempt:', { email, username, firstName, surname });
    console.log('Supabase URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
    console.log('Supabase Key exists:', !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            full_name: fullName,
            first_name: firstName,
            surname: surname,
            class: classGroup,
            year_group: yearGroup,
            house: house,
            is_admin: false,
          },
        },
      });
      
      if (error) {
        console.error('Sign up error:', error);
        return { data: null, error };
      } else {
        console.log('Sign up successful:', data?.user?.email);
        return { data, error: null };
      }
    } catch (err: any) {
      console.error('Unexpected sign up error:', err);
      return { 
        data: null, 
        error: { message: err?.message || 'Network error. Please check your internet connection.' } 
      };
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
  };
}