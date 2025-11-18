import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Trophy, Medal, Award, Star, Users, TrendingUp } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';

interface LeaderboardEntry {
  id: string;
  full_name: string;
  current_title: string;
  company: string;
  profile_photo_url: string;
  completed_sessions: number;
  avg_rating: number;
  total_ratings: number;
  unique_mentees: number;
  badges: string[];
  testimonial_count: number;
  leaderboard_score: number;
  rank: number;
}

type LeaderboardType = 'all-time' | 'monthly';

export default function MentorLeaderboard() {
  const router = useRouter();
  const [leaderboardType, setLeaderboardType] = useState<LeaderboardType>('all-time');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [leaderboardType]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const viewName = leaderboardType === 'all-time' 
        ? 'mentor_leaderboard' 
        : 'mentor_leaderboard_monthly';
      
      const { data, error } = await supabase
        .from(viewName)
        .select('*')
        .limit(20);

      if (error) throw error;
      setLeaderboard(data || []);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy size={32} color="#FFD700" />;
      case 2:
        return <Medal size={32} color="#C0C0C0" />;
      case 3:
        return <Medal size={32} color="#CD7F32" />;
      default:
        return (
          <View style={styles.rankNumber}>
            <Text style={styles.rankNumberText}>{rank}</Text>
          </View>
        );
    }
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return styles.rankGold;
      case 2:
        return styles.rankSilver;
      case 3:
        return styles.rankBronze;
      default:
        return styles.rankDefault;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Loading leaderboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Trophy size={28} color="#10B981" />
        <Text style={styles.title}>Mentor Leaderboard</Text>
      </View>

      {/* Type Selector */}
      <View style={styles.typeSelector}>
        <TouchableOpacity
          style={[
            styles.typeButton,
            leaderboardType === 'all-time' && styles.typeButtonActive,
          ]}
          onPress={() => setLeaderboardType('all-time')}
        >
          <Award size={18} color={leaderboardType === 'all-time' ? '#FFFFFF' : '#6B7280'} />
          <Text
            style={[
              styles.typeButtonText,
              leaderboardType === 'all-time' && styles.typeButtonTextActive,
            ]}
          >
            All-Time
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.typeButton,
            leaderboardType === 'monthly' && styles.typeButtonActive,
          ]}
          onPress={() => setLeaderboardType('monthly')}
        >
          <TrendingUp size={18} color={leaderboardType === 'monthly' ? '#FFFFFF' : '#6B7280'} />
          <Text
            style={[
              styles.typeButtonText,
              leaderboardType === 'monthly' && styles.typeButtonTextActive,
            ]}
          >
            This Month
          </Text>
        </TouchableOpacity>
      </View>

      {/* Leaderboard List */}
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {leaderboard.length > 0 ? (
          leaderboard.map((entry) => (
            <TouchableOpacity
              key={entry.id}
              style={[styles.leaderboardCard, getRankStyle(entry.rank)]}
              onPress={() => router.push(`/education/mentor/${entry.id}` as any)}
            >
              {/* Rank Icon */}
              <View style={styles.rankContainer}>
                {getRankIcon(entry.rank)}
              </View>

              {/* Profile Image */}
              <Image
                source={{
                  uri: entry.profile_photo_url || 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=800',
                }}
                style={styles.profileImage}
              />

              {/* Mentor Info */}
              <View style={styles.mentorInfo}>
                <Text style={styles.mentorName} numberOfLines={1}>
                  {entry.full_name}
                </Text>
                <Text style={styles.mentorTitle} numberOfLines={1}>
                  {entry.current_title}
                </Text>
                {entry.company && (
                  <Text style={styles.mentorCompany} numberOfLines={1}>
                    {entry.company}
                  </Text>
                )}

                {/* Stats */}
                <View style={styles.statsRow}>
                  <View style={styles.stat}>
                    <Award size={12} color="#10B981" />
                    <Text style={styles.statText}>
                      {leaderboardType === 'all-time' 
                        ? entry.completed_sessions 
                        : (entry as any).completed_30d || 0} sessions
                    </Text>
                  </View>
                  <View style={styles.stat}>
                    <Star size={12} color="#F59E0B" />
                    <Text style={styles.statText}>
                      {entry.avg_rating?.toFixed(1) || '0.0'}
                    </Text>
                  </View>
                  {leaderboardType === 'all-time' && (
                    <View style={styles.stat}>
                      <Users size={12} color="#3B82F6" />
                      <Text style={styles.statText}>
                        {entry.unique_mentees} mentees
                      </Text>
                    </View>
                  )}
                </View>

                {/* Badges (all-time only) */}
                {leaderboardType === 'all-time' && entry.badges && entry.badges.length > 0 && (
                  <View style={styles.badgesRow}>
                    <Text style={styles.badgesLabel}>
                      {entry.badges.length} badge{entry.badges.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
              </View>

              {/* Score */}
              <View style={styles.scoreContainer}>
                <Text style={styles.scoreLabel}>Score</Text>
                <Text style={styles.scoreValue}>
                  {leaderboardType === 'all-time'
                    ? Math.round(entry.leaderboard_score)
                    : Math.round((entry as any).monthly_score || 0)}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Trophy size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>No mentors on the leaderboard yet</Text>
            <Text style={styles.emptySubtext}>
              Complete sessions and earn great ratings to appear here!
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  typeSelector: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  typeButtonActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  typeButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
  },
  list: {
    flex: 1,
    padding: 16,
  },
  leaderboardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  rankGold: {
    borderColor: '#FFD700',
    backgroundColor: '#FFFBEB',
  },
  rankSilver: {
    borderColor: '#C0C0C0',
    backgroundColor: '#F9FAFB',
  },
  rankBronze: {
    borderColor: '#CD7F32',
    backgroundColor: '#FEF3C7',
  },
  rankDefault: {
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
    marginRight: 12,
  },
  rankNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankNumberText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  profileImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
  },
  mentorInfo: {
    flex: 1,
  },
  mentorName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 2,
  },
  mentorTitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 2,
  },
  mentorCompany: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  badgesRow: {
    marginTop: 6,
  },
  badgesLabel: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#8B5CF6',
  },
  scoreContainer: {
    alignItems: 'center',
    marginLeft: 12,
  },
  scoreLabel: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginBottom: 2,
  },
  scoreValue: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
