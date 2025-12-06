import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, Alert, ActivityIndicator, Platform } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, Upload, Image as ImageIcon, X, Sparkles } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export default function TrendingCreateScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [summary, setSummary] = useState('');
  const [articleContent, setArticleContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [category, setCategory] = useState('alumni_news');
  const [linkUrl, setLinkUrl] = useState('');
  const [isFeatured, setIsFeatured] = useState(true);

  // Categories for trending articles
  const categories = [
    { value: 'alumni_news', label: 'Alumni News', emoji: '📰' },
    { value: 'events', label: 'Events', emoji: '🎉' },
    { value: 'achievements', label: 'Achievements', emoji: '🏆' },
    { value: 'announcements', label: 'Announcements', emoji: '📢' },
  ];

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Please grant permission to access your photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      setUploading(true);

      // Generate unique filename
      const fileExt = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;

      console.log('📤 Uploading image to trending-articles bucket:', filePath);

      // Create FormData for React Native
      const formData = new FormData();
      formData.append('file', {
        uri: uri,
        type: `image/${fileExt}`,
        name: fileName,
      } as any);

      // Upload to Supabase Storage using FormData
      const { data, error } = await supabase.storage
        .from('trending-articles')
        .upload(filePath, formData, {
          contentType: `image/${fileExt}`,
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Upload error:', error);
        throw error;
      }

      console.log('✅ Image uploaded successfully:', data.path);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('trending-articles')
        .getPublicUrl(data.path);

      setImageUrl(urlData.publicUrl);
      console.log('🔗 Public URL:', urlData.publicUrl);
      Alert.alert('Success', 'Image uploaded successfully');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!title.trim()) {
      Alert.alert('Required Field', 'Please enter a title');
      return;
    }
    if (!summary.trim()) {
      Alert.alert('Required Field', 'Please enter a summary');
      return;
    }
    if (!imageUrl) {
      Alert.alert('Required Field', 'Please upload a cover image');
      return;
    }
    if (!articleContent.trim()) {
      Alert.alert('Required Field', 'Please enter article content');
      return;
    }

    try {
      setLoading(true);

      // Get the highest order_index and increment
      const { data: existingArticles } = await supabase
        .from('trending_articles')
        .select('order_index')
        .order('order_index', { ascending: false })
        .limit(1);

      const nextOrderIndex = existingArticles && existingArticles.length > 0 
        ? (existingArticles[0].order_index || 0) + 1 
        : 1;

      // Insert trending article
      const { data, error } = await supabase
        .from('trending_articles')
        .insert({
          title: title.trim(),
          subtitle: subtitle.trim() || null,
          summary: summary.trim(),
          image_url: imageUrl,
          article_content: articleContent.trim(),
          author_id: user?.id,
          category,
          link_url: linkUrl.trim() || null,
          is_featured: isFeatured,
          is_active: true,
          order_index: nextOrderIndex,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating trending article:', error);
        throw error;
      }

      console.log('✅ Trending article created:', data.id);
      Alert.alert(
        'Success', 
        'Trending article published successfully!',
        [
          {
            text: 'OK',
            onPress: () => debouncedRouter.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error creating trending article:', error);
      Alert.alert('Error', error.message || 'Failed to create trending article');
    } finally {
      setLoading(false);
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#111827" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Trending Article</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Cover Image */}
          <View style={styles.section}>
            <Text style={styles.label}>Cover Image *</Text>
            {imageUrl ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: imageUrl }} style={styles.imagePreview} />
                <TouchableOpacity 
                  style={styles.removeImageButton}
                  onPress={() => setImageUrl('')}
                >
                  <X size={20} color="#FFFFFF" strokeWidth={2} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.uploadButton}
                onPress={pickImage}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#0EA5E9" />
                ) : (
                  <>
                    <ImageIcon size={32} color="#9CA3AF" strokeWidth={2} />
                    <Text style={styles.uploadButtonText}>Tap to upload image</Text>
                    <Text style={styles.uploadButtonSubtext}>Recommended: 16:9 aspect ratio</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Title */}
          <View style={styles.section}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter an engaging title"
              placeholderTextColor="#9CA3AF"
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
            <Text style={styles.charCount}>{title.length}/100</Text>
          </View>

          {/* Subtitle */}
          <View style={styles.section}>
            <Text style={styles.label}>Subtitle</Text>
            <TextInput
              style={styles.input}
              placeholder="Optional subtitle"
              placeholderTextColor="#9CA3AF"
              value={subtitle}
              onChangeText={setSubtitle}
              maxLength={150}
            />
            <Text style={styles.charCount}>{subtitle.length}/150</Text>
          </View>

          {/* Summary */}
          <View style={styles.section}>
            <Text style={styles.label}>Summary *</Text>
            <Text style={styles.helperText}>This appears on the trending card</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Brief description for the card preview"
              placeholderTextColor="#9CA3AF"
              value={summary}
              onChangeText={setSummary}
              maxLength={200}
              multiline
              numberOfLines={3}
            />
            <Text style={styles.charCount}>{summary.length}/200</Text>
          </View>

          {/* Category */}
          <View style={styles.section}>
            <Text style={styles.label}>Category *</Text>
            <View style={styles.categoryGrid}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.categoryButton,
                    category === cat.value && styles.categoryButtonActive,
                  ]}
                  onPress={() => setCategory(cat.value)}
                >
                  <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                  <Text 
                    style={[
                      styles.categoryLabel,
                      category === cat.value && styles.categoryLabelActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Article Content */}
          <View style={styles.section}>
            <Text style={styles.label}>Article Content *</Text>
            <Text style={styles.helperText}>Full article that readers will see</Text>
            <TextInput
              style={[styles.input, styles.articleTextArea]}
              placeholder="Write your full article content here. You can include paragraphs, lists, and formatting instructions."
              placeholderTextColor="#9CA3AF"
              value={articleContent}
              onChangeText={setArticleContent}
              multiline
              numberOfLines={10}
              textAlignVertical="top"
            />
          </View>

          {/* External Link (Optional) */}
          <View style={styles.section}>
            <Text style={styles.label}>External Link</Text>
            <Text style={styles.helperText}>Optional link to external website or resource</Text>
            <TextInput
              style={styles.input}
              placeholder="https://example.com"
              placeholderTextColor="#9CA3AF"
              value={linkUrl}
              onChangeText={setLinkUrl}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>

          {/* Featured Toggle */}
          <View style={styles.section}>
            <TouchableOpacity 
              style={styles.toggleRow}
              onPress={() => setIsFeatured(!isFeatured)}
            >
              <View style={styles.toggleLeft}>
                <Sparkles 
                  size={24} 
                  color={isFeatured ? '#0EA5E9' : '#9CA3AF'} 
                  strokeWidth={2}
                  fill={isFeatured ? '#0EA5E9' : 'none'}
                />
                <View style={styles.toggleTextContainer}>
                  <Text style={styles.toggleLabel}>Featured Article</Text>
                  <Text style={styles.toggleDescription}>Show in trending carousel</Text>
                </View>
              </View>
              <View style={[styles.toggle, isFeatured && styles.toggleActive]}>
                <View style={[styles.toggleThumb, isFeatured && styles.toggleThumbActive]} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Upload size={20} color="#FFFFFF" strokeWidth={2} />
                <Text style={styles.submitButtonText}>Publish Article</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </View>
  );
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
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  articleTextArea: {
    minHeight: 200,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
  },
  uploadButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 12,
  },
  uploadButtonSubtext: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8,
  },
  categoryButtonActive: {
    borderColor: '#0EA5E9',
    backgroundColor: '#EFF6FF',
  },
  categoryEmoji: {
    fontSize: 28,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  categoryLabelActive: {
    color: '#0EA5E9',
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  toggleDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  toggle: {
    width: 51,
    height: 31,
    borderRadius: 16,
    backgroundColor: '#D1D5DB',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: '#0EA5E9',
  },
  toggleThumb: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0EA5E9',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
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
