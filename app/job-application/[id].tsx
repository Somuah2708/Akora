import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Briefcase, MapPin, Building2, Wallet, Mail, Phone, FileText, User, Upload, Send, Calendar, Link as LinkIcon, Globe } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

SplashScreen.preventAutoHideAsync();

export default function JobApplicationScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [cvUrl, setCvUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [availabilityDate, setAvailabilityDate] = useState('');
  const [salaryExpectation, setSalaryExpectation] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [noticePeriod, setNoticePeriod] = useState('');
  
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
      Alert.alert('Sign In Required', 'Please sign in to apply for jobs.', [
        { text: 'Cancel', onPress: () => router.back() },
        { text: 'Sign In', onPress: () => router.push('/auth/sign-in') },
      ]);
      return;
    }
    
    if (id) {
      fetchJobDetails();
      fetchUserProfile();
    }
  }, [id, user]);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products_services')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        // Parse fields (new or legacy format)
        const company = data.company_name || data.description?.split('|')[0]?.trim() || 'Company';
        const location = data.location || data.description?.split('|')[1]?.trim() || 'Location';
        
        // Parse image
        let imageUrl = data.company_logo;
        if (!imageUrl && data.image_url) {
          if (typeof data.image_url === 'string' && data.image_url.startsWith('[')) {
            try {
              const parsed = JSON.parse(data.image_url);
              imageUrl = parsed[0] || data.image_url;
            } catch (e) {
              imageUrl = data.image_url;
            }
          } else {
            imageUrl = data.image_url;
          }
        }

        setJob({
          ...data,
          company,
          location,
          image_url: imageUrl,
        });
      }
    } catch (error) {
      console.error('Error fetching job:', error);
      Alert.alert('Error', 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email, phone')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      if (data) {
        setFullName(data.full_name || '');
        setEmail(data.email || user?.email || '');
        setPhone(data.phone || '');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!fullName.trim()) {
      Alert.alert('Missing Information', 'Please enter your full name');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Missing Information', 'Please enter your email address');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Missing Information', 'Please enter your phone number');
      return;
    }
    if (!coverLetter.trim()) {
      Alert.alert('Missing Information', 'Please write a cover letter');
      return;
    }

    try {
      setSubmitting(true);

      // Check if already applied
      const { data: existing, error: checkError } = await supabase
        .from('job_applications')
        .select('id')
        .eq('job_id', id)
        .eq('applicant_id', user?.id)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existing) {
        Alert.alert('Already Applied', 'You have already applied for this job.');
        return;
      }

      // Insert application
      const { data: application, error: insertError } = await supabase
        .from('job_applications')
        .insert({
          job_id: id,
          applicant_id: user?.id,
          employer_id: job.user_id,
          full_name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          cover_letter: coverLetter.trim(),
          qualifications: qualifications.trim() || null,
          cv_url: cvUrl.trim() || null,
          portfolio_url: portfolioUrl.trim() || null,
          linkedin_url: linkedinUrl.trim() || null,
          website_url: websiteUrl.trim() || null,
          availability_date: availabilityDate || null,
          salary_expectation: salaryExpectation.trim() || null,
          years_of_experience: yearsExperience ? parseInt(yearsExperience) : null,
          notice_period: noticePeriod.trim() || null,
          status: 'pending',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Increment application count
      await supabase.rpc('increment_job_application_count', { job_id: id });

      Alert.alert(
        '✅ Application Submitted!',
        'Your application has been sent to the employer. You can track its status in "My Applications".',
        [
          {
            text: 'View My Applications',
            onPress: () => router.push('/my-applications' as any),
          },
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
      setSubmitting(false);
    }
  };

  if (!fontsLoaded || loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#4169E1" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!job) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Job not found</Text>
        <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
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
        <Text style={styles.headerTitle}>Apply for Job</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Job Card */}
        <View style={styles.jobCard}>
          {job.image_url && (
            <Image source={{ uri: job.image_url }} style={styles.logo} contentFit="contain" />
          )}
          <Text style={styles.jobTitle}>{job.title}</Text>
          <View style={styles.jobMeta}>
            <View style={styles.metaItem}>
              <Building2 size={14} color="#666666" />
              <Text style={styles.metaText}>{job.company}</Text>
            </View>
            <View style={styles.metaItem}>
              <MapPin size={14} color="#666666" />
              <Text style={styles.metaText}>{job.location}</Text>
            </View>
            {job.salary_max && (
              <View style={styles.metaItem}>
                <Wallet size={14} color="#10B981" />
                <Text style={styles.salaryText}>
                  {job.currency === 'GHS' ? '₵' : '$'}{job.salary_max}/mo
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Application Form */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <View style={styles.inputWithIcon}>
              <User size={20} color="#999999" />
              <TextInput
                style={styles.inputText}
                placeholder="John Doe"
                placeholderTextColor="#999999"
                value={fullName}
                onChangeText={setFullName}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Email *</Text>
            <View style={styles.inputWithIcon}>
              <Mail size={20} color="#999999" />
              <TextInput
                style={styles.inputText}
                placeholder="john@example.com"
                placeholderTextColor="#999999"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Phone *</Text>
            <View style={styles.inputWithIcon}>
              <Phone size={20} color="#999999" />
              <TextInput
                style={styles.inputText}
                placeholder="+233 XX XXX XXXX"
                placeholderTextColor="#999999"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>
          </View>
        </View>

        {/* Cover Letter */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Cover Letter *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Tell the employer why you're the perfect fit for this role..."
            placeholderTextColor="#999999"
            multiline
            numberOfLines={6}
            value={coverLetter}
            onChangeText={setCoverLetter}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{coverLetter.length} characters</Text>
        </View>

        {/* Qualifications */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Qualifications & Experience</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="List your relevant qualifications, skills, and experience..."
            placeholderTextColor="#999999"
            multiline
            numberOfLines={6}
            value={qualifications}
            onChangeText={setQualifications}
            textAlignVertical="top"
          />
        </View>

        {/* Additional Details */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Additional Information</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>CV/Resume URL</Text>
            <View style={styles.inputWithIcon}>
              <FileText size={20} color="#999999" />
              <TextInput
                style={styles.inputText}
                placeholder="https://drive.google.com/..."
                placeholderTextColor="#999999"
                autoCapitalize="none"
                value={cvUrl}
                onChangeText={setCvUrl}
              />
            </View>
            <Text style={styles.helpText}>Upload your CV to Google Drive or Dropbox and paste the link</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Portfolio URL</Text>
            <View style={styles.inputWithIcon}>
              <LinkIcon size={20} color="#999999" />
              <TextInput
                style={styles.inputText}
                placeholder="https://portfolio.com"
                placeholderTextColor="#999999"
                autoCapitalize="none"
                value={portfolioUrl}
                onChangeText={setPortfolioUrl}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>LinkedIn Profile</Text>
            <View style={styles.inputWithIcon}>
              <LinkIcon size={20} color="#999999" />
              <TextInput
                style={styles.inputText}
                placeholder="https://linkedin.com/in/..."
                placeholderTextColor="#999999"
                autoCapitalize="none"
                value={linkedinUrl}
                onChangeText={setLinkedinUrl}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Years of Experience</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 3"
              placeholderTextColor="#999999"
              keyboardType="numeric"
              value={yearsExperience}
              onChangeText={setYearsExperience}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Availability Date</Text>
            <View style={styles.inputWithIcon}>
              <Calendar size={20} color="#999999" />
              <TextInput
                style={styles.inputText}
                placeholder="YYYY-MM-DD (e.g. 2025-01-15)"
                placeholderTextColor="#999999"
                value={availabilityDate}
                onChangeText={setAvailabilityDate}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Salary Expectation</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. GHS 3000 - 5000"
              placeholderTextColor="#999999"
              value={salaryExpectation}
              onChangeText={setSalaryExpectation}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Notice Period</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 2 weeks, 1 month, Immediate"
              placeholderTextColor="#999999"
              value={noticePeriod}
              onChangeText={setNoticePeriod}
            />
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Send size={20} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Submit Application</Text>
            </>
          )}
        </TouchableOpacity>

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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
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
  content: {
    flex: 1,
    padding: 20,
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginBottom: 16,
  },
  jobTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 12,
  },
  jobMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  salaryText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
  },
  formSection: {
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
    height: 140,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#999999',
    textAlign: 'right',
    marginTop: 4,
  },
  helpText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#999999',
    marginTop: 4,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4169E1',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 12,
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  submitButtonText: {
    fontSize: 17,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  errorText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
    marginBottom: 20,
  },
  errorButton: {
    backgroundColor: '#4169E1',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  errorButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});
