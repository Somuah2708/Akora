import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
  StatusBar as RNStatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { debouncedRouter } from '@/utils/navigationDebounce';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Calendar,
  DollarSign,
  TrendingUp,
  Award,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Donation {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'rejected';
  payment_method: string;
  payment_proof_url: string | null;
  is_anonymous: boolean;
  donor_message: string | null;
  admin_notes: string | null;
  created_at: string;
  approved_at: string | null;
  campaign: {
    title: string;
    category: string;
  };
}

interface Stats {
  totalDonated: number;
  totalDonations: number;
  approvedCount: number;
  pendingCount: number;
}

const STATUS_CONFIG = {
  pending: {
    label: 'Pending Review',
    color: '#F59E0B',
    bgColor: '#FFF9E6',
    icon: Clock,
  },
  approved: {
    label: 'Approved',
    color: '#10B981',
    bgColor: '#ECFDF5',
    icon: CheckCircle,
  },
  rejected: {
    label: 'Rejected',
    color: '#EF4444',
    bgColor: '#FEE2E2',
    icon: XCircle,
  },
};

export default function MyDonationsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [donations, setDonations] = useState<Donation[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalDonated: 0,
    totalDonations: 0,
    approvedCount: 0,
    pendingCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    if (user?.id) {
      fetchDonations();
    } else {
      setLoading(false);
    }
  }, [user?.id]);

  const fetchDonations = async () => {
    if (!user?.id) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('donations')
        .select(`
          *,
          donation_campaigns!inner (
            title,
            category
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedDonations: Donation[] = data.map((d: any) => ({
        id: d.id,
        amount: d.amount,
        currency: d.currency,
        status: d.status,
        payment_method: d.payment_method,
        payment_proof_url: d.payment_proof_url,
        is_anonymous: d.is_anonymous,
        donor_message: d.donor_message,
        admin_notes: d.admin_notes,
        created_at: d.created_at,
        approved_at: d.approved_at,
        campaign: {
          title: d.donation_campaigns.title,
          category: d.donation_campaigns.category,
        },
      }));

      setDonations(formattedDonations);
      calculateStats(formattedDonations);
    } catch (error) {
      console.error('Error fetching donations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateStats = (donations: Donation[]) => {
    const approvedDonations = donations.filter(d => d.status === 'approved');
    const totalDonated = approvedDonations.reduce((sum, d) => sum + d.amount, 0);
    
    setStats({
      totalDonated,
      totalDonations: donations.length,
      approvedCount: approvedDonations.length,
      pendingCount: donations.filter(d => d.status === 'pending').length,
    });
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDonations();
  };

  const formatCurrency = (amount: number, currency: string = 'GHS') => {
    return `GH₵ ${amount.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

  const getFilteredDonations = () => {
    if (filter === 'all') return donations;
    return donations.filter(d => d.status === filter);
  };

  const filteredDonations = getFilteredDonations();

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
          <Text style={styles.headerTitle}>My Donations</Text>
          <View style={{ width: 40 }} />
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
          {/* Total Contributed - Full Width */}
          <View style={styles.statCardLarge}>
            <View style={styles.statIconContainerLarge}>
              <DollarSign size={28} color="#ffc857" />
            </View>
            <View style={styles.statTextContainer}>
              <Text style={styles.statValueLarge}>{formatCurrency(stats.totalDonated)}</Text>
              <Text style={styles.statLabelLarge}>Total Contributed</Text>
            </View>
          </View>

          {/* Approved and Pending - Side by Side */}
          <View style={styles.statsRow}>
            <View style={styles.statCardSmall}>
              <View style={styles.statIconContainer}>
                <TrendingUp size={20} color="#10B981" />
              </View>
              <Text style={styles.statValue}>{stats.approvedCount}</Text>
              <Text style={styles.statLabel}>Approved</Text>
            </View>

            <View style={styles.statCardSmall}>
              <View style={styles.statIconContainer}>
                <Clock size={20} color="#F59E0B" />
              </View>
              <Text style={styles.statValue}>{stats.pendingCount}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          </View>
        </View>

        {/* Recognition Badge */}
        {stats.totalDonated >= 1000 && (
          <View style={styles.badgeContainer}>
            <View style={styles.badge}>
              <Award size={28} color="#FFD700" />
              <View style={styles.badgeTextContainer}>
                <Text style={styles.badgeTitle}>Gold Benefactor</Text>
                <Text style={styles.badgeSubtext}>Thank you for your generous support! 🏆</Text>
              </View>
            </View>
          </View>
        )}

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
              onPress={() => setFilter('all')}
            >
              <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
                All ({donations.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, filter === 'pending' && styles.filterTabActive]}
              onPress={() => setFilter('pending')}
            >
              <Text style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>
                Pending ({stats.pendingCount})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, filter === 'approved' && styles.filterTabActive]}
              onPress={() => setFilter('approved')}
            >
              <Text style={[styles.filterText, filter === 'approved' && styles.filterTextActive]}>
                Approved ({stats.approvedCount})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, filter === 'rejected' && styles.filterTabActive]}
              onPress={() => setFilter('rejected')}
            >
              <Text style={[styles.filterText, filter === 'rejected' && styles.filterTextActive]}>
                Rejected ({donations.filter(d => d.status === 'rejected').length})
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Donations List */}
        <View style={styles.listContainer}>
          {filteredDonations.length === 0 ? (
            <View style={styles.emptyState}>
              <FileText size={48} color="#CBD5E1" />
              <Text style={styles.emptyStateTitle}>No donations yet</Text>
              <Text style={styles.emptyStateText}>
                {filter === 'all' 
                  ? "Start making a difference by donating to a campaign!"
                  : `You don't have any ${filter} donations.`}
              </Text>
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={() => debouncedRouter.push('/donation')}
              >
                <Text style={styles.emptyStateButtonText}>Browse Campaigns</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredDonations.map((donation) => {
              const statusConfig = STATUS_CONFIG[donation.status];
              const StatusIcon = statusConfig.icon;

              return (
                <View key={donation.id} style={styles.donationCard}>
                  {/* Status Badge */}
                  <View 
                    style={[
                      styles.statusBadge, 
                      { backgroundColor: statusConfig.bgColor }
                    ]}
                  >
                    <StatusIcon size={14} color={statusConfig.color} />
                    <Text style={[styles.statusText, { color: statusConfig.color }]}>
                      {statusConfig.label}
                    </Text>
                  </View>

                  {/* Campaign Title */}
                  <Text style={styles.campaignTitle}>{donation.campaign.title}</Text>
                  <Text style={styles.campaignCategory}>{donation.campaign.category}</Text>

                  {/* Amount */}
                  <View style={styles.amountContainer}>
                    <Text style={styles.amount}>{formatCurrency(donation.amount, donation.currency)}</Text>
                    {donation.is_anonymous && (
                      <View style={styles.anonymousBadge}>
                        <Text style={styles.anonymousText}>Anonymous</Text>
                      </View>
                    )}
                  </View>

                  {/* Date and Payment Method */}
                  <View style={styles.detailsRow}>
                    <View style={styles.detailItem}>
                      <Calendar size={14} color="#64748B" />
                      <Text style={styles.detailText}>{formatDate(donation.created_at)}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <FileText size={14} color="#64748B" />
                      <Text style={styles.detailText}>
                        {donation.payment_method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Text>
                    </View>
                  </View>

                  {/* Message */}
                  {donation.donor_message && (
                    <View style={styles.messageContainer}>
                      <Text style={styles.messageLabel}>Your Message:</Text>
                      <Text style={styles.messageText}>{donation.donor_message}</Text>
                    </View>
                  )}

                  {/* Admin Notes */}
                  {donation.admin_notes && (
                    <View style={styles.adminNotesContainer}>
                      <Text style={styles.adminNotesLabel}>Admin Note:</Text>
                      <Text style={styles.adminNotesText}>{donation.admin_notes}</Text>
                    </View>
                  )}

                  {/* Receipt Preview */}
                  {donation.payment_proof_url && (
                    <TouchableOpacity style={styles.receiptContainer}>
                      <Image 
                        source={{ uri: donation.payment_proof_url }} 
                        style={styles.receiptThumbnail}
                      />
                      <Text style={styles.receiptText}>View Receipt</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    padding: 16,
    gap: 12,
  },
  statCardLarge: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffc857',
    shadowColor: '#ffc857',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  statIconContainerLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF9E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statTextContainer: {
    flex: 1,
  },
  statValueLarge: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffc857',
    marginBottom: 4,
  },
  statLabelLarge: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    opacity: 0.9,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCardSmall: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF9E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  badgeContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#ffc857',
  },
  badgeTextContainer: {
    flex: 1,
  },
  badgeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  badgeSubtext: {
    fontSize: 13,
    color: '#64748B',
  },
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterTabActive: {
    backgroundColor: '#0F172A',
    borderColor: '#ffc857',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  filterTextActive: {
    color: '#ffc857',
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  donationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  campaignTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  campaignCategory: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 12,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  amount: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffc857',
  },
  anonymousBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  anonymousText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: '#64748B',
  },
  messageContainer: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  messageLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  adminNotesContainer: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  adminNotesLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 4,
  },
  adminNotesText: {
    fontSize: 13,
    color: '#78350F',
    lineHeight: 18,
  },
  receiptContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  receiptThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  receiptText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffc857',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffc857',
  },
  emptyStateButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffc857',
  },
});
