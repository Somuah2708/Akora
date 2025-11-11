import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, TextInput, Dimensions, Modal, Alert, ActivityIndicator } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState, useRef } from 'react';
import { SplashScreen, useRouter } from 'expo-router';
import { ArrowLeft, Heart, Target, GraduationCap, Building2, Users, Wallet, ChevronRight, Bell, Gift, Sparkles, Trophy, Clock, Star, Check, X, Trash2, DollarSign, Plus, Upload, Calendar } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 48;

const DONATION_CATEGORIES = [
  {
    id: '1',
    title: 'Infrastructure',
    description: 'Campus buildings and facilities',
    icon: Building2,
    color: '#FFE4E4',
  },
  {
    id: '2',
    title: 'Scholarships',
    description: 'Student financial aid',
    icon: GraduationCap,
    color: '#E4EAFF',
  },
  {
    id: '3',
    title: 'Research',
    description: 'Academic research funding',
    icon: Target,
    color: '#E4FFF4',
  },
  {
    id: '4',
    title: 'Student Life',
    description: 'Campus activities and programs',
    icon: Users,
    color: '#FFF4E4',
  },
];

const RECENT_DONORS = [
  {
    id: '1',
    name: 'Sarah Wilson',
    amount: '$5,000',
    campaign: 'Science Lab Equipment',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=60',
  },
  {
    id: '2',
    name: 'Michael Chen',
    amount: '$2,500',
    campaign: 'Scholarship Fund',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=60',
  },
  {
    id: '3',
    name: 'Emma Thompson',
    amount: '$10,000',
    campaign: 'Library Resources',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&auto=format&fit=crop&q=60',
  },
];

const IMPACT_STATS = [
  {
    title: 'Total Raised',
    value: '$2.5M',
    icon: Wallet,
  },
  {
    title: 'Donors',
    value: '1,200+',
    icon: Users,
  },
  {
    title: 'Projects',
    value: '45',
    icon: Target,
  },
];

// Notification types
interface DonationNotification {
  id: string;
  type: 'update' | 'activity' | 'milestone';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  campaignId?: string;
  amount?: string;
}

// Sample notifications
const SAMPLE_NOTIFICATIONS: DonationNotification[] = [
  {
    id: '1',
    type: 'milestone',
    title: 'Science Lab Equipment Reached 70%!',
    message: 'The Science Lab Equipment campaign has reached 70% of its goal. Your contribution is making a difference!',
    timestamp: '2 hours ago',
    read: false,
    campaignId: '1',
  },
  {
    id: '2',
    type: 'activity',
    title: 'Thank You for Your $50 Donation',
    message: 'Your donation to Student Scholarship Fund has been received. You\'re helping students achieve their dreams!',
    timestamp: '1 day ago',
    read: false,
    amount: '$50',
  },
  {
    id: '3',
    type: 'update',
    title: 'New Campaign: Library Renovation',
    message: 'Check out our new fundraising campaign to renovate the school library with modern facilities.',
    timestamp: '2 days ago',
    read: true,
    campaignId: '3',
  },
  {
    id: '4',
    type: 'activity',
    title: 'Monthly Donation Processed',
    message: 'Your monthly donation of $25 to General Fund has been processed. Thank you for your continued support!',
    timestamp: '3 days ago',
    read: true,
    amount: '$25',
  },
  {
    id: '5',
    type: 'milestone',
    title: 'Scholarship Fund Fully Funded!',
    message: 'Amazing news! The Student Scholarship Fund has reached 100% of its goal thanks to donors like you!',
    timestamp: '1 week ago',
    read: true,
    campaignId: '2',
  },
];

const MOBILE_MONEY_NETWORKS = [
  {
    id: 'mtn',
    name: 'MTN Mobile Money',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/MTN_Logo.svg/2560px-MTN_Logo.svg.png',
    color: '#FFCC00',
  },
  {
    id: 'vodafone',
    name: 'Vodafone Cash',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Vodafone_icon.svg/2048px-Vodafone_icon.svg.png',
    color: '#E60000',
  },
  {
    id: 'airteltigo',
    name: 'AirtelTigo Money',
    logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQGZ8bLYE4n0VG8XcXXRGKMxj4rXY4Zk9xgRQ&s',
    color: '#ED1C24',
  },
  {
    id: 'telecel',
    name: 'Telecel Cash',
    logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS_aTp3eYnxbZLfI8YhHk8jBUiTvz-8cZVKDw&s',
    color: '#0066CC',
  },
];

const CARD_OPTIONS = [
  {
    id: 'visa',
    name: 'Visa',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/2560px-Visa_Inc._logo.svg.png',
    color: '#1A1F71',
  },
  {
    id: 'mastercard',
    name: 'Mastercard',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/1280px-Mastercard-logo.svg.png',
    color: '#EB001B',
  },
  {
    id: 'verve',
    name: 'Verve',
    logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTXvzN0FQ0Bvp9QfHOzGqHbLhYfk8pqC7VVKQ&s',
    color: '#00425F',
  },
];

const BANK_OPTIONS = [
  {
    id: 'gcb',
    name: 'GCB Bank',
    logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRHqM_5-xQY5Z3bMPKKX8YLKjLZYqK7fZqYQw&s',
    color: '#006937',
  },
  {
    id: 'ecobank',
    name: 'Ecobank',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Ecobank_Logo.svg/2560px-Ecobank_Logo.svg.png',
    color: '#ED1C24',
  },
  {
    id: 'stanbic',
    name: 'Stanbic Bank',
    logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSiTDd5fBWvQVHAWgGJ_9EzSKg3vJXf0oZiHQ&s',
    color: '#0033A0',
  },
  {
    id: 'absa',
    name: 'Absa Bank',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Absa_Group_Limited_logo.svg/2560px-Absa_Group_Limited_logo.svg.png',
    color: '#DD0031',
  },
  {
    id: 'fidelity',
    name: 'Fidelity Bank',
    logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ3X8rGFzKZiYDZ5nZH7cqBVnR5FqYmr8K_gA&s',
    color: '#8B0000',
  },
  {
    id: 'cal',
    name: 'CAL Bank',
    logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTF8rGKnQHKqLZGQqP1R_mZqYBJXVZdZqYXKA&s',
    color: '#E30613',
  },
];

