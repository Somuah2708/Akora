import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
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
  { id: '9', name: 'Home Services' },
  { id: '10', name: 'Automotive' },
  { id: '11', name: 'Fashion & Beauty' },
  { id: '12', name: 'Fitness & Sports' },
  { id: '13', name: 'Hair & Salon' },
  { id: '14', name: 'Pet Care' },
  { id: '15', name: 'Entertainment' },
  { id: '16', name: 'Construction' },
  { id: '17', name: 'Electronics' },
  { id: '18', name: 'Furniture' },
  { id: '19', name: 'Clothing & Apparel' },
  { id: '20', name: 'Watches & Jewelry' },
  { id: '21', name: 'Bags & Accessories' },
  { id: '22', name: 'Books & Stationery' },
  { id: '23', name: 'Beauty Products' },
  { id: '24', name: 'Baby & Kids' },
  { id: '25', name: 'Kitchen & Dining' },
];

export default function CreateListingScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('USD'); // USD or GHS
  const [imageUrl, setImageUrl] = useState('');
  const [category, setCategory] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [localImages, setLocalImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Image picker handler
  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 1,
      selectionLimit: 20,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setLocalImages((prev) => {
        const combined = [...prev, ...result.assets.map((a) => a.uri)];
        return combined.slice(0, 20);
      });
    }
  };

  const removeImage = (uri: string) => {
    setLocalImages((prev) => prev.filter((img) => img !== uri));
  };

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
    if (loading) return;
    if (!user) {
      Alert.alert('Authentication Required', 'Please sign in to create a listing.');
      router.replace('/auth/sign-in');
    }
  }, [user, loading, router]);

  /**
   * Handles the submission of a new marketplace listing
   * 
   * Workflow:
   * 1. Validates all required fields (title, description, price, category)
   * 2. Prepares image URLs (from local picker or URL input)
   * 3. Inserts listing into products_services table with user_id
   * 4. Listing is auto-approved (is_approved: true) for immediate visibility
   * 5. Clears form on success and shows confirmation dialog
   * 6. Navigates back to marketplace
   * 
   * Error handling: Shows user-friendly alerts for validation and database errors
   */
  const handleSubmit = async () => {
    // Prevent double submission
    if (isSubmitting) {
      console.log('⚠️ Already submitting, ignoring click');
      return;
    }

    console.log('🔵 === PUBLISH BUTTON CLICKED === 🔵');
    
    // Validate inputs before attempting to submit
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter a title for your listing');
      return;
    }
    
    if (!description.trim()) {
      Alert.alert('Missing Description', 'Please enter a description for your listing');
      return;
    }
    
    if (!price.trim() || isNaN(Number(price)) || Number(price) <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price greater than 0');
      return;
    }
    
    if (!category) {
      Alert.alert('Missing Category', 'Please select a category for your listing');
      return;
    }
    
    // Email validation (required field)
    if (!email.trim()) {
      Alert.alert('Missing Contact Email', 'Please provide a contact email for customers to reach you');
      return;
    }
    
    if (!email.includes('@') || !email.includes('.')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }
    
    // Phone validation (required field)
    if (!phone.trim()) {
      Alert.alert('Missing Phone Number', 'Please provide a phone number for customers to reach you');
      return;
    }
    
    // Location validation (required field)
    if (!location.trim()) {
      Alert.alert('Missing Location', 'Please provide a location where your product/service is available');
      return;
    }

    // Prepare image URLs
    let finalImageUrls: string[] = [];
    if (localImages.length > 0) {
      finalImageUrls = localImages;
    } else if (imageUrl.trim()) {
      finalImageUrls = imageUrl.split(',').map(url => url.trim()).filter(url => url).slice(0, 20);
    }

    console.log('✅ All validations passed, submitting to database...');
    
    try {
      setIsSubmitting(true);
      
      const priceValue = Number(price.trim());
      
      const listingData = {
        user_id: user?.id,
        title: title.trim(),
        description: description.trim(),
        price: priceValue,
        image_url: finalImageUrls.length > 0 ? JSON.stringify(finalImageUrls) : null,
        category_name: category,
        contact_email: email.trim(),
        contact_phone: phone.trim(),
        location: location.trim(),
        is_featured: false,
        is_premium_listing: false,
        is_approved: true, // Auto-approve for immediate visibility
      };
      
      console.log('📝 Inserting listing:', listingData);
      
      const { data: newListing, error: listingError } = await supabase
        .from('products_services')
        .insert(listingData)
        .select()
        .single();

      if (listingError) {
        console.error('❌ Database error:', listingError);
        
        // Provide helpful error messages
        let errorMessage = 'Failed to create listing. Please try again.';
        
        if (listingError.message.includes('foreign key')) {
          errorMessage = 'Authentication error. Please sign out and sign in again.';
        } else if (listingError.message.includes('permission')) {
          errorMessage = 'You do not have permission to create listings. Please contact support.';
        } else if (listingError.message) {
          errorMessage = listingError.message;
        }
        
        throw new Error(errorMessage);
      }
      
      if (!newListing) {
        throw new Error('Listing was created but no data was returned. Please refresh the page.');
      }
      
      console.log('✅ Listing created successfully!', newListing);

      // Clear form
      setTitle('');
      setDescription('');
      setPrice('');
      setCategory('');
      setEmail('');
      setLocation('');
      setImageUrl('');
      setLocalImages([]);

      // Show success and navigate
      Alert.alert(
        '🎉 Published Successfully!', 
        'Your listing is now live and visible to all users in the Akora Marketplace!',
        [
          {
            text: 'View Marketplace',
            onPress: () => {
              router.push('/services');
            }
          },
          {
            text: 'Create Another',
            style: 'cancel'
          }
        ]
      );
      
    } catch (error: any) {
      console.error('❌ Error creating listing:', error);
      Alert.alert(
        'Error', 
        error.message || 'Failed to create listing. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Debug: Check button state (all fields required)
  const isButtonDisabled = !title.trim() || !description.trim() || !price.trim() || !category || !email.trim() || !phone.trim() || !location.trim() || isSubmitting;
  
  // Log form state for debugging - MUST be before any returns
  useEffect(() => {
    console.log('🔍 Form State Changed:', {
      buttonDisabled: isButtonDisabled,
      hasTitle: !!title.trim(),
      hasDescription: !!description.trim(),
      hasPrice: !!price.trim(),
      hasCategory: !!category,
      hasEmail: !!email.trim(),
      hasPhone: !!phone.trim(),
      hasLocation: !!location.trim(),
      isSubmitting
    });
  }, [title, description, price, category, email, phone, location, isSubmitting, isButtonDisabled]);

  if (!fontsLoaded || loading) {
    return null;
  }
  if (!user && !loading) {
    // Optionally show a loading or sign-in prompt
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
            <TouchableOpacity
              onPress={() => router.replace('/services')}
              style={styles.backButton}
            >
              <ArrowLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>
          <Text style={styles.title}>Create Listing</Text>
          <TouchableOpacity 
            style={[
              styles.submitButton, 
              isButtonDisabled && styles.submitButtonDisabled
            ]}
            onPress={() => {
              console.log('👆 Header button pressed');
              handleSubmit();
            }}
            disabled={isButtonDisabled}
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
        {/* Success Badge */}
        <View style={styles.successBadge}>
          <Sparkles size={20} color="#10B981" />
          <Text style={styles.successBadgeText}>List your service now and reach thousands of potential customers instantly!</Text>
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
            placeholder="Describe your product or service in detail..."
            placeholderTextColor="#999999"
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={500}
          />
          <Text style={styles.charCount}>{description.length}/500</Text>
        </View>
        
        <View style={styles.formGroup}>
          <View style={{backgroundColor:'#F8F9FA',borderRadius:16,padding:18,marginBottom:18,shadowColor:'#4169E1',shadowOffset:{width:0,height:2},shadowOpacity:0.08,shadowRadius:8,elevation:2,borderWidth:1,borderColor:'#E2E8F0'}}>
            <Text style={{fontSize:16,fontFamily:'Inter-SemiBold',color:'#4169E1',marginBottom:10}}>Price *</Text>
            <View style={{flexDirection:'row',gap:12,marginBottom:8,marginTop:4}}>
              <TouchableOpacity style={[styles.currencyButton,currency==='USD'&&{backgroundColor:'#4169E1',borderWidth:2,borderColor:'#4169E1'}]} onPress={()=>setCurrency('USD')}>
                <Text style={[{fontSize:16,fontFamily:'Inter-SemiBold',color:'#4169E1'},currency==='USD'&&{color:'#FFFFFF',fontWeight:'bold'}]}>$ USD</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.currencyButton,currency==='GHS'&&{backgroundColor:'#4169E1',borderWidth:2,borderColor:'#4169E1'}]} onPress={()=>setCurrency('GHS')}>
                <Text style={[{fontSize:16,fontFamily:'Inter-SemiBold',color:'#4169E1'},currency==='GHS'&&{color:'#FFFFFF',fontWeight:'bold'}]}>₵ GHS</Text>
              </TouchableOpacity>
            </View>
            <View style={{flexDirection:'row',alignItems:'center',backgroundColor:'#FFFFFF',borderRadius:12,paddingHorizontal:16,marginTop:8,marginBottom:8,borderWidth:1,borderColor:'#E2E8F0'}}>
              <Text style={{fontSize:22,fontFamily:'Inter-Bold',color:'#4169E1',marginRight:8}}>{currency==='USD'?'$':'₵'}</Text>
              <TextInput style={{flex:1,padding:16,fontSize:18,fontFamily:'Inter-SemiBold',color:'#4169E1',backgroundColor:'#F8F9FA',borderRadius:8}} placeholder="0.00" placeholderTextColor="#999999" keyboardType="decimal-pad" value={price} onChangeText={setPrice}/>
              <Text style={{fontSize:14,color:'#4169E1',marginLeft:8,fontFamily:'Inter-SemiBold'}}>/hour</Text>
            </View>
            <Text style={{fontSize:12,color:'#666666',marginTop:4,fontFamily:'Inter-Regular'}}>Enter the hourly rate (Note: Only the number will be stored)</Text>
          </View>
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
          <Text style={styles.label}>Contact Email *</Text>
          <TextInput
            style={styles.input}
            placeholder="your@email.com"
            placeholderTextColor="#999999"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Text style={styles.helperText}>Customers will use this to contact you</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Phone Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="+233 XX XXX XXXX"
            placeholderTextColor="#999999"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <Text style={styles.helperText}>Customers can call or WhatsApp you</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Location *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Accra, Ghana"
            placeholderTextColor="#999999"
            value={location}
            onChangeText={setLocation}
          />
          <Text style={styles.helperText}>Where is your product/service available?</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Images</Text>
          <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
            <TouchableOpacity style={styles.imagePickerButton} onPress={pickImages}>
              <ImageIcon size={20} color="#4169E1" />
              <Text style={{ color: '#4169E1', fontFamily: 'Inter-SemiBold' }}>Upload from Camera Roll</Text>
            </TouchableOpacity>
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
          </View>
          {(localImages.length > 0 || imageUrl.trim() !== '') && (
            <View style={styles.imagePreviewContainer}>
              <Text style={styles.imagePreviewLabel}>Preview:</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {localImages.map((uri) => (
                  <View key={uri} style={{ position: 'relative', marginBottom: 8 }}>
                    <Image 
                      source={{ uri }} 
                      style={[styles.imagePreview, { width: 100, height: 100 }]} 
                      onError={() => Alert.alert('Invalid Image', 'The selected image is not valid.')}
                    />
                    <TouchableOpacity
                      style={{ position: 'absolute', top: 4, right: 4, backgroundColor: '#fff', borderRadius: 12, padding: 2 }}
                      onPress={() => removeImage(uri)}
                    >
                      <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {imageUrl.trim() !== '' && (
                  <Image 
                    source={{ uri: imageUrl }} 
                    style={[styles.imagePreview, { width: 100, height: 100 }]} 
                    onError={() => Alert.alert('Invalid Image', 'The selected image or URL is not valid.')}
                  />
                )}
              </View>
            </View>
          )}
        </View>
        
        <View style={styles.infoContainer}>
          <Info size={20} color="#4169E1" />
          <Text style={styles.infoText}>
            Your listing will be published immediately and visible to all users. Create unlimited free listings!
          </Text>
        </View>

        {/* Submit Button at Bottom */}
        <TouchableOpacity 
          style={[
            styles.submitButtonLarge,
            isButtonDisabled && styles.submitButtonLargeDisabled
          ]}
          onPress={handleSubmit}
          disabled={isButtonDisabled}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={isButtonDisabled 
              ? ['#CBD5E1', '#CBD5E1'] 
              : ['#4169E1', '#5B7FE8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitButtonGradient}
          >
            {isSubmitting ? (
              <>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.submitButtonLargeText}>Publishing Listing...</Text>
              </>
            ) : (
              <>
                <Send size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonLargeText}>
                  {isButtonDisabled ? 'Fill Required Fields' : 'Publish Listing Now'}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Helper text below button */}
        {isButtonDisabled && !isSubmitting && (
          <Text style={styles.buttonHelperText}>
            Please fill in all required fields (*) to publish your listing
          </Text>
        )}

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
    marginRight: 8,
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8F0FE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 8,
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
  currencyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  buttonHelperText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 20,
  },
});