import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bookmark, Trash2, Clock, Wallet } from 'lucide-react-native';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';

export default function SavedOpportunitiesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [savedOpportunities, setSavedOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  useEffect(() => {
    if (user) {
      fetchSavedOpportunities();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchSavedOpportunities = async () => {
    try {
      setLoading(true);
      
      // First get bookmark IDs
      const { data: bookmarks, error: bookmarkError } = await supabase
        .from('education_bookmarks')
        .select('id, opportunity_id, created_at')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (bookmarkError) throw bookmarkError;

      if (!bookmarks || bookmarks.length === 0) {
        setSavedOpportunities([]);
        setLoading(false);
        return;
      }

      // Then get the actual opportunities
      const opportunityIds = bookmarks.map(b => b.opportunity_id);
      const { data: opportunities, error: oppError } = await supabase
        .from('products_services')
        .select('*')
        .in('id', opportunityIds);

      if (oppError) throw oppError;

      // Combine bookmark info with opportunity data
      const combined = bookmarks.map(bookmark => ({
        id: bookmark.id,
        created_at: bookmark.created_at,
        products_services: opportunities?.find(o => o.id === bookmark.opportunity_id) || null
      }));

      setSavedOpportunities(combined);
    } catch (error) {
      console.error('Error fetching saved opportunities:', error);
      Alert.alert('Error', 'Failed to load saved opportunities.');
    } finally {
      setLoading(false);
    }
  };

  const removeBookmark = async (bookmarkId: string) => {
    try {
      const { error } = await supabase
        .from('education_bookmarks')
        .delete()
        .eq('id', bookmarkId);

      if (error) throw error;
      
      setSavedOpportunities(prev => prev.filter(item => item.id !== bookmarkId));
      Alert.alert('Removed', 'Opportunity removed from saved items.');
    } catch (error) {
      console.error('Error removing bookmark:', error);
      Alert.alert('Error', 'Failed to remove bookmark.');
    }
  };

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.title}>Saved Opportunities</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4169E1" />
          <Text style={styles.loadingText}>Loading saved opportunities...</Text>
        </View>
      ) : savedOpportunities.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Star size={64} color="#CCCCCC" />
          <Text style={styles.emptyTitle}>No Saved Opportunities</Text>
          <Text style={styles.emptyText}>Bookmark opportunities to save them for later!</Text>
          <TouchableOpacity 
            style={styles.exploreButton}
            onPress={() => router.push('/education' as any)}
          >
            <Text style={styles.exploreButtonText}>Explore Opportunities</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <Text style={styles.countText}>{savedOpportunities.length} saved {savedOpportunities.length === 1 ? 'opportunity' : 'opportunities'}</Text>
          
          {savedOpportunities.map((item) => {
            const opportunity = item.products_services;
            
            return (
              <TouchableOpacity 
                key={item.id} 
                style={styles.opportunityCard}
                onPress={() => router.push(`/education/opportunity-detail?id=${opportunity.id}` as any)}
              >
                <Image 
                  source={{ uri: opportunity.image_url || 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800' }} 
                  style={styles.opportunityImage} 
                />
                <View style={styles.opportunityInfo}>
                  <View style={styles.categoryTag}>
                    <Text style={styles.categoryText}>{opportunity.category_name}</Text>
                  </View>
                  <Text style={styles.opportunityTitle}>{opportunity.title}</Text>
                  <Text style={styles.description} numberOfLines={2}>
                    {opportunity.description}
                  </Text>
                  <View style={styles.detailsRow}>
                    {opportunity.funding_amount && (
                      <View style={styles.detailItem}>
                        <Wallet size={14} color="#666666" />
                        <Text style={styles.detailText}>${opportunity.funding_amount}</Text>
                      </View>
                    )}
                    {opportunity.deadline_date && (
                      <View style={styles.detailItem}>
                        <Clock size={14} color="#FF6B6B" />
                        <Text style={styles.deadlineText}>
                          {new Date(opportunity.deadline_date) > new Date() 
                            ? `${Math.ceil((new Date(opportunity.deadline_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days left`
                            : 'Expired'
                          }
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.savedInfo}>
                    <Text style={styles.savedText}>
                      Saved {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                    <TouchableOpacity 
                      style={styles.removeButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        Alert.alert(
                          'Remove Bookmark',
                          'Are you sure you want to remove this from saved opportunities?',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Remove', style: 'destructive', onPress: () => removeBookmark(item.id) }
                          ]
                        );
                      }}
                    >
                      <Trash2 size={16} color="#EF4444" />
                      <Text style={styles.removeText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#999999',
    textAlign: 'center',
  },
  exploreButton: {
    backgroundColor: '#4169E1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  exploreButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  countText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  opportunityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  opportunityImage: {
    width: '100%',
    height: 150,
  },
  opportunityInfo: {
    padding: 16,
    gap: 8,
  },
  categoryTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  opportunityTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  description: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    lineHeight: 20,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  deadlineText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#FF6B6B',
  },
  savedInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  savedText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#999999',
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  removeText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
  },
});
