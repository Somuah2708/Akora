import React, { useState } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft,
  ChevronDown,
  Loader2,
  Plus,
  X,
} from 'lucide-react-native';

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

export default function CreateListingScreen() {
  const router = useRouter();
  const { user } = useAuth();

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit =
    !!user &&
    title.trim().length > 3 &&
    description.trim().length > 10 &&
    category.trim().length > 0 &&
    price.trim().length > 0;

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Sign in required', 'You need to be signed in to post an ad.');
      return;
    }

    if (!canSubmit) {
      Alert.alert('Missing details', 'Please fill in the required fields to continue.');
      return;
    }

    const numericPrice = Number(price.replace(/[^0-9.]/g, ''));
    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      Alert.alert('Invalid price', 'Please enter a valid price in GHS.');
      return;
    }

    try {
      setIsSubmitting(true);

      // Handle image uploads if any local files selected
      let uploadedUrls: string[] = [];
      if (imageUris.length > 0) {
        const results: string[] = [];
        for (const uri of imageUris) {
          if (!uri.startsWith('file:')) {
            // Already a URL (unlikely on create), just keep it
            results.push(uri);
            continue;
          }

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
            results.push(publicUrlData.publicUrl);
          }
        }
        uploadedUrls = results;
      }

      const { data, error } = await supabase
        .from('products_services')
        .insert({
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
          image_url: uploadedUrls[0] || null,
          image_urls: uploadedUrls.length > 0 ? uploadedUrls : null,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating listing', error);
        Alert.alert('Could not post ad', error.message || 'Please try again later.');
        return;
      }

      Alert.alert('Ad posted', 'Your listing has been created successfully.', [
        {
          text: 'View listing',
          onPress: () => {
            if (data?.id) {
              router.replace(`/services/${data.id}`);
            } else {
              router.back();
            }
          },
        },
      ]);
    } catch (err: any) {
      console.error('Unexpected error creating listing', err);
      Alert.alert('Something went wrong', 'Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#020617" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Post an ad</Text>
          <Text style={styles.headerSubtitle}>Share a product or service with Akoras</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {!user && (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>Sign in to continue</Text>
            <Text style={styles.noticeText}>
              You need an Akora account to post listings. Please sign in from the
              account tab first.
            </Text>
          </View>
        )}

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
          style={[
            styles.submitButton,
            (!canSubmit || isSubmitting || !user) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!canSubmit || isSubmitting || !user}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.submitButtonText}>Posting...</Text>
            </>
          ) : (
            <Text style={styles.submitButtonText}>Post ad</Text>
          )}
        </TouchableOpacity>
      </View>
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
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  textArea: {
    minHeight: 120,
  },
  categoryRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  categoryChipSelected: {
    backgroundColor: '#1D4ED8',
  },
  categoryChipText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#4B5563',
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pricePrefix: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#4B5563',
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  chipSelected: {
    backgroundColor: '#1D4ED8',
    borderColor: '#1D4ED8',
  },
  chipText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#4B5563',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  helperText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 4,
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
  noticeCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  noticeTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1D4ED8',
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#1F2937',
  },
  footer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  submitButton: {
    height: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1D4ED8',
    flexDirection: 'row',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});
