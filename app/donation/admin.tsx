import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
  StatusBar as RNStatusBar,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { debouncedRouter } from '@/utils/navigationDebounce';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Trophy,
  AlertCircle,
  FileText,
  Calendar,
  DollarSign,
  User,
  X,
  Plus,
  Settings,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

interface Donation {
  id: string;
  user_id: string;
  campaign_id: string;
  amount: number;
  payment_method: string;
  payment_proof_url: string;
  is_anonymous: boolean;
  donor_message: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  campaign_title?: string;
  donor_name?: string;
  donor_avatar?: string;
}

interface Campaign {
  id: string;
  title: string;
  is_featured: boolean;
  status: string;
  current_amount: number;
  goal_amount: number;
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

export default function AdminDonationScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [donations, setDonations] = useState<Donation[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('pending');
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  useEffect(() => {
    loadData();
  }, [filterStatus]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchDonations(),
        fetchCampaigns(),
        fetchStats(),
      ]);
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const fetchDonations = async () => {
    try {
      let query = supabase
        .from('donations')
        .select('*')
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      if (!data || data.length === 0) {
        setDonations([]);
        return;
      }

      // Get campaign titles
      const campaignIds = [...new Set(data.map(d => d.campaign_id))];
      const { data: campaignsData } = await supabase
        .from('donation_campaigns')
        .select('id, title')
        .in('id', campaignIds);

      const campaignMap = new Map();
      campaignsData?.forEach(c => campaignMap.set(c.id, c.title));

      // Get donor profiles (non-anonymous only)
      const userIds = [...new Set(
        data.filter(d => !d.is_anonymous && d.user_id).map(d => d.user_id)
      )];

      let profileMap = new Map();
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);

        profilesData?.forEach(p => profileMap.set(p.id, p));
      }

      // Format donations
      const formattedDonations = data.map(donation => ({
        ...donation,
        campaign_title: campaignMap.get(donation.campaign_id) || 'Unknown Campaign',
        donor_name: donation.is_anonymous ? 'Anonymous Donor' : 
          (profileMap.get(donation.user_id)?.full_name || 'Unknown'),
        donor_avatar: donation.is_anonymous ? null : 
          (profileMap.get(donation.user_id)?.avatar_url || null),
      }));

