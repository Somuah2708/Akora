import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, FlatList, TextInput, TouchableOpacity, Image, Modal, Pressable, ActivityIndicator, StyleSheet, Linking, Alert, KeyboardAvoidingView, Platform, Keyboard } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../hooks/useAuth";
import dayjs from "dayjs";
import EmojiSelector from 'react-native-emoji-selector';
import { ArrowLeft, Send, Smile, X, Play, Pause, FileText, Camera, Paperclip, Image as ImageIcon, File } from 'lucide-react-native';
import { Audio } from 'expo-av';
import { pickMedia, takeMedia, pickDocument, uploadMedia, uploadDocument } from '../../../lib/media';

type Profile = { id: string; full_name?: string | null; avatar_url?: string | null };
type Group = { id: string; name: string; avatar_url?: string | null };
type GroupMember = { user_id: string; role: string; profiles?: Profile };
type GroupMessage = {
  id: string;
  group_id: string;
  sender_id: string;
  content: string | null;
  media_url: string | null;
  message_type: string;
  created_at: string;
  read_by: string[];
};

export default function GroupChatScreen() {
  const { id: groupId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [input, setInput] = useState("");
  const listRef = useRef<FlatList<GroupMessage>>(null);
  const [typingMembers, setTypingMembers] = useState<Record<string, boolean>>({});
  const [sending, setSending] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionResults, setMentionResults] = useState<Profile[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [playingSound, setPlayingSound] = useState<{ [key: string]: boolean }>({});
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const soundObjects = useRef<{ [key: string]: Audio.Sound }>({});

  const meId = user?.id as string | undefined;

  const loadInitial = useCallback(async () => {
    if (!groupId) return;
    // Group info + members
    const { data: groupInfo } = await supabase
      .from("groups")
      .select("id, name, avatar_url")
      .eq("id", groupId)
      .single();
    setGroup(groupInfo as Group);

    const { data: memberRows } = await supabase
      .from("group_members")
      .select("user_id, role, profiles(id, full_name, avatar_url)")
      .eq("group_id", groupId);
    setMembers((memberRows as any) || []);

    // Recent messages
    const { data: msgs } = await supabase
      .from("group_messages")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true })
      .limit(200);
    setMessages((msgs as GroupMessage[]) || []);

    // Mark read for me
    if (meId) {
      await supabase.rpc("mark_group_messages_read", { p_group_id: groupId, p_user_id: meId });
    }
  }, [groupId, meId]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

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

  useEffect(() => {
    if (!groupId) return;
    // Realtime messages
    const channel = supabase
      .channel(`group:${groupId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "group_messages", filter: `group_id=eq.${groupId}` },
        (payload) => {
          const msg = payload.new as GroupMessage;
          setMessages((prev) => {
            if (prev.find((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          // Auto-scroll
          requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "group_messages", filter: `group_id=eq.${groupId}` },
        (payload) => {
          const msg = payload.new as GroupMessage;
          setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  useEffect(() => {
    if (!groupId || !meId) return;
    // Presence channel for typing indicator
    const presence = supabase.channel(`presence:group:${groupId}`, { config: { presence: { key: meId } } });
    presence.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        presence.track({ typing: false, at: Date.now() });
      }
    });
    presence.on("presence", { event: "sync" }, () => {
      const state = presence.presenceState();
      const typing: Record<string, boolean> = {};
      Object.entries(state).forEach(([uid, metas]: any) => {
        const latest = metas[metas.length - 1];
        typing[uid] = !!latest?.typing;
      });
      setTypingMembers(typing);
    });
    return () => {
      supabase.removeChannel(presence);
    };
  }, [groupId, meId]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      Object.values(soundObjects.current).forEach(async (sound) => {
        try {
          await sound.stopAsync();
          await sound.unloadAsync();
        } catch (e) {
          console.log('Error cleaning up sound:', e);
        }
      });
    };
  }, []);

  const onChangeText = useCallback(
    (t: string) => {
      setInput(t);
      // best-effort typing flag
      const channel = supabase.getChannels().find((c) => c.topic === `realtime:presence:presence:group:${groupId}`);
      // not all clients expose topic names; attempt to track through a new channel if missing
      const me = meId;
      if (me) {
        const ch = supabase.channel(`presence:group:${groupId}`, { config: { presence: { key: me } } });
        ch.subscribe((status) => {
          if (status === "SUBSCRIBED") {
            ch.track({ typing: t.length > 0, at: Date.now() });
          }
        });
        // immediately un-sub to avoid leaks; we already have a presence sub
        setTimeout(() => supabase.removeChannel(ch), 500);
      }

      // Mentions: detect @ query at end of input
      const match = t.match(/(^|\s)@([\w .-]{0,30})$/);
      if (match) {
        const q = match[2].toLowerCase();
        setMentionQuery(q);
        const results = members
          .map((m) => m.profiles)
          .filter((p): p is Profile => !!p)
          .filter((p) => !q || (p.full_name || "").toLowerCase().includes(q))
          .slice(0, 5);
        setMentionResults(results);
      } else {
        setMentionQuery(null);
        setMentionResults([]);
      }
    },
    [groupId, meId]
  );

  const sendText = useCallback(async () => {
    if (!meId || !groupId) return;
    const content = input.trim();
    if (!content) return;
    setSending(true);
    setInput("");
    const { error } = await supabase
      .from("group_messages")
      .insert({ group_id: groupId, sender_id: meId, content, message_type: "text" });
    setSending(false);
    if (error) {
      console.error("Error sending message:", error);
    }
    // Message will arrive via realtime
  }, [groupId, meId, input]);

  // Recording functionality disabled - state variable not defined
  // const handleStartRecording = async () => {
  //   const success = await startRecording();
  //   if (success) {
  //     setRecording(true);
  //   }
  // };

  // const handleStopRecording = async () => {
  //   if (!meId || !groupId) return;
  //   setRecording(false);
  //   try {
  //     setUploadingMedia(true);
  //     const voiceUrl = await stopRecording(meId);
  //     if (voiceUrl) {
  //       await supabase
  //         .from("group_messages")
  //         .insert({ 
  //           group_id: groupId, 
  //           sender_id: meId, 
  //           content: '🎤 Voice message',
  //           media_url: voiceUrl, 
  //           message_type: 'voice' 
  //         });
  //     }
  //   } catch (error) {
  //     console.error("Error sending voice message:", error);
  //   } finally {
  //     setUploadingMedia(false);
  //   }
  // };

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
      console.error('Error toggling voice playback:', error);
    }
  };

  // Media Handlers
  const handlePickPhotos = async () => {
    if (!meId || !groupId) return;
    
    setShowAttachMenu(false);
    
    try {
      const media = await pickMedia();
      if (!media) {
        return;
      }

      setUploadingMedia(true);
      setUploadProgress(0);

      const mediaType = media.type === 'video' ? 'video' : 'image';
      const uploadedUrl = await uploadMedia(
        media.uri,
        meId,
        mediaType,
        media.fileName,
        media.mimeType,
        (progress) => setUploadProgress(progress)
      );

      if (uploadedUrl) {
        const content = mediaType === 'video' ? '📹 Video' : '📷 Photo';
        await supabase
          .from("group_messages")
          .insert({
            group_id: groupId,
            sender_id: meId,
            content,
            media_url: uploadedUrl,
            message_type: mediaType
          });
      }
    } catch (error) {
      console.error('Error uploading media:', error);
      Alert.alert('Error', 'Failed to upload media');
    } finally {
      setUploadingMedia(false);
      setUploadProgress(0);
    }
  };

  const handleTakeCamera = async () => {
    if (!meId || !groupId) return;
    
    setShowAttachMenu(false);
    
    try {
      const media = await takeMedia();
      if (!media) {
        return;
      }

      setUploadingMedia(true);
      setUploadProgress(0);

      const mediaType = media.type === 'video' ? 'video' : 'image';
      const uploadedUrl = await uploadMedia(
        media.uri,
        meId,
        mediaType,
        media.fileName,
        media.mimeType,
        (progress) => setUploadProgress(progress)
      );

      if (uploadedUrl) {
        const content = mediaType === 'video' ? '📹 Video' : '📷 Photo';
        await supabase
          .from("group_messages")
          .insert({
            group_id: groupId,
            sender_id: meId,
            content,
            media_url: uploadedUrl,
            message_type: mediaType
          });
      }
    } catch (error) {
      console.error('Error taking media:', error);
      Alert.alert('Error', 'Failed to take media');
    } finally {
      setUploadingMedia(false);
      setUploadProgress(0);
    }
  };

  const handlePickDocument = async () => {
    if (!meId || !groupId) return;
    
    setShowAttachMenu(false);
    
    try {
      const doc = await pickDocument();
      if (!doc) {
        return;
      }

      setUploadingMedia(true);
      setUploadProgress(0);

      const uploadedUrl = await uploadDocument(
        doc.uri,
        meId,
        doc.name,
        doc.mimeType,
        (progress) => setUploadProgress(progress)
      );

      if (uploadedUrl) {
        await supabase
          .from("group_messages")
          .insert({
            group_id: groupId,
            sender_id: meId,
            content: `📄 ${doc.name}`,
            media_url: uploadedUrl,
            message_type: 'document'
          });
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      Alert.alert('Error', 'Failed to upload document');
    } finally {
      setUploadingMedia(false);
      setUploadProgress(0);
    }
  };

  useEffect(() => {
    // On focus, mark messages read
    if (!groupId || !meId) return;
    const mark = async () => {
      await supabase.rpc("mark_group_messages_read", { p_group_id: groupId, p_user_id: meId });
    };
    mark();
  }, [groupId, meId]);

  const renderItem = useCallback(
    ({ item }: { item: GroupMessage }) => {
      const mine = item.sender_id === meId;
      const sender = members.find((m) => m.user_id === item.sender_id)?.profiles;
      return (
        <View style={{ paddingHorizontal: 12, marginVertical: 6, alignItems: mine ? "flex-end" : "flex-start" }}>
          {!mine && (
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 2 }}>
              {sender?.avatar_url ? (
                <Image source={{ uri: sender.avatar_url }} style={{ width: 18, height: 18, borderRadius: 9, marginRight: 6 }} />
              ) : null}
              <Text style={{ fontSize: 12, color: "#666" }}>{sender?.full_name || "Member"}</Text>
            </View>
          )}
          <View
            style={{
              backgroundColor: mine ? "#0F172A" : "#FFFFFF",
              borderRadius: 18,
              paddingHorizontal: 14,
              paddingVertical: 9,
              maxWidth: "80%",
              shadowColor: "#000",
              shadowOpacity: 0.05,
              shadowOffset: { width: 0, height: 1 },
              shadowRadius: 3,
              elevation: 1,
              borderWidth: mine ? 0 : 1,
              borderColor: mine ? "transparent" : "#F0F0F0",
              borderBottomRightRadius: mine ? 4 : 18,
              borderBottomLeftRadius: mine ? 18 : 4,
            }}
          >
            {/* Text content - only show for text messages or if there's text with media (except voice) */}
            {item.message_type === 'text' && item.content ? (
              <Text style={{ fontSize: 15, color: mine ? "#FFFFFF" : "#1a1a1a", lineHeight: 20, letterSpacing: -0.2 }}>{item.content}</Text>
            ) : null}
            
            {/* Image Message */}
            {item.message_type === "image" && item.media_url ? (
              <Image source={{ uri: item.media_url }} style={{ width: 220, height: 220, borderRadius: 8 }} />
            ) : null}
            
            {/* Video Message */}
            {item.message_type === "video" && item.media_url ? (
              <View>
                <Image source={{ uri: item.media_url }} style={{ width: 220, height: 220, borderRadius: 8 }} />
                <View style={{ position: 'absolute', top: '50%', left: '50%', marginLeft: -20, marginTop: -20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}>
                  <Play size={20} color="#FFFFFF" fill="#FFFFFF" />
                </View>
              </View>
            ) : null}
            
            {/* Voice Message */}
            {item.message_type === "voice" && item.media_url ? (
              <TouchableOpacity 
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4, minWidth: 180 }}
                onPress={() => toggleVoicePlayback(item.id, item.media_url!)}
                activeOpacity={0.7}
              >
                {playingSound[item.id] ? (
                  <Pause size={24} color={mine ? '#25D366' : '#4169E1'} fill={mine ? '#25D366' : '#4169E1'} />
                ) : (
                  <Play size={24} color={mine ? '#25D366' : '#4169E1'} fill={mine ? '#25D366' : '#4169E1'} />
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, flex: 1 }}>
                  {[...Array(20)].map((_, i) => (
                    <View 
                      key={i} 
                      style={{ 
                        width: 2.5,
                        height: Math.random() * 16 + 6,
                        borderRadius: 2,
                        backgroundColor: mine ? '#25D366' : '#4169E1',
                        opacity: playingSound[item.id] ? 1 : 0.5,
                      }} 
                    />
                  ))}
                </View>
              </TouchableOpacity>
            ) : null}
            
            {/* Document Message */}
            {item.message_type === "document" && item.media_url ? (
              <TouchableOpacity 
                style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  gap: 12, 
                  padding: 8,
                  backgroundColor: mine ? 'rgba(0, 0, 0, 0.05)' : 'rgba(65, 105, 225, 0.05)',
                  borderRadius: 8,
                  minWidth: 200,
                }}
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
                <View style={{ 
                  width: 36, 
                  height: 36, 
                  borderRadius: 18, 
                  backgroundColor: mine ? 'rgba(0, 0, 0, 0.08)' : 'rgba(65, 105, 225, 0.15)',
                  justifyContent: 'center', 
                  alignItems: 'center' 
                }}>
                  <FileText size={20} color={mine ? '#25D366' : '#4169E1'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: mine ? '#000' : '#1F2937' }} numberOfLines={1}>
                    {item.content?.replace('📄 ', '') || 'Document'}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                    Tap to open
                  </Text>
                </View>
              </TouchableOpacity>
            ) : null}
            
            <Text style={{ fontSize: 10, color: "#888", marginTop: 6 }}>
              {dayjs(item.created_at).format("h:mm A")} • Seen by {item.read_by?.length || 0}
            </Text>
          </View>
        </View>
      );
    },
    [meId, members]
  );

  const typingText = useMemo(() => {
    const names = members
      .filter((m) => m.user_id !== meId && typingMembers[m.user_id])
      .map((m) => m.profiles?.full_name || "Someone");
    if (!names.length) return "";
    if (names.length === 1) return `${names[0]} is typing…`;
    return `${names.slice(0, 2).join(", ")}${names.length > 2 ? " and others" : ""} are typing…`;
  }, [typingMembers, members, meId]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0F172A" }} edges={['top']}>
      <KeyboardAvoidingView 
        style={{ flex: 1, backgroundColor: "#FFFFFF" }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#0F172A", borderBottomWidth: 0.5, borderBottomColor: "#1E293B", flexDirection: "row", alignItems: "center" }}>
        <TouchableOpacity 
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.push('/(tabs)/chat');
            }
          }} 
          style={{ padding: 8, marginRight: 8 }}
        >
          <Text style={{ fontSize: 16, color: "#FFFFFF" }}>‹</Text>
        </TouchableOpacity>
        {group?.avatar_url ? <Image source={{ uri: group.avatar_url }} style={{ width: 36, height: 36, borderRadius: 18, marginRight: 8 }} /> : null}
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "600", fontSize: 16, color: "#FFFFFF" }}>{group?.name || "Group"}</Text>
          {!!typingText && <Text style={{ fontSize: 12, color: "#4CAF50" }}>{typingText}</Text>}
        </View>
        <TouchableOpacity onPress={() => router.push(`/chat/group-info/${groupId}` as any)} style={{ padding: 8 }}>
          <Text style={{ color: "#94A3B8" }}>Info</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: 12 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
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
            value={input}
            onChangeText={onChangeText}
            multiline
            maxLength={1000}
          />

          {/* Send Button */}
          {input.trim() && (
            <TouchableOpacity
              style={[styles.sendButton, sending && styles.sendButtonDisabled]}
              onPress={sendText}
              disabled={!input.trim() || sending}
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

      {/* Uploading Indicator */}
      {uploadingMedia && (
        <View style={styles.uploadingOverlay}>
          <View style={styles.uploadingContainer}>
            <View style={styles.progressCircleContainer}>
              <Text style={styles.uploadPercentage}>{uploadProgress}%</Text>
            </View>
            <Text style={styles.uploadingText}>
              {uploadProgress < 20 ? 'Preparing...' : uploadProgress < 90 ? 'Uploading...' : 'Finishing...'}
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
                setInput(prev => prev + emoji);
                setShowEmojiPicker(false);
              }}
              showSearchBar={false}
              columns={8}
            />
          </View>
        </View>
      </Modal>

      {/* Mentions suggestions */}
      {mentionQuery !== null && mentionResults.length > 0 && (
        <View style={{ position: 'absolute', left: 10, right: 10, bottom: 62, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#eee', shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6 }}>
          {mentionResults.map((p) => (
            <TouchableOpacity
              key={p.id}
              onPress={() => {
                // replace tailing @query with the full name mention
                const replaced = input.replace(/(^|\s)@([\w .-]{0,30})$/, (m, g1) => `${g1}@${(p.full_name || '').trim()} `);
                setInput(replaced);
                setMentionQuery(null);
                setMentionResults([]);
              }}
              style={{ paddingHorizontal: 12, paddingVertical: 10 }}
            >
              <Text>@{p.full_name || p.id.slice(0,6)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  safeBottom: {
    paddingBottom: Platform.OS === 'ios' ? 34 : 14,
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
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  uploadingContainer: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  progressCircleContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  uploadPercentage: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6366F1',
  },
  uploadingText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
    letterSpacing: -0.2,
    marginTop: 12,
  },
});
