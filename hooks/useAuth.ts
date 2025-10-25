import { useEffect, useState } from 'react';
import { supabase, type Profile } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthUser extends User {
  is_admin?: boolean;
  free_listings_count?: number;
}

export function useAuth() {
  // Mock user for development - bypassing authentication
  const [user, setUser] = useState<AuthUser | null>({
    id: 'mock-user-id',
    email: 'demo@example.com',
    is_admin: false,
    free_listings_count: 3,
    aud: 'authenticated',
    role: 'authenticated',
    created_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: {},
  } as AuthUser);
  const [loading, setLoading] = useState(false);

  // Commented out for bypassing authentication
  /*
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('is_admin, free_listings_count')
          .eq('id', session.user.id)
          .limit(1);
        
        setUser({
          ...session.user,
          is_admin: profileData?.[0]?.is_admin || false,
          free_listings_count: profileData?.[0]?.free_listings_count || 3
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('is_admin, free_listings_count')
            .eq('id', session.user.id)
            .limit(1);
          
          setUser({
            ...session.user,
            is_admin: profileData?.[0]?.is_admin || false,
            free_listings_count: profileData?.[0]?.free_listings_count || 3
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);
  */


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
    // First, check if the alumni record exists and is not already registered
    if (firstName && surname && classGroup && yearGroup && house) {
      const { data: alumniRecords, error: alumniError } = await supabase
        .from('alumni_records')
        .select('*')
        .eq('first_name', firstName)
        .eq('surname', surname)
        .eq('class', classGroup)
        .eq('year_group', yearGroup)
        .eq('house', house)
        .eq('is_registered', false);
      
      if (alumniError) {
        return { data: null, error: alumniError };
      }
      
      if (!alumniRecords || alumniRecords.length === 0) {
        return { 
          data: null, 
          error: { message: 'Alumni record not found or already registered. Please check your details or contact support.' } 
        };
      }
    }
    
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
    
    // If signup was successful and we have alumni details, update the alumni record
    if (!error && data?.user && firstName && surname && classGroup && yearGroup && house) {
      await supabase
        .from('alumni_records')
        .update({ is_registered: true, email: email })
        .eq('first_name', firstName)
        .eq('surname', surname)
        .eq('class', classGroup)
        .eq('year_group', yearGroup)
        .eq('house', house);
    }
    
    // Create profile for the new user
    if (!error && data?.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          username,
          full_name: fullName,
          class: classGroup,
          year_group: yearGroup,
          house: house,
          is_admin: false,
          free_listings_count: 3
        });
      
      if (profileError) {
        console.error('Error creating profile:', profileError);
      }
    }
    
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  };
}