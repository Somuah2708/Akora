import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, TextInput, Alert, Linking } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Building2, GraduationCap, Clock, MapPin, Linkedin, Globe, Send } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

export default function MentorDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user, profile } = useAuth();
  
  const [mentor, setMentor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showRequestForm, setShowRequestForm] = useState(false);
  
  // Request form fields
  const [menteeName, setMenteeName] = useState(profile?.full_name || '');
  const [menteeEmail, setMenteeEmail] = useState(user?.email || '');
  const [menteePhone, setMenteePhone] = useState('');
  const [currentStatus, setCurrentStatus] = useState('');
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMentorDetails();
  }, [id]);

  const fetchMentorDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('alumni_mentors')
        .select('*')
        .eq('id', id)
        .eq('status', 'approved')
        .single();

      if (error) throw error;
      setMentor(data);
    } catch (error: any) {
      console.error('Error fetching mentor:', error);
      Alert.alert('Error', 'Failed to load mentor details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const toggleAreaSelection = (area: string) => {
    if (selectedAreas.includes(area)) {
      setSelectedAreas(selectedAreas.filter(a => a !== area));
    } else {
      setSelectedAreas([...selectedAreas, area]);
    }
  };

  const handleSubmitRequest = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to request mentorship');
      return;
    }

    if (!menteeName.trim() || !menteeEmail.trim() || !message.trim()) {
      Alert.alert('Missing Info', 'Please fill in your name, email, and message');
      return;
    }

    if (selectedAreas.length === 0) {
      Alert.alert('Missing Info', 'Please select at least one area you need help with');
      return;
    }

    try {
      setSubmitting(true);

      // Check for existing pending request
      const { data: existingRequests, error: checkError } = await supabase
        .from('mentor_requests')
        .select('id, status, created_at')
        .eq('mentor_id', mentor.id)
        .eq('mentee_id', user.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingRequests) {
        Alert.alert(
          'Request Already Sent',
          `You already have a pending request to ${mentor.full_name} from ${new Date(existingRequests.created_at).toLocaleDateString()}. Please wait for their response.`,
          [{ text: 'OK' }]
        );
        setSubmitting(false);
        return;
      }

      const request = {
        mentor_id: mentor.id,
        mentee_id: user.id,
        mentee_name: menteeName.trim(),
        mentee_email: menteeEmail.trim(),
        mentee_phone: menteePhone.trim() || null,
        current_status: currentStatus.trim() || null,
        areas_of_interest: selectedAreas,
        message: message.trim(),
        status: 'pending',
      };

      const { data: insertedRequest, error } = await supabase
        .from('mentor_requests')
        .insert([request])
        .select()
        .single();

      if (error) throw error;

      // Send notification to mentor
      if (mentor.user_id) {
        await supabase.from('app_notifications').insert({
          user_id: mentor.user_id,
          title: '🎓 New Mentorship Request',
          body: `${menteeName} has requested mentorship in ${selectedAreas.slice(0, 2).join(', ')}${selectedAreas.length > 2 ? '...' : ''}`,
        });
      }

      Alert.alert(
        'Request Sent! 🎉',
        `Your mentorship request has been sent to ${mentor.full_name}. They will review it and get back to you soon.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setShowRequestForm(false);
              // Reset form
              setCurrentStatus('');
              setSelectedAreas([]);
              setMessage('');
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error submitting request:', error);
      Alert.alert('Error', error.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#000000" />
          </TouchableOpacity>
        </View>
        <Text style={styles.loadingText}>Loading mentor details...</Text>
      </View>
    );
  }

  if (!mentor) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mentor Profile</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <Image 
            source={{ uri: mentor.profile_photo_url || 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=400' }}
            style={styles.avatar}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{mentor.full_name}</Text>
            <Text style={styles.title}>{mentor.current_title}</Text>
            {mentor.company && (
              <View style={styles.companyRow}>
                <Building2 size={14} color="#666666" />
                <Text style={styles.company}>{mentor.company}</Text>
              </View>
            )}
            {mentor.graduation_year && (
              <View style={styles.alumniRow}>
                <GraduationCap size={14} color="#4169E1" />
                <Text style={styles.alumniText}>Class of {mentor.graduation_year} • {mentor.degree}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Clock size={20} color="#10B981" />
            <Text style={styles.statValue}>{mentor.available_hours || 'Flexible'}</Text>
            <Text style={styles.statLabel}>Availability</Text>
          </View>
          <View style={styles.statCard}>
            <GraduationCap size={20} color="#F59E0B" />
            <Text style={styles.statValue}>{mentor.years_of_experience || 'N/A'}+ yrs</Text>
            <Text style={styles.statLabel}>Experience</Text>
          </View>
        </View>

        {/* Bio */}
        {mentor.short_bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bio}>{mentor.short_bio}</Text>
          </View>
        )}

        {mentor.detailed_bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Background</Text>
            <Text style={styles.description}>{mentor.detailed_bio}</Text>
          </View>
        )}

        {/* Expertise Areas */}
        {mentor.expertise_areas && mentor.expertise_areas.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Areas of Expertise</Text>
            <View style={styles.chipContainer}>
              {mentor.expertise_areas.map((area: string, idx: number) => (
                <View key={idx} style={styles.expertiseChip}>
                  <Text style={styles.expertiseChipText}>{area}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Meeting Formats */}
        {mentor.meeting_formats && mentor.meeting_formats.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Meeting Formats</Text>
            <View style={styles.formatContainer}>
              {mentor.meeting_formats.map((format: string, idx: number) => (
                <View key={idx} style={styles.formatItem}>
                  <Text style={styles.formatEmoji}>
                    {format === 'Video Call' ? '📹' : format === 'In-Person' ? '🤝' : format === 'Phone' ? '📞' : '📧'}
                  </Text>
                  <Text style={styles.formatText}>{format}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Preferred Days */}
        {mentor.preferred_days && mentor.preferred_days.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferred Schedule</Text>
            <View style={styles.chipContainer}>
              {mentor.preferred_days.map((day: string, idx: number) => (
                <View key={idx} style={styles.dayChip}>
                  <Text style={styles.dayChipText}>{day}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Mentorship Philosophy */}
        {mentor.mentorship_philosophy && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Why I Mentor</Text>
            <View style={styles.philosophyCard}>
              <Text style={styles.philosophyText}>"{mentor.mentorship_philosophy}"</Text>
            </View>
          </View>
        )}

        {/* Social Links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connect</Text>
          <View style={styles.socialContainer}>
            {mentor.linkedin_url && (
              <TouchableOpacity 
                style={styles.socialButton}
                onPress={() => Linking.openURL(mentor.linkedin_url)}
              >
                <Linkedin size={20} color="#0A66C2" />
                <Text style={styles.socialButtonText}>LinkedIn</Text>
              </TouchableOpacity>
            )}
            {mentor.website_url && (
              <TouchableOpacity 
                style={styles.socialButton}
                onPress={() => Linking.openURL(mentor.website_url)}
              >
                <Globe size={20} color="#4169E1" />
                <Text style={styles.socialButtonText}>Website</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Request Mentorship Section */}
        {!showRequestForm ? (
          <View style={styles.section}>
            <TouchableOpacity 
              style={styles.requestButton}
              onPress={() => setShowRequestForm(true)}
            >
              <Send size={20} color="#FFFFFF" />
              <Text style={styles.requestButtonText}>Request Mentorship (Free)</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Request Mentorship</Text>
            
            <Text style={styles.formLabel}>Your Name *</Text>
            <TextInput
              style={styles.formInput}
              value={menteeName}
              onChangeText={setMenteeName}
              placeholder="Your full name"
              placeholderTextColor="#999999"
            />

            <Text style={styles.formLabel}>Your Email *</Text>
            <TextInput
              style={styles.formInput}
              value={menteeEmail}
              onChangeText={setMenteeEmail}
              placeholder="your.email@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#999999"
            />

            <Text style={styles.formLabel}>Phone Number (Optional)</Text>
            <TextInput
              style={styles.formInput}
              value={menteePhone}
              onChangeText={setMenteePhone}
              placeholder="+233 XX XXX XXXX"
              keyboardType="phone-pad"
              placeholderTextColor="#999999"
            />

            <Text style={styles.formLabel}>Current Status</Text>
            <TextInput
              style={styles.formInput}
              value={currentStatus}
              onChangeText={setCurrentStatus}
              placeholder="e.g., Student, Young Professional, Career Changer"
              placeholderTextColor="#999999"
            />

            <Text style={styles.formLabel}>What do you need help with? *</Text>
            <View style={styles.chipContainer}>
              {mentor.expertise_areas?.map((area: string, idx: number) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.selectableChip,
                    selectedAreas.includes(area) && styles.selectableChipSelected,
                  ]}
                  onPress={() => toggleAreaSelection(area)}
                >
                  <Text
                    style={[
                      styles.selectableChipText,
                      selectedAreas.includes(area) && styles.selectableChipTextSelected,
                    ]}
                  >
                    {area}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.formLabel}>Your Message *</Text>
            <TextInput
              style={[styles.formInput, styles.textArea]}
              value={message}
              onChangeText={setMessage}
              placeholder="Tell the mentor about yourself, your goals, and why you'd like their guidance..."
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              placeholderTextColor="#999999"
            />

            <View style={styles.formActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowRequestForm(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleSubmitRequest}
                disabled={submitting}
              >
                <Text style={styles.submitButtonText}>
                  {submitting ? 'Sending...' : 'Send Request'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
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
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 15,
    color: '#666666',
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  profileInfo: {
    alignItems: 'center',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
  },
  title: {
    fontSize: 15,
    color: '#666666',
    marginTop: 4,
    textAlign: 'center',
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  company: {
    fontSize: 14,
    color: '#666666',
  },
  alumniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  alumniText: {
    fontSize: 13,
    color: '#4169E1',
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  bio: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    fontWeight: '500',
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 21,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  expertiseChip: {
    backgroundColor: '#EAF2FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D6E1FF',
  },
  expertiseChipText: {
    fontSize: 13,
    color: '#4169E1',
    fontWeight: '600',
  },
  formatContainer: {
    gap: 12,
  },
  formatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  formatEmoji: {
    fontSize: 20,
  },
  formatText: {
    fontSize: 15,
    color: '#374151',
  },
  dayChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  dayChipText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  philosophyCard: {
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  philosophyText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 21,
    fontStyle: 'italic',
  },
  socialContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F9FAFB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  requestButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
  },
  formInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#000000',
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  selectableChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectableChipSelected: {
    backgroundColor: '#4169E1',
    borderColor: '#4169E1',
  },
  selectableChipText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  selectableChipTextSelected: {
    color: '#FFFFFF',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
