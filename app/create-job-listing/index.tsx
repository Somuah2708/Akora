import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter } from 'expo-router';
import { ArrowLeft, Image as ImageIcon, Send, DollarSign, Tag, Info, Briefcase, Mail, Trash2, Upload, Plus, X, Calendar, MapPin, Building2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

SplashScreen.preventAutoHideAsync();

const JOB_CATEGORIES = [
  { id: '1', name: 'Full Time Jobs', type: 'full_time' },
  { id: '2', name: 'Internships', type: 'internship' },
  { id: '3', name: 'National Service', type: 'national_service' },
  { id: '4', name: 'Part Time', type: 'part_time' },
  { id: '5', name: 'Remote Work', type: 'full_time' },
  { id: '6', name: 'Volunteering', type: 'volunteer' },
];

const EXPERIENCE_LEVELS = [
  { id: 'student', name: 'Student/Entry Level' },
  { id: 'entry', name: 'Entry Level (0-2 years)' },
  { id: 'mid', name: 'Mid Level (3-5 years)' },
  { id: 'senior', name: 'Senior (5+ years)' },
  { id: 'executive', name: 'Executive/Management' },
];

export default function CreateJobListingScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();
  
  // Basic info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  
  // Salary
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [currency, setCurrency] = useState('GHS');
  
  // Additional fields
  const [email, setEmail] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [openingsCount, setOpeningsCount] = useState('1');
  const [applicationDeadline, setApplicationDeadline] = useState('');
  
  // Arrays
  const [requirements, setRequirements] = useState<string[]>([]);
  const [currentRequirement, setCurrentRequirement] = useState('');
  const [responsibilities, setResponsibilities] = useState<string[]>([]);
  const [currentResponsibility, setCurrentResponsibility] = useState('');
  const [benefits, setBenefits] = useState<string[]>([]);
  const [currentBenefit, setCurrentBenefit] = useState('');
  
  // Images
  const [companyLogo, setCompanyLogo] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [useUrlInput, setUseUrlInput] = useState(false);
  
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
    if (loading) return;
    if (!user) {
      Alert.alert('Authentication Required', 'Please sign in to post job listings.');
      router.replace('/auth/sign-in');
    }
  }, [user, loading]);

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 10,
    });
    if (!result.canceled && result.assets) {
      setUploadedImages((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 10));
    }
  };

  const pickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setCompanyLogo(result.assets[0].uri);
    }
  };

  const addRequirement = () => {
    if (currentRequirement.trim()) {
      setRequirements([...requirements, currentRequirement.trim()]);
      setCurrentRequirement('');
    }
  };

  const removeRequirement = (index: number) => {
    setRequirements(requirements.filter((_, i) => i !== index));
  };

  const addResponsibility = () => {
    if (currentResponsibility.trim()) {
      setResponsibilities([...responsibilities, currentResponsibility.trim()]);
      setCurrentResponsibility('');
    }
  };

  const removeResponsibility = (index: number) => {
    setResponsibilities(responsibilities.filter((_, i) => i !== index));
  };

  const addBenefit = () => {
    if (currentBenefit.trim()) {
      setBenefits([...benefits, currentBenefit.trim()]);
      setCurrentBenefit('');
    }
  };

  const removeBenefit = (index: number) => {
    setBenefits(benefits.filter((_, i) => i !== index));
  };

  const handleClearForm = () => {
    Alert.alert('Clear Form', 'Are you sure you want to clear all fields?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          setTitle('');
          setDescription('');
          setCompany('');
          setLocation('');
          setCategory('');
          setEmploymentType('');
          setExperienceLevel('');
          setSalaryMin('');
          setSalaryMax('');
          setEmail('');
          setExternalUrl('');
          setOpeningsCount('1');
          setApplicationDeadline('');
          setRequirements([]);
          setResponsibilities([]);
          setBenefits([]);
          setCompanyLogo('');
          setUploadedImages([]);
        },
      },
    ]);
  };

  const handleSubmit = async () => {
    // Validation
    if (!title.trim()) {
      Alert.alert('Missing Information', 'Please enter a job title');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Missing Information', 'Please enter a job description');
      return;
    }
    if (!company.trim()) {
      Alert.alert('Missing Information', 'Please enter a company name');
      return;
    }
    if (!location.trim()) {
      Alert.alert('Missing Information', 'Please enter a location');
      return;
    }
    if (!category) {
      Alert.alert('Missing Information', 'Please select a job category');
      return;
    }
    if (!experienceLevel) {
      Alert.alert('Missing Information', 'Please select an experience level');
      return;
    }

    try {
      setIsSubmitting(true);

      // Prepare image URLs
      let finalImageUrls: string[] = uploadedImages.length > 0 ? uploadedImages : [];

      // Get employment type from category
      const selectedCategory = JOB_CATEGORIES.find(c => c.name === category);
      const empType = employmentType || selectedCategory?.type || 'full_time';

      // Prepare data
      const jobData = {
        user_id: user?.id,
        title: title.trim(),
        description: description.trim(),
        company_name: company.trim(),
        location: location.trim(),
        category_name: category,
        employment_type: empType,
        experience_level: experienceLevel,
        
        // Salary
        salary_min: salaryMin ? parseFloat(salaryMin) : null,
        salary_max: salaryMax ? parseFloat(salaryMax) : null,
        price: salaryMax ? parseFloat(salaryMax) : (salaryMin ? parseFloat(salaryMin) : null),
        currency: currency,
        
        // Additional fields
        requirements: requirements.length > 0 ? JSON.stringify(requirements) : null,
        responsibilities: responsibilities.length > 0 ? JSON.stringify(responsibilities) : null,
        benefits: benefits.length > 0 ? JSON.stringify(benefits) : null,
        creator_email: email.trim() || null,
        external_url: externalUrl.trim() || null,
        openings_count: parseInt(openingsCount) || 1,
        application_deadline: applicationDeadline || null,
        
        // Images
        company_logo: companyLogo || null,
        image_url: finalImageUrls.length > 0 ? JSON.stringify(finalImageUrls) : null,
        
        // Status
        is_featured: false,
        is_premium_listing: false,
        is_approved: true,
        approval_status: 'approved',
        
        // Counters
        view_count: 0,
        application_count: 0,
      };

      const { data, error } = await supabase
        .from('products_services')
        .insert(jobData)
        .select()
        .single();

      if (error) throw error;

      Alert.alert(
        '✅ Success!',
        'Your job listing has been posted successfully!',
        [
          {
            text: 'OK',
            onPress: () => router.push('/workplace'),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error creating job listing:', error);
      Alert.alert('Error', error.message || 'Failed to post job listing');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!fontsLoaded || !user) {
    return null;
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <LinearGradient
        colors={['#4169E1', '#6B8FFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post a Job</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Briefcase size={20} color="#4169E1" />
          <Text style={styles.infoBannerText}>
            Fill in the details to post your job opportunity
          </Text>
        </View>

        {/* Job Title */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Job Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Senior Software Engineer"
              placeholderTextColor="#999999"
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Company Name *</Text>
            <View style={styles.inputWithIcon}>
              <Building2 size={20} color="#999999" />
              <TextInput
                style={styles.inputText}
                placeholder="e.g. Tech Company Ghana"
                placeholderTextColor="#999999"
                value={company}
                onChangeText={setCompany}
                maxLength={100}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Location *</Text>
            <View style={styles.inputWithIcon}>
              <MapPin size={20} color="#999999" />
              <TextInput
                style={styles.inputText}
                placeholder="e.g. Accra, Ghana or Remote"
                placeholderTextColor="#999999"
                value={location}
                onChangeText={setLocation}
                maxLength={100}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Job Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe the job role, what the candidate will do, team culture, etc."
              placeholderTextColor="#999999"
              multiline
              value={description}
              onChangeText={setDescription}
              maxLength={2000}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{description.length}/2000</Text>
          </View>
        </View>

        {/* Job Category & Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Job Category</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Category *</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsContainer}
            >
              {JOB_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.chip, category === cat.name && styles.chipActive]}
                  onPress={() => {
                    setCategory(cat.name);
                    setEmploymentType(cat.type);
                  }}
                >
                  <Text style={[styles.chipText, category === cat.name && styles.chipTextActive]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Experience Level *</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsContainer}
            >
              {EXPERIENCE_LEVELS.map((level) => (
                <TouchableOpacity
                  key={level.id}
                  style={[styles.chip, experienceLevel === level.id && styles.chipActive]}
                  onPress={() => setExperienceLevel(level.id)}
                >
                  <Text style={[styles.chipText, experienceLevel === level.id && styles.chipTextActive]}>
                    {level.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* Salary Range */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compensation</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Currency</Text>
            <View style={styles.currencyButtons}>
              <TouchableOpacity
                style={[styles.currencyButton, currency === 'GHS' && styles.currencyButtonActive]}
                onPress={() => setCurrency('GHS')}
              >
                <Text style={[styles.currencyButtonText, currency === 'GHS' && styles.currencyButtonTextActive]}>
                  ₵ GHS
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.currencyButton, currency === 'USD' && styles.currencyButtonActive]}
                onPress={() => setCurrency('USD')}
              >
                <Text style={[styles.currencyButtonText, currency === 'USD' && styles.currencyButtonTextActive]}>
                  $ USD
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Salary Range (Optional)</Text>
            <View style={styles.salaryRow}>
              <View style={styles.salaryInput}>
                <Text style={styles.currencySymbol}>{currency === 'GHS' ? '₵' : '$'}</Text>
                <TextInput
                  style={styles.salaryInputText}
                  placeholder="Min"
                  placeholderTextColor="#999999"
                  keyboardType="numeric"
                  value={salaryMin}
                  onChangeText={setSalaryMin}
                />
              </View>
              <Text style={styles.salaryDash}>—</Text>
              <View style={styles.salaryInput}>
                <Text style={styles.currencySymbol}>{currency === 'GHS' ? '₵' : '$'}</Text>
                <TextInput
                  style={styles.salaryInputText}
                  placeholder="Max"
                  placeholderTextColor="#999999"
                  keyboardType="numeric"
                  value={salaryMax}
                  onChangeText={setSalaryMax}
                />
              </View>
            </View>
            <Text style={styles.helpText}>Leave blank if salary is negotiable or not disclosed</Text>
          </View>
        </View>

        {/* Requirements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Requirements & Qualifications</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Add Requirement</Text>
            <View style={styles.addItemRow}>
              <TextInput
                style={styles.addItemInput}
                placeholder="e.g. Bachelor's degree in Computer Science"
                placeholderTextColor="#999999"
                value={currentRequirement}
                onChangeText={setCurrentRequirement}
                onSubmitEditing={addRequirement}
              />
              <TouchableOpacity style={styles.addButton} onPress={addRequirement}>
                <Plus size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            {requirements.length > 0 && (
              <View style={styles.itemsList}>
                {requirements.map((req, index) => (
                  <View key={index} style={styles.item}>
                    <Text style={styles.itemText}>• {req}</Text>
                    <TouchableOpacity onPress={() => removeRequirement(index)}>
                      <X size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Responsibilities */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Responsibilities</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Add Responsibility</Text>
            <View style={styles.addItemRow}>
              <TextInput
                style={styles.addItemInput}
                placeholder="e.g. Lead development team and review code"
                placeholderTextColor="#999999"
                value={currentResponsibility}
                onChangeText={setCurrentResponsibility}
                onSubmitEditing={addResponsibility}
              />
              <TouchableOpacity style={styles.addButton} onPress={addResponsibility}>
                <Plus size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            {responsibilities.length > 0 && (
              <View style={styles.itemsList}>
                {responsibilities.map((resp, index) => (
                  <View key={index} style={styles.item}>
                    <Text style={styles.itemText}>• {resp}</Text>
                    <TouchableOpacity onPress={() => removeResponsibility(index)}>
                      <X size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Benefits */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Benefits & Perks</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Add Benefit</Text>
            <View style={styles.addItemRow}>
              <TextInput
                style={styles.addItemInput}
                placeholder="e.g. Health insurance and flexible hours"
                placeholderTextColor="#999999"
                value={currentBenefit}
                onChangeText={setCurrentBenefit}
                onSubmitEditing={addBenefit}
              />
              <TouchableOpacity style={styles.addButton} onPress={addBenefit}>
                <Plus size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            {benefits.length > 0 && (
              <View style={styles.itemsList}>
                {benefits.map((benefit, index) => (
                  <View key={index} style={styles.item}>
                    <Text style={styles.itemText}>• {benefit}</Text>
                    <TouchableOpacity onPress={() => removeBenefit(index)}>
                      <X size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Additional Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Details</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Contact Email</Text>
            <View style={styles.inputWithIcon}>
              <Mail size={20} color="#999999" />
              <TextInput
                style={styles.inputText}
                placeholder="hr@company.com"
                placeholderTextColor="#999999"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Number of Openings</Text>
            <TextInput
              style={styles.input}
              placeholder="1"
              placeholderTextColor="#999999"
              keyboardType="numeric"
              value={openingsCount}
              onChangeText={setOpeningsCount}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Application Deadline (Optional)</Text>
            <View style={styles.inputWithIcon}>
              <Calendar size={20} color="#999999" />
              <TextInput
                style={styles.inputText}
                placeholder="YYYY-MM-DD (e.g. 2025-12-31)"
                placeholderTextColor="#999999"
                value={applicationDeadline}
                onChangeText={setApplicationDeadline}
              />
            </View>
            <Text style={styles.helpText}>Format: YYYY-MM-DD</Text>
          </View>
        </View>

        {/* Images */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Images (Optional)</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Company Logo</Text>
            <TouchableOpacity style={styles.uploadButton} onPress={pickLogo}>
              <Upload size={20} color="#4169E1" />
              <Text style={styles.uploadButtonText}>
                {companyLogo ? 'Change Logo' : 'Upload Logo'}
              </Text>
            </TouchableOpacity>
            {companyLogo && (
              <Image source={{ uri: companyLogo }} style={styles.logoPreview} contentFit="contain" />
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Job/Office Photos</Text>
            <TouchableOpacity style={styles.uploadButton} onPress={pickImages}>
              <Upload size={20} color="#4169E1" />
              <Text style={styles.uploadButtonText}>
                {uploadedImages.length > 0 ? `Upload Photos (${uploadedImages.length})` : 'Upload Photos'}
              </Text>
            </TouchableOpacity>
            {uploadedImages.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesPreview}>
                {uploadedImages.map((uri, idx) => (
                  <View key={idx} style={styles.imageWrapper}>
                    <Image source={{ uri }} style={styles.imagePreview} contentFit="cover" />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => setUploadedImages(prev => prev.filter((_, i) => i !== idx))}
                    >
                      <X size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.clearButton} onPress={handleClearForm}>
            <Trash2 size={20} color="#EF4444" />
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Send size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Post Job</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  formContainer: {
    flex: 1,
    padding: 20,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF0FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#4169E1',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#000000',
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#000000',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  inputText: {
    flex: 1,
    padding: 16,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#999999',
    textAlign: 'right',
    marginTop: 4,
  },
  chipsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  chipActive: {
    backgroundColor: '#4169E1',
    borderColor: '#4169E1',
  },
  chipText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
  },
  currencyButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  currencyButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  currencyButtonActive: {
    backgroundColor: '#4169E1',
    borderColor: '#4169E1',
  },
  currencyButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
  },
  currencyButtonTextActive: {
    color: '#FFFFFF',
  },
  salaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  salaryInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  currencySymbol: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
  },
  salaryInputText: {
    flex: 1,
    padding: 16,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  salaryDash: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    color: '#999999',
  },
  helpText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#999999',
    marginTop: 4,
  },
  addItemRow: {
    flexDirection: 'row',
    gap: 8,
  },
  addItemInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#000000',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#4169E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemsList: {
    marginTop: 12,
    gap: 8,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  itemText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#4169E1',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  logoPreview: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    marginTop: 12,
    backgroundColor: '#F8F9FA',
  },
  imagesPreview: {
    marginTop: 12,
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  imagePreview: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  clearButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#EF4444',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  clearButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4169E1',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
});
