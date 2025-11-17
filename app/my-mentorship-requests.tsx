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
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface MentorshipRequest {
  id: string;
  mentee_name: string;
  current_status: string | null;
  areas_of_interest: string[];
  message: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  mentor_response: string | null;
  created_at: string;
  mentor: {
    full_name: string;
    email: string;
    phone: string | null;
    current_title: string;
    company: string;
    profile_photo_url: string | null;
    user_id: string | null;
  };
}

export default function MyMentorshipRequests() {
  const router = useRouter();
  const { user } = useAuth();
  const [requests, setRequests] = useState<MentorshipRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch user's mentorship requests
  const fetchRequests = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('mentor_requests')
        .select(`
          *,
          mentor:alumni_mentors!mentor_id (
            full_name,
            email,
            phone,
            current_title,
            company,
            profile_photo_url,
            user_id
          )
        `)
        .eq('mentee_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log(`📥 Fetched ${data?.length || 0} mentorship requests`);
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      Alert.alert('Error', 'Failed to load your mentorship requests.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRequests();
  }, [fetchRequests]);

  const handleEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  const handlePhone = (phone: string) => {
    const cleanedPhone = phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanedPhone}`);
  };

  const handleMarkCompleted = async (requestId: string, mentorUserId: string | null, mentorName: string) => {
    Alert.alert(
      'Mark as Completed',
      'Have you completed this mentorship?',
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

              // Send notification to mentor
              if (mentorUserId) {
                await supabase.from('app_notifications').insert({
                  user_id: mentorUserId,
                  title: '🎓 Mentorship Completed',
                  body: `Your mentee has marked the mentorship as completed. Great work!`,
                });
              }

              Alert.alert('Success', 'Thank you! Mentorship marked as completed.');
              fetchRequests();
            } catch (error) {
              console.error('Error updating request:', error);
              Alert.alert('Error', 'Failed to update status');
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
        <Text style={styles.loadingText}>Loading your requests...</Text>
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
        <Text style={styles.headerTitle}>My Mentorship Requests</Text>
      </View>

      {/* Requests List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {requests.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="paper-plane-outline" size={80} color="#d1d5db" />
            <Text style={styles.emptyText}>No mentorship requests</Text>
            <Text style={styles.emptySubtext}>
              Browse mentors and request mentorship to get started
            </Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => router.push('/education')}
            >
              <Text style={styles.browseButtonText}>Browse Mentors</Text>
            </TouchableOpacity>
          </View>
        ) : (
          requests.map((request) => (
            <View key={request.id} style={styles.requestCard}>
              {/* Mentor Info */}
              <View style={styles.mentorHeader}>
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {request.mentor.full_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.mentorInfo}>
                  <Text style={styles.mentorName}>{request.mentor.full_name}</Text>
                  <Text style={styles.mentorTitle}>
                    {request.mentor.current_title} at {request.mentor.company}
                  </Text>
                </View>
                <View style={[styles.statusBadge, styles[`status_${request.status}`]]}>
                  <Text style={styles.statusText}>{request.status}</Text>
                </View>
              </View>

              {/* Your Message */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Your Message:</Text>
                <Text style={styles.messageText}>{request.message}</Text>
              </View>

              {/* Areas of Interest */}
              {request.areas_of_interest && request.areas_of_interest.length > 0 && (
                <View style={styles.section}>
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

              {/* Status-specific content */}
              {request.status === 'pending' && (
                <View style={styles.pendingNotice}>
                  <Ionicons name="time-outline" size={20} color="#f59e0b" />
                  <Text style={styles.pendingText}>
                    Waiting for mentor response...
                  </Text>
                </View>
              )}

              {request.status === 'accepted' && (
                <>
                  {/* Mentor Response */}
                  {request.mentor_response && (
                    <View style={styles.responseContainer}>
                      <Text style={styles.sectionLabel}>Mentor's Response:</Text>
                      <Text style={styles.responseText}>{request.mentor_response}</Text>
                    </View>
                  )}

                  {/* Contact Info */}
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactInfoHeader}>
                      ✅ Request Accepted! Contact Your Mentor:
                    </Text>
                    <TouchableOpacity
                      style={styles.contactButton}
                      onPress={() => handleEmail(request.mentor.email)}
                    >
                      <Ionicons name="mail" size={20} color="#16a34a" />
                      <Text style={styles.contactButtonText}>{request.mentor.email}</Text>
                    </TouchableOpacity>
                    {request.mentor.phone && (
                      <TouchableOpacity
                        style={styles.contactButton}
                        onPress={() => handlePhone(request.mentor.phone!)}
                      >
                        <Ionicons name="call" size={20} color="#16a34a" />
                        <Text style={styles.contactButtonText}>{request.mentor.phone}</Text>
                      </TouchableOpacity>
                    )}
                    
                    <TouchableOpacity 
                      style={styles.completeButton}
                      onPress={() => handleMarkCompleted(request.id, request.mentor.user_id, request.mentor.full_name)}
                    >
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      <Text style={styles.completeButtonText}>Mark as Completed</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {request.status === 'declined' && (
                <View style={styles.declinedNotice}>
                  <Ionicons name="close-circle-outline" size={20} color="#ef4444" />
                  <View style={styles.declinedTextContainer}>
                    <Text style={styles.declinedText}>Request was declined</Text>
                    {request.mentor_response && (
                      <Text style={styles.declinedReason}>{request.mentor_response}</Text>
                    )}
                  </View>
                </View>
              )}

              {request.status === 'completed' && (
                <View style={styles.completedNotice}>
                  <Ionicons name="checkmark-circle" size={20} color="#8b5cf6" />
                  <Text style={styles.completedText}>Mentorship completed</Text>
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
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
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
  browseButton: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  mentorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
  mentorInfo: {
    flex: 1,
  },
  mentorName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  mentorTitle: {
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
  section: {
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
  messageText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
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
  pendingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  pendingText: {
    fontSize: 14,
    color: '#f59e0b',
    marginLeft: 8,
    fontWeight: '500',
  },
  responseContainer: {
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  responseText: {
    fontSize: 14,
    color: '#166534',
    lineHeight: 20,
  },
  contactInfo: {
    backgroundColor: '#f0fdf4',
    padding: 16,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 2,
    borderColor: '#16a34a',
  },
  contactInfoHeader: {
    fontSize: 15,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 12,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  contactButtonText: {
    fontSize: 14,
    color: '#166534',
    marginLeft: 10,
    fontWeight: '500',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b5cf6',
    padding: 14,
    borderRadius: 8,
    marginTop: 16,
  },
  completeButtonText: {
    fontSize: 15,
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
  },
  declinedNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  declinedTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  declinedText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '600',
  },
  declinedReason: {
    fontSize: 13,
    color: '#dc2626',
    marginTop: 4,
    lineHeight: 18,
  },
  completedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  completedText: {
    fontSize: 14,
    color: '#8b5cf6',
    marginLeft: 8,
    fontWeight: '500',
  },
  dateText: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
});
