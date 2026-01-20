import React, { useState, useEffect, useCallback } from 'react';
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
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { supabase, getDisplayName } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { EXPERTISE_OPTIONS, MEETING_FORMATS, DAYS_OPTIONS } from '@/constants/mentorConstants';
import ProfilePhotoUpload from '@/components/ProfilePhotoUpload';

type TabType = 'mentors' | 'applications';

interface Mentor {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  profile_photo_url: string | null;
  current_title: string;
  company: string | null;
  industry: string | null;
  years_of_experience: number | null;
  university: string | null;
  position_at_university: string | null;
  expertise_areas: string[];
  available_hours: string | null;
  meeting_formats: string[];
  preferred_days: string[];
  linkedin_url: string | null;
  whatsapp_number: string | null;
  short_bio: string | null;
  detailed_bio: string | null;
  mentorship_philosophy: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'inactive';
  application_type: 'admin_added' | 'self_applied';
  admin_notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface Application {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  profile_photo_url: string | null;
  current_title: string;
  company: string | null;
  industry: string | null;
  years_of_experience: number | null;
  university: string | null;
  position_at_university: string | null;
  expertise_areas: string[];
  available_hours: string | null;
  meeting_formats: string[];
  preferred_days: string[];
  linkedin_url: string | null;
  whatsapp_number: string | null;
  short_bio: string | null;
  detailed_bio: string | null;
  why_mentor: string;
  what_offer: string;
  verification_documents: string[] | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Request {
  id: string;
  mentor_id: string;
  mentee_id: string | null;
  mentee_name: string;
  mentee_email: string;
  mentee_phone: string | null;
  current_status: string | null;
  areas_of_interest: string[];
  message: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  mentor_response: string | null;
  created_at: string;
  updated_at: string;
  mentor: {
    full_name: string;
    email: string;
  };
}

export default function AdminAlumniMentorsScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('mentors');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);

  // Modal states
  const [editingMentor, setEditingMentor] = useState<Mentor | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [creatingMentor, setCreatingMentor] = useState(false);

  // Create mentor form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [currentTitle, setCurrentTitle] = useState('');
  const [company, setCompany] = useState('');
  const [industry, setIndustry] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [university, setUniversity] = useState('');
  const [position, setPosition] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [availableHours, setAvailableHours] = useState('');
  const [aboutMe, setAboutMe] = useState('');
  const [background, setBackground] = useState('');
  const [whyMentor, setWhyMentor] = useState('');
  const [whatOffer, setWhatOffer] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [selectedExpertise, setSelectedExpertise] = useState<string[]>([]);
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [verificationDocuments, setVerificationDocuments] = useState<any[]>([]);
  const [uploadingDocuments, setUploadingDocuments] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // University picker
  const [universities, setUniversities] = useState<any[]>([]);
  const [showUniversityPicker, setShowUniversityPicker] = useState(false);
  const [loadingUniversities, setLoadingUniversities] = useState(false);

  // Check admin access
  useEffect(() => {
    if (profile === null) {
      return;
    }
    
    if (!profile?.is_admin) {
      Alert.alert('Access Denied', 'You do not have permission to access this page.');
      debouncedRouter.back();
    }
  }, [profile, router]);

  // Fetch universities
  const fetchUniversities = useCallback(async () => {
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
  }, []);

  const selectUniversity = (uni: any) => {
    if (editingMentor) {
      setEditingMentor({ ...editingMentor, university: uni.title });
    } else {
      setUniversity(uni.title);
    }
    setShowUniversityPicker(false);
  };

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch mentors
      const { data: mentorsData, error: mentorsError } = await supabase
        .from('alumni_mentors')
        .select('*')
        .order('created_at', { ascending: false });

      if (mentorsError) throw mentorsError;
      setMentors(mentorsData || []);

