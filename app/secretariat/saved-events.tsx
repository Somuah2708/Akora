import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Bookmark, Calendar, MapPin, Clock, Users, Trash2, Package } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface SavedEvent {
  id: string;
  event_id: string;
  user_id: string;
  created_at: string;
  event: {
    id: string;
    title: string;
    description: string;
    image_url: string | null;
    category_name: string;
  };
}

export default function SavedEventsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [savedEvents, setSavedEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadSavedEvents();
    }
  }, [user?.id]);

  useFocusEffect(
    React.useCallback(() => {
      if (user?.id) {
        loadSavedEvents();
      }
    }, [user?.id])
  );

  const loadSavedEvents = async () => {
    try {
      setLoading(true);
      
      if (!user?.id) {
        console.log('[Saved Events] User not loaded yet');
        setSavedEvents([]);
        setLoading(false);
        return;
      }

      console.log('[Saved Events] Loading bookmarks for user:', user.id);
      
      const { data, error } = await supabase
        .from('event_bookmarks')
        .select(`
          *,
          event:event_id(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      console.log('[Saved Events] Query result:', { data, error, count: data?.length });

      if (error) {
        console.error('Bookmark fetch error:', error);
        setSavedEvents([]);
      } else {
        setSavedEvents(data || []);
      }
    } catch (error: any) {
      console.error('Error loading saved events:', error);
      setSavedEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBookmark = async (bookmarkId: string, eventTitle: string) => {
    console.log('[Saved Events] Remove bookmark clicked:', { bookmarkId, eventTitle });
    
    // Check if running on web
    const isWeb = typeof window !== 'undefined';
    
    if (isWeb) {
      // For web, use window.confirm
      const confirmed = window.confirm(`Remove "${eventTitle}" from saved events?`);
      if (!confirmed) return;
      
      try {
        console.log('[Saved Events] Deleting bookmark:', bookmarkId);
        
        const { error } = await supabase
          .from('event_bookmarks')
          .delete()
          .eq('id', bookmarkId);

        if (error) {
          console.error('[Saved Events] Delete error:', error);
          alert('Failed to remove bookmark');
          return;
        }

        console.log('[Saved Events] Bookmark deleted successfully');
        alert('Event removed from saved');
        loadSavedEvents();
      } catch (error: any) {
        console.error('Error removing bookmark:', error);
        alert('Failed to remove bookmark');
      }
    } else {
      // For mobile, use Alert.alert
      Alert.alert(
        'Remove Bookmark',
        `Remove "${eventTitle}" from saved events?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              try {
                console.log('[Saved Events] Deleting bookmark:', bookmarkId);
                
                const { error } = await supabase
                  .from('event_bookmarks')
                  .delete()
                  .eq('id', bookmarkId);

                if (error) {
                  console.error('[Saved Events] Delete error:', error);
                  throw error;
                }

                console.log('[Saved Events] Bookmark deleted successfully');
                Alert.alert('Success', 'Event removed from saved');
                loadSavedEvents();
              } catch (error: any) {
                console.error('Error removing bookmark:', error);
                Alert.alert('Error', 'Failed to remove bookmark');
              }
            },
          },
        ]
      );
    }
  };

  const parseEventData = (description: string, viewCount: number = 0) => {
    try {
      const data = JSON.parse(description);
      return {
        date: data.date || 'TBA',
        time: data.time || 'TBA',
        location: data.location || 'TBA',
        category: data.category || 'General',
        attendees: viewCount, // Use actual view count
      };
    } catch {
      return {
        date: 'TBA',
        time: 'TBA',
        location: 'TBA',
        category: 'General',
        attendees: viewCount,
      };
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4169E1" />
        <Text style={styles.loadingText}>Loading saved events...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#4169E1', '#5B7FE8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Star size={24} color="#FFFFFF" />
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>Saved Events</Text>
            </View>
          </View>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {savedEvents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Star size={64} color="#CCCCCC" />
            <Text style={styles.emptyTitle}>No Saved Events</Text>
            <Text style={styles.emptyText}>
              Save events you're interested in to easily find them later!
            </Text>
            <TouchableOpacity 
              style={styles.exploreButton}
              onPress={() => router.push('/secretariat/event-calendar' as any)}
            >
              <LinearGradient
                colors={['#4169E1', '#5B7FE8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.exploreButtonGradient}
              >
                <Calendar size={20} color="#FFFFFF" />
                <Text style={styles.exploreButtonText}>Explore Events</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.eventsList}>
            {savedEvents.map((saved) => {
              const event = saved.event;
              if (!event) return null;
              
              const eventData = parseEventData(event.description, event.view_count || 0);
              return (
                <View
                  key={saved.id}
                  style={styles.eventCard}
                >
                  {/* Event Image */}
                  {event.image_url ? (
                    <Image source={{ uri: event.image_url }} style={styles.eventImage} />
                  ) : (
                    <View style={[styles.eventImage, styles.placeholderImage]}>
                      <Calendar size={48} color="#CCCCCC" />
                    </View>
                  )}

                  {/* Bookmark Badge */}
                  <View style={styles.bookmarkBadge}>
                    <Star size={16} color="#FFFFFF" fill="#FFFFFF" />
                  </View>

                  {/* Event Content */}
                  <View style={styles.eventContent}>
                    <View style={styles.categoryBadgeContainer}>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>{eventData.category}</Text>
                      </View>
                      {eventData.attendees > 0 && (
                        <View style={styles.attendeesInfo}>
                          <Users size={14} color="#666" />
                          <Text style={styles.attendeesText}>{eventData.attendees}</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
                    
                    <View style={styles.eventMeta}>
                      <View style={styles.metaItem}>
                        <Calendar size={16} color="#666" />
                        <Text style={styles.metaText}>{eventData.date}</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Clock size={16} color="#666" />
                        <Text style={styles.metaText}>{eventData.time}</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <MapPin size={16} color="#666" />
                        <Text style={styles.metaText} numberOfLines={1}>{eventData.location}</Text>
                      </View>
                    </View>

                    <Text style={styles.dateCreated}>
                      Saved: {new Date(saved.created_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </Text>

                    {/* Actions */}
                    <View style={styles.actions}>
                      <TouchableOpacity 
                        style={styles.viewButton}
                        onPress={() => router.push(`/events/${event.id}` as any)}
                      >
                        <Text style={styles.viewButtonText}>View Details</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.removeButton}
                        onPress={() => handleRemoveBookmark(saved.id, event.title)}
                      >
                        <Trash2 size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  headerGradient: {
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  headerTextContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 2,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    marginBottom: 24,
    textAlign: 'center',
  },
  exploreButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  exploreButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 8,
  },
  exploreButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  eventsList: {
    padding: 16,
    gap: 16,
  },
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  eventImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  placeholderImage: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookmarkBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#4169E1',
    padding: 8,
    borderRadius: 20,
  },
  eventContent: {
    padding: 16,
  },
  categoryBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  categoryBadge: {
    backgroundColor: '#EBF0FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4169E1',
  },
  attendeesInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  attendeesText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  eventMeta: {
    gap: 8,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  dateCreated: {
    fontSize: 12,
    color: '#999',
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  viewButton: {
    flex: 1,
    backgroundColor: '#4169E1',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  removeButton: {
    width: 44,
    height: 44,
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
