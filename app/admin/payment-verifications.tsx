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
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { supabase, getDisplayName } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';

export default function PaymentVerificationsScreen() {
  const { user } = useAuth();
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // pending, approved, rejected, all
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [actionType, setActionType] = useState(''); // approve, reject

  useEffect(() => {
    fetchVerifications();
  }, [filter]);

  const fetchVerifications = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('payment_verifications')
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            email,
            package_tier
          )
        `)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setVerifications(data || []);
    } catch (error) {
      console.error('Error fetching verifications:', error);
      Alert.alert('Error', 'Failed to load payment verifications');
    } finally {
      setLoading(false);
    }
  };

  const openApproveModal = (verification) => {
    setSelectedVerification(verification);
    setActionType('approve');
    setAdminNotes('');
    setModalVisible(true);
  };

  const openRejectModal = (verification) => {
    setSelectedVerification(verification);
    setActionType('reject');
    setAdminNotes('');
    setModalVisible(true);
  };

  const handleApprove = async () => {
    if (!selectedVerification) return;

    try {
      const { error } = await supabase.rpc('approve_payment_verification', {
        p_verification_id: selectedVerification.id,
        p_admin_notes: adminNotes || null,
      });

      if (error) throw error;

      Alert.alert('Success', 'Payment verification approved successfully!');
      setModalVisible(false);
      fetchVerifications();
    } catch (error) {
      console.error('Error approving payment:', error);
      Alert.alert('Error', error.message || 'Failed to approve payment');
    }
  };

  const handleReject = async () => {
    if (!selectedVerification) return;
    if (!adminNotes.trim()) {
      Alert.alert('Required', 'Please provide a reason for rejection');
      return;
    }

    try {
      const { error } = await supabase.rpc('reject_payment_verification', {
        p_verification_id: selectedVerification.id,
        p_admin_notes: adminNotes,
      });

      if (error) throw error;

      Alert.alert('Success', 'Payment verification rejected');
      setModalVisible(false);
      fetchVerifications();
    } catch (error) {
      console.error('Error rejecting payment:', error);
      Alert.alert('Error', error.message || 'Failed to reject payment');
    }
  };

  const getTierColor = (tier) => {
    const colors = {
      free: '#9CA3AF',
      bronze: '#CD7F32',
      silver: '#C0C0C0',
      gold: '#FFD700',
      premium: '#8B5CF6',
    };
    return colors[tier] || '#9CA3AF';
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#F59E0B',
      approved: '#10B981',
      rejected: '#EF4444',
    };
    return colors[status] || '#9CA3AF';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderVerification = ({ item }) => {
    const tierColor = getTierColor(item.package_tier);
    const statusColor = getStatusColor(item.status);

    return (
      <View style={styles.card}>
        {/* User Info */}
        <View style={styles.cardHeader}>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{getDisplayName(item.profiles) || 'Unknown User'}</Text>
            <Text style={styles.userEmail}>{item.profiles?.email}</Text>
            <Text style={styles.currentTier}>
              Current: {item.profiles?.package_tier?.toUpperCase() || 'FREE'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>

        {/* Package Details */}
        <View style={styles.packageInfo}>
          <View style={[styles.tierBadge, { backgroundColor: tierColor }]}>
            <Text style={styles.tierText}>{item.package_tier.toUpperCase()}</Text>
          </View>
          <Text style={styles.amount}>
            {item.currency} {item.amount?.toFixed(2)}
          </Text>
        </View>

        {/* Payment Proof */}
        {item.payment_proof_url && (
          <TouchableOpacity style={styles.proofContainer}>
            <Ionicons name="image" size={20} color="#4169E1" />
            <Text style={styles.proofText}>View Payment Proof</Text>
          </TouchableOpacity>
        )}

        {/* Admin Notes (if exists) */}
        {item.admin_notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Admin Notes:</Text>
            <Text style={styles.notesText}>{item.admin_notes}</Text>
          </View>
        )}

        {/* Meta Info */}
        <View style={styles.metaInfo}>
          <Text style={styles.metaText}>Submitted: {formatDate(item.created_at)}</Text>
          {item.verified_at && (
            <Text style={styles.metaText}>Verified: {formatDate(item.verified_at)}</Text>
          )}
        </View>

        {/* Action Buttons */}
        {item.status === 'pending' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.approveBtn]}
              onPress={() => openApproveModal(item)}
            >
              <Ionicons name="checkmark-circle" size={20} color="#FFF" />
              <Text style={styles.actionBtnText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => openRejectModal(item)}
            >
              <Ionicons name="close-circle" size={20} color="#FFF" />
              <Text style={styles.actionBtnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Payment Verifications</Text>
        <Text style={styles.headerSubtitle}>Review and approve user payments</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        {['pending', 'approved', 'rejected', 'all'].map((status) => (
          <TouchableOpacity
            key={status}
            style={[styles.filterTab, filter === status && styles.filterTabActive]}
            onPress={() => setFilter(status)}
          >
            <Text style={[styles.filterTabText, filter === status && styles.filterTabTextActive]}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={verifications}
        renderItem={renderVerification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchVerifications} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="wallet-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>No {filter !== 'all' ? filter : ''} verifications</Text>
          </View>
        }
      />

      {/* Action Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {actionType === 'approve' ? 'Approve Payment' : 'Reject Payment'}
            </Text>

            {selectedVerification && (
              <View style={styles.modalInfo}>
                <Text style={styles.modalLabel}>User:</Text>
                <Text style={styles.modalValue}>{getDisplayName(selectedVerification.profiles)}</Text>
                <Text style={styles.modalLabel}>Package:</Text>
                <Text style={styles.modalValue}>{selectedVerification.package_tier.toUpperCase()}</Text>
                <Text style={styles.modalLabel}>Amount:</Text>
                <Text style={styles.modalValue}>
                  {selectedVerification.currency} {selectedVerification.amount?.toFixed(2)}
                </Text>
              </View>
            )}

            <TextInput
              style={styles.modalInput}
              placeholder={
                actionType === 'approve'
                  ? 'Optional notes (e.g., reference number)'
                  : 'Reason for rejection (required)'
              }
              multiline
              numberOfLines={4}
              value={adminNotes}
              onChangeText={setAdminNotes}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  actionType === 'approve' ? styles.modalApproveBtn : styles.modalRejectBtn,
                ]}
                onPress={actionType === 'approve' ? handleApprove : handleReject}
              >
                <Text style={styles.modalConfirmText}>
                  {actionType === 'approve' ? 'Approve' : 'Reject'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFF',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  filterTabActive: {
    backgroundColor: '#4169E1',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterTabTextActive: {
    color: '#FFF',
  },
  listContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  userEmail: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  currentTier: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  packageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  tierBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  tierText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  proofContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#EBF0FF',
    borderRadius: 8,
    marginBottom: 12,
  },
  proofText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4169E1',
  },
  notesContainer: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#111827',
  },
  metaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metaText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  approveBtn: {
    backgroundColor: '#10B981',
  },
  rejectBtn: {
    backgroundColor: '#EF4444',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    minHeight: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },
  modalInfo: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 8,
  },
  modalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 2,
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalApproveBtn: {
    backgroundColor: '#10B981',
  },
  modalRejectBtn: {
    backgroundColor: '#EF4444',
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
});
