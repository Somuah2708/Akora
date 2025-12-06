import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, Heart, Calendar, DollarSign, Receipt, Download, CheckCircle } from 'lucide-react-native';
import { supabase } from '../../../lib/supabase';

SplashScreen.preventAutoHideAsync();

interface Donation {
  id: string;
  campaign_title: string;
  amount: number;
  payment_method: string;
  created_at: string;
  status: string;
}

export default function MyDonationsScreen() {
  const router = useRouter();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalDonated, setTotalDonated] = useState(0);

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
    fetchMyDonations();
  }, []);

  const fetchMyDonations = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert('Not Signed In', 'Please sign in to view your donations', [
          { text: 'OK', onPress: () => debouncedRouter.back() }
        ]);
        return;
      }

      const { data, error } = await supabase
        .from('donations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching donations:', error);
        Alert.alert('Error', 'Failed to load your donations');
        return;
      }

      setDonations(data || []);
      
      // Calculate total donated
      const total = data?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;
      setTotalDonated(total);
    } catch (error) {
      console.error('Error in fetchMyDonations:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatPaymentMethod = (method: string) => {
    switch (method) {
      case 'mobile-money': return 'Mobile Money';
      case 'card': return 'Card Payment';
      case 'bank': return 'Bank Transfer';
      default: return method;
    }
  };

  const handleDownloadReceipt = (donation: Donation) => {
    Alert.alert(
      'Download Receipt',
      `Receipt for donation of GH₵${donation.amount.toLocaleString()} to "${donation.campaign_title}"`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Download', onPress: () => {
          // In a real app, this would generate and download a PDF receipt
          Alert.alert('Success', 'Receipt downloaded successfully');
        }}
      ]
    );
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
        <Text style={styles.title}>My Donations</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4169E1" />
          <Text style={styles.loadingText}>Loading donations...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.summaryCard}>
            <Heart size={32} color="#4169E1" fill="#4169E1" />
            <Text style={styles.summaryTitle}>Total Donated</Text>
            <Text style={styles.summaryAmount}>GH₵{totalDonated.toLocaleString()}</Text>
            <Text style={styles.summarySubtitle}>
              {donations.length} donation{donations.length !== 1 ? 's' : ''} made
            </Text>
          </View>

          {donations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Heart size={64} color="#CCCCCC" />
              <Text style={styles.emptyTitle}>No Donations Yet</Text>
              <Text style={styles.emptyText}>
                Start making a difference by supporting a campaign!
              </Text>
              <TouchableOpacity 
                style={styles.browseButton}
                onPress={() => debouncedRouter.back()}
              >
                <Text style={styles.browseButtonText}>Browse Campaigns</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.donationsList}>
              <Text style={styles.sectionTitle}>Donation History</Text>
              {donations.map((donation) => (
                <View key={donation.id} style={styles.donationCard}>
                  <View style={styles.donationHeader}>
                    <View style={styles.statusBadge}>
                      <CheckCircle size={16} color="#10B981" />
                      <Text style={styles.statusText}>{donation.status}</Text>
                    </View>
                    <Text style={styles.donationDate}>
                      {formatDate(donation.created_at)}
                    </Text>
                  </View>

                  <Text style={styles.campaignTitle}>{donation.campaign_title}</Text>

                  <View style={styles.donationDetails}>
                    <View style={styles.detailRow}>
                      <DollarSign size={16} color="#666666" />
                      <Text style={styles.detailLabel}>Amount:</Text>
                      <Text style={styles.detailValue}>
                        GH₵{donation.amount.toLocaleString()}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Calendar size={16} color="#666666" />
                      <Text style={styles.detailLabel}>Method:</Text>
                      <Text style={styles.detailValue}>
                        {formatPaymentMethod(donation.payment_method)}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Receipt size={16} color="#666666" />
                      <Text style={styles.detailLabel}>ID:</Text>
                      <Text style={styles.detailValue}>
                        {donation.id.slice(0, 8)}...
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity 
                    style={styles.receiptButton}
                    onPress={() => handleDownloadReceipt(donation)}
                  >
                    <Download size={16} color="#4169E1" />
                    <Text style={styles.receiptButtonText}>Download Receipt</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
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
  summaryCard: {
    margin: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginTop: 8,
  },
  summaryAmount: {
    fontSize: 32,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  summarySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#999999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
    marginTop: 40,
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
  browseButton: {
    backgroundColor: '#4169E1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  browseButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  donationsList: {
    padding: 16,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 8,
  },
  donationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: 12,
  },
  donationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E4FFF4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
    textTransform: 'capitalize',
  },
  donationDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#999999',
  },
  campaignTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  donationDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  detailValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    flex: 1,
  },
  receiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2FD',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
    marginTop: 4,
  },
  receiptButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
});
