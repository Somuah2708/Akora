import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState, useRef } from 'react';
import { SplashScreen, useRouter } from 'expo-router';
import { ArrowLeft, Search, Heart, Wallet, Target, Clock, TrendingUp, X, Check, DollarSign, Building2 } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

SplashScreen.preventAutoHideAsync();

const MOBILE_MONEY_NETWORKS = [
  { id: 'mtn', name: 'MTN Mobile Money', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/MTN_Logo.svg/2560px-MTN_Logo.svg.png', color: '#FFCC00' },
  { id: 'vodafone', name: 'Vodafone Cash', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Vodafone_icon.svg/2048px-Vodafone_icon.svg.png', color: '#E60000' },
  { id: 'airteltigo', name: 'AirtelTigo Money', logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQGZ8bLYE4n0VG8XcXXRGKMxj4rXY4Zk9xgRQ&s', color: '#ED1C24' },
  { id: 'telecel', name: 'Telecel Cash', logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS_aTp3eYnxbZLfI8YhHk8jBUiTvz-8cZVKDw&s', color: '#0066CC' },
];

const CARD_OPTIONS = [
  { id: 'visa', name: 'Visa', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/2560px-Visa_Inc._logo.svg.png', color: '#1A1F71' },
  { id: 'mastercard', name: 'Mastercard', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/1280px-Mastercard-logo.svg.png', color: '#EB001B' },
  { id: 'verve', name: 'Verve', logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTXvzN0FQ0Bvp9QfHOzGqHbLhYfk8pqC7VVKQ&s', color: '#00425F' },
];

const BANK_OPTIONS = [
  { id: 'gcb', name: 'GCB Bank', logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRHqM_5-xQY5Z3bMPKKX8YLKjLZYqK7fZqYQw&s', color: '#006937' },
  { id: 'ecobank', name: 'Ecobank', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Ecobank_Logo.svg/2560px-Ecobank_Logo.svg.png', color: '#ED1C24' },
  { id: 'stanbic', name: 'Stanbic Bank', logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSiTDd5fBWvQVHAWgGJ_9EzSKg3vJXf0oZiHQ&s', color: '#0033A0' },
  { id: 'absa', name: 'Absa Bank', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Absa_Group_Limited_logo.svg/2560px-Absa_Group_Limited_logo.svg.png', color: '#DD0031' },
  { id: 'fidelity', name: 'Fidelity Bank', logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ3X8rGFzKZiYDZ5nZH7cqBVnR5FqYmr8K_gA&s', color: '#8B0000' },
  { id: 'cal', name: 'CAL Bank', logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTF8rGKnQHKqLZGQqP1R_mZqYBJXVZdZqYXKA&s', color: '#E30613' },
];

export default function AllCampaignsScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const pinInputRef = useRef<TextInput>(null);
  
  const [donateModalVisible, setDonateModalVisible] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [donationAmount, setDonationAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('mobile-money');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMomoNetwork, setSelectedMomoNetwork] = useState<string>('');
  const [selectedCard, setSelectedCard] = useState<string>('');
  const [selectedBank, setSelectedBank] = useState<string>('');
  
  // Payment details states
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

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching campaigns:', error);
        return;
      }

      // Transform data to match the expected format
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
        donors: 0, // You can add a donors count later if needed
      })) || [];

      setCampaigns(transformedCampaigns);
      setFilteredCampaigns(transformedCampaigns);
    } catch (error) {
      console.error('Error in fetchCampaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCampaigns(campaigns);
    } else {
      const filtered = campaigns.filter(campaign => 
        campaign.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        campaign.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        campaign.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCampaigns(filtered);
    }
  }, [searchQuery, campaigns]);

  const handleDonatePress = (campaign: any) => {
    setSelectedCampaign(campaign);
    setDonateModalVisible(true);
    setDonationAmount(null);
    setCustomAmount('');
    setPaymentMethod('mobile-money');
    setSelectedMomoNetwork('');
    setSelectedCard('');
    setSelectedBank('');
  };

  const handleAmountSelect = (amount: number) => {
    setDonationAmount(amount);
    setCustomAmount('');
  };

  const handleConfirmDonation = async () => {
    const finalAmount = donationAmount || parseFloat(customAmount);
    
    if (!finalAmount || finalAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please select or enter a valid donation amount');
      return;
    }

    if (paymentMethod === 'mobile-money' && !selectedMomoNetwork) {
      Alert.alert('Select Network', 'Please select a mobile money network');
      return;
    }

    if (paymentMethod === 'mobile-money' && selectedMomoNetwork) {
      if (!momoPhone || !momoName) {
        Alert.alert('Missing Details', 'Please enter your phone number and name for mobile money payment');
        return;
      }
      if (momoPhone.length !== 10) {
        Alert.alert('Invalid Phone', 'Please enter a valid 10-digit phone number');
        return;
      }
    }

    if (paymentMethod === 'card' && !selectedCard) {
      Alert.alert('Select Card', 'Please select a card type');
      return;
    }

    if (paymentMethod === 'card' && selectedCard) {
      if (!cardNumber || !cardName || !cardExpiry || !cardCVV) {
        Alert.alert('Missing Details', 'Please fill in all card details');
        return;
      }
      if (cardNumber.replace(/\s/g, '').length !== 16) {
        Alert.alert('Invalid Card', 'Please enter a valid 16-digit card number');
        return;
      }
      if (cardCVV.length !== 3) {
        Alert.alert('Invalid CVV', 'Please enter a valid 3-digit CVV');
        return;
      }
    }

    if (paymentMethod === 'bank' && !selectedBank) {
      Alert.alert('Select Bank', 'Please select a bank');
      return;
    }

    if (paymentMethod === 'bank' && selectedBank) {
      if (!accountNumber || !accountName) {
        Alert.alert('Missing Details', 'Please enter your account number and name');
        return;
      }
      // Show PIN confirmation modal for bank transfers
      setShowPinModal(true);
      return;
    }

    // For other payment methods, proceed directly
    await processDonation();
  };

  const handlePinConfirm = async () => {
    if (pinCode.length !== 6) {
      Alert.alert('Invalid PIN', 'Please enter a 6-digit PIN');
      return;
    }

    setIsPinVerifying(true);

    // Simulate PIN verification delay
    setTimeout(async () => {
      setIsPinVerifying(false);
      setShowPinModal(false);
      setPinCode('');
      
      // Process the donation after PIN confirmation
      await processDonation();
    }, 1500);
  };

  const handlePinCancel = () => {
    setShowPinModal(false);
    setPinCode('');
  };

  const processDonation = async () => {
    const finalAmount = donationAmount || parseFloat(customAmount);
    
    setIsSubmitting(true);

    try {
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
          amount: finalAmount,
          payment_method: paymentMethod,
          status: 'completed',
          donor_name: donorName,
          donor_email: donorEmail,
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving donation:', error);
        Alert.alert('Error', 'Failed to process your donation. Please try again.');
        return;
      }

      // Update campaign raised amount - fetch current amount first
      const { data: currentCampaign } = await supabase
        .from('campaigns')
        .select('raised_amount')
        .eq('id', selectedCampaign.id)
        .single();

      if (currentCampaign) {
        const newRaisedAmount = Number(currentCampaign.raised_amount) + finalAmount;
        await supabase
          .from('campaigns')
          .update({ 
            raised_amount: newRaisedAmount 
          })
          .eq('id', selectedCampaign.id);
      }

      setDonateModalVisible(false);
      
      let paymentMethodText = '';
      if (paymentMethod === 'mobile-money') {
        const networkName = MOBILE_MONEY_NETWORKS.find(n => n.id === selectedMomoNetwork)?.name;
        paymentMethodText = `Mobile Money${networkName ? ` (${networkName})` : ''}`;
      } else if (paymentMethod === 'card') {
        const cardName = CARD_OPTIONS.find(c => c.id === selectedCard)?.name;
        paymentMethodText = `Card${cardName ? ` (${cardName})` : ''}`;
      } else if (paymentMethod === 'bank') {
        const bankName = BANK_OPTIONS.find(b => b.id === selectedBank)?.name;
        paymentMethodText = `Bank Transfer${bankName ? ` (${bankName})` : ''}`;
      }
      
      Alert.alert(
        'Thank You! 🎉',
        `Your donation of GH₵${finalAmount.toLocaleString()} to "${selectedCampaign?.title}" has been recorded successfully!\n\nPayment Method: ${paymentMethodText}\n\nDonation ID: ${data.id}`,
        [{ text: 'OK', onPress: () => {
          setDonationAmount(null);
          setCustomAmount('');
          setSelectedMomoNetwork('');
          setSelectedCard('');
          setSelectedBank('');
          // Refresh campaigns to show updated amounts
          fetchCampaigns();
        }}]
      );
    } catch (error) {
      console.error('Unexpected error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.title}>All Campaigns</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#666666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search campaigns..."
            placeholderTextColor="#999999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4169E1" />
          <Text style={styles.loadingText}>Loading campaigns...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <TrendingUp size={20} color="#4169E1" />
              <Text style={styles.statText}>{filteredCampaigns.length} Active</Text>
            </View>
            <View style={styles.statItem}>
              <Heart size={20} color="#FF6B6B" />
              <Text style={styles.statText}>
                {filteredCampaigns.reduce((sum, c) => sum + (c.donors || 0), 0)} Donors
              </Text>
            </View>
          </View>

          {filteredCampaigns.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyTitle}>No Campaigns Found</Text>
              <Text style={styles.emptyText}>
                {searchQuery ? 'Try adjusting your search terms' : 'No campaigns available at the moment'}
              </Text>
            </View>
          ) : (
            <View style={styles.campaignsGrid}>
              {filteredCampaigns.map((campaign) => (
            <TouchableOpacity key={campaign.id} style={styles.campaignCard}>
              <Image source={{ uri: campaign.image }} style={styles.campaignImage} />
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{campaign.category}</Text>
              </View>
              <View style={styles.campaignContent}>
                <Text style={styles.campaignTitle}>{campaign.title}</Text>
                <Text style={styles.campaignDescription} numberOfLines={2}>
                  {campaign.description}
                </Text>
                
                <View style={styles.progressSection}>
                  <View style={styles.progressInfo}>
                    <Text style={styles.raisedAmount}>{campaign.raised}</Text>
                    <Text style={styles.targetAmount}>of {campaign.target}</Text>
                  </View>
                  <View style={styles.progressContainer}>
                    <View style={[styles.progressBar, { width: `${campaign.progress}%` }]} />
                  </View>
                  <Text style={styles.progressText}>{campaign.progress}% funded</Text>
                </View>

                <View style={styles.campaignFooter}>
                  <View style={styles.statGroup}>
                    <View style={styles.miniStat}>
                      <Heart size={14} color="#666666" />
                      <Text style={styles.miniStatText}>{campaign.donors}</Text>
                    </View>
                    <View style={styles.miniStat}>
                      <Clock size={14} color="#666666" />
                      <Text style={styles.miniStatText}>{campaign.daysLeft}d left</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.donateButton}
                    onPress={() => handleDonatePress(campaign)}
                  >
                    <Wallet size={16} color="#FFFFFF" />
                    <Text style={styles.donateButtonText}>Donate</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))}
            </View>
          )}
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

            <ScrollView showsVerticalScrollIndicator={false} style={styles.donateModalScroll}>
              {selectedCampaign && (
                <View style={styles.campaignPreview}>
                  <Heart size={20} color="#FF6B6B" />
                  <Text style={styles.campaignPreviewText}>{selectedCampaign.title}</Text>
                </View>
              )}

              <Text style={styles.donateLabel}>Select Amount</Text>
              <View style={styles.amountOptions}>
                {[50, 100, 500, 1000].map((amount) => (
                  <TouchableOpacity
                    key={amount}
                    style={[styles.amountButton, donationAmount === amount && styles.amountButtonActive]}
                    onPress={() => handleAmountSelect(amount)}
                  >
                    <Text style={[styles.amountButtonText, donationAmount === amount && styles.amountButtonTextActive]}>
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
                  style={[styles.paymentMethod, paymentMethod === 'mobile-money' && styles.paymentMethodActive]}
                  onPress={() => setPaymentMethod('mobile-money')}
                >
                  <DollarSign size={20} color={paymentMethod === 'mobile-money' ? '#4169E1' : '#666666'} />
                  <Text style={[styles.paymentMethodText, paymentMethod === 'mobile-money' && styles.paymentMethodTextActive]}>
                    Mobile Money
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.paymentMethod, paymentMethod === 'card' && styles.paymentMethodActive]}
                  onPress={() => setPaymentMethod('card')}
                >
                  <Wallet size={20} color={paymentMethod === 'card' ? '#4169E1' : '#666666'} />
                  <Text style={[styles.paymentMethodText, paymentMethod === 'card' && styles.paymentMethodTextActive]}>
                    Card
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.paymentMethod, paymentMethod === 'bank' && styles.paymentMethodActive]}
                  onPress={() => setPaymentMethod('bank')}
                >
                  <Building2 size={20} color={paymentMethod === 'bank' ? '#4169E1' : '#666666'} />
                  <Text style={[styles.paymentMethodText, paymentMethod === 'bank' && styles.paymentMethodTextActive]}>
                    Bank Transfer
                  </Text>
                </TouchableOpacity>
              </View>

              {paymentMethod === 'mobile-money' && (
                <View style={styles.momoNetworkSection}>
                  <Text style={styles.donateLabel}>Select Mobile Money Network</Text>
                  <View style={styles.momoNetworksGrid}>
                    {MOBILE_MONEY_NETWORKS.map((network) => (
                      <TouchableOpacity
                        key={network.id}
                        style={[styles.momoNetworkCard, selectedMomoNetwork === network.id && styles.momoNetworkCardActive]}
                        onPress={() => setSelectedMomoNetwork(network.id)}
                      >
                        <View style={[styles.momoNetworkLogo, { backgroundColor: network.color + '20' }]}>
                          <Image source={{ uri: network.logo }} style={styles.momoNetworkImage} resizeMode="contain" />
                        </View>
                        <Text style={[styles.momoNetworkName, selectedMomoNetwork === network.id && styles.momoNetworkNameActive]}>
                          {network.name}
                        </Text>
                        {selectedMomoNetwork === network.id && (
                          <View style={styles.momoNetworkCheck}>
                            <Check size={16} color="#4169E1" />
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {paymentMethod === 'card' && (
                <View style={styles.momoNetworkSection}>
                  <Text style={styles.donateLabel}>Select Card Type</Text>
                  <View style={styles.momoNetworksGrid}>
                    {CARD_OPTIONS.map((card) => (
                      <TouchableOpacity
                        key={card.id}
                        style={[styles.momoNetworkCard, selectedCard === card.id && styles.momoNetworkCardActive]}
                        onPress={() => setSelectedCard(card.id)}
                      >
                        <View style={[styles.momoNetworkLogo, { backgroundColor: card.color + '20' }]}>
                          <Image source={{ uri: card.logo }} style={styles.momoNetworkImage} resizeMode="contain" />
                        </View>
                        <Text style={[styles.momoNetworkName, selectedCard === card.id && styles.momoNetworkNameActive]}>
                          {card.name}
                        </Text>
                        {selectedCard === card.id && (
                          <View style={styles.momoNetworkCheck}>
                            <Check size={16} color="#4169E1" />
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {paymentMethod === 'bank' && (
                <View style={styles.momoNetworkSection}>
                  <Text style={styles.donateLabel}>Select Bank</Text>
                  <View style={styles.momoNetworksGrid}>
                    {BANK_OPTIONS.map((bank) => (
                      <TouchableOpacity
                        key={bank.id}
                        style={[styles.momoNetworkCard, selectedBank === bank.id && styles.momoNetworkCardActive]}
                        onPress={() => setSelectedBank(bank.id)}
                      >
                        <View style={[styles.momoNetworkLogo, { backgroundColor: bank.color + '20' }]}>
                          <Image source={{ uri: bank.logo }} style={styles.momoNetworkImage} resizeMode="contain" />
                        </View>
                        <Text style={[styles.momoNetworkName, selectedBank === bank.id && styles.momoNetworkNameActive]}>
                          {bank.name}
                        </Text>
                        {selectedBank === bank.id && (
                          <View style={styles.momoNetworkCheck}>
                            <Check size={16} color="#4169E1" />
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Mobile Money Payment Details */}
              {paymentMethod === 'mobile-money' && selectedMomoNetwork && (
                <View style={styles.paymentDetailsSection}>
                  <Text style={styles.donateLabel}>Enter Payment Details</Text>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Phone Number *</Text>
                    <TextInput
                      style={styles.paymentInput}
                      placeholder="0XX XXX XXXX"
                      placeholderTextColor="#999"
                      keyboardType="phone-pad"
                      maxLength={10}
                      value={momoPhone}
                      onChangeText={setMomoPhone}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Account Name *</Text>
                    <TextInput
                      style={styles.paymentInput}
                      placeholder="Enter your name as registered"
                      placeholderTextColor="#999"
                      value={momoName}
                      onChangeText={setMomoName}
                    />
                  </View>
                </View>
              )}

              {/* Card Payment Details */}
              {paymentMethod === 'card' && selectedCard && (
                <View style={styles.paymentDetailsSection}>
                  <Text style={styles.donateLabel}>Enter Card Details</Text>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Card Number *</Text>
                    <TextInput
                      style={styles.paymentInput}
                      placeholder="1234 5678 9012 3456"
                      placeholderTextColor="#999"
                      keyboardType="number-pad"
                      maxLength={19}
                      value={cardNumber}
                      onChangeText={(text) => {
                        const cleaned = text.replace(/\s/g, '');
                        const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
                        setCardNumber(formatted);
                      }}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Cardholder Name *</Text>
                    <TextInput
                      style={styles.paymentInput}
                      placeholder="Name on card"
                      placeholderTextColor="#999"
                      value={cardName}
                      onChangeText={setCardName}
                      autoCapitalize="words"
                    />
                  </View>

                  <View style={styles.inputRow}>
                    <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                      <Text style={styles.inputLabel}>Expiry Date *</Text>
                      <TextInput
                        style={styles.paymentInput}
                        placeholder="MM/YY"
                        placeholderTextColor="#999"
                        keyboardType="number-pad"
                        maxLength={5}
                        value={cardExpiry}
                        onChangeText={(text) => {
                          const cleaned = text.replace(/\//g, '');
                          if (cleaned.length >= 2) {
                            setCardExpiry(cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4));
                          } else {
                            setCardExpiry(cleaned);
                          }
                        }}
                      />
                    </View>

                    <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                      <Text style={styles.inputLabel}>CVV *</Text>
                      <TextInput
                        style={styles.paymentInput}
                        placeholder="123"
                        placeholderTextColor="#999"
                        keyboardType="number-pad"
                        maxLength={3}
                        value={cardCVV}
                        onChangeText={setCardCVV}
                        secureTextEntry
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* Bank Transfer Payment Details */}
              {paymentMethod === 'bank' && selectedBank && (
                <View style={styles.paymentDetailsSection}>
                  <Text style={styles.donateLabel}>Enter Bank Details</Text>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Account Number *</Text>
                    <TextInput
                      style={styles.paymentInput}
                      placeholder="Enter your account number"
                      placeholderTextColor="#999"
                      keyboardType="number-pad"
                      value={accountNumber}
                      onChangeText={setAccountNumber}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Account Holder Name *</Text>
                    <TextInput
                      style={styles.paymentInput}
                      placeholder="Enter account holder name"
                      placeholderTextColor="#999"
                      value={accountName}
                      onChangeText={setAccountName}
                      autoCapitalize="words"
                    />
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={[styles.confirmDonateButton, isSubmitting && styles.confirmDonateButtonDisabled]}
                onPress={handleConfirmDonation}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Heart size={20} color="#FFFFFF" />
                    <Text style={styles.confirmDonateButtonText}>
                      Donate {(donationAmount || parseFloat(customAmount) || 0) > 0 
                        ? `GH₵${(donationAmount || parseFloat(customAmount)).toLocaleString()}` 
                        : 'Now'}
                    </Text>
                  </>
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
          <View style={styles.pinModalContainer}>
            {/* Bank Logo */}
            {selectedBank && (
              <View style={styles.pinBankLogoContainer}>
                <Image
                  source={{ uri: BANK_OPTIONS.find(b => b.id === selectedBank)?.logo }}
                  style={styles.pinBankLogo}
                  resizeMode="contain"
                />
              </View>
            )}

            {/* Title */}
            <Text style={styles.pinModalTitle}>Confirm Transaction</Text>
            
            {/* Transaction Details */}
            <View style={styles.pinTransactionDetails}>
              <View style={styles.pinDetailRow}>
                <Text style={styles.pinDetailLabel}>Amount:</Text>
                <Text style={styles.pinDetailValue}>
                  GH₵{(donationAmount || parseFloat(customAmount) || 0).toLocaleString()}
                </Text>
              </View>
              <View style={styles.pinDetailRow}>
                <Text style={styles.pinDetailLabel}>Account:</Text>
                <Text style={styles.pinDetailValue}>{accountNumber}</Text>
              </View>
              <View style={styles.pinDetailRow}>
                <Text style={styles.pinDetailLabel}>Campaign:</Text>
                <Text style={[styles.pinDetailValue, styles.pinCampaignText]} numberOfLines={1}>
                  {selectedCampaign?.title}
                </Text>
              </View>
            </View>

            {/* PIN Input Instructions */}
            <Text style={styles.pinInstructions}>
              Tap below to enter your 6-digit PIN
            </Text>

            {/* PIN Input - Tappable */}
            <TouchableOpacity
              style={styles.pinInputContainer}
              onPress={() => pinInputRef.current?.focus()}
              activeOpacity={0.7}
            >
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <View
                  key={index}
                  style={[
                    styles.pinDot,
                    pinCode.length > index && styles.pinDotFilled
                  ]}
                >
                  {pinCode.length > index && (
                    <View style={styles.pinDotInner} />
                  )}
                </View>
              ))}
            </TouchableOpacity>

            {/* Hidden TextInput for PIN entry */}
            <TextInput
              ref={pinInputRef}
              style={styles.hiddenPinInput}
              value={pinCode}
              onChangeText={(text) => {
                if (/^\d*$/.test(text) && text.length <= 6) {
                  setPinCode(text);
                }
              }}
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
              autoFocus
            />

            {/* Action Buttons */}
            <View style={styles.pinButtonsContainer}>
              <TouchableOpacity
                style={[styles.pinButton, styles.pinCancelButton]}
                onPress={handlePinCancel}
                disabled={isPinVerifying}
              >
                <Text style={styles.pinCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pinButton, styles.pinConfirmButton]}
                onPress={handlePinConfirm}
                disabled={pinCode.length !== 6 || isPinVerifying}
              >
                {isPinVerifying ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.pinConfirmButtonText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Security Notice */}
            <Text style={styles.pinSecurityNotice}>
              🔒 Your PIN is secure and encrypted
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
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
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  campaignsGrid: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  campaignCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  campaignImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#F0F0F0',
  },
  categoryBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(65, 105, 225, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  campaignContent: {
    padding: 16,
  },
  campaignTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 8,
  },
  campaignDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 16,
    lineHeight: 20,
  },
  progressSection: {
    marginBottom: 16,
  },
  progressInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
    gap: 6,
  },
  raisedAmount: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  targetAmount: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  progressContainer: {
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4169E1',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  campaignFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  statGroup: {
    flexDirection: 'row',
    gap: 16,
  },
  miniStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniStatText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  donateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4169E1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  donateButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#999999',
    marginTop: 8,
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
    padding: 24,
    maxHeight: '90%',
  },
  donateModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  donateModalScroll: {
    flex: 1,
  },
  donateModalTitle: {
    fontSize: 22,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  campaignPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF4F4',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    gap: 10,
  },
  campaignPreviewText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    flex: 1,
  },
  donateLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 12,
  },
  amountOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  amountButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#F8F9FA',
    alignItems: 'center',
  },
  amountButtonActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#4169E1',
  },
  amountButtonText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
  },
  amountButtonTextActive: {
    color: '#4169E1',
  },
  customAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  currencySymbol: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
    marginRight: 8,
  },
  customAmountInput: {
    flex: 1,
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    paddingVertical: 16,
  },
  paymentMethods: {
    gap: 12,
    marginBottom: 24,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#F8F9FA',
    gap: 12,
  },
  paymentMethodActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#4169E1',
  },
  paymentMethodText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
  },
  paymentMethodTextActive: {
    color: '#4169E1',
  },
  momoNetworkSection: {
    marginBottom: 24,
  },
  momoNetworksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  momoNetworkCard: {
    width: '48%',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F8F9FA',
    position: 'relative',
  },
  momoNetworkCardActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#4169E1',
  },
  momoNetworkLogo: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  momoNetworkImage: {
    width: 45,
    height: 45,
  },
  momoNetworkName: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
    textAlign: 'center',
  },
  momoNetworkNameActive: {
    color: '#4169E1',
  },
  momoNetworkCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  confirmDonateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4169E1',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  confirmDonateButtonDisabled: {
    backgroundColor: '#A0A0A0',
    opacity: 0.6,
  },
  confirmDonateButtonText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  // Payment Details Input Styles
  paymentDetailsSection: {
    marginTop: 16,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#333333',
    marginBottom: 8,
  },
  paymentInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  // PIN Modal Styles
  pinModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pinModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  pinBankLogoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  pinBankLogo: {
    width: 60,
    height: 60,
  },
  pinModalTitle: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#1A1A1A',
    marginBottom: 20,
  },
  pinTransactionDetails: {
    width: '100%',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  pinDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pinDetailLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  pinDetailValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1A1A1A',
    flex: 1,
    textAlign: 'right',
  },
  pinCampaignText: {
    maxWidth: '70%',
  },
  pinInstructions: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 20,
    textAlign: 'center',
  },
  pinInputContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    gap: 12,
  },
  pinDot: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinDotFilled: {
    borderColor: '#4169E1',
    backgroundColor: '#E3F2FD',
  },
  pinDotInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4169E1',
  },
  hiddenPinInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  pinButtonsContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginBottom: 16,
  },
  pinButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinCancelButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  pinCancelButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
  },
  pinConfirmButton: {
    backgroundColor: '#4169E1',
  },
  pinConfirmButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  pinSecurityNotice: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#999999',
    textAlign: 'center',
  },
});
