import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft, User, Briefcase, GraduationCap, Heart, Calendar } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { EXPERTISE_OPTIONS, MEETING_FORMATS, DAYS_OPTIONS, INDUSTRY_OPTIONS } from '@/constants/mentorConstants';
import ProfilePhotoUpload from '@/components/ProfilePhotoUpload';
import RichTextEditor from '@/components/RichTextEditor';

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
  const [graduationYear, setGraduationYear] = useState('');
  const [degree, setDegree] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [availableHours, setAvailableHours] = useState('');
  const [whyMentor, setWhyMentor] = useState('');
  const [whatOffer, setWhatOffer] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');

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

  const handleSubmit = async () => {
    // Validation
    if (!fullName.trim() || !email.trim() || !currentTitle.trim()) {
      Alert.alert('Missing Info', 'Please fill in your name, email, and current title');
      return;
    }

    if (!graduationYear.trim() || !degree.trim()) {
      Alert.alert('Missing Info', 'Please provide your graduation year and degree');
      return;
    }

    if (selectedExpertise.length === 0) {
      Alert.alert('Missing Info', 'Please select at least one area of expertise');
      return;
    }

    if (!whyMentor.trim() || !whatOffer.trim()) {
      Alert.alert('Missing Info', 'Please tell us why you want to mentor and what you can offer');
      return;
    }

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
        graduation_year: parseInt(graduationYear),
        degree: degree.trim(),
        expertise_areas: selectedExpertise,
        available_hours: availableHours.trim() || 'Flexible',
        meeting_formats: selectedFormats.length > 0 ? selectedFormats : ['Video Call'],
        preferred_days: selectedDays.length > 0 ? selectedDays : ['Flexible'],
        linkedin_url: linkedinUrl.trim() || null,
        why_mentor: whyMentor.trim(),
        what_offer: whatOffer.trim(),
        profile_photo_url: profilePhotoUrl || null,
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
        </View>

        {/* Education Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <GraduationCap size={18} color="#4169E1" />
            <Text style={styles.sectionTitle}>Education (Alumni Info)</Text>
          </View>

          <Text style={styles.label}>Graduation Year *</Text>
          <TextInput
            style={styles.input}
            value={graduationYear}
            onChangeText={setGraduationYear}
            placeholder="e.g., 2015"
            keyboardType="number-pad"
            placeholderTextColor="#999999"
          />

          <Text style={styles.label}>Degree / Program *</Text>
          <TextInput
            style={styles.input}
            value={degree}
            onChangeText={setDegree}
            placeholder="e.g., BSc Computer Science"
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

        {/* Motivation Section */}
        <View style={styles.section}>
          <Text style={styles.label}>Why do you want to be a mentor? *</Text>
          <Text style={styles.helpText}>
            Share your motivation (use **bold**, _italic_, or [links](url) for formatting)
          </Text>
          <RichTextEditor
            value={whyMentor}
            onChangeText={setWhyMentor}
            placeholder="Share your motivation for volunteering as a mentor..."
            maxLength={1000}
            minHeight={120}
          />

          <Text style={styles.label}>What can you offer to mentees? *</Text>
          <Text style={styles.helpText}>
            Describe the value you provide (guidance, connections, skills, etc.)
          </Text>
          <RichTextEditor
            value={whatOffer}
            onChangeText={setWhatOffer}
            placeholder="Describe what you can offer (expertise, industry insights, career advice, etc.)..."
            maxLength={1000}
            minHeight={120}
          />
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
    minHeight: 100,
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
});
