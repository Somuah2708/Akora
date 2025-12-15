import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  StatusBar as RNStatusBar,
  Modal,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { debouncedRouter } from '@/utils/navigationDebounce';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  ChevronLeft, 
  Share2, 
  Heart, 
  Calendar,
  Target,
  Users,
  TrendingUp,
  Building,
  DollarSign,
  CheckCircle,
  Trophy,
  Sparkles,
  Edit3,
  Shield,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

interface Campaign {
  id: string;
  title: string;
  description: string;
  goal_amount: number;
  current_amount: number;
  campaign_image: string | null;
  campaign_images?: string[] | null;
  category: string;
  deadline: string | null;
  status: string;
  donors_count: number;
  created_at: string;
}

interface Donor {
  id: string;
  user_id: string;
  amount: number;
  is_anonymous: boolean;
  created_at: string;
  donor_name: string | null;
  donor_avatar: string | null;
}

interface PaymentSettings {
  bank_name?: string;
  bank_account_name?: string;
  bank_account_number?: string;
  bank_branch?: string;
  enable_bank_transfer?: boolean;
  mtn_number?: string;
  mtn_name?: string;
  enable_mtn?: boolean;
  vodafone_number?: string;
  vodafone_name?: string;
  enable_vodafone?: boolean;
  airteltigo_number?: string;
  airteltigo_name?: string;
  enable_airteltigo?: boolean;
}

