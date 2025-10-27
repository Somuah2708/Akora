import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, TextInput, Dimensions, Alert } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState, useCallback } from 'react';
import { SplashScreen, useRouter } from 'expo-router';
import { Search, Filter, ArrowLeft, GraduationCap, MapPin, Globe, ChevronRight, Clock, Award, Wallet, BookOpen, Building2, Users, Plus } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 48;

const EDUCATION_TYPES = [
  { id: '1', name: 'Universities', icon: Building2 },
  { id: '2', name: 'Scholarships', icon: Award },
  { id: '3', name: 'Research Grants', icon: BookOpen },
  { id: '4', name: 'Exchange Programs', icon: Globe },
  { id: '5', name: 'Summer Schools', icon: Users },
];

const FEATURED_UNIVERSITIES = [
  {
    id: '1',
    name: 'Stanford University',
    location: 'California, USA',
    image: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&auto=format&fit=crop&q=60',
    programs: ['Computer Science', 'Business', 'Engineering'],
    ranking: '#3 World Ranking',
    deadline: 'Applications close Dec 2024',
  },
  {
    id: '2',
    name: 'University of Oxford',
    location: 'Oxford, UK',
    image: 'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?w=800&auto=format&fit=crop&q=60',
    programs: ['Law', 'Medicine', 'Arts & Sciences'],
    ranking: '#1 World Ranking',
    deadline: 'Applications close Jan 2025',
  },
];

const SCHOLARSHIPS = [
  {
    id: '1',
    title: 'Gates Cambridge Scholarship',
    university: 'University of Cambridge',
    coverage: 'Full Tuition + Living Expenses',
    deadline: '2 months left',
    image: 'https://images.unsplash.com/photo-1578996834254-13d1b661a5ed?w=800&auto=format&fit=crop&q=60',
    type: 'Full Scholarship',
  },
  {
    id: '2',
    title: 'Fulbright Foreign Student Program',
    university: 'Multiple US Universities',
    coverage: 'Full Funding',
    deadline: '3 months left',
    image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&auto=format&fit=crop&q=60',
    type: 'Graduate Studies',
  },
  {
    id: '3',
    title: 'Chevening Scholarships',
    university: 'UK Universities',
    coverage: 'Full Scholarship',
    deadline: '4 months left',
    image: 'https://images.unsplash.com/photo-1490644658840-3f2e3f8c5625?w=800&auto=format&fit=crop&q=60',
    type: 'Masters Degree',
  },
  {
    id: '4',
    title: 'DAAD Scholarships',
    university: 'German Universities',
    coverage: 'Monthly Stipend + Allowances',
    deadline: '5 months left',
    image: 'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=800&auto=format&fit=crop&q=60',
    type: 'Research & PhD',
  },
];

