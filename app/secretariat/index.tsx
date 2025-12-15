import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Linking, Alert, Platform, ActivityIndicator } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, Building2, ShoppingBag, Calendar, FileText, Mail, Phone, Globe, MessageCircle, ChevronRight, History, Award, HeadphonesIcon, Clock, MapPin, Settings, Navigation } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

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
];

const CONTACT_INFO = {
  address: 'Achimota School, Greater Accra Region, Ghana',
  email: 'secretariat@oaa.edu',
  phone: '+233 30 240 2615',
  latitude: 5.6037,
  longitude: -0.2258,
  hours: 'Mon - Fri: 8:00 AM - 5:00 PM',
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
  const { profile } = useAuth();
  const [contactInfo, setContactInfo] = useState({
    address: 'Main Campus, University Avenue, Accra',
    email: 'secretariat@oaa.edu',
    phone: '+233 20 123 4567',
    latitude: 5.6037,
    longitude: -0.1870,
    hours: 'Mon - Fri: 8:00 AM - 5:00 PM',
  });
  const [loadingContact, setLoadingContact] = useState(true);
  
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

  useEffect(() => {
    fetchContactSettings();
  }, []);

  const fetchContactSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_contact_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;

      if (data) {
        setContactInfo({
          address: data.address,
          email: data.email,
          phone: data.phone,
          latitude: data.latitude || 5.6037,
          longitude: data.longitude || -0.1870,
          hours: data.office_hours?.weekdays + (data.office_hours?.weekends ? '\n' + data.office_hours.weekends : ''),
        });
      }
    } catch (error) {
      console.error('Error fetching contact settings:', error);
    } finally {
      setLoadingContact(false);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  const handleEmail = () => {
    Linking.openURL(`mailto:${contactInfo.email}`).catch(() => {
      Alert.alert('Error', 'Unable to open email app');
    });
  };

  const handlePhone = () => {
    Linking.openURL(`tel:${contactInfo.phone}`).catch(() => {
      Alert.alert('Error', 'Unable to make call');
    });
  };

  const handleMapLocation = () => {
    const { latitude, longitude } = contactInfo;
    const scheme = Platform.select({
      ios: `maps:0,0?q=${latitude},${longitude}`,
      android: `geo:0,0?q=${latitude},${longitude}`,
    });
    const url = scheme || `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to open maps app');
    });
  };

  const handleMessage = () => {
    console.log('📨 Navigating to admin chat...');
    debouncedRouter.push('/admin-chat');
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Premium Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.push('/hub')} style={styles.backButton}>
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
                onPress={() => action.route && debouncedRouter.push(action.route)}
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

      {/* Customer Care Center */}
      <View style={styles.section}>
        <View style={styles.careSectionHeader}>
          <View style={styles.careIconLarge}>
            <HeadphonesIcon size={28} color="#4169E1" strokeWidth={2} />
          </View>
          <View style={styles.careSectionTitleContainer}>
            <Text style={styles.careSectionTitle}>Customer Care Center</Text>
            <Text style={styles.careSectionSubtitle}>We're here to help you</Text>
          </View>
          {profile?.role === 'admin' && (
            <TouchableOpacity 
              onPress={() => debouncedRouter.push('/admin/contact-settings')}
              style={styles.adminSettingsButton}
              activeOpacity={0.7}
            >
              <Settings size={20} color="#4169E1" strokeWidth={2} />
            </TouchableOpacity>
          )}
        </View>

        {/* Contact Methods Grid */}
        <View style={styles.contactMethodsGrid}>
          {/* Call Us */}
          <TouchableOpacity 
            style={styles.contactMethodCard}
            onPress={handlePhone}
            activeOpacity={0.8}
          >
            <View style={[styles.contactMethodIcon, { backgroundColor: '#DBEAFE' }]}>
              <Phone size={24} color="#1E40AF" strokeWidth={2} />
            </View>
            <Text style={styles.contactMethodLabel}>Call Us</Text>
            <Text style={styles.contactMethodValue}>{contactInfo.phone}</Text>
          </TouchableOpacity>

          {/* Email Us */}
          <TouchableOpacity 
            style={styles.contactMethodCard}
            onPress={handleEmail}
            activeOpacity={0.8}
          >
            <View style={[styles.contactMethodIcon, { backgroundColor: '#DCFCE7' }]}>
              <Mail size={24} color="#166534" strokeWidth={2} />
            </View>
            <Text style={styles.contactMethodLabel}>Email Us</Text>
            <Text style={styles.contactMethodValue} numberOfLines={1}>{contactInfo.email}</Text>
          </TouchableOpacity>
        </View>

        {/* Visit Us - Enhanced Map Section */}
        <View style={styles.visitUsSection}>
          <View style={styles.sectionHeaderInline}>
            <MapPin size={24} color="#4169E1" strokeWidth={2} />
            <Text style={styles.sectionTitleInline}>Visit Us</Text>
          </View>

          <TouchableOpacity 
            style={styles.mapContainer}
            onPress={handleMapLocation}
            activeOpacity={0.95}
          >
            <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              mapType="satellite"
              initialRegion={{
                latitude: contactInfo.latitude,
                longitude: contactInfo.longitude,
                latitudeDelta: 0.008,
                longitudeDelta: 0.008,
              }}
              scrollEnabled={true}
              zoomEnabled={true}
              rotateEnabled={true}
              pitchEnabled={true}
              showsUserLocation={true}
              showsMyLocationButton={true}
              showsCompass={true}
            >
              <Marker
                coordinate={{
                  latitude: contactInfo.latitude,
                  longitude: contactInfo.longitude,
                }}
                title="Achimota School"
                description={contactInfo.address}
                pinColor="#4169E1"
              />
            </MapView>

            
            {/* Tap indicator */}
            <View style={styles.mapTapIndicator}>
              <Text style={styles.mapTapText}>Tap map to interact • Pinch to zoom</Text>
            </View>
            
            {/* Map Overlay with Location Details */}
            <View style={styles.mapOverlay}>
              <View style={styles.locationCard}>
                <MapPin size={20} color="#4169E1" strokeWidth={2} />
                <View style={styles.locationInfo}>
                  <Text style={styles.locationTitle}>Achimota School</Text>
                  <Text style={styles.locationAddress} numberOfLines={2}>{contactInfo.address}</Text>
                </View>
              </View>
              
              <TouchableOpacity 
                style={styles.directionsButton}
                onPress={handleMapLocation}
                activeOpacity={0.8}
              >
                <Navigation size={18} color="#FFFFFF" strokeWidth={2} />
                <Text style={styles.directionsText}>Get Directions</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>

        {/* Office Hours */}
        <View style={styles.officeHoursCard}>
          <View style={styles.officeHoursIcon}>
            <Clock size={20} color="#4169E1" strokeWidth={2} />
          </View>
          <View style={styles.officeHoursContent}>
            <Text style={styles.officeHoursLabel}>Office Hours</Text>
            <Text style={styles.officeHoursValue}>{contactInfo.hours}</Text>
          </View>
        </View>

        {/* Send Message Button */}
        <TouchableOpacity 
          style={styles.primaryCareButton}
          onPress={handleMessage}
          activeOpacity={0.9}
        >
          <MessageCircle size={22} color="#FFFFFF" strokeWidth={2} />
          <Text style={styles.primaryCareButtonText}>Send us a Message</Text>
          <View style={styles.primaryCareButtonArrow}>
            <ChevronRight size={20} color="#FFFFFF" strokeWidth={2.5} />
          </View>
        </TouchableOpacity>

        {/* Quick Help Text */}
        <View style={styles.quickHelpContainer}>
          <Text style={styles.quickHelpText}>
            💬 For immediate assistance, send us a message and our team will respond promptly
          </Text>
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
  careSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    marginHorizontal: 20,
  },
  careIconLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  careSectionTitleContainer: {
    flex: 1,
  },
  adminSettingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  careSectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    fontFamily: 'Inter-Bold',
    marginBottom: 2,
  },
  careSectionSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6b7280',
    fontFamily: 'Inter-Regular',
  },
  contactMethodsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  contactMethodCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  fullWidthCard: {
    marginHorizontal: 20,
    marginBottom: 12,
  },
  contactMethodIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  contactMethodLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  contactMethodValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1a1a1a',
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  officeHoursCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  officeHoursIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  officeHoursContent: {
    flex: 1,
  },
  officeHoursLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 2,
  },
  officeHoursValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    fontFamily: 'Inter-SemiBold',
  },
  primaryCareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    marginHorizontal: 20,
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryCareButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
    marginLeft: 10,
    marginRight: 8,
  },
  primaryCareButtonArrow: {
    marginLeft: 4,
  },
  quickHelpContainer: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  quickHelpText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0C4A6E',
    fontFamily: 'Inter-Medium',
    lineHeight: 18,
    textAlign: 'center',
  },
  visitUsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  sectionHeaderInline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  sectionTitleInline: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    fontFamily: 'Inter-Bold',
  },
  mapContainer: {
    height: 320,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#f5f5f5',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapTapIndicator: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    zIndex: 1,
  },
  mapTapText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
    fontFamily: 'Inter-Bold',
  },
  locationAddress: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
    fontFamily: 'Inter-Regular',
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4169E1',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  directionsText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
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