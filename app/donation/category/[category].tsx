import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Heart, Target, Clock, Wallet, X, CreditCard, Smartphone, Building2 } from 'lucide-react-native';
import { supabase } from '../../../lib/supabase';

const { width } = Dimensions.get('window');

const CATEGORY_INFO = {
  infrastructure: {
    title: 'Infrastructure',
    description: 'Support the development of physical facilities and resources',
    color: '#4169E1',
    icon: '🏗️',
  },
  scholarships: {
    title: 'Scholarships',
    description: 'Help students access quality education through financial support',
    color: '#10B981',
    icon: '🎓',
  },
  research: {
    title: 'Research',
    description: 'Fund innovative research projects and academic excellence',
    color: '#8B5CF6',
    icon: '🔬',
  },
  community: {
    title: 'Community',
    description: 'Support community outreach and engagement programs',
    color: '#F59E0B',
    icon: '🤝',
  },
};

export default function CategoryCampaignsScreen() {
  const router = useRouter();
  const { category } = useLocalSearchParams();
  const pinInputRef = useRef<TextInput>(null);
  
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Donation modal states
  const [donateModalVisible, setDonateModalVisible] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [donationAmount, setDonationAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('mobile-money');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Payment method selections
  const [selectedMomoNetwork, setSelectedMomoNetwork] = useState<string>('');
  const [selectedCard, setSelectedCard] = useState<string>('');
  const [selectedBank, setSelectedBank] = useState<string>('');
  
  // Payment details
  const [momoPhone, setMomoPhone] = useState('');
  const [momoName, setMomoName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVV, setCardCVV] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  
  // PIN confirmation states
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [isPinVerifying, setIsPinVerifying] = useState(false);

  const categoryInfo = CATEGORY_INFO[category as keyof typeof CATEGORY_INFO] || CATEGORY_INFO.infrastructure;

  useEffect(() => {
    fetchCategoryCampaigns();
  }, [category]);

  const fetchCategoryCampaigns = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('status', 'active')
        .eq('category', category)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching campaigns:', error);
        return;
      }

      const transformedCampaigns = data?.map(campaign => ({
        id: campaign.id,
        title: campaign.title,
        description: campaign.description,
        target: `GH₵${campaign.target_amount.toLocaleString()}`,
        raised: `GH₵${campaign.raised_amount.toLocaleString()}`,
        progress: Math.min((campaign.raised_amount / campaign.target_amount) * 100, 100),
        daysLeft: Math.max(0, Math.ceil((new Date(campaign.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))),
        category: campaign.category,
        image: campaign.image_urls?.[0] || 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800',
        targetAmount: campaign.target_amount,
        raisedAmount: campaign.raised_amount,
      })) || [];

      setCampaigns(transformedCampaigns);
    } catch (error) {
      console.error('Error in fetchCategoryCampaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDonatePress = (campaign: any) => {
    setSelectedCampaign(campaign);
    setDonateModalVisible(true);
    setDonationAmount(null);
    setCustomAmount('');
    setPaymentMethod('mobile-money');
    setSelectedMomoNetwork('');
    setSelectedCard('');
    setSelectedBank('');
    setMomoPhone('');
    setMomoName('');
    setCardNumber('');
    setCardName('');
    setCardExpiry('');
    setCardCVV('');
    setAccountNumber('');
    setAccountName('');
  };

  const handleAmountSelect = (amount: number) => {
    setDonationAmount(amount);
    setCustomAmount('');
  };

  const handleConfirmDonation = async () => {
    const amount = donationAmount || parseFloat(customAmount);
    
    if (!amount || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please select or enter a valid donation amount');
      return;
    }

    // Validate payment method specific fields
    if (paymentMethod === 'mobile-money') {
      if (!selectedMomoNetwork) {
        Alert.alert('Network Required', 'Please select a mobile money network');
        return;
      }
      if (!momoPhone || momoPhone.length !== 10) {
        Alert.alert('Invalid Phone', 'Please enter a valid 10-digit phone number');
        return;
      }
      if (!momoName.trim()) {
        Alert.alert('Name Required', 'Please enter the account holder name');
        return;
      }
    } else if (paymentMethod === 'card') {
      if (!selectedCard) {
        Alert.alert('Card Required', 'Please select a card type');
        return;
      }
      if (!cardNumber || cardNumber.replace(/\s/g, '').length !== 16) {
        Alert.alert('Invalid Card', 'Please enter a valid 16-digit card number');
        return;
      }
      if (!cardName.trim()) {
        Alert.alert('Name Required', 'Please enter the cardholder name');
        return;
      }
      if (!cardExpiry || !cardExpiry.match(/^\d{2}\/\d{2}$/)) {
        Alert.alert('Invalid Expiry', 'Please enter expiry in MM/YY format');
        return;
      }
      if (!cardCVV || cardCVV.length !== 3) {
        Alert.alert('Invalid CVV', 'Please enter a valid 3-digit CVV');
        return;
      }
    } else if (paymentMethod === 'bank') {
      if (!selectedBank) {
        Alert.alert('Bank Required', 'Please select a bank');
        return;
      }
      if (!accountNumber.trim()) {
        Alert.alert('Account Required', 'Please enter your account number');
        return;
      }
      if (!accountName.trim()) {
        Alert.alert('Name Required', 'Please enter the account holder name');
        return;
      }
      
      // Show PIN modal for bank transfers
      setShowPinModal(true);
      return;
    }

    await processDonation();
  };

  const handlePinConfirm = async () => {
    if (pinCode.length !== 6) {
      Alert.alert('Invalid PIN', 'Please enter your 6-digit PIN');
      return;
    }

    setIsPinVerifying(true);
    
    // Simulate PIN verification
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsPinVerifying(false);
    setShowPinModal(false);
    setPinCode('');
    
    await processDonation();
  };

  const handlePinCancel = () => {
    setShowPinModal(false);
    setPinCode('');
  };

  const processDonation = async () => {
    const amount = donationAmount || parseFloat(customAmount);
    setIsSubmitting(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Get donor name and email
      let donorName = 'Anonymous';
      let donorEmail = null;
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          donorName = profile.full_name || user.email?.split('@')[0] || 'Anonymous';
          donorEmail = profile.email || user.email;
        } else {
          donorName = user.email?.split('@')[0] || 'Anonymous';
          donorEmail = user.email;
        }
      } else if (paymentMethod === 'mobile-money' && momoName) {
        donorName = momoName;
        donorEmail = momoPhone ? `${momoPhone}@mobile.donor` : null;
      }

      const { data, error } = await supabase
        .from('donations')
        .insert({
          user_id: user?.id || null,
          campaign_id: selectedCampaign.id,
          campaign_title: selectedCampaign.title,
          amount: amount,
          payment_method: paymentMethod,
          status: 'completed',
          donor_name: donorName,
          donor_email: donorEmail,
        })
        .select()
        .single();

      if (error) throw error;

      // Update campaign raised amount - fetch current amount first
      const { data: currentCampaign } = await supabase
        .from('campaigns')
        .select('raised_amount')
        .eq('id', selectedCampaign.id)
        .single();

      if (currentCampaign) {
        const newRaisedAmount = Number(currentCampaign.raised_amount) + amount;
        await supabase
          .from('campaigns')
          .update({ 
            raised_amount: newRaisedAmount 
          })
          .eq('id', selectedCampaign.id);
      }

      setDonateModalVisible(false);
      Alert.alert(
        'Thank You! 🎉',
        `Your donation of GH₵${amount} has been successfully processed.`,
        [{ 
          text: 'OK', 
          onPress: () => {
            fetchCategoryCampaigns(); // Refresh campaigns
          }
        }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to process donation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\s/g, '');
    const chunks = cleaned.match(/.{1,4}/g);
    return chunks ? chunks.join(' ') : cleaned;
  };

  const formatExpiry = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
    }
    return cleaned;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: categoryInfo.color }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.categoryIcon}>{categoryInfo.icon}</Text>
          <Text style={styles.headerTitle}>{categoryInfo.title}</Text>
          <Text style={styles.headerDescription}>{categoryInfo.description}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={categoryInfo.color} />
          <Text style={styles.loadingText}>Loading campaigns...</Text>
        </View>
      ) : campaigns.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>No Campaigns Yet</Text>
          <Text style={styles.emptyText}>
            There are no active campaigns in this category at the moment.
          </Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.campaignsGrid}>
            {campaigns.map((campaign) => (
              <View key={campaign.id} style={styles.campaignCard}>
                <Image source={{ uri: campaign.image }} style={styles.campaignImage} />
                <View style={styles.campaignContent}>
                  <Text style={styles.campaignTitle}>{campaign.title}</Text>
                  <Text style={styles.campaignDescription}>{campaign.description}</Text>
                  <View style={styles.progressContainer}>
                    <View style={[styles.progressBar, { 
                      width: `${campaign.progress}%`,
                      backgroundColor: categoryInfo.color 
                    }]} />
                  </View>
                  <View style={styles.campaignStats}>
                    <View style={styles.statItem}>
                      <Wallet size={16} color="#666666" />
                      <Text style={styles.statText}>{campaign.raised} raised</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Target size={16} color="#666666" />
                      <Text style={styles.statText}>Goal: {campaign.target}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Clock size={16} color="#666666" />
                      <Text style={styles.statText}>{campaign.daysLeft} days left</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={[styles.donateButton, { backgroundColor: categoryInfo.color }]}
                    onPress={() => handleDonatePress(campaign)}
                    activeOpacity={0.7}
                  >
                    <Heart size={16} color="#FFFFFF" />
                    <Text style={styles.donateButtonText}>Donate Now</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Donation Modal */}
      <Modal
        visible={donateModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDonateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.donateModalContent}>
            <View style={styles.donateModalHeader}>
              <Text style={styles.donateModalTitle}>Make a Donation</Text>
              <TouchableOpacity onPress={() => setDonateModalVisible(false)}>
                <X size={24} color="#000000" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              showsVerticalScrollIndicator={false}
              style={styles.donateModalScroll}
            >
              {selectedCampaign && (
                <View style={styles.campaignPreview}>
                  <Heart size={20} color="#FF6B6B" />
                  <Text style={styles.campaignPreviewText}>{selectedCampaign.title}</Text>
                </View>
              )}

              <Text style={styles.donateLabel}>Select Amount</Text>
              <View style={styles.amountGrid}>
                {[50, 100, 500, 1000].map((amount) => (
                  <TouchableOpacity
                    key={amount}
                    style={[
                      styles.amountButton,
                      donationAmount === amount && styles.amountButtonActive
                    ]}
                    onPress={() => handleAmountSelect(amount)}
                  >
                    <Text style={[
                      styles.amountButtonText,
                      donationAmount === amount && styles.amountButtonTextActive
                    ]}>
                      GH₵{amount}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.donateLabel}>Or Enter Custom Amount</Text>
              <View style={styles.customAmountContainer}>
                <Text style={styles.currencySymbol}>GH₵</Text>
                <TextInput
                  style={styles.customAmountInput}
                  placeholder="0"
                  keyboardType="numeric"
                  value={customAmount}
                  onChangeText={(text) => {
                    setCustomAmount(text);
                    setDonationAmount(null);
                  }}
                />
              </View>

              <Text style={styles.donateLabel}>Payment Method</Text>
              <View style={styles.paymentMethods}>
                <TouchableOpacity
                  style={[
                    styles.paymentMethod,
                    paymentMethod === 'mobile-money' && styles.paymentMethodActive
                  ]}
                  onPress={() => setPaymentMethod('mobile-money')}
                >
                  <Smartphone size={20} color={paymentMethod === 'mobile-money' ? '#4169E1' : '#666666'} />
                  <Text style={[
                    styles.paymentMethodText,
                    paymentMethod === 'mobile-money' && styles.paymentMethodTextActive
                  ]}>
                    Mobile Money
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.paymentMethod,
                    paymentMethod === 'card' && styles.paymentMethodActive
                  ]}
                  onPress={() => setPaymentMethod('card')}
                >
                  <CreditCard size={20} color={paymentMethod === 'card' ? '#4169E1' : '#666666'} />
                  <Text style={[
                    styles.paymentMethodText,
                    paymentMethod === 'card' && styles.paymentMethodTextActive
                  ]}>
                    Card
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.paymentMethod,
                    paymentMethod === 'bank' && styles.paymentMethodActive
                  ]}
                  onPress={() => setPaymentMethod('bank')}
                >
                  <Building2 size={20} color={paymentMethod === 'bank' ? '#4169E1' : '#666666'} />
                  <Text style={[
                    styles.paymentMethodText,
                    paymentMethod === 'bank' && styles.paymentMethodTextActive
                  ]}>
                    Bank Transfer
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Mobile Money Details */}
              {paymentMethod === 'mobile-money' && (
                <View style={styles.paymentDetails}>
                  <Text style={styles.detailLabel}>Select Network</Text>
                  <View style={styles.networkGrid}>
                    {['MTN', 'Vodafone', 'AirtelTigo'].map((network) => (
                      <TouchableOpacity
                        key={network}
                        style={[
                          styles.networkButton,
                          selectedMomoNetwork === network && styles.networkButtonActive
                        ]}
                        onPress={() => setSelectedMomoNetwork(network)}
                      >
                        <Text style={[
                          styles.networkText,
                          selectedMomoNetwork === network && styles.networkTextActive
                        ]}>
                          {network}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.detailLabel}>Phone Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0XXXXXXXXX"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={momoPhone}
                    onChangeText={setMomoPhone}
                  />

                  <Text style={styles.detailLabel}>Account Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter account holder name"
                    value={momoName}
                    onChangeText={setMomoName}
                  />
                </View>
              )}

              {/* Card Details */}
              {paymentMethod === 'card' && (
                <View style={styles.paymentDetails}>
                  <Text style={styles.detailLabel}>Card Type</Text>
                  <View style={styles.networkGrid}>
                    {['Visa', 'Mastercard', 'Amex'].map((card) => (
                      <TouchableOpacity
                        key={card}
                        style={[
                          styles.networkButton,
                          selectedCard === card && styles.networkButtonActive
                        ]}
                        onPress={() => setSelectedCard(card)}
                      >
                        <Text style={[
                          styles.networkText,
                          selectedCard === card && styles.networkTextActive
                        ]}>
                          {card}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.detailLabel}>Card Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="1234 5678 9012 3456"
                    keyboardType="numeric"
                    maxLength={19}
                    value={cardNumber}
                    onChangeText={(text) => setCardNumber(formatCardNumber(text))}
                  />

                  <Text style={styles.detailLabel}>Cardholder Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter name on card"
                    value={cardName}
                    onChangeText={setCardName}
                  />

                  <View style={styles.cardRow}>
                    <View style={styles.cardField}>
                      <Text style={styles.detailLabel}>Expiry Date</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="MM/YY"
                        keyboardType="numeric"
                        maxLength={5}
                        value={cardExpiry}
                        onChangeText={(text) => setCardExpiry(formatExpiry(text))}
                      />
                    </View>
                    <View style={styles.cardField}>
                      <Text style={styles.detailLabel}>CVV</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="123"
                        keyboardType="numeric"
                        maxLength={3}
                        secureTextEntry
                        value={cardCVV}
                        onChangeText={setCardCVV}
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* Bank Transfer Details */}
              {paymentMethod === 'bank' && (
                <View style={styles.paymentDetails}>
                  <Text style={styles.detailLabel}>Select Bank</Text>
                  <View style={styles.networkGrid}>
                    {['GCB', 'Ecobank', 'Stanbic'].map((bank) => (
                      <TouchableOpacity
                        key={bank}
                        style={[
                          styles.networkButton,
                          selectedBank === bank && styles.networkButtonActive
                        ]}
                        onPress={() => setSelectedBank(bank)}
                      >
                        <Text style={[
                          styles.networkText,
                          selectedBank === bank && styles.networkTextActive
                        ]}>
                          {bank}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.detailLabel}>Account Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter account number"
                    keyboardType="numeric"
                    value={accountNumber}
                    onChangeText={setAccountNumber}
                  />

                  <Text style={styles.detailLabel}>Account Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter account holder name"
                    value={accountName}
                    onChangeText={setAccountName}
                  />
                </View>
              )}

              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleConfirmDonation}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmButtonText}>Confirm Donation</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* PIN Confirmation Modal */}
      <Modal
        visible={showPinModal}
        transparent
        animationType="fade"
        onRequestClose={handlePinCancel}
      >
        <View style={styles.pinModalOverlay}>
          <View style={styles.pinModalContent}>
            <Text style={styles.pinModalTitle}>Enter PIN</Text>
            <Text style={styles.pinModalSubtitle}>
              Please enter your 6-digit PIN to confirm the transaction
            </Text>

            <View style={styles.pinDotsContainer}>
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.pinDot,
                    pinCode.length > index && styles.pinDotFilled
                  ]}
                  onPress={() => pinInputRef.current?.focus()}
                  activeOpacity={0.7}
                >
                  {pinCode.length > index && <View style={styles.pinDotInner} />}
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              ref={pinInputRef}
              style={styles.hiddenPinInput}
              value={pinCode}
              onChangeText={setPinCode}
              keyboardType="numeric"
              maxLength={6}
              secureTextEntry
              autoFocus
            />

            <View style={styles.pinModalButtons}>
              <TouchableOpacity
                style={styles.pinCancelButton}
                onPress={handlePinCancel}
                disabled={isPinVerifying}
              >
                <Text style={styles.pinCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.pinConfirmButton}
                onPress={handlePinConfirm}
                disabled={pinCode.length !== 6 || isPinVerifying}
              >
                {isPinVerifying ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.pinConfirmButtonText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerContent: {
    alignItems: 'center',
    gap: 8,
  },
  categoryIcon: {
    fontSize: 48,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  headerDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#333333',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
  content: {
    flex: 1,
  },
  campaignsGrid: {
    padding: 16,
    gap: 16,
  },
  campaignCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  campaignImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#E5E7EB',
  },
  campaignContent: {
    padding: 16,
    gap: 12,
  },
  campaignTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  campaignDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
  },
  progressContainer: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  campaignStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  donateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  donateButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  donateModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  donateModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  donateModalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  donateModalScroll: {
    padding: 20,
  },
  campaignPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    marginBottom: 20,
  },
  campaignPreviewText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  donateLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 12,
    marginTop: 8,
  },
  amountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  amountButton: {
    flex: 1,
    minWidth: (width - 64) / 2,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  amountButtonActive: {
    borderColor: '#4169E1',
    backgroundColor: '#EEF2FF',
  },
  amountButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  amountButtonTextActive: {
    color: '#4169E1',
  },
  customAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  currencySymbol: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    marginRight: 8,
  },
  customAmountInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  paymentMethods: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  paymentMethod: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  paymentMethodActive: {
    borderColor: '#4169E1',
    backgroundColor: '#EEF2FF',
  },
  paymentMethodText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  paymentMethodTextActive: {
    color: '#4169E1',
  },
  paymentDetails: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 8,
  },
  networkGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  networkButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  networkButtonActive: {
    borderColor: '#4169E1',
    backgroundColor: '#EEF2FF',
  },
  networkText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  networkTextActive: {
    color: '#4169E1',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#1F2937',
    marginBottom: 16,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cardField: {
    flex: 1,
  },
  confirmButton: {
    backgroundColor: '#4169E1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  pinModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pinModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  pinModalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  pinModalSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  pinDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 32,
  },
  pinDot: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinDotFilled: {
    borderColor: '#4169E1',
    backgroundColor: '#EEF2FF',
  },
  pinDotInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4169E1',
  },
  hiddenPinInput: {
    position: 'absolute',
    opacity: 0,
    height: 1,
    width: 1,
  },
  pinModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  pinCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  pinCancelButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  pinConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#4169E1',
    alignItems: 'center',
  },
  pinConfirmButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});
