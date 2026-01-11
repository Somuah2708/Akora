import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, User, MessageCircle, CheckCircle, XCircle } from 'lucide-react-native';
import { supabase, getDisplayName } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import MessageThread from '@/components/MessageThread';

interface RequestDetails {
  id: string;
  mentor_id: string;
  mentee_id: string;
  mentee_name: string;
  current_status: string | null;
  areas_of_interest: string[];
  message: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled';
  mentor_response: string | null;
  created_at: string;
  mentor: {
    full_name: string;
    email: string;
    phone: string | null;
    current_title: string;
    company: string;
    profile_photo_url: string | null;
  };
}

export default function RequestDetailsScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { id } = useLocalSearchParams();
  const [request, setRequest] = useState<RequestDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<'mentee' | 'mentor'>('mentee');

  useEffect(() => {
    if (id) {
      fetchRequestDetails();
      determineUserType();
    }
  }, [id]);

  const determineUserType = async () => {
    if (!user || !profile) return;

    try {
      // Check if user is the mentor
      const { data, error } = await supabase
        .from('alumni_mentors')
        .select('id')
        .eq('email', profile.email)
        .single();

      if (!error && data) {
        setUserType('mentor');
      } else {
        setUserType('mentee');
      }
    } catch (error) {
      console.error('Error determining user type:', error);
    }
  };

  const fetchRequestDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('mentor_requests')
        .select(`
          *,
          mentor:alumni_mentors(
            full_name,
            email,
            phone,
            current_title,
            company,
            profile_photo_url
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setRequest(data);
    } catch (error) {
      console.error('Error fetching request details:', error);
      Alert.alert('Error', 'Failed to load request details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#F59E0B';
      case 'accepted':
        return '#10B981';
      case 'declined':
        return '#EF4444';
      case 'completed':
        return '#8B5CF6';
      case 'cancelled':
        return '#6B7280';
      default:
        return '#9CA3AF';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle size={20} color="#10B981" />;
      case 'declined':
      case 'cancelled':
        return <XCircle size={20} color="#EF4444" />;
      default:
        return <MessageCircle size={20} color="#F59E0B" />;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Loading request...</Text>
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Request not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => debouncedRouter.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.headerBackButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Request Details</Text>
          <View style={styles.statusBadge}>
            {getStatusIcon(request.status)}
            <Text style={[styles.statusText, { color: getStatusColor(request.status) }]}>
              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Request Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <User size={16} color="#6B7280" />
            <Text style={styles.infoLabel}>
              {userType === 'mentee' ? 'Mentor' : 'Mentee'}:
            </Text>
            <Text style={styles.infoValue}>
              {userType === 'mentee' ? getDisplayName(request.mentor) : request.mentee_name}
            </Text>
          </View>

          {userType === 'mentee' && (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Title:</Text>
                <Text style={styles.infoValue}>{request.mentor.current_title}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Company:</Text>
                <Text style={styles.infoValue}>{request.mentor.company}</Text>
              </View>
            </>
          )}

          <View style={styles.infoSection}>
            <Text style={styles.infoSectionTitle}>Areas of Interest</Text>
            <View style={styles.tagsContainer}>
              {request.areas_of_interest.map((area, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{area}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.infoSectionTitle}>Initial Message</Text>
            <Text style={styles.messageText}>{request.message}</Text>
          </View>

          {request.mentor_response && (
            <View style={styles.infoSection}>
              <Text style={styles.infoSectionTitle}>Mentor Response</Text>
              <Text style={styles.messageText}>{request.mentor_response}</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Request Date:</Text>
            <Text style={styles.infoValue}>
              {new Date(request.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </View>
        </View>

        {/* Message Thread Section */}
        {(request.status === 'accepted' || request.status === 'completed') && (
          <View style={styles.threadSection}>
            <View style={styles.threadHeader}>
              <MessageCircle size={20} color="#10B981" />
              <Text style={styles.threadTitle}>Conversation</Text>
            </View>
            <View style={styles.threadContainer}>
              <MessageThread
                requestId={request.id}
                mentorId={request.mentor_id}
                menteeId={request.mentee_id}
                userType={userType}
                onMessageSent={() => {
                  console.log('Message sent');
                }}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 20,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
  },
  backButton: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 12,
  },
  headerBackButton: {
    padding: 4,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  statusText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
  },
  scrollView: {
    flex: 1,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    flex: 1,
  },
  infoSection: {
    gap: 8,
  },
  infoSectionTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#1E40AF',
  },
  messageText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    lineHeight: 20,
  },
  threadSection: {
    margin: 16,
    marginTop: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  threadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  threadTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  threadContainer: {
    height: 500,
  },
});
