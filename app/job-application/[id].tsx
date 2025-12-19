import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, ActivityIndicator, Linking, Alert } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter, useLocalSearchParams } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, Briefcase, MapPin, Building2, Wallet, Clock, Mail, Phone, FileText, Upload, Send, User, Link as LinkIcon, Calendar, DollarSign } from 'lucide-react-native';
import { supabase, Job, JobApplication } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import * as DocumentPicker from 'expo-document-picker';

SplashScreen.preventAutoHideAsync();

export default function JobApplicationScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Application form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [expectedSalary, setExpectedSalary] = useState('');
  const [availabilityDate, setAvailabilityDate] = useState('');
  const [resumeUri, setResumeUri] = useState('');
  const [resumeName, setResumeName] = useState('');
  const [additionalDocs, setAdditionalDocs] = useState<{uri: string; name: string}[]>([]);
  
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
    if (id) {
      fetchJobDetails();
    }
    // Pre-fill user data if logged in
    if (user) {
      fetchUserProfile();
    }
  }, [id, user]);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setJob(data);
    } catch (error) {
      console.error('Error fetching job:', error);
      Alert.alert('Error', 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const { data, error} = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', user?.id)
        .single();

      if (data) {
        setFullName(data.full_name || '');
        setPhone(data.phone || '');
      }
      
      // Pre-fill email from user object
      if (user?.email) {
        setEmail(user.email);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setResumeUri(result.assets[0].uri);
        setResumeName(result.assets[0].name);
      }
    } catch (error) {
      console.error('Error picking resume:', error);
      Alert.alert('Error', 'Failed to pick resume file');
    }
  };

  const pickAdditionalDocs = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/*'],
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (!result.canceled && result.assets) {
        const newDocs = result.assets.map(asset => ({
          uri: asset.uri,
          name: asset.name,
        }));
        setAdditionalDocs([...additionalDocs, ...newDocs]);
      }
    } catch (error) {
      console.error('Error picking documents:', error);
      Alert.alert('Error', 'Failed to pick documents');
    }
  };

  const removeAdditionalDoc = (index: number) => {
    setAdditionalDocs(additionalDocs.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    // Validation
    if (!fullName.trim()) {
      Alert.alert('Required Field', 'Please enter your full name');
      return;
    }
    
    if (!email.trim()) {
      Alert.alert('Required Field', 'Please enter your email');
      return;
    }
    
    if (!phone.trim()) {
      Alert.alert('Required Field', 'Please enter your phone number');
      return;
    }

    if (!resumeUri) {
      Alert.alert('Required Field', 'Please upload your resume');
      return;
    }

    if (!user) {
      Alert.alert('Authentication Required', 'Please sign in to apply for jobs');
      debouncedRouter.replace('/auth/sign-in');
      return;
    }

    try {
      setSubmitting(true);

      // For now, we'll store document URIs directly
      // In production, you would upload to Supabase Storage first
      const documentUrls = additionalDocs.map(doc => doc.uri);

      // Check if user already applied
      const { data: existingApplication } = await supabase
        .from('job_applications')
        .select('id')
        .eq('job_id', id)
        .eq('applicant_id', user.id)
        .single();

      if (existingApplication) {
        Alert.alert('Already Applied', 'You have already applied for this job');
        return;
      }

      // Insert application
      const { data: newApplication, error: applicationError } = await supabase
        .from('job_applications')
        .insert({
          job_id: id,
          applicant_id: user.id,
          full_name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          cover_letter: coverLetter.trim() || null,
          resume_url: resumeUri,
          additional_documents: documentUrls.length > 0 ? documentUrls : null,
          portfolio_url: portfolioUrl.trim() || null,
          linkedin_url: linkedinUrl.trim() || null,
          years_of_experience: yearsOfExperience ? parseInt(yearsOfExperience) : null,
          expected_salary: expectedSalary.trim() || null,
          availability_date: availabilityDate.trim() || null,
          status: 'pending',
        })
        .select()
        .single();

      if (applicationError) throw applicationError;

      // Create notification for job poster
      if (job && newApplication) {
        await supabase
          .from('job_application_notifications')
          .insert({
            application_id: newApplication.id,
            recipient_id: job.user_id,
            notification_type: 'new_application',
            title: 'New Job Application',
            message: `${fullName} has applied for your job posting: ${job.title}`,
          });
      }

      console.log('✅ Application submitted successfully:', newApplication);
      
      Alert.alert(
        'Application Submitted!',
        'Your application has been submitted successfully. The employer will review it and get back to you.',
        [
          {
            text: 'OK',
            onPress: () => debouncedRouter.back(),
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
        <Text style={styles.loadingText}>Loading job details...</Text>
      </View>
    );
  }

  if (!job) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Job not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => debouncedRouter.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.headerBackButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Apply for Job</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Job Details Section */}
        <View style={styles.jobDetailsCard}>
          {job.image_url && (
            <Image 
              source={{ uri: typeof job.image_url === 'string' && job.image_url.startsWith('[') 
                ? JSON.parse(job.image_url)[0] 
                : job.image_url 
              }} 
              style={styles.companyLogo} 
            />
          )}
          
          <Text style={styles.jobTitle}>{job.title}</Text>
          
          <View style={styles.jobInfo}>
            <View style={styles.infoRow}>
              <Building2 size={16} color="#666666" />
              <Text style={styles.infoText}>{job.company}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <MapPin size={16} color="#666666" />
              <Text style={styles.infoText}>{job.location}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Briefcase size={16} color="#666666" />
              <Text style={styles.infoText}>{job.job_type}</Text>
            </View>
            
            {job.salary && (
              <View style={styles.infoRow}>
                <Wallet size={16} color="#666666" />
                <Text style={styles.salaryText}>{job.salary}</Text>
              </View>
            )}
          </View>

          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionTitle}>Job Description</Text>
            <Text style={styles.description}>{job.description}</Text>
            
            {job.requirements && (
              <>
                <Text style={[styles.descriptionTitle, { marginTop: 16 }]}>Requirements</Text>
                <Text style={styles.description}>{job.requirements}</Text>
              </>
            )}
          </View>
        </View>

        {/* Application Form Section */}
        <View style={styles.applicationSection}>
          <View style={styles.sectionHeader}>
            <FileText size={24} color="#ffc857" />
            <Text style={styles.sectionTitle}>Your Application</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <View style={styles.inputContainer}>
              <User size={20} color="#666666" />
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor="#999999"
                value={fullName}
                onChangeText={setFullName}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Email Address *</Text>
            <View style={styles.inputContainer}>
              <Mail size={20} color="#666666" />
              <TextInput
                style={styles.input}
                placeholder="your.email@example.com"
                placeholderTextColor="#999999"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Phone Number *</Text>
            <View style={styles.inputContainer}>
              <Phone size={20} color="#666666" />
              <TextInput
                style={styles.input}
                placeholder="+233 XX XXX XXXX"
                placeholderTextColor="#999999"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Cover Letter (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Write a brief cover letter explaining why you're interested in this position..."
              placeholderTextColor="#999999"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={coverLetter}
              onChangeText={setCoverLetter}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Upload Resume/CV *</Text>
            <TouchableOpacity style={styles.uploadButton} onPress={pickDocument}>
              <Upload size={24} color="#ffc857" />
              <Text style={styles.uploadButtonText}>
                {resumeName || 'Choose PDF or Word file'}
              </Text>
            </TouchableOpacity>
            {resumeName && (
              <View style={styles.fileInfo}>
                <FileText size={16} color="#10B981" />
                <Text style={styles.fileName}>{resumeName}</Text>
                <TouchableOpacity onPress={() => { setResumeUri(''); setResumeName(''); }}>
                  <Text style={styles.removeFile}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Additional Documents (Optional)</Text>
            <TouchableOpacity style={styles.uploadButton} onPress={pickAdditionalDocs}>
              <Upload size={24} color="#ffc857" />
              <Text style={styles.uploadButtonText}>
                Upload Certificates, Portfolio, etc.
              </Text>
            </TouchableOpacity>
            {additionalDocs.map((doc, index) => (
              <View key={index} style={styles.fileInfo}>
                <FileText size={16} color="#10B981" />
                <Text style={styles.fileName}>{doc.name}</Text>
                <TouchableOpacity onPress={() => removeAdditionalDoc(index)}>
                  <Text style={styles.removeFile}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Professional Details */}
          <View style={[styles.sectionHeader, { marginTop: 24 }]}>
            <Briefcase size={20} color="#ffc857" />
            <Text style={styles.sectionTitle}>Professional Details (Optional)</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Years of Experience</Text>
            <View style={styles.inputContainer}>
              <Briefcase size={20} color="#666666" />
              <TextInput
                style={styles.input}
                placeholder="e.g., 3"
                placeholderTextColor="#999999"
                keyboardType="numeric"
                value={yearsOfExperience}
                onChangeText={setYearsOfExperience}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Expected Salary</Text>
            <View style={styles.inputContainer}>
              <DollarSign size={20} color="#666666" />
              <TextInput
                style={styles.input}
                placeholder="e.g., GH₵3,000/month"
                placeholderTextColor="#999999"
                value={expectedSalary}
                onChangeText={setExpectedSalary}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Available to Start</Text>
            <View style={styles.inputContainer}>
              <Calendar size={20} color="#666666" />
              <TextInput
                style={styles.input}
                placeholder="e.g., Immediately, 2 weeks notice"
                placeholderTextColor="#999999"
                value={availabilityDate}
                onChangeText={setAvailabilityDate}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Portfolio URL</Text>
            <View style={styles.inputContainer}>
              <LinkIcon size={20} color="#666666" />
              <TextInput
                style={styles.input}
                placeholder="https://your-portfolio.com"
                placeholderTextColor="#999999"
                autoCapitalize="none"
                value={portfolioUrl}
                onChangeText={setPortfolioUrl}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>LinkedIn Profile</Text>
            <View style={styles.inputContainer}>
              <LinkIcon size={20} color="#666666" />
              <TextInput
                style={styles.input}
                placeholder="https://linkedin.com/in/yourprofile"
                placeholderTextColor="#999999"
                autoCapitalize="none"
                value={linkedinUrl}
                onChangeText={setLinkedinUrl}
              />
            </View>
          </View>

          <View style={styles.infoNote}>
            <Text style={styles.infoNoteText}>
              * Required fields. Your application will be saved and sent to the employer for review.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#ffc857" size="small" />
            ) : (
              <>
                <Send size={20} color="#ffc857" />
                <Text style={styles.submitButtonText}>Submit Application</Text>
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
    backgroundColor: '#F8F9FA',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginTop: 12,
  },
  errorText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
    marginBottom: 16,
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
  headerBackButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  content: {
    flex: 1,
  },
  jobDetailsCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 16,
  },
  companyLogo: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginBottom: 16,
    alignSelf: 'center',
  },
  jobTitle: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 16,
    textAlign: 'center',
  },
  jobInfo: {
    gap: 12,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  salaryText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
  },
  contactEmail: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#4169E1',
  },
  descriptionContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 16,
  },
  descriptionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    lineHeight: 22,
  },
  applicationSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  textArea: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000000',
    height: 120,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 2,
    borderColor: '#1E293B',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    gap: 12,
  },
  uploadButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#ffc857',
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  fileName: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#10B981',
  },
  removeFile: {
    fontSize: 18,
    color: '#EF4444',
    paddingHorizontal: 8,
  },
  infoNote: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoNoteText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#92400E',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#475569',
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffc857',
  },
  backButton: {
    backgroundColor: '#4169E1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});
