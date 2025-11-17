import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Animated,
  Dimensions,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Settings, Eye, CheckCircle2, XCircle, Calendar, Users, TrendingUp, DollarSign, FileText, Trash2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type EventStatus = 'pending' | 'approved' | 'rejected' | 'published';

interface AkoraEvent {
  id: string;
  created_by: string;
  event_type: 'oaa' | 'akora';
  title: string;
  description: string;
  location: string;
  start_time: string;
  end_time?: string | null;
  banner_url?: string | null;
  status: EventStatus;
  listing_fee?: number | null;
  package_tier?: string | null;
  payment_proof_url?: string | null;
  category?: string | null;
  capacity?: number | null;
  featured?: boolean | null;
  visibility?: 'public' | 'alumni_only' | null;
  moderation_notes?: string | null;
  created_at: string;
  view_count?: number;
  rsvp_count?: number;
}

const statusColors: Record<EventStatus, string> = {
  pending: '#F59E0B',
  approved: '#3B82F6',
  published: '#10B981',
  rejected: '#EF4444',
};

// Responsive stat card configuration
const BASE_HEIGHT = 65;
const MAX_HEIGHT = 90;
const STEP = 1;

interface StatCardProps {
  value: number;
  label: string;
  color: string;
  count?: number;
}

const StatCard: React.FC<StatCardProps> = ({ value, label, color, count }) => {
  const animatedHeight = useRef(new Animated.Value(BASE_HEIGHT)).current;
  
  useEffect(() => {
    const dynamicCount = count !== undefined ? count : value;
    const calculatedHeight = Math.min(MAX_HEIGHT, BASE_HEIGHT + dynamicCount * STEP);
    
    Animated.spring(animatedHeight, {
      toValue: calculatedHeight,
      useNativeDriver: false,
      friction: 8,
      tension: 40,
    }).start();
  }, [value, count]);

  return (
    <Animated.View style={[statCardStyles.card, { borderTopColor: color, height: animatedHeight }]}>
      <Text style={statCardStyles.value}>{value}</Text>
      <Text style={statCardStyles.label} numberOfLines={1}>{label}</Text>
    </Animated.View>
  );
};

const statCardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    minWidth: Math.max(65, SCREEN_WIDTH * 0.15),
    maxWidth: Math.max(80, SCREEN_WIDTH * 0.18),
    borderTopWidth: 2.5,
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 1.5,
    elevation: 1,
  },
  value: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 0,
  },
  label: {
    fontSize: 8.5,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 1,
  },
});

