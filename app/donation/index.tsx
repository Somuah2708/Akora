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
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  TrendingUp,
  Users,
  Heart,
  Trophy,
  Target,
  Building2,
  GraduationCap,
  Laptop,
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

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchCampaigns(),
        fetchTopDonors(),
        fetchStats(),
        checkAdminStatus(),
      ]);
    } catch (error) {
      console.error('Error loading donation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const fetchCampaigns = async () => {
    // Fetch featured campaign
    const { data: featuredData } = await supabase
      .from('donation_campaigns')
      .select('*')
      .eq('status', 'active')
      .eq('is_featured', true)
      .limit(1)
      .single();

    if (featuredData) {
      setFeaturedCampaign(featuredData);
    }

    // Fetch other active campaigns (excluding featured)
    const { data, error } = await supabase
      .from('donation_campaigns')
      .select('*')
      .eq('status', 'active')
      .neq('is_featured', true)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setCampaigns(data);
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
    const [campaignsResult, donationsResult] = await Promise.all([
      supabase.from('donation_campaigns').select('id', { count: 'exact' }).eq('status', 'active'),
      supabase.from('donations').select('user_id, amount').eq('status', 'approved'),
    ]);

    if (!campaignsResult.error && !donationsResult.error) {
      // Calculate total raised from actual approved donations (not campaign.current_amount)
      const totalRaised = donationsResult.data?.reduce((sum, donation) => sum + (donation.amount || 0), 0) || 0;
      const uniqueDonors = new Set(donationsResult.data?.map(d => d.user_id)).size;
      
      setStats({
        totalRaised,
        totalDonors: uniqueDonors,
        activeCampaigns: campaignsResult.count || 0,
      });
    }
  };

  const getProgressPercentage = (current: number, goal: number) => {
    return Math.min((current / goal) * 100, 100);
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'infrastructure':
        return Building2;
      case 'scholarship':
        return GraduationCap;
      case 'equipment':
        return Laptop;
      default:
        return Target;
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#0F172A', '#1E293B']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
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
                onPress={() => router.push('/donation/admin')}
              >
                <Shield size={18} color="#ffc857" />
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={styles.myDonationsButton}
              onPress={() => router.push('/donation/my-donations')}
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
              onPress={() => router.push('/donation/all-donors')}
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
              <View style={styles.featuredBadge}>
                <Trophy size={12} color="#ffc857" />
                <Text style={styles.featuredBadgeText}>Admin Pick</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.featuredCard}
              onPress={() => router.push(`/donation/campaign/${featuredCampaign.id}`)}
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
                  {(() => {
                    const Icon = getCategoryIcon(featuredCampaign.category);
                    return <Icon size={14} color="#0F172A" />;
                  })()}
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
                      GH₵{campaigns[0].current_amount.toLocaleString()} raised
                    </Text>
                    <Text style={styles.goalAmount}>
                      of GH₵{campaigns[0].goal_amount.toLocaleString()}
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
            <TouchableOpacity onPress={() => router.push('/donation/all-campaigns')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          {campaigns.slice(1).map((campaign) => {
            const Icon = getCategoryIcon(campaign.category);
            const progress = getProgressPercentage(campaign.current_amount, campaign.goal_amount);
            
            return (
              <TouchableOpacity
                key={campaign.id}
                style={styles.campaignCard}
                onPress={() => router.push(`/donation/campaign/${campaign.id}`)}
              >
                <Image
                  source={{ uri: campaign.campaign_image || 'https://images.unsplash.com/photo-1562774053-701939374585' }}
                  style={styles.campaignImage}
                />
                <View style={styles.campaignContent}>
                  <View style={styles.campaignHeader}>
                    <View style={styles.campaignCategory}>
                      <Icon size={14} color="#ffc857" />
                      <Text style={styles.campaignCategoryText}>{campaign.category}</Text>
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
                        GH₵{campaign.current_amount.toLocaleString()}
                      </Text>
                      <Text style={styles.campaignGoal}>
                        of GH₵{campaign.goal_amount.toLocaleString()}
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
            <TouchableOpacity onPress={() => router.push('/donation/all-donors')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.donorsCard}>
            <View style={styles.donorsHeader}>
              <Trophy size={24} color="#ffc857" />
              <Text style={styles.donorsHeaderText}>Hall of Fame</Text>
            </View>
            
            {topDonors.map((donor, index) => (
              <View key={donor.id} style={styles.donorRow}>
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
                {index === 0 && <Trophy size={18} color="#FFD700" />}
                {index === 1 && <Trophy size={18} color="#C0C0C0" />}
                {index === 2 && <Trophy size={18} color="#CD7F32" />}
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/donation/make-donation')}
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
    padding: 8,
    backgroundColor: 'rgba(255, 200, 87, 0.2)',
    borderRadius: 8,
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
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    borderWidth: 1,
    borderColor: '#ffc857',
  },
  featuredBadgeText: {
    fontSize: 12,
    fontWeight: '600',
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
    gap: 4,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
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
});
