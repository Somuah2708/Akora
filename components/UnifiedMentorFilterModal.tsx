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
import { X, SlidersHorizontal, Filter, Star } from 'lucide-react-native';
import { INDUSTRY_OPTIONS } from '@/constants/mentorConstants';

interface UnifiedMentorFilterModalProps {
  visible: boolean;
  onClose: () => void;
  // Expertise props
  allExpertiseAreas: string[];
  selectedExpertise: string[];
  onExpertiseChange: (expertise: string[]) => void;
  // Advanced filter props
  onApplyFilters: (expertise: string[], advancedFilters: FilterCriteria | null) => void;
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

export default function UnifiedMentorFilterModal({
  visible,
  onClose,
  allExpertiseAreas,
  selectedExpertise,
  onExpertiseChange,
  onApplyFilters,
  onResetFilters,
}: UnifiedMentorFilterModalProps) {
  const [activeSection, setActiveSection] = useState<'expertise' | 'advanced'>('expertise');
  
  // Advanced filter states
  const [companies, setCompanies] = useState<string[]>([]);
  const [companyInput, setCompanyInput] = useState('');
  const [industries, setIndustries] = useState<string[]>([]);
  const [minExperience, setMinExperience] = useState('');
  const [maxExperience, setMaxExperience] = useState('');
  const [minRating, setMinRating] = useState<number | null>(null);
  const [availability, setAvailability] = useState<'any' | 'available' | 'limited'>('any');

  const toggleExpertise = (area: string) => {
    if (selectedExpertise.includes(area)) {
      onExpertiseChange(selectedExpertise.filter(e => e !== area));
    } else {
      onExpertiseChange([...selectedExpertise, area]);
    }
  };

  const selectAllExpertise = () => {
    onExpertiseChange([...allExpertiseAreas]);
  };

  const clearAllExpertise = () => {
    onExpertiseChange([]);
  };

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
    const hasAdvancedFilters = companies.length > 0 || industries.length > 0 || 
                               minExperience || maxExperience || minRating || availability !== 'any';
    
    const advancedFilters = hasAdvancedFilters ? {
      companies,
      industries,
      minExperience: minExperience ? parseInt(minExperience) : null,
      maxExperience: maxExperience ? parseInt(maxExperience) : null,
      minRating,
      availability,
    } : null;

    onApplyFilters(selectedExpertise, advancedFilters);
    onClose();
  };

