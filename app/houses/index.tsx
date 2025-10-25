import { View, Text, StyleSheet, ScrollView, Modal, TouchableOpacity, Image, Dimensions } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter } from 'expo-router';
import { ArrowLeft, Users, Trophy, Calendar, Flag, X, MapPin, Mail, Phone, Camera, Share2 } from 'lucide-react-native';
import HouseCard, { House } from '@/components/HouseCard';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');

const HOUSES: House[] = [
  {
    id: '1',
    name: 'Livingstone House',
    color: '#FF4444',
    motto: 'Service Before Self',
    image: 'https://www.achimotaglobal.org/wp-content/uploads/2019/03/livingstone-house.jpg',
    housemaster: 'Mr. James Addo',
    students: 250,
    achievements: [
      'Overall Best House 2023',
      'Sports Champions 2022',
      'Academic Excellence Award 2023'
    ],
    events: [
      {
        title: 'House Sports Day',
        date: 'March 25, 2024'
      },
      {
        title: 'Cultural Night',
        date: 'April 15, 2024'
      }
    ],
    contact: {
      email: 'livingstone@achimota.edu.gh',
      phone: '+233 20 123 4567',
      location: 'North Campus, Achimota School'
    },
    gallery: [
      'https://www.achimotaglobal.org/wp-content/uploads/2019/03/livingstone-sports.jpg',
      'https://www.achimotaglobal.org/wp-content/uploads/2019/03/livingstone-cultural.jpg',
      'https://www.achimotaglobal.org/wp-content/uploads/2019/03/livingstone-academic.jpg'
    ]
  },
  {
    id: '2',
    name: 'Aggrey House',
    color: '#4169E1',
    motto: 'Only The Best Is Good Enough',
    image: 'https://www.achimotaglobal.org/wp-content/uploads/2019/03/aggrey-house.jpg',
    housemaster: 'Mrs. Sarah Mensah',
    students: 245,
    achievements: [
      'Best in Academics 2023',
      'Cultural Performance Award 2022',
      'Leadership Excellence 2023'
    ],
    events: [
      {
        title: 'Academic Quiz',
        date: 'March 30, 2024'
      },
      {
        title: 'Talent Show',
        date: 'April 20, 2024'
      }
    ],
    contact: {
      email: 'aggrey@achimota.edu.gh',
      phone: '+233 20 234 5678',
      location: 'Central Campus, Achimota School'
    },
    gallery: [
      'https://www.achimotaglobal.org/wp-content/uploads/2019/03/aggrey-academics.jpg',
      'https://www.achimotaglobal.org/wp-content/uploads/2019/03/aggrey-cultural.jpg',
      'https://www.achimotaglobal.org/wp-content/uploads/2019/03/aggrey-leadership.jpg'
    ]
  },
  {
    id: '3',
    name: 'Fraser House',
    color: '#10B981',
    motto: 'Forward Ever',
    image: 'https://www.achimotaglobal.org/wp-content/uploads/2019/03/fraser-house.jpg',
    housemaster: 'Mr. Kwame Owusu',
    students: 248,
    achievements: [
      'Sports Champions 2023',
      'Best House Spirit 2022',
      'Community Service Award 2023'
    ],
    events: [
      {
        title: 'Community Outreach',
        date: 'April 5, 2024'
      },
      {
        title: 'Inter-House Debate',
        date: 'April 25, 2024'
      }
    ],
    contact: {
      email: 'fraser@achimota.edu.gh',
      phone: '+233 20 345 6789',
      location: 'South Campus, Achimota School'
    },
    gallery: [
      'https://www.achimotaglobal.org/wp-content/uploads/2019/03/fraser-sports.jpg',
      'https://www.achimotaglobal.org/wp-content/uploads/2019/03/fraser-community.jpg',
      'https://www.achimotaglobal.org/wp-content/uploads/2019/03/fraser-debate.jpg'
    ]
  },
  {
    id: '4',
    name: 'Guggisberg House',
    color: '#F59E0B',
    motto: 'Excellence Through Discipline',
    image: 'https://www.achimotaglobal.org/wp-content/uploads/2019/03/guggisberg-house.jpg',
    housemaster: 'Dr. Elizabeth Asare',
    students: 252,
    achievements: [
      'Best in Discipline 2023',
      'Academic Excellence 2022',
      'Leadership Award 2023'
    ],
    events: [
      {
        title: 'Leadership Summit',
        date: 'March 28, 2024'
      },
      {
        title: 'House Day',
        date: 'April 18, 2024'
      }
    ],
    contact: {
      email: 'guggisberg@achimota.edu.gh',
      phone: '+233 20 456 7890',
      location: 'East Campus, Achimota School'
    },
    gallery: [
      'https://www.achimotaglobal.org/wp-content/uploads/2019/03/guggisberg-discipline.jpg',
      'https://www.achimotaglobal.org/wp-content/uploads/2019/03/guggisberg-academic.jpg',
      'https://www.achimotaglobal.org/wp-content/uploads/2019/03/guggisberg-leadership.jpg'
    ]
  }
];

