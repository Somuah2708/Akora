import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useEffect } from 'react';
import { SplashScreen, useRouter } from 'expo-router';
import { ArrowLeft, Phone, Mail, MapPin, Clock, Truck, Package, ExternalLink } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

SplashScreen.preventAutoHideAsync();

const DELIVERY_SERVICES = [
  {
    id: '1',
    name: 'DHL Express',
    description: 'Fast and reliable international delivery',
    estimatedTime: '2-3 business days',
    website: 'https://www.dhl.com',
    phone: '+233 302 123 456',
    icon: '📦',
  },
  {
    id: '2',
    name: 'Yango Delivery',
    description: 'Quick local delivery service',
    estimatedTime: 'Same day delivery',
    website: 'https://yango.com',
    phone: '+233 50 123 4567',
    icon: '🚗',
  },
  {
    id: '3',
    name: 'Uber Direct',
    description: 'On-demand delivery platform',
    estimatedTime: '1-2 hours',
    website: 'https://www.uber.com',
    phone: '+233 24 123 4567',
    icon: '🚚',
  },
  {
    id: '4',
    name: 'Bolt Delivery',
    description: 'Affordable courier service',
    estimatedTime: '2-4 hours',
    website: 'https://bolt.eu',
    phone: '+233 20 123 4567',
    icon: '⚡',
  },
];

export default function HomeDeliveryScreen() {
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

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  const handleWebsite = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#4169E1', '#5B7FE8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Home Delivery</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Secretariat Contact Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Truck size={24} color="#4169E1" />
            <Text style={styles.sectionTitle}>OAA Secretariat Contact</Text>
          </View>
          
          <View style={styles.contactCard}>
            <Text style={styles.contactDescription}>
              Contact the OAA Secretariat to arrange delivery of your items through any of our partner delivery services.
            </Text>

            <TouchableOpacity 
              style={styles.contactItem}
              onPress={() => handleCall('+233 302 765 432')}
            >
              <View style={styles.contactIcon}>
                <Phone size={20} color="#4169E1" />
              </View>
              <View style={styles.contactDetails}>
                <Text style={styles.contactLabel}>Phone</Text>
                <Text style={styles.contactValue}>+233 302 765 432</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.contactItem}
              onPress={() => handleEmail('delivery@oaasecretariat.edu.gh')}
            >
              <View style={styles.contactIcon}>
                <Mail size={20} color="#4169E1" />
              </View>
              <View style={styles.contactDetails}>
                <Text style={styles.contactLabel}>Email</Text>
                <Text style={styles.contactValue}>delivery@oaasecretariat.edu.gh</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.contactItem}>
              <View style={styles.contactIcon}>
                <MapPin size={20} color="#4169E1" />
              </View>
              <View style={styles.contactDetails}>
                <Text style={styles.contactLabel}>Address</Text>
                <Text style={styles.contactValue}>
                  Alumni Secretariat{'\n'}
                  Achimota Senior High School{'\n'}
                  Accra, Ghana
                </Text>
              </View>
            </View>

            <View style={styles.contactItem}>
              <View style={styles.contactIcon}>
                <Clock size={20} color="#4169E1" />
              </View>
              <View style={styles.contactDetails}>
                <Text style={styles.contactLabel}>Working Hours</Text>
                <Text style={styles.contactValue}>
                  Monday - Friday: 8:00 AM - 5:00 PM{'\n'}
                  Saturday: 9:00 AM - 2:00 PM{'\n'}
                  Sunday: Closed
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Delivery Services */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Package size={24} color="#4169E1" />
            <Text style={styles.sectionTitle}>Available Delivery Services</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Choose from our trusted delivery partners
          </Text>

          {DELIVERY_SERVICES.map((service) => (
            <View key={service.id} style={styles.serviceCard}>
              <View style={styles.serviceHeader}>
                <Text style={styles.serviceIcon}>{service.icon}</Text>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  <Text style={styles.serviceDescription}>{service.description}</Text>
                </View>
              </View>

              <View style={styles.serviceDetails}>
                <View style={styles.serviceDetailItem}>
                  <Clock size={16} color="#666666" />
                  <Text style={styles.serviceDetailText}>{service.estimatedTime}</Text>
                </View>
                
                <TouchableOpacity 
                  style={styles.serviceDetailItem}
                  onPress={() => handleCall(service.phone)}
                >
                  <Phone size={16} color="#4169E1" />
                  <Text style={styles.serviceDetailLink}>{service.phone}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={styles.websiteButton}
                onPress={() => handleWebsite(service.website)}
              >
                <ExternalLink size={16} color="#4169E1" />
                <Text style={styles.websiteButtonText}>Visit Website</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Instructions */}
        <View style={styles.section}>
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsTitle}>How to Request Delivery</Text>
            <View style={styles.instructionsList}>
              <View style={styles.instructionItem}>
                <View style={styles.instructionNumber}>
                  <Text style={styles.instructionNumberText}>1</Text>
                </View>
                <Text style={styles.instructionText}>
                  Contact the OAA Secretariat using the phone number or email above
                </Text>
              </View>
              <View style={styles.instructionItem}>
                <View style={styles.instructionNumber}>
                  <Text style={styles.instructionNumberText}>2</Text>
                </View>
                <Text style={styles.instructionText}>
                  Provide your order details and preferred delivery service
                </Text>
              </View>
              <View style={styles.instructionItem}>
                <View style={styles.instructionNumber}>
                  <Text style={styles.instructionNumberText}>3</Text>
                </View>
                <Text style={styles.instructionText}>
                  The secretariat will arrange delivery and provide tracking information
                </Text>
              </View>
              <View style={styles.instructionItem}>
                <View style={styles.instructionNumber}>
                  <Text style={styles.instructionNumberText}>4</Text>
                </View>
                <Text style={styles.instructionText}>
                  Delivery costs will be calculated based on your location and selected service
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#000000',
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 16,
  },
  contactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  contactDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 16,
    lineHeight: 20,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EBF0FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactDetails: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    lineHeight: 20,
  },
  serviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#000000',
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  serviceDetails: {
    gap: 8,
    marginBottom: 12,
  },
  serviceDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  serviceDetailText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  serviceDetailLink: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  websiteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4169E1',
    backgroundColor: '#EBF0FF',
  },
  websiteButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  instructionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  instructionsTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#000000',
    marginBottom: 16,
  },
  instructionsList: {
    gap: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  instructionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4169E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  instructionNumberText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#333333',
    lineHeight: 20,
  },
});
