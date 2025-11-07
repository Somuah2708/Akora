import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Image, Platform } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft, X, Image as ImageIcon, FileText } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

const CATEGORIES = [
  'General',
  'Tech Help',
  'Alumni News',
  'Events',
  'Career',
  'Business',
  'Finance',
  'Science',
  'Arts',
  'Other'
];

export default function NewDiscussion() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('General');
  const [attachments, setAttachments] = useState<any[]>([]);
  const [posting, setPosting] = useState(false);

  const handleImagePick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAttachments([...attachments, {
        uri: result.assets[0].uri,
        type: 'image',
        name: `image_${Date.now()}.jpg`,
      }]);
    }
  };

  const handleDocumentPick = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    });

    if (!result.canceled && result.assets[0]) {
      setAttachments([...attachments, {
        uri: result.assets[0].uri,
        type: 'document',
        name: result.assets[0].name,
      }]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const uploadFile = async (file: any) => {
    try {
      console.log('Uploading file:', file.name);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(file.uri, {
        encoding: 'base64',
      });

      console.log('File read as base64, uploading to storage...');

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('forum-attachments')
        .upload(filePath, decode(base64), {
          contentType: file.type === 'image' ? 'image/jpeg' : 'application/pdf',
        });

      if (error) {
        console.error('Storage upload error:', error);
        
        // Check if bucket doesn't exist
        if (error.message?.includes('Bucket not found') || error.message?.includes('does not exist')) {
          Alert.alert(
            'Storage Setup Required',
            'The forum-attachments storage bucket needs to be created. Please run CREATE_FORUM_STORAGE.sql in Supabase.',
            [{ text: 'OK' }]
          );
        }
        
        throw error;
      }

      console.log('File uploaded successfully:', data);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('forum-attachments')
        .getPublicUrl(filePath);

      return {
        url: urlData.publicUrl,
        name: file.name,
        type: file.type,
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      return null;
    }
  };

  const handlePost = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to post');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    if (!content.trim()) {
      Alert.alert('Error', 'Please enter some content');
      return;
    }

    setPosting(true);

    try {
      console.log('Creating discussion...', {
        title: title.trim(),
        content: content.trim(),
        category: selectedCategory,
        author_id: user.id,
      });

      // Create discussion
      const { data: discussion, error: discussionError } = await supabase
        .from('forum_discussions')
        .insert({
          title: title.trim(),
          content: content.trim(),
          category: selectedCategory,
          author_id: user.id,
        })
        .select()
        .single();

      if (discussionError) {
        console.error('Discussion error:', discussionError);
        
        // Check if table doesn't exist
        if (discussionError.message?.includes('relation') || discussionError.message?.includes('does not exist')) {
          Alert.alert(
            'Database Setup Required',
            'The forum tables need to be created in Supabase. Please run CREATE_FORUM_TABLES.sql in your Supabase SQL Editor.',
            [{ text: 'OK' }]
          );
          return;
        }
        
        throw discussionError;
      }

      console.log('Discussion created:', discussion);

      // Upload attachments if any
      if (attachments.length > 0) {
        console.log(`Uploading ${attachments.length} attachments...`);
        
        for (const attachment of attachments) {
          const uploadedFile = await uploadFile(attachment);
          
          if (uploadedFile) {
            const { error: attachmentError } = await supabase
              .from('forum_attachments')
              .insert({
                discussion_id: discussion.id,
                file_url: uploadedFile.url,
                file_name: uploadedFile.name,
                file_type: uploadedFile.type,
              });
              
            if (attachmentError) {
              console.error('Attachment error:', attachmentError);
            }
          }
        }
      }

      Alert.alert('Success', 'Discussion posted successfully!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error('Error posting discussion:', error);
      Alert.alert(
        'Error', 
        error.message || 'Failed to post discussion. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setPosting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Discussion</Text>
        <TouchableOpacity
          style={[styles.postButton, (!title.trim() || !content.trim() || posting) && styles.postButtonDisabled]}
          onPress={handlePost}
          disabled={!title.trim() || !content.trim() || posting}
        >
          {posting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.postButtonText}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Title Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.titleInput}
            placeholder="Enter discussion title..."
            value={title}
            onChangeText={setTitle}
            maxLength={200}
            editable={!posting}
          />
        </View>

        {/* Category Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryChip,
                  selectedCategory === category && styles.categoryChipSelected,
                ]}
                onPress={() => setSelectedCategory(category)}
                disabled={posting}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedCategory === category && styles.categoryChipTextSelected,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Content Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Content</Text>
          <TextInput
            style={styles.contentInput}
            placeholder="Share your thoughts, ask questions, or start a discussion..."
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
            editable={!posting}
          />
        </View>

        {/* Attachments */}
        {attachments.length > 0 && (
          <View style={styles.attachmentsSection}>
            <Text style={styles.label}>Attachments</Text>
            <View style={styles.attachmentsList}>
              {attachments.map((attachment, index) => (
                <View key={index} style={styles.attachmentItem}>
                  {attachment.type === 'image' ? (
                    <Image source={{ uri: attachment.uri }} style={styles.attachmentImage} />
                  ) : (
                    <View style={styles.attachmentDocument}>
                      <FileText size={24} color="#4169E1" />
                      <Text style={styles.attachmentName} numberOfLines={1}>
                        {attachment.name}
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeAttachment(index)}
                    disabled={posting}
                  >
                    <X size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Attachment Buttons */}
        <View style={styles.attachmentButtons}>
          <TouchableOpacity
            style={styles.attachButton}
            onPress={handleImagePick}
            disabled={posting}
          >
            <ImageIcon size={20} color="#4169E1" />
            <Text style={styles.attachButtonText}>Add Image</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.attachButton}
            onPress={handleDocumentPick}
            disabled={posting}
          >
            <FileText size={20} color="#4169E1" />
            <Text style={styles.attachButtonText}>Add Document</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
    marginLeft: 8,
  },
  postButton: {
    backgroundColor: '#4169E1',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 70,
    alignItems: 'center',
  },
  postButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  postButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  titleInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#000000',
  },
  contentInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#000000',
    minHeight: 200,
  },
  categoriesContainer: {
    flexDirection: 'row',
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  categoryChipSelected: {
    backgroundColor: '#4169E1',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
  },
  attachmentsSection: {
    marginBottom: 24,
  },
  attachmentsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  attachmentItem: {
    width: 100,
    height: 100,
    position: 'relative',
  },
  attachmentImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  attachmentDocument: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  attachmentName: {
    fontSize: 10,
    color: '#666666',
    marginTop: 4,
    textAlign: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  attachButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#4169E1',
    borderStyle: 'dashed',
  },
  attachButtonText: {
    fontSize: 14,
    color: '#4169E1',
    fontWeight: '500',
  },
});
