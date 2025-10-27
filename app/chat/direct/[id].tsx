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
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Send } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import {
  getDirectMessages,
  sendDirectMessage,
  markMessageAsRead,
  subscribeToDirectMessages,
  getFriends,
  type DirectMessage,
} from '@/lib/friends';

export default function DirectMessageScreen() {
  const router = useRouter();
  const { id: friendId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [friendProfile, setFriendProfile] = useState<any>(null);
  const flatListRef = useRef<FlatList>(null);

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

        <View style={styles.headerInfo}>
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
        </View>
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
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#94A3B8"
          value={messageText}
          onChangeText={setMessageText}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!messageText.trim() || sending) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!messageText.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Send size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
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
    marginRight: 12,
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
});
