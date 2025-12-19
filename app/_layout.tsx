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
import { debouncedRouter } from '@/utils/navigationDebounce';
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
import ErrorBoundary from '@/lib/errorBoundary';
import { setupGlobalErrorHandlers } from '@/lib/globalErrorHandler';

// Setup global error handlers to catch ALL errors
setupGlobalErrorHandlers();

function RootLayout() {
  useFrameworkReady();
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navigationTimeoutRef = useRef<any>();
  const previousUserRef = useRef(user);

  // Register push notifications when user logs in
  useEffect(() => {
    console.log('🔐 Push token registration effect triggered. User:', user?.id, 'Loading:', loading);
    
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
        debouncedRouter.push(`/chat/direct/${data.chatId}`);
      } else if (data?.type === 'new_group_message' && data?.chatId) {
        console.log('📱 Navigating to group chat:', data.chatId);
        debouncedRouter.push(`/chat/group/${data.chatId}`);
      } else if (data?.type === 'friend_request') {
        console.log('📱 Navigating to friends screen');
        debouncedRouter.push('/(tabs)/friends');
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
        debouncedRouter.replace('/auth/sign-in');
      }, 100);
    } else if (user && inAuthGroup) {
      console.log('[RootLayout] User exists and in auth group, scheduling redirect to tabs');
      // Slight delay to ensure state is stable
      navigationTimeoutRef.current = setTimeout(() => {
        debouncedRouter.replace('/(tabs)');
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
}

export default RootLayout;