import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { ArrowLeft, Users, Lock, Globe, Calendar, MessageCircle, UserPlus, X } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useRouter, useLocalSearchParams } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;

interface Circle {
  id: string;
  name: string;
  description: string;
  category: string;
  image_url?: string;
  is_private: boolean;
  created_by: string;
  created_at: string;
  member_count?: number;
  is_member?: boolean;
  has_pending_request?: boolean;
  group_chat_id?: string;
  creator_profile?: {
    full_name: string;
    username: string;
  };
}

export default function CircleDetailScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [circle, setCircle] = useState<Circle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCircleDetails();
  }, [id]);

  const fetchCircleDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch circle details
      const { data: circleData, error: circleError } = await supabase
        .from('circles')
        .select(`
          *,
          creator_profile:profiles!created_by(full_name, username)
        `)
        .eq('id', id)
        .single();

      if (circleError) throw circleError;

      // Check if user is a member
      let isMember = false;
      let hasPendingRequest = false;
      
      if (user) {
        const { data: memberData } = await supabase
          .from('circle_members')
          .select('id')
          .eq('circle_id', id)
          .eq('user_id', user.id)
          .single();
        
        isMember = !!memberData;

        // Check for pending join request
        const { data: requestData } = await supabase
          .from('circle_join_requests')
          .select('id')
          .eq('circle_id', id)
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .single();
        
        hasPendingRequest = !!requestData;
      }

      // Get member count
      const { count } = await supabase
        .from('circle_members')
        .select('*', { count: 'exact', head: true })
        .eq('circle_id', id);

      setCircle({
        ...circleData,
        member_count: count || 0,
        is_member: isMember,
        has_pending_request: hasPendingRequest,
      });
    } catch (error: any) {
      console.error('Error fetching circle:', error);
      Alert.alert('Error', 'Failed to load circle details');
      debouncedRouter.back();
    } finally {
      setLoading(false);
    }
  };

  const joinCircle = async () => {
    if (!user || !circle) return;

    try {
      if (circle.is_private) {
        // Send join request
        const { error } = await supabase
          .from('circle_join_requests')
          .insert({
            circle_id: circle.id,
            user_id: user.id,
            status: 'pending',
          });

        if (error) throw error;

        Alert.alert('Request Sent', 'Your join request has been sent to the circle admin');
        fetchCircleDetails();
      } else {
        // Join directly
        const { error } = await supabase
          .from('circle_members')
          .insert({
            circle_id: circle.id,
            user_id: user.id,
            role: 'member',
          });

        if (error) throw error;

        Alert.alert('Success', 'You have joined the circle!');
        fetchCircleDetails();
      }
    } catch (error: any) {
      console.error('Error joining circle:', error);
      Alert.alert('Error', error.message || 'Failed to join circle');
    }
  };

  const leaveCircle = async () => {
    if (!user || !circle) return;

    Alert.alert(
      'Leave Circle',
      'Are you sure you want to leave this circle?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('circle_members')
                .delete()
                .eq('circle_id', circle.id)
                .eq('user_id', user.id);

              if (error) throw error;

              Alert.alert('Success', 'You have left the circle');
              debouncedRouter.back();
            } catch (error: any) {
              console.error('Error leaving circle:', error);
              Alert.alert('Error', 'Failed to leave circle');
            }
          },
        },
      ]
    );
  };

  const openGroupChat = () => {
    if (!circle?.group_chat_id) {
      Alert.alert('No Chat', 'This circle does not have a group chat yet');
      return;
    }
    debouncedRouter.push(`/group-chat/${circle.group_chat_id}`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading circle...</Text>
      </View>
    );
  }

  if (!circle) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Circle Details</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Circle Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.titleRow}>
            <Text style={styles.circleName}>{circle.name}</Text>
            {circle.is_private ? (
              <Lock size={20} color="#666" />
            ) : (
              <Globe size={20} color="#10B981" />
            )}
          </View>
          
          <View style={styles.categoryRow}>
            <Text style={styles.category}>{circle.category}</Text>
            <View style={styles.memberCountBadge}>
              <Users size={14} color="#666" />
              <Text style={styles.memberCountText}>{circle.member_count} members</Text>
            </View>
          </View>

          <View style={styles.privacyBadge}>
            <Text style={styles.privacyText}>
              {circle.is_private ? '🔒 Private Circle' : '🌐 Public Circle'}
            </Text>
          </View>
        </View>

        {/* Description Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.description}>{circle.description}</Text>
        </View>

        {/* Creator Info */}
        {circle.creator_profile && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Created By</Text>
            <View style={styles.creatorCard}>
              <Text style={styles.creatorName}>{circle.creator_profile.full_name}</Text>
              <Text style={styles.creatorUsername}>@{circle.creator_profile.username}</Text>
            </View>
          </View>
        )}

        {/* Created Date */}
        <View style={styles.section}>
          <View style={styles.dateRow}>
            <Calendar size={16} color="#666" />
            <Text style={styles.dateText}>
              Created {new Date(circle.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Text>
          </View>
        </View>

        {/* Member Actions */}
        {circle.is_member && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.chatButton} onPress={openGroupChat}>
              <MessageCircle size={20} color="#FFFFFF" />
              <Text style={styles.chatButtonText}>Open Group Chat</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.leaveButton} onPress={leaveCircle}>
              <X size={20} color="#EF4444" />
              <Text style={styles.leaveButtonText}>Leave Circle</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Bottom Action Button */}
      {!circle.is_member && (
        <View style={styles.bottomAction}>
          {circle.has_pending_request ? (
            <View style={styles.pendingButton}>
              <Text style={styles.pendingButtonText}>Request Pending</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.joinButton} onPress={joinCircle}>
              <UserPlus size={20} color="#FFFFFF" />
              <Text style={styles.joinButtonText}>
                {circle.is_private ? 'Request to Join' : 'Join Circle'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
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
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  content: {
    flex: 1,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  circleName: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginRight: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  category: {
    fontSize: 15,
    fontWeight: '500',
    color: '#007AFF',
  },
  memberCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  memberCountText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  privacyBadge: {
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  privacyText: {
    fontSize: 13,
    color: '#0369A1',
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
  },
  creatorCard: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  creatorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  creatorUsername: {
    fontSize: 14,
    color: '#6B7280',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    color: '#6B7280',
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  chatButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    paddingVertical: 14,
    borderRadius: 12,
  },
  leaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  bottomAction: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  pendingButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  pendingButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
});
