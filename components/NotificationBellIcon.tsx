import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export default function NotificationBellIcon() {
  const router = useRouter();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      
      // Subscribe to real-time updates for job application notifications
      const channel = supabase
        .channel('notification_bell')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'job_application_notifications',
            filter: `recipient_id=eq.${user.id}`,
          },
          () => {
            fetchUnreadCount();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchUnreadCount = async () => {
    try {
      setLoading(true);
      
      // Count unread job application notifications
      const { count: jobNotifCount, error: jobError } = await supabase
        .from('job_application_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user?.id)
        .eq('is_read', false);

      if (jobError) throw jobError;

      // Count unread social notifications
      const { count: socialNotifCount, error: socialError } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user?.id)
        .eq('is_read', false);

      if (socialError && socialError.code !== 'PGRST116') {
        // PGRST116 is "no rows returned", which is fine
        console.error('Social notifications error:', socialError);
      }

      const total = (jobNotifCount || 0) + (socialNotifCount || 0);
      setUnreadCount(total);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePress = () => {
    router.push('/notifications' as any);
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <Bell size={24} color="#000000" />
      {loading ? (
        <View style={styles.loadingBadge}>
          <ActivityIndicator size="small" color="#FFFFFF" />
        </View>
      ) : unreadCount > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    padding: 8,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  loadingBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#4169E1',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
