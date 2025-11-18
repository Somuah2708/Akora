import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Clock, Plus, Trash2, Check } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

interface TimeSlot {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface AvailabilityCalendarProps {
  mentorId: string;
  editable?: boolean;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00',
];

export default function AvailabilityCalendar({ mentorId, editable = false }: AvailabilityCalendarProps) {
  const [availability, setAvailability] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');

  useEffect(() => {
    fetchAvailability();
  }, [mentorId]);

  const fetchAvailability = async () => {
    try {
      const { data, error } = await supabase
        .from('mentor_availability_slots')
        .select('*')
        .eq('mentor_id', mentorId)
        .eq('is_recurring', true)
        .order('day_of_week')
        .order('start_time');

      if (error) throw error;
      setAvailability(data || []);
    } catch (error) {
      console.error('Error fetching availability:', error);
      Alert.alert('Error', 'Failed to load availability');
    } finally {
      setLoading(false);
    }
  };

  const addTimeSlot = async () => {
    if (selectedDay === null) {
      Alert.alert('Error', 'Please select a day');
      return;
    }

    if (startTime >= endTime) {
      Alert.alert('Error', 'End time must be after start time');
      return;
    }

    try {
      setSaving(true);
      const { data, error} = await supabase
        .from('mentor_availability_slots')
        .insert({
          mentor_id: mentorId,
          day_of_week: selectedDay,
          start_time: startTime,
          end_time: endTime,
          is_recurring: true,
          is_available: true,
        })
        .select()
        .single();

      if (error) throw error;

      setAvailability([...availability, data]);
      setSelectedDay(null);
      Alert.alert('Success', 'Availability slot added!');
    } catch (error) {
      console.error('Error adding slot:', error);
      Alert.alert('Error', 'Failed to add availability slot');
    } finally {
      setSaving(false);
    }
  };

  const deleteTimeSlot = async (slotId: string) => {
    try {
      const { error } = await supabase
        .from('mentor_availability_slots')
        .delete()
        .eq('id', slotId);

      if (error) throw error;

      setAvailability(availability.filter(slot => slot.id !== slotId));
      Alert.alert('Success', 'Availability slot removed');
    } catch (error) {
      console.error('Error deleting slot:', error);
      Alert.alert('Error', 'Failed to remove slot');
    }
  };

  const toggleSlotAvailability = async (slot: TimeSlot) => {
    if (!slot.id) return;

    try {
      const { error } = await supabase
        .from('mentor_availability_slots')
        .update({ is_available: !slot.is_available })
        .eq('id', slot.id);

      if (error) throw error;

      setAvailability(availability.map(s => 
        s.id === slot.id ? { ...s, is_available: !s.is_available } : s
      ));
    } catch (error) {
      console.error('Error toggling slot:', error);
      Alert.alert('Error', 'Failed to update slot');
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getDaySlots = (dayOfWeek: number) => {
    return availability.filter(slot => slot.day_of_week === dayOfWeek);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading availability...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Clock size={24} color="#4169E1" />
        <Text style={styles.title}>
          {editable ? 'Manage Your Availability' : 'Available Time Slots'}
        </Text>
      </View>

      {editable && (
        <View style={styles.addSection}>
          <Text style={styles.sectionTitle}>Add New Time Slot</Text>
          
          {/* Day Selection */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daysScroll}>
            {DAYS_OF_WEEK.map((day) => (
              <TouchableOpacity
                key={day.value}
                style={[styles.dayChip, selectedDay === day.value && styles.dayChipSelected]}
                onPress={() => setSelectedDay(day.value)}
              >
                <Text style={[styles.dayChipText, selectedDay === day.value && styles.dayChipTextSelected]}>
                  {day.short}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Time Selection */}
          <View style={styles.timeRow}>
            <View style={styles.timeInput}>
              <Text style={styles.timeLabel}>Start Time</Text>
              <ScrollView style={styles.timePicker} nestedScrollEnabled>
                {TIME_SLOTS.map((time) => (
                  <TouchableOpacity
                    key={`start-${time}`}
                    style={[styles.timeOption, startTime === time && styles.timeOptionSelected]}
                    onPress={() => setStartTime(time)}
                  >
                    <Text style={[styles.timeOptionText, startTime === time && styles.timeOptionTextSelected]}>
                      {formatTime(time)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.timeInput}>
              <Text style={styles.timeLabel}>End Time</Text>
              <ScrollView style={styles.timePicker} nestedScrollEnabled>
                {TIME_SLOTS.map((time) => (
                  <TouchableOpacity
                    key={`end-${time}`}
                    style={[styles.timeOption, endTime === time && styles.timeOptionSelected]}
                    onPress={() => setEndTime(time)}
                  >
                    <Text style={[styles.timeOptionText, endTime === time && styles.timeOptionTextSelected]}>
                      {formatTime(time)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.addButton, saving && styles.addButtonDisabled]}
            onPress={addTimeSlot}
            disabled={saving}
          >
            <Plus size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>{saving ? 'Adding...' : 'Add Time Slot'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Current Availability */}
      <View style={styles.currentSection}>
        <Text style={styles.sectionTitle}>
          {editable ? 'Your Current Availability' : 'Available Times'}
        </Text>
        
        {DAYS_OF_WEEK.map((day) => {
          const daySlots = getDaySlots(day.value);
          if (daySlots.length === 0 && !editable) return null;

          return (
            <View key={day.value} style={styles.daySection}>
              <Text style={styles.dayLabel}>{day.label}</Text>
              {daySlots.length > 0 ? (
                daySlots.map((slot, idx) => (
                  <View
                    key={slot.id || idx}
                    style={[styles.slotCard, !slot.is_available && styles.slotCardUnavailable]}
                  >
                    <View style={styles.slotInfo}>
                      <Clock size={16} color={slot.is_available ? '#10B981' : '#9CA3AF'} />
                      <Text style={[styles.slotTime, !slot.is_available && styles.slotTimeUnavailable]}>
                        {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                      </Text>
                      {!slot.is_available && (
                        <View style={styles.unavailableBadge}>
                          <Text style={styles.unavailableBadgeText}>Unavailable</Text>
                        </View>
                      )}
                    </View>
                    {editable && (
                      <View style={styles.slotActions}>
                        <TouchableOpacity
                          style={styles.toggleButton}
                          onPress={() => toggleSlotAvailability(slot)}
                        >
                          <Check size={18} color={slot.is_available ? '#10B981' : '#9CA3AF'} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => {
                            Alert.alert(
                              'Delete Slot',
                              'Are you sure you want to remove this time slot?',
                              [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Delete', style: 'destructive', onPress: () => deleteTimeSlot(slot.id!) },
                              ]
                            );
                          }}
                        >
                          <Trash2 size={18} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))
              ) : (
                <Text style={styles.noSlotsText}>No availability set</Text>
              )}
            </View>
          );
        })}

        {availability.length === 0 && (
          <View style={styles.emptyState}>
            <Clock size={48} color="#D1D5DB" />
            <Text style={styles.emptyStateText}>
              {editable ? 'No availability set yet. Add your first time slot above!' : 'No availability published'}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  addSection: {
    padding: 20,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  currentSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 16,
  },
  daysScroll: {
    marginBottom: 16,
  },
  dayChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  dayChipSelected: {
    backgroundColor: '#4169E1',
    borderColor: '#4169E1',
  },
  dayChipText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  dayChipTextSelected: {
    color: '#FFFFFF',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  timeInput: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    marginBottom: 8,
  },
  timePicker: {
    maxHeight: 150,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  timeOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  timeOptionSelected: {
    backgroundColor: '#EEF2FF',
  },
  timeOptionText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#1F2937',
  },
  timeOptionTextSelected: {
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4169E1',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  daySection: {
    marginBottom: 20,
  },
  dayLabel: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#4B5563',
    marginBottom: 10,
  },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  slotCardUnavailable: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  slotInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  slotTime: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#047857',
  },
  slotTimeUnavailable: {
    color: '#6B7280',
  },
  unavailableBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  unavailableBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#DC2626',
  },
  slotActions: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  noSlotsText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 40,
  },
});
