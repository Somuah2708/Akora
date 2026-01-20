import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter, useLocalSearchParams } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, Upload, DollarSign, Plus, X, Image as ImageIcon, Package, Tag, Save } from 'lucide-react-native';
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

export default function EditPostedItemScreen() {
  const router = useRouter();
  const { itemId, productId } = useLocalSearchParams();
  const { user } = useAuth();
  
  // Support both itemId and productId for backwards compatibility
  const currentItemId = itemId || productId;
  
  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [priceGHS, setPriceGHS] = useState('');
  const [priceUSD, setPriceUSD] = useState('');
  const [category, setCategory] = useState('');
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [quantity, setQuantity] = useState('1');
  const [contactInfo, setContactInfo] = useState(OAA_SECRETARIAT_CONTACT);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    loadItemData();
  }, [currentItemId]);

  const loadItemData = async () => {
    if (!currentItemId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('secretariat_shop_products')
        .select('*')
        .eq('id', currentItemId as string)
        .single();

      if (error) throw error;

      if (data) {
        setItemName(data.name);
        setDescription(data.description);
        setPriceUSD(data.price_usd?.toString() || '');
        setPriceGHS(data.price_ghs?.toString() || '');
        setCategory(data.category);
        setImageUris(data.images || []);
        setQuantity(data.quantity?.toString() || '1');
        setContactInfo(data.contact_info || OAA_SECRETARIAT_CONTACT);
      }
    } catch (error) {
      console.error('Error loading item:', error);
      Alert.alert('Error', 'Failed to load product details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded || loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0F172A" style={{ marginTop: 100 }} />
      </View>
    );
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

  const handleUpdate = async () => {
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
      Alert.alert('Error', 'You must be logged in to update items');
      return;
    }

    setUploading(true);

    try {
      // Upload only new images (ones that don't have Supabase URLs)
      const uploadedImageUrls: string[] = [];
      
      for (const uri of imageUris) {
        // If it's already a Supabase URL, keep it
        if (uri.includes('supabase')) {
          uploadedImageUrls.push(uri);
          continue;
        }

        // Otherwise upload it
        try {
          const fileExt = uri.split('.').pop() || 'jpg';
          const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
          const path = `products/${user.id}/${fileName}`;

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

      // Update product in database
      const { error } = await supabase
        .from('secretariat_shop_products')
        .update({
          name: itemName.trim(),
          description: description.trim(),
          price_usd: parseFloat(priceUSD),
          price_ghs: parseFloat(priceGHS),
          category: category,
          images: uploadedImageUrls,
          quantity: parseInt(quantity) || 1,
          contact_info: contactInfo.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId as string);

      if (error) throw error;

      Alert.alert(
        'Success!',
        'Your item has been updated successfully!',
        [
          {
            text: 'OK',
            onPress: () => debouncedRouter.back(),
          }
        ]
      );
    } catch (error: any) {
      console.error('Error updating item:', error);
      Alert.alert('Error', error.message || 'Failed to update item. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#10B981', '#059669']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>Edit Item</Text>
            <Text style={styles.subtitle}>Update product details</Text>
          </View>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Image Upload Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Product Images * (Up to {MAX_IMAGES})</Text>
          <Text style={styles.sectionHint}>Upload {imageUris.length}/{MAX_IMAGES} images</Text>
          
          <View style={styles.imageGrid}>
            {imageUris.map((uri, index) => {
              const isHttpImage = uri?.startsWith('http');
              return (
                <View key={index} style={styles.imageItem}>
                  {isHttpImage ? (
                    <Image source={{ uri }} style={styles.uploadedImage} />
                  ) : (
                    <View style={[styles.uploadedImage, styles.imagePlaceholder]}>
                      <Package size={32} color="#10B981" />
                      <Text style={styles.placeholderText}>Image {index + 1}</Text>
                    </View>
                  )}
                  <TouchableOpacity 
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <X size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              );
            })}
            
            {imageUris.length < MAX_IMAGES && (
              <TouchableOpacity style={styles.addImageButton} onPress={pickImages}>
                <View style={styles.uploadPlaceholder}>
                  <ImageIcon size={32} color="#10B981" />
                  <Text style={styles.uploadText}>Add Image</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Item Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Alumni Branded T-Shirt"
              placeholderTextColor="#999"
              value={itemName}
              onChangeText={setItemName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your item in detail..."
              placeholderTextColor="#999"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Pricing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pricing *</Text>
          
          <View style={styles.priceRow}>
            <View style={styles.priceInput}>
              <Text style={styles.label}>Price (USD)</Text>
              <View style={styles.currencyInputContainer}>
                <DollarSign size={20} color="#666" />
                <TextInput
                  style={styles.currencyInput}
                  placeholder="0.00"
                  placeholderTextColor="#999"
                  value={priceUSD}
                  onChangeText={handlePriceUSDChange}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={styles.priceInput}>
              <Text style={styles.label}>Price (GHS)</Text>
              <View style={styles.currencyInputContainer}>
                <Text style={styles.cedisSymbol}>₵</Text>
                <TextInput
                  style={styles.currencyInput}
                  placeholder="0.00"
                  placeholderTextColor="#999"
                  value={priceGHS}
                  onChangeText={handlePriceGHSChange}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </View>
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category *</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  category === cat && styles.categoryChipActive
                ]}
                onPress={() => setCategory(cat)}
              >
                <Tag size={16} color={category === cat ? "#FFFFFF" : "#666"} />
                <Text style={[
                  styles.categoryChipText,
                  category === cat && styles.categoryChipTextActive
                ]}>
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

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <TextInput
            style={styles.input}
            placeholder="Phone or email"
            placeholderTextColor="#999"
            value={contactInfo}
            onChangeText={setContactInfo}
          />
        </View>

        {/* Update Button */}
        <TouchableOpacity style={styles.submitButton} onPress={handleUpdate}>
          <LinearGradient
            colors={['#10B981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitGradient}
          >
            <Save size={20} color="#FFFFFF" />
            <Text style={styles.submitText}>Update Item</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  headerGradient: {
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 2,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  sectionHint: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginBottom: 12,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  imageItem: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
    marginTop: 4,
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#10B981',
    borderStyle: 'dashed',
  },
  uploadPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
    marginTop: 4,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  textArea: {
    height: 100,
    paddingTop: 14,
  },
  priceRow: {
    flexDirection: 'row',
    gap: 12,
  },
  priceInput: {
    flex: 1,
  },
  currencyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cedisSymbol: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#666',
    marginRight: 8,
  },
  currencyInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1A1A1A',
    marginLeft: 8,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  categoryChipText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#666',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  sizeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sizeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  sizeChipActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  sizeChipText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#666',
  },
  sizeChipTextActive: {
    color: '#FFFFFF',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    gap: 6,
  },
  colorChipActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  colorCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  whiteColorBorder: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
  },
  colorChipText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#666',
  },
  colorChipTextActive: {
    color: '#FFFFFF',
  },
  conditionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  conditionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  conditionButtonActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  conditionText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#666',
  },
  conditionTextActive: {
    color: '#FFFFFF',
  },
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  submitText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  bottomPadding: {
    height: 20,
  },
});
