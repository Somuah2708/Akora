import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  Image,
  KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { useAuth } from '@/hooks/useAuth';
import { supabase, type ProductService } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, Loader2, Plus, X } from 'lucide-react-native';

const CATEGORIES = [
  // Services
  'Business Services',
  'Education & Tutoring',
  'Technical Services',
  'Creative & Design',
  'Food & Catering',
  'Healthcare',
  // Products
  'Electronics',
  'Clothing & Fashion',
  'Books & Media',
  'Home & Garden',
  'Sports & Outdoors',
  'Health & Beauty',
  'Toys & Games',
  'Automotive',
  'Other',
];

type ListingType = 'product' | 'service';

type Condition = 'new' | 'used' | 'not_applicable';

export default function EditListingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [listingType, setListingType] = useState<ListingType>('product');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState<Condition>('not_applicable');
  const [locationCity, setLocationCity] = useState('');
  const [locationRegion, setLocationRegion] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactWhatsapp, setContactWhatsapp] = useState('');
  const [imageUris, setImageUris] = useState<string[]>([]);

  const canSave =
    !!user &&
    title.trim().length > 3 &&
    description.trim().length > 10 &&
    category.trim().length > 0 &&
    price.trim().length > 0;

  useEffect(() => {
    const loadListing = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('products_services')
          .select('*')
          .eq('id', id as string)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          Alert.alert('Not found', 'This listing could not be found.');
          debouncedRouter.back();
          return;
        }

        if (user && data.user_id !== user.id && !(user as any).is_admin) {
          Alert.alert('Not allowed', 'You cannot edit this listing.');
          debouncedRouter.back();
          return;
        }

        setTitle(data.title || '');
        setDescription(data.description || '');
        setPrice(data.price != null ? String(data.price) : '');
        setListingType((data as any).type || 'product');
        setCategory(data.category_name || '');
        setCondition(((data as any).condition || 'not_applicable') as Condition);
        setLocationCity((data as any).location_city || '');
        setLocationRegion((data as any).location_region || '');
        setContactPhone((data as any).contact_phone || '');
        setContactWhatsapp((data as any).contact_whatsapp || '');
        const existingImages = (data as any).image_urls || [];
        if (existingImages.length === 0 && data.image_url) {
          setImageUris([data.image_url]);
        } else {
          setImageUris(existingImages);
        }
      } catch (err) {
        console.error('Error loading listing to edit', err);
        Alert.alert('Error', 'Could not load this listing.');
        debouncedRouter.back();
      } finally {
        setLoading(false);
      }
    };

    loadListing();
  }, [id, router, user]);

  const handleSave = async () => {
    if (!user) {
      Alert.alert('Sign in required', 'You need to be signed in to edit an ad.');
      return;
    }

    if (!canSave) {
      Alert.alert('Missing details', 'Please fill in the required fields to continue.');
      return;
    }

    const numericPrice = Number(price.replace(/[^0-9.]/g, ''));
    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      Alert.alert('Invalid price', 'Please enter a valid price in GHS.');
      return;
    }

    try {
      setSaving(true);

      // Handle image uploads if any new local files selected
      let finalImageUrls = [...imageUris];
      const newLocalUris = imageUris.filter((uri) => uri.startsWith('file:'));
      if (newLocalUris.length > 0) {
        const uploadedUrls: string[] = [];
        for (const uri of newLocalUris) {
          const fileExt = uri.split('.').pop() || 'jpg';
          const path = `products/${user.id}/${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}.${fileExt}`;

          const resp = await fetch(uri);
          const blob = await resp.blob();

          const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(path, blob, {
              contentType: blob.type || 'image/jpeg',
            });

          if (uploadError) {
            console.error('Error uploading image', uploadError);
            continue;
          }

          const { data: publicUrlData } = supabase.storage
            .from('product-images')
            .getPublicUrl(path);

          if (publicUrlData?.publicUrl) {
            uploadedUrls.push(publicUrlData.publicUrl);
          }
        }
        // Replace local URIs with uploaded URLs
        finalImageUrls = [
          ...imageUris.filter((uri) => !uri.startsWith('file:')),
          ...uploadedUrls,
        ];
      }

      const { error } = await supabase
        .from('products_services')
        .update({
          title: title.trim(),
          description: description.trim(),
          price: numericPrice,
          category_name: category,
          type: listingType,
          condition,
          location_city: locationCity.trim() || null,
          location_region: locationRegion.trim() || null,
          contact_phone: contactPhone.trim() || null,
          contact_whatsapp: contactWhatsapp.trim() || null,
          image_url: finalImageUrls[0] || null,
          image_urls: finalImageUrls.length > 0 ? finalImageUrls : null,
        })
        .eq('id', id as string);

      if (error) {
        console.error('Error updating listing', error);
        Alert.alert('Could not save changes', error.message || 'Please try again later.');
        return;
      }

      Alert.alert('Saved', 'Your changes have been saved.', [
        {
          text: 'View listing',
          onPress: () => debouncedRouter.replace(`/services/${id}`),
        },
      ]);
    } catch (err) {
      console.error('Unexpected error updating listing', err);
      Alert.alert('Something went wrong', 'Please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Loader2 size={24} color="#4169E1" />
        <Text style={styles.loadingText}>Loading listing...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => debouncedRouter.back()}>
          <ArrowLeft size={20} color="#020617" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Edit ad</Text>
          <Text style={styles.headerSubtitle}>Update your product or service</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic details</Text>

          <Text style={styles.label}>Listing type</Text>
          <View style={styles.chipRow}>
            {[
              { key: 'product', label: 'Product' },
              { key: 'service', label: 'Service' },
            ].map((opt) => {
              const selected = listingType === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => setListingType(opt.key as ListingType)}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="What are you offering?"
            placeholderTextColor="#9CA3AF"
            value={title}
            onChangeText={setTitle}
            maxLength={80}
          />

          <Text style={styles.label}>Category *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
            {CATEGORIES.map((c) => {
              const selected = c === category;
              return (
                <TouchableOpacity
                  key={c}
                  style={[styles.categoryChip, selected && styles.categoryChipSelected]}
                  onPress={() => setCategory(selected ? '' : c)}
                >
                  <Text
                    style={[styles.categoryChipText, selected && styles.categoryChipTextSelected]}
                  >
                    {c}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe the item or service, condition, and any details buyers should know."
            placeholderTextColor="#9CA3AF"
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pricing</Text>
          <Text style={styles.label}>Price (GHS) *</Text>
          <View style={styles.priceRow}>
            <Text style={styles.pricePrefix}>GHS</Text>
            <TextInput
              style={[styles.input, styles.priceInput]}
              placeholder="0.00"
              placeholderTextColor="#9CA3AF"
              keyboardType={Platform.select({ ios: 'decimal-pad', android: 'numeric' })}
              value={price}
              onChangeText={setPrice}
            />
          </View>

          <Text style={styles.label}>Condition</Text>
          <View style={styles.chipRow}>
            {[
              { key: 'new', label: 'New' },
              { key: 'used', label: 'Used' },
              { key: 'not_applicable', label: 'Not applicable' },
            ].map((opt) => {
              const selected = condition === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => setCondition(opt.key as Condition)}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <Text style={styles.label}>City / Town</Text>
          <TextInput
            style={styles.input}
            placeholder="Eg. Accra, Kumasi, Cape Coast"
            placeholderTextColor="#9CA3AF"
            value={locationCity}
            onChangeText={setLocationCity}
          />

          <Text style={styles.label}>Region</Text>
          <TextInput
            style={styles.input}
            placeholder="Eg. Greater Accra"
            placeholderTextColor="#9CA3AF"
            value={locationRegion}
            onChangeText={setLocationRegion}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <Text style={styles.label}>Phone number</Text>
          <TextInput
            style={styles.input}
            placeholder="Phone buyers can call"
            placeholderTextColor="#9CA3AF"
            keyboardType={Platform.select({ ios: 'phone-pad', android: 'phone-pad' })}
            value={contactPhone}
            onChangeText={setContactPhone}
          />

          <Text style={styles.label}>WhatsApp number</Text>
          <TextInput
            style={styles.input}
            placeholder="Number for WhatsApp chats"
            placeholderTextColor="#9CA3AF"
            keyboardType={Platform.select({ ios: 'phone-pad', android: 'phone-pad' })}
            value={contactWhatsapp}
            onChangeText={setContactWhatsapp}
          />

          <Text style={styles.helperText}>
            These numbers will be shown on your ad so interested Akoras can reach you
            directly.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos</Text>
          <View style={styles.photoGrid}>
            {imageUris.map((uri, idx) => (
              <View key={idx} style={styles.photoItem}>
                <Image source={{ uri }} style={styles.photoThumb} />
                <TouchableOpacity
                  style={styles.photoRemove}
                  onPress={() => setImageUris((prev) => prev.filter((_, i) => i !== idx))}
                >
                  <X size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              style={styles.photoAddButton}
              onPress={async () => {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                  Alert.alert(
                    'Permission required',
                    'We need access to your photos to upload images.'
                  );
                  return;
                }
                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                  allowsMultipleSelection: true,
                  quality: 0.8,
                });
                if (!result.canceled && result.assets) {
                  setImageUris((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
                }
              }}
            >
              <Plus size={20} color="#9CA3AF" />
              <Text style={styles.photoAddText}>Add photos</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.helperText}>
            Upload images from your gallery. First image will be the cover photo.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, (!canSave || saving || !user) && styles.submitButtonDisabled]}
          onPress={handleSave}
          disabled={!canSave || saving || !user}
        >
          {saving ? (
            <>
              <Loader2 size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.submitButtonText}>Saving...</Text>
            </>
          ) : (
            <Text style={styles.submitButtonText}>Save changes</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#111827',
  },
  textArea: {
    minHeight: 100,
    marginTop: 4,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  chipSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  chipText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#4B5563',
  },
  chipTextSelected: {
    color: '#111827',
  },
  categoryRow: {
    marginBottom: 12,
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  categoryChipSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  categoryChipText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#4B5563',
  },
  categoryChipTextSelected: {
    color: '#111827',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pricePrefix: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  priceInput: {
    flex: 1,
  },
  helperText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 8,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  photoItem: {
    width: 80,
    height: 80,
    position: 'relative',
  },
  photoThumb: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAddButton: {
    width: 80,
    height: 80,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  photoAddText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  submitButton: {
    backgroundColor: '#4169E1',
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#4B5563',
  },
});
