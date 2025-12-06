import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, Save, DollarSign, FileText, Award, Smartphone, Building2, Clock } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

type ConfigItem = {
  id: string;
  config_key: string;
  config_value: string;
  description?: string;
  updated_at?: string;
};

const DEFAULT_CONFIGS = [
  { key: 'transcript_official_price', label: 'Official Transcript Price (GHS)', description: 'Price for official transcript requests', defaultValue: '50', category: 'pricing' },
  { key: 'transcript_unofficial_price', label: 'Unofficial Transcript Price (GHS)', description: 'Price for unofficial transcript requests', defaultValue: '0', category: 'pricing' },
  { key: 'wassce_certificate_price', label: 'WASSCE Certificate Price (GHS)', description: 'Price for WASSCE certificate requests', defaultValue: '40', category: 'pricing' },
  { key: 'proficiency_test_price', label: 'Proficiency Test Price (GHS)', description: 'Price for proficiency test requests', defaultValue: '35', category: 'pricing' },
  { key: 'recommendation_price', label: 'Recommendation Price (GHS)', description: 'Price for recommendation letter requests', defaultValue: '0', category: 'pricing' },
  { key: 'momo_number', label: 'Mobile Money Number', description: 'Mobile Money number for receiving payments', defaultValue: '0241234567', category: 'payment' },
  { key: 'momo_name', label: 'Mobile Money Account Name', description: 'Name registered on Mobile Money account', defaultValue: 'School Bursar', category: 'payment' },
  { key: 'momo_network', label: 'Mobile Money Network', description: 'Network provider (MTN, Vodafone, AirtelTigo)', defaultValue: 'MTN', category: 'payment' },
  { key: 'bank_name', label: 'Bank Name', description: 'Name of the bank for transfers', defaultValue: 'GCB Bank', category: 'payment' },
  { key: 'bank_account_number', label: 'Bank Account Number', description: 'Account number for bank transfers', defaultValue: '1234567890', category: 'payment' },
  { key: 'bank_account_name', label: 'Bank Account Name', description: 'Name on the bank account', defaultValue: 'School Account', category: 'payment' },
  { key: 'bank_branch', label: 'Bank Branch', description: 'Bank branch location', defaultValue: 'Accra Main Branch', category: 'payment' },
  { key: 'payment_instructions', label: 'Payment Instructions', description: 'Instructions shown to users for payment', defaultValue: 'Send payment via Mobile Money or Bank Transfer. Upload proof after payment.', category: 'instructions' },
  { key: 'processing_time_transcript', label: 'Transcript Processing Time', description: 'Expected processing time for transcripts', defaultValue: '3-5 business days', category: 'processing' },
  { key: 'processing_time_wassce', label: 'WASSCE Processing Time', description: 'Expected processing time for WASSCE certificates', defaultValue: '3-5 business days', category: 'processing' },
  { key: 'processing_time_proficiency', label: 'Proficiency Test Processing Time', description: 'Expected processing time for proficiency tests', defaultValue: '2-3 business days', category: 'processing' },
  { key: 'admin_email', label: 'Admin Contact Email', description: 'Email for urgent inquiries', defaultValue: 'admin@school.edu', category: 'contact' },
  { key: 'admin_phone', label: 'Admin Contact Phone', description: 'Phone number for urgent inquiries', defaultValue: '+233XXXXXXXXX', category: 'contact' },
];

