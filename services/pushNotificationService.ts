import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import Constants from 'expo-constants';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type NotificationType =
  | 'request_accepted'
  | 'request_declined'
  | 'session_scheduled'
  | 'session_reminder'
  | 'new_message'
  | 'mentor_recommendation'
  | 'new_request'
  | 'request_cancelled'
  | 'session_cancelled'
  | 'mentee_message'
  | 'rating_received';

export interface NotificationData {
  type: NotificationType;
  requestId?: string;
  sessionId?: string;
  messageId?: string;
  mentorId?: string;
  menteeId?: string;
  [key: string]: any;
}

class PushNotificationService {
  private expoPushToken: string | null = null;
  private notificationListener: any = null;
  private responseListener: any = null;

  /**
   * Register device for push notifications
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        console.log('Push notifications only work on physical devices');
        return null;
      }

      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permissions if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push notification permissions');
        return null;
      }

      // Get Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });

      this.expoPushToken = tokenData.data;

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#007AFF',
        });

        // Create channels for different notification types
        await Notifications.setNotificationChannelAsync('messages', {
          name: 'Messages',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          sound: 'default',
        });

        await Notifications.setNotificationChannelAsync('requests', {
          name: 'Requests',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          sound: 'default',
        });

        await Notifications.setNotificationChannelAsync('sessions', {
          name: 'Sessions',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 500, 250, 500],
          sound: 'default',
        });
      }

      // Save token to database
      await this.savePushToken(this.expoPushToken);

      return this.expoPushToken;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Save push token to Supabase
   */
  async savePushToken(token: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const deviceType = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';

      const { error } = await supabase.rpc('register_push_token', {
        p_user_id: user.id,
        p_token: token,
        p_device_type: deviceType,
      });

      if (error) throw error;
      console.log('Push token saved successfully');
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  }

  /**
   * Remove push token from database
   */
  async removePushToken(): Promise<void> {
    try {
      if (!this.expoPushToken) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('push_notification_tokens')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('token', this.expoPushToken);

      if (error) throw error;
      console.log('Push token removed successfully');
    } catch (error) {
      console.error('Error removing push token:', error);
    }
  }

  /**
   * Set up notification listeners
   */
  setupNotificationListeners(
    onNotificationReceived: (notification: Notifications.Notification) => void,
    onNotificationResponse: (response: Notifications.NotificationResponse) => void
  ): void {
    // Listener for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
        onNotificationReceived(notification);
        
        // Log to database
        this.logNotificationReceived(notification);
      }
    );

    // Listener for when user taps on notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification tapped:', response);
        onNotificationResponse(response);
        
        // Log to database
        this.logNotificationClicked(response);
      }
    );
  }

  /**
   * Remove notification listeners
   */
  removeNotificationListeners(): void {
    if (this.notificationListener) {
      this.notificationListener.remove();
    }
    if (this.responseListener) {
      this.responseListener.remove();
    }
  }

  /**
   * Schedule a local notification
   */
  async scheduleLocalNotification(
    title: string,
    body: string,
    data: NotificationData,
    trigger?: Notifications.NotificationTriggerInput
  ): Promise<string> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: trigger || null, // null = immediate
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      throw error;
    }
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Get badge count
   */
  async getBadgeCount(): Promise<number> {
    const count = await Notifications.getBadgeCountAsync();
    return count;
  }

  /**
   * Set badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  /**
   * Get unread notification count from database
   */
  async getUnreadCount(): Promise<number> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { data, error } = await supabase.rpc('get_unread_notification_count', {
        p_user_id: user.id,
      });

      if (error) throw error;
      return data || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Mark notification as read in database
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('mark_notification_read', {
        p_notification_id: notificationId,
      });

      if (error) throw error;

      // Update badge count
      const unreadCount = await this.getUnreadCount();
      await this.setBadgeCount(unreadCount);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  /**
   * Log notification received
   */
  private async logNotificationReceived(
    notification: Notifications.Notification
  ): Promise<void> {
    try {
      const data = notification.request.content.data as NotificationData;
      
      await supabase.rpc('log_notification', {
        p_user_id: (await supabase.auth.getUser()).data.user?.id,
        p_notification_type: data.type,
        p_title: notification.request.content.title || '',
        p_body: notification.request.content.body || '',
        p_data: data,
        p_delivery_status: 'delivered',
      });
    } catch (error) {
      console.error('Error logging notification:', error);
    }
  }

  /**
   * Log notification clicked
   */
  private async logNotificationClicked(
    response: Notifications.NotificationResponse
  ): Promise<void> {
    try {
      const data = response.notification.request.content.data as NotificationData;
      
      // This would need the notification ID from the database
      // For now, we'll just log it locally
      console.log('Notification clicked:', data);
    } catch (error) {
      console.error('Error logging notification click:', error);
    }
  }

  /**
   * Get notification channel for type
   */
  private getChannelForType(type: NotificationType): string {
    if (type.includes('message')) return 'messages';
    if (type.includes('request')) return 'requests';
    if (type.includes('session')) return 'sessions';
    return 'default';
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService();
