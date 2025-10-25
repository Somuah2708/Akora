import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, TextInput, Dimensions } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect } from 'react';
import { SplashScreen, useRouter } from 'expo-router';
import { ArrowLeft, Building2, ShoppingBag, Calendar, FileText, Mail, Phone, Globe, MessageCircle, ChevronRight, Bell, Megaphone, BookOpen, History, Award, Heart } from 'lucide-react-native';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

const QUICK_ACTIONS = [
  {
    id: '1',
    title: 'Secretariat Shop',
    description: 'Browse and purchase alumni souvenirs',
    icon: ShoppingBag,
    color: '#E4EAFF',
    route: '/secretariat-shop',
  },
  {
    id: '2',
    title: 'Event Calendar',
    description: 'View upcoming events and activities',
    icon: Calendar,
    color: '#E4EAFF',
    route: '/events',
  },
  {
    id: '3',
    title: 'Document Center',
    description: 'Access forms and official documents',
    icon: FileText,
    color: '#E4FFF4',
    route: '/documents',
  },
  {
    id: '4',
    title: 'Alumni Support',
    description: 'Get assistance and resources',
    icon: Heart,
    color: '#FFF4E4',
    route: '/support',
  },
];

const ANNOUNCEMENTS = [
  {
    id: '1',
    title: 'Annual Report 2024 Now Available',
    date: 'March 15, 2024',
    type: 'Publication',
    image: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: '2',
    title: 'New Alumni Database System Launch',
    date: 'March 10, 2024',
    type: 'Update',
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&auto=format&fit=crop&q=60',
  },
];

const CONTACT_INFO = {
  address: 'Main Campus, University Avenue',
  email: 'secretariat@oaa.edu',
  phone: '+233 20 123 4567',
  website: 'www.oaa.edu/secretariat',
};

const HERITAGE_ITEMS = [
  {
    id: '1',
    title: 'School History',
    description: 'Explore our rich heritage and milestones',
    icon: History,
  },
  {
    id: '2',
    title: 'Notable Alumni',
    description: 'Distinguished graduates and their achievements',
    icon: Award,
  },
  {
    id: '3',
    title: 'Archives',
    description: 'Historical documents and photographs',
    icon: BookOpen,
  },
];

export default function SecretariatScreen() {
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
        <Text style={styles.title}>OAA Secretariat</Text>
        <TouchableOpacity style={styles.notificationButton}>
          <Bell size={24} color="#000000" />
        </TouchableOpacity>
      </View>

      <View style={styles.welcomeCard}>
        <View style={styles.welcomeContent}>
          <Building2 size={32} color="#4169E1" />
          <Text style={styles.welcomeTitle}>Welcome to the Secretariat</Text>
          <Text style={styles.welcomeText}>
            Your central hub for alumni relations and school administration
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          {QUICK_ACTIONS.map((action) => {
            const IconComponent = action.icon;
            return (
              <TouchableOpacity
                key={action.id}
                style={[styles.actionCard, { backgroundColor: action.color }]}
                onPress={() => action.route && router.push(action.route)}
              >
                <IconComponent size={24} color="#000000" strokeWidth={1.5} />
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionDescription}>{action.description}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Latest Announcements</Text>
          <TouchableOpacity style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>See All</Text>
            <ChevronRight size={16} color="#666666" />
          </TouchableOpacity>
        </View>
        {ANNOUNCEMENTS.map((announcement) => (
          <TouchableOpacity key={announcement.id} style={styles.announcementCard}>
            <Image source={{ uri: announcement.image }} style={styles.announcementImage} />
            <View style={styles.announcementContent}>
              <View style={styles.announcementBadge}>
                <Megaphone size={12} color="#4169E1" />
                <Text style={styles.announcementType}>{announcement.type}</Text>
              </View>
              <Text style={styles.announcementTitle}>{announcement.title}</Text>
              <Text style={styles.announcementDate}>{announcement.date}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        <View style={styles.contactCard}>
          <TouchableOpacity style={styles.contactItem}>
            <Globe size={20} color="#666666" />
            <Text style={styles.contactText}>{CONTACT_INFO.website}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.contactItem}>
            <Mail size={20} color="#666666" />
            <Text style={styles.contactText}>{CONTACT_INFO.email}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.contactItem}>
            <Phone size={20} color="#666666" />
            <Text style={styles.contactText}>{CONTACT_INFO.phone}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.messageButton}
            onPress={() => router.push('/chat')}
          >
            <MessageCircle size={20} color="#FFFFFF" />
            <Text style={styles.messageButtonText}>Send Message</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Heritage & Archives</Text>
        {HERITAGE_ITEMS.map((item) => {
          const IconComponent = item.icon;
          return (
            <TouchableOpacity key={item.id} style={styles.heritageCard}>
              <View style={styles.heritageIcon}>
                <IconComponent size={24} color="#4169E1" />
              </View>
              <View style={styles.heritageContent}>
                <Text style={styles.heritageTitle}>{item.title}</Text>
                <Text style={styles.heritageDescription}>{item.description}</Text>
              </View>
              <ChevronRight size={20} color="#666666" />
            </TouchableOpacity>
          );
        })}
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
  welcomeCard: {
    margin: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 24,
  },
  welcomeContent: {
    alignItems: 'center',
    gap: 12,
  },
  welcomeTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 14,
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
    marginHorizontal: 16,
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingHorizontal: 16,
  },
  actionCard: {
    width: CARD_WIDTH,
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  actionDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
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
  announcementCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
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
  announcementImage: {
    width: 100,
    height: 100,
  },
  announcementContent: {
    flex: 1,
    padding: 12,
    gap: 8,
  },
  announcementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EBF0FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  announcementType: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  announcementTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  announcementDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  contactCard: {
    marginHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4169E1',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  messageButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  heritageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    padding: 16,
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
  heritageIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EBF0FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  heritageContent: {
    flex: 1,
  },
  heritageTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 4,
  },
  heritageDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
});