import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, Bell, Calendar, Clock, Trash2, BellOff, Users } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface EventReminder {
  id: string;
  event_id: string;
  user_id: string;
  reminder_time: string;
  reminder_type: string;
  is_active: boolean;
  created_at: string;
  event: {
    title: string;
    description: string;
  };
}

interface NewEvent {
  id: string;
  title: string;
  description: string;
  category_name: string;
  created_at: string;
  user_id: string;
  is_seen?: boolean;
}

interface UserCreation {
  id: string;
  title: string;
  description: string;
  category_name: string;
  created_at: string;
  is_approved: boolean;
  view_count: number;
}

export default function EventNotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [reminders, setReminders] = useState<EventReminder[]>([]);
  const [newEvents, setNewEvents] = useState<NewEvent[]>([]);
  const [userCreations, setUserCreations] = useState<UserCreation[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    loadReminders();
    loadNewEvents();
    loadUserCreations();
  }, []);

  const loadUserCreations = async () => {
    try {
      if (!user?.id) return;
      
      // Get all events created by the user
      const { data, error } = await supabase
        .from('secretariat_events')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('User creations fetch error:', error);
        setUserCreations([]);
      } else {
        setUserCreations(data || []);
      }
    } catch (error: any) {
      console.error('Error loading user creations:', error);
      setUserCreations([]);
    }
  };

  const loadNewEvents = async () => {
    try {
      if (!user?.id) return;
      
      // Get events from last 7 days that were posted by others
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data, error } = await supabase
        .from('secretariat_events')
        .select('*')
        .neq('user_id', user.id) // Exclude user's own events
        .gte('created_at', sevenDaysAgo.toISOString())
        .eq('is_approved', true) // Only show approved events
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('New events fetch error:', error);
        setNewEvents([]);
      } else {
        setNewEvents(data || []);
      }
    } catch (error: any) {
      console.error('Error loading new events:', error);
      setNewEvents([]);
    }
  };

  const loadReminders = async () => {
    try {
      setLoading(true);
      // Note: You'll need to create the event_reminders table in Supabase
      const { data, error } = await supabase
        .from('event_reminders')
        .select(`
          *,
          event:secretariat_events(title, description)
        `)
        .eq('user_id', user?.id)
        .order('reminder_time', { ascending: true });

      if (error) {
        console.error('Reminders fetch error:', error);
        setReminders([]);
      } else {
        setReminders(data || []);
      }
    } catch (error: any) {
      console.error('Error loading reminders:', error);
      setReminders([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleReminder = async (reminderId: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('event_reminders')
        .update({ is_active: !currentState })
        .eq('id', reminderId);

      if (error) throw error;
      loadReminders();
    } catch (error: any) {
      console.error('Error toggling reminder:', error);
    }
  };

  const deleteReminder = async (reminderId: string) => {
    try {
      const { error } = await supabase
        .from('event_reminders')
        .delete()
        .eq('id', reminderId);

      if (error) throw error;
      loadReminders();
    } catch (error: any) {
      console.error('Error deleting reminder:', error);
    }
  };

  const parseEventData = (description: string) => {
    try {
      const data = JSON.parse(description);
      return {
        date: data.date || 'TBA',
        time: data.time || 'TBA',
        location: data.location || 'TBA',
        category: data.category || 'General',
      };
    } catch {
      return {
        date: 'TBA',
        time: 'TBA',
        location: 'TBA',
        category: 'General',
      };
    }
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return past.toLocaleDateString();
  };

  const getReminderTypeLabel = (type: string) => {
    switch (type) {
      case '1hour':
        return '1 hour before';
      case '1day':
        return '1 day before';
      case '1week':
        return '1 week before';
      default:
        return 'Custom';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0F172A" />
        <Text style={styles.loadingText}>Loading reminders...</Text>
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
            <Bell size={24} color="#FFFFFF" />
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>Event Notifications</Text>
              <Text style={styles.subtitle}>Reminders & Alerts</Text>
            </View>
          </View>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      {/* Notification Toggle */}
      <View style={styles.toggleContainer}>
        <View style={styles.toggleInfo}>
          <Bell size={20} color="#4169E1" />
          <View style={styles.toggleTextContainer}>
            <Text style={styles.toggleTitle}>Enable Notifications</Text>
            <Text style={styles.toggleSubtitle}>Receive event reminders and updates</Text>
          </View>
        </View>
        <Switch
          value={notificationsEnabled}
          onValueChange={setNotificationsEnabled}
          trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
          thumbColor={notificationsEnabled ? '#4169E1' : '#F3F4F6'}
        />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Creations Section */}
        {userCreations.length > 0 && (
          <View style={styles.userCreationsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Event Creations ({userCreations.length})</Text>
              <Text style={styles.sectionSubtitle}>Events you've posted</Text>
            </View>
            {userCreations.map((event) => {
              const eventData = parseEventData(event.description);
              const category = event.category_name.replace('Event - ', '');
              const timeAgo = getTimeAgo(event.created_at);
              const approvalStatus = event.is_approved ? 'Approved' : 'Pending Approval';
              
              return (
                <TouchableOpacity
                  key={event.id}
                  style={styles.userCreationCard}
                  onPress={() => debouncedRouter.push(`/events/${event.id}`)}
                >
                  <View style={styles.userCreationHeader}>
                    <View style={[
                      styles.statusBadge,
                      event.is_approved ? styles.approvedBadge : styles.pendingBadge
                    ]}>
                      <Text style={styles.statusBadgeText}>{approvalStatus}</Text>
                    </View>
                    <Text style={styles.timeAgoText}>{timeAgo}</Text>
                  </View>
                  <Text style={styles.userCreationTitle}>{event.title}</Text>
                  <View style={styles.userCreationMeta}>
                    <View style={styles.metaItem}>
                      <Calendar size={14} color="#666" />
                      <Text style={styles.metaText}>{eventData.date}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Clock size={14} color="#666" />
                      <Text style={styles.metaText}>{eventData.time}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Users size={14} color="#666" />
                      <Text style={styles.metaText}>{event.view_count || 0} views</Text>
                    </View>
                  </View>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{category}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* New Events Section */}
        {newEvents.length > 0 && (
          <View style={styles.newEventsSection}>
            <Text style={styles.sectionTitle}>New Events ({newEvents.length})</Text>
            <Text style={styles.sectionSubtitle}>Recently posted by others</Text>
            {newEvents.map((event) => {
              const eventData = parseEventData(event.description);
              const category = event.category_name.replace('Event - ', '');
              const timeAgo = getTimeAgo(event.created_at);
              
              return (
                <TouchableOpacity
                  key={event.id}
                  style={styles.newEventCard}
                  onPress={() => debouncedRouter.push(`/events/${event.id}`)}
                >
                  <View style={styles.newEventHeader}>
                    <View style={styles.newBadge}>
                      <Text style={styles.newBadgeText}>NEW</Text>
                    </View>
                    <Text style={styles.timeAgoText}>{timeAgo}</Text>
                  </View>
                  <Text style={styles.newEventTitle}>{event.title}</Text>
                  <View style={styles.newEventMeta}>
                    <View style={styles.metaItem}>
                      <Calendar size={14} color="#666" />
                      <Text style={styles.metaText}>{eventData.date}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Clock size={14} color="#666" />
                      <Text style={styles.metaText}>{eventData.time}</Text>
                    </View>
                  </View>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{category}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Reminders Section */}
        {reminders.length === 0 && newEvents.length === 0 && userCreations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <BellOff size={64} color="#CCCCCC" />
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptyText}>
              You'll see new events and reminders here!
            </Text>
            <TouchableOpacity 
              style={styles.exploreButton}
              onPress={() => debouncedRouter.push('/secretariat/event-calendar')}
            >
              <LinearGradient
                colors={['#4169E1', '#5B7FE8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.exploreButtonGradient}
              >
                <Calendar size={20} color="#FFFFFF" />
                <Text style={styles.exploreButtonText}>Browse Events</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : reminders.length === 0 ? null : (
          <View style={styles.remindersList}>
            <Text style={styles.sectionTitle}>Upcoming Reminders ({reminders.length})</Text>
            {reminders.map((reminder) => {
              const eventData = parseEventData(reminder.event?.description || '');
              return (
                <View key={reminder.id} style={styles.reminderCard}>
                  <View style={styles.reminderHeader}>
                    <View style={[
                      styles.reminderIcon,
                      !reminder.is_active && styles.reminderIconInactive
                    ]}>
                      <Bell 
                        size={20} 
                        color={reminder.is_active ? '#4169E1' : '#999'} 
                      />
                    </View>
                    <View style={styles.reminderContent}>
                      <Text style={styles.reminderTitle} numberOfLines={2}>
                        {reminder.event?.title || 'Event'}
                      </Text>
                      <View style={styles.reminderMeta}>
                        <Calendar size={14} color="#666" />
                        <Text style={styles.reminderMetaText}>{eventData.date}</Text>
                        <Clock size={14} color="#666" style={{ marginLeft: 12 }} />
                        <Text style={styles.reminderMetaText}>{eventData.time}</Text>
                      </View>
                      <View style={styles.reminderTypeBadge}>
                        <Bell size={12} color="#4169E1" />
                        <Text style={styles.reminderTypeText}>
                          {getReminderTypeLabel(reminder.reminder_type)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.reminderActions}>
                    <View style={styles.toggleSwitch}>
                      <Text style={styles.toggleSwitchLabel}>
                        {reminder.is_active ? 'Active' : 'Inactive'}
                      </Text>
                      <Switch
                        value={reminder.is_active}
                        onValueChange={() => toggleReminder(reminder.id, reminder.is_active)}
                        trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                        thumbColor={reminder.is_active ? '#4169E1' : '#F3F4F6'}
                      />
                    </View>
                    <TouchableOpacity 
                      style={styles.deleteButton}
                      onPress={() => deleteReminder(reminder.id)}
                    >
                      <Trash2 size={18} color="#EF4444" />
                    </TouchableOpacity>
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
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  toggleSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
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
  remindersList: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  userCreationsSection: {
    padding: 16,
    borderBottomWidth: 8,
    borderBottomColor: '#F3F4F6',
  },
  userCreationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  userCreationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  approvedBadge: {
    backgroundColor: '#10B981',
  },
  pendingBadge: {
    backgroundColor: '#F59E0B',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userCreationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  userCreationMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  newEventsSection: {
    padding: 16,
    borderBottomWidth: 8,
    borderBottomColor: '#F3F4F6',
  },
  newEventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4169E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  newEventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  newBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  newBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  timeAgoText: {
    fontSize: 12,
    color: '#999',
  },
  newEventTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  newEventMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#666',
  },
  categoryBadge: {
    backgroundColor: '#EBF0FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4169E1',
  },
  reminderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  reminderHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  reminderIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#EBF0FF',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderIconInactive: {
    backgroundColor: '#F3F4F6',
  },
  reminderContent: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  reminderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  reminderMetaText: {
    fontSize: 13,
    color: '#666',
  },
  reminderTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EBF0FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  reminderTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4169E1',
  },
  reminderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  toggleSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleSwitchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  deleteButton: {
    width: 40,
    height: 40,
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
