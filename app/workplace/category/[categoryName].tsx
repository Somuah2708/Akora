import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState, useCallback } from 'react';
import { SplashScreen, useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Briefcase, Clock, MapPin, Building2, Wallet } from 'lucide-react-native';
import { supabase, type ProductService, type Profile } from '@/lib/supabase';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 48;

interface JobWithUser extends ProductService {
  user: Profile;
  company?: string;
  location?: string;
  salary?: string;
  jobType?: string;
}

export default function CategoryScreen() {
  const router = useRouter();
  const { categoryName } = useLocalSearchParams<{ categoryName: string }>();
  const [jobs, setJobs] = useState<JobWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  const fetchJobs = useCallback(async () => {
    if (!categoryName) return;
    
    try {
      setLoading(true);
      
      // Fetch jobs by category
      const { data: jobsData, error: jobsError } = await supabase
        .from('products_services')
        .select(`
          *,
          profiles (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('category_name', decodeURIComponent(categoryName))
        .eq('is_approved', true)
        .order('created_at', { ascending: false });
      
      if (jobsError) throw jobsError;
      
      // Process the job listings
      const processedJobs = (jobsData || []).map(job => {
        // Parse the description to extract company and location
        // Format expected: "Company | Location | Description"
        const parts = job.description.split('|');
        let company = '';
        let location = '';
        let description = job.description;
        
        if (parts.length >= 3) {
          company = parts[0].trim();
          location = parts[1].trim();
          description = parts.slice(2).join('|').trim();
        }
        
        return {
          ...job,
          user: job.profiles as Profile,
          company,
          location,
          description,
          salary: job.price ? `$${job.price}${job.price % 1 === 0 ? '' : '/month'}` : 'Not specified',
          jobType: job.category_name
        };
      });
      
      setJobs(processedJobs);
    } catch (error) {
      console.error('Error fetching jobs by category:', error);
    } finally {
      setLoading(false);
    }
  }, [categoryName]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.title}>{decodeURIComponent(categoryName || '')}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4169E1" />
            <Text style={styles.loadingText}>Loading opportunities...</Text>
          </View>
        ) : jobs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No opportunities found in this category</Text>
          </View>
        ) : (
          <View style={styles.jobsContainer}>
            {jobs.map((job) => (
              <TouchableOpacity key={job.id} style={styles.jobCard}>
                <View style={styles.jobHeader}>
                  <View style={styles.jobTypeTag}>
                    <Briefcase size={14} color="#4169E1" />
                    <Text style={styles.jobTypeText}>{job.jobType}</Text>
                  </View>
                  {job.image_url && (
                    <Image 
                      source={{ uri: job.image_url }} 
                      style={styles.companyLogo} 
                    />
                  )}
                </View>
                
                <Text style={styles.jobTitle}>{job.title}</Text>
                
                <View style={styles.companyInfo}>
                  <Building2 size={14} color="#666666" />
                  <Text style={styles.companyName}>{job.company || 'Company not specified'}</Text>
                </View>
                
                <View style={styles.locationInfo}>
                  <MapPin size={14} color="#666666" />
                  <Text style={styles.locationText}>{job.location || 'Location not specified'}</Text>
                </View>
                
                {job.price && (
                  <View style={styles.salaryInfo}>
                    <Wallet size={14} color="#666666" />
                    <Text style={styles.salaryText}>{job.salary}</Text>
                  </View>
                )}
                
                <Text style={styles.jobDescription} numberOfLines={3}>
                  {job.description}
                </Text>
                
                <View style={styles.jobFooter}>
                  <View style={styles.postedInfo}>
                    <Clock size={14} color="#666666" />
                    <Text style={styles.postedText}>
                      {new Date(job.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  
                  <TouchableOpacity style={styles.applyButton}>
                    <Text style={styles.applyButtonText}>Apply Now</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
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
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    textAlign: 'center',
  },
  jobsContainer: {
    gap: 16,
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  jobTypeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF0FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  jobTypeText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  companyLogo: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  jobTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 8,
  },
  companyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
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
    marginBottom: 4,
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
    marginBottom: 8,
  },
  salaryText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  jobDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 12,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  postedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postedText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  applyButton: {
    backgroundColor: '#4169E1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  applyButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});