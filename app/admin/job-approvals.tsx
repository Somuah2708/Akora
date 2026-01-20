import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { supabase } from '../../lib/supabase';
import { CheckCircle, XCircle, Eye, ArrowLeft, Clock } from 'lucide-react-native';

interface PendingJob {
  id: string;
  title: string;
  description: string;
  company?: string;
  location?: string;
  price: number;
  image_url: string;
  category_name: string;
  created_at: string;
  user_id: string;
  creator_email: string;
}

export default function JobApprovalsScreen() {
  const [pendingJobs, setPendingJobs] = useState<PendingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<PendingJob | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'decline' | null>(null);
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [adminId, setAdminId] = useState<string | null>(null);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Please log in to access this page');
        debouncedRouter.back();
        return;
      }

      // Check if user is admin
      const { data: adminRole, error } = await supabase
        .from('admin_roles')
        .select('*')
        .eq('user_id', user.id)
        .eq('can_approve_jobs', true)
        .single();

      if (error || !adminRole) {
        Alert.alert('Access Denied', 'You do not have permission to approve jobs');
        debouncedRouter.back();
        return;
      }

      setAdminId(user.id);
      loadPendingJobs(user.id);
    } catch (error) {
      console.error('Error checking admin status:', error);
      Alert.alert('Error', 'Failed to verify admin permissions');
      debouncedRouter.back();
    }
  };

  const loadPendingJobs = async (userId: string) => {
    try {
      setLoading(true);
      
      // Call the get_pending_jobs function
      const { data, error } = await supabase
        .rpc('get_pending_jobs', { p_admin_id: userId });

      if (error) throw error;

      setPendingJobs(data || []);
    } catch (error) {
      console.error('Error loading pending jobs:', error);
      Alert.alert('Error', 'Failed to load pending jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleJobAction = (job: PendingJob, action: 'approve' | 'decline') => {
    setSelectedJob(job);
    setActionType(action);
    setNotes('');
    setModalVisible(true);
  };

  const confirmAction = async () => {
    if (!selectedJob || !actionType || !adminId) return;

    try {
      setProcessing(true);

      const functionName = actionType === 'approve' ? 'approve_job' : 'decline_job';
      
      const { data, error } = await supabase.rpc(functionName, {
        p_job_id: selectedJob.id,
        p_admin_id: adminId,
        p_notes: notes.trim() || null,
      });

      if (error) throw error;

      Alert.alert(
        'Success',
        `Job ${actionType === 'approve' ? 'approved' : 'declined'} successfully!\n\nThe creator will receive an email notification.`
      );

      // Remove the job from the list
      setPendingJobs(prev => prev.filter(job => job.id !== selectedJob.id));
      
      setModalVisible(false);
      setSelectedJob(null);
      setNotes('');
    } catch (error: any) {
      console.error('Error processing job action:', error);
      Alert.alert('Error', error.message || 'Failed to process job action');
    } finally {
      setProcessing(false);
    }
  };

  const renderJobCard = ({ item }: { item: PendingJob }) => {
    // Parse images
    let images = [];
    if (item.image_url) {
      try {
        if (item.image_url.startsWith('[')) {
          const parsed = JSON.parse(item.image_url);
          images = Array.isArray(parsed) ? parsed : [item.image_url];
        } else {
          images = [item.image_url];
        }
      } catch (e) {
        images = [item.image_url];
      }
    }
    if (images.length === 0) {
      images = ['https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800'];
    }

    // Use company and location directly from jobs table
    const company = item.company || 'Company';
    const location = item.location || 'Location';

    // Calculate time ago
    const createdDate = new Date(item.created_at);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60));
    const timeAgo = diffMinutes < 60 
      ? `${diffMinutes} minutes ago`
      : diffMinutes < 1440
      ? `${Math.floor(diffMinutes / 60)} hours ago`
      : `${Math.floor(diffMinutes / 1440)} days ago`;

    return (
      <View style={styles.jobCard}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageContainer}>
          {images.map((uri, idx) => (
            <Image
              key={uri + idx}
              source={{ uri }}
              style={styles.jobImage}
            />
          ))}
        </ScrollView>
        
        <View style={styles.jobInfo}>
          <Text style={styles.jobTitle}>{item.title}</Text>
          <Text style={styles.company}>{company}</Text>
          <Text style={styles.location}>{location}</Text>
          
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.category}>{item.category_name}</Text>
            </View>
            {item.price > 0 && (
              <Text style={styles.price}>₵{item.price}/month</Text>
            )}
          </View>

          <View style={styles.timeRow}>
            <Clock size={14} color="#666666" />
            <Text style={styles.timeText}>{timeAgo}</Text>
          </View>

          {item.creator_email && (
            <Text style={styles.email}>Creator: {item.creator_email}</Text>
          )}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.viewButton}
            onPress={() => debouncedRouter.push(`/workplace/${item.id}`)}
          >
            <Eye size={18} color="#4169E1" />
            <Text style={styles.viewButtonText}>View Details</Text>
          </TouchableOpacity>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.approveButton}
              onPress={() => handleJobAction(item, 'approve')}
            >
              <CheckCircle size={20} color="#FFFFFF" />
              <Text style={styles.approveButtonText}>Approve</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.declineButton}
              onPress={() => handleJobAction(item, 'decline')}
            >
              <XCircle size={20} color="#FFFFFF" />
              <Text style={styles.declineButtonText}>Decline</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0F172A" />
          <Text style={styles.loadingText}>Loading pending jobs...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Approvals</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{pendingJobs.length}</Text>
        </View>
      </View>

      {pendingJobs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <CheckCircle size={64} color="#CCCCCC" />
          <Text style={styles.emptyTitle}>All Caught Up!</Text>
          <Text style={styles.emptyText}>No pending job approvals at this time</Text>
        </View>
      ) : (
        <FlatList
          data={pendingJobs}
          renderItem={renderJobCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {actionType === 'approve' ? 'Approve Job' : 'Decline Job'}
            </Text>
            
            <Text style={styles.modalJobTitle}>{selectedJob?.title}</Text>
            
            <Text style={styles.modalLabel}>
              {actionType === 'approve' ? 'Approval Notes (Optional)' : 'Reason for Decline'}
            </Text>
            <TextInput
              style={styles.notesInput}
              placeholder={actionType === 'approve' 
                ? 'Add any notes for the creator...'
                : 'Please provide a reason for declining this job...'}
              placeholderTextColor="#999999"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
                disabled={processing}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  actionType === 'decline' && styles.confirmDeclineButton,
                  processing && styles.disabledButton,
                ]}
                onPress={confirmAction}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmButtonText}>
                    {actionType === 'approve' ? 'Approve' : 'Decline'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  badge: {
    backgroundColor: '#4169E1',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginTop: 8,
  },
  listContent: {
    padding: 16,
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    height: 200,
  },
  jobImage: {
    width: 300,
    height: 200,
    resizeMode: 'cover',
  },
  jobInfo: {
    padding: 16,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  company: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metaItem: {
    flex: 1,
  },
  category: {
    fontSize: 14,
    color: '#4169E1',
    fontWeight: '500',
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeText: {
    fontSize: 12,
    color: '#666666',
    marginLeft: 4,
  },
  email: {
    fontSize: 12,
    color: '#666666',
    fontStyle: 'italic',
  },
  actions: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginBottom: 12,
  },
  viewButtonText: {
    fontSize: 14,
    color: '#4169E1',
    marginLeft: 8,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  approveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  declineButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  modalJobTitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 8,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#10B981',
    alignItems: 'center',
  },
  confirmDeclineButton: {
    backgroundColor: '#EF4444',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  disabledButton: {
    opacity: 0.5,
  },
});
