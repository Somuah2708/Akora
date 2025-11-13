import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Linking, Alert } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, MapPin, Globe, Mail, Award, Calendar, DollarSign, BookOpen, Share2, Bookmark, ExternalLink } from 'lucide-react-native';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';

SplashScreen.preventAutoHideAsync();

export default function EducationDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [opportunity, setOpportunity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);

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
    fetchOpportunityDetails();
    if (user) {
      checkBookmarkStatus();
    }
  }, [id, user]);

  const fetchOpportunityDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products_services')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setOpportunity(data);
    } catch (error) {
      console.error('Error fetching opportunity details:', error);
      Alert.alert('Error', 'Failed to load details.');
    } finally {
      setLoading(false);
    }
  };

  const checkBookmarkStatus = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('education_bookmarks')
        .select('id')
        .eq('user_id', user.id)
        .eq('opportunity_id', id)
        .single();

      setIsBookmarked(!!data);
    } catch (error) {
      // Not bookmarked
      setIsBookmarked(false);
    }
  };

  const toggleBookmark = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please sign in to bookmark this opportunity.');
      return;
    }

    try {
      if (isBookmarked) {
        await supabase
          .from('education_bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('opportunity_id', id);
        setIsBookmarked(false);
        Alert.alert('Removed', 'Removed from bookmarks.');
      } else {
        await supabase
          .from('education_bookmarks')
          .insert({ user_id: user.id, opportunity_id: id });
        setIsBookmarked(true);
        Alert.alert('Saved', 'Added to bookmarks!');
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      Alert.alert('Error', 'Failed to update bookmark.');
    }
  };

  const handleApplyNow = () => {
    if (opportunity?.application_url) {
      Linking.openURL(opportunity.application_url);
    } else {
      Alert.alert('No Link', 'Application link not available.');
    }
  };

  const handleContactEmail = () => {
    if (opportunity?.contact_email) {
      Linking.openURL(`mailto:${opportunity.contact_email}`);
    } else {
      Alert.alert('No Email', 'Contact email not available.');
    }
  };

  const calculateDaysLeft = (deadlineDate: string) => {
    // Only compute if valid ISO date YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(deadlineDate)) return null;
    const deadline = new Date(deadlineDate);
    if (isNaN(deadline.getTime())) return null;
    const today = new Date();
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (!fontsLoaded || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4169E1" />
        <Text style={styles.loadingText}>Loading details...</Text>
      </View>
    );
  }

  if (!opportunity) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Opportunity not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButtonError}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isScholarship = opportunity.category_name === 'Scholarships';
  const daysLeft = opportunity.deadline_date ? calculateDaysLeft(opportunity.deadline_date) : null;

  // Parse image_url if it's a JSON array
  let imageUri = opportunity.image_url || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800';
  if (imageUri && imageUri.startsWith('[')) {
    try {
      const parsed = JSON.parse(imageUri);
      imageUri = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : imageUri;
    } catch (e) {
      // Keep original if parsing fails
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Details</Text>
        <TouchableOpacity onPress={toggleBookmark} style={styles.bookmarkButton}>
          <Bookmark 
            size={24} 
            color={isBookmarked ? "#4169E1" : "#000000"} 
            fill={isBookmarked ? "#4169E1" : "none"}
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Main Image */}
        <Image 
          source={{ uri: imageUri }} 
          style={styles.mainImage} 
        />

        {/* Content */}
        <View style={styles.content}>
          {/* Category Badge */}
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{opportunity.category_name}</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>{opportunity.title}</Text>

          {/* Location (for Universities) */}
          {opportunity.location && (
            <View style={styles.infoRow}>
              <MapPin size={18} color="#666666" />
              <Text style={styles.infoText}>{opportunity.location}</Text>
            </View>
          )}

          {/* Deadline Badge (for Scholarships) */}
          {daysLeft !== null && (
            <View style={[styles.deadlineBadge, daysLeft < 30 && styles.urgentDeadline]}>
              <Calendar size={16} color={daysLeft < 30 ? "#FF6B6B" : "#4169E1"} />
              <Text style={[styles.deadlineText, daysLeft < 30 && styles.urgentText]}>
                {daysLeft > 0 ? `${daysLeft} days left` : 'Deadline passed'}
              </Text>
            </View>
          )}
          {/* Show deadline_text if provided (freeform) or fallback to raw deadline_date */}
          {daysLeft === null && (opportunity.deadline_text || opportunity.deadline_date) && (
            <View style={styles.infoRow}>
              <Calendar size={18} color="#666666" />
              <Text style={styles.infoText}>Deadline: {opportunity.deadline_text || opportunity.deadline_date}</Text>
            </View>
          )}

          {/* Funding Amount (for Scholarships) */}
          {isScholarship && opportunity.funding_amount && (
            <View style={styles.fundingCard}>
              <DollarSign size={20} color="#4CAF50" />
              <View>
                <Text style={styles.fundingLabel}>Funding Amount</Text>
                <Text style={styles.fundingAmount}>{opportunity.funding_currency === 'GHS' ? '₵' : '$'}{opportunity.funding_amount}</Text>
              </View>
            </View>
          )}

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>{opportunity.description}</Text>
          </View>

          {/* Eligibility Criteria */}
          {opportunity.eligibility_criteria && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Eligibility Requirements</Text>
              <View style={styles.eligibilityBox}>
                <BookOpen size={20} color="#4169E1" />
                <Text style={styles.eligibilityText}>{opportunity.eligibility_criteria}</Text>
              </View>
            </View>
          )}

          {/* Contact Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            {opportunity.contact_email && (
              <TouchableOpacity style={styles.contactButton} onPress={handleContactEmail}>
                <Mail size={18} color="#4169E1" />
                <Text style={styles.contactText}>{opportunity.contact_email}</Text>
              </TouchableOpacity>
            )}
            {opportunity.website_url && (
              <TouchableOpacity style={styles.contactButton} onPress={() => Linking.openURL(opportunity.website_url)}>
                <Globe size={18} color="#4169E1" />
                <Text style={styles.contactText}>Visit Website</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Apply Now Button */}
          {opportunity.application_url && (
            <TouchableOpacity style={styles.applyButton} onPress={handleApplyNow}>
              <Text style={styles.applyButtonText}>
                {isScholarship ? 'Apply for Scholarship' : 'Apply Now'}
              </Text>
              <ExternalLink size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
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
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  bookmarkButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  mainImage: {
    width: '100%',
    height: 250,
  },
  content: {
    padding: 20,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  categoryText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 12,
    lineHeight: 32,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  deadlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  urgentDeadline: {
    backgroundColor: '#FFE5E5',
  },
  deadlineText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  urgentText: {
    color: '#FF6B6B',
  },
  fundingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  fundingLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  fundingAmount: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#4CAF50',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#333333',
    lineHeight: 24,
  },
  eligibilityBox: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4169E1',
  },
  eligibilityText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#333333',
    lineHeight: 22,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8F9FA',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#4169E1',
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4169E1',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  applyButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
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
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
  },
  backButtonError: {
    marginTop: 16,
    backgroundColor: '#4169E1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});