export default function AdminSettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configs, setConfigs] = useState<Record<string, string>>({});

  useEffect(() => {
    async function checkAdminAndLoad() {
      if (!user) return;
      
      // Check admin status
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      const userRole = profile?.role ?? null;
      setRole(userRole);

      if (userRole !== 'admin' && userRole !== 'staff') {
        Alert.alert('Access Denied', 'Admin access required');
        debouncedRouter.back();
        return;
      }

      // Load existing configs
      await loadConfigs();
    }

    checkAdminAndLoad();
  }, [user]);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      
      // Check if config table exists, if not, use defaults
      const { data, error } = await supabase
        .from('admin_configs')
        .select('*');

      if (error) {
        console.log('Config table not found, using defaults:', error);
        // Initialize with defaults
        const defaults: Record<string, string> = {};
        DEFAULT_CONFIGS.forEach(cfg => {
          defaults[cfg.key] = cfg.defaultValue;
        });
        setConfigs(defaults);
      } else {
        const configMap: Record<string, string> = {};
        (data as ConfigItem[]).forEach(item => {
          configMap[item.config_key] = item.config_value;
        });
        
        // Fill in any missing with defaults
        DEFAULT_CONFIGS.forEach(cfg => {
          if (!configMap[cfg.key]) {
            configMap[cfg.key] = cfg.defaultValue;
          }
        });
        
        setConfigs(configMap);
      }
    } catch (err) {
      console.error('Error loading configs:', err);
      Alert.alert('Error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (key: string, value: string) => {
    try {
      setSaving(true);
      
      // Upsert config
      const { error } = await supabase
        .from('admin_configs')
        .upsert(
          { 
            config_key: key, 
            config_value: value,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'config_key' }
        );

      if (error) throw error;
      
      Alert.alert('Success', 'Setting saved successfully');
    } catch (err) {
      console.error('Error saving config:', err);
      Alert.alert('Error', 'Failed to save setting. The config table may not exist yet.');
    } finally {
      setSaving(false);
    }
  };

  const saveAllConfigs = async () => {
    try {
      setSaving(true);
      
      const configEntries = Object.entries(configs).map(([key, value]) => ({
        config_key: key,
        config_value: value,
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('admin_configs')
        .upsert(configEntries, { onConflict: 'config_key' });

      if (error) throw error;
      
      Alert.alert('Success', 'All settings saved successfully');
    } catch (err) {
      console.error('Error saving configs:', err);
      Alert.alert('Setup Required', 'Please run the admin_configs table migration first. Check the console for SQL script.');
      console.log(`
-- CREATE ADMIN CONFIGS TABLE
CREATE TABLE IF NOT EXISTS admin_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT UNIQUE NOT NULL,
  config_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies for admin_configs
ALTER TABLE admin_configs ENABLE ROW LEVEL SECURITY;

-- Admins can read all configs
CREATE POLICY "admin_configs_select" ON admin_configs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
        AND (p.is_admin = true OR p.role = 'admin' OR p.role = 'staff')
    )
  );

-- Admins can insert/update configs
CREATE POLICY "admin_configs_insert" ON admin_configs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
        AND (p.is_admin = true OR p.role = 'admin' OR p.role = 'staff')
    )
  );

CREATE POLICY "admin_configs_update" ON admin_configs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
        AND (p.is_admin = true OR p.role = 'admin' OR p.role = 'staff')
    )
  );
      `);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4169E1" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Admin Settings</Text>
          <Text style={styles.subtitle}>Configure pricing and instructions</Text>
        </View>
        <TouchableOpacity 
          style={[styles.saveAllButton, saving && { opacity: 0.6 }]}
          onPress={saveAllConfigs}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Save size={18} color="#fff" />
              <Text style={styles.saveAllText}>Save All</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Pricing Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <DollarSign size={20} color="#4169E1" />
            <Text style={styles.sectionTitle}>Pricing</Text>
          </View>
          
          {DEFAULT_CONFIGS.filter(cfg => cfg.category === 'pricing').map(cfg => (
            <View key={cfg.key} style={styles.configItem}>
              <Text style={styles.configLabel}>{cfg.label}</Text>
              {cfg.description && (
                <Text style={styles.configDescription}>{cfg.description}</Text>
              )}
              <View style={styles.inputRow}>
                <View style={styles.inputWrapper}>
                  <Text style={styles.currencyLabel}>GHS</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    value={configs[cfg.key] || cfg.defaultValue}
                    onChangeText={(value) => setConfigs({ ...configs, [cfg.key]: value })}
                  />
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Mobile Money Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Smartphone size={20} color="#059669" />
            <Text style={styles.sectionTitle}>Mobile Money Details</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            These details will be shown to users when making payments
          </Text>
          
          {DEFAULT_CONFIGS.filter(cfg => cfg.key.includes('momo_')).map(cfg => (
            <View key={cfg.key} style={styles.configItem}>
              <Text style={styles.configLabel}>{cfg.label}</Text>
              {cfg.description && (
                <Text style={styles.configDescription}>{cfg.description}</Text>
              )}
              <TextInput
                style={styles.textInput}
                placeholder={cfg.defaultValue}
                value={configs[cfg.key] || cfg.defaultValue}
                onChangeText={(value) => setConfigs({ ...configs, [cfg.key]: value })}
                keyboardType={cfg.key === 'momo_number' ? 'phone-pad' : 'default'}
              />
            </View>
          ))}
        </View>

        {/* Bank Account Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Building2 size={20} color="#8B5CF6" />
            <Text style={styles.sectionTitle}>Bank Account Details</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Bank transfer details shown to users as alternative payment method
          </Text>
          
          {DEFAULT_CONFIGS.filter(cfg => cfg.key.includes('bank_')).map(cfg => (
            <View key={cfg.key} style={styles.configItem}>
              <Text style={styles.configLabel}>{cfg.label}</Text>
              {cfg.description && (
                <Text style={styles.configDescription}>{cfg.description}</Text>
              )}
              <TextInput
                style={styles.textInput}
                placeholder={cfg.defaultValue}
                value={configs[cfg.key] || cfg.defaultValue}
                onChangeText={(value) => setConfigs({ ...configs, [cfg.key]: value })}
                keyboardType={cfg.key === 'bank_account_number' ? 'numeric' : 'default'}
              />
            </View>
          ))}
        </View>

        {/* Processing Time Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock size={20} color="#F59E0B" />
            <Text style={styles.sectionTitle}>Processing Times</Text>
          </View>
          
          {DEFAULT_CONFIGS.filter(cfg => cfg.category === 'processing').map(cfg => (
            <View key={cfg.key} style={styles.configItem}>
              <Text style={styles.configLabel}>{cfg.label}</Text>
              {cfg.description && (
                <Text style={styles.configDescription}>{cfg.description}</Text>
              )}
              <TextInput
                style={styles.textInput}
                placeholder={cfg.defaultValue}
                value={configs[cfg.key] || cfg.defaultValue}
                onChangeText={(value) => setConfigs({ ...configs, [cfg.key]: value })}
              />
            </View>
          ))}
        </View>

        {/* Contact Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Award size={20} color="#DC2626" />
            <Text style={styles.sectionTitle}>Admin Contact Information</Text>
          </View>
          
          {DEFAULT_CONFIGS.filter(cfg => cfg.category === 'contact').map(cfg => (
            <View key={cfg.key} style={styles.configItem}>
              <Text style={styles.configLabel}>{cfg.label}</Text>
              {cfg.description && (
                <Text style={styles.configDescription}>{cfg.description}</Text>
              )}
              <TextInput
                style={styles.textInput}
                placeholder={cfg.defaultValue}
                value={configs[cfg.key] || cfg.defaultValue}
                onChangeText={(value) => setConfigs({ ...configs, [cfg.key]: value })}
                keyboardType={cfg.key === 'admin_phone' ? 'phone-pad' : 'email-address'}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          ))}
        </View>

        {/* Instructions Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FileText size={20} color="#4169E1" />
            <Text style={styles.sectionTitle}>Payment Instructions</Text>
          </View>
          
          {DEFAULT_CONFIGS.filter(cfg => cfg.category === 'instructions').map(cfg => (
            <View key={cfg.key} style={styles.configItem}>
              <Text style={styles.configLabel}>{cfg.label}</Text>
              {cfg.description && (
                <Text style={styles.configDescription}>{cfg.description}</Text>
              )}
              <TextInput
                style={styles.textArea}
                placeholder={cfg.defaultValue}
                value={configs[cfg.key] || cfg.defaultValue}
                onChangeText={(value) => setConfigs({ ...configs, [cfg.key]: value })}
                multiline
                numberOfLines={4}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6'
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  backButton: {
    padding: 4
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827'
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2
  },
  saveAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#4169E1',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10
  },
  saveAllText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14
  },
  content: {
    flex: 1
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827'
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 18
  },
  configItem: {
    marginBottom: 20
  },
  configLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4
  },
  configDescription: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 8
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    paddingLeft: 12
  },
  currencyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginRight: 8
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    color: '#111827'
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    padding: 12,
    fontSize: 14,
    color: '#111827'
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    padding: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 100,
    textAlignVertical: 'top'
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
