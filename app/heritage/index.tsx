import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, StatusBar } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useEffect } from 'react';
import { SplashScreen, useRouter } from 'expo-router'
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, History, Book, GraduationCap, Globe, Users, Star, ChevronRight, Flag, Award, Building2, Calendar, Crown, Sparkles, TrendingUp, Heart, Music, Briefcase, Scale, Microscope, MapPin } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

SplashScreen.preventAutoHideAsync();

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width - 48;

const SCHOOL_INFO = {
  established: '28 January 1927',
  foundingYear: '1927',
  location: 'Achimota, Accra, Ghana',
  type: 'Co-educational Boarding School',
  motto: 'Ut Omnes Unum Sint',
  mottoTranslation: 'That They All May Be One',
  nickname: 'Motown',
  originalName: 'Prince of Wales College and School',
  campus: '525 hectares (1,300 acres)',
  colors: ['Black', 'White'],
  mascot: 'Kuziunik (Mythical Creature)',
  category: 'Category A School',
};

const FOUNDERS = [
  {
    name: 'Sir Frederick Gordon Guggisberg',
    role: 'Visionary & Founder',
    description: 'Governor of Gold Coast who conceived and championed the establishment',
    icon: Crown,
    color: '#ffc857',
  },
  {
    name: 'Rev. Alexander Garden Fraser',
    role: 'First Principal (1924-1935)',
    description: 'Previously Principal of Trinity College, Kandy, Sri Lanka',
    icon: Book,
    color: '#ffc857',
  },
  {
    name: 'Dr. James Emman Kwegyir Aggrey',
    role: 'First Vice-Principal (1924-1927)',
    description: 'Champion of women\'s education and co-educational philosophy',
    icon: Star,
    color: '#ffc857',
  },
];

const MISSION_VISION = {
  mission: 'To provide world-class education that nurtures morally upright, well-rounded individuals capable of excelling globally while maintaining their African identity.',
  vision: 'To be the leading educational institution in Africa, producing leaders who combine academic excellence with strong moral values and Pan-African consciousness.',
  philosophy: '"You can play a tune of sorts on the black keys only; and you can play a tune of sorts on the white keys only; but for perfect harmony, you must use both the black and the white keys." - Dr. James Aggrey',
};

const HISTORICAL_MILESTONES = [
  {
    year: '1920',
    event: 'Governor Guggisberg meets Dr. James Aggrey, laying groundwork for Achimota',
    image: 'https://upload.wikimedia.org/wikipedia/commons/3/37/Gordon_Guggisberg.jpg',
    description: 'The Phelps Stokes Commission visits Gold Coast',
  },
  {
    year: '1924',
    event: 'Foundation Stone Laid',
    image: 'https://upload.wikimedia.org/wikipedia/commons/b/b9/Achimota_School_Assembly_Hall.jpg',
    description: 'Construction begins on Prince of Wales College and School',
  },
  {
    year: '1927',
    event: 'Official Opening by Prince of Wales',
    image: 'https://upload.wikimedia.org/wikipedia/commons/3/30/Achimota_School_Clock_Tower.jpg',
    description: 'School opens on 28 January with Edward VIII, Prince of Wales, as guest of honor',
  },
  {
    year: '1948',
    event: 'Birth of University of Ghana',
    image: 'https://upload.wikimedia.org/wikipedia/commons/3/3a/Great_hall_university_of_Ghana.jpg',
    description: 'University College of Gold Coast established at Achimota, later becoming University of Ghana',
  },
  {
    year: '2003',
    event: 'Ranked Among Africa\'s Top Schools',
    image: 'https://upload.wikimedia.org/wikipedia/commons/b/b9/Achimota_School_Assembly_Hall.jpg',
    description: 'Listed in Africa\'s Top 100 High Schools by Africa Almanac',
  },
];

