import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter, useLocalSearchParams } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, Briefcase, MapPin, Building2, Wallet, Clock, Mail, Phone, Calendar, Edit } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { LinearGradient } from 'expo-linear-gradient';

SplashScreen.preventAutoHideAsync();

export default function JobDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
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
    if (id) {
      fetchJobDetails();
    }
  }, [id]);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products_services')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        // Parse description: "Company | Location | Description | Email: email"
        const parts = (data.description || '').split(' | ');
        let company = parts[0] || '';
        let location = parts[1] || '';
        let description = parts.slice(2).join(' | ');
        
        // Extract email and phone if present
        let contactEmail = '';
        let contactPhone = '';
        
        const emailMatch = description.match(/Email:\s*([^\s|]+)/);
        if (emailMatch) {
          contactEmail = emailMatch[1].trim();
          description = description.replace(/\s*\|\s*Email:[^|]*/, '').trim();
        }
        
        const phoneMatch = description.match(/Phone:\s*([^\s|]+)/);
        if (phoneMatch) {
          contactPhone = phoneMatch[1].trim();
          description = description.replace(/\s*\|\s*Phone:[^|]*/, '').trim();
        }

        // Parse image URL
        let imageUrl = data.image_url;
        if (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith('[')) {
          try {
            const parsed = JSON.parse(imageUrl);
            imageUrl = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : imageUrl;
          } catch (e) {}
        }

        // Calculate days since posted
        const postedDate = new Date(data.created_at);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - postedDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        let postedAgo = '';
        if (diffDays === 0) postedAgo = 'Today';
        else if (diffDays === 1) postedAgo = 'Yesterday';
        else if (diffDays < 7) postedAgo = `${diffDays} days ago`;
        else if (diffDays < 30) postedAgo = `${Math.floor(diffDays / 7)} weeks ago`;
        else postedAgo = `${Math.floor(diffDays / 30)} months ago`;

        // Calculate application deadline (30 days from posting)
        const deadline = new Date(data.created_at);
        deadline.setDate(deadline.getDate() + 30);
        const daysUntilDeadline = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        setJob({
          ...data,
          company,
          location,
          description,
          contactEmail,
          contactPhone,
          image_url: imageUrl,
          postedAgo,
          deadline: deadline.toLocaleDateString(),
          daysUntilDeadline,
          isOwner: user && user.id === data.user_id,
        });
      }
    } catch (error) {
      console.error('Error fetching job details:', error);
      alert('Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  if (!fontsLoaded || loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#4169E1" />
        <Text style={styles.loadingText}>Loading job details...</Text>
      </View>
    );
  }

  if (!job) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Job not found</Text>
        <TouchableOpacity style={styles.backButtonAlt} onPress={() => debouncedRouter.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.push('/workplace/recent-opportunities')} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Details</Text>
        {job.isOwner && (
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => debouncedRouter.push(`/edit-job-listing/${job.id}`)}
          >
            <Edit size={20} color="#4169E1" />
          </TouchableOpacity>
        )}
        {!job.isOwner && <View style={{ width: 40 }} />}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Company Logo */}
        {job.image_url && (
          <View style={styles.logoContainer}>
            <Image source={{ uri: job.image_url }} style={styles.companyLogo} />
          </View>
        )}

        {/* Job Title & Company */}
        <View style={styles.titleSection}>
          <Text style={styles.jobTitle}>{job.title}</Text>
          <View style={styles.companyRow}>
            <Building2 size={18} color="#666666" />
            <Text style={styles.companyName}>{job.company}</Text>
          </View>
        </View>

        {/* Job Info Cards */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <MapPin size={20} color="#4169E1" />
            <Text style={styles.infoLabel}>Location</Text>
            <Text style={styles.infoValue}>{job.location}</Text>
          </View>

          <View style={styles.infoCard}>
            <Briefcase size={20} color="#4169E1" />
            <Text style={styles.infoLabel}>Job Type</Text>
            <Text style={styles.infoValue}>{job.category_name}</Text>
          </View>

          {job.price && (
            <View style={styles.infoCard}>
              <Wallet size={20} color="#4169E1" />
              <Text style={styles.infoLabel}>Salary</Text>
              <Text style={styles.infoValue}>₵{job.price}/month</Text>
            </View>
          )}

          <View style={styles.infoCard}>
            <Clock size={20} color="#4169E1" />
            <Text style={styles.infoLabel}>Posted</Text>
            <Text style={styles.infoValue}>{job.postedAgo}</Text>
          </View>
        </View>

        {/* Application Deadline */}
        <View style={[styles.deadlineCard, job.daysUntilDeadline < 7 && styles.deadlineCardUrgent]}>
          <Calendar size={20} color={job.daysUntilDeadline < 7 ? "#EF4444" : "#10B981"} />
          <View style={styles.deadlineInfo}>
            <Text style={styles.deadlineLabel}>Application Deadline</Text>
            <Text style={[styles.deadlineValue, job.daysUntilDeadline < 7 && styles.deadlineValueUrgent]}>
              {job.deadline} ({job.daysUntilDeadline} days left)
            </Text>
          </View>
        </View>

        {/* Job Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Job Description</Text>
          <Text style={styles.descriptionText}>{job.description}</Text>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          
          {job.contactEmail && (
            <View style={styles.contactRow}>
              <Mail size={18} color="#4169E1" />
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Email</Text>
                <Text style={styles.contactValue}>{job.contactEmail}</Text>
              </View>
            </View>
          )}

          {job.contactPhone && (
            <View style={styles.contactRow}>
              <Phone size={18} color="#4169E1" />
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Phone</Text>
                <Text style={styles.contactValue}>{job.contactPhone}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Apply Button */}
        {!job.isOwner && job.daysUntilDeadline > 0 && (
          <TouchableOpacity 
            style={styles.applyButton}
            onPress={() => debouncedRouter.push(`/job-application/${job.id}`)}
          >
            <LinearGradient
              colors={['#4169E1', '#3B5DCB']}
              style={styles.applyButtonGradient}
            >
              <Text style={styles.applyButtonText}>Apply Now</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {job.daysUntilDeadline <= 0 && (
          <View style={styles.closedBanner}>
            <Text style={styles.closedBannerText}>Applications Closed</Text>
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginTop: 12,
  },
  errorText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
    marginBottom: 16,
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
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  editButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
  },
  companyLogo: {
    width: 100,
    height: 100,
    borderRadius: 16,
  },
  titleSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  jobTitle: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#000000',
    marginBottom: 12,
    textAlign: 'center',
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  companyName: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  infoCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  infoValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    textAlign: 'center',
  },
  deadlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
    gap: 12,
  },
  deadlineCardUrgent: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
  },
  deadlineInfo: {
    flex: 1,
  },
  deadlineLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 4,
  },
  deadlineValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
  },
  deadlineValueUrgent: {
    color: '#EF4444',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 16,
  },
  descriptionText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    lineHeight: 24,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  contactInfo: {
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
    color: '#4169E1',
  },
  applyButton: {
    marginHorizontal: 16,
    marginBottom: 32,
    borderRadius: 12,
    overflow: 'hidden',
  },
  applyButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  closedBanner: {
    backgroundColor: '#FEE2E2',
    marginHorizontal: 16,
    marginBottom: 32,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  closedBannerText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
  },
  backButtonAlt: {
    backgroundColor: '#4169E1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});
