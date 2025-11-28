import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, FlatList, TextInput, TouchableOpacity, Image, Modal, Pressable, ActivityIndicator, StyleSheet, Linking, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../hooks/useAuth";
import dayjs from "dayjs";
import { uploadMedia, pickMedia, startRecording, stopRecording, pickDocument, uploadDocument } from "../../../lib/media";
import EmojiSelector from 'react-native-emoji-selector';
import { ArrowLeft, Send, Smile, Paperclip, X, Play, Pause, FileText } from 'lucide-react-native';
import { Audio } from 'expo-av';

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
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [playingSound, setPlayingSound] = useState<{ [key: string]: boolean }>({});
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

  const sendMedia = useCallback(async () => {
    if (!meId || !groupId) return;
    try {
      setUploadingMedia(true);
      const picked = await pickMedia();
      if (!picked) {
        setUploadingMedia(false);
        return;
      }
      const { uri, type: pickedType, fileName, mimeType } = picked as any;
      const msgType: 'image' | 'video' = pickedType === 'video' ? 'video' : 'image';
      const publicUrl = await uploadMedia(uri, meId, msgType, fileName, mimeType);
      if (!publicUrl) {
        setUploadingMedia(false);
        return;
      }
      await supabase
        .from("group_messages")
        .insert({ group_id: groupId, sender_id: meId, media_url: publicUrl, message_type: msgType });
      // Message will arrive via realtime
    } catch (error) {
      console.error("Error sending media:", error);
    } finally {
      setUploadingMedia(false);
    }
  }, [groupId, meId]);

  const sendDocument = useCallback(async () => {
    if (!meId || !groupId) return;
    try {
      setUploadingMedia(true);
      const doc = await pickDocument();
      if (!doc) {
        setUploadingMedia(false);
        return;
      }
      
      const publicUrl = await uploadDocument(doc.uri, meId, doc.name, doc.mimeType);
      if (!publicUrl) {
        setUploadingMedia(false);
        Alert.alert('Upload Failed', 'Could not upload document. Please try again.');
        return;
      }
      
      const { error } = await supabase
        .from("group_messages")
        .insert({ 
          group_id: groupId, 
          sender_id: meId, 
          content: `📄 ${doc.name}`,
          media_url: publicUrl, 
          message_type: 'document' 
        });
      
      if (error) {
        console.error("Error inserting document message:", error);
        Alert.alert('Error', 'Failed to send document message.');
      }
      // Message will arrive via realtime
    } catch (error) {
      console.error("Error sending document:", error);
      Alert.alert('Error', 'Failed to send document. Please check your connection and try again.');
    } finally {
      setUploadingMedia(false);
    }
  }, [groupId, meId]);

  const handleStartRecording = async () => {
    const success = await startRecording();
    if (success) {
      setRecording(true);
    }
  };

  const handleStopRecording = async () => {
    if (!meId || !groupId) return;
    setRecording(false);
    try {
      setUploadingMedia(true);
      const voiceUrl = await stopRecording(meId);
      if (voiceUrl) {
        await supabase
          .from("group_messages")
          .insert({ 
            group_id: groupId, 
            sender_id: meId, 
            content: '🎤 Voice message',
            media_url: voiceUrl, 
            message_type: 'voice' 
          });
      }
    } catch (error) {
      console.error("Error sending voice message:", error);
    } finally {
      setUploadingMedia(false);
    }
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
      console.error('Error toggling voice playback:', error);
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
              backgroundColor: mine ? "#DCF8C6" : "#fff",
              borderRadius: 12,
              padding: 10,
              maxWidth: "85%",
              shadowColor: "#000",
              shadowOpacity: 0.05,
              shadowOffset: { width: 0, height: 1 },
              shadowRadius: 2,
              borderWidth: 0.5,
              borderColor: "#eee",
            }}
          >
            {/* Text content - only show for text messages or if there's text with media (except voice) */}
            {item.message_type === 'text' && item.content ? (
              <Text style={{ fontSize: 16 }}>{item.content}</Text>
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
        style={{ flex: 1, backgroundColor: "#f5f5f5" }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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

      {/* Input Container */}
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
          value={input}
          onChangeText={onChangeText}
          multiline
          maxLength={1000}
        />

        {/* Media Button */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={sendMedia}
          activeOpacity={0.7}
          disabled={uploadingMedia}
        >
          {uploadingMedia ? (
            <ActivityIndicator size="small" color="#4169E1" />
          ) : (
            <Paperclip size={22} color="#4169E1" />
          )}
        </TouchableOpacity>

        {/* Document Button */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={sendDocument}
          activeOpacity={0.7}
          disabled={uploadingMedia}
        >
          <FileText size={22} color="#4169E1" />
        </TouchableOpacity>

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
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 28 : 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
    gap: 10,
  },
  safeBottom: {
    paddingBottom: Platform.OS === 'ios' ? 34 : 14,
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
});
