import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Image as ImageIcon, DollarSign, Info, Briefcase, Mail, Trash2, Upload, Save } from 'lucide-react-native';
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

export default function EditJobListingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [salary, setSalary] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [email, setEmail] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [useUrlInput, setUseUrlInput] = useState(false);
  const [category, setCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  
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
    if (authLoading) return;
    if (!user) {
      alert('Authentication Required. Please sign in.');
      router.replace('/auth/sign-in');
      return;
    }
    if (id) {
      fetchJobListing();
    }
  }, [user, authLoading, id]);

  const fetchJobListing = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products_services')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        // Check if user owns this listing
        if (data.user_id !== user?.id) {
          alert('You can only edit your own job listings');
          router.back();
          return;
        }

        setTitle(data.title || '');
        setCategory(data.category_name || '');
        
        // Parse description: "Company | Location | Description | Email: email@example.com"
        const descParts = (data.description || '').split(' | ');
        setCompany(descParts[0] || '');
        setLocation(descParts[1] || '');
        
        // Check if email is in description
        let desc = descParts.slice(2).join(' | ');
        const emailMatch = desc.match(/Email:\s*(.+?)(?:\s*\||$)/);
        if (emailMatch) {
          setEmail(emailMatch[1].trim());
          desc = desc.replace(/\s*\|\s*Email:.*$/, '').trim();
        }
        setDescription(desc);
        
        // Parse salary with currency
        if (data.price) {
          setSalary(data.price.toString());
          // You could enhance this to detect currency from description if needed
          setCurrency('USD');
        }

        // Handle image URL
        if (data.image_url) {
          try {
            const parsed = JSON.parse(data.image_url);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setImageUrl(parsed[0]);
            } else {
              setImageUrl(data.image_url);
            }
          } catch {
            setImageUrl(data.image_url);
          }
          setUseUrlInput(true);
        }
      }
    } catch (error: any) {
      console.error('Error fetching job listing:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setUploadedImage(result.assets[0].uri);
      setImageUrl('');
    }
  };

  const handleSave = async () => {
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
      
      const finalImageUrl = uploadedImage || imageUrl.trim() || null;
      const formattedSalary = salary.trim() ? `${currency} ${salary}` : null;
      
      let fullDescription = `${company.trim()} | ${location.trim()} | ${description.trim()}`;
      if (email.trim()) {
        fullDescription += ` | Email: ${email.trim()}`;
      }
      
      const { error } = await supabase
        .from('products_services')
        .update({
          title: title.trim(),
          description: fullDescription,
          price: salary.trim() ? Number(salary) : null,
          image_url: finalImageUrl,
          category_name: category,
        })
        .eq('id', id);

      if (error) throw error;

      alert('✅ Job listing updated successfully!');
      router.push('/workplace');
    } catch (error: any) {
      console.error('Error updating job listing:', error);
      alert(`Error: ${error.message || 'Failed to update job listing'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = confirm('Are you sure you want to delete this job listing? This action cannot be undone.');
    
    if (confirmed) {
      try {
        setIsSubmitting(true);
        
        const { error } = await supabase
          .from('products_services')
          .delete()
          .eq('id', id);

        if (error) throw error;

        alert('Job listing deleted successfully');
        router.push('/workplace');
      } catch (error: any) {
        console.error('Error deleting job listing:', error);
        alert(`Error: ${error.message || 'Failed to delete job listing'}`);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  if (!fontsLoaded || loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#4169E1" />
        <Text style={styles.loadingText}>Loading job listing...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Job Listing</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.formContainer}>
        <View style={styles.infoCard}>
          <Briefcase size={24} color="#4169E1" />
          <Text style={styles.infoTitle}>Edit Job Opportunity</Text>
          <Text style={styles.infoText}>
            Update your job listing details. Changes will be visible immediately.
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
                {uploadedImage ? 'Change Image' : 'Upload from Gallery'}
              </Text>
            </TouchableOpacity>
          ) : (
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
          )}

          {(uploadedImage || imageUrl.trim() !== '') && (
            <View style={styles.imagePreviewContainer}>
              <Text style={styles.imagePreviewLabel}>Preview:</Text>
              <Image 
                source={{ uri: uploadedImage || imageUrl }} 
                style={styles.imagePreview}
                onError={() => alert('Invalid Image URL')}
              />
            </View>
          )}
        </View>
        
        <View style={styles.infoContainer}>
          <Info size={20} color="#666666" />
          <Text style={styles.infoText}>
            Your changes will be saved immediately and visible to all users in the Workplace section.
          </Text>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={handleDelete}
            disabled={isSubmitting}
          >
            <Trash2 size={20} color="#EF4444" />
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.saveButton,
              (!title.trim() || !description.trim() || !company.trim() || !location.trim() || !category || isSubmitting) && styles.saveButtonDisabled
            ]}
            onPress={handleSave}
            disabled={!title.trim() || !description.trim() || !company.trim() || !location.trim() || !category || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Save size={20} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Save Changes</Text>
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
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
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});
