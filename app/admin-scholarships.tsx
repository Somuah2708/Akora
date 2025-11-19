import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput, Image } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft, Award, CheckCircle, XCircle, Eye, Calendar, DollarSign, ExternalLink, Search } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

export default function AdminScholarshipsScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  // Check admin access
  useEffect(() => {
    if (!profile?.is_admin) {
      Alert.alert('Access Denied', 'You do not have permission to access this page.');
      router.back();
    }
  }, [profile]);

  useEffect(() => {
    fetchSubmissions();
  }, [filter]);

  const fetchSubmissions = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('scholarship_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      console.log('📚 Fetched scholarship submissions:', data?.length, 'items');
      setSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      Alert.alert('Error', 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const handleApprove = async (submissionId: string) => {
    Alert.alert(
      'Approve Scholarship',
      'This scholarship will be visible to all users. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              setProcessing(submissionId);
              const { error } = await supabase
                .from('scholarship_submissions')
                .update({
                  status: 'approved',
                  reviewed_by: user!.id,
                  reviewed_at: new Date().toISOString(),
                })
                .eq('id', submissionId);

              if (error) throw error;

              Alert.alert('Success', 'Scholarship approved!');
              fetchSubmissions();
            } catch (error: any) {
              console.error('Error approving submission:', error);
              Alert.alert('Error', error.message || 'Failed to approve');
            } finally {
              setProcessing(null);
            }
          },
        },
      ]
    );
  };

  const handleReject = async (submissionId: string) => {
    Alert.prompt(
      'Reject Scholarship',
      'Please provide a reason for rejection:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async (reason?: string) => {
            try {
              setProcessing(submissionId);
              const { error } = await supabase
                .from('scholarship_submissions')
                .update({
                  status: 'rejected',
                  reviewed_by: user!.id,
                  reviewed_at: new Date().toISOString(),
                  rejection_reason: reason || 'No reason provided',
                })
                .eq('id', submissionId);

              if (error) throw error;

              Alert.alert('Success', 'Scholarship rejected');
              fetchSubmissions();
            } catch (error: any) {
              console.error('Error rejecting submission:', error);
              Alert.alert('Error', error.message || 'Failed to reject');
            } finally {
              setProcessing(null);
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const filteredSubmissions = submissions.filter((sub) =>
    sub.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sub.source_organization?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: submissions.length,
    pending: submissions.filter(s => s.status === 'pending').length,
    approved: submissions.filter(s => s.status === 'approved').length,
    rejected: submissions.filter(s => s.status === 'rejected').length,
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scholarship Reviews</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.approved}</Text>
          <Text style={styles.statLabel}>Approved</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.rejected}</Text>
          <Text style={styles.statLabel}>Rejected</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search scholarships..."
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabs}>
        {['all', 'pending', 'approved', 'rejected'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, filter === tab && styles.activeTab]}
            onPress={() => setFilter(tab as any)}
          >
            <Text style={[styles.tabText, filter === tab && styles.activeTabText]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Submissions List */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4169E1" />
            <Text style={styles.loadingText}>Loading submissions...</Text>
          </View>
        ) : filteredSubmissions.length > 0 ? (
          <View style={styles.submissionsList}>
            {filteredSubmissions.map((submission) => (
              <View key={submission.id} style={styles.submissionCard}>
                {submission.image_url && (
                  <Image source={{ uri: submission.image_url }} style={styles.cardImage} />
                )}
                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {submission.title}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        submission.status === 'approved' && styles.statusApproved,
                        submission.status === 'rejected' && styles.statusRejected,
                        submission.status === 'pending' && styles.statusPending,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          submission.status === 'approved' && styles.statusTextApproved,
                          submission.status === 'rejected' && styles.statusTextRejected,
                          submission.status === 'pending' && styles.statusTextPending,
                        ]}
                      >
                        {submission.status}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.cardOrg}>{submission.source_organization}</Text>
                  <Text style={styles.cardDescription} numberOfLines={3}>
                    {submission.description}
                  </Text>

                  <View style={styles.cardMeta}>
                    {submission.funding_amount && (
                      <View style={styles.metaItem}>
                        <DollarSign size={14} color="#6B7280" />
                        <Text style={styles.metaText}>
                          {submission.funding_currency === 'GHS' ? '₵' : '$'}
                          {submission.funding_amount}
                        </Text>
                      </View>
                    )}
                    {submission.deadline_date && (
                      <View style={styles.metaItem}>
                        <Calendar size={14} color="#6B7280" />
                        <Text style={styles.metaText}>{submission.deadline_date}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.cardFooter}>
                    <Text style={styles.submitterText}>
                      By: {submission.submitted_by_name}
                    </Text>
                    <Text style={styles.dateText}>
                      {new Date(submission.created_at).toLocaleDateString()}
                    </Text>
                  </View>

                  {/* Action Buttons */}
                  {submission.status === 'pending' && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.approveButton]}
                        onPress={() => handleApprove(submission.id)}
                        disabled={processing === submission.id}
                      >
                        {processing === submission.id ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <CheckCircle size={16} color="#FFFFFF" />
                            <Text style={styles.actionButtonText}>Approve</Text>
                          </>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.rejectButton]}
                        onPress={() => handleReject(submission.id)}
                        disabled={processing === submission.id}
                      >
                        <XCircle size={16} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {submission.rejection_reason && (
                    <View style={styles.rejectionReason}>
                      <Text style={styles.rejectionReasonLabel}>Rejection Reason:</Text>
                      <Text style={styles.rejectionReasonText}>
                        {submission.rejection_reason}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Award size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Submissions Found</Text>
            <Text style={styles.emptySubtitle}>
              {filter === 'pending'
                ? 'No pending submissions to review'
                : `No ${filter} submissions`}
            </Text>
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#4169E1',
  },
  tabText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  submissionsList: {
    paddingHorizontal: 16,
    gap: 16,
  },
  submissionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#F3F4F6',
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusApproved: {
    backgroundColor: '#D1FAE5',
  },
  statusRejected: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    textTransform: 'capitalize',
  },
  statusTextPending: {
    color: '#92400E',
  },
  statusTextApproved: {
    color: '#065F46',
  },
  statusTextRejected: {
    color: '#991B1B',
  },
  cardOrg: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  cardMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  submitterText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  dateText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  approveButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  rejectionReason: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  rejectionReasonLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#991B1B',
    marginBottom: 4,
  },
  rejectionReasonText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#7F1D1D',
    lineHeight: 18,
  },
  loadingContainer: {
    paddingVertical: 80,
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  emptyState: {
    paddingVertical: 80,
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
