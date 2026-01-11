import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ThumbsUp, MessagesSquare, UserPlus, AtSign, Share2, UserCheck, ArrowLeft, Briefcase, FileText, CheckCircle } from 'lucide-react-native';
import {
  getNotifications,
  getNotificationsByType,
  markNotificationRead,
  markAllNotificationsRead,
  subscribeToNotifications,
  getNotificationMessage,
  getTimeAgo,
  Notification,
  NotificationType
} from '@/lib/notifications';
import { supabase, JobApplicationNotification, getDisplayName } from '@/lib/supabase';

type TabType = 'all' | 'likes' | 'comments' | 'follows' | 'jobs';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [jobNotifications, setJobNotifications] = useState<JobApplicationNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [userId, setUserId] = useState<string | null>(null);

  // Get current user ID
  useEffect(() => {
    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUserId();
  }, []);

  // Load notifications
  const loadNotifications = useCallback(async () => {
    try {
      if (activeTab === 'jobs') {
        // Load job application notifications
        const { data: jobData, error: jobError } = await supabase
          .from('job_application_notifications')
          .select(`
            *,
            application:application_id (
              id,
              job_id,
              full_name,
              status,
              job:job_id (
                id,
                title,
                company
              )
            )
          `)
          .eq('recipient_id', userId)
          .order('created_at', { ascending: false });
        
        if (jobError) throw jobError;
        setJobNotifications(jobData || []);
        setNotifications([]);
      } else {
        // Load social notifications
        let data: Notification[];
        
        if (activeTab === 'all') {
          data = await getNotifications();
        } else {
          const typeMap: Record<TabType, NotificationType | NotificationType[]> = {
            all: [] as NotificationType[],
            likes: 'like',
            comments: 'comment',
            follows: ['follow', 'friend_request', 'friend_accept'] as NotificationType[],
            jobs: [] as NotificationType[]
          };
          
          const type = typeMap[activeTab];
          if (Array.isArray(type)) {
            // For follows tab, get multiple types
            const results = await Promise.all(
              type.map(t => getNotificationsByType(t))
            );
            data = results.flat().sort((a, b) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
          } else {
            data = await getNotificationsByType(type);
          }
        }
        
        setNotifications(data);
        setJobNotifications([]);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, userId]);

  // Initial load and refresh on focus
  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = subscribeToNotifications(userId, (newNotification) => {
      if (activeTab !== 'jobs') {
        setNotifications(prev => [newNotification, ...prev]);
      }
    });

    // Subscribe to job application notifications
    const jobChannel = supabase
      .channel('job_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'job_application_notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          if (activeTab === 'jobs') {
            setJobNotifications(prev => [payload.new as JobApplicationNotification, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      unsubscribe();
      supabase.removeChannel(jobChannel);
    };
  }, [userId, activeTab]);

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  // Handle notification press
  const handleNotificationPress = async (notification: Notification) => {
    try {
      // Mark as read
      if (!notification.is_read) {
        await markNotificationRead(notification.id);
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
        );
      }

      // Navigate based on type
      if (notification.type === 'friend_request' || notification.type === 'friend_accept' || notification.type === 'follow') {
        debouncedRouter.push(`/user-profile/${notification.actor_id}`);
      } else if (notification.post_id) {
        debouncedRouter.push(`/post/${notification.post_id}`);
      }
    } catch (error) {
      console.error('Error handling notification:', error);
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );
    } catch (error) {
      console.error('Error marking all read:', error);
      Alert.alert('Error', 'Failed to mark notifications as read');
    }
  };

  // Get notification icon
  const getNotificationIcon = (type: NotificationType) => {
    const iconProps = { size: 20, strokeWidth: 2 };
    switch (type) {
      case 'like':
        return <ThumbsUp {...iconProps} color="#ffc857" fill="#ffc857" />;
      case 'comment':
        return <MessagesSquare {...iconProps} color="#0F172A" />;
      case 'follow':
        return <UserPlus {...iconProps} color="#34C759" />;
      case 'mention':
        return <AtSign {...iconProps} color="#FF9500" />;
      case 'post':
        return <Share2 {...iconProps} color="#5856D6" />;
      case 'friend_request':
        return <UserPlus {...iconProps} color="#34C759" />;
      case 'friend_accept':
        return <UserCheck {...iconProps} color="#34C759" />;
      default:
        return <ThumbsUp {...iconProps} color="#8E8E93" />;
    }
  };

  // Render job notification item
  const renderJobNotification = ({ item }: { item: JobApplicationNotification }) => {
    const application = (item as any).application;
    const job = application?.job;
    
    const handlePress = async () => {
      try {
        // Mark as read
        if (!item.is_read) {
          await supabase
            .from('job_application_notifications')
            .update({ is_read: true })
            .eq('id', item.id);
          
          setJobNotifications(prev =>
            prev.map(n => n.id === item.id ? { ...n, is_read: true } : n)
          );
        }

        // Navigate based on notification type
        if (item.notification_type === 'new_application' && application?.job_id) {
          debouncedRouter.push(`/job-applications-review/${application.job_id}`);
        } else if (item.notification_type === 'status_changed' && application?.job_id) {
          debouncedRouter.push(`/job-detail/${application.job_id}`);
        }
      } catch (error) {
        console.error('Error handling job notification:', error);
      }
    };

    const getIcon = () => {
      if (item.notification_type === 'new_application') {
        return <FileText size={20} color="#0F172A" strokeWidth={2} />;
      }
      return <CheckCircle size={20} color="#10B981" strokeWidth={2} />;
    };

    return (
      <TouchableOpacity
        style={[styles.notificationItem, !item.is_read && styles.unreadItem]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <View style={[styles.avatarPlaceholder, { backgroundColor: '#EBF0FF' }]}>
            <Briefcase size={24} color="#0F172A" />
          </View>
          <View style={styles.iconBadge}>
            {getIcon()}
          </View>
        </View>

        <View style={styles.notificationContent}>
          <Text style={styles.notificationText}>{item.title}</Text>
          <Text style={[styles.timeText, { marginTop: 2 }]}>{item.message}</Text>
          {job && (
            <Text style={[styles.timeText, { marginTop: 4, color: '#0F172A' }]}>
              {job.title} at {job.company}
            </Text>
          )}
          <Text style={styles.timeText}>{getTimeAgo(item.created_at)}</Text>
        </View>

        {!item.is_read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  // Render notification item
  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.is_read && styles.unreadItem]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        {item.actor?.avatar_url ? (
          <Image source={{ uri: item.actor.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder} />
        )}
        <View style={styles.iconBadge}>
          {getNotificationIcon(item.type)}
        </View>
      </View>

      <View style={styles.notificationContent}>
        <Text style={styles.notificationText}>
          {getNotificationMessage(item)}
        </Text>
        <Text style={styles.timeText}>{getTimeAgo(item.created_at)}</Text>
      </View>

      {!item.is_read && <View style={styles.unreadDot} />}

      {item.post?.image_url && (
        <Image source={{ uri: item.post.image_url }} style={styles.postThumbnail} />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={handleMarkAllRead}>
          <Text style={styles.markAllText}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
            All
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'likes' && styles.activeTab]}
          onPress={() => setActiveTab('likes')}
        >
          <Text style={[styles.tabText, activeTab === 'likes' && styles.activeTabText]}>
            Likes
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'comments' && styles.activeTab]}
          onPress={() => setActiveTab('comments')}
        >
          <Text style={[styles.tabText, activeTab === 'comments' && styles.activeTabText]}>
            Comments
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'follows' && styles.activeTab]}
          onPress={() => setActiveTab('follows')}
        >
          <Text style={[styles.tabText, activeTab === 'follows' && styles.activeTabText]}>
            Follows
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'jobs' && styles.activeTab]}
          onPress={() => setActiveTab('jobs')}
        >
          <Text style={[styles.tabText, activeTab === 'jobs' && styles.activeTabText]}>
            Jobs
          </Text>
        </Pressable>
      </View>

      {/* Notifications List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : activeTab === 'jobs' ? (
        jobNotifications.length === 0 ? (
          <View style={styles.centerContainer}>
            <Briefcase size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>No job notifications</Text>
            <Text style={styles.emptySubtext}>
              You'll receive notifications about job applications here
            </Text>
          </View>
        ) : (
          <FlatList
            data={jobNotifications}
            renderItem={renderJobNotification}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )
      ) : notifications.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No notifications yet</Text>
          <Text style={styles.emptySubtext}>
            We'll notify you when someone likes or comments on your posts
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  markAllText: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#000',
  },
  tabText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#000',
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  listContent: {
    paddingVertical: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  unreadItem: {
    backgroundColor: '#f8f9fa',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  notificationContent: {
    flex: 1,
    marginRight: 12,
  },
  notificationText: {
    fontSize: 14,
    color: '#000',
    marginBottom: 4,
    lineHeight: 18,
  },
  timeText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    marginRight: 12,
  },
  postThumbnail: {
    width: 44,
    height: 44,
    borderRadius: 4,
  },
});
