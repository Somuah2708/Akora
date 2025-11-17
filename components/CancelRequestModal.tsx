import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

interface CancelRequestModalProps {
  visible: boolean;
  onClose: () => void;
  requestId: string;
  mentorName: string;
  onCancelled: () => void;
}

interface CancellationCategory {
  value: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const cancellationCategories: CancellationCategory[] = [
  {
    value: 'found_another_mentor',
    label: 'Found another mentor',
    icon: 'people',
  },
  {
    value: 'no_longer_needed',
    label: 'No longer need mentorship',
    icon: 'close-circle',
  },
  {
    value: 'scheduling_conflict',
    label: 'Scheduling conflicts',
    icon: 'calendar',
  },
  {
    value: 'changed_mind',
    label: 'Changed my mind',
    icon: 'return-up-back',
  },
  {
    value: 'no_response',
    label: 'No response from mentor',
    icon: 'time',
  },
  {
    value: 'other',
    label: 'Other reason',
    icon: 'ellipsis-horizontal',
  },
];

export default function CancelRequestModal({
  visible,
  onClose,
  requestId,
  mentorName,
  onCancelled,
}: CancelRequestModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCancel = async () => {
    if (!selectedCategory) {
      Alert.alert('Required', 'Please select a reason for cancellation');
      return;
    }

    if (selectedCategory === 'other' && !reason.trim()) {
      Alert.alert('Required', 'Please provide a reason for cancellation');
      return;
    }

    Alert.alert(
      'Confirm Cancellation',
      `Are you sure you want to cancel your mentorship request with ${mentorName}? This action cannot be undone.`,
      [
        { text: 'No, Keep Request', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);

              const { data: userData } = await supabase.auth.getUser();
              if (!userData.user) throw new Error('Not authenticated');

              // Call the cancel function
              const { data, error } = await supabase.rpc('cancel_mentor_request', {
                request_id: requestId,
                user_id: userData.user.id,
                reason: reason.trim() || null,
                category: selectedCategory,
              });

              if (error) throw error;

              const result = data as { success: boolean; error?: string; message?: string };

              if (!result.success) {
                throw new Error(result.error || 'Failed to cancel request');
              }

              Alert.alert(
                'Request Cancelled',
                'Your mentorship request has been cancelled successfully.',
                [{ text: 'OK', onPress: () => {
                  onCancelled();
                  onClose();
                  resetForm();
                }}]
              );
            } catch (error: any) {
              console.error('Error cancelling request:', error);
              Alert.alert(
                'Error',
                error.message || 'Failed to cancel request. Please try again.'
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setSelectedCategory(null);
    setReason('');
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Cancel Request</Text>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              disabled={loading}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.mentorText}>
              Cancelling request with <Text style={styles.mentorName}>{mentorName}</Text>
            </Text>

            <Text style={styles.sectionTitle}>Why are you cancelling?</Text>

            {/* Category Selection */}
            <View style={styles.categoriesContainer}>
              {cancellationCategories.map((category) => (
                <TouchableOpacity
                  key={category.value}
                  style={[
                    styles.categoryOption,
                    selectedCategory === category.value && styles.categorySelected,
                  ]}
                  onPress={() => setSelectedCategory(category.value)}
                  disabled={loading}
                >
                  <Ionicons
                    name={category.icon}
                    size={20}
                    color={selectedCategory === category.value ? '#EF4444' : '#9CA3AF'}
                  />
                  <Text
                    style={[
                      styles.categoryLabel,
                      selectedCategory === category.value && styles.categoryLabelSelected,
                    ]}
                  >
                    {category.label}
                  </Text>
                  {selectedCategory === category.value && (
                    <Ionicons name="checkmark-circle" size={20} color="#EF4444" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Additional Details */}
            <View style={styles.reasonContainer}>
              <Text style={styles.reasonLabel}>
                Additional details {selectedCategory === 'other' && '(required)'}
              </Text>
              <TextInput
                style={styles.reasonInput}
                multiline
                numberOfLines={4}
                placeholder="Please provide more details about your cancellation..."
                value={reason}
                onChangeText={setReason}
                maxLength={500}
                editable={!loading}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{reason.length}/500</Text>
            </View>

            {/* Warning */}
            <View style={styles.warningBox}>
              <Ionicons name="warning" size={20} color="#F59E0B" />
              <Text style={styles.warningText}>
                This action cannot be undone. You'll need to submit a new request if you change your mind.
              </Text>
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.keepButton}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.keepButtonText}>Keep Request</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cancelButton, loading && styles.cancelButtonDisabled]}
              onPress={handleCancel}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.cancelButtonText}>Cancel Request</Text>
              )}
            </TouchableOpacity>
          </View>
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
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  mentorText: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 24,
  },
  mentorName: {
    fontWeight: '600',
    color: '#111827',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  categoriesContainer: {
    marginBottom: 24,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    marginBottom: 8,
    gap: 12,
  },
  categorySelected: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  categoryLabel: {
    flex: 1,
    fontSize: 15,
    color: '#6B7280',
  },
  categoryLabelSelected: {
    color: '#EF4444',
    fontWeight: '600',
  },
  reasonContainer: {
    marginBottom: 20,
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#111827',
    minHeight: 100,
  },
  charCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFFBEB',
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  keepButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  keepButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  cancelButtonDisabled: {
    opacity: 0.6,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
