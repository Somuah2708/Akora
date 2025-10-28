import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter } from 'expo-router';
import { ArrowLeft, Image as ImageIcon, Send, DollarSign, Tag, Info, CheckCircle, Sparkles } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { LinearGradient } from 'expo-linear-gradient';

SplashScreen.preventAutoHideAsync();

const CATEGORIES = [
  { id: '1', name: 'Business Services' },
  { id: '2', name: 'Education & Tutoring' },
  { id: '3', name: 'Technical Services' },
  { id: '4', name: 'Creative & Design' },
  { id: '5', name: 'Food & Catering' },
  { id: '6', name: 'Healthcare' },
  { id: '7', name: 'Publishing' },
  { id: '8', name: 'Photography' },
];

export default function CreateListingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [category, setCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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

  useEffect(() => {
    if (!user) {
      Alert.alert('Authentication Required', 'Please sign in to create a listing.');
      router.replace('/');
      return;
    }
  }, [user, router]);

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

    try {
      setIsSubmitting(true);
      
      // Create the listing - users have unlimited listings
      const { data: newListing, error: listingError} = await supabase
        .from('products_services')
        .insert({
          user_id: user?.id,
          title: title.trim(),
          description: description.trim(),
          price: Number(price),
          image_url: imageUrl.trim() || null,
          category_name: category,
          is_featured: false,
          is_premium_listing: false,
        })
        .select()
        .single();

      if (listingError) throw listingError;

      Alert.alert(
        '🎉 Listing Published!', 
        'Your listing is now live on the Akora Marketplace! Customers can view and purchase your services immediately.',
        [
          { 
            text: 'View in Marketplace', 
            onPress: () => router.push('/services' as any)
          },
          {
            text: 'Create Another Listing',
            style: 'cancel',
            onPress: () => {
              setTitle('');
              setDescription('');
              setPrice('');
              setImageUrl('');
              setCategory('');
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('Error creating listing:', error);
      Alert.alert('Error', error.message || 'Failed to create listing');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!fontsLoaded || !user) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Modern Header with Gradient */}
      <LinearGradient
        colors={['#4169E1', '#5B7FE8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Create Listing</Text>
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
      </LinearGradient>

      <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
        {/* Marketplace Welcome Banner */}
        <View style={styles.welcomeBanner}>
          <LinearGradient
            colors={['#E8F0FE', '#F0F4FF']}
            style={styles.welcomeBannerGradient}
          >
            <Sparkles size={32} color="#4169E1" />
            <View style={styles.welcomeTextContainer}>
              <Text style={styles.welcomeTitle}>Akora Marketplace</Text>
              <Text style={styles.welcomeSubtitle}>
                Reach thousands of potential customers across the community. List your services for free!
              </Text>
            </View>
          </LinearGradient>
        </View>
        
        {/* Quick Tips */}
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>💡 Quick Tips for Great Listings:</Text>
          <View style={styles.tipRow}>
            <CheckCircle size={16} color="#10B981" />
            <Text style={styles.tipText}>Use clear, descriptive titles</Text>
          </View>
          <View style={styles.tipRow}>
            <CheckCircle size={16} color="#10B981" />
            <Text style={styles.tipText}>Add high-quality images</Text>
          </View>
          <View style={styles.tipRow}>
            <CheckCircle size={16} color="#10B981" />
            <Text style={styles.tipText}>Set competitive pricing</Text>
          </View>
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Professional Web Design Services"
            placeholderTextColor="#999999"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
          <Text style={styles.charCount}>{title.length}/100</Text>
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe your product or service in detail. Include what makes it unique, your experience, and what customers can expect."
            placeholderTextColor="#999999"
            multiline
            value={description}
            onChangeText={setDescription}
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{description.length}/500</Text>
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Price (₵) *</Text>
          <View style={styles.priceInputContainer}>
            <Text style={styles.currencySymbol}>₵</Text>
            <TextInput
              style={styles.priceInput}
              placeholder="0.00"
              placeholderTextColor="#999999"
              keyboardType="decimal-pad"
              value={price}
              onChangeText={setPrice}
            />
            <Text style={styles.perHourLabel}>/hour</Text>
          </View>
          <Text style={styles.helperText}>Enter the hourly rate in Ghanaian cedis</Text>
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Category *</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
          >
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryChip,
                  category === cat.name && styles.selectedCategoryChip
                ]}
                onPress={() => setCategory(cat.name)}
              >
                {category === cat.name && (
                  <CheckCircle size={16} color="#FFFFFF" style={styles.checkIcon} />
                )}
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
          <Text style={styles.label}>Image URL (Optional)</Text>
          <View style={styles.imageUrlContainer}>
            <ImageIcon size={20} color="#666666" />
            <TextInput
              style={styles.imageUrlInput}
              placeholder="https://example.com/image.jpg"
              placeholderTextColor="#999999"
              value={imageUrl}
              onChangeText={setImageUrl}
              autoCapitalize="none"
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
          <Info size={20} color="#4169E1" />
          <Text style={styles.infoText}>
            Your listing will appear instantly on the marketplace. You can edit or remove it anytime from your profile.
          </Text>
        </View>

        {/* Preview Section */}
        {(title || description || price || category) && (
          <View style={styles.previewSection}>
            <Text style={styles.previewTitle}>📱 Listing Preview</Text>
            <Text style={styles.previewSubtitle}>This is how your listing will appear to customers:</Text>
            
            <View style={styles.previewCard}>
              <LinearGradient
                colors={['#FFFFFF', '#F8F9FC']}
                style={styles.previewCardGradient}
              >
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={styles.previewImage} />
                ) : (
                  <View style={styles.previewImagePlaceholder}>
                    <ImageIcon size={40} color="#CBD5E1" />
                    <Text style={styles.previewImagePlaceholderText}>No image yet</Text>
                  </View>
                )}
                
                {category && (
                  <View style={styles.previewCategoryBadge}>
                    <Tag size={12} color="#FFFFFF" />
                    <Text style={styles.previewCategoryText}>{category}</Text>
                  </View>
                )}
                
                <View style={styles.previewContent}>
                  <Text style={styles.previewItemTitle} numberOfLines={2}>
                    {title || 'Your listing title will appear here'}
                  </Text>
                  
                  <Text style={styles.previewDescription} numberOfLines={3}>
                    {description || 'Your description will appear here...'}
                  </Text>
                  
                  {price && (
                    <Text style={styles.previewPrice}>₵{price}/hr</Text>
                  )}
                </View>
              </LinearGradient>
            </View>
          </View>
        )}

        {/* Submit Button at Bottom */}
        <TouchableOpacity
          style={[
            styles.submitButtonLarge,
            (!title.trim() || !description.trim() || !price.trim() || !category || isSubmitting) && styles.submitButtonLargeDisabled
          ]}
          onPress={handleSubmit}
          disabled={!title.trim() || !description.trim() || !price.trim() || !category || isSubmitting}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={(!title.trim() || !description.trim() || !price.trim() || !category || isSubmitting) 
              ? ['#CBD5E1', '#CBD5E1'] 
              : ['#4169E1', '#5B7FE8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitButtonGradient}
          >
            {isSubmitting ? (
              <>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.submitButtonLargeText}>Creating Listing...</Text>
              </>
            ) : (
              <>
                <Send size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonLargeText}>Publish Listing</Text>
              </>
            )}
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
    paddingBottom: 20,
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  submitButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  welcomeBanner: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  welcomeBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  welcomeTextContainer: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#4169E1',
    marginBottom: 6,
  },
  welcomeSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    lineHeight: 20,
  },
  tipsContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tipsTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tipText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  successBadgeText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#10B981',
    lineHeight: 20,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#1A1A1A',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1A1A1A',
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
  },
  charCount: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#999999',
    marginTop: 6,
    textAlign: 'right',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#4169E1',
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1A1A1A',
  },
  perHourLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginLeft: 8,
  },
  helperText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#999999',
    marginTop: 6,
  },
  categoriesContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
    gap: 10,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
    gap: 6,
  },
  selectedCategoryChip: {
    backgroundColor: '#4169E1',
    borderColor: '#4169E1',
  },
  checkIcon: {
    marginRight: 4,
  },
  categoryChipText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
  },
  selectedCategoryChipText: {
    color: '#FFFFFF',
  },
  imageUrlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
  },
  imageUrlInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1A1A1A',
  },
  imagePreviewContainer: {
    marginTop: 12,
  },
  imagePreviewLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
    marginBottom: 8,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: '#E8F0FE',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#4169E1',
    lineHeight: 20,
  },
  previewSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#F0F4FF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#4169E1',
    borderStyle: 'dashed',
  },
  previewTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  previewSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 16,
  },
  previewCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  previewCardGradient: {
    borderRadius: 16,
  },
  previewImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#F3F4F6',
  },
  previewImagePlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  previewImagePlaceholderText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  previewCategoryBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(65, 105, 225, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  previewCategoryText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: '#FFFFFF',
  },
  previewContent: {
    padding: 12,
  },
  previewItemTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#1A1A1A',
    marginBottom: 8,
    lineHeight: 22,
  },
  previewDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
    marginBottom: 12,
  },
  previewPrice: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#4169E1',
  },
  submitButtonLarge: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
    minHeight: 56,
    marginBottom: 16,
  },
  submitButtonLargeDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 12,
    minHeight: 56,
  },
  submitButtonLargeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  bottomPadding: {
    height: 40,
  },
});