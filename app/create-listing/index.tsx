import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image, FlatList } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter } from 'expo-router';
import { ArrowLeft, Image as ImageIcon, Send, DollarSign, Tag, Info, Package, Briefcase, Upload, X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import * as ImagePicker from 'expo-image-picker';

SplashScreen.preventAutoHideAsync();

const SERVICE_CATEGORIES = [
  { id: '1', name: 'Business Services' },
  { id: '2', name: 'Education & Tutoring' },
  { id: '3', name: 'Technical Services' },
  { id: '4', name: 'Creative & Design' },
  { id: '5', name: 'Food & Catering' },
  { id: '6', name: 'Healthcare' },
  { id: '7', name: 'Publishing' },
  { id: '8', name: 'Photography' },
];

const PRODUCT_CATEGORIES = [
  { id: '9', name: 'Electronics' },
  { id: '10', name: 'Clothing & Fashion' },
  { id: '11', name: 'Books & Media' },
  { id: '12', name: 'Home & Garden' },
  { id: '13', name: 'Sports & Outdoors' },
  { id: '14', name: 'Health & Beauty' },
  { id: '15', name: 'Toys & Games' },
  { id: '16', name: 'Automotive' },
];

const MAX_IMAGES = 20;

export default function CreateListingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [listingType, setListingType] = useState<'product' | 'service' | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [category, setCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Check authentication when user tries to proceed with listing type selection
  useEffect(() => {
    if (listingType !== null && !user) {
      Alert.alert('Authentication Required', 'Please sign in to create a listing.');
      setListingType(null);
      router.replace('/auth/sign-in');
      return;
    }
  }, [listingType, user, router]);

  // Request permissions and pick images
  const pickImages = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library to upload images.');
        return;
      }

      // Check if we've reached the limit
      if (selectedImages.length >= MAX_IMAGES) {
        Alert.alert('Limit Reached', `You can only upload up to ${MAX_IMAGES} images.`);
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: MAX_IMAGES - selectedImages.length,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map(asset => asset.uri);
        const totalImages = selectedImages.length + newImages.length;
        
        if (totalImages > MAX_IMAGES) {
          Alert.alert('Too Many Images', `You can only upload up to ${MAX_IMAGES} images. Please select fewer images.`);
          return;
        }
        
        setSelectedImages([...selectedImages, ...newImages]);
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to pick images. Please try again.');
    }
  };

  // Remove an image from selection
  const removeImage = (index: number) => {
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
  };

  // Upload images to Supabase storage
  const uploadImages = async (): Promise<string[]> => {
    if (selectedImages.length === 0) return [];

    try {
      setIsUploadingImages(true);
      const uploadedUrls: string[] = [];

      for (const imageUri of selectedImages) {
        // Create a unique filename
        const fileName = `${user?.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
        
        // Convert image to blob
        const response = await fetch(imageUri);
        const blob = await response.blob();
        
        // Upload to Supabase storage
        const { data, error } = await supabase.storage
          .from('listing-images')
          .upload(fileName, blob, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: false
          });

        if (error) throw error;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('listing-images')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      return uploadedUrls;
    } catch (error) {
      console.error('Error uploading images:', error);
      throw new Error('Failed to upload images');
    } finally {
      setIsUploadingImages(false);
    }
  };

  const handleSubmit = async () => {
    // Validate inputs
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for your listing');
      return;
    }
    
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description for your listing');
      return;
    }
    
    if (!price.trim() || isNaN(Number(price)) || Number(price) <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }
    
    if (!category) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    // Check if at least one image is provided
    if (selectedImages.length === 0 && !imageUrl.trim()) {
      Alert.alert('Error', 'Please add at least one image for your listing');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Upload selected images first
      let uploadedImageUrls: string[] = [];
      if (selectedImages.length > 0) {
        uploadedImageUrls = await uploadImages();
      }
      
      // Combine uploaded images with manual URL (if provided)
      const allImageUrls = [...uploadedImageUrls];
      if (imageUrl.trim()) {
        allImageUrls.push(imageUrl.trim());
      }
      
      // Use first image as primary image_url
      const primaryImageUrl = allImageUrls[0] || null;
      
      // Create the listing - users have unlimited listings
      const { data: newListing, error: listingError} = await supabase
        .from('products_services')
        .insert({
          user_id: user?.id,
          title: title.trim(),
          description: description.trim(),
          price: Number(price),
          image_url: primaryImageUrl,
          category_name: category,
          is_featured: false,
          is_premium_listing: false,
        })
        .select()
        .single();

      if (listingError) throw listingError;

      Alert.alert(
        'Success', 
        'Your listing has been created successfully!',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      console.error('Error creating listing:', error);
      Alert.alert('Error', error.message || 'Failed to create listing');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  // Show listing type selection screen first
  if (listingType === null) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.title}>Create Listing</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.choiceContainer}>
          <Text style={styles.choiceTitle}>What would you like to list?</Text>
          <Text style={styles.choiceSubtitle}>Choose the type of listing you want to create</Text>

          <TouchableOpacity 
            style={styles.choiceCard}
            onPress={() => setListingType('product')}
          >
            <View style={styles.choiceIconContainer}>
              <Package size={48} color="#4169E1" />
            </View>
            <Text style={styles.choiceCardTitle}>Product</Text>
            <Text style={styles.choiceCardDescription}>
              List physical items, goods, or merchandise that you want to sell
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.choiceCard}
            onPress={() => setListingType('service')}
          >
            <View style={styles.choiceIconContainer}>
              <Briefcase size={48} color="#4169E1" />
            </View>
            <Text style={styles.choiceCardTitle}>Service</Text>
            <Text style={styles.choiceCardDescription}>
              Offer your professional services, skills, or expertise to others
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setListingType(null)} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.title}>Create {listingType === 'product' ? 'Product' : 'Service'} Listing</Text>
        <TouchableOpacity 
          style={[
            styles.submitButton, 
            (!title.trim() || !description.trim() || !price.trim() || !category || isSubmitting) && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={!title.trim() || !description.trim() || !price.trim() || !category || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Send size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.formContainer}>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter the title of your product or service"
            placeholderTextColor="#666666"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe your product or service in detail"
            placeholderTextColor="#666666"
            multiline
            value={description}
            onChangeText={setDescription}
            maxLength={500}
            textAlignVertical="top"
          />
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Price ($)</Text>
          <View style={styles.priceInputContainer}>
            <DollarSign size={20} color="#666666" />
            <TextInput
              style={styles.priceInput}
              placeholder="0.00"
              placeholderTextColor="#666666"
              keyboardType="numeric"
              value={price}
              onChangeText={setPrice}
            />
          </View>
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Category</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
          >
            {(listingType === 'product' ? PRODUCT_CATEGORIES : SERVICE_CATEGORIES).map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryChip,
                  category === cat.name && styles.selectedCategoryChip
                ]}
                onPress={() => setCategory(cat.name)}
              >
                <Text 
                  style={[
                    styles.categoryChipText,
                    category === cat.name && styles.selectedCategoryChipText
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Images (Upload up to {MAX_IMAGES})</Text>
          
          {/* Upload Button */}
          <TouchableOpacity 
            style={styles.uploadButton}
            onPress={pickImages}
            disabled={isUploadingImages || selectedImages.length >= MAX_IMAGES}
          >
            <Upload size={24} color={selectedImages.length >= MAX_IMAGES ? "#999999" : "#4169E1"} />
            <Text style={[
              styles.uploadButtonText,
              selectedImages.length >= MAX_IMAGES && styles.uploadButtonTextDisabled
            ]}>
              {selectedImages.length >= MAX_IMAGES 
                ? 'Maximum images reached' 
                : 'Select Images from Device'}
            </Text>
            <Text style={styles.uploadButtonSubtext}>
              {selectedImages.length}/{MAX_IMAGES} images selected
            </Text>
          </TouchableOpacity>

          {/* Display Selected Images */}
          {selectedImages.length > 0 && (
            <View style={styles.selectedImagesContainer}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.imagesScrollContent}
              >
                {selectedImages.map((imageUri, index) => (
                  <View key={index} style={styles.selectedImageWrapper}>
                    <Image source={{ uri: imageUri }} style={styles.selectedImage} />
                    <TouchableOpacity 
                      style={styles.removeImageButton}
                      onPress={() => removeImage(index)}
                    >
                      <X size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                    {index === 0 && (
                      <View style={styles.primaryBadge}>
                        <Text style={styles.primaryBadgeText}>Primary</Text>
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Or Add Image URL (Optional)</Text>
          <View style={styles.imageUrlContainer}>
            <ImageIcon size={20} color="#666666" />
            <TextInput
              style={styles.imageUrlInput}
              placeholder="Enter image URL"
              placeholderTextColor="#666666"
              value={imageUrl}
              onChangeText={setImageUrl}
            />
          </View>
          {imageUrl.trim() !== '' && (
            <View style={styles.imagePreviewContainer}>
              <Text style={styles.imagePreviewLabel}>Preview:</Text>
              <Image 
                source={{ uri: imageUrl }} 
                style={styles.imagePreview}
                onError={() => Alert.alert('Invalid Image URL', 'The provided URL does not contain a valid image.')}
              />
            </View>
          )}
        </View>
        
        <View style={styles.infoContainer}>
          <Info size={20} color="#666666" />
          <Text style={styles.infoText}>
            You can create up to 3 free listings. Additional listings require a premium subscription.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    color: '#000000',
  },
  submitButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4169E1',
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
  listingsCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF0FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  listingsCounterText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#4169E1',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  textArea: {
    height: 120,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  priceInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  categoriesContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
    gap: 8,
  },
  categoryChip: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  selectedCategoryChip: {
    backgroundColor: '#4169E1',
  },
  categoryChipText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  selectedCategoryChipText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
  },
  imageUrlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  imageUrlInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  imagePreviewContainer: {
    marginTop: 12,
  },
  imagePreviewLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 8,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
  },
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  uploadButton: {
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 24,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  uploadButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
    marginTop: 8,
  },
  uploadButtonTextDisabled: {
    color: '#999999',
  },
  uploadButtonSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginTop: 4,
  },
  selectedImagesContainer: {
    marginTop: 16,
  },
  imagesScrollContent: {
    gap: 12,
    paddingVertical: 4,
  },
  selectedImageWrapper: {
    position: 'relative',
    width: 120,
    height: 120,
  },
  selectedImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: '#4169E1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  primaryBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  choiceContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  choiceTitle: {
    fontSize: 28,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
  },
  choiceSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    textAlign: 'center',
    marginBottom: 40,
  },
  choiceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#F0F0F0',
  },
  choiceIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EBF0FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  choiceCardTitle: {
    fontSize: 22,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 8,
  },
  choiceCardDescription: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
  },
});