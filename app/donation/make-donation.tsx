import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  StatusBar as RNStatusBar,
  Switch,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { debouncedRouter } from '@/utils/navigationDebounce';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  ChevronLeft, 
  Upload,
  DollarSign,
  FileText,
  Camera,
  X,
  CheckCircle,
  AlertCircle,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Campaign {
  id: string;
  title: string;
  category: string;
}

const PAYMENT_METHODS = [
  { id: 'bank_transfer', label: 'Bank Transfer' },
  { id: 'mobile_money', label: 'Mobile Money' },
  { id: 'card', label: 'Card Payment' },
  { id: 'cash', label: 'Cash' },
];

export default function MakeDonationScreen() {
  const { campaignId, campaignTitle } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>(
    typeof campaignId === 'string' ? campaignId : ''
  );
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('mobile_money');
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [donorMessage, setDonorMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchCampaigns();
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'We need camera roll permissions to upload payment receipts.'
      );
    }
  };

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('donation_campaigns')
        .select('id, title, category')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets[0]) {
        setReceiptUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'We need camera permissions to take photos of receipts.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets[0]) {
        setReceiptUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Upload Receipt',
      'Choose how to upload your payment receipt',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Library', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const uploadReceipt = async (uri: string): Promise<string> => {
    try {
      setUploading(true);

      // Get file extension
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user?.id}_${Date.now()}.${fileExt}`;
      const filePath = `donation-receipts/${fileName}`;

      // Convert to blob
      const response = await fetch(uri);
      const blob = await response.blob();

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('donation-proofs')
        .upload(filePath, blob, {
          contentType: `image/${fileExt}`,
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('donation-proofs')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading receipt:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!selectedCampaign) {
      Alert.alert('Required', 'Please select a campaign');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Required', 'Please enter a valid donation amount');
      return;
    }

    if (!receiptUri) {
      Alert.alert('Required', 'Please upload your payment receipt');
      return;
    }

    try {
      setLoading(true);

      // Upload receipt
      const receiptUrl = await uploadReceipt(receiptUri);

      // Create donation record
      const { error: donationError } = await supabase
        .from('donations')
        .insert({
          user_id: user?.id,
          campaign_id: selectedCampaign,
          amount: parseFloat(amount),
          currency: 'GHS',
          payment_method: paymentMethod,
          payment_proof_url: receiptUrl,
          is_anonymous: isAnonymous,
          donor_message: donorMessage.trim() || null,
          status: 'pending',
        });

      if (donationError) throw donationError;

      Alert.alert(
        'Success! 🎉',
        'Your donation has been submitted and is pending admin approval. Thank you for supporting Achimota School!',
        [
          {
            text: 'View My Donations',
            onPress: () => debouncedRouter.replace('/donation/my-donations'),
          },
          {
            text: 'Back to Home',
            onPress: () => debouncedRouter.replace('/donation'),
          },
        ]
      );
    } catch (error) {
      console.error('Error submitting donation:', error);
      Alert.alert('Error', 'Failed to submit donation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const quickAmounts = [50, 100, 250, 500, 1000, 5000];

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
          <Text style={styles.headerTitle}>Make a Donation</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <AlertCircle size={20} color="#ffc857" />
          <Text style={styles.infoBannerText}>
            Your donation will be reviewed by our admin team before being approved.
          </Text>
        </View>

        {/* Select Campaign */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Campaign *</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.campaignScroll}
          >
            {campaigns.map((campaign) => (
              <TouchableOpacity
                key={campaign.id}
                style={[
                  styles.campaignChip,
                  selectedCampaign === campaign.id && styles.campaignChipActive,
                ]}
                onPress={() => setSelectedCampaign(campaign.id)}
              >
                <Text
                  style={[
                    styles.campaignChipText,
                    selectedCampaign === campaign.id && styles.campaignChipTextActive,
                  ]}
                  numberOfLines={2}
                >
                  {campaign.title}
                </Text>
                {selectedCampaign === campaign.id && (
                  <CheckCircle size={16} color="#ffc857" style={{ marginTop: 4 }} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Amount */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Donation Amount (GH₵) *</Text>
          
          {/* Quick Amount Buttons */}
          <View style={styles.quickAmounts}>
            {quickAmounts.map((quickAmount) => (
              <TouchableOpacity
                key={quickAmount}
                style={[
                  styles.quickAmountButton,
                  amount === quickAmount.toString() && styles.quickAmountButtonActive,
                ]}
                onPress={() => setAmount(quickAmount.toString())}
              >
                <Text
                  style={[
                    styles.quickAmountText,
                    amount === quickAmount.toString() && styles.quickAmountTextActive,
                  ]}
                >
                  {quickAmount}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom Amount Input */}
          <View style={styles.inputContainer}>
            <DollarSign size={20} color="#64748B" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter custom amount"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method *</Text>
          {PAYMENT_METHODS.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.paymentMethodCard,
                paymentMethod === method.id && styles.paymentMethodCardActive,
              ]}
              onPress={() => setPaymentMethod(method.id)}
            >
              <View
                style={[
                  styles.radio,
                  paymentMethod === method.id && styles.radioActive,
                ]}
              >
                {paymentMethod === method.id && <View style={styles.radioInner} />}
              </View>
              <Text
                style={[
                  styles.paymentMethodText,
                  paymentMethod === method.id && styles.paymentMethodTextActive,
                ]}
              >
                {method.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Payment Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Instructions</Text>
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsTitle}>Bank Transfer</Text>
            <Text style={styles.instructionsText}>Bank: GCB Bank Limited</Text>
            <Text style={styles.instructionsText}>Account: 1234567890</Text>
            <Text style={styles.instructionsText}>Name: Achimota School Alumni</Text>
            
            <View style={styles.instructionsDivider} />
            
            <Text style={styles.instructionsTitle}>Mobile Money</Text>
            <Text style={styles.instructionsText}>MTN MoMo: 0244-123-4567</Text>
            <Text style={styles.instructionsText}>Vodafone: 0204-123-4567</Text>
          </View>
        </View>

        {/* Upload Receipt */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Receipt/Proof *</Text>
          
          {receiptUri ? (
            <View style={styles.receiptPreview}>
              <Image source={{ uri: receiptUri }} style={styles.receiptImage} />
              <TouchableOpacity
                style={styles.removeReceiptButton}
                onPress={() => setReceiptUri(null)}
              >
                <X size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={showImageOptions}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="#ffc857" />
              ) : (
                <>
                  <View style={styles.uploadIconContainer}>
                    <Upload size={32} color="#ffc857" />
                  </View>
                  <Text style={styles.uploadText}>Upload Payment Receipt</Text>
                  <Text style={styles.uploadSubtext}>
                    Take a photo or choose from gallery
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Anonymous Toggle */}
        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleTitle}>Donate Anonymously</Text>
              <Text style={styles.toggleSubtext}>
                Your name won't appear in the donor list
              </Text>
            </View>
            <Switch
              value={isAnonymous}
              onValueChange={setIsAnonymous}
              trackColor={{ false: '#CBD5E1', true: '#ffc857' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Optional Message */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Message (Optional)</Text>
          <TextInput
            style={styles.messageInput}
            placeholder="Share why you're supporting this campaign..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            value={donorMessage}
            onChangeText={setDonorMessage}
            maxLength={500}
          />
          <Text style={styles.charCount}>{donorMessage.length}/500</Text>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.submitButtonContainer}>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={loading ? ['#94A3B8', '#CBD5E1'] : ['#ffc857', '#f59e0b']}
            style={styles.submitButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <FileText size={22} color="#0F172A" />
                <Text style={styles.submitButtonText}>Submit Donation</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ffc857',
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  campaignScroll: {
    marginHorizontal: -4,
  },
  campaignChip: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 4,
    minWidth: 180,
    maxWidth: 220,
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  campaignChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#ffc857',
  },
  campaignChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  campaignChipTextActive: {
    color: '#FFFFFF',
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  quickAmountButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickAmountButtonActive: {
    backgroundColor: '#FFF9E6',
    borderColor: '#ffc857',
  },
  quickAmountText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  quickAmountTextActive: {
    color: '#ffc857',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#0F172A',
    paddingVertical: 14,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  paymentMethodCardActive: {
    backgroundColor: '#FFF9E6',
    borderColor: '#ffc857',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioActive: {
    borderColor: '#ffc857',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ffc857',
  },
  paymentMethodText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  paymentMethodTextActive: {
    color: '#0F172A',
  },
  instructionsCard: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  instructionsText: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
  },
  instructionsDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  uploadButton: {
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#ffc857',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  uploadIconContainer: {
    marginBottom: 12,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  uploadSubtext: {
    fontSize: 13,
    color: '#64748B',
  },
  receiptPreview: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  receiptImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  removeReceiptButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#EF4444',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  toggleSubtext: {
    fontSize: 13,
    color: '#64748B',
  },
  messageInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    fontSize: 15,
    color: '#0F172A',
    minHeight: 100,
  },
  charCount: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'right',
    marginTop: 6,
  },
  submitButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 20 : 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
});
