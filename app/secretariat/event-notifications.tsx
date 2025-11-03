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
import { useRouter } from 'expo-router';
import { ArrowLeft, Bell, Calendar, Clock, Trash2, BellOff } from 'lucide-react-native';
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

export default function EventNotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [reminders, setReminders] = useState<EventReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    try {
      setLoading(true);
      // Note: You'll need to create the event_reminders table in Supabase
      const { data, error } = await supabase
        .from('event_reminders')
        .select(`
          *,
          event:products_services(title, description)
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
      };
    } catch {
      return {
        date: 'TBA',
        time: 'TBA',
        location: 'TBA',
      };
    }
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
        <ActivityIndicator size="large" color="#4169E1" />
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
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
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
        {reminders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <BellOff size={64} color="#CCCCCC" />
            <Text style={styles.emptyTitle}>No Event Reminders</Text>
            <Text style={styles.emptyText}>
              Set reminders for events you don't want to miss!
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
                <Text style={styles.exploreButtonText}>Browse Events</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
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
    marginBottom: 16,
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
