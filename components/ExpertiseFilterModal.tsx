import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ExpertiseFilterModalProps {
  visible: boolean;
  onClose: () => void;
  allExpertiseAreas: string[];
  selectedExpertise: string[];
  onExpertiseChange: (expertise: string[]) => void;
  onApplyFilters: () => void;
  onResetFilters: () => void;
}

export default function ExpertiseFilterModal({
  visible,
  onClose,
  allExpertiseAreas,
  selectedExpertise,
  onExpertiseChange,
  onApplyFilters,
  onResetFilters,
}: ExpertiseFilterModalProps) {
  const toggleExpertise = (area: string) => {
    if (selectedExpertise.includes(area)) {
      onExpertiseChange(selectedExpertise.filter(e => e !== area));
    } else {
      onExpertiseChange([...selectedExpertise, area]);
    }
  };

  const selectAll = () => {
    onExpertiseChange([...allExpertiseAreas]);
  };

  const clearAll = () => {
    onExpertiseChange([]);
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
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Filter by Expertise</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity onPress={selectAll} style={styles.quickButton}>
              <Text style={styles.quickButtonText}>Select All</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={clearAll} style={styles.quickButton}>
              <Text style={styles.quickButtonText}>Clear All</Text>
            </TouchableOpacity>
          </View>

          {/* Selected Count */}
          {selectedExpertise.length > 0 && (
            <View style={styles.selectedBanner}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.selectedText}>
                {selectedExpertise.length} expertise area{selectedExpertise.length !== 1 ? 's' : ''} selected
              </Text>
            </View>
          )}

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Expertise Areas */}
            <View style={styles.section}>
              {allExpertiseAreas.length === 0 ? (
                <Text style={styles.emptyText}>No expertise areas available</Text>
              ) : (
                allExpertiseAreas.map((area) => (
                  <TouchableOpacity
                    key={area}
                    style={[
                      styles.option,
                      selectedExpertise.includes(area) && styles.optionSelected,
                    ]}
                    onPress={() => toggleExpertise(area)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selectedExpertise.includes(area) && styles.optionTextSelected,
                      ]}
                    >
                      {area}
                    </Text>
                    {selectedExpertise.includes(area) && (
                      <Ionicons name="checkmark" size={20} color="#10B981" />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => {
                onResetFilters();
                onClose();
              }}
            >
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => {
                onApplyFilters();
                onClose();
              }}
            >
              <Text style={styles.applyButtonText}>
                Apply{selectedExpertise.length > 0 ? ` (${selectedExpertise.length})` : ''}
              </Text>
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
    maxHeight: '80%',
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
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  quickButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  quickButtonText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  selectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 12,
  },
  selectedText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '500',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 40,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    marginBottom: 8,
  },
  optionSelected: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  optionText: {
    fontSize: 15,
    color: '#6B7280',
    flex: 1,
  },
  optionTextSelected: {
    color: '#10B981',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  resetButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  applyButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
