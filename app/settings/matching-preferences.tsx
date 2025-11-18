import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Save } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

type MatchingPreferences = {
  career_goals: string[];
  preferred_industries: string[];
  preferred_expertise: string[];
  preferred_meeting_formats: string[];
  min_years_experience: number;
  min_rating: number;
  only_available: boolean;
};

const EXPERTISE_OPTIONS = [
  'Academic Writing',
  'Career Planning',
  'College Applications',
  'Essay Review',
  'Interview Prep',
  'Networking',
  'Personal Development',
  'Resume Building',
  'Scholarship Applications',
  'Study Skills',
  'Test Preparation',
  'Time Management',
];

const INDUSTRY_OPTIONS = [
  'Technology',
  'Finance',
  'Healthcare',
  'Education',
  'Engineering',
  'Business',
  'Marketing',
  'Law',
  'Arts & Design',
  'Science',
  'Government',
  'Non-Profit',
];

const MEETING_FORMAT_OPTIONS = [
  'Video Call',
  'Phone Call',
  'In-Person',
  'Email',
];

export default function MatchingPreferencesScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<MatchingPreferences>({
    career_goals: [],
    preferred_industries: [],
    preferred_expertise: [],
    preferred_meeting_formats: [],
    min_years_experience: 0,
    min_rating: 0,
    only_available: true,
  });
  const [careerGoalInput, setCareerGoalInput] = useState('');

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_matching_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setPreferences({
          career_goals: data.career_goals || [],
          preferred_industries: data.preferred_industries || [],
          preferred_expertise: data.preferred_expertise || [],
          preferred_meeting_formats: data.preferred_meeting_formats || [],
          min_years_experience: data.min_years_experience || 0,
          min_rating: data.min_rating || 0,
          only_available: data.only_available ?? true,
        });
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      Alert.alert('Error', 'Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_matching_preferences')
        .upsert({
          user_id: user.id,
          ...preferences,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      Alert.alert('Success', 'Preferences saved successfully', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert('Error', 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const toggleArrayItem = (array: string[], item: string) => {
    if (array.includes(item)) {
      return array.filter((i) => i !== item);
    }
    return [...array, item];
  };

  const addCareerGoal = () => {
    if (careerGoalInput.trim()) {
      setPreferences({
        ...preferences,
        career_goals: [...preferences.career_goals, careerGoalInput.trim()],
      });
      setCareerGoalInput('');
    }
  };

  const removeCareerGoal = (goal: string) => {
    setPreferences({
      ...preferences,
      career_goals: preferences.career_goals.filter((g) => g !== goal),
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Matching Preferences</Text>
        <TouchableOpacity
          onPress={savePreferences}
          disabled={saving}
          style={styles.saveButton}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <Save size={24} color="#007AFF" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Set your preferences to get personalized mentor recommendations based on
            your career goals, expertise needs, and availability.
          </Text>
        </View>

        {/* Career Goals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Career Goals</Text>
          <Text style={styles.sectionDescription}>
            What are your career aspirations?
          </Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              value={careerGoalInput}
              onChangeText={setCareerGoalInput}
              placeholder="e.g., Software Engineer at FAANG"
              placeholderTextColor="#94a3b8"
            />
            <TouchableOpacity onPress={addCareerGoal} style={styles.addButton}>
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.chipContainer}>
            {preferences.career_goals.map((goal) => (
              <TouchableOpacity
                key={goal}
                onPress={() => removeCareerGoal(goal)}
                style={styles.selectedChip}
              >
                <Text style={styles.selectedChipText}>{goal}</Text>
                <Text style={styles.removeIcon}>×</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Preferred Industries */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferred Industries</Text>
          <Text style={styles.sectionDescription}>
            Select industries you're interested in
          </Text>
          <View style={styles.chipContainer}>
            {INDUSTRY_OPTIONS.map((industry) => (
              <TouchableOpacity
                key={industry}
                onPress={() =>
                  setPreferences({
                    ...preferences,
                    preferred_industries: toggleArrayItem(
                      preferences.preferred_industries,
                      industry
                    ),
                  })
                }
                style={[
                  styles.chip,
                  preferences.preferred_industries.includes(industry) &&
                    styles.selectedChip,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    preferences.preferred_industries.includes(industry) &&
                      styles.selectedChipText,
                  ]}
                >
                  {industry}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Preferred Expertise */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferred Expertise</Text>
          <Text style={styles.sectionDescription}>
            What skills do you want mentorship in?
          </Text>
          <View style={styles.chipContainer}>
            {EXPERTISE_OPTIONS.map((expertise) => (
              <TouchableOpacity
                key={expertise}
                onPress={() =>
                  setPreferences({
                    ...preferences,
                    preferred_expertise: toggleArrayItem(
                      preferences.preferred_expertise,
                      expertise
                    ),
                  })
                }
                style={[
                  styles.chip,
                  preferences.preferred_expertise.includes(expertise) &&
                    styles.selectedChip,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    preferences.preferred_expertise.includes(expertise) &&
                      styles.selectedChipText,
                  ]}
                >
                  {expertise}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Meeting Formats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferred Meeting Formats</Text>
          <Text style={styles.sectionDescription}>
            How do you prefer to meet?
          </Text>
          <View style={styles.chipContainer}>
            {MEETING_FORMAT_OPTIONS.map((format) => (
              <TouchableOpacity
                key={format}
                onPress={() =>
                  setPreferences({
                    ...preferences,
                    preferred_meeting_formats: toggleArrayItem(
                      preferences.preferred_meeting_formats,
                      format
                    ),
                  })
                }
                style={[
                  styles.chip,
                  preferences.preferred_meeting_formats.includes(format) &&
                    styles.selectedChip,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    preferences.preferred_meeting_formats.includes(format) &&
                      styles.selectedChipText,
                  ]}
                >
                  {format}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Minimum Years of Experience */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Minimum Years of Experience: {preferences.min_years_experience}
          </Text>
          <Text style={styles.sectionDescription}>
            Minimum professional experience required
          </Text>
          <View style={styles.sliderRow}>
            {[0, 2, 5, 10, 15, 20].map((years) => (
              <TouchableOpacity
                key={years}
                onPress={() =>
                  setPreferences({ ...preferences, min_years_experience: years })
                }
                style={[
                  styles.sliderOption,
                  preferences.min_years_experience === years &&
                    styles.sliderOptionSelected,
                ]}
              >
                <Text
                  style={[
                    styles.sliderText,
                    preferences.min_years_experience === years &&
                      styles.sliderTextSelected,
                  ]}
                >
                  {years}+
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Minimum Rating */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Minimum Rating: {preferences.min_rating.toFixed(1)} ⭐
          </Text>
          <Text style={styles.sectionDescription}>
            Minimum mentor rating required
          </Text>
          <View style={styles.sliderRow}>
            {[0, 3.0, 3.5, 4.0, 4.5, 5.0].map((rating) => (
              <TouchableOpacity
                key={rating}
                onPress={() =>
                  setPreferences({ ...preferences, min_rating: rating })
                }
                style={[
                  styles.sliderOption,
                  preferences.min_rating === rating && styles.sliderOptionSelected,
                ]}
              >
                <Text
                  style={[
                    styles.sliderText,
                    preferences.min_rating === rating && styles.sliderTextSelected,
                  ]}
                >
                  {rating === 0 ? 'Any' : rating.toFixed(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Only Available */}
        <View style={styles.section}>
          <View style={styles.switchRow}>
            <View style={styles.switchTextContainer}>
              <Text style={styles.sectionTitle}>Only Available Mentors</Text>
              <Text style={styles.sectionDescription}>
                Show only mentors currently accepting mentees
              </Text>
            </View>
            <Switch
              value={preferences.only_available}
              onValueChange={(value) =>
                setPreferences({ ...preferences, only_available: value })
              }
              trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
              thumbColor={preferences.only_available ? '#007AFF' : '#f4f4f5'}
            />
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  saveButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  infoBox: {
    margin: 16,
    padding: 16,
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  infoText: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  textInput: {
    flex: 1,
    height: 44,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    fontSize: 14,
    color: '#1e293b',
  },
  addButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  chipText: {
    fontSize: 14,
    color: '#64748b',
  },
  selectedChip: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectedChipText: {
    color: '#fff',
    fontWeight: '600',
  },
  removeIcon: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  sliderRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  sliderOption: {
    flex: 1,
    minWidth: 50,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  sliderOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  sliderText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  sliderTextSelected: {
    color: '#fff',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchTextContainer: {
    flex: 1,
    marginRight: 16,
  },
});
