import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { useFocusEffect } from '@react-navigation/native';
import { 
  ArrowLeft, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Edit3 
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

const { width } = Dimensions.get('window');

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  organizer: string;
  category: string;
  is_free: boolean;
  ticket_price?: number;
  currency?: string;
  capacity?: number;
  view_count: number;
  is_approved: boolean;
  created_at: string;
  user_id: string;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function EventCalendarScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const scrollRef = React.useRef<ScrollView | null>(null);

  const isAdmin = profile?.is_admin || profile?.role === 'admin';

  useEffect(() => {
    loadEvents();
  }, [selectedYear]);

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [selectedYear])
  );

  const loadEvents = async () => {
    try {
      setLoading(true);
      
      // Load all events for the selected year
      const startOfYear = `${selectedYear}-01-01`;
      const endOfYear = `${selectedYear}-12-31`;
      
      let query = supabase
        .from('secretariat_events')
        .select('*')
        .gte('date', startOfYear)
        .lte('date', endOfYear)
        .order('date', { ascending: true });

      // Admins see all events, regular users see only approved events
      if (!isAdmin) {
        query = query.eq('is_approved', true);
      }

      const { data, error } = await query;

      if (error) throw error;

      setEvents(data || []);
    } catch (error) {
      console.error('Error loading events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
  };

  const getEventsForMonth = (month: number) => {
    return events.filter(event => {
      if (!event.date || event.date === 'TBA') return false;
      const eventDate = new Date(event.date);
      return eventDate.getMonth() === month;
    });
  };

  const getUpcomingEvents = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return events.filter(event => {
      if (!event.date || event.date === 'TBA') return false;
      const eventDate = new Date(event.date);
      return eventDate >= today;
    }).slice(0, 10);
  };

  const getPastEvents = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return events.filter(event => {
      if (!event.date || event.date === 'TBA') return false;
      const eventDate = new Date(event.date);
      return eventDate < today;
    });
  };

  const getTBAEvents = () => {
    return events.filter(event => !event.date || event.date === 'TBA');
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr === 'TBA') return 'Date TBA';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const isEventUpcoming = (dateStr: string) => {
    if (!dateStr || dateStr === 'TBA') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(dateStr);
    const diffDays = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  };

  const renderMonthCard = (month: number) => {
    const monthEvents = getEventsForMonth(month);
    const upcomingCount = monthEvents.filter(e => isEventUpcoming(e.date)).length;
    const hasEvents = monthEvents.length > 0;

    return (
      <TouchableOpacity
        key={month}
        style={[styles.monthCard, !hasEvents && styles.monthCardEmpty]}
        onPress={() => {
          const next = selectedMonth === month ? null : month;
          setSelectedMonth(next);
          if (next !== null && scrollRef.current) {
            scrollRef.current.scrollTo({ y: 0, animated: true });
          }
        }}
        activeOpacity={0.7}
      >
        <View style={styles.monthCardHeader}>
          <Text style={[styles.monthCardTitle, !hasEvents && styles.monthCardTitleEmpty]}>
            {MONTHS[month]}
          </Text>
          {upcomingCount > 0 && (
            <View style={styles.upcomingBadge}>
              <Text style={styles.upcomingBadgeText}>{upcomingCount}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.monthCardStats}>
          <View style={styles.monthCardStat}>
            <Text style={[styles.monthCardNumber, !hasEvents && styles.monthCardNumberEmpty]}>
              {monthEvents.length}
            </Text>
            <Text style={[styles.monthCardLabel, !hasEvents && styles.monthCardLabelEmpty]}>
              {monthEvents.length === 1 ? 'Event' : 'Events'}
            </Text>
          </View>
        </View>

        {hasEvents && (
          <View style={styles.monthCardPreview}>
            {monthEvents.slice(0, 2).map((event, idx) => (
              <View key={idx} style={styles.monthEventDot}>
                <View style={[styles.eventDot, !event.date || event.date === 'TBA' ? styles.eventDotTBA : styles.eventDotScheduled]} />
                <Text style={styles.monthEventTitle} numberOfLines={1}>{event.title}</Text>
              </View>
            ))}
            {monthEvents.length > 2 && (
              <Text style={styles.monthEventMore}>+{monthEvents.length - 2} more</Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEventCard = (event: Event) => {
    const isUpcoming = isEventUpcoming(event.date);
    const isTBA = !event.date || event.date === 'TBA';

    return (
      <TouchableOpacity
        key={event.id}
        style={styles.eventCard}
        onPress={() => debouncedRouter.push(`/events/${event.id}`)}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={isUpcoming ? ['#0F172A', '#1E293B'] : isTBA ? ['#ffc857', '#FFD57E'] : ['#6B7280', '#9CA3AF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.eventCardGradient}
        >
          <View style={styles.eventCardHeader}>
            <View style={styles.eventCardDate}>
              {!isTBA ? (
                <>
                  <Text style={styles.eventCardDay}>{new Date(event.date).getDate()}</Text>
                  <Text style={styles.eventCardMonth}>{MONTH_SHORT[new Date(event.date).getMonth()]}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.eventCardDay}>?</Text>
                  <Text style={styles.eventCardMonth}>TBA</Text>
                </>
              )}
            </View>
            
            <View style={styles.eventCardContent}>
              <View style={styles.eventCardTop}>
                <Text style={styles.eventCardTitle} numberOfLines={2}>{event.title}</Text>
                {isAdmin && (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      debouncedRouter.push(`/create-event?edit=${event.id}`);
                    }}
                    style={styles.editButton}
                  >
                    <Edit3 size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
              </View>
              
              <View style={styles.eventCardDetails}>
                {event.time && event.time !== 'TBA' && (
                  <View style={styles.eventCardDetail}>
                    <Clock size={14} color="#FFFFFF" opacity={0.9} />
                    <Text style={styles.eventCardDetailText}>{event.time}</Text>
                  </View>
                )}
                {event.location && event.location !== 'TBA' && (
                  <View style={styles.eventCardDetail}>
                    <MapPin size={14} color="#FFFFFF" opacity={0.9} />
                    <Text style={styles.eventCardDetailText} numberOfLines={1}>{event.location}</Text>
                  </View>
                )}
              </View>

              {isTBA && (
                <View style={styles.tbaIndicator}>
                  <Text style={styles.tbaText}>Details Coming Soon</Text>
                </View>
              )}
            </View>
          </View>

          {isUpcoming && !isTBA && (
            <View style={styles.upcomingIndicator}>
              <Text style={styles.upcomingText}>UPCOMING</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0F172A" />
        <Text style={styles.loadingText}>Loading events calendar...</Text>
      </View>
    );
  }

  const upcomingEvents = getUpcomingEvents();
  const pastEvents = getPastEvents();
  const tbaEvents = getTBAEvents();
  const filteredMonthEvents = selectedMonth !== null ? getEventsForMonth(selectedMonth) : [];

  return (
    <View style={styles.container}>
      {refreshing && (
        <View style={styles.refreshOverlay}>
          <ActivityIndicator size="large" color="#0F172A" />
        </View>
      )}
      <ScrollView
        ref={scrollRef}
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContentContainer}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={handleRefresh}
            tintColor="transparent"
            colors={['transparent']}
          />
        }
      >
        {/* Scrollable Header */}
        <LinearGradient
          colors={['#0F172A', '#1E293B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
              <ArrowLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerSubtitle}>OAA Secretariat</Text>
              <Text style={styles.headerTitle}>Events Calendar {selectedYear}</Text>
            </View>
            {isAdmin ? (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => debouncedRouter.push('/create-event')}
              >
                <Plus size={24} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <View style={styles.placeholder} />
            )}
          </View>

          {/* Year Selector */}
          <View style={styles.yearSelector}>
            <TouchableOpacity
              style={styles.yearButton}
              onPress={() => setSelectedYear(selectedYear - 1)}
            >
              <ChevronLeft size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.yearText}>{selectedYear}</Text>
            <TouchableOpacity
              style={styles.yearButton}
              onPress={() => setSelectedYear(selectedYear + 1)}
            >
              <ChevronRight size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Stats Overview */}
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{events.length}</Text>
              <Text style={styles.statLabel}>Total Events</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{upcomingEvents.length}</Text>
              <Text style={styles.statLabel}>Upcoming</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{tbaEvents.length}</Text>
              <Text style={styles.statLabel}>TBA</Text>
            </View>
          </View>
        </LinearGradient>
        {/* Month Filter Modal */}
        {selectedMonth !== null && (
          <View style={styles.filterModal}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>{MONTHS[selectedMonth]} Events</Text>
              <TouchableOpacity onPress={() => setSelectedMonth(null)}>
                <X size={24} color="#333" />
              </TouchableOpacity>
            </View>
            {filteredMonthEvents.length === 0 ? (
              <View style={styles.emptyState}>
                <CalendarIcon size={48} color="#CCCCCC" />
                <Text style={styles.emptyText}>No events in {MONTHS[selectedMonth]}</Text>
              </View>
            ) : (
              filteredMonthEvents.map(renderEventCard)
            )}
          </View>
        )}

        {/* Calendar View - All 12 Months */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Monthly Overview</Text>
          <View style={styles.monthsGrid}>
            {Array.from({ length: 12 }, (_, i) => renderMonthCard(i))}
          </View>
        </View>

        {/* Upcoming Events Section */}
        {upcomingEvents.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming Events</Text>
              <Text style={styles.sectionCount}>{upcomingEvents.length}</Text>
            </View>
            {upcomingEvents.map(renderEventCard)}
          </View>
        )}

        {/* Events Awaiting Details */}
        {tbaEvents.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Details Coming Soon</Text>
              <Text style={styles.sectionCount}>{tbaEvents.length}</Text>
            </View>
            <Text style={styles.sectionDescription}>
              These events are scheduled for {selectedYear} but dates and details will be announced soon.
            </Text>
            {tbaEvents.map(renderEventCard)}
          </View>
        )}

        {/* Past Events Section */}
        {pastEvents.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Past Events</Text>
              <Text style={styles.sectionCount}>{pastEvents.length}</Text>
            </View>
            {pastEvents.slice(0, 5).map(renderEventCard)}
            {pastEvents.length > 5 && (
              <TouchableOpacity style={styles.viewAllButton}>
                <Text style={styles.viewAllText}>View All Past Events ({pastEvents.length - 5} more)</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Empty State */}
        {events.length === 0 && (
          <View style={styles.emptyContainer}>
            <CalendarIcon size={80} color="#E5E7EB" />
            <Text style={styles.emptyTitle}>No Events for {selectedYear}</Text>
            <Text style={styles.emptySubtext}>
              {isAdmin ? 'Start by adding your first event for this year' : 'Check back later for upcoming events'}
            </Text>
            {isAdmin && (
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => debouncedRouter.push('/create-event')}
              >
                <Plus size={20} color="#FFFFFF" />
                <Text style={styles.emptyButtonText}>Add Event</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  refreshOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 40,
  },
  fixedHeaderContainer: {
    backgroundColor: '#FFFFFF',
    paddingTop: 50,
  },
  fixedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  backButtonFixed: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffc857',
    shadowColor: '#ffc857',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  addButtonFixed: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffc857',
    shadowColor: '#ffc857',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
    fontFamily: 'Inter',
    fontWeight: '500',
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    fontFamily: 'Inter',
    fontWeight: '500',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter',
    textAlign: 'center',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    width: 44,
  },
  yearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 24,
  },
  yearButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 16,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: 'Inter',
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    fontFamily: 'Inter',
  },
  sectionCount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: 'Inter',
    marginBottom: 16,
    lineHeight: 20,
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  monthCard: {
    width: (width - 52) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  monthCardEmpty: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  monthCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    fontFamily: 'Inter',
  },
  monthCardTitleEmpty: {
    color: '#94A3B8',
  },
  upcomingBadge: {
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffc857',
  },
  upcomingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8B6914',
    fontFamily: 'Inter',
  },
  monthCardStats: {
    marginBottom: 12,
  },
  monthCardStat: {
    alignItems: 'center',
  },
  monthCardNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  monthCardNumberEmpty: {
    color: '#CBD5E1',
  },
  monthCardLabel: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'Inter',
    fontWeight: '600',
    marginTop: 4,
  },
  monthCardLabelEmpty: {
    color: '#94A3B8',
  },
  monthCardPreview: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
    gap: 8,
  },
  monthEventDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  eventDotScheduled: {
    backgroundColor: '#0F172A',
  },
  eventDotTBA: {
    backgroundColor: '#ffc857',
  },
  monthEventTitle: {
    fontSize: 12,
    color: '#475569',
    fontFamily: 'Inter',
    flex: 1,
  },
  monthEventMore: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: 'Inter',
    fontWeight: '600',
    marginTop: 4,
  },
  filterModal: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
  },
  filterModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  filterModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    fontFamily: 'Inter',
  },
  eventCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  eventCardGradient: {
    padding: 16,
  },
  eventCardHeader: {
    flexDirection: 'row',
    gap: 16,
  },
  eventCardDate: {
    width: 60,
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  eventCardDay: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },
  eventCardMonth: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.95)',
    fontFamily: 'Inter',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  eventCardContent: {
    flex: 1,
  },
  eventCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  eventCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter',
    flex: 1,
    marginRight: 8,
  },
  editButton: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventCardDetails: {
    gap: 8,
  },
  eventCardDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventCardDetailText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.95)',
    fontFamily: 'Inter',
    fontWeight: '500',
    flex: 1,
  },
  tbaIndicator: {
    marginTop: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  tbaText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  upcomingIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  upcomingText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'Inter',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
    fontFamily: 'Inter',
    marginTop: 24,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#64748B',
    fontFamily: 'Inter',
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 15,
    color: '#94A3B8',
    fontFamily: 'Inter',
    marginTop: 16,
    textAlign: 'center',
  },
  viewAllButton: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
    fontFamily: 'Inter',
  },
  bottomPadding: {
    height: 20,
  },
});
