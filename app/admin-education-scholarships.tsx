import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Search, Edit, Trash2, Award, DollarSign, Calendar, Globe, ExternalLink, Upload, X, FileText, CheckCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
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

interface Scholarship {
  id: string;
  name: string;
  title?: string;
  description: string;
  price: string;
  image_url: string | null;
  category_name: string;
  is_approved: boolean;
  created_at: string;
  // Basic scholarship fields
  amount?: string;
  deadline?: string;
  eligibility?: string;
  // Additional details
  application_url?: string;
  requirements?: string;
  benefits?: string;
  source_organization?: string;
  // Array fields
  scholarship_types?: string[];
  eligibility_levels?: string[];
  fields_of_study?: string[];
  // Funding
  funding_currency?: string;
  // Contact
  contact_email?: string;
  website_url?: string;
  // Other
  is_renewable?: boolean;
  number_of_awards?: number;
}

interface ScholarshipSubmission {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  submitted_by_name: string;
  submitted_by_email: string;
  submitted_by_role: string;
  title: string;
  description: string;
  funding_amount: string | null;
  funding_currency: string;
  deadline_date: string | null;
  deadline_text: string | null;
  eligibility_criteria: string | null;
  eligibility_level: string | null;
  application_url: string | null;
  contact_email: string | null;
  website_url: string | null;
  image_url: string | null;
  scholarship_type: string | null;
  fields_of_study: string[] | null;
  status: 'pending' | 'approved' | 'rejected' | 'draft';
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  rejection_reason: string | null;
  source_organization: string | null;
  is_renewable: boolean;
  number_of_awards: number | null;
}

type TabType = 'published' | 'submissions';

export default function AdminEducationScholarshipsScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('submissions');
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [submissions, setSubmissions] = useState<ScholarshipSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingScholarship, setEditingScholarship] = useState<Scholarship | null>(null);
  const [creatingScholarship, setCreatingScholarship] = useState(false);
  const [viewingSubmission, setViewingSubmission] = useState<ScholarshipSubmission | null>(null);

  // Form states - matching submit scholarship screen
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sourceOrganization, setSourceOrganization] = useState('');
  const [fundingAmount, setFundingAmount] = useState('');
  const [fundingCurrency, setFundingCurrency] = useState('USD');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineText, setDeadlineText] = useState('');
  const [eligibilityCriteria, setEligibilityCriteria] = useState('');
  const [eligibilityLevel, setEligibilityLevel] = useState('');
  const [applicationUrl, setApplicationUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [scholarshipType, setScholarshipType] = useState('');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [imageUri, setImageUri] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isRenewable, setIsRenewable] = useState(false);
  const [numberOfAwards, setNumberOfAwards] = useState('');
  
  // Additional scholarship fields
  const [requirements, setRequirements] = useState('');
  const [benefits, setBenefits] = useState('');
  
  // Chip selection arrays
  const [selectedScholarshipTypes, setSelectedScholarshipTypes] = useState<string[]>([]);
  const [selectedEligibilityLevels, setSelectedEligibilityLevels] = useState<string[]>([]);
  const [selectedFieldsOfStudy, setSelectedFieldsOfStudy] = useState<string[]>([]);

  // Check admin access
  useEffect(() => {
    if (profile === null) {
      return;
    }
    
    if (!profile?.is_admin) {
      Alert.alert('Access Denied', 'You do not have permission to access this page.');
      router.back();
    }
  }, [profile, router]);

  useEffect(() => {
    fetchScholarships();
    fetchSubmissions();
  }, []);

  const toggleField = (field: string) => {
    if (selectedFields.includes(field)) {
      setSelectedFields(selectedFields.filter(f => f !== field));
    } else {
      setSelectedFields([...selectedFields, field]);
    }
  };

  const toggleScholarshipType = (type: string) => {
    if (selectedScholarshipTypes.includes(type)) {
      setSelectedScholarshipTypes(selectedScholarshipTypes.filter(t => t !== type));
    } else {
      setSelectedScholarshipTypes([...selectedScholarshipTypes, type]);
    }
  };

  const toggleEligibilityLevel = (level: string) => {
    if (selectedEligibilityLevels.includes(level)) {
      setSelectedEligibilityLevels(selectedEligibilityLevels.filter(l => l !== level));
    } else {
      setSelectedEligibilityLevels([...selectedEligibilityLevels, level]);
    }
  };

  const toggleFieldOfStudy = (field: string) => {
    if (selectedFieldsOfStudy.includes(field)) {
      setSelectedFieldsOfStudy(selectedFieldsOfStudy.filter(f => f !== field));
    } else {
      setSelectedFieldsOfStudy([...selectedFieldsOfStudy, field]);
    }
  };

  const handlePickImage = async () => {
    if (!profile?.id) return;
    
    const asset = await pickMedia();
    if (asset) {
      setImageUri(asset.uri);
      setUploadingImage(true);
      const publicUrl = await uploadMedia(asset.uri, profile.id, 'image', asset.fileName, asset.mimeType);
      setUploadingImage(false);
      
      if (publicUrl) {
        setImageUrl(publicUrl);
      } else {
        setImageUri('');
      }
    }
  };

  const handleRemoveImage = () => {
    setImageUri('');
    setImageUrl('');
  };

  const fetchScholarships = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('scholarships')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setScholarships(data || []);
    } catch (error) {
      console.error('Error fetching scholarships:', error);
      Alert.alert('Error', 'Failed to load scholarships.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('scholarship_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
      console.log('📋 Loaded', data?.length, 'scholarship submissions');
    } catch (error) {
      console.error('Error fetching submissions:', error);
      Alert.alert('Error', 'Failed to load scholarship submissions.');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchScholarships(), fetchSubmissions()]);
    setRefreshing(false);
  };

  const openCreateModal = () => {
    resetForm();
    setCreatingScholarship(true);
  };

  const openEditModal = (scholarship: Scholarship) => {
    setTitle(scholarship.name || scholarship.title || '');
    setDescription(scholarship.description || '');
    setSourceOrganization(scholarship.source_organization || '');
    setFundingAmount(scholarship.amount || scholarship.price || '');
    setFundingCurrency(scholarship.funding_currency || 'USD');
    setDeadlineDate(scholarship.deadline || '');
    setWebsiteUrl(scholarship.website_url || '');
    setApplicationUrl(scholarship.application_url || '');
    setEligibilityCriteria(scholarship.eligibility || '');
    setRequirements(scholarship.requirements || '');
    setBenefits(scholarship.benefits || '');
    setContactEmail(scholarship.contact_email || '');
    setSelectedScholarshipTypes(scholarship.scholarship_types || []);
    setSelectedEligibilityLevels(scholarship.eligibility_levels || []);
    setSelectedFieldsOfStudy(scholarship.fields_of_study || []);
    setIsRenewable(scholarship.is_renewable || false);
    setNumberOfAwards(scholarship.number_of_awards?.toString() || '');
    setImageUrl(scholarship.image_url || '');
    if (scholarship.image_url) {
      setImageUri(scholarship.image_url);
    }
    setEditingScholarship(scholarship);
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSourceOrganization('');
    setFundingAmount('');
    setFundingCurrency('USD');
    setDeadlineDate('');
    setDeadlineText('');
    setEligibilityCriteria('');
    setEligibilityLevel('');
    setApplicationUrl('');
    setWebsiteUrl('');
    setContactEmail('');
    setScholarshipType('');
    setSelectedFields([]);
    setRequirements('');
    setBenefits('');
    setSelectedScholarshipTypes([]);
    setSelectedEligibilityLevels([]);
    setSelectedFieldsOfStudy([]);
    setImageUrl('');
    setImageUri('');
    setIsRenewable(false);
    setNumberOfAwards('');
    setEditingScholarship(null);
    setCreatingScholarship(false);
  };

  const handleSaveScholarship = async () => {
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Scholarship title is required.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Validation Error', 'Description is required.');
      return;
    }

    try {
      const scholarshipData = {
        user_id: editingScholarship?.user_id || profile!.id, // Use existing user_id or current admin
        title: title.trim(), // Required field
        name: title.trim(), // For backward compatibility
        description: description.trim(),
        price: fundingAmount.trim() || '0',
        amount: fundingAmount.trim() || null,
        deadline: deadlineDate.trim() || deadlineText.trim() || null,
        deadline_date: deadlineDate.trim() || null,
        deadline_text: deadlineText.trim() || null,
        website_url: websiteUrl.trim() || null,
        application_url: applicationUrl.trim() || null,
        eligibility: eligibilityCriteria.trim() || null,
        eligibility_criteria: eligibilityCriteria.trim() || null,
        requirements: requirements.trim() || null,
        benefits: benefits.trim() || null,
        source_organization: sourceOrganization.trim() || null,
        scholarship_types: selectedScholarshipTypes.length > 0 ? selectedScholarshipTypes : null,
        eligibility_levels: selectedEligibilityLevels.length > 0 ? selectedEligibilityLevels : null,
        fields_of_study: selectedFieldsOfStudy.length > 0 ? selectedFieldsOfStudy : null,
        funding_currency: fundingCurrency,
        contact_email: contactEmail.trim() || null,
        is_renewable: isRenewable,
        number_of_awards: numberOfAwards ? parseInt(numberOfAwards) : null,
        image_url: imageUrl.trim() || null,
        is_approved: true,
      };

      if (editingScholarship) {
        // Update existing scholarship
        const { error } = await supabase
          .from('scholarships')
          .update(scholarshipData)
          .eq('id', editingScholarship.id);

        if (error) throw error;
        Alert.alert('Success', 'Scholarship updated successfully!');
      } else {
        // Create new scholarship
        const { error } = await supabase
          .from('scholarships')
          .insert([scholarshipData]);

        if (error) throw error;
        Alert.alert('Success', 'Scholarship created successfully!');
      }

      resetForm();
      fetchScholarships();
    } catch (error: any) {
      console.error('Error saving scholarship:', error);
      Alert.alert('Error', error.message || 'Failed to save scholarship.');
    }
  };

  const handleApproveSubmission = async (submissionId: string) => {
    try {
      const submission = submissions.find(s => s.id === submissionId);
      if (!submission) return;

      // Create scholarship in scholarships table
      const scholarshipData = {
        user_id: submission.user_id, // Required field
        title: submission.title, // Required field
        name: submission.title, // For backward compatibility
        description: submission.description,
        price: submission.funding_amount || '0',
        amount: submission.funding_amount || null,
        deadline: submission.deadline_date || submission.deadline_text || null,
        deadline_date: submission.deadline_date || null,
        deadline_text: submission.deadline_text || null,
        website_url: submission.website_url || null,
        application_url: submission.application_url || null,
        eligibility: submission.eligibility_criteria || null,
        eligibility_criteria: submission.eligibility_criteria || null,
        requirements: submission.requirements || null,
        benefits: submission.benefits || null,
        source_organization: submission.source_organization || null,
        scholarship_types: submission.scholarship_types || null,
        eligibility_levels: submission.eligibility_levels || null,
        fields_of_study: submission.fields_of_study || null,
        funding_currency: submission.funding_currency || 'USD',
        contact_email: submission.contact_email || null,
        image_url: submission.image_url || null,
        is_approved: true,
      };

      const { error: insertError } = await supabase
        .from('scholarships')
        .insert([scholarshipData]);

      if (insertError) throw insertError;

      // Update submission status
      const { error: updateError } = await supabase
        .from('scholarship_submissions')
        .update({
          status: 'approved',
          reviewed_by: profile!.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', submissionId);

      if (updateError) throw updateError;

      Alert.alert('Success', 'Scholarship approved and published!');
      setViewingSubmission(null);
      fetchScholarships();
      fetchSubmissions();
    } catch (error: any) {
      console.error('Error approving submission:', error);
      Alert.alert('Error', error.message || 'Failed to approve scholarship.');
    }
  };

  const handleRejectSubmission = async (submissionId: string) => {
    Alert.alert(
      'Reject Scholarship',
      'Are you sure you want to reject this submission?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('scholarship_submissions')
                .update({
                  status: 'rejected',
                  reviewed_by: profile!.id,
                  reviewed_at: new Date().toISOString(),
                })
                .eq('id', submissionId);

              if (error) throw error;

              Alert.alert('Success', 'Scholarship submission rejected.');
              setViewingSubmission(null);
              fetchSubmissions();
            } catch (error: any) {
              console.error('Error rejecting submission:', error);
              Alert.alert('Error', error.message || 'Failed to reject scholarship.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteScholarship = (scholarship: Scholarship) => {
    Alert.alert(
      'Delete Scholarship',
      `Are you sure you want to delete "${scholarship.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('scholarships')
                .delete()
                .eq('id', scholarship.id);

              if (error) throw error;
              Alert.alert('Success', 'Scholarship deleted successfully!');
              fetchScholarships();
            } catch (error: any) {
              console.error('Error deleting scholarship:', error);
              Alert.alert('Error', error.message || 'Failed to delete scholarship.');
            }
          },
        },
      ]
    );
  };

  const filteredScholarships = scholarships.filter((scholarship) =>
    (scholarship.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (scholarship.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Manage Scholarships</Text>
          <Text style={styles.headerSubtitle}>
            {activeTab === 'published' ? `${scholarships.length} published` : `${submissions.filter(s => s.status === 'pending').length} pending`}
          </Text>
        </View>
        <TouchableOpacity onPress={openCreateModal} style={styles.addButton}>
          <Plus size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'submissions' && styles.activeTab]}
          onPress={() => setActiveTab('submissions')}
        >
          <Text style={[styles.tabText, activeTab === 'submissions' && styles.activeTabText]}>
            Submissions ({submissions.filter(s => s.status === 'pending').length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'published' && styles.activeTab]}
          onPress={() => setActiveTab('published')}
        >
          <Text style={[styles.tabText, activeTab === 'published' && styles.activeTabText]}>
            Published ({scholarships.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#64748B" />
        <TextInput
          style={styles.searchInput}
          placeholder={activeTab === 'published' ? 'Search scholarships...' : 'Search submissions...'}
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4169E1" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : activeTab === 'submissions' ? (
          /* Submissions Tab */
          submissions.filter(s => 
            s.status === 'pending' &&
            (s.title || '').toLowerCase().includes(searchQuery.toLowerCase())
          ).length === 0 ? (
            <View style={styles.emptyContainer}>
              <Award size={64} color="#CBD5E1" />
              <Text style={styles.emptyText}>No pending submissions</Text>
              <Text style={styles.emptySubtext}>All submissions have been reviewed</Text>
            </View>
          ) : (
            submissions
              .filter(s => 
                s.status === 'pending' &&
                (s.title || '').toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((submission) => (
                <TouchableOpacity
                  key={submission.id}
                  style={styles.submissionCard}
                  onPress={() => setViewingSubmission(submission)}
                >
                  {submission.image_url && submission.image_url.trim() && (submission.image_url.startsWith('http://') || submission.image_url.startsWith('https://')) && (
                    <Image source={{ uri: submission.image_url }} style={styles.scholarshipImage} />
                  )}
                  <View style={styles.scholarshipContent}>
                    <View style={styles.submissionHeader}>
                      <Text style={styles.scholarshipName}>{submission.title}</Text>
                      <View style={styles.statusBadge}>
                        <Text style={styles.statusBadgeText}>PENDING</Text>
                      </View>
                    </View>
                    <Text style={styles.submitterInfo}>
                      Submitted by {submission.submitted_by_name} • {new Date(submission.created_at).toLocaleDateString()}
                    </Text>
                    {submission.description && (
                      <Text style={styles.scholarshipDescription} numberOfLines={2}>
                        {submission.description}
                      </Text>
                    )}
                    {submission.funding_amount && (
                      <Text style={styles.fundingAmount}>
                        {submission.funding_currency === 'GHS' ? '₵' : '$'}{submission.funding_amount}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))
          )
        ) : (
          /* Published Scholarships Tab */
          filteredScholarships.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Award size={64} color="#CBD5E1" />
              <Text style={styles.emptyText}>
                {searchQuery ? 'No scholarships found' : 'No scholarships yet'}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchQuery ? 'Try a different search term' : 'Create your first scholarship'}
              </Text>
            </View>
          ) : (
            filteredScholarships.map((scholarship) => (
            <View key={scholarship.id} style={styles.scholarshipCard}>
              {scholarship.image_url && scholarship.image_url.trim() && (scholarship.image_url.startsWith('http://') || scholarship.image_url.startsWith('https://')) && (
                <Image
                  source={{ uri: scholarship.image_url }}
                  style={styles.scholarshipImage}
                />
              )}
              <View style={styles.scholarshipContent}>
                <Text style={styles.scholarshipName}>{scholarship.name}</Text>
                {scholarship.description && (
                  <Text style={styles.scholarshipDescription} numberOfLines={2}>
                    {scholarship.description}
                  </Text>
                )}
                
                <View style={styles.scholarshipMeta}>
                  {scholarship.amount && (
                    <View style={styles.metaItem}>
                      <DollarSign size={14} color="#10B981" />
                      <Text style={styles.metaText}>
                        {(scholarship.funding_currency === 'GHS' || scholarship.funding_currency === 'ghc') ? '₵' : '$'}
                        {scholarship.amount}
                      </Text>
                    </View>
                  )}
                  {scholarship.deadline && (
                    <View style={styles.metaItem}>
                      <Calendar size={14} color="#F59E0B" />
                      <Text style={styles.metaText}>{scholarship.deadline}</Text>
                    </View>
                  )}
                  {scholarship.website_url && (
                    <View style={styles.metaItem}>
                      <Globe size={14} color="#4169E1" />
                      <Text style={styles.metaText}>Website</Text>
                    </View>
                  )}
                </View>

                <View style={styles.scholarshipActions}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => openEditModal(scholarship)}
                  >
                    <Edit size={16} color="#4169E1" />
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteScholarship(scholarship)}
                  >
                    <Trash2 size={16} color="#EF4444" />
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal
        visible={creatingScholarship || !!editingScholarship}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingScholarship ? 'Edit Scholarship' : 'Create Scholarship'}
              </Text>
              <TouchableOpacity onPress={resetForm}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Basic Information */}
              <Text style={styles.sectionTitle}>Basic Information</Text>
              
              <Text style={styles.formLabel}>Scholarship Title *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g., MasterCard Foundation Scholars Program"
                value={title}
                onChangeText={setTitle}
                placeholderTextColor="#999999"
              />

              <Text style={styles.formLabel}>Organization/Provider</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g., MasterCard Foundation"
                value={sourceOrganization}
                onChangeText={setSourceOrganization}
                placeholderTextColor="#999999"
              />

              <Text style={styles.formLabel}>Description *</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                placeholder="Describe the scholarship, requirements, and benefits..."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                placeholderTextColor="#999999"
              />

              {/* Image Upload */}
              <Text style={styles.formLabel}>Scholarship Image</Text>
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

              {/* Funding Details */}
              <Text style={styles.sectionTitle}>Funding Details</Text>
              
              <Text style={styles.formLabel}>Award Amount</Text>
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
                  style={[styles.formInput, { flex: 1, marginTop: 0 }]}
                  placeholder="10000"
                  value={fundingAmount}
                  onChangeText={setFundingAmount}
                  keyboardType="numeric"
                  placeholderTextColor="#999999"
                />
              </View>

              {/* Deadline */}
              <Text style={styles.sectionTitle}>Application Deadline</Text>
              
              <Text style={styles.formLabel}>Deadline Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="2025-12-31"
                value={deadlineDate}
                onChangeText={setDeadlineDate}
                placeholderTextColor="#999999"
              />

              <Text style={styles.formLabel}>OR Deadline Description</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g., Rolling admissions"
                value={deadlineText}
                onChangeText={setDeadlineText}
                placeholderTextColor="#999999"
              />

              {/* Eligibility */}
              <Text style={styles.sectionTitle}>Eligibility</Text>
              
              <Text style={styles.formLabel}>Eligibility Criteria</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                placeholder="Who can apply? Any specific requirements..."
                value={eligibilityCriteria}
                onChangeText={setEligibilityCriteria}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                placeholderTextColor="#999999"
              />

              {/* Categories */}
              <Text style={styles.sectionTitle}>Categories</Text>
              
              <Text style={styles.formLabel}>Scholarship Types (Select all that apply)</Text>
              <View style={styles.chipContainer}>
                {SCHOLARSHIP_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.chip, selectedScholarshipTypes.includes(type) && styles.chipSelected]}
                    onPress={() => toggleScholarshipType(type)}
                  >
                    <Text style={[styles.chipText, selectedScholarshipTypes.includes(type) && styles.chipTextSelected]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.formLabel}>Eligibility Levels (Select all that apply)</Text>
              <View style={styles.chipContainer}>
                {ELIGIBILITY_LEVELS.map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[styles.chip, selectedEligibilityLevels.includes(level) && styles.chipSelected]}
                    onPress={() => toggleEligibilityLevel(level)}
                  >
                    <Text style={[styles.chipText, selectedEligibilityLevels.includes(level) && styles.chipTextSelected]}>
                      {level}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.formLabel}>Fields of Study (Select all that apply)</Text>
              <View style={styles.chipContainer}>
                {FIELDS_OF_STUDY.map((field) => (
                  <TouchableOpacity
                    key={field}
                    style={[styles.chip, selectedFieldsOfStudy.includes(field) && styles.chipSelected]}
                    onPress={() => toggleFieldOfStudy(field)}
                  >
                    <Text style={[styles.chipText, selectedFieldsOfStudy.includes(field) && styles.chipTextSelected]}>
                      {field}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Application Links */}
              <Text style={styles.sectionTitle}>Application Information</Text>
              
              <Text style={styles.formLabel}>Application URL</Text>
              <TextInput
                style={styles.formInput}
                placeholder="https://..."
                value={applicationUrl}
                onChangeText={setApplicationUrl}
                autoCapitalize="none"
                placeholderTextColor="#999999"
              />

              <Text style={styles.formLabel}>Website URL</Text>
              <TextInput
                style={styles.formInput}
                placeholder="https://..."
                value={websiteUrl}
                onChangeText={setWebsiteUrl}
                autoCapitalize="none"
                placeholderTextColor="#999999"
              />

              <Text style={styles.formLabel}>Contact Email</Text>
              <TextInput
                style={styles.formInput}
                placeholder="scholarships@example.com"
                value={contactEmail}
                onChangeText={setContactEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#999999"
              />

              {/* Action Buttons */}
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveScholarship}
              >
                <Text style={styles.saveButtonText}>
                  {editingScholarship ? 'Update Scholarship' : 'Create Scholarship'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={resetForm}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Submission Review Modal */}
      <Modal
        visible={!!viewingSubmission}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Review Submission</Text>
              <TouchableOpacity onPress={() => setViewingSubmission(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {viewingSubmission && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Submission Info */}
                <View style={styles.submissionInfoSection}>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>{(viewingSubmission.status || 'PENDING').toUpperCase()}</Text>
                  </View>
                  <Text style={styles.submitterLabel}>Submitted by:</Text>
                  <Text style={styles.submitterName}>{viewingSubmission.submitter_name}</Text>
                  <Text style={styles.submitterEmail}>{viewingSubmission.submitter_email}</Text>
                  <Text style={styles.submissionDate}>
                    {new Date(viewingSubmission.created_at).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </Text>
                </View>

                {/* Scholarship Image */}
                {viewingSubmission.image_url && (
                  <View style={styles.imageSection}>
                    <Image source={{ uri: viewingSubmission.image_url }} style={styles.submissionImage} />
                  </View>
                )}

                {/* Basic Information */}
                <Text style={styles.sectionTitle}>Basic Information</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Scholarship Title</Text>
                  <Text style={styles.infoValue}>{viewingSubmission.title}</Text>
                </View>
                {viewingSubmission.source_organization && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Organization</Text>
                    <Text style={styles.infoValue}>{viewingSubmission.source_organization}</Text>
                  </View>
                )}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Description</Text>
                  <Text style={styles.infoValue}>{viewingSubmission.description}</Text>
                </View>

                {/* Scholarship Details */}
                <Text style={styles.sectionTitle}>Scholarship Details</Text>
                {viewingSubmission.scholarship_types && viewingSubmission.scholarship_types.length > 0 && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Types</Text>
                    <View style={styles.chipContainer}>
                      {viewingSubmission.scholarship_types.map((type) => (
                        <View key={type} style={styles.chip}>
                          <Text style={styles.chipText}>{type}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                {viewingSubmission.eligibility_levels && viewingSubmission.eligibility_levels.length > 0 && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Eligibility Levels</Text>
                    <View style={styles.chipContainer}>
                      {viewingSubmission.eligibility_levels.map((level) => (
                        <View key={level} style={styles.chip}>
                          <Text style={styles.chipText}>{level}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                {viewingSubmission.fields_of_study && viewingSubmission.fields_of_study.length > 0 && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Fields of Study</Text>
                    <View style={styles.chipContainer}>
                      {viewingSubmission.fields_of_study.map((field) => (
                        <View key={field} style={styles.chip}>
                          <Text style={styles.chipText}>{field}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Funding */}
                {viewingSubmission.funding_amount && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Funding Amount</Text>
                    <Text style={styles.infoValue}>
                      {viewingSubmission.funding_currency === 'GHS' ? '₵' : '$'}{viewingSubmission.funding_amount}
                    </Text>
                  </View>
                )}

                {/* Deadlines */}
                {viewingSubmission.deadline_text && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Deadline</Text>
                    <Text style={styles.infoValue}>{viewingSubmission.deadline_text}</Text>
                  </View>
                )}

                {/* Links */}
                {viewingSubmission.website_url && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Website</Text>
                    <Text style={styles.infoValue}>{viewingSubmission.website_url}</Text>
                  </View>
                )}
                {viewingSubmission.application_url && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Application URL</Text>
                    <Text style={styles.infoValue}>{viewingSubmission.application_url}</Text>
                  </View>
                )}

                {/* Requirements */}
                {viewingSubmission.requirements && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Requirements</Text>
                    <Text style={styles.infoValue}>{viewingSubmission.requirements}</Text>
                  </View>
                )}
                {viewingSubmission.benefits && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Benefits</Text>
                    <Text style={styles.infoValue}>{viewingSubmission.benefits}</Text>
                  </View>
                )}

                {/* Action Buttons */}
                {viewingSubmission.status === 'pending' && (
                  <View style={styles.reviewActions}>
                    <TouchableOpacity
                      style={styles.approveButton}
                      onPress={() => handleApproveSubmission(viewingSubmission.id)}
                    >
                      <Text style={styles.approveButtonText}>✓ Approve & Publish</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectButton}
                      onPress={() => handleRejectSubmission(viewingSubmission.id)}
                    >
                      <Text style={styles.rejectButtonText}>✕ Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={{ height: 40 }} />
              </ScrollView>
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
    backgroundColor: '#F8FAFC',
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
  headerCenter: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  addButton: {
    backgroundColor: '#4169E1',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: '#0F172A',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#475569',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
  },
  scholarshipCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  scholarshipImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#F1F5F9',
  },
  scholarshipContent: {
    padding: 16,
  },
  scholarshipName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  scholarshipDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 12,
  },
  scholarshipMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: '#475569',
  },
  scholarshipActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    paddingVertical: 10,
    borderRadius: 10,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4169E1',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    paddingVertical: 10,
    borderRadius: 10,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalClose: {
    fontSize: 28,
    color: '#94A3B8',
    fontWeight: '300',
  },
  modalBody: {
    padding: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
  },
  formInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#4169E1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginTop: 20,
    marginBottom: 12,
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
    marginTop: 8,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4169E1',
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
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
  amountRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  currencyButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
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
    fontWeight: '600',
    color: '#6B7280',
  },
  currencyTextActive: {
    color: '#FFFFFF',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  chipSelected: {
    backgroundColor: '#4169E1',
    borderColor: '#4169E1',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  // Tab Styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
  },
  tab: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginRight: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#4169E1',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  activeTabText: {
    color: '#4169E1',
  },
  // Submission Card Styles
  submissionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  submissionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  submissionImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  submissionContent: {
    flex: 1,
  },
  submissionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B',
  },
  submitterInfo: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 2,
  },
  submissionDescription: {
    fontSize: 14,
    color: '#475569',
    marginTop: 8,
    lineHeight: 20,
  },
  fundingAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#10B981',
    marginTop: 8,
  },
  // Submission Review Modal Styles
  submissionInfoSection: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  submitterLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  submitterName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  submitterEmail: {
    fontSize: 14,
    color: '#4169E1',
    marginBottom: 8,
  },
  submissionDate: {
    fontSize: 13,
    color: '#64748B',
  },
  imageSection: {
    marginBottom: 20,
  },
  infoRow: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
  },
  infoValue: {
    fontSize: 15,
    color: '#0F172A',
    lineHeight: 22,
  },
  reviewActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  approveButton: {
    flex: 1,
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  approveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  rejectButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
