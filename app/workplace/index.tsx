import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, TextInput, Dimensions, ActivityIndicator, RefreshControl, FlatList, Modal, Animated, Alert } from 'react-native';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useEffect, useState, useCallback, useRef } from 'react';
import { SplashScreen, useRouter, useFocusEffect } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { Search, Filter, ArrowLeft, Briefcase, Clock, MapPin, Building2, GraduationCap, ChevronRight, BookOpen, Users, Wallet, Plus, Calendar, Bookmark, TrendingUp, DollarSign, X, Check, Shield, AlertCircle, XCircle } from 'lucide-react-native';
import { supabase, Job } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { LinearGradient } from 'expo-linear-gradient';

SplashScreen.preventAutoHideAsync();

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width - 32;

const JOB_TYPES = [
  { id: 'all', name: 'All Jobs', icon: Briefcase, color: '#4169E1' },
  { id: 'Full Time Jobs', name: 'Full Time', icon: Briefcase, color: '#10B981' },
  { id: 'Internships', name: 'Internships', icon: GraduationCap, color: '#8B5CF6' },
  { id: 'National Service', name: 'National Service', icon: Users, color: '#F59E0B' },
  { id: 'Part Time', name: 'Part Time', icon: Clock, color: '#EC4899' },
  { id: 'Remote Work', name: 'Remote', icon: Building2, color: '#06B6D4' },
  { id: 'Volunteering', name: 'Volunteering', icon: BookOpen, color: '#EF4444' },
];

const SALARY_RANGES = [
  { id: 'all', label: 'All Salaries', min: 0, max: Infinity },
  { id: 'under_1k', label: 'Under GH₵1,000', min: 0, max: 1000 },
  { id: '1k_3k', label: 'GH₵1,000 - GH₵3,000', min: 1000, max: 3000 },
  { id: '3k_5k', label: 'GH₵3,000 - GH₵5,000', min: 3000, max: 5000 },
  { id: 'over_5k', label: 'Over GH₵5,000', min: 5000, max: Infinity },
];

const POSTED_FILTERS = [
  { id: 'all', label: 'Any Time', days: Infinity },
  { id: 'today', label: 'Today', days: 1 },
  { id: 'week', label: 'Past Week', days: 7 },
  { id: 'month', label: 'Past Month', days: 30 },
];

const FEATURED_JOBS = [
  {
    id: '1',
    title: 'Software Engineer',
    company: 'TechCorp Ghana',
    location: 'Accra, Ghana',
    type: 'Full-Time',
    salary: 'GH₵3,000 - GH₵5,000/month',
    posted: '2 days ago',
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=60',
    requirements: ['3+ years experience', 'React Native', 'Node.js'],
  },
  {
    id: '2',
    title: 'Marketing Intern',
    company: 'Global Media Ltd',
    location: 'Kumasi, Ghana',
    type: 'Internship',
    salary: 'GH₵500/month',
    posted: '1 day ago',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=60',
    requirements: ['Final year student', 'Marketing major', 'Creative mindset'],
  },
];

const RECENT_OPPORTUNITIES = [
  {
    id: '1',
    title: 'National Service - Teaching',
    organization: 'Ministry of Education',
    location: 'Various Locations',
    deadline: '2 weeks left',
    image: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: '2',
    title: 'Data Analyst',
    company: 'FinTech Solutions',
    location: 'Tema, Ghana',
    salary: 'GH₵2,000 - GH₵3,500/month',
    posted: '3 days ago',
    image: 'https://images.unsplash.com/photo-1551836022-4c4c79ecde51?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: '3',
    title: 'Product Design Intern',
    company: 'Creative Hub',
    location: 'Remote',
    salary: 'GH₵800/month',
    posted: '1 week ago',
    image: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: '4',
    title: 'Business Development',
    company: 'Growth Partners',
    location: 'Accra, Ghana',
    salary: 'GH₵1,500 - GH₵2,500/month',
    posted: '5 days ago',
    image: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&auto=format&fit=crop&q=60',
  },
];

