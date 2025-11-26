import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, TextInput, Dimensions, ActivityIndicator, RefreshControl, FlatList, Modal, Animated, Alert } from 'react-native';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useEffect, useState, useCallback, useRef } from 'react';
import { SplashScreen, useRouter, useFocusEffect } from 'expo-router';
import { Search, Filter, ArrowLeft, Briefcase, Clock, MapPin, Building2, GraduationCap, ChevronRight, BookOpen, Users, Wallet, Plus, Calendar, Bookmark, TrendingUp, DollarSign, X, Check } from 'lucide-react-native';
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
  { id: 'under_1k', label: 'Under $1,000', min: 0, max: 1000 },
  { id: '1k_3k', label: '$1,000 - $3,000', min: 1000, max: 3000 },
  { id: '3k_5k', label: '$3,000 - $5,000', min: 3000, max: 5000 },
  { id: 'over_5k', label: 'Over $5,000', min: 5000, max: Infinity },
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
    salary: '$3,000 - $5,000/month',
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
    salary: '$500/month',
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
    salary: '$2,000 - $3,500/month',
    posted: '3 days ago',
    image: 'https://images.unsplash.com/photo-1551836022-4c4c79ecde51?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: '3',
    title: 'Product Design Intern',
    company: 'Creative Hub',
    location: 'Remote',
    salary: '$800/month',
    posted: '1 week ago',
    image: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: '4',
    title: 'Business Development',
    company: 'Growth Partners',
    location: 'Accra, Ghana',
    salary: '$1,500 - $2,500/month',
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
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  
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
      
      // Filter jobs posted by current user
      if (user) {
        const userJobs = data?.filter(job => job.user_id === user.id) || [];
        setMyJobs(userJobs);
      }
      
      applyFilters(data || [], searchQuery, selectedJobType, selectedSalaryRange, selectedPostedFilter);
    } catch (error) {
      console.error('❌ Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (
    jobs: Job[],
    search: string,
    jobType: string,
    salaryRange: string,
    postedFilter: string
  ) => {
    let filtered = [...jobs];

    // Filter by tab
    if (activeTab === 'my-jobs' && user) {
      filtered = filtered.filter(job => job.user_id === user.id);
    } else if (activeTab === 'saved') {
      filtered = filtered.filter(job => savedJobs.includes(job.id));
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
  }, []);

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
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  useEffect(() => {
    applyFilters(jobListings, searchQuery, selectedJobType, selectedSalaryRange, selectedPostedFilter);
  }, [activeTab, savedJobs]);

  useFocusEffect(
    useCallback(() => {
      fetchJobListings();
    }, [])
  );

  const handleJobPress = (jobId: string) => {
    router.push(`/job-detail/${jobId}` as any);
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
    const today = new Date();
    const diffDays = Math.ceil((today.getTime() - postedDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  return (
    <View style={styles.container}>
      {/* Modern Header */}
      <View style={styles.modernHeader}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Internships & Jobs</Text>
          <TouchableOpacity onPress={() => setShowFilterModal(true)} style={styles.filterButton}>
            <Filter size={22} color={(selectedJobType !== 'all' || selectedSalaryRange !== 'all' || selectedPostedFilter !== 'all') ? '#4169E1' : '#6B7280'} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchWrapper}>
          <View style={styles.searchBar}>
            <Search size={20} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by title, company, or location..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={handleSearch}
            />
            {searchQuery !== '' && (
              <TouchableOpacity onPress={() => handleSearch('')}>
                <X size={18} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'all' && styles.tabActive]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
              All Jobs
            </Text>
            {activeTab === 'all' && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
          
          {user && (
            <TouchableOpacity
              style={[styles.tab, activeTab === 'my-jobs' && styles.tabActive]}
              onPress={() => setActiveTab('my-jobs')}
            >
              <Text style={[styles.tabText, activeTab === 'my-jobs' && styles.tabTextActive]}>
                My Jobs ({myJobs.length})
              </Text>
              {activeTab === 'my-jobs' && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'saved' && styles.tabActive]}
            onPress={() => setActiveTab('saved')}
          >
            <Text style={[styles.tabText, activeTab === 'saved' && styles.tabTextActive]}>
              Saved ({savedJobs.length})
            </Text>
            {activeTab === 'saved' && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        </View>

        {/* Quick Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickFiltersContainer}
        >
          {JOB_TYPES.map((type) => {
            const IconComponent = type.icon;
            const isActive = selectedJobType === type.id;
            return (
              <TouchableOpacity
                key={type.id}
                style={[styles.quickFilterChip, isActive && { backgroundColor: type.color }]}
                onPress={() => handleJobTypeFilter(type.id)}
              >
                <IconComponent size={16} color={isActive ? '#FFFFFF' : type.color} />
                <Text style={[styles.quickFilterText, isActive && styles.quickFilterTextActive]}>
                  {type.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Job Listings */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4169E1" />
          <Text style={styles.loadingText}>Finding opportunities...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredJobs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#4169E1"
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
          renderItem={({ item: job }) => {
            const jobColor = getJobTypeColor(job.job_type);
            const timeAgo = formatTimeAgo(job.created_at);
            const isOwner = user && job.user_id === user.id;
            const isSaved = savedJobs.includes(job.id);

            return (
              <TouchableOpacity
                style={styles.jobCard}
                onPress={() => handleJobPress(job.id)}
                onLongPress={() => handleJobLongPress(job)}
                activeOpacity={0.7}
              >
                {/* Job Header */}
                <View style={styles.jobCardHeader}>
                  <View style={styles.companyLogoContainer}>
                    {job.image_url ? (
                      <Image
                        source={{ uri: typeof job.image_url === 'string' && job.image_url.startsWith('[') 
                          ? JSON.parse(job.image_url)[0] 
                          : job.image_url 
                        }}
                        style={styles.companyLogoImage}
                      />
                    ) : (
                      <Building2 size={24} color={jobColor} />
                    )}
                  </View>
                  
                  <View style={styles.jobCardHeaderInfo}>
                    <Text style={styles.jobCardTitle} numberOfLines={2}>
                      {job.title}
                    </Text>
                    <Text style={styles.jobCardCompany} numberOfLines={1}>
                      {job.company}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.bookmarkButton}
                    onPress={() => toggleSaveJob(job.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Bookmark
                      size={20}
                      color={isSaved ? '#4169E1' : '#9CA3AF'}
                      fill={isSaved ? '#4169E1' : 'none'}
                    />
                  </TouchableOpacity>
                </View>

                {/* Job Details */}
                <View style={styles.jobCardDetails}>
                  <View style={styles.jobDetailItem}>
                    <MapPin size={14} color="#6B7280" />
                    <Text style={styles.jobDetailText} numberOfLines={1}>
                      {job.location}
                    </Text>
                  </View>

                  <View style={styles.jobDetailItem}>
                    <Clock size={14} color="#6B7280" />
                    <Text style={styles.jobDetailText}>{timeAgo}</Text>
                  </View>

                  {job.salary && (
                    <View style={styles.jobDetailItem}>
                      <DollarSign size={14} color="#6B7280" />
                      <Text style={styles.jobDetailText} numberOfLines={1}>
                        {job.salary}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Job Type Badge & Status */}
                <View style={styles.jobCardFooter}>
                  <View style={[styles.jobTypeBadge, { backgroundColor: `${jobColor}15` }]}>
                    <Text style={[styles.jobTypeBadgeText, { color: jobColor }]}>
                      {job.job_type}
                    </Text>
                  </View>

                  {isOwner && (
                    <View style={styles.ownerBadge}>
                      <Check size={12} color="#10B981" />
                      <Text style={styles.ownerBadgeText}>Your Post</Text>
                    </View>
                  )}

                  {!isOwner && (
                    <View style={styles.applyBadge}>
                      <TrendingUp size={12} color="#4169E1" />
                      <Text style={styles.applyBadgeText}>Apply Now</Text>
                    </View>
                  )}
                </View>

                {/* Description Preview */}
                {job.description && (
                  <Text style={styles.jobCardDescription} numberOfLines={2}>
                    {job.description}
                  </Text>
                )}
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
                  <X size={24} color="#1F2937" />
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
                    <LinearGradient
                      colors={['#4169E1', '#3B5DCB']}
                      style={styles.filterApplyButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Text style={styles.filterApplyButtonText}>Apply Filters</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Floating Action Button */}
      {user && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/create-job-listing')}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#4169E1', '#3B5DCB']}
            style={styles.fabGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Plus size={24} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  
  // Modern Header Styles
  modernHeader: {
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    flex: 1,
    textAlign: 'center',
  },
  filterButton: {
    padding: 8,
  },

  // Search Bar
  searchWrapper: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#1F2937',
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  tabActive: {},
  tabText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#4169E1',
    fontFamily: 'Inter-SemiBold',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#4169E1',
    borderRadius: 2,
  },

  // Quick Filters
  quickFiltersContainer: {
    paddingHorizontal: 20,
    gap: 8,
  },
  quickFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickFilterText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#374151',
  },
  quickFilterTextActive: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
  },

  // Job Cards
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  jobCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  companyLogoContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  companyLogoImage: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  jobCardHeaderInfo: {
    flex: 1,
  },
  jobCardTitle: {
    fontSize: 17,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 4,
    lineHeight: 24,
  },
  jobCardCompany: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  bookmarkButton: {
    padding: 4,
  },

  // Job Details
  jobCardDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 12,
  },
  jobDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  jobDetailText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },

  // Job Footer
  jobCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  jobTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  jobTypeBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  ownerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#ECFDF5',
    borderRadius: 6,
  },
  ownerBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#10B981',
  },
  applyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  applyBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },

  // Description
  jobCardDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
  },

  // Loading & Empty States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  clearFiltersBtn: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#4169E1',
    borderRadius: 12,
  },
  clearFiltersBtnText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },

  // Filter Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterBottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.8,
  },
  filterModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  filterModalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
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
    color: '#1F2937',
    marginBottom: 12,
  },
  filterChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#4169E1',
    borderColor: '#4169E1',
  },
  filterChipText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
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
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  filterClearButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  filterApplyButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  filterApplyButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  filterApplyButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },

  // Floating Action Button
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    borderRadius: 30,
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
});