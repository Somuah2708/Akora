import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter } from 'expo-router';
import { ArrowLeft, History, Book, GraduationCap, Globe, Users, Star, ChevronRight, Flag, Award, Building2 } from 'lucide-react-native';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 48;

const SCHOOL_INFO = {
  established: 'Founded in 1927',
  location: 'Achimota, Accra, Ghana',
  type: 'Public Co-educational School',
  motto: 'Ut Omnes Unum Sint (That all may be one)',
  nickname: 'Motown',
  colors: ['Black', 'White', 'Gold'],
  mascot: 'The Black Vulture',
};

const MISSION_VISION = {
  mission: 'To provide world-class education that nurtures morally upright, well-rounded individuals capable of excelling globally while maintaining their African identity.',
  vision: 'To be the leading educational institution in Africa, producing leaders who combine academic excellence with strong moral values.',
};

const HISTORICAL_MILESTONES = [
  {
    year: '1924',
    event: 'Governor Sir Gordon Guggisberg conceived the idea of Achimota College',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Gordon_Guggisberg.jpg/440px-Gordon_Guggisberg.jpg'
  },
  {
    year: '1927',
    event: 'Official opening of Achimota School',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Achimota_School_Assembly_Hall.jpg/440px-Achimota_School_Assembly_Hall.jpg'
  },
  {
    year: '1948',
    event: 'Establishment of University College of Gold Coast at Achimota',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Achimota_School_Clock_Tower.jpg/440px-Achimota_School_Clock_Tower.jpg'
  }
];

const NOTABLE_ALUMNI = [
  {
    name: 'Kwame Nkrumah',
    role: 'First President of Ghana',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Kwame_Nkrumah_%281962%29.jpg/440px-Kwame_Nkrumah_%281962%29.jpg'
  },
  {
    name: 'Edward Akufo-Addo',
    role: 'Former President of Ghana',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Edward_Akufo-Addo.jpg/440px-Edward_Akufo-Addo.jpg'
  },
  {
    name: 'Jerry John Rawlings',
    role: 'Former President of Ghana',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Jerry_Rawlings_1993.jpg/440px-Jerry_Rawlings_1993.jpg'
  }
];

const CORE_VALUES = [
  {
    title: 'Academic Excellence',
    description: 'Commitment to highest standards of education',
    icon: GraduationCap,
    color: '#FFE4E4'
  },
  {
    title: 'Cultural Heritage',
    description: 'Preserving and celebrating African identity',
    icon: Globe,
    color: '#E4EAFF'
  },
  {
    title: 'Character Development',
    description: 'Building strong moral and ethical values',
    icon: Star,
    color: '#E4FFF4'
  },
  {
    title: 'Unity in Diversity',
    description: 'Embracing differences and fostering inclusion',
    icon: Users,
    color: '#FFF4E4'
  }
];

export default function HeritageScreen() {
  const router = useRouter();
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
        <Text style={styles.title}>Our Heritage</Text>
      </View>

      <Image 
        source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Achimota_School_Assembly_Hall.jpg/440px-Achimota_School_Assembly_Hall.jpg' }} 
        style={styles.heroImage}
      />

      <View style={styles.infoCard}>
        <Building2 size={32} color="#4169E1" />
        <Text style={styles.schoolName}>Achimota School</Text>
        <Text style={styles.motto}>{SCHOOL_INFO.motto}</Text>
        <Text style={styles.established}>{SCHOOL_INFO.established}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mission & Vision</Text>
        <View style={styles.missionVisionContainer}>
          <View style={styles.missionCard}>
            <Flag size={24} color="#4169E1" />
            <Text style={styles.cardTitle}>Our Mission</Text>
            <Text style={styles.cardText}>{MISSION_VISION.mission}</Text>
          </View>
          <View style={styles.visionCard}>
            <Star size={24} color="#4169E1" />
            <Text style={styles.cardTitle}>Our Vision</Text>
            <Text style={styles.cardText}>{MISSION_VISION.vision}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Core Values</Text>
        <View style={styles.coreValuesGrid}>
          {CORE_VALUES.map((value, index) => {
            const IconComponent = value.icon;
            return (
              <View key={index} style={[styles.valueCard, { backgroundColor: value.color }]}>
                <IconComponent size={24} color="#000000" />
                <Text style={styles.valueTitle}>{value.title}</Text>
                <Text style={styles.valueDescription}>{value.description}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Historical Milestones</Text>
        {HISTORICAL_MILESTONES.map((milestone, index) => (
          <View key={index} style={styles.milestoneCard}>
            <Image source={{ uri: milestone.image }} style={styles.milestoneImage} />
            <View style={styles.milestoneContent}>
              <View style={styles.yearBadge}>
                <Text style={styles.yearText}>{milestone.year}</Text>
              </View>
              <Text style={styles.milestoneText}>{milestone.event}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Notable Alumni</Text>
          <TouchableOpacity style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>See All</Text>
            <ChevronRight size={16} color="#666666" />
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.alumniContainer}
        >
          {NOTABLE_ALUMNI.map((alumni, index) => (
            <TouchableOpacity key={index} style={styles.alumniCard}>
              <Image source={{ uri: alumni.image }} style={styles.alumniImage} />
              <View style={styles.alumniInfo}>
                <Text style={styles.alumniName}>{alumni.name}</Text>
                <Text style={styles.alumniRole}>{alumni.role}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <View style={styles.statsCard}>
          <Award size={32} color="#4169E1" />
          <Text style={styles.statsTitle}>Legacy of Excellence</Text>
          <Text style={styles.statsText}>
            Over 90 years of academic excellence, producing leaders in various fields globally
          </Text>
          <TouchableOpacity style={styles.learnMoreButton}>
            <Text style={styles.learnMoreText}>Explore Our History</Text>
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
    marginLeft: 12,
  },
  heroImage: {
    width: '100%',
    height: 200,
  },
  infoCard: {
    margin: 16,
    padding: 24,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
  },
  schoolName: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  motto: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    fontStyle: 'italic',
  },
  established: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
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
    marginHorizontal: 16,
    marginBottom: 16,
  },
  missionVisionContainer: {
    paddingHorizontal: 16,
    gap: 16,
  },
  missionCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  visionCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  cardText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    lineHeight: 20,
  },
  coreValuesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingHorizontal: 16,
  },
  valueCard: {
    width: (width - 48) / 2,
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  valueTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  valueDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  milestoneCard: {
    marginHorizontal: 16,
    marginBottom: 16,
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
  milestoneImage: {
    width: '100%',
    height: 200,
  },
  milestoneContent: {
    padding: 16,
  },
  yearBadge: {
    backgroundColor: '#4169E1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  yearText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  milestoneText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
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
  alumniContainer: {
    paddingHorizontal: 16,
    gap: 16,
  },
  alumniCard: {
    width: 200,
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
  alumniImage: {
    width: '100%',
    height: 240,
  },
  alumniInfo: {
    padding: 12,
  },
  alumniName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 4,
  },
  alumniRole: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  statsCard: {
    margin: 16,
    padding: 24,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
  },
  statsTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    textAlign: 'center',
  },
  statsText: {
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