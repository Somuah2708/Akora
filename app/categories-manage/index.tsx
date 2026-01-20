import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator, TextInput } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, Upload, Save, RefreshCw } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase, type HomeCategoryTab } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export default function CategoriesManageScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<HomeCategoryTab[]>([]);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('home_category_tabs')
        .select('*')
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (error) throw error;

      setCategories((data as HomeCategoryTab[]) || []);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      Alert.alert('Error', 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const pickImageForCategory = async (categoryId: string) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Please grant permission to access your photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadCategoryImage(categoryId, result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadCategoryImage = async (categoryId: string, uri: string) => {
    try {
      setUploadingId(categoryId);

      const fileExt = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const fileName = `category-${categoryId}-${Date.now()}.${fileExt}`;
      const filePath = `categories/${fileName}`;

      console.log('📤 Uploading category image:', filePath);

      // Create FormData for React Native
      const formData = new FormData();
      formData.append('file', {
        uri: uri,
        type: `image/${fileExt}`,
        name: fileName,
      } as any);

      // Upload to Supabase Storage (using post-media bucket for now)
      const { data, error } = await supabase.storage
        .from('post-media')
        .upload(filePath, formData, {
          contentType: `image/${fileExt}`,
          cacheControl: '3600',
          upsert: true, // Allow replacing existing images
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('post-media')
        .getPublicUrl(data.path);

      // Update category in database
      const { error: updateError } = await supabase
        .from('home_category_tabs')
        .update({ image_url: urlData.publicUrl })
        .eq('id', categoryId);

      if (updateError) throw updateError;

      // Update local state
      setCategories(prev => 
        prev.map(cat => 
          cat.id === categoryId 
            ? { ...cat, image_url: urlData.publicUrl }
            : cat
        )
      );

      Alert.alert('Success', 'Background image updated!');
      console.log('✅ Category image updated');
    } catch (error: any) {
      console.error('Error uploading category image:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload image');
    } finally {
      setUploadingId(null);
    }
  };

  const updateCategoryColor = async (categoryId: string, color: string) => {
    try {
      const { error } = await supabase
        .from('home_category_tabs')
        .update({ color })
        .eq('id', categoryId);

      if (error) throw error;

      setCategories(prev =>
        prev.map(cat =>
          cat.id === categoryId ? { ...cat, color } : cat
        )
      );
    } catch (error: any) {
      console.error('Error updating color:', error);
      Alert.alert('Error', 'Failed to update color');
    }
  };

  // Check if user is admin
  if (!profile?.is_admin && profile?.role !== 'admin') {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Admin access required</Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#111827" strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manage Categories</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0F172A" />
          <Text style={styles.loadingText}>Loading categories...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#111827" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Categories</Text>
        <TouchableOpacity onPress={fetchCategories} style={styles.refreshButton}>
          <RefreshCw size={20} color="#0EA5E9" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Tap on any category card to change its background image. The image will appear behind the icon and text.
            </Text>
          </View>

          {categories.map((category, index) => (
            <View key={category.id} style={styles.categoryCard}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryNumber}>#{index + 1}</Text>
                <Text style={styles.categoryName}>{category.title}</Text>
              </View>

              <TouchableOpacity
                style={styles.imagePreviewContainer}
                onPress={() => pickImageForCategory(category.id)}
                disabled={uploadingId === category.id}
              >
                {category.image_url && !failedImages.has(category.id) ? (
                  <>
                    <Image
                      source={{ uri: category.image_url }}
                      style={styles.imagePreview}
                      resizeMode="cover"
                      onError={() => {
                        console.log('Category image failed to load:', category.id, category.image_url);
                        setFailedImages(prev => new Set([...prev, category.id]));
                      }}
                    />
                    <View
                      style={[
                        styles.imageOverlay,
                        { backgroundColor: category.color + '95' },
                      ]}
                    >
                      <Text style={styles.overlayIcon}>{getCategoryIcon(category.icon_name)}</Text>
                      <Text style={styles.overlayText}>{category.title}</Text>
                    </View>
                  </>
                ) : (
                  <View style={[styles.noImagePlaceholder, category.color && !failedImages.has(category.id) ? {} : { backgroundColor: category.color || '#6366F1' }]}>
                    <Upload size={32} color="#9CA3AF" strokeWidth={2} />
                    <Text style={styles.noImageText}>{failedImages.has(category.id) ? 'Image failed to load' : 'No image'}</Text>
                  </View>
                )}
                {uploadingId === category.id && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                    <Text style={styles.uploadingText}>Uploading...</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.categoryInfo}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Icon:</Text>
                  <Text style={styles.infoValue}>{category.icon_name}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Color:</Text>
                  <View
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: category.color },
                    ]}
                  />
                  <Text style={styles.infoValue}>{category.color}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Route:</Text>
                  <Text style={styles.infoValue}>{category.route}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.changeImageButton}
                onPress={() => pickImageForCategory(category.id)}
                disabled={uploadingId === category.id}
              >
                <Upload size={18} color="#0EA5E9" strokeWidth={2} />
                <Text style={styles.changeImageButtonText}>
                  {category.image_url ? 'Change Image' : 'Upload Image'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </View>
  );
}

function getCategoryIcon(iconName: string): string {
  const iconMap: Record<string, string> = {
    BookOpen: '📚',
    PartyPopper: '🎉',
    Calendar: '📅',
    TrendingUp: '📈',
    Users: '👥',
    Newspaper: '📰',
  };
  return iconMap[iconName] || '📌';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  refreshButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  infoBox: {
    backgroundColor: '#EFF6FF',
    borderLeftWidth: 4,
    borderLeftColor: '#0EA5E9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  categoryNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  imagePreviewContainer: {
    position: 'relative',
    width: '100%',
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#F3F4F6',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  overlayIcon: {
    fontSize: 32,
  },
  overlayText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  noImagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  noImageText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  categoryInfo: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    width: 60,
  },
  infoValue: {
    fontSize: 13,
    color: '#111827',
    flex: 1,
  },
  colorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  changeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 2,
    borderColor: '#0EA5E9',
    borderRadius: 12,
    paddingVertical: 12,
  },
  changeImageButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0EA5E9',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#EF4444',
  },
});
