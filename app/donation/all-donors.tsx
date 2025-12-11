import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  StatusBar as RNStatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { debouncedRouter } from '@/utils/navigationDebounce';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  Users,
  Trophy,
  Heart,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Donor {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  is_anonymous: boolean;
  donation_count: number;
  first_donation_date: string;
}

export default function AllDonorsScreen() {
  const router = useRouter();
  const [donors, setDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDonors();
  }, []);

  const fetchDonors = async () => {
    try {
      // Get all approved donations with user info
      const { data: donationsData, error: donationsError } = await supabase
        .from('donations')
        .select('user_id, is_anonymous, created_at')
        .eq('status', 'approved')
        .order('created_at', { ascending: true });

      if (donationsError) throw donationsError;
      if (!donationsData || donationsData.length === 0) {
        setDonors([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Group by user_id and count donations
      const donorMap = new Map();
      donationsData.forEach((donation: any) => {
        const userId = donation.user_id;
        if (!donorMap.has(userId)) {
          donorMap.set(userId, {
            user_id: userId,
            is_anonymous: donation.is_anonymous,
            donation_count: 0,
            first_donation_date: donation.created_at,
          });
        }
        const donor = donorMap.get(userId);
        donor.donation_count += 1;
        // Keep the earliest donation date
        if (new Date(donation.created_at) < new Date(donor.first_donation_date)) {
          donor.first_donation_date = donation.created_at;
        }
      });

      // Get unique user IDs (excluding anonymous)
      const userIds = Array.from(donorMap.keys()).filter(
        userId => !donorMap.get(userId).is_anonymous
      );

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

      // Format donors list
      const formattedDonors: Donor[] = Array.from(donorMap.values()).map((donor: any) => {
        const profile = profilesMap.get(donor.user_id);
        return {
          id: donor.user_id,
          user_id: donor.user_id,
          full_name: donor.is_anonymous ? 'Anonymous Donor' : (profile?.full_name || 'Anonymous'),
          avatar_url: donor.is_anonymous ? null : (profile?.avatar_url || null),
          is_anonymous: donor.is_anonymous,
          donation_count: donor.donation_count,
          first_donation_date: donor.first_donation_date,
        };
      });

      // Sort by donation count (highest first), then by first donation date (earliest first)
      formattedDonors.sort((a, b) => {
        if (b.donation_count !== a.donation_count) {
          return b.donation_count - a.donation_count;
        }
        return new Date(a.first_donation_date).getTime() - new Date(b.first_donation_date).getTime();
      });

      setDonors(formattedDonors);
    } catch (error) {
      console.error('Error fetching donors:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDonors();
  };

  const handleDonorPress = (donor: Donor) => {
    if (!donor.is_anonymous) {
      // Navigate to user's profile
      debouncedRouter.push(`/profile/${donor.user_id}`);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffc857" />
      </View>
    );
  }

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
          <Text style={styles.headerTitle}>All Donors</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ffc857"
            colors={['#ffc857']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Header */}
        <View style={styles.statsHeader}>
          <View style={styles.statsIconContainer}>
            <Heart size={32} color="#ffc857" fill="#ffc857" />
          </View>
          <View style={styles.statsTextContainer}>
            <Text style={styles.statsValue}>{donors.length}</Text>
            <Text style={styles.statsLabel}>Generous Supporters</Text>
          </View>
        </View>

        {/* Donors List */}
        <View style={styles.listContainer}>
          {donors.length === 0 ? (
            <View style={styles.emptyState}>
              <Users size={48} color="#CBD5E1" />
              <Text style={styles.emptyStateTitle}>No donors yet</Text>
              <Text style={styles.emptyStateText}>
                Be the first to support our campaigns!
              </Text>
            </View>
          ) : (
            donors.map((donor, index) => (
              <TouchableOpacity
                key={donor.id}
                style={styles.donorCard}
                onPress={() => handleDonorPress(donor)}
                activeOpacity={donor.is_anonymous ? 1 : 0.7}
                disabled={donor.is_anonymous}
              >
                {/* Rank Badge for Top 3 */}
                {index < 3 && (
                  <View style={styles.rankBadge}>
                    <Trophy 
                      size={16} 
                      color={
                        index === 0 ? '#FFD700' : 
                        index === 1 ? '#C0C0C0' : 
                        '#CD7F32'
                      } 
                    />
                  </View>
                )}

                {/* Avatar */}
                {donor.avatar_url && !donor.is_anonymous ? (
                  <Image 
                    source={{ uri: donor.avatar_url }} 
                    style={styles.avatar}
                  />
                ) : (
                  <View style={[
                    styles.avatarPlaceholder,
                    donor.is_anonymous && styles.avatarPlaceholderAnonymous
                  ]}>
                    <Text style={styles.avatarText}>
                      {donor.is_anonymous ? '?' : (donor.full_name?.[0] || 'A')}
                    </Text>
                  </View>
                )}

                {/* Donor Info */}
                <View style={styles.donorInfo}>
                  <Text style={styles.donorName}>{donor.full_name}</Text>
                  <View style={styles.donorMeta}>
                    <Text style={styles.donorMetaText}>
                      {donor.donation_count} {donor.donation_count === 1 ? 'donation' : 'donations'}
                    </Text>
                    <Text style={styles.donorMetaSeparator}>•</Text>
                    <Text style={styles.donorMetaText}>
                      Since {formatDate(donor.first_donation_date)}
                    </Text>
                  </View>
                </View>

                {/* Chevron for non-anonymous donors */}
                {!donor.is_anonymous && (
                  <View style={styles.chevronContainer}>
                    <Text style={styles.viewProfileText}>View Profile</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ffc857',
  },
  statsIconContainer: {
    marginRight: 16,
  },
  statsTextContainer: {
    flex: 1,
  },
  statsValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  statsLabel: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
  },
  listContainer: {
    padding: 20,
  },
  donorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  rankBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 1,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 16,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarPlaceholderAnonymous: {
    backgroundColor: '#94A3B8',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffc857',
  },
  donorInfo: {
    flex: 1,
  },
  donorName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  donorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  donorMetaText: {
    fontSize: 13,
    color: '#64748B',
  },
  donorMetaSeparator: {
    fontSize: 13,
    color: '#CBD5E1',
  },
  chevronContainer: {
    marginLeft: 8,
  },
  viewProfileText: {
    fontSize: 12,
    color: '#ffc857',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
  },
});
