import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Briefcase,
  GraduationCap,
  Calendar,
  Heart,
  MessageSquare,
  Users,
  Sparkles,
  Newspaper,
  Bell,
  ShoppingBag,
  Radio,
  Check,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { debouncedRouter } from '@/utils/navigationDebounce';
import * as ImagePicker from 'expo-image-picker';

const ITEM_TYPES: Record<string, { label: string; icon: any; color: string }> = {
  job: { label: 'Job', icon: Briefcase, color: '#10B981' },
  education: { label: 'Education', icon: GraduationCap, color: '#F59E0B' },
  event: { label: 'Event', icon: Calendar, color: '#8B5CF6' },
  donation: { label: 'Donation', icon: Heart, color: '#EF4444' },
  forum: { label: 'Forum', icon: MessageSquare, color: '#3B82F6' },
  circle: { label: 'Circle', icon: Users, color: '#F97316' },
  circle_post: { label: 'Circle Post', icon: Users, color: '#F97316' },
  news: { label: 'News', icon: Newspaper, color: '#06B6D4' },
  notice: { label: 'Notice', icon: Bell, color: '#EC4899' },
  shop: { label: 'Shop', icon: ShoppingBag, color: '#14B8A6' },
  live: { label: 'Live', icon: Radio, color: '#DC2626' },
  custom: { label: 'Custom', icon: Sparkles, color: '#6366F1' },
};

// Helper to validate image URLs
const isValidImageUrl = (url: string | undefined | null): boolean => {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return false;
  return trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('file://');
};

interface TrendingItem {
  id: string;
  item_type: string;
  item_id: string | null;
  title: string;
  subtitle: string | null;
  description: string | null;
  image_url: string | null;
  source_type: string;
  is_active: boolean;
  priority: number;
  start_date: string;
  end_date: string | null;
  created_at: string;
}

