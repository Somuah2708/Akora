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
        // Check if it's a "not found" error (PGRST116)
        if (error.code === 'PGRST116') {
          console.log('[useAuth] Profile not found for user, may need to be created');
        } else {
          console.error('[useAuth] Error fetching profile:', {
            code: error.code || 'NO_CODE',
            message: error.message || 'NO_MESSAGE',
            details: error.details || 'NO_DETAILS',
            hint: error.hint || 'NO_HINT',
          });
        }
        // Don't throw - user can still be authenticated without profile
        // Profile might not exist yet for new users
      } else if (data) {
        console.log('[useAuth] Profile fetched successfully');
        console.log('[useAuth] Profile data:', {
          id: data.id,
          username: data.username,
          email: data.email,
          is_admin: data.is_admin,
          role: data.role,
        });
        setProfile(data);
      }
    } catch (error) {
      console.error('[useAuth] Exception in fetchProfile:', error);
    } finally {
      setLoading(false);
      setIsReady(true);
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log('[useAuth] signIn called for:', email);

    // Lightweight probe to capture what the auth endpoint returns (helps debug HTML/errors)
    try {
      const base = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
      if (base) {
        const healthUrl = `${base}/auth/v1/health`;
        try {
          console.log('[useAuth] Probing Supabase health endpoint:', healthUrl);
          const probeRes = await fetch(healthUrl, { method: 'GET' });
          const contentType = probeRes.headers.get('content-type') || 'unknown';
          const probeText = await probeRes.text();
          console.log('[useAuth] Health probe status:', probeRes.status, 'content-type:', contentType);
          console.log('[useAuth] Health probe body (first 300 chars):', probeText.slice(0, 300));
        } catch (probeErr) {
          console.warn('[useAuth] Health probe failed:', probeErr);
        }
      }
    } catch (e) {
      console.warn('[useAuth] Unexpected error during health probe:', e);
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (data?.session) {
        console.log('[useAuth] Sign in successful, session created:', {
          userId: data.user?.id,
          expiresAt: data.session.expires_at,
        });
      } else {
        // When the auth library returns a network/parse error it may set `error` or throw; log both cases
        console.log('[useAuth] Sign in failed or no session. supabase error object:', error);
      }

      return { data, error };
    } catch (err: any) {
      // This catches thrown errors from the auth client (e.g., JSON parse errors)
      console.error('[useAuth] signIn exception thrown by supabase.auth:', err);
      // Surface the raw message to the caller in a structured way
      const wrappedError = {
        message: err?.message || String(err),
        name: err?.name || 'AuthException',
      } as any;
      return { data: null, error: wrappedError };
    }
  };

  const signUp = async (
    email: string, 
    password: string, 
    username: string, 
    fullName: string,
    firstName?: string,
    surname?: string,
    otherNames?: string,
    classGroup?: string,
    yearGroup?: string,
    house?: string,
    occupationStatus?: string,
    jobTitle?: string,
    companyName?: string,
    institutionName?: string,
    programOfStudy?: string,
    graduationYear?: string,
    currentStudyYear?: string,
    location?: string,
    phone?: string,
    bio?: string
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
      const updateData: any = {
        username,
        full_name: fullName,
        first_name: firstName,
        surname,
        other_names: otherNames,
        class: classGroup,
        year_group: yearGroup,
        house,
      };
      
      // Add optional fields only if they have values
      if (occupationStatus) updateData.occupation_status = occupationStatus;
      if (jobTitle) updateData.job_title = jobTitle;
      if (companyName) updateData.company_name = companyName;
      if (institutionName) updateData.institution_name = institutionName;
      if (programOfStudy) updateData.program_of_study = programOfStudy;
      if (graduationYear) updateData.graduation_year = parseInt(graduationYear);
      if (currentStudyYear) updateData.current_study_year = parseInt(currentStudyYear);
      if (location) updateData.location = location;
      if (phone) updateData.phone = phone;
      if (bio) updateData.bio = bio;
      
      const { error: profileError } = await supabase
        .from('profiles')
        .update(updateData)
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