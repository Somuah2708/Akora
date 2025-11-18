import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import StatCard from '@/components/StatCard';
import FilterModal from '@/components/FilterModal';
import MentorStats from '@/components/MentorStats';

interface MentorRequest {
  id: string;
  mentee_id: string;
  mentee_name: string;
  mentee_email: string;
  mentee_phone: string | null;
  current_status: string | null;
  areas_of_interest: string[];
  message: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  mentor_response: string | null;
  created_at: string;
}

interface MentorProfile {
  id: string;
  full_name: string;
  email: string;
  current_title: string;
  company: string;
}

interface Stats {
  totalRequests: number;
  pendingRequests: number;
  acceptedRequests: number;
  completedRequests: number;
  acceptanceRate: number;
  avgResponseTimeHours: number;
}

export default function MentorDashboard() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [mentorProfile, setMentorProfile] = useState<MentorProfile | null>(null);
  const [requests, setRequests] = useState<MentorRequest[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalRequests: 0,
    pendingRequests: 0,
    acceptedRequests: 0,
    completedRequests: 0,
    acceptanceRate: 0,
    avgResponseTimeHours: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'accepted' | 'all'>('pending');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('pending');
  const [selectedSort, setSelectedSort] = useState('created_at_desc');
  const [filteredRequests, setFilteredRequests] = useState<MentorRequest[]>([]);

  // Check if user is a mentor
  const checkMentorStatus = useCallback(async () => {
    if (!user || !profile) return;

    try {
      const { data, error } = await supabase
        .from('alumni_mentors')
        .select('id, full_name, email, current_title, company')
        .eq('email', profile.email)
        .eq('status', 'approved')
        .maybeSingle();

      if (error) {
        console.error('Error checking mentor status:', error);
        Alert.alert(
          'Not a Mentor',
          'You are not registered as a mentor. Please contact admin to become a mentor.',
          [{ text: 'Go Back', onPress: () => router.back() }]
        );
        return;
      }

      if (!data) {
        Alert.alert(
          'Not a Mentor',
          'You are not registered as a mentor. Please contact admin to become a mentor.',
          [{ text: 'Go Back', onPress: () => router.back() }]
        );
        return;
      }

      setMentorProfile(data);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Failed to verify mentor status.');
      router.back();
    }
  }, [user, profile, router]);

  // Fetch mentorship requests
  const fetchRequests = useCallback(async () => {
    if (!mentorProfile) return;

    try {
      let query = supabase
        .from('mentor_requests')
        .select('*')
        .eq('mentor_id', mentorProfile.id)
        .order('created_at', { ascending: false });

      // Filter by tab
      if (activeTab === 'pending') {
        query = query.eq('status', 'pending');
      } else if (activeTab === 'accepted') {
        query = query.eq('status', 'accepted');
      }

      const { data, error } = await query;

      if (error) throw error;

      console.log(`📥 Fetched ${data?.length || 0} ${activeTab} requests`);
      setRequests(data || []);

      // Calculate stats
      const allRequests = data || [];
      const total = allRequests.length;
      const pending = allRequests.filter(r => r.status === 'pending').length;
      const accepted = allRequests.filter(r => r.status === 'accepted').length;
      const completed = allRequests.filter(r => r.status === 'completed').length;
      const acceptanceRate = total > 0 ? Math.round((accepted + completed) / total * 100) : 0;

      // Fetch performance metrics for avg response time
      let avgResponseTimeHours = 0;
      try {
        const { data: metricsData, error: metricsError } = await supabase
          .from('mentor_performance_metrics')
          .select('avg_response_time_hours')
          .eq('mentor_id', mentorProfile.id)
          .single();
        
        if (!metricsError && metricsData) {
          avgResponseTimeHours = metricsData.avg_response_time_hours || 0;
        }
      } catch (metricsError) {
        console.log('Could not fetch performance metrics:', metricsError);
      }

      setStats({
        totalRequests: total,
        pendingRequests: pending,
        acceptedRequests: accepted,
        completedRequests: completed,
        acceptanceRate,
        avgResponseTimeHours,
      });
    } catch (error) {
      console.error('Error fetching requests:', error);
      Alert.alert('Error', 'Failed to load mentorship requests.');
    }
  }, [mentorProfile, activeTab]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await checkMentorStatus();
      setLoading(false);
    };
    init();
  }, [checkMentorStatus]);

  // Load requests when mentor profile is ready
  useEffect(() => {
    if (mentorProfile) {
      fetchRequests();
    }
  }, [mentorProfile, activeTab, fetchRequests]);

  // Handle refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRequests();
    setRefreshing(false);
  }, [fetchRequests]);

  // Accept request
  const handleAccept = async (requestId: string, menteeId: string, menteeName: string) => {
    try {
      const { error } = await supabase
        .from('mentor_requests')
        .update({
          status: 'accepted',
          mentor_response: responseText || 'I would be happy to mentor you!',
        })
        .eq('id', requestId);

      if (error) throw error;

      // Send notification to mentee
      await supabase.from('app_notifications').insert({
        user_id: menteeId,
        title: '✅ Mentorship Request Accepted!',
        body: `${mentorProfile?.full_name} has accepted your mentorship request. You can now contact them directly.`,
      });

      Alert.alert(
        'Request Accepted! ✅',
        'The mentee will receive your contact information and can now reach out to you directly.',
        [{ text: 'Great!', onPress: () => setSelectedRequest(null) }]
      );

      setResponseText('');
      fetchRequests();
    } catch (error: any) {
      console.error('Error accepting request:', error);
      let errorMessage = 'Failed to accept request. Please try again.';
      if (error.message?.includes('Network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.code === 'PGRST301') {
        errorMessage = 'Database error. Please contact support if this persists.';
      }
      Alert.alert('Error', errorMessage, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Retry', onPress: () => handleAccept(requestId, menteeId, menteeName) },
      ]);
    }
  };

  // Decline request
  const handleDecline = async (requestId: string, menteeId: string, menteeName: string) => {
    Alert.alert(
      'Decline Request',
      'Are you sure you want to decline this mentorship request? You can optionally provide a reason.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = responseText || 'Unfortunately, I am unable to take on new mentees at this time.';
              
              const { error } = await supabase
                .from('mentor_requests')
                .update({
                  status: 'declined',
                  mentor_response: response,
                })
                .eq('id', requestId);

              if (error) throw error;

              // Send notification to mentee
              await supabase.from('app_notifications').insert({
                user_id: menteeId,
                title: '❌ Mentorship Request Declined',
                body: `${mentorProfile?.full_name} has declined your request. ${response}`,
              });

              Alert.alert('Request Declined', 'The request has been declined.');
              setResponseText('');
              setSelectedRequest(null);
              fetchRequests();
            } catch (error: any) {
              console.error('Error declining request:', error);
              let errorMessage = 'Failed to decline request. Please try again.';
              if (error.message?.includes('Network')) {
                errorMessage = 'Network error. Please check your connection and try again.';
              } else if (error.code === 'PGRST301') {
                errorMessage = 'Database error. Please contact support if this persists.';
              }
              Alert.alert('Error', errorMessage, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Retry', onPress: () => handleDecline(requestId, menteeId, menteeName) },
              ]);
            }
          },
        },
      ]
    );
  };

  // Mark as completed
  const handleMarkCompleted = async (requestId: string) => {
    Alert.alert(
      'Mark as Completed',
      'Has this mentorship been completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Complete',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('mentor_requests')
                .update({ status: 'completed' })
                .eq('id', requestId);

              if (error) throw error;

              Alert.alert('Success', 'Mentorship marked as completed!');
              fetchRequests();
            } catch (error) {
              console.error('Error updating request:', error);
              Alert.alert('Error', 'Failed to update status.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={styles.loadingText}>Loading your mentor dashboard...</Text>
      </View>
    );
  }

  if (!mentorProfile) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
        <Text style={styles.errorText}>Not a registered mentor</Text>
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
          <Text style={styles.headerTitle}>Mentor Dashboard</Text>
          <Text style={styles.headerSubtitle}>
            {mentorProfile.full_name} • {mentorProfile.current_title}
          </Text>
        </View>
      </View>

      {/* Stats */}
      <MentorStats
        totalRequests={stats.totalRequests}
        acceptedRequests={stats.acceptedRequests}
        completedRequests={stats.completedRequests}
        acceptanceRate={stats.acceptanceRate}
        avgResponseTimeHours={stats.avgResponseTimeHours}
      />      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
            Pending
          </Text>
          {stats.pendingRequests > 0 && activeTab === 'pending' && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{stats.pendingRequests}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'accepted' && styles.activeTab]}
          onPress={() => setActiveTab('accepted')}
        >
          <Text style={[styles.tabText, activeTab === 'accepted' && styles.activeTabText]}>
            Accepted
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
            All
          </Text>
        </TouchableOpacity>
      </View>

      {/* Requests List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {requests.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="mail-open-outline" size={80} color="#d1d5db" />
            <Text style={styles.emptyText}>No {activeTab} requests</Text>
            <Text style={styles.emptySubtext}>
              {activeTab === 'pending'
                ? 'New mentorship requests will appear here'
                : 'You have no accepted mentorship requests yet'}
            </Text>
          </View>
        ) : (
          requests.map((request) => (
            <View key={request.id} style={styles.requestCard}>
              {/* Request Header */}
              <View style={styles.requestHeader}>
                <View style={styles.requestHeaderLeft}>
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>
                      {request.mentee_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.menteeName}>{request.mentee_name}</Text>
                    {request.current_status && (
                      <Text style={styles.menteeStatus}>{request.current_status}</Text>
                    )}
                  </View>
                </View>
                <View style={[styles.statusBadge, styles[`status_${request.status}`]]}>
                  <Text style={styles.statusText}>{request.status}</Text>
                </View>
              </View>

              {/* Areas of Interest */}
              {request.areas_of_interest && request.areas_of_interest.length > 0 && (
                <View style={styles.areasContainer}>
                  <Text style={styles.sectionLabel}>Areas of Interest:</Text>
                  <View style={styles.areasChips}>
                    {request.areas_of_interest.map((area, idx) => (
                      <View key={idx} style={styles.areaChip}>
                        <Text style={styles.areaChipText}>{area}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Message */}
              <View style={styles.messageContainer}>
                <Text style={styles.sectionLabel}>Message:</Text>
                <Text style={styles.messageText}>{request.message}</Text>
              </View>

              {/* Contact Info (only shown for accepted requests) */}
              {request.status === 'accepted' && (
                <View style={styles.contactInfo}>
                  <Text style={styles.sectionLabel}>Contact Information:</Text>
                  <View style={styles.contactRow}>
                    <Ionicons name="mail-outline" size={16} color="#6b7280" />
                    <Text style={styles.contactText}>{request.mentee_email}</Text>
                  </View>
                  {request.mentee_phone && (
                    <View style={styles.contactRow}>
                      <Ionicons name="call-outline" size={16} color="#6b7280" />
                      <Text style={styles.contactText}>{request.mentee_phone}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Response (if exists) */}
              {request.mentor_response && (
                <View style={styles.responseContainer}>
                  <Text style={styles.sectionLabel}>Your Response:</Text>
                  <Text style={styles.responseText}>{request.mentor_response}</Text>
                </View>
              )}

              {/* Date */}
              <Text style={styles.dateText}>
                Requested on {new Date(request.created_at).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>

              {/* Actions */}
              {request.status === 'pending' && (
                <View style={styles.actionsContainer}>
                  {selectedRequest === request.id ? (
                    <>
                      <TextInput
                        style={styles.responseInput}
                        placeholder="Add a personal message (optional)"
                        value={responseText}
                        onChangeText={setResponseText}
                        multiline
                        numberOfLines={3}
                      />
                      <View style={styles.actionButtons}>
                        <TouchableOpacity
                          style={styles.cancelButton}
                          onPress={() => {
                            setSelectedRequest(null);
                            setResponseText('');
                          }}
                        >
                          <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.declineButton}
                          onPress={() => handleDecline(request.id, request.mentee_id, request.mentee_name)}
                        >
                          <Text style={styles.declineButtonText}>Decline</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.acceptButton}
                          onPress={() => handleAccept(request.id, request.mentee_id, request.mentee_name)}
                        >
                          <Text style={styles.acceptButtonText}>✓ Accept</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : (
                    <TouchableOpacity
                      style={styles.respondButton}
                      onPress={() => setSelectedRequest(request.id)}
                    >
                      <Text style={styles.respondButtonText}>Respond to Request</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {request.status === 'accepted' && (
                <TouchableOpacity
                  style={styles.completeButton}
                  onPress={() => handleMarkCompleted(request.id)}
                >
                  <Text style={styles.completeButtonText}>Mark as Completed</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>
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
  errorText: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '600',
    color: '#ef4444',
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
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#16a34a',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#16a34a',
    fontWeight: '600',
  },
  badge: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#9ca3af',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#d1d5db',
    textAlign: 'center',
    marginTop: 8,
  },
  requestCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  requestHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  menteeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  menteeStatus: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  status_pending: {
    backgroundColor: '#fef3c7',
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
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    textTransform: 'capitalize',
  },
  areasContainer: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  areasChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  areaChip: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  areaChipText: {
    fontSize: 13,
    color: '#374151',
  },
  messageContainer: {
    marginBottom: 16,
  },
  messageText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  contactInfo: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  contactText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
  },
  responseContainer: {
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  responseText: {
    fontSize: 14,
    color: '#166534',
    fontStyle: 'italic',
  },
  dateText: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 8,
  },
  actionsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  responseInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    marginBottom: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontWeight: '600',
    fontSize: 14,
  },
  declineButton: {
    flex: 1,
    backgroundColor: '#fee2e2',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  declineButtonText: {
    color: '#dc2626',
    fontWeight: '600',
    fontSize: 14,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  respondButton: {
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  respondButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  completeButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  completeButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  statsContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 12,
  },
  statsContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderTopWidth: 3,
    minWidth: 110,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    textAlign: 'center',
  },
});
