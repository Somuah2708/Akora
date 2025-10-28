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
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Send, Smile, Image as ImageIcon, Mic, Camera, X, Play, Pause } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import {
  getDirectMessages,
  sendDirectMessage,
  markMessageAsRead,
  subscribeToDirectMessages,
  getFriends,
  type DirectMessage,
} from '@/lib/friends';
import { pickMedia, takeMedia, uploadMedia, startRecording, stopRecording, cancelRecording } from '@/lib/media';
import EmojiSelector from 'react-native-emoji-selector';
import { Audio } from 'expo-av';

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
  const flatListRef = useRef<FlatList>(null);
  const soundObjects = useRef<{ [key: string]: Audio.Sound }>({});

  useEffect(() => {
    if (user && friendId) {
      loadMessages();
      loadFriendProfile();

      // Subscribe to real-time messages
      const unsubscribe = subscribeToDirectMessages(user.id, friendId, (newMessage) => {
        setMessages((prev) => {
          // Check if message already exists
          if (prev.some((m) => m.id === newMessage.id)) {
            return prev;
          }
          return [...prev, newMessage];
        });

        // Mark as read if message is from friend
        if (newMessage.sender_id === friendId) {
          markMessageAsRead(newMessage.id);
        }

        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      });

      return () => {
        unsubscribe();
      };
    }
  }, [user, friendId]);

  const loadMessages = async () => {
    if (!user || !friendId) return;

    try {
      setLoading(true);
      const msgs = await getDirectMessages(user.id, friendId);
      setMessages(msgs);

      // Mark unread messages as read
      const unreadMessages = msgs.filter(
        (m) => m.receiver_id === user.id && !m.is_read
      );
      await Promise.all(unreadMessages.map((m) => markMessageAsRead(m.id)));
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
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

  const handleSend = async () => {
    if (!user || !friendId || !messageText.trim()) return;

    try {
      setSending(true);
      const newMessage = await sendDirectMessage(user.id, friendId, messageText.trim());
      setMessages((prev) => [...prev, newMessage]);
      setMessageText('');
      setShowEmojiPicker(false);

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
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
          setMessages((prev) => [...prev, newMessage]);
          
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
          setMessages((prev) => [...prev, newMessage]);
          
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
        setMessages((prev) => [...prev, newMessage]);
        
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

  const renderMessage = ({ item }: { item: DirectMessage }) => {
    const isMyMessage = item.sender_id === user?.id;

    return (
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
            <Image 
              source={{ uri: item.media_url }} 
              style={styles.messageImage}
              resizeMode="cover"
            />
          )}

          {/* Video Message */}
          {item.message_type === 'video' && item.media_url && (
            <View style={styles.videoContainer}>
              <Image 
                source={{ uri: item.media_url }} 
                style={styles.messageImage}
                resizeMode="cover"
              />
              <View style={styles.playOverlay}>
                <Play size={32} color="#FFFFFF" fill="#FFFFFF" />
              </View>
            </View>
          )}

          {/* Voice Message */}
          {item.message_type === 'voice' && item.media_url && (
            <TouchableOpacity 
              style={styles.voiceContainer}
              onPress={() => toggleVoicePlayback(item.id, item.media_url!)}
            >
              {playingSound[item.id] ? (
                <Pause size={24} color={isMyMessage ? '#FFFFFF' : '#4169E1'} />
              ) : (
                <Play size={24} color={isMyMessage ? '#FFFFFF' : '#4169E1'} fill={isMyMessage ? '#FFFFFF' : '#4169E1'} />
              )}
              <View style={styles.waveform}>
                {[...Array(20)].map((_, i) => (
                  <View 
                    key={i} 
                    style={[
                      styles.waveformBar,
                      { 
                        height: Math.random() * 20 + 10,
                        backgroundColor: isMyMessage ? '#FFFFFF' : '#4169E1'
                      }
                    ]} 
                  />
                ))}
              </View>
            </TouchableOpacity>
          )}

          {/* Text Message */}
          <Text
            style={[
              styles.messageText,
              isMyMessage ? styles.myMessageText : styles.theirMessageText,
            ]}
          >
            {item.message}
          </Text>
          <Text
            style={[
              styles.messageTime,
              isMyMessage ? styles.myMessageTime : styles.theirMessageTime,
            ]}
          >
            {new Date(item.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    );
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
        >
          {friendProfile?.avatar_url ? (
            <Image source={{ uri: friendProfile.avatar_url }} style={styles.headerAvatar} />
          ) : (
            <View style={[styles.headerAvatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {friendProfile?.full_name?.[0]?.toUpperCase() || 'U'}
              </Text>
            </View>
          )}
          <View>
            <Text style={styles.headerName}>{friendProfile?.full_name || 'Friend'}</Text>
            <Text style={styles.headerHandle}>@{friendProfile?.username || 'user'}</Text>
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
        >
          <Smile size={24} color="#4169E1" />
        </TouchableOpacity>

        {/* Text Input */}
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#94A3B8"
          value={messageText}
          onChangeText={setMessageText}
          multiline
          maxLength={1000}
        />

        {/* Media Button */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setShowMediaOptions(true)}
        >
          <ImageIcon size={24} color="#4169E1" />
        </TouchableOpacity>

        {/* Voice Recording Button */}
        {!messageText.trim() && (
          <TouchableOpacity
            style={[styles.iconButton, recording && styles.recordingButton]}
            onPressIn={handleStartRecording}
            onPressOut={handleStopRecording}
            onLongPress={handleStartRecording}
            delayLongPress={100}
          >
            <Mic size={24} color={recording ? '#FFFFFF' : '#4169E1'} />
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
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerHandle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  messagesContent: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  myMessageContainer: {
    justifyContent: 'flex-end',
  },
  theirMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageHeader: {
    marginRight: 8,
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    backgroundColor: '#4169E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
  },
  myMessageBubble: {
    backgroundColor: '#4169E1',
    borderBottomRightRadius: 4,
  },
  theirMessageBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  theirMessageText: {
    color: '#1F2937',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  myMessageTime: {
    color: '#E0E7FF',
    textAlign: 'right',
  },
  theirMessageTime: {
    color: '#9CA3AF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingButton: {
    backgroundColor: '#FF3B30',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1F2937',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4169E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 4,
  },
  videoContainer: {
    position: 'relative',
  },
  playOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flex: 1,
  },
  waveformBar: {
    width: 3,
    borderRadius: 2,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  emojiPickerContainer: {
    height: '60%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaOptionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    width: '80%',
    maxWidth: 300,
  },
  mediaOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    gap: 12,
  },
  mediaOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 16,
  },
  uploadingText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
  },
});
