import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, RefreshControl } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect } from 'react';
import { useRefresh } from '@/hooks/useRefresh';
import { SplashScreen, useRouter } from 'expo-router';
import { ArrowLeft, Clock, MapPin, Building2, Wallet } from 'lucide-react-native';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');

const FEATURED_JOBS = [
  {
    id: '1',
    title: 'Software Engineer',
    company: 'TechCorp Ghana',
    location: 'Accra, Ghana',
    type: 'Full Time Jobs',
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
    type: 'Internships',
    salary: '$500/month',
    posted: '1 day ago',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=60',
    requirements: ['Final year student', 'Marketing major', 'Creative mindset'],
  },
  {
    id: '3',
    title: 'Remote Frontend Developer',
    company: 'Digital Solutions',
    location: 'Remote',
    type: 'Remote Work',
    salary: '$2,500 - $4,000/month',
    posted: '3 days ago',
    image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=60',
    requirements: ['React', 'TypeScript', '2+ years experience'],
  },
  {
    id: '4',
    title: 'UI/UX Designer',
    company: 'Creative Studio',
    location: 'Accra, Ghana',
    type: 'Full Time Jobs',
    salary: '$2,000 - $3,500/month',
    posted: '5 days ago',
    image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&auto=format&fit=crop&q=60',
    requirements: ['Figma', 'Adobe XD', 'Portfolio required'],
  },
  {
    id: '5',
    title: 'Backend Developer Intern',
    company: 'StartUp Inc',
    location: 'Remote',
    type: 'Internships',
    salary: '$600/month',
    posted: '1 week ago',
    image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&auto=format&fit=crop&q=60',
    requirements: ['Python', 'Django', 'Learning mindset'],
  },
  {
    id: '6',
    title: 'DevOps Engineer',
    company: 'Cloud Services Ltd',
    location: 'Tema, Ghana',
    type: 'Full Time Jobs',
    salary: '$4,000 - $6,000/month',
    posted: '3 days ago',
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=60',
    requirements: ['AWS', 'Docker', 'Kubernetes'],
  },
];

export default function AllFeaturedJobsScreen() {
  const router = useRouter();
  
  const { isRefreshing, handleRefresh } = useRefresh({
    onRefresh: async () => {
      // Reload featured jobs
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
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.title}>All Featured Jobs</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#4169E1"
            colors={['#4169E1']}
          />
        }
      >
        <View style={styles.grid}>
          {FEATURED_JOBS.map((job) => (
            <TouchableOpacity 
              key={job.id} 
              style={styles.jobCard}
              onPress={() => router.push(`/workplace/${job.id}` as any)}
            >
              <Image source={{ uri: job.image }} style={styles.jobImage} />
              <View style={styles.jobInfo}>
                <View style={styles.jobTypeTag}>
                  <Clock size={12} color="#4169E1" />
                  <Text style={styles.jobTypeText}>{job.type}</Text>
                </View>
                <Text style={styles.jobTitle} numberOfLines={2}>{job.title}</Text>
                <View style={styles.companyInfo}>
                  <Building2 size={12} color="#666666" />
                  <Text style={styles.companyName} numberOfLines={1}>{job.company}</Text>
                </View>
                <View style={styles.locationInfo}>
                  <MapPin size={12} color="#666666" />
                  <Text style={styles.locationText} numberOfLines={1}>{job.location}</Text>
                </View>
                <View style={styles.salaryInfo}>
                  <Wallet size={12} color="#666666" />
                  <Text style={styles.salaryText} numberOfLines={1}>{job.salary}</Text>
                </View>
                <View style={styles.requirementsTags}>
                  {job.requirements.slice(0, 2).map((req: string, index: number) => (
                    <View key={index} style={styles.requirementTag}>
                      <Text style={styles.requirementText} numberOfLines={1}>{req}</Text>
                    </View>
                  ))}
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 16,
    justifyContent: 'space-between',
  },
  jobCard: {
    width: (width - 48) / 2,
    borderRadius: 12,
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
    marginBottom: 8,
  },
  jobImage: {
    width: '100%',
    height: 120,
  },
  jobInfo: {
    padding: 12,
    gap: 6,
  },
  jobTypeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EBF0FF',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  jobTypeText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  jobTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    lineHeight: 18,
  },
  companyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  companyName: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    flex: 1,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    flex: 1,
  },
  salaryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  salaryText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    flex: 1,
  },
  requirementsTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  requirementTag: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  requirementText: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
});
