import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Image, Modal, Linking, Alert } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, Send, Loader2, User, FileText, Paperclip, X, Image as ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';

interface Message {
  id: string;
  message: string;
  sender_type: 'user' | 'admin';
  media_url?: string;
  media_type?: string;
  created_at: string;
  is_read: boolean;
}

interface UserProfile {
  full_name: string;
  email: string;
}

export default function AdminChatWithUserScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [accessChecked, setAccessChecked] = useState(false);
  const [attachment, setAttachment] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Wait for profile to load
    if (!profile && user) {
      return; // Still loading profile
    }

    if (profile && profile.role !== 'admin') {
      debouncedRouter.back();
      return;
    }

    if (!userId) {
      debouncedRouter.back();
      return;
    }

    if (profile && profile.role === 'admin') {
      setAccessChecked(true);
      fetchUserProfile();
      fetchMessages();
      markMessagesAsRead();
    }

    // Subscribe to new messages
    const channel = supabase
      .channel(`admin-messages-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_messages',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
          setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
          
          // Mark as read
          markMessagesAsRead();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, profile]);

  const fetchUserProfile = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchMessages = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('admin_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
      
      setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async () => {
    if (!userId) return;

    try {
      // Mark admin's unread messages as read
      await supabase
        .from('admin_messages')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('sender_type', 'user')
        .eq('is_read', false);

      // Reset unread count in conversations
      await supabase
        .from('admin_conversations')
        .update({ unread_admin_count: 0 })
        .eq('user_id', userId);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
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
      allowsEditing: true,
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

  const uploadMedia = async (file: any): Promise<string | null> => {
    try {
      setUploading(true);
      
      const response = await fetch(file.uri);
      const arrayBuffer = await response.arrayBuffer();
      const fileBuffer = new Uint8Array(arrayBuffer);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${user!.id}_${Date.now()}.${fileExt}`;
      const filePath = `admin-chat/${fileName}`;

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
      Alert.alert('Error', 'Failed to upload file');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && !attachment) || !userId || sending) return;

    const messageText = newMessage.trim();
    const attachmentToSend = attachment;
    
    setNewMessage('');
    setAttachment(null);

    try {
      setSending(true);
      
      let mediaUrl = null;
      let mediaType = null;

      if (attachmentToSend) {
        mediaUrl = await uploadMedia(attachmentToSend);
        if (!mediaUrl) {
          throw new Error('Failed to upload media');
        }
        mediaType = attachmentToSend.type;
      }
      
      const { error } = await supabase
        .from('admin_messages')
        .insert({
          user_id: userId,
          message: messageText || `Sent a ${attachmentToSend?.type}`,
          sender_type: 'admin',
          media_url: mediaUrl,
          media_type: mediaType,
        });

      if (error) throw error;

      // Message will be added via real-time subscription
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageText);
      setAttachment(attachmentToSend);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isAdmin = item.sender_type === 'admin';
    const time = new Date(item.created_at).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    return (
      <View style={[styles.messageContainer, isAdmin ? styles.adminMessage : styles.userMessage]}>
        <View style={[styles.messageBubble, isAdmin ? styles.adminBubble : styles.userBubble]}>
          {!isAdmin && (
            <View style={styles.userBadge}>
              <User size={12} color="#6b7280" strokeWidth={2} />
              <Text style={styles.userBadgeText}>{userProfile?.full_name || 'User'}</Text>
            </View>
          )}
          
          {item.media_url && (
            <View style={styles.mediaContainer}>
              {item.media_type === 'image' ? (
                <TouchableOpacity onPress={() => setFullScreenImage(item.media_url || null)}>
                  <Image source={{ uri: item.media_url }} style={styles.messageImage} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={styles.documentPreview}
                  onPress={() => {
                    if (item.media_url) {
                      Linking.openURL(item.media_url).catch(() => {
                        Alert.alert('Error', 'Could not open document');
                      });
                    }
                  }}
                >
                  <FileText size={32} color="#4169E1" strokeWidth={2} />
                  <Text style={styles.documentText}>Document</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          
          {item.message && (
            <Text style={[styles.messageText, isAdmin ? styles.adminText : styles.userMessageText]}>
              {item.message}
            </Text>
          )}
          
          <Text style={[styles.timeText, isAdmin ? styles.adminTime : styles.userTime]}>
            {time}
          </Text>
        </View>
      </View>
    );
  };

  if (loading || !accessChecked) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4169E1" />
        <Text style={styles.loadingText}>{!accessChecked ? 'Verifying access...' : 'Loading chat...'}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1a1a1a" strokeWidth={2} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.headerIcon}>
            <Text style={styles.headerIconText}>
              {(userProfile?.full_name || 'U')[0].toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>{userProfile?.full_name || 'User'}</Text>
            <Text style={styles.headerSubtitle}>{userProfile?.email || ''}</Text>
          </View>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
      />

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

      {/* Attach Menu */}
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

      {/* Input */}
      <View style={styles.inputContainer}>
        <TouchableOpacity 
          onPress={() => setShowAttachMenu(!showAttachMenu)}
          style={styles.attachButton}
        >
          <Paperclip size={22} color="#6b7280" strokeWidth={2} />
        </TouchableOpacity>
        
        <TextInput
          style={styles.input}
          placeholder="Type your response..."
          placeholderTextColor="#9CA3AF"
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
          maxLength={1000}
        />
        
        <TouchableOpacity
          style={[styles.sendButton, ((!newMessage.trim() && !attachment) || sending || uploading) && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={(!newMessage.trim() && !attachment) || sending || uploading}
          activeOpacity={0.7}
        >
          {sending || uploading ? (
            <Loader2 size={22} color="#FFFFFF" strokeWidth={2.5} />
          ) : (
            <Send size={22} color="#FFFFFF" strokeWidth={2.5} />
          )}
        </TouchableOpacity>
      </View>

      {/* Full Screen Image Modal */}
      <Modal
        visible={fullScreenImage !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullScreenImage(null)}
      >
        <View style={styles.fullScreenContainer}>
          <TouchableOpacity 
            style={styles.fullScreenClose}
            onPress={() => setFullScreenImage(null)}
          >
            <X size={32} color="#FFFFFF" strokeWidth={2} />
          </TouchableOpacity>
          {fullScreenImage && (
            <Image 
              source={{ uri: fullScreenImage }} 
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4169E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerIconText: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1a1a1a',
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6b7280',
    marginTop: 2,
  },
  messagesList: {
    padding: 20,
    flexGrow: 1,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: '80%',
  },
  adminMessage: {
    alignSelf: 'flex-end',
  },
  userMessage: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: 16,
    padding: 12,
  },
  adminBubble: {
    backgroundColor: '#4169E1',
    borderBottomRightRadius: 4,
  },
  userBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  userBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#6b7280',
    marginLeft: 4,
  },
  mediaContainer: {
    marginBottom: 8,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  documentPreview: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  documentText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
    marginTop: 8,
  },
  messageText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  adminText: {
    color: '#FFFFFF',
  },
  userMessageText: {
    color: '#1a1a1a',
  },
  timeText: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    marginTop: 4,
  },
  adminTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  userTime: {
    color: '#9CA3AF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#1a1a1a',
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4169E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.5,
  },
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
    fontFamily: 'Inter-Medium',
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
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenClose: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 1,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
  },
});
