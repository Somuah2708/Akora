import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Share, Alert, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Briefcase, MapPin, Building2, Wallet, Clock, Calendar, Share2, Bookmark, Edit, CheckCircle, Users, TrendingUp, ExternalLink, Mail } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');

type TabType = 'overview' | 'requirements' | 'company';

export default function JobDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isSaved, setIsSaved] = useState(false);
  
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
      incrementViewCount();
    }
  }, [id]);

  const incrementViewCount = async () => {
    try {
      await supabase.rpc('increment_job_view_count', { job_id: id });
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }
  };

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
        // Parse new structured fields or fall back to legacy description parsing
        let company = data.company_name;
        let location = data.location;
        let description = data.description;
        let contactEmail = data.creator_email || '';
        
        // Fallback to legacy parsing if new fields are empty
        if (!company || !location) {
          const parts = (data.description || '').split('|');
          company = company || parts[0]?.trim() || 'Company';
          location = location || parts[1]?.trim() || 'Location';
          if (!data.company_name && !data.location) {
            description = parts.slice(2).join('|').trim();
          }
          
          // Extract email from legacy format
          const emailMatch = description.match(/Email:\s*([^\s|]+)/);
          if (emailMatch) {
            contactEmail = contactEmail || emailMatch[1].trim();
            description = description.replace(/\s*\|\s*Email:[^|]*/, '').trim();
          }
        }

        // Parse requirements, responsibilities, benefits
        let requirements: string[] = [];
        let responsibilities: string[] = [];
        let benefits: string[] = [];
        
        try {
          if (data.requirements) {
            requirements = JSON.parse(data.requirements);
          }
          if (data.responsibilities) {
            responsibilities = JSON.parse(data.responsibilities);
          }
          if (data.benefits) {
            benefits = JSON.parse(data.benefits);
          }
        } catch (e) {
          console.error('Error parsing JSON fields:', e);
        }

        // Parse images
        let images: string[] = [];
        if (data.image_url) {
          if (typeof data.image_url === 'string' && data.image_url.startsWith('[')) {
            try {
              images = JSON.parse(data.image_url);
            } catch (e) {
              images = [data.image_url];
            }
          } else {
            images = [data.image_url];
          }
        }

        // Calculate time ago
        const postedDate = new Date(data.created_at);
        const now = new Date();
        const diffDays = Math.ceil((now.getTime() - postedDate.getTime()) / (1000 * 60 * 60 * 24));
        let timeAgo = 'Today';
        if (diffDays === 1) timeAgo = 'Yesterday';
        else if (diffDays < 7) timeAgo = `${diffDays} days ago`;
        else if (diffDays < 30) timeAgo = `${Math.floor(diffDays / 7)} weeks ago`;
        else timeAgo = `${Math.floor(diffDays / 30)} months ago`;

        // Calculate deadline
        let deadlineText = 'No deadline';
        if (data.application_deadline) {
          const deadline = new Date(data.application_deadline);
          const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (daysLeft > 0) {
            deadlineText = `${daysLeft} days left`;
          } else {
            deadlineText = 'Expired';
          }
        }

        setJob({
          ...data,
          company,
          location,
          description,
          contactEmail,
          requirements,
          responsibilities,
          benefits,
          images,
          timeAgo,
          deadlineText,
          isOwner: user && user.id === data.user_id,
        });
      }
    } catch (error) {
      console.error('Error fetching job details:', error);
      Alert.alert('Error', 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this job opportunity: ${job.title} at ${job.company}\n\nLocation: ${job.location}\n\nView on Akora App`,
        title: job.title,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
    // TODO: Implement save to database
    Alert.alert(isSaved ? 'Removed from saved jobs' : 'Saved!', isSaved ? '' : 'You can find this job in your saved jobs.');
  };

  const handleApply = () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to apply for this job.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => router.push('/auth/sign-in') },
      ]);
      return;
    }
    
    router.push(`/job-application/${id}` as any);
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
        <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const experienceLevelMap: { [key: string]: string } = {
    student: 'Student/Entry',
    entry: 'Entry Level',
    mid: 'Mid Level',
    senior: 'Senior',
    executive: 'Executive',
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#4169E1', '#6B8FFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
              <Share2 size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
              <Bookmark size={22} color="#FFFFFF" fill={isSaved ? '#FFFFFF' : 'transparent'} />
            </TouchableOpacity>
            {job.isOwner && (
              <TouchableOpacity 
                onPress={() => router.push(`/edit-job-listing/${job.id}` as any)} 
                style={styles.headerButton}
              >
                <Edit size={22} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Company Logo */}
        {job.company_logo && (
          <View style={styles.logoContainer}>
            <Image source={{ uri: job.company_logo }} style={styles.logo} contentFit="contain" />
          </View>
        )}

        {/* Job Title & Company */}
        <View style={styles.titleSection}>
          <Text style={styles.jobTitle}>{job.title}</Text>
          <View style={styles.companyRow}>
            <Building2 size={18} color="#666666" />
            <Text style={styles.companyText}>{job.company}</Text>
          </View>
          <View style={styles.locationRow}>
            <MapPin size={16} color="#999999" />
            <Text style={styles.locationText}>{job.location}</Text>
            <Text style={styles.dot}>•</Text>
            <Clock size={16} color="#999999" />
            <Text style={styles.timeText}>{job.timeAgo}</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Users size={16} color="#4169E1" />
            <Text style={styles.statText}>{job.application_count || 0} applicants</Text>
          </View>
          <View style={styles.statItem}>
            <TrendingUp size={16} color="#10B981" />
            <Text style={styles.statText}>{job.view_count || 0} views</Text>
          </View>
          {job.openings_count > 1 && (
            <View style={styles.statItem}>
              <Briefcase size={16} color="#F59E0B" />
              <Text style={styles.statText}>{job.openings_count} openings</Text>
            </View>
          )}
        </View>

        {/* Key Info Cards */}
        <View style={styles.infoCards}>
          {(job.salary_min || job.salary_max) && (
            <View style={styles.infoCard}>
              <View style={styles.infoCardIcon}>
                <Wallet size={20} color="#10B981" />
              </View>
              <View style={styles.infoCardContent}>
                <Text style={styles.infoCardLabel}>Salary</Text>
                <Text style={styles.infoCardValue}>
                  {job.currency === 'GHS' ? '₵' : '$'}
                  {job.salary_min && job.salary_max 
                    ? `${job.salary_min} - ${job.salary_max}`
                    : job.salary_max || job.salary_min}
                  /month
                </Text>
              </View>
            </View>
          )}

          {job.experience_level && (
            <View style={styles.infoCard}>
              <View style={styles.infoCardIcon}>
                <TrendingUp size={20} color="#8B5CF6" />
              </View>
              <View style={styles.infoCardContent}>
                <Text style={styles.infoCardLabel}>Experience</Text>
                <Text style={styles.infoCardValue}>
                  {experienceLevelMap[job.experience_level] || job.experience_level}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.infoCard}>
            <View style={styles.infoCardIcon}>
              <Calendar size={20} color={job.deadlineText === 'Expired' ? '#EF4444' : '#F59E0B'} />
            </View>
            <View style={styles.infoCardContent}>
              <Text style={styles.infoCardLabel}>Deadline</Text>
              <Text style={[
                styles.infoCardValue,
                job.deadlineText === 'Expired' && styles.infoCardValueExpired
              ]}>
                {job.deadlineText}
              </Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
            onPress={() => setActiveTab('overview')}
          >
            <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
              Overview
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'requirements' && styles.tabActive]}
            onPress={() => setActiveTab('requirements')}
          >
            <Text style={[styles.tabText, activeTab === 'requirements' && styles.tabTextActive]}>
              Requirements
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'company' && styles.tabActive]}
            onPress={() => setActiveTab('company')}
          >
            <Text style={[styles.tabText, activeTab === 'company' && styles.tabTextActive]}>
              Company
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'overview' && (
            <View>
              <Text style={styles.sectionTitle}>Job Description</Text>
              <Text style={styles.description}>{job.description}</Text>

              {job.responsibilities && job.responsibilities.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Responsibilities</Text>
                  {job.responsibilities.map((resp: string, index: number) => (
                    <View key={index} style={styles.listItem}>
                      <CheckCircle size={16} color="#10B981" />
                      <Text style={styles.listItemText}>{resp}</Text>
                    </View>
                  ))}
                </>
              )}

              {job.benefits && job.benefits.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Benefits & Perks</Text>
                  {job.benefits.map((benefit: string, index: number) => (
                    <View key={index} style={styles.listItem}>
                      <CheckCircle size={16} color="#4169E1" />
                      <Text style={styles.listItemText}>{benefit}</Text>
                    </View>
                  ))}
                </>
              )}
            </View>
          )}

          {activeTab === 'requirements' && (
            <View>
              {job.requirements && job.requirements.length > 0 ? (
                <>
                  <Text style={styles.sectionTitle}>Qualifications</Text>
                  {job.requirements.map((req: string, index: number) => (
                    <View key={index} style={styles.listItem}>
                      <CheckCircle size={16} color="#F59E0B" />
                      <Text style={styles.listItemText}>{req}</Text>
                    </View>
                  ))}
                </>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No specific requirements listed</Text>
                </View>
              )}
            </View>
          )}

          {activeTab === 'company' && (
            <View>
              <Text style={styles.sectionTitle}>About {job.company}</Text>
              <Text style={styles.description}>
                {job.company} is hiring for this position. Contact them directly for more information about the company and role.
              </Text>

              {job.contactEmail && (
                <View style={styles.contactCard}>
                  <Mail size={20} color="#4169E1" />
                  <View style={styles.contactCardContent}>
                    <Text style={styles.contactLabel}>Contact Email</Text>
                    <Text style={styles.contactValue}>{job.contactEmail}</Text>
                  </View>
                </View>
              )}

              {job.external_url && (
                <TouchableOpacity 
                  style={styles.externalButton}
                  onPress={() => {/* Open URL */}}
                >
                  <ExternalLink size={20} color="#4169E1" />
                  <Text style={styles.externalButtonText}>View Company Website</Text>
                </TouchableOpacity>
              )}

              {job.images && job.images.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Office & Team</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageGallery}>
                    {job.images.map((uri: string, index: number) => (
                      <Image 
                        key={index}
                        source={{ uri }} 
                        style={styles.galleryImage} 
                        contentFit="cover"
                      />
                    ))}
                  </ScrollView>
                </>
              )}
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Apply Button (Fixed at Bottom) */}
      {!job.isOwner && (
        <View style={styles.applyContainer}>
          <TouchableOpacity 
            style={styles.applyButton}
            onPress={handleApply}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#4169E1', '#6B8FFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.applyButtonGradient}
            >
              <Text style={styles.applyButtonText}>Apply Now</Text>
              <ArrowLeft size={20} color="#FFFFFF" style={{ transform: [{ rotate: '180deg' }] }} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
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
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  content: {
    flex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: -30,
    borderRadius: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 16,
  },
  titleSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  jobTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#000000',
    marginBottom: 12,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  companyText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#999999',
  },
  dot: {
    fontSize: 14,
    color: '#999999',
  },
  timeText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#999999',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  infoCards: {
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCardContent: {
    flex: 1,
  },
  infoCardLabel: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#999999',
    marginBottom: 4,
  },
  infoCardValue: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#000000',
  },
  infoCardValueExpired: {
    color: '#EF4444',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#4169E1',
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  tabContent: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#000000',
    marginBottom: 16,
    marginTop: 8,
  },
  description: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    lineHeight: 24,
    marginBottom: 24,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  listItemText: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    lineHeight: 22,
  },
  contactCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  contactCardContent: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#999999',
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  externalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#4169E1',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 24,
  },
  externalButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  imageGallery: {
    marginBottom: 24,
  },
  galleryImage: {
    width: 250,
    height: 180,
    borderRadius: 16,
    marginRight: 12,
    backgroundColor: '#F8F9FA',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#999999',
    textAlign: 'center',
  },
  applyContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  applyButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  applyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
  },
  applyButtonText: {
    fontSize: 17,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  errorText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
    marginBottom: 20,
  },
  errorButton: {
    backgroundColor: '#4169E1',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  errorButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});
