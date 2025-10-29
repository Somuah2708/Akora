import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Modal,
  Alert,
  Pressable,
  Animated,
} from 'react-native';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Send, Smile, Image as ImageIcon, Mic, Camera, X, Play, Pause, Check, CheckCheck } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import {
  getDirectMessages,
  sendDirectMessage,
  markMessageAsRead,
  markMessageAsDelivered,
  subscribeToDirectMessages,
  getFriends,
  updateOnlineStatus,
  getUserOnlineStatus,
  subscribeToUserPresence,
  type DirectMessage,
} from '@/lib/friends';
import { pickMedia, takeMedia, uploadMedia, startRecording, stopRecording, cancelRecording } from '@/lib/media';
import { formatMessageTime, formatLastSeen, groupMessagesByDay } from '@/lib/timeUtils';
import { supabase } from '@/lib/supabase';
import EmojiSelector from 'react-native-emoji-selector';
import { Audio } from 'expo-av';
import { getCachedThread, setCachedThread, upsertMessageList } from '@/lib/chatCache';

export default function DirectMessageScreen() {
  const router = useRouter();
  const { id: friendId} = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [friendProfile, setFriendProfile] = useState<any>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [recording, setRecording] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [showMediaOptions, setShowMediaOptions] = useState(false);
  const [playingSound, setPlayingSound] = useState<{ [key: string]: boolean }>({});
  const [isTyping, setIsTyping] = useState(false);
  const [friendIsOnline, setFriendIsOnline] = useState(false);
  const [friendLastSeen, setFriendLastSeen] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const soundObjects = useRef<{ [key: string]: Audio.Sound }>({});
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingChannelRef = useRef<any>(null);

  // Upsert a message into the array by id and keep it unique
  const upsertMessage = useCallback((list: DirectMessage[], msg: DirectMessage) => {
    const map = new Map<string, DirectMessage>();
    for (const m of list) {
      map.set(m.id, m);
    }
    const existing = map.get(msg.id);
    map.set(msg.id, existing ? { ...existing, ...msg } : msg);
    return Array.from(map.values());
  }, []);

  useEffect(() => {
    if (user && friendId) {
      // Show cached thread immediately (no spinner), then background sync
      (async () => {
        const cached = await getCachedThread(user.id, friendId);
        if (cached?.messages?.length) {
          setMessages(cached.messages);
          setLoading(false);
        }
        loadMessages(!!cached?.messages?.length);
      })();
      loadFriendProfile();
      loadFriendOnlineStatus();

      // Update own online status
      updateOnlineStatus(user.id, true);

      // Subscribe to real-time messages with optimistic updates
      const conversationId = [user.id, friendId].sort().join('-');
      const messageChannel = supabase
        .channel(`chat:${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'direct_messages',
          },
          (payload) => {
            const newMessage = payload.new as DirectMessage;
            // Only handle INCOMING messages to avoid duplicating our own optimistic sends
            if (!(newMessage.sender_id === friendId && newMessage.receiver_id === user.id)) {
              return;
            }
            setMessages((prev) => {
              const next = upsertMessage(prev, newMessage);
              setCachedThread(user.id, friendId, next, friendProfile);
              return next;
            });

            // Mark as delivered
            markMessageAsDelivered(newMessage.id);

            // Mark as read immediately
            markMessageAsRead(newMessage.id);

            // Scroll to bottom
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'direct_messages',
          },
          (payload) => {
            const updatedMessage = payload.new as DirectMessage;
            // Accept updates for either direction (read/delivered changes)
            setMessages((prev) =>
              prev.map((m) => (m.id === updatedMessage.id ? { ...m, ...updatedMessage } : m))
            );
          }
        )
        .subscribe();

      // Subscribe to friend's online status
      const unsubscribePresence = subscribeToUserPresence(
        friendId,
        (isOnline, lastSeen) => {
          setFriendIsOnline(isOnline);
          setFriendLastSeen(lastSeen);
        }
      );

      // Setup typing indicator channel
      setupTypingIndicator();

      return () => {
        supabase.removeChannel(messageChannel);
        unsubscribePresence();
        if (typingChannelRef.current) {
          supabase.removeChannel(typingChannelRef.current);
        }
        // Mark as offline when leaving
        updateOnlineStatus(user.id, false);
      };
    }
  }, [user, friendId]);

  const loadMessages = async (skipSpinner = false) => {
    if (!user || !friendId) return;

    try {
      if (!skipSpinner) setLoading(true);
      const msgs = await getDirectMessages(user.id, friendId);
      setMessages(msgs);
      // Persist to cache
      setCachedThread(user.id, friendId, msgs, friendProfile);

      // Mark unread messages as read
      const unreadMessages = msgs.filter(
        (m) => m.receiver_id === user.id && !m.is_read
      );
      await Promise.all(unreadMessages.map((m) => markMessageAsRead(m.id)));
      
      // Mark all as delivered
      const undeliveredMessages = msgs.filter(
        (m) => m.receiver_id === user.id && !m.delivered_at
      );
      await Promise.all(undeliveredMessages.map((m) => markMessageAsDelivered(m.id)));
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      if (!skipSpinner) setLoading(false);
    }
  };

  const loadFriendProfile = async () => {
    if (!user || !friendId) return;

    try {
      const friends = await getFriends(user.id);
      const friend = friends.find((f) => f.friend_id === friendId);
      if (friend) {
        setFriendProfile(friend.friend);
      }
    } catch (error) {
      console.error('Error loading friend profile:', error);
    }
  };

  const loadFriendOnlineStatus = async () => {
    if (!friendId) return;
    const status = await getUserOnlineStatus(friendId);
    setFriendIsOnline(status.isOnline);
    setFriendLastSeen(status.lastSeen);
  };

  const setupTypingIndicator = useCallback(() => {
    if (!user || !friendId) return;

    const conversationId = [user.id, friendId].sort().join('-');
    const channel = supabase.channel(`typing:${conversationId}`, {
      config: { presence: { key: user.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        // Check if friend is typing
        const friendPresence = state[friendId];
        if (friendPresence && friendPresence[0]) {
          setIsTyping((friendPresence[0] as any).typing || false);
        } else {
          setIsTyping(false);
        }
      })
      .subscribe();

    typingChannelRef.current = channel;
  }, [user, friendId]);

  const handleTyping = useCallback(() => {
    if (!typingChannelRef.current || !user) return;

    // Send typing indicator
    typingChannelRef.current.track({ typing: true, userId: user.id });

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing after 2 seconds
    typingTimeoutRef.current = setTimeout(() => {
      if (typingChannelRef.current) {
        typingChannelRef.current.track({ typing: false, userId: user.id });
      }
    }, 2000);
  }, [user]);

  const handleSend = async () => {
    if (!user || !friendId || !messageText.trim()) return;

    const messageToSend = messageText.trim();
    const tempId = `temp-${Date.now()}`;

    try {
      // Optimistically add message to UI
      const optimisticMessage: DirectMessage = {
        id: tempId,
        sender_id: user.id,
        receiver_id: friendId,
        message: messageToSend,
        message_type: 'text',
        created_at: new Date().toISOString(),
        is_read: false,
        sender: {
          id: user.id,
          username: user.user_metadata?.username || '',
          full_name: user.user_metadata?.full_name || '',
          avatar_url: user.user_metadata?.avatar_url,
        },
      };

  setMessages((prev) => {
        const next = upsertMessage(prev, optimisticMessage);
        setCachedThread(user.id, friendId, next, friendProfile);
        return next;
      });
      setMessageText('');
      setShowEmojiPicker(false);
      setSending(true);

      // Stop typing indicator
      if (typingChannelRef.current) {
        typingChannelRef.current.track({ typing: false, userId: user.id });
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // Send to server
      const newMessage = await sendDirectMessage(user.id, friendId, messageToSend);

      // Replace optimistic message with real one
      setMessages((prev) => {
        const replaced = prev.map((m) => (m.id === tempId ? newMessage : m));
        const next = upsertMessageList(replaced, newMessage);
        setCachedThread(user.id, friendId, next, friendProfile);
        return next;
      });
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  const handleMediaPick = async () => {
    setShowMediaOptions(false);
    const media = await pickMedia();
    if (media && user && friendId) {
      try {
        setUploadingMedia(true);
        const mediaType = media.type === 'video' ? 'video' : 'image';
        const mediaUrl = await uploadMedia(media.uri, user.id, mediaType);
        
        if (mediaUrl) {
          const newMessage = await sendDirectMessage(
            user.id,
            friendId,
            mediaType === 'image' ? '📷 Photo' : '🎥 Video',
            mediaType,
            mediaUrl
          );
          setMessages((prev) => {
            const next = upsertMessage(prev, newMessage);
            setCachedThread(user.id, friendId, next, friendProfile);
            return next;
          });
          
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      } catch (error) {
        console.error('Error sending media:', error);
        Alert.alert('Error', 'Failed to send media');
      } finally {
        setUploadingMedia(false);
      }
    }
  };

  const handleCameraCapture = async () => {
    setShowMediaOptions(false);
    const media = await takeMedia();
    if (media && user && friendId) {
      try {
        setUploadingMedia(true);
        const mediaType = media.type === 'video' ? 'video' : 'image';
        const mediaUrl = await uploadMedia(media.uri, user.id, mediaType);
        
        if (mediaUrl) {
          const newMessage = await sendDirectMessage(
            user.id,
            friendId,
            mediaType === 'image' ? '📷 Photo' : '🎥 Video',
            mediaType,
            mediaUrl
          );
          setMessages((prev) => {
            const next = upsertMessage(prev, newMessage);
            setCachedThread(user.id, friendId, next, friendProfile);
            return next;
          });
          
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      } catch (error) {
        console.error('Error sending media:', error);
        Alert.alert('Error', 'Failed to send media');
      } finally {
        setUploadingMedia(false);
      }
    }
  };

  const handleStartRecording = async () => {
    const success = await startRecording();
    if (success) {
      setRecording(true);
    }
  };

  const handleStopRecording = async () => {
    if (!user || !friendId) return;
    
    setRecording(false);
    try {
      setUploadingMedia(true);
      const voiceUrl = await stopRecording(user.id);
      
      if (voiceUrl) {
        const newMessage = await sendDirectMessage(
          user.id,
          friendId,
          '🎤 Voice message',
          'voice',
          voiceUrl
        );
        setMessages((prev) => {
          const next = upsertMessage(prev, newMessage);
          setCachedThread(user.id, friendId, next, friendProfile);
          return next;
        });
        
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error) {
      console.error('Error sending voice message:', error);
      Alert.alert('Error', 'Failed to send voice message');
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleCancelRecording = async () => {
    await cancelRecording();
    setRecording(false);
  };

  const toggleVoicePlayback = async (messageId: string, voiceUrl: string) => {
    try {
      if (playingSound[messageId]) {
        // Stop playing
        const sound = soundObjects.current[messageId];
        if (sound) {
          await sound.stopAsync();
          await sound.unloadAsync();
          delete soundObjects.current[messageId];
        }
        setPlayingSound(prev => ({ ...prev, [messageId]: false }));
      } else {
        // Start playing
        const { sound } = await Audio.Sound.createAsync(
          { uri: voiceUrl },
          { shouldPlay: true }
        );
        soundObjects.current[messageId] = sound;
        setPlayingSound(prev => ({ ...prev, [messageId]: true }));
        
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            setPlayingSound(prev => ({ ...prev, [messageId]: false }));
            sound.unloadAsync();
            delete soundObjects.current[messageId];
          }
        });
      }
    } catch (error) {
      console.error('Error playing voice message:', error);
      Alert.alert('Error', 'Failed to play voice message');
    }
  };

  const renderMessage = ({ item, index }: { item: DirectMessage; index: number }) => {
    const isMyMessage = item.sender_id === user?.id;
    const showDateDivider = index === 0 || !isSameDay(item.created_at, messages[index - 1]?.created_at);

    return (
      <>
        {/* Date Divider */}
        {showDateDivider && (
          <View style={styles.dateDivider}>
            <View style={styles.dateDividerLine} />
            <Text style={styles.dateDividerText}>
              {formatDateDivider(item.created_at)}
            </Text>
            <View style={styles.dateDividerLine} />
          </View>
        )}

        <View
          style={[
            styles.messageContainer,
            isMyMessage ? styles.myMessageContainer : styles.theirMessageContainer,
          ]}
        >
          {!isMyMessage && (
            <View style={styles.messageHeader}>
              {item.sender?.avatar_url ? (
                <Image source={{ uri: item.sender.avatar_url }} style={styles.messageAvatar} />
              ) : (
                <View style={[styles.messageAvatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarText}>
                    {item.sender?.full_name?.[0]?.toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
            </View>
          )}
          <View
            style={[
              styles.messageBubble,
              isMyMessage ? styles.myMessageBubble : styles.theirMessageBubble,
            ]}
          >
            {/* Image Message */}
            {item.message_type === 'image' && item.media_url && (
              <TouchableOpacity activeOpacity={0.9}>
                <Image 
                  source={{ uri: item.media_url }} 
                  style={styles.messageImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            )}

            {/* Video Message */}
            {item.message_type === 'video' && item.media_url && (
              <TouchableOpacity style={styles.videoContainer} activeOpacity={0.9}>
                <Image 
                  source={{ uri: item.media_url }} 
                  style={styles.messageImage}
                  resizeMode="cover"
                />
                <View style={styles.playOverlay}>
                  <Play size={28} color="#FFFFFF" fill="#FFFFFF" />
                </View>
              </TouchableOpacity>
            )}

            {/* Voice Message */}
            {item.message_type === 'voice' && item.media_url && (
              <TouchableOpacity 
                style={styles.voiceContainer}
                onPress={() => toggleVoicePlayback(item.id, item.media_url!)}
                activeOpacity={0.7}
              >
                {playingSound[item.id] ? (
                  <Pause size={26} color={isMyMessage ? '#FFFFFF' : '#4169E1'} fill={isMyMessage ? '#FFFFFF' : '#4169E1'} />
                ) : (
                  <Play size={26} color={isMyMessage ? '#FFFFFF' : '#4169E1'} fill={isMyMessage ? '#FFFFFF' : '#4169E1'} />
                )}
                <View style={styles.waveform}>
                  {[...Array(20)].map((_, i) => (
                    <View 
                      key={i} 
                      style={[
                        styles.waveformBar,
                        { 
                          height: Math.random() * 18 + 8,
                          backgroundColor: isMyMessage ? 'rgba(255, 255, 255, 0.8)' : '#4169E1',
                          opacity: playingSound[item.id] ? 1 : 0.6,
                        }
                      ]} 
                    />
                  ))}
                </View>
              </TouchableOpacity>
            )}

            {/* Text Message */}
            {item.message_type !== 'voice' && (
              <Text
                style={[
                  styles.messageText,
                  isMyMessage ? styles.myMessageText : styles.theirMessageText,
                ]}
              >
                {item.message}
              </Text>
            )}
            
            {/* Time and Status */}
            <View style={styles.messageFooter}>
              <Text
                style={[
                  styles.messageTime,
                  isMyMessage ? styles.myMessageTime : styles.theirMessageTime,
                ]}
              >
                {formatMessageTime(item.created_at)}
              </Text>
              
              {/* Read/Delivered indicators for sent messages */}
              {isMyMessage && (
                <View style={styles.messageStatus}>
                  {item.read_at ? (
                    <CheckCheck size={14} color="rgba(255, 255, 255, 0.75)" />
                  ) : item.delivered_at ? (
                    <CheckCheck size={14} color="rgba(255, 255, 255, 0.5)" />
                  ) : (
                    <Check size={14} color="rgba(255, 255, 255, 0.5)" />
                  )}
                </View>
              )}
            </View>
          </View>
        </View>
      </>
    );
  };

  // Helper function to check if two dates are the same day
  const isSameDay = (date1: string, date2: string): boolean => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const formatDateDivider = (timestamp: string): string => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (isSameDay(timestamp, today.toISOString())) {
      return 'Today';
    } else if (isSameDay(timestamp, yesterday.toISOString())) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4169E1" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.headerInfo}
          onPress={() => router.push(`/user-profile/${friendId}`)}
          activeOpacity={0.7}
        >
          <View style={styles.headerAvatarContainer}>
            {friendProfile?.avatar_url ? (
              <Image source={{ uri: friendProfile.avatar_url }} style={styles.headerAvatar} />
            ) : (
              <View style={[styles.headerAvatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>
                  {friendProfile?.full_name?.[0]?.toUpperCase() || 'U'}
                </Text>
              </View>
            )}
            {/* Online indicator */}
            {friendIsOnline && <View style={styles.onlineIndicator} />}
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerName}>{friendProfile?.full_name || 'Friend'}</Text>
            {/* Typing indicator or online status */}
            {isTyping ? (
              <View style={styles.typingContainer}>
                <Text style={styles.typingText}>typing</Text>
                <View style={styles.typingDots}>
                  <View style={[styles.typingDot, styles.typingDot1]} />
                  <View style={[styles.typingDot, styles.typingDot2]} />
                  <View style={[styles.typingDot, styles.typingDot3]} />
                </View>
              </View>
            ) : (
              <Text style={styles.headerHandle}>
                {formatLastSeen(friendLastSeen, friendIsOnline)}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              Start a conversation with {friendProfile?.full_name}!
            </Text>
          </View>
        }
      />

      {/* Input */}
      <View style={styles.inputContainer}>
        {/* Emoji Button */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setShowEmojiPicker(!showEmojiPicker)}
          activeOpacity={0.7}
        >
          <Smile size={22} color="#4169E1" />
        </TouchableOpacity>

        {/* Text Input */}
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#94A3B8"
          value={messageText}
          onChangeText={(text) => {
            setMessageText(text);
            handleTyping();
          }}
          multiline
          maxLength={1000}
        />

        {/* Media Button */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setShowMediaOptions(true)}
          activeOpacity={0.7}
        >
          <ImageIcon size={22} color="#4169E1" />
        </TouchableOpacity>

        {/* Voice Recording Button */}
        {!messageText.trim() && (
          <TouchableOpacity
            style={[styles.iconButton, recording && styles.recordingButton]}
            onPressIn={handleStartRecording}
            onPressOut={handleStopRecording}
            onLongPress={handleStartRecording}
            delayLongPress={100}
            activeOpacity={0.7}
          >
            <Mic size={22} color={recording ? '#EF4444' : '#4169E1'} fill={recording ? '#EF4444' : 'none'} />
          </TouchableOpacity>
        )}

        {/* Send Button */}
        {messageText.trim() && (
          <TouchableOpacity
            style={[styles.sendButton, sending && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!messageText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Send size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Emoji Picker Modal */}
      <Modal
        visible={showEmojiPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEmojiPicker(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.emojiPickerContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Emoji</Text>
              <TouchableOpacity onPress={() => setShowEmojiPicker(false)}>
                <X size={24} color="#000000" />
              </TouchableOpacity>
            </View>
            <EmojiSelector
              onEmojiSelected={(emoji) => {
                setMessageText(prev => prev + emoji);
                setShowEmojiPicker(false);
              }}
              showSearchBar={false}
              columns={8}
            />
          </View>
        </View>
      </Modal>

      {/* Media Options Modal */}
      <Modal
        visible={showMediaOptions}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowMediaOptions(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowMediaOptions(false)}
        >
          <View style={styles.mediaOptionsContainer}>
            <TouchableOpacity
              style={styles.mediaOption}
              onPress={handleMediaPick}
            >
              <ImageIcon size={28} color="#4169E1" />
              <Text style={styles.mediaOptionText}>Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.mediaOption}
              onPress={handleCameraCapture}
            >
              <Camera size={28} color="#4169E1" />
              <Text style={styles.mediaOptionText}>Camera</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Uploading Media Indicator */}
      {uploadingMedia && (
        <View style={styles.uploadingOverlay}>
          <View style={styles.uploadingContainer}>
            <ActivityIndicator size="large" color="#4169E1" />
            <Text style={styles.uploadingText}>
              {recording ? 'Sending voice message...' : 'Uploading media...'}
            </Text>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#4169E1',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: -0.2,
  },
  headerHandle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  typingText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
    marginRight: 6,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  typingDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#10B981',
  },
  typingDot1: {
    opacity: 0.4,
  },
  typingDot2: {
    opacity: 0.7,
  },
  typingDot3: {
    opacity: 1,
  },
  messagesContent: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  dateDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    paddingHorizontal: 4,
  },
  dateDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dateDividerText: {
    paddingHorizontal: 16,
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  myMessageContainer: {
    justifyContent: 'flex-end',
  },
  theirMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageHeader: {
    marginRight: 8,
    marginTop: 'auto',
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  avatarPlaceholder: {
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  myMessageBubble: {
    backgroundColor: '#4169E1',
    borderBottomRightRadius: 6,
  },
  theirMessageBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 6,
  },
  messageText: {
    fontSize: 15.5,
    lineHeight: 21,
    letterSpacing: -0.1,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  theirMessageText: {
    color: '#1F2937',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 6,
    gap: 6,
  },
  messageTime: {
    fontSize: 10.5,
    fontWeight: '500',
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  theirMessageTime: {
    color: '#9CA3AF',
  },
  messageStatus: {
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
    gap: 10,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  recordingButton: {
    backgroundColor: '#FEE2E2',
  },
  input: {
    flex: 1,
    minHeight: 38,
    maxHeight: 100,
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15.5,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#4169E1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    opacity: 0.4,
    shadowOpacity: 0,
  },
  messageImage: {
    width: 220,
    height: 220,
    borderRadius: 16,
    marginBottom: 6,
  },
  videoContainer: {
    position: 'relative',
  },
  playOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -24,
    marginTop: -24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  voiceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    minWidth: 180,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2.5,
    flex: 1,
  },
  waveformBar: {
    width: 3,
    borderRadius: 2,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  emojiPickerContainer: {
    height: '60%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: -0.3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaOptionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    gap: 14,
    width: '80%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  mediaOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    gap: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  mediaOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    letterSpacing: -0.2,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    gap: 20,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  uploadingText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});
