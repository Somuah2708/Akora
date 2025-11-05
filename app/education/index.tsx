import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, TextInput, Dimensions, Alert } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState, useCallback } from 'react';
import { SplashScreen, useRouter, Link } from 'expo-router';
import { Search, Filter, ArrowLeft, GraduationCap, MapPin, Globe, ChevronRight, Clock, Award, Wallet, BookOpen, Building2, Users, Plus, FileText, Bookmark } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 48;

type TabType = 'universities' | 'scholarships' | 'mentors' | 'resources' | 'courses' | 'study-groups' | 'events';

export default function EducationScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('universities');
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
  
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

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
      const { data, error } = await supabase
        .from('products_services')
        .select('*')
        .eq('is_approved', true)
        .eq('category_name', 'Scholarships')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setScholarships(data || []);
    } catch (error) {
      console.error('Error fetching scholarships:', error);
      Alert.alert('Error', 'Failed to load scholarships.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch alumni mentors
  const fetchMentors = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products_services')
        .select('*')
        .eq('is_approved', true)
        .eq('category_name', 'Alumni Mentors')
        .order('created_at', { ascending: false });

      if (error) throw error;
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
      case 'resources':
        fetchResources();
        break;
      case 'courses':
        fetchCourses();
        break;
      case 'study-groups':
        fetchStudyGroups();
        break;
      case 'events':
        fetchEvents();
        break;
    }
    if (user) {
      fetchBookmarks();
    }
  }, [activeTab, fetchUniversities, fetchScholarships, fetchMentors, fetchResources, fetchCourses, fetchStudyGroups, fetchEvents, user, fetchBookmarks]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

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
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (m.title || '').toLowerCase().includes(query) ||
      (m.description || '').toLowerCase().includes(query) ||
      (m.location || '').toLowerCase().includes(query)
    );
  });

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
    if (!user) {
      Alert.alert('Authentication Required', 'Please sign in to add an educational opportunity.');
      return;
    }
    router.push('/create-educational-listing');
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.title}>Schools & Scholarships</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddOpportunity}
        >
          <Plus size={24} color="#4169E1" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#666666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search universities, scholarships..."
            placeholderTextColor="#666666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>
      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Link href="/education/my-applications/index" asChild>
          <TouchableOpacity style={styles.quickActionButton}>
            <FileText size={18} color="#4169E1" />
            <Text style={styles.quickActionText}>My Applications</Text>
          </TouchableOpacity>
        </Link>
        <Link href="/education/saved-opportunities/index" asChild>
          <TouchableOpacity style={styles.quickActionButton}>
            <Bookmark size={18} color="#4169E1" />
            <Text style={styles.quickActionText}>Saved</Text>
          </TouchableOpacity>
        </Link>
      </View>

      {/* Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.tabScrollContainer}
        contentContainerStyle={styles.tabContainer}
      >
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'universities' && styles.activeTabButton]}
          onPress={() => {
            setActiveTab('universities');
            setSearchQuery('');
          }}
        >
          <Building2 size={20} color={activeTab === 'universities' ? '#FFFFFF' : '#666666'} />
          <Text style={[styles.tabText, activeTab === 'universities' && styles.activeTabText]}>
            Universities ({universities.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'scholarships' && styles.activeTabButton]}
          onPress={() => {
            setActiveTab('scholarships');
            setSearchQuery('');
          }}
        >
          <Award size={20} color={activeTab === 'scholarships' ? '#FFFFFF' : '#666666'} />
          <Text style={[styles.tabText, activeTab === 'scholarships' && styles.activeTabText]}>
            Scholarships ({scholarships.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'mentors' && styles.activeTabButton]}
          onPress={() => {
            setActiveTab('mentors');
            setSearchQuery('');
          }}
        >
          <Users size={20} color={activeTab === 'mentors' ? '#FFFFFF' : '#666666'} />
          <Text style={[styles.tabText, activeTab === 'mentors' && styles.activeTabText]}>
            Alumni Mentors ({mentors.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'resources' && styles.activeTabButton]}
          onPress={() => {
            setActiveTab('resources');
            setSearchQuery('');
          }}
        >
          <BookOpen size={20} color={activeTab === 'resources' ? '#FFFFFF' : '#666666'} />
          <Text style={[styles.tabText, activeTab === 'resources' && styles.activeTabText]}>
            Study Resources ({resources.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'courses' && styles.activeTabButton]}
          onPress={() => {
            setActiveTab('courses');
            setSearchQuery('');
          }}
        >
          <GraduationCap size={20} color={activeTab === 'courses' ? '#FFFFFF' : '#666666'} />
          <Text style={[styles.tabText, activeTab === 'courses' && styles.activeTabText]}>
            Courses ({courses.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'study-groups' && styles.activeTabButton]}
          onPress={() => {
            setActiveTab('study-groups');
            setSearchQuery('');
          }}
        >
          <Users size={20} color={activeTab === 'study-groups' ? '#FFFFFF' : '#666666'} />
          <Text style={[styles.tabText, activeTab === 'study-groups' && styles.activeTabText]}>
            Study Groups ({studyGroups.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'events' && styles.activeTabButton]}
          onPress={() => {
            setActiveTab('events');
            setSearchQuery('');
          }}
        >
          <Clock size={20} color={activeTab === 'events' ? '#FFFFFF' : '#666666'} />
          <Text style={[styles.tabText, activeTab === 'events' && styles.activeTabText]}>
            Events ({events.length})
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Universities Tab Content */}
      {activeTab === 'universities' && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🇬🇭 Ghanaian Universities</Text>
            <Text style={styles.sectionCount}>{filteredUniversities.length} universities</Text>
          </View>

          {loading ? (
            <Text style={styles.loadingText}>Loading universities...</Text>
          ) : filteredUniversities.length > 0 ? (
            filteredUniversities.map((university) => (
              <TouchableOpacity 
                key={university.id} 
                style={styles.universityCard}
                onPress={() => router.push(`/education/detail/${university.id}` as any)}
              >
                <Image 
                  source={{ uri: university.image_url || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800' }} 
                  style={styles.cardImage} 
                />
                <TouchableOpacity 
                  style={styles.bookmarkIcon}
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
                    color={bookmarkedIds.includes(university.id) ? "#4169E1" : "#666666"} 
                    fill={bookmarkedIds.includes(university.id) ? "#4169E1" : "none"}
                  />
                </TouchableOpacity>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{university.title}</Text>
                  <View style={styles.locationRow}>
                    <MapPin size={14} color="#666666" />
                    <Text style={styles.locationText}>{university.location || 'Ghana'}</Text>
                  </View>
                  <Text style={styles.cardDescription} numberOfLines={3}>
                    {university.description}
                  </Text>
                  {university.application_url && (
                    <View style={styles.linkRow}>
                      <Globe size={14} color="#4169E1" />
                      <Text style={styles.linkText}>Application Available</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Building2 size={64} color="#CCCCCC" />
              <Text style={styles.emptyText}>No universities found</Text>
            </View>
          )}
        </View>
      )}

      {/* Scholarships Tab Content */}
      {activeTab === 'scholarships' && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>💰 Available Scholarships</Text>
            <Text style={styles.sectionCount}>{filteredScholarships.length} scholarships</Text>
          </View>

          {loading ? (
            <Text style={styles.loadingText}>Loading scholarships...</Text>
          ) : filteredScholarships.length > 0 ? (
            filteredScholarships.map((scholarship) => (
              <TouchableOpacity 
                key={scholarship.id} 
                style={styles.scholarshipCard}
                onPress={() => router.push(`/education/detail/${scholarship.id}` as any)}
              >
                <Image 
                  source={{ uri: scholarship.image_url || 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800' }} 
                  style={styles.scholarshipImage} 
                />
                <TouchableOpacity 
                  style={styles.bookmarkIconSmall}
                  onPress={(e) => {
                    e?.preventDefault?.();
                    e?.stopPropagation?.();
                    toggleBookmark(scholarship.id, e);
                  }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Bookmark 
                    size={18} 
                    color={bookmarkedIds.includes(scholarship.id) ? "#4169E1" : "#666666"} 
                    fill={bookmarkedIds.includes(scholarship.id) ? "#4169E1" : "none"}
                  />
                </TouchableOpacity>
                <View style={styles.scholarshipInfo}>
                  <View style={styles.scholarshipTypeTag}>
                    <GraduationCap size={14} color="#4169E1" />
                    <Text style={styles.scholarshipTypeText}>Scholarship</Text>
                  </View>
                  <Text style={styles.scholarshipTitle}>{scholarship.title}</Text>
                  <Text style={styles.cardDescription} numberOfLines={2}>
                    {scholarship.description}
                  </Text>
                  <View style={styles.scholarshipDetails}>
                    {scholarship.funding_amount && (
                      <View style={styles.detailItem}>
                        <Wallet size={14} color="#4CAF50" />
                        <Text style={styles.detailText}>${scholarship.funding_amount}</Text>
                      </View>
                    )}
                    {scholarship.deadline_date && (
                      <View style={styles.detailItem}>
                        <Clock size={14} color="#FF6B6B" />
                        <Text style={styles.deadlineText}>
                          {new Date(scholarship.deadline_date) > new Date()
                            ? `${Math.ceil((new Date(scholarship.deadline_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days left`
                            : 'Expired'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Award size={64} color="#CCCCCC" />
              <Text style={styles.emptyText}>No scholarships found</Text>
            </View>
          )}
        </View>
      )}

      {/* Alumni Mentors Tab Content */}
      {activeTab === 'mentors' && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>👨‍🎓 Alumni Mentors & Lecturers</Text>
            <Text style={styles.sectionCount}>{filteredMentors.length} mentors</Text>
          </View>

          {loading ? (
            <Text style={styles.loadingText}>Loading mentors...</Text>
          ) : filteredMentors.length > 0 ? (
            filteredMentors.map((mentor) => (
              <TouchableOpacity 
                key={mentor.id} 
                style={styles.mentorCard}
                onPress={() => router.push(`/education/detail/${mentor.id}` as any)}
              >
                <Image 
                  source={{ uri: mentor.image_url || 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=800' }} 
                  style={styles.mentorAvatar} 
                />
                <View style={styles.mentorInfo}>
                  <Text style={styles.mentorName}>{mentor.title}</Text>
                  <Text style={styles.mentorRole} numberOfLines={1}>{mentor.description}</Text>
                  {mentor.location && (
                    <View style={styles.locationRow}>
                      <MapPin size={12} color="#666666" />
                      <Text style={styles.mentorLocation}>{mentor.location}</Text>
                    </View>
                  )}
                  <View style={styles.mentorActions}>
                    <TouchableOpacity style={styles.messageButton}>
                      <Text style={styles.messageButtonText}>Send Message</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Users size={64} color="#CCCCCC" />
              <Text style={styles.emptyText}>No mentors available yet</Text>
              <Text style={styles.emptySubtext}>Check back soon for alumni mentors</Text>
            </View>
          )}
        </View>
      )}

      {/* Study Resources Tab Content */}
      {activeTab === 'resources' && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📚 Study Resources</Text>
            <Text style={styles.sectionCount}>{filteredResources.length} resources</Text>
          </View>

          {loading ? (
            <Text style={styles.loadingText}>Loading resources...</Text>
          ) : filteredResources.length > 0 ? (
            filteredResources.map((resource) => (
              <TouchableOpacity 
                key={resource.id} 
                style={styles.resourceCard}
                onPress={() => router.push(`/education/detail/${resource.id}` as any)}
              >
                <View style={styles.resourceIcon}>
                  <BookOpen size={24} color="#4169E1" />
                </View>
                <View style={styles.resourceInfo}>
                  <Text style={styles.resourceTitle}>{resource.title}</Text>
                  <Text style={styles.resourceDescription} numberOfLines={2}>
                    {resource.description}
                  </Text>
                  {resource.price && (
                    <Text style={styles.resourcePrice}>
                      {resource.price === '0' ? 'Free' : `GH₵${resource.price}`}
                    </Text>
                  )}
                </View>
                <ChevronRight size={20} color="#666666" />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <BookOpen size={64} color="#CCCCCC" />
              <Text style={styles.emptyText}>No study resources yet</Text>
              <Text style={styles.emptySubtext}>Resources will appear here</Text>
            </View>
          )}
        </View>
      )}

      {/* Courses Tab Content */}
      {activeTab === 'courses' && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🎓 Courses & Programs</Text>
            <Text style={styles.sectionCount}>{filteredCourses.length} courses</Text>
          </View>

          {loading ? (
            <Text style={styles.loadingText}>Loading courses...</Text>
          ) : filteredCourses.length > 0 ? (
            filteredCourses.map((course) => (
              <TouchableOpacity 
                key={course.id} 
                style={styles.courseCard}
                onPress={() => router.push(`/education/detail/${course.id}` as any)}
              >
                <Image 
                  source={{ uri: course.image_url || 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=800' }} 
                  style={styles.courseImage} 
                />
                <View style={styles.courseInfo}>
                  <Text style={styles.courseTitle}>{course.title}</Text>
                  <Text style={styles.courseDescription} numberOfLines={2}>
                    {course.description}
                  </Text>
                  <View style={styles.courseFooter}>
                    {course.duration && (
                      <View style={styles.courseDuration}>
                        <Clock size={14} color="#666666" />
                        <Text style={styles.courseDurationText}>{course.duration}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <GraduationCap size={64} color="#CCCCCC" />
              <Text style={styles.emptyText}>No courses available</Text>
              <Text style={styles.emptySubtext}>Check back for new programs</Text>
            </View>
          )}
        </View>
      )}

      {/* Study Groups Tab Content */}
      {activeTab === 'study-groups' && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>👥 Study Groups</Text>
            <Text style={styles.sectionCount}>{filteredStudyGroups.length} groups</Text>
          </View>

          {loading ? (
            <Text style={styles.loadingText}>Loading study groups...</Text>
          ) : filteredStudyGroups.length > 0 ? (
            filteredStudyGroups.map((group) => (
              <TouchableOpacity 
                key={group.id} 
                style={styles.studyGroupCard}
                onPress={() => router.push(`/education/detail/${group.id}` as any)}
              >
                <View style={styles.studyGroupHeader}>
                  <View style={styles.studyGroupIcon}>
                    <Users size={24} color="#4169E1" />
                  </View>
                  <View style={styles.studyGroupInfo}>
                    <Text style={styles.studyGroupTitle}>{group.title}</Text>
                    <Text style={styles.studyGroupDescription} numberOfLines={2}>
                      {group.description}
                    </Text>
                  </View>
                </View>
                <View style={styles.studyGroupFooter}>
                  <Text style={styles.studyGroupMembers}>
                    {group.member_count || 0} members
                  </Text>
                  <TouchableOpacity style={styles.joinButton}>
                    <Text style={styles.joinButtonText}>Join Group</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Users size={64} color="#CCCCCC" />
              <Text style={styles.emptyText}>No study groups yet</Text>
              <Text style={styles.emptySubtext}>Create or join a study group</Text>
            </View>
          )}
        </View>
      )}

      {/* Educational Events Tab Content */}
      {activeTab === 'events' && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📅 Educational Events</Text>
            <Text style={styles.sectionCount}>{filteredEvents.length} events</Text>
          </View>

          {loading ? (
            <Text style={styles.loadingText}>Loading events...</Text>
          ) : filteredEvents.length > 0 ? (
            filteredEvents.map((event) => (
              <TouchableOpacity 
                key={event.id} 
                style={styles.eventCard}
                onPress={() => router.push(`/education/detail/${event.id}` as any)}
              >
                <View style={styles.eventDateBox}>
                  <Text style={styles.eventMonth}>
                    {event.event_date ? new Date(event.event_date).toLocaleString('default', { month: 'short' }) : 'TBD'}
                  </Text>
                  <Text style={styles.eventDay}>
                    {event.event_date ? new Date(event.event_date).getDate() : '--'}
                  </Text>
                </View>
                <View style={styles.eventInfo}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventDescription} numberOfLines={2}>
                    {event.description}
                  </Text>
                  {event.location && (
                    <View style={styles.locationRow}>
                      <MapPin size={12} color="#666666" />
                      <Text style={styles.eventLocation}>{event.location}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Clock size={64} color="#CCCCCC" />
              <Text style={styles.emptyText}>No upcoming events</Text>
              <Text style={styles.emptySubtext}>Check back for workshops and seminars</Text>
            </View>
          )}
        </View>
      )}
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
  title: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
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
    width: 120,
    height: 140,
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
    gap: 12,
    marginBottom: 20,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 10,
    borderWidth: 2,
    borderColor: '#D6E1FF',
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  quickActionText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
    letterSpacing: 0.3,
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
  tabScrollContainer: {
    marginBottom: 20,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#999999',
    textAlign: 'center',
  },
  // Mentor Card Styles
  mentorCard: {
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
  mentorAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: '#4169E1',
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
});