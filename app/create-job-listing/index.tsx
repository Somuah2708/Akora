import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter } from 'expo-router';
import { ArrowLeft, Image as ImageIcon, Send, DollarSign, Tag, Info, Briefcase } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

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
  const [imageUrl, setImageUrl] = useState('');
  const [applicationLink, setApplicationLink] = useState('');
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

  const handleSubmit = async () => {
    console.log('');
    console.log('>>> handleSubmit START');
    console.log('[CreateJobListing] User status:', { 
      hasUser: !!user, 
      userId: user?.id,
      email: user?.email
    });
    console.log('[CreateJobListing] Form values:', {
      title: title.trim(),
      company: company.trim(),
      location: location.trim(),
      applicationLink: applicationLink.trim(),
      description: description.trim(),
      category,
      salary: salary.trim()
    });
    
    // Check if user is authenticated before submitting
    if (!user) {
      console.log('[CreateJobListing] No user found - this should not happen as form should only show when authenticated');
      Alert.alert(
        'Session Error', 
        'Your session seems to have expired. Please try closing and reopening the app.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Validate inputs
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a job title');
      return;
    }
    
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a job description');
      return;
    }
    
    if (!company.trim()) {
      Alert.alert('Error', 'Please enter a company name');
      return;
    }
    
    if (!location.trim()) {
      Alert.alert('Error', 'Please enter a location');
      return;
    }
    
    if (!category) {
      Alert.alert('Error', 'Please select a job category');
      return;
    }
    
    if (!applicationLink.trim()) {
      Alert.alert('Error', 'Please provide an application link');
      return;
    }

    try {
      setIsSubmitting(true);
      
      console.log('[CreateJobListing] Submitting job listing for user:', user.id);
      
      // Insert the job listing into the jobs table
      const { data: newListing, error: listingError } = await supabase
        .from('jobs')
        .insert({
          user_id: user.id,
          title: title.trim(),
          company: company.trim(),
          location: location.trim(),
          job_type: category,
          salary: salary.trim() || null,
          description: description.trim(),
          application_link: applicationLink.trim(),
          image_url: imageUrl.trim() || null,
          is_featured: false,
          is_approved: true,
        })
        .select()
        .single();

      if (listingError) {
        console.error('[CreateJobListing] ❌ Database error:', listingError);
        throw listingError;
      }

      console.log('[CreateJobListing] ✅ SUCCESS! Job created:', newListing);
      
      // Navigate immediately
      console.log('[CreateJobListing] 🚀 Navigating to workplace...');
      router.replace('/workplace');
      
      // Reset form after navigation starts
      setIsSubmitting(false);
      
    } catch (error: any) {
      console.error('[CreateJobListing] Error creating job listing:', error);
      setIsSubmitting(false);
      
      // Provide user-friendly error messages
      let errorTitle = 'Submission Failed';
      let errorMessage = 'An unexpected error occurred. Please try again.';
      
      if (error.message?.includes('JWT') || error.message?.includes('auth')) {
        errorTitle = 'Session Expired';
        errorMessage = 'Your session has expired. Please restart the app and sign in again.';
      } else if (error.message?.includes('network')) {
        errorTitle = 'Network Error';
        errorMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
      } else if (error.message?.includes('permission') || error.message?.includes('denied')) {
        errorTitle = 'Permission Denied';
        errorMessage = 'You do not have permission to post job listings. Please contact support.';
      } else if (error.code === '23505') {
        errorTitle = 'Duplicate Entry';
        errorMessage = 'This job listing already exists. Please modify your entry.';
      } else if (error.message) {
        errorMessage = `Error: ${error.message}\n\nPlease check your entries and try again.`;
      }
      
      Alert.alert(errorTitle, errorMessage, [
        { text: 'OK' }
      ]);
    }
    console.log('>>> handleSubmit END');
    console.log('');
  };

  // Show loading only while fonts are loading
  if (!fontsLoaded) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4169E1" />
      </View>
    );
  }

  // Always show the form - authentication will be checked on submit
  console.log('[CreateJobListing] Rendering form, user:', user?.email || 'no user yet');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.title}>Submit Job Listing</Text>
        <TouchableOpacity 
          style={[
            styles.submitButton, 
            (title.trim() && description.trim() && company.trim() && location.trim() && applicationLink.trim() && category && !isSubmitting) && styles.submitButtonEnabled
          ]}
          onPress={async () => {
            console.log('==========================================');
            console.log('[CreateJobListing] 🔵 SUBMIT BUTTON CLICKED');
            console.log('[CreateJobListing] User:', { hasUser: !!user, userId: user?.id, email: user?.email });
            console.log('[CreateJobListing] Form:', { 
              title: !!title.trim(), 
              company: !!company.trim(), 
              location: !!location.trim(),
              applicationLink: !!applicationLink.trim(),
              description: !!description.trim(),
              category: !!category
            });
            
            // Check which fields are missing
            const missingFields = [];
            if (!title.trim()) missingFields.push('Job Title');
            if (!company.trim()) missingFields.push('Company');
            if (!location.trim()) missingFields.push('Location');
            if (!applicationLink.trim()) missingFields.push('Application Link');
            if (!description.trim()) missingFields.push('Description');
            if (!category) missingFields.push('Job Type');
            
            if (missingFields.length > 0) {
              console.log('[CreateJobListing] ❌ Missing:', missingFields);
              Alert.alert(
                'Missing Fields',
                `Please fill:\n\n• ${missingFields.join('\n• ')}`,
                [{ text: 'OK' }]
              );
              return;
            }
            
            console.log('[CreateJobListing] ✅ All fields filled, submitting...');
            await handleSubmit();
            console.log('[CreateJobListing] handleSubmit completed');
            console.log('==========================================');
          }}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Send size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.formContainer}>
        <View style={styles.infoCard}>
          <Briefcase size={24} color="#4169E1" />
          <Text style={styles.infoTitle}>Submit Job Opportunity</Text>
          <Text style={styles.infoText}>
            Fill in all required fields below. The submit button (top-right) will turn blue when ready.
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
          <Text style={styles.label}>Application Link</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter application URL (e.g., https://company.com/apply)"
            placeholderTextColor="#666666"
            value={applicationLink}
            onChangeText={setApplicationLink}
            keyboardType="url"
            autoCapitalize="none"
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
          <Text style={styles.label}>Salary/Stipend (Optional)</Text>
          <View style={styles.priceInputContainer}>
            <DollarSign size={20} color="#666666" />
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
          <Text style={styles.label}>Company Logo URL (Optional)</Text>
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
          <Text style={styles.infoContainerText}>
            Your submission will be reviewed by administrators before being published. This helps ensure all job listings are legitimate and valuable to our community.
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
    backgroundColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  submitButtonEnabled: {
    backgroundColor: '#4169E1',
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
  infoContainerText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
});