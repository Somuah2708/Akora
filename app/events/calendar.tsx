import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Calendar as CalendarIcon, MapPin, ChevronLeft, ChevronRight, Star } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { debouncedRouter } from '@/utils/navigationDebounce';

type PackageTier = 'basic' | 'standard' | 'priority' | 'premium';

type CalendarEvent = {
  id: string;
  title: string;
  description: string;
  location: string;
  start_time: string;
  end_time: string | null;
  banner_url: string | null;
  package_tier: PackageTier;
  category: string | null;
  featured: boolean;
  event_type: 'oaa' | 'akora';
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function EventsCalendarScreen() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsMap, setEventsMap] = useState<Map<string, CalendarEvent[]>>(new Map());

  useEffect(() => {
    loadEvents();
  }, [currentDate]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);

      const { data, error } = await supabase
        .from('akora_events')
        .select('id, title, description, location, start_time, end_time, banner_url, package_tier, category, featured, event_type')
        .eq('status', 'published')
        .gte('start_time', startOfMonth.toISOString())
        .lte('start_time', endOfMonth.toISOString())
        .order('start_time', { ascending: true });

      if (error) throw error;

      const loadedEvents = data || [];
      setEvents(loadedEvents);

      // Group events by date
      const map = new Map<string, CalendarEvent[]>();
      loadedEvents.forEach((event) => {
        const dateKey = new Date(event.start_time).toDateString();
        const existing = map.get(dateKey) || [];
        existing.push(event);
        map.set(dateKey, existing);
      });
      setEventsMap(map);
    } catch (error: any) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];
    
    // Add empty slots for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days in month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    setSelectedDate(null);
  };

  const getEventsForDate = (date: Date | null) => {
    if (!date) return [];
    const events = eventsMap.get(date.toDateString()) || [];
    
    // Sort by package tier (premium/priority first)
    return events.sort((a, b) => {
      const tierOrder = { premium: 0, priority: 1, standard: 2, basic: 3 };
      return tierOrder[a.package_tier] - tierOrder[b.package_tier];
    });
  };

  const hasEventsOnDate = (date: Date | null) => {
    if (!date) return false;
    return eventsMap.has(date.toDateString());
  };

  const getTierStyle = (tier: PackageTier) => {
    switch (tier) {
      case 'premium':
        return { borderColor: '#FFD700', backgroundColor: '#FFFBF0', badge: '👑 PREMIUM' };
      case 'priority':
        return { borderColor: '#FFD700', backgroundColor: '#FFFEF5', badge: '⭐ HIGH PRIORITY' };
      case 'standard':
        return { borderColor: '#10B981', backgroundColor: '#F0FDF4', badge: '✓ STANDARD' };
      case 'basic':
        return { borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', badge: 'BASIC' };
      default:
        return { borderColor: '#E5E7EB', backgroundColor: '#fff', badge: '' };
    }
  };

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];
  const days = getDaysInMonth();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Events Calendar</Text>
          <Text style={styles.subtitle}>Browse events by date</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Month Navigation */}
        <View style={styles.monthNavigation}>
          <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton}>
            <ChevronLeft size={24} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.monthDisplay}>
            <Text style={styles.monthText}>{MONTHS[currentDate.getMonth()]}</Text>
            <Text style={styles.yearText}>{currentDate.getFullYear()}</Text>
          </View>
          <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
            <ChevronRight size={24} color="#0F172A" />
          </TouchableOpacity>
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendar}>
          {/* Day Headers */}
          <View style={styles.dayHeaders}>
            {DAYS.map((day) => (
              <View key={day} style={styles.dayHeader}>
                <Text style={styles.dayHeaderText}>{day}</Text>
              </View>
            ))}
          </View>

          {/* Calendar Days */}
          <View style={styles.daysGrid}>
            {days.map((day, index) => {
              const isToday = day && day.toDateString() === new Date().toDateString();
              const isSelected = day && selectedDate && day.toDateString() === selectedDate.toDateString();
              const hasEvents = hasEventsOnDate(day);
              const eventCount = day ? getEventsForDate(day).length : 0;

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayCell,
                    !day && styles.emptyCell,
                    isToday && styles.todayCell,
                    isSelected && styles.selectedCell,
                  ]}
                  onPress={() => day && setSelectedDate(day)}
                  disabled={!day}
                >
                  {day && (
                    <>
                      <Text style={[
                        styles.dayNumber,
                        isToday && styles.todayText,
                        isSelected && styles.selectedText,
                      ]}>
                        {day.getDate()}
                      </Text>
                      {hasEvents && (
                        <View style={styles.eventDot}>
                          <Text style={styles.eventCountText}>{eventCount}</Text>
                        </View>
                      )}
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Selected Date Events */}
        {selectedDate && (
          <View style={styles.selectedDateSection}>
            <Text style={styles.selectedDateTitle}>
              Events on {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>

            {loading ? (
              <ActivityIndicator size="large" color="#0F172A" style={{ marginTop: 20 }} />
            ) : selectedDateEvents.length === 0 ? (
              <View style={styles.noEvents}>
                <CalendarIcon size={48} color="#CCCCCC" />
                <Text style={styles.noEventsText}>No events on this date</Text>
              </View>
            ) : (
              <View style={styles.eventsList}>
                {selectedDateEvents.map((event, index) => {
                  const tierStyle = getTierStyle(event.package_tier);
                  const isPremium = event.package_tier === 'premium' || event.package_tier === 'priority';

                  return (
                    <TouchableOpacity
                      key={event.id}
                      style={[
                        styles.eventCard,
                        { borderColor: tierStyle.borderColor, backgroundColor: tierStyle.backgroundColor },
                        isPremium && styles.premiumCard,
                      ]}
                      onPress={() => debouncedRouter.push(`/events/${event.id}`)}
                    >
                      {/* Premium Badge */}
                      {isPremium && (
                        <View style={styles.premiumBadge}>
                          <Text style={styles.premiumBadgeText}>{tierStyle.badge}</Text>
                        </View>
                      )}

                      {/* Event Type Badge */}
                      <View style={[styles.typeBadge, event.event_type === 'oaa' ? styles.oaaBadge : styles.akoraBadge]}>
                        <Text style={styles.typeBadgeText}>{event.event_type.toUpperCase()}</Text>
                      </View>

                      <View style={styles.eventCardContent}>
                        {/* Event Image */}
                        {event.banner_url ? (
                          <Image source={{ uri: event.banner_url }} style={styles.eventImage} />
                        ) : (
                          <View style={[styles.eventImage, styles.placeholderImage]}>
                            <CalendarIcon size={32} color="#CCCCCC" />
                          </View>
                        )}

                        {/* Event Details */}
                        <View style={styles.eventDetails}>
                          <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
                          
                          <View style={styles.eventMeta}>
                            <CalendarIcon size={14} color="#666" />
                            <Text style={styles.eventTime}>
                              {new Date(event.start_time).toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </Text>
                          </View>

                          <View style={styles.eventMeta}>
                            <MapPin size={14} color="#666" />
                            <Text style={styles.eventLocation} numberOfLines={1}>{event.location}</Text>
                          </View>

                          {event.category && (
                            <View style={styles.categoryTag}>
                              <Text style={styles.categoryText}>{event.category}</Text>
                            </View>
                          )}

                          {!isPremium && (
                            <View style={styles.tierTag}>
                              <Text style={styles.tierTagText}>{tierStyle.badge}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {!selectedDate && (
          <View style={styles.instructionBox}>
            <CalendarIcon size={48} color="#0F172A" />
            <Text style={styles.instructionTitle}>Select a Date</Text>
            <Text style={styles.instructionText}>
              Tap on any date to view events scheduled for that day
            </Text>
            <View style={styles.legendBox}>
              <Text style={styles.legendTitle}>Package Priority Legend:</Text>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#FFD700' }]} />
                <Text style={styles.legendText}>Premium/Priority - Featured prominently</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                <Text style={styles.legendText}>Standard - Regular visibility</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#9CA3AF' }]} />
                <Text style={styles.legendText}>Basic - Minimal promotion</Text>
              </View>
            </View>
          </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  navButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  monthDisplay: {
    alignItems: 'center',
  },
  monthText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  yearText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  calendar: {
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 16,
    marginBottom: 16,
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayHeader: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  emptyCell: {
    backgroundColor: 'transparent',
  },
  todayCell: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#0F172A',
  },
  selectedCell: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  todayText: {
    color: '#0F172A',
    fontWeight: '700',
  },
  selectedText: {
    color: '#fff',
    fontWeight: '700',
  },
  eventDot: {
    position: 'absolute',
    bottom: 4,
    backgroundColor: '#FFD700',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    minWidth: 16,
  },
  eventCountText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#92400E',
    textAlign: 'center',
  },
  selectedDateSection: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  selectedDateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },
  eventsList: {
    gap: 12,
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  premiumCard: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  premiumBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    zIndex: 10,
  },
  premiumBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400E',
  },
  typeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    zIndex: 10,
  },
  oaaBadge: {
    backgroundColor: '#10B981',
  },
  akoraBadge: {
    backgroundColor: '#0F172A',
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  eventCardContent: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  eventImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  placeholderImage: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventDetails: {
    flex: 1,
    gap: 4,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventTime: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  eventLocation: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  categoryTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3B82F6',
  },
  tierTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 2,
  },
  tierTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
  },
  noEvents: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noEventsText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  instructionBox: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  instructionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 16,
  },
  instructionText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  legendBox: {
    marginTop: 32,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    width: '100%',
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 13,
    color: '#4B5563',
    flex: 1,
  },
});
