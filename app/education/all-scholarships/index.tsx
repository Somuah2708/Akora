import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, Search, GraduationCap, Wallet, Clock, Heart, Award, Star } from 'lucide-react-native';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';

SplashScreen.preventAutoHideAsync();

export default function AllScholarshipsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [scholarships, setScholarships] = useState<any[]>([]);
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
    fetchScholarships();
    if (user) {
      fetchBookmarks();
    }
  }, [user]);

  const fetchScholarships = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products_services')
        .select('*')
        .eq('category_name', 'Scholarships')
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setScholarships(data || []);
    } catch (error) {
      console.error('Error fetching scholarships:', error);
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

  const filteredScholarships = scholarships.filter(s => 
    searchQuery ? (
      s.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description?.toLowerCase().includes(searchQuery.toLowerCase())
    ) : true
  );

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.title}>All Scholarships</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color="#666666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search scholarships..."
          placeholderTextColor="#666666"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0F172A" />
          <Text style={styles.loadingText}>Loading scholarships...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {filteredScholarships.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Award size={64} color="#CCCCCC" />
              <Text style={styles.emptyTitle}>No Scholarships Found</Text>
              <Text style={styles.emptyText}>Check back soon for new opportunities!</Text>
            </View>
          ) : (
            filteredScholarships.map((scholarship) => (
              <TouchableOpacity 
                key={scholarship.id} 
                style={styles.scholarshipCard}
                onPress={() => debouncedRouter.push(`/education/opportunity-detail?id=${scholarship.id}`)}
              >
                <Image 
                  source={{ uri: scholarship.image_url || 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800' }} 
                  style={styles.scholarshipImage} 
                />
                <TouchableOpacity 
                  style={styles.bookmarkButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    toggleBookmark(scholarship.id);
                  }}
                >
                  <Star 
                    size={20} 
                    color={bookmarkedIds.includes(scholarship.id) ? "#ffc857" : "#666666"} 
                    fill={bookmarkedIds.includes(scholarship.id) ? "#ffc857" : "none"}
                  />
                </TouchableOpacity>
                <View style={styles.scholarshipInfo}>
                  <View style={styles.typeTag}>
                    <GraduationCap size={14} color="#4169E1" />
                    <Text style={styles.typeText}>Scholarship</Text>
                  </View>
                  <Text style={styles.scholarshipTitle}>{scholarship.title}</Text>
                  <Text style={styles.description} numberOfLines={2}>
                    {scholarship.description}
                  </Text>
                  <View style={styles.detailsRow}>
                    <View style={styles.detailItem}>
                      <Wallet size={14} color="#666666" />
                      <Text style={styles.detailText}>
                        {scholarship.funding_amount ? `$${scholarship.funding_amount}` : 'Full Coverage'}
                      </Text>
                    </View>
                    {scholarship.deadline_date && (
                      <View style={styles.detailItem}>
                        <Clock size={14} color="#FF6B6B" />
                        <Text style={styles.deadlineText}>
                          {new Date(scholarship.deadline_date) > new Date() 
                            ? `${Math.ceil((new Date(scholarship.deadline_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days left`
                            : 'Expired'
                          }
                        </Text>
                      </View>
                    )}
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
  scholarshipCard: {
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
  scholarshipImage: {
    width: '100%',
    height: 180,
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
  scholarshipInfo: {
    padding: 16,
    gap: 8,
  },
  typeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  typeText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  scholarshipTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  description: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    lineHeight: 20,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  deadlineText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#FF6B6B',
  },
});
