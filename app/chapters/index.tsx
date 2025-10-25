import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, TextInput, Dimensions, Modal } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter } from 'expo-router';
import { Search, ArrowLeft, Globe, MapPin, Users, MessageCircle, Calendar, ChevronRight, Building2, Phone, Mail, ExternalLink } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Alert } from 'react-native';
import { ActivityIndicator } from 'react-native';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 48;

const CHAPTER_TYPES = [
  { id: 'all', name: 'All Chapters' },
  { id: 'university', name: 'University Chapters' },
  { id: 'regional', name: 'Regional Chapters' },
  { id: 'international', name: 'International' },
];

const FEATURED_CHAPTERS = [
  {
    id: '1',
    name: 'Greater Accra Chapter',
    type: 'regional',
    location: 'Accra, Ghana',
    members: 1200,
    image: 'https://images.unsplash.com/photo-1603351154351-5e2d0600bb77?w=800&auto=format&fit=crop&q=60',
    leadership: {
      president: 'Dr. Kwame Mensah',
      secretary: 'Mrs. Sarah Addo',
      treasurer: 'Mr. John Koffi',
    },
    contact: {
      email: 'accra@oaa.org',
      phone: '+233 20 123 4567',
    },
    upcomingEvents: [
      {
        title: 'Monthly Meeting',
        date: 'March 25, 2024',
      },
      {
        title: 'Community Outreach',
        date: 'April 10, 2024',
      },
    ],
    projects: [
      'School Renovation Project',
      'Mentorship Program',
      'Annual Scholarship Fund',
    ],
  },
  {
    id: '2',
    name: 'North America Chapter',
    type: 'international',
    location: 'Washington DC, USA',
    members: 850,
    image: 'https://images.unsplash.com/photo-1501466044931-62695aada8e9?w=800&auto=format&fit=crop&q=60',
    leadership: {
      president: 'Dr. Michael Brown',
      secretary: 'Ms. Lisa Johnson',
      treasurer: 'Mr. David Chen',
    },
    contact: {
      email: 'namerica@oaa.org',
      phone: '+1 202 555 0123',
    },
    upcomingEvents: [
      {
        title: 'Annual Gala',
        date: 'May 15, 2024',
      },
    ],
    projects: [
      'Technology Innovation Fund',
      'Student Exchange Program',
    ],
  },
];

const REGIONAL_CHAPTERS = [
  {
    id: '1',
    name: 'Ashanti Region Chapter',
    location: 'Kumasi, Ghana',
    members: 800,
    image: 'https://images.unsplash.com/photo-1596005554384-d293674c91d7?w=800&auto=format&fit=crop&q=60',
    activeProjects: 3,
  },
  {
    id: '2',
    name: 'Western Region Chapter',
    location: 'Takoradi, Ghana',
    members: 450,
    image: 'https://images.unsplash.com/photo-1580477667929-3ef27c684b7a?w=800&auto=format&fit=crop&q=60',
    activeProjects: 2,
  },
  {
    id: '3',
    name: 'Eastern Region Chapter',
    location: 'Koforidua, Ghana',
    members: 350,
    image: 'https://images.unsplash.com/photo-1499363536502-87642509e31b?w=800&auto=format&fit=crop&q=60',
    activeProjects: 4,
  },
];

const UNIVERSITY_CHAPTERS = [
  {
    id: '1',
    name: 'University of Ghana',
    location: 'Legon, Accra',
    members: 250,
    image: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: '2',
    name: 'KNUST',
    location: 'Kumasi',
    members: 180,
    image: 'https://images.unsplash.com/photo-1562774053-701939374585?w=800&auto=format&fit=crop&q=60',
  },
];