const NOTABLE_ALUMNI = [
  {
    name: 'Kwame Nkrumah',
    role: 'First President of Ghana',
    category: 'Political Leader',
    image: 'https://upload.wikimedia.org/wikipedia/commons/4/4c/Kwame_Nkrumah_%281962%29.jpg',
    description: 'Founding father of Ghana and leading Pan-Africanist',
  },
  {
    name: 'Edward Akufo-Addo',
    role: 'President of Ghana (1969-72)',
    category: 'Political Leader',
    image: 'https://upload.wikimedia.org/wikipedia/commons/2/2d/Edward_Akufo-Addo.jpg',
    description: 'Second Republic President',
  },
  {
    name: 'Jerry John Rawlings',
    role: 'President of Ghana (1993-2001)',
    category: 'Political Leader',
    image: 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Jerry_Rawlings_1993.jpg',
    description: 'Fourth Republic President',
  },
  {
    name: 'John Atta Mills',
    role: 'President of Ghana (2009-12)',
    category: 'Political Leader',
    image: 'https://upload.wikimedia.org/wikipedia/commons/9/9f/John_Atta_Mills.jpg',
    description: 'Fourth Republic President',
  },
  {
    name: 'Robert Mugabe',
    role: 'President of Zimbabwe',
    category: 'Political Leader',
    image: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Robert_Mugabe_Official_Portrait_%284x5_cropped%29.jpg',
    description: 'Former President of Zimbabwe',
  },
  {
    name: 'Kofi Abrefa Busia',
    role: 'Prime Minister of Ghana',
    category: 'Political Leader',
    image: 'https://upload.wikimedia.org/wikipedia/commons/8/81/Kofi_Busia_-_John_Agyekum_Kufuor_and_photo_of_Kofi_Busia_%28cropped%29.jpg',
    description: 'Second Republic Prime Minister',
  },
];

const ACHIEVEMENTS = [
  {
    title: 'Presidential Legacy',
    stat: '4',
    description: 'Ghanaian Presidents',
    icon: Crown,
    color: '#ffc857',
  },
  {
    title: 'Academic Excellence',
    stat: '98+',
    description: 'Years of Excellence',
    icon: Award,
    color: '#ffc857',
  },
  {
    title: 'Global Impact',
    stat: '10+',
    description: 'University Vice-Chancellors',
    icon: GraduationCap,
    color: '#ffc857',
  },
  {
    title: 'Campus Size',
    stat: '525',
    description: 'Hectares',
    icon: MapPin,
    color: '#ffc857',
  },
];

const CORE_VALUES = [
  {
    title: 'Academic Excellence',
    description: 'Maintaining highest standards of education and scholarship',
    icon: GraduationCap,
  },
  {
    title: 'Unity in Diversity',
    description: 'Embracing integration of races, genders, and cultures',
    icon: Users,
  },
  {
    title: 'Pan-African Identity',
    description: 'Preserving and celebrating African heritage and culture',
    icon: Globe,
  },
  {
    title: 'Character Building',
    description: 'Developing moral integrity and ethical leadership',
    icon: Star,
  },
  {
    title: 'Practical Skills',
    description: 'Combining academic knowledge with hands-on experience',
    icon: Briefcase,
  },
  {
    title: 'Musical Heritage',
    description: 'Excellence in music and performing arts education',
    icon: Music,
  },
];

