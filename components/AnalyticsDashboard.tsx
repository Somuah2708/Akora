import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { TrendingUp, TrendingDown, Users, CheckCircle, Clock, Star, Award, Target } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

const { width } = Dimensions.get('window');

interface ProgramOverview {
  total_mentors: number;
  new_mentors_30d: number;
  total_requests: number;
  requests_30d: number;
  completed_sessions: number;
  unique_mentees: number;
  avg_platform_rating: number;
  total_ratings: number;
  overall_acceptance_rate: number;
  overall_completion_rate: number;
}

interface TopMentor {
  id: string;
  full_name: string;
  current_title: string;
  company: string;
  requests_30d: number;
  completed_30d: number;
  avg_rating: number;
  rating_count: number;
}

interface ExpertisePopularity {
  expertise: string;
  request_count: number;
  successful_matches: number;
  success_rate: number;
  unique_mentees: number;
  mentors_in_area: number;
}

export default function AnalyticsDashboard() {
  const [overview, setOverview] = useState<ProgramOverview | null>(null);
  const [topMentors, setTopMentors] = useState<TopMentor[]>([]);
  const [topExpertise, setTopExpertise] = useState<ExpertisePopularity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'mentors' | 'expertise'>('overview');

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch program overview
      const { data: overviewData, error: overviewError } = await supabase
        .from('analytics_program_overview')
        .select('*')
        .single();

      if (overviewError) throw overviewError;
      setOverview(overviewData);

      // Fetch top mentors
      const { data: mentorsData, error: mentorsError } = await supabase
        .from('analytics_top_mentors')
        .select('*')
        .limit(5);

      if (mentorsError) throw mentorsError;
      setTopMentors(mentorsData || []);

      // Fetch top expertise areas
      const { data: expertiseData, error: expertiseError } = await supabase
        .from('analytics_expertise_popularity')
        .select('*')
        .order('request_count', { ascending: false })
        .limit(5);

      if (expertiseError) throw expertiseError;
      setTopExpertise(expertiseData || []);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Analytics Dashboard</Text>
        <Text style={styles.subtitle}>Mentorship program insights and trends</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'mentors' && styles.activeTab]}
          onPress={() => setActiveTab('mentors')}
        >
          <Text style={[styles.tabText, activeTab === 'mentors' && styles.activeTabText]}>
            Top Mentors
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'expertise' && styles.activeTab]}
          onPress={() => setActiveTab('expertise')}
        >
          <Text style={[styles.tabText, activeTab === 'expertise' && styles.activeTabText]}>
            Expertise
          </Text>
        </TouchableOpacity>
      </View>

      {/* Overview Tab */}
      {activeTab === 'overview' && overview && (
        <View style={styles.content}>
          {/* Key Metrics Grid */}
          <View style={styles.metricsGrid}>
            <View style={[styles.metricCard, { backgroundColor: '#DBEAFE' }]}>
              <Users size={24} color="#3B82F6" />
              <Text style={styles.metricValue}>{overview.total_mentors}</Text>
              <Text style={styles.metricLabel}>Total Mentors</Text>
              <Text style={styles.metricSubtext}>+{overview.new_mentors_30d} this month</Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: '#D1FAE5' }]}>
              <CheckCircle size={24} color="#10B981" />
              <Text style={styles.metricValue}>{overview.completed_sessions}</Text>
              <Text style={styles.metricLabel}>Completed Sessions</Text>
              <Text style={styles.metricSubtext}>{overview.total_requests} total requests</Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: '#FEF3C7' }]}>
              <Target size={24} color="#F59E0B" />
              <Text style={styles.metricValue}>{overview.overall_acceptance_rate}%</Text>
              <Text style={styles.metricLabel}>Acceptance Rate</Text>
              <Text style={styles.metricSubtext}>Overall platform rate</Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: '#E0E7FF' }]}>
              <Star size={24} color="#6366F1" />
              <Text style={styles.metricValue}>{overview.avg_platform_rating.toFixed(1)}</Text>
              <Text style={styles.metricLabel}>Avg Rating</Text>
              <Text style={styles.metricSubtext}>{overview.total_ratings} ratings</Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: '#FCE7F3' }]}>
              <TrendingUp size={24} color="#EC4899" />
              <Text style={styles.metricValue}>{overview.requests_30d}</Text>
              <Text style={styles.metricLabel}>Requests (30d)</Text>
              <Text style={styles.metricSubtext}>Recent activity</Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: '#F3E8FF' }]}>
              <Award size={24} color="#A855F7" />
              <Text style={styles.metricValue}>{overview.overall_completion_rate}%</Text>
              <Text style={styles.metricLabel}>Completion Rate</Text>
              <Text style={styles.metricSubtext}>Of accepted requests</Text>
            </View>
          </View>

          {/* Program Health */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Program Health</Text>
            <View style={styles.healthCard}>
              <View style={styles.healthRow}>
                <Text style={styles.healthLabel}>Unique Mentees Served</Text>
                <Text style={styles.healthValue}>{overview.unique_mentees}</Text>
              </View>
              <View style={styles.healthRow}>
                <Text style={styles.healthLabel}>Active Mentors (30d)</Text>
                <Text style={styles.healthValue}>{overview.new_mentors_30d}</Text>
              </View>
              <View style={styles.healthRow}>
                <Text style={styles.healthLabel}>Platform Rating</Text>
                <View style={styles.ratingContainer}>
                  <Star size={16} color="#F59E0B" fill="#F59E0B" />
                  <Text style={styles.healthValue}>{overview.avg_platform_rating.toFixed(2)} / 5.0</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Top Mentors Tab */}
      {activeTab === 'mentors' && (
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Top Performers (Last 30 Days)</Text>
          {topMentors.map((mentor, index) => (
            <View key={mentor.id} style={styles.mentorCard}>
              <View style={styles.mentorRank}>
                <Text style={styles.rankNumber}>#{index + 1}</Text>
              </View>
              <View style={styles.mentorInfo}>
                <Text style={styles.mentorName}>{mentor.full_name}</Text>
                <Text style={styles.mentorTitle}>{mentor.current_title}</Text>
                {mentor.company && <Text style={styles.mentorCompany}>{mentor.company}</Text>}
              </View>
              <View style={styles.mentorStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{mentor.completed_30d}</Text>
                  <Text style={styles.statLabel}>Completed</Text>
                </View>
                <View style={styles.statItem}>
                  <View style={styles.ratingBadge}>
                    <Star size={12} color="#F59E0B" fill="#F59E0B" />
                    <Text style={styles.ratingText}>{mentor.avg_rating.toFixed(1)}</Text>
                  </View>
                  <Text style={styles.statLabel}>{mentor.rating_count} reviews</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Expertise Tab */}
      {activeTab === 'expertise' && (
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Most Requested Expertise Areas</Text>
          {topExpertise.map((expertise, index) => (
            <View key={expertise.expertise} style={styles.expertiseCard}>
              <View style={styles.expertiseHeader}>
                <Text style={styles.expertiseName}>{expertise.expertise}</Text>
                <View style={styles.expertiseBadge}>
                  <Text style={styles.expertiseBadgeText}>{expertise.request_count} requests</Text>
                </View>
              </View>
              <View style={styles.expertiseStats}>
                <View style={styles.expertiseStatRow}>
                  <Text style={styles.expertiseStatLabel}>Success Rate</Text>
                  <Text style={[styles.expertiseStatValue, { color: '#10B981' }]}>
                    {expertise.success_rate}%
                  </Text>
                </View>
                <View style={styles.expertiseStatRow}>
                  <Text style={styles.expertiseStatLabel}>Unique Mentees</Text>
                  <Text style={styles.expertiseStatValue}>{expertise.unique_mentees}</Text>
                </View>
                <View style={styles.expertiseStatRow}>
                  <Text style={styles.expertiseStatLabel}>Mentors Available</Text>
                  <Text style={styles.expertiseStatValue}>{expertise.mentors_in_area}</Text>
                </View>
              </View>
              {/* Progress Bar */}
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(expertise.success_rate, 100)}%` },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
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
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#10B981',
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#9CA3AF',
  },
  activeTabText: {
    color: '#10B981',
  },
  content: {
    padding: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    width: (width - 44) / 2,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  metricValue: {
    fontSize: 28,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  metricLabel: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  metricSubtext: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 12,
  },
  healthCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  healthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  healthLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  healthValue: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mentorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  mentorRank: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  mentorInfo: {
    flex: 1,
    gap: 2,
  },
  mentorName: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  mentorTitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  mentorCompany: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  mentorStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#92400E',
  },
  expertiseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  expertiseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expertiseName: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    flex: 1,
  },
  expertiseBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  expertiseBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#1E40AF',
  },
  expertiseStats: {
    gap: 8,
  },
  expertiseStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expertiseStatLabel: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  expertiseStatValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
});
