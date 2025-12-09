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
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';
import { ArrowLeft, Star, Trash2, MapPin, Globe } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface SavedUniversity {
  id: string;
  university_id: string;
  name: string;
  location: string;
  country: string;
  image_url: string;
  description: string;
  website: string;
  ranking?: number;
  saved_at: string;
}

export default function SavedUniversitiesScreen() {
  const { user } = useAuth();
  const [universities, setUniversities] = useState<SavedUniversity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSavedUniversities();
    }
  }, [user]);

  const fetchSavedUniversities = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Get bookmarked university IDs
      const { data: bookmarks, error: bookmarkError } = await supabase
        .from('education_bookmarks')
        .select('opportunity_id, created_at')
        .eq('user_id', user.id)
        .eq('opportunity_type', 'university')
        .order('created_at', { ascending: false });

      if (bookmarkError) throw bookmarkError;

      if (!bookmarks || bookmarks.length === 0) {
        setUniversities([]);
        setLoading(false);
        return;
      }

      const universityIds = bookmarks.map(b => b.opportunity_id);

      // Fetch university data
      const { data: universityData, error: universityError } = await supabase
        .from('universities')
        .select('*')
        .in('id', universityIds);

      if (universityError) throw universityError;

      // Create a map for quick lookup
      const bookmarkMap = new Map(bookmarks.map(b => [b.opportunity_id, b.created_at]));

      // Transform the data
      const transformed = (universityData || []).map(uni => ({
        id: uni.id,
        university_id: uni.id,
        name: uni.name,
        location: uni.location,
        country: uni.country,
        image_url: uni.image_url,
        description: uni.description,
        website: uni.website,
        ranking: uni.ranking,
        saved_at: bookmarkMap.get(uni.id) || new Date().toISOString()
      }));

      // Sort by saved_at
      transformed.sort((a, b) => 
        new Date(b.saved_at).getTime() - new Date(a.saved_at).getTime()
      );

      setUniversities(transformed);
    } catch (error) {
      console.error('Error fetching saved universities:', error);
      Alert.alert('Error', 'Failed to load saved universities');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSavedUniversities();
    setRefreshing(false);
  }, [fetchSavedUniversities]);

  const removeUniversity = async (universityId: string) => {
    if (!user) return;

    Alert.alert(
      'Remove from Saved',
      'Remove this university from your saved list?',
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
                .eq('opportunity_id', universityId)
                .eq('opportunity_type', 'university');

              if (error) throw error;

              setUniversities(universities.filter(u => u.university_id !== universityId));
              Alert.alert('Success', 'Removed from saved universities');
            } catch (error) {
              console.error('Error removing university:', error);
              Alert.alert('Error', 'Failed to remove university');
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
          <Text style={styles.headerTitle}>Saved Universities</Text>
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
        <Text style={styles.headerTitle}>Saved Universities</Text>
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
          <Star size={20} color="#ffc857" fill="#ffc857" />
          <Text style={styles.statsText}>
            {universities.length} saved {universities.length === 1 ? 'university' : 'universities'}
          </Text>
        </View>

        {universities.length > 0 ? (
          universities.map((university) => (
            <View key={university.university_id} style={styles.universityCard}>
              <TouchableOpacity
                style={styles.cardContent}
                onPress={() => debouncedRouter.push(`/education/detail/${university.university_id}?type=university`)}
                activeOpacity={0.95}
              >
                <Image
                  source={{
                    uri: university.image_url || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800',
                  }}
                  style={styles.universityImage}
                />

                <View style={styles.universityInfo}>
                  <Text style={styles.universityName} numberOfLines={2}>
                    {university.name}
                  </Text>
                  
                  {university.location && (
                    <View style={styles.locationRow}>
                      <MapPin size={14} color="#64748B" />
                      <Text style={styles.locationText} numberOfLines={1}>
                        {university.location}
                      </Text>
                    </View>
                  )}

                  {university.country && (
                    <View style={styles.locationRow}>
                      <Globe size={14} color="#64748B" />
                      <Text style={styles.locationText} numberOfLines={1}>
                        {university.country}
                      </Text>
                    </View>
                  )}

                  {university.ranking && (
                    <View style={styles.rankingBadge}>
                      <Text style={styles.rankingText}>
                        Ranked #{university.ranking}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              {/* Remove Button */}
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeUniversity(university.university_id)}
              >
                <Trash2 size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Star size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Saved Universities</Text>
            <Text style={styles.emptySubtitle}>
              Tap the star icon on any university to save it here
            </Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => debouncedRouter.push('/education?tab=universities')}
            >
              <Text style={styles.browseButtonText}>Browse Universities</Text>
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
    backgroundColor: '#F9FAFB',
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
    color: '#1F2937',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  content: {
    flex: 1,
  },
  statsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statsText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  universityCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    padding: 12,
  },
  universityImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  universityInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  universityName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  locationText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    flex: 1,
  },
  rankingBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffc857',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
  },
  rankingText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  removeButton: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  browseButton: {
    marginTop: 24,
    backgroundColor: '#0F172A',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  browseButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});
