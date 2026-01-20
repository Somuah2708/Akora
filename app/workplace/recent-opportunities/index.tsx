import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState, useCallback } from 'react';
import { SplashScreen, useRouter, useFocusEffect } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, MapPin, Wallet, Clock, Calendar, Briefcase } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

SplashScreen.preventAutoHideAsync();

export default function RecentOpportunitiesScreen() {
  const router = useRouter();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useFocusEffect(
    useCallback(() => {
      fetchRecentJobs();
    }, [])
  );

  const fetchRecentJobs = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('✅ Fetched recent jobs:', data?.length || 0);
      setJobs(data || []);
    } catch (error) {
      console.error('❌ Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.push('/workplace')} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.title}>Recent Opportunities</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0F172A" />
            <Text style={styles.loadingText}>Loading opportunities...</Text>
          </View>
        ) : jobs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Briefcase size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>No opportunities found</Text>
            <Text style={styles.emptySubtext}>Check back later for new postings</Text>
          </View>
        ) : (
          <View style={styles.jobsList}>
            {jobs.map((job) => {
              const parts = (job.description || '').split('|');
              const company = parts[0]?.trim() || 'Company';
              const location = parts[1]?.trim() || 'Location';
              
              let imageUri = job.image_url;
              if (imageUri && imageUri.startsWith('[')) {
                try {
                  const parsed = JSON.parse(imageUri);
                  imageUri = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : imageUri;
                } catch (e) {}
              }
              
              const postedDate = new Date(job.created_at);
              const today = new Date();
              const diffDays = Math.ceil((today.getTime() - postedDate.getTime()) / (1000 * 60 * 60 * 24));
              const postedAgo = diffDays === 0 ? 'Today' : diffDays === 1 ? 'Yesterday' : `${diffDays} days ago`;
              
              const deadline = new Date(job.created_at);
              deadline.setDate(deadline.getDate() + 30);
              const daysLeft = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              const deadlineText = daysLeft > 0 ? `${daysLeft} days left` : 'Expired';

              return (
                <TouchableOpacity 
                  key={job.id} 
                  style={styles.jobCard}
                  onPress={() => debouncedRouter.push(`/job-detail/${job.id}`)}
                >
                  <Image 
                    source={{ uri: imageUri || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800' }} 
                    style={styles.jobImage} 
                  />
                  <View style={styles.jobInfo}>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryText}>{job.category_name}</Text>
                    </View>
                    <Text style={styles.jobTitle}>{job.title}</Text>
                    <Text style={styles.companyName}>{company}</Text>
                    <View style={styles.jobDetails}>
                      <View style={styles.detailItem}>
                        <MapPin size={14} color="#666666" />
                        <Text style={styles.detailText}>{location}</Text>
                      </View>
                      {job.price && (
                        <View style={styles.detailItem}>
                          <Wallet size={14} color="#666666" />
                          <Text style={styles.detailText}>₵{job.price}/month</Text>
                        </View>
                      )}
                      <View style={styles.detailItem}>
                        <Clock size={14} color="#666666" />
                        <Text style={styles.detailText}>{postedAgo}</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Calendar size={14} color={daysLeft < 7 ? "#EF4444" : "#10B981"} />
                        <Text style={[styles.detailText, daysLeft < 7 && styles.urgentText]}>{deadlineText}</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
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
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginTop: 8,
  },
  jobsList: {
    padding: 16,
    gap: 16,
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
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
  jobImage: {
    width: '100%',
    height: 150,
  },
  jobInfo: {
    padding: 16,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EBF0FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  jobTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 4,
  },
  companyName: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 12,
  },
  jobDetails: {
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  urgentText: {
    color: '#EF4444',
    fontFamily: 'Inter-SemiBold',
  },
});
