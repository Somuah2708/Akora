import 'react-native-url-polyfill/auto';

// Fix for network requests in web environment
if (typeof window !== 'undefined') {
  global.fetch = window.fetch;
  global.WebSocket = window.WebSocket;
}

import { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useAuth } from '@/hooks/useAuth';

export default function RootLayout() {
  useFrameworkReady();
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navigationTimeoutRef = useRef<any>();
  const previousUserRef = useRef(user);

  useEffect(() => {
    // Only log when user state actually changes
    if (previousUserRef.current !== user) {
      console.log('[RootLayout] User state changed:', { 
        previous: !!previousUserRef.current,
        current: !!user, 
        userId: user?.id, 
      });
      previousUserRef.current = user;
    }
    
    console.log('[RootLayout] Navigation check:', { 
      user: !!user, 
      loading, 
      segments: segments.join('/'),
      inAuthGroup: segments[0] === 'auth'
    });
    
    // Clear any pending navigation
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }
    
    if (loading) {
      console.log('[RootLayout] Still loading auth state, skipping navigation...');
      return;
    }

    const inAuthGroup = segments[0] === 'auth';
    
    // Routes that require authentication but shouldn't trigger redirects
    const protectedRoutes = ['create-job-listing', 'create-post', 'create-listing', 'create-event', 'create-educational-listing', 'education'];
    const isProtectedRoute = protectedRoutes.includes(segments[0] || '');

    console.log('[RootLayout] Route check:', { 
      segment0: segments[0], 
      isProtectedRoute,
      shouldSkipRedirect: isProtectedRoute || inAuthGroup
    });

    if (!user && !inAuthGroup && !isProtectedRoute) {
      console.log('[RootLayout] No user and not in auth/protected group, scheduling redirect to sign-in');
      // Slight delay to ensure state is stable
      navigationTimeoutRef.current = setTimeout(() => {
        router.replace('/auth/sign-in');
      }, 100);
    } else if (user && inAuthGroup) {
      console.log('[RootLayout] User exists and in auth group, scheduling redirect to tabs');
      // Slight delay to ensure state is stable
      navigationTimeoutRef.current = setTimeout(() => {
        router.replace('/(tabs)');
      }, 100);
    } else {
      console.log('[RootLayout] User state is stable, no redirect needed', {
        user: !!user,
        inAuthGroup,
        isProtectedRoute
      });
    }

    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, [user, loading, segments]);

  if (loading) {
    return null; // Or show a loading screen
  }
  
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" />
        {/* Ensure non-tab stacks (e.g., chat, user-profile, etc.) also have no header */}
        <Stack.Screen name="chat" />
        <Stack.Screen name="+not-found" options={{ headerShown: true }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}