import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  StatusBar as RNStatusBar,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { debouncedRouter } from '@/utils/navigationDebounce';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  Image as ImageIcon,
  Calendar,
  DollarSign,
  FileText,
  Tag,
  Target,
  X,
  Check,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

const CATEGORIES = [
  { value: 'Infrastructure', label: 'Infrastructure', icon: '🏫' },
  { value: 'Scholarship', label: 'Scholarship', icon: '🎓' },
  { value: 'Sports', label: 'Sports', icon: '⚽' },
  { value: 'Technology', label: 'Technology', icon: '💻' },
  { value: 'Academic', label: 'Academic', icon: '📚' },
  { value: 'Events', label: 'Events', icon: '🎉' },
  { value: 'Emergency', label: 'Emergency', icon: '🚨' },
  { value: 'Other', label: 'Other', icon: '📌' },
];

export default function CreateCampaignScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [category, setCategory] = useState('');
  const [deadline, setDeadline] = useState('');
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [isFeatured, setIsFeatured] = useState(false);
  const [loading, setLoading] = useState(false);

  const pickImages = async () => {
    if (imageUris.length >= 10) {
      Alert.alert('Limit Reached', 'You can only upload up to 10 images per campaign');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
      allowsMultipleSelection: false,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUris(prev => [...prev, result.assets[0].uri]);
    }
  };

  const removeImage = (index: number) => {
    setImageUris(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImage = async (uri: string, index: number): Promise<string> => {
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();
    const fileExt = uri.split('.').pop();
    const fileName = `campaign-${Date.now()}-${index}.${fileExt}`;
    const filePath = `campaigns/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('campaign-images')
      .upload(filePath, new Uint8Array(arrayBuffer), {
        contentType: `image/${fileExt}`,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('campaign-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async () => {
    // Validation
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a campaign title');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }
    if (!goalAmount || parseFloat(goalAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid goal amount');
      return;
    }
    if (!category) {
      Alert.alert('Error', 'Please select a category');
      return;
    }
    if (imageUris.length === 0) {
      Alert.alert('Error', 'Please select at least one campaign image');
      return;
    }

    try {
      setLoading(true);

      // Upload all images
      const uploadedUrls = await Promise.all(
        imageUris.map((uri, index) => uploadImage(uri, index))
      );

      // Create campaign
      const { error } = await supabase
        .from('donation_campaigns')
        .insert({
          title: title.trim(),
          description: description.trim(),
          goal_amount: parseFloat(goalAmount),
          current_amount: 0,
          category,
          deadline: deadline.trim() || null,
          campaign_image: uploadedUrls[0], // First image as fallback
          campaign_images: uploadedUrls, // All images array
          status: 'active',
          is_featured: isFeatured,
          created_by: user?.id,
        });

      if (error) throw error;

      Alert.alert(
        'Success! 🎉',
        'Campaign created successfully',
        [
          {
            text: 'OK',
            onPress: () => debouncedRouter.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error creating campaign:', error);
      Alert.alert('Error', 'Failed to create campaign. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <RNStatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => debouncedRouter.back()}
          >
            <ChevronLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Campaign</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Campaign Images */}
        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Campaign Images *</Text>
            <Text style={styles.imageCount}>{imageUris.length}/10</Text>
          </View>
          <Text style={styles.helperText}>Upload up to 10 images for your campaign</Text>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.imagesScroll}
          >
            {imageUris.map((uri, index) => (
              <View key={index} style={styles.imagePreviewContainer}>
                <Image source={{ uri }} style={styles.previewImageThumb} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => removeImage(index)}
                >
                  <X size={14} color="#FFFFFF" />
                </TouchableOpacity>
                <View style={styles.imageNumber}>
                  <Text style={styles.imageNumberText}>{index + 1}</Text>
                </View>
              </View>
            ))}
            
            {imageUris.length < 10 && (
              <TouchableOpacity 
                style={styles.addImageButton} 
                onPress={pickImages}
              >
                <ImageIcon size={32} color="#94A3B8" />
                <Text style={styles.addImageText}>Add Image</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.label}>Campaign Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., New Library Building Fund"
            placeholderTextColor="#94A3B8"
            maxLength={100}
          />
        </View>

        {/* Overview */}
        <View style={styles.section}>
          <Text style={styles.label}>Campaign Overview *</Text>
          <TextInput
            style={[styles.input, styles.textAreaLarge]}
            value={description}
            onChangeText={setDescription}
            placeholder="Provide a comprehensive overview of the campaign, its goals, expected impact, and why it matters..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={10}
            maxLength={2000}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{description.length}/2000</Text>
        </View>

        {/* Goal Amount */}
        <View style={styles.section}>
          <Text style={styles.label}>Goal Amount (GH₵) *</Text>
          <View style={styles.inputWithIcon}>
            <DollarSign size={20} color="#64748B" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.inputWithPadding]}
              value={goalAmount}
              onChangeText={setGoalAmount}
              placeholder="0.00"
              placeholderTextColor="#94A3B8"
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={styles.label}>Category *</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.categoryButton,
                  category === cat.value && styles.categoryButtonActive,
                ]}
                onPress={() => setCategory(cat.value)}
              >
                <Text style={styles.categoryIcon}>{cat.icon}</Text>
                <Text
                  style={[
                    styles.categoryText,
                    category === cat.value && styles.categoryTextActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Deadline */}
        <View style={styles.section}>
          <Text style={styles.label}>Deadline (Optional)</Text>
          <View style={styles.inputWithIcon}>
            <Calendar size={20} color="#64748B" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.inputWithPadding]}
              value={deadline}
              onChangeText={setDeadline}
              placeholder="2025-12-31"
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>

        {/* Featured Toggle */}
        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLabel}>
              <Target size={20} color="#ffc857" />
              <Text style={styles.label}>Featured Campaign</Text>
            </View>
            <Switch
              value={isFeatured}
              onValueChange={setIsFeatured}
              trackColor={{ false: '#CBD5E1', true: '#ffc857' }}
              thumbColor="#FFFFFF"
            />
          </View>
          <Text style={styles.helperText}>
            Featured campaigns appear at the top of the donation page
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <LinearGradient
            colors={['#ffc857', '#ffb020']}
            style={styles.submitGradient}
          >
            {loading ? (
              <ActivityIndicator color="#0F172A" />
            ) : (
              <>
                <Check size={20} color="#0F172A" />
                <Text style={styles.submitButtonText}>Create Campaign</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#0F172A',
  },
  textArea: {
    minHeight: 120,
  },
  textAreaLarge: {
    minHeight: 180,
  },
  charCount: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'right',
  },
  inputWithIcon: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    top: 18,
    zIndex: 1,
  },
  inputWithPadding: {
    paddingLeft: 48,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  imageCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  imagesScroll: {
    marginTop: 12,
  },
  imagePreviewContainer: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginRight: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  previewImageThumb: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageNumber: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  imageNumberText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  addImageButton: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  addImageText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryButton: {
    width: '30%',
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  categoryButtonActive: {
    backgroundColor: 'rgba(255, 200, 87, 0.1)',
    borderColor: '#ffc857',
  },
  categoryIcon: {
    fontSize: 28,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  categoryTextActive: {
    color: '#0F172A',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  helperText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 8,
    lineHeight: 18,
  },
  submitButton: {
    marginHorizontal: 20,
    marginTop: 32,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#ffc857',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
});
