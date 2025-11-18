import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Calendar, Clock, X, Check, Video } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface BookingCalendarProps {
  visible: boolean;
  onClose: () => void;
  mentorId: string;
  mentorName: string;
  requestId: string;
}

interface TimeSlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_booked: boolean;
}

export default function BookingCalendar({
  visible,
  onClose,
  mentorId,
  mentorName,
  requestId,
}: BookingCalendarProps) {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [meetingLink, setMeetingLink] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(false);

  // Generate next 14 days
  const getNextTwoWeeks = () => {
    const dates: Date[] = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const dates = getNextTwoWeeks();

  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots(selectedDate);
    }
  }, [selectedDate]);

  const fetchAvailableSlots = async (date: Date) => {
    try {
      setLoading(true);
      const dayOfWeek = date.getDay();
      const dateString = date.toISOString().split('T')[0];

      const { data, error } = await supabase
        .rpc('get_mentor_weekly_availability', {
          p_mentor_id: mentorId,
          p_week_start_date: dateString,
        });

      if (error) throw error;

      // Filter for the selected day
      const daySlots = data?.filter((slot: any) => slot.day_of_week === dayOfWeek) || [];
      setAvailableSlots(daySlots);
    } catch (error) {
      console.error('Error fetching slots:', error);
      Alert.alert('Error', 'Failed to load available time slots');
    } finally {
      setLoading(false);
    }
  };

  const handleBookSlot = async () => {
    if (!selectedDate || !selectedSlot || !user) {
      Alert.alert('Error', 'Please select a date and time slot');
      return;
    }

    try {
      setBooking(true);
      const dateString = selectedDate.toISOString().split('T')[0];

      const { data, error } = await supabase
        .rpc('create_session_booking', {
          p_request_id: requestId,
          p_mentor_id: mentorId,
          p_mentee_id: user.id,
          p_session_date: dateString,
          p_start_time: selectedSlot.start_time,
          p_end_time: selectedSlot.end_time,
          p_meeting_link: meetingLink || null,
          p_notes: notes || null,
        });

      if (error) throw error;

      Alert.alert(
        'Success!',
        `Your session with ${mentorName} has been scheduled for ${formatDate(selectedDate)} at ${formatTime(selectedSlot.start_time)}`,
        [
          {
            text: 'OK',
            onPress: () => {
              onClose();
              // Reset form
              setSelectedDate(null);
              setSelectedSlot(null);
              setMeetingLink('');
              setNotes('');
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error booking session:', error);
      Alert.alert(
        'Booking Failed',
        error.message || 'Failed to book session. Please try again.'
      );
    } finally {
      setBooking(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getDayName = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Calendar size={24} color="#4169E1" />
              <View>
                <Text style={styles.title}>Schedule Session</Text>
                <Text style={styles.subtitle}>with {mentorName}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Date Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select a Date</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.datesScroll}>
                {dates.map((date, index) => {
                  const isSelected = selectedDate?.toDateString() === date.toDateString();
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.dateCard,
                        isSelected && styles.dateCardSelected,
                        isToday(date) && styles.dateCardToday,
                      ]}
                      onPress={() => setSelectedDate(date)}
                    >
                      <Text style={[styles.dateDayName, isSelected && styles.dateDayNameSelected]}>
                        {getDayName(date)}
                      </Text>
                      <Text style={[styles.dateDay, isSelected && styles.dateDaySelected]}>
                        {date.getDate()}
                      </Text>
                      <Text style={[styles.dateMonth, isSelected && styles.dateMonthSelected]}>
                        {date.toLocaleDateString('en-US', { month: 'short' })}
                      </Text>
                      {isToday(date) && <View style={styles.todayDot} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Time Slots */}
            {selectedDate && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Available Time Slots</Text>
                {loading ? (
                  <Text style={styles.loadingText}>Loading available times...</Text>
                ) : availableSlots.length > 0 ? (
                  <View style={styles.slotsGrid}>
                    {availableSlots.map((slot) => {
                      const isSelected = selectedSlot?.id === slot.id;
                      return (
                        <TouchableOpacity
                          key={slot.id}
                          style={[
                            styles.slotCard,
                            isSelected && styles.slotCardSelected,
                            slot.is_booked && styles.slotCardBooked,
                          ]}
                          onPress={() => !slot.is_booked && setSelectedSlot(slot)}
                          disabled={slot.is_booked}
                        >
                          <Clock size={16} color={slot.is_booked ? '#9CA3AF' : isSelected ? '#FFFFFF' : '#4169E1'} />
                          <Text style={[styles.slotTime, isSelected && styles.slotTimeSelected, slot.is_booked && styles.slotTimeBooked]}>
                            {formatTime(slot.start_time)}
                          </Text>
                          {slot.is_booked && (
                            <Text style={styles.bookedLabel}>Booked</Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <Clock size={48} color="#D1D5DB" />
                    <Text style={styles.emptyStateText}>No available time slots for this day</Text>
                  </View>
                )}
              </View>
            )}

            {/* Session Details */}
            {selectedSlot && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Session Details</Text>
                
                <View style={styles.inputGroup}>
                  <View style={styles.inputLabel}>
                    <Video size={18} color="#4169E1" />
                    <Text style={styles.inputLabelText}>Meeting Link (Optional)</Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Zoom, Google Meet link"
                    placeholderTextColor="#9CA3AF"
                    value={meetingLink}
                    onChangeText={setMeetingLink}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabelText}>Notes (Optional)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Add any additional notes or topics you'd like to discuss..."
                    placeholderTextColor="#9CA3AF"
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          {selectedSlot && (
            <View style={styles.footer}>
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Calendar size={16} color="#6B7280" />
                  <Text style={styles.summaryText}>
                    {selectedDate && formatDate(selectedDate)}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Clock size={16} color="#6B7280" />
                  <Text style={styles.summaryText}>
                    {formatTime(selectedSlot.start_time)} - {formatTime(selectedSlot.end_time)}
                  </Text>
                </View>
              </View>
              
              <TouchableOpacity
                style={[styles.bookButton, booking && styles.bookButtonDisabled]}
                onPress={handleBookSlot}
                disabled={booking}
              >
                <Check size={20} color="#FFFFFF" />
                <Text style={styles.bookButtonText}>
                  {booking ? 'Booking...' : 'Confirm Booking'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
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
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 12,
  },
  datesScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  dateCard: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    marginRight: 12,
    minWidth: 70,
  },
  dateCardSelected: {
    backgroundColor: '#4169E1',
    borderColor: '#4169E1',
  },
  dateCardToday: {
    borderColor: '#10B981',
  },
  dateDayName: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    marginBottom: 4,
  },
  dateDayNameSelected: {
    color: '#DBEAFE',
  },
  dateDay: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  dateDaySelected: {
    color: '#FFFFFF',
  },
  dateMonth: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginTop: 2,
  },
  dateMonthSelected: {
    color: '#DBEAFE',
  },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginTop: 4,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 20,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    minWidth: 110,
  },
  slotCardSelected: {
    backgroundColor: '#4169E1',
    borderColor: '#4169E1',
  },
  slotCardBooked: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    opacity: 0.6,
  },
  slotTime: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  slotTimeSelected: {
    color: '#FFFFFF',
  },
  slotTimeBooked: {
    color: '#9CA3AF',
  },
  bookedLabel: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
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
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  inputLabelText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  input: {
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
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  summaryCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  bookButtonDisabled: {
    opacity: 0.6,
  },
  bookButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});
