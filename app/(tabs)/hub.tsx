import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, TextInput, Dimensions } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect } from 'react';
import { SplashScreen, useRouter } from 'expo-router';
import { Search, Plus, MoveVertical as MoreVertical, Bell, Moon, Lock, CircleHelp as HelpCircle, LogOut, Shield, Languages, MessageSquare, Bookmark, ShoppingBag, GraduationCap, Briefcase, MessageCircle, Building2, Calendar, Heart, FileText, Users, Newspaper, Globe, Video } from 'lucide-react-native';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 48;
const GRID_SPACING = 16;
const GRID_ITEM_WIDTH = (width - 48 - GRID_SPACING) / 2;

// Removed horizontal featured scroller – content moved to Home as requested

const HERITAGE_ITEMS = [
  {
    id: '1',
    title: 'Akora Products and Services',
    description: 'Discover exclusive products and services from fellow Akoras',
    icon: ShoppingBag,
    image: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800&auto=format&fit=crop&q=60',
    route: 'services',
  },
  {
    id: '2',
    title: 'Schools and Scholarships',
    description: 'Educational opportunities and scholarship programs',
    icon: GraduationCap,
    image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&auto=format&fit=crop&q=60',
    route: '/education',
  },
  {
    id: '3',
    title: 'Internships & Jobs',
    description: 'Career opportunities, National Service placements',
    icon: Briefcase,
    image: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&auto=format&fit=crop&q=60',
    route: 'workplace',
  },
  {
    id: '4',
    title: 'Development Forum',
    description: 'Engage in meaningful conversations and mentorship',
    icon: MessageCircle,
    image: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=800&auto=format&fit=crop&q=60',
    route: 'forum',
  },
  {
    id: '5',
    title: 'OAA Secretariat',
    description: 'Official communications and updates',
    icon: Building2,
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=60',
    route: 'secretariat',
  },
  {
    id: '6',
    title: 'Akora Events',
    description: 'Upcoming events and gatherings',
    icon: Calendar,
    image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&auto=format&fit=crop&q=60',
    route: 'events',
  },
  {
    id: '7',
    title: 'Donations',
    description: 'Support our community initiatives',
    icon: Heart,
    image: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=800&auto=format&fit=crop&q=60',
    route: 'donation',
  },
  {
    id: '8',
    title: 'Transcripts',
    description: 'Access and request academic records',
    icon: FileText,
    image: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=800&auto=format&fit=crop&q=60',
    route: 'transcripts',
  },
  {
    id: '9',
    title: 'Circles Fun Clubs',
    description: 'Join interest groups and social clubs',
    icon: Users,
    image: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&auto=format&fit=crop&q=60',
    route: 'circles',
  },
  {
    id: '10',
    title: 'News Daily',
    description: 'Stay updated with latest news and announcements',
    icon: Newspaper,
    image: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop&q=60',
    route: 'news',
  },
  {
    id: '11',
    title: 'OAA Chapters',
    description: 'Connect with regional alumni chapters',
    icon: Globe,
    image: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=800&auto=format&fit=crop&q=60',
    route: 'chapters',
  },
  {
    id: '12',
    title: 'Live Stream',
    description: 'Watch live events and ceremonies',
    icon: Video,
    image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&auto=format&fit=crop&q=60',
    route: 'live',
  },
];

export default function HubScreen() {
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

  // Split items into two columns
  const leftColumnItems = HERITAGE_ITEMS.filter((_, index) => index % 2 === 0);
  const rightColumnItems = HERITAGE_ITEMS.filter((_, index) => index % 2 === 1);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Akora Hub</Text>
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
                onPress={() => item.route && router.push(item.route as any)}
              >
                <Image source={{ uri: item.image }} style={styles.itemImage} />
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
                onPress={() => item.route && router.push(item.route as any)}
              >
                <Image source={{ uri: item.image }} style={styles.itemImage} />
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
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