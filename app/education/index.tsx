import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, TextInput, Dimensions, Alert, ActivityIndicator, Modal, RefreshControl } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState, useCallback } from 'react';
import { SplashScreen, useRouter, Link, useLocalSearchParams } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { Search, Filter, ArrowLeft, GraduationCap, MapPin, Globe, ChevronRight, Clock, Award, Wallet, BookOpen, Building2, Users, Plus, FileText, Bookmark, Settings, Star } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import UnifiedMentorFilterModal, { FilterCriteria } from '@/components/UnifiedMentorFilterModal';
import { EXPERTISE_OPTIONS } from '@/constants/mentorConstants';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 48;

type TabType = 'universities' | 'scholarships' | 'mentors';

export default function EducationScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const params = useLocalSearchParams();
  
  console.log('[Education] Component mounted/rendered');
  console.log('[Education] Initial user:', !!user, 'profile:', !!profile);
  console.log('[Education] URL params:', params);
  
  const [activeTab, setActiveTab] = useState<TabType>((params.tab as TabType) || 'universities');
  const [universities, setUniversities] = useState<any[]>([]);
  const [scholarships, setScholarships] = useState<any[]>([]);
  const [mentors, setMentors] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [studyGroups, setStudyGroups] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [favoriteMentorIds, setFavoriteMentorIds] = useState<string[]>([]);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedExpertise, setSelectedExpertise] = useState<string[]>([]);
  const [advancedFilters, setAdvancedFilters] = useState<FilterCriteria | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminMenuVisible, setAdminMenuVisible] = useState(false);
  const [bookmarkMenuVisible, setBookmarkMenuVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  // Check if user is admin (non-blocking, only for showing manage button)
  const loadRole = useCallback(async () => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin, role')
        .eq('id', user.id)
        .single();
      
      if (error) {
        setIsAdmin(false);
        return;
      }
      
      const admin = data?.is_admin === true || data?.role === 'admin';
      setIsAdmin(!!admin);
      
    } catch (err) {
      setIsAdmin(false);
    }
  }, [user]);

  useEffect(() => {
    console.log('[Education] useEffect for loadRole triggered');
    loadRole();
  }, [loadRole]);

  // Fetch all approved universities
  const fetchUniversities = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('universities')
        .select('*')
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('🎓 Fetched universities:', data?.length, 'items');
      if (data && data.length > 0) {
        console.log('🖼️ First university image_url:', data[0].image_url);
      }
      setUniversities(data || []);
    } catch (error) {
      console.error('Error fetching universities:', error);
      Alert.alert('Error', 'Failed to load universities.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch scholarships
  const fetchScholarships = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch from dedicated scholarships table
      const { data, error } = await supabase
        .from('scholarships')
        .select('*')
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('📚 Fetched scholarships:', data?.length, 'items');
      setScholarships(data || []);
    } catch (error) {
      console.error('Error fetching scholarships:', error);
      Alert.alert('Error', 'Failed to load scholarships.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch alumni mentors from new dedicated table
  const fetchMentors = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('alumni_mentors')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('👨‍🎓 Fetched mentors:', data?.length, 'items');
      setMentors(data || []);
    } catch (error) {
      console.error('Error fetching mentors:', error);
      Alert.alert('Error', 'Failed to load mentors.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch study resources
  const fetchResources = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products_services')
        .select('*')
        .eq('is_approved', true)
        .eq('category_name', 'Study Resources')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResources(data || []);
    } catch (error) {
      console.error('Error fetching resources:', error);
      Alert.alert('Error', 'Failed to load resources.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch courses
  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products_services')
        .select('*')
        .eq('is_approved', true)
        .eq('category_name', 'Courses')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      Alert.alert('Error', 'Failed to load courses.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch study groups
  const fetchStudyGroups = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products_services')
        .select('*')
        .eq('is_approved', true)
        .eq('category_name', 'Study Groups')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStudyGroups(data || []);
    } catch (error) {
      console.error('Error fetching study groups:', error);
      Alert.alert('Error', 'Failed to load study groups.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch educational events
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      Alert.alert('Error', 'Failed to load events.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch bookmarks
  const fetchBookmarks = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('education_bookmarks')
        .select('opportunity_id')
        .eq('user_id', user.id)
        .in('opportunity_type', ['university', 'scholarship']);

      if (error) throw error;
      setBookmarkedIds(data?.map(b => b.opportunity_id) || []);
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
    }
  }, [user]);

  // Fetch favorite mentors
  const fetchFavoriteMentors = useCallback(async () => {
    if (!user) {
      console.log('⚠️ [Education] fetchFavoriteMentors: No user');
      return;
    }
    
    console.log('📚 [Education] Fetching favorite mentors for user:', user.id);
    
    try {
      const { data, error } = await supabase
        .from('education_bookmarks')
        .select('opportunity_id')
        .eq('user_id', user.id)
        .eq('opportunity_type', 'mentor');

      if (error) {
        console.error('❌ [Education] Error fetching favorite mentors:', error);
        throw error;
      }
      
      const mentorIds = data?.map(f => f.opportunity_id) || [];
      setFavoriteMentorIds(mentorIds);
      console.log('✅ [Education] Loaded favorite mentors:', mentorIds.length, 'mentors');
      console.log('✅ [Education] Mentor IDs:', mentorIds);
    } catch (error) {
      console.error('❌ [Education] Error fetching favorite mentors:', error);
    }
  }, [user]);

  useEffect(() => {
    switch (activeTab) {
      case 'universities':
        fetchUniversities();
        break;
      case 'scholarships':
        fetchScholarships();
        break;
      case 'mentors':
        fetchMentors();
        break;
    }
    if (user) {
      fetchBookmarks();
      fetchFavoriteMentors();
    }
  }, [activeTab, fetchUniversities, fetchScholarships, fetchMentors, user, fetchBookmarks, fetchFavoriteMentors]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Refresh based on active tab
      switch (activeTab) {
        case 'universities':
          await fetchUniversities();
          break;
        case 'scholarships':
          await fetchScholarships();
          break;
        case 'mentors':
          await fetchMentors();
          break;
      }
      // Also refresh bookmarks
      if (user) {
        await fetchBookmarks();
        await fetchFavoriteMentors();
      }
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  }, [activeTab, fetchUniversities, fetchScholarships, fetchMentors, user, fetchBookmarks, fetchFavoriteMentors]);

  if (!fontsLoaded) {
    return null;
  }

  // Filter based on search query
  const filteredUniversities = universities.filter(u => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (u.title || '').toLowerCase().includes(query) ||
      (u.description || '').toLowerCase().includes(query) ||
      (u.location || '').toLowerCase().includes(query)
    );
  });

  const filteredScholarships = scholarships.filter(s => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (s.title || '').toLowerCase().includes(query) ||
      (s.description || '').toLowerCase().includes(query)
    );
  });

  const filteredMentors = mentors.filter(m => {
    // Apply search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = (
        (m.full_name || '').toLowerCase().includes(query) ||
        (m.current_title || '').toLowerCase().includes(query) ||
        (m.company || '').toLowerCase().includes(query) ||
        (m.industry || '').toLowerCase().includes(query) ||
        (m.expertise_areas || []).some((area: string) => area.toLowerCase().includes(query))
      );
      if (!matchesSearch) return false;
    }
    
    // Apply expertise filter
    if (selectedExpertise.length > 0) {
      const mentorExpertise = m.expertise_areas || [];
      const hasMatchingExpertise = selectedExpertise.some(selected =>
        mentorExpertise.includes(selected)
      );
      if (!hasMatchingExpertise) return false;
    }
    
    // Apply advanced filters
    if (advancedFilters) {
      // Company filter
      if (advancedFilters.companies.length > 0) {
        const mentorCompany = (m.company || '').toLowerCase();
        const matchesCompany = advancedFilters.companies.some(c => 
          mentorCompany.includes(c.toLowerCase())
        );
        if (!matchesCompany) return false;
      }
      
      // Industry filter
      if (advancedFilters.industries.length > 0) {
        const mentorIndustry = m.industry || '';
        if (!advancedFilters.industries.includes(mentorIndustry)) return false;
      }
      
      // Experience filter
      const experience = m.years_of_experience || 0;
      if (advancedFilters.minExperience !== null && experience < advancedFilters.minExperience) {
        return false;
      }
      if (advancedFilters.maxExperience !== null && experience > advancedFilters.maxExperience) {
        return false;
      }
      
      // Rating filter
      if (advancedFilters.minRating !== null) {
        const rating = m.average_rating || 0;
        if (rating < advancedFilters.minRating) return false;
      }
      
      // Availability filter (if you have this data)
      // if (advancedFilters.availability !== 'any') {
      //   // Add availability logic based on your data model
      // }
    }
    
    return true;
  });
  
  const handleApplyUnifiedFilters = (expertise: string[], advancedCriteria: FilterCriteria | null) => {
    setSelectedExpertise(expertise);
    setAdvancedFilters(advancedCriteria);
    console.log('Applied unified filters - Expertise:', expertise, 'Advanced:', advancedCriteria);
  };
  
  const handleResetUnifiedFilters = () => {
    setSelectedExpertise([]);
    setAdvancedFilters(null);
  };

  const filteredResources = resources.filter(r => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (r.title || '').toLowerCase().includes(query) ||
      (r.description || '').toLowerCase().includes(query)
    );
  });

  const filteredCourses = courses.filter(c => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (c.title || '').toLowerCase().includes(query) ||
      (c.description || '').toLowerCase().includes(query)
    );
  });

  const filteredStudyGroups = studyGroups.filter(g => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (g.title || '').toLowerCase().includes(query) ||
      (g.description || '').toLowerCase().includes(query)
    );
  });

  const filteredEvents = events.filter(e => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (e.title || '').toLowerCase().includes(query) ||
      (e.description || '').toLowerCase().includes(query) ||
      (e.location || '').toLowerCase().includes(query)
    );
  });

  const handleAddOpportunity = () => {
    console.log('[Education] handleAddOpportunity called, isAdmin:', isAdmin, 'checkingAdmin:', checkingAdmin);
    console.log('[Education] user:', !!user, 'profile:', profile);
    
    // Check if user is admin
    if (!isAdmin) {
      Alert.alert('Admins only', 'You need admin access to manage Educational Opportunities.');
      return;
    }
    // Show admin menu modal
    console.log('[Education] Admin verified, showing admin menu');
    setAdminMenuVisible(true);
  };

  // Toggle favorite mentor
  const toggleFavoriteMentor = async (mentorId: string, event: any) => {
    event.stopPropagation(); // Prevent card click
    
    console.log('🔖 [Education] toggleFavoriteMentor called', { mentorId, userId: user?.id });
    
    if (!user) {
      Alert.alert('Login Required', 'Please sign in to favorite mentors.');
      return;
    }

    const isFavorited = favoriteMentorIds.includes(mentorId);
    console.log('🔖 [Education] Current favorite status:', { isFavorited, mentorId });
    
    try {
      if (isFavorited) {
        console.log('🔖 [Education] Removing mentor from favorites...');
        const { error } = await supabase
          .from('education_bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('opportunity_id', mentorId)
          .eq('opportunity_type', 'mentor');

        if (error) {
          console.error('❌ [Education] Delete error:', error);
          throw error;
        }
        
        setFavoriteMentorIds(prev => prev.filter(id => id !== mentorId));
        console.log('✅ [Education] Removed mentor from favorites');
      } else {
        console.log('🔖 [Education] Adding mentor to favorites...');
        const insertData = { 
          user_id: user.id, 
          opportunity_id: mentorId,
          opportunity_type: 'mentor'
        };
        console.log('🔖 [Education] Insert data:', insertData);
        
        const { data, error } = await supabase
          .from('education_bookmarks')
          .insert(insertData)
          .select();

        if (error) {
          console.error('❌ [Education] Insert error:', error);
          console.error('❌ [Education] Error details:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
          });
          throw error;
        }
        
        console.log('✅ [Education] Insert successful, returned data:', data);
        setFavoriteMentorIds(prev => [...prev, mentorId]);
        console.log('✅ [Education] Added mentor to favorites, new list:', [...favoriteMentorIds, mentorId]);
      }
    } catch (error: any) {
      console.error('❌ [Education] Error toggling favorite:', error);
      Alert.alert('Error', error.message || 'Failed to update favorites');
    }
  };

  // Toggle bookmark
  const toggleBookmark = async (opportunityId: string, opportunityType: 'university' | 'scholarship', event: any) => {
    event.stopPropagation(); // Prevent card click
    
    console.log('toggleBookmark called', { opportunityId, opportunityType, user: !!user });
    
    if (!user) {
      Alert.alert('Login Required', 'Please sign in to bookmark opportunities.');
      return;
    }

    const isBookmarked = bookmarkedIds.includes(opportunityId);
    console.log('Bookmark status:', { isBookmarked, bookmarkedIds });
    
    try {
      if (isBookmarked) {
        const { error } = await supabase
          .from('education_bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('opportunity_id', opportunityId)
          .eq('opportunity_type', opportunityType);
        
        if (error) throw error;
        
        setBookmarkedIds(prev => prev.filter(id => id !== opportunityId));
        Alert.alert('Removed', 'Removed from bookmarks.');
      } else {
        const { error } = await supabase
          .from('education_bookmarks')
          .insert({ 
            user_id: user.id, 
            opportunity_id: opportunityId,
            opportunity_type: opportunityType
          });
        
        if (error) throw error;
        
        setBookmarkedIds(prev => [...prev, opportunityId]);
        Alert.alert('Saved', 'Added to bookmarks!');
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      Alert.alert('Error', `Failed to update bookmark: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Full Screen Refresh Overlay */}
      {refreshing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0F172A" />
        </View>
      )}

      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={false}
            onRefresh={onRefresh}
          />
        }
      >
      {/* Hero Header */}
      <View style={styles.heroHeader}>
        <View style={styles.heroTopRow}>
          <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
            <ArrowLeft size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.heroTitle}>Educational Opportunities</Text>
          {(profile?.is_admin || profile?.role === 'admin') ? (
            <TouchableOpacity 
              style={styles.heroManageButton}
              onPress={handleAddOpportunity}
              accessibilityLabel="Manage Educational Opportunities"
            >
              <Plus size={18} color="#FFFFFF" />
              <Text style={styles.heroManageText}>Manage</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 74 }} />
          )}
        </View>
        <Text style={styles.heroSubtitle}>Discover universities, secure funding, and get guidance from alumni mentors</Text>

        {/* Search */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Search size={20} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search universities, scholarships, mentors..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity 
            style={styles.bookmarkIconButton}
            onPress={() => setBookmarkMenuVisible(!bookmarkMenuVisible)}
          >
            <Star size={22} color="#0F172A" fill={bookmarkMenuVisible ? "#0F172A" : "none"} />
          </TouchableOpacity>
        </View>

        {/* Bookmark Dropdown Menu */}
        {bookmarkMenuVisible && (
          <View style={styles.bookmarkDropdown}>
            <TouchableOpacity 
              style={styles.bookmarkDropdownItem}
              onPress={() => {
                setBookmarkMenuVisible(false);
                debouncedRouter.push('/education/saved-universities');
              }}
            >
              <Building2 size={18} color="#0F172A" />
              <Text style={styles.bookmarkDropdownText}>Saved Universities</Text>
            </TouchableOpacity>
            <View style={styles.bookmarkDropdownDivider} />
            <TouchableOpacity 
              style={styles.bookmarkDropdownItem}
              onPress={() => {
                setBookmarkMenuVisible(false);
                debouncedRouter.push('/education/saved-scholarships');
              }}
            >
              <Award size={18} color="#0F172A" />
              <Text style={styles.bookmarkDropdownText}>Saved Scholarships</Text>
            </TouchableOpacity>
            <View style={styles.bookmarkDropdownDivider} />
            <TouchableOpacity 
              style={styles.bookmarkDropdownItem}
              onPress={() => {
                setBookmarkMenuVisible(false);
                debouncedRouter.push('/education/saved-mentors');
              }}
            >
              <Users size={18} color="#0F172A" />
              <Text style={styles.bookmarkDropdownText}>Saved Alumni Mentors</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Segmented Tabs */}
        <View style={styles.segmentedTabs}>
          <TouchableOpacity
            style={[styles.segmentedTab, activeTab === 'universities' && styles.segmentedTabActive]}
            onPress={() => {
              setActiveTab('universities');
              setSearchQuery('');
            }}
          >
            <Text style={[styles.segmentedTabText, activeTab === 'universities' && styles.segmentedTabTextActive]}>Universities ({universities.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentedTab, activeTab === 'scholarships' && styles.segmentedTabActive]}
            onPress={() => {
              setActiveTab('scholarships');
              setSearchQuery('');
            }}
          >
            <Text style={[styles.segmentedTabText, activeTab === 'scholarships' && styles.segmentedTabTextActive]}>Scholarships ({scholarships.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentedTab, activeTab === 'mentors' && styles.segmentedTabActive]}
            onPress={() => {
              setActiveTab('mentors');
              setSearchQuery('');
            }}
          >
            <Text style={[styles.segmentedTabText, activeTab === 'mentors' && styles.segmentedTabTextActive]}>Alumni Mentors ({mentors.length})</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Universities Tab Content */}
      {activeTab === 'universities' && (
        <View style={styles.section}>
          {/* Section Header with Stats */}
          <View style={styles.modernSectionHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconBox}>
                <Building2 size={24} color="#0F172A" />
              </View>
              <View>
                <Text style={styles.modernSectionTitle}>Ghanaian Universities</Text>
                <Text style={styles.modernSectionSubtitle}>Discover top institutions in Ghana</Text>
              </View>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{filteredUniversities.length}</Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0F172A" />
              <Text style={styles.loadingText}>Loading universities...</Text>
            </View>
          ) : filteredUniversities.length > 0 ? (
            <View style={styles.cardsGrid}>
              {filteredUniversities.map((university) => {
                // Parse image_url if it's a JSON array
                let imageUri = university.image_url || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800';
                if (imageUri && imageUri.startsWith('[')) {
                  try {
                    const parsed = JSON.parse(imageUri);
                    imageUri = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : imageUri;
                  } catch (e) {
                    // Keep original if parsing fails
                  }
                }
                
                return (
                  <TouchableOpacity 
                    key={university.id} 
                    style={styles.modernUniversityCard}
                    onPress={() => debouncedRouter.push(`/education/detail/${university.id}`)}
                    activeOpacity={0.95}
                  >
                    <View style={styles.modernCardImageContainer}>
                      <Image 
                        source={{ uri: imageUri }} 
                        style={styles.modernCardImage} 
                        resizeMode="contain"
                      />
                      <View style={styles.imageGradient} />
                      <TouchableOpacity 
                        style={styles.modernBookmarkButton}
                        onPress={(e) => {
                          e?.preventDefault?.();
                          e?.stopPropagation?.();
                          toggleBookmark(university.id, 'university', e);
                        }}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Star 
                          size={20} 
                          color={bookmarkedIds.includes(university.id) ? "#0F172A" : "#FFFFFF"} 
                          fill={bookmarkedIds.includes(university.id) ? "#0F172A" : "none"}
                          strokeWidth={2}
                        />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.modernCardContent}>
                      <Text style={styles.modernCardTitle} numberOfLines={2}>{university.title}</Text>
                      <View style={styles.modernLocationRow}>
                        <MapPin size={16} color="#0F172A" />
                        <Text style={styles.modernLocationText}>{university.location || 'Ghana'}</Text>
                      </View>
                      <Text style={styles.modernCardDescription} numberOfLines={3}>
                        {university.description}
                      </Text>
                      {university.application_url && (
                        <View style={styles.modernApplicationBadge}>
                          <Globe size={14} color="#10B981" />
                          <Text style={styles.modernApplicationText}>Applications Open</Text>
                        </View>
                      )}
                      <TouchableOpacity 
                        style={styles.modernViewButton}
                        onPress={() => debouncedRouter.push(`/education/detail/${university.id}`)}
                      >
                        <Text style={styles.modernViewButtonText}>View Details</Text>
                        <ChevronRight size={16} color="#0F172A" />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.modernEmptyState}>
              <View style={styles.emptyIconContainer}>
                <Building2 size={64} color="#D1D5DB" />
              </View>
              <Text style={styles.modernEmptyTitle}>No Universities Found</Text>
              <Text style={styles.modernEmptySubtitle}>Try adjusting your search criteria</Text>
            </View>
          )}
        </View>
      )}

      {/* Scholarships Tab Content */}
      {activeTab === 'scholarships' && (
        <View style={styles.section}>
          {/* Section Header with Stats */}
          <View style={styles.modernSectionHeader}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIconBox, {backgroundColor: '#FFF9E6'}]}>
                <Award size={24} color="#F59E0B" />
              </View>
              <View style={{flex: 1}}>
                <Text style={styles.modernSectionTitle}>Scholarships & Funding</Text>
                <Text style={styles.modernSectionSubtitle}>Find financial support for your education</Text>
              </View>
            </View>
            <View style={[styles.countBadge, {backgroundColor: '#FFF9E6', borderColor: '#F59E0B'}]}>
              <Text style={[styles.countBadgeText, {color: '#F59E0B'}]}>{filteredScholarships.length}</Text>
            </View>
          </View>

          {/* Submit Scholarship CTA */}
          {user && (
            <TouchableOpacity
              style={styles.submitScholarshipCTA}
              onPress={() => debouncedRouter.push('/education/submit-scholarship')}
              activeOpacity={0.9}
            >
              <View style={styles.submitScholarshipContent}>
                <View style={styles.submitScholarshipIconBox}>
                  <Plus size={24} color="#FFFFFF" />
                </View>
                <View style={{flex: 1}}>
                  <Text style={styles.submitScholarshipTitle}>Post a Scholarship</Text>
                  <Text style={styles.submitScholarshipSubtitle}>Share opportunities with the community</Text>
                </View>
                <View style={styles.submitScholarshipArrow}>
                  <ChevronRight size={20} color="#10B981" />
                </View>
              </View>
            </TouchableOpacity>
          )}

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#F59E0B" />
              <Text style={styles.loadingText}>Loading scholarships...</Text>
            </View>
          ) : filteredScholarships.length > 0 ? (
            <View style={styles.cardsGrid}>
              {filteredScholarships.map((scholarship) => {
                // Parse image_url if it's a JSON array
                let imageUri = scholarship.image_url || 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800';
                if (imageUri && typeof imageUri === 'string' && imageUri.startsWith('[')) {
                  try {
                    const parsed = JSON.parse(imageUri);
                    imageUri = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : imageUri;
                  } catch (e) {
                    // Keep original if parsing fails
                  }
                }
                const currencySymbol = scholarship.funding_currency === 'GHS' ? '₵' : '$';
                
                // Calculate deadline and format date
                let daysRemaining = null;
                let deadlineStatus = '';
                let formattedDeadline = '';
                
                // Check for deadline_date or deadline fields
                const deadlineValue = scholarship.deadline_date || scholarship.deadline;
                
                if (deadlineValue) {
                  // Try to parse as date
                  const deadline = new Date(deadlineValue);
                  if (!isNaN(deadline.getTime())) {
                    // Format date as "Dec 25, 2025"
                    formattedDeadline = deadline.toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    });
                    
                    const now = new Date();
                    daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    if (daysRemaining > 0) {
                      deadlineStatus = `Due ${formattedDeadline}`;
                    } else {
                      deadlineStatus = 'Expired';
                    }
                  } else {
                    // If not a valid date, use the text as-is
                    deadlineStatus = deadlineValue;
                  }
                } else if (scholarship.deadline_text) {
                  deadlineStatus = scholarship.deadline_text;
                }
                
                return (
                  <TouchableOpacity 
                    key={scholarship.id} 
                    style={styles.modernScholarshipCard}
                    onPress={() => debouncedRouter.push(`/education/detail/${scholarship.id}`)}
                    activeOpacity={0.95}
                  >
                    <View style={styles.modernCardImageContainer}>
                      <Image 
                        source={{ uri: imageUri }} 
                        style={styles.modernCardImage}
                        resizeMode="contain"
                      />
                      <View style={styles.imageGradient} />
                      
                      {/* Funding Amount Badge */}
                      {(scholarship.amount || scholarship.funding_amount) && (
                        <View style={styles.fundingAmountBadge}>
                          <Wallet size={14} color="#FFFFFF" />
                          <Text style={styles.fundingAmountText}>
                            {currencySymbol}{scholarship.amount || scholarship.funding_amount}
                          </Text>
                        </View>
                      )}
                      
                      <TouchableOpacity 
                        style={styles.modernBookmarkButton}
                        onPress={(e) => {
                          e?.preventDefault?.();
                          e?.stopPropagation?.();
                          toggleBookmark(scholarship.id, 'scholarship', e);
                        }}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Star 
                          size={20} 
                          color={bookmarkedIds.includes(scholarship.id) ? "#0F172A" : "#FFFFFF"} 
                          fill={bookmarkedIds.includes(scholarship.id) ? "#0F172A" : "none"}
                          strokeWidth={2}
                        />
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.modernCardContent}>
                      <Text style={styles.modernCardTitle} numberOfLines={2}>{scholarship.title}</Text>
                      
                      {/* Deadline Info - More Prominent */}
                      {deadlineStatus && (
                        <View style={[
                          styles.prominentDeadline,
                          daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 7 && styles.urgentDeadlineBadge
                        ]}>
                          <Clock size={14} color={daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 7 ? '#EF4444' : '#F59E0B'} />
                          <Text style={[
                            styles.prominentDeadlineText,
                            daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 7 && styles.urgentDeadlineText
                          ]}>
                            {deadlineStatus}
                          </Text>
                        </View>
                      )}
                      
                      <Text style={styles.modernCardDescription} numberOfLines={2}>
                        {scholarship.description}
                      </Text>
                      
                      <TouchableOpacity 
                        style={styles.applyNowButton}
                        onPress={() => debouncedRouter.push(`/education/detail/${scholarship.id}`)}
                      >
                        <Text style={styles.applyNowButtonText}>View Details</Text>
                        <ChevronRight size={16} color="#0F172A" />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.modernEmptyState}>
              <View style={styles.emptyIconContainer}>
                <Award size={64} color="#D1D5DB" />
              </View>
              <Text style={styles.modernEmptyTitle}>No Scholarships Found</Text>
              <Text style={styles.modernEmptySubtitle}>Check back soon for new opportunities</Text>
            </View>
          )}
        </View>
      )}

      {/* Alumni Mentors Tab Content */}
      {activeTab === 'mentors' && (
        <View style={styles.section}>
          {/* Header with Action Buttons */}
          <View style={styles.mentorsHeader}>
            <View style={{flex: 1}}>
              <Text style={styles.sectionTitle}>👨‍🎓 Free Alumni Mentors</Text>
              <Text style={styles.sectionCount}>{filteredMentors.length} mentors available</Text>
            </View>
            <View style={{flexDirection: 'row', gap: 8, paddingRight: 12}}>
              {/* My Requests Button */}
              <TouchableOpacity 
                style={styles.myRequestsButton}
                onPress={() => debouncedRouter.push('/my-mentorship-requests')}
              >
                <FileText size={16} color="#0F172A" />
                <Text style={styles.myRequestsButtonText}>My Requests</Text>
              </TouchableOpacity>
              
              {/* Unified Filter Button */}
              <TouchableOpacity 
                style={styles.filterIconButton}
                onPress={() => setFilterModalVisible(true)}
              >
                <Filter size={16} color={(selectedExpertise.length > 0 || advancedFilters) ? '#4169E1' : '#6B7280'} />
                {(selectedExpertise.length > 0 || advancedFilters) && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>
                      {selectedExpertise.length + (advancedFilters ? 1 : 0)}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              
              {/* Mentor Dashboard Button (only show if user is a mentor) */}
              <TouchableOpacity 
                style={styles.mentorDashboardButton}
                onPress={() => debouncedRouter.push('/mentor-dashboard')}
              >
                <Users size={16} color="#8B5CF6" />
              </TouchableOpacity>
              
              {/* Volunteer Button */}
              <TouchableOpacity 
                style={styles.volunteerButton}
                onPress={() => debouncedRouter.push('/education/volunteer-mentor')}
              >
                <Plus size={16} color="#FFFFFF" />
                <Text style={styles.volunteerButtonText}>Volunteer</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Info Banner */}
          <View style={styles.mentorInfoBanner}>
            <Text style={styles.mentorInfoText}>
              💡 Connect with experienced alumni offering free mentorship to anyone seeking career guidance and growth
            </Text>
          </View>

          {loading ? (
            <Text style={styles.loadingText}>Loading mentors...</Text>
          ) : filteredMentors.length > 0 ? (
            filteredMentors.map((mentor) => (
              <TouchableOpacity 
                key={mentor.id} 
                style={styles.modernMentorCard}
                onPress={() => debouncedRouter.push(`/education/mentor/${mentor.id}`)}
                activeOpacity={0.95}
              >
                <Image 
                  source={{ uri: mentor.profile_photo_url || 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=800' }} 
                  style={styles.mentorAvatar} 
                />
                <TouchableOpacity
                  style={styles.mentorFavoriteButton}
                  onPress={(e) => toggleFavoriteMentor(mentor.id, e)}
                >
                  <Star
                    size={20}
                    color={favoriteMentorIds.includes(mentor.id) ? '#0F172A' : '#94A3B8'}
                    fill={favoriteMentorIds.includes(mentor.id) ? '#0F172A' : 'none'}
                    strokeWidth={2}
                  />
                </TouchableOpacity>
                <View style={styles.mentorInfo}>
                  <Text style={styles.mentorName}>{mentor.full_name}</Text>
                  <Text style={styles.mentorRole} numberOfLines={1}>{mentor.current_title}</Text>
                  {mentor.company && (
                    <View style={styles.companyRow}>
                      <Text style={styles.mentorCompany}>{mentor.company}</Text>
                    </View>
                  )}
                  {mentor.expertise_areas && mentor.expertise_areas.length > 0 && (
                    <View style={styles.mentorFormatsRow}>
                      {mentor.expertise_areas.slice(0, 3).map((area:string, idx: number) => (
                        <View key={idx} style={styles.mentorChip}>
                          <Text style={styles.mentorChipText}>{area}</Text>
                        </View>
                      ))}
                      {mentor.expertise_areas.length > 3 && (
                        <View style={[styles.mentorChip, { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' }]}>
                          <Text style={[styles.mentorChipText, { color: '#94A3B8' }]}>+{mentor.expertise_areas.length - 3}</Text>
                        </View>
                      )}
                    </View>
                  )}
                  {mentor.meeting_formats && mentor.meeting_formats.length > 0 && (
                    <View style={styles.mentorFormatsRow}>
                      {mentor.meeting_formats.map((format:string, idx: number) => (
                        <View key={idx} style={[styles.mentorChip, { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' }]}>
                          <Text style={[styles.mentorChipText, { color: '#334155' }]}>{format}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  <View style={styles.mentorFooter}>
                    <View style={styles.availabilityBadge}>
                      <Text style={styles.availabilityText} numberOfLines={1} ellipsizeMode="tail">{mentor.available_hours || 'Flexible'}</Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.mentorCTAButton}
                      onPress={() => debouncedRouter.push(`/education/mentor/${mentor.id}`)}
                    >
                      <Text style={styles.mentorCTAButtonText}>Request Mentorship</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Users size={64} color="#CCCCCC" />
              <Text style={styles.emptyText}>No mentors available yet</Text>
              <Text style={styles.emptySubtext}>Be the first to volunteer as a mentor!</Text>
              <TouchableOpacity 
                style={styles.emptyButton}
                onPress={() => debouncedRouter.push('/education/volunteer-mentor')}
              >
                <Text style={styles.emptyButtonText}>Volunteer as Mentor</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Other sections removed to focus on Universities, Scholarships, and Alumni Mentors */}
      
      {/* Unified Mentor Filter Modal */}
      <UnifiedMentorFilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        allExpertiseAreas={EXPERTISE_OPTIONS}
        selectedExpertise={selectedExpertise}
        onExpertiseChange={setSelectedExpertise}
        onApplyFilters={handleApplyUnifiedFilters}
        onResetFilters={handleResetUnifiedFilters}
      />

      {/* Admin Menu Modal */}
      <Modal
        visible={adminMenuVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setAdminMenuVisible(false)}
      >
        <TouchableOpacity 
          style={styles.adminModalOverlay}
          activeOpacity={1}
          onPress={() => setAdminMenuVisible(false)}
        >
          <View style={styles.adminModalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.adminModalHeader}>
              <Settings size={24} color="#0F172A" />
              <Text style={styles.adminModalTitle}>Manage Education</Text>
            </View>
            
            <TouchableOpacity
              style={styles.adminMenuItem}
              onPress={() => {
                setAdminMenuVisible(false);
                debouncedRouter.push('/admin-education-universities');
              }}
            >
              <GraduationCap size={20} color="#0F172A" />
              <Text style={styles.adminMenuItemText}>Universities</Text>
              <ChevronRight size={20} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.adminMenuItem}
              onPress={() => {
                setAdminMenuVisible(false);
                debouncedRouter.push('/admin-education-scholarships');
              }}
            >
              <Award size={20} color="#0F172A" />
              <Text style={styles.adminMenuItemText}>Scholarships</Text>
              <ChevronRight size={20} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.adminMenuItem}
              onPress={() => {
                setAdminMenuVisible(false);
                debouncedRouter.push('/admin-alumni-mentors');
              }}
            >
              <Users size={20} color="#0F172A" />
              <Text style={styles.adminMenuItemText}>Alumni Mentors</Text>
              <ChevronRight size={20} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.adminModalCancelButton}
              onPress={() => setAdminMenuVisible(false)}
            >
              <Text style={styles.adminModalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      </ScrollView>
    </View>
  );
}const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
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
  heroHeader: {
    backgroundColor: '#FFFFFF',
    paddingTop: 48,
    paddingBottom: 12,
  },
  heroTopRow: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    paddingHorizontal: 20,
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginTop: 4,
    marginBottom: 8,
    lineHeight: 18,
  },
  heroManageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  heroManageText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  addButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    paddingHorizontal: 18,
    height: 52,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bookmarkIconButton: {
    width: 52,
    height: 52,
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#0F172A',
  },
  typesScroll: {
    marginBottom: 24,
  },
  typesContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  activeTypeButton: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  typeName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#64748B',
  },
  activeTypeName: {
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#0F172A',
  },
  featuredContent: {
    paddingHorizontal: 20,
    gap: 20,
  },
  featuredCard: {
    width: CARD_WIDTH,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  featuredImage: {
    width: '100%',
    height: 200,
  },
  rankingBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  rankingText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  featuredInfo: {
    padding: 20,
    gap: 12,
  },
  universityName: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#0F172A',
  },
  programTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  programTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  programText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  deadlineInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  scholarshipCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  scholarshipImage: {
    flex: 1,
    width: '100%',
  },
  scholarshipImageContainer: {
    width: 130,
    alignSelf: 'stretch',
    backgroundColor: '#F1F5F9',
  },
  scholarshipInfo: {
    flex: 1,
    padding: 20,
    gap: 12,
  },
  scholarshipTypeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  scholarshipTypeText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  scholarshipTitle: {
    fontSize: 17,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  scholarshipDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  quickActionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  quickActionText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  bookmarkDropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bookmarkDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 14,
  },
  bookmarkDropdownText: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: '#0F172A',
  },
  bookmarkDropdownDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 20,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#64748B',
    marginTop: 40,
  },
  // Tab styles
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  activeTabButton: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  tabText: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: '#64748B',
  },
  activeTabText: {
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  sectionCount: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  universityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardImage: {
    width: '100%',
    height: 200,
  },
  cardInfo: {
    padding: 20,
    gap: 12,
  },
  cardTitle: {
    fontSize: 19,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    lineHeight: 22,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  linkText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 50,
    gap: 16,
    backgroundColor: '#F8FAFC',
    marginHorizontal: 20,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  deadlineText: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
  },
  bookmarkIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bookmarkIconSmall: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    padding: 6,
    borderRadius: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  segmentedTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  segmentedTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  segmentedTabActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  segmentedTabText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#64748B',
  },
  segmentedTabTextActive: {
    color: '#FFFFFF',
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
  },
  // Mentor Card Styles
  mentorCard: {
    position: 'relative',
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    gap: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mentorFavoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mentorAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: '#0F172A',
  },
  modernMentorCard: {
    position: 'relative',
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
    gap: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mentorInfo: {
    flex: 1,
    gap: 8,
  },
  mentorName: {
    fontSize: 17,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  mentorRole: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    lineHeight: 20,
  },
  mentorLocation: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  mentorActions: {
    marginTop: 10,
  },
  messageButton: {
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 14,
    alignSelf: 'flex-start',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  messageButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    letterSpacing: 0.3,
  },
  // New mentor styles
  mentorsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 16,
    paddingRight: 24,
  },
  myRequestsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  myRequestsButtonText: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  filterIconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  mentorDashboardButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  volunteerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    gap: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
    marginRight: 4,
  },
  volunteerButtonText: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  mentorInfoBanner: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mentorInfoText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    lineHeight: 20,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  mentorCompany: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  mentorFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  mentorFormatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  mentorChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  mentorChipText: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: '#64748B',
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: '70%',
  },
  availabilityText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#D97706',
  },
  mentorCTAButton: {
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  mentorCTAButtonText: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  emptyButton: {
    backgroundColor: '#0F172A',
    paddingVertical: 14,
    paddingHorizontal: 26,
    borderRadius: 14,
    marginTop: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  // Resource Card Styles
  resourceCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
    gap: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  resourceIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resourceInfo: {
    flex: 1,
    gap: 8,
  },
  resourceTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
  },
  resourceDescription: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    lineHeight: 20,
  },
  resourcePrice: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#4CAF50',
    marginTop: 4,
  },
  // Course Card Styles
  courseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  courseImage: {
    width: '100%',
    height: 160,
  },
  courseInfo: {
    padding: 18,
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  courseTitle: {
    fontSize: 17,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  courseDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    lineHeight: 20,
  },
  courseFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  courseDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3E5F5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  courseDurationText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#9C27B0',
  },
  // Study Group Card Styles
  studyGroupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    gap: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  studyGroupHeader: {
    flexDirection: 'row',
    gap: 14,
  },
  studyGroupIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E0F7FA',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00BCD4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  studyGroupInfo: {
    flex: 1,
    gap: 6,
  },
  studyGroupTitle: {
    fontSize: 17,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  studyGroupDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    lineHeight: 20,
  },
  studyGroupFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0F7FA',
  },
  studyGroupMembers: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#00BCD4',
  },
  joinButton: {
    backgroundColor: '#00BCD4',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#00BCD4',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  joinButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  // Event Card Styles
  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    gap: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  eventDateBox: {
    width: 70,
    height: 70,
    borderRadius: 16,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  eventMonth: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  eventDay: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  eventInfo: {
    flex: 1,
    gap: 8,
  },
  eventTitle: {
    fontSize: 17,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  eventDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    lineHeight: 20,
  },
  eventLocation: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#FF5722',
    marginTop: 4,
  },
  // Modern redesigned styles
  modernSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  headerIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  modernSectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  modernSectionSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginTop: 2,
  },
  countBadge: {
    minWidth: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    borderWidth: 2,
    borderColor: '#4169E1',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  countBadgeText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  cardsGrid: {
    paddingHorizontal: 16,
    gap: 16,
    paddingBottom: 20,
  },
  modernUniversityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modernScholarshipCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modernCardImageContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    position: 'relative',
    backgroundColor: '#F3F4F6',
  },
  modernCardImage: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'transparent',
  },
  modernBookmarkButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(10px)',
  },
  fundingAmountBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  fundingAmountText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  modernCardContent: {
    padding: 20,
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modernCardTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    lineHeight: 28,
    letterSpacing: -0.4,
  },
  modernLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modernLocationText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#0F172A',
  },
  modernCardDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    lineHeight: 22,
  },
  modernApplicationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  modernApplicationText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
  },
  scholarshipTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  scholarshipTypeBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#D97706',
    letterSpacing: 0.3,
  },
  prominentDeadline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  prominentDeadlineText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#D97706',
    letterSpacing: 0.2,
  },
  urgentDeadlineBadge: {
    backgroundColor: '#FEE2E2',
  },
  urgentDeadlineText: {
    color: '#EF4444',
  },
  deadlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  urgentDeadlineContainer: {
    backgroundColor: '#FEE2E2',
  },
  deadlineInfoText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#64748B',
  },
  urgentDeadline: {
    color: '#EF4444',
  },
  applyNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 8,
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  applyNowButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    letterSpacing: 0.3,
  },
  modernViewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 4,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  modernViewButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    letterSpacing: 0.3,
  },
  modernEmptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  modernEmptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    textAlign: 'center',
  },
  modernEmptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  submitScholarshipCTA: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  submitScholarshipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    zIndex: 2,
  },
  submitScholarshipIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitScholarshipTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  submitScholarshipSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    marginTop: 2,
  },
  submitScholarshipArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitScholarshipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 20,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  submitScholarshipButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  adminModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  adminModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  adminModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  adminModalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    flex: 1,
  },
  adminMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFF',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5EAF2',
  },
  adminMenuItemText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    flex: 1,
  },
  adminModalCancelButton: {
    marginTop: 8,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  adminModalCancelText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#64748B',
  },
});