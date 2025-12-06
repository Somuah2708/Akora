import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
} from 'react-native';
import { router } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, Bookmark, Heart, Star, Trash2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface FavoriteMentor {
  mentor_id: string;
  full_name: string;
  current_title: string;
  company: string;
  expertise_areas: string[];
  bio: string;
  profile_photo_url: string;
  years_of_experience: number;
  favorited_at: string;
}

export default function SavedMentorsScreen() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteMentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      console.log('🔍 [SavedMentors] User detected, fetching favorites for:', user.id);
      fetchFavorites();
      
      // Set up real-time subscription for bookmarks
      console.log('🔔 [SavedMentors] Setting up real-time subscription');
      const subscription = supabase
        .channel('education_bookmarks_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'education_bookmarks',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('🔔 [SavedMentors] Bookmark change detected:', payload.eventType);
            // Refetch favorites when any change occurs
            fetchFavorites();
          }
        )
        .subscribe();

      // Cleanup subscription on unmount
      return () => {
        console.log('🔕 [SavedMentors] Cleaning up real-time subscription');
        subscription.unsubscribe();
      };
    } else {
      console.log('⚠️ [SavedMentors] No user found, setting loading to false');
      setLoading(false);
    }
  }, [user]);

  const fetchFavorites = async () => {
    if (!user) {
      console.log('❌ [SavedMentors] fetchFavorites called but no user');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    console.log('📥 [SavedMentors] Fetching bookmarks for user:', user.id);

    try {
      const { data, error } = await supabase
        .from('education_bookmarks')
        .select(`
          id,
          mentor_id,
          created_at,
          alumni_mentors!inner (
            id,
            full_name,
            current_title,
            company,
            expertise_areas,
            short_bio,
            profile_photo_url,
            years_of_experience
          )
        `)
        .eq('user_id', user.id)
        .not('mentor_id', 'is', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [SavedMentors] Query error:', error);
        console.error('❌ [SavedMentors] Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }
      
      console.log('✅ [SavedMentors] Raw data received:', data?.length || 0, 'items');
      console.log('✅ [SavedMentors] Sample data:', data?.[0]);
      
      // Transform the data to match the expected format
      const transformedData = (data || []).map(item => {
        console.log('🔄 [SavedMentors] Transforming item:', item);
        return {
          mentor_id: item.mentor_id!,
          full_name: item.alumni_mentors.full_name,
          current_title: item.alumni_mentors.current_title,
          company: item.alumni_mentors.company || '',
          expertise_areas: item.alumni_mentors.expertise_areas || [],
          bio: item.alumni_mentors.short_bio || '',
          profile_photo_url: item.alumni_mentors.profile_photo_url || '',
          years_of_experience: item.alumni_mentors.years_of_experience || 0,
          favorited_at: item.created_at
        };
      });
      
      console.log('✅ [SavedMentors] Transformed data:', transformedData.length, 'mentors');
      setFavorites(transformedData);
    } catch (error: any) {
      console.error('❌ [SavedMentors] Error fetching favorites:', error);
      console.error('❌ [SavedMentors] Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      Alert.alert('Error', 'Failed to load saved mentors');
    } finally {
      console.log('✅ [SavedMentors] Setting loading and refreshing to false');
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFavorites();
  }, []);

  const removeFavorite = async (mentorId: string) => {
    if (!user) return;

    Alert.alert(
      'Remove from Saved',
      'Remove this mentor from your saved list?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('education_bookmarks')
                .delete()
                .eq('user_id', user.id)
                .eq('mentor_id', mentorId);

              if (error) throw error;

              setFavorites(favorites.filter(f => f.mentor_id !== mentorId));
              Alert.alert('Success', 'Removed from saved mentors');
            } catch (error) {
              console.error('Error removing favorite:', error);
              Alert.alert('Error', 'Failed to remove mentor');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Saved Mentors</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Mentors</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Banner */}
        <View style={styles.statsBanner}>
          <ThumbsUp size={20} color="#14B8A6" fill="#14B8A6" />
          <Text style={styles.statsText}>
            {favorites.length} saved {favorites.length === 1 ? 'mentor' : 'mentors'}
          </Text>
        </View>

        {favorites.length > 0 ? (
          favorites.map((mentor) => (
            <View key={mentor.mentor_id} style={styles.mentorCard}>
              <TouchableOpacity
                style={styles.cardContent}
                onPress={() => debouncedRouter.push(`/education/mentor/${mentor.mentor_id}`)}
                activeOpacity={0.95}
              >
                <Image
                  source={{
                    uri: mentor.profile_photo_url || 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=800',
                  }}
                  style={styles.mentorAvatar}
                />

                <View style={styles.mentorInfo}>
                  <Text style={styles.mentorName}>{mentor.full_name}</Text>
                  <Text style={styles.mentorRole} numberOfLines={1}>
                    {mentor.current_title}
                  </Text>
                  {mentor.company && (
                    <Text style={styles.mentorCompany} numberOfLines={1}>
                      {mentor.company}
                    </Text>
                  )}

                  {/* Expertise */}
                  {mentor.expertise_areas && mentor.expertise_areas.length > 0 && (
                    <View style={styles.expertiseRow}>
                      {mentor.expertise_areas.slice(0, 2).map((area, idx) => (
                        <View key={idx} style={styles.expertiseChip}>
                          <Text style={styles.expertiseText}>{area}</Text>
                        </View>
                      ))}
                      {mentor.expertise_areas.length > 2 && (
                        <View style={[styles.expertiseChip, { backgroundColor: '#F3F4F6' }]}>
                          <Text style={[styles.expertiseText, { color: '#6B7280' }]}>
                            +{mentor.expertise_areas.length - 2}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              {/* Remove Button */}
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeFavorite(mentor.mentor_id)}
              >
                <Trash2 size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Star size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Saved Mentors</Text>
            <Text style={styles.emptySubtitle}>
              Tap the bookmark icon on any mentor's profile to save them here
            </Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => debouncedRouter.push('/education?tab=mentors')}
            >
              <Text style={styles.browseButtonText}>Browse Mentors</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  content: {
    flex: 1,
  },
  statsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    backgroundColor: '#FEF2F2',
    borderBottomWidth: 1,
    borderBottomColor: '#FEE2E2',
  },
  statsText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#DC2626',
  },
  mentorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    gap: 14,
  },
  mentorAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  mentorInfo: {
    flex: 1,
    gap: 4,
  },
  mentorName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  mentorRole: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  mentorCompany: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  expertiseRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  expertiseChip: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  expertiseText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#1E40AF',
  },
  removeButton: {
    padding: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEF2F2',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  browseButton: {
    backgroundColor: '#4169E1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 24,
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  browseButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});
