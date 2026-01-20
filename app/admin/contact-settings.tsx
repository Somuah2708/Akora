import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, Save, MapPin, Mail, Phone, Clock, Loader2 } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface ContactSettings {
  id: string;
  email: string;
  phone: string;
  address: string;
  latitude: number;
  longitude: number;
  office_hours: {
    weekdays: string;
    weekends: string;
  };
}

export default function ContactSettingsScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);
  
  const [settings, setSettings] = useState<ContactSettings>({
    id: '',
    email: '',
    phone: '',
    address: '',
    latitude: 0,
    longitude: 0,
    office_hours: {
      weekdays: '',
      weekends: '',
    },
  });

  useEffect(() => {
    // Wait for profile to load
    if (!profile && user) {
      return; // Still loading profile
    }

    // Check if user is admin
    if (profile && profile.role !== 'admin') {
      Alert.alert('Access Denied', 'Only admins can access this page');
      debouncedRouter.back();
      return;
    }
    
    // If we have a profile and it's admin, proceed
    if (profile && profile.role === 'admin') {
      setAccessChecked(true);
      fetchSettings();
    }
  }, [profile, user]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('app_contact_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;

      if (data) {
        setSettings({
          id: data.id,
          email: data.email,
          phone: data.phone,
          address: data.address,
          latitude: data.latitude || 0,
          longitude: data.longitude || 0,
          office_hours: data.office_hours || { weekdays: '', weekends: '' },
        });
      }
    } catch (error: any) {
      console.error('Error fetching contact settings:', error);
      Alert.alert('Error', 'Failed to load contact settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!settings.email || !settings.phone || !settings.address) {
      Alert.alert('Validation Error', 'Email, phone, and address are required');
      return;
    }

    if (!settings.office_hours.weekdays) {
      Alert.alert('Validation Error', 'Weekday office hours are required');
      return;
    }

    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('app_contact_settings')
        .update({
          email: settings.email,
          phone: settings.phone,
          address: settings.address,
          latitude: settings.latitude,
          longitude: settings.longitude,
          office_hours: settings.office_hours,
          updated_at: new Date().toISOString(),
          updated_by: user?.id,
        })
        .eq('id', settings.id);

      if (error) throw error;

      Alert.alert('Success', 'Contact settings updated successfully', [
        {
          text: 'OK',
          onPress: () => debouncedRouter.back(),
        },
      ]);
    } catch (error: any) {
      console.error('Error saving contact settings:', error);
      Alert.alert('Error', 'Failed to save contact settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0F172A" />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  if (!accessChecked) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0F172A" />
        <Text style={styles.loadingText}>Verifying access...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1a1a1a" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Settings</Text>
        <TouchableOpacity 
          onPress={handleSave} 
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          disabled={saving}
        >
          {saving ? (
            <Loader2 size={20} color="#FFFFFF" strokeWidth={2.5} />
          ) : (
            <Save size={20} color="#FFFFFF" strokeWidth={2.5} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Email Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Mail size={20} color="#4169E1" strokeWidth={2} />
            <Text style={styles.sectionTitle}>Email Address</Text>
          </View>
          <TextInput
            style={styles.input}
            value={settings.email}
            onChangeText={(text) => setSettings({ ...settings, email: text })}
            placeholder="info@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Phone Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Phone size={20} color="#4169E1" strokeWidth={2} />
            <Text style={styles.sectionTitle}>Phone Number</Text>
          </View>
          <TextInput
            style={styles.input}
            value={settings.phone}
            onChangeText={(text) => setSettings({ ...settings, phone: text })}
            placeholder="+233 XX XXX XXXX"
            keyboardType="phone-pad"
          />
        </View>

        {/* Address Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MapPin size={20} color="#4169E1" strokeWidth={2} />
            <Text style={styles.sectionTitle}>Physical Address</Text>
          </View>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={settings.address}
            onChangeText={(text) => setSettings({ ...settings, address: text })}
            placeholder="Enter physical address"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* GPS Coordinates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>GPS Coordinates</Text>
          <Text style={styles.sectionSubtitle}>
            Used for opening location in maps app
          </Text>
          <View style={styles.coordinatesRow}>
            <View style={styles.coordinateInput}>
              <Text style={styles.coordinateLabel}>Latitude</Text>
              <TextInput
                style={styles.input}
                value={settings.latitude.toString()}
                onChangeText={(text) => setSettings({ ...settings, latitude: parseFloat(text) || 0 })}
                placeholder="5.6037"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.coordinateInput}>
              <Text style={styles.coordinateLabel}>Longitude</Text>
              <TextInput
                style={styles.input}
                value={settings.longitude.toString()}
                onChangeText={(text) => setSettings({ ...settings, longitude: parseFloat(text) || 0 })}
                placeholder="-0.1870"
                keyboardType="numeric"
              />
            </View>
          </View>
          <Text style={styles.helpText}>
            💡 Tip: Use Google Maps to find accurate coordinates
          </Text>
        </View>

        {/* Office Hours */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock size={20} color="#4169E1" strokeWidth={2} />
            <Text style={styles.sectionTitle}>Office Hours</Text>
          </View>
          
          <Text style={styles.inputLabel}>Weekdays (Required)</Text>
          <TextInput
            style={styles.input}
            value={settings.office_hours.weekdays}
            onChangeText={(text) => setSettings({ 
              ...settings, 
              office_hours: { ...settings.office_hours, weekdays: text } 
            })}
            placeholder="Mon - Fri: 8:00 AM - 5:00 PM"
          />

          <Text style={[styles.inputLabel, { marginTop: 16 }]}>Weekends (Optional)</Text>
          <TextInput
            style={styles.input}
            value={settings.office_hours.weekends}
            onChangeText={(text) => setSettings({ 
              ...settings, 
              office_hours: { ...settings.office_hours, weekends: text } 
            })}
            placeholder="Sat: 9:00 AM - 1:00 PM (Leave empty if closed)"
          />
        </View>

        {/* Preview Section */}
        <View style={styles.previewSection}>
          <Text style={styles.previewTitle}>Preview</Text>
          <View style={styles.previewCard}>
            <View style={styles.previewItem}>
              <Mail size={16} color="#6b7280" strokeWidth={2} />
              <Text style={styles.previewText}>{settings.email || 'No email set'}</Text>
            </View>
            <View style={styles.previewItem}>
              <Phone size={16} color="#6b7280" strokeWidth={2} />
              <Text style={styles.previewText}>{settings.phone || 'No phone set'}</Text>
            </View>
            <View style={styles.previewItem}>
              <MapPin size={16} color="#6b7280" strokeWidth={2} />
              <Text style={styles.previewText}>{settings.address || 'No address set'}</Text>
            </View>
            <View style={styles.previewItem}>
              <Clock size={16} color="#6b7280" strokeWidth={2} />
              <Text style={styles.previewText}>
                {settings.office_hours.weekdays || 'No hours set'}
                {settings.office_hours.weekends ? `\n${settings.office_hours.weekends}` : ''}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
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
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1a1a1a',
  },
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4169E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#1a1a1a',
    marginLeft: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6b7280',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#1a1a1a',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  coordinatesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  coordinateInput: {
    flex: 1,
  },
  coordinateLabel: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#6b7280',
    marginBottom: 8,
  },
  helpText: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6b7280',
    fontStyle: 'italic',
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    marginBottom: 8,
  },
  previewSection: {
    marginTop: 12,
    marginBottom: 20,
  },
  previewTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  previewText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    lineHeight: 20,
  },
  bottomSpacer: {
    height: 40,
  },
});
