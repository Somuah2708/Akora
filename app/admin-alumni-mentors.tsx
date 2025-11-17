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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { EXPERTISE_OPTIONS, MEETING_FORMATS, DAYS_OPTIONS, INDUSTRY_OPTIONS } from '@/constants/mentorConstants';
import { CSVExporter, MentorCSVColumns, MentorRequestCSVColumns, MentorApplicationCSVColumns } from '@/utils/csvExporter';

type TabType = 'mentors' | 'applications' | 'requests';

interface Mentor {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  current_title: string;
  company: string | null;
  industry: string | null;
  expertise_areas: string[];
  status: 'pending' | 'approved' | 'rejected' | 'inactive';
  application_type: 'admin_added' | 'self_applied';
  created_at: string;
}

interface Application {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  current_title: string;
  company: string | null;
  expertise_areas: string[];
  why_mentor: string;
  what_offer: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

interface Request {
  id: string;
  mentee_name: string;
  mentee_email: string;
  current_status: string | null;
  areas_of_interest: string[];
  message: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  created_at: string;
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
  const [showAddMentorModal, setShowAddMentorModal] = useState(false);
  const [editingMentor, setEditingMentor] = useState<Mentor | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);

  // Statistics
  const [stats, setStats] = useState({
    totalMentors: 0,
    activeMentors: 0,
    pendingApplications: 0,
    pendingRequests: 0,
    acceptedRequests: 0,
  });

