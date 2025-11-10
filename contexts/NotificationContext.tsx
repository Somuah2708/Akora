import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Notification, subscribeToNotifications } from '@/lib/notifications';
import { useAuth } from '@/hooks/useAuth';
import NotificationBanner from '@/components/NotificationBanner';

interface NotificationContextType {
  currentNotification: Notification | null;
  showNotification: (notification: Notification) => void;
  dismissNotification: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [currentNotification, setCurrentNotification] = useState<Notification | null>(null);
  const { user } = useAuth();

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!user?.id) return;

    console.log('🔔 Setting up real-time notification subscriptions for user:', user.id);

    const unsubscribe = subscribeToNotifications(user.id, (notification) => {
      console.log('📨 New notification received:', notification);
      setCurrentNotification(notification);
    });

    return () => {
      console.log('🔕 Cleaning up notification subscriptions');
      unsubscribe();
    };
  }, [user?.id]);

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
