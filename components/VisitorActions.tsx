import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { MessageCircle, UserPlus, Check, Clock, UserMinus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { checkFriendshipStatus, sendFriendRequest, acceptFriendRequest } from '@/lib/friends';
import { supabase } from '@/lib/supabase';

type Props = {
  userId: string;
  onMessage?: () => void;
  onFollow?: () => void;
  following?: boolean;
  loading?: boolean;
};

export default function VisitorActions({ userId, onMessage, onFollow, following, loading }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [friendshipStatus, setFriendshipStatus] = useState<'none' | 'friends' | 'request_sent' | 'request_received'>('none');
  const [actionLoading, setActionLoading] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);

  useEffect(() => {
    loadFriendshipStatus();
  }, [userId, user]);

  const loadFriendshipStatus = async () => {
    if (!user) return;
    
    try {
      const status = await checkFriendshipStatus(user.id, userId);
      setFriendshipStatus(status);
      
      // If request received, get the request ID for accepting
      if (status === 'request_received') {
        const { data } = await supabase
          .from('friend_requests')
          .select('id')
          .eq('sender_id', userId)
          .eq('receiver_id', user.id)
          .eq('status', 'pending')
          .single();
        
        if (data) setRequestId(data.id);
      }
    } catch (error) {
      console.error('Error checking friendship status:', error);
    }
  };

  const handleFriendAction = async () => {
    if (!user || actionLoading) return;

    try {
      setActionLoading(true);

      if (friendshipStatus === 'none') {
        // Send friend request
        await sendFriendRequest(userId, user.id);
        Alert.alert('Success', 'Friend request sent!');
        setFriendshipStatus('request_sent');
      } else if (friendshipStatus === 'request_received' && requestId) {
        // Accept friend request
        await acceptFriendRequest(requestId);
        Alert.alert('Success', 'Friend request accepted!');
        setFriendshipStatus('friends');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to perform action');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMessage = () => {
    // Check if they're friends first
    if (friendshipStatus !== 'friends') {
      Alert.alert(
        'Not Friends Yet',
        'You need to be friends with this person before you can send them a message.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    if (onMessage) {
      onMessage();
    } else {
      // Navigate to direct message
      router.push(`/chat/direct/${userId}` as any);
    }
  };

  const getFriendButtonContent = () => {
    switch (friendshipStatus) {
      case 'friends':
        return {
          icon: Check,
          text: 'Friends',
          color: '#374151',
          disabled: true,
        };
      case 'request_sent':
        return {
          icon: Clock,
          text: 'Pending',
          color: '#374151',
          disabled: true,
        };
      case 'request_received':
        return {
          icon: UserPlus,
          text: 'Accept',
          color: '#374151',
          disabled: false,
        };
      default:
        return {
          icon: UserPlus,
          text: 'Add Friend',
          color: '#374151',
          disabled: false,
        };
    }
  };

  const buttonContent = getFriendButtonContent();
  const ButtonIcon = buttonContent.icon;

  return (
    <View style={styles.row}>
      <TouchableOpacity 
        style={[styles.btn, styles.primary]} 
        onPress={handleMessage} 
        disabled={loading || actionLoading}
      >
        <MessageCircle size={18} color="#FFFFFF" />
        <Text style={styles.primaryText}>Message</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[
          styles.btn, 
          styles.friendButton,
          { backgroundColor: buttonContent.color },
          buttonContent.disabled && styles.disabledButton
        ]} 
        onPress={handleFriendAction}
        disabled={loading || actionLoading || buttonContent.disabled}
      >
        {actionLoading ? (
          <ActivityIndicator size="small" color="#000000" />
        ) : (
          <>
            <ButtonIcon size={18} color="#FFFFFF" />
            <Text style={styles.friendButtonText}>{buttonContent.text}</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  btn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 10,
    gap: 6,
  },
  primary: {
    backgroundColor: '#374151',
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  secondary: {
    flex: 0,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
  },
  friendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  disabledButton: {
    opacity: 0.7,
  },
});
