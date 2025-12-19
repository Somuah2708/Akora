import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, Image as ImageIcon, Send, DollarSign, Tag, Info, Briefcase, Mail, Trash2, Upload, Calendar } from 'lucide-react-native';
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
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [currency, setCurrency] = useState('GHS'); // GHS (Ghana Cedis) or USD
  const [salaryPeriod, setSalaryPeriod] = useState('monthly'); // hourly, daily, weekly, monthly, yearly
  const [email, setEmail] = useState('');
  const [deadline, setDeadline] = useState('');
  const [requirements, setRequirements] = useState('');
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
      debouncedRouter.replace('/auth/sign-in');
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
      setSalaryMin('');
      setSalaryMax('');
      setCurrency('USD');
      setSalaryPeriod('monthly');
      setEmail('');
      setDeadline('');
      setRequirements('');
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
      
      // Format salary with currency and period
      let formattedSalary = null;
      const minSalary = salaryMin.trim() ? parseFloat(salaryMin) : null;
      const maxSalary = salaryMax.trim() ? parseFloat(salaryMax) : null;
      
      if (minSalary && maxSalary) {
        formattedSalary = `${currency} ${minSalary.toLocaleString()} - ${maxSalary.toLocaleString()}/${salaryPeriod}`;
      } else if (minSalary) {
        formattedSalary = `${currency} ${minSalary.toLocaleString()}+/${salaryPeriod}`;
      } else if (maxSalary) {
        formattedSalary = `${currency} Up to ${maxSalary.toLocaleString()}/${salaryPeriod}`;
      }
      
      // Insert the job listing
      const { data: newListing, error: listingError } = await supabase
        .from('jobs')
        .insert({
          user_id: user?.id,
          title: title.trim(),
          company: company.trim(),
          location: location.trim(),
          job_type: category,
          salary: formattedSalary,
          salary_min: minSalary,
          salary_max: maxSalary,
          salary_currency: currency,
          salary_period: salaryPeriod,
          description: description.trim(),
          requirements: requirements.trim() || null,
          contact_email: email.trim() || null,
          application_deadline: deadline.trim() || null,
          image_url: finalImageUrls.length > 0 ? JSON.stringify(finalImageUrls) : null,
          is_featured: false,
          is_approved: false, // Requires admin approval before publishing
        })
        .select()
        .single();

      if (listingError) throw listingError;

      console.log('✅ Job listing created successfully:', newListing);
      alert('✅ Success! Your job listing has been submitted for review. It will be published once approved by an administrator.');
      
      // Navigate to workplace
      debouncedRouter.push('/workplace');
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
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>Submit Job Listing</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.formContainer}>
        <View style={styles.infoCard}>
          <Briefcase size={24} color="#ffc857" />
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
            placeholderTextColor="#94A3B8"
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
            placeholderTextColor="#94A3B8"
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
            placeholderTextColor="#94A3B8"
            value={location}
            onChangeText={setLocation}
            maxLength={100}
          />
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Provide details about the job, responsibilities, etc."
            placeholderTextColor="#94A3B8"
            multiline
            value={description}
            onChangeText={setDescription}
            maxLength={5000}
            textAlignVertical="top"
          />
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Requirements (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="List job requirements, qualifications, skills needed, etc."
            placeholderTextColor="#94A3B8"
            multiline
            value={requirements}
            onChangeText={setRequirements}
            maxLength={5000}
            textAlignVertical="top"
          />
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Contact Email (Optional)</Text>
          <View style={styles.emailContainer}>
            <Mail size={20} color="#64748B" />
            <TextInput
              style={styles.emailInput}
              placeholder="Enter contact email for applicants"
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Application Deadline (Optional)</Text>
          <View style={styles.emailContainer}>
            <Calendar size={20} color="#64748B" />
            <TextInput
              style={styles.emailInput}
              placeholder="e.g., December 31, 2025 or 30 days"
              placeholderTextColor="#94A3B8"
              value={deadline}
              onChangeText={setDeadline}
            />
          </View>
          <Text style={styles.helperText}>
            Optional: Set a custom deadline for applications
          </Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Salary/Stipend Range (Optional)</Text>
          
          {/* Currency Selection */}
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
          
          {/* Salary Range Inputs */}
          <View style={styles.salaryRangeContainer}>
            <View style={styles.salaryInputWrapper}>
              <Text style={styles.salaryInputLabel}>Min</Text>
              <View style={styles.priceInputContainer}>
                <Text style={styles.currencySymbol}>{currency === 'USD' ? '$' : '₵'}</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="0"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={salaryMin}
                  onChangeText={setSalaryMin}
                />
              </View>
            </View>
            
            <View style={styles.rangeSeparator}>
              <Text style={styles.rangeSeparatorText}>to</Text>
            </View>
            
            <View style={styles.salaryInputWrapper}>
              <Text style={styles.salaryInputLabel}>Max</Text>
              <View style={styles.priceInputContainer}>
                <Text style={styles.currencySymbol}>{currency === 'USD' ? '$' : '₵'}</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="0"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={salaryMax}
                  onChangeText={setSalaryMax}
                />
              </View>
            </View>
          </View>
          
          {/* Payment Period Selection */}
          <Text style={[styles.label, { marginTop: 12, marginBottom: 8 }]}>Payment Period</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.periodContainer}
          >
            {['hourly', 'daily', 'weekly', 'monthly', 'yearly'].map((period) => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.periodChip,
                  salaryPeriod === period && styles.selectedPeriodChip
                ]}
                onPress={() => setSalaryPeriod(period)}
              >
                <Text 
                  style={[
                    styles.periodChipText,
                    salaryPeriod === period && styles.selectedPeriodChipText
                  ]}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          {/* Preview */}
          {(salaryMin || salaryMax) && (
            <View style={styles.salaryPreview}>
              <Text style={styles.salaryPreviewLabel}>Preview:</Text>
              <Text style={styles.salaryPreviewText}>
                {currency} {salaryMin && salaryMax 
                  ? `${parseFloat(salaryMin).toLocaleString()} - ${parseFloat(salaryMax).toLocaleString()}`
                  : salaryMin 
                    ? `${parseFloat(salaryMin).toLocaleString()}+`
                    : `Up to ${parseFloat(salaryMax).toLocaleString()}`
                }
                <Text style={styles.salaryPreviewPeriod}>/{salaryPeriod}</Text>
              </Text>
            </View>
          )}
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
              <Upload size={18} color={!useUrlInput ? '#ffc857' : '#64748B'} />
              <Text style={[styles.toggleText, !useUrlInput && styles.toggleTextActive]}>
                Gallery
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, useUrlInput && styles.toggleButtonActive]}
              onPress={() => setUseUrlInput(true)}
            >
              <ImageIcon size={18} color={useUrlInput ? '#ffc857' : '#64748B'} />
              <Text style={[styles.toggleText, useUrlInput && styles.toggleTextActive]}>
                URL
              </Text>
            </TouchableOpacity>
          </View>

          {!useUrlInput ? (
            <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
              <Upload size={24} color="#ffc857" />
              <Text style={styles.uploadButtonText}>
                {uploadedImages.length > 0 ? `Upload Photos (${uploadedImages.length})` : 'Upload Photos'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.imageUrlContainer}>
              <ImageIcon size={20} color="#64748B" />
              <TextInput
                style={styles.imageUrlInput}
                placeholder="Enter image URLs (comma separated, up to 20)"
                placeholderTextColor="#94A3B8"
                value={imageUrl}
                onChangeText={setImageUrl}
              />
            </View>
          )}

          {/* Image Preview */}
          {(uploadedImages.length > 0 || (imageUrl && imageUrl.trim() !== '')) && (
            <View style={styles.imagePreviewContainer}>
              <Text style={styles.imagePreviewLabel}>Image Preview:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {uploadedImages.map((uri, idx) => (
                  <View key={uri + idx} style={styles.imagePreviewWrapper}>
                    <Image 
                      source={{ uri }} 
                      style={styles.imagePreview}
                      contentFit="cover"
                      transition={200}
                    />
                    <TouchableOpacity
                      style={styles.removePreviewButton}
                      onPress={() => {
                        setUploadedImages(prev => prev.filter((_, i) => i !== idx));
                      }}
                    >
                      <Text style={styles.removePreviewText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {imageUrl.trim() !== '' && imageUrl.split(',').slice(0, 20).map((url, idx) => (
                  <Image 
                    key={url.trim() + idx}
                    source={{ uri: url.trim() }} 
                    style={styles.imagePreview}
                    contentFit="cover"
                    transition={200}
                  />
                ))}
              </ScrollView>
            </View>
          )}
        </View>
        
        <View style={styles.infoContainer}>
          <Info size={20} color="#64748B" />
          <Text style={styles.infoText}>
            Your job listing will be published immediately and appear in the Workplace section for job seekers to view.
          </Text>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity 
          style={[
            styles.postButton,
            (!title.trim() || !description.trim() || !company.trim() || !location.trim() || !category || isSubmitting) && styles.postButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={!title.trim() || !description.trim() || !company.trim() || !location.trim() || !category || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#0F172A" size="small" />
          ) : (
            <>
              <Send size={20} color="#0F172A" />
              <Text style={styles.postButtonText}>Post Job</Text>
            </>
          )}
        </TouchableOpacity>
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
    color: '#0F172A',
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
    backgroundColor: 'rgba(255, 200, 87, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 200, 87, 0.4)',
  },
  infoTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  textArea: {
    height: 120,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  priceInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#0F172A',
  },
  salaryRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  salaryInputWrapper: {
    flex: 1,
  },
  salaryInputLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#64748B',
    marginBottom: 8,
  },
  rangeSeparator: {
    paddingBottom: 20,
  },
  rangeSeparatorText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  periodContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
    gap: 8,
  },
  periodChip: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedPeriodChip: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  periodChipText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  selectedPeriodChipText: {
    color: '#ffc857',
    fontFamily: 'Inter-SemiBold',
  },
  salaryPreview: {
    backgroundColor: 'rgba(255, 200, 87, 0.15)',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 200, 87, 0.4)',
  },
  salaryPreviewLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#B8860B',
    marginBottom: 4,
  },
  salaryPreviewText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
  },
  salaryPreviewPeriod: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  categoriesContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
    gap: 8,
  },
  categoryChip: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedCategoryChip: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  categoryChipText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  selectedCategoryChipText: {
    color: '#ffc857',
    fontFamily: 'Inter-SemiBold',
  },
  imageUrlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  imageUrlInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#0F172A',
  },
  imagePreviewContainer: {
    marginTop: 12,
  },
  imagePreviewLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginBottom: 8,
  },
  imagePreview: {
    width: 250,
    height: 200,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  imagePreviewWrapper: {
    position: 'relative',
    marginRight: 12,
    width: 250,
  },
  removePreviewButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#EF4444',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePreviewText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emailInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#0F172A',
  },
  helperText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#94A3B8',
    marginTop: 6,
    fontStyle: 'italic',
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
    backgroundColor: '#F8FAFC',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  currencyButtonActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  currencyText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#64748B',
  },
  currencyTextActive: {
    color: '#ffc857',
  },
  currencySymbol: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#64748B',
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
    backgroundColor: '#F8FAFC',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  toggleButtonActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  toggleText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#64748B',
  },
  toggleTextActive: {
    color: '#ffc857',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 2,
    borderColor: '#0F172A',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    gap: 12,
  },
  uploadButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffc857',
  },
  postButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffc857',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 32,
    marginHorizontal: 16,
    shadowColor: '#ffc857',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  postButtonDisabled: {
    backgroundColor: '#E2E8F0',
    shadowOpacity: 0,
  },
  postButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
  },
});