import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image, Modal } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter } from 'expo-router';
import { ArrowLeft, Image as ImageIcon, Send, Globe, Users, Lock, X, ChevronDown } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

SplashScreen.preventAutoHideAsync();

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'education', label: 'Education' },
  { value: 'career', label: 'Career' },
  { value: 'health', label: 'Health' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'mental_health', label: 'Mental Health' },
  { value: 'finance', label: 'Finance' },
  { value: 'relationships', label: 'Relationships' },
  { value: 'hobbies', label: 'Hobbies' },
  { value: 'travel', label: 'Travel' },
  { value: 'technology', label: 'Technology' },
  { value: 'entrepreneurship', label: 'Entrepreneurship' },
  { value: 'spirituality', label: 'Spirituality' },
  { value: 'sports', label: 'Sports' },
  { value: 'arts', label: 'Arts' },
  { value: 'music', label: 'Music' },
  { value: 'other', label: 'Other' },
];

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public', icon: Globe, description: 'Anyone can see this post' },
  { value: 'friends_only', label: 'Friends Only', icon: Users, description: 'Only your friends can see this' },
  { value: 'private', label: 'Private', icon: Lock, description: 'Only you can see this' },
];

export default function CreatePostScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [category, setCategory] = useState('general');
  const [visibility, setVisibility] = useState('friends_only');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showVisibilityPicker, setShowVisibilityPicker] = useState(false);
  
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Auth session:', session?.user?.id);
      console.log('User from hook:', user?.id);
    };
    checkAuth();
  }, [user]);

  const pickImage = async () => {
    if (images.length >= 20) {
      Alert.alert('Limit Reached', 'You can only add up to 20 images per post.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera roll permissions to upload images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 20 - images.length,
    });

    if (!result.canceled) {
      const newImages = result.assets.map(asset => asset.uri);
      setImages([...images, ...newImages]);
    }
  };

  const removeImage = (index: number) => {
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
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      Alert.alert('Upload Error', error.message || 'Failed to upload image');
      return null;
    }
  };

  const handleSubmit = async () => {
    console.log('Submit button pressed');
    console.log('Content:', content);
    console.log('User:', user?.id);
    console.log('Images:', images.length);
    console.log('Category:', category);
    console.log('Visibility:', visibility);

    if (!content.trim()) {
      Alert.alert('Error', 'Post content cannot be empty');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a post');
      return;
    }

    try {
      setIsSubmitting(true);
      console.log('Starting post creation...');
      
      let uploadedImageUrls: string[] = [];
      if (images.length > 0) {
        console.log('Uploading images...');
        // Upload all images
        for (const imageUri of images) {
          console.log('Uploading image:', imageUri);
          const url = await uploadImage(imageUri);
          if (url) {
            console.log('Image uploaded:', url);
            uploadedImageUrls.push(url);
          } else {
            console.log('Failed to upload image:', imageUri);
          }
        }
        
        if (uploadedImageUrls.length === 0 && images.length > 0) {
          Alert.alert('Warning', 'Failed to upload images. Post will be created without images.');
        }
      }
      
      const postData = {
        user_id: user.id,
        content: content.trim(),
        image_url: uploadedImageUrls.length > 0 ? uploadedImageUrls[0] : null,
        image_urls: uploadedImageUrls.length > 0 ? uploadedImageUrls : null,
        category,
        visibility,
      };
      
      console.log('Inserting post:', postData);
      
      const { data, error } = await supabase.from('posts').insert(postData).select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Post created successfully:', data);

      Alert.alert('Success', 'Post created successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error('Error creating post:', error);
      Alert.alert('Error', error.message || 'Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!fontsLoaded || !user) {
    return null;
  }

  const selectedCategory = CATEGORIES.find(c => c.value === category);
  const selectedVisibility = VISIBILITY_OPTIONS.find(v => v.value === visibility);
  const VisibilityIcon = selectedVisibility?.icon || Globe;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.title}>Create Post</Text>
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
          placeholder="What's on your mind?"
          placeholderTextColor="#94A3B8"
          multiline
          value={content}
          onChangeText={setContent}
          maxLength={2000}
          textAlignVertical="top"
        />
        
        {images.length > 0 && (
          <View style={styles.imagesContainer}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.imagesScroll}
            >
              {images.map((imageUri, index) => (
                <View key={index} style={styles.imagePreview}>
                  <Image source={{ uri: imageUri }} style={styles.previewImage} />
                  <TouchableOpacity 
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <X size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                  <View style={styles.imageCounter}>
                    <Text style={styles.imageCounterText}>{index + 1}/{images.length}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <TouchableOpacity 
          style={styles.addImageButton} 
          onPress={pickImage}
          disabled={images.length >= 20}
        >
          <ImageIcon size={20} color={images.length >= 20 ? '#CBD5E1' : '#475569'} />
          <Text style={[
            styles.addImageText,
            images.length >= 20 && styles.addImageTextDisabled
          ]}>
            {images.length === 0 ? 'Add Images' : `Add More Images (${images.length}/20)`}
          </Text>
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Category</Text>
          <TouchableOpacity 
            style={styles.pickerButton}
            onPress={() => setShowCategoryPicker(true)}
          >
            <Text style={styles.pickerButtonText}>{selectedCategory?.label}</Text>
            <ChevronDown size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Who can see this?</Text>
          <TouchableOpacity 
            style={styles.pickerButton}
            onPress={() => setShowVisibilityPicker(true)}
          >
            <View style={styles.visibilityButtonContent}>
              <VisibilityIcon size={18} color="#64748B" />
              <Text style={styles.pickerButtonText}>{selectedVisibility?.label}</Text>
            </View>
            <ChevronDown size={20} color="#64748B" />
          </TouchableOpacity>
          <Text style={styles.visibilityDescription}>
            {selectedVisibility?.description}
          </Text>
        </View>
      </ScrollView>

      {/* Category Picker Modal */}
      <Modal
        visible={showCategoryPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
                <X size={24} color="#1E293B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.modalOption,
                    category === cat.value && styles.modalOptionSelected
                  ]}
                  onPress={() => {
                    setCategory(cat.value);
                    setShowCategoryPicker(false);
                  }}
                >
                  <Text style={[
                    styles.modalOptionText,
                    category === cat.value && styles.modalOptionTextSelected
                  ]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Visibility Picker Modal */}
      <Modal
        visible={showVisibilityPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowVisibilityPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Post Visibility</Text>
              <TouchableOpacity onPress={() => setShowVisibilityPicker(false)}>
                <X size={24} color="#1E293B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              {VISIBILITY_OPTIONS.map((vis) => {
                const Icon = vis.icon;
                return (
                  <TouchableOpacity
                    key={vis.value}
                    style={[
                      styles.modalOption,
                      visibility === vis.value && styles.modalOptionSelected
                    ]}
                    onPress={() => {
                      setVisibility(vis.value);
                      setShowVisibilityPicker(false);
                    }}
                  >
                    <View style={styles.visibilityOption}>
                      <Icon size={20} color={visibility === vis.value ? '#475569' : '#64748B'} />
                      <View style={styles.visibilityOptionText}>
                        <Text style={[
                          styles.modalOptionText,
                          visibility === vis.value && styles.modalOptionTextSelected
                        ]}>
                          {vis.label}
                        </Text>
                        <Text style={styles.visibilityOptionDescription}>
                          {vis.description}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
  },
  submitButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  formContainer: {
    flex: 1,
    padding: 16,
  },
  contentInput: {
    minHeight: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1E293B',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  imagesContainer: {
    marginBottom: 16,
  },
  imagesScroll: {
    flexGrow: 0,
  },
  imagePreview: {
    position: 'relative',
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
    width: 280,
    height: 200,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E2E8F0',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageCounter: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageCounterText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
    gap: 8,
  },
  addImageText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#475569',
  },
  addImageTextDisabled: {
    color: '#CBD5E1',
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#64748B',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
  },
  pickerButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1E293B',
  },
  visibilityButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  visibilityDescription: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#94A3B8',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalOptionSelected: {
    backgroundColor: '#F8FAFC',
  },
  modalOptionText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1E293B',
  },
  modalOptionTextSelected: {
    fontFamily: 'Inter-SemiBold',
    color: '#475569',
  },
  visibilityOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  visibilityOptionText: {
    flex: 1,
  },
  visibilityOptionDescription: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#94A3B8',
    marginTop: 2,
  },
});