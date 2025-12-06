import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;

const { width } = Dimensions.get('window');

export default function OrganizerDashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [recentEvents, setRecentEvents] = useState([]);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
      fetchRecentEvents();
    }
  }, [user]);

  const fetchAnalytics = async () => {
    try {
      const { data, error } = await supabase.rpc('get_organizer_analytics', {
        p_user_id: user.id,
      });

      if (error) throw error;
      setAnalytics(data[0] || null);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('akora_events')
        .select('*')
        .eq('created_by', user.id)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      // Load RSVP counts for each event
      const eventsWithRsvps = await Promise.all(
        (data || []).map(async (event) => {
          const { count } = await supabase
            .from('event_rsvps')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id)
            .eq('status', 'attending');

          return {
            ...event,
            rsvp_count: count || 0,
          };
        })
      );

      setRecentEvents(eventsWithRsvps);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const refresh = async () => {
    setLoading(true);
    await Promise.all([fetchAnalytics(), fetchRecentEvents()]);
    setLoading(false);
  };

  const StatCard = ({ icon, label, value, color, subtitle }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <Text style={styles.statValue}>{value}</Text>
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  const EventRow = ({ event }) => {
    const conversionRate =
      event.view_count > 0 ? ((event.rsvp_count / event.view_count) * 100).toFixed(1) : '0.0';

    return (
      <TouchableOpacity
        style={styles.eventRow}
        onPress={() => debouncedRouter.push(`/events/${event.id}`)}
      >
        <View style={styles.eventRowHeader}>
          <Text style={styles.eventRowTitle} numberOfLines={1}>
            {event.title}
          </Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </View>
        <View style={styles.eventRowStats}>
          <View style={styles.eventRowStat}>
            <Ionicons name="eye-outline" size={16} color="#6B7280" />
            <Text style={styles.eventRowStatText}>{event.view_count || 0} views</Text>
          </View>
          <View style={styles.eventRowStat}>
            <Ionicons name="people-outline" size={16} color="#6B7280" />
            <Text style={styles.eventRowStatText}>{event.rsvp_count || 0} RSVPs</Text>
          </View>
          <View style={styles.eventRowStat}>
            <Ionicons name="trending-up-outline" size={16} color="#10B981" />
            <Text style={[styles.eventRowStatText, { color: '#10B981' }]}>
              {conversionRate}% rate
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (!analytics) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Analytics</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics Dashboard</Text>
        <TouchableOpacity onPress={refresh} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={24} color="#4169E1" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Overview Section */}
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statsGrid}>
          <StatCard
            icon="calendar-outline"
            label="Total Events"
            value={analytics.total_events || 0}
            color="#4169E1"
          />
          <StatCard
            icon="eye-outline"
            label="Total Views"
            value={analytics.total_views || 0}
            color="#8B5CF6"
          />
          <StatCard
            icon="people-outline"
            label="Total RSVPs"
            value={analytics.total_rsvps || 0}
            color="#10B981"
          />
          <StatCard
            icon="trending-up-outline"
            label="Avg Views/Event"
            value={parseFloat(analytics.avg_views_per_event || 0).toFixed(1)}
            color="#F59E0B"
          />
        </View>

        {/* Performance Metrics */}
        <Text style={styles.sectionTitle}>Performance Metrics</Text>
        <View style={styles.metricsContainer}>
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Ionicons name="bar-chart-outline" size={24} color="#4169E1" />
              <Text style={styles.metricTitle}>Engagement Rate</Text>
            </View>
            <Text style={styles.metricValue}>
              {analytics.total_views > 0
                ? ((analytics.total_rsvps / analytics.total_views) * 100).toFixed(1)
                : '0.0'}
              %
            </Text>
            <Text style={styles.metricDescription}>
              RSVPs per view across all events
            </Text>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Ionicons name="star-outline" size={24} color="#F59E0B" />
              <Text style={styles.metricTitle}>Avg Attendees</Text>
            </View>
            <Text style={styles.metricValue}>
              {parseFloat(analytics.avg_rsvps_per_event || 0).toFixed(1)}
            </Text>
            <Text style={styles.metricDescription}>
              Average RSVPs per event
            </Text>
          </View>
        </View>

        {/* Top Event */}
        {analytics.top_event_title && (
          <>
            <Text style={styles.sectionTitle}>Top Performing Event</Text>
            <View style={styles.topEventCard}>
              <View style={styles.topEventBadge}>
                <Ionicons name="trophy" size={20} color="#F59E0B" />
                <Text style={styles.topEventBadgeText}>Best Performing</Text>
              </View>
              <Text style={styles.topEventTitle}>{analytics.top_event_title}</Text>
              <View style={styles.topEventStats}>
                <View style={styles.topEventStat}>
                  <Ionicons name="eye" size={20} color="#4169E1" />
                  <Text style={styles.topEventStatValue}>{analytics.top_event_views}</Text>
                  <Text style={styles.topEventStatLabel}>views</Text>
                </View>
              </View>
            </View>
          </>
        )}

        {/* Recent Events */}
        <View style={styles.recentHeader}>
          <Text style={styles.sectionTitle}>Recent Events</Text>
          <TouchableOpacity onPress={() => debouncedRouter.push('/events/my-akora-events')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        {recentEvents.length > 0 ? (
          <View style={styles.eventsContainer}>
            {recentEvents.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>No events yet</Text>
            <TouchableOpacity
              style={styles.createEventBtn}
              onPress={() => debouncedRouter.push('/events')}
            >
              <Text style={styles.createEventBtnText}>Create Your First Event</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Insights */}
        <Text style={styles.sectionTitle}>Insights & Tips</Text>
        <View style={styles.insightsContainer}>
          <View style={styles.insightCard}>
            <Ionicons name="lightbulb-outline" size={24} color="#4169E1" />
            <Text style={styles.insightText}>
              Events with 5+ images get 2.3x more views
            </Text>
          </View>
          <View style={styles.insightCard}>
            <Ionicons name="time-outline" size={24} color="#10B981" />
            <Text style={styles.insightText}>
              Weekend events have 40% higher RSVP rates
            </Text>
          </View>
          <View style={styles.insightCard}>
            <Ionicons name="megaphone-outline" size={24} color="#F59E0B" />
            <Text style={styles.insightText}>
              Premium listings get 5x more visibility
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
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
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  refreshBtn: {
    padding: 8,
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: (width - 44) / 2,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  statSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  metricsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  metricTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  metricValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  metricDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  topEventCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  topEventBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  topEventBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F59E0B',
  },
  topEventTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  topEventStats: {
    flexDirection: 'row',
    gap: 24,
  },
  topEventStat: {
    alignItems: 'center',
  },
  topEventStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
  },
  topEventStatLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4169E1',
  },
  eventsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  eventRow: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  eventRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventRowTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  eventRowStats: {
    flexDirection: 'row',
    gap: 16,
  },
  eventRowStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventRowStatText: {
    fontSize: 13,
    color: '#6B7280',
  },
  insightsContainer: {
    gap: 12,
    marginBottom: 32,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 16,
    marginBottom: 20,
  },
  createEventBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#4169E1',
    borderRadius: 12,
  },
  createEventBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
});
