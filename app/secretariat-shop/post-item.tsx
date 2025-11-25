import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter } from 'expo-router';
import { ArrowLeft, Upload, DollarSign, Plus, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import * as ImagePicker from 'expo-image-picker';

SplashScreen.preventAutoHideAsync();

const CATEGORIES = [
  'Clothing',
  'Accessories',
  'Homeware',
  'Stationery',
  'Books',
  'Electronics',
  'Sports',
  'Other',
];

const OAA_SECRETARIAT_CONTACT = '+233 302 765 432';

// Currency conversion rate
const USD_TO_GHS = 10.99;
const GHS_TO_USD = 0.091;

const MAX_IMAGES = 20;

export default function PostItemScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [priceGHS, setPriceGHS] = useState('');
  const [priceUSD, setPriceUSD] = useState('');
  const [category, setCategory] = useState('');
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [quantity, setQuantity] = useState('1');
  const [contactInfo, setContactInfo] = useState(OAA_SECRETARIAT_CONTACT);
  const [uploading, setUploading] = useState(false);

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  const handlePriceGHSChange = (value: string) => {
    setPriceGHS(value);
    // Auto-calculate USD price
    if (value && !isNaN(parseFloat(value))) {
      const usdPrice = (parseFloat(value) * GHS_TO_USD).toFixed(2);
      setPriceUSD(usdPrice);
    } else {
      setPriceUSD('');
    }
  };

  const handlePriceUSDChange = (value: string) => {
    setPriceUSD(value);
    // Auto-calculate GHS price
    if (value && !isNaN(parseFloat(value))) {
      const ghsPrice = (parseFloat(value) * USD_TO_GHS).toFixed(2);
      setPriceGHS(ghsPrice);
    } else {
      setPriceGHS('');
    }
  };

  const pickImages = async () => {
    if (imageUris.length >= MAX_IMAGES) {
      Alert.alert('Maximum Images', `You can only upload up to ${MAX_IMAGES} images`);
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to access your photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map(asset => asset.uri);
        const totalImages = [...imageUris, ...newImages];
        
        if (totalImages.length > MAX_IMAGES) {
          Alert.alert('Too Many Images', `You can only upload up to ${MAX_IMAGES} images. Only the first ${MAX_IMAGES - imageUris.length} will be added.`);
          setImageUris([...imageUris, ...newImages.slice(0, MAX_IMAGES - imageUris.length)]);
        } else {
          setImageUris(totalImages);
        }
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to pick images');
    }
  };

  const removeImage = (index: number) => {
    setImageUris(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    // Validation
    if (!itemName.trim()) {
      Alert.alert('Error', 'Please enter item name');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter item description');
      return;
    }
    if (!priceUSD || !priceGHS) {
      Alert.alert('Error', 'Please enter price');
      return;
    }
    if (!category) {
      Alert.alert('Error', 'Please select a category');
      return;
    }
    if (imageUris.length === 0) {
      Alert.alert('Error', 'Please upload at least one image');
      return;
    }
    if (!user) {
      Alert.alert('Error', 'You must be logged in to post items');
      return;
    }

    setUploading(true);

    try {
      // Upload images to Supabase Storage
      const uploadedImageUrls: string[] = [];
      
      for (const uri of imageUris) {
        try {
          const fileExt = uri.split('.').pop() || 'jpg';
          const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
          const path = `products/${user.id}/${fileName}`;

          // Convert URI to blob and upload
          const response = await fetch(uri);
          const fileBlob = await response.blob();
          
          const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              if (reader.result instanceof ArrayBuffer) {
                resolve(reader.result);
              } else {
                reject(new Error('Failed to read file'));
              }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(fileBlob);
          });

          const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(path, arrayBuffer, {
              contentType: 'image/jpeg',
            });

          if (uploadError) {
            console.error('Error uploading image:', uploadError);
            continue;
          }

          const { data: publicUrlData } = supabase.storage
            .from('product-images')
            .getPublicUrl(path);

          if (publicUrlData?.publicUrl) {
            uploadedImageUrls.push(publicUrlData.publicUrl);
          }
        } catch (imgError) {
          console.error('Error processing image:', imgError);
        }
      }

      if (uploadedImageUrls.length === 0) {
        throw new Error('Failed to upload images');
      }

      // Insert product into database
      const { data, error } = await supabase
        .from('secretariat_shop_products')
        .insert([
          {
            user_id: user.id,
            name: itemName.trim(),
            description: description.trim(),
            price_usd: parseFloat(priceUSD),
            price_ghs: parseFloat(priceGHS),
            category: category,
            sizes: [],
            colors: [],
            images: uploadedImageUrls,
            condition: 'New',
            quantity: parseInt(quantity) || 1,
            in_stock: true,
            contact_info: contactInfo.trim(),
          }
        ])
        .select()
        .single();

      if (error) throw error;

      Alert.alert(
        'Success!',
        'Your item has been posted to the OAA Shop!',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/secretariat-shop'),
          }
        ]
      );
    } catch (error: any) {
      console.error('Error posting item:', error);
      Alert.alert('Error', error.message || 'Failed to post item. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#10B981', '#059669']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Post New Item</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Item Name */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Item Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., OAA Alumni Polo Shirt"
            placeholderTextColor="#94A3B8"
            value={itemName}
            onChangeText={setItemName}
          />
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe the item in detail..."
            placeholderTextColor="#94A3B8"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Pricing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pricing *</Text>
          <View style={styles.priceRow}>
            <View style={styles.priceField}>
              <Text style={styles.priceLabel}>GHS (₵)</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="0.00"
                placeholderTextColor="#94A3B8"
                keyboardType="decimal-pad"
                value={priceGHS}
                onChangeText={handlePriceGHSChange}
              />
            </View>
            <View style={styles.priceField}>
              <Text style={styles.priceLabel}>USD ($)</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="0.00"
                placeholderTextColor="#94A3B8"
                keyboardType="decimal-pad"
                value={priceUSD}
                onChangeText={handlePriceUSDChange}
              />
            </View>
          </View>
          <Text style={styles.hint}>Auto-calculated at 1 USD = {USD_TO_GHS} GHS</Text>
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category *</Text>
          <View style={styles.optionsGrid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.optionChip, category === cat && styles.optionChipActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.optionChipText, category === cat && styles.optionChipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quantity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stock Quantity</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 50"
            placeholderTextColor="#94A3B8"
            keyboardType="number-pad"
            value={quantity}
            onChangeText={setQuantity}
          />
        </View>

        {/* Images */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Product Images * ({imageUris.length}/{MAX_IMAGES})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScroll}>
            <TouchableOpacity style={styles.uploadButton} onPress={pickImages}>
              <Upload size={24} color="#64748B" />
              <Text style={styles.uploadText}>Add Photo</Text>
            </TouchableOpacity>
            {imageUris.map((uri, index) => (
              <View key={index} style={styles.imagePreview}>
                <Image source={{ uri }} style={styles.previewImage} />
                <TouchableOpacity style={styles.removeImage} onPress={() => removeImage(index)}>
                  <X size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Contact Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <TextInput
            style={styles.input}
            placeholder="Phone number"
            placeholderTextColor="#94A3B8"
            value={contactInfo}
            onChangeText={setContactInfo}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, uploading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={uploading}
        >
          <LinearGradient
            colors={uploading ? ['#94A3B8', '#64748B'] : ['#10B981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitGradient}
          >
            {uploading ? (
              <>
                <ActivityIndicator color="#FFFFFF" />
                <Text style={styles.submitText}>Posting...</Text>
              </>
            ) : (
              <Text style={styles.submitText}>Post Item to Shop</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerGradient: {
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  textArea: {
    height: 100,
    paddingTop: 14,
  },
  priceRow: {
    flexDirection: 'row',
    gap: 12,
  },
  priceField: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#64748B',
    marginBottom: 8,
  },
  priceInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  hint: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginTop: 8,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  optionChipActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  optionChipText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  optionChipTextActive: {
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  colorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionActive: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  colorName: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  imagesScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  uploadButton: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  uploadText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#64748B',
    marginTop: 4,
  },
  imagePreview: {
    width: 100,
    height: 100,
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeImage: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButton: {
    marginHorizontal: 16,
    marginTop: 32,
    borderRadius: 12,
    overflow: 'hidden',
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
  submitText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});
