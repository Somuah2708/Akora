import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter, useLocalSearchParams } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, Heart, Target, Wallet, Clock } from 'lucide-react-native';
import { supabase } from '../../../../lib/supabase';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');

export default function CategoryCampaignsScreen() {
  const router = useRouter();
  const { category } = useLocalSearchParams();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (category) {
      fetchCampaigns();
    }
  }, [category]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('donation_campaigns')
        .select('*')
        .eq('status', 'active')
        .eq('category', (category as string))
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching campaigns:', error);
        return;
      }

      const transformedCampaigns = data?.map(campaign => ({
        id: campaign.id,
        title: campaign.title,
        description: campaign.description,
        target: `GH₵${campaign.goal_amount.toLocaleString()}`,
        raised: `GH₵${campaign.current_amount.toLocaleString()}`,
        progress: Math.min((campaign.current_amount / campaign.goal_amount) * 100, 100),
        daysLeft: campaign.deadline ? Math.max(0, Math.ceil((new Date(campaign.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) : 0,
        category: campaign.category,
        image: campaign.campaign_image || 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800',
        targetAmount: campaign.goal_amount,
        raisedAmount: campaign.current_amount,
      })) || [];

      setCampaigns(transformedCampaigns);
    } catch (error) {
      console.error('Error in fetchCampaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.title}>{category && (category as string).charAt(0).toUpperCase() + (category as string).slice(1)}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0F172A" />
          <Text style={styles.loadingText}>Loading campaigns...</Text>
        </View>
      ) : campaigns.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Heart size={64} color="#CCCCCC" />
          <Text style={styles.emptyTitle}>No {category} Campaigns</Text>
          <Text style={styles.emptyText}>Check back soon for new campaigns in this category!</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.campaignsGrid}>
            {campaigns.map((campaign) => (
              <View key={campaign.id} style={styles.campaignCard}>
                <Image source={{ uri: campaign.image }} style={styles.campaignImage} />
                <View style={styles.campaignContent}>
                  <Text style={styles.campaignTitle}>{campaign.title}</Text>
                  <Text style={styles.campaignDescription} numberOfLines={2}>
                    {campaign.description}
                  </Text>
                  <View style={styles.progressContainer}>
                    <View style={[styles.progressBar, { width: `${campaign.progress}%` }]} />
                  </View>
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Wallet size={14} color="#666666" />
                      <Text style={styles.statText}>{campaign.raised}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Target size={14} color="#666666" />
                      <Text style={styles.statText}>{campaign.target}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Clock size={14} color="#666666" />
                      <Text style={styles.statText}>{campaign.daysLeft}d left</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.donateButton}
                    onPress={() => debouncedRouter.back()}
                  >
                    <Heart size={16} color="#FFFFFF" />
                    <Text style={styles.donateButtonText}>Donate Now</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
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
  campaignsGrid: {
    padding: 16,
    gap: 16,
  },
  campaignCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  campaignImage: {
    width: '100%',
    height: 200,
  },
  campaignContent: {
    padding: 16,
    gap: 10,
  },
  campaignTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  campaignDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    lineHeight: 20,
  },
  progressContainer: {
    height: 6,
    backgroundColor: '#F0F0F0',
    borderRadius: 3,
    marginTop: 4,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4169E1',
    borderRadius: 3,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  donateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4169E1',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  donateButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});
