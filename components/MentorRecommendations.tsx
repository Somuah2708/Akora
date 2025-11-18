import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Sparkles, RefreshCw, Settings } from 'lucide-react-native';

type MatchReason = {
  type: 'expertise' | 'industry' | 'rating' | 'experience' | 'availability' | 'format';
  value: string;
};

type MentorRecommendation = {
  recommendation_id: string;
  mentor_id: string;
  match_score: number;
  match_reasons: MatchReason[];
  expertise_match: string[];
  full_name: string;
  current_title: string;
  company: string;
  profile_photo_url: string | null;
  expertise_areas: string[];
  average_rating: number | null;
  total_ratings: number;
  years_of_experience: number;
};

type MatchingPreferences = {
  career_goals: string[];
  preferred_industries: string[];
  preferred_expertise: string[];
  preferred_meeting_formats: string[];
  min_years_experience: number;
  min_rating: number;
  only_available: boolean;
};

export default function MentorRecommendations() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recommendations, setRecommendations] = useState<MentorRecommendation[]>([]);
  const [hasPreferences, setHasPreferences] = useState(false);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user has preferences
      const { data: prefs } = await supabase
        .from('user_matching_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setHasPreferences(!!prefs);

      // Get recommendations
      const { data, error } = await supabase.rpc('get_top_mentor_recommendations', {
        p_user_id: user.id,
        p_limit: 5,
      });

      if (error) throw error;
      setRecommendations(data || []);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      Alert.alert('Error', 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Force refresh recommendations
      const { data, error } = await supabase.rpc('generate_mentor_recommendations', {
        p_user_id: user.id,
        p_limit: 5,
        p_refresh: true,
      });

      if (error) throw error;
      await fetchRecommendations();
      Alert.alert('Success', 'Recommendations refreshed');
    } catch (error) {
      console.error('Error refreshing:', error);
      Alert.alert('Error', 'Failed to refresh recommendations');
    } finally {
      setRefreshing(false);
    }
  };

  const getReasonIcon = (type: string) => {
    const icons: Record<string, string> = {
      expertise: '🎯',
      industry: '🏢',
      rating: '⭐',
      experience: '📊',
      availability: '✅',
      format: '📅',
    };
    return icons[type] || '✨';
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 0.8) return '#10b981'; // Excellent - green
    if (score >= 0.6) return '#3b82f6'; // Good - blue
    if (score >= 0.4) return '#f59e0b'; // Fair - orange
    return '#ef4444'; // Low - red
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Finding your best matches...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Sparkles size={24} color="#007AFF" />
          <Text style={styles.title}>Recommended for You</Text>
        </View>
        <TouchableOpacity
          onPress={handleRefresh}
          disabled={refreshing}
          style={styles.refreshButton}
        >
          <RefreshCw size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {!hasPreferences && (
        <View style={styles.infoBox}>
          <Settings size={20} color="#f59e0b" />
          <Text style={styles.infoText}>
            Set your preferences to get better matches!
          </Text>
        </View>
      )}

      {recommendations.length === 0 ? (
        <View style={styles.emptyState}>
          <Sparkles size={48} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No Recommendations Yet</Text>
          <Text style={styles.emptyText}>
            {hasPreferences
              ? "We're working on finding the best mentors for you. Check back soon!"
              : 'Set your matching preferences to get personalized mentor recommendations.'}
          </Text>
        </View>
      ) : (
        <View style={styles.recommendationsList}>
          {recommendations.map((rec) => (
            <View key={rec.recommendation_id} style={styles.mentorCard}>
              {/* Match Score Badge */}
              <View
                style={[
                  styles.matchBadge,
                  { backgroundColor: getMatchScoreColor(rec.match_score) },
                ]}
              >
                <Text style={styles.matchBadgeText}>
                  {Math.round(rec.match_score * 100)}% Match
                </Text>
              </View>

              {/* Profile Photo */}
              <View style={styles.profileSection}>
                <View style={styles.photoContainer}>
                  {rec.profile_photo_url ? (
                    <img
                      src={rec.profile_photo_url}
                      alt={rec.full_name}
                      style={{ width: 80, height: 80, borderRadius: 40 }}
                    />
                  ) : (
                    <View style={styles.placeholderPhoto}>
                      <Text style={styles.placeholderText}>
                        {rec.full_name.charAt(0)}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.basicInfo}>
                  <Text style={styles.mentorName}>{rec.full_name}</Text>
                  <Text style={styles.mentorTitle}>{rec.current_title}</Text>
                  <Text style={styles.mentorCompany}>{rec.company}</Text>
                  
                  {rec.average_rating && (
                    <View style={styles.ratingRow}>
                      <Text style={styles.ratingText}>
                        ⭐ {rec.average_rating.toFixed(1)}
                      </Text>
                      <Text style={styles.ratingCount}>
                        ({rec.total_ratings} reviews)
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Match Reasons */}
              {rec.match_reasons && rec.match_reasons.length > 0 && (
                <View style={styles.matchReasonsSection}>
                  <Text style={styles.matchReasonsTitle}>Why this match?</Text>
                  {rec.match_reasons.map((reason, index) => (
                    <View key={index} style={styles.reasonChip}>
                      <Text style={styles.reasonIcon}>
                        {getReasonIcon(reason.type)}
                      </Text>
                      <Text style={styles.reasonText}>{reason.value}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Matched Expertise */}
              {rec.expertise_match && rec.expertise_match.length > 0 && (
                <View style={styles.expertiseSection}>
                  <Text style={styles.expertiseTitle}>Matching Expertise:</Text>
                  <View style={styles.expertiseChips}>
                    {rec.expertise_match.map((exp, index) => (
                      <View key={index} style={styles.expertiseChip}>
                        <Text style={styles.expertiseChipText}>{exp}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Action Button */}
              <TouchableOpacity style={styles.viewProfileButton}>
                <Text style={styles.viewProfileText}>View Profile & Connect</Text>
              </TouchableOpacity>
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
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  refreshButton: {
    padding: 8,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    margin: 16,
    padding: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#92400e',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  recommendationsList: {
    padding: 16,
    gap: 16,
  },
  mentorCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  matchBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    zIndex: 1,
  },
  matchBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  profileSection: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  photoContainer: {
    width: 80,
    height: 80,
  },
  placeholderPhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#fff',
  },
  basicInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  mentorName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  mentorTitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 2,
  },
  mentorCompany: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  ratingCount: {
    fontSize: 12,
    color: '#94a3b8',
  },
  matchReasonsSection: {
    marginBottom: 16,
  },
  matchReasonsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  reasonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  reasonIcon: {
    fontSize: 16,
  },
  reasonText: {
    fontSize: 14,
    color: '#475569',
  },
  expertiseSection: {
    marginBottom: 16,
  },
  expertiseTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  expertiseChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  expertiseChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#dbeafe',
    borderRadius: 16,
  },
  expertiseChipText: {
    fontSize: 12,
    color: '#1e40af',
    fontWeight: '600',
  },
  viewProfileButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewProfileText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
