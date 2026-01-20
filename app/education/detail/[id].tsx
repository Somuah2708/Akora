import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Linking, Alert } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter, useLocalSearchParams } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, MapPin, Globe, Mail, Phone, Award, Calendar, Wallet, BookOpen, Share2, Star, ExternalLink, Users, Briefcase, GraduationCap } from 'lucide-react-native';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';

SplashScreen.preventAutoHideAsync();

export default function EducationDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [opportunity, setOpportunity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [alumniMentors, setAlumniMentors] = useState<any[]>([]);
  const [loadingMentors, setLoadingMentors] = useState(false);

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    fetchOpportunityDetails();
    if (user) {
      checkBookmarkStatus();
    }
  }, [id, user]);

  const fetchOpportunityDetails = async () => {
    try {
      setLoading(true);
      
      // Try scholarships table first
      const { data: scholarshipData, error: scholarshipError } = await supabase
        .from('scholarships')
        .select('*')
        .eq('id', id)
        .single();

      if (!scholarshipError && scholarshipData) {
        setOpportunity({ ...scholarshipData, category_name: 'Scholarships' });
        setLoading(false);
        return;
      }
      
      // Try universities table
      const { data: universityData, error: universityError } = await supabase
        .from('universities')
        .select('*')
        .eq('id', id)
        .single();

      if (!universityError && universityData) {
        setOpportunity({ ...universityData, category_name: 'Universities' });
        fetchAlumniMentors(universityData.title || universityData.name);
        setLoading(false);
        return;
      }
      
      // Try events table
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (!eventError && eventData) {
        setOpportunity({ ...eventData, category_name: 'Events' });
        setLoading(false);
        return;
      }
      
      // Fall back to products_services for marketplace items
      const { data, error } = await supabase
        .from('products_services')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setOpportunity(data);
    } catch (error) {
      console.error('Error fetching opportunity details:', error);
      Alert.alert('Error', 'Failed to load details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAlumniMentors = async (universityName: string) => {
    try {
      setLoadingMentors(true);
      
      // Fetch mentors who currently work at this university (staff/faculty)
      const { data, error } = await supabase
        .from('alumni_mentors')
        .select('*')
        .eq('status', 'approved')
        .ilike('university', `%${universityName}%`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching university staff mentors:', error);
        return;
      }

      console.log('🏫 Fetched staff mentors at university:', universityName, '→', data?.length, 'mentors');
      setAlumniMentors(data || []);
    } catch (error) {
      console.error('Error fetching university staff mentors:', error);
    } finally {
      setLoadingMentors(false);
    }
  };

  const checkBookmarkStatus = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('education_bookmarks')
        .select('id')
        .eq('user_id', user.id)
        .eq('opportunity_id', id)
        .single();

      setIsBookmarked(!!data);
    } catch (error) {
      // Not bookmarked
      setIsBookmarked(false);
    }
  };

  const toggleBookmark = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please sign in to bookmark this opportunity.');
      return;
    }

    try {
      if (isBookmarked) {
        await supabase
          .from('education_bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('opportunity_id', id);
        setIsBookmarked(false);
        Alert.alert('Removed', 'Removed from bookmarks.');
      } else {
        await supabase
          .from('education_bookmarks')
          .insert({ user_id: user.id, opportunity_id: id });
        setIsBookmarked(true);
        Alert.alert('Saved', 'Added to bookmarks!');
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      Alert.alert('Error', 'Failed to update bookmark.');
    }
  };

  const handleApplyNow = () => {
    if (opportunity?.application_url) {
      Linking.openURL(opportunity.application_url);
    } else {
      Alert.alert('No Link', 'Application link not available.');
    }
  };

  const handleContactEmail = () => {
    if (opportunity?.contact_email) {
      Linking.openURL(`mailto:${opportunity.contact_email}`);
    } else {
      Alert.alert('No Email', 'Contact email not available.');
    }
  };

  const calculateDaysLeft = (deadlineDate: string) => {
    // Only compute if valid ISO date YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(deadlineDate)) return null;
    const deadline = new Date(deadlineDate);
    if (isNaN(deadline.getTime())) return null;
    const today = new Date();
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (!fontsLoaded || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0F172A" />
        <Text style={styles.loadingText}>Loading details...</Text>
      </View>
    );
  }

  if (!opportunity) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Opportunity not found</Text>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButtonError}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isScholarship = opportunity.category_name === 'Scholarships';
  const isMentor = opportunity.category_name === 'Alumni Mentors';
  const daysLeft = opportunity.deadline_date ? calculateDaysLeft(opportunity.deadline_date) : null;

  // Parse image_url if it's a JSON array
  let imageUri = opportunity.image_url || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800';
  if (imageUri && imageUri.startsWith('[')) {
    try {
      const parsed = JSON.parse(imageUri);
      imageUri = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : imageUri;
    } catch (e) {
      // Keep original if parsing fails
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Details</Text>
        <TouchableOpacity onPress={toggleBookmark} style={styles.bookmarkButton}>
          <Star 
            size={24} 
            color={isBookmarked ? "#ffc857" : "#FFFFFF"} 
            fill={isBookmarked ? "#ffc857" : "none"}
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Main Image */}
        <Image 
          source={{ uri: imageUri }} 
          style={styles.mainImage}
          resizeMode="contain"
        />

        {/* Content */}
        <View style={styles.content}>
          {/* Category Badge */}
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{opportunity.category_name}</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>{opportunity.title}</Text>

          {/* Location (for Universities) */}
          {opportunity.location && (
            <View style={styles.infoRow}>
              <MapPin size={18} color="#ffc857" />
              <Text style={styles.infoText}>{opportunity.location}</Text>
            </View>
          )}

          {/* Address (for Universities) */}
          {opportunity.address && (
            <View style={styles.infoRow}>
              <MapPin size={18} color="#ffc857" />
              <Text style={styles.infoText}>{opportunity.address}</Text>
            </View>
          )}

          {/* Deadline Badge (for Scholarships) */}
          {daysLeft !== null && (
            <View style={[styles.deadlineBadge, daysLeft < 30 && styles.urgentDeadline]}>
              <Calendar size={16} color={daysLeft < 30 ? "#FF6B6B" : "#ffc857"} />
              <Text style={[styles.deadlineText, daysLeft < 30 && styles.urgentText]}>
                {daysLeft > 0 ? `${daysLeft} days left` : 'Deadline passed'}
              </Text>
            </View>
          )}
          {/* Show deadline_text if provided (freeform) or fallback to raw deadline_date */}
          {daysLeft === null && (opportunity.deadline_text || opportunity.deadline_date) && (
            <View style={styles.infoRow}>
              <Calendar size={18} color="#ffc857" />
              <Text style={styles.infoText}>Deadline: {opportunity.deadline_text || opportunity.deadline_date}</Text>
            </View>
          )}

          {/* Funding Amount (for Scholarships) */}
          {isScholarship && (opportunity.amount || opportunity.funding_amount) && (
            <View style={styles.fundingCard}>
              <Wallet size={20} color="#ffc857" />
              <View>
                <Text style={styles.fundingLabel}>Funding Amount</Text>
                <Text style={styles.fundingAmount}>
                  {(opportunity.funding_currency === 'GHS' || opportunity.funding_currency === 'ghc') ? '₵' : '$'}
                  {opportunity.amount || opportunity.funding_amount}
                </Text>
              </View>
            </View>
          )}

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>{opportunity.description}</Text>
          </View>

          {/* Mentor Details */}
          {isMentor && (
            <View style={styles.section}>
              {opportunity.mentor_headline && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoText}>{opportunity.mentor_headline}</Text>
                </View>
              )}
              {(opportunity.mentor_company || opportunity.mentor_role) && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoText}>{[opportunity.mentor_role, opportunity.mentor_company].filter(Boolean).join(' • ')}</Text>
                </View>
              )}
              {(Array.isArray(opportunity.mentor_meeting_formats) && opportunity.mentor_meeting_formats.length>0) && (
                <View style={{flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:8}}>
                  {opportunity.mentor_meeting_formats.map((m:string) => (
                    <View key={m} style={{backgroundColor:'#EAF2FF', paddingHorizontal:10, paddingVertical:6, borderRadius:10, borderWidth:1, borderColor:'#D6E1FF'}}>
                      <Text style={{fontSize:12, color:'#4169E1', fontFamily:'Inter-SemiBold'}}>{m}</Text>
                    </View>
                  ))}
                </View>
              )}
              {(opportunity.mentor_timezone || opportunity.mentor_availability) && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoText}>Availability: {[opportunity.mentor_timezone, opportunity.mentor_availability].filter(Boolean).join(' • ')}</Text>
                </View>
              )}
              {(Array.isArray(opportunity.mentor_expertise) && opportunity.mentor_expertise.length>0) && (
                <View style={{marginTop:8}}>
                  <Text style={styles.sectionTitle}>Expertise</Text>
                  <Text style={styles.description}>{opportunity.mentor_expertise.join(', ')}</Text>
                </View>
              )}
              {(Array.isArray(opportunity.mentor_languages) && opportunity.mentor_languages.length>0) && (
                <View style={{marginTop:12}}>
                  <Text style={styles.sectionTitle}>Languages</Text>
                  <Text style={styles.description}>{opportunity.mentor_languages.join(', ')}</Text>
                </View>
              )}
              {(opportunity.mentor_linkedin_url || opportunity.mentor_website_url) && (
                <View style={{marginTop:12}}>
                  {opportunity.mentor_linkedin_url && (
                    <TouchableOpacity style={styles.contactButton} onPress={() => Linking.openURL(opportunity.mentor_linkedin_url)}>
                      <Globe size={18} color="#4169E1" />
                      <Text style={styles.contactText}>View LinkedIn</Text>
                    </TouchableOpacity>
                  )}
                  {opportunity.mentor_website_url && (
                    <TouchableOpacity style={styles.contactButton} onPress={() => Linking.openURL(opportunity.mentor_website_url)}>
                      <Globe size={18} color="#4169E1" />
                      <Text style={styles.contactText}>Visit Website</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Eligibility Criteria */}
          {(opportunity.eligibility_criteria || opportunity.eligibility) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Eligibility Requirements</Text>
              <View style={styles.eligibilityBox}>
                <BookOpen size={20} color="#ffc857" />
                <Text style={styles.eligibilityText}>{opportunity.eligibility_criteria || opportunity.eligibility}</Text>
              </View>
            </View>
          )}

          {/* Scholarship-Specific Details */}
          {isScholarship && (
            <>
              {/* Source Organization */}
              {opportunity.source_organization && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Organization</Text>
                  <Text style={styles.description}>{opportunity.source_organization}</Text>
                </View>
              )}

              {/* Scholarship Types */}
              {opportunity.scholarship_types && opportunity.scholarship_types.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Scholarship Type</Text>
                  <View style={styles.tagsContainer}>
                    {opportunity.scholarship_types.map((type: string, index: number) => (
                      <View key={index} style={styles.tag}>
                        <Text style={styles.tagText}>{type}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Eligibility Levels */}
              {opportunity.eligibility_levels && opportunity.eligibility_levels.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Eligibility Level</Text>
                  <View style={styles.tagsContainer}>
                    {opportunity.eligibility_levels.map((level: string, index: number) => (
                      <View key={index} style={styles.tag}>
                        <Text style={styles.tagText}>{level}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Fields of Study */}
              {opportunity.fields_of_study && opportunity.fields_of_study.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Fields of Study</Text>
                  <View style={styles.tagsContainer}>
                    {opportunity.fields_of_study.map((field: string, index: number) => (
                      <View key={index} style={styles.tag}>
                        <Text style={styles.tagText}>{field}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Requirements */}
              {opportunity.requirements && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Requirements</Text>
                  <Text style={styles.description}>{opportunity.requirements}</Text>
                </View>
              )}

              {/* Benefits */}
              {opportunity.benefits && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Benefits</Text>
                  <Text style={styles.description}>{opportunity.benefits}</Text>
                </View>
              )}
            </>
          )}

          {/* Contact Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            {opportunity.contact_email && (
              <TouchableOpacity style={styles.contactButton} onPress={() => Linking.openURL(`mailto:${opportunity.contact_email}`)}>
                <Mail size={18} color="#4169E1" />
                <Text style={styles.contactText}>{opportunity.contact_email}</Text>
              </TouchableOpacity>
            )}
            {opportunity.phone && (
              <TouchableOpacity style={styles.contactButton} onPress={() => Linking.openURL(`tel:${opportunity.phone}`)}>
                <Phone size={18} color="#4169E1" />
                <Text style={styles.contactText}>{opportunity.phone}</Text>
              </TouchableOpacity>
            )}
            {opportunity.website_url && (
              <TouchableOpacity style={styles.contactButton} onPress={() => Linking.openURL(opportunity.website_url)}>
                <Globe size={18} color="#4169E1" />
                <Text style={styles.contactText}>Visit Website</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Alumni Mentors Section (for Universities) */}
          {!isMentor && !isScholarship && (
            <View style={styles.section}>
              <View style={styles.alumniHeader}>
                <View style={styles.alumniHeaderLeft}>
                  <Users size={22} color="#4169E1" />
                  <View>
                    <Text style={styles.sectionTitle}>Staff & Faculty Mentors</Text>
                    <Text style={styles.alumniSubtitle}>Connect with current staff and faculty at this university</Text>
                  </View>
                </View>
                {alumniMentors.length > 0 && (
                  <View style={styles.mentorCountBadge}>
                    <Text style={styles.mentorCountText}>{alumniMentors.length}</Text>
                  </View>
                )}
              </View>

              {loadingMentors ? (
                <View style={styles.mentorsLoadingContainer}>
                  <ActivityIndicator size="small" color="#0F172A" />
                  <Text style={styles.mentorsLoadingText}>Loading mentors...</Text>
                </View>
              ) : alumniMentors.length > 0 ? (
                <View style={styles.mentorsContainer}>
                  {alumniMentors.map((mentor) => (
                    <TouchableOpacity
                      key={mentor.id}
                      style={styles.mentorCard}
                      onPress={() => debouncedRouter.push(`/education/mentor/${mentor.id}`)}
                      activeOpacity={0.7}
                    >
                      <Image
                        source={{ 
                          uri: mentor.profile_photo_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(mentor.full_name || 'User') + '&background=4169E1&color=fff&size=200'
                        }}
                        style={styles.mentorAvatar}
                      />
                      <View style={styles.mentorInfo}>
                        <Text style={styles.mentorName} numberOfLines={1}>{mentor.full_name}</Text>
                        <View style={styles.mentorTitleRow}>
                          <Briefcase size={14} color="#666666" />
                          <Text style={styles.mentorTitle} numberOfLines={1}>
                            {mentor.current_title || 'Mentor'}
                          </Text>
                        </View>
                        {mentor.company && (
                          <Text style={styles.mentorCompany} numberOfLines={1}>
                            {mentor.company}
                          </Text>
                        )}
                        {mentor.expertise_areas && mentor.expertise_areas.length > 0 && (
                          <View style={styles.expertisePreview}>
                            <Text style={styles.expertiseTag} numberOfLines={1}>
                              {mentor.expertise_areas.slice(0, 2).join(' • ')}
                            </Text>
                          </View>
                        )}
                      </View>
                      <ExternalLink size={18} color="#4169E1" />
                    </TouchableOpacity>
                  ))}
                  
                  {alumniMentors.length >= 10 && (
                    <TouchableOpacity 
                      style={styles.viewAllMentorsButton}
                      onPress={() => debouncedRouter.push('/education?tab=mentors')}
                    >
                      <Text style={styles.viewAllMentorsText}>View All Mentors</Text>
                      <ExternalLink size={16} color="#4169E1" />
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View style={styles.noMentorsContainer}>
                  <GraduationCap size={40} color="#D1D5DB" />
                  <Text style={styles.noMentorsText}>No staff mentors at this university yet</Text>
                  <Text style={styles.noMentorsSubtext}>Check back soon or explore other mentors</Text>
                  <TouchableOpacity 
                    style={styles.browseMentorsButton}
                    onPress={() => debouncedRouter.push('/education?tab=mentors')}
                  >
                    <Text style={styles.browseMentorsText}>Browse All Mentors</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Apply Now Button */}
          {opportunity.application_url && (
            <TouchableOpacity style={styles.applyButton} onPress={handleApplyNow}>
              <Text style={styles.applyButtonText}>
                {isScholarship ? 'Apply for Scholarship' : 'Apply Now'}
              </Text>
              <ExternalLink size={20} color="#0F172A" />
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
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
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  bookmarkButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  mainImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#F3F4F6',
  },
  content: {
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#8B6914',
  },
  categoryText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#8B6914',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    marginBottom: 12,
    lineHeight: 32,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  deadlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#8B6914',
  },
  urgentDeadline: {
    backgroundColor: '#FFE5E5',
    borderColor: '#FF6B6B',
  },
  deadlineText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#8B6914',
  },
  urgentText: {
    color: '#FF6B6B',
  },
  fundingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF9E6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#8B6914',
  },
  fundingLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  fundingAmount: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#8B6914',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#333333',
    lineHeight: 24,
  },
  eligibilityBox: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#8B6914',
  },
  eligibilityText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#333333',
    lineHeight: 22,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8F9FA',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#8B6914',
  },
  contactText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#8B6914',
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  applyButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
  },
  backButtonError: {
    marginTop: 16,
    backgroundColor: '#0F172A',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  alumniHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  alumniHeaderLeft: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  alumniSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginTop: 2,
  },
  mentorCountBadge: {
    backgroundColor: '#ffc857',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 28,
    alignItems: 'center',
  },
  mentorCountText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
  },
  mentorsLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 24,
  },
  mentorsLoadingText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  mentorsContainer: {
    gap: 12,
  },
  mentorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  mentorAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E5E7EB',
  },
  mentorInfo: {
    flex: 1,
    gap: 4,
  },
  mentorName: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
  },
  mentorTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mentorTitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    flex: 1,
  },
  mentorCompany: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#ffc857',
  },
  expertisePreview: {
    marginTop: 4,
  },
  expertiseTag: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  viewAllMentorsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffc857',
    marginTop: 8,
  },
  viewAllMentorsText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#ffc857',
  },
  noMentorsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    gap: 8,
  },
  noMentorsText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  noMentorsSubtext: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
  },
  browseMentorsButton: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  browseMentorsText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ffc857',
  },
  tagText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#ffc857',
  },
  applicationButton: {
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  applicationButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});
