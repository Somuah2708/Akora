import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
} from 'react-native';
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';
import { ArrowLeft, Star, Trash2, Clock, Wallet, Calendar } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface SavedScholarship {
  id: string;
  scholarship_id: string;
  title: string;
  organization: string;
  amount: string;
  currency: string;
  deadline: string;
  image_url: string;
  description: string;
  eligibility: string;
  saved_at: string;
}

export default function SavedScholarshipsScreen() {
  const { user } = useAuth();
  const [scholarships, setScholarships] = useState<SavedScholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSavedScholarships();
    }
  }, [user]);

  const fetchSavedScholarships = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Get bookmarked scholarship IDs
      const { data: bookmarks, error: bookmarkError } = await supabase
        .from('education_bookmarks')
        .select('opportunity_id, created_at')
        .eq('user_id', user.id)
        .eq('opportunity_type', 'scholarship')
        .order('created_at', { ascending: false });

      if (bookmarkError) throw bookmarkError;

      if (!bookmarks || bookmarks.length === 0) {
        setScholarships([]);
        setLoading(false);
        return;
      }

      const scholarshipIds = bookmarks.map(b => b.opportunity_id);

      // Fetch scholarship data
      const { data: scholarshipData, error: scholarshipError } = await supabase
        .from('scholarships')
        .select('*')
        .in('id', scholarshipIds);

      if (scholarshipError) throw scholarshipError;

      // Create a map for quick lookup
      const bookmarkMap = new Map(bookmarks.map(b => [b.opportunity_id, b.created_at]));

      // Transform the data
      const transformed = (scholarshipData || []).map(scholarship => ({
        id: scholarship.id,
        scholarship_id: scholarship.id,
        title: scholarship.title,
        organization: scholarship.organization,
        amount: scholarship.amount,
        currency: scholarship.currency || 'USD',
        deadline: scholarship.deadline,
        image_url: scholarship.image_url,
        description: scholarship.description,
        eligibility: scholarship.eligibility,
        saved_at: bookmarkMap.get(scholarship.id) || new Date().toISOString()
      }));

      // Sort by saved_at
      transformed.sort((a, b) => 
        new Date(b.saved_at).getTime() - new Date(a.saved_at).getTime()
      );

      setScholarships(transformed);
    } catch (error) {
      console.error('Error fetching saved scholarships:', error);
      Alert.alert('Error', 'Failed to load saved scholarships');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSavedScholarships();
    setRefreshing(false);
  }, [fetchSavedScholarships]);

  const removeScholarship = async (scholarshipId: string) => {
    if (!user) return;

    Alert.alert(
      'Remove from Saved',
      'Remove this scholarship from your saved list?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('education_bookmarks')
                .delete()
                .eq('user_id', user.id)
                .eq('opportunity_id', scholarshipId)
                .eq('opportunity_type', 'scholarship');

              if (error) throw error;

              setScholarships(scholarships.filter(s => s.scholarship_id !== scholarshipId));
              Alert.alert('Success', 'Removed from saved scholarships');
            } catch (error) {
              console.error('Error removing scholarship:', error);
              Alert.alert('Error', 'Failed to remove scholarship');
            }
          },
        },
      ]
    );
  };

  const formatDeadline = (deadline: string) => {
    if (!deadline) return 'No deadline';
    const date = new Date(deadline);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isDeadlineUrgent = (deadline: string) => {
    if (!deadline) return false;
    const daysUntil = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 30 && daysUntil >= 0;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Saved Scholarships</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Scholarships</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Banner */}
        <View style={styles.statsBanner}>
          <Star size={20} color="#ffc857" fill="#ffc857" />
          <Text style={styles.statsText}>
            {scholarships.length} saved {scholarships.length === 1 ? 'scholarship' : 'scholarships'}
          </Text>
        </View>

        {scholarships.length > 0 ? (
          scholarships.map((scholarship) => (
            <View key={scholarship.scholarship_id} style={styles.scholarshipCard}>
              <TouchableOpacity
                style={styles.cardContent}
                onPress={() => debouncedRouter.push(`/education/detail/${scholarship.scholarship_id}?type=scholarship`)}
                activeOpacity={0.95}
              >
                <Image
                  source={{
                    uri: scholarship.image_url || 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800',
                  }}
                  style={styles.scholarshipImage}
                />

                <View style={styles.scholarshipInfo}>
                  <Text style={styles.scholarshipTitle} numberOfLines={2}>
                    {scholarship.title}
                  </Text>
                  
                  {scholarship.organization && (
                    <Text style={styles.organizationText} numberOfLines={1}>
                      {scholarship.organization}
                    </Text>
                  )}

                  {scholarship.amount && (
                    <View style={styles.amountRow}>
                      <Wallet size={14} color="#10B981" />
                      <Text style={styles.amountText}>
                        {scholarship.currency} {scholarship.amount}
                      </Text>
                    </View>
                  )}

                  {scholarship.deadline && (
                    <View style={[
                      styles.deadlineRow,
                      isDeadlineUrgent(scholarship.deadline) && styles.urgentDeadline
                    ]}>
                      <Calendar size={12} color={isDeadlineUrgent(scholarship.deadline) ? '#EF4444' : '#64748B'} />
                      <Text style={[
                        styles.deadlineText,
                        isDeadlineUrgent(scholarship.deadline) && styles.urgentDeadlineText
                      ]}>
                        {formatDeadline(scholarship.deadline)}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              {/* Remove Button */}
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeScholarship(scholarship.scholarship_id)}
              >
                <Trash2 size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Star size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Saved Scholarships</Text>
            <Text style={styles.emptySubtitle}>
              Tap the star icon on any scholarship to save it here
            </Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => debouncedRouter.push('/education?tab=scholarships')}
            >
              <Text style={styles.browseButtonText}>Browse Scholarships</Text>
            </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  content: {
    flex: 1,
  },
  statsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statsText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  scholarshipCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    padding: 12,
  },
  scholarshipImage: {
    width: 100,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  scholarshipInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  scholarshipTitle: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 6,
  },
  organizationText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginBottom: 8,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  amountText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  urgentDeadline: {
    backgroundColor: '#FEE2E2',
  },
  deadlineText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#64748B',
  },
  urgentDeadlineText: {
    color: '#EF4444',
  },
  removeButton: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  browseButton: {
    marginTop: 24,
    backgroundColor: '#0F172A',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  browseButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});
