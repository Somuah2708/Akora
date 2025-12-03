import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Send, X, Image as ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

const CATEGORIES = [
  { label: 'General', value: 'general' },
  { label: 'Academic Excellence', value: 'academic' },
  { label: 'Professional Development', value: 'professional' },
  { label: 'Mental Wellbeing', value: 'mental_wellbeing' },
  { label: 'Physical Fitness', value: 'physical_fitness' },
  { label: 'Financial Planning', value: 'financial_planning' },
  { label: 'Time Management', value: 'time_management' },
  { label: 'Personal Reflection', value: 'personal_reflection' },
  { label: 'Community Service', value: 'community_service' },
  { label: 'Events', value: 'events' },
  { label: 'News', value: 'news' },
  { label: 'Announcements', value: 'announcements' },
];

const VISIBILITY_OPTIONS = [
  { label: 'Public', value: 'public' },
  { label: 'Friends Only', value: 'friends_only' },
  { label: 'Private', value: 'private' },
];

export default function EditPostScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
  const [category, setCategory] = useState('general');
  const [visibility, setVisibility] = useState('friends_only');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showVisibilityPicker, setShowVisibilityPicker] = useState(false);

  useEffect(() => {
    fetchPost();
  }, [id]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Verify user owns this post
      if (data.user_id !== user?.id) {
        Alert.alert('Error', 'You can only edit your own posts');
        router.back();
        return;
      }

      setContent(data.content || '');
      setCategory(data.category || 'general');
      setVisibility(data.visibility || 'friends_only');
      
      // Set existing images
      if (data.image_urls && data.image_urls.length > 0) {
        setExistingImages(data.image_urls);
      } else if (data.image_url) {
        setExistingImages([data.image_url]);
      }
    } catch (error: any) {
      console.error('Error fetching post:', error);
      Alert.alert('Error', 'Failed to load post');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const totalImages = existingImages.length + images.length;
    if (totalImages >= 20) {
      Alert.alert('Limit Reached', 'You can only have up to 20 images per post');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 20 - totalImages,
    });

    if (!result.canceled) {
      const newImages = result.assets.map(asset => asset.uri);
      setImages([...images, ...newImages]);
    }
  };

  const removeExistingImage = (index: number) => {
    const imageUrl = existingImages[index];
    setImagesToDelete([...imagesToDelete, imageUrl]);
    setExistingImages(existingImages.filter((_, i) => i !== index));
  };

  const removeNewImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const uploadImage = async (uri: string): Promise<string | null> => {
    try {
      console.log('📤 Starting upload for:', uri);
      
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      
      const blob = await response.blob();
      console.log('📦 Blob created, size:', blob.size, 'type:', blob.type);
      
      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
      const filePath = `posts/${fileName}`;
      
      console.log('📁 Uploading to path:', filePath);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, blob, {
          contentType: blob.type || 'image/jpeg',
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('❌ Upload error:', uploadError);
        throw uploadError;
      }
      
      console.log('✅ Upload successful:', uploadData);

      const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      console.log('🔗 Public URL:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (error: any) {
      console.error('❌ Error uploading image:', error);
      Alert.alert('Upload Error', error.message || 'Failed to upload image');
      return null;
    }
  };

  const deleteImagesFromStorage = async (imageUrls: string[]) => {
    for (const url of imageUrls) {
      try {
        // Extract the file path from the URL
        const urlObj = new URL(url);
        const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/media\/(.+)/);
        if (pathMatch && pathMatch[1]) {
          const filePath = pathMatch[1];
          await supabase.storage.from('media').remove([filePath]);
          console.log('🗑️ Deleted:', filePath);
        }
      } catch (error) {
        console.error('Error deleting image:', error);
        // Continue even if deletion fails
      }
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('Error', 'Post content cannot be empty');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to edit a post');
      return;
    }

    try {
      setIsSubmitting(true);
      console.log('Starting post update...');
      
      // Upload new images
      let uploadedImageUrls: string[] = [];
      if (images.length > 0) {
        console.log('Uploading new images...');
        for (const imageUri of images) {
          const url = await uploadImage(imageUri);
          if (url) {
            uploadedImageUrls.push(url);
          }
        }
      }

      // Combine existing images (not deleted) with newly uploaded images
      const allImageUrls = [...existingImages, ...uploadedImageUrls];

      const postData = {
        content: content.trim(),
        image_url: allImageUrls.length > 0 ? allImageUrls[0] : null,
        image_urls: allImageUrls.length > 0 ? allImageUrls : null,
        category,
        visibility,
      };
      
      console.log('Updating post:', postData);
      
      const { error } = await supabase
        .from('posts')
        .update(postData)
        .eq('id', id)
        .eq('user_id', user.id); // Ensure user owns the post

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      // Delete removed images from storage
      if (imagesToDelete.length > 0) {
        console.log('Deleting removed images...');
        await deleteImagesFromStorage(imagesToDelete);
      }

      console.log('Post updated successfully');

      Alert.alert('Success', 'Post updated successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error('Error updating post:', error);
      Alert.alert('Error', error.message || 'Failed to update post');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#475569" />
        <Text style={styles.loadingText}>Loading post...</Text>
      </View>
    );
  }

  const selectedCategory = CATEGORIES.find(c => c.value === category);
  const selectedVisibility = VISIBILITY_OPTIONS.find(v => v.value === visibility);
  const totalImages = existingImages.length + images.length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Post</Text>
        <TouchableOpacity 
          style={[styles.submitButton, (!content.trim() || isSubmitting) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!content.trim() || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Send size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
        <TextInput
          style={styles.contentInput}
          placeholder="Caption"
          placeholderTextColor="#94A3B8"
          multiline
          value={content}
          onChangeText={setContent}
        />

        {/* Existing Images */}
        {existingImages.length > 0 && (
          <View style={styles.imagesContainer}>
            <Text style={styles.sectionLabel}>Current Images</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScroll}>
              {existingImages.map((uri, index) => (
                <View key={`existing-${index}`} style={styles.imagePreview}>
                  <Image source={{ uri }} style={styles.previewImage} />
                  <TouchableOpacity 
                    style={styles.removeImageButton}
                    onPress={() => removeExistingImage(index)}
                  >
                    <X size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                  <View style={styles.imageCounter}>
                    <Text style={styles.imageCounterText}>{index + 1}/{totalImages}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* New Images */}
        {images.length > 0 && (
          <View style={styles.imagesContainer}>
            <Text style={styles.sectionLabel}>New Images</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScroll}>
              {images.map((uri, index) => (
                <View key={`new-${index}`} style={styles.imagePreview}>
                  <Image source={{ uri }} style={styles.previewImage} />
                  <TouchableOpacity 
                    style={styles.removeImageButton}
                    onPress={() => removeNewImage(index)}
                  >
                    <X size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                  <View style={styles.imageCounter}>
                    <Text style={styles.imageCounterText}>
                      {existingImages.length + index + 1}/{totalImages}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <TouchableOpacity 
          style={[styles.addImageButton, totalImages >= 20 && styles.addImageButtonDisabled]}
          onPress={pickImage}
          disabled={totalImages >= 20}
        >
          <ImageIcon size={20} color={totalImages >= 20 ? "#CBD5E1" : "#475569"} />
          <Text style={[styles.addImageText, totalImages >= 20 && styles.addImageTextDisabled]}>
            {totalImages > 0 ? `Add More Images (${totalImages}/20)` : 'Add Images (0/20)'}
          </Text>
        </TouchableOpacity>

        <View style={styles.optionsContainer}>
          <TouchableOpacity 
            style={styles.optionButton}
            onPress={() => setShowCategoryPicker(!showCategoryPicker)}
          >
            <Text style={styles.optionLabel}>Category</Text>
            <Text style={styles.optionValue}>{selectedCategory?.label}</Text>
          </TouchableOpacity>

          {showCategoryPicker && (
            <View style={styles.pickerContainer}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.pickerItem,
                    category === cat.value && styles.pickerItemSelected,
                  ]}
                  onPress={() => {
                    setCategory(cat.value);
                    setShowCategoryPicker(false);
                  }}
                >
                  <Text style={[
                    styles.pickerItemText,
                    category === cat.value && styles.pickerItemTextSelected,
                  ]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity 
            style={styles.optionButton}
            onPress={() => setShowVisibilityPicker(!showVisibilityPicker)}
          >
            <Text style={styles.optionLabel}>Visibility</Text>
            <Text style={styles.optionValue}>{selectedVisibility?.label}</Text>
          </TouchableOpacity>

          {showVisibilityPicker && (
            <View style={styles.pickerContainer}>
              {VISIBILITY_OPTIONS.map((vis) => (
                <TouchableOpacity
                  key={vis.value}
                  style={[
                    styles.pickerItem,
                    visibility === vis.value && styles.pickerItemSelected,
                  ]}
                  onPress={() => {
                    setVisibility(vis.value);
                    setShowVisibilityPicker(false);
                  }}
                >
                  <Text style={[
                    styles.pickerItemText,
                    visibility === vis.value && styles.pickerItemTextSelected,
                  ]}>
                    {vis.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  submitButton: {
    backgroundColor: '#475569',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  formContainer: {
    flex: 1,
    padding: 16,
  },
  contentInput: {
    fontSize: 16,
    color: '#1E293B',
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  imagesContainer: {
    marginBottom: 16,
  },
  imagesScroll: {
    flexDirection: 'row',
  },
  imagePreview: {
    width: 120,
    height: 120,
    marginRight: 12,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageCounter: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageCounterText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  addImageButtonDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  addImageText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  addImageTextDisabled: {
    color: '#CBD5E1',
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  optionValue: {
    fontSize: 14,
    color: '#64748B',
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  pickerItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pickerItemSelected: {
    backgroundColor: '#F1F5F9',
  },
  pickerItemText: {
    fontSize: 14,
    color: '#64748B',
  },
  pickerItemTextSelected: {
    color: '#475569',
    fontWeight: '600',
  },
});
