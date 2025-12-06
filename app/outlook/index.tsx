import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, RefreshControl } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect } from 'react';
import { useRefresh } from '@/hooks/useRefresh';
import { SplashScreen, useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, MapPin, Building2, Navigation, Car, Bus, Brain as Train, Phone, Mail, Globe, ChevronRight, Trees, School, Users, BookOpen } from 'lucide-react-native';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 48;

const CAMPUS_INFO = {
  location: 'Achimota, Accra, Ghana',
  area: '1,300 acres (5.3 km²)',
  facilities: [
    {
      name: 'Academic Facilities',
      description: 'Modern classrooms, laboratories, and libraries',
      icon: School,
      count: '50+ Buildings'
    },
    {
      name: 'Recreational Areas',
      description: 'Sports fields, swimming pool, and recreation centers',
      icon: Trees,
      count: '20+ Facilities'
    },
    {
      name: 'Student Housing',
      description: 'Dormitories and boarding facilities',
      icon: Building2,
      count: '12 Houses'
    }
  ]
};

const DIRECTIONS = [
  {
    mode: 'Car',
    icon: Car,
    routes: [
      'From Accra Central: Take Ring Road to Achimota (25 mins)',
      'From Airport: Via Liberation Road (35 mins)',
    ]
  },
  {
    mode: 'Public Transport',
    icon: Bus,
    routes: [
      'Trotro from Accra Central to Achimota',
      'Bus services from major city terminals'
    ]
  },
  {
    mode: 'Train',
    icon: Train,
    routes: [
      'Accra-Nsawam line to Achimota Station',
      'Short walk from station to campus'
    ]
  }
];

const KEY_LOCATIONS = [
  {
    name: 'Main Administration Block',
    image: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&auto=format&fit=crop&q=60',
    description: 'Central administrative offices and reception',
    coordinates: '5.6037° N, 0.2390° W'
  },
  {
    name: 'Assembly Hall',
    image: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=800&auto=format&fit=crop&q=60',
    description: 'Historic gathering place for school events',
    coordinates: '5.6038° N, 0.2392° W'
  },
  {
    name: 'Science Complex',
    image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop&q=60',
    description: 'Modern laboratories and research facilities',
    coordinates: '5.6036° N, 0.2389° W'
  }
];

const CONTACT_INFO = {
  phone: '+233 20 123 4567',
  email: 'info@achimota.edu.gh',
  website: 'www.achimota.edu.gh',
  address: 'Achimota School, PMB, Achimota, Accra, Ghana'
};

const CAMPUS_STATS = [
  {
    title: 'Total Buildings',
    value: '80+',
    icon: Building2
  },
  {
    title: 'Student Capacity',
    value: '2,500',
    icon: Users
  },
  {
    title: 'Classrooms',
    value: '100+',
    icon: BookOpen
  }
];

export default function OutlookScreen() {
  const router = useRouter();
  
  const { isRefreshing, handleRefresh } = useRefresh({
    onRefresh: async () => {
      // Reload outlook data
      await new Promise(resolve => setTimeout(resolve, 300));
    },
  });
  
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
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor="#000000"
          colors={['#000000']}
        />
      }
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.title}>School Outlook</Text>
      </View>

      <Image 
        source={{ uri: 'https://images.unsplash.com/photo-1562774053-701939374585?w=800&auto=format&fit=crop&q=60' }}
        style={styles.heroImage}
      />

      <View style={styles.locationCard}>
        <MapPin size={24} color="#4169E1" />
        <Text style={styles.locationTitle}>{CAMPUS_INFO.location}</Text>
        <Text style={styles.locationArea}>Campus Area: {CAMPUS_INFO.area}</Text>
      </View>

      <View style={styles.statsContainer}>
        {CAMPUS_STATS.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <View key={index} style={styles.statCard}>
              <IconComponent size={24} color="#4169E1" />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statTitle}>{stat.title}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Campus Facilities</Text>
        {CAMPUS_INFO.facilities.map((facility, index) => {
          const IconComponent = facility.icon;
          return (
            <View key={index} style={styles.facilityCard}>
              <View style={styles.facilityIcon}>
                <IconComponent size={24} color="#4169E1" />
              </View>
              <View style={styles.facilityInfo}>
                <Text style={styles.facilityName}>{facility.name}</Text>
                <Text style={styles.facilityDescription}>{facility.description}</Text>
                <Text style={styles.facilityCount}>{facility.count}</Text>
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Key Locations</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.locationsContainer}
        >
          {KEY_LOCATIONS.map((location, index) => (
            <TouchableOpacity key={index} style={styles.locationCard}>
              <Image source={{ uri: location.image }} style={styles.locationImage} />
              <View style={styles.locationInfo}>
                <Text style={styles.locationName}>{location.name}</Text>
                <Text style={styles.locationDescription}>{location.description}</Text>
                <View style={styles.coordinatesContainer}>
                  <Navigation size={14} color="#666666" />
                  <Text style={styles.coordinatesText}>{location.coordinates}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Getting Here</Text>
        {DIRECTIONS.map((direction, index) => {
          const IconComponent = direction.icon;
          return (
            <View key={index} style={styles.directionCard}>
              <View style={styles.directionHeader}>
                <IconComponent size={24} color="#4169E1" />
                <Text style={styles.directionMode}>{direction.mode}</Text>
              </View>
              <View style={styles.routesList}>
                {direction.routes.map((route, routeIndex) => (
                  <View key={routeIndex} style={styles.routeItem}>
                    <MapPin size={14} color="#666666" />
                    <Text style={styles.routeText}>{route}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        <View style={styles.contactCard}>
          <TouchableOpacity style={styles.contactItem}>
            <Phone size={20} color="#666666" />
            <Text style={styles.contactText}>{CONTACT_INFO.phone}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.contactItem}>
            <Mail size={20} color="#666666" />
            <Text style={styles.contactText}>{CONTACT_INFO.email}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.contactItem}>
            <Globe size={20} color="#666666" />
            <Text style={styles.contactText}>{CONTACT_INFO.website}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.contactItem}>
            <MapPin size={20} color="#666666" />
            <Text style={styles.contactText}>{CONTACT_INFO.address}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.mapButton}>
        <Navigation size={20} color="#FFFFFF" />
        <Text style={styles.mapButtonText}>Open in Maps</Text>
        <ChevronRight size={20} color="#FFFFFF" />
      </TouchableOpacity>
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
  locationCard: {
    margin: 16,
    padding: 24,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
  },
  locationTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    textAlign: 'center',
  },
  locationArea: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginTop: 8,
  },
  statTitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  facilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
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
  facilityIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EBF0FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  facilityInfo: {
    flex: 1,
  },
  facilityName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 4,
  },
  facilityDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 4,
  },
  facilityCount: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  locationsContainer: {
    paddingHorizontal: 16,
    gap: 16,
  },
  locationImage: {
    width: 280,
    height: 160,
    borderRadius: 12,
    marginBottom: 12,
  },
  locationInfo: {
    gap: 8,
  },
  locationName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  locationDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  coordinatesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  coordinatesText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  directionCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
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
  directionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  directionMode: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  routesList: {
    gap: 8,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  contactCard: {
    marginHorizontal: 16,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
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
    color: '#666666',
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4169E1',
    marginHorizontal: 16,
    marginBottom: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  mapButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});