      // Fetch applications
      const { data: appsData, error: appsError } = await supabase
        .from('mentor_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (appsError) throw appsError;
      setApplications(appsData || []);

      console.log('📊 Loaded:', mentorsData?.length, 'mentors,', appsData?.length, 'applications');
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
    fetchUniversities();
  }, [fetchAllData, fetchUniversities]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAllData();
  }, [fetchAllData]);

  // Document picker for create mentor
  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      
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
      setUploadingDocuments(true);

      const fileExt = fileName.split('.').pop()?.toLowerCase() || 'pdf';
      const filePath = `${user.id}/verification/${Date.now()}.${fileExt}`;

      const formData = new FormData();
      formData.append('file', {
        uri: uri,
        type: `application/${fileExt}`,
        name: fileName,
      } as any);

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

      const { data: { publicUrl } } = supabase.storage
        .from('mentor-verification')
        .getPublicUrl(filePath);

      setVerificationDocuments([...verificationDocuments, publicUrl]);
      Alert.alert('Success', 'Document uploaded successfully!');
    } catch (error: any) {
      console.error('Error uploading document:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload document');
    } finally {
      setUploadingDocuments(false);
    }
  };

  const removeDocument = (url: string) => {
    setVerificationDocuments(verificationDocuments.filter(doc => doc !== url));
  };

  // Create new mentor
  const createMentor = async () => {
    try {
      // Validation
      if (!fullName.trim() || !email.trim() || !currentTitle.trim()) {
        Alert.alert('Required Fields', 'Please fill in name, email, and current title');
        return;
      }

      if (selectedExpertise.length === 0) {
        Alert.alert('Required Fields', 'Please select at least one area of expertise');
        return;
      }

      if (!aboutMe.trim() || !background.trim()) {
        Alert.alert('Required Fields', 'Please provide about me and background information');
        return;
      }

      if (!whyMentor.trim() || !whatOffer.trim()) {
        Alert.alert('Required Fields', 'Please explain why you want to mentor and what you can offer');
        return;
      }

      if (verificationDocuments.length === 0) {
        Alert.alert('Required Fields', 'Please upload at least one verification document');
        return;
      }

      setSubmitting(true);

      // Insert directly into alumni_mentors (pre-approved)
      const { data, error } = await supabase
        .from('alumni_mentors')
        .insert({
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          current_title: currentTitle.trim(),
          company: company.trim(),
          industry: industry.trim(),
          years_experience: yearsExperience ? parseInt(yearsExperience) : null,
          university: university.trim() || null,
          position_at_university: position.trim() || null,
          linkedin_url: linkedinUrl.trim(),
          whatsapp_number: whatsappNumber.trim(),
          available_hours_per_month: availableHours ? parseInt(availableHours) : null,
          expertise_areas: selectedExpertise,
          meeting_formats: selectedFormats,
          preferred_days: selectedDays,
          about_me: aboutMe.trim(),
          professional_background: background.trim(),
          why_mentor: whyMentor.trim(),
          what_can_offer: whatOffer.trim(),
          profile_photo_url: profilePhotoUrl.trim() || null,
          verification_documents: verificationDocuments,
          status: 'approved',
          application_type: 'admin_added',
          created_by: profile?.id,
          approved_by: profile?.id,
          approved_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      Alert.alert('Success', 'Mentor created successfully!');
      
      // Reset form
      setFullName('');
      setEmail('');
      setPhone('');
      setCurrentTitle('');
      setCompany('');
      setIndustry('');
      setYearsExperience('');
      setUniversity('');
      setPosition('');
      setLinkedinUrl('');
      setWhatsappNumber('');
      setAvailableHours('');
      setAboutMe('');
      setBackground('');
      setWhyMentor('');
      setWhatOffer('');
      setProfilePhotoUrl('');
      setSelectedExpertise([]);
      setSelectedFormats([]);
      setSelectedDays([]);
      setVerificationDocuments([]);
      
      setCreatingMentor(false);
      fetchAllData();
    } catch (error: any) {
      console.error('Error creating mentor:', error);
      Alert.alert('Error', error.message || 'Failed to create mentor');
    } finally {
      setSubmitting(false);
    }
  };

  // Update mentor status
  const updateMentorStatus = async (mentorId: string, newStatus: 'approved' | 'rejected' | 'inactive') => {
    try {
      const { error } = await supabase
        .from('alumni_mentors')
        .update({ status: newStatus })
        .eq('id', mentorId);

      if (error) throw error;

      Alert.alert('Success', `Mentor status updated to ${newStatus}`);
      fetchAllData();
    } catch (error) {
      console.error('Error updating mentor:', error);
      Alert.alert('Error', 'Failed to update mentor status');
    }
  };

  // Delete mentor
  const deleteMentor = async (mentorId: string) => {
    Alert.alert(
      'Delete Mentor',
      'Are you sure? This will delete all associated requests.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('alumni_mentors')
                .delete()
                .eq('id', mentorId);

              if (error) throw error;
              Alert.alert('Success', 'Mentor deleted');
              fetchAllData();
            } catch (error) {
              console.error('Error deleting mentor:', error);
              Alert.alert('Error', 'Failed to delete mentor');
            }
          },
        },
      ]
    );
  };

  // Approve application
  const approveApplication = async (application: Application) => {
    try {
      // Create mentor entry from application
      const { error: mentorError } = await supabase
        .from('alumni_mentors')
        .insert({
          user_id: application.user_id,
          full_name: application.full_name,
          email: application.email,
          phone: application.phone,
          current_title: application.current_title,
          company: application.company,
          industry: application.industry,
          years_of_experience: application.years_of_experience,
          university: application.university || null,
          position_at_university: application.position_at_university || null,
          expertise_areas: application.expertise_areas,
          available_hours: application.available_hours,
          meeting_formats: application.meeting_formats,
          preferred_days: application.preferred_days,
          linkedin_url: application.linkedin_url,
          whatsapp_number: application.whatsapp_number,
          profile_photo_url: application.profile_photo_url,
          short_bio: application.short_bio || application.what_offer?.substring(0, 200) || null,
          detailed_bio: application.detailed_bio || application.what_offer,
          mentorship_philosophy: application.why_mentor,
          status: 'approved',
          application_type: 'self_applied',
          approved_by: profile?.id,
          approved_at: new Date().toISOString(),
        });

      if (mentorError) throw mentorError;

      // Update application status
      const { error: appError } = await supabase
        .from('mentor_applications')
        .update({ 
          status: 'approved',
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', application.id);

      if (appError) throw appError;

      // Send notification to applicant
      if (application.user_id) {
        await supabase.from('app_notifications').insert({
          user_id: application.user_id,
          title: '🎉 Mentor Application Approved!',
          body: `Congratulations! Your application to become a mentor has been approved.`,
        });
      }

      Alert.alert('Success', `${getDisplayName(application)} is now an approved mentor!`);
      setSelectedApplication(null);
      fetchAllData();
    } catch (error) {
      console.error('Error approving application:', error);
      Alert.alert('Error', 'Failed to approve application');
    }
  };

  // Reject application
  const rejectApplication = async (applicationId: string, userId: string | null) => {
    try {
      const { error } = await supabase
        .from('mentor_applications')
        .update({ 
          status: 'rejected',
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', applicationId);

      if (error) throw error;

      // Send notification
      if (userId) {
        await supabase.from('app_notifications').insert({
          user_id: userId,
          title: 'Mentor Application Update',
          body: 'Thank you for your interest. We are unable to approve your application at this time.',
        });
      }

      Alert.alert('Success', 'Application rejected');
      setSelectedApplication(null);
      fetchAllData();
    } catch (error) {
      console.error('Error rejecting application:', error);
      Alert.alert('Error', 'Failed to reject application');
    }
  };

  // Handle mentee email redirect
  const contactMentee = (email: string) => {
    const subject = 'Re: Mentorship Request';
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}`;
    Linking.openURL(mailtoUrl).catch(() => {
      Alert.alert('Error', 'Unable to open email client');
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0F172A" />
        <Text style={styles.loadingText}>Loading admin panel...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Alumni Mentors Admin</Text>
            <Text style={styles.headerSubtitle}>Manage mentors, applications & requests</Text>
          </View>
        </View>

        {/* Stats Cards */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.statsScrollView}
          contentContainerStyle={styles.statsContainer}
        >
          <View style={[styles.statCard, styles.statCardBlue]}>
            <Ionicons name="people" size={20} color="#3b82f6" />
            <View style={styles.statContent}>
              <Text style={styles.statNumber}>{mentors.length}</Text>
              <Text style={styles.statLabel}>Total Mentors</Text>
            </View>
          </View>
          
          <View style={[styles.statCard, styles.statCardGreen]}>
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            <View style={styles.statContent}>
              <Text style={styles.statNumber}>{mentors.filter(m => m.status === 'approved').length}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
          </View>
          
          <View style={[styles.statCard, styles.statCardYellow]}>
            <Ionicons name="document-text" size={20} color="#f59e0b" />
            <View style={styles.statContent}>
              <Text style={styles.statNumber}>{applications.filter(a => a.status === 'pending').length}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          </View>
          
          <View style={[styles.statCard, styles.statCardPurple]}>
            <Ionicons name="time" size={20} color="#8b5cf6" />
            <View style={styles.statContent}>
              <Text style={styles.statNumber}>{applications.length}</Text>
              <Text style={styles.statLabel}>All Apps</Text>
            </View>
          </View>
        </ScrollView>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'mentors' && styles.activeTab]}
          onPress={() => setActiveTab('mentors')}
        >
          <Text style={[styles.tabText, activeTab === 'mentors' && styles.activeTabText]}>
            Mentors ({mentors.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'applications' && styles.activeTab]}
          onPress={() => setActiveTab('applications')}
        >
          <Text style={[styles.tabText, activeTab === 'applications' && styles.activeTabText]}>
            Applications ({applications.length})
          </Text>
          {applications.filter(a => a.status === 'pending').length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{applications.filter(a => a.status === 'pending').length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

        {/* Content */}
        {/* MENTORS TAB */}
        {activeTab === 'mentors' && (
          <View>
            {mentors.map((mentor) => (
              <View key={mentor.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  {mentor.profile_photo_url ? (
                    <Image source={{ uri: mentor.profile_photo_url }} style={styles.mentorPhoto} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>{getDisplayName(mentor).charAt(0)}</Text>
                    </View>
                  )}
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>{getDisplayName(mentor)}</Text>
                    <Text style={styles.cardSubtitle}>{mentor.current_title}</Text>
                    {mentor.company && (
                      <Text style={styles.cardCompany}>{mentor.company}</Text>
                    )}
                  </View>
                  <View style={[styles.statusBadge, styles[`status_${mentor.status}`]]}>
                    <Text style={styles.statusText}>{mentor.status}</Text>
                  </View>
                </View>

                <View style={styles.cardDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="mail-outline" size={14} color="#6b7280" />
                    <Text style={styles.detailText}>{mentor.email}</Text>
                  </View>
                  {mentor.phone && (
                    <View style={styles.detailRow}>
                      <Ionicons name="call-outline" size={14} color="#6b7280" />
                      <Text style={styles.detailText}>{mentor.phone}</Text>
                    </View>
                  )}
                  {mentor.industry && (
                    <View style={styles.detailRow}>
                      <Ionicons name="briefcase-outline" size={14} color="#6b7280" />
                      <Text style={styles.detailText}>{mentor.industry}</Text>
                    </View>
                  )}
                  {mentor.years_of_experience && (
                    <View style={styles.detailRow}>
                      <Ionicons name="calendar-outline" size={14} color="#6b7280" />
                      <Text style={styles.detailText}>{mentor.years_of_experience} years experience</Text>
                    </View>
                  )}
                </View>

                {mentor.expertise_areas && mentor.expertise_areas.length > 0 && (
                  <View style={styles.expertiseContainer}>
                    {mentor.expertise_areas.slice(0, 3).map((area, idx) => (
                      <View key={idx} style={styles.expertiseChip}>
                        <Text style={styles.expertiseText}>{area}</Text>
                      </View>
                    ))}
                    {mentor.expertise_areas.length > 3 && (
                      <Text style={styles.moreText}>+{mentor.expertise_areas.length - 3} more</Text>
                    )}
                  </View>
                )}

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => setEditingMentor(mentor)}
                  >
                    <Ionicons name="pencil-outline" size={16} color="#fff" />
                    <Text style={styles.actionButtonText}>Edit</Text>
                  </TouchableOpacity>
                  {mentor.status === 'pending' && (
                    <>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.approveButton]}
                        onPress={() => updateMentorStatus(mentor.id, 'approved')}
                      >
                        <Text style={styles.actionButtonText}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.rejectButton]}
                        onPress={() => updateMentorStatus(mentor.id, 'rejected')}
                      >
                        <Text style={styles.actionButtonText}>Reject</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {mentor.status === 'approved' && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deactivateButton]}
                      onPress={() => updateMentorStatus(mentor.id, 'inactive')}
                    >
                      <Text style={styles.actionButtonText}>Deactivate</Text>
                    </TouchableOpacity>
                  )}
                  {mentor.status === 'inactive' && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.activateButton]}
                      onPress={() => updateMentorStatus(mentor.id, 'approved')}
                    >
                      <Text style={styles.actionButtonText}>Activate</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => deleteMentor(mentor.id)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.cardDate}>
                  Added {new Date(mentor.created_at).toLocaleDateString()} • {mentor.application_type}
                </Text>
              </View>
            ))}

            {mentors.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={60} color="#d1d5db" />
                <Text style={styles.emptyText}>No mentors yet</Text>
              </View>
            )}
          </View>
        )}

        {/* APPLICATIONS TAB */}
        {activeTab === 'applications' && (
          <View>
            {applications.map((app) => (
              <TouchableOpacity
                key={app.id}
                style={styles.card}
                onPress={() => setSelectedApplication(app)}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>{getDisplayName(app).charAt(0)}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>{getDisplayName(app)}</Text>
                    <Text style={styles.cardSubtitle}>{app.current_title}</Text>
                    {app.company && <Text style={styles.cardCompany}>{app.company}</Text>}
                  </View>
                  <View style={[styles.statusBadge, styles[`status_${app.status}`]]}>
                    <Text style={styles.statusText}>{app.status}</Text>
                  </View>
                </View>

                <View style={styles.cardDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="mail-outline" size={14} color="#6b7280" />
                    <Text style={styles.detailText}>{app.email}</Text>
                  </View>
                  {app.years_of_experience && (
                    <View style={styles.detailRow}>
                      <Ionicons name="calendar-outline" size={14} color="#6b7280" />
                      <Text style={styles.detailText}>{app.years_of_experience} years experience</Text>
                    </View>
                  )}
                </View>

                {app.expertise_areas && app.expertise_areas.length > 0 && (
                  <View style={styles.expertiseContainer}>
                    {app.expertise_areas.slice(0, 3).map((area, idx) => (
                      <View key={idx} style={styles.expertiseChip}>
                        <Text style={styles.expertiseText}>{area}</Text>
                      </View>
                    ))}
                    {app.expertise_areas.length > 3 && (
                      <Text style={styles.moreText}>+{app.expertise_areas.length - 3} more</Text>
                    )}
                  </View>
                )}

                {app.status === 'pending' && (
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.approveButton]}
                      onPress={() => approveApplication(app)}
                    >
                      <Text style={styles.actionButtonText}>Approve & Add as Mentor</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.rejectButton]}
                      onPress={() => rejectApplication(app.id, app.user_id)}
                    >
                      <Text style={styles.actionButtonText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <Text style={styles.cardDate}>
                  Applied {new Date(app.created_at).toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            ))}

            {applications.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={60} color="#d1d5db" />
                <Text style={styles.emptyText}>No applications</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Application Detail Modal */}
      {selectedApplication && (
        <Modal visible={true} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Application Details</Text>
                <TouchableOpacity onPress={() => setSelectedApplication(null)}>
                  <Ionicons name="close" size={28} color="#000" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <Text style={styles.modalName}>{getDisplayName(selectedApplication)}</Text>
                <Text style={styles.modalTitle2}>{selectedApplication.current_title}</Text>
                {selectedApplication.company && (
                  <Text style={styles.modalCompany}>{selectedApplication.company}</Text>
                )}

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionLabel}>Contact:</Text>
                  <Text style={styles.modalText}>{selectedApplication.email}</Text>
                  {selectedApplication.phone && (
                    <Text style={styles.modalText}>{selectedApplication.phone}</Text>
                  )}
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionLabel}>Experience:</Text>
                  <Text style={styles.modalText}>
                    {selectedApplication.years_of_experience || 'Not specified'} years
                  </Text>
                  {selectedApplication.university && (
                    <Text style={styles.modalText}>University: {selectedApplication.university}</Text>
                  )}
                  {selectedApplication.position_at_university && (
                    <Text style={styles.modalText}>Position: {selectedApplication.position_at_university}</Text>
                  )}
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionLabel}>Expertise Areas:</Text>
                  <View style={styles.expertiseContainer}>
                    {selectedApplication.expertise_areas.map((area, idx) => (
                      <View key={idx} style={styles.expertiseChip}>
                        <Text style={styles.expertiseText}>{area}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {selectedApplication.short_bio && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionLabel}>About:</Text>
                    <Text style={styles.modalText}>{selectedApplication.short_bio}</Text>
                  </View>
                )}

                {selectedApplication.detailed_bio && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionLabel}>Background:</Text>
                    <Text style={styles.modalText}>{selectedApplication.detailed_bio}</Text>
                  </View>
                )}

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionLabel}>Why I want to mentor:</Text>
                  <Text style={styles.modalText}>{selectedApplication.why_mentor}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionLabel}>What I can offer:</Text>
                  <Text style={styles.modalText}>{selectedApplication.what_offer}</Text>
                </View>

                {selectedApplication.verification_documents && selectedApplication.verification_documents.length > 0 && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionLabel}>Verification Documents:</Text>
                    <Text style={styles.helpText}>
                      Tap to view and verify credentials
                    </Text>
                    <View style={styles.documentsContainer}>
                      {selectedApplication.verification_documents.map((docUrl, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.documentItem}
                          onPress={() => {
                            Linking.openURL(docUrl).catch(() => {
                              Alert.alert('Error', 'Unable to open document');
                            });
                          }}
                        >
                          <Ionicons name="document-attach" size={20} color="#3b82f6" />
                          <Text style={styles.documentName}>Document {index + 1}</Text>
                          <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {selectedApplication.status === 'pending' && (
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.approveButton]}
                      onPress={() => approveApplication(selectedApplication)}
                    >
                      <Text style={styles.modalButtonText}>Approve & Add as Mentor</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.rejectButton]}
                      onPress={() => rejectApplication(selectedApplication.id, selectedApplication.user_id)}
                    >
                      <Text style={styles.modalButtonText}>Reject Application</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Create New Mentor Modal */}
      {creatingMentor && (
        <Modal visible={true} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add New Mentor</Text>
                <TouchableOpacity onPress={() => setCreatingMentor(false)}>
                  <Ionicons name="close" size={28} color="#000" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <Text style={styles.formNote}>
                  ℹ️ Create a mentor profile for alumni you've reached out to directly
                </Text>

                {/* Basic Information */}
                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Basic Information</Text>
                  
                  <Text style={styles.formLabel}>Full Name *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter full name"
                    value={fullName}
                    onChangeText={setFullName}
                  />

                  <Text style={styles.formLabel}>Email *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="mentor@example.com"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />

                  <Text style={styles.formLabel}>Phone</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Phone number"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />

                  <Text style={styles.formLabel}>WhatsApp Number</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="WhatsApp number with country code"
                    value={whatsappNumber}
                    onChangeText={setWhatsappNumber}
                    keyboardType="phone-pad"
                  />

                  <Text style={styles.formLabel}>LinkedIn URL</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="https://linkedin.com/in/..."
                    value={linkedinUrl}
                    onChangeText={setLinkedinUrl}
                    autoCapitalize="none"
                  />

                  <Text style={styles.formLabel}>Profile Photo</Text>
                  <Text style={styles.formHelpText}>Upload a professional photo for the mentor (optional but recommended)</Text>
                  <ProfilePhotoUpload
                    currentPhotoUrl={profilePhotoUrl}
                    onPhotoUploaded={setProfilePhotoUrl}
                    bucket="mentor-profiles"
                    size={100}
                  />
                </View>

                {/* Professional Information */}
                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Professional Information</Text>
                  
                  <Text style={styles.formLabel}>Current Title *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g., Senior Software Engineer"
                    value={currentTitle}
                    onChangeText={setCurrentTitle}
                  />

                  <Text style={styles.formLabel}>Company</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Current company"
                    value={company}
                    onChangeText={setCompany}
                  />

                  <Text style={styles.formLabel}>Industry</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g., Technology, Finance"
                    value={industry}
                    onChangeText={setIndustry}
                  />

                  <Text style={styles.formLabel}>Years of Experience</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Number of years"
                    value={yearsExperience}
                    onChangeText={setYearsExperience}
                    keyboardType="numeric"
                  />
                </View>

                {/* Education */}
                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Current Institution (Optional)</Text>
                  
                  <Text style={styles.formLabel}>University / Institution Where You Work</Text>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => setShowUniversityPicker(true)}
                  >
                    <Text style={[styles.pickerButtonText, !university && styles.placeholderText]}>
                      {university || 'Select a university from the list'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#666666" />
                  </TouchableOpacity>

                  <Text style={styles.formLabel}>Position at University</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g., Lecturer, Professor, Administrative Staff"
                    value={position}
                    onChangeText={setPosition}
                  />
                </View>

                {/* Expertise */}
                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Areas of Expertise *</Text>
                  <Text style={styles.formHelperText}>Select at least one area</Text>
                  <View style={styles.chipsContainer}>
                    {EXPERTISE_OPTIONS.map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.chip,
                          selectedExpertise.includes(option) && styles.chipSelected,
                        ]}
                        onPress={() => {
                          if (selectedExpertise.includes(option)) {
                            setSelectedExpertise(selectedExpertise.filter(e => e !== option));
                          } else {
                            setSelectedExpertise([...selectedExpertise, option]);
                          }
                        }}
                      >
                        <Text style={[
                          styles.chipText,
                          selectedExpertise.includes(option) && styles.chipTextSelected,
                        ]}>
                          {option}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Meeting Formats */}
                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Preferred Meeting Formats</Text>
                  <View style={styles.chipsContainer}>
                    {MEETING_FORMATS.map((format) => (
                      <TouchableOpacity
                        key={format}
                        style={[
                          styles.chip,
                          selectedFormats.includes(format) && styles.chipSelected,
                        ]}
                        onPress={() => {
                          if (selectedFormats.includes(format)) {
                            setSelectedFormats(selectedFormats.filter(f => f !== format));
                          } else {
                            setSelectedFormats([...selectedFormats, format]);
                          }
                        }}
                      >
                        <Text style={[
                          styles.chipText,
                          selectedFormats.includes(format) && styles.chipTextSelected,
                        ]}>
                          {format}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Availability */}
                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Availability</Text>
                  
                  <Text style={styles.formLabel}>Available Hours per Month</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Number of hours"
                    value={availableHours}
                    onChangeText={setAvailableHours}
                    keyboardType="numeric"
                  />

                  <Text style={styles.formLabel}>Preferred Days</Text>
                  <View style={styles.chipsContainer}>
                    {DAYS_OPTIONS.map((day) => (
                      <TouchableOpacity
                        key={day}
                        style={[
                          styles.chip,
                          selectedDays.includes(day) && styles.chipSelected,
                        ]}
                        onPress={() => {
                          if (selectedDays.includes(day)) {
                            setSelectedDays(selectedDays.filter(d => d !== day));
                          } else {
                            setSelectedDays([...selectedDays, day]);
                          }
                        }}
                      >
                        <Text style={[
                          styles.chipText,
                          selectedDays.includes(day) && styles.chipTextSelected,
                        ]}>
                          {day}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Bio */}
                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>About *</Text>
                  
                  <Text style={styles.formLabel}>About Me (500 chars) *</Text>
                  <TextInput
                    style={[styles.formInput, styles.textArea]}
                    placeholder="Brief introduction about yourself..."
                    value={aboutMe}
                    onChangeText={setAboutMe}
                    multiline
                    numberOfLines={4}
                    maxLength={500}
                  />
                  <Text style={styles.charCount}>{aboutMe.length}/500</Text>

                  <Text style={styles.formLabel}>Professional Background (1000 chars) *</Text>
                  <TextInput
                    style={[styles.formInput, styles.textArea]}
                    placeholder="Your professional journey and achievements..."
                    value={background}
                    onChangeText={setBackground}
                    multiline
                    numberOfLines={6}
                    maxLength={1000}
                  />
                  <Text style={styles.charCount}>{background.length}/1000</Text>
                </View>

                {/* Motivation */}
                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Motivation *</Text>
                  
                  <Text style={styles.formLabel}>Why do you want to mentor? *</Text>
                  <TextInput
                    style={[styles.formInput, styles.textArea]}
                    placeholder="Share your motivation..."
                    value={whyMentor}
                    onChangeText={setWhyMentor}
                    multiline
                    numberOfLines={4}
                  />

                  <Text style={styles.formLabel}>What can you offer? *</Text>
                  <TextInput
                    style={[styles.formInput, styles.textArea]}
                    placeholder="Skills, advice, connections you can share..."
                    value={whatOffer}
                    onChangeText={setWhatOffer}
                    multiline
                    numberOfLines={4}
                  />
                </View>

                {/* Documents */}
                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Verification Documents *</Text>
                  <Text style={styles.formHelperText}>
                    Upload ID, diploma, or professional certificates (max 5MB each)
                  </Text>
                  
                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={pickDocument}
                    disabled={uploadingDocuments}
                  >
                    {uploadingDocuments ? (
                      <ActivityIndicator color="#0F172A" />
                    ) : (
                      <>
                        <Ionicons name="cloud-upload-outline" size={24} color="#16a34a" />
                        <Text style={styles.uploadButtonText}>Upload Document</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {verificationDocuments.length > 0 && (
                    <View style={styles.documentsListContainer}>
                      {verificationDocuments.map((doc, index) => (
                        <View key={index} style={styles.documentItem}>
                          <Ionicons name="document-text" size={20} color="#16a34a" />
                          <Text style={styles.documentText} numberOfLines={1}>
                            Document {index + 1}
                          </Text>
                          <TouchableOpacity onPress={() => removeDocument(doc)}>
                            <Ionicons name="close-circle" size={20} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: '#e5e7eb' }]}
                    onPress={() => setCreatingMentor(false)}
                    disabled={submitting}
                  >
                    <Text style={[styles.modalButtonText, { color: '#374151' }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: '#16a34a' }]}
                    onPress={createMentor}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.modalButtonText}>Create Mentor</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Edit Mentor Modal */}
      {editingMentor && (
        <Modal visible={true} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Mentor</Text>
                <TouchableOpacity onPress={() => setEditingMentor(null)}>
                  <Ionicons name="close" size={28} color="#000" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionLabel}>Basic Information</Text>
                  
                  <Text style={styles.formLabel}>Full Name</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editingMentor.full_name}
                    onChangeText={(text) => setEditingMentor({ ...editingMentor, full_name: text })}
                    placeholder="Full Name"
                  />

                  <Text style={styles.formLabel}>Email</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editingMentor.email}
                    onChangeText={(text) => setEditingMentor({ ...editingMentor, email: text })}
                    placeholder="Email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />

                  <Text style={styles.formLabel}>Phone</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editingMentor.phone || ''}
                    onChangeText={(text) => setEditingMentor({ ...editingMentor, phone: text })}
                    placeholder="Phone"
                    keyboardType="phone-pad"
                  />

                  <Text style={styles.formLabel}>Current Title</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editingMentor.current_title}
                    onChangeText={(text) => setEditingMentor({ ...editingMentor, current_title: text })}
                    placeholder="Current Title"
                  />

                  <Text style={styles.formLabel}>Company</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editingMentor.company || ''}
                    onChangeText={(text) => setEditingMentor({ ...editingMentor, company: text })}
                    placeholder="Company"
                  />

                  <Text style={styles.formLabel}>Industry</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editingMentor.industry || ''}
                    onChangeText={(text) => setEditingMentor({ ...editingMentor, industry: text })}
                    placeholder="Industry"
                  />

                  <Text style={styles.formLabel}>Years of Experience</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editingMentor.years_of_experience?.toString() || ''}
                    onChangeText={(text) => setEditingMentor({ ...editingMentor, years_of_experience: parseInt(text) || null })}
                    placeholder="Years of Experience"
                    keyboardType="numeric"
                  />

                  <Text style={styles.formLabel}>University / Institution</Text>
                  {showUniversityPicker && editingMentor ? (
                    <View style={styles.inlinePickerContainer}>
                      <View style={styles.inlinePickerHeader}>
                        <Text style={styles.inlinePickerTitle}>Select University</Text>
                        <TouchableOpacity onPress={() => setShowUniversityPicker(false)}>
                          <Ionicons name="close-circle" size={24} color="#666" />
                        </TouchableOpacity>
                      </View>
                      {loadingUniversities ? (
                        <View style={styles.inlinePickerLoading}>
                          <ActivityIndicator size="small" color="#0F172A" />
                        </View>
                      ) : (
                        <ScrollView style={styles.inlinePickerList} nestedScrollEnabled={true}>
                          {universities.map((item) => (
                            <TouchableOpacity
                              key={item.id}
                              style={styles.inlinePickerItem}
                              onPress={() => selectUniversity(item)}
                            >
                              <View style={styles.universityInfo}>
                                <Text style={styles.inlinePickerItemTitle}>{item.title}</Text>
                                <Text style={styles.inlinePickerItemSubtitle}>
                                  {item.location}{item.country ? `, ${item.country}` : ''}
                                </Text>
                              </View>
                              {editingMentor.university === item.title && (
                                <Ionicons name="checkmark-circle" size={20} color="#4169E1" />
                              )}
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      )}
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.pickerButton}
                      onPress={() => setShowUniversityPicker(true)}
                    >
                      <Text style={[styles.pickerButtonText, !editingMentor.university && styles.placeholderText]}>
                        {editingMentor.university || 'Select a university from the list'}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color="#666666" />
                    </TouchableOpacity>
                  )}

                  <Text style={styles.formLabel}>Position at University</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editingMentor.position_at_university || ''}
                    onChangeText={(text) => setEditingMentor({ ...editingMentor, position_at_university: text })}
                    placeholder="e.g., Lecturer, Professor"
                  />

                  <Text style={styles.formLabel}>Available Hours</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editingMentor.available_hours || ''}
                    onChangeText={(text) => setEditingMentor({ ...editingMentor, available_hours: text })}
                    placeholder="e.g. 2-3 hours per week"
                  />

                  <Text style={styles.formLabel}>LinkedIn URL</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editingMentor.linkedin_url || ''}
                    onChangeText={(text) => setEditingMentor({ ...editingMentor, linkedin_url: text })}
                    placeholder="LinkedIn URL"
                    autoCapitalize="none"
                  />

                  <Text style={styles.formLabel}>WhatsApp Number</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editingMentor.whatsapp_number || ''}
                    onChangeText={(text) => setEditingMentor({ ...editingMentor, whatsapp_number: text })}
                    placeholder="WhatsApp Number (e.g., +233XXXXXXXXX)"
                    keyboardType="phone-pad"
                  />

                  <Text style={styles.formLabel}>Short Bio</Text>
                  <TextInput
                    style={[styles.formInput, styles.textArea]}
                    value={editingMentor.short_bio || ''}
                    onChangeText={(text) => setEditingMentor({ ...editingMentor, short_bio: text })}
                    placeholder="Short Bio"
                    multiline
                    numberOfLines={3}
                  />

                  <Text style={styles.formLabel}>Detailed Bio</Text>
                  <TextInput
                    style={[styles.formInput, styles.textArea]}
                    value={editingMentor.detailed_bio || ''}
                    onChangeText={(text) => setEditingMentor({ ...editingMentor, detailed_bio: text })}
                    placeholder="Detailed Bio"
                    multiline
                    numberOfLines={4}
                  />

                  <Text style={styles.formLabel}>Mentorship Philosophy</Text>
                  <TextInput
                    style={[styles.formInput, styles.textArea]}
                    value={editingMentor.mentorship_philosophy || ''}
                    onChangeText={(text) => setEditingMentor({ ...editingMentor, mentorship_philosophy: text })}
                    placeholder="Mentorship Philosophy"
                    multiline
                    numberOfLines={3}
                  />

                  <Text style={styles.formLabel}>Admin Notes</Text>
                  <TextInput
                    style={[styles.formInput, styles.textArea]}
                    value={editingMentor.admin_notes || ''}
                    onChangeText={(text) => setEditingMentor({ ...editingMentor, admin_notes: text })}
                    placeholder="Internal admin notes"
                    multiline
                    numberOfLines={2}
                  />
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: '#e5e7eb' }]}
                    onPress={() => setEditingMentor(null)}
                  >
                    <Text style={[styles.modalButtonText, { color: '#374151' }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: '#16a34a' }]}
                    onPress={async () => {
                      try {
                        const { error } = await supabase
                          .from('alumni_mentors')
                          .update({
                            full_name: editingMentor.full_name,
                            email: editingMentor.email,
                            phone: editingMentor.phone,
                            current_title: editingMentor.current_title,
                            company: editingMentor.company,
                            industry: editingMentor.industry,
                            years_of_experience: editingMentor.years_of_experience,
                            university: editingMentor.university,
                            position_at_university: editingMentor.position_at_university,
                            available_hours: editingMentor.available_hours,
                            linkedin_url: editingMentor.linkedin_url,
                            whatsapp_number: editingMentor.whatsapp_number,
                            short_bio: editingMentor.short_bio,
                            detailed_bio: editingMentor.detailed_bio,
                            mentorship_philosophy: editingMentor.mentorship_philosophy,
                            admin_notes: editingMentor.admin_notes,
                          })
                          .eq('id', editingMentor.id);

                        if (error) throw error;

                        Alert.alert('Success', 'Mentor updated successfully');
                        setEditingMentor(null);
                        fetchAllData();
                      } catch (error) {
                        console.error('Error updating mentor:', error);
                        Alert.alert('Error', 'Failed to update mentor');
                      }
                    }}
                  >
                    <Text style={styles.modalButtonText}>Save Changes</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Floating Action Button - Add New Mentor */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setCreatingMentor(true)}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* University Picker Modal - Only for Create Form */}
      <Modal
        visible={showUniversityPicker && !editingMentor}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowUniversityPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select University</Text>
              <TouchableOpacity onPress={() => setShowUniversityPicker(false)}>
                <Ionicons name="close" size={24} color="#333333" />
              </TouchableOpacity>
            </View>

            {loadingUniversities ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color="#0F172A" />
                <Text style={styles.modalLoadingText}>Loading universities...</Text>
              </View>
            ) : (
              <ScrollView style={styles.modalList}>
                {universities.map((item) => (
                  <TouchableOpacity
                    key={item.id}
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
                      <Ionicons name="checkmark-circle" size={20} color="#4169E1" />
                    )}
                  </TouchableOpacity>
                ))}
                {universities.length === 0 && (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No universities available</Text>
                  </View>
                )}
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
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  statsScrollView: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 10,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    minWidth: 110,
  },
  statContent: {
    flexShrink: 0,
  },
  statCardBlue: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  statCardGreen: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  statCardYellow: {
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
  },
  statCardPurple: {
    borderColor: '#8b5cf6',
    backgroundColor: '#f5f3ff',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 22,
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
    marginTop: 2,
    whiteSpace: 'nowrap',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#16a34a',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#16a34a',
    fontWeight: '700',
  },
  badge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  mentorPhoto: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 10,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  cardInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
  },
  cardCompany: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  status_pending: {
    backgroundColor: '#fef3c7',
  },
  status_approved: {
    backgroundColor: '#d1fae5',
  },
  status_rejected: {
    backgroundColor: '#fee2e2',
  },
  status_inactive: {
    backgroundColor: '#f3f4f6',
  },
  status_accepted: {
    backgroundColor: '#d1fae5',
  },
  status_declined: {
    backgroundColor: '#fee2e2',
  },
  status_completed: {
    backgroundColor: '#e0e7ff',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#111827',
    textTransform: 'capitalize',
  },
  cardDetails: {
    marginBottom: 10,
    gap: 5,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: '#374151',
    flex: 1,
  },
  expertiseContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 10,
  },
  expertiseChip: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  expertiseText: {
    fontSize: 10,
    color: '#374151',
    fontWeight: '500',
  },
  moreText: {
    fontSize: 10,
    color: '#9ca3af',
    alignSelf: 'center',
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  approveButton: {
    backgroundColor: '#16a34a',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  deactivateButton: {
    backgroundColor: '#f59e0b',
  },
  activateButton: {
    backgroundColor: '#3b82f6',
  },
  editButton: {
    backgroundColor: '#3b82f6',
  },
  deleteButton: {
    backgroundColor: '#dc2626',
    flex: 0,
    paddingHorizontal: 16,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cardDate: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 6,
    fontWeight: '500',
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  mentorName: {
    fontSize: 12,
    color: '#16a34a',
    marginTop: 4,
    fontWeight: '500',
  },
  messageContainer: {
    backgroundColor: '#f9fafb',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  messageLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  emailButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  emailButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9ca3af',
    marginTop: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  modalBody: {
    padding: 20,
  },
  modalName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  modalTitle2: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 4,
  },
  modalCompany: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 2,
  },
  modalSection: {
    marginTop: 20,
  },
  modalSectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 4,
  },
  modalActions: {
    marginTop: 24,
    gap: 12,
  },
  modalButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalNote: {
    fontSize: 13,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 20,
    textAlign: 'center',
    paddingBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  formHelpText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  formInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  helpText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  documentsContainer: {
    gap: 8,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },
  documentName: {
    flex: 1,
    fontSize: 14,
    color: '#1e40af',
    fontWeight: '500',
  },
  formNote: {
    fontSize: 13,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 12,
    textAlign: 'center',
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    marginTop: 8,
  },
  formHelperText: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 12,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  chipSelected: {
    backgroundColor: '#dcfce7',
    borderColor: '#16a34a',
  },
  chipText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#16a34a',
    fontWeight: '600',
  },
  charCount: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
    marginTop: 4,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#16a34a',
    borderStyle: 'dashed',
    backgroundColor: '#f0fdf4',
    marginTop: 8,
  },
  uploadButtonText: {
    fontSize: 15,
    color: '#16a34a',
    fontWeight: '600',
  },
  documentsListContainer: {
    marginTop: 12,
    gap: 8,
  },
  documentText: {
    flex: 1,
    fontSize: 14,
    color: '#16a34a',
    fontWeight: '500',
  },
  pickerButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 12,
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
  inlinePickerContainer: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 300,
  },
  inlinePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  inlinePickerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  inlinePickerLoading: {
    padding: 20,
    alignItems: 'center',
  },
  inlinePickerList: {
    maxHeight: 250,
  },
  inlinePickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  inlinePickerItemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  inlinePickerItemSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
});