  // Check admin access
  useEffect(() => {
    // Wait for profile to load before checking
    if (profile === null) {
      console.log('[AdminAlumniMentors] Waiting for profile to load...');
      return;
    }
    
    if (!profile?.is_admin) {
      console.log('[AdminAlumniMentors] Access denied - not an admin');
      Alert.alert('Access Denied', 'You do not have permission to access this page.');
      router.back();
    } else {
      console.log('[AdminAlumniMentors] Access granted - user is admin');
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

      // Fetch requests
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

      // Calculate stats
      const totalMentors = mentorsData?.length || 0;
      const activeMentors = mentorsData?.filter(m => m.status === 'approved').length || 0;
      const pendingApps = appsData?.filter(a => a.status === 'pending').length || 0;
      const pendingReqs = requestsData?.filter(r => r.status === 'pending').length || 0;
      const acceptedReqs = requestsData?.filter(r => r.status === 'accepted').length || 0;

      setStats({
        totalMentors,
        activeMentors,
        pendingApplications: pendingApps,
        pendingRequests: pendingReqs,
        acceptedRequests: acceptedReqs,
      });

      console.log('📊 Admin Stats:', { totalMentors, activeMentors, pendingApps, pendingReqs });
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

  // Export handlers
  const handleExportMentors = async () => {
    try {
      const csvContent = CSVExporter.toCSV(mentors, MentorCSVColumns);
      const filename = `mentors_${CSVExporter.formatDate(new Date())}.csv`;
      await CSVExporter.shareCSV(csvContent, filename);
    } catch (error) {
      Alert.alert('Export Error', 'Failed to export mentors data');
      console.error('Export error:', error);
    }
  };

  const handleExportApplications = async () => {
    try {
      const csvContent = CSVExporter.toCSV(applications, MentorApplicationCSVColumns);
      const filename = `applications_${CSVExporter.formatDate(new Date())}.csv`;
      await CSVExporter.shareCSV(csvContent, filename);
    } catch (error) {
      Alert.alert('Export Error', 'Failed to export applications data');
      console.error('Export error:', error);
    }
  };

  const handleExportRequests = async () => {
    try {
      const csvContent = CSVExporter.toCSV(requests, MentorRequestCSVColumns);
      const filename = `requests_${CSVExporter.formatDate(new Date())}.csv`;
      await CSVExporter.shareCSV(csvContent, filename);
    } catch (error) {
      Alert.alert('Export Error', 'Failed to export requests data');
      console.error('Export error:', error);
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
      // Create mentor entry with user_id from application
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
          short_bio: application.why_mentor,
          detailed_bio: application.what_offer,
          status: 'approved',
          application_type: 'self_applied',
          approved_by: user?.id,
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
          body: `Congratulations! Your application to become a mentor has been approved. You can now start accepting mentorship requests.`,
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

      // Send notification to applicant
      if (userId) {
        await supabase.from('app_notifications').insert({
          user_id: userId,
          title: 'Mentor Application Update',
          body: 'Thank you for your interest in becoming a mentor. Unfortunately, we are unable to approve your application at this time.',
        });
      }

      Alert.alert('Success', 'Application rejected');
      setSelectedApplication(null);
      fetchAllData();
    } catch (error: any) {
      console.error('Error rejecting application:', error);
      let errorMessage = 'Failed to reject application. Please try again.';
      if (error.message?.includes('Network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.code === 'PGRST301') {
        errorMessage = 'Database error. Please contact support if this persists.';
      }
      Alert.alert('Error', errorMessage, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Retry', onPress: () => rejectApplication(applicationId, userId) },
      ]);
    }
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
          <Text style={styles.statNumber}>{stats.totalMentors}</Text>
          <Text style={styles.statLabel}>Total Mentors</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#d1fae5' }]}>
          <Text style={styles.statNumber}>{stats.activeMentors}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#fef3c7' }]}>
          <Text style={styles.statNumber}>{stats.pendingApplications}</Text>
          <Text style={styles.statLabel}>Pending Apps</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#fce7f3' }]}>
          <Text style={styles.statNumber}>{stats.pendingRequests}</Text>
          <Text style={styles.statLabel}>Pending Requests</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#e0e7ff' }]}>
          <Text style={styles.statNumber}>{stats.acceptedRequests}</Text>
          <Text style={styles.statLabel}>Active Mentorships</Text>
        </View>
      </ScrollView>

      {/* Export Buttons */}
      <View style={styles.exportContainer}>
        <TouchableOpacity style={styles.exportButton} onPress={handleExportMentors}>
          <Ionicons name="download-outline" size={16} color="#4169E1" />
          <Text style={styles.exportButtonText}>Export Mentors</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.exportButton} onPress={handleExportApplications}>
          <Ionicons name="download-outline" size={16} color="#10B981" />
          <Text style={styles.exportButtonText}>Export Applications</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.exportButton} onPress={handleExportRequests}>
          <Ionicons name="download-outline" size={16} color="#8B5CF6" />
          <Text style={styles.exportButtonText}>Export Requests</Text>
        </TouchableOpacity>
      </View>

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
          {stats.pendingApplications > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{stats.pendingApplications}</Text>
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
          {stats.pendingRequests > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{stats.pendingRequests}</Text>
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
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddMentorModal(true)}
            >
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Add New Mentor</Text>
            </TouchableOpacity>

            {mentors.map((mentor) => (
              <View key={mentor.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>{mentor.full_name.charAt(0)}</Text>
                  </View>
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
                <Text style={styles.emptySubtext}>Add your first mentor to get started</Text>
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
                <Text style={styles.emptySubtext}>Volunteer applications will appear here</Text>
              </View>
            )}
          </View>
        )}

        {/* REQUESTS TAB */}
        {activeTab === 'requests' && (
          <View>
            {requests.map((request) => (
              <View key={request.id} style={styles.card}>
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

                <Text style={styles.cardDate}>
                  Requested {new Date(request.created_at).toLocaleDateString()}
                </Text>
              </View>
            ))}

            {requests.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="chatbubbles-outline" size={60} color="#d1d5db" />
                <Text style={styles.emptyText}>No requests</Text>
                <Text style={styles.emptySubtext}>Mentorship requests will appear here</Text>
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

      {/* Add Mentor Modal */}
      {showAddMentorModal && (
        <Modal visible={true} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add New Mentor</Text>
                <TouchableOpacity onPress={() => setShowAddMentorModal(false)}>
                  <Ionicons name="close" size={28} color="#000" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <Text style={styles.formLabel}>Full Name *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter full name"
                  placeholderTextColor="#999"
                />

                <Text style={styles.formLabel}>Email *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="email@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="#999"
                />

                <Text style={styles.formLabel}>Phone</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="+233 XX XXX XXXX"
                  keyboardType="phone-pad"
                  placeholderTextColor="#999"
                />

                <Text style={styles.formLabel}>Current Title *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g., Senior Software Engineer"
                  placeholderTextColor="#999"
                />

                <Text style={styles.formLabel}>Company</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Company name"
                  placeholderTextColor="#999"
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setShowAddMentorModal(false)}
                  >
                    <Text style={[styles.modalButtonText, { color: '#666' }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.saveButton]}
                    onPress={() => {
                      Alert.alert('Info', 'This feature is coming soon!');
                      setShowAddMentorModal(false);
                    }}
                  >
                    <Text style={styles.modalButtonText}>Add Mentor</Text>
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
                <Text style={styles.modalName}>{editingMentor.full_name}</Text>
                <Text style={styles.modalTitle2}>{editingMentor.current_title}</Text>
                {editingMentor.company && (
                  <Text style={styles.modalCompany}>{editingMentor.company}</Text>
                )}

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionLabel}>Contact:</Text>
                  <Text style={styles.modalText}>📧 {editingMentor.email}</Text>
                  {editingMentor.phone && (
                    <Text style={styles.modalText}>📞 {editingMentor.phone}</Text>
                  )}
                </View>

                {editingMentor.expertise_areas && editingMentor.expertise_areas.length > 0 && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionLabel}>Expertise Areas:</Text>
                    <View style={styles.expertiseContainer}>
                      {editingMentor.expertise_areas.map((area, idx) => (
                        <View key={idx} style={styles.expertiseChip}>
                          <Text style={styles.expertiseText}>{area}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {editingMentor.short_bio && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionLabel}>Bio:</Text>
                    <Text style={styles.modalText}>{editingMentor.short_bio}</Text>
                  </View>
                )}

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionLabel}>Status:</Text>
                  <View style={styles.statusOptions}>
                    {['approved', 'inactive', 'rejected'].map((status) => (
                      <TouchableOpacity
                        key={status}
                        style={[
                          styles.statusOption,
                          editingMentor.status === status && styles.statusOptionSelected,
                        ]}
                        onPress={() => {
                          updateMentorStatus(editingMentor.id, status as any);
                          setEditingMentor({ ...editingMentor, status: status as any });
                        }}
                      >
                        <Text
                          style={[
                            styles.statusOptionText,
                            editingMentor.status === status && styles.statusOptionTextSelected,
                          ]}
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: '#e5e7eb' }]}
                    onPress={() => setEditingMentor(null)}
                  >
                    <Text style={[styles.modalButtonText, { color: '#666' }]}>Close</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.deleteButton]}
                    onPress={() => {
                      setEditingMentor(null);
                      deleteMentor(editingMentor.id);
                    }}
                  >
                    <Text style={styles.modalButtonText}>Delete Mentor</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalNote}>
                  💡 To edit detailed information, use the full form (coming soon)
                </Text>
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
    width: 120,
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  exportContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    gap: 8,
  },
  exportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  exportButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16a34a',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  emptySubtext: {
    fontSize: 14,
    color: '#d1d5db',
    marginTop: 4,
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
    maxHeight: '80%',
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
  },
  modalActions: {
    marginTop: 24,
    gap: 12,
  },
  modalButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  cancelButton: {
    backgroundColor: '#e5e7eb',
  },
  saveButton: {
    backgroundColor: '#16a34a',
  },
  editButton: {
    backgroundColor: '#3b82f6',
  },
  statusOptions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  statusOptionSelected: {
    borderColor: '#16a34a',
    backgroundColor: '#d1fae5',
  },
  statusOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  statusOptionTextSelected: {
    color: '#16a34a',
  },
  modalNote: {
    fontSize: 13,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 20,
    textAlign: 'center',
  },
});
