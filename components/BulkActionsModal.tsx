import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { X, CheckCircle, XCircle, AlertTriangle } from 'lucide-react-native';

interface BulkActionsModalProps {
  visible: boolean;
  onClose: () => void;
  selectedIds: string[];
  actionType: 'approve' | 'reject' | 'decline' | 'complete' | 'delete';
  onAction: (ids: string[], reason?: string) => Promise<void>;
  title: string;
  confirmText?: string;
  requireReason?: boolean;
}

export default function BulkActionsModal({
  visible,
  onClose,
  selectedIds,
  actionType,
  onAction,
  title,
  confirmText,
  requireReason = false,
}: BulkActionsModalProps) {
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleConfirm = async () => {
    if (requireReason && !reason.trim()) {
      Alert.alert('Reason Required', 'Please provide a reason for this action');
      return;
    }

    try {
      setProcessing(true);
      await onAction(selectedIds, reason.trim() || undefined);
      setReason('');
      onClose();
    } catch (error) {
      console.error('Bulk action error:', error);
      Alert.alert('Error', 'Failed to complete bulk action');
    } finally {
      setProcessing(false);
    }
  };

  const getIcon = () => {
    switch (actionType) {
      case 'approve':
      case 'complete':
        return <CheckCircle size={48} color="#10B981" />;
      case 'reject':
      case 'decline':
      case 'delete':
        return <XCircle size={48} color="#EF4444" />;
      default:
        return <AlertTriangle size={48} color="#F59E0B" />;
    }
  };

  const getColor = () => {
    switch (actionType) {
      case 'approve':
      case 'complete':
        return '#10B981';
      case 'reject':
      case 'decline':
      case 'delete':
        return '#EF4444';
      default:
        return '#F59E0B';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Icon */}
            <View style={styles.iconContainer}>
              {getIcon()}
            </View>

            {/* Confirmation Message */}
            <Text style={styles.message}>
              {confirmText || `Are you sure you want to ${actionType} ${selectedIds.length} item${selectedIds.length > 1 ? 's' : ''}?`}
            </Text>

            <View style={styles.countBadge}>
              <Text style={styles.countText}>
                {selectedIds.length} item{selectedIds.length > 1 ? 's' : ''} selected
              </Text>
            </View>

            {/* Reason Input (if required) */}
            {requireReason && (
              <View style={styles.reasonContainer}>
                <Text style={styles.reasonLabel}>
                  {actionType === 'reject' ? 'Rejection Reason' : 'Reason'} *
                </Text>
                <TextInput
                  style={styles.reasonInput}
                  placeholder={`Enter reason for ${actionType}...`}
                  placeholderTextColor="#9CA3AF"
                  value={reason}
                  onChangeText={setReason}
                  multiline
                  maxLength={500}
                  numberOfLines={4}
                />
                <Text style={styles.charCount}>
                  {reason.length}/500 characters
                </Text>
              </View>
            )}

            {/* Warning for destructive actions */}
            {(actionType === 'delete' || actionType === 'reject') && (
              <View style={styles.warningBox}>
                <AlertTriangle size={20} color="#F59E0B" />
                <Text style={styles.warningText}>
                  This action cannot be undone. {actionType === 'delete' ? 'Items will be permanently deleted.' : 'Affected users will be notified.'}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={processing}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, { backgroundColor: getColor() }]}
              onPress={handleConfirm}
              disabled={processing || (requireReason && !reason.trim())}
            >
              {processing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmButtonText}>
                  {actionType.charAt(0).toUpperCase() + actionType.slice(1)} ({selectedIds.length})
                </Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
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
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
    maxHeight: 400,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  countBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 20,
  },
  countText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  reasonContainer: {
    marginBottom: 16,
  },
  reasonLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    marginBottom: 8,
  },
  reasonInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 8,
    padding: 12,
    gap: 12,
    alignItems: 'flex-start',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#92400E',
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  confirmButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});
