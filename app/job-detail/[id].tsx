import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Dimensions, Animated, Linking, Alert, StatusBar } from 'react-native';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useEffect, useState, useRef } from 'react';
import { SplashScreen, useRouter, useLocalSearchParams } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, Briefcase, MapPin, Building2, Wallet, Clock, Calendar, Edit, Bookmark, ChevronRight, TrendingUp, Users, CheckCircle, AlertCircle, Mail, Trash2, ExternalLink, FileText } from 'lucide-react-native';
import { supabase, Job } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

SplashScreen.preventAutoHideAsync();

const { width, height } = Dimensions.get('window');

export default function JobDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
    if (user) {
      checkAdminStatus();
    }
  }, [id, user]);

  const checkAdminStatus = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();
      
      if (!error && data) {
        setIsAdmin(data.is_admin || false);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

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
        // Calculate time since posted (matching the format in workplace/index.tsx)
        const postedDate = new Date(data.created_at);
        const now = new Date();
        const diffMs = now.getTime() - postedDate.getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        let postedAgo = '';
        if (diffMinutes < 1) postedAgo = 'Just now';
        else if (diffMinutes < 60) postedAgo = `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
        else if (diffHours < 24) postedAgo = `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
        else if (diffDays === 1) postedAgo = 'Yesterday';
        else if (diffDays < 7) postedAgo = `${diffDays} days ago`;
        else if (diffDays < 30) postedAgo = `${Math.floor(diffDays / 7)} ${Math.floor(diffDays / 7) === 1 ? 'week' : 'weeks'} ago`;
        else if (diffDays < 365) postedAgo = `${Math.floor(diffDays / 30)} ${Math.floor(diffDays / 30) === 1 ? 'month' : 'months'} ago`;
        else postedAgo = `${Math.floor(diffDays / 365)} ${Math.floor(diffDays / 365) === 1 ? 'year' : 'years'} ago`;

        // Calculate application deadline (only if custom deadline is set)
        let deadline: Date | null = null;
        let daysUntilDeadline: number | null = null;
        
        if (data.application_deadline) {
          deadline = new Date(data.application_deadline);
          daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        }

        setJob({
          ...data,
          postedAgo,
          deadline: deadline ? deadline.toLocaleDateString() : null,
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

  const toggleSave = () => {
    setIsSaved(!isSaved);
  };

  const handleDeleteJob = async () => {
    if (!isAdmin && job?.user_id !== user?.id) {
      Alert.alert('Permission Denied', 'You do not have permission to delete this job.');
      return;
    }

    Alert.alert(
      'Delete Job Listing',
      'Are you sure you want to delete this job listing? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              
              const { error } = await supabase
                .from('jobs')
                .delete()
                .eq('id', id);

              if (error) throw error;

              Alert.alert('Success', 'Job listing deleted successfully', [
                { text: 'OK', onPress: () => debouncedRouter.replace('/workplace') }
              ]);
            } catch (error: any) {
              console.error('Error deleting job:', error);
              Alert.alert('Error', error.message || 'Failed to delete job listing');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
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
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#ffc857" />
        <Text style={styles.loadingText}>Loading job details...</Text>
      </View>
    );
  }

  if (!job) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="light-content" />
        <Briefcase size={64} color="#E5E7EB" />
        <Text style={styles.errorText}>Job not found</Text>
        <TouchableOpacity style={styles.backButtonAlt} onPress={() => debouncedRouter.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const jobColor = getJobTypeColor(job.job_type);
  const isOwner = (job as any).isOwner;
  const daysLeft = (job as any).daysUntilDeadline;
  const hasDeadline = daysLeft !== null;
  const isUrgent = hasDeadline && daysLeft < 7 && daysLeft > 0;
  const isClosed = hasDeadline && daysLeft <= 0;
  
  // Get the image URL
  const imageUrl = job.image_url 
    ? (typeof job.image_url === 'string' && job.image_url.startsWith('[') 
        ? JSON.parse(job.image_url)[0] 
        : job.image_url)
    : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Dark Header - Floating Over Banner */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.headerButton}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={toggleSave} style={[styles.headerButton, isSaved && styles.headerButtonSaved]}>
            <Bookmark
              size={22}
              color={isSaved ? '#0F172A' : '#FFFFFF'}
              fill={isSaved ? '#ffc857' : 'none'}
            />
          </TouchableOpacity>
          
          {(isOwner || isAdmin) && (
            <TouchableOpacity
              style={[styles.headerButton, deleting && styles.headerButtonDisabled]}
              onPress={handleDeleteJob}
              disabled={deleting}
            >
              <Trash2 size={20} color="#EF4444" />
            </TouchableOpacity>
          )}
          
          {isOwner && (
            <TouchableOpacity
              style={[styles.headerButton, styles.headerButtonEdit]}
              onPress={() => debouncedRouter.push(`/edit-job-listing/${job.id}`)}
            >
              <Edit size={20} color="#ffc857" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 100 }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
      >
        {/* Banner Image Section */}
        <View style={styles.bannerContainer}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.bannerImage} />
          ) : (
            <View style={[styles.bannerPlaceholder, { backgroundColor: `${jobColor}15` }]}>
              <Building2 size={60} color={jobColor} />
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(15, 23, 42, 0.95)']}
            style={styles.bannerGradient}
          />
          
          {/* Job Type Badge on Banner */}
          <View style={[styles.bannerTypeBadge, { backgroundColor: jobColor }]}>
            <Text style={styles.bannerTypeBadgeText}>{job.job_type}</Text>
          </View>
          
          {/* Title & Company Overlay */}
          <View style={styles.bannerOverlay}>
            <Text style={styles.bannerJobTitle}>{job.title}</Text>
            <View style={styles.bannerCompanyRow}>
              <Building2 size={16} color="#94A3B8" />
              <Text style={styles.bannerCompanyName}>{job.company}</Text>
            </View>
          </View>
        </View>
        
        {/* Quick Info Bar */}
        <View style={styles.quickInfoBar}>
          <View style={styles.quickInfoItem}>
            <MapPin size={16} color="#ffc857" />
            <Text style={styles.quickInfoText}>{job.location}</Text>
          </View>
          <View style={styles.quickInfoDivider} />
          <View style={styles.quickInfoItem}>
            <Clock size={16} color="#ffc857" />
            <Text style={styles.quickInfoText}>{(job as any).postedAgo}</Text>
          </View>
          {job.salary && (
            <>
              <View style={styles.quickInfoDivider} />
              <View style={styles.quickInfoItem}>
                <Wallet size={16} color="#ffc857" />
                <Text style={styles.quickInfoText}>{job.salary}</Text>
              </View>
            </>
          )}
        </View>

        {/* Status & Stats Section */}
        <View style={styles.mainContent}>
          {/* Deadline Card */}
          {hasDeadline && (
            <View style={[styles.deadlineCard, isClosed && styles.deadlineCardClosed, isUrgent && styles.deadlineCardUrgent]}>
              <View style={styles.deadlineIconWrap}>
                <Calendar size={22} color={isClosed ? '#EF4444' : isUrgent ? '#F59E0B' : '#ffc857'} />
              </View>
              <View style={styles.deadlineContent}>
                <Text style={styles.deadlineLabel}>Application Deadline</Text>
                <Text style={[styles.deadlineValue, isClosed && styles.deadlineValueClosed, isUrgent && styles.deadlineValueUrgent]}>
                  {isClosed ? 'Applications Closed' : isUrgent ? `${daysLeft} days left - Closing Soon!` : `${daysLeft} days remaining`}
                </Text>
              </View>
            </View>
          )}
          
          {!hasDeadline && !isOwner && (
            <View style={styles.openApplicationCard}>
              <CheckCircle size={20} color="#10B981" />
              <Text style={styles.openApplicationText}>Applications Open - No Deadline</Text>
            </View>
          )}

          {/* Owner Actions Card */}
          {isOwner && (
            <TouchableOpacity
              style={styles.ownerCard}
              onPress={() => debouncedRouter.push(`/job-applications-review/${job.id}`)}
              activeOpacity={0.8}
            >
              <View style={styles.ownerCardLeft}>
                <View style={styles.ownerIconWrap}>
                  <Users size={22} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.ownerCardTitle}>Your Posting</Text>
                  <Text style={styles.ownerCardSubtitle}>View and manage applications</Text>
                </View>
              </View>
              <ChevronRight size={22} color="#ffc857" />
            </TouchableOpacity>
          )}

          {/* Job Description */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconContainer, { backgroundColor: 'rgba(255, 200, 87, 0.1)' }]}>
                <FileText size={20} color="#ffc857" />
              </View>
              <Text style={styles.sectionTitle}>About This Role</Text>
            </View>
            <Text style={styles.bodyText}>{job.description}</Text>
          </View>

          {/* Requirements */}
          {job.requirements && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                  <CheckCircle size={20} color="#10B981" />
                </View>
                <Text style={styles.sectionTitle}>Requirements</Text>
              </View>
              <Text style={styles.bodyText}>{job.requirements}</Text>
            </View>
          )}

          {/* Contact Information */}
          {job.contact_email && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconContainer, { backgroundColor: 'rgba(255, 200, 87, 0.1)' }]}>
                  <Mail size={20} color="#ffc857" />
                </View>
                <Text style={styles.sectionTitle}>Contact</Text>
              </View>
              <TouchableOpacity 
                style={styles.contactEmailCard}
                onPress={() => {
                  const emailUrl = `mailto:${job.contact_email}`;
                  Linking.openURL(emailUrl).catch(err => console.error('Error opening email:', err));
                }}
                activeOpacity={0.8}
              >
                <View style={styles.contactIconWrap}>
                  <Mail size={18} color="#ffc857" />
                </View>
                <View style={styles.contactTextWrap}>
                  <Text style={styles.contactLabel}>Email</Text>
                  <Text style={styles.contactEmailText}>{job.contact_email}</Text>
                </View>
                <ExternalLink size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Action Bar - Dark Theme */}
      {!isOwner && !isClosed && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.bottomBarContent}>
            {job.salary && (
              <View style={styles.bottomBarSalary}>
                <Text style={styles.bottomBarSalaryLabel}>Salary</Text>
                <Text style={styles.bottomBarSalaryValue}>{job.salary}</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => debouncedRouter.push(`/job-application/${job.id}`)}
              activeOpacity={0.9}
            >
              <Text style={styles.applyButtonText}>Apply Now</Text>
              <ChevronRight size={20} color="#0F172A" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {isOwner && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.bottomBarContent}>
            <View style={styles.bottomBarInfo}>
              <Text style={styles.bottomBarInfoLabel}>Manage Listing</Text>
              <Text style={styles.bottomBarInfoValue}>Review applicants</Text>
            </View>
            <TouchableOpacity
              style={styles.viewApplicationsButton}
              onPress={() => debouncedRouter.push(`/job-applications-review/${job.id}`)}
              activeOpacity={0.9}
            >
              <Users size={18} color="#0F172A" />
              <Text style={styles.viewApplicationsButtonText}>Applications</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {isClosed && !isOwner && (
        <View style={[styles.bottomBarClosed, { paddingBottom: insets.bottom + 16 }]}>
          <AlertCircle size={20} color="#EF4444" />
          <Text style={styles.closedText}>Applications are closed for this position</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#0F172A',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
    marginTop: 16,
  },
  errorText: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  backButtonAlt: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 14,
    backgroundColor: '#ffc857',
    borderRadius: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
  },

  // Header - Floating Dark
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 100,
  },
  headerButton: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  headerButtonSaved: {
    backgroundColor: '#ffc857',
  },
  headerButtonEdit: {
    backgroundColor: 'rgba(255, 200, 87, 0.2)',
  },
  headerButtonDisabled: {
    opacity: 0.5,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },

  // Content
  content: {
    flex: 1,
  },

  // Banner Image Section
  bannerContainer: {
    width: '100%',
    height: 280,
    position: 'relative',
    backgroundColor: '#1E293B',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  bannerPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
  },
  bannerTypeBadge: {
    position: 'absolute',
    top: 100,
    left: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  bannerTypeBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bannerOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
  },
  bannerJobTitle: {
    fontSize: 26,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 8,
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  bannerCompanyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bannerCompanyName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#CBD5E1',
  },
  
  // Quick Info Bar
  quickInfoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexWrap: 'wrap',
    gap: 8,
  },
  quickInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickInfoText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#E2E8F0',
  },
  quickInfoDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#475569',
  },
  // Main Content Area
  mainContent: {
    padding: 16,
    gap: 16,
  },
  
  // Deadline Card
  deadlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  deadlineCardUrgent: {
    borderColor: '#FCD34D',
    backgroundColor: '#FFFBEB',
  },
  deadlineCardClosed: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  deadlineIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 200, 87, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deadlineContent: {
    flex: 1,
  },
  deadlineLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    marginBottom: 4,
  },
  deadlineValue: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
  },
  deadlineValueUrgent: {
    color: '#F59E0B',
  },
  deadlineValueClosed: {
    color: '#EF4444',
  },
  
  openApplicationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#ECFDF5',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  openApplicationText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
  },
  
  // Owner Card
  ownerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    padding: 18,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  ownerCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  ownerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#ffc857',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ownerCardTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  ownerCardSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#94A3B8',
    marginTop: 2,
  },

  // Sections
  section: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
  },
  bodyText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#475569',
    lineHeight: 26,
  },
  contactEmailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 14,
  },
  contactIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 200, 87, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactTextWrap: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contactEmailText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
  },

  // Bottom Action Bar - Dark Theme
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0F172A',
    paddingHorizontal: 20,
    paddingTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  bottomBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomBarSalary: {
    flex: 1,
  },
  bottomBarSalaryLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bottomBarSalaryValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginTop: 2,
  },
  bottomBarInfo: {
    flex: 1,
  },
  bottomBarInfoLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bottomBarInfoValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginTop: 2,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffc857',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 6,
  },
  applyButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
  },
  viewApplicationsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffc857',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  viewApplicationsButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
  },
  bottomBarClosed: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#0F172A',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  closedText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
  },
});
