import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, TextInput, Modal, FlatList, Alert } from 'react-native';
import { Search, Plus, MoveVertical as MoreVertical, X, MessageCircle, UserPlus, Check, CheckCheck, Users } from 'lucide-react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter } from 'expo-router';
import { getConversationList, searchUsers as searchUsersHelper, getUserOnlineStatus, subscribeToUserPresence } from '@/lib/friends';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { formatChatListTime } from '@/lib/timeUtils';
import type { Profile } from '@/lib/supabase';

SplashScreen.preventAutoHideAsync();

interface Conversation {
  friend: any; // Friend object from Supabase join
  latestMessage: {
    id: string;
    content: string;
    created_at: string;
    sender_id: string;
    receiver_id: string;
    is_read: boolean;
  } | null;
  unreadCount: number;
}

export default function ChatScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  // Groups state
  type GroupItem = { group: { id: string; name: string; avatar_url?: string | null }, lastMessage: any | null, unreadCount: number };
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  // Upsert conversation by friend id to prevent duplicates
  const upsertConversation = (list: Conversation[], conv: Conversation) => {
    const friendId = Array.isArray(conv.friend) ? conv.friend[0]?.id : conv.friend?.id;
    if (!friendId) return list;
    
    const map = new Map<string, Conversation>();
    for (const c of list) {
      const fid = Array.isArray(c.friend) ? c.friend[0]?.id : c.friend?.id;
      if (fid) map.set(fid, c);
    }
    map.set(friendId, conv);
    return Array.from(map.values());
  };

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (user) {
      // Initial fetch shows loading once
      fetchConversations(true);
      fetchGroups(true);
      
      // Subscribe to real-time updates for direct messages
      const messageSubscription = supabase
        .channel('direct_messages_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'direct_messages',
          },
          async (payload) => {
            if (!user) return;
            const msg: any = payload.new;
            if (!msg) return;
            // Only react to conversations that involve the current user
            if (!(msg.sender_id === user.id || msg.receiver_id === user.id)) return;

            const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;

            setConversations((prev) => {
              const list = [...prev];
              // Find conversation index by friend id
              let idx = list.findIndex((c) => {
                const f = Array.isArray(c.friend) ? c.friend[0] : c.friend;
                return f?.id === otherUserId;
              });

              const latestMessage = {
                id: msg.id,
                content: msg.content || msg.message || '',
                created_at: msg.created_at,
                sender_id: msg.sender_id,
                receiver_id: msg.receiver_id,
                is_read: !!msg.is_read,
              };

              if (idx === -1) {
                // Not in list yet; we'll handle async profile fetch below
                return list;
              }

              const existing = list[idx];
              const isIncoming = msg.sender_id === otherUserId;
              const nextUnread = isIncoming
                ? (existing.unreadCount || 0) + (msg.is_read ? 0 : 1)
                : existing.unreadCount || 0;

              list[idx] = {
                ...existing,
                latestMessage,
                unreadCount: nextUnread,
              };

              // Reorder by latest message time (descending)
              list.sort((a, b) => {
                const at = new Date(a.latestMessage?.created_at || 0).getTime();
                const bt = new Date(b.latestMessage?.created_at || 0).getTime();
                return bt - at;
              });
              return list;
            });

            // If conversation wasn't present, fetch the friend's profile once and insert it
            const hasConversation = (list: any[]) =>
              list.some((c) => {
                const f = Array.isArray(c.friend) ? c.friend[0] : c.friend;
                return f?.id === otherUserId;
              });

            // Double-check current state before fetching
            let alreadyThere = false;
            setConversations((prev) => {
              alreadyThere = hasConversation(prev as any);
              return prev;
            });

            if (!alreadyThere) {
              const { data: friend, error } = await supabase
                .from('profiles')
                .select('id, username, full_name, avatar_url')
                .eq('id', otherUserId)
                .single();
              if (!error && friend) {
                const conv = {
                  friend,
                  latestMessage: {
                    id: msg.id,
                    content: msg.content || msg.message || '',
                    created_at: msg.created_at,
                    sender_id: msg.sender_id,
                    receiver_id: msg.receiver_id,
                    is_read: !!msg.is_read,
                  },
                  unreadCount: msg.sender_id === otherUserId && !msg.is_read ? 1 : 0,
                } as Conversation;
                setConversations((prev) => {
                  const next = upsertConversation(prev, conv);
                  next.sort((a, b) => {
                    const at = new Date(a.latestMessage?.created_at || 0).getTime();
                    const bt = new Date(b.latestMessage?.created_at || 0).getTime();
                    return bt - at;
                  });
                  return next;
                });
              }
            }
          }
        )
        .subscribe();

      // Subscribe to profile updates for online status
      const profileSubscription = supabase
        .channel('profile_status_changes')
        .on('postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
          },
          (payload) => {
            const updatedProfile = payload.new as any;
            setOnlineUsers(prev => {
              const newSet = new Set(prev);
              if (updatedProfile.is_online) {
                newSet.add(updatedProfile.id);
              } else {
                newSet.delete(updatedProfile.id);
              }
              return newSet;
            });
          }
        )
        .subscribe();

      // Subscribe to real-time updates for group messages
      const groupMessageSub = supabase
        .channel('group_messages_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'group_messages' },
          (payload) => {
            const msg: any = payload.new;
            if (!msg || !user) return;
            setGroups((prev) => {
              const idx = prev.findIndex((g) => g.group.id === msg.group_id);
              if (idx === -1) return prev; // not a group I belong to (or not loaded yet)
              const list = [...prev];
              const existing = list[idx];
              const isIncoming = msg.sender_id !== user.id;
              const alreadyRead = Array.isArray(msg.read_by) && msg.read_by.includes(user.id);
              const nextUnread = isIncoming && !alreadyRead ? (existing.unreadCount || 0) + 1 : existing.unreadCount || 0;
              list[idx] = { ...existing, lastMessage: msg, unreadCount: nextUnread };
              // Reorder by time desc
              list.sort((a, b) => new Date(b.lastMessage?.created_at || 0).getTime() - new Date(a.lastMessage?.created_at || 0).getTime());
              return list;
            });
          }
        )
        .subscribe();

      return () => {
        messageSubscription.unsubscribe();
        profileSubscription.unsubscribe();
        groupMessageSub.unsubscribe();
      };
    }
  }, [user]);

  const fetchConversations = async (showLoading = false) => {
    if (!user) return;
    try {
      if (showLoading) setLoading(true);
      const convos = await getConversationList(user.id);
      setConversations(convos);
      
      // Load online status for all friends
      const friendIds = convos.map(c => {
        // Handle friend being an array or object
        const friend = Array.isArray(c.friend) ? c.friend[0] : c.friend;
        return friend?.id;
      }).filter(Boolean) as string[];
      
      const statuses = await Promise.all(
        friendIds.map(id => getUserOnlineStatus(id))
      );
      
      const online = new Set<string>();
      statuses.forEach((status, index) => {
        if (status.isOnline) {
          online.add(friendIds[index]);
        }
      });
      setOnlineUsers(online);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      Alert.alert('Error', 'Failed to load conversations');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim() || !user) return;
    try {
      setSearchLoading(true);
      const results = await searchUsersHelper(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
      Alert.alert('Error', 'Failed to search users');
    } finally {
      setSearchLoading(false);
    }
  };

  const fetchGroups = async (showLoading = false) => {
    if (!user) return;
    try {
      if (showLoading) setGroupsLoading(true);
      const { data: memberships, error } = await supabase
        .from('group_members')
        .select('group_id, groups(id, name, avatar_url)')
        .eq('user_id', user.id);
      if (error) throw error;
      const groupList = (memberships || []).map((m: any) => m.groups).filter(Boolean);
      // Compose base items
      const base: GroupItem[] = groupList.map((g: any) => ({ group: { id: g.id, name: g.name, avatar_url: g.avatar_url }, lastMessage: null, unreadCount: 0 }));
      // Fetch unread counts for all groups in one call
      const { data: unreadRows } = await supabase.rpc('group_unread_counts', { p_user_id: user.id });
      const unreadMap = new Map<string, number>();
      (unreadRows || []).forEach((r: any) => unreadMap.set(r.group_id, r.unread));

      // Fetch last message per group (N calls; acceptable; can be optimized later)
      await Promise.all(
        base.map(async (item) => {
          const { data: last } = await supabase
            .from('group_messages')
            .select('*')
            .eq('group_id', item.group.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          item.lastMessage = last || null;
          item.unreadCount = unreadMap.get(item.group.id) || 0;
        })
      );
      base.sort((a, b) => new Date(b.lastMessage?.created_at || 0).getTime() - new Date(a.lastMessage?.created_at || 0).getTime());
      setGroups(base);
    } catch (e) {
      console.error('Error fetching groups', e);
    } finally {
      if (showLoading) setGroupsLoading(false);
    }
  };

  const createDirectChat = async (otherUserId: string) => {
    if (!user) return;
    try {
      // Navigate directly to the direct message screen with the friend's ID
      router.push(`/chat/direct/${otherUserId}`);
      setSearchModalVisible(false);
      setSearchQuery('');
      setSearchResults([]);
      fetchConversations();
    } catch (error) {
      console.error('Error opening chat:', error);
      Alert.alert('Error', 'Failed to open chat');
    }
  };

  const formatTime = (timestamp: string) => {
    return formatChatListTime(timestamp);
  };

  const getMessagePreview = (message: any): string => {
    if (!message) return 'No messages yet';
    
    // Handle different message types with proper icons
    switch (message.message_type || 'text') {
      case 'image':
        return '📷 Photo';
      case 'video':
        return '🎥 Video';
      case 'voice':
        return '🎤 Voice message';
      case 'text':
      default:
        // Show first 40 characters of text message
        const content = message.content || message.message || '';
        return content.length > 40 ? `${content.substring(0, 40)}...` : content;
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
      {/* Modern Header with Gradient Effect */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Akora Chats</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => router.push('/friends')}
            >
              <UserPlus size={20} color="#1E293B" strokeWidth={2.5} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.iconButton} 
              onPress={() => router.push('/create-group' as any)}
            >
              <Users size={20} color="#1E293B" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Search size={18} color="#64748B" strokeWidth={2.5} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search chats..."
              placeholderTextColor="#64748B"
            />
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingSpinner}>
            <MessageCircle size={40} color="#64748B" />
            <Text style={styles.loadingText}>Loading conversations...</Text>
          </View>
        </View>
      ) : (
        <ScrollView 
          style={styles.chatList}
          showsVerticalScrollIndicator={false}
        >
          {conversations.length === 0 && groups.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <MessageCircle size={56} color="#CBD5E1" strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyStateTitle}>No conversations yet</Text>
              <Text style={styles.emptyStateText}>
                Start a new chat or create a group to begin messaging
              </Text>
              <TouchableOpacity 
                style={styles.emptyActionButton}
                onPress={() => router.push('/friends')}
              >
                <UserPlus size={18} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.emptyActionText}>Find Friends</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Direct Messages Section */}
              {conversations.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>DIRECT MESSAGES</Text>
                  {conversations.map((conversation) => {
                    const friend = Array.isArray(conversation.friend) 
                      ? conversation.friend[0] 
                      : conversation.friend;
                    const isOnline = onlineUsers.has(friend?.id);
                    
                    return (
                      <TouchableOpacity 
                        key={friend?.id} 
                        style={styles.chatItem}
                        onPress={() => router.push(`/chat/direct/${friend?.id}`)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.avatarContainer}>
                          <Image 
                            source={{ 
                              uri: friend?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=60' 
                            }} 
                            style={styles.avatar} 
                          />
                          {isOnline && (
                            <View style={styles.onlineIndicator} />
                          )}
                        </View>
                        <View style={styles.chatInfo}>
                          <View style={styles.chatHeader}>
                            <Text style={styles.chatName} numberOfLines={1}>
                              {friend?.full_name || friend?.username || 'Unknown'}
                            </Text>
                            {conversation.latestMessage && (
                              <Text style={styles.chatTime}>
                                {formatTime(conversation.latestMessage.created_at)}
                              </Text>
                            )}
                          </View>
                          <View style={styles.chatFooter}>
                            <Text 
                              style={[
                                styles.lastMessage,
                                conversation.unreadCount > 0 && styles.unreadMessage
                              ]} 
                              numberOfLines={1}
                            >
                              {conversation.latestMessage 
                                ? getMessagePreview(conversation.latestMessage)
                                : 'Tap to start chatting'}
                            </Text>
                            {conversation.unreadCount > 0 && (
                              <View style={styles.unreadBadge}>
                                <Text style={styles.unreadCount}>
                                  {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Groups Section */}
              {groups.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>GROUPS</Text>
                  {groupsLoading ? (
                    <View style={styles.sectionLoading}>
                      <Text style={styles.loadingText}>Loading groups...</Text>
                    </View>
                  ) : (
                    groups.map((g) => (
                      <TouchableOpacity 
                        key={g.group.id} 
                        style={styles.chatItem} 
                        onPress={() => router.push(`/chat/group/${g.group.id}`)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.avatarContainer}>
                          <Image 
                            source={{ 
                              uri: g.group.avatar_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=60' 
                            }} 
                            style={styles.avatar} 
                          />
                          <View style={styles.groupBadge}>
                            <Users size={14} color="#FFFFFF" strokeWidth={2.5} />
                          </View>
                        </View>
                        <View style={styles.chatInfo}>
                          <View style={styles.chatHeader}>
                            <Text style={styles.chatName} numberOfLines={1}>
                              {g.group.name}
                            </Text>
                            {g.lastMessage && (
                              <Text style={styles.chatTime}>
                                {formatTime(g.lastMessage.created_at)}
                              </Text>
                            )}
                          </View>
                          <View style={styles.chatFooter}>
                            <Text 
                              style={[
                                styles.lastMessage, 
                                g.unreadCount > 0 && styles.unreadMessage
                              ]} 
                              numberOfLines={1}
                            >
                              {g.lastMessage ? getMessagePreview(g.lastMessage) : 'No messages yet'}
                            </Text>
                            {g.unreadCount > 0 && (
                              <View style={styles.unreadBadge}>
                                <Text style={styles.unreadCount}>
                                  {g.unreadCount > 99 ? '99+' : g.unreadCount}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}
            </>
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
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#E2E8F0',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchContainer: {
    marginTop: 4,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#1E293B',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingSpinner: {
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginTop: 8,
  },
  chatList: {
    flex: 1,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#64748B',
    letterSpacing: 1,
    paddingHorizontal: 20,
    paddingBottom: 8,
    fontWeight: '600',
  },
  sectionLoading: {
    padding: 20,
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 8,
    fontWeight: '600',
  },
  emptyStateText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#475569',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#475569',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyActionText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    fontWeight: '600',
  },
  authPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  authPromptTitle: {
    fontSize: 22,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
    fontWeight: '600',
  },
  authPromptText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    marginBottom: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#F1F5F9',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#22C55E',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  groupBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#64748B',
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 6,
  },
  chatName: {
    flex: 1,
    fontSize: 17,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    fontWeight: '600',
    marginRight: 8,
  },
  chatTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#94A3B8',
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
    lineHeight: 20,
  },
  unreadMessage: {
    color: '#1E293B',
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: '#475569',
    borderRadius: 14,
    minWidth: 26,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    shadowColor: '#475569',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  unreadCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '700',
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