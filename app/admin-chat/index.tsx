import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Image, Modal, Linking } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, Send, Paperclip, X, FileText, Loader2, HeadphonesIcon, Image as ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface Message {
  id: string;
  user_id: string;
  message: string;
  sender_type: 'user' | 'admin';
  created_at: string;
  is_read: boolean;
  media_url?: string;
  media_type?: string;
}

interface MediaAttachment {
  uri: string;
  type: 'image' | 'document';
  name: string;
  mimeType?: string;
}

export default function AdminChatScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [attachment, setAttachment] = useState<MediaAttachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    fetchMessages();
    
    // Subscribe to new messages in real-time
    const channel = supabase
      .channel(`admin-messages-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_messages',
        },
        (payload) => {
          console.log('📩 New message received:', payload);
          const newMsg = payload.new as Message;
          
          // Only process messages for this user
          if (newMsg.user_id !== user.id) {
            console.log('⏭️  Skipping message for different user');
            return;
          }
          
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMsg.id)) {
              console.log('⏭️  Duplicate message, skipping');
              return prev;
            }
            console.log('✅ Adding new message to state');
            return [...prev, newMsg];
          });
          setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
          
          // Mark as read if from admin
          if (newMsg.sender_type === 'admin') {
            markMessagesAsRead();
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchMessages = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('admin_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
      
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: false }), 100);
      markMessagesAsRead();
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async () => {
    if (!user) return;

    try {
      await supabase
        .from('admin_messages')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('sender_type', 'admin')
        .eq('is_read', false);

      await supabase
        .from('admin_conversations')
        .update({ unread_user_count: 0 })
        .eq('user_id', user.id);
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

  const uploadMedia = async (file: MediaAttachment): Promise<string | null> => {
    try {
      setUploading(true);
      
      // Create FormData for React Native
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        type: file.mimeType || (file.type === 'image' ? 'image/jpeg' : 'application/pdf'),
        name: file.name,
      } as any);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${user!.id}_${Date.now()}.${fileExt}`;
      const filePath = `admin-chat/${fileName}`;

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
      Alert.alert('Error', 'Failed to upload file');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && !attachment) || !user || sending) return;

    const messageText = newMessage.trim();
    const attachmentToSend = attachment;
    
    // Clear input immediately for better UX
    setNewMessage('');
    setAttachment(null);

    try {
      setSending(true);
      
      let mediaUrl = null;
      let mediaType = null;

      // Upload media if attached
      if (attachmentToSend) {
        mediaUrl = await uploadMedia(attachmentToSend);
        if (!mediaUrl) {
          throw new Error('Failed to upload media');
        }
        mediaType = attachmentToSend.type;
      }

      // Send message
      const { data, error } = await supabase
        .from('admin_messages')
        .insert({
          user_id: user.id,
          message: messageText || `Sent a ${attachmentToSend?.type}`,
          sender_type: 'user',
          media_url: mediaUrl,
          media_type: mediaType,
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Message sent successfully:', data);
      
      // Message will be added via real-time subscription
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
      // Restore message on error
      setNewMessage(messageText);
      setAttachment(attachmentToSend);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const renderMessage = (message: Message, index: number) => {
    const isUser = message.sender_type === 'user';
    const prevMessage = index > 0 ? messages[index - 1] : null;
    const showDateSeparator = !prevMessage || 
      new Date(message.created_at).toDateString() !== new Date(prevMessage.created_at).toDateString();

    return (
      <View key={message.id}>
        {showDateSeparator && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateText}>{formatDate(message.created_at)}</Text>
          </View>
        )}
        <View style={[styles.messageContainer, isUser ? styles.userMessage : styles.adminMessage]}>
          <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.adminBubble]}>
            {!isUser && (
              <View style={styles.adminBadge}>
                <HeadphonesIcon size={12} color="#4169E1" strokeWidth={2} />
                <Text style={styles.adminBadgeText}>Support Team</Text>
              </View>
            )}
            
            {message.media_url && (
              <View style={styles.mediaContainer}>
                {message.media_type === 'image' ? (
                  <TouchableOpacity onPress={() => setFullScreenImage(message.media_url || null)}>
                    <Image source={{ uri: message.media_url }} style={styles.messageImage} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={styles.documentPreview}
                    onPress={() => {
                      if (message.media_url) {
                        Linking.openURL(message.media_url).catch(() => {
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
            
            {message.message && (
              <Text style={[styles.messageText, isUser ? styles.userText : styles.adminText]}>
                {message.message}
              </Text>
            )}
            
            <Text style={[styles.timeText, isUser ? styles.userTime : styles.adminTime]}>
              {formatTime(message.created_at)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (!user || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4169E1" />
        <Text style={styles.loadingText}>{!user ? 'Initializing...' : 'Loading chat...'}</Text>
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
            <HeadphonesIcon size={24} color="#4169E1" strokeWidth={2} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Customer Support</Text>
            <Text style={styles.headerSubtitle}>We're here to help</Text>
          </View>
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <HeadphonesIcon size={48} color="#9CA3AF" strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>Start a conversation</Text>
            <Text style={styles.emptyText}>
              Send us a message and our support team will respond as soon as possible
            </Text>
          </View>
        ) : (
          messages.map((message, index) => renderMessage(message, index))
        )}
      </ScrollView>

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
          placeholder="Type your message..."
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
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 20,
    flexGrow: 1,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#9CA3AF',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: '80%',
  },
  userMessage: {
    alignSelf: 'flex-end',
  },
  adminMessage: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: 16,
    padding: 12,
  },
  userBubble: {
    backgroundColor: '#4169E1',
    borderBottomRightRadius: 4,
  },
  adminBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  adminBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
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
  userText: {
    color: '#FFFFFF',
  },
  adminText: {
    color: '#1a1a1a',
  },
  timeText: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    marginTop: 4,
  },
  userTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  adminTime: {
    color: '#9CA3AF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 40,
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
