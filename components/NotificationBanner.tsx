import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Image, Platform } from 'react-native';
import { router } from 'expo-router';
import { Heart, MessageCircle, UserPlus, AtSign, Share2, UserCheck } from 'lucide-react-native';
// import { Audio } from 'expo-av'; // Uncomment when adding notification sound
import * as Haptics from 'expo-haptics';
import { Notification, NotificationType } from '@/lib/notifications';

interface NotificationBannerProps {
  notification: Notification | null;
  onDismiss: () => void;
}

export default function NotificationBanner({ notification, onDismiss }: NotificationBannerProps) {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  // const soundRef = useRef<Audio.Sound | null>(null); // Uncomment when adding sound

  useEffect(() => {
    if (notification) {
      // Play sound and haptic feedback
      playNotificationSound();
      triggerHaptic();
      
      // Slide in animation
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 8,
      }).start();

      // Auto dismiss after 4 seconds
      const timer = setTimeout(() => {
        dismissBanner();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [notification]);

  const playNotificationSound = async () => {
    // Note: To add custom notification sound, place an MP3 file at: assets/notification.mp3
    // For now, we just use haptic feedback as it's more reliable across platforms
    // Uncomment below to enable sound when you add the MP3 file
    
    /*
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const { sound } = await Audio.Sound.createAsync(
        require('../assets/notification.mp3'),
        { shouldPlay: true, volume: 0.6 }
      );
      soundRef.current = sound;
    } catch (error) {
      console.log('Notification sound not available, using haptic only');
    }
    */
  };

  const triggerHaptic = () => {
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const dismissBanner = () => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onDismiss();
      // Cleanup sound if enabled
      // if (soundRef.current) soundRef.current.unloadAsync();
    });
  };

  const handlePress = () => {
    dismissBanner();
    
    // Navigate based on notification type
    if (notification) {
      if (notification.type === 'friend_request' || notification.type === 'friend_accept' || notification.type === 'follow') {
        router.push(`/user-profile/${notification.actor_id}`);
      } else if (notification.post_id) {
        router.push(`/post/${notification.post_id}`);
      }
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    const iconProps = { size: 18, strokeWidth: 2.5, color: '#fff' };
    switch (type) {
      case 'like':
        return <Heart {...iconProps} fill="#fff" />;
      case 'comment':
        return <MessageCircle {...iconProps} />;
      case 'follow':
        return <UserPlus {...iconProps} />;
      case 'mention':
        return <AtSign {...iconProps} />;
      case 'post':
        return <Share2 {...iconProps} />;
      case 'friend_request':
        return <UserPlus {...iconProps} />;
      case 'friend_accept':
        return <UserCheck {...iconProps} />;
      default:
        return <Heart {...iconProps} />;
    }
  };

  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case 'like':
        return '#FF3B30';
      case 'comment':
        return '#007AFF';
      case 'follow':
      case 'friend_request':
      case 'friend_accept':
        return '#34C759';
      case 'mention':
        return '#FF9500';
      case 'post':
        return '#5856D6';
      default:
        return '#8E8E93';
    }
  };

  const getMessage = () => {
    if (!notification) return '';
    
    const actorName = notification.actor?.full_name || notification.actor?.username || 'Someone';
    
    switch (notification.type) {
      case 'like':
        return `${actorName} liked your post`;
      case 'comment':
        return notification.content 
          ? `${actorName}: ${notification.content}`
          : `${actorName} commented on your post`;
      case 'follow':
        return `${actorName} started following you`;
      case 'mention':
        return `${actorName} mentioned you`;
      case 'post':
        return `${actorName} shared a post`;
      case 'friend_request':
        return `${actorName} sent you a friend request`;
      case 'friend_accept':
        return `${actorName} accepted your friend request`;
      default:
        return `${actorName} interacted with you`;
    }
  };

  if (!notification) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.banner}
        onPress={handlePress}
        activeOpacity={0.95}
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {notification.actor?.avatar_url ? (
            <Image
              source={{ uri: notification.actor.avatar_url }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder} />
          )}
          <View style={[styles.iconBadge, { backgroundColor: getNotificationColor(notification.type) }]}>
            {getNotificationIcon(notification.type)}
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.appName}>Akora</Text>
          <Text style={styles.message} numberOfLines={2}>
            {getMessage()}
          </Text>
        </View>

        {/* Thumbnail */}
        {notification.post?.image_url && (
          <Image
            source={{ uri: notification.post.image_url }}
            style={styles.thumbnail}
          />
        )}

        {/* Dismiss button */}
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={dismissBanner}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.dismissText}>✕</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingTop: Platform.OS === 'ios' ? 50 : 10,
    paddingHorizontal: 12,
  },
  banner: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#2C2C2E',
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3A3A3C',
    borderWidth: 2,
    borderColor: '#2C2C2E',
  },
  iconBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1C1C1E',
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  appName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  message: {
    fontSize: 14,
    color: '#E5E5EA',
    lineHeight: 18,
  },
  thumbnail: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginRight: 8,
  },
  dismissButton: {
    padding: 4,
  },
  dismissText: {
    fontSize: 18,
    color: '#8E8E93',
    fontWeight: '300',
  },
});
