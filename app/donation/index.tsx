import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, TextInput, Dimensions } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter } from 'expo-router';
import { ArrowLeft, Heart, Target, GraduationCap, Building2, Users, Wallet, ChevronRight, Bell, Gift, Sparkles, Trophy, Clock, Star } from 'lucide-react-native';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 48;

const FEATURED_CAMPAIGNS = [
  {
    id: '1',
    title: 'New Science Lab Equipment',
    description: 'Help equip our labs with modern technology',
    target: '$50,000',
    raised: '$32,450',
    progress: 65,
    daysLeft: 45,
    image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: '2',
    title: 'Student Scholarship Fund',
    description: 'Support bright minds achieve their dreams',
    target: '$100,000',
    raised: '$78,900',
    progress: 79,
    daysLeft: 30,
    image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&auto=format&fit=crop&q=60',
  },
];

const DONATION_CATEGORIES = [
  {
    id: '1',
    title: 'Infrastructure',
    description: 'Campus buildings and facilities',
    icon: Building2,
    color: '#FFE4E4',
  },
  {
    id: '2',
    title: 'Scholarships',
    description: 'Student financial aid',
    icon: GraduationCap,
    color: '#E4EAFF',
  },
  {
    id: '3',
    title: 'Research',
    description: 'Academic research funding',
    icon: Target,
    color: '#E4FFF4',
  },
  {
    id: '4',
    title: 'Student Life',
    description: 'Campus activities and programs',
    icon: Users,
    color: '#FFF4E4',
  },
];

const RECENT_DONORS = [
  {
    id: '1',
    name: 'Sarah Wilson',
    amount: '$5,000',
    campaign: 'Science Lab Equipment',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=60',
  },
  {
    id: '2',
    name: 'Michael Chen',
    amount: '$2,500',
    campaign: 'Scholarship Fund',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=60',
  },
  {
    id: '3',
    name: 'Emma Thompson',
    amount: '$10,000',
    campaign: 'Library Resources',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&auto=format&fit=crop&q=60',
  },
];

const IMPACT_STATS = [
  {
    title: 'Total Raised',
    value: '$2.5M',
    icon: Wallet,
  },
  {
    title: 'Donors',
    value: '1,200+',
    icon: Users,
  },
  {
    title: 'Projects',
    value: '45',
    icon: Target,
  },
];

export default function DonationScreen() {
  const router = useRouter();
  const [selectedAmount, setSelectedAmount] = useState<string>('');
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.title}>Make a Difference</Text>
        <TouchableOpacity style={styles.notificationButton}>
          <Bell size={24} color="#000000" />
        </TouchableOpacity>
      </View>

      <View style={styles.impactSection}>
        <View style={styles.impactGrid}>
          {IMPACT_STATS.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <View key={index} style={styles.impactCard}>
                <IconComponent size={24} color="#4169E1" />
                <Text style={styles.impactValue}>{stat.value}</Text>
                <Text style={styles.impactTitle}>{stat.title}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Campaigns</Text>
          <TouchableOpacity style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>See All</Text>
            <ChevronRight size={16} color="#666666" />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.campaignsContainer}
        >
          {FEATURED_CAMPAIGNS.map((campaign) => (
            <TouchableOpacity key={campaign.id} style={styles.campaignCard}>
              <Image source={{ uri: campaign.image }} style={styles.campaignImage} />
              <View style={styles.campaignContent}>
                <Text style={styles.campaignTitle}>{campaign.title}</Text>
                <Text style={styles.campaignDescription}>{campaign.description}</Text>
                <View style={styles.progressContainer}>
                  <View style={[styles.progressBar, { width: `${campaign.progress}%` }]} />
                </View>
                <View style={styles.campaignStats}>
                  <View style={styles.statItem}>
                    <Wallet size={16} color="#666666" />
                    <Text style={styles.statText}>{campaign.raised} raised</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Target size={16} color="#666666" />
                    <Text style={styles.statText}>Goal: {campaign.target}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Clock size={16} color="#666666" />
                    <Text style={styles.statText}>{campaign.daysLeft} days left</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.donateButton}>
                  <Heart size={16} color="#FFFFFF" />
                  <Text style={styles.donateButtonText}>Donate Now</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ways to Give</Text>
        <View style={styles.categoriesGrid}>
          {DONATION_CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[styles.categoryCard, { backgroundColor: category.color }]}
            >
              {category.icon && <category.icon size={24} color="#000000" />}
              <Text style={styles.categoryTitle}>{category.title}</Text>
              <Text style={styles.categoryDescription}>{category.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Donors</Text>
          <TouchableOpacity style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>See All</Text>
            <ChevronRight size={16} color="#666666" />
          </TouchableOpacity>
        </View>
        {RECENT_DONORS.map((donor) => (
          <View key={donor.id} style={styles.donorCard}>
            <Image source={{ uri: donor.image }} style={styles.donorImage} />
            <View style={styles.donorInfo}>
              <Text style={styles.donorName}>{donor.name}</Text>
              <Text style={styles.donorCampaign}>Donated to {donor.campaign}</Text>
            </View>
            <View style={styles.donationAmount}>
              <Text style={styles.amountText}>{donor.amount}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.recognitionCard}>
          <Trophy size={32} color="#FFB800" />
          <Text style={styles.recognitionTitle}>Donor Recognition</Text>
          <Text style={styles.recognitionText}>
            Join our distinguished donors and make a lasting impact on education
          </Text>
          <TouchableOpacity style={styles.learnMoreButton}>
            <Text style={styles.learnMoreText}>Learn More</Text>
            <ChevronRight size={16} color="#4169E1" />
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
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
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  notificationButton: {
    padding: 8,
  },
  impactSection: {
    padding: 16,
  },
  impactGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  impactCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  impactValue: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  impactTitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  campaignsContainer: {
    paddingHorizontal: 16,
    gap: 16,
  },
  campaignCard: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
    gap: 12,
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
  },
  progressContainer: {
    height: 4,
    backgroundColor: '#F0F0F0',
    borderRadius: 2,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4169E1',
    borderRadius: 2,
  },
  campaignStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  },
  donateButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingHorizontal: 16,
  },
  categoryCard: {
    width: (width - 48) / 2,
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  categoryTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  categoryDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  donorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  donorName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  donorCampaign: {
    fontSize: 14,
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
  recognitionCard: {
    margin: 16,
    padding: 24,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
  },
  recognitionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    textAlign: 'center',
  },
  recognitionText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    textAlign: 'center',
  },
  learnMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  learnMoreText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
});