export default function DonationScreen() {
  const router = useRouter();
  const [selectedAmount, setSelectedAmount] = useState<string>('');
  const pinInputRef = useRef<TextInput>(null);
  
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [notifications, setNotifications] = useState<DonationNotification[]>([]);
  const [donateModalVisible, setDonateModalVisible] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [donationAmount, setDonationAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('mobile-money');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMomoNetwork, setSelectedMomoNetwork] = useState<string>('');
  const [selectedCard, setSelectedCard] = useState<string>('');
  const [selectedBank, setSelectedBank] = useState<string>('');
  const [recognitionModalVisible, setRecognitionModalVisible] = useState(false);
  
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
  
  // Create Campaign states
  const [createCampaignModalVisible, setCreateCampaignModalVisible] = useState(false);
  const [campaignTitle, setCampaignTitle] = useState('');
  const [campaignDescription, setCampaignDescription] = useState('');
  const [campaignGoal, setCampaignGoal] = useState('');
  const [campaignCategory, setCampaignCategory] = useState('infrastructure');
  const [campaignEndDate, setCampaignEndDate] = useState('');
  const [campaignImages, setCampaignImages] = useState<string[]>([]);
  const [isSubmittingCampaign, setIsSubmittingCampaign] = useState(false);
  
  // Campaigns from database
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  
  // Donors from database
  const [recentDonors, setRecentDonors] = useState<any[]>([]);
  const [loadingDonors, setLoadingDonors] = useState(true);
  
  const [donationStats, setDonationStats] = useState({
    totalRaised: 0,
    totalDonors: 0,
    activeCampaigns: 3,
    impactScore: 0,
  });
  
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
    fetchDonationStats();
    fetchRecentDonors();
    fetchNotifications();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoadingCampaigns(true);
      console.log('🔍 Fetching campaigns from database...');
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching campaigns:', error);
        return;
      }

      console.log('📦 Campaigns fetched:', data?.length);
      if (data && data.length > 0) {
        console.log('💵 First campaign raised_amount:', data[0].raised_amount);
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
      })) || [];

      console.log('✅ Setting campaigns state with', transformedCampaigns.length, 'campaigns');
      setCampaigns(transformedCampaigns);
      setDonationStats(prev => ({
        ...prev,
        activeCampaigns: transformedCampaigns.length,
      }));
    } catch (error) {
      console.error('Error in fetchCampaigns:', error);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchRecentDonors = async () => {
    try {
      setLoadingDonors(true);
      const { data, error } = await supabase
        .from('donors')
        .select('*')
        .order('last_donation_date', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching donors:', error);
        return;
      }

      // Transform data to match the expected format
      const transformedDonors = data?.map(donor => ({
        id: donor.id,
        name: donor.name,
        amount: `GH₵${donor.total_donated.toLocaleString()}`,
        campaign: `${donor.donation_count} donation${donor.donation_count > 1 ? 's' : ''}`,
        image: donor.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=60',
        recognitionLevel: donor.recognition_level,
        isRecurring: donor.is_recurring_donor,
      })) || [];

      setRecentDonors(transformedDonors);
    } catch (error) {
      console.error('Error in fetchRecentDonors:', error);
    } finally {
      setLoadingDonors(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Fetch user's notifications if logged in, otherwise show general notifications
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .or(user ? `user_id.eq.${user.id},user_id.is.null` : 'user_id.is.null')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      // Transform to match DonationNotification interface
      const transformedNotifications: DonationNotification[] = data?.map(notif => ({
        id: notif.id,
        type: notif.type as 'update' | 'activity' | 'milestone',
        title: notif.title,
        message: notif.message,
        timestamp: formatTimestamp(notif.created_at),
        read: notif.read,
        campaignId: notif.campaign_id,
        amount: notif.amount ? `GH₵${notif.amount.toLocaleString()}` : undefined,
      })) || [];

      setNotifications(transformedNotifications);
    } catch (error) {
      console.error('Error in fetchNotifications:', error);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const fetchDonationStats = async () => {
    try {
      // Get total amount raised from campaigns
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('campaigns')
        .select('raised_amount');

      if (campaignsError) {
        console.error('Error fetching campaigns:', campaignsError);
      }

      const totalRaised = campaignsData?.reduce((sum, c) => sum + Number(c.raised_amount), 0) || 0;
      
      // Get total donors count from donors table
      const { count: donorsCount, error: donorsError } = await supabase
        .from('donors')
        .select('*', { count: 'exact', head: true });

      if (donorsError) {
        console.error('Error fetching donors count:', donorsError);
      }

      const totalDonors = donorsCount || 0;
      
      // Get active campaigns count
      const { count: activeCampaignsCount, error: activeCampaignsError } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      if (activeCampaignsError) {
        console.error('Error fetching active campaigns:', activeCampaignsError);
      }

      const activeCampaigns = activeCampaignsCount || 0;
      
      // Calculate impact score (total raised / 100)
      const impactScore = Math.floor(totalRaised / 100);

      setDonationStats({
        totalRaised,
        totalDonors,
        activeCampaigns,
        impactScore,
      });
    } catch (error) {
      console.error('Error in fetchDonationStats:', error);
    }
  };

  const getRecognitionColor = (level: string) => {
    switch (level) {
      case 'diamond': return '#B9F2FF';
      case 'platinum': return '#E5E4E2';
      case 'gold': return '#FFD700';
      case 'silver': return '#C0C0C0';
      case 'bronze': return '#CD7F32';
      default: return '#CCCCCC';
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to clear all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => setNotifications([])
        }
      ]
    );
  };

  const handleNotificationPress = (notification: DonationNotification) => {
    markAsRead(notification.id);
    setNotificationModalVisible(false);
    
    if (notification.campaignId) {
      Alert.alert('Campaign Details', `Opening campaign ${notification.campaignId}...`);
    } else {
      Alert.alert('Notification', notification.message);
    }
  };

  const handleDonatePress = async (campaign: any) => {
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to make a donation and track your giving history.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Sign In', 
            onPress: () => router.push('/auth/sign-in' as any)
          }
        ]
      );
      return;
    }

    setSelectedCampaign(campaign);
    setDonateModalVisible(true);
    setDonationAmount(null);
    setCustomAmount('');
    setPaymentMethod('mobile-money');
    setSelectedMomoNetwork('');
    setSelectedCard('');
    setSelectedBank('');
    // Reset payment details
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
      // Show MoMo account details instead of requesting user details
      const selectedNetworkName = MOBILE_MONEY_NETWORKS.find(n => n.id === selectedMomoNetwork)?.name || 'Mobile Money';
      
      Alert.alert(
        `${selectedNetworkName} Payment Details`,
        `Please send GH₵${finalAmount.toLocaleString()} to:\n\n📱 Mobile Money Number:\n0244 123 456\n\n👤 Account Name:\nOld Achimotan Association\n\nAfter completing the payment, your donation will be recorded.\n\nThank you for your generosity! 💚`,
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'I\'ve Sent Payment',
            onPress: () => processDonation()
          }
        ]
      );
      return;
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
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Get donor name and email
      let donorName = 'Anonymous';
      let donorEmail = null;
      
      if (user) {
        // Try to get user profile data
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

      // Insert donation into database
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

      console.log('✅ Donation saved:', data);
      console.log('💰 Donation amount:', finalAmount);
      console.log('🎯 Campaign ID:', selectedCampaign.id);
      console.log('📊 Current raised amount (before):', selectedCampaign.raisedAmount);
      
      // Calculate new amounts
      const newRaisedAmount = Number(selectedCampaign.raisedAmount || 0) + finalAmount;
      const newProgress = Math.min((newRaisedAmount / selectedCampaign.targetAmount) * 100, 100);
      
      console.log('🎯 New raised_amount will be:', newRaisedAmount);
      console.log('📊 New progress:', newProgress);
      
      // Update campaign raised_amount in database
      const { error: updateError } = await supabase
        .from('campaigns')
        .update({
          raised_amount: newRaisedAmount
        })
        .eq('id', selectedCampaign.id);

      if (updateError) {
        console.error('❌ Error updating campaign:', updateError);
        Alert.alert('Warning', 'Donation was saved but failed to update campaign total. Please refresh the page.');
      } else {
        console.log('✅ Campaign raised_amount updated successfully to:', newRaisedAmount);
        
        // Immediately update the UI with new amounts
        console.log('� Updating UI immediately');
        setCampaigns(prevCampaigns => 
          prevCampaigns.map(c => 
            c.id === selectedCampaign.id 
              ? {
                  ...c,
                  raisedAmount: newRaisedAmount,
                  raised: `GH₵${newRaisedAmount.toLocaleString()}`,
                  progress: newProgress
                }
              : c
          )
        );
        
        // Also update donation stats immediately
        setDonationStats(prev => ({
          ...prev,
          totalRaised: prev.totalRaised + finalAmount,
        }));
      }
      
      // Update or create donor record
      console.log('👤 Updating donor record...');
      if (user?.id) {
        // For authenticated users
        const { data: existingDonor, error: donorFetchError } = await supabase
          .from('donors')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (existingDonor) {
          // Update existing donor
          const { error: donorUpdateError } = await supabase
            .from('donors')
            .update({
              total_donated: Number(existingDonor.total_donated) + finalAmount,
              donation_count: existingDonor.donation_count + 1,
              last_donation_date: new Date().toISOString(),
            })
            .eq('user_id', user.id);

          if (donorUpdateError) {
            console.error('Error updating donor:', donorUpdateError);
          } else {
            console.log('✅ Donor record updated');
          }
        } else {
          // Create new donor record
          const { error: donorInsertError } = await supabase
            .from('donors')
            .insert({
              user_id: user.id,
              name: donorName,
              email: donorEmail,
              total_donated: finalAmount,
              donation_count: 1,
              last_donation_date: new Date().toISOString(),
              recognition_level: 'bronze',
              is_recurring_donor: false,
            });

          if (donorInsertError) {
            console.error('Error creating donor:', donorInsertError);
          } else {
            console.log('✅ New donor record created');
          }
        }
      }

      // Create donation notification
      console.log('📬 Creating donation notification...');
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: user?.id || null,
          type: 'activity',
          title: `Thank You for Your GH₵${finalAmount.toLocaleString()} Donation`,
          message: `Your donation to ${selectedCampaign.title} has been received. You're making a difference!`,
          campaign_id: selectedCampaign.id,
          amount: finalAmount,
          read: false,
        });

      if (notificationError) {
        console.error('Error creating notification:', notificationError);
      } else {
        console.log('✅ Notification created');
      }

      // Check for campaign milestones and create notifications
      const milestones = [25, 50, 75, 100];
      const oldProgress = Math.min((selectedCampaign.raisedAmount / selectedCampaign.targetAmount) * 100, 100);
      
      for (const milestone of milestones) {
        if (oldProgress < milestone && newProgress >= milestone) {
          console.log(`🎉 Campaign reached ${milestone}% milestone!`);
          const { error: milestoneError } = await supabase
            .from('notifications')
            .insert({
              user_id: user?.id || null,
              type: 'milestone',
              title: `${selectedCampaign.title} Reached ${milestone}%!`,
              message: milestone === 100 
                ? `Amazing! The ${selectedCampaign.title} campaign has been fully funded thanks to donors like you!`
                : `The ${selectedCampaign.title} campaign has reached ${milestone}% of its goal. Your contribution is making a difference!`,
              campaign_id: selectedCampaign.id,
              read: false,
            });

          if (milestoneError) {
            console.error('Error creating milestone notification:', milestoneError);
          }
        }
      }
      
      // Refresh all data in background to ensure consistency
      console.log('🔄 Refreshing all data in background...');
      fetchDonationStats();
      fetchCampaigns();
      fetchRecentDonors();
      console.log('✅ Background refresh initiated!');
      
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
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset modal state
              setDonationAmount(null);
              setCustomAmount('');
              setSelectedMomoNetwork('');
              setSelectedCard('');
              setSelectedBank('');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Unexpected error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photos to upload campaign images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 10,
    });

    if (!result.canceled && result.assets) {
      const newImages = result.assets.map(asset => asset.uri);
      setCampaignImages(prev => [...prev, ...newImages].slice(0, 10));
    }
  };

  const handleRemoveImage = (index: number) => {
    setCampaignImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitCampaign = async () => {
    console.log('=== Starting Campaign Submission ===');
    console.log('Title:', campaignTitle);
    console.log('Description:', campaignDescription);
    console.log('Goal:', campaignGoal);
    console.log('Category:', campaignCategory);
    console.log('End Date:', campaignEndDate);
    console.log('Images count:', campaignImages.length);
    
    if (!campaignTitle.trim()) {
      Alert.alert('Missing Title', 'Please enter a campaign title');
      return;
    }
    if (!campaignDescription.trim()) {
      Alert.alert('Missing Description', 'Please enter a campaign description');
      return;
    }
    if (!campaignGoal || parseFloat(campaignGoal) <= 0) {
      Alert.alert('Invalid Goal', 'Please enter a valid funding goal');
      return;
    }
    if (!campaignEndDate) {
      Alert.alert('Missing Date', 'Please enter an end date for the campaign');
      return;
    }
    
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(campaignEndDate)) {
      Alert.alert('Invalid Date Format', 'Please enter the date in YYYY-MM-DD format (e.g., 2025-12-31)');
      return;
    }
    
    // Validate date is in the future
    const endDate = new Date(campaignEndDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (isNaN(endDate.getTime())) {
      Alert.alert('Invalid Date', 'Please enter a valid date');
      return;
    }
    
    if (endDate <= today) {
      Alert.alert('Invalid Date', 'Campaign end date must be in the future');
      return;
    }
    
    // Validate date is not too far in the future (e.g., max 2 years)
    const twoYearsFromNow = new Date();
    twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);
    
    if (endDate > twoYearsFromNow) {
      Alert.alert('Invalid Date', 'Campaign end date cannot be more than 2 years in the future');
      return;
    }
    
    if (campaignImages.length === 0) {
      Alert.alert('Missing Images', 'Please add at least one image for your campaign');
      return;
    }

    setIsSubmittingCampaign(true);
    console.log('Validation passed, starting upload...');

    try {
      // Upload images to storage
      const imageUrls: string[] = [];
      
      for (const imageUri of campaignImages) {
        try {
          const response = await fetch(imageUri);
          const blob = await response.blob();
          const fileName = `campaign_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
          const filePath = `${fileName}`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('campaign-images')
            .upload(filePath, blob, {
              contentType: 'image/jpeg',
              upsert: false,
            });

          if (uploadError) {
            console.error('Upload error:', uploadError);
            throw uploadError;
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('campaign-images')
            .getPublicUrl(filePath);

          imageUrls.push(publicUrl);
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError);
          // Continue with other images
        }
      }

      if (imageUrls.length === 0) {
        Alert.alert('Upload Failed', 'Could not upload any images. Please try again.');
        setIsSubmittingCampaign(false);
        return;
      }

      console.log('Images uploaded successfully:', imageUrls.length);
      console.log('Inserting campaign into database...');

      // Insert campaign into database
      const campaignData = {
        title: campaignTitle.trim(),
        description: campaignDescription.trim(),
        target_amount: parseFloat(campaignGoal),
        raised_amount: 0,
        category: campaignCategory.toLowerCase(),
        end_date: campaignEndDate,
        image_urls: imageUrls,
        status: 'active',
      };
      
      console.log('Campaign data:', campaignData);

      const { data, error } = await supabase
        .from('campaigns')
        .insert(campaignData)
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log('Campaign created successfully:', data);
      setCreateCampaignModalVisible(false);
      
      // Reset form
      setCampaignTitle('');
      setCampaignDescription('');
      setCampaignGoal('');
      setCampaignCategory('infrastructure');
      setCampaignEndDate('');
      setCampaignImages([]);

      console.log('Refreshing campaigns list...');
      await fetchCampaigns();
      
      Alert.alert(
        'Success! 🎉',
        'Your campaign has been created successfully and is now live!',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('=== Campaign Submission Error ===');
      console.error('Error:', error);
      console.error('Error message:', error?.message);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      const errorMessage = error?.message || 'Failed to create campaign. Please try again.';
      Alert.alert('Campaign Creation Failed', errorMessage);
    } finally {
      setIsSubmittingCampaign(false);
      console.log('=== Campaign Submission Complete ===');
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.title}>Make a Difference</Text>
        <TouchableOpacity 
          style={styles.notificationButton}
          onPress={() => setNotificationModalVisible(true)}
        >
          <Bell size={24} color="#000000" />
          {unreadCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => router.push('/donation/my-donations' as any)}
        >
          <Heart size={18} color="#4169E1" />
          <Text style={styles.quickActionText}>My Donations</Text>
        </TouchableOpacity>
      </View>

      {/* Notification Dropdown Modal */}
      <Modal
        visible={notificationModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setNotificationModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setNotificationModalVisible(false)}
        >
          <View style={styles.notificationDropdown}>
            <View style={styles.notificationHeader}>
              <Text style={styles.notificationHeaderTitle}>Notifications</Text>
              <View style={styles.notificationHeaderActions}>
                {unreadCount > 0 && (
                  <TouchableOpacity onPress={markAllAsRead} style={styles.headerAction}>
                    <Check size={18} color="#4169E1" />
                    <Text style={styles.headerActionText}>Mark all read</Text>
                  </TouchableOpacity>
                )}
                {notifications.length > 0 && (
                  <TouchableOpacity onPress={clearAll} style={styles.headerAction}>
                    <Trash2 size={18} color="#FF4444" />
                    <Text style={[styles.headerActionText, { color: '#FF4444' }]}>Clear all</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <ScrollView style={styles.notificationList} showsVerticalScrollIndicator={false}>
              {notifications.length === 0 ? (
                <View style={styles.emptyState}>
                  <Bell size={48} color="#CBD5E1" />
                  <Text style={styles.emptyNotificationText}>No notifications</Text>
                  <Text style={styles.emptyStateSubtext}>You're all caught up!</Text>
                </View>
              ) : (
                notifications.map((notification) => (
                  <TouchableOpacity
                    key={notification.id}
                    style={[
                      styles.notificationItem,
                      !notification.read && styles.notificationItemUnread
                    ]}
                    onPress={() => handleNotificationPress(notification)}
                  >
                    <View style={[
                      styles.notificationIcon,
                      notification.type === 'milestone' && { backgroundColor: '#E4FFF4' },
                      notification.type === 'activity' && { backgroundColor: '#E4EAFF' },
                      notification.type === 'update' && { backgroundColor: '#FFF4E4' },
                    ]}>
                      {notification.type === 'milestone' && <Trophy size={20} color="#10B981" />}
                      {notification.type === 'activity' && <DollarSign size={20} color="#4169E1" />}
                      {notification.type === 'update' && <Sparkles size={20} color="#F59E0B" />}
                    </View>
                    
                    <View style={styles.notificationContent}>
                      <Text style={styles.notificationTitle}>{notification.title}</Text>
                      <Text style={styles.notificationMessage} numberOfLines={2}>
                        {notification.message}
                      </Text>
                      <Text style={styles.notificationTime}>{notification.timestamp}</Text>
                    </View>

                    {!notification.read && (
                      <View style={styles.unreadDot} />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <View style={styles.impactSection}>
        <View style={styles.impactGrid}>
          <View style={styles.impactCard}>
            <Wallet size={24} color="#4169E1" />
            <Text style={styles.impactValue}>GH₵{donationStats.totalRaised.toLocaleString()}</Text>
            <Text style={styles.impactTitle}>Total Raised</Text>
          </View>
          
          <View style={styles.impactCard}>
            <Users size={24} color="#4169E1" />
            <Text style={styles.impactValue}>{donationStats.totalDonors}+</Text>
            <Text style={styles.impactTitle}>Donors</Text>
          </View>
          
          <View style={styles.impactCard}>
            <Target size={24} color="#4169E1" />
            <Text style={styles.impactValue}>{donationStats.activeCampaigns}</Text>
            <Text style={styles.impactTitle}>Active Campaigns</Text>
          </View>
          
          <View style={styles.impactCard}>
            <Sparkles size={24} color="#4169E1" />
            <Text style={styles.impactValue}>{donationStats.impactScore}</Text>
            <Text style={styles.impactTitle}>Impact Score</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Campaigns</Text>
          <TouchableOpacity 
            style={styles.seeAllButton}
            onPress={() => router.push('/donation/all-campaigns' as any)}
          >
            <Text style={styles.seeAllText}>See All</Text>
            <ChevronRight size={16} color="#666666" />
          </TouchableOpacity>
        </View>

        {loadingCampaigns ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4169E1" />
          </View>
        ) : campaigns.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.campaignsContainer}
          >
            {campaigns
              .slice(0, 5)
              .map((campaign) => (
              <View key={campaign.id} style={styles.campaignCard}>
                <Image source={{ uri: campaign.image }} style={styles.campaignImage} />
                <View style={styles.campaignContent}>
                  <Text style={styles.campaignTitle}>{campaign.title}</Text>
                  <Text style={styles.campaignDescription}>{campaign.description}</Text>
                  <View style={styles.progressContainer}>
                    <View style={[styles.progressBar, { width: `${campaign.progress}%` }]} />
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
                    style={styles.donateButton}
                    onPress={() => handleDonatePress(campaign)}
                    activeOpacity={0.7}
                  >
                    <Heart size={16} color="#FFFFFF" />
                    <Text style={styles.donateButtonText}>Donate Now</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyStateContainer}>
            <Heart size={48} color="#CCCCCC" />
            <Text style={styles.emptyStateTitle}>No Campaigns Yet</Text>
            <Text style={styles.emptyStateText}>
              No campaigns available in this category at the moment.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ways to Give</Text>
        <View style={styles.categoriesGrid}>
          {DONATION_CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryCard,
                { backgroundColor: category.color },
              ]}
              onPress={() => router.push(`/donation/category/${category.title.toLowerCase()}` as any)}
            >
              {category.icon && <category.icon size={24} color="#000000" />}
              <Text style={styles.categoryTitle}>{category.title}</Text>
              <Text style={styles.categoryDescription}>{category.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Donors</Text>
          <TouchableOpacity 
            style={styles.seeAllButton}
            onPress={() => router.push('/donation/all-donors' as any)}
          >
            <Text style={styles.seeAllText}>See All</Text>
            <ChevronRight size={16} color="#666666" />
          </TouchableOpacity>
        </View>
        {loadingDonors ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#4169E1" />
            <Text style={styles.loadingText}>Loading donors...</Text>
          </View>
        ) : recentDonors.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Users size={48} color="#CCCCCC" />
            <Text style={styles.emptyText}>No donors yet</Text>
            <Text style={styles.emptySubtext}>Be the first to make a difference!</Text>
          </View>
        ) : (
          recentDonors.map((donor) => (
            <View key={donor.id} style={styles.donorCard}>
              <Image source={{ uri: donor.image }} style={styles.donorImage} />
              <View style={styles.donorInfo}>
                <View style={styles.donorNameRow}>
                  <Text style={styles.donorName}>{donor.name}</Text>
                  {donor.recognitionLevel && (
                    <View style={[styles.recognitionBadge, { backgroundColor: getRecognitionColor(donor.recognitionLevel) }]}>
                      <Text style={styles.recognitionBadgeText}>{donor.recognitionLevel.toUpperCase()}</Text>
                    </View>
                  )}
                  {donor.isRecurring && (
                    <View style={styles.recurringBadge}>
                      <Star size={12} color="#FFB800" fill="#FFB800" />
                    </View>
                  )}
                </View>
                <Text style={styles.donorCampaign}>{donor.campaign}</Text>
              </View>
              <View style={styles.donationAmount}>
                <Text style={styles.amountText}>{donor.amount}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.recognitionCard}>
          <Trophy size={32} color="#FFB800" />
          <Text style={styles.recognitionTitle}>Donor Recognition</Text>
          <Text style={styles.recognitionText}>
            Join our distinguished donors and make a lasting impact on education
          </Text>
          <TouchableOpacity 
            style={styles.learnMoreButton}
            onPress={() => setRecognitionModalVisible(true)}
          >
            <Text style={styles.learnMoreText}>Learn More</Text>
            <ChevronRight size={16} color="#4169E1" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Create Campaign Button */}
      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.createCampaignButton}
          onPress={() => setCreateCampaignModalVisible(true)}
          activeOpacity={0.8}
        >
          <Plus size={20} color="#FFFFFF" />
          <Text style={styles.createCampaignButtonText}>Create Campaign</Text>
        </TouchableOpacity>
      </View>

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
                <DollarSign size={20} color={paymentMethod === 'mobile-money' ? '#4169E1' : '#666666'} />
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
                <Wallet size={20} color={paymentMethod === 'card' ? '#4169E1' : '#666666'} />
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

            {paymentMethod === 'mobile-money' && (
              <View style={styles.momoNetworkSection}>
                <Text style={styles.donateLabel}>Select Mobile Money Network</Text>
                <View style={styles.momoNetworksGrid}>
                  {MOBILE_MONEY_NETWORKS.map((network) => (
                    <TouchableOpacity
                      key={network.id}
                      style={[
                        styles.momoNetworkCard,
                        selectedMomoNetwork === network.id && styles.momoNetworkCardActive
                      ]}
                      onPress={() => setSelectedMomoNetwork(network.id)}
                    >
                      <View style={[styles.momoNetworkLogo, { backgroundColor: network.color + '20' }]}>
                        <Image
                          source={{ uri: network.logo }}
                          style={styles.momoNetworkImage}
                          resizeMode="contain"
                        />
                      </View>
                      <Text style={[
                        styles.momoNetworkName,
                        selectedMomoNetwork === network.id && styles.momoNetworkNameActive
                      ]}>
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
                      style={[
                        styles.momoNetworkCard,
                        selectedCard === card.id && styles.momoNetworkCardActive
                      ]}
                      onPress={() => setSelectedCard(card.id)}
                    >
                      <View style={[styles.momoNetworkLogo, { backgroundColor: card.color + '20' }]}>
                        <Image
                          source={{ uri: card.logo }}
                          style={styles.momoNetworkImage}
                          resizeMode="contain"
                        />
                      </View>
                      <Text style={[
                        styles.momoNetworkName,
                        selectedCard === card.id && styles.momoNetworkNameActive
                      ]}>
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
                      style={[
                        styles.momoNetworkCard,
                        selectedBank === bank.id && styles.momoNetworkCardActive
                      ]}
                      onPress={() => setSelectedBank(bank.id)}
                    >
                      <View style={[styles.momoNetworkLogo, { backgroundColor: bank.color + '20' }]}>
                        <Image
                          source={{ uri: bank.logo }}
                          style={styles.momoNetworkImage}
                          resizeMode="contain"
                        />
                      </View>
                      <Text style={[
                        styles.momoNetworkName,
                        selectedBank === bank.id && styles.momoNetworkNameActive
                      ]}>
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

            {/* Mobile Money Payment Instructions */}
            {paymentMethod === 'mobile-money' && selectedMomoNetwork && (
              <View style={styles.paymentInstructionsSection}>
                <View style={styles.instructionsCard}>
                  <View style={styles.instructionsHeader}>
                    <DollarSign size={24} color="#10B981" />
                    <Text style={styles.instructionsTitle}>Payment Instructions</Text>
                  </View>
                  
                  <Text style={styles.instructionsText}>
                    To complete your donation of <Text style={styles.instructionsAmount}>GH₵{(donationAmount || parseFloat(customAmount) || 0).toLocaleString()}</Text>:
                  </Text>
                  
                  <View style={styles.instructionsSteps}>
                    <View style={styles.instructionsStep}>
                      <View style={styles.stepNumber}>
                        <Text style={styles.stepNumberText}>1</Text>
                      </View>
                      <Text style={styles.stepText}>
                        Open your {MOBILE_MONEY_NETWORKS.find(n => n.id === selectedMomoNetwork)?.name || 'Mobile Money'} app
                      </Text>
                    </View>
                    
                    <View style={styles.instructionsStep}>
                      <View style={styles.stepNumber}>
                        <Text style={styles.stepNumberText}>2</Text>
                      </View>
                      <Text style={styles.stepText}>
                        Send money to: <Text style={styles.highlightText}>0244 123 456</Text>
                      </Text>
                    </View>
                    
                    <View style={styles.instructionsStep}>
                      <View style={styles.stepNumber}>
                        <Text style={styles.stepNumberText}>3</Text>
                      </View>
                      <Text style={styles.stepText}>
                        Account Name: <Text style={styles.highlightText}>Old Achimotan Association</Text>
                      </Text>
                    </View>
                    
                    <View style={styles.instructionsStep}>
                      <View style={styles.stepNumber}>
                        <Text style={styles.stepNumberText}>4</Text>
                      </View>
                      <Text style={styles.stepText}>
                        Click "I've Sent Payment" below after completing the transfer
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.instructionsNote}>
                    <Text style={styles.instructionsNoteText}>
                      💡 Your donation will be recorded once you confirm the payment.
                    </Text>
                  </View>
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
                    {paymentMethod === 'mobile-money' && selectedMomoNetwork
                      ? `Proceed to Payment - GH₵${(donationAmount || parseFloat(customAmount) || 0).toLocaleString()}`
                      : `Donate ${(donationAmount || parseFloat(customAmount) || 0) > 0 
                          ? `GH₵${(donationAmount || parseFloat(customAmount)).toLocaleString()}` 
                          : 'Now'}`
                    }
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

      {/* Donor Recognition Modal */}
      <Modal
        visible={recognitionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRecognitionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.recognitionModalContent}>
            <View style={styles.recognitionModalHeader}>
              <Text style={styles.recognitionModalTitle}>Donor Recognition Levels</Text>
              <TouchableOpacity onPress={() => setRecognitionModalVisible(false)}>
                <X size={24} color="#000000" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.recognitionScrollView}>
              <View style={styles.recognitionLevelCard}>
                <View style={[styles.recognitionLevelBadge, { backgroundColor: '#B9F2FF' }]}>
                  <Text style={styles.recognitionLevelText}>💎 DIAMOND</Text>
                </View>
                <Text style={styles.recognitionAmount}>GH₵100,000+</Text>
                <Text style={styles.recognitionBenefits}>
                  • Permanent plaque at campus entrance{'\n'}
                  • Annual gala dinner invitation{'\n'}
                  • Naming rights for major facilities{'\n'}
                  • Lifetime access to all school events{'\n'}
                  • Featured in annual report cover
                </Text>
              </View>

              <View style={styles.recognitionLevelCard}>
                <View style={[styles.recognitionLevelBadge, { backgroundColor: '#E5E4E2' }]}>
                  <Text style={styles.recognitionLevelText}>🏆 PLATINUM</Text>
                </View>
                <Text style={styles.recognitionAmount}>GH₵50,000 - GH₵99,999</Text>
                <Text style={styles.recognitionBenefits}>
                  • Recognition wall listing{'\n'}
                  • VIP event invitations{'\n'}
                  • Annual appreciation certificate{'\n'}
                  • Featured in donor newsletter{'\n'}
                  • Priority seating at ceremonies
                </Text>
              </View>

              <View style={styles.recognitionLevelCard}>
                <View style={[styles.recognitionLevelBadge, { backgroundColor: '#FFD700' }]}>
                  <Text style={styles.recognitionLevelText}>🥇 GOLD</Text>
                </View>
                <Text style={styles.recognitionAmount}>GH₵10,000 - GH₵49,999</Text>
                <Text style={styles.recognitionBenefits}>
                  • Name on honor roll{'\n'}
                  • Quarterly updates{'\n'}
                  • Special appreciation event{'\n'}
                  • Featured in school publications{'\n'}
                  • Personalized thank you letter
                </Text>
              </View>

              <View style={styles.recognitionLevelCard}>
                <View style={[styles.recognitionLevelBadge, { backgroundColor: '#C0C0C0' }]}>
                  <Text style={styles.recognitionLevelText}>🥈 SILVER</Text>
                </View>
                <Text style={styles.recognitionAmount}>GH₵5,000 - GH₵9,999</Text>
                <Text style={styles.recognitionBenefits}>
                  • Digital honor roll listing{'\n'}
                  • Semi-annual updates{'\n'}
                  • Appreciation certificate{'\n'}
                  • Social media recognition{'\n'}
                  • Email thank you note
                </Text>
              </View>

              <View style={styles.recognitionLevelCard}>
                <View style={[styles.recognitionLevelBadge, { backgroundColor: '#CD7F32' }]}>
                  <Text style={styles.recognitionLevelText}>🥉 BRONZE</Text>
                </View>
                <Text style={styles.recognitionAmount}>Up to GH₵4,999</Text>
                <Text style={styles.recognitionBenefits}>
                  • Website acknowledgment{'\n'}
                  • Annual impact report{'\n'}
                  • Thank you email{'\n'}
                  • Donor community access
                </Text>
              </View>

              <View style={styles.recognitionNote}>
                <Sparkles size={24} color="#4169E1" />
                <Text style={styles.recognitionNoteText}>
                  All donations, regardless of amount, make a meaningful difference in students' lives. Recognition levels are cumulative based on total lifetime giving.
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Create Campaign Modal */}
      <Modal
        visible={createCampaignModalVisible}
        animationType="slide"
        onRequestClose={() => setCreateCampaignModalVisible(false)}
      >
        <View style={styles.createCampaignContainer}>
          <View style={styles.createCampaignHeader}>
            <TouchableOpacity onPress={() => setCreateCampaignModalVisible(false)}>
              <X size={24} color="#000000" />
            </TouchableOpacity>
            <Text style={styles.createCampaignTitle}>Create Campaign</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.createCampaignForm} showsVerticalScrollIndicator={false}>
            {/* Campaign Title */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Campaign Title *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter campaign title"
                placeholderTextColor="#999"
                value={campaignTitle}
                onChangeText={setCampaignTitle}
              />
            </View>

            {/* Campaign Description */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description *</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                placeholder="Describe your campaign and its impact..."
                placeholderTextColor="#999"
                value={campaignDescription}
                onChangeText={setCampaignDescription}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>

            {/* Funding Goal */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Funding Goal (GH₵) *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter funding goal"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={campaignGoal}
                onChangeText={setCampaignGoal}
              />
            </View>

            {/* Category */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Category *</Text>
              <View style={styles.categoryGrid}>
                {['infrastructure', 'scholarships', 'research', 'community'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryOption,
                      campaignCategory === cat && styles.categoryOptionActive
                    ]}
                    onPress={() => setCampaignCategory(cat)}
                  >
                    <Text style={[
                      styles.categoryOptionText,
                      campaignCategory === cat && styles.categoryOptionTextActive
                    ]}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* End Date */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>End Date *</Text>
              <View style={styles.dateInputContainer}>
                <Calendar size={20} color="#666" />
                <TextInput
                  style={styles.dateInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#999"
                  value={campaignEndDate}
                  onChangeText={setCampaignEndDate}
                />
              </View>
            </View>

            {/* Image Upload */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Campaign Images * (Up to 10)</Text>
              <TouchableOpacity style={styles.uploadButton} onPress={handlePickImages}>
                <Upload size={24} color="#4169E1" />
                <Text style={styles.uploadButtonText}>Upload Images</Text>
                <Text style={styles.uploadButtonSubtext}>
                  {campaignImages.length}/10 images selected
                </Text>
              </TouchableOpacity>

              {/* Image Preview Grid */}
              {campaignImages.length > 0 && (
                <View style={styles.imagePreviewGrid}>
                  {campaignImages.map((uri, index) => (
                    <View key={index} style={styles.imagePreviewContainer}>
                      <Image source={{ uri }} style={styles.imagePreview} />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => handleRemoveImage(index)}
                      >
                        <X size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitCampaignButton,
                isSubmittingCampaign && styles.submitCampaignButtonDisabled
              ]}
              onPress={handleSubmitCampaign}
              disabled={isSubmittingCampaign}
            >
              {isSubmittingCampaign ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitCampaignButtonText}>Submit Campaign</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingText: { textAlign: 'center', marginTop: 40 },
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyText: { textAlign: 'center', marginTop: 16, color: '#666', fontSize: 16 },
  emptySubtext: { textAlign: 'center', marginTop: 8, color: '#999', fontSize: 14 },
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
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  notificationButton: {
    padding: 8,
  },
  quickActions: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
    alignSelf: 'flex-start',
  },
  quickActionText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  impactSection: {
    padding: 16,
  },
  impactGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  impactCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  impactValue: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  impactTitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  campaignsContainer: {
    paddingHorizontal: 16,
    gap: 16,
  },
  campaignCard: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  campaignImage: {
    width: '100%',
    height: 200,
  },
  campaignContent: {
    padding: 16,
    gap: 12,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  campaignTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  campaignDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  progressContainer: {
    height: 4,
    backgroundColor: '#F0F0F0',
    borderRadius: 2,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4169E1',
    borderRadius: 2,
  },
  campaignStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  donateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4169E1',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  donateButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  emptyStateContainer: {
    paddingVertical: 48,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
    marginTop: 8,
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#999999',
    textAlign: 'center',
    lineHeight: 20,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingHorizontal: 16,
  },
  categoryCard: {
    width: (width - 48) / 2,
    padding: 16,
    borderRadius: 16,
    gap: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryCardActive: {
    borderColor: '#4169E1',
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  categoryTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  categoryDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  donorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  donorImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  donorInfo: {
    flex: 1,
    marginLeft: 12,
  },
  donorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  donorName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  recognitionBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  recognitionBadgeText: {
    fontSize: 8,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  recurringBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFF9E6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  donorCampaign: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  donationAmount: {
    backgroundColor: '#EBF0FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  amountText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  recognitionCard: {
    margin: 16,
    padding: 24,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
  },
  recognitionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    textAlign: 'center',
  },
  recognitionText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    textAlign: 'center',
  },
  learnMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  learnMoreText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  // Notification styles
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  notificationBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    paddingTop: 100,
  },
  notificationDropdown: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 16,
    maxHeight: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  notificationHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  notificationHeaderTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 12,
  },
  notificationHeaderActions: {
    flexDirection: 'row',
    gap: 16,
  },
  headerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerActionText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  notificationList: {
    maxHeight: 400,
  },
  emptyState: {
    padding: 48,
    alignItems: 'center',
    gap: 8,
  },
  emptyNotificationText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#64748B',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#94A3B8',
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'flex-start',
  },
  notificationItemUnread: {
    backgroundColor: '#F8FAFC',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E4EAFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
    gap: 4,
  },
  notificationTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  notificationMessage: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    lineHeight: 18,
  },
  notificationTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#94A3B8',
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4169E1',
    marginTop: 6,
  },
  // Donation Modal styles
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
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  donateLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 12,
    marginTop: 8,
  },
  amountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
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
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#F8F9FA',
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
  // Create Campaign Styles
  createCampaignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4169E1',
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  createCampaignButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  createCampaignContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  createCampaignHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  createCampaignTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  createCampaignForm: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#333333',
    marginBottom: 8,
  },
  formInput: {
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
  formTextArea: {
    minHeight: 120,
    paddingTop: 14,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryOption: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  categoryOptionActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#4169E1',
  },
  categoryOptionText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
  },
  categoryOptionTextActive: {
    color: '#4169E1',
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 12,
  },
  dateInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1A1A1A',
  },
  uploadButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingVertical: 32,
    borderWidth: 2,
    borderColor: '#4169E1',
    borderStyle: 'dashed',
  },
  uploadButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
    marginTop: 8,
  },
  uploadButtonSubtext: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#999999',
    marginTop: 4,
  },
  imagePreviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  imagePreviewContainer: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    padding: 4,
  },
  submitCampaignButton: {
    backgroundColor: '#4169E1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  submitCampaignButtonDisabled: {
    backgroundColor: '#A0A0A0',
    opacity: 0.6,
  },
  submitCampaignButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  // Recognition Modal Styles
  recognitionModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
    marginTop: 'auto',
  },
  recognitionModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  recognitionModalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  recognitionScrollView: {
    flex: 1,
  },
  recognitionLevelCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  recognitionLevelBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 12,
  },
  recognitionLevelText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  recognitionAmount: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
    marginBottom: 12,
  },
  recognitionBenefits: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    lineHeight: 22,
  },
  recognitionNote: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginBottom: 24,
  },
  recognitionNoteText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    lineHeight: 20,
  },
  // Mobile Money Instructions Styles
  paymentInstructionsSection: {
    marginTop: 16,
  },
  instructionsCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  instructionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  instructionsTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  instructionsText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#333333',
    marginBottom: 16,
    lineHeight: 22,
  },
  instructionsAmount: {
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
  },
  instructionsSteps: {
    gap: 16,
    marginBottom: 16,
  },
  instructionsStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#333333',
    lineHeight: 20,
    paddingTop: 4,
  },
  highlightText: {
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
  },
  instructionsNote: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
  },
  instructionsNoteText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    textAlign: 'center',
  },
});