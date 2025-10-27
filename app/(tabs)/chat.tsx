import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, TextInput, Modal, FlatList, Alert } from 'react-native';
import { Search, Plus, MoveVertical as MoreVertical, X, MessageCircle } from 'lucide-react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter } from 'expo-router';
import { fetchUserChats, getOrCreateDirectChat, searchUsers as searchUsersHelper } from '@/lib/chats';
import { useAuth } from '@/hooks/useAuth';
import type { Profile, ChatWithDetails } from '@/lib/supabase';

SplashScreen.preventAutoHideAsync();

export default function ChatScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [chats, setChats] = useState<ChatWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (user) {
      fetchChats();
    }
  }, [user]);

  const fetchChats = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const userChats = await fetchUserChats(user.id);
      setChats(userChats);
    } catch (error) {
      console.error('Error fetching chats:', error);
      Alert.alert('Error', 'Failed to load chats');
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim() || !user) return;
    try {
      setSearchLoading(true);
      const results = await searchUsersHelper(query, user.id);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
      Alert.alert('Error', 'Failed to search users');
    } finally {
      setSearchLoading(false);
    }
  };

  const createDirectChat = async (otherUserId: string) => {
    if (!user) return;
    try {
      const chatId = await getOrCreateDirectChat(user.id, otherUserId);
      if (chatId) {
        router.push(`/chat/${chatId}`);
      }
      setSearchModalVisible(false);
      setSearchQuery('');
      setSearchResults([]);
      fetchChats();
    } catch (error) {
      console.error('Error creating chat:', error);
      Alert.alert('Error', 'Failed to create chat');
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Chats</Text>
        </View>
        <View style={styles.authPrompt}>
          <MessageCircle size={64} color="#666666" />
          <Text style={styles.authPromptTitle}>Sign in to access chats</Text>
          <Text style={styles.authPromptText}>
            You need to be signed in to view and send messages
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Chats</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => setSearchModalVisible(true)}
          >
            <Plus size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <MoreVertical size={24} color="#1A1A1A" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search chats"
            placeholderTextColor="#64748B"
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading chats...</Text>
        </View>
      ) : (
        <ScrollView style={styles.chatList}>
          {chats.length === 0 ? (
            <View style={styles.emptyState}>
              <MessageCircle size={64} color="#666666" />
              <Text style={styles.emptyStateTitle}>No chats yet</Text>
              <Text style={styles.emptyStateText}>
                Tap the + button to start a new conversation
              </Text>
            </View>
          ) : (
            chats.map((chat) => (
              <TouchableOpacity 
                key={chat.id} 
                style={styles.chatItem}
                onPress={() => router.push(`/chat/${chat.id}`)}
              >
                <View style={styles.avatarContainer}>
                  <Image 
                    source={{ 
                      uri: chat.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=60' 
                    }} 
                    style={styles.avatar} 
                  />
                  {chat.type === 'direct' && (
                    <View style={styles.onlineIndicator} />
                  )}
                </View>
                <View style={styles.chatInfo}>
                  <View style={styles.chatHeader}>
                    <Text style={styles.chatName}>{chat.name || 'Unknown'}</Text>
                    {chat.last_message && (
                      <Text style={styles.chatTime}>
                        {formatTime(chat.last_message.created_at)}
                      </Text>
                    )}
                  </View>
                  <View style={styles.chatFooter}>
                    <Text 
                      style={[
                        styles.lastMessage,
                        chat.unread_count && chat.unread_count > 0 && styles.unreadMessage
                      ]} 
                      numberOfLines={1}
                    >
                      {chat.last_message?.content || 'No messages yet'}
                    </Text>
                    {chat.unread_count && chat.unread_count > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadCount}>{chat.unread_count}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* Search Modal */}
      <Modal
        visible={searchModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSearchModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Chat</Text>
              <TouchableOpacity 
                onPress={() => setSearchModalVisible(false)}
                style={styles.closeButton}
              >
                <X size={24} color="#1A1A1A" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchContainer}>
              <View style={styles.searchInputContainer}>
                <Search size={20} color="#64748B" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name or username"
                  placeholderTextColor="#64748B"
                  value={searchQuery}
                  onChangeText={(text) => {
                    setSearchQuery(text);
                    searchUsers(text);
                  }}
                  autoFocus
                />
              </View>
            </View>

            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.userItem}
                  onPress={() => createDirectChat(item.id)}
                >
                  <Image 
                    source={{ 
                      uri: item.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=60' 
                    }} 
                    style={styles.userAvatar} 
                  />
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{item.full_name || item.username}</Text>
                    <Text style={styles.userUsername}>@{item.username}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={() => (
                <View style={styles.emptySearchState}>
                  {searchQuery.length > 0 && !searchLoading && (
                    <Text style={styles.emptySearchText}>
                      No users found for "{searchQuery}"
                    </Text>
                  )}
                  {searchQuery.length === 0 && (
                    <Text style={styles.emptySearchText}>
                      Start typing to search for users
                    </Text>
                  )}
                </View>
              )}
              style={styles.searchResults}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-SemiBold',
    color: '#1A1A1A',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1A1A1A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  chatList: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 100,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    textAlign: 'center',
  },
  authPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  authPromptTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
  },
  authPromptText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    textAlign: 'center',
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1A1A1A',
  },
  chatTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginRight: 8,
  },
  unreadMessage: {
    color: '#1A1A1A',
    fontFamily: 'Inter-SemiBold',
  },
  unreadBadge: {
    backgroundColor: '#4169E1',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  unreadCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#1A1A1A',
  },
  closeButton: {
    padding: 8,
  },
  modalSearchContainer: {
    padding: 16,
  },
  searchResults: {
    flex: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  emptySearchState: {
    padding: 32,
    alignItems: 'center',
  },
  emptySearchText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    textAlign: 'center',
  },
});