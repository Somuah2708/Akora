import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

interface RatingModalProps {
  visible: boolean;
  onClose: () => void;
  requestId: string;
  mentorId: string;
  mentorName: string;
  onRatingSubmitted: () => void;
}

export default function RatingModal({
  visible,
  onClose,
  requestId,
  mentorId,
  mentorName,
  onRatingSubmitted,
}: RatingModalProps) {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitRating = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating before submitting.');
      return;
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Insert rating
      const { error } = await supabase
        .from('mentor_ratings')
        .insert({
          mentor_id: mentorId,
          mentee_id: user.id,
          request_id: requestId,
          rating: rating,
          review: review.trim() || null,
        });

      if (error) throw error;

      Alert.alert(
        'Thank You! 🎉',
        'Your rating has been submitted. This helps other students find great mentors!',
        [{ text: 'Done', onPress: () => {
          onRatingSubmitted();
          onClose();
          resetForm();
        }}]
      );
    } catch (error: any) {
      console.error('Error submitting rating:', error);
      let errorMessage = 'Failed to submit rating. Please try again.';
      
      if (error.message?.includes('Network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.code === 'PGRST301') {
        errorMessage = 'Database error. Please contact support if this persists.';
      } else if (error.code === '23505') {
        errorMessage = 'You have already rated this mentorship session.';
      }
      
      Alert.alert('Error', errorMessage, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Retry', onPress: handleSubmitRating },
      ]);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setRating(0);
    setReview('');
  };

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
            style={styles.starButton}
          >
            <Ionicons
              name={star <= rating ? 'star' : 'star-outline'}
              size={40}
              color={star <= rating ? '#F59E0B' : '#D1D5DB'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const getRatingLabel = () => {
    switch (rating) {
      case 1: return '⭐ Poor';
      case 2: return '⭐⭐ Fair';
      case 3: return '⭐⭐⭐ Good';
      case 4: return '⭐⭐⭐⭐ Very Good';
      case 5: return '⭐⭐⭐⭐⭐ Excellent';
      default: return 'Tap a star to rate';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Rate Your Experience</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            {/* Mentor Name */}
            <Text style={styles.mentorName}>with {mentorName}</Text>

            {/* Star Rating */}
            <View style={styles.ratingSection}>
              <Text style={styles.sectionTitle}>How was your mentorship?</Text>
              {renderStars()}
              <Text style={styles.ratingLabel}>{getRatingLabel()}</Text>
            </View>

            {/* Review */}
            <View style={styles.reviewSection}>
              <Text style={styles.sectionTitle}>
                Share your experience <Text style={styles.optional}>(optional)</Text>
              </Text>
              <TextInput
                style={styles.reviewInput}
                value={review}
                onChangeText={setReview}
                placeholder="What did you learn? How did the mentor help you? Any highlights or suggestions?"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                placeholderTextColor="#9CA3AF"
                maxLength={500}
              />
              <Text style={styles.charCount}>{review.length}/500</Text>
            </View>

            {/* Benefits Info */}
            <View style={styles.benefitsBox}>
              <Ionicons name="information-circle" size={20} color="#4169E1" />
              <Text style={styles.benefitsText}>
                Your honest feedback helps other students find great mentors and helps mentors improve their guidance.
              </Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmitRating}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Rating</Text>
              )}
            </TouchableOpacity>

            {/* Skip Link */}
            <TouchableOpacity onPress={onClose} style={styles.skipButton}>
              <Text style={styles.skipButtonText}>Maybe Later</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
  },
  closeButton: {
    padding: 4,
  },
  mentorName: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  starButton: {
    padding: 4,
  },
  ratingLabel: {
    fontSize: 16,
    color: '#4B5563',
    fontWeight: '500',
  },
  reviewSection: {
    marginBottom: 20,
  },
  optional: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '400',
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#000000',
    minHeight: 120,
    marginTop: 8,
  },
  charCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
  },
  benefitsBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  benefitsText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  submitButton: {
    backgroundColor: '#F59E0B',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  submitButtonDisabled: {
    backgroundColor: '#FCD34D',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    padding: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#6B7280',
    fontSize: 15,
  },
});
