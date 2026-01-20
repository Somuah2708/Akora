import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, Bell, BellOff, Moon } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { pushNotificationService } from '../../services/pushNotificationService';

type NotificationPreferences = {
  // Mentee notifications
  request_accepted: boolean;
  request_declined: boolean;
  session_scheduled: boolean;
  session_reminder: boolean;
  new_message: boolean;
  mentor_recommendation: boolean;
  
  // Mentor notifications
  new_request: boolean;
  request_cancelled: boolean;
  session_cancelled: boolean;
  mentee_message: boolean;
  rating_received: boolean;
  
  // General
  push_enabled: boolean;
  email_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
};

type NotificationCategory = {
  title: string;
  description: string;
  settings: Array<{
    key: keyof NotificationPreferences;
    label: string;
    description: string;
  }>;
};

export default function NotificationSettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    request_accepted: true,
    request_declined: true,
    session_scheduled: true,
    session_reminder: true,
    new_message: true,
    mentor_recommendation: true,
    new_request: true,
    request_cancelled: true,
    session_cancelled: true,
    mentee_message: true,
    rating_received: true,
    push_enabled: true,
    email_enabled: true,
    quiet_hours_start: null,
    quiet_hours_end: null,
  });
  const [isMentor, setIsMentor] = useState(false);

  const menteeCategories: NotificationCategory[] = [
    {
      title: 'Request Updates',
      description: 'Notifications about your mentorship requests',
      settings: [
        {
          key: 'request_accepted',
          label: 'Request Accepted',
          description: 'When a mentor accepts your request',
        },
        {
          key: 'request_declined',
          label: 'Request Declined',
          description: 'When a mentor declines your request',
        },
      ],
    },
    {
      title: 'Session Updates',
      description: 'Notifications about scheduled sessions',
      settings: [
        {
          key: 'session_scheduled',
          label: 'Session Scheduled',
          description: 'When a new session is scheduled',
        },
        {
          key: 'session_reminder',
          label: 'Session Reminders',
          description: 'Reminders before upcoming sessions',
        },
      ],
    },
    {
      title: 'Messages & Recommendations',
      description: 'Communication and suggestions',
      settings: [
        {
          key: 'new_message',
          label: 'New Messages',
          description: 'When you receive a new message',
        },
        {
          key: 'mentor_recommendation',
          label: 'Mentor Recommendations',
          description: 'When new mentors match your preferences',
        },
      ],
    },
  ];

  const mentorCategories: NotificationCategory[] = [
    {
      title: 'Mentorship Requests',
      description: 'Notifications about incoming requests',
      settings: [
        {
          key: 'new_request',
          label: 'New Requests',
          description: 'When a mentee sends you a request',
        },
        {
          key: 'request_cancelled',
          label: 'Request Cancelled',
          description: 'When a mentee cancels their request',
        },
      ],
    },
    {
      title: 'Sessions',
      description: 'Session-related notifications',
      settings: [
        {
          key: 'session_cancelled',
          label: 'Session Cancelled',
          description: 'When a session is cancelled',
        },
      ],
    },
    {
      title: 'Communication & Feedback',
      description: 'Messages and ratings',
      settings: [
        {
          key: 'mentee_message',
          label: 'Mentee Messages',
          description: 'When you receive messages from mentees',
        },
        {
          key: 'rating_received',
          label: 'Ratings Received',
          description: 'When a mentee rates your session',
        },
      ],
    },
  ];

  useEffect(() => {
    fetchPreferences();
    checkMentorStatus();
  }, []);

  const checkMentorStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('alumni_mentors')
        .select('status')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setIsMentor(data?.status === 'approved');
    } catch (error) {
      console.error('Error checking mentor status:', error);
    }
  };

  const fetchPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setPreferences(data);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      Alert.alert('Error', 'Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...preferences,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      Alert.alert('Success', 'Notification preferences saved');
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert('Error', 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const togglePreference = async (key: keyof NotificationPreferences) => {
    const newPreferences = {
      ...preferences,
      [key]: !preferences[key],
    };
    setPreferences(newPreferences);
  };

  const enablePushNotifications = async () => {
    try {
      const token = await pushNotificationService.registerForPushNotifications();
      if (token) {
        setPreferences({ ...preferences, push_enabled: true });
        Alert.alert('Success', 'Push notifications enabled');
      } else {
        Alert.alert(
          'Permission Denied',
          'Please enable notifications in your device settings'
        );
      }
    } catch (error) {
      console.error('Error enabling push notifications:', error);
      Alert.alert('Error', 'Failed to enable push notifications');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0F172A" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity
          onPress={savePreferences}
          disabled={saving}
          style={styles.saveButton}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#0F172A" />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Master Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Master Controls</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Bell size={20} color="#007AFF" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Push Notifications</Text>
                <Text style={styles.settingDescription}>
                  {preferences.push_enabled
                    ? 'Receive notifications on this device'
                    : 'Enable to receive notifications'}
                </Text>
              </View>
            </View>
            <Switch
              value={preferences.push_enabled}
              onValueChange={async (value) => {
                if (value) {
                  await enablePushNotifications();
                } else {
                  togglePreference('push_enabled');
                }
              }}
              trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
              thumbColor={preferences.push_enabled ? '#007AFF' : '#f4f4f5'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <BellOff size={20} color="#007AFF" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Email Notifications</Text>
                <Text style={styles.settingDescription}>
                  Receive notifications via email
                </Text>
              </View>
            </View>
            <Switch
              value={preferences.email_enabled}
              onValueChange={() => togglePreference('email_enabled')}
              trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
              thumbColor={preferences.email_enabled ? '#007AFF' : '#f4f4f5'}
            />
          </View>
        </View>

        {/* Mentee Notifications */}
        {menteeCategories.map((category, index) => (
          <View key={index} style={styles.section}>
            <Text style={styles.sectionTitle}>{category.title}</Text>
            <Text style={styles.sectionDescription}>{category.description}</Text>
            
            {category.settings.map((setting) => (
              <View key={setting.key} style={styles.settingRow}>
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>{setting.label}</Text>
                  <Text style={styles.settingDescription}>
                    {setting.description}
                  </Text>
                </View>
                <Switch
                  value={preferences[setting.key] as boolean}
                  onValueChange={() => togglePreference(setting.key)}
                  trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
                  thumbColor={
                    preferences[setting.key] ? '#007AFF' : '#f4f4f5'
                  }
                  disabled={!preferences.push_enabled}
                />
              </View>
            ))}
          </View>
        ))}

        {/* Mentor Notifications (if user is a mentor) */}
        {isMentor &&
          mentorCategories.map((category, index) => (
            <View key={`mentor-${index}`} style={styles.section}>
              <Text style={styles.sectionTitle}>{category.title}</Text>
              <Text style={styles.sectionDescription}>{category.description}</Text>
              
              {category.settings.map((setting) => (
                <View key={setting.key} style={styles.settingRow}>
                  <View style={styles.settingText}>
                    <Text style={styles.settingLabel}>{setting.label}</Text>
                    <Text style={styles.settingDescription}>
                      {setting.description}
                    </Text>
                  </View>
                  <Switch
                    value={preferences[setting.key] as boolean}
                    onValueChange={() => togglePreference(setting.key)}
                    trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
                    thumbColor={
                      preferences[setting.key] ? '#007AFF' : '#f4f4f5'
                    }
                    disabled={!preferences.push_enabled}
                  />
                </View>
              ))}
            </View>
          ))}

        {/* Quiet Hours */}
        <View style={styles.section}>
          <View style={styles.quietHoursHeader}>
            <Moon size={20} color="#007AFF" />
            <Text style={styles.sectionTitle}>Quiet Hours</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Set times when you don't want to receive notifications
          </Text>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Configure quiet hours in your device notification settings for more control
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  saveButton: {
    padding: 8,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: '#64748b',
  },
  quietHoursHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  infoBox: {
    padding: 12,
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#93c5fd',
    marginTop: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
});
