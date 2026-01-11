import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, Linking } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useEffect, useState, useCallback } from 'react';
import { SplashScreen, useRouter, useLocalSearchParams } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, CheckCircle, XCircle, Clock, Eye, FileText, Mail, Phone, Briefcase, Calendar, DollarSign, Link as LinkIcon, Download } from 'lucide-react-native';
import { supabase, JobApplication, Job, getDisplayName } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { LinearGradient } from 'expo-linear-gradient';

SplashScreen.preventAutoHideAsync();

type ApplicationStatus = 'pending' | 'reviewing' | 'shortlisted' | 'rejected' | 'accepted';

const STATUS_CONFIG = {
  pending: { label: 'Pending Review', color: '#F59E0B', icon: Clock },
  reviewing: { label: 'Under Review', color: '#3B82F6', icon: Eye },
  shortlisted: { label: 'Shortlisted', color: '#8B5CF6', icon: CheckCircle },
  rejected: { label: 'Rejected', color: '#EF4444', icon: XCircle },
  accepted: { label: 'Accepted', color: '#10B981', icon: CheckCircle },
};

export default function JobApplicationsReviewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams(); // job id
  const { user } = useAuth();
  
  const [job, setJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  
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
    if (id) {
      fetchJobAndApplications();
    }
  }, [id]);

  const fetchJobAndApplications = async () => {
    try {
      setLoading(true);
      
      // Fetch job details
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', id)
        .single();

      if (jobError) throw jobError;

      // Check if user is the job owner
      if (user && jobData.user_id !== user.id) {
        Alert.alert('Access Denied', 'You can only view applications for your own job postings');
        debouncedRouter.back();
        return;
      }

      setJob(jobData);

      // Fetch applications for this job
      const { data: applicationsData, error: applicationsError } = await supabase
        .from('job_applications')
        .select('*')
        .eq('job_id', id)
        .order('created_at', { ascending: false });

      if (applicationsError) throw applicationsError;

      setApplications(applicationsData || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      Alert.alert('Error', 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchJobAndApplications();
    setRefreshing(false);
  }, []);

  const handleViewApplication = (application: JobApplication) => {
    setSelectedApplication(application);
    setShowDetailModal(true);
  };

  const handleUpdateStatus = async (applicationId: string, newStatus: ApplicationStatus, notes?: string) => {
    try {
      setUpdatingStatus(true);

      const { error } = await supabase
        .from('job_applications')
        .update({
          status: newStatus,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
          review_notes: notes || null,
        })
        .eq('id', applicationId);

      if (error) throw error;

      // Create notification for applicant
      const application = applications.find(app => app.id === applicationId);
      if (application) {
        const statusMessages = {
          reviewing: 'Your application is now under review',
          shortlisted: 'Congratulations! You have been shortlisted',
          rejected: 'Thank you for your application. Unfortunately, we have decided to move forward with other candidates',
          accepted: 'Congratulations! Your application has been accepted. The employer\'s contact information is now available.',
        };

        // Prepare notification data
        const notificationData: any = {
          application_id: applicationId,
          recipient_id: application.applicant_id,
          notification_type: 'status_changed',
          title: newStatus === 'accepted' ? '🎉 Application Accepted!' : 'Application Status Updated',
          message: statusMessages[newStatus as keyof typeof statusMessages] || 'Your application status has been updated',
        };

        // Include employer contact info when accepted
        if (newStatus === 'accepted' && job) {
          notificationData.employer_contact_email = job.contact_email || user?.email;
          notificationData.employer_contact_phone = null; // Add if available
        }

        await supabase
          .from('job_application_notifications')
          .insert(notificationData);
      }

      // Refresh applications
      await fetchJobAndApplications();
      
      Alert.alert('Success', 'Application status updated successfully');
      setShowDetailModal(false);
    } catch (error: any) {
      console.error('Error updating status:', error);
      Alert.alert('Error', error.message || 'Failed to update application status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleContactApplicant = (email: string, phone: string) => {
    Alert.alert(
      'Contact Applicant',
      'How would you like to contact this applicant?',
      [
        {
          text: 'Email',
          onPress: () => Linking.openURL(`mailto:${email}`),
        },
        {
          text: 'Phone',
          onPress: () => Linking.openURL(`tel:${phone}`),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const renderApplicationCard = (application: JobApplication) => {
    const StatusIcon = STATUS_CONFIG[application.status].icon;
    const statusColor = STATUS_CONFIG[application.status].color;
    const statusLabel = STATUS_CONFIG[application.status].label;

    const timeAgo = getTimeAgo(application.created_at);

    return (
      <TouchableOpacity
        key={application.id}
        style={styles.applicationCard}
        onPress={() => handleViewApplication(application)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.applicantInfo}>
            <Text style={styles.applicantName}>{getDisplayName(application)}</Text>
            <Text style={styles.applicationDate}>{timeAgo}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
            <StatusIcon size={14} color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.contactRow}>
            <Mail size={14} color="#666666" />
            <Text style={styles.contactText}>{application.email}</Text>
          </View>
          <View style={styles.contactRow}>
            <Phone size={14} color="#666666" />
            <Text style={styles.contactText}>{application.phone}</Text>
          </View>
          {application.years_of_experience && (
            <View style={styles.contactRow}>
              <Briefcase size={14} color="#666666" />
              <Text style={styles.contactText}>{application.years_of_experience} years experience</Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.documentsInfo}>
            {application.resume_url && (
              <View style={styles.docBadge}>
                <FileText size={12} color="#4169E1" />
                <Text style={styles.docBadgeText}>Resume</Text>
              </View>
            )}
            {application.additional_documents && application.additional_documents.length > 0 && (
              <View style={styles.docBadge}>
                <FileText size={12} color="#4169E1" />
                <Text style={styles.docBadgeText}>{application.additional_documents.length} docs</Text>
              </View>
            )}
          </View>
          <Text style={styles.viewDetailsText}>View Details →</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const renderDetailModal = () => {
    if (!selectedApplication) return null;

    return (
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Application Details</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Applicant Info */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Applicant Information</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Name:</Text>
                <Text style={styles.detailValue}>{getDisplayName(selectedApplication)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Email:</Text>
                <Text style={styles.detailValue}>{selectedApplication.email}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Phone:</Text>
                <Text style={styles.detailValue}>{selectedApplication.phone}</Text>
              </View>
            </View>

            {/* Professional Details */}
            {(selectedApplication.years_of_experience || selectedApplication.expected_salary || selectedApplication.availability_date) && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Professional Details</Text>
                {selectedApplication.years_of_experience && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Experience:</Text>
                    <Text style={styles.detailValue}>{selectedApplication.years_of_experience} years</Text>
                  </View>
                )}
                {selectedApplication.expected_salary && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Expected Salary:</Text>
                    <Text style={styles.detailValue}>{selectedApplication.expected_salary}</Text>
                  </View>
                )}
                {selectedApplication.availability_date && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Available:</Text>
                    <Text style={styles.detailValue}>{selectedApplication.availability_date}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Cover Letter */}
            {selectedApplication.cover_letter && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Cover Letter</Text>
                <Text style={styles.coverLetterText}>{selectedApplication.cover_letter}</Text>
              </View>
            )}

            {/* Documents */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Documents</Text>
              {selectedApplication.resume_url && (
                <TouchableOpacity 
                  style={styles.documentButton}
                  onPress={() => Alert.alert('Resume', selectedApplication.resume_url || '')}
                >
                  <FileText size={20} color="#4169E1" />
                  <Text style={styles.documentButtonText}>View Resume/CV</Text>
                  <Download size={16} color="#4169E1" />
                </TouchableOpacity>
              )}
              {selectedApplication.additional_documents && selectedApplication.additional_documents.map((doc, index) => (
                <TouchableOpacity 
                  key={index}
                  style={styles.documentButton}
                  onPress={() => Alert.alert('Document', doc)}
                >
                  <FileText size={20} color="#4169E1" />
                  <Text style={styles.documentButtonText}>Document {index + 1}</Text>
                  <Download size={16} color="#4169E1" />
                </TouchableOpacity>
              ))}
            </View>

            {/* Links */}
            {(selectedApplication.portfolio_url || selectedApplication.linkedin_url) && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Links</Text>
                {selectedApplication.portfolio_url && (
                  <TouchableOpacity 
                    style={styles.linkButton}
                    onPress={() => Linking.openURL(selectedApplication.portfolio_url!)}
                  >
                    <LinkIcon size={16} color="#4169E1" />
                    <Text style={styles.linkButtonText}>Portfolio</Text>
                  </TouchableOpacity>
                )}
                {selectedApplication.linkedin_url && (
                  <TouchableOpacity 
                    style={styles.linkButton}
                    onPress={() => Linking.openURL(selectedApplication.linkedin_url!)}
                  >
                    <LinkIcon size={16} color="#4169E1" />
                    <Text style={styles.linkButtonText}>LinkedIn</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Current Status */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Application Status</Text>
              <View style={[styles.currentStatusBadge, { backgroundColor: `${STATUS_CONFIG[selectedApplication.status].color}20` }]}>
                <Text style={[styles.currentStatusText, { color: STATUS_CONFIG[selectedApplication.status].color }]}>
                  {STATUS_CONFIG[selectedApplication.status].label}
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.contactButton}
                onPress={() => handleContactApplicant(selectedApplication.email, selectedApplication.phone)}
              >
                <Mail size={18} color="#4169E1" />
                <Text style={styles.contactButtonText}>Contact</Text>
              </TouchableOpacity>

              {selectedApplication.status === 'pending' && (
                <TouchableOpacity 
                  style={[styles.statusButton, { backgroundColor: '#3B82F6' }]}
                  onPress={() => handleUpdateStatus(selectedApplication.id, 'reviewing')}
                  disabled={updatingStatus}
                >
                  {updatingStatus ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Eye size={18} color="#FFFFFF" />
                      <Text style={styles.statusButtonText}>Review</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {(selectedApplication.status === 'pending' || selectedApplication.status === 'reviewing') && (
                <TouchableOpacity 
                  style={[styles.statusButton, { backgroundColor: '#8B5CF6' }]}
                  onPress={() => handleUpdateStatus(selectedApplication.id, 'shortlisted')}
                  disabled={updatingStatus}
                >
                  {updatingStatus ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <CheckCircle size={18} color="#FFFFFF" />
                      <Text style={styles.statusButtonText}>Shortlist</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {selectedApplication.status === 'shortlisted' && (
                <TouchableOpacity 
                  style={[styles.statusButton, { backgroundColor: '#10B981' }]}
                  onPress={() => handleUpdateStatus(selectedApplication.id, 'accepted')}
                  disabled={updatingStatus}
                >
                  {updatingStatus ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <CheckCircle size={18} color="#FFFFFF" />
                      <Text style={styles.statusButtonText}>Accept</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {(selectedApplication.status !== 'rejected' && selectedApplication.status !== 'accepted') && (
                <TouchableOpacity 
                  style={[styles.statusButton, { backgroundColor: '#EF4444' }]}
                  onPress={() => handleUpdateStatus(selectedApplication.id, 'rejected')}
                  disabled={updatingStatus}
                >
                  {updatingStatus ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <XCircle size={18} color="#FFFFFF" />
                      <Text style={styles.statusButtonText}>Reject</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    );
  };

  if (!fontsLoaded || loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#4169E1" />
        <Text style={styles.loadingText}>Loading applications...</Text>
      </View>
    );
  }

  const statusCounts = {
    total: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    reviewing: applications.filter(a => a.status === 'reviewing').length,
    shortlisted: applications.filter(a => a.status === 'shortlisted').length,
    accepted: applications.filter(a => a.status === 'accepted').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Applications</Text>
          <Text style={styles.headerSubtitle}>{job?.title}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4169E1']} />
        }
      >
        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{statusCounts.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#F59E0B' }]}>{statusCounts.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#8B5CF6' }]}>{statusCounts.shortlisted}</Text>
            <Text style={styles.statLabel}>Shortlisted</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#10B981' }]}>{statusCounts.accepted}</Text>
            <Text style={styles.statLabel}>Accepted</Text>
          </View>
        </View>

        {/* Applications List */}
        <View style={styles.applicationsSection}>
          <Text style={styles.sectionTitle}>All Applications</Text>
          
          {applications.length === 0 ? (
            <View style={styles.emptyState}>
              <FileText size={48} color="#CBD5E1" />
              <Text style={styles.emptyStateTitle}>No Applications Yet</Text>
              <Text style={styles.emptyStateText}>
                Applications for this job will appear here
              </Text>
            </View>
          ) : (
            applications.map(application => renderApplicationCard(application))
          )}
        </View>
      </ScrollView>

      {/* Detail Modal */}
      {showDetailModal && renderDetailModal()}
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
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statNumber: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#4169E1',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  applicationsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#000000',
    marginBottom: 16,
  },
  applicationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  applicantInfo: {
    flex: 1,
  },
  applicantName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 4,
  },
  applicationDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  cardBody: {
    gap: 8,
    marginBottom: 12,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  documentsInfo: {
    flexDirection: 'row',
    gap: 8,
  },
  docBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF0FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  docBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  viewDetailsText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    textAlign: 'center',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxHeight: '90%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#000000',
  },
  closeButton: {
    fontSize: 24,
    color: '#666666',
    padding: 4,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#000000',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
    width: 120,
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  coverLetterText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    lineHeight: 22,
  },
  documentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF0FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  documentButtonText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
  },
  linkButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  currentStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  currentStatusText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EBF0FF',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    minWidth: 100,
  },
  contactButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  statusButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    minWidth: 100,
  },
  statusButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});