export default function CampaignDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showGoalAchieved, setShowGoalAchieved] = useState(false);
  const [hasShownGoalModal, setHasShownGoalModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({});
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Animation refs
  const trophyScale = useRef(new Animated.Value(0)).current;
  const trophyRotate = useRef(new Animated.Value(0)).current;
  const confettiAnimations = useRef(
    Array.from({ length: 30 }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      rotate: new Animated.Value(0),
      opacity: new Animated.Value(1),
    }))
  ).current;

  useEffect(() => {
    if (id) {
      fetchCampaignDetails();
      fetchDonors();
      checkAdminStatus();
      fetchPaymentSettings();
    }
  }, [id]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (id) {
        console.log('🔄 Campaign screen focused, refreshing data...');
        fetchCampaignDetails();
        fetchDonors();
        fetchPaymentSettings();
      }
    }, [id])
  );

  useEffect(() => {
    // Check if goal is met and show celebration
    if (campaign && !loading && !hasShownGoalModal) {
      const progress = (campaign.current_amount / campaign.goal_amount) * 100;
      if (progress >= 100) {
        // Delay slightly to ensure page is loaded
        setTimeout(() => {
          setShowGoalAchieved(true);
          setHasShownGoalModal(true);
          startCelebrationAnimation();
        }, 500);
      }
    }
  }, [campaign, loading]);

  const startCelebrationAnimation = () => {
    // Trophy animation
    Animated.parallel([
      Animated.spring(trophyScale, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(trophyRotate, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(trophyRotate, {
          toValue: -1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(trophyRotate, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Confetti animations
    confettiAnimations.forEach((confetti, index) => {
      const randomX = (Math.random() - 0.5) * width * 2;
      const randomY = Math.random() * -800 - 200;
      const randomRotate = Math.random() * 720;

      Animated.parallel([
        Animated.timing(confetti.x, {
          toValue: randomX,
          duration: 2000 + Math.random() * 1000,
          useNativeDriver: true,
        }),
        Animated.timing(confetti.y, {
          toValue: randomY,
          duration: 2000 + Math.random() * 1000,
          useNativeDriver: true,
        }),
        Animated.timing(confetti.rotate, {
          toValue: randomRotate,
          duration: 2000 + Math.random() * 1000,
          useNativeDriver: true,
        }),
        Animated.timing(confetti.opacity, {
          toValue: 0,
          duration: 2000,
          delay: 1000,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const fetchCampaignDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('donation_campaigns')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Calculate accurate current_amount and donors_count from actual approved donations
      const { data: donationsData } = await supabase
        .from('donations')
        .select('user_id, amount')
        .eq('campaign_id', id)
        .eq('status', 'approved');

      if (donationsData && donationsData.length > 0) {
        // Calculate total amount from actual donations
        const actualCurrentAmount = donationsData.reduce((sum, d) => sum + (d.amount || 0), 0);
        
        // Count unique donors
        const uniqueDonors = new Set(donationsData.map(d => d.user_id)).size;
        
        // Update campaign data with accurate values
        data.current_amount = actualCurrentAmount;
        data.donors_count = uniqueDonors;
        
        console.log('💰 Campaign accurate stats:', {
          campaign_id: id,
          stored_amount: data.current_amount,
          calculated_amount: actualCurrentAmount,
          stored_donors: data.donors_count,
          calculated_donors: uniqueDonors,
          total_donations: donationsData.length
        });
      } else {
        // No donations yet
        data.current_amount = 0;
        data.donors_count = 0;
      }

      setCampaign(data);
    } catch (error) {
      console.error('Error fetching campaign:', error);
      Alert.alert('Error', 'Failed to load campaign details');
    } finally {
      setLoading(false);
    }
  };

  const checkAdminStatus = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('profiles')
        .select('is_admin, role')
        .eq('id', user.id)
        .single();
      
      setIsAdmin(data?.is_admin === true || data?.role === 'admin');
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const fetchDonors = async () => {
    try {
      // First, get donations
      const { data: donationsData, error: donationsError } = await supabase
        .from('donations')
        .select('id, user_id, amount, is_anonymous, created_at')
        .eq('campaign_id', id)
        .eq('status', 'approved')
        .order('amount', { ascending: false })
        .limit(50);

      if (donationsError) throw donationsError;
      if (!donationsData || donationsData.length === 0) {
        setDonors([]);
        return;
      }

      // Get unique user IDs (excluding anonymous donations)
      const userIds = [...new Set(
        donationsData
          .filter(d => !d.is_anonymous && d.user_id)
          .map(d => d.user_id)
      )];

      // Fetch profiles for non-anonymous donors
      let profilesMap = new Map();
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);

        if (profilesData) {
          profilesData.forEach(profile => {
            profilesMap.set(profile.id, profile);
          });
        }
      }

      // Format the donors
      const formattedDonors = donationsData.map((d: any) => {
        const profile = profilesMap.get(d.user_id);
        return {
          id: d.id,
          user_id: d.user_id,
          amount: d.amount,
          is_anonymous: d.is_anonymous,
          created_at: d.created_at,
          donor_name: d.is_anonymous ? null : (profile?.full_name || null),
          donor_avatar: d.is_anonymous ? null : (profile?.avatar_url || null),
        };
      });

      setDonors(formattedDonors);
    } catch (error) {
      console.error('Error fetching donors:', error);
    }
  };

  const fetchPaymentSettings = async () => {
    try {
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

      console.log('💳 Payment settings data:', data);

      const settingsObj: any = {};
      data?.forEach((item) => {
        if (item.config_key.startsWith('enable_')) {
          settingsObj[item.config_key] = item.config_value === 'true' || item.config_value === true;
        } else {
          settingsObj[item.config_key] = item.config_value || '';
        }
      });

      console.log('💳 Parsed payment settings:', settingsObj);
      setPaymentSettings(settingsObj);
    } catch (error) {
      console.error('Error fetching payment settings:', error);
    }
  };

  const getProgressPercentage = () => {
    if (!campaign || campaign.goal_amount === 0) return 0;
    return Math.min((campaign.current_amount / campaign.goal_amount) * 100, 100);
  };

  const getDaysRemaining = () => {
    if (!campaign?.deadline) return null;
    const now = new Date();
    const deadline = new Date(campaign.deadline);
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'infrastructure':
        return { icon: '🏫', color: '#3B82F6' };
      case 'scholarship':
        return { icon: '🎓', color: '#F59E0B' };
      case 'sports':
        return { icon: '⚽', color: '#10B981' };
      case 'technology':
        return { icon: '💻', color: '#06B6D4' };
      case 'academic':
        return { icon: '📚', color: '#8B5CF6' };
      case 'events':
        return { icon: '🎉', color: '#EC4899' };
      case 'emergency':
        return { icon: '🚨', color: '#DC2626' };
      case 'other':
        return { icon: '📌', color: '#64748B' };
      default:
        return { icon: '🎯', color: '#ffc857' };
    }
  };

  const handleShare = async () => {
    Alert.alert(
      'Share Campaign',
      'Share this campaign with your network to help reach the goal!',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Share', onPress: () => console.log('Share campaign') },
      ]
    );
  };

  const handleDonate = () => {
    if (campaign) {
      debouncedRouter.push(`/donation/make-donation?campaignId=${campaign.id}&campaignTitle=${encodeURIComponent(campaign.title)}`);
    }
  };

  const formatCurrency = (amount: number) => {
    return `GH₵ ${amount.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffc857" />
      </View>
    );
  }

  if (!campaign) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Campaign not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => debouncedRouter.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const progressPercentage = getProgressPercentage();
  const daysRemaining = getDaysRemaining();
  const isGoalMet = progressPercentage >= 100;

  const renderGoalAchievedModal = () => {
    if (!showGoalAchieved) return null;

    const trophyRotateInterpolate = trophyRotate.interpolate({
      inputRange: [-1, 0, 1],
      outputRange: ['-15deg', '0deg', '15deg'],
    });

    return (
      <Modal
        visible={showGoalAchieved}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowGoalAchieved(false)}
      >
        <View style={styles.modalOverlay}>
          {/* Confetti */}
          {confettiAnimations.map((confetti, index) => (
            <Animated.View
              key={index}
              style={[
                styles.confetti,
                {
                  backgroundColor: ['#ffc857', '#FF6B6B', '#4ECDC4', '#95E1D3', '#F38181'][index % 5],
                  transform: [
                    { translateX: confetti.x },
                    { translateY: confetti.y },
                    { rotate: confetti.rotate.interpolate({
                      inputRange: [0, 360],
                      outputRange: ['0deg', '360deg'],
                    }) },
                  ],
                  opacity: confetti.opacity,
                },
              ]}
            />
          ))}

          {/* Trophy Card */}
          <Animated.View
            style={[
              styles.goalCard,
              {
                transform: [
                  { scale: trophyScale },
                  { rotate: trophyRotateInterpolate },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={['#ffc857', '#FFD700']}
              style={styles.goalCardGradient}
            >
              <View style={styles.trophyContainer}>
                <Trophy size={80} color="#0F172A" strokeWidth={2.5} />
                <Sparkles size={32} color="#0F172A" style={styles.sparkle1} />
                <Sparkles size={24} color="#0F172A" style={styles.sparkle2} />
              </View>
              
              <Text style={styles.goalTitle}>🎉 Goal Achieved! 🎉</Text>
              <Text style={styles.goalSubtitle}>
                This campaign has reached its funding goal!
              </Text>
              
              <View style={styles.goalStats}>
                <View style={styles.goalStatItemFull}>
                  <Text style={styles.goalStatValue}>
                    {formatCurrency(campaign?.current_amount || 0)}
                  </Text>
                  <Text style={styles.goalStatLabel}>Total Raised</Text>
                </View>
                <View style={styles.goalStatDividerHorizontal} />
                <View style={styles.goalStatItemFull}>
                  <Text style={styles.goalStatValue}>{campaign?.donors_count || 0}</Text>
                  <Text style={styles.goalStatLabel}>Generous Donors</Text>
                </View>
              </View>

              <Text style={styles.goalMessage}>
                Thank you to everyone who contributed to making this possible! 
                Your generosity will make a real difference.
              </Text>

              <TouchableOpacity
                style={styles.goalButton}
                onPress={() => setShowGoalAchieved(false)}
              >
                <Text style={styles.goalButtonText}>Continue</Text>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <RNStatusBar barStyle="light-content" />
      
      {renderGoalAchievedModal()}
      
      {/* Header with Back Button */}
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
          <Text style={styles.headerTitle}>Campaign Details</Text>
          <View style={styles.headerActions}>
            {isAdmin && (
              <TouchableOpacity 
                style={styles.adminEditButton}
                onPress={() => debouncedRouter.push(`/donation/edit-campaign/${id}`)}
              >
                <Shield size={16} color="#ffc857" />
                <Edit3 size={16} color="#ffc857" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Campaign Images Carousel */}
        <View style={styles.imageContainer}>
          {(campaign.campaign_images && campaign.campaign_images.length > 0) ? (
            <>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={(event) => {
                  const scrollX = event.nativeEvent.contentOffset.x;
                  const index = Math.round(scrollX / width);
                  setCurrentImageIndex(index);
                }}
                scrollEventThrottle={16}
              >
                {campaign.campaign_images.map((imageUrl, index) => (
                  <Image
                    key={index}
                    source={{ uri: imageUrl }}
                    style={styles.campaignImage}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
              {campaign.campaign_images.length > 1 && (
                <View style={styles.imageCounter}>
                  <Text style={styles.imageCounterText}>
                    {currentImageIndex + 1}/{campaign.campaign_images.length}
                  </Text>
                </View>
              )}
            </>
          ) : campaign.campaign_image ? (
            <Image 
              source={{ uri: campaign.campaign_image }} 
              style={styles.campaignImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Building size={48} color="#94A3B8" />
            </View>
          )}
          <View style={[styles.categoryBadge, { backgroundColor: getCategoryIcon(campaign.category).color }]}>
            <Text style={styles.categoryEmoji}>{getCategoryIcon(campaign.category).icon}</Text>
            <Text style={styles.categoryText}>{campaign.category}</Text>
          </View>
        </View>

        {/* Campaign Title */}
        <View style={styles.section}>
          <Text style={styles.campaignTitle}>{campaign.title}</Text>
        </View>

        {/* Progress Section */}
        <View style={styles.section}>
          <View style={styles.progressCard}>
            {isGoalMet && (
              <View style={styles.goalAchievedBadge}>
                <Trophy size={20} color="#0F172A" />
                <Text style={styles.goalAchievedText}>Goal Achieved! 🎉</Text>
              </View>
            )}
            <View style={styles.progressHeader}>
              <View style={styles.amountRow}>
                <Text style={styles.currentAmount}>{formatCurrency(campaign.current_amount)}</Text>
                <Text style={styles.goalAmount}>of {formatCurrency(campaign.goal_amount)}</Text>
              </View>
              <Text style={styles.progressPercentage}>{progressPercentage.toFixed(0)}%</Text>
            </View>
            
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBackground}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { width: `${progressPercentage}%` }
                  ]} 
                />
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <View style={styles.statIconContainer}>
                  <Users size={16} color="#ffc857" />
                </View>
                <Text style={styles.statValue}>{campaign.donors_count}</Text>
                <Text style={styles.statLabel}>Donors</Text>
              </View>
              
              {daysRemaining !== null && (
                <View style={styles.stat}>
                  <View style={styles.statIconContainer}>
                    <Calendar size={16} color="#ffc857" />
                  </View>
                  <Text style={styles.statValue}>{daysRemaining}</Text>
                  <Text style={styles.statLabel}>Days Left</Text>
                </View>
              )}

              {!isGoalMet ? (
                <View style={styles.stat}>
                  <View style={styles.statIconContainer}>
                    <TrendingUp size={16} color="#ffc857" />
                  </View>
                  <Text style={styles.statValue}>
                    {formatCurrency(campaign.goal_amount - campaign.current_amount)}
                  </Text>
                  <Text style={styles.statLabel}>Remaining</Text>
                </View>
              ) : (
                <View style={styles.stat}>
                  <View style={styles.statIconContainer}>
                    <Trophy size={16} color="#10B981" />
                  </View>
                  <Text style={[styles.statValue, { color: '#10B981' }]}>
                    ✓
                  </Text>
                  <Text style={styles.statLabel}>Completed</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Campaign Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About This Campaign</Text>
          <Text style={styles.description}>{campaign.description}</Text>
        </View>

        {/* Payment Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Information</Text>
          <View style={styles.paymentCard}>
            {!paymentSettings.bank_name && !paymentSettings.mtn_number && 
             !paymentSettings.vodafone_number && !paymentSettings.airteltigo_number ? (
              <View style={styles.noPaymentMethod}>
                <Text style={styles.noPaymentText}>
                  Payment methods are being configured. Please check back soon or contact the admin for payment details.
                </Text>
              </View>
            ) : (
              <>
                {paymentSettings.bank_name && (
              <>
                <View style={styles.paymentMethod}>
                  <Text style={styles.paymentMethodTitle}>Bank Transfer</Text>
                  <View style={styles.paymentDetail}>
                    <Text style={styles.paymentLabel}>Bank:</Text>
                    <Text style={styles.paymentValue}>{paymentSettings.bank_name}</Text>
                  </View>
                  <View style={styles.paymentDetail}>
                    <Text style={styles.paymentLabel}>Account Name:</Text>
                    <Text style={styles.paymentValue}>{paymentSettings.bank_account_name}</Text>
                  </View>
                  <View style={styles.paymentDetail}>
                    <Text style={styles.paymentLabel}>Account Number:</Text>
                    <Text style={styles.paymentValue}>{paymentSettings.bank_account_number}</Text>
                  </View>
                  {paymentSettings.bank_branch && (
                    <View style={styles.paymentDetail}>
                      <Text style={styles.paymentLabel}>Branch:</Text>
                      <Text style={styles.paymentValue}>{paymentSettings.bank_branch}</Text>
                    </View>
                  )}
                </View>
              </>
            )}

            {(paymentSettings.mtn_number || paymentSettings.vodafone_number || paymentSettings.airteltigo_number) && (
              <>
                {paymentSettings.bank_name && (
                  <View style={styles.divider} />
                )}
                <View style={styles.paymentMethod}>
                  <Text style={styles.paymentMethodTitle}>Mobile Money</Text>
                  
                  {paymentSettings.mtn_number && (
                    <>
                      <View style={styles.paymentDetail}>
                        <Text style={styles.paymentLabel}>MTN MoMo:</Text>
                        <Text style={styles.paymentValue}>{paymentSettings.mtn_number}</Text>
                      </View>
                      {paymentSettings.mtn_name && (
                        <View style={styles.paymentDetail}>
                          <Text style={styles.paymentLabel}>Name:</Text>
                          <Text style={styles.paymentValue}>{paymentSettings.mtn_name}</Text>
                        </View>
                      )}
                    </>
                  )}

                  {paymentSettings.vodafone_number && (
                    <>
                      <View style={styles.paymentDetail}>
                        <Text style={styles.paymentLabel}>Vodafone Cash:</Text>
                        <Text style={styles.paymentValue}>{paymentSettings.vodafone_number}</Text>
                      </View>
                      {paymentSettings.vodafone_name && (
                        <View style={styles.paymentDetail}>
                          <Text style={styles.paymentLabel}>Name:</Text>
                          <Text style={styles.paymentValue}>{paymentSettings.vodafone_name}</Text>
                        </View>
                      )}
                    </>
                  )}

                  {paymentSettings.airteltigo_number && (
                    <>
                      <View style={styles.paymentDetail}>
                        <Text style={styles.paymentLabel}>AirtelTigo Money:</Text>
                        <Text style={styles.paymentValue}>{paymentSettings.airteltigo_number}</Text>
                      </View>
                      {paymentSettings.airteltigo_name && (
                        <View style={styles.paymentDetail}>
                          <Text style={styles.paymentLabel}>Name:</Text>
                          <Text style={styles.paymentValue}>{paymentSettings.airteltigo_name}</Text>
                        </View>
                      )}
                    </>
                  )}
                </View>
              </>
            )}
              </>
            )}
          </View>
          <Text style={styles.paymentNote}>
            ⚠️ After making payment, please submit your receipt through the donation form for verification.
          </Text>
        </View>

        {/* Recent Donors */}
        {donors.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Supporters</Text>
              <TouchableOpacity onPress={() => debouncedRouter.push('/donation/all-donors')}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            
            {donors.slice(0, 10).map((donor, index) => (
              <TouchableOpacity 
                key={donor.id} 
                style={styles.donorCard}
                onPress={() => {
                  if (!donor.is_anonymous && donor.user_id) {
                    debouncedRouter.push(`/user-profile/${donor.user_id}`);
                  }
                }}
                activeOpacity={donor.is_anonymous ? 1 : 0.7}
                disabled={donor.is_anonymous}
              >
                <View style={styles.donorRank}>
                  <Text style={styles.donorRankText}>#{index + 1}</Text>
                </View>
                <View style={styles.donorAvatar}>
                  {donor.donor_avatar ? (
                    <Image source={{ uri: donor.donor_avatar }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>
                        {donor.is_anonymous ? '?' : (donor.donor_name?.[0] || 'A')}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.donorInfo}>
                  <Text style={styles.donorName}>
                    {donor.is_anonymous ? 'Anonymous Donor' : (donor.donor_name || 'Anonymous')}
                  </Text>
                  <Text style={styles.donorDate}>{formatDate(donor.created_at)}</Text>
                </View>
                <Text style={styles.donorAmount}>{formatCurrency(donor.amount)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Donate Button */}
      <View style={styles.donateButtonContainer}>
        <TouchableOpacity 
          style={styles.donateButton}
          onPress={handleDonate}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#ffc857', '#f59e0b']}
            style={styles.donateButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <DollarSign size={24} color="#0F172A" />
            <Text style={styles.donateButtonText}>Donate Now</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#64748B',
    marginBottom: 20,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#0F172A',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
    marginHorizontal: 8,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  adminEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 200, 87, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffc857',
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
  },
  campaignImage: {
    width: width,
    height: 280,
  },
  placeholderImage: {
    width: '100%',
    height: 280,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageCounter: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  imageCounterText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  categoryBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  categoryEmoji: {
    fontSize: 16,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  section: {
    padding: 20,
  },
  campaignTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 34,
  },
  progressCard: {
    backgroundColor: '#FFF9E6',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#ffc857',
  },
  goalAchievedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffc857',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  goalAchievedText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.3,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  amountRow: {
    flex: 1,
  },
  currentAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  goalAmount: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffc857',
  },
  progressBarContainer: {
    marginBottom: 20,
  },
  progressBarBackground: {
    height: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#ffc857',
    borderRadius: 6,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statIconContainer: {
    marginBottom: 6,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffc857',
  },
  description: {
    fontSize: 16,
    lineHeight: 26,
    color: '#475569',
  },
  impactCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  impactItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  impactIconContainer: {
    marginTop: 2,
  },
  impactText: {
    fontSize: 15,
    color: '#334155',
    flex: 1,
    lineHeight: 22,
  },
  paymentCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
  },
  noPaymentMethod: {
    padding: 20,
    alignItems: 'center',
  },
  noPaymentText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
  },
  paymentMethod: {
    marginBottom: 4,
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  paymentDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  paymentValue: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 16,
  },
  paymentNote: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 12,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  donorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  donorRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF9E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  donorRankText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffc857',
  },
  donorAvatar: {
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffc857',
  },
  donorInfo: {
    flex: 1,
  },
  donorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  donorDate: {
    fontSize: 12,
    color: '#64748B',
  },
  donorAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffc857',
  },
  donateButtonContainer: {
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
  donateButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  donateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  donateButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  // Goal Achievement Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confetti: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    top: '50%',
    left: '50%',
  },
  goalCard: {
    width: width - 40,
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#ffc857',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
  },
  goalCardGradient: {
    padding: 32,
    alignItems: 'center',
  },
  trophyContainer: {
    position: 'relative',
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkle1: {
    position: 'absolute',
    top: -10,
    right: -10,
  },
  sparkle2: {
    position: 'absolute',
    bottom: -5,
    left: -15,
  },
  goalTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  goalSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  goalStats: {
    flexDirection: 'column',
    backgroundColor: 'rgba(15, 23, 42, 0.1)',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 24,
  },
  goalStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  goalStatItemFull: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 8,
  },
  goalStatValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },
  goalStatLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
  },
  goalStatDivider: {
    width: 2,
    height: 40,
    backgroundColor: 'rgba(15, 23, 42, 0.2)',
    marginHorizontal: 16,
  },
  goalStatDividerHorizontal: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.2)',
    marginVertical: 12,
  },
  goalMessage: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  goalButton: {
    backgroundColor: '#0F172A',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  goalButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffc857',
    letterSpacing: 0.5,
  },
});
