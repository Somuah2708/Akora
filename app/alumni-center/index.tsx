import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import {
  ArrowLeft,
  FileText,
  HelpCircle,
  DollarSign,
  Award,
  Briefcase,
  Heart,
  UserCheck,
  GraduationCap,
  Users,
  AlertCircle,
  Clock,
  CheckCircle,
  Upload,
  X,
  Paperclip,
  Headphones,
} from 'lucide-react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

const { width } = Dimensions.get('window');

type SupportCategory = {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  gradient: string[];
};

export default function AlumniCenterScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    urgency: 'normal',
    contactPreference: 'email',
  });
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [recentTickets, setRecentTickets] = useState<any[]>([]);

  useEffect(() => {
    loadRecentTickets();
  }, [user]);

  const loadRecentTickets = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (!error && data) {
        setRecentTickets(data);
      }
    } catch (error) {
      console.error('[Alumni Support] Error loading tickets:', error);
    }
  };

  const supportCategories: SupportCategory[] = [
    {
      id: 'academic',
      title: 'Academic Support',
      description: 'Transcript requests, verification letters, academic records',
      icon: GraduationCap,
      color: '#4169E1',
      gradient: ['#4169E1', '#5B7FE8'],
    },
    {
      id: 'financial',
      title: 'Financial Assistance',
      description: 'Scholarships, emergency funds, financial aid inquiries',
      icon: DollarSign,
      color: '#10B981',
      gradient: ['#10B981', '#34D399'],
    },
    {
      id: 'career',
      title: 'Career Services',
      description: 'Job placement, mentorship, professional development',
      icon: Briefcase,
      color: '#F59E0B',
      gradient: ['#F59E0B', '#FBBF24'],
    },
    {
      id: 'wellness',
      title: 'Health & Wellness',
      description: 'Mental health support, counseling, wellness programs',
      icon: Heart,
      color: '#EF4444',
      gradient: ['#EF4444', '#F87171'],
    },
    {
      id: 'legal',
      title: 'Legal Assistance',
      description: 'Legal advice, document notarization, legal referrals',
      icon: FileText,
      color: '#8B5CF6',
      gradient: ['#8B5CF6', '#A78BFA'],
    },
    {
      id: 'membership',
      title: 'Membership Issues',
      description: 'Account access, membership benefits, profile updates',
      icon: UserCheck,
      color: '#06B6D4',
      gradient: ['#06B6D4', '#22D3EE'],
    },
    {
      id: 'networking',
      title: 'Networking Support',
      description: 'Connect with alumni, chapter information, events',
      icon: Users,
      color: '#EC4899',
      gradient: ['#EC4899', '#F472B6'],
    },
    {
      id: 'general',
      title: 'General Inquiry',
      description: 'Other questions or concerns not listed above',
      icon: HelpCircle,
      color: '#6B7280',
      gradient: ['#6B7280', '#9CA3AF'],
    },
  ];

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      
      // Check file size (max 10MB)
      if (file.size && file.size > 10 * 1024 * 1024) {
        Alert.alert('File Too Large', 'Please select a file smaller than 10MB');
        return;
      }

      // Add to attachments list
      setAttachments([...attachments, {
        name: file.name,
        uri: file.uri,
        type: file.mimeType || 'application/octet-stream',
        size: file.size,
      }]);

    } catch (error) {
      console.error('[Document Picker] Error:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handleRemoveAttachment = (index: number) => {
    const newAttachments = attachments.filter((_, i) => i !== index);
    setAttachments(newAttachments);
  };

  const uploadAttachments = async (ticketId: string) => {
    if (attachments.length === 0) return [];

    const uploadedFiles = [];

    for (const file of attachments) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user?.id}/${ticketId}/${Date.now()}.${fileExt}`;

        // Read file as base64
        const base64 = await FileSystem.readAsStringAsync(file.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Convert base64 to blob for upload
        const { data, error } = await supabase.storage
          .from('support-attachments')
          .upload(fileName, decode(base64), {
            contentType: file.type,
            upsert: false,
          });

        if (error) throw error;

        uploadedFiles.push({
          file_name: file.name,
          file_path: data.path,
          file_type: file.type,
          file_size: file.size,
          uploaded_at: new Date().toISOString(),
        });
      } catch (error) {
        console.error('[Upload] Error uploading file:', file.name, error);
      }
    }

    return uploadedFiles;
  };

  // Helper function to decode base64
  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const handleSubmitSupport = async () => {
    if (!selectedCategory) {
      Alert.alert('Category Required', 'Please select a support category');
      return;
    }

    if (!formData.subject.trim()) {
      Alert.alert('Subject Required', 'Please enter a subject for your request');
      return;
    }

    if (!formData.description.trim()) {
      Alert.alert('Description Required', 'Please describe your issue or request');
      return;
    }

    setSubmitting(true);

    try {
      const category = supportCategories.find(c => c.id === selectedCategory);
      
      // First create the ticket
      const { data: ticketData, error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user?.id,
          category: selectedCategory,
          category_title: category?.title,
          subject: formData.subject,
          description: formData.description,
          urgency: formData.urgency,
          contact_preference: formData.contactPreference,
          status: 'open',
          attachments: [],
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Upload attachments if any
      let uploadedFiles: any[] = [];
      if (attachments.length > 0) {
        setUploading(true);
        uploadedFiles = await uploadAttachments(ticketData.id);
        
        // Update ticket with attachment info
        if (uploadedFiles.length > 0) {
          await supabase
            .from('support_tickets')
            .update({ attachments: uploadedFiles })
            .eq('id', ticketData.id);
        }
        setUploading(false);
      }

      Alert.alert(
        '✅ Support Request Submitted',
        `Your request has been submitted successfully${uploadedFiles.length > 0 ? ` with ${uploadedFiles.length} attachment(s)` : ''}. Our team will review it and get back to you within 24-48 hours.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setSelectedCategory(null);
              setFormData({
                subject: '',
                description: '',
                urgency: 'normal',
                contactPreference: 'email',
              });
              setAttachments([]);
              loadRecentTickets();
            },
          },
        ]
      );
    } catch (error) {
      console.error('[Alumni Support] Error submitting:', error);
      Alert.alert('Error', 'Failed to submit support request. Please try again.');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const renderCategorySelection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Support Categories</Text>
      <Text style={styles.sectionDescription}>
        Select the category that best describes your request
      </Text>
      <View style={styles.categoriesGrid}>
        {supportCategories.map((category) => {
          const IconComponent = category.icon;
          const isSelected = selectedCategory === category.id;
          
          return (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryCard,
                isSelected && styles.categoryCardSelected,
              ]}
              onPress={() => setSelectedCategory(category.id)}
              activeOpacity={0.8}
            >
              <View style={[
                styles.categoryIconContainer,
                isSelected && { backgroundColor: '#f5f5f5' },
              ]}>
                <IconComponent 
                  size={28} 
                  color="#1a1a1a"
                  strokeWidth={2}
                />
              </View>
              <Text style={[
                styles.categoryTitle,
                isSelected && styles.categoryTitleSelected,
              ]}>
                {category.title}
              </Text>
              <Text style={[
                styles.categoryDescription,
                isSelected && styles.categoryDescriptionSelected,
              ]}>
                {category.description}
              </Text>
              {isSelected && (
                <View style={styles.selectedBadge}>
                  <CheckCircle size={20} color="#1a1a1a" strokeWidth={2.5} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderSupportForm = () => {
    if (!selectedCategory) return null;

    const category = supportCategories.find(c => c.id === selectedCategory);

    return (
      <View style={styles.section}>
        <View style={styles.formHeader}>
          <Text style={styles.formTitle}>Submit {category?.title} Request</Text>
          <TouchableOpacity onPress={() => setSelectedCategory(null)}>
            <Text style={styles.changeCategory}>Change Category</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Subject *</Text>
            <TextInput
              style={styles.input}
              placeholder="Brief summary of your request"
              value={formData.subject}
              onChangeText={(text) => setFormData({ ...formData, subject: text })}
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Provide detailed information about your request"
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Urgency Level</Text>
            <View style={styles.radioGroup}>
              {['low', 'normal', 'high', 'urgent'].map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.radioOption,
                    formData.urgency === level && styles.radioOptionSelected,
                  ]}
                  onPress={() => setFormData({ ...formData, urgency: level })}
                >
                  <Text style={[
                    styles.radioText,
                    formData.urgency === level && styles.radioTextSelected,
                  ]}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Preferred Contact Method</Text>
            <View style={styles.radioGroup}>
              {['email', 'phone', 'both'].map((method) => (
                <TouchableOpacity
                  key={method}
                  style={[
                    styles.radioOption,
                    formData.contactPreference === method && styles.radioOptionSelected,
                  ]}
                  onPress={() => setFormData({ ...formData, contactPreference: method })}
                >
                  <Text style={[
                    styles.radioText,
                    formData.contactPreference === method && styles.radioTextSelected,
                  ]}>
                    {method.charAt(0).toUpperCase() + method.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Attachments Section */}
          <View style={styles.inputGroup}>
            <View style={styles.attachmentHeader}>
              <Text style={styles.label}>Attachments (Optional)</Text>
              <Text style={styles.attachmentHint}>Max 10MB per file</Text>
            </View>
            
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={handlePickDocument}
              disabled={uploading}
            >
              <Upload size={20} color="#4169E1" />
              <Text style={styles.uploadButtonText}>Upload Document</Text>
            </TouchableOpacity>

            {attachments.length > 0 && (
              <View style={styles.attachmentsList}>
                {attachments.map((file, index) => (
                  <View key={index} style={styles.attachmentItem}>
                    <View style={styles.attachmentIcon}>
                      <Paperclip size={16} color="#4169E1" />
                    </View>
                    <View style={styles.attachmentInfo}>
                      <Text style={styles.attachmentName} numberOfLines={1}>
                        {file.name}
                      </Text>
                      <Text style={styles.attachmentSize}>
                        {(file.size / 1024).toFixed(0)} KB
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemoveAttachment(index)}
                      style={styles.removeButton}
                    >
                      <X size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, (submitting || uploading) && styles.submitButtonDisabled]}
            onPress={handleSubmitSupport}
            disabled={submitting || uploading}
          >
            {(submitting || uploading) && (
              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
            )}
            <Text style={styles.submitButtonText}>
              {uploading ? 'Uploading Files...' : submitting ? 'Submitting...' : 'Submit Request'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderRecentTickets = () => {
    if (recentTickets.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Requests</Text>
        {recentTickets.map((ticket) => (
          <View key={ticket.id} style={styles.ticketCard}>
            <View style={styles.ticketHeader}>
              <View style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(ticket.status) + '20' },
              ]}>
                <Text style={[
                  styles.statusText,
                  { color: getStatusColor(ticket.status) },
                ]}>
                  {ticket.status.toUpperCase()}
                </Text>
              </View>
              <View style={styles.ticketDate}>
                <Clock size={14} color="#999" />
                <Text style={styles.ticketDateText}>
                  {new Date(ticket.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
            <Text style={styles.ticketSubject}>{ticket.subject}</Text>
            <Text style={styles.ticketCategory}>{ticket.category_title}</Text>
          </View>
        ))}
      </View>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#F59E0B';
      case 'in_progress': return '#3B82F6';
      case 'resolved': return '#10B981';
      case 'closed': return '#6B7280';
      default: return '#6B7280';
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Premium Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
          <View style={styles.backButtonCircle}>
            <ArrowLeft size={20} color="#1a1a1a" strokeWidth={2.5} />
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Headphones size={40} color="#1a1a1a" strokeWidth={2} />
            </View>
          </View>
          <Text style={styles.heroTitle}>Alumni Support Center</Text>
          <Text style={styles.heroSubtitle}>
            Professional assistance for all your needs
          </Text>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoIconCircle}>
            <AlertCircle size={18} color="#1a1a1a" strokeWidth={2} />
          </View>
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>Response Time</Text>
            <Text style={styles.infoText}>
              24-48 hours for standard requests • 2-4 hours for urgent matters
            </Text>
          </View>
        </View>

        {renderRecentTickets()}
        {renderCategorySelection()}
        {renderSupportForm()}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fafafa',
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backButtonCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  content: {
    flex: 1,
  },
  heroSection: {
    paddingHorizontal: 20,
    paddingVertical: 32,
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 20,
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  heroTitle: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#1a1a1a',
    marginBottom: 8,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  infoCard: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 32,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  infoIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    lineHeight: 20,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: '#1a1a1a',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  sectionDescription: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 20,
    lineHeight: 22,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  categoryCard: {
    width: (width - 56) / 2,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#f0f0f0',
    position: 'relative',
  },
  categoryCardSelected: {
    borderColor: '#1a1a1a',
    backgroundColor: '#fafafa',
  },
  categoryIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  categoryTitleSelected: {
    color: '#1a1a1a',
  },
  categoryDescription: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    textAlign: 'center',
    lineHeight: 18,
  },
  categoryDescriptionSelected: {
    color: '#666666',
  },
  selectedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1a1a1a',
    letterSpacing: -0.3,
  },
  changeCategory: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1a1a1a',
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#1a1a1a',
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  input: {
    backgroundColor: '#fafafa',
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  textArea: {
    height: 140,
    paddingTop: 16,
  },
  radioGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  radioOption: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#fafafa',
    borderWidth: 1.5,
    borderColor: '#f0f0f0',
  },
  radioOptionSelected: {
    backgroundColor: '#1a1a1a',
    borderColor: '#1a1a1a',
  },
  radioText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
  },
  radioTextSelected: {
    color: '#ffffff',
  },
  submitButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    letterSpacing: -0.2,
  },
  attachmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  attachmentHint: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#999999',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#fafafa',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#1a1a1a',
    borderStyle: 'dashed',
  },
  uploadButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#1a1a1a',
  },
  attachmentsList: {
    marginTop: 14,
    gap: 10,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    padding: 14,
    borderRadius: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  attachmentIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentInfo: {
    flex: 1,
  },
  attachmentName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  attachmentSize: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  removeButton: {
    padding: 6,
  },
  ticketCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.5,
  },
  ticketDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ticketDateText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  ticketSubject: {
    fontSize: 17,
    fontFamily: 'Inter-Bold',
    color: '#1a1a1a',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  ticketCategory: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
});