      setDonations(formattedDonations);
    } catch (error) {
      console.error('Error fetching donations:', error);
    }
  };

  const fetchCampaigns = async () => {
    try {
      // Fetch ALL campaigns
      const { data: allCampaigns } = await supabase
        .from('donation_campaigns')
        .select('id, title, is_featured, status, current_amount, goal_amount')
        .order('is_featured', { ascending: false });

      if (!allCampaigns) return;

      // Fetch all donations to calculate actual completion
      const { data: allDonations } = await supabase
        .from('donations')
        .select('campaign_id, amount')
        .eq('status', 'approved');

      // Group donations by campaign
      const donationsByCampaign = new Map();
      allDonations?.forEach(donation => {
        if (!donationsByCampaign.has(donation.campaign_id)) {
          donationsByCampaign.set(donation.campaign_id, 0);
        }
        donationsByCampaign.set(
          donation.campaign_id,
          donationsByCampaign.get(donation.campaign_id) + donation.amount
        );
      });

      // Update campaigns with actual amounts and filter to incomplete ones
      const activeCampaigns = allCampaigns
        .map(campaign => ({
          ...campaign,
          current_amount: donationsByCampaign.get(campaign.id) || 0,
        }))
        .filter(campaign => campaign.current_amount < campaign.goal_amount);

      console.log('📋 Admin - Active campaigns:', activeCampaigns.length);
      setCampaigns(activeCampaigns);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }
  };

  const fetchStats = async () => {
    const { data } = await supabase
      .from('donations')
      .select('status');

    if (data) {
      const pending = data.filter(d => d.status === 'pending').length;
      const approved = data.filter(d => d.status === 'approved').length;
      const rejected = data.filter(d => d.status === 'rejected').length;

      setStats({ pending, approved, rejected });
    }
  };

  const handleViewDetails = (donation: Donation) => {
    debouncedRouter.push(`/donation/donation-details?id=${donation.id}`);
  };

  const handleApprovalAction = (donation: Donation, type: 'approve' | 'reject') => {
    setSelectedDonation(donation);
    setActionType(type);
    setAdminNotes('');
    setShowApprovalModal(true);
  };

  const processDonation = async () => {
    if (!selectedDonation || !user) return;

    try {
      setProcessing(true);

      const updateData: any = {
        status: actionType === 'approve' ? 'approved' : 'rejected',
        admin_notes: adminNotes.trim() || null,
        approved_by: user.id,
      };

      if (actionType === 'approve') {
        updateData.approved_at = new Date().toISOString();
      } else {
        updateData.rejected_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('donations')
        .update(updateData)
        .eq('id', selectedDonation.id);

      if (error) throw error;

      Alert.alert(
        'Success',
        `Donation ${actionType === 'approve' ? 'approved' : 'rejected'} successfully!`
      );

      setShowApprovalModal(false);
      setShowDetailsModal(false);
      setSelectedDonation(null);
      setAdminNotes('');
      await loadData();
    } catch (error) {
      console.error('Error processing donation:', error);
      Alert.alert('Error', 'Failed to process donation. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const toggleFeaturedCampaign = async (campaignId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('donation_campaigns')
        .update({ is_featured: !currentStatus })
        .eq('id', campaignId);

      if (error) throw error;

      Alert.alert('Success', `Campaign ${!currentStatus ? 'featured' : 'unfeatured'} successfully!`);
      await fetchCampaigns();
    } catch (error) {
      console.error('Error toggling featured campaign:', error);
      Alert.alert('Error', 'Failed to update campaign.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'approved': return '#10B981';
      case 'rejected': return '#EF4444';
      default: return '#94A3B8';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return Clock;
      case 'approved': return CheckCircle;
      case 'rejected': return XCircle;
      default: return AlertCircle;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffc857" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <RNStatusBar barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient
        colors={['#0F172A', '#1E293B']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => debouncedRouter.back()}
          >
            <ChevronLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Shield size={20} color="#ffc857" />
            <Text style={styles.headerTitle}>Admin Dashboard</Text>
          </View>
          <TouchableOpacity 
            style={styles.createButton}
            onPress={() => debouncedRouter.push('/donation/create-campaign')}
          >
            <Plus size={20} color="#0F172A" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ffc857"
            colors={['#ffc857']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Clock size={24} color="#F59E0B" />
            <Text style={styles.statValue}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <CheckCircle size={24} color="#10B981" />
            <Text style={styles.statValue}>{stats.approved}</Text>
            <Text style={styles.statLabel}>Approved</Text>
          </View>
          <View style={styles.statCard}>
            <XCircle size={24} color="#EF4444" />
            <Text style={styles.statValue}>{stats.rejected}</Text>
            <Text style={styles.statLabel}>Rejected</Text>
          </View>
        </View>

        {/* Payment Settings Button */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity
            style={styles.paymentSettingsButton}
            onPress={() => debouncedRouter.push('/donation/payment-settings')}
          >
            <View style={styles.paymentSettingsIcon}>
              <DollarSign size={20} color="#ffc857" />
            </View>
            <View style={styles.paymentSettingsTextContainer}>
              <Text style={styles.paymentSettingsTitle}>Payment Settings</Text>
              <Text style={styles.paymentSettingsSubtitle}>
                Manage bank accounts and mobile money numbers
              </Text>
            </View>
            <Settings size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {(['all', 'pending', 'approved', 'rejected'] as FilterStatus[]).map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterTab,
                  filterStatus === status && styles.filterTabActive,
                ]}
                onPress={() => setFilterStatus(status)}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    filterStatus === status && styles.filterTabTextActive,
                  ]}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Donations List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {filterStatus === 'all' ? 'All' : filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)} Donations
          </Text>
          
          {donations.length === 0 ? (
            <View style={styles.emptyState}>
              <FileText size={48} color="#CBD5E1" />
              <Text style={styles.emptyStateTitle}>No donations found</Text>
              <Text style={styles.emptyStateText}>
                {filterStatus === 'pending' ? 'No pending donations to review' : `No ${filterStatus} donations`}
              </Text>
            </View>
          ) : (
            donations.map((donation) => {
              const StatusIcon = getStatusIcon(donation.status);
              return (
                <View key={donation.id} style={styles.donationCard}>
                  {/* Donor Info */}
                  <View style={styles.donationHeader}>
                    {donation.donor_avatar && !donation.is_anonymous ? (
                      <Image 
                        source={{ uri: donation.donor_avatar }} 
                        style={styles.donorAvatar}
                      />
                    ) : (
                      <View style={styles.donorAvatarPlaceholder}>
                        <User size={20} color="#64748B" />
                      </View>
                    )}
                    <View style={styles.donorInfo}>
                      <Text style={styles.donorName}>{donation.donor_name}</Text>
                      <Text style={styles.campaignName}>{donation.campaign_title}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(donation.status) + '20' }]}>
                      <StatusIcon size={14} color={getStatusColor(donation.status)} />
                      <Text style={[styles.statusText, { color: getStatusColor(donation.status) }]}>
                        {donation.status}
                      </Text>
                    </View>
                  </View>

                  {/* Amount & Date */}
                  <View style={styles.donationDetails}>
                    <View style={styles.detailRow}>
                      <DollarSign size={16} color="#64748B" />
                      <Text style={styles.detailText}>GH₵ {donation.amount.toLocaleString()}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Calendar size={16} color="#64748B" />
                      <Text style={styles.detailText}>{formatDate(donation.created_at)}</Text>
                    </View>
                  </View>

                  {/* Actions */}
                  <View style={styles.actionsContainer}>
                    <TouchableOpacity
                      style={styles.actionButtonSecondary}
                      onPress={() => handleViewDetails(donation)}
                    >
                      <Eye size={16} color="#0F172A" />
                      <Text style={styles.actionButtonSecondaryText}>View Details</Text>
                    </TouchableOpacity>

                    {donation.status === 'pending' && (
                      <>
                        <TouchableOpacity
                          style={styles.actionButtonApprove}
                          onPress={() => handleApprovalAction(donation, 'approve')}
                        >
                          <CheckCircle size={16} color="#FFFFFF" />
                          <Text style={styles.actionButtonText}>Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionButtonReject}
                          onPress={() => handleApprovalAction(donation, 'reject')}
                        >
                          <XCircle size={16} color="#FFFFFF" />
                          <Text style={styles.actionButtonText}>Reject</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Campaign Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Campaign Management</Text>
          {campaigns.map((campaign) => (
            <View key={campaign.id} style={styles.campaignCard}>
              <View style={styles.campaignInfo}>
                <Text style={styles.campaignTitle}>{campaign.title}</Text>
                <Text style={styles.campaignProgress}>
                  GH₵ {campaign.current_amount.toLocaleString()} / GH₵ {campaign.goal_amount.toLocaleString()}
                </Text>
                <Text style={styles.campaignStatus}>Status: {campaign.status}</Text>
              </View>
              <View style={styles.campaignActions}>
                <TouchableOpacity
                  style={styles.editCampaignButton}
                  onPress={() => router.push(`/donation/edit-campaign/${campaign.id}`)}
                >
                  <Eye size={14} color="#0F172A" />
                  <Text style={styles.editCampaignButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.featureButton,
                    campaign.is_featured && styles.featureButtonActive,
                  ]}
                  onPress={() => toggleFeaturedCampaign(campaign.id, campaign.is_featured)}
                >
                  <Trophy size={14} color={campaign.is_featured ? '#ffc857' : '#64748B'} />
                  <Text style={[
                    styles.featureButtonText,
                    campaign.is_featured && styles.featureButtonTextActive,
                  ]}>
                    {campaign.is_featured ? 'Featured' : 'Feature'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Details Modal */}
      <Modal
        visible={showDetailsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Donation Details</Text>
              <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
                <X size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {selectedDonation && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Receipt Image */}
                {selectedDonation.payment_proof_url && (
                  <View style={styles.receiptContainer}>
                    <Text style={styles.modalLabel}>Payment Receipt</Text>
                    <TouchableOpacity 
                      onPress={() => {
                        console.log('Receipt image tapped, opening full screen');
                        setFullScreenImage(selectedDonation.payment_proof_url);
                      }}
                      activeOpacity={0.7}
                      style={{ width: '100%' }}
                    >
                      <Image
                        source={{ uri: selectedDonation.payment_proof_url }}
                        style={styles.receiptImage}
                        resizeMode="contain"
                      />
                      <View style={styles.tapToEnlargeContainer}>
                        <Text style={styles.tapToEnlargeText}>👆 Tap to enlarge</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Donor Message */}
                {selectedDonation.donor_message && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Donor Message</Text>
                    <Text style={styles.modalValue}>{selectedDonation.donor_message}</Text>
                  </View>
                )}

                {/* Payment Method */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Payment Method</Text>
                  <Text style={styles.modalValue}>{selectedDonation.payment_method.replace('_', ' ').toUpperCase()}</Text>
                </View>

                {/* Admin Notes */}
                {selectedDonation.admin_notes && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Admin Notes</Text>
                    <Text style={styles.modalValue}>{selectedDonation.admin_notes}</Text>
                  </View>
                )}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowDetailsModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Approval Modal */}
      <Modal
        visible={showApprovalModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowApprovalModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>
                      {actionType === 'approve' ? 'Approve' : 'Reject'} Donation
                    </Text>
                    <TouchableOpacity onPress={() => setShowApprovalModal(false)}>
                      <X size={24} color="#64748B" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.modalBody}>
                    <Text style={styles.modalLabel}>Admin Notes (Optional)</Text>
                    <TextInput
                      style={styles.notesInput}
                      placeholder={`Add notes about this ${actionType === 'approve' ? 'approval' : 'rejection'}...`}
                      value={adminNotes}
                      onChangeText={setAdminNotes}
                      multiline
                      numberOfLines={4}
                      maxLength={500}
                    />
                    <Text style={styles.charCount}>{adminNotes.length}/500</Text>
                  </View>

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={styles.modalCancelButton}
                      onPress={() => setShowApprovalModal(false)}
                      disabled={processing}
                    >
                      <Text style={styles.modalCancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.modalConfirmButton,
                        { backgroundColor: actionType === 'approve' ? '#10B981' : '#EF4444' },
                        processing && styles.modalConfirmButtonDisabled,
                      ]}
                      onPress={processDonation}
                      disabled={processing}
                    >
                      {processing ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.modalConfirmButtonText}>
                          {actionType === 'approve' ? 'Approve' : 'Reject'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Full Screen Image Modal */}
      <Modal
        visible={fullScreenImage !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          console.log('Full screen modal closing');
          setFullScreenImage(null);
        }}
      >
        <SafeAreaView style={styles.fullScreenModalContainer} edges={[]}>
          <RNStatusBar barStyle="light-content" />
          
          <TouchableOpacity 
            style={styles.fullScreenCloseButton}
            onPress={() => {
              console.log('Close button pressed');
              setFullScreenImage(null);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.fullScreenCloseButtonCircle}>
              <X size={32} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.fullScreenTapArea}
            activeOpacity={1}
            onPress={() => {
              console.log('Background tapped');
              setFullScreenImage(null);
            }}
          >
            {fullScreenImage && (
              <Image 
                source={{ uri: fullScreenImage }} 
                style={styles.fullScreenImageStyle}
                resizeMode="contain"
              />
            )}
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    padding: 8,
  },
  createButton: {
    width: 40,
    height: 40,
    backgroundColor: '#ffc857',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  paymentSettingsButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  paymentSettingsIcon: {
    width: 44,
    height: 44,
    backgroundColor: '#FEF3C7',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentSettingsTextContainer: {
    flex: 1,
  },
  paymentSettingsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  paymentSettingsSubtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  filterContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  filterTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
    marginRight: 8,
  },
  filterTabActive: {
    backgroundColor: '#0F172A',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },
  donationCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  donationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  donorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  donorAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  donorInfo: {
    flex: 1,
  },
  donorName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  campaignName: {
    fontSize: 13,
    color: '#64748B',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  donationDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#64748B',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  actionButtonSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  actionButtonApprove: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#10B981',
  },
  actionButtonReject: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  campaignCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  campaignInfo: {
    flex: 1,
    marginBottom: 12,
  },
  campaignTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  campaignProgress: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
  },
  campaignStatus: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  campaignActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editCampaignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffc857',
  },
  editCampaignButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  featureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  featureButtonActive: {
    backgroundColor: '#FFF9E6',
    borderWidth: 1,
    borderColor: '#ffc857',
  },
  featureButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  featureButtonTextActive: {
    color: '#0F172A',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
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
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalBody: {
    padding: 20,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
  },
  modalValue: {
    fontSize: 15,
    color: '#0F172A',
    lineHeight: 22,
  },
  receiptContainer: {
    marginBottom: 20,
  },
  receiptImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  tapToEnlargeContainer: {
    backgroundColor: 'rgba(255, 200, 87, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  tapToEnlargeText: {
    fontSize: 13,
    color: '#ffc857',
    fontWeight: '700',
    textAlign: 'center',
  },
  notesInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#0F172A',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'right',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalConfirmButtonDisabled: {
    opacity: 0.6,
  },
  modalConfirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalCloseButton: {
    margin: 20,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  fullScreenModalContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenTapArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    zIndex: 100,
    elevation: 100,
  },
  fullScreenCloseButtonCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImageStyle: {
    width: width * 0.95,
    height: height * 0.9,
  },
});