export default function HeritageScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section with Gradient */}
        <View style={styles.heroSection}>
          <Image 
            source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Achimota_School_Assembly_Hall.jpg/440px-Achimota_School_Assembly_Hall.jpg' }} 
            style={styles.heroImage}
            blurRadius={0.5}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']}
            style={styles.heroGradient}
          >
            <View style={[styles.heroHeader, { paddingTop: insets.top + 16 }]}>
              <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
                <ArrowLeft size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.heroContent}>
              <View style={styles.logoContainer}>
                <Building2 size={48} color="#ffc857" />
              </View>
              <Text style={styles.heroTitle}>Achimota School</Text>
              <Text style={styles.heroSubtitle}>{SCHOOL_INFO.nickname}</Text>
              <View style={styles.mottoContainer}>
                <Text style={styles.mottoLatin}>{SCHOOL_INFO.motto}</Text>
                <Text style={styles.mottoTranslation}>"{SCHOOL_INFO.mottoTranslation}"</Text>
              </View>
              <View style={styles.establishedBadge}>
                <Calendar size={14} color="#ffc857" />
                <Text style={styles.establishedText}>Est. {SCHOOL_INFO.foundingYear}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Quick Stats Section */}
        <View style={styles.statsSection}>
          <View style={styles.statsGrid}>
            {ACHIEVEMENTS.map((achievement, index) => {
              const IconComponent = achievement.icon;
              return (
                <View key={index} style={styles.statCard}>
                  <View style={[styles.statIconContainer, { backgroundColor: achievement.color + '20' }]}>
                    <IconComponent size={24} color={achievement.color} />
                  </View>
                  <Text style={styles.statNumber}>{achievement.stat}</Text>
                  <Text style={styles.statLabel}>{achievement.description}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <View style={styles.sectionIconBg}>
                <Book size={20} color="#ffc857" />
              </View>
              <Text style={styles.sectionTitle}>About Achimota</Text>
            </View>
          </View>
          
          <View style={styles.aboutCard}>
            <Text style={styles.aboutText}>
              Founded on <Text style={styles.boldText}>{SCHOOL_INFO.established}</Text> by Sir Frederick Gordon Guggisberg, 
              Achimota School (originally <Text style={styles.boldText}>{SCHOOL_INFO.originalName}</Text>) stands as a 
              beacon of educational excellence in Africa.
            </Text>
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <MapPin size={16} color="#6B7280" />
                <Text style={styles.infoText}>{SCHOOL_INFO.location}</Text>
              </View>
              <View style={styles.infoItem}>
                <Users size={16} color="#6B7280" />
                <Text style={styles.infoText}>{SCHOOL_INFO.type}</Text>
              </View>
              <View style={styles.infoItem}>
                <Globe size={16} color="#6B7280" />
                <Text style={styles.infoText}>{SCHOOL_INFO.campus}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Founders Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <View style={styles.sectionIconBg}>
                <Crown size={20} color="#ffc857" />
              </View>
              <Text style={styles.sectionTitle}>The Founding Trio</Text>
            </View>
          </View>
          
          {FOUNDERS.map((founder, index) => {
            const IconComponent = founder.icon;
            return (
              <View key={index} style={styles.founderCard}>
                <View style={[styles.founderIconContainer, { backgroundColor: founder.color + '20' }]}>
                  <IconComponent size={28} color={founder.color} />
                </View>
                <View style={styles.founderContent}>
                  <Text style={styles.founderName}>{founder.name}</Text>
                  <Text style={styles.founderRole}>{founder.role}</Text>
                  <Text style={styles.founderDescription}>{founder.description}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Mission & Vision */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <View style={styles.sectionIconBg}>
                <Flag size={20} color="#ffc857" />
              </View>
              <Text style={styles.sectionTitle}>Mission & Vision</Text>
            </View>
          </View>

          <View style={styles.missionVisionContainer}>
            <View style={styles.missionCard}>
              <View style={styles.missionIconContainer}>
                <Flag size={24} color="#ffc857" />
              </View>
              <Text style={styles.missionCardTitle}>Our Mission</Text>
              <Text style={styles.missionCardText}>{MISSION_VISION.mission}</Text>
            </View>

            <View style={styles.visionCard}>
              <View style={styles.missionIconContainer}>
                <Star size={24} color="#ffc857" />
              </View>
              <Text style={styles.missionCardTitle}>Our Vision</Text>
              <Text style={styles.missionCardText}>{MISSION_VISION.vision}</Text>
            </View>
          </View>

          <View style={styles.philosophyCard}>
            <View style={styles.quoteIcon}>
              <Sparkles size={20} color="#ffc857" />
            </View>
            <Text style={styles.philosophyText}>{MISSION_VISION.philosophy}</Text>
          </View>
        </View>

        {/* Core Values */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <View style={styles.sectionIconBg}>
                <Heart size={20} color="#ffc857" />
              </View>
              <Text style={styles.sectionTitle}>Core Values</Text>
            </View>
          </View>

          <View style={styles.valuesContainer}>
            {CORE_VALUES.map((value, index) => {
              const IconComponent = value.icon;
              return (
                <View key={index} style={styles.valueItem}>
                  <View style={styles.valueIconCircle}>
                    <IconComponent size={20} color="#ffc857" />
                  </View>
                  <View style={styles.valueTextContainer}>
                    <Text style={styles.valueTitle}>{value.title}</Text>
                    <Text style={styles.valueDescription}>{value.description}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Historical Timeline */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <View style={styles.sectionIconBg}>
                <History size={20} color="#ffc857" />
              </View>
              <Text style={styles.sectionTitle}>Historical Timeline</Text>
            </View>
          </View>

          {HISTORICAL_MILESTONES.map((milestone, index) => (
            <View key={index} style={styles.timelineItem}>
              <View style={styles.timelineLeft}>
                <View style={styles.yearBadge}>
                  <Text style={styles.yearText}>{milestone.year}</Text>
                </View>
                {index < HISTORICAL_MILESTONES.length - 1 && (
                  <View style={styles.timelineLine} />
                )}
              </View>
              <View style={styles.timelineRight}>
                <View style={styles.milestoneCard}>
                  <Image source={{ uri: milestone.image }} style={styles.milestoneImage} />
                  <View style={styles.milestoneContent}>
                    <Text style={styles.milestoneTitle}>{milestone.event}</Text>
                    <Text style={styles.milestoneDescription}>{milestone.description}</Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Notable Alumni */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <View style={styles.sectionIconBg}>
                <Award size={20} color="#ffc857" />
              </View>
              <Text style={styles.sectionTitle}>Notable Alumni</Text>
            </View>
            <TouchableOpacity style={styles.seeAllButton}>
              <Text style={styles.seeAllText}>View All</Text>
              <ChevronRight size={16} color="#ffc857" />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.alumniScroll}
          >
            {NOTABLE_ALUMNI.map((alumni, index) => (
              <TouchableOpacity key={index} style={styles.alumniCard}>
                <Image source={{ uri: alumni.image }} style={styles.alumniImage} />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.9)']}
                  style={styles.alumniGradient}
                >
                  <View style={styles.alumniInfo}>
                    <Text style={styles.alumniName}>{alumni.name}</Text>
                    <Text style={styles.alumniRole}>{alumni.role}</Text>
                  </View>
                </LinearGradient>
                <View style={styles.alumniCategoryBadge}>
                  <Crown size={12} color="#FFD700" />
                  <Text style={styles.alumniCategoryText}>{alumni.category}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Virtual Museum */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <View style={styles.sectionIconBg}>
                <Building2 size={20} color="#ffc857" />
              </View>
              <Text style={styles.sectionTitle}>Virtual Museum</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.museumCard}
            onPress={() => debouncedRouter.push('/museum')}
            activeOpacity={0.8}
          >
            <Image 
              source={require('@/assets/images/heritage/museum.png')}
              style={styles.museumBackgroundImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['rgba(30, 41, 59, 0.6)', 'rgba(15, 23, 42, 0.75)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.museumGradient}
            >
              <View style={styles.museumIconContainer}>
                <Building2 size={48} color="#ffc857" />
              </View>
              <Text style={styles.museumTitle}>Explore Our Heritage</Text>
              <Text style={styles.museumDescription}>
                Step into our virtual museum and discover artifacts, documents, photographs, 
                and stories that tell the rich history of Achimota School.
              </Text>
              <View style={styles.museumButton}>
                <Text style={styles.museumButtonText}>Enter Museum</Text>
                <ChevronRight size={20} color="#FFFFFF" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Legacy Statement */}
        <View style={styles.section}>
          <LinearGradient
            colors={['#1E293B', '#0F172A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.legacyCard}
          >
            <View style={styles.legacyIcon}>
              <Award size={40} color="#FFD700" />
            </View>
            <Text style={styles.legacyTitle}>A Legacy of Excellence</Text>
            <Text style={styles.legacyText}>
              For nearly a century, Achimota School has shaped leaders, scholars, and visionaries 
              who have transformed Ghana, Africa, and the world. From presidents to innovators, 
              our alumni embody the spirit of "Ut Omnes Unum Sint."
            </Text>
          </LinearGradient>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  
  // Hero Section
  heroSection: {
    height: height * 0.5,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  heroGradient: {
    flex: 1,
    justifyContent: 'space-between',
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(65,105,225,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 36,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#ffc857',
    textAlign: 'center',
    marginBottom: 16,
  },
  mottoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  mottoLatin: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  mottoTranslation: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.8)',
  },
  establishedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  establishedText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },

  // Stats Section
  statsSection: {
    marginTop: -40,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: (width - 48) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    textAlign: 'center',
  },

  // Section Styles
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#ffc857',
  },

  // About Section
  aboutCard: {
    marginHorizontal: 16,
    padding: 24,
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  aboutText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    lineHeight: 24,
    marginBottom: 20,
  },
  boldText: {
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  infoGrid: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    flex: 1,
  },

  // Founders Section
  founderCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    flexDirection: 'row',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  founderIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  founderContent: {
    flex: 1,
  },
  founderName: {
    fontSize: 17,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  founderRole: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#ffc857',
    marginBottom: 6,
  },
  founderDescription: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
  },

  // Mission & Vision
  missionVisionContainer: {
    paddingHorizontal: 16,
    gap: 16,
    marginBottom: 16,
  },
  missionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  visionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  missionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  missionCardTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  missionCardText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 22,
  },
  philosophyCard: {
    marginHorizontal: 16,
    padding: 24,
    backgroundColor: '#F0F9FF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    position: 'relative',
  },
  quoteIcon: {
    position: 'absolute',
    top: -12,
    left: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  philosophyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#1E3A8A',
    lineHeight: 22,
    fontStyle: 'italic',
    paddingTop: 8,
  },

  // Core Values
  valuesContainer: {
    paddingHorizontal: 16,
    gap: 16,
  },
  valueItem: {
    flexDirection: 'row',
    gap: 16,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  valueIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueTextContainer: {
    flex: 1,
  },
  valueTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  valueDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
  },

  // Timeline
  timelineItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 16,
  },
  yearBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ffc857',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ffc857',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  yearText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginTop: 8,
  },
  timelineRight: {
    flex: 1,
  },
  milestoneCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  milestoneImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#F3F4F6',
  },
  milestoneContent: {
    padding: 16,
  },
  milestoneTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 6,
  },
  milestoneDescription: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
  },

  // Alumni Section
  alumniScroll: {
    paddingHorizontal: 16,
    gap: 16,
  },
  alumniCard: {
    width: 220,
    height: 300,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
  },
  alumniImage: {
    width: '100%',
    height: '100%',
  },
  alumniGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    justifyContent: 'flex-end',
  },
  alumniInfo: {
    padding: 16,
  },
  alumniName: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  alumniRole: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.9)',
  },
  alumniCategoryBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  alumniCategoryText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#FFD700',
  },

  // Legacy Section
  legacyCard: {
    marginHorizontal: 16,
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
  },
  legacyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,215,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  legacyTitle: {
    fontSize: 26,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  legacyText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  legacyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  legacyButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
  },

  // Loading & Empty States
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#4169E1',
    marginTop: 16,
  },
  emptyButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },

  // Virtual Museum Card
  museumCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    position: 'relative',
  },
  museumBackgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  museumGradient: {
    padding: 32,
    alignItems: 'center',
  },
  museumIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 200, 87, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  museumTitle: {
    fontSize: 26,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  museumDescription: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#CBD5E1',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  museumButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffc857',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  museumButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
  },

  // History Cards (Community Contributions)
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  filterChip: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  filterChipActive: {
    backgroundColor: '#4169E1',
    borderColor: '#4169E1',
  },
  filterText: {
    color: '#6B7280',
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  historyCard: {
    width: 240,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  uploaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#F9FAFB',
  },
  uploaderAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
  },
  uploaderName: {
    fontSize: 13,
    color: '#374151',
    fontFamily: 'Inter-SemiBold',
    flexShrink: 1,
  },
  historyImage: {
    width: 240,
    height: 160,
    backgroundColor: '#F3F4F6',
  },
  docPlaceholder: {
    width: 240,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    padding: 16,
  },
  fileCountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  fileCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter-Bold',
  },
});