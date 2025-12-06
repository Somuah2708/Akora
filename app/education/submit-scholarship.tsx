import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, Award, DollarSign, Calendar, FileText, Globe, Send, CheckCircle, Upload, X } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { pickMedia, uploadMedia } from '@/lib/media';

const SCHOLARSHIP_TYPES = [
  'Merit-based',
  'Need-based',
  'Sports',
  'Arts & Creative',
  'STEM',
  'Minority/Diversity',
  'Women in STEM',
  'Community Service',
  'Leadership',
  'International Students',
  'Other',
];

const ELIGIBILITY_LEVELS = [
  'High School',
  'Undergraduate',
  'Graduate',
  'PhD/Doctoral',
  'Postdoctoral',
  'All Levels',
];

const FIELDS_OF_STUDY = [
  'Engineering',
  'Medicine & Health',
  'Business & Management',
  'Computer Science & IT',
  'Arts & Humanities',
  'Social Sciences',
  'Natural Sciences',
  'Law',
  'Education',
  'Agriculture',
  'All Fields',
];

export default function SubmitScholarshipScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  // Basic Information
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sourceOrganization, setSourceOrganization] = useState('');
  
  // Funding Details
  const [fundingAmount, setFundingAmount] = useState('');
  const [fundingCurrency, setFundingCurrency] = useState('USD');
  
  // Deadline
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineText, setDeadlineText] = useState('');
  
  // Eligibility
  const [eligibilityCriteria, setEligibilityCriteria] = useState('');
  const [eligibilityLevel, setEligibilityLevel] = useState('');
  
  // Application Links
  const [applicationUrl, setApplicationUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  
  // Categories
  const [scholarshipType, setScholarshipType] = useState('');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  
  // Additional
  const [imageUrl, setImageUrl] = useState('');
  const [imageUri, setImageUri] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isRenewable, setIsRenewable] = useState(false);
  const [numberOfAwards, setNumberOfAwards] = useState('');

  const handlePickImage = async () => {
    const asset = await pickMedia();
    if (asset) {
      setImageUri(asset.uri);
      // Upload immediately
      setUploadingImage(true);
      const publicUrl = await uploadMedia(asset.uri, user!.id, 'image', asset.fileName, asset.mimeType);
      setUploadingImage(false);
      
      if (publicUrl) {
        setImageUrl(publicUrl);
      } else {
        setImageUri(''); // Clear on failed upload
      }
    }
  };

  const handleRemoveImage = () => {
    setImageUri('');
    setImageUrl('');
  };

  const toggleField = (field: string) => {
    if (selectedFields.includes(field)) {
      setSelectedFields(selectedFields.filter(f => f !== field));
    } else {
      setSelectedFields([...selectedFields, field]);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!title.trim()) {
      Alert.alert('Missing Information', 'Please enter a scholarship title');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Missing Information', 'Please enter a description');
      return;
    }
    if (!sourceOrganization.trim()) {
      Alert.alert('Missing Information', 'Please enter the organization offering this scholarship');
      return;
    }
    if (!applicationUrl.trim()) {
      Alert.alert('Missing Information', 'Please provide the application URL');
      return;
    }

    try {
      setSubmitting(true);

      const submissionData = {
        user_id: user!.id,
        submitted_by_name: profile?.full_name || 'Anonymous',
        submitted_by_email: user!.email || '',
        submitted_by_role: profile?.is_admin ? 'admin' : 'user',
        title: title.trim(),
        description: description.trim(),
        source_organization: sourceOrganization.trim(),
        funding_amount: fundingAmount.trim() || null,
        funding_currency: fundingCurrency,
        deadline_date: deadlineDate || null,
        deadline_text: deadlineText.trim() || null,
        eligibility_criteria: eligibilityCriteria.trim() || null,
        eligibility_level: eligibilityLevel || null,
        application_url: applicationUrl.trim(),
        website_url: websiteUrl.trim() || null,
        contact_email: contactEmail.trim() || null,
        scholarship_type: scholarshipType || null,
        fields_of_study: selectedFields.length > 0 ? selectedFields : null,
        image_url: imageUrl.trim() || null,
        is_renewable: isRenewable,
        number_of_awards: numberOfAwards ? parseInt(numberOfAwards) : null,
        status: 'pending', // Always pending for user submissions
      };

      const { data, error } = await supabase
        .from('scholarship_submissions')
        .insert(submissionData)
        .select()
        .single();

      if (error) throw error;

      Alert.alert(
        'Success! 🎉',
        'Your scholarship submission has been sent for admin review. Once approved, it will be visible to all users.',
        [
          {
            text: 'OK',
            onPress: () => debouncedRouter.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error submitting scholarship:', error);
      Alert.alert('Error', error.message || 'Failed to submit scholarship. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Submit Scholarship</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <Award size={20} color="#4169E1" />
            <Text style={styles.infoBannerText}>
              Help others by sharing scholarship opportunities! Your submission will be reviewed by our admin team.
            </Text>
          </View>

          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <Text style={styles.label}>Scholarship Title *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., MasterCard Foundation Scholars Program"
              placeholderTextColor="#999999"
            />

            <Text style={styles.label}>Organization/Provider *</Text>
            <TextInput
              style={styles.input}
              value={sourceOrganization}
              onChangeText={setSourceOrganization}
              placeholder="e.g., MasterCard Foundation"
              placeholderTextColor="#999999"
            />

            <Text style={styles.label}>Description *</Text>
            <Text style={styles.helpText}>Provide details about the scholarship</Text>
            <TextInput
              style={styles.textArea}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the scholarship, its benefits, requirements, and any other important details..."
              placeholderTextColor="#999999"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            <Text style={styles.label}>Scholarship Image (Optional)</Text>
            <Text style={styles.helpText}>Upload an image for the scholarship</Text>
            {imageUri ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                <TouchableOpacity style={styles.removeImageButton} onPress={handleRemoveImage}>
                  <X size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.uploadButton} 
                onPress={handlePickImage}
                disabled={uploadingImage}
              >
                {uploadingImage ? (
                  <ActivityIndicator size="small" color="#4169E1" />
                ) : (
                  <>
                    <Upload size={20} color="#4169E1" />
                    <Text style={styles.uploadButtonText}>Upload Image</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Funding Details */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <DollarSign size={18} color="#4169E1" />
              <Text style={styles.sectionTitle}>Funding Details</Text>
            </View>

            <Text style={styles.label}>Award Amount (Optional)</Text>
            <View style={styles.amountRow}>
              <TouchableOpacity
                style={[styles.currencyButton, fundingCurrency === 'USD' && styles.currencyButtonActive]}
                onPress={() => setFundingCurrency('USD')}
              >
                <Text style={[styles.currencyText, fundingCurrency === 'USD' && styles.currencyTextActive]}>USD $</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.currencyButton, fundingCurrency === 'GHS' && styles.currencyButtonActive]}
                onPress={() => setFundingCurrency('GHS')}
              >
                <Text style={[styles.currencyText, fundingCurrency === 'GHS' && styles.currencyTextActive]}>GHS ₵</Text>
              </TouchableOpacity>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={fundingAmount}
                onChangeText={setFundingAmount}
                placeholder="e.g., 10000"
                keyboardType="numeric"
                placeholderTextColor="#999999"
              />
            </View>

            <View style={styles.checkboxRow}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setIsRenewable(!isRenewable)}
              >
                {isRenewable && <CheckCircle size={20} color="#4169E1" />}
              </TouchableOpacity>
              <Text style={styles.checkboxLabel}>Renewable scholarship</Text>
            </View>

            <Text style={styles.label}>Number of Awards (Optional)</Text>
            <TextInput
              style={styles.input}
              value={numberOfAwards}
              onChangeText={setNumberOfAwards}
              placeholder="e.g., 50"
              keyboardType="numeric"
              placeholderTextColor="#999999"
            />
          </View>

          {/* Deadline */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Calendar size={18} color="#4169E1" />
              <Text style={styles.sectionTitle}>Application Deadline</Text>
            </View>

            <Text style={styles.label}>Deadline Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={deadlineDate}
              onChangeText={setDeadlineDate}
              placeholder="2025-12-31"
              placeholderTextColor="#999999"
            />

            <Text style={styles.label}>OR Deadline Description</Text>
            <TextInput
              style={styles.input}
              value={deadlineText}
              onChangeText={setDeadlineText}
              placeholder="e.g., Rolling admissions, Varies by country"
              placeholderTextColor="#999999"
            />
          </View>

          {/* Eligibility */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <FileText size={18} color="#4169E1" />
              <Text style={styles.sectionTitle}>Eligibility</Text>
            </View>

            <Text style={styles.label}>Eligibility Level</Text>
            <View style={styles.chipContainer}>
              {ELIGIBILITY_LEVELS.map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.chip,
                    eligibilityLevel === level && styles.chipSelected,
                  ]}
                  onPress={() => setEligibilityLevel(level)}
                >
                  <Text style={[
                    styles.chipText,
                    eligibilityLevel === level && styles.chipTextSelected,
                  ]}>
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Eligibility Criteria (Optional)</Text>
            <TextInput
              style={styles.textArea}
              value={eligibilityCriteria}
              onChangeText={setEligibilityCriteria}
              placeholder="Who can apply? Any specific requirements..."
              placeholderTextColor="#999999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Categories */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Categories</Text>

            <Text style={styles.label}>Scholarship Type</Text>
            <View style={styles.chipContainer}>
              {SCHOLARSHIP_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.chip,
                    scholarshipType === type && styles.chipSelected,
                  ]}
                  onPress={() => setScholarshipType(type)}
                >
                  <Text style={[
                    styles.chipText,
                    scholarshipType === type && styles.chipTextSelected,
                  ]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Fields of Study (Select all that apply)</Text>
            <View style={styles.chipContainer}>
              {FIELDS_OF_STUDY.map((field) => (
                <TouchableOpacity
                  key={field}
                  style={[
                    styles.chip,
                    selectedFields.includes(field) && styles.chipSelected,
                  ]}
                  onPress={() => toggleField(field)}
                >
                  <Text style={[
                    styles.chipText,
                    selectedFields.includes(field) && styles.chipTextSelected,
                  ]}>
                    {field}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Application Links */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Globe size={18} color="#4169E1" />
              <Text style={styles.sectionTitle}>Application Information</Text>
            </View>

            <Text style={styles.label}>Application URL *</Text>
            <TextInput
              style={styles.input}
              value={applicationUrl}
              onChangeText={setApplicationUrl}
              placeholder="https://..."
              placeholderTextColor="#999999"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Website URL (Optional)</Text>
            <TextInput
              style={styles.input}
              value={websiteUrl}
              onChangeText={setWebsiteUrl}
              placeholder="https://..."
              placeholderTextColor="#999999"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Contact Email (Optional)</Text>
            <TextInput
              style={styles.input}
              value={contactEmail}
              onChangeText={setContactEmail}
              placeholder="scholarships@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#999999"
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Send size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Submit for Review</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
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
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  infoBanner: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#EEF2FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#4169E1',
  },
  infoBannerText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#4169E1',
    lineHeight: 20,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
  },
  helpText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  textArea: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#000000',
    minHeight: 120,
  },
  amountRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  currencyButton: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  currencyButtonActive: {
    backgroundColor: '#4169E1',
    borderColor: '#4169E1',
  },
  currencyText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  currencyTextActive: {
    color: '#FFFFFF',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  chipSelected: {
    backgroundColor: '#4169E1',
    borderColor: '#4169E1',
  },
  chipText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 24,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#F0F4FF',
    borderWidth: 2,
    borderColor: '#4169E1',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  uploadButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
