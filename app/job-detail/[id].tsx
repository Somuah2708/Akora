import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Dimensions, Share, Animated } from 'react-native';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useEffect, useState, useRef } from 'react';
import { SplashScreen, useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Briefcase, MapPin, Building2, Wallet, Clock, Calendar, Edit, Share2, Bookmark, ChevronRight, TrendingUp, Users, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react-native';
import { supabase, Job } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { LinearGradient } from 'expo-linear-gradient';

SplashScreen.preventAutoHideAsync();

const { width, height } = Dimensions.get('window');

export default function JobDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  
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

  useEffect(() => {
    if (id) {
      fetchJobDetails();
    }
  }, [id]);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        // Calculate days since posted
        const postedDate = new Date(data.created_at);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - postedDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        let postedAgo = '';
        if (diffDays === 0) postedAgo = 'Today';
        else if (diffDays === 1) postedAgo = 'Yesterday';
        else if (diffDays < 7) postedAgo = `${diffDays} days ago`;
        else if (diffDays < 30) postedAgo = `${Math.floor(diffDays / 7)} weeks ago`;
        else postedAgo = `${Math.floor(diffDays / 30)} months ago`;

        // Calculate application deadline (30 days from posting)
        const deadline = new Date(data.created_at);
        deadline.setDate(deadline.getDate() + 30);
        const daysUntilDeadline = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        setJob({
          ...data,
          postedAgo,
          deadline: deadline.toLocaleDateString(),
          daysUntilDeadline,
          isOwner: user && user.id === data.user_id,
        } as any);
      }
    } catch (error) {
      console.error('Error fetching job details:', error);
      alert('Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this job opportunity: ${job?.title} at ${job?.company}`,
        title: job?.title,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const toggleSave = () => {
    setIsSaved(!isSaved);
  };

  const getJobTypeColor = (jobType: string) => {
    const colors: { [key: string]: string } = {
      'Full Time Jobs': '#10B981',
      'Internships': '#8B5CF6',
      'National Service': '#F59E0B',
      'Part Time': '#EC4899',
      'Remote Work': '#06B6D4',
      'Volunteering': '#EF4444',
    };
    return colors[jobType] || '#4169E1';
  };

  if (!fontsLoaded || loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#4169E1" />
        <Text style={styles.loadingText}>Loading job details...</Text>
      </View>
    );
  }

  if (!job) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Briefcase size={64} color="#E5E7EB" />
        <Text style={styles.errorText}>Job not found</Text>
        <TouchableOpacity style={styles.backButtonAlt} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const jobColor = getJobTypeColor(job.job_type);
  const isOwner = (job as any).isOwner;
  const daysLeft = (job as any).daysUntilDeadline;
  const isUrgent = daysLeft < 7;
  const isClosed = daysLeft <= 0;

  return (
    <View style={styles.container}>
      {/* Sticky Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
            <Share2 size={22} color="#6B7280" />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={toggleSave} style={styles.headerButton}>
            <Bookmark
              size={22}
              color={isSaved ? '#4169E1' : '#6B7280'}
              fill={isSaved ? '#4169E1' : 'none'}
            />
          </TouchableOpacity>
          
          {isOwner && (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.push(`/edit-job-listing/${job.id}` as any)}
            >
              <Edit size={20} color="#4169E1" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
      >
        {/* Hero Section with Company Branding */}
        <LinearGradient
          colors={[`${jobColor}15`, `${jobColor}05`]}
          style={styles.heroSection}
        >
          <View style={styles.companyLogoContainer}>
            <View style={[styles.companyLogo, { backgroundColor: jobColor + '20' }]}>
              <Building2 size={40} color={jobColor} />
            </View>
          </View>

          <Text style={styles.jobTitle}>{job.title}</Text>
          <Text style={styles.companyName}>{job.company}</Text>

          {/* Key Info Pills */}
          <View style={styles.infoPills}>
            <View style={[styles.pill, { backgroundColor: jobColor + '15' }]}>
              <Text style={[styles.pillText, { color: jobColor }]}>{job.job_type}</Text>
            </View>
            
            <View style={styles.pill}>
              <MapPin size={14} color="#6B7280" />
              <Text style={styles.pillText}>{job.location}</Text>
            </View>
            
            <View style={styles.pill}>
              <Clock size={14} color="#6B7280" />
              <Text style={styles.pillText}>{(job as any).postedAgo}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          {job.salary && (
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Wallet size={20} color="#10B981" />
              </View>
              <Text style={styles.statLabel}>Salary</Text>
              <Text style={styles.statValue}>{job.salary}</Text>
            </View>
          )}

          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Calendar size={20} color={isUrgent ? '#EF4444' : '#4169E1'} />
            </View>
            <Text style={styles.statLabel}>Deadline</Text>
            <Text style={[styles.statValue, isUrgent && styles.statValueUrgent]}>
              {daysLeft > 0 ? `${daysLeft} days left` : 'Closed'}
            </Text>
          </View>

          {isOwner && (
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Users size={20} color="#8B5CF6" />
              </View>
              <Text style={styles.statLabel}>Applications</Text>
              <Text style={styles.statValue}>View All</Text>
            </View>
          )}
        </View>

        {/* Status Banner */}
        {isOwner ? (
          <TouchableOpacity
            style={styles.statusBanner}
            onPress={() => router.push(`/job-applications-review/${job.id}` as any)}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.statusBannerGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <CheckCircle size={20} color="#FFFFFF" />
              <Text style={styles.statusBannerText}>Your Posting - View Applications</Text>
              <ChevronRight size={20} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        ) : isClosed ? (
          <View style={styles.closedBanner}>
            <AlertCircle size={20} color="#EF4444" />
            <Text style={styles.closedBannerText}>Applications Closed</Text>
          </View>
        ) : isUrgent ? (
          <View style={styles.urgentBanner}>
            <TrendingUp size={20} color="#F59E0B" />
            <Text style={styles.urgentBannerText}>Closing Soon - Apply Now!</Text>
          </View>
        ) : null}

        {/* Job Description */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Briefcase size={20} color="#4169E1" />
            </View>
            <Text style={styles.sectionTitle}>Job Description</Text>
          </View>
          <Text style={styles.bodyText}>{job.description}</Text>
        </View>

        {/* Requirements */}
        {job.requirements && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <CheckCircle size={20} color="#10B981" />
              </View>
              <Text style={styles.sectionTitle}>Requirements</Text>
            </View>
            <Text style={styles.bodyText}>{job.requirements}</Text>
          </View>
        )}

        {/* How to Apply */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <ExternalLink size={20} color="#8B5CF6" />
            </View>
            <Text style={styles.sectionTitle}>How to Apply</Text>
          </View>
          
          <TouchableOpacity style={styles.applicationLinkCard}>
            <View style={styles.applicationLinkContent}>
              <ExternalLink size={18} color="#4169E1" />
              <View style={styles.applicationLinkInfo}>
                <Text style={styles.applicationLinkLabel}>Application Link</Text>
                <Text style={styles.applicationLinkValue} numberOfLines={1}>
                  {job.application_link}
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Floating Action Button */}
      {!isOwner && !isClosed && (
        <View style={styles.fabContainer}>
          <TouchableOpacity
            style={styles.fab}
            onPress={() => router.push(`/job-application/${job.id}` as any)}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#4169E1', '#3B5DCB']}
              style={styles.fabGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.fabText}>Apply Now</Text>
              <ChevronRight size={20} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {isOwner && (
        <View style={styles.fabContainer}>
          <TouchableOpacity
            style={styles.fab}
            onPress={() => router.push(`/job-applications-review/${job.id}` as any)}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.fabGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Users size={20} color="#FFFFFF" />
              <Text style={styles.fabText}>View Applications</Text>
            </LinearGradient>
          </TouchableOpacity>
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginTop: 16,
  },
  errorText: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  backButtonAlt: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 14,
    backgroundColor: '#4169E1',
    borderRadius: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },

  // Content
  content: {
    flex: 1,
  },

  // Hero Section
  heroSection: {
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  companyLogoContainer: {
    marginBottom: 20,
  },
  companyLogo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  jobTitle: {
    fontSize: 26,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  companyName: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },

  // Info Pills
  infoPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
  },
  pillText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#374151',
  },

  // Stats Container
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    textAlign: 'center',
  },
  statValueUrgent: {
    color: '#EF4444',
  },

  // Status Banners
  statusBanner: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  statusBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  statusBannerText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  urgentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  urgentBannerText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#F59E0B',
  },
  closedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  closedBannerText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
  },

  // Sections
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
  },
  bodyText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 24,
  },

  // Application Link Card
  applicationLinkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  applicationLinkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  applicationLinkInfo: {
    flex: 1,
  },
  applicationLinkLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginBottom: 2,
  },
  applicationLinkValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },

  // Floating Action Button
  fabContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  fab: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  fabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  fabText: {
    fontSize: 17,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
});