export default function EducationScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState('all');
  const [educationalOpportunities, setEducationalOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  const fetchEducationalOpportunities = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products_services')
        .select(`
          *,
          profiles (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('is_approved', true)
        .or('category_name.eq.Universities,category_name.eq.Scholarships,category_name.eq.Research Grants,category_name.eq.Exchange Programs,category_name.eq.Summer Schools')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const processedData = (data || []).map(item => ({
        ...item,
        user: item.profiles,
      }));

      setEducationalOpportunities(processedData);
    } catch (error) {
      console.error('Error fetching educational opportunities:', error);
      Alert.alert('Error', 'Failed to load educational opportunities.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEducationalOpportunities();
  }, [fetchEducationalOpportunities]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  const filterOpportunities = (opportunities: any[]) => {
    return opportunities.filter(opportunity => {
      if (activeFilter !== 'all' && opportunity.category_name !== EDUCATION_TYPES.find(type => type.id === activeFilter)?.name) {
        return false;
      }
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          (opportunity.title || '').toLowerCase().includes(query) ||
          (opportunity.description || '').toLowerCase().includes(query)
        );
      }
      
      return true;
    });
  };

  const filteredFeaturedUniversities = filterOpportunities(
    educationalOpportunities.filter(op => op.category_name === 'Universities')
  );
  const filteredScholarships = filterOpportunities(
    educationalOpportunities.filter(op => op.category_name === 'Scholarships')
  );

  const handleAddOpportunity = () => {
    if (!user) {
      Alert.alert('Authentication Required', 'Please sign in to add an educational opportunity.');
      return;
    }
    router.push('/create-educational-listing');
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.title}>Educational Opportunities</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Filter size={24} color="#000000" />
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
      
      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={handleAddOpportunity}
      >
        <Plus size={24} color="#FFFFFF" />
        <Text style={styles.floatingButtonText}>Add Opportunity</Text>
      </TouchableOpacity>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.typesScroll}
        contentContainerStyle={styles.typesContent}
      >
        {EDUCATION_TYPES.map((type) => {
          const IconComponent = type.icon;
          return (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.typeButton,
                activeFilter === type.id && styles.activeTypeButton,
              ]}
              onPress={() => setActiveFilter(type.id)}
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
          <Text style={styles.sectionTitle}>Featured Universities</Text>
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
          {filteredFeaturedUniversities.length > 0 ? (
            filteredFeaturedUniversities.map((university) => (
              <TouchableOpacity key={university.id} style={styles.featuredCard}>
                <Image source={{ uri: university.image_url || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&auto=format&fit=crop&q=60' }} style={styles.featuredImage} />
                <View style={styles.rankingBadge}>
                  <Award size={14} color="#FFB800" />
                  <Text style={styles.rankingText}>Top University</Text>
                </View>
                <View style={styles.featuredInfo}>
                  <Text style={styles.universityName}>{university.title}</Text>
                  <View style={styles.locationInfo}>
                    <MapPin size={14} color="#666666" />
                    <Text style={styles.locationText}>{university.description.split('|')[0] || 'Location N/A'}</Text>
                  </View>
                  <View style={styles.programTags}>
                    <View style={styles.programTag}>
                      <Text style={styles.programText}>Programs Available</Text>
                    </View>
                  </View>
                  <View style={styles.deadlineInfo}>
                    <Clock size={14} color="#666666" />
                    <Text style={styles.deadlineText}>Apply Now</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>No featured universities found.</Text>
          )}
        </ScrollView>
      </View>

      {loading && <Text style={styles.loadingText}>Loading opportunities...</Text>}
      {!loading && educationalOpportunities.length === 0 && (
        <Text style={styles.emptyText}>No educational opportunities found.</Text>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Available Scholarships</Text>
          <TouchableOpacity style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>See All</Text>
            <ChevronRight size={16} color="#666666" />
          </TouchableOpacity>
        </View>

        {filteredScholarships.length > 0 ? (
          filteredScholarships.map((scholarship) => (
            <TouchableOpacity key={scholarship.id} style={styles.scholarshipCard}>
              <Image source={{ uri: scholarship.image_url || 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&auto=format&fit=crop&q=60' }} style={styles.scholarshipImage} />
              <View style={styles.scholarshipInfo}>
                <View style={styles.scholarshipTypeTag}>
                  <GraduationCap size={14} color="#4169E1" />
                  <Text style={styles.scholarshipTypeText}>{scholarship.category_name}</Text>
                </View>
                <Text style={styles.scholarshipTitle}>{scholarship.title}</Text>
                <Text style={styles.universityName}>{scholarship.description.split('|')[0] || 'University N/A'}</Text>
                <View style={styles.scholarshipDetails}>
                  <View style={styles.detailItem}>
                    <Wallet size={14} color="#666666" />
                    <Text style={styles.detailText}>{scholarship.price ? `$${scholarship.price}` : 'Full Coverage'}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Clock size={14} color="#666666" />
                    <Text style={styles.detailText}>Deadline N/A</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.emptyText}>No scholarships found.</Text>
        )}
      </View>
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
  deadlineText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  scholarshipCard: {
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
  scholarshipImage: {
    width: 100,
    height: 100,
  },
  scholarshipInfo: {
    flex: 1,
    padding: 12,
    gap: 4,
  },
  scholarshipTypeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EBF0FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  scholarshipTypeText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  scholarshipTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
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
  loadingText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  }
});