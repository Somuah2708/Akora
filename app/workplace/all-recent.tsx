import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect } from 'react';
import { SplashScreen, useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, Clock, MapPin, Wallet } from 'lucide-react-native';

SplashScreen.preventAutoHideAsync();

const RECENT_OPPORTUNITIES = [
  {
    id: '1',
    title: 'National Service - Teaching',
    organization: 'Ministry of Education',
    company: 'Ministry of Education',
    location: 'Various Locations',
    type: 'National Service',
    deadline: '2 weeks left',
    image: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: '2',
    title: 'Data Analyst',
    company: 'FinTech Solutions',
    location: 'Tema, Ghana',
    type: 'Full Time Jobs',
    salary: '$2,000 - $3,500/month',
    posted: '3 days ago',
    image: 'https://images.unsplash.com/photo-1551836022-4c4c79ecde51?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: '3',
    title: 'Product Design Intern',
    company: 'Creative Hub',
    location: 'Remote',
    type: 'Internships',
    salary: '$800/month',
    posted: '1 week ago',
    image: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: '4',
    title: 'Business Development',
    company: 'Growth Partners',
    location: 'Accra, Ghana',
    type: 'Full Time Jobs',
    salary: '$1,500 - $2,500/month',
    posted: '5 days ago',
    image: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: '5',
    title: 'Part-Time Graphic Designer',
    company: 'Media House',
    location: 'Accra, Ghana',
    type: 'Part Time',
    salary: '$800/month',
    posted: '1 week ago',
    image: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: '6',
    title: 'Community Volunteer Coordinator',
    organization: 'Hope Foundation',
    company: 'Hope Foundation',
    location: 'Kumasi, Ghana',
    type: 'Volunteering',
    posted: '4 days ago',
    image: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: '7',
    title: 'Mobile App Developer',
    company: 'Tech Innovators',
    location: 'Accra, Ghana',
    type: 'Full Time Jobs',
    salary: '$3,500 - $5,000/month',
    posted: '2 days ago',
    image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: '8',
    title: 'Content Writer Intern',
    company: 'Digital Marketing Agency',
    location: 'Remote',
    type: 'Internships',
    salary: '$400/month',
    posted: '6 days ago',
    image: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: '9',
    title: 'National Service - Healthcare',
    organization: 'Ghana Health Service',
    company: 'Ghana Health Service',
    location: 'Various Hospitals',
    type: 'National Service',
    deadline: '3 weeks left',
    image: 'https://images.unsplash.com/photo-1584982751601-97dcc096659c?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: '10',
    title: 'Customer Support Agent',
    company: 'E-commerce Platform',
    location: 'Accra, Ghana',
    type: 'Part Time',
    salary: '$600/month',
    posted: '1 week ago',
    image: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&auto=format&fit=crop&q=60',
  },
];

export default function AllRecentOpportunitiesScreen() {
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
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.title}>All Opportunities</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.list}>
          {RECENT_OPPORTUNITIES.map((opportunity) => (
            <TouchableOpacity 
              key={opportunity.id} 
              style={styles.opportunityCard}
              onPress={() => debouncedRouter.push(`/workplace/${opportunity.id}`)}
            >
              <Image source={{ uri: opportunity.image }} style={styles.opportunityImage} />
              <View style={styles.opportunityInfo}>
                <Text style={styles.opportunityTitle}>{opportunity.title}</Text>
                <Text style={styles.organizationName}>
                  {opportunity.organization || opportunity.company}
                </Text>
                <View style={styles.opportunityDetails}>
                  <View style={styles.detailItem}>
                    <MapPin size={14} color="#666666" />
                    <Text style={styles.detailText}>{opportunity.location}</Text>
                  </View>
                  {opportunity.salary && (
                    <View style={styles.detailItem}>
                      <Wallet size={14} color="#666666" />
                      <Text style={styles.detailText}>{opportunity.salary}</Text>
                    </View>
                  )}
                  <View style={styles.detailItem}>
                    <Clock size={14} color="#666666" />
                    <Text style={styles.detailText}>
                      {opportunity.deadline || opportunity.posted}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  list: {
    padding: 16,
  },
  opportunityCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
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
  opportunityImage: {
    width: 100,
    height: 100,
  },
  opportunityInfo: {
    flex: 1,
    padding: 12,
    gap: 4,
  },
  opportunityTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  organizationName: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  opportunityDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
});
