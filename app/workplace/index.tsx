import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, TextInput, Dimensions, Modal, ActivityIndicator } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter } from 'expo-router';
import { Search, Filter, ArrowLeft, Briefcase, Clock, MapPin, Building2, GraduationCap, ChevronRight, BookOpen, Users, Wallet, Plus, X, TrendingUp, TrendingDown, Calendar, DollarSign } from 'lucide-react-native';
import { supabase, type Job } from '@/lib/supabase';

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
    type: 'Full Time Jobs',
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
    type: 'Internships',
    salary: '$500/month',
    posted: '1 day ago',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=60',
    requirements: ['Final year student', 'Marketing major', 'Creative mindset'],
  },
  {
    id: '3',
    title: 'Remote Frontend Developer',
    company: 'Digital Solutions',
    location: 'Remote',
    type: 'Remote Work',
    salary: '$2,500 - $4,000/month',
    posted: '3 days ago',
    image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=60',
    requirements: ['React', 'TypeScript', '2+ years experience'],
  },
  {
    id: '7',
    title: 'National Service - IT Support',
    company: 'National Communications Authority',
    location: 'Accra, Ghana',
    type: 'National Service',
    salary: 'Government Allowance',
    posted: '1 week ago',
    image: 'https://images.unsplash.com/photo-1573164713988-8665fc963095?w=800&auto=format&fit=crop&q=60',
    requirements: ['IT background', 'Service placement', 'Available for 1 year'],
  },
  {
    id: '8',
    title: 'Part-Time Content Writer',
    company: 'Creative Studios',
    location: 'Accra, Ghana',
    type: 'Part Time',
    salary: '$600/month',
    posted: '2 days ago',
    image: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&auto=format&fit=crop&q=60',
    requirements: ['Good writing skills', 'Flexible hours', 'Portfolio required'],
  },
  {
    id: '9',
    title: 'Volunteer Community Organizer',
    company: 'Youth Impact Foundation',
    location: 'Kumasi, Ghana',
    type: 'Volunteering',
    posted: '3 days ago',
    image: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&auto=format&fit=crop&q=60',
    requirements: ['Passion for community work', 'Good communication', 'Weekend availability'],
  },
  {
    id: '10',
    title: 'Senior Accountant',
    company: 'Finance Group Ltd',
    location: 'Accra, Ghana',
    type: 'Full Time Jobs',
    salary: '$4,000 - $6,000/month',
    posted: '4 days ago',
    image: 'https://images.unsplash.com/photo-1554224311-beee2f770c4f?w=800&auto=format&fit=crop&q=60',
    requirements: ['CPA/ACCA', '5+ years experience', 'ERP knowledge'],
  },
  {
    id: '11',
    title: 'Engineering Intern',
    company: 'Tech Manufacturing Co',
    location: 'Tema, Ghana',
    type: 'Internships',
    salary: '$400/month',
    posted: '5 days ago',
    image: 'https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?w=800&auto=format&fit=crop&q=60',
    requirements: ['Engineering student', '3rd/4th year', 'Available 6 months'],
  },
];

