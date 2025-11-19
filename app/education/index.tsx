import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, TextInput, Dimensions, Alert, ActivityIndicator, Modal } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState, useCallback } from 'react';
import { SplashScreen, useRouter, Link, useLocalSearchParams } from 'expo-router';
import { Search, Filter, ArrowLeft, GraduationCap, MapPin, Globe, ChevronRight, Clock, Award, Wallet, BookOpen, Building2, Users, Plus, FileText, Bookmark, Settings } from 'lucide-react-native';
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
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [adminMenuVisible, setAdminMenuVisible] = useState(false);
  
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  // Check if user is admin (same pattern as events screen)
  const loadRole = useCallback(async () => {
    console.log('[Education] loadRole called');
    console.log('[Education] user exists:', !!user);
    console.log('[Education] user.id:', user?.id);
    
    if (!user) {
      console.log('[Education] No user, skipping admin check');
      setCheckingAdmin(false);
      return;
    }
    
    try {
      console.log('[Education] Fetching profile for user:', user.id);
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin, role')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('[Education] Error fetching profile:', error);
        setIsAdmin(false);
        setCheckingAdmin(false);
        return;
      }
      
      console.log('[Education] Profile data:', data);
      console.log('[Education] is_admin:', data?.is_admin);
      console.log('[Education] role:', data?.role);
      
      const admin = data?.is_admin === true || data?.role === 'admin';
      console.log('[Education] Computed admin status:', admin);
      
      setIsAdmin(!!admin);
      
      // Don't auto-redirect admins - let them see the content
      // They can access admin panel via the button if needed
      
      setCheckingAdmin(false);
    } catch (err) {
      console.error('[Education] Exception in loadRole:', err);
      setIsAdmin(false);
      setCheckingAdmin(false);
    }
  }, [user, router]);

  useEffect(() => {
    console.log('[Education] useEffect for loadRole triggered');
    loadRole();
  }, [loadRole]);

  // Fetch Ghanaian universities only
  const fetchUniversities = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products_services')
        .select('*')
        .eq('is_approved', true)
        .eq('category_name', 'Universities')
        .ilike('location', '%Ghana%')
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
      
      // Fetch legacy scholarships from products_services
      const { data: legacyData, error: legacyError } = await supabase
        .from('products_services')
        .select('*')
        .eq('is_approved', true)
        .eq('category_name', 'Scholarships')
        .order('created_at', { ascending: false });

      if (legacyError) throw legacyError;

      // Fetch approved user-submitted scholarships
      const { data: submittedData, error: submittedError } = await supabase
        .from('approved_scholarships')
        .select('*');

      if (submittedError) {
        console.warn('Error fetching user-submitted scholarships:', submittedError);
      }

      // Combine both sources
      const combined = [
        ...(legacyData || []),
        ...(submittedData || []).map((s: any) => ({
          ...s,
          category_name: 'Scholarships',
          is_user_submitted: true,
        })),
      ];

      console.log('📚 Fetched scholarships:', legacyData?.length, 'legacy +', submittedData?.length, 'user-submitted');
      setScholarships(combined);
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
        .from('products_services')
        .select('*')
        .eq('is_approved', true)
        .eq('category_name', 'Educational Events')
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
        .eq('user_id', user.id);

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
        .select('mentor_id')
        .eq('user_id', user.id)
        .not('mentor_id', 'is', null);

      if (error) {
        console.error('❌ [Education] Error fetching favorite mentors:', error);
        throw error;
      }
      
      const mentorIds = data?.map(f => f.mentor_id!) || [];
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

  if (!fontsLoaded) {
    return null;
  }

  // Show loading while checking admin status
  if (checkingAdmin) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="small" color="#4169E1" />
        <Text style={{ marginTop: 8, fontSize: 14, color: '#666' }}>Loading...</Text>
      </View>
    );
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
      Alert.alert('Admins only', 'You need admin access to manage Schools & Scholarships.');
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
          .eq('mentor_id', mentorId);

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
          mentor_id: mentorId,
          opportunity_id: null
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
  const toggleBookmark = async (opportunityId: string, event: any) => {
    event.stopPropagation(); // Prevent card click
    
    console.log('toggleBookmark called', { opportunityId, user: !!user });
    
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
          .eq('opportunity_id', opportunityId);
        
        if (error) throw error;
        
        setBookmarkedIds(prev => prev.filter(id => id !== opportunityId));
        Alert.alert('Removed', 'Removed from bookmarks.');
      } else {
        const { error } = await supabase
          .from('education_bookmarks')
          .insert({ user_id: user.id, opportunity_id: opportunityId });
        
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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero Header */}
      <View style={styles.heroHeader}>
        <View style={styles.heroTopRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={22} color="#0F172A" />
          </TouchableOpacity>
          {(profile?.is_admin || profile?.role === 'admin') ? (
            <TouchableOpacity 
              style={styles.heroManageButton}
              onPress={handleAddOpportunity}
              accessibilityLabel="Manage Schools and Scholarships"
            >
              <Plus size={18} color="#4169E1" />
              <Text style={styles.heroManageText}>Manage</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 74 }} />
          )}
        </View>
        <Text style={styles.heroTitle}>Universities, Scholarships & Alumni Mentors</Text>
        <Text style={styles.heroSubtitle}>Discover schools, secure funding, and get guidance from alumni mentors</Text>

        {/* Search */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Search size={20} color="#64748B" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search universities, scholarships, mentors..."
              placeholderTextColor="#64748B"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Link href="/education/my-applications" asChild>
            <TouchableOpacity style={styles.quickActionButton}>
              <Text style={styles.quickActionText}>My Applications</Text>
            </TouchableOpacity>
          </Link>
          <Link href="/education/saved-opportunities" asChild>
            <TouchableOpacity style={styles.quickActionButton}>
              <Text style={styles.quickActionText}>Saved ↓</Text>
            </TouchableOpacity>
          </Link>
          <Link href="/education/saved-mentors" asChild>
            <TouchableOpacity style={styles.quickActionButton}>
              <Text style={styles.quickActionText}>Saved ↓</Text>
            </TouchableOpacity>
          </Link>
        </View>

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
                <Building2 size={24} color="#4169E1" />
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
              <ActivityIndicator size="large" color="#4169E1" />
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
                    onPress={() => router.push(`/education/detail/${university.id}` as any)}
                    activeOpacity={0.95}
                  >
                    <View style={styles.modernCardImageContainer}>
                      <Image 
                        source={{ uri: imageUri }} 
                        style={styles.modernCardImage} 
                        resizeMode="cover"
                      />
                      <View style={styles.imageGradient} />
                      <TouchableOpacity 
                        style={styles.modernBookmarkButton}
                        onPress={(e) => {
                          e?.preventDefault?.();
                          e?.stopPropagation?.();
                          toggleBookmark(university.id, e);
                        }}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Bookmark 
                          size={20} 
                          color={bookmarkedIds.includes(university.id) ? "#FFD700" : "#FFFFFF"} 
                          fill={bookmarkedIds.includes(university.id) ? "#FFD700" : "none"}
                          strokeWidth={2}
                        />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.modernCardContent}>
                      <Text style={styles.modernCardTitle} numberOfLines={2}>{university.title}</Text>
                      <View style={styles.modernLocationRow}>
                        <MapPin size={16} color="#4169E1" />
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
                      <TouchableOpacity style={styles.modernViewButton}>
                        <Text style={styles.modernViewButtonText}>View Details</Text>
                        <ChevronRight size={16} color="#4169E1" />
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

          {/* Submit Scholarship Button */}
          {user && (
            <TouchableOpacity
              style={styles.submitScholarshipButton}
              onPress={() => router.push('/education/submit-scholarship' as any)}
              activeOpacity={0.7}
            >
              <Plus size={18} color="#FFFFFF" />
              <Text style={styles.submitScholarshipButtonText}>Submit a Scholarship</Text>
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
                
                // Calculate days remaining
                let daysRemaining = null;
                let deadlineStatus = '';
                if (scholarship.deadline_date) {
                  const deadline = new Date(scholarship.deadline_date);
                  const now = new Date();
                  daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  if (daysRemaining > 0) {
                    deadlineStatus = `${daysRemaining} days left`;
                  } else {
                    deadlineStatus = 'Expired';
                  }
                }
                
                return (
                  <TouchableOpacity 
                    key={scholarship.id} 
                    style={styles.modernScholarshipCard}
                    onPress={() => router.push(`/education/detail/${scholarship.id}` as any)}
                    activeOpacity={0.95}
                  >
                    <View style={styles.modernCardImageContainer}>
                      <Image 
                        source={{ uri: imageUri }} 
                        style={styles.modernCardImage}
                        resizeMode="cover"
                      />
                      <View style={styles.imageGradient} />
                      
                      {/* Funding Amount Badge */}
                      {scholarship.funding_amount && (
                        <View style={styles.fundingAmountBadge}>
                          <Wallet size={16} color="#FFFFFF" />
                          <Text style={styles.fundingAmountText}>
                            {currencySymbol}{scholarship.funding_amount}
                          </Text>
                        </View>
                      )}
                      
                      <TouchableOpacity 
                        style={styles.modernBookmarkButton}
                        onPress={(e) => {
                          e?.preventDefault?.();
                          e?.stopPropagation?.();
                          toggleBookmark(scholarship.id, e);
                        }}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Bookmark 
                          size={20} 
                          color={bookmarkedIds.includes(scholarship.id) ? "#FFD700" : "#FFFFFF"} 
                          fill={bookmarkedIds.includes(scholarship.id) ? "#FFD700" : "none"}
                          strokeWidth={2}
                        />
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.modernCardContent}>
                      <View style={styles.scholarshipTypeBadge}>
                        <GraduationCap size={14} color="#F59E0B" />
                        <Text style={styles.scholarshipTypeBadgeText}>Scholarship</Text>
                      </View>
                      
                      <Text style={styles.modernCardTitle} numberOfLines={2}>{scholarship.title}</Text>
                      
                      <Text style={styles.modernCardDescription} numberOfLines={3}>
                        {scholarship.description}
                      </Text>
                      
                      {/* Deadline Info */}
                      {(deadlineStatus || scholarship.deadline_text) && (
                        <View style={styles.deadlineContainer}>
                          <Clock size={14} color={daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 7 ? '#EF4444' : '#6B7280'} />
                          <Text style={[
                            styles.deadlineInfoText,
                            daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 7 && styles.urgentDeadline
                          ]}>
                            {deadlineStatus || scholarship.deadline_text}
                          </Text>
                        </View>
                      )}
                      
                      <TouchableOpacity style={[styles.modernViewButton, {backgroundColor: '#FFF9E6'}]}>
                        <Text style={[styles.modernViewButtonText, {color: '#F59E0B'}]}>Apply Now</Text>
                        <ChevronRight size={16} color="#F59E0B" />
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
            <View style={{flexDirection: 'row', gap: 8}}>
              {/* My Requests Button */}
              <TouchableOpacity 
                style={styles.myRequestsButton}
                onPress={() => router.push('/my-mentorship-requests' as any)}
              >
                <FileText size={16} color="#4169E1" />
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
                onPress={() => router.push('/mentor-dashboard' as any)}
              >
                <Users size={16} color="#8B5CF6" />
              </TouchableOpacity>
              
              {/* Volunteer Button */}
              <TouchableOpacity 
                style={styles.volunteerButton}
                onPress={() => router.push('/education/volunteer-mentor' as any)}
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
                onPress={() => router.push(`/education/mentor/${mentor.id}` as any)}
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
                  <Bookmark
                    size={20}
                    color={favoriteMentorIds.includes(mentor.id) ? '#EF4444' : '#9CA3AF'}
                    fill={favoriteMentorIds.includes(mentor.id) ? '#EF4444' : 'none'}
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
                          <Text style={[styles.mentorChipText, { color: '#6B7280' }]}>+{mentor.expertise_areas.length - 3}</Text>
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
                      onPress={() => router.push(`/education/mentor/${mentor.id}` as any)}
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
                onPress={() => router.push('/education/volunteer-mentor' as any)}
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
              <Settings size={24} color="#4169E1" />
              <Text style={styles.adminModalTitle}>Manage Education</Text>
            </View>
            
            <TouchableOpacity
              style={styles.adminMenuItem}
              onPress={() => {
                setAdminMenuVisible(false);
                router.push('/admin-alumni-mentors' as any);
              }}
            >
              <Users size={20} color="#4169E1" />
              <Text style={styles.adminMenuItemText}>Alumni Mentors</Text>
              <ChevronRight size={20} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.adminMenuItem}
              onPress={() => {
                setAdminMenuVisible(false);
                router.push('/admin-education-scholarships' as any);
              }}
            >
              <Award size={20} color="#4169E1" />
              <Text style={styles.adminMenuItemText}>Scholarships</Text>
              <ChevronRight size={20} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.adminMenuItem}
              onPress={() => {
                setAdminMenuVisible(false);
                router.push('/admin-education-universities' as any);
              }}
            >
              <GraduationCap size={20} color="#4169E1" />
              <Text style={styles.adminMenuItemText}>Universities</Text>
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
  heroHeader: {
    backgroundColor: '#F8FAFF',
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5EAF2',
  },
  heroTopRow: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroTitle: {
    paddingHorizontal: 16,
    fontSize: 22,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    paddingHorizontal: 16,
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#475569',
    marginTop: 4,
  },
  heroManageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D6E1FF',
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  heroManageText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginTop: 4,
    textAlign: 'center',
  },
  addButton: {
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
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  rankingText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  featuredInfo: {
    padding: 16,
    gap: 8,
  },
  universityName: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
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
  programTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  programTag: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  programText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  deadlineInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  scholarshipCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 18,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#FFF9E6',
  },
  scholarshipImage: {
    flex: 1,
    width: '100%',
  },
  scholarshipImageContainer: {
    width: 120,
    alignSelf: 'stretch',
    backgroundColor: '#F0F4FF',
  },
  scholarshipInfo: {
    flex: 1,
    padding: 16,
    gap: 8,
    backgroundColor: '#FAFAFA',
  },
  scholarshipTypeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  scholarshipTypeText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#F57C00',
    letterSpacing: 0.5,
  },
  scholarshipTitle: {
    fontSize: 17,
    fontFamily: 'Inter-SemiBold',
    color: '#1a1a1a',
    lineHeight: 24,
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
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 20,
  },
  quickActionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#D6E1FF',
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  quickActionText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
    letterSpacing: 0.1,
    textAlign: 'center',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1a1a1a',
  },
  // Tab styles
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 20,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F7FA',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    gap: 8,
    borderWidth: 2,
    borderColor: '#E8EDF2',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  activeTabButton: {
    backgroundColor: '#4169E1',
    borderColor: '#4169E1',
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  tabText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
  },
  activeTabText: {
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  sectionCount: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  universityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F0F4FF',
  },
  cardImage: {
    width: '100%',
    height: 200,
  },
  cardInfo: {
    padding: 20,
    gap: 10,
    backgroundColor: '#FAFAFA',
  },
  cardTitle: {
    fontSize: 19,
    fontFamily: 'Inter-SemiBold',
    color: '#1a1a1a',
    lineHeight: 26,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    lineHeight: 20,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  linkText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 50,
    gap: 16,
    backgroundColor: '#F8F9FA',
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E8EDF2',
    borderStyle: 'dashed',
  },
  deadlineText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#FF6B6B',
  },
  bookmarkIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
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
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  segmentedTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  segmentedTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5EAF2',
    gap: 8,
  },
  segmentedTabActive: {
    backgroundColor: '#4169E1',
    borderColor: '#4169E1',
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  segmentedTabText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  segmentedTabTextActive: {
    color: '#FFFFFF',
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#999999',
    textAlign: 'center',
  },
  // Mentor Card Styles
  mentorCard: {
    position: 'relative',
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    gap: 16,
    borderWidth: 1,
    borderColor: '#F0F4FF',
  },
  mentorFavoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  mentorAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: '#4169E1',
  },
  modernMentorCard: {
    position: 'relative',
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    gap: 14,
    borderWidth: 1,
    borderColor: '#EEF2FF',
  },
  mentorInfo: {
    flex: 1,
    gap: 6,
  },
  mentorName: {
    fontSize: 17,
    fontFamily: 'Inter-SemiBold',
    color: '#1a1a1a',
  },
  mentorRole: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    lineHeight: 20,
  },
  mentorLocation: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#999999',
  },
  mentorActions: {
    marginTop: 10,
  },
  messageButton: {
    backgroundColor: '#4169E1',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignSelf: 'flex-start',
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  messageButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  // New mentor styles
  mentorsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  myRequestsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EAF2FF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D6E1FF',
  },
  myRequestsButtonText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  filterIconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#10B981',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  mentorDashboardButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  volunteerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  volunteerButtonText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  mentorInfoBanner: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  mentorInfoText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#1E40AF',
    lineHeight: 18,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  mentorCompany: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  mentorFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  mentorFormatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  mentorChip: {
    backgroundColor: '#EAF2FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D6E1FF',
  },
  mentorChipText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: '70%',
  },
  availabilityText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#334155',
  },
  mentorCTAButton: {
    backgroundColor: '#4169E1',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  mentorCTAButtonText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  emptyButton: {
    backgroundColor: '#4169E1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 16,
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  // Resource Card Styles
  resourceCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
    gap: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  resourceIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  resourceInfo: {
    flex: 1,
    gap: 6,
  },
  resourceTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1a1a1a',
  },
  resourceDescription: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    lineHeight: 18,
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
    marginHorizontal: 16,
    marginBottom: 18,
    overflow: 'hidden',
    shadowColor: '#9C27B0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#F3E5F5',
  },
  courseImage: {
    width: '100%',
    height: 160,
  },
  courseInfo: {
    padding: 18,
    gap: 10,
    backgroundColor: '#FAFAFA',
  },
  courseTitle: {
    fontSize: 17,
    fontFamily: 'Inter-SemiBold',
    color: '#1a1a1a',
    lineHeight: 24,
  },
  courseDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
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
    marginHorizontal: 16,
    marginBottom: 18,
    padding: 20,
    shadowColor: '#00BCD4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
    gap: 16,
    borderWidth: 2,
    borderColor: '#E0F7FA',
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
    fontFamily: 'Inter-SemiBold',
    color: '#1a1a1a',
  },
  studyGroupDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
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
    marginHorizontal: 16,
    marginBottom: 18,
    padding: 20,
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    gap: 18,
    borderWidth: 1,
    borderColor: '#FFEBEE',
  },
  eventDateBox: {
    width: 70,
    height: 70,
    borderRadius: 16,
    backgroundColor: '#FF5722',
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
    fontFamily: 'Inter-SemiBold',
    color: '#1a1a1a',
    lineHeight: 24,
  },
  eventDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
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
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  modernSectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    letterSpacing: -0.3,
  },
  modernSectionSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  modernScholarshipCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  modernCardImageContainer: {
    width: '100%',
    height: 200,
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
    height: 80,
    backgroundColor: 'transparent',
  },
  modernBookmarkButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  fundingAmountBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.95)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  fundingAmountText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  modernCardContent: {
    padding: 18,
    gap: 12,
  },
  modernCardTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  modernLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modernLocationText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#4169E1',
  },
  modernCardDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  scholarshipTypeBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#F59E0B',
    letterSpacing: 0.3,
  },
  deadlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  deadlineInfoText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  urgentDeadline: {
    color: '#EF4444',
  },
  modernViewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 4,
    borderWidth: 1.5,
    borderColor: '#4169E1',
  },
  modernViewButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
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
    shadowRadius: 8,
    elevation: 5,
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
    color: '#6B7280',
  },
});