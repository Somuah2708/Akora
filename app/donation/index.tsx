import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { debouncedRouter } from '@/utils/navigationDebounce';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  TrendingUp,
  Users,
  Heart,
  Trophy,
  Target,
  ChevronRight,
  Plus,
  Shield,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

const { width } = Dimensions.get('window');

interface Campaign {
  id: string;
  title: string;
  description: string;
  goal_amount: number;
  current_amount: number;
  campaign_image: string;
  category: string;
  deadline: string;
  status: string;
  donors_count: number;
  is_featured?: boolean;
}

interface TopDonor {
  id: string;
  user_id: string;
  name: string;
  total_amount: number;
  avatar: string;
  is_anonymous: boolean;
}

export default function DonationScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [featuredCampaign, setFeaturedCampaign] = useState<Campaign | null>(null);
  const [completedCampaigns, setCompletedCampaigns] = useState<Campaign[]>([]);
  const [topDonors, setTopDonors] = useState<TopDonor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({
    totalRaised: 0,
    totalDonors: 0,
    activeCampaigns: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (user) {
      checkAdminStatus();
    }
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) {
      console.log('🔒 No user logged in');
      return;
    }
    
    try {
      console.log('🔍 Checking admin status for user:', user.id);
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin, role, email')
        .eq('id', user.id)
        .single();
      
      console.log('👤 Profile data:', data);
      console.log('❌ Query error:', error);
      
      const adminStatus = data?.is_admin === true || data?.role === 'admin';
      console.log('🛡️ Admin status:', adminStatus);
      setIsAdmin(adminStatus);
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchCampaigns(),
        fetchTopDonors(),
        fetchStats(),
        fetchCompletedCampaigns(),
        checkAdminStatus(),
      ]);
    } catch (error) {
      console.error('Error loading donation data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 Donations screen focused, refreshing data...');
      loadData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const fetchCampaigns = async () => {
    try {
      // Fetch ALL campaigns regardless of status
      const { data: allCampaigns, error: fetchError } = await supabase
        .from('donation_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError || !allCampaigns) {
        console.log('❌ Error fetching campaigns:', fetchError);
        return;
      }

      // Fetch ALL donations at once (more efficient than per-campaign queries)
      const { data: allDonations } = await supabase
        .from('donations')
        .select('campaign_id, user_id, amount')
        .eq('status', 'approved');

      // Group donations by campaign
      const donationsByCampaign = new Map();
      allDonations?.forEach(donation => {
        if (!donationsByCampaign.has(donation.campaign_id)) {
          donationsByCampaign.set(donation.campaign_id, []);
        }
        donationsByCampaign.get(donation.campaign_id).push(donation);
      });

      // Process each campaign
      const activeCampaignsWithAmounts = [];
      const completedCampaignsWithAmounts = [];

      for (const campaign of allCampaigns) {
        const campaignDonations = donationsByCampaign.get(campaign.id) || [];
        
        // Calculate actual current amount
        const actualCurrentAmount = campaignDonations.reduce((sum, d) => sum + (d.amount || 0), 0);
        
        // Calculate actual donors count (unique users)
        const actualDonorsCount = new Set(campaignDonations.map(d => d.user_id)).size;

        const updatedCampaign = {
          ...campaign,
          current_amount: actualCurrentAmount,
          donors_count: actualDonorsCount,
        };

        // Split into active vs completed based on actual donations
        if (actualCurrentAmount < campaign.goal_amount) {
          activeCampaignsWithAmounts.push(updatedCampaign);
        } else {
          completedCampaignsWithAmounts.push(updatedCampaign);
        }
      }

      console.log('✅ Active campaigns:', activeCampaignsWithAmounts.length);
      console.log('✅ Completed campaigns:', completedCampaignsWithAmounts.length);

      // Set featured campaign
      const featured = activeCampaignsWithAmounts.find(c => c.is_featured === true);
      setFeaturedCampaign(featured || null);

      // Set other active campaigns (excluding featured)
      const otherCampaigns = activeCampaignsWithAmounts.filter(c => c.is_featured !== true).slice(0, 10);
      setCampaigns(otherCampaigns);

      // Set completed campaigns
      setCompletedCampaigns(completedCampaignsWithAmounts.slice(0, 10));

      // Update stats with accurate active campaign count
      setStats(prev => ({
        ...prev,
        activeCampaigns: activeCampaignsWithAmounts.length,
      }));
    } catch (error) {
      console.error('💥 Error in fetchCampaigns:', error);
    }
  };

  const fetchTopDonors = async () => {
    try {
      // First, get donations
      const { data, error } = await supabase
        .from('donations')
        .select('user_id, amount, is_anonymous')
        .eq('status', 'approved')
        .order('amount', { ascending: false })
        .limit(50);

      if (error || !data || data.length === 0) {
        setTopDonors([]);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(
        data
          .filter(d => !d.is_anonymous && d.user_id)
          .map(d => d.user_id)
      )];

      // Fetch profiles
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

      // Aggregate by user
      const donorMap = new Map();
      data.forEach((donation: any) => {
        const userId = donation.user_id;
        if (!donorMap.has(userId)) {
          const profile = profilesMap.get(userId);
          donorMap.set(userId, {
            id: userId,
            user_id: userId,
            name: donation.is_anonymous ? 'Anonymous' : (profile?.full_name || 'Anonymous'),
            total_amount: 0,
            avatar: donation.is_anonymous ? '' : (profile?.avatar_url || ''),
            is_anonymous: donation.is_anonymous,
          });
        }
        donorMap.get(userId).total_amount += donation.amount;
      });
      
      const donors = Array.from(donorMap.values())
        .sort((a, b) => b.total_amount - a.total_amount)
        .slice(0, 5);
      
      setTopDonors(donors);
    } catch (error) {
      console.error('Error fetching top donors:', error);
      setTopDonors([]);
    }
  };

  const fetchStats = async () => {
    const { data: donationsResult, error } = await supabase
      .from('donations')
      .select('user_id, amount')
      .eq('status', 'approved');

    if (!error && donationsResult) {
      // Calculate total raised from actual approved donations
      const totalRaised = donationsResult.reduce((sum, donation) => sum + (donation.amount || 0), 0);
      const uniqueDonors = new Set(donationsResult.map(d => d.user_id)).size;
      
      setStats(prev => ({
        ...prev,
        totalRaised,
        totalDonors: uniqueDonors,
        // activeCampaigns will be set by fetchCampaigns after calculating actual completion
      }));
    }
  };

  // fetchCompletedCampaigns is now handled inside fetchCampaigns for efficiency
  // Keeping this function for backward compatibility but it does nothing
  const fetchCompletedCampaigns = async () => {
    // Completed campaigns are now calculated in fetchCampaigns()
    // This prevents duplicate queries and ensures consistency
  };

  const getProgressPercentage = (current: number, goal: number) => {
    return Math.min((current / goal) * 100, 100);
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffc857" />
        <Text style={styles.loadingText}>Loading campaigns...</Text>
      </View>
    );
  }

  console.log('🎨 Rendering donations screen with completed campaigns:', completedCampaigns.length);

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#0F172A', '#1E293B']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Support Achimota</Text>
            <Text style={styles.headerSubtitle}>Building Tomorrow Together</Text>
          </View>
          <View style={styles.headerActions}>
            {isAdmin && (
              <TouchableOpacity 
                style={styles.adminButton}
                onPress={() => debouncedRouter.push('/donation/admin')}
              >
                <Shield size={20} color="#ffc857" />
                <Text style={styles.adminButtonText}>Admin</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={styles.myDonationsButton}
              onPress={() => debouncedRouter.push('/donation/my-donations')}
            >
              <Heart size={20} color="#ffc857" fill="#ffc857" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffc857" />
        }
      >
        {/* Impact Stats */}
        <View style={styles.statsContainer}>
          {/* Total Raised - Full Width */}
          <View style={styles.statCardLarge}>
            <View style={styles.statIconContainerLarge}>
              <TrendingUp size={28} color="#ffc857" />
            </View>
            <View style={styles.statTextContainer}>
              <Text style={styles.statValueLarge}>GH₵ {stats.totalRaised.toLocaleString()}</Text>
              <Text style={styles.statLabelLarge}>Total Raised</Text>
            </View>
          </View>
          
          {/* Donors and Active Projects - Side by Side */}
          <View style={styles.statsRow}>
            <TouchableOpacity 
              style={styles.statCardSmall}
              onPress={() => debouncedRouter.push('/donation/all-donors')}
              activeOpacity={0.7}
            >
              <View style={styles.statIconContainer}>
                <Users size={20} color="#ffc857" />
              </View>
              <Text style={styles.statValue}>{stats.totalDonors}</Text>
              <Text style={styles.statLabel}>Donors</Text>
            </TouchableOpacity>
            
            <View style={styles.statCardSmall}>
              <View style={styles.statIconContainer}>
                <Target size={20} color="#ffc857" />
              </View>
              <Text style={styles.statValue}>{stats.activeCampaigns}</Text>
              <Text style={styles.statLabel}>Active Projects</Text>
            </View>
          </View>
        </View>

        {/* Featured Campaign */}
        {featuredCampaign && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Featured Campaign</Text>
            </View>
            <TouchableOpacity
              style={styles.featuredCard}
              onPress={() => debouncedRouter.push(`/donation/campaign/${featuredCampaign.id}`)}
            >
              <Image
                source={{ uri: featuredCampaign.campaign_image || 'https://images.unsplash.com/photo-1562774053-701939374585' }}
                style={styles.featuredImage}
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.featuredOverlay}
              >
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryEmoji}>{getCategoryIcon(featuredCampaign.category).icon}</Text>
                  <Text style={styles.categoryText}>{featuredCampaign.category}</Text>
                </View>
                <Text style={styles.featuredTitle}>{featuredCampaign.title}</Text>
                <Text style={styles.featuredDescription} numberOfLines={2}>
                  {featuredCampaign.description}
                </Text>
                
                <View style={styles.featuredProgress}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${getProgressPercentage(featuredCampaign.current_amount, featuredCampaign.goal_amount)}%` },
                      ]}
                    />
                  </View>
                  <View style={styles.progressStats}>
                    <Text style={styles.raisedAmount}>
                      GH₵{featuredCampaign.current_amount.toLocaleString()} raised
                    </Text>
                    <Text style={styles.goalAmount}>
                      of GH₵{featuredCampaign.goal_amount.toLocaleString()}
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Active Campaigns */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Campaigns</Text>
          </View>
          
          {campaigns.map((campaign) => {
            const categoryInfo = getCategoryIcon(campaign.category);
            const progress = getProgressPercentage(campaign.current_amount, campaign.goal_amount);
            
            return (
              <TouchableOpacity
                key={campaign.id}
                style={styles.campaignCard}
                onPress={() => debouncedRouter.push(`/donation/campaign/${campaign.id}`)}
              >
                <Image
                  source={{ uri: campaign.campaign_image || 'https://images.unsplash.com/photo-1562774053-701939374585' }}
                  style={styles.campaignImage}
                />
                <View style={styles.campaignContent}>
                  <View style={styles.campaignHeader}>
                    <View style={[styles.campaignCategory, { backgroundColor: `${categoryInfo.color}15` }]}>
                      <Text style={styles.categoryIconText}>{categoryInfo.icon}</Text>
                      <Text style={[styles.campaignCategoryText, { color: categoryInfo.color }]}>{campaign.category}</Text>
                    </View>
                    <Text style={styles.donorsCount}>{campaign.donors_count || 0} donors</Text>
                  </View>
                  
                  <Text style={styles.campaignTitle}>{campaign.title}</Text>
                  <Text style={styles.campaignDescription} numberOfLines={2}>
                    {campaign.description}
                  </Text>
                  
                  <View style={styles.campaignProgress}>
                    <View style={styles.progressBarSmall}>
                      <View style={[styles.progressFillSmall, { width: `${progress}%` }]} />
                    </View>
                    <View style={styles.campaignStats}>
                      <Text style={styles.campaignRaised}>
                        GH₵{campaign.current_amount.toLocaleString()} <Text style={styles.campaignGoal}>of</Text>
                      </Text>
                      <Text style={styles.campaignGoal}>
                        GH₵{campaign.goal_amount.toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </View>
                <ChevronRight size={20} color="#999" style={styles.campaignChevron} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Top Donors Recognition */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top Donors</Text>
            <TouchableOpacity onPress={() => debouncedRouter.push('/donation/all-donors')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.donorsCard}>
            <View style={styles.donorsHeader}>
              <Trophy size={24} color="#ffc857" fill="#ffc857" />
              <Text style={styles.donorsHeaderText}>Hall of Fame</Text>
            </View>
            
            {topDonors.slice(0, 15).map((donor, index) => (
              <TouchableOpacity 
                key={donor.id} 
                style={styles.donorRow}
                onPress={() => {
                  if (!donor.is_anonymous && donor.user_id) {
                    debouncedRouter.push(`/user-profile/${donor.user_id}`);
                  }
                }}
                activeOpacity={donor.is_anonymous ? 1 : 0.7}
                disabled={donor.is_anonymous}
              >
                <View style={styles.donorRank}>
                  <Text style={styles.rankNumber}>#{index + 1}</Text>
                </View>
                {donor.avatar && !donor.is_anonymous ? (
                  <Image source={{ uri: donor.avatar }} style={styles.donorAvatar} />
                ) : (
                  <View style={styles.donorAvatarPlaceholder}>
                    <Users size={16} color="#666" />
                  </View>
                )}
                <View style={styles.donorInfo}>
                  <Text style={styles.donorName}>{donor.name}</Text>
                  <Text style={styles.donorAmount}>GH₵{donor.total_amount.toLocaleString()}</Text>
                </View>
                {index === 0 && <Trophy size={18} color="#FFD700" fill="#FFD700" />}
                {index === 1 && <Trophy size={18} color="#C0C0C0" fill="#C0C0C0" />}
                {index === 2 && <Trophy size={18} color="#CD7F32" fill="#CD7F32" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Completed Campaigns */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleWithIcon}>
              <Trophy size={20} color="#10B981" fill="#10B981" />
              <Text style={styles.sectionTitle}>Completed Campaigns</Text>
            </View>
          </View>
          
          {completedCampaigns.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.completedScrollContent}
            >
              {completedCampaigns.map((campaign) => {
                const categoryInfo = getCategoryIcon(campaign.category);
                return (
                  <TouchableOpacity
                    key={campaign.id}
                    style={styles.completedCard}
                    onPress={() => debouncedRouter.push(`/donation/campaign/${campaign.id}`)}
                    activeOpacity={0.95}
                  >
                    <Image
                      source={{ uri: campaign.campaign_image || 'https://images.unsplash.com/photo-1562774053-701939374585' }}
                      style={styles.completedImage}
                    />
                    <LinearGradient
                      colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.95)']}
                      locations={[0, 0.5, 1]}
                      style={styles.completedOverlay}
                    >
                      {/* Top badges container */}
                      <View style={styles.completedTopBadges}>
                        <View style={[styles.completedCategoryBadge, { borderColor: categoryInfo.color }]}>
                          <Text style={styles.completedBadgeEmoji}>{categoryInfo.icon}</Text>
                          <Text style={[styles.completedCategoryText, { color: categoryInfo.color }]}>{campaign.category}</Text>
                        </View>
                      </View>

                      {/* Bottom content */}
                      <View style={styles.completedBottomContent}>
                        <View style={styles.completedGoalBadge}>
                          <View style={styles.completedGoalBadgeInner}>
                            <Trophy size={16} color="#10B981" fill="#10B981" />
                            <Text style={styles.completedGoalText}>Goal Achieved</Text>
                          </View>
                        </View>
                        
                        <Text style={styles.completedTitle} numberOfLines={2}>{campaign.title}</Text>
                        
                        <View style={styles.completedProgressInfo}>
                          <View style={styles.completedProgressBar}>
                            <View style={styles.completedProgressFill} />
                          </View>
                          <View style={styles.completedStatsColumn}>
                            <View style={styles.completedStatItemFull}>
                              <Text style={styles.completedStatValue}>GH₵{campaign.current_amount.toLocaleString()}</Text>
                              <Text style={styles.completedStatLabel}>Total Raised</Text>
                            </View>
                            <View style={styles.completedStatDividerHorizontal} />
                            <View style={styles.completedStatItemFull}>
                              <Text style={styles.completedStatValue}>{campaign.donors_count || 0}</Text>
                              <Text style={styles.completedStatLabel}>Generous Donors</Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : (
            <View style={styles.emptyCompletedContainer}>
              <Trophy size={48} color="#94A3B8" fill="#94A3B8" />
              <Text style={styles.emptyCompletedText}>No completed campaigns yet</Text>
              <Text style={styles.emptyCompletedSubtext}>
                Campaigns that reach their goal will appear here
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => debouncedRouter.push('/donation/make-donation')}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['#ffc857', '#f59e0b']}
          style={styles.fabGradient}
        >
          <Plus size={24} color="#0F172A" strokeWidth={3} />
          <Text style={styles.fabText}>Make Donation</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 200, 87, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffc857',
  },
  adminButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffc857',
  },
  myDonationsButton: {
    padding: 8,
  },
  statsContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 12,
  },
  statCardLarge: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffc857',
    shadowColor: '#ffc857',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  statIconContainerLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF9E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statTextContainer: {
    flex: 1,
  },
  statValueLarge: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffc857',
    marginBottom: 4,
  },
  statLabelLarge: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    opacity: 0.9,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCardSmall: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF9E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  section: {
    paddingTop: 32,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  seeAllText: {
    fontSize: 14,
    color: '#ffc857',
    fontWeight: '600',
  },
  featuredCard: {
    borderRadius: 20,
    overflow: 'hidden',
    height: 400,
    backgroundColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  featuredOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 20,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffc857',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
    gap: 6,
  },
  categoryEmoji: {
    fontSize: 14,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  featuredTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  featuredDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 16,
    lineHeight: 20,
  },
  featuredProgress: {
    gap: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ffc857',
    borderRadius: 4,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  raisedAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  goalAmount: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  campaignCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  campaignImage: {
    width: 120,
    height: '100%',
  },
  campaignContent: {
    flex: 1,
    padding: 16,
  },
  campaignHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  campaignCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryIconText: {
    fontSize: 14,
  },
  campaignCategoryText: {
    fontSize: 12,
    color: '#ffc857',
    fontWeight: '600',
  },
  donorsCount: {
    fontSize: 12,
    color: '#64748B',
  },
  campaignTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  campaignDescription: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 12,
  },
  campaignProgress: {
    gap: 6,
  },
  progressBarSmall: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFillSmall: {
    height: '100%',
    backgroundColor: '#ffc857',
    borderRadius: 3,
  },
  campaignStats: {
    flexDirection: 'column',
    gap: 2,
  },
  campaignRaised: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  campaignGoal: {
    fontSize: 12,
    color: '#64748B',
  },
  campaignChevron: {
    alignSelf: 'center',
    marginRight: 12,
  },
  donorsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  donorsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  donorsHeaderText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  donorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  donorRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  donorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  donorAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
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
  donorAmount: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    borderRadius: 28,
    shadowColor: '#ffc857',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 28,
    gap: 8,
  },
  fabText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionTitleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  completedScrollContent: {
    paddingRight: 20,
    gap: 16,
  },
  completedCard: {
    width: 300,
    height: 400,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#1E293B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  completedImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  completedOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
  },
  completedTopBadges: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  completedCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 2,
    gap: 6,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  completedBadgeEmoji: {
    fontSize: 16,
  },
  completedCategoryText: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  completedBottomContent: {
    gap: 14,
  },
  completedGoalBadge: {
    alignSelf: 'flex-start',
  },
  completedGoalBadgeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    borderWidth: 2,
    borderColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  completedGoalText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  completedTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 28,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  completedProgressInfo: {
    gap: 12,
  },
  completedProgressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  completedProgressFill: {
    height: '100%',
    width: '100%',
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  completedStatsColumn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    gap: 12,
  },
  completedStatItemFull: {
    alignItems: 'center',
  },
  completedStatValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  completedStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  completedStatDividerHorizontal: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  completedStatsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  completedStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  completedStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 12,
  },
  emptyCompletedContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyCompletedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyCompletedSubtext: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },
});
