import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, ActivityIndicator, Linking } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Briefcase, MapPin, Building2, Wallet, Clock, Mail, Phone, FileText, Upload, Send, User } from 'lucide-react-native';
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
  
  // Application form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [cvFile, setCvFile] = useState<any>(null);
  
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
        .from('products_services')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        // Parse description: "Company | Location | Description | Email: email"
        const parts = (data.description || '').split(' | ');
        let company = parts[0] || '';
        let location = parts[1] || '';
        let description = parts.slice(2).join(' | ');
        
        // Extract email if present
        let contactEmail = '';
        const emailMatch = description.match(/Email:\s*(.+?)(?:\s*\||$)/);
        if (emailMatch) {
          contactEmail = emailMatch[1].trim();
          description = description.replace(/\s*\|\s*Email:.*$/, '').trim();
        }

        // Parse image URL
        let imageUrl = data.image_url;
        if (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith('[')) {
          try {
            const parsed = JSON.parse(imageUrl);
            imageUrl = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : imageUrl;
          } catch (e) {}
        }

        setJob({
          ...data,
          company,
          location,
          description,
          contactEmail,
          image_url: imageUrl,
        });
      }
    } catch (error) {
      console.error('Error fetching job details:', error);
      alert('Failed to load job details');
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
        setEmail(data.email || '');
        setPhone(data.phone || '');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const pickDocument = async () => {
    // For web/demo purposes, we'll use a text input for CV file path/URL
    const cvPath = prompt('Enter your CV file name or URL (e.g., "John_Doe_CV.pdf" or a URL):');
    if (cvPath && cvPath.trim()) {
      setCvFile({ name: cvPath.trim(), uri: cvPath.trim() });
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!fullName.trim()) {
      alert('Please enter your full name');
      return;
    }
    if (!email.trim()) {
      alert('Please enter your email address');
      return;
    }
    if (!phone.trim()) {
      alert('Please enter your phone number');
      return;
    }
    if (!coverLetter.trim()) {
      alert('Please write a cover letter');
      return;
    }
    if (!qualifications.trim()) {
      alert('Please describe your qualifications');
      return;
    }

    try {
      setSubmitting(true);

      // Compose email content
      const emailSubject = `Job Application: ${job?.title}`;
      const emailBody = `
Hello,

I am writing to apply for the ${job?.title} position at ${job?.company}.

APPLICANT INFORMATION:
Name: ${fullName}
Email: ${email}
Phone: ${phone}

COVER LETTER:
${coverLetter}

QUALIFICATIONS & EXPERIENCE:
${qualifications}

${cvFile ? `\nCV File: ${cvFile.name}` : ''}

Best regards,
${fullName}

---
Application submitted via Akora Workplace
      `.trim();

      const recipientEmail = job?.contactEmail || '';
      
      if (!recipientEmail) {
        alert('No contact email found for this job posting. Please contact the employer directly.');
        return;
      }

      // Open email app with pre-filled content
      const mailtoUrl = `mailto:${recipientEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
      
      try {
        const supported = await Linking.canOpenURL(mailtoUrl);
        
        if (supported) {
          await Linking.openURL(mailtoUrl);
          alert('✅ Application Ready!\n\nYour email app has been opened with all your information:\n• Full Name\n• Email & Phone\n• Cover Letter\n• Qualifications\n\nPlease review and send the email to complete your application.');
          router.back();
        } else {
          alert(`Please send your application to: ${recipientEmail}\n\nSubject: ${emailSubject}\n\nAll your information has been prepared:\n• Full Name: ${fullName}\n• Email: ${email}\n• Phone: ${phone}\n• Cover Letter & Qualifications included`);
        }
      } catch (error) {
        alert(`Please send your application to: ${recipientEmail}\n\nSubject: ${emailSubject}\n\nInclude your cover letter, qualifications, and CV.`);
      }
    } catch (error: any) {
      console.error('Error submitting application:', error);
      alert(`Error: ${error.message || 'Failed to submit application'}`);
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
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Apply for Job</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Job Details Section */}
        <View style={styles.jobDetailsCard}>
          {job.image_url && (
            <Image source={{ uri: job.image_url }} style={styles.companyLogo} />
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
              <Text style={styles.infoText}>{job.category_name}</Text>
            </View>
            
            {job.price && (
              <View style={styles.infoRow}>
                <Wallet size={16} color="#666666" />
                <Text style={styles.salaryText}>₵{job.price}/month</Text>
              </View>
            )}
            
            {job.contactEmail && (
              <View style={styles.infoRow}>
                <Mail size={16} color="#4169E1" />
                <Text style={styles.contactEmail}>{job.contactEmail}</Text>
              </View>
            )}
          </View>

          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionTitle}>Job Description</Text>
            <Text style={styles.description}>{job.description}</Text>
          </View>
        </View>

        {/* Application Form Section */}
        <View style={styles.applicationSection}>
          <View style={styles.sectionHeader}>
            <FileText size={24} color="#4169E1" />
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
            <Text style={styles.label}>Cover Letter *</Text>
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
            <Text style={styles.label}>Qualifications & Experience *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="List your relevant qualifications, education, and work experience..."
              placeholderTextColor="#999999"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={qualifications}
              onChangeText={setQualifications}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Upload CV (Optional)</Text>
            <TouchableOpacity style={styles.uploadButton} onPress={pickDocument}>
              <Upload size={24} color="#4169E1" />
              <Text style={styles.uploadButtonText}>
                {cvFile ? cvFile.name : 'Choose PDF or Word file'}
              </Text>
            </TouchableOpacity>
            {cvFile && (
              <View style={styles.fileInfo}>
                <FileText size={16} color="#10B981" />
                <Text style={styles.fileName}>{cvFile.name}</Text>
                <TouchableOpacity onPress={() => setCvFile(null)}>
                  <Text style={styles.removeFile}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.infoNote}>
            <Text style={styles.infoNoteText}>
              * Required fields. Your application will be sent to the employer via email.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Send size={20} color="#FFFFFF" />
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
    backgroundColor: '#EBF0FF',
    borderWidth: 2,
    borderColor: '#4169E1',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    gap: 12,
  },
  uploadButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
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
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
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
