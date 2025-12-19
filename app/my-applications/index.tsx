import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useEffect, useState, useCallback } from 'react';
import { SplashScreen, useRouter, useFocusEffect } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, FileText, Clock, CheckCircle, XCircle, Eye, AlertCircle, MapPin, Building2, Mail, Phone, Briefcase, ChevronRight, Calendar, TrendingUp } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

SplashScreen.preventAutoHideAsync();

const STATUS_CONFIG = {
  pending: { icon: Clock, color: '#F59E0B', bg: '#FEF3C7', text: 'Pending' },
  reviewed: { icon: Eye, color: '#8B5CF6', bg: '#EDE9FE', text: 'Reviewed' },
  shortlisted: { icon: CheckCircle, color: '#10B981', bg: '#D1FAE5', text: 'Shortlisted' },
  accepted: { icon: CheckCircle, color: '#10B981', bg: '#D1FAE5', text: 'Accepted' },
  rejected: { icon: XCircle, color: '#EF4444', bg: '#FEE2E2', text: 'Rejected' },
};

export default function MyApplicationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchApplications();
      }
    }, [user])
  );

  const fetchApplications = async () => {
    if (!user?.id) {
      console.log('No user ID available, skipping fetch');
      return;
    }
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('job_applications')
        .select(`
          *,
          job:job_id (
            id,
            title,
            company,
            location,
            job_type,
            salary,
            image_url,
            contact_email
          )
        `)
        .eq('applicant_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchApplications();
    setRefreshing(false);
  }, []);

  const getFilteredApplications = () => {
    if (filter === 'all') return applications;
    return applications.filter(app => app.status === filter);
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.ceil((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  if (!fontsLoaded) {
    return null;
  }

  const filteredApps = getFilteredApplications();
  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    reviewed: applications.filter(a => a.status === 'reviewed' || a.status === 'shortlisted').length,
    accepted: applications.filter(a => a.status === 'accepted').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>My Applications</Text>
          <Text style={styles.headerSubtitle}>{stats.total} total applications</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#ffc857"
          />
        }
      >
        {/* Stats Overview */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, styles.statCardPrimary]}>
              <View style={styles.statIconContainer}>
                <FileText size={22} color="#ffc857" />
              </View>
              <Text style={styles.statNumber}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total Applied</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconContainerSmall, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                <Clock size={18} color="#F59E0B" />
              </View>
              <Text style={styles.statNumberSmall}>{stats.pending}</Text>
              <Text style={styles.statLabelSmall}>Pending</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconContainerSmall, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <CheckCircle size={18} color="#10B981" />
              </View>
              <Text style={styles.statNumberSmall}>{stats.accepted}</Text>
              <Text style={styles.statLabelSmall}>Accepted</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconContainerSmall, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                <XCircle size={18} color="#EF4444" />
              </View>
              <Text style={styles.statNumberSmall}>{stats.rejected}</Text>
              <Text style={styles.statLabelSmall}>Rejected</Text>
            </View>
          </View>
        </View>

        {/* Filter Chips */}
        <View style={styles.filterSection}>
          <Text style={styles.sectionTitle}>Filter by Status</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContainer}
          >
            <TouchableOpacity
              style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
              onPress={() => setFilter('all')}
            >
              <Briefcase size={14} color={filter === 'all' ? '#ffc857' : '#64748B'} />
              <Text style={[styles.filterChipText, filter === 'all' && styles.filterChipTextActive]}>
                All
              </Text>
              <View style={[styles.filterCount, filter === 'all' && styles.filterCountActive]}>
                <Text style={[styles.filterCountText, filter === 'all' && styles.filterCountTextActive]}>{stats.total}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, filter === 'pending' && styles.filterChipActive]}
              onPress={() => setFilter('pending')}
            >
              <Clock size={14} color={filter === 'pending' ? '#ffc857' : '#F59E0B'} />
              <Text style={[styles.filterChipText, filter === 'pending' && styles.filterChipTextActive]}>
                Pending
              </Text>
              <View style={[styles.filterCount, filter === 'pending' && styles.filterCountActive]}>
                <Text style={[styles.filterCountText, filter === 'pending' && styles.filterCountTextActive]}>{stats.pending}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, filter === 'reviewed' && styles.filterChipActive]}
              onPress={() => setFilter('reviewed')}
            >
              <Eye size={14} color={filter === 'reviewed' ? '#ffc857' : '#8B5CF6'} />
              <Text style={[styles.filterChipText, filter === 'reviewed' && styles.filterChipTextActive]}>
                Reviewed
              </Text>
              <View style={[styles.filterCount, filter === 'reviewed' && styles.filterCountActive]}>
                <Text style={[styles.filterCountText, filter === 'reviewed' && styles.filterCountTextActive]}>{stats.reviewed}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, filter === 'accepted' && styles.filterChipActive]}
              onPress={() => setFilter('accepted')}
            >
              <CheckCircle size={14} color={filter === 'accepted' ? '#ffc857' : '#10B981'} />
              <Text style={[styles.filterChipText, filter === 'accepted' && styles.filterChipTextActive]}>
                Accepted
              </Text>
              <View style={[styles.filterCount, filter === 'accepted' && styles.filterCountActive]}>
                <Text style={[styles.filterCountText, filter === 'accepted' && styles.filterCountTextActive]}>{stats.accepted}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, filter === 'rejected' && styles.filterChipActive]}
              onPress={() => setFilter('rejected')}
            >
              <XCircle size={14} color={filter === 'rejected' ? '#ffc857' : '#EF4444'} />
              <Text style={[styles.filterChipText, filter === 'rejected' && styles.filterChipTextActive]}>
                Rejected
              </Text>
              <View style={[styles.filterCount, filter === 'rejected' && styles.filterCountActive]}>
                <Text style={[styles.filterCountText, filter === 'rejected' && styles.filterCountTextActive]}>{stats.rejected}</Text>
              </View>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Applications List */}
        <View style={styles.applicationsSection}>
          <Text style={styles.sectionTitle}>
            {filter === 'all' ? 'All Applications' : `${STATUS_CONFIG[filter as keyof typeof STATUS_CONFIG]?.text || filter} Applications`}
          </Text>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0F172A" />
              <Text style={styles.loadingText}>Loading your applications...</Text>
            </View>
          ) : filteredApps.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <FileText size={48} color="#94A3B8" />
              </View>
              <Text style={styles.emptyText}>No applications found</Text>
              <Text style={styles.emptySubtext}>
                {filter === 'all' 
                  ? 'Start applying to jobs to track your progress here' 
                  : `You don't have any ${filter} applications yet`}
              </Text>
              <TouchableOpacity 
                style={styles.browseButton}
                onPress={() => debouncedRouter.push('/workplace')}
              >
                <Briefcase size={18} color="#0F172A" />
                <Text style={styles.browseButtonText}>Browse Jobs</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredApps.map((application, index) => {
              const job = application.job;
              const statusConfig = STATUS_CONFIG[application.status as keyof typeof STATUS_CONFIG];
              const StatusIcon = statusConfig?.icon || AlertCircle;
              const isAccepted = application.status === 'accepted';
              const isRejected = application.status === 'rejected';
              
              // Get logo
              let logo = null;
              if (job?.image_url) {
                if (typeof job.image_url === 'string' && job.image_url.startsWith('[')) {
                  try {
                    const parsed = JSON.parse(job.image_url);
                    logo = parsed[0] || job.image_url;
                  } catch (e) {
                    logo = job.image_url;
                  }
                } else {
                  logo = job.image_url;
                }
              }

              return (
                <TouchableOpacity
                  key={application.id}
                  style={[
                    styles.applicationCard, 
                    isAccepted && styles.acceptedCard,
                    isRejected && styles.rejectedCard,
                    index === 0 && styles.firstCard
                  ]}
                  onPress={() => debouncedRouter.push(`/job-detail/${job?.id}`)}
                  activeOpacity={0.7}
                >
                  {/* Status Indicator Bar */}
                  <View style={[styles.statusBar, { backgroundColor: statusConfig?.color }]} />
                  
                  <View style={styles.cardContent}>
                    <View style={styles.cardTop}>
                      {logo ? (
                        <Image source={{ uri: logo }} style={styles.companyLogo} contentFit="cover" />
                      ) : (
                        <View style={styles.companyLogoPlaceholder}>
                          <Building2 size={24} color="#94A3B8" />
                        </View>
                      )}
                      <View style={styles.cardInfo}>
                        <Text style={styles.jobTitle} numberOfLines={2}>{job?.title}</Text>
                        <View style={styles.companyRow}>
                          <Building2 size={13} color="#64748B" />
                          <Text style={styles.companyText} numberOfLines={1}>{job?.company}</Text>
                        </View>
                        <View style={styles.locationRow}>
                          <MapPin size={13} color="#94A3B8" />
                          <Text style={styles.locationText} numberOfLines={1}>{job?.location}</Text>
                        </View>
                      </View>
                      <ChevronRight size={20} color="#CBD5E1" />
                    </View>

                    <View style={styles.cardDivider} />

                    <View style={styles.cardBottom}>
                      <View style={[styles.statusBadge, { backgroundColor: statusConfig?.bg }]}>
                        <StatusIcon size={13} color={statusConfig?.color} />
                        <Text style={[styles.statusText, { color: statusConfig?.color }]}>
                          {statusConfig?.text}
                        </Text>
                      </View>
                      <View style={styles.dateContainer}>
                        <Calendar size={12} color="#94A3B8" />
                        <Text style={styles.appliedDate}>{getRelativeTime(application.created_at)}</Text>
                      </View>
                    </View>

                    {/* Show employer contact info for accepted applications */}
                    {isAccepted && job?.contact_email && (
                      <View style={styles.contactSection}>
                        <View style={styles.contactHeader}>
                          <Text style={styles.contactTitle}>🎉 Congratulations!</Text>
                          <Text style={styles.contactSubtitle}>Contact the employer to proceed</Text>
                        </View>
                        <TouchableOpacity 
                          style={styles.contactButton}
                          onPress={() => {
                            const { Linking } = require('react-native');
                            Linking.openURL(`mailto:${job.contact_email}`);
                          }}
                        >
                          <Mail size={16} color="#FFFFFF" />
                          <Text style={styles.contactButtonText}>{job.contact_email}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 20,
    backgroundColor: '#0F172A',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  
  // Section Title
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    marginBottom: 12,
  },
  
  // Stats Section
  statsSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minWidth: '30%',
    flex: 1,
  },
  statCardPrimary: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
    minWidth: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 16,
    paddingVertical: 20,
    marginBottom: 4,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 200, 87, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statIconContainerSmall: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  statNumberSmall: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
  },
  statLabelSmall: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  
  // Filter Section
  filterSection: {
    paddingTop: 24,
    paddingLeft: 20,
  },
  filtersContainer: {
    paddingRight: 20,
    gap: 10,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  filterChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#ffc857',
  },
  filterCount: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  filterCountActive: {
    backgroundColor: 'rgba(255, 200, 87, 0.2)',
  },
  filterCountText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#64748B',
  },
  filterCountTextActive: {
    color: '#ffc857',
  },
  
  // Applications Section
  applicationsSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  applicationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  firstCard: {
    marginTop: 4,
  },
  statusBar: {
    height: 4,
    width: '100%',
  },
  cardContent: {
    padding: 16,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  companyLogo: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  companyLogoPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  jobTitle: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    lineHeight: 20,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  companyText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  locationText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#94A3B8',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 5,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  appliedDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#94A3B8',
  },
  
  // Loading & Empty States
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  browseButton: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffc857',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#ffc857',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  browseButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
  },
  
  // Card Status Variants
  acceptedCard: {
    borderColor: '#10B981',
    borderWidth: 1.5,
  },
  rejectedCard: {
    borderColor: '#FEE2E2',
    borderWidth: 1,
    opacity: 0.9,
  },
  
  // Contact Section (Accepted)
  contactSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#D1FAE5',
  },
  contactHeader: {
    marginBottom: 12,
  },
  contactTitle: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
  },
  contactSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginTop: 2,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 10,
  },
  contactButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});
