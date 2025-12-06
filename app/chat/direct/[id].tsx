import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Alert,
  Pressable,
  Animated,
  Linking,
  Keyboard,
} from 'react-native';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import * as Sentry from '@sentry/react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Send, Smile, X, Play, Pause, Check, CheckCheck, FileText, Paperclip, Camera, Image as ImageIcon, File } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import CachedImage from '@/components/CachedImage';
import {
  getDirectMessages,
  sendDirectMessage,
  markMessageAsRead,
  markMessageAsDelivered,
  subscribeToDirectMessages,
  getFriends,
  type DirectMessage,
} from '@/lib/friends';
import { startRecording, stopRecording, cancelRecording, pickMedia, takeMedia, pickDocument, uploadMedia, uploadDocument } from '@/lib/media';
import { formatMessageTime } from '@/lib/timeUtils';
import { supabase } from '@/lib/supabase';
import EmojiSelector from 'react-native-emoji-selector';
import { Audio } from 'expo-av';
import { getCachedThread, setCachedThread, upsertMessageList } from '@/lib/chatCache';

// Cache freshness threshold (5 minutes) - WhatsApp-style
const CACHE_FRESHNESS_MS = 5 * 60 * 1000;

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
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); // WhatsApp-style progress
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [playingSound, setPlayingSound] = useState<{ [key: string]: boolean }>({});
  const [firstUnreadIndex, setFirstUnreadIndex] = useState<number | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [failedMessages, setFailedMessages] = useState<Set<string>>(new Set());
  const flatListRef = useRef<FlatList>(null);
  const soundObjects = useRef<{ [key: string]: Audio.Sound }>({});
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingChannelRef = useRef<any>(null);
  const hasInitiallyScrolled = useRef(false); // Track if we've done initial scroll
  const isLoadingInitial = useRef(true); // Track if this is the first load

  // Safe scroll to bottom with error handling
  const safeScrollToBottom = useCallback(() => {
    try {
      requestAnimationFrame(() => {
        if (messages.length > 0 && flatListRef.current) {
          flatListRef.current.scrollToIndex({ 
            index: 0, 
            animated: true,
            viewPosition: 0
          });
          hasInitiallyScrolled.current = true;
        }
      });
    } catch (error) {
      console.warn('ScrollToIndex failed, using fallback:', error);
      try {
        flatListRef.current?.scrollToEnd({ animated: true });
      } catch (fallbackError) {
        console.error('Scroll fallback also failed:', fallbackError);
      }
    }
  }, [messages.length]);

  // Handle new real-time message
  const handleNewMessage = async (newMessage: DirectMessage) => {
    console.log('🔔 [REALTIME] Processing new message:', {
      id: newMessage.id,
      sender: newMessage.sender_id,
      receiver: newMessage.receiver_id,
      message: newMessage.message?.substring(0, 50),
      created_at: newMessage.created_at
    });
    
    // Fetch sender profile if not included
    let messageWithSender = newMessage;
    if (!newMessage.sender) {
      try {
        console.log('👤 [REALTIME] Fetching sender profile for:', newMessage.sender_id);
        const { data: senderProfile, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .eq('id', newMessage.sender_id)
          .single();
        
        if (!profileError && senderProfile) {
          messageWithSender = {
            ...newMessage,
            sender: senderProfile
          };
          console.log('✅ [REALTIME] Fetched sender profile:', senderProfile.full_name);
        } else {
          console.error('❌ [REALTIME] Error fetching sender profile:', profileError);
        }
      } catch (error) {
        console.error('❌ [REALTIME] Exception fetching sender profile:', error);
      }
    } else {
      console.log('✅ [REALTIME] Message already has sender profile:', newMessage.sender.full_name);
    }
    
    // If it's a shared post, fetch the post data
    let messageWithPost = messageWithSender;
    if (newMessage.message_type === 'post' && (newMessage as any).post_id) {
      try {
        const { data: post, error: postError } = await supabase
          .from('posts')
          .select(`
            id,
            content,
            image_url,
            image_urls,
            video_url,
            video_urls,
            user_id,
            created_at,
            profiles!posts_user_id_fkey(id, username, full_name, avatar_url)
          `)
          .eq('id', (newMessage as any).post_id)
          .single();
        
        if (postError) {
          console.error('Error fetching shared post in real-time:', postError);
        } else {
          messageWithPost = { ...newMessage, post };
          console.log('📬 Received shared post in real-time:', post?.content?.substring(0, 50));
        }
      } catch (error) {
        console.error('Error fetching shared post in real-time:', error);
      }
    }
    
    setMessages((prev) => {
      console.log('📝 [REALTIME] Current messages count:', prev.length);
      const next = upsertMessage(prev, messageWithPost);
      console.log('📝 [REALTIME] New messages count:', next.length);
      setCachedThread(user!.id, friendId!, next, friendProfile);
      return next;
    });

    // Mark as delivered if it's an INCOMING message (from friend to me)
    if (newMessage.sender_id === friendId && newMessage.receiver_id === user?.id) {
      console.log('📬 [REALTIME] Marking incoming message as delivered/read:', newMessage.id);
      try {
        await markMessageAsDelivered(newMessage.id);
        await markMessageAsRead(newMessage.id);
        console.log('✅ [REALTIME] Message marked as delivered and read');
      } catch (error) {
        console.error('❌ [REALTIME] Error marking message as read/delivered:', error);
      }
    } else {
      console.log('📤 [REALTIME] This is an outgoing message (me to friend) - not marking as read');
    }

    // Scroll to bottom
    setTimeout(() => {
      safeScrollToBottom();
    }, 100);
  };

  // Upsert a message into the array by id and keep it unique
  // Maintains descending order (newest first) for inverted FlatList
  const upsertMessage = useCallback((list: DirectMessage[], msg: DirectMessage) => {
    const map = new Map<string, DirectMessage>();
    for (const m of list) {
      map.set(m.id, m);
    }
    const existing = map.get(msg.id);
    map.set(msg.id, existing ? { ...existing, ...msg } : msg);
    const result = Array.from(map.values());
    // Sort newest first (descending) for inverted list
    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return result;
  }, []);

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  // Network state monitoring
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    const setupNetworkListener = async () => {
      try {
        const NetInfo = await import('@react-native-community/netinfo');
        unsubscribe = NetInfo.default.addEventListener(state => {
          const online = state.isConnected ?? true;
          setIsOnline(online);
          if (online) {
            console.log('✅ [NETWORK] Back online');
          } else {
            console.log('⚠️ [NETWORK] Offline');
          }
        });
      } catch (error) {
        console.log('⚠️ NetInfo not available, assuming online');
        setIsOnline(true);
      }
    };
    
    setupNetworkListener();
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user && friendId) {
      // WhatsApp-style instant loading: Show cache immediately, sync in background
      (async () => {
        const cached = await getCachedThread(user.id, friendId);
        
        if (cached?.messages?.length) {
          // Show cached messages INSTANTLY (no loading spinner)
          console.log('\u2705 [CACHE] Showing cached messages:', cached.messages.length);
          setMessages(cached.messages);
          setLoading(false);
          isLoadingInitial.current = false; // Initial load complete - don't auto-scroll
          
          // Check if cache is fresh (< 5 minutes old)
          const cacheAge = Date.now() - new Date(cached.updatedAt || 0).getTime();
          const isCacheFresh = cacheAge < CACHE_FRESHNESS_MS;
          
          console.log('\ud83d\udd52 [CACHE] Age:', Math.floor(cacheAge / 1000), 'seconds, Fresh:', isCacheFresh);
          
          if (isCacheFresh) {
            // Cache is fresh! No need to fetch
            console.log('\u2705 [CACHE] Cache is fresh, skipping cloud fetch');
          } else {
            // Cache is stale, silently refresh in background
            console.log('\ud83d\udd04 [CACHE] Cache is stale, refreshing in background...');
            loadMessages(true); // skipSpinner = true
          }
        } else {
          // No cache: show loading and fetch from cloud
          console.log('\u26a0\ufe0f [CACHE] No cache found, fetching from cloud...');
          setLoading(true);
          loadMessages(false);
        }
      })();
      
      loadFriendProfile();
      setupTypingIndicator();

      // Subscribe to real-time messages with optimistic updates
      const conversationId = [user.id, friendId].sort().join('-');
      console.log('📡 [REALTIME] Setting up subscription for conversation:', conversationId);
      console.log('📡 [REALTIME] User ID:', user.id, 'Friend ID:', friendId);
      
      const messageChannel = supabase
        .channel(`chat:${conversationId}:${Date.now()}`) // Add timestamp to ensure unique channel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'direct_messages',
          },
          async (payload) => {
            const newMessage = payload.new as DirectMessage;
            // Only process messages in this conversation
            if (
              (newMessage.sender_id === user.id && newMessage.receiver_id === friendId) ||
              (newMessage.sender_id === friendId && newMessage.receiver_id === user.id)
            ) {
              console.log('📨 [REALTIME] Received INSERT event:', {
                from: newMessage.sender_id === user.id ? 'me' : 'friend',
                id: newMessage.id,
                message: newMessage.message?.substring(0, 30)
              });
              await handleNewMessage(newMessage);
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
            console.log('🔄 [REALTIME] Received UPDATE event:', payload.new);
            const updatedMessage = payload.new as DirectMessage;
            // Accept updates for either direction (read/delivered changes)
            setMessages((prev) => {
              const next = prev.map((m) => (m.id === updatedMessage.id ? { ...m, ...updatedMessage } : m));
              // Persist update to cache
              setCachedThread(user.id, friendId, next, friendProfile);
              return next;
            });
          }
        )
        .subscribe((status) => {
          console.log('📡 [REALTIME] Subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ [REALTIME] Successfully subscribed to messages');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ [REALTIME] Subscription error');
          }
        });

      return () => {
        supabase.removeChannel(messageChannel);
        // Cleanup typing channel
        if (typingChannelRef.current) {
          supabase.removeChannel(typingChannelRef.current);
        }
        // Cleanup audio
        Object.values(soundObjects.current).forEach(async (sound) => {
          try {
            await sound.stopAsync();
            await sound.unloadAsync();
          } catch (e) {
            console.log('Error cleaning up sound:', e);
          }
        });
      };
    }
  }, [user, friendId]);

  const loadMessages = async (skipSpinner = false) => {
    if (!user || !friendId) return;

    try {
      // Only show loading spinner if skipSpinner is false (no cache)
      if (!skipSpinner) {
        console.log('\ud83d\udd04 [FETCH] Fetching messages with loading spinner...');
        setLoading(true);
      } else {
        console.log('\ud83d\udd04 [FETCH] Silent background refresh (cache was stale)...');
      }
      
      // Get messages with shared post data (Instagram-style)
      console.log('📥 [FETCH] Fetching messages from database...');
      const msgs = await getDirectMessages(user.id, friendId);
      console.log('📥 [FETCH] Retrieved', msgs.length, 'messages from database');
      
      // Fetch shared posts for messages with post_id
      const messagesWithPosts = await Promise.all(
        msgs.map(async (msg) => {
          if (msg.message_type === 'post' && (msg as any).post_id) {
            try {
              const { data: post, error: postError } = await supabase
                .from('posts')
                .select(`
                  id,
                  content,
                  image_url,
                  image_urls,
                  video_url,
                  video_urls,
                  user_id,
                  created_at,
                  profiles!posts_user_id_fkey(id, username, full_name, avatar_url)
                `)
                .eq('id', (msg as any).post_id)
                .single();
              
              if (postError) {
                console.error('Error fetching shared post:', postError);
                return msg;
              }
              
              console.log('📦 Loaded shared post:', post?.content?.substring(0, 50));
              return { ...msg, post };
            } catch (error) {
              console.error('Error fetching shared post:', error);
              return msg;
            }
          }
          return msg;
        })
      );
      
      // Determine first unread index before marking as read
      const idx = messagesWithPosts.findIndex((m) => m.receiver_id === user.id && !m.is_read);
      setFirstUnreadIndex(idx >= 0 ? idx : null);
      setMessages(messagesWithPosts);
      // Persist to cache
      setCachedThread(user.id, friendId, messagesWithPosts, friendProfile);

      // Mark unread messages as read
      const unreadMessages = messagesWithPosts.filter(
        (m) => m.receiver_id === user.id && !m.is_read
      );
      if (unreadMessages.length > 0) {
        console.log('✅ [FETCH] Marking', unreadMessages.length, 'messages as read');
        await Promise.all(unreadMessages.map((m) => markMessageAsRead(m.id)));
      }
      
      // Mark all as delivered
      const undeliveredMessages = messagesWithPosts.filter(
        (m) => m.receiver_id === user.id && !m.delivered_at
      );
      if (undeliveredMessages.length > 0) {
        console.log('📬 [FETCH] Marking', undeliveredMessages.length, 'messages as delivered');
        await Promise.all(undeliveredMessages.map((m) => markMessageAsDelivered(m.id)));
      }
      
      console.log('\u2705 [FETCH] Messages loaded and cached:', messagesWithPosts.length);
    } catch (error) {
      console.error('\u274c [FETCH] Error loading messages:', error);
    } finally {
      // Always hide spinner when done (whether it was showing or not)
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

  const navigateToPost = (postId: string) => {
    debouncedRouter.push(`/post/${postId}`);
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

    console.log('📤 [SEND] Starting to send message...');
    console.log('📤 [SEND] User:', user.id, 'Friend:', friendId);

    // Check network status
    if (!isOnline) {
      Alert.alert('No Connection', 'Please check your internet connection and try again.');
      return;
    }

    const messageToSend = messageText.trim();
    const tempId = `temp-${Date.now()}`;
    console.log('📤 [SEND] Temp ID:', tempId);

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

      console.log('📤 [SEND] Adding optimistic message to UI');
      setMessages((prev) => {
        console.log('📤 [SEND] Current messages:', prev.length);
        const next = upsertMessage(prev, optimisticMessage);
        console.log('📤 [SEND] New messages after optimistic:', next.length);
        setCachedThread(user.id, friendId, next, friendProfile);
        return next;
      });
      setMessageText('');
      setShowEmojiPicker(false);
      setSending(true);

      // Stop typing indicator
      if (typingChannelRef.current) {
        try {
          typingChannelRef.current.track({ typing: false, userId: user.id });
        } catch (e) {
          console.warn('Failed to stop typing indicator:', e);
        }
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Scroll to bottom when sending new message
      setTimeout(() => {
        safeScrollToBottom();
      }, 100);

      // Send to server
      console.log('📤 [SEND] Sending to server...');
      const newMessage = await sendDirectMessage(user.id, friendId, messageToSend);
      console.log('✅ [SEND] Server returned message:', newMessage.id);
      console.log('✅ [SEND] Message has sender?', !!newMessage.sender);

      // Replace optimistic message with real one
      console.log('📤 [SEND] Replacing optimistic message with real one');
      setMessages((prev) => {
        console.log('📤 [SEND] Messages before replace:', prev.length);
        const replaced = prev.map((m) => (m.id === tempId ? newMessage : m));
        const next = upsertMessageList(replaced, newMessage);
        console.log('📤 [SEND] Messages after replace:', next.length);
        setCachedThread(user.id, friendId, next, friendProfile);
        return next;
      });
      
      // Remove from failed messages if it was retried
      setFailedMessages(prev => {
        const next = new Set(prev);
        next.delete(tempId);
        return next;
      });
      
      console.log('✅ [SEND] Message sent successfully!');
    } catch (error) {
      console.error('❌ [SEND] Error sending message:', error);
      Sentry.captureException(error, {
        tags: { feature: 'chat', action: 'send-message' },
        contexts: { message: { friendId, messageLength: messageToSend.length } }
      });
      
      // Mark message as failed
      setFailedMessages(prev => new Set(prev).add(tempId));
      
      // Show retry option
      Alert.alert(
        'Message Failed',
        'Failed to send message. Please check your connection.',
        [
          { text: 'Delete', style: 'destructive', onPress: () => {
            setMessages((prev) => prev.filter((m) => m.id !== tempId));
            setFailedMessages(prev => {
              const next = new Set(prev);
              next.delete(tempId);
              return next;
            });
          }},
          { text: 'Retry', onPress: () => retryMessage(tempId, messageToSend) }
        ]
      );
    } finally {
      setSending(false);
    }
  };

  // Retry failed message
  const retryMessage = async (tempId: string, messageContent: string) => {
    if (!user || !friendId || !isOnline) {
      Alert.alert('No Connection', 'Please check your internet connection.');
      return;
    }

    try {
      setSending(true);
      const newMessage = await sendDirectMessage(user.id, friendId, messageContent);
      
      // Replace failed message with successful one
      setMessages((prev) => {
        const replaced = prev.map((m) => (m.id === tempId ? newMessage : m));
        const next = upsertMessageList(replaced, newMessage);
        setCachedThread(user.id, friendId, next, friendProfile);
        return next;
      });
      
      // Remove from failed messages
      setFailedMessages(prev => {
        const next = new Set(prev);
        next.delete(tempId);
        return next;
      });
    } catch (error) {
      console.error('Error retrying message:', error);
      Alert.alert('Retry Failed', 'Still unable to send message. Please try again later.');
    } finally {
      setSending(false);
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
          safeScrollToBottom();
        }, 100);
      }
    } catch (error) {
      console.error('Error sending voice message:', error);
      Alert.alert('Error', 'Failed to send voice message');
    }
  };

  const handleCancelRecording = async () => {
    await cancelRecording();
    setRecording(false);
  };

  const openImageViewer = (imageUrl: string) => {
    setSelectedImageUrl(imageUrl);
    setImageViewerVisible(true);
  };

  const closeImageViewer = () => {
    setImageViewerVisible(false);
    setSelectedImageUrl(null);
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

  // Media Handlers
  const handlePickPhotos = async () => {
    if (!user || !friendId) return;
    
    console.log('🖼️ [Photos] User tapped photos button');
    Sentry.addBreadcrumb({
      category: 'user-action',
      message: 'User tapped photos button in chat',
      level: 'info',
      data: { userId: user.id, friendId }
    });
    
    setShowAttachMenu(false);
    
    try {
      console.log('🖼️ [Photos] Calling pickMedia()...');
      const media = await pickMedia();
      
      console.log('🖼️ [Photos] pickMedia() returned:', media ? 'success' : 'cancelled');
      if (!media) {
        return;
      }

      setUploadingMedia(true);
      setUploadProgress(0);

      const mediaType = media.type === 'video' ? 'video' : 'image';
      const uploadedUrl = await uploadMedia(
        media.uri,
        user.id,
        mediaType,
        media.fileName,
        media.mimeType,
        (progress) => setUploadProgress(progress) // WhatsApp-style progress callback
      );

      if (uploadedUrl) {
        const message = mediaType === 'video' ? '📹 Video' : '📷 Photo';
        const newMessage = await sendDirectMessage(
          user.id,
          friendId,
          message,
          mediaType,
          uploadedUrl
        );
        
        setMessages((prev) => {
          const next = upsertMessage(prev, newMessage);
          setCachedThread(user.id, friendId, next, friendProfile);
          return next;
        });
        
        setTimeout(() => {
          safeScrollToBottom();
        }, 100);
      }
    } catch (error: any) {
      console.error('❌ [Photos] Error in handlePickPhotos:', error);
      Sentry.captureException(error, {
        tags: { feature: 'media-picker', action: 'pick-photos' },
        contexts: {
          media: {
            userId: user?.id,
            friendId,
            platform: Platform.OS,
            errorMessage: error?.message,
            timestamp: new Date().toISOString()
          }
        }
      });
      Alert.alert('Media Error', `Failed to pick media: ${error?.message || 'Unknown error'}`);
    } finally {
      setUploadingMedia(false);
      setUploadProgress(0);
    }
  };

  const handleTakeCamera = async () => {
    if (!user || !friendId) return;
    
    console.log('🎥 [Camera] User tapped camera button');
    Sentry.addBreadcrumb({
      category: 'user-action',
      message: 'User tapped camera button in chat',
      level: 'info',
      data: { userId: user.id, friendId }
    });
    
    // CRITICAL: Send error to Sentry BEFORE attempting camera (in case of freeze)
    Sentry.captureMessage('⚠️ CAMERA ATTEMPT STARTED - If you see this without a success message, app froze', {
      level: 'warning',
      tags: { 
        feature: 'camera',
        action: 'pre-launch',
        platform: Platform.OS,
        userId: user.id
      }
    });
    
    setShowAttachMenu(false);
    
    try {
      console.log('🎥 [Camera] Calling takeMedia()...');
      Sentry.addBreadcrumb({
        category: 'camera',
        message: 'About to launch camera - FREEZE DETECTION POINT',
        level: 'warning'
      });
      
      // Set a timeout to detect freeze (native crashes don't trigger catch)
      const freezeTimeout = setTimeout(() => {
        console.error('⏰ [Camera] CAMERA FREEZE DETECTED - App unresponsive for 5 seconds');
        Sentry.captureMessage('🚨 CAMERA FREEZE DETECTED - App became unresponsive after launching camera', {
          level: 'error',
          tags: { 
            feature: 'camera',
            issue: 'freeze',
            platform: Platform.OS 
          }
        });
      }, 5000); // 5 second timeout
      
      const media = await takeMedia();
      
      // If we get here, camera didn't freeze - clear timeout
      clearTimeout(freezeTimeout);
      
      // Success message
      Sentry.captureMessage('✅ CAMERA COMPLETED SUCCESSFULLY', {
        level: 'info',
        tags: { feature: 'camera', action: 'success' }
      });
      
      console.log('🎥 [Camera] takeMedia() returned:', media ? 'success' : 'cancelled');
      Sentry.addBreadcrumb({
        category: 'camera',
        message: media ? 'Camera returned media - NO FREEZE' : 'Camera cancelled by user',
        level: 'info'
      });
      
      if (!media) {
        console.log('🎥 [Camera] User cancelled, returning');
        return;
      }

      setUploadingMedia(true);
      setUploadProgress(0);

      const mediaType = media.type === 'video' ? 'video' : 'image';
      const uploadedUrl = await uploadMedia(
        media.uri,
        user.id,
        mediaType,
        media.fileName,
        media.mimeType,
        (progress) => setUploadProgress(progress) // WhatsApp-style progress callback
      );

      if (uploadedUrl) {
        const message = mediaType === 'video' ? '📹 Video' : '📷 Photo';
        const newMessage = await sendDirectMessage(
          user.id,
          friendId,
          message,
          mediaType,
          uploadedUrl
        );
        
        setMessages((prev) => {
          const next = upsertMessage(prev, newMessage);
          setCachedThread(user.id, friendId, next, friendProfile);
          return next;
        });
        
        setTimeout(() => {
          safeScrollToBottom();
        }, 100);
      }
    } catch (error) {
      console.error('❌ [Camera] Error in handleTakeCamera:', error);
      Sentry.captureException(error, {
        tags: { feature: 'camera', action: 'take-photo' },
        contexts: {
          camera: {
            userId: user?.id,
            friendId,
            platform: Platform.OS,
            timestamp: new Date().toISOString()
          }
        }
      });
      Alert.alert('Camera Error', 'Failed to open camera. Please try again.');
    } finally {
      setUploadingMedia(false);
      setUploadProgress(0);
    }
  };

  const handlePickDocument = async () => {
    if (!user || !friendId) return;
    
    console.log('📄 [Documents] User tapped documents button');
    Sentry.addBreadcrumb({
      category: 'user-action',
      message: 'User tapped documents button in chat',
      level: 'info',
      data: { userId: user.id, friendId }
    });
    
    setShowAttachMenu(false);
    
    try {
      console.log('📄 [Documents] Calling pickDocument()...');
      const doc = await pickDocument();
      
      console.log('📄 [Documents] pickDocument() returned:', doc ? 'success' : 'cancelled');
      if (!doc) {
        return;
      }

      setUploadingMedia(true);
      setUploadProgress(0);

      const uploadedUrl = await uploadDocument(
        doc.uri,
        user.id,
        doc.name,
        doc.mimeType,
        (progress) => setUploadProgress(progress) // WhatsApp-style progress callback
      );

      if (uploadedUrl) {
        const newMessage = await sendDirectMessage(
          user.id,
          friendId,
          `📄 ${doc.name}`,
          'document',
          uploadedUrl
        );
        
        setMessages((prev) => {
          const next = upsertMessage(prev, newMessage);
          setCachedThread(user.id, friendId, next, friendProfile);
          return next;
        });
        
        setTimeout(() => {
          safeScrollToBottom();
        }, 100);
      }
    } catch (error: any) {
      console.error('❌ [Documents] Error in handlePickDocument:', error);
      Sentry.captureException(error, {
        tags: { feature: 'document-picker', action: 'pick-document' },
        contexts: {
          document: {
            userId: user?.id,
            friendId,
            platform: Platform.OS,
            errorMessage: error?.message,
            timestamp: new Date().toISOString()
          }
        }
      });
      Alert.alert('Document Error', `Failed to pick document: ${error?.message || 'Unknown error'}`);
    } finally {
      setUploadingMedia(false);
      setUploadProgress(0);
    }
  };

  const renderMessage = ({ item, index }: { item: DirectMessage; index: number }) => {
    const isMyMessage = item.sender_id === user?.id;
    // With descending order (newest first), compare with NEXT message (index - 1 is NEWER)
    // Show divider if: first message OR different day than the message AFTER this one (index + 1 is OLDER)
    const showDateDivider = index === messages.length - 1 || !isSameDay(item.created_at, messages[index + 1]?.created_at);

    return (
      <>
        {/* New messages separator */}
        {firstUnreadIndex !== null && index === firstUnreadIndex && (
          <View style={styles.newMessagesDivider}>
            <View style={styles.newMessagesLine} />
            <Text style={styles.newMessagesText}>New messages</Text>
            <View style={styles.newMessagesLine} />
          </View>
        )}
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
          <View
            style={[
              styles.messageBubble,
              isMyMessage ? styles.myMessageBubble : styles.theirMessageBubble,
            ]}
          >
            {/* Image Message */}
            {item.message_type === 'image' && item.media_url && (
              <TouchableOpacity 
                activeOpacity={0.9}
                onPress={() => openImageViewer(item.media_url!)}
              >
                <CachedImage 
                  uri={item.media_url} 
                  style={styles.messageImage}
                  contentFit="cover"
                />
              </TouchableOpacity>
            )}

            {/* Video Message */}
            {item.message_type === 'video' && item.media_url && (
              <TouchableOpacity style={styles.videoContainer} activeOpacity={0.9}>
                <CachedImage 
                  uri={item.media_url} 
                  style={styles.messageImage}
                  contentFit="cover"
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

            {/* Document Message */}
            {item.message_type === 'document' && item.media_url && (
              <TouchableOpacity 
                style={styles.documentContainer}
                onPress={() => {
                  if (item.media_url) {
                    Linking.openURL(item.media_url).catch(err => {
                      console.error('Error opening document:', err);
                      Alert.alert('Error', 'Could not open document');
                    });
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={styles.documentIcon}>
                  <FileText size={24} color={isMyMessage ? '#FFFFFF' : '#4169E1'} />
                </View>
                <View style={styles.documentInfo}>
                  <Text 
                    style={[
                      styles.documentName,
                      { color: isMyMessage ? '#FFFFFF' : '#1F2937' }
                    ]}
                    numberOfLines={1}
                  >
                    {item.message?.replace('📄 ', '') || 'Document'}
                  </Text>
                  <Text 
                    style={[
                      styles.documentSize,
                      { color: isMyMessage ? 'rgba(255, 255, 255, 0.7)' : '#6B7280' }
                    ]}
                  >
                    Tap to open
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Shared Post (Instagram-style) */}
            {item.message_type === 'post' && (item as any).post && (
              <TouchableOpacity 
                style={styles.sharedPostCard}
                onPress={() => navigateToPost((item as any).post.id)}
                activeOpacity={0.8}
              >
                <View style={styles.sharedPostHeader}>
                  {(item as any).post.profiles?.avatar_url ? (
                    <CachedImage 
                      uri={(item as any).post.profiles.avatar_url} 
                      style={styles.sharedPostAvatar}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={[styles.sharedPostAvatar, styles.avatarPlaceholder]}>
                      <Text style={styles.sharedPostAvatarText}>
                        {(item as any).post.profiles?.full_name?.[0]?.toUpperCase() || 'U'}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.sharedPostUsername}>
                    {(item as any).post.profiles?.full_name || (item as any).post.profiles?.username || 'User'}
                  </Text>
                </View>
                
                {/* Show first image from image_urls array or single image_url */}
                {((item as any).post.image_urls?.[0] || (item as any).post.image_url) && (
                  <CachedImage 
                    uri={(item as any).post.image_urls?.[0] || (item as any).post.image_url} 
                    style={styles.sharedPostImage}
                    contentFit="cover"
                  />
                )}
                
                {/* Show content (not description) */}
                {(item as any).post.content && (
                  <Text style={styles.sharedPostDescription} numberOfLines={2}>
                    {(item as any).post.content}
                  </Text>
                )}
              </TouchableOpacity>
            )}

            {/* Text / Caption (only for text messages or non-empty captions) */}
            {(item.message_type === 'text' || (item.message_type !== 'voice' && item.message_type !== 'document' && item.message_type !== 'post' && item.message)) && (
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
                  {failedMessages.has(item.id) ? (
                    <TouchableOpacity 
                      onPress={() => retryMessage(item.id, item.message)}
                      style={styles.retryButton}
                    >
                      <Text style={styles.retryText}>⚠️ Tap to retry</Text>
                    </TouchableOpacity>
                  ) : item.read_at ? (
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

  // Don't block UI with loading spinner - show cache immediately
  // Loading state only used internally for fetch coordination
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#0F172A' }]} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#FFFFFF' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => {
            if (router.canGoBack()) {
              debouncedRouter.back();
            } else {
              debouncedRouter.push('/(tabs)/chat');
            }
          }} 
          style={styles.backButton}
        >
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.headerInfo}
          onPress={() => debouncedRouter.push(`/user-profile/${friendId}`)}
          activeOpacity={0.7}
        >
          <View style={styles.headerAvatarContainer}>
            {friendProfile?.avatar_url ? (
              <CachedImage uri={friendProfile.avatar_url} style={styles.headerAvatar} contentFit="cover" priority="high" />
            ) : (
              <View style={[styles.headerAvatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>
                  {friendProfile?.full_name?.[0]?.toUpperCase() || 'U'}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerName}>{friendProfile?.full_name || 'Friend'}</Text>
            {isTyping && (
              <View style={styles.typingContainer}>
                <Text style={styles.typingText}>typing</Text>
                <View style={styles.typingDots}>
                  <View style={[styles.typingDot, styles.typingDot1]} />
                  <View style={[styles.typingDot, styles.typingDot2]} />
                  <View style={[styles.typingDot, styles.typingDot3]} />
                </View>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Offline Banner */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>⚠️ No internet connection. Messages will be sent when online.</Text>
        </View>
      )}

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesContent}
        inverted={true}
        initialNumToRender={20}
        maxToRenderPerBatch={10}
        windowSize={10}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              Start a conversation with {friendProfile?.full_name}!
            </Text>
          </View>
        }
      />

      {/* Input Wrapper - ensures background color covers bottom area */}
      <View style={{ 
        backgroundColor: '#0F172A',
        paddingBottom: isKeyboardVisible ? (Platform.OS === 'android' ? 8 : 0) : (Platform.OS === 'android' ? 20 : 10)
      }}>
        <View style={[
          styles.inputContainer,
          { paddingBottom: isKeyboardVisible ? 12 : (Platform.OS === 'android' ? 16 : 16) }
        ]}>
          {/* Paperclip Attachment Button */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setShowAttachMenu(true)}
            activeOpacity={0.7}
          >
            <Paperclip size={22} color="#737373" />
          </TouchableOpacity>

          {/* Emoji Button */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setShowEmojiPicker(!showEmojiPicker)}
            activeOpacity={0.7}
          >
            <Smile size={22} color="#737373" />
          </TouchableOpacity>

          {/* Text Input */}
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#A3A3A3"
            value={messageText}
            onChangeText={(text) => {
              setMessageText(text);
              handleTyping();
            }}
            multiline
            maxLength={1000}
          />

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
      </View>

      {/* Attachment Menu Modal - WhatsApp Style */}
      <Modal
        visible={showAttachMenu}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowAttachMenu(false)}
      >
        <Pressable 
          style={styles.attachMenuOverlay}
          onPress={() => setShowAttachMenu(false)}
        >
          <View style={styles.attachMenuContainer}>
            {/* Camera Option */}
            <TouchableOpacity
              style={styles.attachOption}
              onPress={handleTakeCamera}
              activeOpacity={0.7}
            >
              <View style={[styles.attachIconCircle, { backgroundColor: '#FF6B9D' }]}>
                <Camera size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.attachOptionText}>Camera</Text>
            </TouchableOpacity>

            {/* Photos Option */}
            <TouchableOpacity
              style={styles.attachOption}
              onPress={handlePickPhotos}
              activeOpacity={0.7}
            >
              <View style={[styles.attachIconCircle, { backgroundColor: '#8B5CF6' }]}>
                <ImageIcon size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.attachOptionText}>Photos</Text>
            </TouchableOpacity>

            {/* Document Option */}
            <TouchableOpacity
              style={styles.attachOption}
              onPress={handlePickDocument}
              activeOpacity={0.7}
            >
              <View style={[styles.attachIconCircle, { backgroundColor: '#3B82F6' }]}>
                <File size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.attachOptionText}>Document</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* WhatsApp-Style Upload Progress */}
      {uploadingMedia && (
        <View style={styles.uploadingOverlay}>
          <View style={styles.uploadingContainer}>
            <View style={styles.progressCircleContainer}>
              <Text style={styles.uploadPercentage}>{Math.round(uploadProgress)}%</Text>
            </View>
            <Text style={styles.uploadingText}>
              {uploadProgress < 20 ? 'Preparing...' : uploadProgress < 95 ? 'Uploading...' : 'Finishing...'}
            </Text>
          </View>
        </View>
      )}

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
      
      {/* Full-Screen Image Viewer Modal */}
      <Modal
        visible={imageViewerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeImageViewer}
      >
        <View style={styles.imageViewerContainer}>
          <TouchableOpacity 
            style={styles.imageViewerCloseButton}
            onPress={closeImageViewer}
            activeOpacity={0.9}
          >
            <X size={28} color="#FFFFFF" strokeWidth={2} />
          </TouchableOpacity>
          
          <View style={styles.imageViewerContent}>
            {selectedImageUrl && (
              <CachedImage
                uri={selectedImageUrl}
                style={styles.fullScreenImage}
                contentFit="contain"
                priority="high"
              />
            )}
          </View>
        </View>
      </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderRadius: 18,
    backgroundColor: 'transparent',
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
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 0,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerHandle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 1,
    fontWeight: '400',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  typingText: {
    fontSize: 12,
    color: '#22C55E',
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
    backgroundColor: '#22C55E',
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
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  typingText: {
    fontSize: 12,
    color: '#22C55E',
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
    backgroundColor: '#22C55E',
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
  offlineBanner: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FCD34D',
  },
  offlineText: {
    fontSize: 13,
    color: '#92400E',
    textAlign: 'center',
    fontWeight: '500',
  },
  retryButton: {
    marginLeft: 4,
  },
  retryText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  messagesContent: {
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  dateDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 4,
  },
  newMessagesDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  newMessagesLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#F59E0B',
  },
  newMessagesText: {
    paddingHorizontal: 10,
    fontSize: 12,
    fontWeight: '700',
    color: '#F59E0B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E8E8E8',
  },
  dateDividerText: {
    paddingHorizontal: 14,
    fontSize: 12,
    fontWeight: '500',
    color: '#A3A3A3',
    letterSpacing: -0.1,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 10,
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
    borderWidth: 0,
  },
  avatarPlaceholder: {
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  myMessageBubble: {
    backgroundColor: '#0F172A',
    borderBottomRightRadius: 4,
  },
  theirMessageBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  theirMessageText: {
    color: '#1a1a1a',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 6,
    gap: 6,
  },
  messageTime: {
    fontSize: 11,
    fontWeight: '400',
    letterSpacing: 0,
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  theirMessageTime: {
    color: '#A3A3A3',
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
    paddingHorizontal: 14,
    paddingTop: 10,
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  recordingButton: {
    backgroundColor: '#FEE2E2',
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 100,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
    fontSize: 15,
    color: '#1a1a1a',
    borderWidth: 0,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
    shadowOpacity: 0,
  },
  messageImage: {
    width: 220,
    height: 220,
    borderRadius: 12,
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
  documentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    minWidth: 220,
  },
  documentIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentInfo: {
    flex: 1,
    gap: 2,
  },
  documentName: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  documentSize: {
    fontSize: 12,
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
  progressCircleContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#4F46E5',
  },
  uploadPercentage: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4F46E5',
  },
  uploadingText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  // Attachment Menu Styles (WhatsApp-style)
  attachMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  attachMenuContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 30,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  attachOption: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  attachOptionText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  // Image Viewer Modal Styles
  imageViewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerCloseButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
  },
  // Shared Post Card Styles (Instagram-style)
  sharedPostCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    marginBottom: 8,
    width: 260,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sharedPostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sharedPostAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 10,
  },
  sharedPostAvatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sharedPostUsername: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    fontWeight: '600',
  },
  sharedPostImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#F3F4F6',
  },
  sharedPostDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
});