export default function EditTrendingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<TrendingItem | null>(null);
  
  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formSubtitle, setFormSubtitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formPriority, setFormPriority] = useState('50');
  const [formIsActive, setFormIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchItem();
  }, [id]);

  const fetchItem = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('trending_items')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      setItem(data);
      setFormTitle(data.title || '');
      setFormSubtitle(data.subtitle || '');
      setFormDescription(data.description || '');
      setFormImageUrl(data.image_url || '');
      setFormPriority(String(data.priority || 50));
      setFormIsActive(data.is_active);
    } catch (error) {
      console.error('Error fetching trending item:', error);
      Alert.alert('Error', 'Failed to load trending item');
      debouncedRouter.back();
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setFormImageUrl(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!(formTitle || '').trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    setSubmitting(true);
    try {
      const newPriority = parseInt(formPriority) || 1;
      const oldPriority = item?.priority || 0;

      // Only shift if priority changed and item is active
      if (newPriority !== oldPriority && formIsActive) {
        if (newPriority < oldPriority) {
          // Moving up: shift items in range [newPriority, oldPriority-1] down (increase priority)
          const { data: itemsToShift } = await supabase
            .from('trending_items')
            .select('id, priority')
            .gte('priority', newPriority)
            .lt('priority', oldPriority)
            .eq('is_active', true)
            .neq('id', id)
            .order('priority', { ascending: false });

          if (itemsToShift && itemsToShift.length > 0) {
            for (const shiftItem of itemsToShift) {
              await supabase
                .from('trending_items')
                .update({ priority: shiftItem.priority + 1 })
                .eq('id', shiftItem.id);
            }
          }
        } else {
          // Moving down: shift items in range [oldPriority+1, newPriority] up (decrease priority)
          const { data: itemsToShift } = await supabase
            .from('trending_items')
            .select('id, priority')
            .gt('priority', oldPriority)
            .lte('priority', newPriority)
            .eq('is_active', true)
            .neq('id', id)
            .order('priority', { ascending: true });

          if (itemsToShift && itemsToShift.length > 0) {
            for (const shiftItem of itemsToShift) {
              await supabase
                .from('trending_items')
                .update({ priority: shiftItem.priority - 1 })
                .eq('id', shiftItem.id);
            }
          }
        }
      }

      const { error } = await supabase
        .from('trending_items')
        .update({
          title: (formTitle || '').trim(),
          subtitle: (formSubtitle || '').trim() || null,
          description: (formDescription || '').trim() || null,
          image_url: (formImageUrl || '').trim() || null,
          priority: newPriority,
          is_active: formIsActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      Alert.alert('Success', 'Trending item updated!', [
        { text: 'OK', onPress: () => debouncedRouter.back() }
      ]);
    } catch (error: any) {
      console.error('Error updating trending item:', error);
      Alert.alert('Error', error.message || 'Failed to update trending item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to remove this from trending?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('trending_items')
                .delete()
                .eq('id', id);

              if (error) throw error;
              
              Alert.alert('Deleted', 'Item removed from trending', [
                { text: 'OK', onPress: () => debouncedRouter.back() }
              ]);
            } catch (error) {
              console.error('Error deleting item:', error);
              Alert.alert('Error', 'Failed to delete item');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0F172A" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!item) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Item not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const typeConfig = ITEM_TYPES[item.item_type] || ITEM_TYPES.custom;
  const IconComponent = typeConfig.icon;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Trending Item</Text>
        <TouchableOpacity 
          onPress={handleSave}
          disabled={submitting || !(formTitle || '').trim()}
          style={[styles.saveButton, (!(formTitle || '').trim() || submitting) && styles.saveButtonDisabled]}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Check size={18} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Save</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Type Badge (Read-only) */}
          <View style={styles.typeContainer}>
            <Text style={styles.sectionTitle}>Item Type</Text>
            <View style={[styles.typeBadge, { backgroundColor: typeConfig.color }]}>
              <IconComponent size={16} color="#FFFFFF" />
              <Text style={styles.typeBadgeText}>{typeConfig.label}</Text>
            </View>
            {item.item_id && (
              <Text style={styles.linkedText}>Linked to existing item</Text>
            )}
          </View>

          {/* Active Status Toggle */}
          <View style={styles.formGroup}>
            <Text style={styles.sectionTitle}>Status</Text>
            <View style={styles.statusContainer}>
              <TouchableOpacity
                style={[styles.statusOption, formIsActive && styles.statusOptionActive]}
                onPress={() => setFormIsActive(true)}
              >
                <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
                <Text style={[styles.statusText, formIsActive && styles.statusTextActive]}>Active</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statusOption, !formIsActive && styles.statusOptionInactive]}
                onPress={() => setFormIsActive(false)}
              >
                <View style={[styles.statusDot, { backgroundColor: '#94A3B8' }]} />
                <Text style={[styles.statusText, !formIsActive && styles.statusTextActive]}>Inactive</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Title */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter title"
              placeholderTextColor="#94A3B8"
              value={formTitle}
              onChangeText={setFormTitle}
            />
          </View>

          {/* Subtitle */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Subtitle</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter subtitle"
              placeholderTextColor="#94A3B8"
              value={formSubtitle}
              onChangeText={setFormSubtitle}
            />
          </View>

          {/* Image */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Image</Text>
            <View style={styles.imageInputContainer}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Image URL"
                placeholderTextColor="#94A3B8"
                value={formImageUrl}
                onChangeText={setFormImageUrl}
              />
              <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
                <ImageIcon size={20} color="#ffc857" />
              </TouchableOpacity>
            </View>
            {isValidImageUrl(formImageUrl) ? (
              <Image source={{ uri: formImageUrl }} style={styles.imagePreview} />
            ) : null}
          </View>

          {/* Priority */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Priority Position</Text>
            <TextInput
              style={styles.input}
              placeholder="1"
              placeholderTextColor="#94A3B8"
              value={formPriority}
              onChangeText={setFormPriority}
              keyboardType="number-pad"
            />
            <Text style={styles.helperText}>
              Position in trending list (1 = first).
              {'\n'}Changing position will automatically shift other items.
            </Text>
          </View>

          {/* Delete Button */}
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Trash2 size={20} color="#EF4444" />
            <Text style={styles.deleteButtonText}>Delete from Trending</Text>
          </TouchableOpacity>

          {/* Bottom padding */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffc857',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  saveButtonDisabled: {
    backgroundColor: '#E2E8F0',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  typeContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  typeBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  linkedText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
    fontStyle: 'italic',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#0F172A',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 6,
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  statusOptionActive: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  statusOptionInactive: {
    borderColor: '#94A3B8',
    backgroundColor: '#F1F5F9',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  statusTextActive: {
    color: '#0F172A',
    fontWeight: '600',
  },
  imageInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  imagePickerButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
  },
  imagePreview: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    marginTop: 12,
    backgroundColor: '#E2E8F0',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 20,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
});
