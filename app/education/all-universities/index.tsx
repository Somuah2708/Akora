import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, Search, Building2, MapPin, Award, Star, Globe } from 'lucide-react-native';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';

SplashScreen.preventAutoHideAsync();

export default function AllUniversitiesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [universities, setUniversities] = useState<any[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    fetchUniversities();
    if (user) {
      fetchBookmarks();
    }
  }, [user]);

  const fetchUniversities = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('universities')
        .select('*')
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUniversities(data || []);
    } catch (error) {
      console.error('Error fetching universities:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookmarks = async () => {
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
  };

  const toggleBookmark = async (opportunityId: string) => {
    if (!user) {
      debouncedRouter.push('/auth/sign-in');
      return;
    }

    const isBookmarked = bookmarkedIds.includes(opportunityId);
    
    try {
      if (isBookmarked) {
        await supabase
          .from('education_bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('opportunity_id', opportunityId);
        
        setBookmarkedIds(prev => prev.filter(id => id !== opportunityId));
      } else {
        await supabase
          .from('education_bookmarks')
          .insert({ user_id: user.id, opportunity_id: opportunityId });
        
        setBookmarkedIds(prev => [...prev, opportunityId]);
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  const filteredUniversities = universities.filter(u => 
    searchQuery ? (
      u.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.location?.toLowerCase().includes(searchQuery.toLowerCase())
    ) : true
  );

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.title}>Universities</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color="#666666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search universities..."
          placeholderTextColor="#666666"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0F172A" />
          <Text style={styles.loadingText}>Loading universities...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {filteredUniversities.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Building2 size={64} color="#CCCCCC" />
              <Text style={styles.emptyTitle}>No Universities Found</Text>
              <Text style={styles.emptyText}>Check back soon for new opportunities!</Text>
            </View>
          ) : (
            filteredUniversities.map((university) => (
              <TouchableOpacity 
                key={university.id} 
                style={styles.universityCard}
                onPress={() => debouncedRouter.push(`/education/opportunity-detail?id=${university.id}`)}
              >
                <Image 
                  source={{ uri: university.image_url || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800' }} 
                  style={styles.universityImage} 
                />
                <TouchableOpacity 
                  style={styles.bookmarkButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    toggleBookmark(university.id);
                  }}
                >
                  <Star 
                    size={20} 
                    color={bookmarkedIds.includes(university.id) ? "#ffc857" : "#666666"} 
                    fill={bookmarkedIds.includes(university.id) ? "#ffc857" : "none"}
                  />
                </TouchableOpacity>
                <View style={styles.rankingBadge}>
                  <Award size={14} color="#FFB800" />
                  <Text style={styles.rankingText}>Top University</Text>
                </View>
                <View style={styles.universityInfo}>
                  <Text style={styles.universityName}>{university.title}</Text>
                  {university.location && (
                    <View style={styles.locationRow}>
                      <MapPin size={14} color="#666666" />
                      <Text style={styles.locationText}>{university.location}</Text>
                    </View>
                  )}
                  <Text style={styles.description} numberOfLines={2}>
                    {university.description}
                  </Text>
                  <View style={styles.linkRow}>
                    <Globe size={14} color="#4169E1" />
                    <Text style={styles.linkText}>View Programs</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
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
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    margin: 16,
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
    marginTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#999999',
    textAlign: 'center',
  },
  universityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  universityImage: {
    width: '100%',
    height: 200,
  },
  bookmarkButton: {
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
  },
  rankingBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  rankingText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#FFB800',
  },
  universityInfo: {
    padding: 16,
    gap: 8,
  },
  universityName: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  description: {
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
});
