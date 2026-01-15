import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  Dimensions,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { debouncedRouter } from '@/utils/navigationDebounce';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  User,
  DollarSign,
  Calendar,
  CreditCard,
  MessageSquare,
  FileText,
  X,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

const { width, height } = Dimensions.get('window');

interface Donation {
  id: string;
  user_id: string;
  campaign_id: string;
  amount: number;
  payment_method: string;
  payment_proof_url: string;
  is_anonymous: boolean;
  donor_message: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  campaign_title?: string;
  donor_name?: string;
  donor_avatar?: string;
}

export default function DonationDetailsScreen() {
  const { id } = useLocalSearchParams();
  const [donation, setDonation] = useState<Donation | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  useEffect(() => {
    fetchDonationDetails();
  }, [id]);

  const fetchDonationDetails = async () => {
    try {
      setLoading(true);

      // Fetch donation
      const { data: donationData, error: donationError } = await supabase
        .from('donations')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (donationError) {
        console.error('Error fetching donation:', donationError);
        return;
      }

      if (!donationData) {
        console.error('No donation found with id:', id);
        return;
      }

      // Fetch campaign title
      const { data: campaignData } = await supabase
        .from('donation_campaigns')
        .select('title')
        .eq('id', donationData.campaign_id)
        .maybeSingle();

      // Fetch donor profile if not anonymous
      let donorProfile = null;
      if (!donationData.is_anonymous) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', donationData.user_id)
          .maybeSingle();
        donorProfile = profileData;
      }

      setDonation({
        ...donationData,
        campaign_title: campaignData?.title || 'Unknown Campaign',
        donor_name: donationData.is_anonymous ? 'Anonymous Donor' : (donorProfile?.full_name || 'Unknown'),
        donor_avatar: donationData.is_anonymous ? null : donorProfile?.avatar_url,
      });
    } catch (error) {
      console.error('Error fetching donation details:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return `GH₵${amount.toLocaleString()}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return '#10B981';
      case 'rejected':
        return '#EF4444';
      default:
        return '#F59E0B';
    }
  };

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffc857" />
          <Text style={styles.loadingText}>Loading donation details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!donation) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Donation not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => debouncedRouter.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <RNStatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => debouncedRouter.back()}
          >
            <ChevronLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Donation Details</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Badge */}
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: `${getStatusColor(donation.status)}20` },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: getStatusColor(donation.status) },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(donation.status) },
              ]}
            >
              {getStatusText(donation.status)}
            </Text>
          </View>
        </View>

        {/* Donor Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <User size={20} color="#0F172A" />
            <Text style={styles.sectionTitle}>Donor Information</Text>
          </View>
          <View style={styles.donorCard}>
            {donation.donor_avatar ? (
              <Image source={{ uri: donation.donor_avatar }} style={styles.donorAvatar} />
            ) : (
              <View style={styles.donorAvatarPlaceholder}>
                <User size={24} color="#64748B" />
              </View>
            )}
            <View style={styles.donorInfo}>
              <Text style={styles.donorName}>{donation.donor_name}</Text>
              <Text style={styles.donorLabel}>
                {donation.is_anonymous ? 'Anonymous Donation' : 'Public Donation'}
              </Text>
            </View>
          </View>
        </View>

        {/* Campaign Info */}
        <View style={styles.section}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Campaign</Text>
            <Text style={styles.infoValue}>{donation.campaign_title}</Text>
          </View>
        </View>

        {/* Amount */}
        <View style={styles.section}>
          <View style={styles.amountCard}>
            <DollarSign size={24} color="#ffc857" />
            <View style={styles.amountInfo}>
              <Text style={styles.amountLabel}>Donation Amount</Text>
              <Text style={styles.amountValue}>{formatCurrency(donation.amount)}</Text>
            </View>
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <View style={styles.infoRow}>
            <View style={styles.infoRowLeft}>
              <CreditCard size={18} color="#64748B" />
              <Text style={styles.infoLabel}>Payment Method</Text>
            </View>
            <Text style={styles.infoValue}>
              {donation.payment_method.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Date */}
        <View style={styles.section}>
          <View style={styles.infoRow}>
            <View style={styles.infoRowLeft}>
              <Calendar size={18} color="#64748B" />
              <Text style={styles.infoLabel}>Date</Text>
            </View>
            <Text style={styles.infoValue}>{formatDate(donation.created_at)}</Text>
          </View>
        </View>

        {/* Payment Receipt */}
        {donation.payment_proof_url && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <FileText size={20} color="#0F172A" />
              <Text style={styles.sectionTitle}>Payment Receipt</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                console.log('Receipt image tapped, opening full screen');
                setFullScreenImage(donation.payment_proof_url);
              }}
              activeOpacity={0.7}
            >
              <Image
                source={{ uri: donation.payment_proof_url }}
                style={styles.receiptImage}
                resizeMode="contain"
              />
              <View style={styles.tapToEnlargeContainer}>
                <Text style={styles.tapToEnlargeText}>👆 Tap to view full size</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Donor Message */}
        {donation.donor_message && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MessageSquare size={20} color="#0F172A" />
              <Text style={styles.sectionTitle}>Donor Message</Text>
            </View>
            <View style={styles.messageCard}>
              <Text style={styles.messageText}>{donation.donor_message}</Text>
            </View>
          </View>
        )}

        {/* Admin Notes */}
        {donation.admin_notes && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <FileText size={20} color="#0F172A" />
              <Text style={styles.sectionTitle}>Admin Notes</Text>
            </View>
            <View style={styles.notesCard}>
              <Text style={styles.notesText}>{donation.admin_notes}</Text>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Full Screen Image Modal */}
      <Modal
        visible={fullScreenImage !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullScreenImage(null)}
      >
        <SafeAreaView style={styles.fullScreenModalContainer} edges={[]}>
          <RNStatusBar barStyle="light-content" />

          <TouchableOpacity
            style={styles.fullScreenCloseButton}
            onPress={() => {
              console.log('Close button pressed');
              setFullScreenImage(null);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.fullScreenCloseButtonCircle}>
              <X size={32} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.fullScreenTapArea}
            activeOpacity={1}
            onPress={() => {
              console.log('Background tapped');
              setFullScreenImage(null);
            }}
          >
            {fullScreenImage && (
              <Image
                source={{ uri: fullScreenImage }}
                style={styles.fullScreenImageStyle}
                resizeMode="contain"
              />
            )}
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
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
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#64748B',
    marginBottom: 20,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#0F172A',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
    padding: 16,
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  donorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  donorAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  donorAvatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  donorInfo: {
    flex: 1,
  },
  donorName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  donorLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
  },
  infoRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
  },
  amountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 200, 87, 0.1)',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffc857',
    gap: 16,
  },
  amountInfo: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
  },
  receiptImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  tapToEnlargeContainer: {
    backgroundColor: 'rgba(255, 200, 87, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  tapToEnlargeText: {
    fontSize: 14,
    color: '#ffc857',
    fontWeight: '700',
  },
  messageCard: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
  },
  messageText: {
    fontSize: 15,
    color: '#0F172A',
    lineHeight: 22,
  },
  notesCard: {
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  notesText: {
    fontSize: 15,
    color: '#0F172A',
    lineHeight: 22,
  },
  fullScreenModalContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenTapArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    zIndex: 100,
    elevation: 100,
  },
  fullScreenCloseButtonCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImageStyle: {
    width: width * 0.95,
    height: height * 0.9,
  },
});
