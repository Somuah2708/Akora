import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, TextInput, Dimensions } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter } from 'expo-router';
import { Search, Filter, ArrowLeft, Briefcase, Clock, MapPin, Building2, GraduationCap, ChevronRight, BookOpen, Users, Wallet, Plus } from 'lucide-react-native';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 48;

const JOB_TYPES = [
  { id: '1', name: 'Full Time Jobs', icon: Briefcase },
  { id: '2', name: 'Internships', icon: GraduationCap },
  { id: '3', name: 'National Service', icon: Users },
  { id: '4', name: 'Part Time', icon: Clock },
  { id: '5', name: 'Remote Work', icon: Building2 },
  { id: '6', name: 'Volunteering', icon: BookOpen },
];

const FEATURED_JOBS = [
  {
    id: '1',
    title: 'Software Engineer',
    company: 'TechCorp Ghana',
    location: 'Accra, Ghana',
    type: 'Full-Time',
    salary: '$3,000 - $5,000/month',
    posted: '2 days ago',
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=60',
    requirements: ['3+ years experience', 'React Native', 'Node.js'],
  },
  {
    id: '2',
    title: 'Marketing Intern',
    company: 'Global Media Ltd',
    location: 'Kumasi, Ghana',
    type: 'Internship',
    salary: '$500/month',
    posted: '1 day ago',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=60',
    requirements: ['Final year student', 'Marketing major', 'Creative mindset'],
  },
];

const RECENT_OPPORTUNITIES = [
  {
    id: '1',
    title: 'National Service - Teaching',
    organization: 'Ministry of Education',
    location: 'Various Locations',
    deadline: '2 weeks left',
    image: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: '2',
    title: 'Data Analyst',
    company: 'FinTech Solutions',
    location: 'Tema, Ghana',
    salary: '$2,000 - $3,500/month',
    posted: '3 days ago',
    image: 'https://images.unsplash.com/photo-1551836022-4c4c79ecde51?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: '3',
    title: 'Product Design Intern',
    company: 'Creative Hub',
    location: 'Remote',
    salary: '$800/month',
    posted: '1 week ago',
    image: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: '4',
    title: 'Business Development',
    company: 'Growth Partners',
    location: 'Accra, Ghana',
    salary: '$1,500 - $2,500/month',
    posted: '5 days ago',
    image: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&auto=format&fit=crop&q=60',
  },
];

export default function WorkplaceScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState('all');
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  const handleCategoryPress = (typeId: string) => {
    const jobType = JOB_TYPES.find(type => type.id === typeId);
    if (jobType) {
      router.push(`/workplace/category/${encodeURIComponent(jobType.name)}`);
    }
  };

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
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.title}>Workplace</Text>
          <TouchableOpacity style={styles.filterButton}>
            <Filter size={24} color="#000000" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Search size={20} color="#666666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search jobs, internships..."
              placeholderTextColor="#666666"
            />
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.typesScroll}
          contentContainerStyle={styles.typesContent}
        >
          {JOB_TYPES.map((type) => {
            const IconComponent = type.icon;
            return (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.typeButton,
                  activeFilter === type.id && styles.activeTypeButton,
                ]}
                onPress={() => handleCategoryPress(type.id)}
              >
                <IconComponent
                  size={24}
                  color={activeFilter === type.id ? '#FFFFFF' : '#000000'}
                />
                <Text
                  style={[
                    styles.typeName,
                    activeFilter === type.id && styles.activeTypeName,
                  ]}
                >
                  {type.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Opportunities</Text>
            <TouchableOpacity style={styles.seeAllButton}>
              <Text style={styles.seeAllText}>See All</Text>
              <ChevronRight size={16} color="#666666" />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredContent}
          >
            {FEATURED_JOBS.map((job) => (
              <TouchableOpacity key={job.id} style={styles.featuredCard}>
                <Image source={{ uri: job.image }} style={styles.featuredImage} />
                <View style={styles.featuredInfo}>
                  <View style={styles.jobTypeTag}>
                    <Clock size={14} color="#4169E1" />
                    <Text style={styles.jobTypeText}>{job.type}</Text>
                  </View>
                  <Text style={styles.jobTitle}>{job.title}</Text>
                  <View style={styles.companyInfo}>
                    <Building2 size={14} color="#666666" />
                    <Text style={styles.companyName}>{job.company}</Text>
                  </View>
                  <View style={styles.locationInfo}>
                    <MapPin size={14} color="#666666" />
                    <Text style={styles.locationText}>{job.location}</Text>
                  </View>
                  <View style={styles.salaryInfo}>
                    <Wallet size={14} color="#666666" />
                    <Text style={styles.salaryText}>{job.salary}</Text>
                  </View>
                  <View style={styles.requirementsTags}>
                    {job.requirements.map((req, index) => (
                      <View key={index} style={styles.requirementTag}>
                        <Text style={styles.requirementText}>{req}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Opportunities</Text>
            <TouchableOpacity style={styles.seeAllButton}>
              <Text style={styles.seeAllText}>See All</Text>
              <ChevronRight size={16} color="#666666" />
            </TouchableOpacity>
          </View>

          {RECENT_OPPORTUNITIES.map((opportunity) => (
            <TouchableOpacity key={opportunity.id} style={styles.opportunityCard}>
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
      
      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={() => router.push('/create-job-listing')}
      >
        <Plus size={24} color="#FFFFFF" />
        <Text style={styles.floatingButtonText}>Post Job</Text>
      </TouchableOpacity>
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
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  filterButton: {
    padding: 8,
  },
  searchContainer: {
    padding: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  typesScroll: {
    marginBottom: 24,
  },
  typesContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  activeTypeButton: {
    backgroundColor: '#4169E1',
  },
  typeName: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  activeTypeName: {
    color: '#FFFFFF',
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
  featuredContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  featuredCard: {
    width: CARD_WIDTH,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  featuredImage: {
    width: '100%',
    height: 160,
  },
  featuredInfo: {
    padding: 16,
    gap: 8,
  },
  jobTypeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EBF0FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  jobTypeText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  jobTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  companyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  companyName: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  salaryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  salaryText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  requirementsTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  requirementTag: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  requirementText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  opportunityCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
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
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#4169E1',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  floatingButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
  }
});