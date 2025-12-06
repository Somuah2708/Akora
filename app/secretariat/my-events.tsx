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
import { useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, Calendar, MapPin, Edit2, Trash2, Plus, Package, Clock, Users } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface Event {
  id: string;
  title: string;
  organizer: string;
  description: string;
  image_url: string | null;
  category: string;
  date: string;
  time: string;
  location: string;
  created_at: string;
  is_approved: boolean;
  view_count: number;
}

export default function MyEventsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only load if user is available
    if (user?.id) {
      loadMyEvents();
    }
  }, [user?.id]);

  const loadMyEvents = async () => {
    try {
      setLoading(true);
      console.log('[My Events] Loading events for user:', user?.id);
      
      // Don't query if user is not loaded yet
      if (!user?.id) {
        console.log('[My Events] User not loaded yet, skipping query');
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('secretariat_events')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      console.log('[My Events] Query result:', { data, error, count: data?.length });
      
      if (error) throw error;
      setEvents(data || []);
    } catch (error: any) {
      console.error('Error loading events:', error);
      Alert.alert('Error', 'Failed to load your events');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (eventId: string, eventTitle: string) => {
    // Platform detection
    const isWeb = typeof window !== 'undefined';
    
    if (isWeb) {
      const confirmed = window.confirm(`Are you sure you want to delete "${eventTitle}"?`);
      if (!confirmed) return;
      
      try {
        const { error } = await supabase
          .from('secretariat_events')
          .delete()
          .eq('id', eventId);

        if (error) throw error;

        window.alert('Event deleted successfully');
        loadMyEvents();
      } catch (error: any) {
        console.error('Error deleting event:', error);
        window.alert('Failed to delete event');
      }
    } else {
      Alert.alert(
        'Delete Event',
        `Are you sure you want to delete "${eventTitle}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                const { error } = await supabase
                  .from('secretariat_events')
                  .delete()
                  .eq('id', eventId);

                if (error) throw error;

                Alert.alert('Success', 'Event deleted successfully');
                loadMyEvents();
              } catch (error: any) {
                console.error('Error deleting event:', error);
                Alert.alert('Error', 'Failed to delete event');
              }
            },
          },
        ]
      );
    }
  };

  const parseEventData = (event: Event, viewCount: number) => {
    return {
      date: event.date || 'TBA',
      time: event.time || 'TBA',
      location: event.location || 'TBA',
      organizer: event.organizer || 'Unknown',
      category: event.category || 'General',
      attendees: viewCount || 0, // Use actual view count from database
    };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4169E1" />
        <Text style={styles.loadingText}>Loading your events...</Text>
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
          <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>My Events</Text>
            <Text style={styles.subtitle}>{events.length} event{events.length !== 1 ? 's' : ''}</Text>
          </View>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => debouncedRouter.push('/create-event')}
          >
            <Plus size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {events.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Package size={64} color="#CCCCCC" />
            <Text style={styles.emptyTitle}>No Events Created Yet</Text>
            <Text style={styles.emptyText}>Start creating events to share with the community!</Text>
            <TouchableOpacity 
              style={styles.createButton}
              onPress={() => debouncedRouter.push('/create-event')}
            >
              <LinearGradient
                colors={['#4169E1', '#5B7FE8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.createButtonGradient}
              >
                <Plus size={20} color="#FFFFFF" />
                <Text style={styles.createButtonText}>Create Your First Event</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.eventsList}>
            {events.map((event) => {
              const eventData = parseEventData(event, event.view_count);
              return (
                <View key={event.id} style={styles.eventCard}>
                  {/* Event Image */}
                  {event.image_url ? (
                    <Image source={{ uri: event.image_url }} style={styles.eventImage} />
                  ) : (
                    <View style={[styles.eventImage, styles.placeholderImage]}>
                      <Calendar size={48} color="#CCCCCC" />
                    </View>
                  )}

                  {/* Status Badge */}
                  <View style={[
                    styles.statusBadge,
                    event.is_approved ? styles.approvedBadge : styles.pendingBadge
                  ]}>
                    <Text style={styles.statusText}>
                      {event.is_approved ? 'Approved' : 'Pending'}
                    </Text>
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
                      Created: {new Date(event.created_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </Text>

                    {/* Actions */}
                    <View style={styles.actions}>
                      <TouchableOpacity 
                        style={styles.viewButton}
                        onPress={() => debouncedRouter.push(`/events/${event.id}`)}
                      >
                        <Text style={styles.viewButtonText}>View Details</Text>
                      </TouchableOpacity>
                      
                      <View style={styles.actionButtons}>
                        <TouchableOpacity 
                          style={styles.editButton}
                          onPress={() => debouncedRouter.push(`/edit-event/${event.id}`)}
                        >
                          <Edit2 size={18} color="#4169E1" />
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                          style={styles.deleteButton}
                          onPress={() => handleDelete(event.id, event.title)}
                        >
                          <Trash2 size={18} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
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
  addButton: {
    padding: 8,
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
  createButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 8,
  },
  createButtonText: {
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
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  approvedBadge: {
    backgroundColor: '#10B981',
  },
  pendingBadge: {
    backgroundColor: '#F59E0B',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
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
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    width: 44,
    height: 44,
    backgroundColor: '#EBF0FF',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 44,
    height: 44,
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
