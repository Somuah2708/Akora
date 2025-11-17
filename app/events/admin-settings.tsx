import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Save, DollarSign, CreditCard, Smartphone } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface PackageSettings {
  basic_price: number;
  standard_price: number;
  priority_price: number;
  premium_price: number;
}

interface BankDetails {
  bank_name: string;
  account_name: string;
  account_number: string;
}

interface MoMoDetails {
  network: string;
  number: string;
  account_name: string;
}

export default function AdminSettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // Package Pricing
  const [basicPrice, setBasicPrice] = useState('0');
  const [standardPrice, setStandardPrice] = useState('50');
  const [priorityPrice, setPriorityPrice] = useState('150');
  const [premiumPrice, setPremiumPrice] = useState('300');

  // Bank Details
  const [bankName, setBankName] = useState('Access Bank');
  const [bankAccountName, setBankAccountName] = useState('Akora Events');
  const [bankAccountNumber, setBankAccountNumber] = useState('1234567890');

  // MoMo Details
  const [momoNetwork, setMomoNetwork] = useState('MTN');
  const [momoNumber, setMomoNumber] = useState('0244 123 456');
  const [momoAccountName, setMomoAccountName] = useState('Akora Events');

  // Debug: Log every render
  React.useEffect(() => {
    console.log('========================================');
    console.log('[AdminSettings] MOUNTED');
    console.log('[AdminSettings] user exists:', !!user);
    console.log('[AdminSettings] user.id:', user?.id);
    console.log('[AdminSettings] isAdmin:', isAdmin);
    console.log('========================================');
  }, []);

  useEffect(() => {
    if (user?.id) {
      checkAdminAccess();
    } else {
      const timeout = setTimeout(() => {
        if (!user?.id && isAdmin === null) {
          setIsAdmin(false);
          setLoading(false);
        }
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isAdmin === true) {
      loadSettings();
    }
  }, [isAdmin]);

  const checkAdminAccess = async () => {
    try {
      if (!user?.id) {
        console.log('[AdminSettings] Waiting for user to load...');
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      console.log('[AdminSettings] Checking admin access for user:', user.id);
      console.log('[AdminSettings] User email:', user.email);

      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin, role, username, full_name')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('[AdminSettings] Error fetching profile:', error);
        console.error('[AdminSettings] Error code:', error.code);
        console.error('[AdminSettings] Error message:', error.message);
        console.error('[AdminSettings] Error details:', error.details);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      console.log('[AdminSettings] Profile data:', JSON.stringify(data, null, 2));
      console.log('[AdminSettings] is_admin value:', data?.is_admin);
      console.log('[AdminSettings] is_admin type:', typeof data?.is_admin);
      console.log('[AdminSettings] role value:', data?.role);

      const admin = data?.is_admin === true || data?.role === 'admin' || data?.role === 'staff';
      
      console.log('[AdminSettings] Admin check result:', admin);
      console.log('[AdminSettings] Condition breakdown:');
      console.log('  - is_admin === true:', data?.is_admin === true);
      console.log('  - role === admin:', data?.role === 'admin');
      console.log('  - role === staff:', data?.role === 'staff');
      
      if (!admin) {
        console.log('[AdminSettings] ❌ User is NOT admin - denying access');
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      console.log('[AdminSettings] ✅ User IS admin - granting access');
      setIsAdmin(true);
      // Note: loading will be set to false after loadSettings completes
    } catch (error: any) {
      console.error('[AdminSettings] Exception in checkAdminAccess:', error);
      setIsAdmin(false);
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      console.log('[AdminSettings] Loading settings from database...');
      setLoading(true);

      // Load settings - get the specific settings row by ID
      const { data, error } = await supabase
        .from('event_settings')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .maybeSingle();

      console.log('[AdminSettings] Settings query result:', { data, error });

      if (error) {
        console.error('[AdminSettings] Error loading settings:', error);
        // Don't throw - just use defaults if no data exists
      }

      if (data) {
        console.log('[AdminSettings] Found settings, loading values...');
        // Load package prices
        if (data.basic_price !== undefined && data.basic_price !== null) {
          setBasicPrice(String(data.basic_price));
          console.log('[AdminSettings] Loaded basic_price:', data.basic_price);
        }
        if (data.standard_price !== undefined && data.standard_price !== null) {
          setStandardPrice(String(data.standard_price));
          console.log('[AdminSettings] Loaded standard_price:', data.standard_price);
        }
        if (data.priority_price !== undefined && data.priority_price !== null) {
          setPriorityPrice(String(data.priority_price));
          console.log('[AdminSettings] Loaded priority_price:', data.priority_price);
        }
        if (data.premium_price !== undefined && data.premium_price !== null) {
          setPremiumPrice(String(data.premium_price));
          console.log('[AdminSettings] Loaded premium_price:', data.premium_price);
        }

        // Load bank details
        if (data.bank_name) {
          setBankName(data.bank_name);
          console.log('[AdminSettings] Loaded bank_name:', data.bank_name);
        }
        if (data.bank_account_name) {
          setBankAccountName(data.bank_account_name);
          console.log('[AdminSettings] Loaded bank_account_name:', data.bank_account_name);
        }
        if (data.bank_account_number) {
          setBankAccountNumber(data.bank_account_number);
          console.log('[AdminSettings] Loaded bank_account_number:', data.bank_account_number);
        }

        // Load MoMo details
        if (data.momo_network) {
          setMomoNetwork(data.momo_network);
          console.log('[AdminSettings] Loaded momo_network:', data.momo_network);
        }
        if (data.momo_number) {
          setMomoNumber(data.momo_number);
          console.log('[AdminSettings] Loaded momo_number:', data.momo_number);
        }
        if (data.momo_account_name) {
          setMomoAccountName(data.momo_account_name);
          console.log('[AdminSettings] Loaded momo_account_name:', data.momo_account_name);
        }

        console.log('[AdminSettings] ✅ Settings loaded successfully');
      } else {
        console.log('[AdminSettings] No settings found in database, using defaults');
      }
    } catch (error: any) {
      console.error('[AdminSettings] Exception loading settings:', error);
      // Don't show alert - just use defaults
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);

      // Validate inputs
      const basic = parseFloat(basicPrice);
      const standard = parseFloat(standardPrice);
      const priority = parseFloat(priorityPrice);
      const premium = parseFloat(premiumPrice);

      if (isNaN(basic) || isNaN(standard) || isNaN(priority) || isNaN(premium)) {
        Alert.alert('Invalid Input', 'Please enter valid numbers for all package prices');
        return;
      }

      if (basic < 0 || standard < 0 || priority < 0 || premium < 0) {
        Alert.alert('Invalid Input', 'Prices cannot be negative');
        return;
      }

      if (!bankName.trim() || !bankAccountName.trim() || !bankAccountNumber.trim()) {
        Alert.alert('Invalid Input', 'Please fill in all bank details');
        return;
      }

      if (!momoNetwork.trim() || !momoNumber.trim() || !momoAccountName.trim()) {
        Alert.alert('Invalid Input', 'Please fill in all MoMo details');
        return;
      }

      const settingsId = '00000000-0000-0000-0000-000000000001';
      
      const settings = {
        id: settingsId,
        basic_price: basic,
        standard_price: standard,
        priority_price: priority,
        premium_price: premium,
        bank_name: bankName.trim(),
        bank_account_name: bankAccountName.trim(),
        bank_account_number: bankAccountNumber.trim(),
        momo_network: momoNetwork.trim(),
        momo_number: momoNumber.trim(),
        momo_account_name: momoAccountName.trim(),
        updated_at: new Date().toISOString(),
        updated_by: user?.id,
      };

      console.log('[AdminSettings] Saving settings:', settings);

      // Try to update, or insert if doesn't exist
      const { data: savedData, error: upsertError } = await supabase
        .from('event_settings')
        .upsert(settings, { onConflict: 'id' })
        .select()
        .single();

      if (upsertError) {
        console.error('[AdminSettings] Upsert error:', upsertError);
        throw upsertError;
      }

      console.log('[AdminSettings] ✅ Settings saved successfully:', savedData);

      Alert.alert('Success', 'Settings saved successfully', [
        {
          text: 'OK',
          onPress: () => {
            // Reload settings to verify save
            loadSettings();
          },
        },
      ]);
    } catch (error: any) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Show loading while checking admin status or loading settings
  if (isAdmin === null || (loading && isAdmin === true)) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#4169E1" />
        <Text style={styles.loadingText}>
          {isAdmin === null ? 'Verifying admin access...' : 'Loading settings...'}
        </Text>
      </View>
    );
  }

  // If not admin, show access denied screen
  if (isAdmin === false) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#EF4444', '#DC2626']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.title}>Access Denied</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
        
        <View style={[styles.centered, { flex: 1 }]}>
          <View style={styles.errorIcon}>
            <Text style={styles.errorIconText}>🔒</Text>
          </View>
          <Text style={styles.errorTitle}>Admin Access Required</Text>
          <Text style={styles.errorMessage}>
            You need administrator privileges to access this page.
          </Text>
          <Text style={[styles.errorMessage, { fontSize: 12, color: '#9CA3AF', marginTop: -20 }]}>
            Debug: User loaded, but not admin
          </Text>
          <TouchableOpacity
            style={styles.backToHomeButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backToHomeButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
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
            <Text style={styles.title}>Admin Settings</Text>
            <Text style={styles.subtitle}>Event Packages & Payment</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Package Pricing Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <DollarSign size={24} color="#4169E1" />
            <Text style={styles.sectionTitle}>Package Pricing (GHS)</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Set the listing fees for each event package tier
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Basic Package</Text>
            <TextInput
              style={styles.input}
              value={basicPrice}
              onChangeText={setBasicPrice}
              placeholder="0"
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Standard Package</Text>
            <TextInput
              style={styles.input}
              value={standardPrice}
              onChangeText={setStandardPrice}
              placeholder="50"
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Priority Package</Text>
            <TextInput
              style={styles.input}
              value={priorityPrice}
              onChangeText={setPriorityPrice}
              placeholder="150"
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Premium Package</Text>
            <TextInput
              style={styles.input}
              value={premiumPrice}
              onChangeText={setPremiumPrice}
              placeholder="300"
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        {/* Bank Details Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CreditCard size={24} color="#10B981" />
            <Text style={styles.sectionTitle}>Bank Transfer Details</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Users will see these details when making payments
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bank Name</Text>
            <TextInput
              style={styles.input}
              value={bankName}
              onChangeText={setBankName}
              placeholder="e.g., Access Bank"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Account Name</Text>
            <TextInput
              style={styles.input}
              value={bankAccountName}
              onChangeText={setBankAccountName}
              placeholder="e.g., Akora Events"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Account Number</Text>
            <TextInput
              style={styles.input}
              value={bankAccountNumber}
              onChangeText={setBankAccountNumber}
              placeholder="e.g., 1234567890"
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        {/* MoMo Details Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Smartphone size={24} color="#F59E0B" />
            <Text style={styles.sectionTitle}>Mobile Money (MoMo) Details</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Set up Mobile Money payment information
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Network</Text>
            <TextInput
              style={styles.input}
              value={momoNetwork}
              onChangeText={setMomoNetwork}
              placeholder="e.g., MTN, Vodafone, AirtelTigo"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>MoMo Number</Text>
            <TextInput
              style={styles.input}
              value={momoNumber}
              onChangeText={setMomoNumber}
              placeholder="e.g., 0244 123 456"
              keyboardType="phone-pad"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Account Name</Text>
            <TextInput
              style={styles.input}
              value={momoAccountName}
              onChangeText={setMomoAccountName}
              placeholder="e.g., Akora Events"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveSettings}
          disabled={saving}
        >
          <LinearGradient
            colors={['#10B981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveButtonGradient}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Save size={20} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Save All Settings</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
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
  headerGradient: {
    paddingTop: 48,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
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
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#E0E7FF',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginBottom: 0,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  saveButton: {
    margin: 16,
    marginTop: 24,
    marginBottom: 32,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  previewBanner: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FBBF24',
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  previewBannerText: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: '700',
  },
  errorIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  errorIconText: {
    fontSize: 64,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 32,
    lineHeight: 24,
  },
  backToHomeButton: {
    backgroundColor: '#4169E1',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  backToHomeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
