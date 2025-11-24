import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Dimensions, ActivityIndicator, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useEffect, useState, useCallback } from 'react';
import { SplashScreen, useRouter, useFocusEffect } from 'expo-router';
import { Search, Filter, ArrowLeft, Briefcase, Clock, MapPin, Building2, GraduationCap, ChevronRight, BookOpen, Users, Plus, Calendar, TrendingUp, Bookmark, FileText } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 48;

const JOB_TYPES = [
  { id: '1', name: 'Full Time Jobs', icon: Briefcase, color: '#4169E1', bgColor: '#EBF0FF' },
  { id: '2', name: 'Internships', icon: GraduationCap, color: '#10B981', bgColor: '#D1FAE5' },
  { id: '3', name: 'National Service', icon: Users, color: '#F59E0B', bgColor: '#FEF3C7' },
  { id: '4', name: 'Part Time', icon: Clock, color: '#8B5CF6', bgColor: '#EDE9FE' },
  { id: '5', name: 'Remote Work', icon: Building2, color: '#EC4899', bgColor: '#FCE7F3' },
  { id: '6', name: 'Volunteering', icon: BookOpen, color: '#EF4444', bgColor: '#FEE2E2' },
];

export default function WorkplaceScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState('all');
  const [jobListings, setJobListings] = useState<any[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ total: 0, thisWeek: 0, trending: 0 });
  
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  const fetchJobListings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products_services')
        .select('*')
        .in('category_name', ['Full Time Jobs', 'Internships', 'National Service', 'Part Time', 'Remote Work', 'Volunteering'])
        .or('is_approved.eq.true,approval_status.eq.approved')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Calculate stats
      const total = data?.length || 0;
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const thisWeek = data?.filter(job => new Date(job.created_at) > oneWeekAgo).length || 0;
      const trending = data?.filter(job => {
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        return new Date(job.created_at) > twoDaysAgo;
      }).length || 0;
      
      setStats({ total, thisWeek, trending });
      setJobListings(data || []);
      setFilteredJobs(data || []);
    } catch (error) {
      console.error('❌ Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    filterJobs(text, selectedCategory, selectedCurrency, minPrice, maxPrice);
  };

  const handleFilter = (category: string) => {
    setSelectedCategory(category);
    filterJobs(searchQuery, category, selectedCurrency, minPrice, maxPrice);
  };

  const handleCurrencyFilter = (currency: string) => {
    setSelectedCurrency(currency);
    filterJobs(searchQuery, selectedCategory, currency, minPrice, maxPrice);
  };

  const handlePriceFilter = (min: string, max: string) => {
    setMinPrice(min);
    setMaxPrice(max);
    filterJobs(searchQuery, selectedCategory, selectedCurrency, min, max);
  };

  const filterJobs = (search: string, category: string, currency: string, minPriceVal: string, maxPriceVal: string) => {
    let filtered = jobListings;

    if (category && category !== '') {
      filtered = filtered.filter(job => job.category_name === category);
    }

    if (currency && currency !== '') {
      filtered = filtered.filter(job => job.currency === currency);
    }

    if (minPriceVal || maxPriceVal) {
      filtered = filtered.filter(job => {
        const jobPrice = parseFloat(job.price || 0);
        const min = minPriceVal ? parseFloat(minPriceVal) : 0;
        const max = maxPriceVal ? parseFloat(maxPriceVal) : Infinity;
        return jobPrice >= min && jobPrice <= max;
      });
    }

    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(job => {
        const title = (job.title || '').toLowerCase();
        const description = (job.description || '').toLowerCase();
        const category = (job.category_name || '').toLowerCase();
        
        return title.includes(searchLower) || 
               description.includes(searchLower) || 
               category.includes(searchLower);
      });
    }

    setFilteredJobs(filtered);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchJobListings();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchJobListings();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchJobListings();
    }, [])
  );

  const handleCategoryPress = (typeId: string) => {
    const jobType = JOB_TYPES.find(type => type.id === typeId);
    if (jobType) {
      router.push(`/workplace/category/${encodeURIComponent(jobType.name)}`);
    }
  };

  const handleJobPress = (jobId: string) => {
    router.push(`/job-detail/${jobId}` as any);
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  const hasActiveFilters = searchQuery || selectedCategory || selectedCurrency || minPrice || maxPrice;

  return (
    <View style={styles.container}>
      {/* Hero Header with Gradient */}
      <LinearGradient
        colors={['#4169E1', '#6B8FFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroHeader}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/hub')} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => router.push('/my-applications' as any)}
            >
              <FileText size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => router.push('/saved-jobs' as any)}
            >
              <Bookmark size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
        
        <Text style={styles.heroTitle}>Find Your Dream Job</Text>
        <Text style={styles.heroSubtitle}>Explore opportunities across Ghana</Text>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Briefcase size={20} color="#FFFFFF" />
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Jobs</Text>
          </View>
          <View style={styles.statCard}>
            <Calendar size={20} color="#FFFFFF" />
            <Text style={styles.statNumber}>{stats.thisWeek}</Text>
            <Text style={styles.statLabel}>This Week</Text>
          </View>
          <View style={styles.statCard}>
            <TrendingUp size={20} color="#FFFFFF" />
            <Text style={styles.statNumber}>{stats.trending}</Text>
            <Text style={styles.statLabel}>Trending</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchInputContainer}>
            <Search size={20} color="#666666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search jobs, internships, companies..."
              placeholderTextColor="#999999"
              value={searchQuery}
              onChangeText={handleSearch}
            />
            {hasActiveFilters && (
              <TouchableOpacity 
                onPress={() => {
                  handleSearch('');
                  handleFilter('');
                  setSelectedCurrency('');
                  setMinPrice('');
                  setMaxPrice('');
                }}
                style={styles.clearButton}
              >
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity 
            style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
            onPress={() => setShowFilterModal(!showFilterModal)}
          >
            <Filter size={20} color={hasActiveFilters ? '#FFFFFF' : '#4169E1'} />
          </TouchableOpacity>
        </View>

        {/* Filter Modal */}
        {showFilterModal && (
          <View style={styles.filterModal}>
            <Text style={styles.filterTitle}>Filter Jobs</Text>
            
            <Text style={styles.filterSectionTitle}>Category</Text>
            <ScrollView style={styles.filterSection} nestedScrollEnabled={true}>
              <TouchableOpacity 
                style={[styles.filterOption, !selectedCategory && styles.activeFilterOption]}
                onPress={() => handleFilter('')}
              >
                <Text style={[styles.filterOptionText, !selectedCategory && styles.activeFilterOptionText]}>
                  All Categories
                </Text>
              </TouchableOpacity>
              {JOB_TYPES.map((type) => (
                <TouchableOpacity 
                  key={type.id}
                  style={[styles.filterOption, selectedCategory === type.name && styles.activeFilterOption]}
                  onPress={() => handleFilter(type.name)}
                >
                  <Text style={[styles.filterOptionText, selectedCategory === type.name && styles.activeFilterOptionText]}>
                    {type.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.filterSectionTitle}>Salary Currency</Text>
            <View style={styles.currencyContainer}>
              <TouchableOpacity 
                style={[styles.currencyButton, !selectedCurrency && styles.activeCurrencyButton]}
                onPress={() => handleCurrencyFilter('')}
              >
                <Text style={[styles.currencyButtonText, !selectedCurrency && styles.activeCurrencyButtonText]}>All</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.currencyButton, selectedCurrency === 'USD' && styles.activeCurrencyButton]}
                onPress={() => handleCurrencyFilter('USD')}
              >
                <Text style={[styles.currencyButtonText, selectedCurrency === 'USD' && styles.activeCurrencyButtonText]}>USD</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.currencyButton, selectedCurrency === 'GHS' && styles.activeCurrencyButton]}
                onPress={() => handleCurrencyFilter('GHS')}
              >
                <Text style={[styles.currencyButtonText, selectedCurrency === 'GHS' && styles.activeCurrencyButtonText]}>GHS (₵)</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.filterSectionTitle}>Salary Range</Text>
            <View style={styles.priceRangeContainer}>
              <View style={styles.priceInputWrapper}>
                <Text style={styles.priceLabel}>Min</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="0"
                  placeholderTextColor="#999999"
                  keyboardType="numeric"
                  value={minPrice}
                  onChangeText={(text) => setMinPrice(text)}
                />
              </View>
              <Text style={styles.priceSeparator}>—</Text>
              <View style={styles.priceInputWrapper}>
                <Text style={styles.priceLabel}>Max</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="∞"
                  placeholderTextColor="#999999"
                  keyboardType="numeric"
                  value={maxPrice}
                  onChangeText={(text) => setMaxPrice(text)}
                />
              </View>
            </View>

            <View style={styles.filterActions}>
              <TouchableOpacity 
                style={styles.clearFiltersButton}
                onPress={() => {
                  setSelectedCategory('');
                  setSelectedCurrency('');
                  setMinPrice('');
                  setMaxPrice('');
                  filterJobs(searchQuery, '', '', '', '');
                }}
              >
                <Text style={styles.clearFiltersText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.applyFiltersButton}
                onPress={() => {
                  handlePriceFilter(minPrice, maxPrice);
                  setShowFilterModal(false);
                }}
              >
                <Text style={styles.applyFiltersText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Job Categories */}
        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>Browse by Category</Text>
          <View style={styles.categoriesGrid}>
            {JOB_TYPES.map((type) => {
              const IconComponent = type.icon;
              return (
                <TouchableOpacity
                  key={type.id}
                  style={[styles.categoryCard, { backgroundColor: type.bgColor }]}
                  onPress={() => handleCategoryPress(type.id)}
                >
                  <View style={[styles.categoryIconWrapper, { backgroundColor: type.color + '20' }]}>
                    <IconComponent size={24} color={type.color} />
                  </View>
                  <Text style={styles.categoryName}>{type.name}</Text>
                  <ChevronRight size={16} color={type.color} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Featured Jobs */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Opportunities</Text>
            <Text style={styles.sectionCount}>{filteredJobs.length} jobs</Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4169E1" />
              <Text style={styles.loadingText}>Loading opportunities...</Text>
            </View>
          ) : filteredJobs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Briefcase size={48} color="#CCCCCC" />
              <Text style={styles.emptyText}>No jobs found</Text>
              <Text style={styles.emptySubtext}>
                {hasActiveFilters 
                  ? 'Try adjusting your filters' 
                  : 'Be the first to post a job!'}
              </Text>
            </View>
          ) : (
            filteredJobs.map((job) => {
              // Parse image_url
              let imageUrl = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800';
              if (job.image_url) {
                if (job.image_url.startsWith('[')) {
                  try {
                    const parsed = JSON.parse(job.image_url);
                    imageUrl = Array.isArray(parsed) && parsed[0] ? parsed[0] : imageUrl;
                  } catch (e) {
                    imageUrl = job.image_url;
                  }
                } else {
                  imageUrl = job.image_url;
                }
              }
              
              // Parse description
              const parts = (job.description || '').split('|');
              const company = parts[0]?.trim() || 'Company';
              const location = parts[1]?.trim() || 'Location';
              
              // Get job type config
              const jobTypeConfig = JOB_TYPES.find(t => t.name === job.category_name);
              
              return (
                <TouchableOpacity 
                  key={job.id} 
                  style={styles.jobCard}
                  onPress={() => handleJobPress(job.id)}
                  activeOpacity={0.7}
                >
                  <Image 
                    source={{ uri: imageUrl }} 
                    style={styles.jobImage} 
                    contentFit="cover"
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.8)']}
                    style={styles.jobImageOverlay}
                  />
                  
                  <View style={styles.jobContent}>
                    <View style={[styles.jobBadge, { backgroundColor: jobTypeConfig?.bgColor || '#EBF0FF' }]}>
                      <Text style={[styles.jobBadgeText, { color: jobTypeConfig?.color || '#4169E1' }]}>
                        {job.category_name}
                      </Text>
                    </View>
                    
                    <Text style={styles.jobTitle} numberOfLines={2}>{job.title}</Text>
                    
                    <View style={styles.jobMeta}>
                      <View style={styles.jobMetaItem}>
                        <Building2 size={14} color="#666666" />
                        <Text style={styles.jobMetaText} numberOfLines={1}>{company}</Text>
                      </View>
                      <View style={styles.jobMetaItem}>
                        <MapPin size={14} color="#666666" />
                        <Text style={styles.jobMetaText} numberOfLines={1}>{location}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.jobFooter}>
                      {job.price && (
                        <View style={styles.salaryContainer}>
                          <Text style={styles.salaryText}>₵{job.price}</Text>
                          <Text style={styles.salaryPeriod}>/month</Text>
                        </View>
                      )}
                      <Text style={styles.postedTime}>{getRelativeTime(job.created_at)}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
      
      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => router.push('/create-job-listing')}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#4169E1', '#6B8FFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Plus size={24} color="#FFFFFF" strokeWidth={3} />
          <Text style={styles.fabText}>Post Job</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  heroHeader: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  statNumber: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  scrollContent: {
    flex: 1,
  },
  searchSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  clearButtonText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  filterButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  filterButtonActive: {
    backgroundColor: '#4169E1',
  },
  filterModal: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  filterTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#000000',
    marginBottom: 20,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
    marginTop: 16,
    marginBottom: 12,
  },
  filterSection: {
    maxHeight: 180,
  },
  filterOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F8F9FA',
  },
  activeFilterOption: {
    backgroundColor: '#4169E1',
  },
  filterOptionText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  activeFilterOptionText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
  },
  currencyContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  currencyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
  },
  activeCurrencyButton: {
    backgroundColor: '#4169E1',
  },
  currencyButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  activeCurrencyButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
  },
  priceRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priceInputWrapper: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
    marginBottom: 8,
  },
  priceInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  priceSeparator: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginTop: 24,
  },
  filterActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  clearFiltersButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4169E1',
    alignItems: 'center',
  },
  clearFiltersText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  applyFiltersButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#4169E1',
    alignItems: 'center',
  },
  applyFiltersText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  categoriesSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#000000',
    marginBottom: 16,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: (width - 52) / 2,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  categoryIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionCount: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  jobImage: {
    width: '100%',
    height: 180,
  },
  jobImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
  },
  jobContent: {
    padding: 16,
  },
  jobBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  jobBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  jobTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#000000',
    marginBottom: 12,
  },
  jobMeta: {
    gap: 8,
    marginBottom: 16,
  },
  jobMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  jobMetaText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  salaryContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  salaryText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#10B981',
  },
  salaryPeriod: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginLeft: 4,
  },
  postedTime: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#999999',
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#999999',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    borderRadius: 30,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
    gap: 8,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
});
