import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar as RNStatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Save, DollarSign, CreditCard, Smartphone } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { debouncedRouter } from '@/utils/navigationDebounce';

interface PaymentSettings {
  // Bank Details
  bank_name: string;
  bank_account_name: string;
  bank_account_number: string;
  bank_branch: string;
  enable_bank_transfer: boolean;
  
  // Mobile Money - MTN
  mtn_number: string;
  mtn_name: string;
  enable_mtn: boolean;
  
  // Mobile Money - Vodafone
  vodafone_number: string;
  vodafone_name: string;
  enable_vodafone: boolean;
  
  // Mobile Money - AirtelTigo
  airteltigo_number: string;
  airteltigo_name: string;
  enable_airteltigo: boolean;
}

export default function PaymentSettingsScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PaymentSettings>({
    bank_name: '',
    bank_account_name: '',
    bank_account_number: '',
    bank_branch: '',
    enable_bank_transfer: true,
    mtn_number: '',
    mtn_name: '',
    enable_mtn: false,
    vodafone_number: '',
    vodafone_name: '',
    enable_vodafone: false,
    airteltigo_number: '',
    airteltigo_name: '',
    enable_airteltigo: false,
  });

  useEffect(() => {
    fetchPaymentSettings();
  }, []);

  const fetchPaymentSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('admin_configs')
        .select('config_key, config_value')
        .in('config_key', [
          'bank_name',
          'bank_account_name',
          'bank_account_number',
          'bank_branch',
          'enable_bank_transfer',
          'mtn_number',
          'mtn_name',
          'enable_mtn',
          'vodafone_number',
          'vodafone_name',
          'enable_vodafone',
          'airteltigo_number',
          'airteltigo_name',
          'enable_airteltigo',
        ]);

      if (error) throw error;

      const settingsObj: any = { ...settings };
      data?.forEach((item) => {
        if (item.config_key.startsWith('enable_')) {
          settingsObj[item.config_key] = item.config_value === 'true';
        } else {
          settingsObj[item.config_key] = item.config_value || '';
        }
      });

      setSettings(settingsObj);
    } catch (error: any) {
      console.error('Error fetching payment settings:', error);
      Alert.alert('Error', 'Failed to load payment settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Validate required fields for enabled payment methods
      if (settings.enable_bank_transfer) {
        if (!settings.bank_name || !settings.bank_account_name || !settings.bank_account_number) {
          Alert.alert('Validation Error', 'Please fill in all bank transfer details or disable bank transfer');
          return;
        }
      }

      if (settings.enable_mtn) {
        if (!settings.mtn_number || !settings.mtn_name) {
          Alert.alert('Validation Error', 'Please fill in all MTN MoMo details or disable MTN');
          return;
        }
      }

      if (settings.enable_vodafone) {
        if (!settings.vodafone_number || !settings.vodafone_name) {
          Alert.alert('Validation Error', 'Please fill in all Vodafone Cash details or disable Vodafone');
          return;
        }
      }

      if (settings.enable_airteltigo) {
        if (!settings.airteltigo_number || !settings.airteltigo_name) {
          Alert.alert('Validation Error', 'Please fill in all AirtelTigo Money details or disable AirtelTigo');
          return;
        }
      }

      // Check if at least one payment method is enabled
      if (!settings.enable_bank_transfer && !settings.enable_mtn && 
          !settings.enable_vodafone && !settings.enable_airteltigo) {
        Alert.alert('Validation Error', 'Please enable at least one payment method');
        return;
      }

      // Prepare upsert data
      const upsertData = Object.entries(settings).map(([key, value]) => ({
        config_key: key,
        config_value: typeof value === 'boolean' ? value.toString() : value,
        description: getConfigDescription(key),
      }));

      const { error } = await supabase
        .from('admin_configs')
        .upsert(upsertData, { onConflict: 'config_key' });

      if (error) throw error;

      Alert.alert('Success', 'Payment settings updated successfully!');
      debouncedRouter.back();
    } catch (error: any) {
      console.error('Error saving payment settings:', error);
      Alert.alert('Error', error.message || 'Failed to save payment settings');
    } finally {
      setSaving(false);
    }
  };

  const getConfigDescription = (key: string): string => {
    const descriptions: { [key: string]: string } = {
      bank_name: 'Bank name for transfers',
      bank_account_name: 'Name on bank account',
      bank_account_number: 'Bank account number',
      bank_branch: 'Bank branch location',
      enable_bank_transfer: 'Enable/disable bank transfer payments',
      mtn_number: 'MTN Mobile Money number',
      mtn_name: 'Name on MTN Mobile Money account',
      enable_mtn: 'Enable/disable MTN Mobile Money',
      vodafone_number: 'Vodafone Cash number',
      vodafone_name: 'Name on Vodafone Cash account',
      enable_vodafone: 'Enable/disable Vodafone Cash',
      airteltigo_number: 'AirtelTigo Money number',
      airteltigo_name: 'Name on AirtelTigo Money account',
      enable_airteltigo: 'Enable/disable AirtelTigo Money',
    };
    return descriptions[key] || '';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0F172A" />
          <Text style={styles.loadingText}>Loading payment settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <RNStatusBar barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient
        colors={['#0F172A', '#1E293B']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => debouncedRouter.back()}
          >
            <ChevronLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment Settings</Text>
          <View style={styles.headerButton} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Bank Transfer Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleRow}>
                <CreditCard size={20} color="#ffc857" />
                <Text style={styles.sectionTitle}>Bank Transfer</Text>
              </View>
              <Switch
                value={settings.enable_bank_transfer}
                onValueChange={(value) => setSettings({ ...settings, enable_bank_transfer: value })}
                trackColor={{ false: '#475569', true: '#ffc857' }}
                thumbColor="#FFFFFF"
              />
            </View>

            {settings.enable_bank_transfer && (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Bank Name *</Text>
                  <TextInput
                    style={styles.input}
                    value={settings.bank_name}
                    onChangeText={(text) => setSettings({ ...settings, bank_name: text })}
                    placeholder="e.g., GCB Bank Limited"
                    placeholderTextColor="#64748B"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Account Name *</Text>
                  <TextInput
                    style={styles.input}
                    value={settings.bank_account_name}
                    onChangeText={(text) => setSettings({ ...settings, bank_account_name: text })}
                    placeholder="e.g., Achimota School Alumni"
                    placeholderTextColor="#64748B"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Account Number *</Text>
                  <TextInput
                    style={styles.input}
                    value={settings.bank_account_number}
                    onChangeText={(text) => setSettings({ ...settings, bank_account_number: text })}
                    placeholder="e.g., 1234567890"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Branch (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={settings.bank_branch}
                    onChangeText={(text) => setSettings({ ...settings, bank_branch: text })}
                    placeholder="e.g., Accra Main Branch"
                    placeholderTextColor="#64748B"
                  />
                </View>
              </>
            )}
          </View>

          {/* MTN Mobile Money Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleRow}>
                <Smartphone size={20} color="#FFCB05" />
                <Text style={styles.sectionTitle}>MTN Mobile Money</Text>
              </View>
              <Switch
                value={settings.enable_mtn}
                onValueChange={(value) => setSettings({ ...settings, enable_mtn: value })}
                trackColor={{ false: '#475569', true: '#FFCB05' }}
                thumbColor="#FFFFFF"
              />
            </View>

            {settings.enable_mtn && (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>MTN Number *</Text>
                  <TextInput
                    style={styles.input}
                    value={settings.mtn_number}
                    onChangeText={(text) => setSettings({ ...settings, mtn_number: text })}
                    placeholder="e.g., 0244-123-4567"
                    placeholderTextColor="#64748B"
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Account Name *</Text>
                  <TextInput
                    style={styles.input}
                    value={settings.mtn_name}
                    onChangeText={(text) => setSettings({ ...settings, mtn_name: text })}
                    placeholder="e.g., John Doe"
                    placeholderTextColor="#64748B"
                  />
                </View>
              </>
            )}
          </View>

          {/* Vodafone Cash Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleRow}>
                <Smartphone size={20} color="#E60000" />
                <Text style={styles.sectionTitle}>Vodafone Cash</Text>
              </View>
              <Switch
                value={settings.enable_vodafone}
                onValueChange={(value) => setSettings({ ...settings, enable_vodafone: value })}
                trackColor={{ false: '#475569', true: '#E60000' }}
                thumbColor="#FFFFFF"
              />
            </View>

            {settings.enable_vodafone && (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Vodafone Number *</Text>
                  <TextInput
                    style={styles.input}
                    value={settings.vodafone_number}
                    onChangeText={(text) => setSettings({ ...settings, vodafone_number: text })}
                    placeholder="e.g., 0204-123-4567"
                    placeholderTextColor="#64748B"
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Account Name *</Text>
                  <TextInput
                    style={styles.input}
                    value={settings.vodafone_name}
                    onChangeText={(text) => setSettings({ ...settings, vodafone_name: text })}
                    placeholder="e.g., John Doe"
                    placeholderTextColor="#64748B"
                  />
                </View>
              </>
            )}
          </View>

          {/* AirtelTigo Money Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleRow}>
                <Smartphone size={20} color="#00A651" />
                <Text style={styles.sectionTitle}>AirtelTigo Money</Text>
              </View>
              <Switch
                value={settings.enable_airteltigo}
                onValueChange={(value) => setSettings({ ...settings, enable_airteltigo: value })}
                trackColor={{ false: '#475569', true: '#00A651' }}
                thumbColor="#FFFFFF"
              />
            </View>

            {settings.enable_airteltigo && (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>AirtelTigo Number *</Text>
                  <TextInput
                    style={styles.input}
                    value={settings.airteltigo_number}
                    onChangeText={(text) => setSettings({ ...settings, airteltigo_number: text })}
                    placeholder="e.g., 0277-123-4567"
                    placeholderTextColor="#64748B"
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Account Name *</Text>
                  <TextInput
                    style={styles.input}
                    value={settings.airteltigo_name}
                    onChangeText={(text) => setSettings({ ...settings, airteltigo_name: text })}
                    placeholder="e.g., John Doe"
                    placeholderTextColor="#64748B"
                  />
                </View>
              </>
            )}
          </View>

          <View style={styles.noteContainer}>
            <Text style={styles.noteText}>
              💡 Only enabled payment methods will be displayed to users in campaign details and donation screens.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#0F172A" />
          ) : (
            <>
              <Save size={20} color="#0F172A" />
              <Text style={styles.saveButtonText}>Save Payment Settings</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#0F172A',
  },
  noteContainer: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  noteText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  saveButton: {
    backgroundColor: '#ffc857',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#ffc857',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
});
