import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useEffect } from 'react';
import { SplashScreen, useRouter } from 'expo-router';
import { ArrowLeft, Building2, ShoppingBag, Calendar, FileText, Mail, Phone, Globe, MessageCircle, ChevronRight, History, Award, Heart } from 'lucide-react-native';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');

const QUICK_ACTIONS = [
  {
    id: '1',
    title: 'Secretariat Shop',
    description: 'Alumni merchandise & souvenirs',
    icon: ShoppingBag,
    gradient: ['#667eea', '#764ba2'],
    route: '/secretariat-shop',
  },
  {
    id: '2',
    title: 'Event Calendar',
    description: 'Upcoming events & activities',
    icon: Calendar,
    gradient: ['#f093fb', '#f5576c'],
    route: '/secretariat/event-calendar',
  },
  {
    id: '3',
    title: 'Document Center',
    description: 'Official forms & documents',
    icon: FileText,
    gradient: ['#4facfe', '#00f2fe'],
    route: '/secretariat/documents',
  },
  {
    id: '4',
    title: 'Alumni Support',
    description: 'Assistance & resources',
    icon: Heart,
    gradient: ['#43e97b', '#38f9d7'],
    route: '/alumni-center',
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
    description: 'Our rich heritage and milestones',
    icon: History,
  },
  {
    id: '2',
    title: 'Notable Alumni',
    description: 'Distinguished graduates',
    icon: Award,
  },
];

export default function SecretariatScreen() {
  const router = useRouter();
  
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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Premium Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/hub')} style={styles.backButton}>
          <View style={styles.backButtonCircle}>
            <ArrowLeft size={20} color="#1a1a1a" strokeWidth={2.5} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Hero Section */}
      <View style={styles.heroSection}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Building2 size={40} color="#1a1a1a" strokeWidth={2} />
          </View>
        </View>
        <Text style={styles.heroTitle}>OAA Secretariat</Text>
        <Text style={styles.heroSubtitle}>
          Excellence in Alumni Relations & School Administration
        </Text>
      </View>

      {/* Premium Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Services</Text>
        <View style={styles.servicesGrid}>
          {QUICK_ACTIONS.map((action) => {
            const IconComponent = action.icon;
            return (
              <TouchableOpacity
                key={action.id}
                style={styles.serviceCard}
                onPress={() => action.route && router.push(action.route as any)}
                activeOpacity={0.8}
              >
                <View style={styles.serviceIconContainer}>
                  <IconComponent size={28} color="#1a1a1a" strokeWidth={2} />
                </View>
                <Text style={styles.serviceTitle}>{action.title}</Text>
                <Text style={styles.serviceDescription}>{action.description}</Text>
                <View style={styles.serviceArrow}>
                  <ChevronRight size={18} color="#666666" strokeWidth={2} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Contact Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact</Text>
        <View style={styles.contactCard}>
          <TouchableOpacity style={styles.contactItem} activeOpacity={0.7}>
            <View style={styles.contactIconCircle}>
              <Globe size={18} color="#1a1a1a" strokeWidth={2} />
            </View>
            <Text style={styles.contactText}>{CONTACT_INFO.website}</Text>
          </TouchableOpacity>
          
          <View style={styles.contactDivider} />
          
          <TouchableOpacity style={styles.contactItem} activeOpacity={0.7}>
            <View style={styles.contactIconCircle}>
              <Mail size={18} color="#1a1a1a" strokeWidth={2} />
            </View>
            <Text style={styles.contactText}>{CONTACT_INFO.email}</Text>
          </TouchableOpacity>
          
          <View style={styles.contactDivider} />
          
          <TouchableOpacity style={styles.contactItem} activeOpacity={0.7}>
            <View style={styles.contactIconCircle}>
              <Phone size={18} color="#1a1a1a" strokeWidth={2} />
            </View>
            <Text style={styles.contactText}>{CONTACT_INFO.phone}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.messageButton}
            onPress={() => router.push('/chat')}
            activeOpacity={0.9}
          >
            <MessageCircle size={20} color="#FFFFFF" strokeWidth={2} />
            <Text style={styles.messageButtonText}>Send Message</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Heritage & Archives */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Heritage & Archives</Text>
        <View style={styles.heritageContainer}>
          {HERITAGE_ITEMS.map((item) => {
            const IconComponent = item.icon;
            return (
              <TouchableOpacity 
                key={item.id} 
                style={styles.heritageCard}
                activeOpacity={0.8}
              >
                <View style={styles.heritageIcon}>
                  <IconComponent size={24} color="#1a1a1a" strokeWidth={2} />
                </View>
                <View style={styles.heritageContent}>
                  <Text style={styles.heritageTitle}>{item.title}</Text>
                  <Text style={styles.heritageDescription}>{item.description}</Text>
                </View>
                <ChevronRight size={20} color="#666666" strokeWidth={2} />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fafafa',
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backButtonCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  heroSection: {
    paddingHorizontal: 20,
    paddingVertical: 32,
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 20,
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  heroTitle: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#1a1a1a',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1a1a1a',
    marginHorizontal: 20,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  servicesGrid: {
    paddingHorizontal: 20,
    gap: 16,
  },
  serviceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  serviceIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  serviceTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1a1a1a',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  serviceDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    lineHeight: 20,
    marginBottom: 12,
  },
  serviceArrow: {
    alignSelf: 'flex-start',
  },
  contactCard: {
    marginHorizontal: 20,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  contactIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  contactText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#1a1a1a',
    flex: 1,
  },
  contactDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 4,
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#1a1a1a',
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 16,
  },
  messageButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    letterSpacing: -0.2,
  },
  heritageContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  heritageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  heritageIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  heritageContent: {
    flex: 1,
  },
  heritageTitle: {
    fontSize: 17,
    fontFamily: 'Inter-Bold',
    color: '#1a1a1a',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  heritageDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    lineHeight: 20,
  },
  bottomSpacer: {
    height: 40,
  },
});