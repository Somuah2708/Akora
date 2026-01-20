import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Dimensions, RefreshControl, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState, useCallback } from 'react';
import { SplashScreen, useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { HEADER_COLOR } from '@/constants/Colors';
import { Search, Plus, MoveVertical as MoreVertical, Bell, Moon, Lock, CircleHelp as HelpCircle, LogOut, Shield, Languages, MessageSquare, Bookmark, ShoppingBag, GraduationCap, Briefcase, MessageCircle, Building2, Calendar, Heart, FileText, Users, Newspaper, Globe, Video, BookOpen } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 48;
const GRID_SPACING = 16;
const GRID_ITEM_WIDTH = (width - 48 - GRID_SPACING) / 2;

// Local hub images
const HUB_IMAGES = {
  products: require('@/assets/images/hub/products.png'),
  mentorship: require('@/assets/images/hub/mentorship.png'),
  forum: require('@/assets/images/hub/forum.png'),
  secretariat: require('@/assets/images/hub/secretariat.png'),
  events: require('@/assets/images/hub/events.png'),
  donations: require('@/assets/images/hub/donations.png'),
  requests: require('@/assets/images/hub/requests.png'),
  clubs: require('@/assets/images/hub/clubs.png'),
  articles: require('@/assets/images/hub/articles.png'),
  live: require('@/assets/images/hub/live.png'),
  news: require('@/assets/images/hub/news.png'),
};

// Removed horizontal featured scroller – content moved to Home as requested

const HERITAGE_ITEMS = [
  {
    id: '1',
    title: 'Products and Services',
    description: 'Shop from fellow alumni',
    icon: ShoppingBag,
    image: HUB_IMAGES.products,
    isLocal: true,
    route: 'services',
  },
  {
    id: '2',
    title: 'Educational Opportunities',
    description: 'Scholarships and mentorships',
    icon: GraduationCap,
    image: HUB_IMAGES.mentorship,
    isLocal: true,
    route: '/education',
  },
  {
    id: '3',
    title: 'Internships & Jobs',
    description: 'Find career opportunities',
    icon: Briefcase,
    image: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&auto=format&fit=crop&q=60',
    isLocal: false,
    route: 'workplace',
  },
  {
    id: '4',
    title: 'Development Forum',
    description: 'Discuss and share ideas',
    icon: MessageCircle,
    image: HUB_IMAGES.forum,
    isLocal: true,
    route: 'forum',
  },
  {
    id: '5',
    title: 'Secretariat',
    description: 'Official OAA updates',
    icon: Building2,
    image: HUB_IMAGES.secretariat,
    isLocal: true,
    route: 'secretariat',
  },
  {
    id: '6',
    title: 'Events',
    description: 'Upcoming events and gatherings',
    icon: Calendar,
    image: HUB_IMAGES.events,
    isLocal: true,
    route: 'events',
  },
  {
    id: '7',
    title: 'Donations',
    description: 'Support our community initiatives',
    icon: Heart,
    image: HUB_IMAGES.donations,
    isLocal: true,
    route: 'donation',
  },
  {
    id: '8',
    title: 'Academic Requests',
    description: 'Access and request academic records',
    icon: FileText,
    image: HUB_IMAGES.requests,
    isLocal: true,
    route: 'transcripts',
  },
  {
    id: '9',
    title: 'Circles Fun Clubs',
    description: 'Join interest groups and social clubs',
    icon: Users,
    image: HUB_IMAGES.clubs,
    isLocal: true,
    route: 'circles',
  },
  {
    id: '10',
    title: 'News Daily',
    description: 'Latest news and updates',
    icon: Newspaper,
    image: HUB_IMAGES.news,
    isLocal: true,
    route: 'news',
  },
  {
    id: '11',
    title: 'Articles',
    description: 'Read insightful articles and stories',
    icon: BookOpen,
    image: HUB_IMAGES.articles,
    isLocal: true,
    route: 'news/articles',
  },
  {
    id: '12',
    title: 'Live Stream',
    description: 'Watch live events and ceremonies',
    icon: Video,
    image: HUB_IMAGES.live,
    isLocal: true,
    route: 'live',
  },
];

export default function HubScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 800);
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  // Split items into two columns
  const leftColumnItems = HERITAGE_ITEMS.filter((_, index) => index % 2 === 0);
  const rightColumnItems = HERITAGE_ITEMS.filter((_, index) => index % 2 === 1);

  return (
    <View style={styles.container}>
      {/* Full Screen Refresh Overlay */}
      {refreshing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0F172A" />
        </View>
      )}

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#0EA5E9"
            colors={['#0EA5E9']}
          />
        }
      >
        {/* FIX: Dark background filler for pull-to-refresh gap */}
        <View style={{ position: 'absolute', top: -1000, left: 0, right: 0, height: 1000, backgroundColor: HEADER_COLOR }} />

        <View style={[styles.header, { marginTop: -200, paddingTop: insets.top + 216 }]}>
          <Text style={styles.title}>Hub</Text>
          <Text style={styles.subtitle}>Connect, grow, and engage with the community</Text>
        </View>

        {/* Two Column Layout */}
        <View style={styles.columnsContainer}>
          {/* Left Column */}
          <View style={styles.column}>
            {leftColumnItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <TouchableOpacity 
                  key={item.id}
                  style={styles.gridItem}
                  onPress={() => item.route && debouncedRouter.push(item.route)}
                >
                  <Image 
                    source={item.isLocal ? item.image : { uri: item.image }} 
                    style={styles.itemImage}
                    contentFit="cover"
                    transition={150}
                    cachePolicy="memory-disk"
                    priority={item.id <= '4' ? 'high' : 'normal'}
                  />
                  <View style={styles.itemContent}>
                    <View style={styles.iconContainer}>
                      <IconComponent size={24} color="#FFFFFF" strokeWidth={1.5} />
                    </View>
                    <View style={styles.textContainer}>
                      <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
                      <Text style={styles.itemDescription} numberOfLines={2}>{item.description}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Right Column */}
          <View style={styles.column}>
            {rightColumnItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <TouchableOpacity 
                  key={item.id}
                  style={styles.gridItem}
                  onPress={() => item.route && debouncedRouter.push(item.route)}
                >
                  <Image 
                    source={item.isLocal ? item.image : { uri: item.image }} 
                    style={styles.itemImage}
                    contentFit="cover"
                    transition={150}
                    cachePolicy="memory-disk"
                    priority={item.id <= '4' ? 'high' : 'normal'}
                  />
                  <View style={styles.itemContent}>
                    <View style={styles.iconContainer}>
                      <IconComponent size={24} color="#FFFFFF" strokeWidth={1.5} />
                    </View>
                    <View style={styles.textContainer}>
                      <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
                      <Text style={styles.itemDescription} numberOfLines={2}>{item.description}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
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
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: HEADER_COLOR,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
  },
  columnsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: GRID_SPACING,
  },
  column: {
    flex: 1,
  },
  gridItem: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: GRID_SPACING,
  },
  itemImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  itemContent: {
    flex: 1,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    height: '100%',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  textContainer: {
    gap: 4,
  },
  itemTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    lineHeight: 20,
  },
  itemDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    opacity: 0.8,
    lineHeight: 16,
  },
});