export default function EventsAdminScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<EventStatus | 'all'>('pending');
  const [events, setEvents] = useState<AkoraEvent[]>([]);
  const [notesDrafts, setNotesDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    published: 0,
    totalViews: 0,
    totalRsvps: 0,
  });

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin, filter]);

  const checkAdminAccess = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin, role')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        setLoading(false);
        return;
      }

      const admin = data?.is_admin === true || data?.role === 'admin' || data?.role === 'staff';
      setIsAdmin(admin);
    } catch (error) {
      console.error('Exception checking admin:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Load events
      let query = supabase
        .from('akora_events')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data: eventData, error } = await query;
      if (error) throw error;

      // Load RSVP counts
      const eventsWithCounts = await Promise.all(
        (eventData || []).map(async (event) => {
          const { count } = await supabase
            .from('event_rsvps')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id)
            .eq('status', 'attending');

          return { ...event, rsvp_count: count || 0 };
        })
      );

      setEvents(eventsWithCounts);

      // Load stats
      const { data: allEvents } = await supabase
        .from('akora_events')
        .select('id, status, view_count');

      const total = allEvents?.length || 0;
      const pending = allEvents?.filter(e => e.status === 'pending').length || 0;
      const published = allEvents?.filter(e => e.status === 'published').length || 0;
      const totalViews = allEvents?.reduce((sum, e) => sum + (e.view_count || 0), 0) || 0;

      const { count: totalRsvps } = await supabase
        .from('event_rsvps')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'attending');

      // Animate layout changes when stats update
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setStats({ total, pending, published, totalViews, totalRsvps: totalRsvps || 0 });
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const updateStatus = async (eventId: string, newStatus: EventStatus) => {
    try {
      setSavingId(eventId);
      const notes = notesDrafts[eventId]?.trim() || null;

      const updates: any = {
        status: newStatus,
        moderation_notes: notes,
      };

      if (newStatus === 'published') {
        updates.approved_by = user?.id;
        updates.approved_at = new Date().toISOString();
        updates.published_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('akora_events')
        .update(updates)
        .eq('id', eventId);

      if (error) throw error;

      Alert.alert('Success', `Event ${newStatus}`);
      loadData();
    } catch (error: any) {
      console.error('Error updating status:', error);
      Alert.alert('Error', error.message || 'Failed to update event');
    } finally {
      setSavingId(null);
    }
  };

  const deleteEvent = async (eventId: string, title: string) => {
    Alert.alert(
      'Delete Event',
      `Delete "${title}"? This cannot be undone.`,
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
              Alert.alert('Success', 'Event deleted');
              loadData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  const viewPaymentProof = async (proofUrl: string) => {
    try {
      if (proofUrl.startsWith('http')) {
        Linking.openURL(proofUrl);
      } else {
        const { data } = supabase.storage.from('event-payment-proofs').getPublicUrl(proofUrl);
        if (data?.publicUrl) {
          Linking.openURL(data.publicUrl);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load payment proof');
    }
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]} edges={['top']}>
        <ActivityIndicator size="large" color="#4169E1" />
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (!user || !isAdmin) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]} edges={['top']}>
        <Text style={styles.errorText}>Admin access required</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.button}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#111" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Events Admin</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/events/admin-settings' as any)} style={styles.settingsBtn}>
          <Settings size={20} color="#4169E1" />
        </TouchableOpacity>
        <View style={styles.badge}>
          <FileText size={14} color="#4169E1" />
          <Text style={styles.badgeText}>{events.length}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsContainer}>
          <StatCard value={stats.total} label="Total" color="#4169E1" count={stats.total} />
          <StatCard value={stats.pending} label="Pending" color="#F59E0B" count={stats.pending} />
          <StatCard value={stats.published} label="Published" color="#10B981" count={stats.published} />
          <StatCard value={stats.totalViews} label="Views" color="#8B5CF6" count={0} />
          <StatCard value={stats.totalRsvps} label="RSVPs" color="#EF4444" count={0} />
        </ScrollView>
      </View>

      {/* Filters */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Status</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {(['all', 'pending', 'published', 'rejected'] as const).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.filterPill, filter === s && styles.filterPillActive]}
              onPress={() => setFilter(s)}
            >
              <Text style={[styles.filterText, filter === s && styles.filterTextActive]}>
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Events List */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {events.length === 0 ? (
          <View style={styles.emptyState}>
            <Calendar size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>No events found</Text>
          </View>
        ) : (
          events.map((event) => (
            <View key={event.id} style={styles.card}>
              {/* Header */}
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {event.title}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {new Date(event.start_time).toLocaleDateString()} · {event.location}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusColors[event.status] }]}>
                  <Text style={styles.statusText}>{event.status}</Text>
                </View>
              </View>

              {/* Details */}
              <Text style={styles.cardDesc} numberOfLines={3}>
                {event.description}
              </Text>

              {/* Meta Info */}
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Eye size={14} color="#6B7280" />
                  <Text style={styles.metaText}>{event.view_count || 0} views</Text>
                </View>
                <View style={styles.metaItem}>
                  <Users size={14} color="#6B7280" />
                  <Text style={styles.metaText}>{event.rsvp_count || 0} RSVPs</Text>
                </View>
                {event.listing_fee && event.listing_fee > 0 && (
                  <View style={styles.metaItem}>
                    <DollarSign size={14} color="#6B7280" />
                    <Text style={styles.metaText}>GHS {event.listing_fee}</Text>
                  </View>
                )}
              </View>

              {/* Payment Proof */}
              {event.payment_proof_url && (
                <TouchableOpacity
                  onPress={() => viewPaymentProof(event.payment_proof_url!)}
                  style={styles.proofLink}
                >
                  <FileText size={14} color="#4169E1" />
                  <Text style={styles.proofLinkText}>View Payment Proof</Text>
                </TouchableOpacity>
              )}

              {/* Notes */}
              <TextInput
                style={styles.notesInput}
                placeholder="Admin notes (optional)"
                placeholderTextColor="#9CA3AF"
                value={notesDrafts[event.id] || event.moderation_notes || ''}
                onChangeText={(text) => setNotesDrafts({ ...notesDrafts, [event.id]: text })}
                multiline
              />

              {/* Actions */}
              <View style={styles.actions}>
                {event.status === 'pending' && (
                  <>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.approveBtn]}
                      onPress={() => updateStatus(event.id, 'published')}
                      disabled={savingId === event.id}
                    >
                      {savingId === event.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <CheckCircle2 size={16} color="#fff" />
                          <Text style={styles.actionText}>Approve</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.rejectBtn]}
                      onPress={() => updateStatus(event.id, 'rejected')}
                      disabled={savingId === event.id}
                    >
                      <XCircle size={16} color="#fff" />
                      <Text style={styles.actionText}>Reject</Text>
                    </TouchableOpacity>
                  </>
                )}
                <TouchableOpacity
                  style={[styles.actionBtn, styles.viewBtn]}
                  onPress={() => router.push(`/events/${event.id}`)}
                >
                  <Eye size={16} color="#4169E1" />
                  <Text style={[styles.actionText, { color: '#4169E1' }]}>View</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.deleteBtn]}
                  onPress={() => deleteEvent(event.id, event.title)}
                >
                  <Trash2 size={16} color="#EF4444" />
                  <Text style={[styles.actionText, { color: '#EF4444' }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#4169E1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff',
    borderBottomWidth: 0,
  },
  backBtn: {
    padding: 2,
  },
  headerCenter: {
    flex: 1,
    marginLeft: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  settingsBtn: {
    padding: 2,
    marginLeft: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
    marginLeft: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4169E1',
  },
  statsWrapper: {
    backgroundColor: '#F9FAFB',
    paddingVertical: 8,
  },
  statsContainer: {
    paddingHorizontal: 16,
    gap: 0,
    alignItems: 'center',
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
  },
  filterScroll: {
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  filterPillActive: {
    backgroundColor: '#4169E1',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  filterTextActive: {
    color: '#fff',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 13,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
    textTransform: 'uppercase',
  },
  cardDesc: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  proofLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  proofLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4169E1',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    marginBottom: 12,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  approveBtn: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  rejectBtn: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  viewBtn: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  deleteBtn: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FEE2E2',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
});