export default function WorkplaceScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'all' | 'my-jobs' | 'saved'>('all');
  
  // Filter State
  const [jobListings, setJobListings] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJobType, setSelectedJobType] = useState('all');
  const [selectedSalaryRange, setSelectedSalaryRange] = useState('all');
  const [selectedPostedFilter, setSelectedPostedFilter] = useState('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savedJobs, setSavedJobs] = useState<string[]>([]);
  const [myJobs, setMyJobs] = useState<Job[]>([]); // Approved user jobs only
  const [myAllJobs, setMyAllJobs] = useState<Job[]>([]); // All user jobs including pending/rejected
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingJobsCount, setPendingJobsCount] = useState(0);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [selectedRejectedJob, setSelectedRejectedJob] = useState<Job | null>(null);
  
  // Refs to track current values for async functions
  const activeTabRef = useRef(activeTab);
  const savedJobsRef = useRef(savedJobs);
  const myAllJobsRef = useRef(myAllJobs);
  
  // Keep refs in sync with state
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);
  
  useEffect(() => {
    savedJobsRef.current = savedJobs;
  }, [savedJobs]);
  
  useEffect(() => {
    myAllJobsRef.current = myAllJobs;
  }, [myAllJobs]);
  
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  const fetchJobListings = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching job listings from jobs table...');
      
      // Fetch all approved jobs
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('is_approved', true)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Error fetching jobs:', error);
        throw error;
      }
      
      console.log('💼 Fetched job listings:', data?.length || 0);
      setJobListings(data || []);
      
      // Filter jobs posted by current user (approved only)
      if (user) {
        const userApprovedJobs = data?.filter(job => job.user_id === user.id) || [];
        setMyJobs(userApprovedJobs);
        
        // Also fetch ALL jobs by this user (including pending/rejected)
        await fetchMyAllJobs();
      }
      
      applyFilters(data || [], searchQuery, selectedJobType, selectedSalaryRange, selectedPostedFilter, activeTabRef.current, savedJobsRef.current, myAllJobsRef.current);
    } catch (error) {
      console.error('❌ Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all jobs posted by the user (including pending and rejected)
  const fetchMyAllJobs = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Error fetching user jobs:', error);
        return;
      }
      
      console.log('📋 Fetched all user jobs:', data?.length || 0);
      setMyAllJobs(data || []);
    } catch (error) {
      console.error('❌ Error:', error);
    }
  };

  const applyFilters = (
    jobs: Job[],
    search: string,
    jobType: string,
    salaryRange: string,
    postedFilter: string,
    currentTab: 'all' | 'my-jobs' | 'saved' = activeTab,
    currentSavedJobs: string[] = savedJobs,
    allUserJobs: Job[] = myAllJobs
  ) => {
    let filtered = [...jobs];

    // Filter by tab - for 'my-jobs', use all user jobs (including pending/rejected)
    if (currentTab === 'my-jobs' && user) {
      // Use allUserJobs which includes pending and rejected jobs
      filtered = allUserJobs.length > 0 ? [...allUserJobs] : jobs.filter(job => job.user_id === user.id);
    } else if (currentTab === 'saved') {
      filtered = filtered.filter(job => currentSavedJobs.includes(job.id));
    }

    // Filter by job type
    if (jobType !== 'all') {
      filtered = filtered.filter(job => job.job_type === jobType);
    }

    // Filter by salary range
    if (salaryRange !== 'all') {
      const range = SALARY_RANGES.find(r => r.id === salaryRange);
      if (range) {
        filtered = filtered.filter(job => {
          const salaryStr = job.salary || '';
          const salaryMatch = salaryStr.match(/\$?([\d,]+)/);
          const jobSalary = salaryMatch ? parseFloat(salaryMatch[1].replace(/,/g, '')) : 0;
          return jobSalary >= range.min && jobSalary <= range.max;
        });
      }
    }

    // Filter by posted date
    if (postedFilter !== 'all') {
      const filter = POSTED_FILTERS.find(f => f.id === postedFilter);
      if (filter && filter.days !== Infinity) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - filter.days);
        filtered = filtered.filter(job => new Date(job.created_at) >= cutoffDate);
      }
    }

    // Search across all fields
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(job => {
        const title = (job.title || '').toLowerCase();
        const description = (job.description || '').toLowerCase();
        const company = (job.company || '').toLowerCase();
        const location = (job.location || '').toLowerCase();
        const jobType = (job.job_type || '').toLowerCase();
        
        return title.includes(searchLower) || 
               description.includes(searchLower) || 
               company.includes(searchLower) ||
               location.includes(searchLower) ||
               jobType.includes(searchLower);
      });
    }

    setFilteredJobs(filtered);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    applyFilters(jobListings, text, selectedJobType, selectedSalaryRange, selectedPostedFilter);
  };

  const handleJobTypeFilter = (typeId: string) => {
    setSelectedJobType(typeId);
    applyFilters(jobListings, searchQuery, typeId, selectedSalaryRange, selectedPostedFilter);
  };

  const handleSalaryFilter = (rangeId: string) => {
    setSelectedSalaryRange(rangeId);
    applyFilters(jobListings, searchQuery, selectedJobType, rangeId, selectedPostedFilter);
  };

  const handlePostedFilter = (filterId: string) => {
    setSelectedPostedFilter(filterId);
    applyFilters(jobListings, searchQuery, selectedJobType, selectedSalaryRange, filterId);
  };

  const toggleSaveJob = (jobId: string) => {
    setSavedJobs(prev => 
      prev.includes(jobId) ? prev.filter(id => id !== jobId) : [...prev, jobId]
    );
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedJobType('all');
    setSelectedSalaryRange('all');
    setSelectedPostedFilter('all');
    applyFilters(jobListings, '', 'all', 'all', 'all');
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchJobListings();
    setRefreshing(false);
  }, [activeTab, savedJobs, searchQuery, selectedJobType, selectedSalaryRange, selectedPostedFilter]);

  useEffect(() => {
    fetchJobListings();
    if (user) {
      checkAdminStatus();
    }
  }, [user]);

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
        
        // If admin, fetch pending jobs count
        if (data.is_admin) {
          fetchPendingJobsCount();
        }
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const fetchPendingJobsCount = async () => {
    try {
      const { count, error } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('is_approved', false);
      
      if (!error) {
        setPendingJobsCount(count || 0);
      }
    } catch (error) {
      console.error('Error fetching pending jobs count:', error);
    }
  };

  useEffect(() => {
    applyFilters(jobListings, searchQuery, selectedJobType, selectedSalaryRange, selectedPostedFilter, activeTab, savedJobs, myAllJobs);
  }, [activeTab, savedJobs, myAllJobs]);

  useFocusEffect(
    useCallback(() => {
      fetchJobListings();
    }, [])
  );

  const handleJobPress = (jobId: string) => {
    debouncedRouter.push(`/job-detail/${jobId}`);
  };

  const handleJobLongPress = (job: Job) => {
    // Handle long press for additional actions
    if (user && job.user_id === user.id) {
      Alert.alert(
        job.title,
        'What would you like to do?',
        [
          { text: 'Edit', onPress: () => debouncedRouter.push(`/edit-job-listing/${job.id}`) },
          { text: 'Delete', style: 'destructive', onPress: () => handleDeleteJob(job.id) },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    Alert.alert(
      'Delete Job',
      'Are you sure you want to delete this job listing?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('jobs')
                .delete()
                .eq('id', jobId);
              
              if (error) throw error;
              Alert.alert('Success', 'Job deleted successfully');
              fetchJobListings();
            } catch (error) {
              console.error('Error deleting job:', error);
              Alert.alert('Error', 'Failed to delete job');
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  const getJobTypeColor = (jobType: string) => {
    const type = JOB_TYPES.find(t => t.id === jobType || t.name === jobType);
    return type?.color || '#4169E1';
  };

  const formatTimeAgo = (createdAt: string) => {
    const postedDate = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - postedDate.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} ${Math.floor(diffDays / 7) === 1 ? 'week' : 'weeks'} ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} ${Math.floor(diffDays / 30) === 1 ? 'month' : 'months'} ago`;
    return `${Math.floor(diffDays / 365)} ${Math.floor(diffDays / 365) === 1 ? 'year' : 'years'} ago`;
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.iconButton}>
          <ArrowLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        
        <Text style={styles.screenTitle}>Jobs & Internships</Text>
        
        <View style={styles.topBarRight}>
          {isAdmin && (
            <TouchableOpacity 
              onPress={() => debouncedRouter.push('/admin/job-approvals')} 
              style={styles.iconButton}
            >
              <Shield size={20} color="#ffc857" />
              {pendingJobsCount > 0 && (
                <View style={styles.adminBadge}>
                  <Text style={styles.adminBadgeText}>{pendingJobsCount > 9 ? '9+' : pendingJobsCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setShowFilterModal(true)} style={styles.iconButton}>
            <Filter size={20} color={(selectedJobType !== 'all' || selectedSalaryRange !== 'all' || selectedPostedFilter !== 'all') ? '#ffc857' : '#FFFFFF'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchField}
            placeholder="Search jobs..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => handleSearch('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tab Bar - Horizontal Scroll */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabScrollContainer}
      >
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'all' && styles.tabItemActive]}
          onPress={() => setActiveTab('all')}
        >
          <Briefcase size={16} color={activeTab === 'all' ? '#0F172A' : '#9CA3AF'} />
          <Text style={[styles.tabLabel, activeTab === 'all' && styles.tabLabelActive]}>All</Text>
        </TouchableOpacity>
        
        {user && (
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'my-jobs' && styles.tabItemActive]}
            onPress={() => setActiveTab('my-jobs')}
          >
            <Users size={16} color={activeTab === 'my-jobs' ? '#0F172A' : '#9CA3AF'} />
            <Text style={[styles.tabLabel, activeTab === 'my-jobs' && styles.tabLabelActive]}>Posted</Text>
            {myAllJobs.length > 0 && (
              <View style={[styles.tabCount, activeTab === 'my-jobs' && styles.tabCountActive]}>
                <Text style={[styles.tabCountText, activeTab === 'my-jobs' && styles.tabCountTextActive]}>{myAllJobs.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'saved' && styles.tabItemActive]}
          onPress={() => setActiveTab('saved')}
        >
          <Bookmark size={16} color={activeTab === 'saved' ? '#0F172A' : '#9CA3AF'} />
          <Text style={[styles.tabLabel, activeTab === 'saved' && styles.tabLabelActive]}>Saved</Text>
          {savedJobs.length > 0 && (
            <View style={[styles.tabCount, activeTab === 'saved' && styles.tabCountActive]}>
              <Text style={[styles.tabCountText, activeTab === 'saved' && styles.tabCountTextActive]}>{savedJobs.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        {user && (
          <TouchableOpacity
            style={styles.applicationsButton}
            onPress={() => debouncedRouter.push('/my-applications')}
          >
            <Clock size={16} color="#ffc857" />
            <Text style={styles.applicationsButtonText}>Applications</Text>
            <ChevronRight size={14} color="#ffc857" />
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Category Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryContainer}
      >
        {JOB_TYPES.map((type) => {
          const IconComponent = type.icon;
          const isActive = selectedJobType === type.id;
          return (
            <TouchableOpacity
              key={type.id}
              style={[styles.categoryChip, isActive && { backgroundColor: type.color }]}
              onPress={() => handleJobTypeFilter(type.id)}
            >
              <IconComponent size={14} color={isActive ? '#FFFFFF' : type.color} />
              <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>
                {type.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Job Listings */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0F172A" />
          <Text style={styles.loadingText}>Finding opportunities...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredJobs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderHeader}
          stickyHeaderIndices={[]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#ffc857"
            />
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Briefcase size={64} color="#E5E7EB" />
              <Text style={styles.emptyTitle}>No jobs found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery || selectedJobType !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Be the first to post a job!'}
              </Text>
              {(searchQuery || selectedJobType !== 'all' || selectedSalaryRange !== 'all' || selectedPostedFilter !== 'all') && (
                <TouchableOpacity style={styles.clearFiltersBtn} onPress={clearAllFilters}>
                  <Text style={styles.clearFiltersBtnText}>Clear Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          renderItem={({ item: job, index }) => {
            const jobColor = getJobTypeColor(job.job_type);
            const timeAgo = formatTimeAgo(job.created_at);
            const isOwner = user && job.user_id === user.id;
            const isSaved = savedJobs.includes(job.id);
            const isFirst = index === 0;
            
            // Job status for owner's posts
            const isPending = isOwner && !job.is_approved && !job.rejection_reason;
            const isRejected = isOwner && !job.is_approved && !!job.rejection_reason;
            const isApproved = job.is_approved;
            
            // Parse image URL
            const imageUrl = job.image_url 
              ? (typeof job.image_url === 'string' && job.image_url.startsWith('[') 
                  ? JSON.parse(job.image_url)[0] 
                  : job.image_url)
              : null;

            return (
              <TouchableOpacity
                style={[styles.jobCard, isFirst && styles.jobCardFirst, isRejected && styles.jobCardRejected, isPending && styles.jobCardPending]}
                onPress={() => {
                  if (isRejected) {
                    setSelectedRejectedJob(job);
                    setShowRejectionModal(true);
                  } else {
                    handleJobPress(job.id);
                  }
                }}
                onLongPress={() => handleJobLongPress(job)}
                activeOpacity={0.8}
              >
                {/* Featured Image Banner */}
                <View style={styles.imageBanner}>
                  {imageUrl ? (
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.bannerImage}
                    />
                  ) : (
                    <View style={[styles.bannerPlaceholder, { backgroundColor: `${jobColor}10` }]}>
                      <Building2 size={40} color={jobColor} />
                    </View>
                  )}
                  
                  {/* Job Type Badge - Overlay */}
                  <View style={[styles.typeBadgeOverlay, { backgroundColor: jobColor }]}>
                    <Text style={styles.typeBadgeOverlayText}>{job.job_type}</Text>
                  </View>
                  
                  {/* Status Badge Overlay for Pending/Rejected */}
                  {isPending && (
                    <View style={styles.statusOverlayPending}>
                      <AlertCircle size={14} color="#FFFFFF" />
                      <Text style={styles.statusOverlayText}>Pending</Text>
                    </View>
                  )}
                  {isRejected && (
                    <View style={styles.statusOverlayRejected}>
                      <XCircle size={14} color="#FFFFFF" />
                      <Text style={styles.statusOverlayText}>Rejected</Text>
                    </View>
                  )}
                  
                  {/* Bookmark Button - Overlay */}
                  <TouchableOpacity
                    style={[styles.bookmarkOverlay, isSaved && styles.bookmarkOverlayActive]}
                    onPress={() => toggleSaveJob(job.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Bookmark
                      size={18}
                      color={isSaved ? '#0F172A' : '#FFFFFF'}
                      fill={isSaved ? '#ffc857' : 'none'}
                    />
                  </TouchableOpacity>
                </View>

                {/* Content Section */}
                <View style={styles.cardContent}>
                  {/* Title & Company */}
                  <Text style={styles.jobTitle} numberOfLines={2}>
                    {job.title}
                  </Text>
                  <Text style={styles.companyName} numberOfLines={1}>
                    {job.company}
                  </Text>

                  {/* Meta Info Row */}
                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <MapPin size={13} color="#64748B" />
                      <Text style={styles.metaText} numberOfLines={1}>{job.location}</Text>
                    </View>
                    {job.salary && (
                      <>
                        <View style={styles.metaDot} />
                        <View style={styles.metaItem}>
                          <Wallet size={13} color="#64748B" />
                          <Text style={styles.metaText} numberOfLines={1}>{job.salary}</Text>
                        </View>
                      </>
                    )}
                  </View>

                  {/* Footer: Time + Action */}
                  <View style={styles.cardFooter}>
                    <View style={styles.timeTag}>
                      <Clock size={12} color="#64748B" />
                      <Text style={styles.timeTagText}>{timeAgo}</Text>
                    </View>

                    {isOwner ? (
                      isPending ? (
                        <View style={styles.pendingTag}>
                          <AlertCircle size={12} color="#F59E0B" />
                          <Text style={styles.pendingTagText}>Pending Review</Text>
                        </View>
                      ) : isRejected ? (
                        <TouchableOpacity 
                          style={styles.rejectedTag}
                          onPress={() => {
                            setSelectedRejectedJob(job);
                            setShowRejectionModal(true);
                          }}
                        >
                          <XCircle size={12} color="#EF4444" />
                          <Text style={styles.rejectedTagText}>Rejected - Tap for details</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.ownerTag}>
                          <Check size={12} color="#10B981" />
                          <Text style={styles.ownerTagText}>Approved</Text>
                        </View>
                      )
                    ) : (
                      <View style={styles.applyTag}>
                        <Text style={styles.applyTagText}>View Details</Text>
                        <ChevronRight size={14} color="#0F172A" />
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}
        >
          <View style={styles.filterBottomSheet}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <View style={styles.filterModalHeader}>
                <Text style={styles.filterModalTitle}>Filters</Text>
                <TouchableOpacity
                  onPress={() => setShowFilterModal(false)}
                  style={styles.modalCloseButton}
                >
                  <X size={24} color="#0F172A" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.filterModalContent} showsVerticalScrollIndicator={false}>
                {/* Salary Range */}
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Salary Range</Text>
                  <View style={styles.filterChipsGrid}>
                    {SALARY_RANGES.map((range) => (
                      <TouchableOpacity
                        key={range.id}
                        style={[
                          styles.filterChip,
                          selectedSalaryRange === range.id && styles.filterChipActive,
                        ]}
                        onPress={() => handleSalaryFilter(range.id)}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            selectedSalaryRange === range.id && styles.filterChipTextActive,
                          ]}
                        >
                          {range.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Posted Date */}
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Posted</Text>
                  <View style={styles.filterChipsGrid}>
                    {POSTED_FILTERS.map((filter) => (
                      <TouchableOpacity
                        key={filter.id}
                        style={[
                          styles.filterChip,
                          selectedPostedFilter === filter.id && styles.filterChipActive,
                        ]}
                        onPress={() => handlePostedFilter(filter.id)}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            selectedPostedFilter === filter.id && styles.filterChipTextActive,
                          ]}
                        >
                          {filter.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.filterModalActions}>
                  <TouchableOpacity
                    style={styles.filterClearButton}
                    onPress={clearAllFilters}
                  >
                    <Text style={styles.filterClearButtonText}>Clear All</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.filterApplyButton}
                    onPress={() => setShowFilterModal(false)}
                  >
                    <View style={styles.filterApplyButtonGradient}>
                      <Text style={styles.filterApplyButtonText}>Apply Filters</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Rejection Reason Modal */}
      <Modal
        visible={showRejectionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRejectionModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowRejectionModal(false)}
        >
          <View style={styles.rejectionModalContainer}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={styles.rejectionModalContent}>
                <View style={styles.rejectionModalHeader}>
                  <View style={styles.rejectionIconContainer}>
                    <XCircle size={32} color="#EF4444" />
                  </View>
                  <Text style={styles.rejectionModalTitle}>Job Listing Rejected</Text>
                  <TouchableOpacity
                    style={styles.rejectionCloseButton}
                    onPress={() => setShowRejectionModal(false)}
                  >
                    <X size={24} color="#64748B" />
                  </TouchableOpacity>
                </View>
                
                {selectedRejectedJob && (
                  <>
                    <Text style={styles.rejectionJobTitle}>{selectedRejectedJob.title}</Text>
                    <Text style={styles.rejectionCompany}>{selectedRejectedJob.company}</Text>
                    
                    <View style={styles.rejectionReasonContainer}>
                      <Text style={styles.rejectionReasonLabel}>Reason for Rejection:</Text>
                      <Text style={styles.rejectionReasonText}>
                        {selectedRejectedJob.rejection_reason || 'No specific reason provided by the administrator.'}
                      </Text>
                    </View>
                    
                    <View style={styles.rejectionInfoBox}>
                      <AlertCircle size={16} color="#64748B" />
                      <Text style={styles.rejectionInfoText}>
                        You can edit and resubmit this job listing after addressing the feedback above.
                      </Text>
                    </View>
                    
                    <View style={styles.rejectionModalActions}>
                      <TouchableOpacity
                        style={styles.rejectionEditButton}
                        onPress={() => {
                          setShowRejectionModal(false);
                          debouncedRouter.push(`/edit-job-listing/${selectedRejectedJob.id}`);
                        }}
                      >
                        <Text style={styles.rejectionEditButtonText}>Edit & Resubmit</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={styles.rejectionDismissButton}
                        onPress={() => setShowRejectionModal(false)}
                      >
                        <Text style={styles.rejectionDismissButtonText}>Dismiss</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Floating Action Button */}
      {user && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => debouncedRouter.push('/create-job-listing')}
          activeOpacity={0.9}
        >
          <View style={styles.fabGradient}>
            <Plus size={26} color="#0F172A" />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  
  // Header Styles
  headerContainer: {
    backgroundColor: '#0F172A',
    paddingTop: 56,
    paddingBottom: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adminBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  adminBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: 'Inter-Bold',
  },

  // Search
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  searchField: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#1F2937',
  },

  // Tabs
  tabScrollContainer: {
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 14,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    gap: 6,
  },
  tabItemActive: {
    backgroundColor: '#ffc857',
  },
  tabLabel: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#9CA3AF',
  },
  tabLabelActive: {
    color: '#0F172A',
  },
  tabCount: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 2,
  },
  tabCountActive: {
    backgroundColor: 'rgba(15, 23, 42, 0.15)',
  },
  tabCountText: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: '#9CA3AF',
  },
  tabCountTextActive: {
    color: '#0F172A',
  },
  applicationsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ffc857',
    gap: 6,
  },
  applicationsButtonText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#ffc857',
  },

  // Category Filters
  categoryContainer: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 4,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    gap: 6,
  },
  categoryChipText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },

  // Job Cards
  listContainer: {
    paddingHorizontal: 0,
    paddingTop: 8,
    paddingBottom: 100,
    backgroundColor: '#F8FAFC',
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 16,
    marginHorizontal: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  jobCardFirst: {
    marginTop: 12,
  },
  
  // Image Banner
  imageBanner: {
    width: '100%',
    height: 160,
    backgroundColor: '#F1F5F9',
    position: 'relative',
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
  typeBadgeOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  typeBadgeOverlayText: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bookmarkOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookmarkOverlayActive: {
    backgroundColor: '#ffc857',
  },
  
  // Card Content
  cardContent: {
    padding: 16,
  },
  jobTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    marginBottom: 4,
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  companyName: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    marginBottom: 12,
  },

  // Meta Row
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 14,
    gap: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
  },

  // Card Footer
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeTagText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  ownerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
  },
  ownerTagText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
  },
  applyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#ffc857',
    borderRadius: 8,
  },
  applyTagText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
  },

  // Loading & Empty States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 21,
  },
  clearFiltersBtn: {
    marginTop: 24,
    paddingHorizontal: 28,
    paddingVertical: 14,
    backgroundColor: '#ffc857',
    borderRadius: 12,
  },
  clearFiltersBtnText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
  },

  // Filter Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  filterBottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  filterModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterModalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
  },
  modalCloseButton: {
    padding: 4,
  },
  filterModalContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  filterSection: {
    marginBottom: 28,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    marginBottom: 12,
  },
  filterChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  filterChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  filterChipText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#ffc857',
    fontFamily: 'Inter-SemiBold',
  },
  filterModalActions: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 24,
  },
  filterClearButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  filterClearButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#64748B',
  },
  filterApplyButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
  },
  filterApplyButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  filterApplyButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#ffc857',
  },

  // Floating Action Button
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    borderRadius: 18,
    shadowColor: '#ffc857',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffc857',
  },
  
  // Status Overlay Badges
  statusOverlayPending: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#F59E0B',
  },
  statusOverlayRejected: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#EF4444',
  },
  statusOverlayText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  
  // Job Card Status Styles
  jobCardPending: {
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  jobCardRejected: {
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  
  // Status Tags in Footer
  pendingTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  pendingTagText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#F59E0B',
  },
  rejectedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  rejectedTagText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
  },
  
  // Rejection Modal Styles
  rejectionModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  rejectionModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 15,
  },
  rejectionModalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  rejectionIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  rejectionModalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    textAlign: 'center',
  },
  rejectionCloseButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 4,
  },
  rejectionJobTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    textAlign: 'center',
  },
  rejectionCompany: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
  },
  rejectionReasonContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  rejectionReasonLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#DC2626',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rejectionReasonText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#7F1D1D',
    lineHeight: 20,
  },
  rejectionInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  rejectionInfoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    lineHeight: 18,
  },
  rejectionModalActions: {
    gap: 10,
  },
  rejectionEditButton: {
    backgroundColor: '#0F172A',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  rejectionEditButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#ffc857',
  },
  rejectionDismissButton: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  rejectionDismissButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#64748B',
  },
});