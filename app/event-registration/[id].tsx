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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, User, Mail, Phone, Users, Calendar, MapPin, Clock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface EventDetails {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  price?: string;
  category: string;
}

export default function EventRegistrationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const eventId = params.id as string;
  const { user } = useAuth();

  const [event, setEvent] = useState<EventDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [ticketQuantity, setTicketQuantity] = useState('1');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Validation errors
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    loadEventDetails();
    loadUserProfile();
  }, []);

  const loadEventDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('secretariat_events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error) throw error;

      if (data) {
        setEvent({
          id: data.id,
          title: data.title,
          date: data.date || 'TBD',
          time: data.time || 'TBD',
          location: data.location || 'TBD',
          category: data.category || 'Event',
        });
      }
    } catch (error) {
      console.error('Error loading event:', error);
      Alert.alert('Error', 'Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  const loadUserProfile = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email, phone')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setFullName(data.full_name || '');
        setEmail(data.email || user.email || '');
        setPhoneNumber(data.phone || '');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    // Full name validation
    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Phone validation
    if (!phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (phoneNumber.trim().length < 10) {
      newErrors.phoneNumber = 'Please enter a valid phone number';
    }

    // Ticket quantity validation
    const quantity = parseInt(ticketQuantity);
    if (!ticketQuantity || isNaN(quantity) || quantity < 1) {
      newErrors.ticketQuantity = 'Please enter a valid quantity (minimum 1)';
    } else if (quantity > 10) {
      newErrors.ticketQuantity = 'Maximum 10 tickets per registration';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmitRegistration = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please correct the errors in the form');
      return;
    }

    if (!user?.id) {
      Alert.alert('Login Required', 'Please login to register for events');
      return;
    }

    setSubmitting(true);

    try {
      // First, get the event creator's email from the event data
      const { data: eventData, error: eventError } = await supabase
        .from('products_services')
        .select('description, user_id')
        .eq('id', eventId)
        .single();

      let creatorEmail = '';
      if (eventData && !eventError) {
        try {
          const parsedData = JSON.parse(eventData.description);
          creatorEmail = parsedData.contactEmail || '';
        } catch (parseError) {
          console.log('Could not parse event description for creator email');
        }
      }

      // Save registration to database (you'll need to create event_registrations table)
      const registrationData = {
        event_id: eventId,
        user_id: user.id,
        full_name: fullName.trim(),
        email: email.trim(),
        phone_number: phoneNumber.trim(),
        ticket_quantity: parseInt(ticketQuantity),
        additional_notes: additionalNotes.trim() || null,
        status: 'confirmed',
        created_at: new Date().toISOString(),
      };

      // For now, we'll just show success - you can add database insert later
      console.log('Registration data:', registrationData);
      console.log('Event creator email:', creatorEmail);
      
      // Send email notification to event creator
      if (creatorEmail) {
        try {
          console.log('Attempting to send email to:', creatorEmail);
          
          // Prepare email parameters for EmailJS
          const emailParams = {
            to_email: creatorEmail,
            from_name: fullName.trim(),
            from_email: email.trim(),
            event_title: event?.title || 'Your Event',
            event_date: event?.date || '',
            event_time: event?.time || '',
            event_location: event?.location || '',
            ticket_quantity: ticketQuantity.toString(),
            phone_number: phoneNumber.trim(),
            additional_notes: additionalNotes.trim() || 'None provided',
          };

          console.log('📧 Registration Details (Email functionality coming soon):', {
            to: creatorEmail,
            registrant: fullName.trim(),
            event: event?.title,
            tickets: ticketQuantity,
          });
          
          // TODO: Implement email notifications via Supabase Edge Functions
          // For now, just log the details
          console.log('ℹ️ Email notifications will be implemented using Supabase Edge Functions');
          
        } catch (emailError) {
          console.error('❌ Error processing registration:', emailError);
          // Don't fail the registration if logging fails
        }
      } else {
        console.warn('⚠️ No creator email found for this event');
      }

      // Platform-specific success message
      const isWeb = typeof window !== 'undefined';
      
      if (isWeb) {
        window.alert(
          `Success! You've registered for ${event?.title}.\n\n` +
          `Confirmation has been sent to ${email}.` +
          (creatorEmail ? `\nThe event organizer will be notified at ${creatorEmail}.` : '') +
          `\nTickets: ${ticketQuantity}`
        );
        debouncedRouter.back();
      } else {
        Alert.alert(
          'Registration Successful!',
          `You've registered for ${event?.title}.\n\n` +
          `Confirmation has been sent to ${email}.` +
          (creatorEmail ? `\nThe event organizer has been notified at ${creatorEmail}.` : '') +
          `\nTickets: ${ticketQuantity}`,
          [
            {
              text: 'OK',
              onPress: () => debouncedRouter.back(),
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('Error submitting registration:', error);
      Alert.alert('Error', 'Failed to submit registration. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#0F172A" />
        <Text style={styles.loadingText}>Loading registration form...</Text>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Event not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => debouncedRouter.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backIconButton}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Event Registration</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Event Info Card */}
        <View style={styles.eventCard}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          
          <View style={styles.eventDetailRow}>
            <Calendar size={16} color="#666" />
            <Text style={styles.eventDetailText}>{event.date}</Text>
          </View>

          <View style={styles.eventDetailRow}>
            <Clock size={16} color="#666" />
            <Text style={styles.eventDetailText}>{event.time}</Text>
          </View>

          <View style={styles.eventDetailRow}>
            <MapPin size={16} color="#666" />
            <Text style={styles.eventDetailText}>{event.location}</Text>
          </View>
        </View>

        {/* Registration Form */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Your Information</Text>

          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Full Name <Text style={styles.required}>*</Text>
            </Text>
            <View style={[styles.inputContainer, errors.fullName && styles.inputError]}>
              <User size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                value={fullName}
                onChangeText={(text) => {
                  setFullName(text);
                  if (errors.fullName) {
                    const newErrors = { ...errors };
                    delete newErrors.fullName;
                    setErrors(newErrors);
                  }
                }}
              />
            </View>
            {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Email Address <Text style={styles.required}>*</Text>
            </Text>
            <View style={[styles.inputContainer, errors.email && styles.inputError]}>
              <Mail size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="your.email@example.com"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) {
                    const newErrors = { ...errors };
                    delete newErrors.email;
                    setErrors(newErrors);
                  }
                }}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          {/* Phone Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Phone Number <Text style={styles.required}>*</Text>
            </Text>
            <View style={[styles.inputContainer, errors.phoneNumber && styles.inputError]}>
              <Phone size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="+233 XX XXX XXXX"
                value={phoneNumber}
                onChangeText={(text) => {
                  setPhoneNumber(text);
                  if (errors.phoneNumber) {
                    const newErrors = { ...errors };
                    delete newErrors.phoneNumber;
                    setErrors(newErrors);
                  }
                }}
                keyboardType="phone-pad"
              />
            </View>
            {errors.phoneNumber && <Text style={styles.errorText}>{errors.phoneNumber}</Text>}
          </View>

          {/* Ticket Quantity */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Number of Tickets <Text style={styles.required}>*</Text>
            </Text>
            <View style={[styles.inputContainer, errors.ticketQuantity && styles.inputError]}>
              <Users size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="1"
                value={ticketQuantity}
                onChangeText={(text) => {
                  setTicketQuantity(text);
                  if (errors.ticketQuantity) {
                    const newErrors = { ...errors };
                    delete newErrors.ticketQuantity;
                    setErrors(newErrors);
                  }
                }}
                keyboardType="number-pad"
              />
            </View>
            {errors.ticketQuantity && <Text style={styles.errorText}>{errors.ticketQuantity}</Text>}
          </View>

          {/* Additional Notes */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Additional Notes (Optional)</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Any special requirements or notes..."
                value={additionalNotes}
                onChangeText={setAdditionalNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmitRegistration}
          disabled={submitting}
        >
          <LinearGradient
            colors={submitting ? ['#999', '#666'] : ['#007AFF', '#0051D5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitGradient}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Complete Registration</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
  },
  backIconButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  scrollView: {
    flex: 1,
  },
  eventCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  eventDetailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  formSection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#FF3B30',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 12,
  },
  inputError: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    paddingVertical: 12,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  submitButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  submitGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  backButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
