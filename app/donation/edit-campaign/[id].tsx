import React, { useState, useEffect } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { debouncedRouter } from '@/utils/navigationDebounce';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  Image as ImageIcon,
  Calendar,
  DollarSign,
  Target,
  X,
  Check,
  Trash2,
  AlertTriangle,
  Trophy,
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

export default function EditCampaignScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [category, setCategory] = useState('');
  const [deadline, setDeadline] = useState('');
  const [imageUri, setImageUri] = useState('');
  const [existingImageUrl, setExistingImageUrl] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user?.id) {
      checkAdminAndLoadCampaign();
    }
  }, [id, user]);

  const checkAdminAndLoadCampaign = async () => {
    if (!user?.id) {
      console.log('⚠️ No user ID available yet');
      return;
    }

    try {
      console.log('🔍 Checking admin status for user:', user.id);
      
      // Check admin status
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin, role')
        .eq('id', user.id)
        .single();

      console.log('👤 Profile data:', profileData);
      console.log('❌ Profile error:', profileError);

      const adminStatus = profileData?.is_admin === true || profileData?.role === 'admin';
      console.log('🛡️ Admin status:', adminStatus);
      
      setIsAdmin(adminStatus);

      if (!adminStatus) {
        console.log('❌ Access denied - not an admin');
        Alert.alert('Access Denied', 'You need admin privileges to edit campaigns');
        debouncedRouter.back();
        return;
      }

      console.log('✅ Admin access granted, loading campaign...');

      // Load campaign data
      const { data: campaign, error } = await supabase
        .from('donation_campaigns')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (campaign) {
        console.log('📦 Campaign loaded:', campaign.title);
        setTitle(campaign.title);
        setDescription(campaign.description);
        setGoalAmount(campaign.goal_amount.toString());
        setCategory(campaign.category);
        setDeadline(campaign.deadline ? campaign.deadline.split('T')[0] : '');
        setExistingImageUrl(campaign.campaign_image || '');
        setIsFeatured(campaign.is_featured || false);
        setIsActive(campaign.status === 'active');
      }
    } catch (error) {
      console.error('❌ Error loading campaign:', error);
      Alert.alert('Error', 'Failed to load campaign details');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
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
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string): Promise<string> => {
    // Create form data for upload
    const fileExt = uri.split('.').pop();
    const fileName = `campaign-${Date.now()}.${fileExt}`;
    const filePath = `campaigns/${fileName}`;

    // Fetch the file as array buffer
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();
    const fileData = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from('campaign-images')
      .upload(filePath, fileData, {
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

  const handleSave = async () => {
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
    if (!deadline) {
      Alert.alert('Error', 'Please enter a deadline (YYYY-MM-DD)');
      return;
    }

    try {
      setSaving(true);

      let imageUrl = existingImageUrl;

      // Upload new image if selected
      if (imageUri) {
        imageUrl = await uploadImage(imageUri);
      }

      if (!imageUrl) {
        Alert.alert('Error', 'Campaign must have an image');
        return;
      }

      // Update campaign
      const { error } = await supabase
        .from('donation_campaigns')
        .update({
          title: title.trim(),
          description: description.trim(),
          goal_amount: parseFloat(goalAmount),
          category,
          deadline,
          campaign_image: imageUrl,
          status: isActive ? 'active' : 'inactive',
          is_featured: isFeatured,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('❌ Update error:', error);
        Alert.alert(
          'Update Failed', 
          `Could not update campaign: ${error.message}. You may not have permission to edit this campaign.`,
          [{ text: 'OK' }]
        );
        throw error;
      }

      console.log('✅ Campaign updated successfully');

      Alert.alert(
        'Success! 🎉',
        'Campaign updated successfully',
        [
          {
            text: 'OK',
            onPress: () => debouncedRouter.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error updating campaign:', error);
      Alert.alert('Error', 'Failed to update campaign. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Campaign',
      'Are you sure you want to delete this campaign? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: confirmDelete,
        },
      ]
    );
  };

  const confirmDelete = async () => {
    try {
      setSaving(true);

      // First, check if there are any donations
      const { data: donations, error: donationsError } = await supabase
        .from('donations')
        .select('id')
        .eq('campaign_id', id);

      if (donationsError) throw donationsError;

      if (donations && donations.length > 0) {
        Alert.alert(
          'Cannot Delete',
          'This campaign has donations and cannot be deleted. You can set its status to "Cancelled" instead.',
          [{ text: 'OK' }]
        );
        setSaving(false);
        return;
      }

      // Delete the campaign
      const { error } = await supabase
        .from('donation_campaigns')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Delete error:', error);
        Alert.alert(
          'Delete Failed',
          `Could not delete campaign: ${error.message}. You may not have permission to delete this campaign.`,
          [{ text: 'OK' }]
        );
        throw error;
      }

      console.log('✅ Campaign deleted successfully');

      Alert.alert(
        'Deleted',
        'Campaign has been deleted successfully',
        [
          {
            text: 'OK',
            onPress: () => {
              debouncedRouter.back();
              debouncedRouter.back(); // Go back twice to return to main donations page
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error deleting campaign:', error);
      Alert.alert('Error', 'Failed to delete campaign. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffc857" />
      </View>
    );
  }

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
          <Text style={styles.headerTitle}>Edit Campaign</Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
          >
            <Trash2 size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Campaign Image */}
        <View style={styles.section}>
          <Text style={styles.label}>Campaign Image *</Text>
          <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
            {imageUri || existingImageUrl ? (
              <View style={styles.imagePreview}>
                <Image 
                  source={{ uri: imageUri || existingImageUrl }} 
                  style={styles.previewImage} 
                />
                <TouchableOpacity
                  style={styles.changeImageButton}
                  onPress={pickImage}
                >
                  <ImageIcon size={16} color="#FFFFFF" />
                  <Text style={styles.changeImageText}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.imagePlaceholder}>
                <ImageIcon size={32} color="#94A3B8" />
                <Text style={styles.imagePlaceholderText}>Tap to select image</Text>
              </View>
            )}
          </TouchableOpacity>
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

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.label}>Campaign Overview *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the campaign, its goals, and expected impact..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={8}
            maxLength={1000}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{description.length}/1000</Text>
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
              <Trophy size={20} color="#ffc857" />
              <View>
                <Text style={styles.label}>Featured Campaign</Text>
                <Text style={styles.helperText}>
                  Featured campaigns appear at the top of the donation page
                </Text>
              </View>
            </View>
            <Switch
              value={isFeatured}
              onValueChange={setIsFeatured}
              trackColor={{ false: '#CBD5E1', true: '#ffc857' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Campaign Status Toggle */}
        <View style={styles.section}>
          <View style={styles.statusContainer}>
            <View style={styles.statusHeader}>
              <Target size={20} color={isActive ? '#10B981' : '#64748B'} />
              <Text style={styles.label}>Campaign Status</Text>
            </View>
            <Text style={styles.helperText}>
              {isActive ? 'Active campaigns are visible to all users' : 'Inactive campaigns only appear in admin dashboard'}
            </Text>
            <View style={styles.toggleWithLabel}>
              <Text style={[styles.toggleStatusText, !isActive && styles.toggleStatusTextActive]}>Inactive</Text>
              <Switch
                value={isActive}
                onValueChange={setIsActive}
                trackColor={{ false: '#EF4444', true: '#10B981' }}
                thumbColor="#FFFFFF"
              />
              <Text style={[styles.toggleStatusText, isActive && styles.toggleStatusTextActive]}>Active</Text>
            </View>
          </View>
        </View>

        {/* Warning for Inactive Campaigns */}
        {!isActive && (
          <View style={styles.warningBox}>
            <AlertTriangle size={20} color="#EF4444" />
            <Text style={styles.warningText}>
              This campaign is inactive and will only be visible in the admin dashboard.
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <LinearGradient
              colors={['#ffc857', '#ffb020']}
              style={styles.saveGradient}
            >
              {saving ? (
                <ActivityIndicator color="#0F172A" />
              ) : (
                <>
                  <Check size={20} color="#0F172A" />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  deleteButton: {
    padding: 8,
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
  imagePickerButton: {
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  imagePlaceholder: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  imagePlaceholderText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  imagePreview: {
    height: 200,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  changeImageButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  changeImageText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
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
  statusContainer: {
    gap: 12,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  toggleWithLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  toggleStatusText: {
    fontSize: 13,
    color: '#64748B',
  },
  toggleStatusTextActive: {
    fontWeight: '600',
    color: '#0F172A',
  },
  helperText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 18,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  actionButtons: {
    marginHorizontal: 20,
    marginTop: 32,
  },
  saveButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#ffc857',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
});