const RECENT_OPPORTUNITIES = [
  {
    id: '1',
    title: 'National Service - Teaching',
    organization: 'Ministry of Education',
    company: 'Ministry of Education',
    location: 'Various Locations',
    type: 'National Service',
    deadline: '2 weeks left',
    image: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: '2',
    title: 'Data Analyst',
    company: 'FinTech Solutions',
    location: 'Tema, Ghana',
    type: 'Full Time Jobs',
    salary: '$2,000 - $3,500/month',
    posted: '3 days ago',
    image: 'https://images.unsplash.com/photo-1551836022-4c4c79ecde51?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: '3',
    title: 'Product Design Intern',
    company: 'Creative Hub',
    location: 'Remote',
    type: 'Internships',
    salary: '$800/month',
    posted: '1 week ago',
    image: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: '4',
    title: 'Business Development',
    company: 'Growth Partners',
    location: 'Accra, Ghana',
    type: 'Full Time Jobs',
    salary: '$1,500 - $2,500/month',
    posted: '5 days ago',
    image: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: '5',
    title: 'Part-Time Graphic Designer',
    company: 'Media House',
    location: 'Accra, Ghana',
    type: 'Part Time',
    salary: '$800/month',
    posted: '1 week ago',
    image: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: '6',
    title: 'Community Volunteer Coordinator',
    organization: 'Hope Foundation',
    company: 'Hope Foundation',
    location: 'Kumasi, Ghana',
    type: 'Volunteering',
    posted: '4 days ago',
    image: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: '12',
    title: 'Remote Customer Support',
    company: 'E-Commerce Platform',
    location: 'Remote',
    type: 'Remote Work',
    salary: '$1,200 - $1,800/month',
    posted: '2 days ago',
    image: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: '13',
    title: 'National Service - Healthcare',
    organization: 'Ghana Health Service',
    company: 'Ghana Health Service',
    location: 'Various Hospitals',
    type: 'National Service',
    deadline: '3 weeks left',
    image: 'https://images.unsplash.com/photo-1584982751601-97dcc096659c?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: '14',
    title: 'Part-Time Sales Assistant',
    company: 'Retail Store',
    location: 'Accra Mall',
    type: 'Part Time',
    salary: '$500/month',
    posted: '1 day ago',
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: '15',
    title: 'Volunteer Teaching Assistant',
    organization: 'Education For All',
    company: 'Education For All',
    location: 'Rural Communities',
    type: 'Volunteering',
    posted: '6 days ago',
    image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: '16',
    title: 'HR Intern',
    company: 'Corporate Solutions',
    location: 'Accra, Ghana',
    type: 'Internships',
    salary: '$450/month',
    posted: '1 week ago',
    image: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: '17',
    title: 'Project Manager',
    company: 'Construction Ltd',
    location: 'Tema, Ghana',
    type: 'Full Time Jobs',
    salary: '$3,500 - $5,500/month',
    posted: '3 days ago',
    image: 'https://images.unsplash.com/photo-1507537297725-24a1c029d3ca?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: '18',
    title: 'Remote Digital Marketer',
    company: 'Marketing Agency',
    location: 'Remote',
    type: 'Remote Work',
    salary: '$1,800 - $2,500/month',
    posted: '5 days ago',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=60',
  },
];