const STATS = [
  {
    title: 'Total Students',
    value: '995',
    trend: 'Current Year',
    icon: Users
  },
  {
    title: 'House Events',
    value: '24',
    trend: 'This Term',
    icon: Calendar
  },
  {
    title: 'Achievements',
    value: '45',
    trend: '2023/2024',
    icon: Trophy
  }
];

export default function HousesScreen() {
  const router = useRouter();
  const [selectedHouse, setSelectedHouse] = useState<House | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
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

  const handleHousePress = (house: House) => {
    setSelectedHouse(house);
    setModalVisible(true);
  };

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.title}>School Houses</Text>
        </View>

        <View style={styles.welcomeCard}>
          <View style={styles.welcomeContent}>
            <Flag size={32} color="#4169E1" />
            <Text style={styles.welcomeTitle}>Achimota School Houses</Text>
            <Text style={styles.welcomeText}>
              Discover our proud houses, each with its unique traditions and achievements
            </Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          {STATS.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <View key={index} style={styles.statCard}>
                <IconComponent size={24} color="#4169E1" />
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statTitle}>{stat.title}</Text>
                <Text style={styles.statTrend}>{stat.trend}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          {HOUSES.map((house) => (
            <HouseCard
              key={house.id}
              house={house}
              onPress={() => handleHousePress(house)}
            />
          ))}
        </View>
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        {selectedHouse && (
          <View style={styles.modalContainer}>
            <ScrollView style={styles.modalScroll}>
              <Image source={{ uri: selectedHouse.image }} style={styles.modalImage} />
              
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <X size={24} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={[styles.modalContent, { borderTopColor: selectedHouse.color }]}>
                <Text style={styles.modalTitle}>{selectedHouse.name}</Text>
                <Text style={styles.modalMotto}>"{selectedHouse.motto}"</Text>

                <View style={styles.contactSection}>
                  <Text style={styles.sectionTitle}>Contact Information</Text>
                  <TouchableOpacity style={styles.contactItem}>
                    <MapPin size={20} color="#666666" />
                    <Text style={styles.contactText}>{selectedHouse.contact.location}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.contactItem}>
                    <Mail size={20} color="#666666" />
                    <Text style={styles.contactText}>{selectedHouse.contact.email}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.contactItem}>
                    <Phone size={20} color="#666666" />
                    <Text style={styles.contactText}>{selectedHouse.contact.phone}</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.gallerySection}>
                  <Text style={styles.sectionTitle}>Photo Gallery</Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.galleryContent}
                  >
                    {selectedHouse.gallery.map((photo, index) => (
                      <TouchableOpacity key={index} style={styles.galleryItem}>
                        <Image source={{ uri: photo }} style={styles.galleryImage} />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: selectedHouse.color }]}
                  >
                    <Camera size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>View More Photos</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.shareButton}>
                    <Share2 size={20} color="#666666" />
                    <Text style={styles.shareButtonText}>Share</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>
    </>
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
    marginBottom: 4,
    textAlign: 'center',
  },
  statTrend: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#4169E1',
  },
  section: {
    padding: 16,
    gap: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalScroll: {
    flex: 1,
  },
  modalImage: {
    width: '100%',
    height: 300,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    padding: 24,
    borderTopWidth: 4,
    gap: 24,
  },
  modalTitle: {
    fontSize: 28,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  modalMotto: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 16,
  },
  contactSection: {
    gap: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  contactText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  gallerySection: {
    gap: 16,
  },
  galleryContent: {
    gap: 12,
  },
  galleryItem: {
    width: 200,
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
  },
  shareButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
  },
});