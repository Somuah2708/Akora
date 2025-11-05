import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter } from 'expo-router';
import { ArrowLeft, Users, Star, Trophy } from 'lucide-react-native';
import { supabase } from '../../../lib/supabase';

SplashScreen.preventAutoHideAsync();

export default function AllDonorsScreen() {
  const router = useRouter();
  const [donors, setDonors] = useState<any[]>([]);
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
    fetchDonors();
  }, []);

  const fetchDonors = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('donors')
        .select('*')
        .order('total_donated', { ascending: false });

      if (error) {
        console.error('Error fetching donors:', error);
        return;
      }

      const transformedDonors = data?.map(donor => ({
        id: donor.id,
        name: donor.name,
        amount: `GH₵${donor.total_donated.toLocaleString()}`,
        totalDonated: donor.total_donated,
        donationCount: donor.donation_count,
        image: donor.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=60',
        recognitionLevel: donor.recognition_level,
        isRecurring: donor.is_recurring_donor,
        lastDonation: new Date(donor.last_donation_date).toLocaleDateString(),
      })) || [];

      setDonors(transformedDonors);
    } catch (error) {
      console.error('Error in fetchDonors:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRecognitionColor = (level: string) => {
    switch (level) {
      case 'diamond': return '#B9F2FF';
      case 'platinum': return '#E5E4E2';
      case 'gold': return '#FFD700';
      case 'silver': return '#C0C0C0';
      case 'bronze': return '#CD7F32';
      default: return '#CCCCCC';
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.title}>All Donors</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4169E1" />
          <Text style={styles.loadingText}>Loading donors...</Text>
        </View>
      ) : donors.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Users size={64} color="#CCCCCC" />
          <Text style={styles.emptyTitle}>No Donors Yet</Text>
          <Text style={styles.emptyText}>Be the first to make a difference!</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.donorsSection}>
            <View style={styles.statsCard}>
              <Trophy size={32} color="#FFD700" />
              <Text style={styles.statsTitle}>Hall of Fame</Text>
              <Text style={styles.statsSubtitle}>
                {donors.length} generous donors supporting our mission
              </Text>
            </View>

            <View style={styles.donorsList}>
              {donors.map((donor, index) => (
                <View key={donor.id} style={styles.donorCard}>
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>#{index + 1}</Text>
                  </View>
                  <Image source={{ uri: donor.image }} style={styles.donorImage} />
                  <View style={styles.donorInfo}>
                    <View style={styles.donorNameRow}>
                      <Text style={styles.donorName}>{donor.name}</Text>
                      {donor.recognitionLevel && (
                        <View style={[styles.recognitionBadge, { backgroundColor: getRecognitionColor(donor.recognitionLevel) }]}>
                          <Text style={styles.recognitionBadgeText}>
                            {donor.recognitionLevel.toUpperCase()}
                          </Text>
                        </View>
                      )}
                      {donor.isRecurring && (
                        <View style={styles.recurringBadge}>
                          <Star size={12} color="#FFB800" fill="#FFB800" />
                        </View>
                      )}
                    </View>
                    <Text style={styles.donorStats}>
                      {donor.donationCount} donation{donor.donationCount > 1 ? 's' : ''} • Last: {donor.lastDonation}
                    </Text>
                  </View>
                  <View style={styles.donationAmount}>
                    <Text style={styles.amountText}>{donor.amount}</Text>
                  </View>
                </View>
              ))}
            </View>
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
  donorsSection: {
    padding: 16,
  },
  statsCard: {
    backgroundColor: '#FFF9E6',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  statsTitle: {
    fontSize: 22,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  statsSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    textAlign: 'center',
  },
  donorsList: {
    gap: 12,
  },
  donorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4169E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  donorImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  donorInfo: {
    flex: 1,
    marginLeft: 12,
  },
  donorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  donorName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  recognitionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  recognitionBadgeText: {
    fontSize: 8,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  recurringBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFF9E6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  donorStats: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  donationAmount: {
    backgroundColor: '#EBF0FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  amountText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
});
