import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { debouncedRouter } from '@/utils/navigationDebounce';
import { ArrowLeft, Plus, Edit2, Trash2, Calendar, Flag, X, ChevronDown, Check } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface Activity {
  id: string;
  title: string;
  description: string | null;
  month: string | null;
  year: number | null;
  sort_order: number;
  is_active: boolean;
}

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  milestone_date: string | null;
  sort_order: number;
  is_completed: boolean;
  is_active: boolean;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const YEARS = [2025, 2026, 2027, 2028];

export default function CentenaryAdminScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'activities' | 'milestones'>('activities');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Modal states
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);

  // Form states for Activity
  const [activityTitle, setActivityTitle] = useState('');
  const [activityDescription, setActivityDescription] = useState('');
  const [activityMonth, setActivityMonth] = useState('Jan');
  const [activityYear, setActivityYear] = useState(2026);
  const [activitySortOrder, setActivitySortOrder] = useState('');

  // Form states for Milestone
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneDescription, setMilestoneDescription] = useState('');
  const [milestoneDate, setMilestoneDate] = useState('');
  const [milestoneSortOrder, setMilestoneSortOrder] = useState('');
  const [milestoneCompleted, setMilestoneCompleted] = useState(false);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkAdmin();
    fetchData();
  }, [user]);

  const checkAdmin = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('alumni')
        .select('is_admin')
        .eq('id', user.id)
        .single();
      
      if (data?.is_admin) {
        setIsAdmin(true);
      } else {
        Alert.alert('Access Denied', 'You need admin privileges to access this page.');
        debouncedRouter.back();
      }
    } catch (error) {
      console.error('Error checking admin:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('centenary_activities')
        .select('*')
        .order('sort_order', { ascending: true });

      if (activitiesError) throw activitiesError;
      setActivities(activitiesData || []);

      // Fetch milestones
      const { data: milestonesData, error: milestonesError } = await supabase
        .from('centenary_milestones')
        .select('*')
        .order('sort_order', { ascending: true });

      if (milestonesError) throw milestonesError;
      setMilestones(milestonesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Activity Modal Functions
  const openAddActivityModal = () => {
    setEditingActivity(null);
    setActivityTitle('');
    setActivityDescription('');
    setActivityMonth('Jan');
    setActivityYear(2026);
    setActivitySortOrder(String(activities.length + 1));
    setShowActivityModal(true);
  };

  const openEditActivityModal = (activity: Activity) => {
    setEditingActivity(activity);
    setActivityTitle(activity.title);
    setActivityDescription(activity.description || '');
    setActivityMonth(activity.month || 'Jan');
    setActivityYear(activity.year || 2026);
    setActivitySortOrder(String(activity.sort_order));
    setShowActivityModal(true);
  };

  const saveActivity = async () => {
    if (!activityTitle.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }

    setSaving(true);
    try {
      const activityData = {
        title: activityTitle.trim(),
        description: activityDescription.trim() || null,
        month: activityMonth,
        year: activityYear,
        sort_order: parseInt(activitySortOrder) || 0,
        created_by: user?.id,
      };

      if (editingActivity) {
        const { error } = await supabase
          .from('centenary_activities')
          .update(activityData)
          .eq('id', editingActivity.id);

        if (error) throw error;
        Alert.alert('Success', 'Activity updated successfully');
      } else {
        const { error } = await supabase
          .from('centenary_activities')
          .insert(activityData);

        if (error) throw error;
        Alert.alert('Success', 'Activity created successfully');
      }

      setShowActivityModal(false);
      fetchData();
    } catch (error: any) {
      console.error('Error saving activity:', error);
      Alert.alert('Error', error.message || 'Failed to save activity');
    } finally {
      setSaving(false);
    }
  };

  const deleteActivity = async (id: string) => {
    Alert.alert(
      'Delete Activity',
      'Are you sure you want to delete this activity?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('centenary_activities')
                .delete()
                .eq('id', id);

              if (error) throw error;
              fetchData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  // Milestone Modal Functions
  const openAddMilestoneModal = () => {
    setEditingMilestone(null);
    setMilestoneTitle('');
    setMilestoneDescription('');
    setMilestoneDate('Q1 2026');
    setMilestoneSortOrder(String(milestones.length + 1));
    setMilestoneCompleted(false);
    setShowMilestoneModal(true);
  };

  const openEditMilestoneModal = (milestone: Milestone) => {
    setEditingMilestone(milestone);
    setMilestoneTitle(milestone.title);
    setMilestoneDescription(milestone.description || '');
    setMilestoneDate(milestone.milestone_date || '');
    setMilestoneSortOrder(String(milestone.sort_order));
    setMilestoneCompleted(milestone.is_completed);
    setShowMilestoneModal(true);
  };

  const saveMilestone = async () => {
    if (!milestoneTitle.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }

    setSaving(true);
    try {
      const milestoneData = {
        title: milestoneTitle.trim(),
        description: milestoneDescription.trim() || null,
        milestone_date: milestoneDate.trim() || null,
        sort_order: parseInt(milestoneSortOrder) || 0,
        is_completed: milestoneCompleted,
        created_by: user?.id,
      };

      if (editingMilestone) {
        const { error } = await supabase
          .from('centenary_milestones')
          .update(milestoneData)
          .eq('id', editingMilestone.id);

        if (error) throw error;
        Alert.alert('Success', 'Milestone updated successfully');
      } else {
        const { error } = await supabase
          .from('centenary_milestones')
          .insert(milestoneData);

        if (error) throw error;
        Alert.alert('Success', 'Milestone created successfully');
      }

      setShowMilestoneModal(false);
      fetchData();
    } catch (error: any) {
      console.error('Error saving milestone:', error);
      Alert.alert('Error', error.message || 'Failed to save milestone');
    } finally {
      setSaving(false);
    }
  };

  const deleteMilestone = async (id: string) => {
    Alert.alert(
      'Delete Milestone',
      'Are you sure you want to delete this milestone?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('centenary_milestones')
                .delete()
                .eq('id', id);

              if (error) throw error;
              fetchData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  const toggleActivityStatus = async (activity: Activity) => {
    try {
      const { error } = await supabase
        .from('centenary_activities')
        .update({ is_active: !activity.is_active })
        .eq('id', activity.id);

      if (error) throw error;
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update');
    }
  };

  const toggleMilestoneStatus = async (milestone: Milestone) => {
    try {
      const { error } = await supabase
        .from('centenary_milestones')
        .update({ is_active: !milestone.is_active })
        .eq('id', milestone.id);

      if (error) throw error;
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update');
    }
  };

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.tabBarActive} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Centenary</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'activities' && styles.tabActive]}
          onPress={() => setActiveTab('activities')}
        >
          <Calendar size={18} color={activeTab === 'activities' ? '#FFFFFF' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'activities' && styles.tabTextActive]}>
            Activities
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'milestones' && styles.tabActive]}
          onPress={() => setActiveTab('milestones')}
        >
          <Flag size={18} color={activeTab === 'milestones' ? '#FFFFFF' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'milestones' && styles.tabTextActive]}>
            Milestones
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.tabBarActive} />
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {activeTab === 'activities' ? (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Activities & Preparation</Text>
                <TouchableOpacity style={styles.addBtn} onPress={openAddActivityModal}>
                  <Plus size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {activities.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No activities yet</Text>
                </View>
              ) : (
                activities.map((activity) => (
                  <View key={activity.id} style={[styles.itemCard, !activity.is_active && styles.itemCardInactive]}>
                    <View style={styles.itemHeader}>
                      <View style={styles.itemBadge}>
                        <Text style={styles.itemBadgeText}>{activity.month} {activity.year}</Text>
                      </View>
                      <View style={styles.itemActions}>
                        <TouchableOpacity onPress={() => toggleActivityStatus(activity)} style={styles.statusBtn}>
                          <View style={[styles.statusDot, activity.is_active && styles.statusDotActive]} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => openEditActivityModal(activity)} style={styles.actionBtn}>
                          <Edit2 size={16} color="#6B7280" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => deleteActivity(activity.id)} style={styles.actionBtn}>
                          <Trash2 size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text style={styles.itemTitle}>{activity.title}</Text>
                    {activity.description && (
                      <Text style={styles.itemDescription} numberOfLines={2}>{activity.description}</Text>
                    )}
                    <Text style={styles.sortOrderText}>Order: {activity.sort_order}</Text>
                  </View>
                ))
              )}
            </>
          ) : (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Road to 2027 Milestones</Text>
                <TouchableOpacity style={styles.addBtn} onPress={openAddMilestoneModal}>
                  <Plus size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {milestones.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No milestones yet</Text>
                </View>
              ) : (
                milestones.map((milestone) => (
                  <View key={milestone.id} style={[styles.itemCard, !milestone.is_active && styles.itemCardInactive]}>
                    <View style={styles.itemHeader}>
                      <View style={[styles.itemBadge, milestone.is_completed && styles.itemBadgeCompleted]}>
                        <Text style={[styles.itemBadgeText, milestone.is_completed && styles.itemBadgeTextCompleted]}>
                          {milestone.milestone_date}
                        </Text>
                        {milestone.is_completed && <Check size={12} color="#10B981" style={{ marginLeft: 4 }} />}
                      </View>
                      <View style={styles.itemActions}>
                        <TouchableOpacity onPress={() => toggleMilestoneStatus(milestone)} style={styles.statusBtn}>
                          <View style={[styles.statusDot, milestone.is_active && styles.statusDotActive]} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => openEditMilestoneModal(milestone)} style={styles.actionBtn}>
                          <Edit2 size={16} color="#6B7280" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => deleteMilestone(milestone.id)} style={styles.actionBtn}>
                          <Trash2 size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text style={styles.itemTitle}>{milestone.title}</Text>
                    {milestone.description && (
                      <Text style={styles.itemDescription} numberOfLines={2}>{milestone.description}</Text>
                    )}
                    <Text style={styles.sortOrderText}>Order: {milestone.sort_order}</Text>
                  </View>
                ))
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* Activity Modal */}
      <Modal visible={showActivityModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowActivityModal(false)} style={styles.modalCloseBtn}>
              <X size={24} color="#111" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editingActivity ? 'Edit Activity' : 'Add Activity'}</Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.inputLabel}>Title *</Text>
            <TextInput
              style={styles.input}
              value={activityTitle}
              onChangeText={setActivityTitle}
              placeholder="Enter activity title"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={activityDescription}
              onChangeText={setActivityDescription}
              placeholder="Enter activity description"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
            />

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Month</Text>
                <View style={styles.selectContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {MONTHS.map((month) => (
                      <TouchableOpacity
                        key={month}
                        style={[styles.selectOption, activityMonth === month && styles.selectOptionActive]}
                        onPress={() => setActivityMonth(month)}
                      >
                        <Text style={[styles.selectOptionText, activityMonth === month && styles.selectOptionTextActive]}>
                          {month}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Year</Text>
                <View style={styles.selectContainer}>
                  {YEARS.map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={[styles.selectOption, activityYear === year && styles.selectOptionActive]}
                      onPress={() => setActivityYear(year)}
                    >
                      <Text style={[styles.selectOptionText, activityYear === year && styles.selectOptionTextActive]}>
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <Text style={styles.inputLabel}>Sort Order</Text>
            <TextInput
              style={styles.input}
              value={activitySortOrder}
              onChangeText={setActivitySortOrder}
              placeholder="1"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
            />

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={saveActivity}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveBtnText}>{editingActivity ? 'Update Activity' : 'Create Activity'}</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Milestone Modal */}
      <Modal visible={showMilestoneModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowMilestoneModal(false)} style={styles.modalCloseBtn}>
              <X size={24} color="#111" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editingMilestone ? 'Edit Milestone' : 'Add Milestone'}</Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.inputLabel}>Title *</Text>
            <TextInput
              style={styles.input}
              value={milestoneTitle}
              onChangeText={setMilestoneTitle}
              placeholder="Enter milestone title"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={milestoneDescription}
              onChangeText={setMilestoneDescription}
              placeholder="Enter milestone description"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
            />

            <Text style={styles.inputLabel}>Date (e.g., Q1 2026, Q2 2026, 2027)</Text>
            <TextInput
              style={styles.input}
              value={milestoneDate}
              onChangeText={setMilestoneDate}
              placeholder="Q1 2026"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.inputLabel}>Sort Order</Text>
            <TextInput
              style={styles.input}
              value={milestoneSortOrder}
              onChangeText={setMilestoneSortOrder}
              placeholder="1"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
            />

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setMilestoneCompleted(!milestoneCompleted)}
            >
              <View style={[styles.checkbox, milestoneCompleted && styles.checkboxChecked]}>
                {milestoneCompleted && <Check size={14} color="#FFFFFF" />}
              </View>
              <Text style={styles.checkboxLabel}>Mark as completed</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={saveMilestone}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveBtnText}>{editingMilestone ? 'Update Milestone' : 'Create Milestone'}</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  tabsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  tabActive: {
    backgroundColor: COLORS.tabBar,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.tabBarActive,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#9CA3AF',
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  itemCardInactive: {
    opacity: 0.5,
    backgroundColor: '#F9FAFB',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  itemBadgeCompleted: {
    backgroundColor: '#ECFDF5',
  },
  itemBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.tabBarActive,
  },
  itemBadgeTextCompleted: {
    color: '#10B981',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBtn: {
    padding: 4,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D1D5DB',
  },
  statusDotActive: {
    backgroundColor: '#10B981',
  },
  actionBtn: {
    padding: 4,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  sortOrderText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  selectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  selectOptionActive: {
    backgroundColor: COLORS.tabBar,
  },
  selectOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  selectOptionTextActive: {
    color: '#FFFFFF',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  checkboxLabel: {
    fontSize: 15,
    color: '#374151',
  },
  saveBtn: {
    backgroundColor: COLORS.tabBarActive,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
