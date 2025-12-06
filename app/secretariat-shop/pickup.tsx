import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useEffect } from 'react';
import { SplashScreen, useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, Phone, Mail, MapPin, Clock, Package, Navigation, Calendar } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

SplashScreen.preventAutoHideAsync();

export default function PickupScreen() {
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

  const handleDirections = () => {
    // Open Google Maps with the secretariat location
    const address = 'Achimota Senior High School, Accra, Ghana';
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
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
          <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Pickup at Secretariat</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Package size={48} color="#4169E1" />
          </View>
          <Text style={styles.heroTitle}>Free Pickup Available</Text>
          <Text style={styles.heroSubtitle}>
            Collect your items directly from the OAA Secretariat office at no extra cost
          </Text>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Secretariat Contact Details</Text>
          
          <View style={styles.contactCard}>
            <TouchableOpacity 
              style={styles.contactItem}
              onPress={() => handleCall('+233 302 765 432')}
            >
              <View style={styles.contactIcon}>
                <Phone size={20} color="#4169E1" />
              </View>
              <View style={styles.contactDetails}>
                <Text style={styles.contactLabel}>Main Office</Text>
                <Text style={styles.contactValue}>+233 302 765 432</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.contactItem}
              onPress={() => handleCall('+233 50 123 4567')}
            >
              <View style={styles.contactIcon}>
                <Phone size={20} color="#4169E1" />
              </View>
              <View style={styles.contactDetails}>
                <Text style={styles.contactLabel}>Mobile</Text>
                <Text style={styles.contactValue}>+233 50 123 4567</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.contactItem}
              onPress={() => handleEmail('info@oaasecretariat.edu.gh')}
            >
              <View style={styles.contactIcon}>
                <Mail size={20} color="#4169E1" />
              </View>
              <View style={styles.contactDetails}>
                <Text style={styles.contactLabel}>Email</Text>
                <Text style={styles.contactValue}>info@oaasecretariat.edu.gh</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.contactItem}>
              <View style={styles.contactIcon}>
                <MapPin size={20} color="#4169E1" />
              </View>
              <View style={styles.contactDetails}>
                <Text style={styles.contactLabel}>Location</Text>
                <Text style={styles.contactValue}>
                  OAA Secretariat Office{'\n'}
                  Alumni Building, 2nd Floor{'\n'}
                  Achimota Senior High School{'\n'}
                  Accra, Ghana
                </Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.directionsButton}
              onPress={handleDirections}
            >
              <Navigation size={18} color="#FFFFFF" />
              <Text style={styles.directionsButtonText}>Get Directions</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Pickup Hours */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pickup Hours</Text>
          
          <View style={styles.hoursCard}>
            <View style={styles.hoursHeader}>
              <Clock size={24} color="#4169E1" />
              <Text style={styles.hoursHeaderText}>Operating Hours</Text>
            </View>

            <View style={styles.hoursItem}>
              <Text style={styles.dayText}>Monday - Friday</Text>
              <Text style={styles.timeText}>8:00 AM - 5:00 PM</Text>
            </View>

            <View style={styles.hoursItem}>
              <Text style={styles.dayText}>Saturday</Text>
              <Text style={styles.timeText}>9:00 AM - 2:00 PM</Text>
            </View>

            <View style={styles.hoursItem}>
              <Text style={styles.dayText}>Sunday</Text>
              <Text style={styles.timeText}>Closed</Text>
            </View>

            <View style={styles.hoursNote}>
              <Calendar size={16} color="#666666" />
              <Text style={styles.hoursNoteText}>
                Please call ahead to confirm your order is ready for pickup
              </Text>
            </View>
          </View>
        </View>

        {/* Pickup Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How to Pickup Your Items</Text>
          
          <View style={styles.instructionsCard}>
            <View style={styles.instructionItem}>
              <View style={styles.instructionNumber}>
                <Text style={styles.instructionNumberText}>1</Text>
              </View>
              <View style={styles.instructionContent}>
                <Text style={styles.instructionTitle}>Place Your Order</Text>
                <Text style={styles.instructionText}>
                  Complete your purchase through the Secretariat Shop
                </Text>
              </View>
            </View>

            <View style={styles.instructionItem}>
              <View style={styles.instructionNumber}>
                <Text style={styles.instructionNumberText}>2</Text>
              </View>
              <View style={styles.instructionContent}>
                <Text style={styles.instructionTitle}>Wait for Confirmation</Text>
                <Text style={styles.instructionText}>
                  You'll receive a notification when your items are ready for pickup (usually next business day)
                </Text>
              </View>
            </View>

            <View style={styles.instructionItem}>
              <View style={styles.instructionNumber}>
                <Text style={styles.instructionNumberText}>3</Text>
              </View>
              <View style={styles.instructionContent}>
                <Text style={styles.instructionTitle}>Visit the Secretariat</Text>
                <Text style={styles.instructionText}>
                  Come to our office during operating hours with your order confirmation
                </Text>
              </View>
            </View>

            <View style={styles.instructionItem}>
              <View style={styles.instructionNumber}>
                <Text style={styles.instructionNumberText}>4</Text>
              </View>
              <View style={styles.instructionContent}>
                <Text style={styles.instructionTitle}>Collect Your Items</Text>
                <Text style={styles.instructionText}>
                  Present your ID and order number to receive your items
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Important Notes */}
        <View style={styles.section}>
          <View style={styles.notesCard}>
            <Text style={styles.notesTitle}>Important Information</Text>
            <View style={styles.notesList}>
              <Text style={styles.noteItem}>• Please bring a valid ID when collecting your items</Text>
              <Text style={styles.noteItem}>• Items can be collected by the purchaser or an authorized representative</Text>
              <Text style={styles.noteItem}>• Uncollected items will be held for 30 days before being returned to inventory</Text>
              <Text style={styles.noteItem}>• For large or bulk orders, please contact us in advance</Text>
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
  heroSection: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EBF0FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#000000',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#000000',
    marginBottom: 12,
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
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#4169E1',
  },
  directionsButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  hoursCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  hoursHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  hoursHeaderText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#000000',
  },
  hoursItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  dayText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#333333',
  },
  timeText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  hoursNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
  },
  hoursNoteText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    lineHeight: 18,
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
    gap: 20,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  instructionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4169E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  instructionNumberText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  instructionContent: {
    flex: 1,
  },
  instructionTitle: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: '#000000',
    marginBottom: 4,
  },
  instructionText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    lineHeight: 19,
  },
  notesCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  notesTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#000000',
    marginBottom: 12,
  },
  notesList: {
    gap: 8,
  },
  noteItem: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#333333',
    lineHeight: 20,
  },
});
