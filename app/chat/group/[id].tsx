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
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

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
  const [attachment, setAttachment] = useState<{ uri: string; type: 'image' | 'document'; name: string; mimeType?: string } | null>(null);
  const [uploading, setUploading] = useState(false);
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

  const saveImageToGallery = async (imageUrl: string) => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant photo library permissions');
        return;
      }

      // Download image silently (no alert)
      const fileUri = FileSystem.documentDirectory + `image_${Date.now()}.jpg`;
      const downloadResult = await FileSystem.downloadAsync(imageUrl, fileUri);

      if (downloadResult.status !== 200) {
        throw new Error('Download failed');
      }

      // Save to gallery in "Akora" album
      const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
      
      // Create album if doesn't exist
      const album = await MediaLibrary.getAlbumAsync('Akora');
      if (album == null) {
        await MediaLibrary.createAlbumAsync('Akora', asset, false);
      } else {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      }

      Alert.alert('Success', 'Image saved to gallery in "Akora" album');
    } catch (error) {
      console.error('Error saving image:', error);
      Alert.alert('Error', 'Failed to save image');
    }
  };

  const saveDocumentToFiles = async (documentUrl: string, documentName?: string) => {
    try {
      const fileName = documentName || `document_${Date.now()}.pdf`;
      
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Error', 'Sharing is not available on this device');
        return;
      }

      // Download document silently
      const fileUri = FileSystem.documentDirectory + fileName;
      const downloadResult = await FileSystem.downloadAsync(documentUrl, fileUri);

      if (downloadResult.status !== 200) {
        throw new Error('Download failed');
      }

      // Share/Save document
      await Sharing.shareAsync(downloadResult.uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Save Document',
        UTI: 'public.item',
      });
    } catch (error) {
      console.error('Error saving document:', error);
      Alert.alert('Error', 'Failed to save document');
    }
  };

  const showMediaOptions = (mediaUrl: string, mediaType: 'image' | 'document', fileName?: string) => {
    const options = mediaType === 'image' 
      ? ['Save to Gallery', 'Share', 'Cancel']
      : ['Save to Files', 'Share', 'Cancel'];

    Alert.alert(
      'Media Options',
      'What would you like to do?',
      [
        {
          text: options[0],
          onPress: () => {
            if (mediaType === 'image') {
              saveImageToGallery(mediaUrl);
            } else {
              saveDocumentToFiles(mediaUrl, fileName);
            }
          },
        },
        {
          text: options[1],
          onPress: async () => {
            try {
              const isAvailable = await Sharing.isAvailableAsync();
              if (!isAvailable) {
                Alert.alert('Error', 'Sharing is not available');
                return;
              }

              const fileUri = FileSystem.documentDirectory + (fileName || `file_${Date.now()}`);
              const downloadResult = await FileSystem.downloadAsync(mediaUrl, fileUri);
              
              if (downloadResult.status === 200) {
                await Sharing.shareAsync(downloadResult.uri);
              }
            } catch (error) {
              console.error('Error sharing:', error);
              Alert.alert('Error', 'Failed to share file');
            }
          },
        },
        {
          text: options[2],
          style: 'cancel',
        },
      ]
    );
  };

  const pickImage = async () => {
    setShowAttachMenu(false);
    
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setAttachment({
        uri: asset.uri,
        type: 'image',
        name: asset.fileName || `image_${Date.now()}.jpg`,
        mimeType: 'image/jpeg',
      });
    }
  };

  const pickDocument = async () => {
    setShowAttachMenu(false);
    
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (result.canceled === false && result.assets[0]) {
        const asset = result.assets[0];
        setAttachment({
          uri: asset.uri,
          type: 'document',
          name: asset.name,
          mimeType: asset.mimeType,
        });
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const uploadMediaFile = async (file: { uri: string; type: 'image' | 'document'; name: string; mimeType?: string }): Promise<string | null> => {
    try {
      setUploading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${meId}_${Date.now()}.${fileExt}`;
      const filePath = `group-chat/${fileName}`;

      // Read file as array buffer for upload
      const response = await fetch(file.uri);
      const arrayBuffer = await response.arrayBuffer();
      const fileBuffer = new Uint8Array(arrayBuffer);

      const { error } = await supabase.storage
        .from('chat-media')
        .upload(filePath, fileBuffer, {
          contentType: file.mimeType || (file.type === 'image' ? 'image/jpeg' : 'application/pdf'),
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('chat-media')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading media:', error);
      Alert.alert('Upload Error', 'Failed to upload file');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const sendText = useCallback(async () => {
    if (!meId || !groupId) return;
    if (!input.trim() && !attachment) return;
    
    // Prevent double-send
    if (sending || uploading) {
      console.log('⚠️ Already sending, ignoring duplicate tap');
      return;
    }

    let mediaUrl: string | null = null;
    let messageType: 'text' | 'image' | 'document' = 'text';

    // Upload attachment if present
    if (attachment) {
      setUploadingMedia(true);
      mediaUrl = await uploadMediaFile(attachment);
      setUploadingMedia(false);
      
      if (!mediaUrl) {
        Alert.alert('Upload Failed', 'Could not upload the file. Please try again.');
        return;
      }
      messageType = attachment.type;
    }

    const content = input.trim() || (attachment ? `Sent a ${attachment.type}` : '');
    
    setSending(true);
    setInput("");
    setAttachment(null);
    
    const { error } = await supabase
      .from("group_messages")
      .insert({ 
        group_id: groupId, 
        sender_id: meId, 
        content, 
        message_type: messageType,
        media_url: mediaUrl 
      });
    
    setSending(false);
    if (error) {
      console.error("Error sending message:", error);
      Alert.alert('Send Failed', 'Could not send message. Please try again.');
    }
    // Message will arrive via realtime
  }, [groupId, meId, input, attachment, sending, uploading]);

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
    
    console.log('🎥 [Group Camera] User tapped camera button');
    Sentry.addBreadcrumb({
      category: 'user-action',
      message: 'User tapped camera button in group chat',
      level: 'info',
      data: { userId: meId, groupId }
    });
    
    setShowAttachMenu(false);
    
    try {
      console.log('🎥 [Group Camera] Calling takeMedia()...');
      Sentry.addBreadcrumb({
        category: 'camera',
        message: 'About to launch camera in group chat',
        level: 'info'
      });
      
      const media = await takeMedia();
      
      console.log('🎥 [Group Camera] takeMedia() returned:', media ? 'success' : 'cancelled');
      Sentry.addBreadcrumb({
        category: 'camera',
        message: media ? 'Camera returned media' : 'Camera cancelled',
        level: 'info'
      });
      
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
      console.error('❌ [Group Camera] Error in handleTakeCamera:', error);
      Sentry.captureException(error, {
        tags: { feature: 'camera', action: 'group-chat-camera' },
        contexts: {
          camera: {
            userId: meId,
            groupId,
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
              <TouchableOpacity 
                onLongPress={() => showMediaOptions(item.media_url!, 'image')}
                activeOpacity={0.9}
              >
                <Image source={{ uri: item.media_url }} style={{ width: 220, height: 220, borderRadius: 8 }} />
              </TouchableOpacity>
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
                onLongPress={() => showMediaOptions(item.media_url!, 'document', item.content?.replace('📄 ', '') || 'document.pdf')}
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
              {dayjs(item.created_at).format("h:mm A")}
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
        backgroundColor: '#FFFFFF',
        paddingBottom: isKeyboardVisible ? (Platform.OS === 'android' ? 8 : 0) : (Platform.OS === 'android' ? 20 : 10)
      }}>
        {/* Attachment Preview */}
        {attachment && (
          <View style={styles.attachmentPreview}>
            {attachment.type === 'image' ? (
              <Image source={{ uri: attachment.uri }} style={styles.previewImage} />
            ) : (
              <View style={styles.previewDocument}>
                <FileText size={24} color="#4169E1" strokeWidth={2} />
                <Text style={styles.previewDocumentText} numberOfLines={1}>{attachment.name}</Text>
              </View>
            )}
            <TouchableOpacity onPress={() => setAttachment(null)} style={styles.removeAttachment}>
              <X size={18} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        )}

        {/* Inline Attach Menu */}
        {showAttachMenu && (
          <View style={styles.attachMenu}>
            <TouchableOpacity style={styles.attachOption} onPress={pickImage}>
              <View style={[styles.attachOptionIcon, { backgroundColor: '#DBEAFE' }]}>
                <ImageIcon size={20} color="#1E40AF" strokeWidth={2} />
              </View>
              <Text style={styles.attachOptionText}>Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachOption} onPress={pickDocument}>
              <View style={[styles.attachOptionIcon, { backgroundColor: '#FEE2E2' }]}>
                <FileText size={20} color="#991B1B" strokeWidth={2} />
              </View>
              <Text style={styles.attachOptionText}>Document</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <View style={[
          styles.inputContainer,
          { paddingBottom: isKeyboardVisible ? 12 : (Platform.OS === 'android' ? 16 : 16) }
        ]}>
          {/* Paperclip Attachment Button */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setShowAttachMenu(!showAttachMenu)}
            activeOpacity={0.7}
          >
            <Paperclip size={22} color="#6b7280" strokeWidth={2} />
          </TouchableOpacity>

          {/* Emoji Button */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setShowEmojiPicker(!showEmojiPicker)}
            activeOpacity={0.7}
          >
            <Smile size={22} color="#6b7280" strokeWidth={2} />
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
            cursorColor="#ffc857"
            selectionColor="#ffc857"
          />

          {/* Send Button */}
          {(input.trim() || attachment) && (
            <TouchableOpacity
              style={[styles.sendButton, sending && styles.sendButtonDisabled]}
              onPress={sendText}
              disabled={(!input.trim() && !attachment) || sending}
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

      {/* Upload Progress Overlay */}
      {uploadingMedia && (
        <View style={styles.uploadingOverlay}>
          <View style={styles.uploadingContainer}>
            <ActivityIndicator size="large" color="#4169E1" />
            <Text style={styles.uploadingText}>Sending...</Text>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  safeBottom: {
    paddingBottom: Platform.OS === 'ios' ? 34 : 14,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingButton: {
    backgroundColor: '#FEE2E2',
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 100,
    backgroundColor: '#F9FAFB',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#1a1a1a',
    marginRight: 12,
    borderWidth: 0,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffc857',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.5,
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
  // Attachment Menu Styles (Inline - like Direct Chat)
  attachMenu: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 16,
  },
  attachOption: {
    alignItems: 'center',
    gap: 8,
  },
  attachOptionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachOptionText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  // Attachment Preview Styles
  attachmentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  previewDocument: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  previewDocumentText: {
    flex: 1,
    fontSize: 14,
    color: '#1a1a1a',
    marginLeft: 12,
  },
  removeAttachment: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  uploadingContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  uploadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
});
