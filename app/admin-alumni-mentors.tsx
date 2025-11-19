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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { EXPERTISE_OPTIONS, MEETING_FORMATS, DAYS_OPTIONS } from '@/constants/mentorConstants';

type TabType = 'mentors' | 'applications' | 'requests';

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
  graduation_year: number | null;
  degree: string | null;
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
  graduation_year: number | null;
  degree: string | null;
  expertise_areas: string[];
  available_hours: string | null;
  meeting_formats: string[];
  preferred_days: string[];
  linkedin_url: string | null;
  whatsapp_number: string | null;
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
  const [requests, setRequests] = useState<Request[]>([]);

  // Modal states
  const [editingMentor, setEditingMentor] = useState<Mentor | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);

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

      // Fetch requests with mentor info
      const { data: requestsData, error: requestsError } = await supabase
        .from('mentor_requests')
        .select(`
          *,
          mentor:alumni_mentors!mentor_id (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;
      setRequests(requestsData || []);

      console.log('📊 Loaded:', mentorsData?.length, 'mentors,', appsData?.length, 'applications,', requestsData?.length, 'requests');
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
  }, [fetchAllData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAllData();
  }, [fetchAllData]);

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
          graduation_year: application.graduation_year,
          degree: application.degree,
          expertise_areas: application.expertise_areas,
          available_hours: application.available_hours,
          meeting_formats: application.meeting_formats,
          preferred_days: application.preferred_days,
          linkedin_url: application.linkedin_url,
          whatsapp_number: application.whatsapp_number,
          profile_photo_url: application.profile_photo_url,
          short_bio: application.what_offer?.substring(0, 200) || null, // First 200 chars as short bio
          detailed_bio: application.what_offer,
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

      Alert.alert('Success', `${application.full_name} is now an approved mentor!`);
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
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={styles.loadingText}>Loading admin panel...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Alumni Mentors Admin</Text>
          <Text style={styles.headerSubtitle}>Manage mentors, applications & requests</Text>
        </View>
      </View>

      {/* Stats Cards */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: '#dbeafe' }]}>
          <Text style={styles.statNumber}>{mentors.length}</Text>
          <Text style={styles.statLabel}>Total Mentors</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#d1fae5' }]}>
          <Text style={styles.statNumber}>{mentors.filter(m => m.status === 'approved').length}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#fef3c7' }]}>
          <Text style={styles.statNumber}>{applications.filter(a => a.status === 'pending').length}</Text>
          <Text style={styles.statLabel}>Pending Apps</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#fce7f3' }]}>
          <Text style={styles.statNumber}>{requests.filter(r => r.status === 'pending').length}</Text>
          <Text style={styles.statLabel}>Pending Requests</Text>
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
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
            Requests ({requests.length})
          </Text>
          {requests.filter(r => r.status === 'pending').length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{requests.filter(r => r.status === 'pending').length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
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
                      <Text style={styles.avatarText}>{mentor.full_name.charAt(0)}</Text>
                    </View>
                  )}
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>{mentor.full_name}</Text>
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
                    <Text style={styles.avatarText}>{app.full_name.charAt(0)}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>{app.full_name}</Text>
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

        {/* REQUESTS TAB */}
        {activeTab === 'requests' && (
          <View>
            {requests.map((request) => (
              <TouchableOpacity
                key={request.id}
                style={styles.card}
                onPress={() => setSelectedRequest(request)}
              >
                <View style={styles.requestHeader}>
                  <View>
                    <Text style={styles.cardTitle}>{request.mentee_name}</Text>
                    {request.current_status && (
                      <Text style={styles.cardSubtitle}>{request.current_status}</Text>
                    )}
                    <Text style={styles.mentorName}>
                      → Requesting: {request.mentor.full_name}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, styles[`status_${request.status}`]]}>
                    <Text style={styles.statusText}>{request.status}</Text>
                  </View>
                </View>

                <View style={styles.cardDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="mail-outline" size={14} color="#6b7280" />
                    <Text style={styles.detailText}>{request.mentee_email}</Text>
                  </View>
                </View>

                {request.areas_of_interest && request.areas_of_interest.length > 0 && (
                  <View style={styles.expertiseContainer}>
                    {request.areas_of_interest.map((area, idx) => (
                      <View key={idx} style={styles.expertiseChip}>
                        <Text style={styles.expertiseText}>{area}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.messageContainer}>
                  <Text style={styles.messageLabel}>Message:</Text>
                  <Text style={styles.messageText} numberOfLines={3}>
                    {request.message}
                  </Text>
                </View>

                {request.status === 'pending' && (
                  <TouchableOpacity
                    style={styles.emailButton}
                    onPress={() => contactMentee(request.mentee_email)}
                  >
                    <Ionicons name="mail" size={16} color="#fff" />
                    <Text style={styles.emailButtonText}>Contact via Email</Text>
                  </TouchableOpacity>
                )}

                <Text style={styles.cardDate}>
                  Requested {new Date(request.created_at).toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            ))}

            {requests.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="chatbubbles-outline" size={60} color="#d1d5db" />
                <Text style={styles.emptyText}>No requests</Text>
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
                <Text style={styles.modalName}>{selectedApplication.full_name}</Text>
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
                  {selectedApplication.degree && (
                    <Text style={styles.modalText}>Degree: {selectedApplication.degree}</Text>
                  )}
                  {selectedApplication.graduation_year && (
                    <Text style={styles.modalText}>Graduated: {selectedApplication.graduation_year}</Text>
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

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionLabel}>Why I want to mentor:</Text>
                  <Text style={styles.modalText}>{selectedApplication.why_mentor}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionLabel}>What I can offer:</Text>
                  <Text style={styles.modalText}>{selectedApplication.what_offer}</Text>
                </View>

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

      {/* Request Detail Modal */}
      {selectedRequest && (
        <Modal visible={true} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Mentorship Request</Text>
                <TouchableOpacity onPress={() => setSelectedRequest(null)}>
                  <Ionicons name="close" size={28} color="#000" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <Text style={styles.modalName}>{selectedRequest.mentee_name}</Text>
                <Text style={styles.modalTitle2}>{selectedRequest.current_status || 'Student/Professional'}</Text>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionLabel}>Contact:</Text>
                  <Text style={styles.modalText}>{selectedRequest.mentee_email}</Text>
                  {selectedRequest.mentee_phone && (
                    <Text style={styles.modalText}>{selectedRequest.mentee_phone}</Text>
                  )}
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionLabel}>Mentor Requested:</Text>
                  <Text style={styles.modalText}>{selectedRequest.mentor.full_name}</Text>
                  <Text style={styles.modalText}>{selectedRequest.mentor.email}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionLabel}>Areas of Interest:</Text>
                  <View style={styles.expertiseContainer}>
                    {selectedRequest.areas_of_interest.map((area, idx) => (
                      <View key={idx} style={styles.expertiseChip}>
                        <Text style={styles.expertiseText}>{area}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionLabel}>Message:</Text>
                  <Text style={styles.modalText}>{selectedRequest.message}</Text>
                </View>

                {selectedRequest.status === 'pending' && (
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.approveButton]}
                      onPress={() => contactMentee(selectedRequest.mentee_email)}
                    >
                      <Ionicons name="mail" size={20} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={styles.modalButtonText}>Contact Mentee via Email</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <Text style={styles.modalNote}>
                  ℹ️ Admin can facilitate connection. Mentor will receive notification.
                </Text>
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

                  <Text style={styles.formLabel}>Graduation Year</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editingMentor.graduation_year?.toString() || ''}
                    onChangeText={(text) => setEditingMentor({ ...editingMentor, graduation_year: parseInt(text) || null })}
                    placeholder="Graduation Year"
                    keyboardType="numeric"
                  />

                  <Text style={styles.formLabel}>Degree</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editingMentor.degree || ''}
                    onChangeText={(text) => setEditingMentor({ ...editingMentor, degree: text })}
                    placeholder="Degree"
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
                            graduation_year: editingMentor.graduation_year,
                            degree: editingMentor.degree,
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  statsContainer: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  statCard: {
    width: 90,
    padding: 12,
    borderRadius: 10,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
    textAlign: 'center',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#16a34a',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#16a34a',
    fontWeight: '600',
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
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  mentorPhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  cardCompany: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
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
    fontSize: 11,
    fontWeight: '600',
    color: '#111827',
    textTransform: 'capitalize',
  },
  cardDetails: {
    marginBottom: 12,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#374151',
  },
  expertiseContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  expertiseChip: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  expertiseText: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '500',
  },
  moreText: {
    fontSize: 11,
    color: '#9ca3af',
    alignSelf: 'center',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
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
    fontSize: 13,
    fontWeight: '600',
  },
  cardDate: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 8,
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
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9ca3af',
    marginTop: 12,
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
});
