import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
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
  MessageSquare,
  Clock,
  CheckCircle,
  Upload,
  X,
  Paperclip,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
      <Text style={styles.sectionTitle}>Select Support Category</Text>
      <Text style={styles.sectionDescription}>
        Choose the category that best matches your request
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
            >
              <LinearGradient
                colors={isSelected ? category.gradient as any : ['#FFFFFF', '#FFFFFF']}
                style={styles.categoryIconContainer}
              >
                <IconComponent 
                  size={28} 
                  color={isSelected ? '#FFFFFF' : category.color} 
                />
              </LinearGradient>
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
                  <CheckCircle size={20} color={category.color} />
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
            <LinearGradient
              colors={(category?.gradient as any) || ['#4169E1', '#5B7FE8']}
              style={styles.submitGradient}
            >
              {(submitting || uploading) && (
                <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
              )}
              <Text style={styles.submitButtonText}>
                {uploading ? 'Uploading Files...' : submitting ? 'Submitting...' : 'Submit Request'}
              </Text>
            </LinearGradient>
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#4169E1', '#5B7FE8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
          >
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Alumni Support</Text>
            <Text style={styles.headerSubtitle}>We're here to help</Text>
          </View>
          <View style={styles.headerPlaceholder} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Banner */}
        <View style={styles.heroBanner}>
          <View style={styles.heroBannerIcon}>
            <Heart size={40} color="#4169E1" />
          </View>
          <Text style={styles.heroBannerTitle}>How can we help you today?</Text>
          <Text style={styles.heroBannerText}>
            Submit a support request and our team will assist you within 24-48 hours
          </Text>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <AlertCircle size={20} color="#4169E1" />
          <Text style={styles.infoText}>
            All requests are handled confidentially. Response time: 24-48 hours for normal requests, 2-4 hours for urgent matters.
          </Text>
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
    backgroundColor: '#F8F9FA',
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 4,
  },
  headerPlaceholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  heroBanner: {
    margin: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  heroBannerIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E4EAFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroBannerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroBannerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  infoCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: '#E4EAFF',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#4169E1',
    lineHeight: 18,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: (width - 44) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  categoryCardSelected: {
    borderColor: '#4169E1',
    backgroundColor: '#F8FAFF',
  },
  categoryIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 6,
  },
  categoryTitleSelected: {
    color: '#4169E1',
  },
  categoryDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
  categoryDescriptionSelected: {
    color: '#4169E1',
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  changeCategory: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4169E1',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: {
    height: 120,
    paddingTop: 16,
  },
  radioGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  radioOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  radioOptionSelected: {
    backgroundColor: '#E4EAFF',
    borderColor: '#4169E1',
  },
  radioText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  radioTextSelected: {
    color: '#4169E1',
    fontWeight: '600',
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  attachmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  attachmentHint: {
    fontSize: 12,
    color: '#999',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E4EAFF',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#4169E1',
    borderStyle: 'dashed',
  },
  uploadButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4169E1',
  },
  attachmentsList: {
    marginTop: 12,
    gap: 8,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 10,
    gap: 10,
  },
  attachmentIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#E4EAFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentInfo: {
    flex: 1,
  },
  attachmentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  attachmentSize: {
    fontSize: 12,
    color: '#666',
  },
  removeButton: {
    padding: 4,
  },
  ticketCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  ticketDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ticketDateText: {
    fontSize: 12,
    color: '#999',
  },
  ticketSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  ticketCategory: {
    fontSize: 13,
    color: '#666',
  },
});
