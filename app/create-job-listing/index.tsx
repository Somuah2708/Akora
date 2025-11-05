import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter } from 'expo-router';
import { ArrowLeft, Image as ImageIcon, Send, DollarSign, Tag, Info, Briefcase, Mail, Trash2, Upload } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { LinearGradient } from 'expo-linear-gradient';

SplashScreen.preventAutoHideAsync();

const JOB_CATEGORIES = [
  { id: '1', name: 'Full Time Jobs' },
  { id: '2', name: 'Internships' },
  { id: '3', name: 'National Service' },
  { id: '4', name: 'Part Time' },
  { id: '5', name: 'Remote Work' },
  { id: '6', name: 'Volunteering' },
];

export default function CreateJobListingScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [salary, setSalary] = useState('');
  const [currency, setCurrency] = useState('USD'); // USD or GHS (Ghana Cedis)
  const [email, setEmail] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [useUrlInput, setUseUrlInput] = useState(false);
  const [category, setCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      Alert.alert('Authentication Required', 'Please sign in to submit job listings.');
      router.replace('/auth/sign-in');
      return;
    }
  }, [user, loading, router]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 1,
      selectionLimit: 20,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setUploadedImages((prev) => {
        const combined = [...prev, ...result.assets.map((a) => a.uri)];
        return combined.slice(0, 20);
      });
      setImageUrl('');
    }
  };

  const handleClearForm = () => {
    const confirmed = confirm('Are you sure you want to clear all fields?');
    if (confirmed) {
      setTitle('');
      setDescription('');
      setCompany('');
      setLocation('');
      setSalary('');
      setCurrency('USD');
      setEmail('');
      setImageUrl('');
      setUploadedImages([]);
      setCategory('');
    }
  };

  const handleSubmit = async () => {
    // Validate inputs
    if (!title.trim()) {
      alert('Please enter a job title');
      return;
    }
    
    if (!description.trim()) {
      alert('Please enter a job description');
      return;
    }
    
    if (!company.trim()) {
      alert('Please enter a company name');
      return;
    }
    
    if (!location.trim()) {
      alert('Please enter a location');
      return;
    }
    
    if (!category) {
      alert('Please select a job category');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Determine final image URLs
      let finalImageUrls: string[] = [];
      if (uploadedImages.length > 0) {
        finalImageUrls = uploadedImages;
      } else if (imageUrl.trim()) {
        finalImageUrls = imageUrl.split(',').map(url => url.trim()).slice(0, 20);
      }
      
      // Format salary with currency
      const formattedSalary = salary.trim() ? `${currency} ${salary}` : null;
      
      // Construct description with email if provided
      let fullDescription = `${company.trim()} | ${location.trim()} | ${description.trim()}`;
      if (email.trim()) {
        fullDescription += ` | Email: ${email.trim()}`;
      }
      
      // Insert the job listing
      const { data: newListing, error: listingError } = await supabase
        .from('products_services')
        .insert({
          user_id: user?.id,
          title: title.trim(),
          description: fullDescription,
          price: salary.trim() ? Number(salary) : null,
          image_url: finalImageUrls.length > 0 ? JSON.stringify(finalImageUrls) : null,
          category_name: category,
          is_featured: false,
          is_premium_listing: false,
          is_approved: true,
        })
        .select()
        .single();

      if (listingError) throw listingError;

      alert('✅ Success! Your job listing has been created successfully!');
      
      // Navigate to workplace
      router.push('/workplace');
    } catch (error: any) {
      console.error('Error creating job listing:', error);
      alert(`Error: ${error.message || 'Failed to submit job listing'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!fontsLoaded || !user) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.title}>Submit Job Listing</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.formContainer}>
        <View style={styles.infoCard}>
          <Briefcase size={24} color="#4169E1" />
          <Text style={styles.infoTitle}>Submit Job Opportunity</Text>
          <Text style={styles.infoText}>
            Your submission will be reviewed by administrators before being published.
          </Text>
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Job Title</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter the job title"
            placeholderTextColor="#666666"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Company</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter company name"
            placeholderTextColor="#666666"
            value={company}
            onChangeText={setCompany}
            maxLength={100}
          />
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Location</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter job location (e.g., Accra, Ghana or Remote)"
            placeholderTextColor="#666666"
            value={location}
            onChangeText={setLocation}
            maxLength={100}
          />
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Provide details about the job, requirements, responsibilities, etc."
            placeholderTextColor="#666666"
            multiline
            value={description}
            onChangeText={setDescription}
            maxLength={1000}
            textAlignVertical="top"
          />
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Contact Email (Optional)</Text>
          <View style={styles.emailContainer}>
            <Mail size={20} color="#666666" />
            <TextInput
              style={styles.emailInput}
              placeholder="Enter contact email for applicants"
              placeholderTextColor="#666666"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Salary/Stipend (Optional)</Text>
          <View style={styles.currencyRow}>
            <TouchableOpacity
              style={[styles.currencyButton, currency === 'USD' && styles.currencyButtonActive]}
              onPress={() => setCurrency('USD')}
            >
              <Text style={[styles.currencyText, currency === 'USD' && styles.currencyTextActive]}>
                $ USD
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.currencyButton, currency === 'GHS' && styles.currencyButtonActive]}
              onPress={() => setCurrency('GHS')}
            >
              <Text style={[styles.currencyText, currency === 'GHS' && styles.currencyTextActive]}>
                ₵ GHS
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.priceInputContainer}>
            <Text style={styles.currencySymbol}>{currency === 'USD' ? '$' : '₵'}</Text>
            <TextInput
              style={styles.priceInput}
              placeholder="0.00 (leave blank if not applicable)"
              placeholderTextColor="#666666"
              keyboardType="numeric"
              value={salary}
              onChangeText={setSalary}
            />
          </View>
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Job Type</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
          >
            {JOB_CATEGORIES.map((cat) => (
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
          <Text style={styles.label}>Company Logo (Optional)</Text>
          
          {/* Toggle between Gallery and URL */}
          <View style={styles.imageToggleContainer}>
            <TouchableOpacity
              style={[styles.toggleButton, !useUrlInput && styles.toggleButtonActive]}
              onPress={() => setUseUrlInput(false)}
            >
              <Upload size={18} color={!useUrlInput ? '#FFFFFF' : '#666666'} />
              <Text style={[styles.toggleText, !useUrlInput && styles.toggleTextActive]}>
                Gallery
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, useUrlInput && styles.toggleButtonActive]}
              onPress={() => setUseUrlInput(true)}
            >
              <ImageIcon size={18} color={useUrlInput ? '#FFFFFF' : '#666666'} />
              <Text style={[styles.toggleText, useUrlInput && styles.toggleTextActive]}>
                URL
              </Text>
            </TouchableOpacity>
          </View>

          {!useUrlInput ? (
            <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
              <Upload size={24} color="#4169E1" />
              <Text style={styles.uploadButtonText}>
                {uploadedImages.length > 0 ? `Change Images (${uploadedImages.length}/20)` : 'Upload from Gallery'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.imageUrlContainer}>
              <ImageIcon size={20} color="#666666" />
              <TextInput
                style={styles.imageUrlInput}
                placeholder="Enter image URLs (comma separated, up to 20)"
                placeholderTextColor="#666666"
                value={imageUrl}
                onChangeText={setImageUrl}
              />
            </View>
          )}

          {/* Image Preview */}
          {(uploadedImages.length > 0 || imageUrl.trim() !== '') && (
            <View style={styles.imagePreviewContainer}>
              <Text style={styles.imagePreviewLabel}>Preview:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {uploadedImages.map((uri, idx) => (
                  <Image 
                    key={uri + idx}
                    source={{ uri }} 
                    style={styles.imagePreview}
                    onError={() => alert('Invalid Image URL')}
                  />
                ))}
                {imageUrl.trim() !== '' && imageUrl.split(',').slice(0, 20).map((url, idx) => (
                  <Image 
                    key={url.trim() + idx}
                    source={{ uri: url.trim() }} 
                    style={styles.imagePreview}
                    onError={() => alert('Invalid Image URL')}
                  />
                ))}
              </ScrollView>
            </View>
          )}
        </View>
        
        <View style={styles.infoContainer}>
          <Info size={20} color="#666666" />
          <Text style={styles.infoText}>
            Your job listing will be published immediately and appear in the Workplace section for job seekers to view.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={handleClearForm}
          >
            <Trash2 size={20} color="#EF4444" />
            <Text style={styles.deleteButtonText}>Clear Form</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.postButton,
              (!title.trim() || !description.trim() || !company.trim() || !location.trim() || !category || isSubmitting) && styles.postButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={!title.trim() || !description.trim() || !company.trim() || !location.trim() || !category || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Send size={20} color="#FFFFFF" />
                <Text style={styles.postButtonText}>Post Job</Text>
              </>
            )}
          </TouchableOpacity>
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
  infoCard: {
    backgroundColor: '#EBF0FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
    gap: 8,
  },
  infoTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    textAlign: 'center',
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
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  emailInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  currencyRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  currencyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  currencyButtonActive: {
    backgroundColor: '#4169E1',
  },
  currencyText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
  },
  currencyTextActive: {
    color: '#FFFFFF',
  },
  currencySymbol: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
    marginRight: 8,
  },
  imageToggleContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  toggleButtonActive: {
    backgroundColor: '#4169E1',
  },
  toggleText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EBF0FF',
    borderWidth: 2,
    borderColor: '#4169E1',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    gap: 12,
  },
  uploadButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
  },
  postButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4169E1',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  postButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  postButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});