import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Notification, subscribeToNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead } from '@/lib/notifications';
import { getDisplayName } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import NotificationBanner from '@/components/NotificationBanner';

interface NotificationContextType {
  currentNotification: Notification | null;
  showNotification: (notification: Notification) => void;
  dismissNotification: () => void;
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [currentNotification, setCurrentNotification] = useState<Notification | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  // Configure foreground behavior: show alert, play sound, set badge
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        // iOS presentation options (SDK 51+)
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }, []);

  // Request permissions and set Android channel
  useEffect(() => {
    (async () => {
      const settings = await Notifications.getPermissionsAsync();
      let status = settings.status;
      if (status !== 'granted') {
        const req = await Notifications.requestPermissionsAsync();
        status = req.status;
      }

      if (status !== 'granted') {
        console.warn('Notifications permission not granted');
      }

      // Android: ensure default channel with sound
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'default',
          enableVibrate: true,
          vibrationPattern: [0, 250, 250, 250],
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });
      }
    })();
  }, []);

  // Fetch initial unread count and subscribe to real-time notifications
  useEffect(() => {
    if (!user?.id) return;

    let mounted = true;

    const init = async () => {
      try {
        const count = await getUnreadCount();
        if (mounted) setUnreadCount(count);
      } catch (e) {
        console.error('Error fetching unread count:', e);
      }
    };

    init();

    console.log('🔔 Setting up real-time notification subscriptions for user:', user.id);

    const sendLocal = async (notification: Notification) => {
      try {
        if (Platform.OS === 'web') {
          // Try browser Notification API as a graceful fallback on web
          if (typeof window !== 'undefined' && 'Notification' in window) {
            if (window.Notification.permission === 'default') {
              try { await window.Notification.requestPermission(); } catch {}
            }
            if (window.Notification.permission === 'granted') {
              // Best-effort display; service workers not required for simple notifications
              new window.Notification(
                getDisplayName(notification.actor) || 'New activity',
                {
                  body: notification.content || `You have a new ${notification.type} notification`,
                  // Badge/sound are not standardized in browser notifications
                }
              );
              return;
            }
          }
          // If not supported or not granted, skip silently on web
          return;
        }

        // Native (iOS/Android): use Expo notifications
        await Notifications.scheduleNotificationAsync({
          content: {
            title: getDisplayName(notification.actor) || 'New activity',
            body: notification.content || `You have a new ${notification.type} notification`,
            sound: 'default',
            data: { notificationId: notification.id, type: notification.type, postId: notification.post_id },
          },
          trigger: null, // deliver immediately
        });
      } catch (e) {
        console.error('Error sending local notification:', e);
      }
    };

    const unsubscribe = subscribeToNotifications(user.id, (notification) => {
      console.log('📨 New notification received:', notification);
      setCurrentNotification(notification);
      // increment unread badge
      setUnreadCount((prev) => prev + 1);

      // Fire a local system notification (cross-platform)
      sendLocal(notification);
    });

    return () => {
      mounted = false;
      console.log('🔕 Cleaning up notification subscriptions');
      unsubscribe();
    };
  }, [user?.id]);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (e) {
      console.error('Error refreshing unread count:', e);
    }
  }, []);

  const _markNotificationRead = useCallback(async (id: string) => {
    try {
      await markNotificationRead(id);
      // decrement unread count locally (safeguard against negatives)
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (e) {
      console.error('Error marking notification read:', e);
      throw e;
    }
  }, []);

  const _markAllRead = useCallback(async () => {
    try {
      await markAllNotificationsRead();
      setUnreadCount(0);
    } catch (e) {
      console.error('Error marking all notifications read:', e);
      throw e;
    }
  }, []);

  const showNotification = (notification: Notification) => {
    setCurrentNotification(notification);
  };

  const dismissNotification = () => {
    setCurrentNotification(null);
  };

  return (
    <NotificationContext.Provider
      value={{
        currentNotification,
        showNotification,
        dismissNotification,
        unreadCount,
        refreshUnreadCount,
        markNotificationRead: _markNotificationRead,
        markAllRead: _markAllRead,
      }}
    >
      {children}
      <NotificationBanner
        notification={currentNotification}
        onDismiss={dismissNotification}
      />
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