  const handleReset = () => {
    // Reset expertise
    onExpertiseChange([]);
    
    // Reset advanced filters
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

  const activeFiltersCount = selectedExpertise.length + 
    (companies.length > 0 ? 1 : 0) + 
    (industries.length > 0 ? 1 : 0) + 
    (minExperience ? 1 : 0) + 
    (maxExperience ? 1 : 0) + 
    (minRating ? 1 : 0) + 
    (availability !== 'any' ? 1 : 0);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Filter size={24} color="#4169E1" />
              <Text style={styles.title}>Filter Mentors</Text>
              {activeFiltersCount > 0 && (
                <View style={styles.filterCountBadge}>
                  <Text style={styles.filterCountText}>{activeFiltersCount}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Section Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, activeSection === 'expertise' && styles.tabActive]}
              onPress={() => setActiveSection('expertise')}
            >
              <Text style={[styles.tabText, activeSection === 'expertise' && styles.tabTextActive]}>
                Expertise {selectedExpertise.length > 0 && `(${selectedExpertise.length})`}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeSection === 'advanced' && styles.tabActive]}
              onPress={() => setActiveSection('advanced')}
            >
              <SlidersHorizontal size={16} color={activeSection === 'advanced' ? '#4169E1' : '#6B7280'} />
              <Text style={[styles.tabText, activeSection === 'advanced' && styles.tabTextActive]}>
                Advanced
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Expertise Section */}
            {activeSection === 'expertise' && (
              <View>
                {/* Quick Actions */}
                <View style={styles.quickActions}>
                  <TouchableOpacity onPress={selectAllExpertise} style={styles.quickButton}>
                    <Text style={styles.quickButtonText}>Select All</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={clearAllExpertise} style={styles.quickButton}>
                    <Text style={styles.quickButtonText}>Clear All</Text>
                  </TouchableOpacity>
                </View>

                {/* Selected Count */}
                {selectedExpertise.length > 0 && (
                  <View style={styles.selectedBanner}>
                    <Text style={styles.selectedText}>
                      {selectedExpertise.length} expertise area{selectedExpertise.length !== 1 ? 's' : ''} selected
                    </Text>
                  </View>
                )}

                {/* Expertise List */}
                <View style={styles.expertiseGrid}>
                  {allExpertiseAreas.length > 0 ? (
                    allExpertiseAreas.map((area) => {
                      const isSelected = selectedExpertise.includes(area);
                      return (
                        <TouchableOpacity
                          key={area}
                          style={[styles.expertiseChip, isSelected && styles.expertiseChipSelected]}
                          onPress={() => toggleExpertise(area)}
                        >
                          <Text style={[styles.expertiseChipText, isSelected && styles.expertiseChipTextSelected]}>
                            {area}
                          </Text>
                        </TouchableOpacity>
                      );
                    })
                  ) : (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateText}>No expertise areas available yet</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Advanced Filters Section */}
            {activeSection === 'advanced' && (
              <View style={{ paddingBottom: 20 }}>
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
                    <View style={styles.chipContainer}>
                      {companies.map((company) => (
                        <View key={company} style={styles.chip}>
                          <Text style={styles.chipText}>{company}</Text>
                          <TouchableOpacity onPress={() => handleRemoveCompany(company)}>
                            <X size={14} color="#4B5563" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* Industry Filter */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Industry</Text>
                  <View style={styles.industryGrid}>
                    {INDUSTRY_OPTIONS.map((industry) => {
                      const isSelected = industries.includes(industry);
                      return (
                        <TouchableOpacity
                          key={industry}
                          style={[styles.industryChip, isSelected && styles.industryChipSelected]}
                          onPress={() => toggleIndustry(industry)}
                        >
                          <Text style={[styles.industryChipText, isSelected && styles.industryChipTextSelected]}>
                            {industry}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Experience Range */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Years of Experience</Text>
                  <View style={styles.rangeRow}>
                    <View style={styles.rangeInput}>
                      <Text style={styles.rangeLabel}>Min</Text>
                      <TextInput
                        style={styles.rangeField}
                        placeholder="0"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="numeric"
                        value={minExperience}
                        onChangeText={setMinExperience}
                      />
                    </View>
                    <Text style={styles.rangeSeparator}>-</Text>
                    <View style={styles.rangeInput}>
                      <Text style={styles.rangeLabel}>Max</Text>
                      <TextInput
                        style={styles.rangeField}
                        placeholder="20+"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="numeric"
                        value={maxExperience}
                        onChangeText={setMaxExperience}
                      />
                    </View>
                  </View>
                </View>

                {/* Minimum Rating */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Minimum Rating</Text>
                  <View style={styles.ratingRow}>
                    {ratingOptions.map((rating) => {
                      const isSelected = minRating === rating;
                      return (
                        <TouchableOpacity
                          key={rating}
                          style={[styles.ratingButton, isSelected && styles.ratingButtonSelected]}
                          onPress={() => setMinRating(isSelected ? null : rating)}
                        >
                          <Star
                            size={18}
                            color={isSelected ? '#FBBF24' : '#9CA3AF'}
                            fill={isSelected ? '#FBBF24' : 'none'}
                          />
                          <Text style={[styles.ratingText, isSelected && styles.ratingTextSelected]}>
                            {rating}+
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Availability */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Availability</Text>
                  <View style={styles.availabilityRow}>
                    {availabilityOptions.map((option) => {
                      const isSelected = availability === option.value;
                      return (
                        <TouchableOpacity
                          key={option.value}
                          style={[styles.availabilityButton, isSelected && styles.availabilityButtonSelected]}
                          onPress={() => setAvailability(option.value)}
                        >
                          <Text style={[styles.availabilityText, isSelected && styles.availabilityTextSelected]}>
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  filterCountBadge: {
    backgroundColor: '#4169E1',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  filterCountText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#4169E1',
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#4169E1',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  quickButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
  },
  quickButtonText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#4B5563',
  },
  selectedBanner: {
    backgroundColor: '#EEF2FF',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  selectedText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
    textAlign: 'center',
  },
  expertiseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  expertiseChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  expertiseChipSelected: {
    backgroundColor: '#4169E1',
    borderColor: '#4169E1',
  },
  expertiseChipText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#4B5563',
  },
  expertiseChipTextSelected: {
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#1F2937',
  },
  addButton: {
    backgroundColor: '#4169E1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  chipText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  industryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  industryChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  industryChipSelected: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  industryChipText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#4B5563',
  },
  industryChipTextSelected: {
    color: '#FFFFFF',
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  rangeInput: {
    flex: 1,
  },
  rangeLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    marginBottom: 6,
  },
  rangeField: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#1F2937',
  },
  rangeSeparator: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#9CA3AF',
    marginTop: 20,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 10,
  },
  ratingButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  ratingButtonSelected: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FBBF24',
  },
  ratingText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  ratingTextSelected: {
    color: '#B45309',
  },
  availabilityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  availabilityButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
  },
  availabilityButtonSelected: {
    backgroundColor: '#DBEAFE',
    borderColor: '#3B82F6',
  },
  availabilityText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    textAlign: 'center',
  },
  availabilityTextSelected: {
    color: '#1E40AF',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  resetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#4B5563',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#4169E1',
    alignItems: 'center',
    shadowColor: '#4169E1',
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
  emptyState: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