export default function ChaptersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeType, setActiveType] = useState('all');
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chapters, setChapters] = useState([]);
  const [featuredChapters, setFeaturedChapters] = useState([]);
  const [regionalChapters, setRegionalChapters] = useState([]);
  const [universityChapters, setUniversityChapters] = useState([]);
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  useEffect(() => {
    fetchChapters();
  }, [user]);

  const fetchChapters = async () => {
    try {
      setLoading(true);
      
      // Fetch chapters from circles table where category starts with "Chapter -"
      const { data, error } = await supabase
        .from('circles')
        .select(`
          *,
          circle_members(count)
        `)
        .like('category', 'Chapter -%');
      
      if (error) throw error;
      
      // Process chapters and check membership status
      const processedChapters = await Promise.all(
        (data || []).map(async (chapter) => {
          let is_member = false;
          let has_pending_request = false;
          
          if (user) {
            // Check if user is a member
            const { data: memberData } = await supabase
              .from('circle_members')
              .select('*')
              .eq('circle_id', chapter.id)
              .eq('user_id', user.id)
              .single();
            
            is_member = !!memberData;
            
            // Check if user has a pending request
            if (!is_member && chapter.is_private) {
              const { data: requestData } = await supabase
                .from('circle_join_requests')
                .select('*')
                .eq('circle_id', chapter.id)
                .eq('user_id', user.id)
                .eq('status', 'pending')
                .single();
              
              has_pending_request = !!requestData;
            }
          }
          
          // Extract chapter type from category (format: "Chapter - Type")
          const typeParts = chapter.category.split(' - ');
          const type = typeParts.length > 1 ? typeParts[1].toLowerCase() : 'regional';
          
          return {
            ...chapter,
            type,
            members: chapter.circle_members?.length || 0,
            is_member,
            has_pending_request,
            leadership: {
              president: 'Chapter President',
              secretary: 'Chapter Secretary',
              treasurer: 'Chapter Treasurer'
            },
            contact: {
              email: `${chapter.name.toLowerCase().replace(/\s+/g, '')}@oaa.org`,
              phone: '+233 20 123 4567'
            },
            upcomingEvents: [
              {
                title: 'Monthly Meeting',
                date: 'March 25, 2024'
              }
            ],
            projects: [
              'Community Outreach',
              'Mentorship Program'
            ]
          };
        })
      );
      
      // Categorize chapters
      const featured = processedChapters.filter(c => c.is_featured);
      const regional = processedChapters.filter(c => c.type === 'regional');
      const university = processedChapters.filter(c => c.type === 'university');
      
      setChapters(processedChapters);
      setFeaturedChapters(featured.length > 0 ? featured : FEATURED_CHAPTERS);
      setRegionalChapters(regional.length > 0 ? regional : REGIONAL_CHAPTERS);
      setUniversityChapters(university.length > 0 ? university : UNIVERSITY_CHAPTERS);
      
    } catch (error) {
      console.error('Error fetching chapters:', error);
      // Fall back to placeholder data
      setFeaturedChapters(FEATURED_CHAPTERS);
      setRegionalChapters(REGIONAL_CHAPTERS);
      setUniversityChapters(UNIVERSITY_CHAPTERS);
    } finally {
      setLoading(false);
    }
  };

  const joinChapter = async (chapter) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to join a chapter');
      return;
    }
    
    try {
      if (chapter.is_private) {
        // Create join request
        const { error } = await supabase
          .from('circle_join_requests')
          .insert([
            {
              circle_id: chapter.id,
              user_id: user.id,
            }
          ]);
        
        if (error) throw error;
        
        Alert.alert('Success', 'Join request sent! The chapter admin will review your request.');
      } else {
        // Join directly
        const { error } = await supabase
          .from('circle_members')
          .insert([
            {
              circle_id: chapter.id,
              user_id: user.id,
            }
          ]);
        
        if (error) throw error;
        
        Alert.alert('Success', 'You have joined the chapter!');
      }
      
      fetchChapters();
    } catch (error) {
      console.error('Error joining chapter:', error);
      Alert.alert('Error', 'Failed to join chapter');
    }
  };

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  const handleChapterPress = (chapter) => {
    setSelectedChapter(chapter);
    setModalVisible(true);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.title}>O.A.A Chapters</Text>
        <TouchableOpacity style={styles.globeButton}>
          <Globe size={24} color="#000000" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#666666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search chapters..."
            placeholderTextColor="#666666"
          />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.typesScroll}
        contentContainerStyle={styles.typesContent}
      >
        {CHAPTER_TYPES.map((type) => (
          <TouchableOpacity
            key={type.id}
            style={[
              styles.typeButton,
              activeType === type.id && styles.activeTypeButton,
            ]}
            onPress={() => setActiveType(type.id)}
          >
            <Text
              style={[
                styles.typeText,
                activeType === type.id && styles.activeTypeText,
              ]}
            >
              {type.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4169E1" />
          <Text style={styles.loadingText}>Loading chapters...</Text>
        </View>
      ) : (
        <>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Featured Chapters</Text>
              <TouchableOpacity style={styles.seeAllButton}>
                <Text style={styles.seeAllText}>See All</Text>
                <ChevronRight size={16} color="#666666" />
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredContent}
            >
              {featuredChapters.map((chapter) => (
                <TouchableOpacity 
                  key={chapter.id} 
                  style={styles.featuredCard}
                  onPress={() => handleChapterPress(chapter)}
                >
                  <Image source={{ uri: chapter.image_url || chapter.image }} style={styles.featuredImage} />
                  <View style={styles.chapterTypeTag}>
                    <Building2 size={14} color="#4169E1" />
                    <Text style={styles.chapterTypeText}>{chapter.type}</Text>
                  </View>
                  <View style={styles.featuredInfo}>
                    <Text style={styles.chapterName}>{chapter.name}</Text>
                    <View style={styles.locationInfo}>
                      <MapPin size={14} color="#666666" />
                      <Text style={styles.locationText}>{chapter.location || 'Location not specified'}</Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <Users size={14} color="#666666" />
                      <Text style={styles.memberText}>{chapter.members || 0} members</Text>
                    </View>
                    {chapter.is_member ? (
                      <View style={styles.memberBadge}>
                        <Text style={styles.memberBadgeText}>Member</Text>
                      </View>
                    ) : chapter.has_pending_request ? (
                      <View style={styles.pendingBadge}>
                        <Text style={styles.pendingBadgeText}>Request Pending</Text>
                      </View>
                    ) : (
                      <TouchableOpacity 
                        style={styles.joinButton}
                        onPress={() => joinChapter(chapter)}
                      >
                        <Text style={styles.joinButtonText}>
                          {chapter.is_private ? 'Request to Join' : 'Join Chapter'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Regional Chapters</Text>
              <TouchableOpacity style={styles.seeAllButton}>
                <Text style={styles.seeAllText}>See All</Text>
                <ChevronRight size={16} color="#666666" />
              </TouchableOpacity>
            </View>

            {regionalChapters.map((chapter) => (
              <TouchableOpacity 
                key={chapter.id} 
                style={styles.chapterCard}
                onPress={() => handleChapterPress(chapter)}
              >
                <Image source={{ uri: chapter.image_url || chapter.image }} style={styles.chapterImage} />
                <View style={styles.chapterInfo}>
                  <Text style={styles.chapterCardName}>{chapter.name}</Text>
                  <View style={styles.chapterDetails}>
                    <View style={styles.detailItem}>
                      <MapPin size={14} color="#666666" />
                      <Text style={styles.detailText}>{chapter.location || 'Location not specified'}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Users size={14} color="#666666" />
                      <Text style={styles.detailText}>{chapter.members || 0} members</Text>
                    </View>
                    {chapter.activeProjects && (
                      <View style={styles.detailItem}>
                        <Calendar size={14} color="#666666" />
                        <Text style={styles.detailText}>{chapter.activeProjects} active projects</Text>
                      </View>
                    )}
                  </View>
                  
                  {chapter.is_member ? (
                    <View style={styles.memberBadgeSmall}>
                      <Text style={styles.memberBadgeTextSmall}>Member</Text>
                    </View>
                  ) : chapter.has_pending_request ? (
                    <View style={styles.pendingBadgeSmall}>
                      <Text style={styles.pendingBadgeTextSmall}>Pending</Text>
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>University Chapters</Text>
              <TouchableOpacity style={styles.seeAllButton}>
                <Text style={styles.seeAllText}>See All</Text>
                <ChevronRight size={16} color="#666666" />
              </TouchableOpacity>
            </View>

            <View style={styles.universityGrid}>
              {universityChapters.map((chapter) => (
                <TouchableOpacity 
                  key={chapter.id} 
                  style={styles.universityCard}
                  onPress={() => handleChapterPress(chapter)}
                >
                  <Image source={{ uri: chapter.image_url || chapter.image }} style={styles.universityImage} />
                  <View style={styles.universityInfo}>
                    <Text style={styles.universityName}>{chapter.name}</Text>
                    <View style={styles.universityDetails}>
                      <View style={styles.detailItem}>
                        <MapPin size={12} color="#666666" />
                        <Text style={styles.detailText}>{chapter.location || 'Location not specified'}</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Users size={12} color="#666666" />
                        <Text style={styles.detailText}>{chapter.members || 0} members</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </>
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <ArrowLeft size={24} color="#000000" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Chapter Details</Text>
              <View style={{ width: 40 }} />
            </View>

            {selectedChapter && (
              <ScrollView style={styles.modalScroll}>
                <Image source={{ uri: selectedChapter.image }} style={styles.modalImage} />
                
                <View style={styles.modalBody}>
                  <Text style={styles.modalChapterName}>{selectedChapter.name}</Text>
                  
                  <View style={styles.modalSection}>
                    <View style={styles.modalDetailItem}>
                      <MapPin size={16} color="#666666" />
                      <Text style={styles.modalDetailText}>{selectedChapter.location}</Text>
                    </View>
                    <View style={styles.modalDetailItem}>
                      <Users size={16} color="#666666" />
                      <Text style={styles.modalDetailText}>{selectedChapter.members} members</Text>
                    </View>
                  </View>

                  {selectedChapter.leadership && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Leadership</Text>
                      <View style={styles.leadershipList}>
                        <Text style={styles.leadershipItem}>President: {selectedChapter.leadership.president}</Text>
                        <Text style={styles.leadershipItem}>Secretary: {selectedChapter.leadership.secretary}</Text>
                        <Text style={styles.leadershipItem}>Treasurer: {selectedChapter.leadership.treasurer}</Text>
                      </View>
                    </View>
                  )}

                  {selectedChapter.contact && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Contact Information</Text>
                      <TouchableOpacity style={styles.contactItem}>
                        <Mail size={16} color="#4169E1" />
                        <Text style={styles.contactText}>{selectedChapter.contact.email}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.contactItem}>
                        <Phone size={16} color="#4169E1" />
                        <Text style={styles.contactText}>{selectedChapter.contact.phone}</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {selectedChapter.upcomingEvents && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Upcoming Events</Text>
                      {selectedChapter.upcomingEvents.map((event, index) => (
                        <View key={index} style={styles.eventItem}>
                          <Calendar size={16} color="#666666" />
                          <View>
                            <Text style={styles.eventTitle}>{event.title}</Text>
                            <Text style={styles.eventDate}>{event.date}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {selectedChapter.projects && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Active Projects</Text>
                      {selectedChapter.projects.map((project, index) => (
                        <View key={index} style={styles.projectItem}>
                          <Text style={styles.projectText}>{project}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={styles.modalActions}>
                    <TouchableOpacity style={styles.actionButton}>
                      <MessageCircle size={20} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>Join Group Chat</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]}>
                      <ExternalLink size={20} color="#4169E1" />
                      <Text style={styles.secondaryButtonText}>Visit Chapter Page</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
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
    padding: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  globeButton: {
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
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
  },
  activeTypeButton: {
    backgroundColor: '#4169E1',
  },
  typeText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  activeTypeText: {
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
    height: 200,
  },
  chapterTypeTag: {
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
  chapterTypeText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
    textTransform: 'capitalize',
  },
  featuredInfo: {
    padding: 16,
    gap: 8,
  },
  chapterName: {
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
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  memberText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  joinButton: {
    backgroundColor: '#4169E1',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  memberBadge: {
    backgroundColor: '#10B981',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  memberBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  pendingBadge: {
    backgroundColor: '#F59E0B',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  pendingBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  memberBadgeSmall: {
    backgroundColor: '#10B981',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  memberBadgeTextSmall: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  pendingBadgeSmall: {
    backgroundColor: '#F59E0B',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  pendingBadgeTextSmall: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  chapterCard: {
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
  chapterImage: {
    width: 100,
    height: 100,
  },
  chapterInfo: {
    flex: 1,
    padding: 12,
    gap: 4,
  },
  chapterCardName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  chapterDetails: {
    gap: 4,
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
  universityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingHorizontal: 16,
  },
  universityCard: {
    width: (width - 48) / 2,
    backgroundColor: '#FFFFFF',
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
  universityImage: {
    width: '100%',
    height: 120,
  },
  universityInfo: {
    padding: 12,
    gap: 4,
  },
  universityName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  universityDetails: {
    gap: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  modalScroll: {
    flex: 1,
  },
  modalImage: {
    width: '100%',
    height: 200,
  },
  modalBody: {
    padding: 16,
    gap: 20,
  },
  modalChapterName: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  modalSection: {
    gap: 12,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  modalDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalDetailText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  leadershipList: {
    gap: 8,
  },
  leadershipItem: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  contactText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#4169E1',
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  eventTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  eventDate: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  projectItem: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
  },
  projectText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  modalActions: {
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4169E1',
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: '#EBF0FF',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
});