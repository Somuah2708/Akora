import 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto';

// Fix for network requests in web environment
if (typeof window !== 'undefined') {
  global.fetch = window.fetch;
  global.WebSocket = window.WebSocket;
}

import { useEffect, useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useAuth } from '@/hooks/useAuth';
import { ToastProvider } from '@/components/Toast';
import { VideoSettingsProvider } from '@/contexts/VideoSettingsContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { AppLayout } from '@/components/AppLayout';
import { registerForPushNotificationsAsync } from '@/lib/pushNotifications';
import { supabase } from '@/lib/supabase';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Sentry from '@sentry/react-native';
import ErrorBoundary from '@/lib/errorBoundary';
import { setupGlobalErrorHandlers } from '@/lib/globalErrorHandler';

Sentry.init({
  dsn: 'https://300dd3fe7142a2a34ca08cf77ce39769@o4510042293731328.ingest.de.sentry.io/4510459892531280',

  // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
  tracesSampleRate: 1.0, // Always 100% to catch everything
  
  // Enable native crash reporting (CRITICAL for iOS/Android crashes)
  enableNative: true,
  enableNativeCrashHandling: true,
  enableNativeNagger: true,
  
  // Enable auto session tracking
  enableAutoSessionTracking: true,
  
  // Add environment
  environment: __DEV__ ? 'development' : 'production',
  
  // ALWAYS enable debug mode to see what's being sent
  debug: true, // Force TRUE to see Sentry logs in terminal
  
  // Attach stack traces to errors
  attachStacktrace: true,

  // Adds more context data to events (IP address, cookies, user, etc.)
  sendDefaultPii: true,

  // Attach screenshots on errors (CRITICAL for UI bugs)
  attachScreenshot: true,
  
  // Attach view hierarchy (CRITICAL for understanding UI state)
  attachViewHierarchy: true,

  // Enable Logs
  enableLogs: true,

  // Configure Session Replay (100% capture in dev)
  replaysSessionSampleRate: __DEV__ ? 1.0 : 0.1, // 100% in dev, 10% in prod
  replaysOnErrorSampleRate: 1.0, // Always capture on error
  
  // Maximum breadcrumbs to keep
  maxBreadcrumbs: 100,
  
  // beforeSend hook to log EVERY event before sending
  beforeSend(event, hint) {
    console.log('🚨 [SENTRY] About to send event:', {
      type: event.type,
      level: event.level,
      message: event.message,
      exception: event.exception?.values?.[0]?.type,
      timestamp: new Date().toISOString()
    });
    
    // Log the full error details
    if (hint?.originalException) {
      console.log('🚨 [SENTRY] Original exception:', hint.originalException);
    }
    
    // Always send the event
    return event;
  },
  
  // beforeBreadcrumb hook to log EVERY breadcrumb
  beforeBreadcrumb(breadcrumb) {
    console.log('🍞 [SENTRY] Breadcrumb:', breadcrumb);
    return breadcrumb;
  },
  
  integrations: [
    Sentry.mobileReplayIntegration({
      maskAllText: false,
      maskAllImages: false,
      maskAllVectors: false,
    }),
    Sentry.feedbackIntegration(),
  ],
});

console.log('✅ [SENTRY] Initialized successfully');

// Setup global error handlers to catch ALL errors
setupGlobalErrorHandlers();

export default Sentry.wrap(function RootLayout() {
  useFrameworkReady();
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navigationTimeoutRef = useRef<any>();
  const previousUserRef = useRef(user);

  // Register push notifications when user logs in
  useEffect(() => {
    console.log('🔐 Push token registration effect triggered. User:', user?.id, 'Loading:', loading);
    
    // Set Sentry user context
    if (user) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
      });
    } else {
      Sentry.setUser(null);
    }
    
    // Wait for auth to finish loading AND user to exist
    if (loading) {
      console.log('⏳ Auth still loading, waiting...');
      return;
    }
    
    if (!user) {
      console.log('⚠️ No user found, skipping push token registration');
      return;
    }

    console.log('👤 User found, attempting to register push token...');

    const registerPushToken = async () => {
      try {
        console.log('📲 Calling registerForPushNotificationsAsync...');
        const token = await registerForPushNotificationsAsync();
        
        if (!token) {
          console.warn('⚠️ No push token received from registerForPushNotificationsAsync');
          return;
        }
        
        console.log('📱 Got push token:', token);
        
        // Insert directly into the table (RLS policies allow this)
        const { data, error } = await supabase
          .from('push_notification_tokens')
          .upsert({
            user_id: user.id,
            token: token,
            device_type: Platform.OS === 'ios' ? 'ios' : 'android',
            is_active: true,
            updated_at: new Date().toISOString(),
            last_used_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,token'
          })
          .select();

        console.log('💾 Database upsert result:', { data, error });

        if (error) {
          console.error('❌ Error saving push token:', error);
        } else {
          console.log('✅ Push token registered successfully in database');
          console.log('📊 Inserted/Updated data:', data);
        }
      } catch (error) {
        console.error('❌ Error registering push notifications:', error);
      }
    };

    registerPushToken();
  }, [user, loading]);

  // Handle notification taps
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('📱 Notification tapped:', response);
      
      const data = response.notification.request.content.data;
      console.log('📱 Notification data:', data);
      
      // Navigate based on notification type
      if (data?.type === 'new_message' && data?.chatId) {
        console.log('📱 Navigating to chat:', data.chatId);
        router.push(`/chat/direct/${data.chatId}`);
      } else if (data?.type === 'new_group_message' && data?.chatId) {
        console.log('📱 Navigating to group chat:', data.chatId);
        router.push(`/chat/group/${data.chatId}`);
      } else if (data?.type === 'friend_request') {
        console.log('📱 Navigating to friends screen');
        router.push('/(tabs)/friends');
      }
    });

    return () => subscription.remove();
  }, [router]);

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
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <ToastProvider>
            <VideoSettingsProvider>
              <NotificationProvider>
                <ErrorBoundary>
                  <AppLayout>
                    <Stack screenOptions={{ headerShown: false }}>
                      <Stack.Screen name="(tabs)" />
                      <Stack.Screen name="auth" />
                      {/* Ensure non-tab stacks (e.g., chat, user-profile, etc.) also have no header */}
                      <Stack.Screen name="chat" />
                      <Stack.Screen name="+not-found" options={{ headerShown: true }} />
                    </Stack>
                    <StatusBar style="light" />
                  </AppLayout>
                </ErrorBoundary>
              </NotificationProvider>
            </VideoSettingsProvider>
          </ToastProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
});