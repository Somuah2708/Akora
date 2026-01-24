import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, TextInput, Modal, FlatList, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { Search, Plus, MoveVertical as MoreVertical, X, MessageCircle, UserPlus, Check, CheckCheck, Users, ArrowLeft, Circle } from 'lucide-react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState, useMemo, useRef } from 'react';
import { SplashScreen, useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { HEADER_COLOR } from '@/constants/Colors';
import { getConversationList, searchUsers as searchUsersHelper } from '@/lib/friends';
import { pinChat, getSettingsForUser, markDirectConversationRead, markGroupConversationRead } from '@/lib/chatSettings';
import { useAuth } from '@/hooks/useAuth';
import { formatProfileSubtitle } from '@/lib/display';
import { supabase } from '@/lib/supabase';
import { formatChatListTime } from '@/lib/timeUtils';
import type { Profile } from '@/lib/supabase';
import { getDisplayName } from '@/lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getMemoryCacheSync, cacheData } from '@/lib/cache';
import { CACHE_KEYS } from '@/lib/queries';
import CachedImage from '@/components/CachedImage';

// Cache freshness threshold (5 minutes)
const CACHE_FRESHNESS_MS = 5 * 60 * 1000;

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
  console.log('🎬 ChatScreen component rendering');
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  console.log('👤 ChatScreen user:', user?.id || 'no user');
  
  // INSTANT CACHE: Get cached data synchronously (no loading delay)
  const cachedConversations = useMemo(() => {
    if (!user?.id) return null;
    return getMemoryCacheSync<Conversation[]>(CACHE_KEYS.conversations(user.id));
  }, [user?.id]);
  
  const cachedGroups = useMemo(() => {
    if (!user?.id) return null;
    return getMemoryCacheSync<any[]>(CACHE_KEYS.groups(user.id));
  }, [user?.id]);
  
  // Initialize state with cached data if available (INSTANT display)
  const [conversations, setConversations] = useState<Conversation[]>(cachedConversations || []);
  const [loading, setLoading] = useState(!cachedConversations); // No loading if cached
  // Groups state
  type GroupItem = { group: { id: string; name: string; avatar_url?: string | null }, lastMessage: any | null, unreadCount: number, isCircle?: boolean };
  const [groups, setGroups] = useState<GroupItem[]>(cachedGroups || []);
  const [groupsLoading, setGroupsLoading] = useState(!cachedGroups);
  const [supportConversations, setSupportConversations] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'direct' | 'groups'>('direct');
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pinnedDirectIds, setPinnedDirectIds] = useState<Set<string>>(new Set());
  const [pinnedGroupIds, setPinnedGroupIds] = useState<Set<string>>(new Set());
  const [typingFriendIds, setTypingFriendIds] = useState<Set<string>>(new Set());
  const typingChannelsRef = useState<any[]>([])[0];
  const [navigationLock, setNavigationLock] = useState<Set<string>>(new Set()); // Prevent double-tap
  const processedMessageIds = useRef<Set<string>>(new Set()); // Track processed messages to prevent duplicates
  // Track unread counts per conversation in a ref (friendId -> count)
  // This updates synchronously, avoiding React state batching issues
  const unreadCountsRef = useRef<Map<string, number>>(new Map());
  // Track when a realtime update happened (friendId -> timestamp)
  // This prevents fetch from overwriting recent realtime updates
  const realtimeUpdateTimestamps = useRef<Map<string, number>>(new Map());
  // Track when the last fetch started
  const lastFetchStartTime = useRef<number>(0);
  const [actionSheet, setActionSheet] = useState<
    | { type: 'direct'; friendId: string; unreadCount: number; pinned: boolean }
    | { type: 'group'; groupId: string; unreadCount: number; pinned: boolean }
    | null
  >(null);
  const [newMenuVisible, setNewMenuVisible] = useState(false);

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
    const checkAdminStatus = async () => {
      if (!user) return;
      try {
        console.log('🔍 Checking admin status for user:', user.id);
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, is_admin')
          .eq('id', user.id)
          .single();
        
        const adminStatus = profile?.role === 'admin' || profile?.is_admin === true;
        console.log('👤 Profile:', profile);
        console.log('🛡️ Is Admin:', adminStatus);
        setIsAdmin(adminStatus);
      } catch (error) {
        console.error('❌ Error checking admin status:', error);
      }
    };

    if (user) {
      checkAdminStatus();
      // Initial fetch shows loading once
      fetchConversations(true);
      fetchGroups(true);
      loadPinnedSettings();
      
      // Subscribe to real-time updates for direct messages
      // IMPORTANT: Don't rely on Supabase filters - they're unreliable
      // Instead, subscribe to ALL direct_messages and filter in callback
      const messageSubscription = supabase
        .channel(`dm_realtime_${user.id}_${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'direct_messages',
          },
          async (payload) => {
            console.log('🚨🚨🚨 [CHAT LIST] RAW PAYLOAD RECEIVED:', JSON.stringify(payload));
            
            const msg: any = payload.new;
            if (!msg) {
              console.log('🚨 [CHAT LIST] No message in payload!');
              return;
            }
            
            console.log('🚨 [CHAT LIST] Message details:', {
              id: msg.id,
              sender_id: msg.sender_id,
              receiver_id: msg.receiver_id,
              myUserId: user.id
            });
            
            // Deduplicate: Skip if we've already processed this message
            if (processedMessageIds.current.has(msg.id)) {
              console.log('🔔 [CHAT LIST] Skipping already processed message:', msg.id);
              return;
            }
            
            // CRITICAL: Only process messages that involve this user
            const iAmSender = msg.sender_id === user.id;
            const iAmReceiver = msg.receiver_id === user.id;
            
            console.log('🚨 [CHAT LIST] Role check:', { iAmSender, iAmReceiver });
            
            if (!iAmSender && !iAmReceiver) {
              // This message doesn't involve me at all - ignore it
              console.log('🚨 [CHAT LIST] Message NOT for me, ignoring');
              return;
            }
            
            // Mark as processed
            processedMessageIds.current.add(msg.id);
            // Cleanup old IDs to prevent memory leak (keep last 100)
            if (processedMessageIds.current.size > 100) {
              const arr = Array.from(processedMessageIds.current);
              processedMessageIds.current = new Set(arr.slice(-50));
            }
            
            console.log('🔔 [CHAT LIST] New message:', {
              messageId: msg.id,
              iAmSender,
              iAmReceiver,
              senderId: msg.sender_id,
              receiverId: msg.receiver_id,
            });
            
            // Determine who the "other person" is in this conversation
            const otherUserId = iAmSender ? msg.receiver_id : msg.sender_id;
            
            // First, check synchronously if conversation exists in current state
            // This avoids the need for a second setState call
            let conversationExists = false;
            setConversations((prev) => {
              // Check if conversation exists
              const idx = prev.findIndex((c) => {
                const f = Array.isArray(c.friend) ? c.friend[0] : c.friend;
                return f?.id === otherUserId;
              });
              conversationExists = idx !== -1;
              
              if (idx === -1) {
                console.log('📋 [CHAT LIST] Conversation not found in state, will fetch profile...');
                return prev; // Return unchanged, we'll add new conversation separately
              }

              // Conversation exists, update it
              const list = [...prev];

              const latestMessage = {
                id: msg.id,
                content: msg.content || msg.message || '',
                created_at: msg.created_at,
                sender_id: msg.sender_id,
                receiver_id: msg.receiver_id,
                is_read: !!msg.is_read,
              };

              const existing = list[idx];
              const friendName = Array.isArray(existing.friend) ? existing.friend[0]?.full_name : existing.friend?.full_name;
              
              // Check if this message is already the latest (duplicate event)
              if (existing.latestMessage?.id === msg.id) {
                console.log('📋 [CHAT LIST] Duplicate message event, skipping:', msg.id);
                return list;
              }
              
              // CRITICAL: Use ref for unread counts (updates synchronously, avoids React batching)
              const friendId = otherUserId;
              
              // Initialize ref count from state if not set yet
              if (!unreadCountsRef.current.has(friendId)) {
                unreadCountsRef.current.set(friendId, existing.unreadCount || 0);
              }
              
              // Get current count from ref (always up-to-date)
              let currentCount = unreadCountsRef.current.get(friendId) || 0;
              let nextUnread = currentCount;
              
              if (iAmReceiver && !msg.is_read) {
                // Increment count in ref FIRST (synchronous)
                nextUnread = currentCount + 1;
                unreadCountsRef.current.set(friendId, nextUnread);
                // CRITICAL: Track that this was a realtime update with timestamp
                // This prevents fetchConversations from overwriting with stale DB data
                realtimeUpdateTimestamps.current.set(friendId, Date.now());
                console.log('📋 [CHAT LIST] I am RECEIVER - count in ref:', currentCount, '->', nextUnread, 'for', friendName);
              } else if (iAmSender) {
                console.log('📋 [CHAT LIST] I am SENDER - keeping unread at:', nextUnread, 'for', friendName);
              }

              const updatedConvo = {
                ...existing,
                latestMessage,
                unreadCount: nextUnread,
              };
              
              list[idx] = updatedConvo;
              
              console.log('📋 [CHAT LIST] Updated conversation:', {
                friend: friendName,
                newUnreadCount: updatedConvo.unreadCount,
                messagePreview: latestMessage.content?.substring(0, 20)
              });

              list.sort((a, b) => {
                const at = new Date(a.latestMessage?.created_at || 0).getTime();
                const bt = new Date(b.latestMessage?.created_at || 0).getTime();
                return bt - at;
              });
              
              // Log the final state
              console.log('📋 [CHAT LIST] Final conversations state:', list.map(c => ({
                friend: Array.isArray(c.friend) ? c.friend[0]?.full_name : c.friend?.full_name,
                unread: c.unreadCount
              })));
              return list;
            });

            // If conversation wasn't present, fetch the friend's profile and add it
            if (!conversationExists) {
              const { data: friend, error } = await supabase
                .from('profiles')
                .select('id, username, full_name, avatar_url')
                .eq('id', otherUserId)
                .single();
              if (!error && friend) {
                // Track unread in ref for new conversation
                let newConvoUnread = 0;
                if (iAmReceiver && !msg.is_read) {
                  unreadCountsRef.current.set(otherUserId, 1);
                  newConvoUnread = 1;
                }
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
                  unreadCount: newConvoUnread,
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
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'direct_messages',
          },
          (payload) => {
            const msg: any = payload.new;
            if (!msg) return;
            
            // Only process updates for messages I sent (read receipts)
            if (msg.sender_id !== user.id) return;
            
            console.log('🔄 [CHAT LIST] My message was read:', {
              messageId: msg.id,
              isRead: msg.is_read
            });

            setConversations((prev) => {
              const list = [...prev];
              const otherUserId = msg.receiver_id;
              const idx = list.findIndex((c) => {
                const f = Array.isArray(c.friend) ? c.friend[0] : c.friend;
                return f?.id === otherUserId;
              });

              if (idx !== -1 && list[idx].latestMessage?.id === msg.id) {
                list[idx] = {
                  ...list[idx],
                  latestMessage: {
                    ...list[idx].latestMessage!,
                    is_read: msg.is_read,
                  },
                };
              }
              return list;
            });
          }
        )
        .subscribe((status) => {
          console.log('📡 [CHAT LIST] Subscription status:', status);
        });

      // Subscribe to real-time updates for admin support messages (admins only)
      let supportMessageSub: any = null;
      if (isAdmin) {
        console.log('🔔 Setting up support messages subscription');
        supportMessageSub = supabase
          .channel('admin_conversations_changes')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'admin_conversations' },
            async (payload) => {
              console.log('📩 Support conversation update:', payload);
              // Refresh support conversations
              await fetchSupportConversations();
            }
          )
          .subscribe((status) => {
            console.log('📡 Support subscription status:', status);
          });
      } else {
        console.log('⏭️ Not admin, skipping support subscription');
      }

      // Subscribe to real-time updates for group messages
      const groupMessageSub = supabase
        .channel(`group_messages_${user.id}_${Date.now()}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'group_messages' },
          (payload) => {
            const msg: any = payload.new;
            if (!msg || !user) return;
            console.log('🔔 [CHAT LIST] Received group message:', {
              groupId: msg.group_id,
              senderId: msg.sender_id,
              messageId: msg.id
            });
            setGroups((prev) => {
              const idx = prev.findIndex((g) => g.group.id === msg.group_id);
              if (idx === -1) return prev; // not a group I belong to (or not loaded yet)
              const list = [...prev];
              const existing = list[idx];
              const isIncoming = msg.sender_id !== user.id;
              const alreadyRead = Array.isArray(msg.read_by) && msg.read_by.includes(user.id);
              const nextUnread = isIncoming && !alreadyRead ? (existing.unreadCount || 0) + 1 : existing.unreadCount || 0;
              console.log('📋 [CHAT LIST] Updating group:', {
                groupId: msg.group_id,
                isIncoming,
                previousUnread: existing.unreadCount || 0,
                nextUnread
              });
              list[idx] = { ...existing, lastMessage: msg, unreadCount: nextUnread };
              // Reorder by time desc
              list.sort((a, b) => new Date(b.lastMessage?.created_at || 0).getTime() - new Date(a.lastMessage?.created_at || 0).getTime());
              return list;
            });
          }
        )
        .subscribe((status) => {
          console.log('📡 [CHAT LIST] Group messages subscription status:', status);
        });

      return () => {
        supabase.removeChannel(messageSubscription);
        supabase.removeChannel(groupMessageSub);
        if (supportMessageSub) supabase.removeChannel(supportMessageSub);
        // Cleanup typing channels
        try { typingChannelsRef.forEach((ch) => supabase.removeChannel(ch)); } catch {}
      };
    }
  }, [user]);

  // Fetch support conversations when admin status is confirmed
  useEffect(() => {
    if (isAdmin && user) {
      console.log('🔄 isAdmin changed to true, fetching support conversations');
      fetchSupportConversations();
    }
  }, [isAdmin, user]);

  // Subscribe to typing presence for top 5 most recent direct chats
  useEffect(() => {
    if (!user) return;
    // cleanup old channels
    try { typingChannelsRef.forEach((ch) => supabase.removeChannel(ch)); } catch {}
    typingChannelsRef.length = 0;
    const sorted = [...conversations].sort((a, b) => {
      const at = new Date(a.latestMessage?.created_at || 0).getTime();
      const bt = new Date(b.latestMessage?.created_at || 0).getTime();
      return bt - at;
    });
    const top = sorted.slice(0, 5);
    top.forEach((c) => {
      const f = Array.isArray(c.friend) ? c.friend[0] : c.friend;
      if (!f?.id) return;
      const conversationId = [user.id, f.id].sort().join('-');
      const channel = supabase.channel(`typing:${conversationId}`, { config: { presence: { key: user.id } } });
      channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const friendPresence = state[f.id];
        setTypingFriendIds((prev) => {
          const next = new Set(prev);
          if (friendPresence && (friendPresence[0] as any)?.typing) next.add(f.id); else next.delete(f.id);
          return next;
        });
      }).subscribe();
      typingChannelsRef.push(channel);
    });
    return () => {
      try { typingChannelsRef.forEach((ch) => supabase.removeChannel(ch)); } catch {}
      typingChannelsRef.length = 0;
    };
  }, [user, conversations.length]);

  const fetchSupportConversations = async () => {
    if (!user || !isAdmin) {
      console.log('⏭️ Skipping support conversations fetch - user:', !!user, 'isAdmin:', isAdmin);
      return;
    }
    try {
      console.log('📞 Fetching support conversations for admin:', user.id);
      
      // Fetch all admin conversations
      const { data: conversations, error: convError } = await supabase
        .from('admin_conversations')
        .select('*')
        .order('last_message_at', { ascending: false });

      if (convError) {
        console.error('❌ Error fetching support conversations:', convError);
        throw convError;
      }

      console.log('✅ Support conversations fetched:', conversations?.length || 0);

      // Fetch user profiles for all conversations
      const userIds = conversations?.map(c => c.user_id) || [];
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, role, is_admin')
        .in('id', userIds);

      if (profileError) {
        console.error('❌ Error fetching user profiles:', profileError);
        throw profileError;
      }

      console.log('📋 User profiles fetched:', profiles?.length || 0);

      // Create a map of user profiles for quick lookup
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Transform to match Conversation interface
      const supportConvos = (conversations || [])
        .map((conv: any) => {
          const userProfile = profileMap.get(conv.user_id);
          if (!userProfile) return null;

          return {
            friend: userProfile,
            latestMessage: {
              id: conv.id,
              content: conv.last_message || '',
              created_at: conv.last_message_at,
              sender_id: conv.user_id,
              receiver_id: user.id,
              is_read: conv.unread_admin_count === 0,
            },
            unreadCount: conv.unread_admin_count || 0,
            isSupportChat: true,
          };
        })
        .filter(Boolean);

      console.log('✅ Support conversations prepared:', supportConvos.length);
      setSupportConversations(supportConvos);
    } catch (error) {
      console.error('Error fetching support conversations:', error);
    }
  };

  const fetchConversations = async (showLoading = false) => {
    if (!user) return;
    try {
      console.log('🔄🔄🔄 [FETCH] fetchConversations called! showLoading:', showLoading);
      if (showLoading) setLoading(true);
      
      // CRITICAL: Record when this fetch started
      // Any realtime updates that happen AFTER this should NOT be overwritten
      const fetchStartTime = Date.now();
      lastFetchStartTime.current = fetchStartTime;
      
      const convos = await getConversationList(user.id);
      console.log('🔄 [FETCH] Got', convos.length, 'conversations from DB');
      
      // CRITICAL: Merge DB data with any realtime updates that happened during the fetch
      // If a realtime update happened AFTER fetchStartTime, preserve that count instead of DB count
      convos.forEach(c => {
        const friend = Array.isArray(c.friend) ? c.friend[0] : c.friend;
        const friendId = (friend as any)?.id;
        const name = (friend as any)?.full_name;
        if (friendId) {
          const realtimeUpdateTime = realtimeUpdateTimestamps.current.get(friendId);
          
          if (realtimeUpdateTime && realtimeUpdateTime > fetchStartTime) {
            // A realtime update happened AFTER this fetch started
            // Keep the realtime count (from ref) instead of overwriting with DB count
            const realtimeCount = unreadCountsRef.current.get(friendId) || 0;
            console.log('🔄 [FETCH] PRESERVING realtime count for', name, ':', realtimeCount, '(DB had:', c.unreadCount, ')');
            c.unreadCount = realtimeCount;
          } else {
            // No recent realtime update, use DB count and sync to ref
            unreadCountsRef.current.set(friendId, c.unreadCount || 0);
            console.log('🔄 [FETCH] Using DB count for', name, ':', c.unreadCount);
          }
        }
      });
      
      // Clear old realtime timestamps (older than 10 seconds) to prevent memory leak
      const now = Date.now();
      realtimeUpdateTimestamps.current.forEach((timestamp, friendId) => {
        if (now - timestamp > 10000) {
          realtimeUpdateTimestamps.current.delete(friendId);
        }
      });
      
      setConversations(convos);
      
      // Cache conversations for instant loading next time
      if (convos.length > 0) {
        cacheData(CACHE_KEYS.conversations(user.id), convos, { expiryMinutes: 5 });
      }
  // After loading conversations, refresh typing subscriptions
  // handled by effect watching conversations.length
    } catch (error) {
      console.error('Error fetching conversations:', error);
      // Only show alert if no cached data available
      if (conversations.length === 0) {
        Alert.alert('Error', 'Failed to load conversations');
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const loadPinnedSettings = async () => {
    if (!user) return;
    try {
      const settings = await getSettingsForUser(user.id);
      const pDirect = new Set<string>();
      const pGroup = new Set<string>();
      settings.forEach((s) => {
        if (s.pinned) {
          if (s.peer_user_id) pDirect.add(s.peer_user_id);
          if (s.group_id) pGroup.add(s.group_id);
        }
      });
      setPinnedDirectIds(pDirect);
      setPinnedGroupIds(pGroup);
    } catch (e) {
      console.log('Failed to load chat settings', e);
    }
  };

  const onPinToggle = async (kind: 'direct' | 'group', id: string, willPin: boolean) => {
    if (!user) return;
    try {
      await pinChat(user.id, kind === 'direct' ? { peerUserId: id } : { groupId: id }, willPin);
      if (kind === 'direct') {
        setPinnedDirectIds((prev) => {
          const next = new Set(prev);
          if (willPin) next.add(id); else next.delete(id);
          return next;
        });
      } else {
        setPinnedGroupIds((prev) => {
          const next = new Set(prev);
          if (willPin) next.add(id); else next.delete(id);
          return next;
        });
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to update pin');
    } finally {
      setActionSheet(null);
    }
  };

  const onMarkRead = async (kind: 'direct' | 'group', id: string) => {
    if (!user) return;
    try {
      if (kind === 'direct') {
        await markDirectConversationRead(user.id, id);
        // Clear the unread count in ref
        unreadCountsRef.current.set(id, 0);
        setConversations((prev) => prev.map((c) => {
          const f = Array.isArray(c.friend) ? c.friend[0] : c.friend;
          if (f?.id === id) return { ...c, unreadCount: 0 } as Conversation;
          return c;
        }));
      } else {
        await markGroupConversationRead(id, user.id);
        setGroups((prev) => prev.map((g) => g.group.id === id ? { ...g, unreadCount: 0 } : g));
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to mark as read');
    } finally {
      setActionSheet(null);
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

  const onRefresh = async () => {
    if (!user) return;
    try {
      setRefreshing(true);
      const promises = [fetchConversations(false), fetchGroups(false)];
      if (isAdmin) {
        promises.push(fetchSupportConversations());
      }
      await Promise.all(promises);
    } finally {
      setRefreshing(false);
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
      
      // Fetch circle group IDs to identify which groups are circle chats
      const groupIds = groupList.map((g: any) => g.id);
      const { data: circleGroups } = await supabase
        .from('circles')
        .select('group_chat_id')
        .in('group_chat_id', groupIds);
      const circleGroupIds = new Set((circleGroups || []).map((c: any) => c.group_chat_id));
      
      // Compose base items with isCircle flag
      const base: GroupItem[] = groupList.map((g: any) => ({ 
        group: { id: g.id, name: g.name, avatar_url: g.avatar_url }, 
        lastMessage: null, 
        unreadCount: 0,
        isCircle: circleGroupIds.has(g.id)
      }));
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
      
      // Cache groups for instant loading next time
      if (base.length > 0) {
        cacheData(CACHE_KEYS.groups(user.id), base, { expiryMinutes: 5 });
      }
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
      debouncedRouter.push(`/chat/direct/${otherUserId}`);
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

  // Prevent double-tap navigation (WhatsApp-style)
  const navigateToChat = (type: 'direct' | 'group', id: string) => {
    // Check if already navigating to this chat
    if (navigationLock.has(id)) {
      console.log('🚫 Navigation blocked - already navigating to:', id);
      return;
    }

    // Lock this chat ID
    setNavigationLock(prev => new Set(prev).add(id));
    console.log('✅ Navigating to chat:', id);

    // IMMEDIATELY clear unread count in UI before navigation (Telegram-style)
    if (type === 'direct') {
      // Clear the unread count in ref
      unreadCountsRef.current.set(id, 0);
      setConversations((prev) => prev.map((c) => {
        const f = Array.isArray(c.friend) ? c.friend[0] : c.friend;
        if (f?.id === id) {
          console.log('📋 Clearing unread count for:', id);
          return { ...c, unreadCount: 0 };
        }
        return c;
      }));
      debouncedRouter.push(`/chat/direct/${id}`);
    } else {
      setGroups((prev) => prev.map((g) => g.group.id === id ? { ...g, unreadCount: 0 } : g));
      debouncedRouter.push(`/chat/group/${id}`);
    }

    // Unlock after 500ms (enough time for navigation)
    setTimeout(() => {
      setNavigationLock(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 500);
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
      {/* Full Screen Refresh Overlay */}
      {refreshing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0F172A" />
        </View>
      )}

      {loading ? (
        <ScrollView style={styles.chatList} contentContainerStyle={{ paddingTop: 12 }}>
          {[...Array(6)].map((_, i) => (
            <View key={i} style={styles.skeletonItem}>
              <View style={styles.skeletonAvatar} />
              <View style={styles.skeletonMeta}>
                <View style={styles.skeletonLinePrimary} />
                <View style={styles.skeletonLineSecondary} />
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <ScrollView 
          style={styles.chatList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor="#0EA5E9"
              colors={['#0EA5E9']}
            />
          }
        >
          {/* FIX: Dark background filler for pull-to-refresh gap */}
          <View style={{ position: 'absolute', top: -1000, left: 0, right: 0, height: 1000, backgroundColor: HEADER_COLOR }} />

          {/* Header inside ScrollView */}
          <View style={[styles.header, { paddingTop: insets.top + 16, marginTop: -200, paddingTop: insets.top + 216 }]}>
            <View style={styles.headerTop}>
              <Text style={styles.title}>Chats</Text>
              <View style={styles.headerActions}>
                <TouchableOpacity 
                  style={styles.iconButton}
                  onPress={() => setNewMenuVisible(true)}
                >
                  <Plus size={22} color="#FFFFFF" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.searchInputContainer}
                onPress={() => {
                  setSearchModalVisible(true);
                  // focus happens inside modal
                }}
              >
                <Search size={18} color="rgba(255,255,255,0.6)" strokeWidth={2.5} />
                <Text style={[styles.searchInput, { paddingVertical: 12, color: 'rgba(255,255,255,0.6)' }]}>Search chats…</Text>
              </TouchableOpacity>
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterTabs}>
              <TouchableOpacity
                style={[
                  styles.filterTab,
                  selectedTab === 'direct' && styles.filterTabActive
                ]}
                onPress={() => setSelectedTab('direct')}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.filterTabText,
                  selectedTab === 'direct' && styles.filterTabTextActive
                ]}>
                  Direct {conversations.length > 0 && `(${conversations.length})`}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterTab,
                  selectedTab === 'groups' && styles.filterTabActive
                ]}
                onPress={() => setSelectedTab('groups')}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.filterTabText,
                  selectedTab === 'groups' && styles.filterTabTextActive
                ]}>
                  Groups {groups.length > 0 && `(${groups.length})`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {conversations.length === 0 && groups.length === 0 && supportConversations.length === 0 ? (
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
                onPress={() => debouncedRouter.push('/friends')}
              >
                <UserPlus size={18} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.emptyActionText}>Find Friends</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Support Messages Section (Admin Only) */}
              {isAdmin && supportConversations.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>CUSTOMER SUPPORT</Text>
                  {supportConversations.map((conversation) => {
                    const friend = Array.isArray(conversation.friend) 
                      ? conversation.friend[0] 
                      : conversation.friend;
                    return (
                      <TouchableOpacity 
                        key={`support-${friend?.id}`} 
                        style={[styles.chatItem, { backgroundColor: '#FEF3C7' }]}
                        onPress={() => {
                          if (navigationLock.has(`support-${friend?.id}`)) return;
                          setNavigationLock(prev => new Set(prev).add(`support-${friend?.id}`));
                          debouncedRouter.push(`/admin/messages/${friend?.id}`);
                          setTimeout(() => {
                            setNavigationLock(prev => {
                              const next = new Set(prev);
                              next.delete(`support-${friend?.id}`);
                              return next;
                            });
                          }, 500);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.avatarContainer}>
                          <View style={[styles.avatar, { backgroundColor: '#FCD34D', justifyContent: 'center', alignItems: 'center' }]}>
                            <Text style={{ fontSize: 24, fontFamily: 'Inter-Bold', color: '#92400E' }}>
                              {(getDisplayName(friend) || 'U')[0].toUpperCase()}
                            </Text>
                          </View>
                          <View style={[styles.onlineIndicator, { backgroundColor: '#F59E0B' }]} />
                        </View>
                        <View style={styles.chatInfo}>
                          <View style={styles.chatHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                              <Text style={styles.chatName} numberOfLines={1}>
                                {getDisplayName(friend) || 'Unknown User'}
                              </Text>
                              <View style={[styles.adminBadge, { backgroundColor: '#F59E0B', marginLeft: 8 }]}>
                                <Text style={styles.adminBadgeText}>Support</Text>
                              </View>
                            </View>
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
                              {conversation.latestMessage?.content || 'New support request'}
                            </Text>
                            {conversation.unreadCount > 0 && (
                              <View style={[styles.unreadDot, { backgroundColor: '#F59E0B' }]} />
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Direct Messages Section with Pinned - only show on 'direct' tab */}
              {selectedTab === 'direct' && conversations.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>DIRECT MESSAGES</Text>
                  {(() => {
                    const withFriend = (c: Conversation) => Array.isArray(c.friend) ? c.friend[0] : c.friend;
                    const pinned = conversations.filter((c) => pinnedDirectIds.has(withFriend(c)?.id));
                    const others = conversations.filter((c) => !pinnedDirectIds.has(withFriend(c)?.id));
                    const renderRow = (conversation: Conversation) => {
                      const friend = Array.isArray(conversation.friend) 
                        ? conversation.friend[0] 
                        : conversation.friend;
                      const isTyping = typingFriendIds.has(friend?.id);
                      const isPinned = pinnedDirectIds.has(friend?.id);
                      return (
                        <TouchableOpacity 
                          key={friend?.id} 
                          style={styles.chatItem}
                          onPress={() => navigateToChat('direct', friend?.id)}
                          onLongPress={() => setActionSheet({ type: 'direct', friendId: friend?.id, unreadCount: conversation.unreadCount, pinned: isPinned })}
                          activeOpacity={0.7}
                        >
                          <View style={styles.avatarContainer}>
                            <Image 
                              source={{ 
                                uri: friend?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=60' 
                              }} 
                              style={styles.avatar} 
                            />
                          </View>
                          <View style={styles.chatInfo}>
                            <View style={styles.chatHeader}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                <Text style={styles.chatName} numberOfLines={1}>
                                  {getDisplayName(friend) || 'Unknown'}{isPinned ? '  •  Pinned' : ''}
                                </Text>
                                {(friend as any)?.is_admin && (
                                  <View style={styles.adminBadge}>
                                    <Text style={styles.adminBadgeText}>Admin</Text>
                                  </View>
                                )}
                              </View>
                              {conversation.latestMessage && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <Text style={styles.chatTime}>
                                    {formatTime(conversation.latestMessage.created_at)}
                                  </Text>
                                  {/* Outgoing status ticks (approximate): show only for my last message */}
                                  {conversation.latestMessage.sender_id === user.id && (
                                    conversation.latestMessage.is_read ? (
                                      <CheckCheck size={14} color="#94A3B8" />
                                    ) : (
                                      <Check size={14} color="#94A3B8" />
                                    )
                                  )}
                                </View>
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
                                {isTyping ? 'Typing…' : (conversation.latestMessage 
                                  ? getMessagePreview(conversation.latestMessage)
                                  : 'Tap to start chatting')}
                              </Text>
                              {conversation.unreadCount > 0 && (
                                <View style={styles.unreadDot} />
                              )}
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    };
                    return (
                      <>
                        {pinned.length > 0 && (
                          <View style={{ marginBottom: 4 }}>
                            {pinned.map(renderRow)}
                          </View>
                        )}
                        {others.map(renderRow)}
                      </>
                    );
                  })()}
                </View>
              )}

              {/* Groups Section with Pinned - only show on 'groups' tab */}
              {selectedTab === 'groups' && groups.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>GROUPS</Text>
                  {groupsLoading ? (
                    <View style={styles.sectionLoading}>
                      <Text style={styles.loadingText}>Loading groups...</Text>
                    </View>
                  ) : (
                    (() => {
                      const pinned = groups.filter((g) => pinnedGroupIds.has(g.group.id));
                      const others = groups.filter((g) => !pinnedGroupIds.has(g.group.id));
                      const renderRow = (g: GroupItem) => {
                        const isPinned = pinnedGroupIds.has(g.group.id);
                        const isCircleChat = g.isCircle;
                        return (
                          <TouchableOpacity 
                            key={g.group.id} 
                            style={styles.chatItem} 
                            onPress={() => navigateToChat('group', g.group.id)}
                            onLongPress={() => setActionSheet({ type: 'group', groupId: g.group.id, unreadCount: g.unreadCount, pinned: isPinned })}
                            activeOpacity={0.7}
                          >
                            <View style={styles.avatarContainer}>
                              <Image 
                                source={{ 
                                  uri: g.group.avatar_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=60' 
                                }} 
                                style={styles.avatar} 
                              />
                              <View style={[styles.groupBadge, isCircleChat && styles.circleBadge]}>
                                {isCircleChat ? (
                                  <Circle size={14} color="#FFFFFF" strokeWidth={2.5} fill="#FFFFFF" />
                                ) : (
                                  <Users size={14} color="#FFFFFF" strokeWidth={2.5} />
                                )}
                              </View>
                            </View>
                            <View style={styles.chatInfo}>
                              <View style={styles.chatHeader}>
                                <Text style={styles.chatName} numberOfLines={1}>
                                  {g.group.name}{isPinned ? '  •  Pinned' : ''}
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
                                  <View style={styles.unreadDot} />
                                )}
                              </View>
                            </View>
                          </TouchableOpacity>
                        );
                      };
                      return (
                        <>
                          {pinned.length > 0 && (
                            <View style={{ marginBottom: 4 }}>
                              {pinned.map(renderRow)}
                            </View>
                          )}
                          {others.map(renderRow)}
                        </>
                      );
                    })()
                  )}
                </View>
              )}

              {/* Empty state for Direct tab */}
              {selectedTab === 'direct' && conversations.length === 0 && !loading && (
                <View style={styles.tabEmptyState}>
                  <MessageCircle size={48} color="#CBD5E1" strokeWidth={1.5} />
                  <Text style={styles.tabEmptyTitle}>No direct messages</Text>
                  <Text style={styles.tabEmptyText}>Start a conversation with friends</Text>
                </View>
              )}

              {/* Empty state for Groups tab */}
              {selectedTab === 'groups' && groups.length === 0 && !groupsLoading && (
                <View style={styles.tabEmptyState}>
                  <Users size={48} color="#CBD5E1" strokeWidth={1.5} />
                  <Text style={styles.tabEmptyTitle}>No groups yet</Text>
                  <Text style={styles.tabEmptyText}>Join or create a group to chat</Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* Action Sheet */}
      <Modal
        visible={!!actionSheet}
        animationType="fade"
        transparent
        onRequestClose={() => setActionSheet(null)}
      >
        <View style={styles.sheetOverlay}>
          <View style={styles.sheetContainer}>
            <Text style={styles.sheetTitle}>Chat actions</Text>
            {!!actionSheet && (
              <>
                <TouchableOpacity
                  style={styles.sheetAction}
                  onPress={() =>
                    onPinToggle(
                      actionSheet.type,
                      actionSheet.type === 'direct' ? actionSheet.friendId : actionSheet.groupId,
                      !actionSheet.pinned
                    )
                  }
                >
                  <Text style={styles.sheetActionText}>{actionSheet.pinned ? 'Unpin' : 'Pin'} conversation</Text>
                </TouchableOpacity>
                {actionSheet.unreadCount > 0 && (
                  <TouchableOpacity
                    style={styles.sheetAction}
                    onPress={() =>
                      onMarkRead(
                        actionSheet.type,
                        actionSheet.type === 'direct' ? actionSheet.friendId : actionSheet.groupId
                      )
                    }
                  >
                    <Text style={styles.sheetActionText}>Mark as read</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.sheetAction, styles.sheetCancel]} onPress={() => setActionSheet(null)}>
                  <Text style={[styles.sheetActionText, { color: '#111827' }]}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

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
                  placeholder="Search by name..."
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.userName}>{getDisplayName(item) || 'Unknown'}</Text>
                      {(item as any)?.is_admin && (
                        <View style={styles.adminBadge}>
                          <Text style={styles.adminBadgeText}>Admin</Text>
                        </View>
                      )}
                    </View>
                    {!!formatProfileSubtitle(item) && (
                      <Text style={styles.userUsername}>{formatProfileSubtitle(item)}</Text>
                    )}
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

      {/* New Chat Menu Modal */}
      <Modal
        animationType="fade"
        transparent
        visible={newMenuVisible}
        onRequestClose={() => setNewMenuVisible(false)}
      >
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setNewMenuVisible(false)} />
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>New Chat</Text>
            
            <TouchableOpacity 
              style={styles.sheetAction}
              onPress={() => {
                setNewMenuVisible(false);
                debouncedRouter.push('/friends');
              }}
            >
              <UserPlus size={20} color="#0F172A" strokeWidth={2} />
              <View style={styles.sheetActionContent}>
                <Text style={styles.sheetActionText}>New Direct Message</Text>
                <Text style={styles.sheetActionSubtext}>Start a conversation with a friend</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.sheetAction}
              onPress={() => {
                setNewMenuVisible(false);
                debouncedRouter.push('/create-group');
              }}
            >
              <Users size={20} color="#0F172A" strokeWidth={2} />
              <View style={styles.sheetActionContent}>
                <Text style={styles.sheetActionText}>Create Group</Text>
                <Text style={styles.sheetActionSubtext}>Start a group conversation</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.sheetAction, styles.sheetCancel]} 
              onPress={() => setNewMenuVisible(false)}
            >
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
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
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: HEADER_COLOR,
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  searchContainer: {
    marginTop: 4,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
  },
  filterTabs: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  filterTab: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  filterTabActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  filterTabText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: '#0F172A',
  },
  tabEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  tabEmptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginTop: 16,
    fontWeight: '600',
  },
  tabEmptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
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
  skeletonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    marginBottom: 1,
  },
  skeletonAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E5E7EB',
    marginRight: 14,
  },
  skeletonMeta: {
    flex: 1,
    gap: 10,
  },
  skeletonLinePrimary: {
    width: '50%',
    height: 16,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  skeletonLineSecondary: {
    width: '80%',
    height: 12,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
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
  circleBadge: {
    backgroundColor: '#8B5CF6',
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
  unreadDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0F172A',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 2,
    elevation: 2,
  },
  unreadCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '700',
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  sheetTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 8,
  },
  sheetAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sheetActionContent: {
    flex: 1,
  },
  sheetActionText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    marginBottom: 2,
  },
  sheetActionSubtext: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  sheetCancel: {
    borderBottomWidth: 0,
    justifyContent: 'center',
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
  adminBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#EEF6FF',
    borderWidth: 1,
    borderColor: '#CDE3FF',
    marginLeft: 6,
  },
  adminBadgeText: {
    color: '#0A84FF',
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
  },
});