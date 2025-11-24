import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, TextInput, Dimensions, ActivityIndicator, RefreshControl } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState, useCallback } from 'react';
import { SplashScreen, useRouter, useFocusEffect } from 'expo-router';
import { Search, Filter, ArrowLeft, Briefcase, Clock, MapPin, Building2, GraduationCap, ChevronRight, BookOpen, Users, Wallet, Plus, Calendar } from 'lucide-react-native';
import { supabase, Job } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 48;

const JOB_TYPES = [
  { id: '1', name: 'Full Time Jobs', icon: Briefcase },
  { id: '2', name: 'Internships', icon: GraduationCap },
  { id: '3', name: 'National Service', icon: Users },
  { id: '4', name: 'Part Time', icon: Clock },
  { id: '5', name: 'Remote Work', icon: Building2 },
  { id: '6', name: 'Volunteering', icon: BookOpen },
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
  const [activeFilter, setActiveFilter] = useState('all');
  const [jobListings, setJobListings] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  const fetchJobListings = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching job listings from jobs table...');
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
      if (data && data.length > 0) {
        console.log('📋 Sample job:', data[0]);
      }
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

    // Filter by job type
    if (category && category !== '') {
      filtered = filtered.filter(job => job.job_type === category);
    }

    // Filter by salary (jobs use salary field, not price)
    if (minPriceVal || maxPriceVal) {
      filtered = filtered.filter(job => {
        // Parse salary from string like "$2,000 - $3,500/month"
        const salaryStr = job.salary || '';
        const salaryMatch = salaryStr.match(/\$?([\d,]+)/);
        const jobSalary = salaryMatch ? parseFloat(salaryMatch[1].replace(/,/g, '')) : 0;
        const min = minPriceVal ? parseFloat(minPriceVal) : 0;
        const max = maxPriceVal ? parseFloat(maxPriceVal) : Infinity;
        return jobSalary >= min && jobSalary <= max;
      });
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
        const salary = (job.salary || '').toLowerCase();
        
        return title.includes(searchLower) || 
               description.includes(searchLower) || 
               company.includes(searchLower) ||
               location.includes(searchLower) ||
               jobType.includes(searchLower) ||
               salary.includes(searchLower);
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
    // Always navigate to job detail page
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

  return (
    <View style={styles.container}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/hub')} style={styles.backButton}>
            <ArrowLeft size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.title}>Workplace</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Search size={20} color="#666666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search jobs, internships..."
              placeholderTextColor="#666666"
              value={searchQuery}
              onChangeText={handleSearch}
            />
            {(searchQuery || selectedCategory || selectedCurrency || minPrice || maxPrice) && (
              <TouchableOpacity 
                onPress={() => {
                  handleSearch('');
                  handleFilter('');
                  setSelectedCurrency('');
                  setMinPrice('');
                  setMaxPrice('');
                }}
                style={{ padding: 4 }}
              >
                <Text style={{ color: '#4169E1', fontSize: 14, fontFamily: 'Inter-SemiBold' }}>
                  Clear
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity 
            style={styles.filterIconButton}
            onPress={() => setShowFilterModal(!showFilterModal)}
          >
            <Filter size={24} color={(selectedCategory || selectedCurrency || minPrice || maxPrice) ? '#4169E1' : '#000000'} />
          </TouchableOpacity>
        </View>

        {/* Filter Modal */}
        {showFilterModal && (
          <View style={styles.filterModal}>
            <Text style={styles.filterTitle}>Filter Jobs</Text>
            
            {/* Category Filter */}
            <Text style={styles.filterSectionTitle}>Category</Text>
            <ScrollView style={styles.filterSection} nestedScrollEnabled={true}>
              <TouchableOpacity 
                style={[styles.filterOption, !selectedCategory && styles.activeFilterOption]}
                onPress={() => handleFilter('')}
              >
                <Text style={[styles.filterOptionText, !selectedCategory && styles.activeFilterOptionText]}>All Categories</Text>
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

            {/* Currency Filter */}
            <Text style={styles.filterSectionTitle}>Currency</Text>
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

            {/* Price Range Filter */}
            <Text style={styles.filterSectionTitle}>Price Range</Text>
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
              <Text style={styles.priceSeparator}>-</Text>
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

            {/* Action Buttons */}
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
                <Text style={styles.applyFiltersText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.typesScroll}
          contentContainerStyle={styles.typesContent}
        >
          {JOB_TYPES.map((type) => {
            const IconComponent = type.icon;
            return (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.typeButton,
                  activeFilter === type.id && styles.activeTypeButton,
                ]}
                onPress={() => handleCategoryPress(type.id)}
              >
                <IconComponent
                  size={24}
                  color={activeFilter === type.id ? '#FFFFFF' : '#000000'}
                />
                <Text
                  style={[
                    styles.typeName,
                    activeFilter === type.id && styles.activeTypeName,
                  ]}
                >
                  {type.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Job Listings ({jobListings.length})</Text>
            <TouchableOpacity style={styles.seeAllButton} onPress={onRefresh}>
              <Text style={styles.seeAllText}>Refresh</Text>
              <ChevronRight size={16} color="#666666" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4169E1" />
              <Text style={styles.loadingText}>Loading jobs...</Text>
            </View>
          ) : filteredJobs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Briefcase size={48} color="#CCCCCC" />
              <Text style={styles.emptyText}>No job listings found</Text>
              <Text style={styles.emptySubtext}>
                {searchQuery || selectedCategory 
                  ? 'Try adjusting your search or filters' 
                  : 'Be the first to post a job!'}
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredContent}
            >
              {filteredJobs.slice(0, 5).map((job) => {
                // Parse image_url if it's a JSON string
                let images = [];
                if (job.image_url) {
                  if (job.image_url.startsWith('[')) {
                    try {
                      const parsed = JSON.parse(job.image_url);
                      images = Array.isArray(parsed) ? parsed : [job.image_url];
                    } catch (e) {
                      images = [job.image_url];
                    }
                  } else {
                    images = [job.image_url];
                  }
                }
                if (images.length === 0) {
                  images = ['https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800'];
                }
                
                const CARD_WIDTH_FEATURED = width - 48;
                
                return (
                  <TouchableOpacity 
                    key={job.id} 
                    style={styles.featuredCard}
                    onPress={() => handleJobPress(job.id)}
                  >
                    <View style={styles.featuredImageContainer}>
                      <ScrollView 
                        horizontal 
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        style={styles.imageGallery}
                      >
                        {images.map((uri, idx) => (
                          <Image 
                            key={`${uri}-${idx}`}
                            source={{ uri, cache: 'force-cache' }} 
                            style={[styles.featuredImage, { width: CARD_WIDTH_FEATURED }]} 
                            resizeMode="cover"
                          />
                        ))}
                      </ScrollView>
                      {images.length > 1 && (
                        <View style={styles.imageIndicatorContainer}>
                          {images.map((_, idx) => (
                            <View key={idx} style={styles.imageIndicator} />
                          ))}
                        </View>
                      )}
                    </View>
                    <View style={styles.featuredInfo}>
                      <View style={styles.jobTypeTag}>
                        <Clock size={14} color="#4169E1" />
                        <Text style={styles.jobTypeText}>{job.job_type}</Text>
                      </View>
                      <Text style={styles.jobTitle}>{job.title}</Text>
                      <View style={styles.companyInfo}>
                        <Building2 size={14} color="#666666" />
                        <Text style={styles.companyName}>{job.company}</Text>
                      </View>
                      <View style={styles.locationInfo}>
                        <MapPin size={14} color="#666666" />
                        <Text style={styles.locationText}>{job.location}</Text>
                      </View>
                      {job.salary && (
                        <View style={styles.salaryInfo}>
                          <Wallet size={14} color="#666666" />
                          <Text style={styles.salaryText}>{job.salary}</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Opportunities</Text>
            <TouchableOpacity 
              style={styles.seeAllButton}
              onPress={() => router.push('/workplace/recent-opportunities' as any)}
            >
              <Text style={styles.seeAllText}>See All</Text>
              <ChevronRight size={16} color="#666666" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#4169E1" />
            </View>
          ) : filteredJobs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptySubtext}>No opportunities found</Text>
            </View>
          ) : (
            filteredJobs.slice(0, 5).map((job) => {
              // Parse images
              let images = [];
              if (job.image_url) {
                if (job.image_url.startsWith('[')) {
                  try {
                    const parsed = JSON.parse(job.image_url);
                    images = Array.isArray(parsed) ? parsed : [job.image_url];
                  } catch (e) {
                    images = [job.image_url];
                  }
                } else {
                  images = [job.image_url];
                }
              }
              if (images.length === 0) {
                images = ['https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800'];
              }
              
              // Calculate days since posted
              const postedDate = new Date(job.created_at);
              const today = new Date();
              const diffDays = Math.ceil((today.getTime() - postedDate.getTime()) / (1000 * 60 * 60 * 24));
              let postedAgo = diffDays === 0 ? 'Today' : diffDays === 1 ? 'Yesterday' : `${diffDays} days ago`;
              
              // Calculate deadline (30 days from posting)
              const deadline = new Date(job.created_at);
              deadline.setDate(deadline.getDate() + 30);
              const daysLeft = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              const deadlineText = daysLeft > 0 ? `${daysLeft} days left` : 'Expired';

              const OPP_CARD_WIDTH = width - 32;

              return (
                <TouchableOpacity 
                  key={job.id} 
                  style={styles.opportunityCard}
                  onPress={() => handleJobPress(job.id)}
                >
                  <View style={styles.opportunityImageContainer}>
                    <ScrollView 
                      horizontal 
                      pagingEnabled
                      showsHorizontalScrollIndicator={false}
                      style={styles.imageGallery}
                    >
                      {images.map((uri, idx) => (
                        <Image 
                          key={`${uri}-${idx}`}
                          source={{ uri, cache: 'force-cache' }} 
                          style={[styles.opportunityImage, { width: OPP_CARD_WIDTH }]} 
                          resizeMode="cover"
                        />
                      ))}
                    </ScrollView>
                    {images.length > 1 && (
                      <View style={styles.imageIndicatorContainer}>
                        {images.map((_, idx) => (
                          <View key={idx} style={styles.imageIndicator} />
                        ))}
                      </View>
                    )}
                  </View>
                  <View style={styles.opportunityInfo}>
                    <Text style={styles.opportunityTitle}>{job.title}</Text>
                    <Text style={styles.organizationName}>{job.company}</Text>
                    <View style={styles.opportunityDetails}>
                      <View style={styles.detailItem}>
                        <MapPin size={14} color="#666666" />
                        <Text style={styles.detailText}>{job.location}</Text>
                      </View>
                      {job.salary && (
                        <View style={styles.detailItem}>
                          <Wallet size={14} color="#666666" />
                          <Text style={styles.detailText}>{job.salary}</Text>
                        </View>
                      )}
                      <View style={styles.detailItem}>
                        <Clock size={14} color="#666666" />
                        <Text style={styles.detailText}>{postedAgo}</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Calendar size={14} color={daysLeft < 7 ? "#EF4444" : "#666666"} />
                        <Text style={[styles.detailText, daysLeft < 7 && styles.urgentText]}>{deadlineText}</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
      
      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={() => router.push('/create-job-listing')}
      >
        <Plus size={24} color="#FFFFFF" />
        <Text style={styles.floatingButtonText}>Post Job</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  filterButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  filterIconButton: {
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    height: 48,
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  typesScroll: {
    marginBottom: 24,
  },
  typesContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  activeTypeButton: {
    backgroundColor: '#4169E1',
  },
  typeName: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  activeTypeName: {
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  featuredContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  featuredCard: {
    width: CARD_WIDTH,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  featuredImageContainer: {
    width: '100%',
    height: 200,
    backgroundColor: '#F3F4F6',
    position: 'relative',
    overflow: 'hidden',
  },
  imageGallery: {
    width: '100%',
    height: '100%',
  },
  featuredImage: {
    width: width - 48,
    height: 200,
    backgroundColor: '#F3F4F6',
  },
  imageIndicatorContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  imageIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  featuredInfo: {
    padding: 16,
    gap: 8,
  },
  jobTypeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EBF0FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  jobTypeText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  jobTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  companyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  companyName: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  salaryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  salaryText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  requirementsTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  requirementTag: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  requirementText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  opportunityCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  opportunityImageContainer: {
    width: '100%',
    height: 180,
    backgroundColor: '#F3F4F6',
    position: 'relative',
    overflow: 'hidden',
  },
  opportunityImage: {
    width: width - 32,
    height: 180,
    backgroundColor: '#F3F4F6',
  },
  opportunityInfo: {
    flex: 1,
    padding: 12,
    gap: 4,
  },
  opportunityTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  organizationName: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  opportunityDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  urgentText: {
    color: '#EF4444',
    fontFamily: 'Inter-SemiBold',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#4169E1',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  floatingButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#999999',
  },
  filterModal: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxHeight: 500,
  },
  filterTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 16,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
    marginTop: 12,
    marginBottom: 8,
  },
  filterSection: {
    maxHeight: 150,
    marginBottom: 8,
  },
  filterOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F8F9FA',
  },
  activeFilterOption: {
    backgroundColor: '#4169E1',
  },
  filterOptionText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  activeFilterOptionText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
  },
  currencyContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  currencyButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
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
    marginBottom: 16,
  },
  priceInputWrapper: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 4,
  },
  priceInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  priceSeparator: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginTop: 16,
  },
  filterActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  clearFiltersButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4169E1',
    alignItems: 'center',
  },
  clearFiltersText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  applyFiltersButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#4169E1',
    alignItems: 'center',
  },
  applyFiltersText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});