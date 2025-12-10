import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  ChevronLeft, 
  Share2, 
  Heart, 
  Calendar,
  Target,
  Users,
  TrendingUp,
  Building2,
  GraduationCap,
  Laptop,
  Building,
  Book,
  Activity,
  DollarSign,
  CheckCircle,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

interface Campaign {
  id: string;
  title: string;
  description: string;
  goal_amount: number;
  current_amount: number;
  campaign_image: string | null;
  category: string;
  deadline: string | null;
  status: string;
  donors_count: number;
  created_at: string;
}

interface Donor {
  id: string;
  amount: number;
  is_anonymous: boolean;
  created_at: string;
  donor_name: string | null;
  donor_avatar: string | null;
}

export default function CampaignDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCampaignDetails();
      fetchDonors();
    }
  }, [id]);

  const fetchCampaignDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('donation_campaigns')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setCampaign(data);
    } catch (error) {
      console.error('Error fetching campaign:', error);
      Alert.alert('Error', 'Failed to load campaign details');
    } finally {
      setLoading(false);
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
    const iconProps = { size: 20, color: '#ffc857' };
    switch (category) {
      case 'Infrastructure': return <Building2 {...iconProps} />;
      case 'Scholarship': return <GraduationCap {...iconProps} />;
      case 'Equipment': case 'Technology': return <Laptop {...iconProps} />;
      case 'Sports': return <Activity {...iconProps} />;
      case 'Library': return <Book {...iconProps} />;
      default: return <Target {...iconProps} />;
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
      router.push(`/donation/make-donation?campaignId=${campaign.id}&campaignTitle=${encodeURIComponent(campaign.title)}`);
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
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const progressPercentage = getProgressPercentage();
  const daysRemaining = getDaysRemaining();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <RNStatusBar barStyle="light-content" />
      
      {/* Header with Back Button */}
      <LinearGradient
        colors={['#0F172A', '#1E293B']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => router.back()}
          >
            <ChevronLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Campaign Details</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => setIsFavorited(!isFavorited)}
            >
              <Heart 
                size={22} 
                color={isFavorited ? "#ffc857" : "#FFFFFF"} 
                fill={isFavorited ? "#ffc857" : "transparent"}
              />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={handleShare}
            >
              <Share2 size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Campaign Image */}
        <View style={styles.imageContainer}>
          {campaign.campaign_image ? (
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
          <View style={styles.categoryBadge}>
            {getCategoryIcon(campaign.category)}
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

              <View style={styles.stat}>
                <View style={styles.statIconContainer}>
                  <TrendingUp size={16} color="#ffc857" />
                </View>
                <Text style={styles.statValue}>
                  {formatCurrency(campaign.goal_amount - campaign.current_amount)}
                </Text>
                <Text style={styles.statLabel}>Remaining</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Campaign Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About This Campaign</Text>
          <Text style={styles.description}>{campaign.description}</Text>
        </View>

        {/* Impact Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expected Impact</Text>
          <View style={styles.impactCard}>
            <View style={styles.impactItem}>
              <View style={styles.impactIconContainer}>
                <CheckCircle size={20} color="#10B981" />
              </View>
              <Text style={styles.impactText}>Direct benefit to over 2,000 students</Text>
            </View>
            <View style={styles.impactItem}>
              <View style={styles.impactIconContainer}>
                <CheckCircle size={20} color="#10B981" />
              </View>
              <Text style={styles.impactText}>Long-term infrastructure for future generations</Text>
            </View>
            <View style={styles.impactItem}>
              <View style={styles.impactIconContainer}>
                <CheckCircle size={20} color="#10B981" />
              </View>
              <Text style={styles.impactText}>Enhanced learning environment and outcomes</Text>
            </View>
          </View>
        </View>

        {/* Payment Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Information</Text>
          <View style={styles.paymentCard}>
            <View style={styles.paymentMethod}>
              <Text style={styles.paymentMethodTitle}>Bank Transfer</Text>
              <View style={styles.paymentDetail}>
                <Text style={styles.paymentLabel}>Bank:</Text>
                <Text style={styles.paymentValue}>GCB Bank Limited</Text>
              </View>
              <View style={styles.paymentDetail}>
                <Text style={styles.paymentLabel}>Account Name:</Text>
                <Text style={styles.paymentValue}>Achimota School Alumni</Text>
              </View>
              <View style={styles.paymentDetail}>
                <Text style={styles.paymentLabel}>Account Number:</Text>
                <Text style={styles.paymentValue}>1234567890</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.paymentMethod}>
              <Text style={styles.paymentMethodTitle}>Mobile Money</Text>
              <View style={styles.paymentDetail}>
                <Text style={styles.paymentLabel}>MTN MoMo:</Text>
                <Text style={styles.paymentValue}>0244-123-4567</Text>
              </View>
              <View style={styles.paymentDetail}>
                <Text style={styles.paymentLabel}>Vodafone Cash:</Text>
                <Text style={styles.paymentValue}>0204-123-4567</Text>
              </View>
            </View>
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
              <TouchableOpacity onPress={() => router.push('/donation/all-donors')}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            
            {donors.slice(0, 10).map((donor, index) => (
              <View key={donor.id} style={styles.donorCard}>
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
              </View>
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
  content: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
  },
  campaignImage: {
    width: '100%',
    height: 280,
  },
  placeholderImage: {
    width: '100%',
    height: 280,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
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
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffc857',
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
});
