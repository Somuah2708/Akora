import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, StatusBar } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen } from 'expo-router';
import { debouncedRouter } from '@/utils/navigationDebounce';
import { ArrowLeft, Book, Image as ImageIcon, FileText, Calendar, Award, Crown, MapPin, Clock, Eye, ChevronRight, Play, Building2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

// Museum Collections Data
const MUSEUM_GALLERIES = [
  {
    id: '1',
    title: 'Historical Artifacts',
    description: 'Original items from the founding era',
    icon: Award,
    color: '#ffc857',
    itemCount: 24,
    image: 'https://images.unsplash.com/photo-1567086030276-be18242b5507?w=800',
  },
  {
    id: '2',
    title: 'Document Archives',
    description: 'Letters, charters, and official records',
    icon: FileText,
    color: '#60A5FA',
    itemCount: 156,
    image: 'https://images.unsplash.com/photo-1568667256549-094345857637?w=800',
  },
  {
    id: '3',
    title: 'Photo Gallery',
    description: 'Rare photographs through the decades',
    icon: ImageIcon,
    color: '#34D399',
    itemCount: 342,
    image: 'https://images.unsplash.com/photo-1604928738115-3eb97d1e2fd8?w=800',
  },
  {
    id: '4',
    title: 'Alumni Stories',
    description: 'Personal accounts and achievements',
    icon: Book,
    color: '#F472B6',
    itemCount: 89,
    image: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800',
  },
];

const FEATURED_ARTIFACTS = [
  {
    id: '1',
    title: 'Foundation Stone Inscription',
    year: '1924',
    description: 'Original inscription from the foundation stone laid by Governor Guggisberg',
    image: 'https://images.unsplash.com/photo-1585779034823-7e9ac8faec70?w=800',
    category: 'Architecture',
  },
  {
    id: '2',
    title: 'First School Bell',
    year: '1927',
    description: 'The ceremonial bell that marked the first day of classes',
    image: 'https://images.unsplash.com/photo-1509343256512-d77a5ae48183?w=800',
    category: 'Artifacts',
  },
  {
    id: '3',
    title: "Dr. Aggrey's Desk",
    year: '1924',
    description: 'Original desk used by Vice-Principal Dr. James Aggrey',
    image: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=800',
    category: 'Furniture',
  },
  {
    id: '4',
    title: 'Independence Declaration',
    year: '1957',
    description: 'Signed document celebrating Ghana\'s independence by Achimota alumni',
    image: 'https://images.unsplash.com/photo-1586953208270-e80047d7bc75?w=800',
    category: 'Documents',
  },
];

const HISTORICAL_DOCUMENTS = [
  {
    id: '1',
    title: 'Original School Charter',
    date: 'January 28, 1927',
    description: 'Founding document establishing the Prince of Wales College and School',
    type: 'Charter',
  },
  {
    id: '2',
    title: 'Letter from Governor Guggisberg',
    date: 'June 15, 1920',
    description: 'Personal correspondence outlining the vision for Achimota',
    type: 'Letter',
  },
  {
    id: '3',
    title: 'First Graduation Register',
    date: 'December 1930',
    description: 'Record of the first graduating class and their achievements',
    type: 'Register',
  },
  {
    id: '4',
    title: 'Independence Day Programme',
    date: 'March 6, 1957',
    description: 'Official programme from Ghana\'s independence celebration',
    type: 'Programme',
  },
];

const PHOTO_DECADES = [
  { decade: '1920s', count: 45, image: 'https://images.unsplash.com/photo-1604928738115-3eb97d1e2fd8?w=400' },
  { decade: '1940s', count: 78, image: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400' },
  { decade: '1960s', count: 112, image: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=400' },
  { decade: '1980s', count: 89, image: 'https://images.unsplash.com/photo-1551522435-a13afa10f103?w=400' },
  { decade: '2000s', count: 156, image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400' },
];

export default function MuseumScreen() {
  const insets = useSafeAreaInsets();
  const [activeGallery, setActiveGallery] = useState<string | null>(null);

  let [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
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

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Header */}
        <LinearGradient
          colors={['#1E293B', '#0F172A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 16 }]}
        >
          {/* Header Row with Back Button and Title */}
          <View style={styles.headerRow}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => debouncedRouter.back()}
            >
              <ArrowLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>
            
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Virtual Museum</Text>
              <Text style={styles.headerSubtitle}>Achimota Heritage Collection</Text>
            </View>
          </View>

          {/* Museum Description */}
          <Text style={styles.heroText}>
            Explore a curated collection of artifacts, documents, photographs, and stories 
            that chronicle nearly a century of educational excellence and African heritage.
          </Text>
        </LinearGradient>
        {/* Gallery Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Museum Galleries</Text>
            <Text style={styles.sectionSubtitle}>Browse by collection</Text>
          </View>

          <View style={styles.galleriesGrid}>
            {MUSEUM_GALLERIES.map((gallery) => {
              const IconComponent = gallery.icon;
              return (
                <TouchableOpacity 
                  key={gallery.id}
                  style={styles.galleryCard}
                  onPress={() => setActiveGallery(gallery.id)}
                  activeOpacity={0.7}
                >
                  <Image 
                    source={{ uri: gallery.image }}
                    style={styles.galleryImage}
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.9)']}
                    style={styles.galleryOverlay}
                  >
                    <View style={[styles.galleryIconBadge, { backgroundColor: gallery.color }]}>
                      <IconComponent size={20} color="#FFFFFF" />
                    </View>
                    <Text style={styles.galleryTitle}>{gallery.title}</Text>
                    <Text style={styles.galleryDescription}>{gallery.description}</Text>
                    <View style={styles.galleryFooter}>
                      <Text style={styles.galleryCount}>{gallery.itemCount} items</Text>
                      <ChevronRight size={16} color="#ffc857" />
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Featured Artifacts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Featured Artifacts</Text>
              <Text style={styles.sectionSubtitle}>Notable pieces from our collection</Text>
            </View>
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>View All</Text>
              <ChevronRight size={16} color="#ffc857" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.artifactsScroll}
          >
            {FEATURED_ARTIFACTS.map((artifact) => (
              <TouchableOpacity 
                key={artifact.id}
                style={styles.artifactCard}
                activeOpacity={0.8}
              >
                <View style={styles.artifactImageContainer}>
                  <Image 
                    source={{ uri: artifact.image }}
                    style={styles.artifactImage}
                  />
                  <View style={styles.artifactCategory}>
                    <Text style={styles.artifactCategoryText}>{artifact.category}</Text>
                  </View>
                </View>
                <View style={styles.artifactContent}>
                  <View style={styles.artifactHeader}>
                    <Text style={styles.artifactYear}>{artifact.year}</Text>
                    <Award size={14} color="#ffc857" />
                  </View>
                  <Text style={styles.artifactTitle}>{artifact.title}</Text>
                  <Text style={styles.artifactDescription}>{artifact.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Historical Documents */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Document Archive</Text>
              <Text style={styles.sectionSubtitle}>Original records and correspondence</Text>
            </View>
          </View>

          <View style={styles.documentsContainer}>
            {HISTORICAL_DOCUMENTS.map((doc) => (
              <TouchableOpacity 
                key={doc.id}
                style={styles.documentCard}
                activeOpacity={0.7}
              >
                <View style={styles.documentIcon}>
                  <FileText size={24} color="#ffc857" />
                </View>
                <View style={styles.documentContent}>
                  <Text style={styles.documentTitle}>{doc.title}</Text>
                  <View style={styles.documentMeta}>
                    <Calendar size={12} color="#6B7280" />
                    <Text style={styles.documentDate}>{doc.date}</Text>
                  </View>
                  <Text style={styles.documentDescription}>{doc.description}</Text>
                  <View style={styles.documentType}>
                    <Text style={styles.documentTypeText}>{doc.type}</Text>
                  </View>
                </View>
                <ChevronRight size={20} color="#CBD5E1" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Photo Gallery by Decade */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Photo Collection</Text>
              <Text style={styles.sectionSubtitle}>Journey through the decades</Text>
            </View>
          </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.decadesScroll}
          >
            {PHOTO_DECADES.map((decade, index) => (
              <TouchableOpacity 
                key={index}
                style={styles.decadeCard}
                activeOpacity={0.8}
              >
                <Image 
                  source={{ uri: decade.image }}
                  style={styles.decadeImage}
                />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.85)']}
                  style={styles.decadeOverlay}
                >
                  <Text style={styles.decadeTitle}>{decade.decade}</Text>
                  <View style={styles.decadeCount}>
                    <ImageIcon size={14} color="#ffc857" />
                    <Text style={styles.decadeCountText}>{decade.count} photos</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Virtual Tour CTA */}
        <View style={styles.section}>
          <LinearGradient
            colors={['#ffc857', '#ffb020']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.tourCard}
          >
            <View style={styles.tourIcon}>
              <Play size={32} color="#1E293B" />
            </View>
            <Text style={styles.tourTitle}>Take a Virtual Tour</Text>
            <Text style={styles.tourDescription}>
              Experience an immersive 360° walkthrough of Achimota's historic campus and landmarks
            </Text>
            <TouchableOpacity style={styles.tourButton}>
              <Text style={styles.tourButtonText}>Start Tour</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Coming Soon */}
        <View style={styles.section}>
          <View style={styles.infoCard}>
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonBadgeText}>COMING SOON</Text>
            </View>
            <Building2 size={48} color="#ffc857" />
            <Text style={styles.infoTitle}>Physical Museum</Text>
            <Text style={styles.infoText}>
              We're building a state-of-the-art physical museum at Achimota School campus. 
              Stay tuned for updates on the grand opening!
            </Text>
            <View style={styles.comingSoonDetails}>
              <View style={styles.comingSoonItem}>
                <MapPin size={18} color="#ffc857" />
                <View style={styles.comingSoonItemText}>
                  <Text style={styles.comingSoonLabel}>Location</Text>
                  <Text style={styles.comingSoonValue}>Achimota School Campus</Text>
                </View>
              </View>
              <View style={styles.comingSoonItem}>
                <Calendar size={18} color="#ffc857" />
                <View style={styles.comingSoonItemText}>
                  <Text style={styles.comingSoonLabel}>Expected Opening</Text>
                  <Text style={styles.comingSoonValue}>To Be Announced</Text>
                </View>
              </View>
            </View>
          </View>
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

  // Header
  header: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    lineHeight: 32,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#ffc857',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  heroText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#CBD5E1',
    lineHeight: 24,
  },

  // Sections
  section: {
    paddingHorizontal: 16,
    marginTop: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 4,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#ffc857',
  },

  // Gallery Cards
  galleriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  galleryCard: {
    width: CARD_WIDTH,
    height: 240,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F9FAFB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  galleryOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  galleryIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  galleryTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  galleryDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#CBD5E1',
    marginBottom: 12,
  },
  galleryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  galleryCount: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#ffc857',
  },

  // Featured Artifacts
  artifactsScroll: {
    paddingRight: 16,
    gap: 16,
  },
  artifactCard: {
    width: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  artifactImageContainer: {
    position: 'relative',
  },
  artifactImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#F3F4F6',
  },
  artifactCategory: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 200, 87, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  artifactCategoryText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
  },
  artifactContent: {
    padding: 16,
  },
  artifactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  artifactYear: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#ffc857',
  },
  artifactTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginBottom: 6,
  },
  artifactDescription: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
  },

  // Documents
  documentsContainer: {
    gap: 12,
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 200, 87, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentContent: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 6,
  },
  documentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  documentDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  documentDescription: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 19,
    marginBottom: 8,
  },
  documentType: {
    alignSelf: 'flex-start',
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  documentTypeText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },

  // Photo Decades
  decadesScroll: {
    paddingRight: 16,
    gap: 16,
  },
  decadeCard: {
    width: 160,
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  decadeImage: {
    width: '100%',
    height: '100%',
  },
  decadeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  decadeTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  decadeCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  decadeCountText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#ffc857',
  },

  // Virtual Tour CTA
  tourCard: {
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  tourIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(30, 41, 59, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  tourTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  tourDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  tourButton: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  tourButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },

  // Coming Soon
  infoCard: {
    backgroundColor: '#F9FAFB',
    padding: 28,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  comingSoonBadge: {
    backgroundColor: '#ffc857',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  comingSoonBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    letterSpacing: 1,
  },
  infoTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginTop: 12,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  comingSoonDetails: {
    width: '100%',
    gap: 16,
  },
  comingSoonItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
  },
  comingSoonItemText: {
    flex: 1,
  },
  comingSoonLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  comingSoonValue: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
  },
});
