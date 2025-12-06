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
import { ArrowLeft, Calendar, MapPin, Edit2, Trash2, Plus, Package, AlertCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

type EventStatus = 'pending' | 'approved' | 'rejected' | 'published';
type PackageTier = 'basic' | 'standard' | 'priority' | 'premium';

interface AkoraEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  start_time: string;
  end_time: string | null;
  banner_url: string | null;
  status: EventStatus;
  listing_fee: number;
  package_tier: PackageTier;
  category: string | null;
  featured: boolean;
  moderation_notes: string | null;
  created_at: string;
}

export default function MyAkoraEventsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [events, setEvents] = useState<AkoraEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMyEvents();
  }, [user]);

  const loadMyEvents = async () => {
    try {
      setLoading(true);
      
      // Check if user is loaded
      if (!user?.id) {
        console.log('User not loaded yet, skipping events fetch');
        setEvents([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('akora_events')
        .select('*')
        .eq('created_by', user.id)
        .eq('event_type', 'akora')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error: any) {
      console.error('Error loading events:', error);
      Alert.alert('Error', 'Failed to load your events');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (eventId: string, status: EventStatus) => {
    if (status === 'published') {
      Alert.alert('Cannot Edit', 'Published events cannot be edited. Please contact an administrator.');
      return;
    }
    // Navigate to edit screen (create this later or reuse the form)
    Alert.alert('Edit Event', 'Edit functionality: Navigate to edit screen with event ID: ' + eventId);
  };

  const handleDelete = async (eventId: string, eventTitle: string, status: EventStatus) => {
    if (status === 'published') {
      Alert.alert('Cannot Delete', 'Published events cannot be deleted. Please contact an administrator.');
      return;
    }

    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete "${eventTitle}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('akora_events')
                .delete()
                .eq('id', eventId);

              if (error) throw error;

              Alert.alert('Success', 'Event deleted successfully');
              loadMyEvents();
            } catch (error: any) {
              console.error('Error deleting event:', error);
              Alert.alert('Error', error.message || 'Failed to delete event');
            }
          },
        },
      ]
    );
  };

  const getTierBadge = (tier: PackageTier) => {
    const badges = {
      premium: { color: '#FFD700', label: 'Premium' },
      priority: { color: '#4169E1', label: 'Priority' },
      standard: { color: '#10B981', label: 'Standard' },
      basic: { color: '#6B7280', label: 'Basic' },
    };
    return badges[tier];
  };

  const getStatusColor = (status: EventStatus) => {
    const colors = {
      published: '#10B981',
      approved: '#10B981',
      pending: '#F59E0B',
      rejected: '#EF4444',
    };
    return colors[status];
  };

  const getStatusLabel = (status: EventStatus) => {
    const labels = {
      published: 'Published',
      approved: 'Approved',
      pending: 'Pending Review',
      rejected: 'Rejected',
    };
    return labels[status];
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
            <Text style={styles.title}>My Akora Events</Text>
            <Text style={styles.subtitle}>{events.length} event{events.length !== 1 ? 's' : ''}</Text>
          </View>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => debouncedRouter.push('/events')}
          >
            <Plus size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {events.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Package size={64} color="#CCCCCC" />
            <Text style={styles.emptyTitle}>No Events Submitted Yet</Text>
            <Text style={styles.emptyText}>Submit your first Akora event to get started!</Text>
            <TouchableOpacity 
              style={styles.createButton}
              onPress={() => debouncedRouter.push('/events')}
            >
              <LinearGradient
                colors={['#4169E1', '#5B7FE8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.createButtonGradient}
              >
                <Plus size={20} color="#FFFFFF" />
                <Text style={styles.createButtonText}>Submit Event</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.eventsList}>
            {events.map((event) => {
              const tierBadge = getTierBadge(event.package_tier);
              const canEdit = event.status === 'pending' || event.status === 'rejected';
              
              return (
                <View key={event.id} style={styles.eventCard}>
                  {/* Event Image */}
                  {event.banner_url ? (
                    <Image source={{ uri: event.banner_url }} style={styles.eventImage} />
                  ) : (
                    <View style={[styles.eventImage, styles.placeholderImage]}>
                      <Calendar size={48} color="#CCCCCC" />
                    </View>
                  )}

                  {/* Status Badge */}
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(event.status) }]}>
                    <Text style={styles.statusText}>{getStatusLabel(event.status)}</Text>
                  </View>

                  {/* Tier Badge */}
                  <View style={[styles.tierBadge, { backgroundColor: tierBadge.color }]}>
                    <Text style={styles.tierText}>{tierBadge.label}</Text>
                  </View>

                  {/* Event Content */}
                  <View style={styles.eventContent}>
                    <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
                    
                    <View style={styles.eventMeta}>
                      <View style={styles.metaItem}>
                        <Calendar size={16} color="#666" />
                        <Text style={styles.metaText}>
                          {new Date(event.start_time).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Text>
                      </View>
                      <View style={styles.metaItem}>
                        <MapPin size={16} color="#666" />
                        <Text style={styles.metaText} numberOfLines={1}>{event.location}</Text>
                      </View>
                    </View>

                    {event.category && (
                      <View style={styles.categoryContainer}>
                        <Text style={styles.categoryBadge}>{event.category}</Text>
                        {event.featured && (
                          <Text style={styles.featuredText}>⭐ Featured</Text>
                        )}
                      </View>
                    )}

                    {/* Moderation Notes for Rejected Events */}
                    {event.status === 'rejected' && event.moderation_notes && (
                      <View style={styles.rejectionNotice}>
                        <AlertCircle size={16} color="#EF4444" />
                        <Text style={styles.rejectionTitle}>Rejection Reason:</Text>
                        <Text style={styles.rejectionText}>{event.moderation_notes}</Text>
                      </View>
                    )}

                    <View style={styles.feeContainer}>
                      <Text style={styles.feeLabel}>Listing Fee:</Text>
                      <Text style={styles.feeAmount}>GHS {event.listing_fee}</Text>
                    </View>

                    <Text style={styles.dateCreated}>
                      Submitted: {new Date(event.created_at).toLocaleDateString('en-US', { 
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
                      
                      {canEdit && (
                        <View style={styles.actionButtons}>
                          <TouchableOpacity 
                            style={styles.editButton}
                            onPress={() => handleEdit(event.id, event.status)}
                          >
                            <Edit2 size={18} color="#4169E1" />
                          </TouchableOpacity>
                          
                          <TouchableOpacity 
                            style={styles.deleteButton}
                            onPress={() => handleDelete(event.id, event.title, event.status)}
                          >
                            <Trash2 size={18} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      )}
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
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  headerGradient: {
    paddingTop: 48,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
    color: '#E0E7FF',
    marginTop: 2,
  },
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  createButton: {
    marginTop: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
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
    height: 200,
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
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  tierBadge: {
    position: 'absolute',
    top: 52,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tierText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  eventContent: {
    padding: 16,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
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
    color: '#6B7280',
    flex: 1,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: '#EBF0FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: '600',
    color: '#4169E1',
  },
  featuredText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
  },
  rejectionNotice: {
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  rejectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
    marginBottom: 4,
    marginLeft: 22,
  },
  rejectionText: {
    fontSize: 13,
    color: '#7F1D1D',
    lineHeight: 18,
    marginLeft: 22,
  },
  feeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  feeLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  feeAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
  },
  dateCreated: {
    fontSize: 12,
    color: '#9CA3AF',
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
    backgroundColor: '#EBF0FF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4169E1',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#EBF0FF',
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
