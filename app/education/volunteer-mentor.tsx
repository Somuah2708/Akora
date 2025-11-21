import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Modal, FlatList } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft, User, Briefcase, GraduationCap, Heart, Calendar, FileText, Upload, CheckCircle, ChevronDown, X } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { EXPERTISE_OPTIONS, MEETING_FORMATS, DAYS_OPTIONS, INDUSTRY_OPTIONS } from '@/constants/mentorConstants';
import ProfilePhotoUpload from '@/components/ProfilePhotoUpload';
import * as DocumentPicker from 'expo-document-picker';

export default function VolunteerMentorScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);

  // Form fields
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('');
  const [currentTitle, setCurrentTitle] = useState('');
  const [company, setCompany] = useState('');
  const [industry, setIndustry] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [university, setUniversity] = useState('');
  const [position, setPosition] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  
  // University picker
  const [universities, setUniversities] = useState<any[]>([]);
  const [showUniversityPicker, setShowUniversityPicker] = useState(false);
  const [loadingUniversities, setLoadingUniversities] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [availableHours, setAvailableHours] = useState('');
  const [aboutMe, setAboutMe] = useState('');
  const [background, setBackground] = useState('');
  const [whyMentor, setWhyMentor] = useState('');
  const [whatOffer, setWhatOffer] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [verificationDocuments, setVerificationDocuments] = useState<string[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Multi-select fields
  const [selectedExpertise, setSelectedExpertise] = useState<string[]>([]);
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  const toggleSelection = (item: string, list: string[], setList: (list: string[]) => void) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  // Fetch universities on mount
  useEffect(() => {
    fetchUniversities();
  }, []);

  const fetchUniversities = async () => {
    try {
      setLoadingUniversities(true);
      const { data, error } = await supabase
        .from('universities')
        .select('id, title, location, country')
        .eq('is_approved', true)
        .order('title', { ascending: true });

      if (error) throw error;
      setUniversities(data || []);
    } catch (error) {
      console.error('Error fetching universities:', error);
    } finally {
      setLoadingUniversities(false);
    }
  };

  const selectUniversity = (uni: any) => {
    setUniversity(uni.title);
    setShowUniversityPicker(false);
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      
      // Check file size (max 5MB)
      if (file.size && file.size > 5 * 1024 * 1024) {
        Alert.alert('File Too Large', 'Please select a file smaller than 5MB');
        return;
      }

      await uploadDocument(file.uri, file.name);
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const uploadDocument = async (uri: string, fileName: string) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to upload documents');
      return;
    }

    try {
      setUploadingDoc(true);

      const fileExt = fileName.split('.').pop()?.toLowerCase() || 'pdf';
      const filePath = `${user.id}/verification/${Date.now()}.${fileExt}`;

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', {
        uri: uri,
        type: `application/${fileExt}`,
        name: fileName,
      } as any);

      // Upload to Supabase Storage
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const uploadResponse = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/mentor-verification/${filePath}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('mentor-verification')
        .getPublicUrl(filePath);

      setVerificationDocuments([...verificationDocuments, publicUrl]);
      Alert.alert('Success', 'Document uploaded successfully!');
    } catch (error: any) {
      console.error('Error uploading document:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload document');
    } finally {
      setUploadingDoc(false);
    }
  };

  const removeDocument = (url: string) => {
    setVerificationDocuments(verificationDocuments.filter(doc => doc !== url));
  };

  const handleSubmit = async () => {
    // Validation
    if (!fullName.trim() || !email.trim() || !currentTitle.trim()) {
      Alert.alert('Missing Info', 'Please fill in your name, email, and current title');
      return;
    }

    if (selectedExpertise.length === 0) {
      Alert.alert('Missing Info', 'Please select at least one area of expertise');
      return;
    }

    if (!aboutMe.trim() || !background.trim()) {
      Alert.alert('Missing Info', 'Please provide your About and Background information');
      return;
    }

    if (!whyMentor.trim() || !whatOffer.trim()) {
      Alert.alert('Missing Info', 'Please tell us why you want to mentor and what you can offer');
      return;
    }

    // Verification documents are required
    if (verificationDocuments.length === 0) {
      Alert.alert(
        'Verification Required',
        'Please upload at least one verification document (e.g., diploma, professional certificate, employee ID, LinkedIn profile screenshot) to verify your credentials.',
        [{ text: 'OK' }]
      );
      return;
    }

    await submitApplication();
  };

  const submitApplication = async () => {
    try {
      setLoading(true);

      const application = {
        user_id: user?.id,
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        current_title: currentTitle.trim(),
        company: company.trim() || null,
        industry: industry.trim() || null,
        years_of_experience: yearsExperience ? parseInt(yearsExperience) : null,
        university: university.trim() || null,
        position_at_university: position.trim() || null,
        expertise_areas: selectedExpertise,
        available_hours: availableHours.trim() || 'Flexible',
        meeting_formats: selectedFormats.length > 0 ? selectedFormats : ['Video Call'],
        preferred_days: selectedDays.length > 0 ? selectedDays : ['Flexible'],
        linkedin_url: linkedinUrl.trim() || null,
        whatsapp_number: whatsappNumber.trim() || null,
        profile_photo_url: profilePhotoUrl || null,
        short_bio: aboutMe.trim(),
        detailed_bio: background.trim(),
        why_mentor: whyMentor.trim(),
        what_offer: whatOffer.trim(),
        verification_documents: verificationDocuments,
        status: 'pending',
      };

      const { error } = await supabase
        .from('mentor_applications')
        .insert([application]);

      if (error) throw error;

      Alert.alert(
        'Application Submitted! 🎉',
        'Thank you for volunteering to be a mentor. Our admin team will review your application and get back to you soon.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error submitting application:', error);
      Alert.alert('Error', error.message || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Volunteer as Mentor</Text>
          <Text style={styles.subtitle}>Help shape the next generation 💚</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Heart size={20} color="#10B981" />
          <Text style={styles.infoText}>
            Thank you for offering free mentorship to the community! Fill out this form and our team will review your application.
          </Text>
        </View>

        {/* Personal Info Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <User size={18} color="#4169E1" />
            <Text style={styles.sectionTitle}>Personal Information</Text>
          </View>

          {/* Profile Photo Upload */}
          <View style={styles.photoUploadContainer}>
            <Text style={styles.label}>Profile Photo</Text>
            <Text style={styles.helpText}>Upload a professional photo (optional but recommended)</Text>
            <ProfilePhotoUpload
              currentPhotoUrl={profilePhotoUrl}
              onPhotoUploaded={setProfilePhotoUrl}
              bucket="mentor-profiles"
              size={100}
            />
          </View>

          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your full name"
            placeholderTextColor="#999999"
          />

          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="your.email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#999999"
          />

          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+233 XX XXX XXXX"
            keyboardType="phone-pad"
            placeholderTextColor="#999999"
          />
        </View>

        {/* Professional Info Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Briefcase size={18} color="#4169E1" />
            <Text style={styles.sectionTitle}>Professional Background</Text>
          </View>

          <Text style={styles.label}>Current Title *</Text>
          <TextInput
            style={styles.input}
            value={currentTitle}
            onChangeText={setCurrentTitle}
            placeholder="e.g., Senior Software Engineer"
            placeholderTextColor="#999999"
          />

          <Text style={styles.label}>Company / Organization</Text>
          <TextInput
            style={styles.input}
            value={company}
            onChangeText={setCompany}
            placeholder="e.g., Google, MTN, Self-Employed"
            placeholderTextColor="#999999"
          />

          <Text style={styles.label}>Industry</Text>
          <TextInput
            style={styles.input}
            value={industry}
            onChangeText={setIndustry}
            placeholder="e.g., Technology, Finance, Healthcare"
            placeholderTextColor="#999999"
          />

          <Text style={styles.label}>Years of Experience</Text>
          <TextInput
            style={styles.input}
            value={yearsExperience}
            onChangeText={setYearsExperience}
            placeholder="e.g., 5"
            keyboardType="number-pad"
            placeholderTextColor="#999999"
          />

          <Text style={styles.label}>LinkedIn Profile (Optional)</Text>
          <TextInput
            style={styles.input}
            value={linkedinUrl}
            onChangeText={setLinkedinUrl}
            placeholder="https://linkedin.com/in/yourprofile"
            autoCapitalize="none"
            placeholderTextColor="#999999"
          />

          <Text style={styles.label}>WhatsApp Number (Optional)</Text>
          <TextInput
            style={styles.input}
            value={whatsappNumber}
            onChangeText={setWhatsappNumber}
            placeholder="+233 XX XXX XXXX"
            keyboardType="phone-pad"
            placeholderTextColor="#999999"
          />
        </View>

        {/* Current Institution Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <GraduationCap size={18} color="#4169E1" />
            <Text style={styles.sectionTitle}>Current Institution</Text>
          </View>

          <Text style={styles.label}>University / Institution Where You Work (Optional)</Text>
          <Text style={styles.helpText}>Select the institution where you currently work or are affiliated with</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowUniversityPicker(true)}
          >
            <Text style={[styles.pickerButtonText, !university && styles.placeholderText]}>
              {university || 'Select a university from the list'}
            </Text>
            <ChevronDown size={20} color="#666666" />
          </TouchableOpacity>

          <Text style={styles.label}>Your Position at the University (Optional)</Text>
          <Text style={styles.helpText}>Your role or title at the institution</Text>
          <TextInput
            style={styles.input}
            value={position}
            onChangeText={setPosition}
            placeholder="e.g., Lecturer, Professor, Administrative Staff, etc."
            placeholderTextColor="#999999"
          />
        </View>

        {/* Mentorship Details Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Calendar size={18} color="#4169E1" />
            <Text style={styles.sectionTitle}>Mentorship Details</Text>
          </View>

          <Text style={styles.label}>Areas of Expertise * (Select all that apply)</Text>
          <View style={styles.chipContainer}>
            {EXPERTISE_OPTIONS.map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.chip,
                  selectedExpertise.includes(item) && styles.chipSelected,
                ]}
                onPress={() => toggleSelection(item, selectedExpertise, setSelectedExpertise)}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedExpertise.includes(item) && styles.chipTextSelected,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Available Hours Per Month</Text>
          <TextInput
            style={styles.input}
            value={availableHours}
            onChangeText={setAvailableHours}
            placeholder="e.g., 5-10 hours/month or Flexible"
            placeholderTextColor="#999999"
          />

          <Text style={styles.label}>Preferred Meeting Formats</Text>
          <View style={styles.chipContainer}>
            {MEETING_FORMATS.map((format) => (
              <TouchableOpacity
                key={format}
                style={[
                  styles.chip,
                  selectedFormats.includes(format) && styles.chipSelected,
                ]}
                onPress={() => toggleSelection(format, selectedFormats, setSelectedFormats)}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedFormats.includes(format) && styles.chipTextSelected,
                  ]}
                >
                  {format}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Preferred Days / Times</Text>
          <View style={styles.chipContainer}>
            {DAYS_OPTIONS.map((day) => (
              <TouchableOpacity
                key={day}
                style={[
                  styles.chip,
                  selectedDays.includes(day) && styles.chipSelected,
                ]}
                onPress={() => toggleSelection(day, selectedDays, setSelectedDays)}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedDays.includes(day) && styles.chipTextSelected,
                  ]}
                >
                  {day}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Verification Documents Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FileText size={18} color="#4169E1" />
            <Text style={styles.sectionTitle}>Verification Documents *</Text>
          </View>

          <View style={styles.verificationInfo}>
            <Text style={styles.verificationInfoText}>
              📄 To ensure the safety and quality of our mentorship program, please upload at least one document to verify your credentials:
            </Text>
            <Text style={styles.verificationBullet}>• Diploma or degree certificate</Text>
            <Text style={styles.verificationBullet}>• Professional certification</Text>
            <Text style={styles.verificationBullet}>• Employee ID or business card</Text>
            <Text style={styles.verificationBullet}>• LinkedIn profile screenshot</Text>
            <Text style={styles.verificationBullet}>• Letter of recommendation</Text>
          </View>

          <TouchableOpacity
            style={styles.uploadButton}
            onPress={pickDocument}
            disabled={uploadingDoc}
          >
            {uploadingDoc ? (
              <ActivityIndicator size="small" color="#4169E1" />
            ) : (
              <>
                <Upload size={20} color="#4169E1" />
                <Text style={styles.uploadButtonText}>Upload Document</Text>
              </>
            )}
          </TouchableOpacity>

          {verificationDocuments.length > 0 && (
            <View style={styles.documentsContainer}>
              {verificationDocuments.map((doc, index) => (
                <View key={index} style={styles.documentItem}>
                  <CheckCircle size={16} color="#10B981" />
                  <Text style={styles.documentName} numberOfLines={1}>
                    Document {index + 1}
                  </Text>
                  <TouchableOpacity onPress={() => removeDocument(doc)}>
                    <Text style={styles.removeDocText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <Text style={styles.helpText}>
            Accepted formats: PDF, DOC, DOCX, JPG, PNG (Max 5MB per file)
          </Text>
        </View>

        {/* About & Background Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <User size={18} color="#4169E1" />
            <Text style={styles.sectionTitle}>About You</Text>
          </View>

          <Text style={styles.label}>About *</Text>
          <Text style={styles.helpText}>
            Write a brief introduction about yourself (will be shown on your profile)
          </Text>
          <TextInput
            style={styles.textArea}
            value={aboutMe}
            onChangeText={setAboutMe}
            placeholder="Brief introduction about yourself, your passions, and interests..."
            placeholderTextColor="#999999"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={styles.characterCount}>{aboutMe.length}/500</Text>

          <Text style={styles.label}>Background *</Text>
          <Text style={styles.helpText}>
            Share your professional journey, achievements, and experience
          </Text>
          <TextInput
            style={styles.textArea}
            value={background}
            onChangeText={setBackground}
            placeholder="Your professional journey, key achievements, career path, and relevant experience..."
            placeholderTextColor="#999999"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={1000}
          />
          <Text style={styles.characterCount}>{background.length}/1000</Text>
        </View>

        {/* Motivation Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Heart size={18} color="#4169E1" />
            <Text style={styles.sectionTitle}>Mentorship Motivation</Text>
          </View>

          <Text style={styles.label}>Why do you want to be a mentor? *</Text>
          <Text style={styles.helpText}>
            Share your motivation for volunteering as a mentor
          </Text>
          <TextInput
            style={styles.textArea}
            value={whyMentor}
            onChangeText={setWhyMentor}
            placeholder="Share your motivation for volunteering as a mentor..."
            placeholderTextColor="#999999"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={1000}
          />
          <Text style={styles.characterCount}>{whyMentor.length}/1000</Text>

          <Text style={styles.label}>What can you offer to mentees? *</Text>
          <Text style={styles.helpText}>
            Describe the value you provide (guidance, connections, skills, etc.)
          </Text>
          <TextInput
            style={styles.textArea}
            value={whatOffer}
            onChangeText={setWhatOffer}
            placeholder="Describe what you can offer (expertise, industry insights, career advice, etc.)..."
            placeholderTextColor="#999999"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={1000}
          />
          <Text style={styles.characterCount}>{whatOffer.length}/1000</Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Submitting...' : 'Submit Application'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* University Picker Modal */}
      <Modal
        visible={showUniversityPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowUniversityPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select University</Text>
              <TouchableOpacity onPress={() => setShowUniversityPicker(false)}>
                <X size={24} color="#333333" />
              </TouchableOpacity>
            </View>

            {loadingUniversities ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color="#4169E1" />
                <Text style={styles.modalLoadingText}>Loading universities...</Text>
              </View>
            ) : (
              <FlatList
                data={universities}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.universityItem}
                    onPress={() => selectUniversity(item)}
                  >
                    <View style={styles.universityInfo}>
                      <Text style={styles.universityTitle}>{item.title}</Text>
                      <Text style={styles.universityLocation}>
                        {item.location}{item.country ? `, ${item.country}` : ''}
                      </Text>
                    </View>
                    {university === item.title && (
                      <CheckCircle size={20} color="#4169E1" />
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No universities available</Text>
                  </View>
                }
                contentContainerStyle={styles.modalList}
              />
            )}
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  subtitle: {
    fontSize: 13,
    color: '#666666',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#D1FAE5',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#065F46',
    lineHeight: 18,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
  },
  helpText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },
  photoUploadContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#000000',
  },
  textArea: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#000000',
    minHeight: 140,
    fontFamily: 'System',
    lineHeight: 22,
  },
  characterCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
  },
  verificationInfo: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  verificationInfoText: {
    fontSize: 13,
    color: '#1E40AF',
    marginBottom: 12,
    lineHeight: 20,
  },
  verificationBullet: {
    fontSize: 13,
    color: '#1E40AF',
    marginLeft: 8,
    marginBottom: 4,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#4169E1',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    marginBottom: 16,
  },
  uploadButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4169E1',
  },
  documentsContainer: {
    gap: 8,
    marginBottom: 12,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },
  documentName: {
    flex: 1,
    fontSize: 14,
    color: '#166534',
    fontWeight: '500',
  },
  removeDocText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '500',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  chipSelected: {
    backgroundColor: '#4169E1',
    borderColor: '#4169E1',
  },
  chipText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  submitButton: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  pickerButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  pickerButtonText: {
    fontSize: 15,
    color: '#1F2937',
    flex: 1,
  },
  placeholderText: {
    color: '#999999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalLoading: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  modalLoadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  modalList: {
    paddingHorizontal: 16,
  },
  universityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  universityInfo: {
    flex: 1,
    gap: 4,
  },
  universityTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  universityLocation: {
    fontSize: 13,
    color: '#6B7280',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
