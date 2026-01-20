import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Image, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, Plus, XCircle, Upload, Calendar } from 'lucide-react-native';
import { Video } from 'expo-av';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { pickMedia, uploadMedia } from '@/lib/media';

export default function EditEventScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const eventId = params.id as string;
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form fields (same model as create-event)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [galleryUrls, setGalleryUrls] = useState<{ url: string; type: 'image' | 'video' }[]>([]);
  const [organizerName, setOrganizerName] = useState('');
  const [organizerEmail, setOrganizerEmail] = useState('');
  const [organizerPhone, setOrganizerPhone] = useState('');
  const [capacity, setCapacity] = useState('');
  const [registrationUrl, setRegistrationUrl] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'alumni_only'>('public');
  const [isDateTBA, setIsDateTBA] = useState(false);

  useEffect(() => {
    if (eventId && user?.id) {
      loadEventData();
    }
  }, [eventId, user?.id]);

  const loadEventData = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('secretariat_events')
        .select('*')
        .eq('id', eventId)
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;

      if (!data) {
        Alert.alert('Error', 'Event not found');
        debouncedRouter.back();
        return;
      }

      setTitle(data.title || '');
      setDescription(data.description || '');
      setLocation(data.location || '');
      setDate(data.date === 'TBA' ? '' : (data.date || ''));
      setIsDateTBA(!data.date || data.date === 'TBA');
      if (data.time && data.time !== 'TBA') {
        const [start, end] = (data.time as string).split(' - ');
        setStartTime(start || '');
        setEndTime(end || '');
      } else {
        setStartTime('');
        setEndTime('');
      }
      setBannerUrl(data.banner_url || null);
      setVideoUrl(data.video_url || null);
      if (Array.isArray(data.gallery_urls) && data.gallery_urls.length > 0) {
        setGalleryUrls(data.gallery_urls.map((url: string) => ({ url, type: 'image' })));
      }
      setOrganizerName(data.organizer || '');
      setOrganizerEmail(data.organizer_email || data.contact_email || '');
      setOrganizerPhone(data.organizer_phone || data.contact_phone || '');
      setCapacity(data.capacity ? String(data.capacity) : '');
      setRegistrationUrl(data.registration_url || '');
      if (data.visibility === 'alumni_only' || data.visibility === 'public') {
        setVisibility(data.visibility);
      }
    } catch (error: any) {
      console.error('Error loading event:', error);
      Alert.alert('Error', 'Failed to load event');
      debouncedRouter.back();
    } finally {
      setLoading(false);
    }
  };

  const onPickBanner = async () => {
    if (!user) {
      Alert.alert('Sign in required');
      return;
    }
    const asset = await pickMedia();
    if (!asset) return;
    const url = await uploadMedia(asset.uri, user.id, 'image', (asset as any).fileName || null, (asset as any).mimeType || null);
    if (url) setBannerUrl(url);
  };

  const onPickVideo = async () => {
    if (!user) {
      Alert.alert('Sign in required');
      return;
    }
    const asset = await pickMedia();
    if (!asset) return;
    const url = await uploadMedia(asset.uri, user.id, 'video', (asset as any).fileName || null, (asset as any).mimeType || null);
    if (url) setVideoUrl(url);
  };

  const onAddGalleryImage = async () => {
    if (!user) {
      Alert.alert('Sign in required');
      return;
    }
    const asset = await pickMedia();
    if (!asset) return;
    const type = (asset as any).type?.startsWith('video') || (asset as any).duration ? 'video' : 'image';
    const url = await uploadMedia(asset.uri, user.id, type, (asset as any).fileName || null, (asset as any).mimeType || null);
    if (url) setGalleryUrls(prev => [...prev, { url, type }]);
  };

  const removeGalleryItem = (index: number) => {
    setGalleryUrls(galleryUrls.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title?.trim()) {
      Alert.alert('Missing Information', 'Please enter an event title');
      return;
    }
    if (!description?.trim()) {
      Alert.alert('Missing Information', 'Please enter an event description');
      return;
    }
    if (!location?.trim()) {
      Alert.alert('Missing Information', 'Please enter a venue location');
      return;
    }
    if (!isDateTBA && !date?.trim()) {
      Alert.alert('Missing Information', 'Please enter the event date or mark it as To Be Announced');
      return;
    }
    if (!startTime?.trim() && !isDateTBA) {
      Alert.alert('Missing Information', 'Please enter the start time');
      return;
    }

    try {
      setSubmitting(true);

      const isAdmin = profile?.is_admin || profile?.role === 'admin';

      const { error } = await supabase
        .from('secretariat_events')
        .update({
          title: title.trim(),
          description: description.trim(),
          location: location.trim(),
          date: isDateTBA ? 'TBA' : date.trim(),
          time: isDateTBA ? 'TBA' : startTime.trim() + (endTime ? ` - ${endTime.trim()}` : ''),
          organizer: organizerName.trim() || profile?.full_name || 'OAA',
          banner_url: bannerUrl,
          video_url: videoUrl,
          gallery_urls: galleryUrls.length > 0 ? galleryUrls.map(g => g.url) : null,
          organizer_email: organizerEmail.trim() || profile?.email || undefined,
          organizer_phone: organizerPhone.trim() || undefined,
          registration_url: registrationUrl.trim() || undefined,
          capacity: capacity ? parseInt(capacity) : undefined,
          visibility: visibility,
          contact_email: organizerEmail.trim() || profile?.email || 'info@akora.com',
          contact_phone: organizerPhone.trim() || '0000000000',
          is_approved: isAdmin ? true : undefined,
        })
        .eq('id', eventId)
        .eq('user_id', user?.id);

      if (error) throw error;

      Alert.alert('Success', 'Event updated successfully!', [
        {
          text: 'OK',
          onPress: () => debouncedRouter.push('/secretariat/my-events'),
        },
      ]);
    } catch (error: any) {
      console.error('Error updating event:', error);
      Alert.alert('Error', error.message || 'Failed to update event');
    } finally {
      setSubmitting(false);
    }
  };

  const isAdmin = profile?.is_admin || profile?.role === 'admin';

  if (loading) {
    return (
      <View style={[{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }]}>
        <ActivityIndicator size="large" color="#0F172A" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Event</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Form */}
      <ScrollView 
        style={styles.formScroll} 
        contentContainerStyle={styles.formScrollContent} 
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formBox}>
          {/* Required Fields */}
          <Text style={styles.sectionLabel}>Required Information</Text>
          <TextInput 
            value={title} 
            onChangeText={setTitle} 
            placeholder="Event title *" 
            placeholderTextColor="#9CA3AF" 
            style={styles.input} 
          />
          <TextInput 
            value={description} 
            onChangeText={setDescription} 
            placeholder="Event description *" 
            placeholderTextColor="#9CA3AF" 
            style={[styles.input, { height: 90 }]} 
            multiline 
          />
          <TextInput 
            value={location} 
            onChangeText={setLocation} 
            placeholder="Venue location *" 
            placeholderTextColor="#9CA3AF" 
            style={styles.input} 
          />
          
          {/* Date Field / TBA Toggle */}
          <Text style={styles.sectionLabel}>Date & Time</Text>
          <View style={styles.tbaRow}>
            <View style={{ flex: 1 }}>
              <View style={[styles.dateInputContainer, isDateTBA && { opacity: 0.4 }]}> 
                <Calendar size={20} color="#4169E1" style={styles.dateIcon} />
                <TextInput 
                  value={date} 
                  onChangeText={setDate} 
                  placeholder="YYYY-MM-DD (e.g., 2025-12-20)" 
                  placeholderTextColor="#9CA3AF" 
                  style={styles.dateInput} 
                  editable={!isDateTBA}
                />
              </View>
            </View>
            <TouchableOpacity 
              style={[styles.tbaToggle, isDateTBA && styles.tbaToggleActive]} 
              onPress={() => {
                const next = !isDateTBA;
                setIsDateTBA(next);
                if (next) {
                  setDate('');
                  setStartTime('');
                  setEndTime('');
                }
              }}
            >
              <View style={[styles.tbaCircle, isDateTBA && styles.tbaCircleActive]} />
              <Text style={[styles.tbaLabel, isDateTBA && styles.tbaLabelActive]}>Date TBA</Text>
            </TouchableOpacity>
          </View>

          {!isDateTBA && (
            <Text style={styles.formatHint}>
              Format: YYYY-MM-DD — for example, 2025-12-20
            </Text>
          )}
          
          <TextInput 
            value={startTime} 
            onChangeText={setStartTime} 
            placeholder="Start time (e.g., 18:00 or 6:00 PM)" 
            placeholderTextColor="#9CA3AF" 
            style={styles.input} 
            editable={!isDateTBA}
          />
          <TextInput 
            value={endTime} 
            onChangeText={setEndTime} 
            placeholder="End time (optional)" 
            placeholderTextColor="#9CA3AF" 
            style={styles.input} 
            editable={!isDateTBA}
          />
          
          {/* Organizer Details */}
          <Text style={styles.sectionLabel}>Organizer Details</Text>
          <TextInput 
            value={organizerName} 
            onChangeText={setOrganizerName} 
            placeholder="Organizer name" 
            placeholderTextColor="#9CA3AF" 
            style={styles.input} 
          />
          <TextInput 
            value={organizerEmail} 
            onChangeText={setOrganizerEmail} 
            placeholder="Contact email" 
            placeholderTextColor="#9CA3AF" 
            style={styles.input} 
            keyboardType="email-address" 
            autoCapitalize="none"
          />
          <TextInput 
            value={organizerPhone} 
            onChangeText={setOrganizerPhone} 
            placeholder="Contact phone" 
            placeholderTextColor="#9CA3AF" 
            style={styles.input} 
            keyboardType="phone-pad"
          />

          {/* Event Media */}
          <Text style={styles.sectionLabel}>Event Media</Text>
          
          {/* Banner Image */}
          <Text style={styles.fieldLabel}>Event Banner</Text>
          {bannerUrl ? (
            <View style={styles.mediaPreview}>
              <Image source={{ uri: bannerUrl }} style={styles.bannerPreview} />
              <TouchableOpacity style={styles.removeMedia} onPress={() => setBannerUrl(null)}>
                <XCircle size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.uploadButton} onPress={onPickBanner}>
              <Upload size={20} color="#4169E1" />
              <Text style={styles.uploadButtonText}>Upload Banner Image</Text>
            </TouchableOpacity>
          )}

          {/* Promo Video */}
          <Text style={styles.fieldLabel}>Promo Video (Optional)</Text>
          {videoUrl ? (
            <View style={styles.mediaPreview}>
              <Video
                source={{ uri: videoUrl }}
                style={styles.videoPreview}
                useNativeControls
                resizeMode="contain"
              />
              <TouchableOpacity style={styles.removeMedia} onPress={() => setVideoUrl(null)}>
                <XCircle size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.uploadButton} onPress={onPickVideo}>
              <Upload size={20} color="#4169E1" />
              <Text style={styles.uploadButtonText}>Upload Promo Video</Text>
            </TouchableOpacity>
          )}

          {/* Media Gallery */}
          <Text style={styles.fieldLabel}>Media Gallery</Text>
          {galleryUrls.map((item, idx) => (
            <View key={idx} style={styles.mediaPreview}>
              {item.type === 'video' ? (
                <Video source={{ uri: item.url }} style={styles.galleryPreview} useNativeControls resizeMode="contain" />
              ) : (
                <Image source={{ uri: item.url }} style={styles.galleryPreview} />
              )}
              <TouchableOpacity style={styles.removeMedia} onPress={() => removeGalleryItem(idx)}>
                <XCircle size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.uploadButton} onPress={onAddGalleryImage}>
            <Plus size={20} color="#4169E1" />
            <Text style={styles.uploadButtonText}>Add to Gallery</Text>
          </TouchableOpacity>

          {/* Additional Details */}
          <Text style={styles.sectionLabel}>Additional Details</Text>
          <TextInput 
            value={capacity} 
            onChangeText={setCapacity} 
            placeholder="Event capacity (optional)" 
            placeholderTextColor="#9CA3AF" 
            style={styles.input} 
            keyboardType="numeric"
          />
          <TextInput 
            value={registrationUrl} 
            onChangeText={setRegistrationUrl} 
            placeholder="Registration URL (optional)" 
            placeholderTextColor="#9CA3AF" 
            style={styles.input} 
            keyboardType="url"
            autoCapitalize="none"
          />

          {/* Visibility */}
          <Text style={styles.sectionLabel}>Event Visibility</Text>
          <View style={styles.visibilityRow}>
            <TouchableOpacity 
              style={[styles.visibilityButton, visibility === 'public' && styles.visibilityButtonActive]} 
              onPress={() => setVisibility('public')}
            >
              <Text style={[styles.visibilityText, visibility === 'public' && styles.visibilityTextActive]}>Public</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.visibilityButton, visibility === 'alumni_only' && styles.visibilityButtonActive]} 
              onPress={() => setVisibility('alumni_only')}
            >
              <Text style={[styles.visibilityText, visibility === 'alumni_only' && styles.visibilityTextActive]}>Alumni Only</Text>
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
          <TouchableOpacity 
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]} 
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Update Event</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  formScroll: {
    flex: 1,
  },
  formScrollContent: {
    padding: 16,
  },
  formBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 4,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tbaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
  },
  dateIcon: {
    marginRight: 8,
  },
  dateInput: {
    flex: 1,
    padding: 12,
    fontSize: 15,
    color: '#111827',
  },
  tbaToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  tbaToggleActive: {
    backgroundColor: '#4169E1',
    borderColor: '#4169E1',
  },
  tbaCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    backgroundColor: '#FFFFFF',
  },
  tbaCircleActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  tbaLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  tbaLabelActive: {
    color: '#FFFFFF',
  },
  formatHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 4,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderStyle: 'dashed',
  },
  uploadButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4169E1',
  },
  mediaPreview: {
    position: 'relative',
    marginVertical: 8,
  },
  bannerPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  videoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  galleryPreview: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  removeMedia: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  visibilityRow: {
    flexDirection: 'row',
    gap: 12,
  },
  visibilityButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  visibilityButtonActive: {
    backgroundColor: '#4169E1',
    borderColor: '#4169E1',
  },
  visibilityText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  visibilityTextActive: {
    color: '#FFFFFF',
  },
  submitButton: {
    backgroundColor: '#4169E1',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
