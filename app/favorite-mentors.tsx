import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface FavoriteMentor {
  id: string;
  mentor_id: string;
  created_at: string;
  mentor: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    current_title: string;
    company: string;
    expertise_areas: string[];
    profile_photo_url: string | null;
  };
}

export default function FavoriteMentors() {
  const router = useRouter();
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteMentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFavorites = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('mentor_favorites')
        .select(`
          id,
          mentor_id,
          created_at,
          mentor:alumni_mentors!mentor_id (
            id,
            full_name,
            email,
            phone,
            current_title,
            company,
            expertise_areas,
            profile_photo_url
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log(`📚 Fetched ${data?.length || 0} favorite mentors`);
      setFavorites(data as any || []);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      Alert.alert('Error', 'Failed to load your favorite mentors.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchFavorites();
  }, [fetchFavorites]);

  const handleRemoveFavorite = async (favoriteId: string, mentorName: string) => {
    Alert.alert(
      'Remove Favorite',
      `Remove ${mentorName} from your favorites?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('mentor_favorites')
                .delete()
                .eq('id', favoriteId);

              if (error) throw error;

              Alert.alert('Success', 'Mentor removed from favorites');
              fetchFavorites();
            } catch (error: any) {
              console.error('Error removing favorite:', error);
              Alert.alert('Error', 'Failed to remove favorite. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleRequestMentorship = (mentorId: string) => {
    debouncedRouter.push(`/request-mentorship?mentorId=${mentorId}`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={styles.loadingText}>Loading favorites...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Favorite Mentors</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Favorites List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {favorites.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="heart-outline" size={80} color="#d1d5db" />
            <Text style={styles.emptyText}>No favorite mentors yet</Text>
            <Text style={styles.emptySubtext}>
              Browse mentors and bookmark your favorites for quick access
            </Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => debouncedRouter.push('/education')}
            >
              <Text style={styles.browseButtonText}>Browse Mentors</Text>
            </TouchableOpacity>
          </View>
        ) : (
          favorites.map((favorite) => (
            <View key={favorite.id} style={styles.mentorCard}>
              {/* Header */}
              <View style={styles.mentorHeader}>
                <View style={styles.avatarContainer}>
                  {favorite.mentor.profile_photo_url ? (
                    <View style={styles.avatar}>
                      {/* TODO: Add Image component when ready */}
                      <Text style={styles.avatarText}>
                        {favorite.mentor.full_name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {favorite.mentor.full_name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.mentorInfo}>
                  <Text style={styles.mentorName}>{favorite.mentor.full_name}</Text>
                  <Text style={styles.mentorTitle}>{favorite.mentor.current_title}</Text>
                  <Text style={styles.mentorCompany}>{favorite.mentor.company}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleRemoveFavorite(favorite.id, favorite.mentor.full_name)}
                  style={styles.favoriteButton}
                >
                  <Ionicons name="heart" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>

              {/* Expertise Areas */}
              {favorite.mentor.expertise_areas && favorite.mentor.expertise_areas.length > 0 && (
                <View style={styles.expertiseSection}>
                  <Text style={styles.sectionLabel}>Expertise:</Text>
                  <View style={styles.expertiseChips}>
                    {favorite.mentor.expertise_areas.slice(0, 3).map((area, idx) => (
                      <View key={idx} style={styles.expertiseChip}>
                        <Text style={styles.expertiseChipText}>{area}</Text>
                      </View>
                    ))}
                    {favorite.mentor.expertise_areas.length > 3 && (
                      <View style={styles.expertiseChip}>
                        <Text style={styles.expertiseChipText}>
                          +{favorite.mentor.expertise_areas.length - 3}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Actions */}
              <TouchableOpacity
                style={styles.requestButton}
                onPress={() => handleRequestMentorship(favorite.mentor_id)}
              >
                <Ionicons name="paper-plane" size={18} color="#fff" />
                <Text style={styles.requestButtonText}>Request Mentorship</Text>
              </TouchableOpacity>

              {/* Added Date */}
              <Text style={styles.dateText}>
                Added {new Date(favorite.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  placeholder: {
    width: 24,
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#9ca3af',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#d1d5db',
    textAlign: 'center',
    marginTop: 8,
  },
  browseButton: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  mentorCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  mentorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  mentorInfo: {
    flex: 1,
  },
  mentorName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  mentorTitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  mentorCompany: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 2,
  },
  favoriteButton: {
    padding: 8,
  },
  ratingRow: {
    marginBottom: 12,
  },
  expertiseSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  expertiseChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  expertiseChip: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  expertiseChipText: {
    fontSize: 13,
    color: '#374151',
  },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16a34a',
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  requestButtonText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
  dateText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 12,
  },
});
