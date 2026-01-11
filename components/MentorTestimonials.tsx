import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { Quote, Send, X, Star } from 'lucide-react-native';
import { supabase, getDisplayName } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface Testimonial {
  id: string;
  mentee_id: string;
  testimonial: string;
  is_featured: boolean;
  created_at: string;
  mentee_name?: string;
}

interface MentorTestimonialsProps {
  mentorId: string;
  canAddTestimonial?: boolean;
  requestId?: string;
}

export default function MentorTestimonials({
  mentorId,
  canAddTestimonial = false,
  requestId,
}: MentorTestimonialsProps) {
  const { user } = useAuth();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [testimonialText, setTestimonialText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTestimonials();
  }, [mentorId]);

  const fetchTestimonials = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('mentor_testimonials')
        .select(`
          *,
          profiles:mentee_id (
            full_name
          )
        `)
        .eq('mentor_id', mentorId)
        .eq('is_approved', true)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const formattedData = (data || []).map((t: any) => ({
        ...t,
        mentee_name: t.profiles ? getDisplayName(t.profiles) : 'Anonymous',
      }));

      setTestimonials(formattedData);
    } catch (error) {
      console.error('Error fetching testimonials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTestimonial = async () => {
    if (!user || !requestId) {
      Alert.alert('Error', 'You must be logged in to submit a testimonial');
      return;
    }

    if (!testimonialText.trim()) {
      Alert.alert('Missing Info', 'Please write your testimonial');
      return;
    }

    if (testimonialText.trim().length < 20) {
      Alert.alert('Too Short', 'Please write at least 20 characters');
      return;
    }

    try {
      setSubmitting(true);

      const { data, error } = await supabase.rpc('create_testimonial', {
        p_mentor_id: mentorId,
        p_mentee_id: user.id,
        p_request_id: requestId,
        p_testimonial: testimonialText.trim(),
      });

      if (error) throw error;

      Alert.alert(
        'Thank You!',
        'Your testimonial has been submitted and will appear on the mentor\'s profile.',
        [
          {
            text: 'OK',
            onPress: () => {
              setShowAddModal(false);
              setTestimonialText('');
              fetchTestimonials();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error submitting testimonial:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to submit testimonial. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading testimonials...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Quote size={20} color="#10B981" />
        <Text style={styles.title}>
          Testimonials ({testimonials.length})
        </Text>
        {canAddTestimonial && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Send size={16} color="#10B981" />
            <Text style={styles.addButtonText}>Write Review</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Testimonials List */}
      {testimonials.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.testimonialsList}
        >
          {testimonials.map((testimonial) => (
            <View
              key={testimonial.id}
              style={[
                styles.testimonialCard,
                testimonial.is_featured && styles.featuredCard,
              ]}
            >
              {testimonial.is_featured && (
                <View style={styles.featuredBadge}>
                  <Star size={12} color="#F59E0B" fill="#F59E0B" />
                  <Text style={styles.featuredText}>Featured</Text>
                </View>
              )}
              <Quote size={24} color="#D1D5DB" style={styles.quoteIcon} />
              <Text style={styles.testimonialText} numberOfLines={6}>
                {testimonial.testimonial}
              </Text>
              <View style={styles.testimonialFooter}>
                <Text style={styles.menteeName}>{testimonial.mentee_name}</Text>
                <Text style={styles.testimonialDate}>
                  {new Date(testimonial.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <Quote size={48} color="#D1D5DB" />
          <Text style={styles.emptyText}>No testimonials yet</Text>
          {canAddTestimonial && (
            <Text style={styles.emptySubtext}>
              Be the first to share your experience!
            </Text>
          )}
        </View>
      )}

      {/* Add Testimonial Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Write Your Testimonial</Text>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                style={styles.closeButton}
              >
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Share your experience with this mentor to help others
            </Text>

            <TextInput
              style={styles.textArea}
              placeholder="What did you learn? How did this mentor help you? What stood out about their guidance?&#10;&#10;Example: 'Working with [Mentor] was transformative. Their insights on career planning helped me land my dream job. They were patient, encouraging, and always made time for my questions.'"
              placeholderTextColor="#9CA3AF"
              value={testimonialText}
              onChangeText={setTestimonialText}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
              maxLength={500}
            />

            <View style={styles.charCount}>
              <Text style={styles.charCountText}>
                {testimonialText.length}/500 characters
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  submitting && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmitTestimonial}
                disabled={submitting}
              >
                <Text style={styles.submitButtonText}>
                  {submitting ? 'Submitting...' : 'Submit Testimonial'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  addButtonText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
  },
  testimonialsList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  testimonialCard: {
    width: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  featuredCard: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    marginBottom: 12,
  },
  featuredText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#92400E',
  },
  quoteIcon: {
    marginBottom: 8,
  },
  testimonialText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  testimonialFooter: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
  },
  menteeName: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 2,
  },
  testimonialDate: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 16,
  },
  textArea: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    minHeight: 150,
  },
  charCount: {
    alignItems: 'flex-end',
    marginTop: 8,
    marginBottom: 16,
  },
  charCountText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});
