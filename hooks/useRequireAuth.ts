import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

/**
 * Hook that verifies user authentication.
 * Returns authentication status without redirecting.
 */
export function useRequireAuth() {
  const { user, loading } = useAuth();
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      console.log('[useRequireAuth] Checking session...');
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('[useRequireAuth] Session check result:', { 
          hasSession: !!session,
          hasUser: !!session?.user,
          email: session?.user?.email 
        });
        setSessionUser(session?.user || null);
      } catch (error) {
        console.error('[useRequireAuth] Error checking session:', error);
        setSessionUser(null);
      } finally {
        setSessionChecked(true);
      }
    };
    
    checkSession();
  }, []);

  const isChecking = loading || !sessionChecked;
  const isVerified = !!user || !!sessionUser;

  console.log('[useRequireAuth] Status:', { 
    isChecking, 
    isVerified, 
    hasUser: !!user,
    hasSessionUser: !!sessionUser,
    loading,
    sessionChecked
  });

  return { isVerified, isChecking };
}
