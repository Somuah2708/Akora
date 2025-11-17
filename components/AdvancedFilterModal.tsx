import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { X, SlidersHorizontal } from 'lucide-react-native';
import { INDUSTRY_OPTIONS } from '@/constants/mentorConstants';

interface AdvancedFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApplyFilters: (filters: FilterCriteria) => void;
  onResetFilters: () => void;
}

export interface FilterCriteria {
  companies: string[];
  industries: string[];
  minExperience: number | null;
  maxExperience: number | null;
  minRating: number | null;
  availability: 'any' | 'available' | 'limited';
}

export default function AdvancedFilterModal({
  visible,
  onClose,
  onApplyFilters,
  onResetFilters,
}: AdvancedFilterModalProps) {
  const [companies, setCompanies] = useState<string[]>([]);
  const [companyInput, setCompanyInput] = useState('');
  const [industries, setIndustries] = useState<string[]>([]);
  const [minExperience, setMinExperience] = useState('');
  const [maxExperience, setMaxExperience] = useState('');
  const [minRating, setMinRating] = useState<number | null>(null);
  const [availability, setAvailability] = useState<'any' | 'available' | 'limited'>('any');

  const handleAddCompany = () => {
    const trimmed = companyInput.trim();
    if (trimmed && !companies.includes(trimmed)) {
      setCompanies([...companies, trimmed]);
      setCompanyInput('');
    }
  };

  const handleRemoveCompany = (company: string) => {
    setCompanies(companies.filter(c => c !== company));
  };

  const toggleIndustry = (industry: string) => {
    if (industries.includes(industry)) {
      setIndustries(industries.filter(i => i !== industry));
    } else {
      setIndustries([...industries, industry]);
    }
  };

  const handleApply = () => {
    onApplyFilters({
      companies,
      industries,
      minExperience: minExperience ? parseInt(minExperience) : null,
      maxExperience: maxExperience ? parseInt(maxExperience) : null,
      minRating,
      availability,
    });
    onClose();
  };

  const handleReset = () => {
    setCompanies([]);
    setCompanyInput('');
    setIndustries([]);
    setMinExperience('');
    setMaxExperience('');
    setMinRating(null);
    setAvailability('any');
    onResetFilters();
    onClose();
  };

  const ratingOptions = [1, 2, 3, 4, 5];
  const availabilityOptions = [
    { value: 'any' as const, label: 'Any' },
    { value: 'available' as const, label: 'Available Now' },
    { value: 'limited' as const, label: 'Limited Slots' },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <SlidersHorizontal size={24} color="#10B981" />
              <Text style={styles.title}>Advanced Filters</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Company Filter */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Company</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter company name..."
                  placeholderTextColor="#9CA3AF"
                  value={companyInput}
                  onChangeText={setCompanyInput}
                  onSubmitEditing={handleAddCompany}
                />
                <TouchableOpacity style={styles.addButton} onPress={handleAddCompany}>
                  <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
              {companies.length > 0 && (
                <View style={styles.tagsContainer}>
                  {companies.map((company) => (
                    <TouchableOpacity
                      key={company}
                      style={styles.tag}
                      onPress={() => handleRemoveCompany(company)}
                    >
                      <Text style={styles.tagText}>{company}</Text>
                      <X size={14} color="#1E40AF" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Industry Filter */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Industry</Text>
              <View style={styles.optionsGrid}>
                {INDUSTRY_OPTIONS.map((industry) => (
                  <TouchableOpacity
                    key={industry}
                    style={[
                      styles.optionChip,
                      industries.includes(industry) && styles.optionChipSelected,
                    ]}
                    onPress={() => toggleIndustry(industry)}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        industries.includes(industry) && styles.optionChipTextSelected,
                      ]}
                    >
                      {industry}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Years of Experience */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Years of Experience</Text>
              <View style={styles.rangeRow}>
                <View style={styles.rangeInput}>
                  <Text style={styles.rangeLabel}>Min</Text>
                  <TextInput
                    style={styles.rangeTextInput}
                    placeholder="0"
                    placeholderTextColor="#9CA3AF"
                    value={minExperience}
                    onChangeText={setMinExperience}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
                <Text style={styles.rangeSeparator}>—</Text>
                <View style={styles.rangeInput}>
                  <Text style={styles.rangeLabel}>Max</Text>
                  <TextInput
                    style={styles.rangeTextInput}
                    placeholder="30"
                    placeholderTextColor="#9CA3AF"
                    value={maxExperience}
                    onChangeText={setMaxExperience}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
              </View>
            </View>

            {/* Minimum Rating */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Minimum Rating</Text>
              <View style={styles.ratingRow}>
                {ratingOptions.map((rating) => (
                  <TouchableOpacity
                    key={rating}
                    style={[
                      styles.ratingButton,
                      minRating === rating && styles.ratingButtonSelected,
                    ]}
                    onPress={() => setMinRating(rating === minRating ? null : rating)}
                  >
                    <Text
                      style={[
                        styles.ratingButtonText,
                        minRating === rating && styles.ratingButtonTextSelected,
                      ]}
                    >
                      {rating}★
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Availability */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Availability</Text>
              <View style={styles.availabilityRow}>
                {availabilityOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.availabilityButton,
                      availability === option.value && styles.availabilityButtonSelected,
                    ]}
                    onPress={() => setAvailability(option.value)}
                  >
                    <Text
                      style={[
                        styles.availabilityButtonText,
                        availability === option.value && styles.availabilityButtonTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Text style={styles.resetButtonText}>Reset All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
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
  modal: {
    backgroundColor: '#FFFFFF',
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
    maxHeight: 500,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#1E40AF',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  optionChipSelected: {
    backgroundColor: '#D1FAE5',
    borderColor: '#10B981',
  },
  optionChipText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  optionChipTextSelected: {
    color: '#065F46',
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  rangeInput: {
    flex: 1,
    gap: 8,
  },
  rangeLabel: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  rangeTextInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    textAlign: 'center',
  },
  rangeSeparator: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#9CA3AF',
    marginTop: 24,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 8,
  },
  ratingButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  ratingButtonSelected: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  ratingButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  ratingButtonTextSelected: {
    color: '#92400E',
  },
  availabilityRow: {
    gap: 8,
  },
  availabilityButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  availabilityButtonSelected: {
    backgroundColor: '#DBEAFE',
    borderColor: '#3B82F6',
  },
  availabilityButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    textAlign: 'center',
  },
  availabilityButtonTextSelected: {
    color: '#1E40AF',
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
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#10B981',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  applyButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});
