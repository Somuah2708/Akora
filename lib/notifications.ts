import { supabase } from './supabase';

export type NotificationType = 'like' | 'comment' | 'follow' | 'mention' | 'post' | 'friend_request' | 'friend_accept';

export interface Notification {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  type: NotificationType;
  content: string | null;
  post_id: string | null;
  comment_id: string | null;
  is_read: boolean;
  created_at: string;
  // Joined data
  actor?: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
  post?: {
    id: string;
    content: string;
    image_url: string | null;
  };
}

/**
 * Get notifications for current user with actor and post details
 */
export async function getNotifications(limit = 50, offset = 0) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('notifications')
    .select(`
      *,
      actor:profiles!actor_id (
        id,
        username,
        full_name,
        avatar_url
      ),
      post:posts!post_id (
        id,
        content,
        image_url
      )
    `)
    .eq('recipient_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data as Notification[];
}

/**
 * Get notifications by type
 */
export async function getNotificationsByType(type: NotificationType, limit = 50) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('notifications')
    .select(`
      *,
      actor:profiles!actor_id (
        id,
        username,
        full_name,
        avatar_url
      ),
      post:posts!post_id (
        id,
        content,
        image_url
      )
    `)
    .eq('recipient_id', user.id)
    .eq('type', type)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as Notification[];
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data, error } = await supabase
    .rpc('get_unread_notification_count', { p_user_id: user.id });

  if (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
  
  return data || 0;
}

/**
 * Mark a notification as read
 */
export async function markNotificationRead(notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) throw error;
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsRead() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .rpc('mark_all_notifications_read', { p_user_id: user.id });

  if (error) throw error;
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);

  if (error) throw error;
}

/**
 * Subscribe to new notifications with real-time updates
 */
export function subscribeToNotifications(
  userId: string,
  onNotification: (notification: Notification) => void
) {
  console.log('🔔 [LIB] Subscribing to notifications for user:', userId);
  
  const channel = supabase
    .channel(`notifications_${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${userId}`
      },
      async (payload) => {
        console.log('🔔 [LIB] RAW notification payload received:', payload);
        console.log('🔔 [LIB] New notification ID:', payload.new.id);
        
        // Fetch complete notification with actor details
        const { data, error } = await supabase
          .from('notifications')
          .select(`
            *,
            actor:profiles!actor_id (
              id,
              username,
              full_name,
              avatar_url
            ),
            post:posts!post_id (
              id,
              content,
              image_url
            )
          `)
          .eq('id', payload.new.id)
          .single();

        if (error) {
          console.error('🔔 [LIB] Error fetching notification details:', error);
          return;
        }

        if (data) {
          console.log('🔔 [LIB] Full notification data fetched:', data);
          onNotification(data as Notification);
        } else {
          console.warn('🔔 [LIB] No notification data returned');
        }
      }
    )
    .subscribe((status) => {
      console.log('🔔 [LIB] Subscription status:', status);
      if (status === 'SUBSCRIBED') {
        console.log('✅ [LIB] Successfully subscribed to real-time notifications!');
      }
    });

  return () => {
    console.log('🔔 [LIB] Unsubscribing from notifications');
    supabase.removeChannel(channel);
  };
}

/**
 * Get notification message text
 */
export function getNotificationMessage(notification: Notification): string {
  const actorName = notification.actor?.full_name || notification.actor?.username || 'Someone';
  
  switch (notification.type) {
    case 'like':
      return `${actorName} liked your post`;
    case 'comment':
      return notification.content 
        ? `${actorName} commented: ${notification.content}`
        : `${actorName} commented on your post`;
    case 'follow':
      return `${actorName} started following you`;
    case 'mention':
      return `${actorName} mentioned you in a post`;
    case 'post':
      return `${actorName} shared a new post`;
    case 'friend_request':
      return `${actorName} sent you a friend request`;
    case 'friend_accept':
      return `${actorName} accepted your friend request`;
    default:
      return `${actorName} interacted with your content`;
  }
}

/**
 * Get time ago string
 */
export function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w`;
  return date.toLocaleDateString();
}
