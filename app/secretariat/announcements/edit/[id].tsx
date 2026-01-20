import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, Upload, X, Plus, Image as ImageIcon, Link as LinkIcon, Paperclip, FileText, File } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface ImageItem {
  url: string;
  caption?: string;
}

interface AttachmentItem {
  name: string;
  url: string;
  size?: string;
  type?: string;
}

const CATEGORIES = [
  'General',
  'Academic',
  'Events',
  'Alumni Updates',
  'Important Notice',
  'Opportunities',
  'News',
  'Resources',
];

const PRIORITIES = [
  { label: 'Normal', value: 'normal', color: '#10B981' },
  { label: 'High', value: 'high', color: '#F59E0B' },
  { label: 'Urgent', value: 'urgent', color: '#EF4444' },
];

const TARGET_AUDIENCES = [
  { label: 'All Alumni', value: 'all' },
  { label: 'Alumni Only', value: 'alumni_only' },
  { label: 'Students Only', value: 'students_only' },
  { label: 'Staff Only', value: 'staff_only' },
];

export default function EditAnnouncementScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();

  console.log('[Edit Page] Loaded with ID:', id);
  console.log('[Edit Page] Current user:', user?.id);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageCaption, setNewImageCaption] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    content: '',
    category: 'General',
    priority: 'normal',
    targetAudience: 'all',
    authorName: '',
    authorTitle: '',
    authorEmail: '',
  });

  useEffect(() => {
    console.log('[Edit Page] useEffect triggered', { id, userId: user?.id });
    if (id && user?.id) {
      console.log('[Edit Page] Calling loadAnnouncement...');
      loadAnnouncement();
    } else {
      console.warn('[Edit Page] Missing id or user:', { id, userId: user?.id });
    }
  }, [id, user?.id]);

  const loadAnnouncement = async () => {
    try {
      setInitialLoading(true);
      console.log('[Edit Page] Loading announcement:', id);

      const { data, error } = await supabase
        .from('secretariat_announcements')
        .select('*')
        .eq('id', id)
        .eq('user_id', user?.id) // Security: only allow editing own announcements
        .single();

      console.log('[Edit Page] Loaded data:', data);
      console.log('[Edit Page] Error:', error);

      if (error) throw error;

      if (!data) {
        if (Platform.OS === 'web') {
          window.alert('Announcement not found or you do not have permission to edit it.');
        } else {
          Alert.alert('Error', 'Announcement not found or you do not have permission to edit it.');
        }
        debouncedRouter.back();
        return;
      }

      // Populate form
      setFormData({
        title: data.title || '',
        summary: data.summary || '',
        content: data.content || '',
        category: data.category || 'General',
        priority: data.priority || 'normal',
        targetAudience: data.target_audience || 'all',
        authorName: data.author_name || '',
        authorTitle: data.author_title || '',
        authorEmail: data.author_email || '',
      });

      // Load images
      if (data.images && Array.isArray(data.images)) {
        setImages(data.images);
      } else if (data.image_url) {
        setImages([{ url: data.image_url }]);
      }

      // Load attachments
      if (data.attachments && Array.isArray(data.attachments)) {
        setAttachments(data.attachments);
      }
    } catch (error: any) {
      console.error('Error loading announcement:', error);
      if (Platform.OS === 'web') {
        window.alert(`Error: ${error.message}`);
      } else {
        Alert.alert('Error', error.message || 'Failed to load announcement');
      }
      debouncedRouter.back();
    } finally {
      setInitialLoading(false);
    }
  };

  const handleAddImage = () => {
    if (!newImageUrl.trim()) {
      Alert.alert('Error', 'Please enter an image URL');
      return;
    }

    if (images.length >= 20) {
      Alert.alert('Limit Reached', 'You can only add up to 20 images');
      return;
    }

    setImages([...images, { url: newImageUrl.trim(), caption: newImageCaption.trim() || undefined }]);
    setNewImageUrl('');
    setNewImageCaption('');
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handlePickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library to upload images.');
      return;
    }

    if (images.length >= 20) {
      Alert.alert('Limit Reached', 'You can only add up to 20 images');
      return;
    }

    const remainingSlots = 20 - images.length;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: remainingSlots,
    });

    if (!result.canceled && result.assets) {
      const newImages = result.assets.slice(0, remainingSlots).map(asset => ({
        url: asset.uri,
        caption: undefined,
      }));
      
      setImages([...images, ...newImages]);
      
      if (result.assets.length > remainingSlots) {
        Alert.alert('Notice', `Only ${remainingSlots} images were added due to the 20-image limit.`);
      }
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const file = result.assets[0];
      
      const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
      };

      const newAttachment: AttachmentItem = {
        name: file.name,
        url: file.uri,
        size: file.size ? formatFileSize(file.size) : undefined,
        type: file.mimeType,
      };

      setAttachments([...attachments, newAttachment]);
      
      if (Platform.OS === 'web') {
        window.alert(`Added: ${file.name}`);
      } else {
        Alert.alert('Success', `Added: ${file.name}`);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      if (Platform.OS === 'web') {
        window.alert('Error selecting file');
      } else {
        Alert.alert('Error', 'Failed to select file');
      }
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleUpdate = async () => {
    // Validation
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    if (!formData.summary.trim()) {
      Alert.alert('Error', 'Please enter a summary');
      return;
    }

    if (!formData.content.trim()) {
      Alert.alert('Error', 'Please enter the main content');
      return;
    }

    if (!formData.authorName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    if (!formData.authorTitle.trim()) {
      Alert.alert('Error', 'Please enter your title/position');
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('secretariat_announcements')
        .update({
          title: formData.title.trim(),
          summary: formData.summary.trim(),
          content: formData.content.trim(),
          category: formData.category,
          priority: formData.priority,
          target_audience: formData.targetAudience,
          author_name: formData.authorName.trim(),
          author_title: formData.authorTitle.trim(),
          author_email: formData.authorEmail.trim() || user?.email,
          images: images.length > 0 ? images : null,
          image_url: images.length > 0 ? images[0].url : null,
          attachments: attachments.length > 0 ? attachments : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user?.id) // Security: only update own announcements
        .select();

      if (error) throw error;

      // Show success message
      if (Platform.OS === 'web') {
        window.alert('✓ Announcement updated successfully!');
      } else {
        Alert.alert(
          '✓ Success',
          'Your announcement has been updated!',
          [{ text: 'OK' }]
        );
      }

      // Redirect to My Announcements page
      setTimeout(() => {
        debouncedRouter.replace('/secretariat/announcements/my-announcements');
      }, 100);
    } catch (error: any) {
      console.error('Error updating announcement:', error);
      if (Platform.OS === 'web') {
        window.alert(`Error: ${error.message}`);
      } else {
        Alert.alert('Error', error.message || 'Failed to update announcement. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    const confirmMessage = 'Are you sure you want to discard your changes?';
    
    if (Platform.OS === 'web') {
      if (window.confirm(confirmMessage)) {
        debouncedRouter.back();
      }
    } else {
      Alert.alert(
        'Discard Changes?',
        confirmMessage,
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => debouncedRouter.back(),
          },
        ]
      );
    }
  };

  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0F172A" />
        <Text style={styles.loadingText}>Loading announcement...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <LinearGradient
        colors={['#4169E1', '#5B7FE8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>Edit Announcement</Text>
            <Text style={styles.subtitle}>OAA Secretariat</Text>
          </View>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      {/* Form */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Title <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Enter announcement title"
            value={formData.title}
            onChangeText={(text) => setFormData({ ...formData, title: text })}
            maxLength={200}
            placeholderTextColor="#999"
          />
          <Text style={styles.charCount}>{formData.title.length}/200</Text>
        </View>

        {/* Summary */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Summary <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Brief summary (shown on cards)"
            value={formData.summary}
            onChangeText={(text) => setFormData({ ...formData, summary: text })}
            multiline
            numberOfLines={3}
            maxLength={300}
            placeholderTextColor="#999"
          />
          <Text style={styles.charCount}>{formData.summary.length}/300</Text>
        </View>

        {/* Content */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Full Content <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, styles.textArea, { height: 200 }]}
            placeholder="Full announcement content"
            value={formData.content}
            onChangeText={(text) => setFormData({ ...formData, content: text })}
            multiline
            numberOfLines={10}
            placeholderTextColor="#999"
          />
        </View>

        {/* Attachments */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Attachments (Optional)</Text>
          <Text style={styles.helper}>Add documents, PDFs, or other files</Text>
          
          <TouchableOpacity
            style={styles.attachmentButton}
            onPress={handlePickDocument}
          >
            <Paperclip size={20} color="#4169E1" />
            <Text style={styles.attachmentButtonText}>Add Document</Text>
          </TouchableOpacity>

          {attachments.length > 0 && (
            <View style={styles.attachmentsList}>
              {attachments.map((attachment, index) => (
                <View key={index} style={styles.attachmentItem}>
                  <View style={styles.attachmentIcon}>
                    <FileText size={20} color="#4169E1" />
                  </View>
                  <View style={styles.attachmentInfo}>
                    <Text style={styles.attachmentName} numberOfLines={1}>
                      {attachment.name}
                    </Text>
                    {attachment.size && (
                      <Text style={styles.attachmentSize}>{attachment.size}</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveAttachment(index)}
                    style={styles.removeAttachmentButton}
                  >
                    <X size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Category */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Category <Text style={styles.required}>*</Text>
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.optionsContainer}
          >
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.optionChip,
                  formData.category === category && styles.optionChipActive,
                ]}
                onPress={() => setFormData({ ...formData, category })}
              >
                <Text
                  style={[
                    styles.optionChipText,
                    formData.category === category && styles.optionChipTextActive,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Priority */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Priority Level</Text>
          <View style={styles.priorityContainer}>
            {PRIORITIES.map((priority) => (
              <TouchableOpacity
                key={priority.value}
                style={[
                  styles.priorityChip,
                  formData.priority === priority.value && {
                    backgroundColor: priority.color,
                    borderColor: priority.color,
                  },
                ]}
                onPress={() => setFormData({ ...formData, priority: priority.value })}
              >
                <Text
                  style={[
                    styles.priorityChipText,
                    formData.priority === priority.value && styles.priorityChipTextActive,
                  ]}
                >
                  {priority.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Target Audience */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Target Audience</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.optionsContainer}
          >
            {TARGET_AUDIENCES.map((audience) => (
              <TouchableOpacity
                key={audience.value}
                style={[
                  styles.optionChip,
                  formData.targetAudience === audience.value && styles.optionChipActive,
                ]}
                onPress={() => setFormData({ ...formData, targetAudience: audience.value })}
              >
                <Text
                  style={[
                    styles.optionChipText,
                    formData.targetAudience === audience.value && styles.optionChipTextActive,
                  ]}
                >
                  {audience.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Author Information */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Author Information</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Your Name <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Dr. Kwame Mensah"
            value={formData.authorName}
            onChangeText={(text) => setFormData({ ...formData, authorName: text })}
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Your Title/Position <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Secretary General, OAA"
            value={formData.authorTitle}
            onChangeText={(text) => setFormData({ ...formData, authorTitle: text })}
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Contact Email (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Your email address"
            value={formData.authorEmail}
            onChangeText={(text) => setFormData({ ...formData, authorEmail: text })}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#999"
          />
        </View>

        {/* Images Section */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Images (Up to 20) <Text style={styles.optional}>Optional</Text>
          </Text>
          
          {/* Image Source Buttons */}
          <View style={styles.imageSourceButtons}>
            <TouchableOpacity
              style={styles.imageSourceButton}
              onPress={handlePickImages}
              disabled={images.length >= 20}
            >
              <ImageIcon size={20} color="#4169E1" />
              <Text style={styles.imageSourceButtonText}>Pick from Gallery</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.imageSourceButton}
              onPress={() => setShowUrlInput(!showUrlInput)}
            >
              <LinkIcon size={20} color="#4169E1" />
              <Text style={styles.imageSourceButtonText}>Add URL</Text>
            </TouchableOpacity>
          </View>

          {/* URL Input (Toggle) */}
          {showUrlInput && (
            <View style={styles.imageForm}>
              <TextInput
                style={[styles.input, { marginBottom: 8 }]}
                placeholder="Image URL"
                value={newImageUrl}
                onChangeText={setNewImageUrl}
                autoCapitalize="none"
                placeholderTextColor="#999"
              />
              <TextInput
                style={[styles.input, { marginBottom: 12 }]}
                placeholder="Caption (optional)"
                value={newImageCaption}
                onChangeText={setNewImageCaption}
                placeholderTextColor="#999"
              />
              <TouchableOpacity
                style={styles.addImageButton}
                onPress={handleAddImage}
                disabled={images.length >= 20}
              >
                <Plus size={18} color="#FFFFFF" />
                <Text style={styles.addImageButtonText}>
                  Add Image ({images.length}/20)
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Image Preview Grid */}
          {images.length > 0 && (
            <View style={styles.imageGrid}>
              {images.map((img, index) => (
                <View key={index} style={styles.imagePreview}>
                  <Image
                    source={{ uri: img.url }}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => handleRemoveImage(index)}
                  >
                    <X size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                  {img.caption && (
                    <Text style={styles.imageCaption} numberOfLines={2}>
                      {img.caption}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}
          
          {images.length > 0 && (
            <Text style={styles.helperText}>
              {images.length}/20 images added
            </Text>
          )}
        </View>

        {/* Submit Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleUpdate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Update Announcement</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 2,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: {
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  optionsContainer: {
    flexDirection: 'row',
  },
  optionChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  optionChipActive: {
    backgroundColor: '#4169E1',
    borderColor: '#4169E1',
  },
  optionChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  optionChipTextActive: {
    color: '#FFFFFF',
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  priorityChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  priorityChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  priorityChipTextActive: {
    color: '#FFFFFF',
  },
  sectionHeader: {
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#4169E1',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  optional: {
    color: '#999',
    fontWeight: '400',
  },
  imageForm: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4169E1',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  addImageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  imagePreview: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 4,
  },
  imageCaption: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: '#FFFFFF',
    fontSize: 10,
    padding: 4,
  },
  imageSourceButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  imageSourceButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EBF0FF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4169E1',
  },
  imageSourceButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4169E1',
  },
  helper: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  attachmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EBF0FF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4169E1',
  },
  attachmentButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4169E1',
  },
  attachmentsList: {
    marginTop: 12,
    gap: 8,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  attachmentIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#EBF0FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  attachmentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  attachmentSize: {
    fontSize: 12,
    color: '#999',
  },
  removeAttachmentButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
});