export default function WorkplaceScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  // Advanced filter states
  const [sortBy, setSortBy] = useState<'recent' | 'salary-high' | 'salary-low'>('recent');
  const [experienceLevel, setExperienceLevel] = useState<'all' | 'entry' | 'mid' | 'senior'>('all');
  const [workLocation, setWorkLocation] = useState<'all' | 'on-site' | 'remote'>('all');
  
  // Database state
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  // Fetch jobs from database
  useEffect(() => {
    const fetchJobs = async () => {
      console.log('[Workplace] Fetching jobs from database...');
      setLoading(true);
      setError(null);
      
      try {
        const { data, error: fetchError } = await supabase
          .from('jobs')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (fetchError) {
          console.error('[Workplace] Error fetching jobs:', fetchError);
          setError('Failed to load jobs');
          setJobs([]);
        } else {
          console.log('[Workplace] Successfully fetched jobs:', data?.length || 0);
          setJobs(data || []);
        }
      } catch (err) {
        console.error('[Workplace] Exception fetching jobs:', err);
        setError('Failed to load jobs');
        setJobs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  const handleFilterPress = (typeName: string) => {
    console.log('[Workplace] Filter changed to:', typeName);
    setActiveFilter(typeName);
  };

  // Filter jobs based on active filter and search query
  const filterJobs = (jobs: Job[]) => {
    let filtered = jobs;
    
    // Filter by job type
    if (activeFilter !== 'all') {
      filtered = filtered.filter(job => job.job_type?.toLowerCase() === activeFilter.toLowerCase());
    }
    
    // Filter by search query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(job => 
        job.title?.toLowerCase().includes(query) ||
        job.company?.toLowerCase().includes(query) ||
        job.location?.toLowerCase().includes(query) ||
        job.job_type?.toLowerCase().includes(query) ||
        job.description?.toLowerCase().includes(query)
      );
    }
    
    // Filter by experience level
    if (experienceLevel !== 'all') {
      filtered = filtered.filter(job => {
        const requirements = job.requirements?.toLowerCase() || '';
        if (experienceLevel === 'entry') {
          return requirements.includes('entry') || requirements.includes('0-2') || requirements.includes('student') || requirements.includes('intern');
        } else if (experienceLevel === 'mid') {
          return requirements.includes('2') || requirements.includes('3') || requirements.includes('4');
        } else if (experienceLevel === 'senior') {
          return requirements.includes('5+') || requirements.includes('senior') || requirements.includes('lead');
        }
        return true;
      });
    }
    
    // Filter by work location
    if (workLocation !== 'all') {
      if (workLocation === 'remote') {
        filtered = filtered.filter(job => 
          job.location?.toLowerCase().includes('remote') || 
          job.job_type === 'Remote Work'
        );
      } else if (workLocation === 'on-site') {
        filtered = filtered.filter(job => 
          !job.location?.toLowerCase().includes('remote') && 
          job.job_type !== 'Remote Work'
        );
      }
    }
    
    return filtered;
  };

  // Sort jobs based on sortBy
  const sortJobs = (jobs: Job[]) => {
    const sorted = [...jobs];
    
    if (sortBy === 'salary-high') {
      return sorted.sort((a, b) => {
        const getSalaryValue = (salary: number | string | null | undefined) => {
          if (!salary) return 0;
          const salaryStr = String(salary);
          const match = salaryStr.match(/\$?([\d,]+)/);
          return match ? parseInt(match[1].replace(/,/g, '')) : 0;
        };
        return getSalaryValue(b.salary) - getSalaryValue(a.salary);
      });
    } else if (sortBy === 'salary-low') {
      return sorted.sort((a, b) => {
        const getSalaryValue = (salary: number | string | null | undefined) => {
          if (!salary) return 0;
          const salaryStr = String(salary);
          const match = salaryStr.match(/\$?([\d,]+)/);
          return match ? parseInt(match[1].replace(/,/g, '')) : 0;
        };
        return getSalaryValue(a.salary) - getSalaryValue(b.salary);
      });
    }
    
    // Default: recent (no sorting needed as data is already in recent order)
    return sorted;
  };

  const filteredJobs = sortJobs(filterJobs(jobs));
  const featuredJobs = filteredJobs.filter(job => job.is_featured);
  const recentJobs = filteredJobs.filter(job => !job.is_featured);

  const resetFilters = () => {
    setSortBy('recent');
    setExperienceLevel('all');
    setWorkLocation('all');
  };

  const hasActiveFilters = sortBy !== 'recent' || experienceLevel !== 'all' || workLocation !== 'all';

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.loadingText}>Loading jobs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.title}>Workplace</Text>
          <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilterModal(true)}>
            <Filter size={24} color="#000000" />
            {hasActiveFilters && <View style={styles.filterBadge} />}
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Search size={20} color="#666666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search jobs, internships..."
              placeholderTextColor="#666666"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text style={styles.clearButton}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.typesScroll}
          contentContainerStyle={styles.typesContent}
        >
          {/* All button */}
          <TouchableOpacity
            style={[
              styles.typeButton,
              activeFilter === 'all' && styles.activeTypeButton,
            ]}
            onPress={() => handleFilterPress('all')}
          >
            <Filter
              size={24}
              color={activeFilter === 'all' ? '#FFFFFF' : '#000000'}
            />
            <Text
              style={[
                styles.typeName,
                activeFilter === 'all' && styles.activeTypeName,
              ]}
            >
              All Jobs
            </Text>
          </TouchableOpacity>

          {JOB_TYPES.map((type) => {
            const IconComponent = type.icon;
            return (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.typeButton,
                  activeFilter === type.name && styles.activeTypeButton,
                ]}
                onPress={() => handleFilterPress(type.name)}
              >
                <IconComponent
                  size={24}
                  color={activeFilter === type.name ? '#FFFFFF' : '#000000'}
                />
                <Text
                  style={[
                    styles.typeName,
                    activeFilter === type.name && styles.activeTypeName,
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
            <Text style={styles.sectionTitle}>
              {activeFilter === 'all' ? 'Featured Opportunities' : `Featured ${activeFilter}`}
            </Text>
            <TouchableOpacity style={styles.seeAllButton} onPress={() => router.push('/workplace/all-featured')}>
              <Text style={styles.seeAllText}>See All</Text>
              <ChevronRight size={16} color="#666666" />
            </TouchableOpacity>
          </View>

          {featuredJobs.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredContent}
            >
              {featuredJobs.map((job) => (
                <TouchableOpacity 
                  key={job.id} 
                  style={styles.featuredCard}
                  onPress={() => router.push(`/workplace/${job.id}` as any)}
                >
                  {job.image_url && <Image source={{ uri: job.image_url }} style={styles.featuredImage} />}
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
                    {job.requirements && (
                      <View style={styles.requirementsTags}>
                        {job.requirements.split(',').slice(0, 3).map((req: string, index: number) => (
                          <View key={index} style={styles.requirementTag}>
                            <Text style={styles.requirementText}>{req.trim()}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {searchQuery ? `No jobs found matching "${searchQuery}"` : `No featured jobs found${activeFilter !== 'all' ? ` for ${activeFilter}` : ''}`}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {activeFilter === 'all' ? 'Recent Opportunities' : `Recent ${activeFilter}`}
            </Text>
            <TouchableOpacity style={styles.seeAllButton} onPress={() => router.push('/workplace/all-recent')}>
              <Text style={styles.seeAllText}>See All</Text>
              <ChevronRight size={16} color="#666666" />
            </TouchableOpacity>
          </View>

          {recentJobs.length > 0 ? (
            recentJobs.map((job) => (
              <TouchableOpacity 
                key={job.id} 
                style={styles.opportunityCard}
                onPress={() => router.push(`/workplace/${job.id}` as any)}
              >
                {job.image_url && <Image source={{ uri: job.image_url }} style={styles.opportunityImage} />}
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
                      <Text style={styles.detailText}>{job.job_type}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {error ? error : searchQuery ? `No jobs found matching "${searchQuery}"` : jobs.length === 0 ? 'No jobs posted yet. Be the first to post a job!' : `No jobs found${activeFilter !== 'all' ? ` for ${activeFilter}` : ''}`}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
      
      {/* Advanced Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter & Sort</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)} style={styles.closeButton}>
                <X size={24} color="#000000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Sort By Section */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Sort By</Text>
                <View style={styles.filterOptions}>
                  <TouchableOpacity
                    style={[styles.filterOption, sortBy === 'recent' && styles.activeFilterOption]}
                    onPress={() => setSortBy('recent')}
                  >
                    <Calendar size={20} color={sortBy === 'recent' ? '#FFFFFF' : '#000000'} />
                    <Text style={[styles.filterOptionText, sortBy === 'recent' && styles.activeFilterOptionText]}>
                      Most Recent
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.filterOption, sortBy === 'salary-high' && styles.activeFilterOption]}
                    onPress={() => setSortBy('salary-high')}
                  >
                    <TrendingUp size={20} color={sortBy === 'salary-high' ? '#FFFFFF' : '#000000'} />
                    <Text style={[styles.filterOptionText, sortBy === 'salary-high' && styles.activeFilterOptionText]}>
                      Highest Salary
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.filterOption, sortBy === 'salary-low' && styles.activeFilterOption]}
                    onPress={() => setSortBy('salary-low')}
                  >
                    <TrendingDown size={20} color={sortBy === 'salary-low' ? '#FFFFFF' : '#000000'} />
                    <Text style={[styles.filterOptionText, sortBy === 'salary-low' && styles.activeFilterOptionText]}>
                      Lowest Salary
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Experience Level Section */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Experience Level</Text>
                <View style={styles.filterOptions}>
                  <TouchableOpacity
                    style={[styles.filterOption, experienceLevel === 'all' && styles.activeFilterOption]}
                    onPress={() => setExperienceLevel('all')}
                  >
                    <Text style={[styles.filterOptionText, experienceLevel === 'all' && styles.activeFilterOptionText]}>
                      All Levels
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.filterOption, experienceLevel === 'entry' && styles.activeFilterOption]}
                    onPress={() => setExperienceLevel('entry')}
                  >
                    <GraduationCap size={20} color={experienceLevel === 'entry' ? '#FFFFFF' : '#000000'} />
                    <Text style={[styles.filterOptionText, experienceLevel === 'entry' && styles.activeFilterOptionText]}>
                      Entry Level
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.filterOption, experienceLevel === 'mid' && styles.activeFilterOption]}
                    onPress={() => setExperienceLevel('mid')}
                  >
                    <Briefcase size={20} color={experienceLevel === 'mid' ? '#FFFFFF' : '#000000'} />
                    <Text style={[styles.filterOptionText, experienceLevel === 'mid' && styles.activeFilterOptionText]}>
                      Mid Level (2-4 years)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.filterOption, experienceLevel === 'senior' && styles.activeFilterOption]}
                    onPress={() => setExperienceLevel('senior')}
                  >
                    <Building2 size={20} color={experienceLevel === 'senior' ? '#FFFFFF' : '#000000'} />
                    <Text style={[styles.filterOptionText, experienceLevel === 'senior' && styles.activeFilterOptionText]}>
                      Senior (5+ years)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Work Location Section */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Work Location</Text>
                <View style={styles.filterOptions}>
                  <TouchableOpacity
                    style={[styles.filterOption, workLocation === 'all' && styles.activeFilterOption]}
                    onPress={() => setWorkLocation('all')}
                  >
                    <Text style={[styles.filterOptionText, workLocation === 'all' && styles.activeFilterOptionText]}>
                      All Locations
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.filterOption, workLocation === 'on-site' && styles.activeFilterOption]}
                    onPress={() => setWorkLocation('on-site')}
                  >
                    <MapPin size={20} color={workLocation === 'on-site' ? '#FFFFFF' : '#000000'} />
                    <Text style={[styles.filterOptionText, workLocation === 'on-site' && styles.activeFilterOptionText]}>
                      On-Site Only
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.filterOption, workLocation === 'remote' && styles.activeFilterOption]}
                    onPress={() => setWorkLocation('remote')}
                  >
                    <Building2 size={20} color={workLocation === 'remote' ? '#FFFFFF' : '#000000'} />
                    <Text style={[styles.filterOptionText, workLocation === 'remote' && styles.activeFilterOptionText]}>
                      Remote Only
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={resetFilters}
              >
                <Text style={styles.resetButtonText}>Reset Filters</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
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
    padding: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  clearButton: {
    fontSize: 20,
    color: '#666666',
    paddingHorizontal: 8,
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
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeTypeButton: {
    backgroundColor: '#4169E1',
    borderColor: '#2952CC',
    shadowColor: '#4169E1',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  typeName: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  activeTypeName: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
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
  featuredImage: {
    width: '100%',
    height: 160,
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
    flexDirection: 'row',
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
  opportunityImage: {
    width: 100,
    height: 100,
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
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    textAlign: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4169E1',
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
    maxHeight: '80%',
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
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  closeButton: {
    padding: 8,
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 12,
  },
  filterOptions: {
    gap: 12,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    gap: 12,
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
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  resetButton: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
  },
  applyButton: {
    flex: 1,
    backgroundColor: '#4169E1',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});