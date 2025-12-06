import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Image, ActivityIndicator, Modal } from 'react-native';
import { useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, Plus, XCircle, Upload, Calendar } from 'lucide-react-native';
import { Video } from 'expo-av';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { pickMedia, uploadMedia } from '@/lib/media';

export default function CreateEventScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(''); // Event date (or empty when TBA)
  const [startTime, setStartTime] = useState(''); // e.g., 2025-12-20 18:00
  const [endTime, setEndTime] = useState('');
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [galleryUrls, setGalleryUrls] = useState<{ url: string; type: 'image' | 'video' }[]>([]);
  
  // Organizer Details
  const [organizerName, setOrganizerName] = useState('');
  const [organizerEmail, setOrganizerEmail] = useState('');
  const [organizerPhone, setOrganizerPhone] = useState('');
  
  // Event Details
  const [capacity, setCapacity] = useState('');
  const [registrationUrl, setRegistrationUrl] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'alumni_only'>('public');
  const [isDateTBA, setIsDateTBA] = useState(false);
  
  // Media picker handlers
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
    // Determine if it's a video or image from asset type
    const type = (asset as any).type?.startsWith('video') || (asset as any).duration ? 'video' : 'image';
    const url = await uploadMedia(asset.uri, user.id, type, (asset as any).fileName || null, (asset as any).mimeType || null);
    if (url) setGalleryUrls(prev => [...prev, { url, type }]);
  };

  const removeGalleryItem = (index: number) => {
    setGalleryUrls(galleryUrls.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    // Validation
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

      // Insert event into secretariat_events table
      const { data, error } = await supabase
        .from('secretariat_events')
        .insert({
          user_id: user?.id,
          title: title.trim(),
          description: description.trim(),
          location: location.trim(),
          date: isDateTBA ? 'TBA' : date.trim(),
          time: isDateTBA ? 'TBA' : startTime.trim() + (endTime ? ` - ${endTime.trim()}` : ''),
          organizer: organizerName.trim() || profile?.full_name || 'OAA',
          category: 'General',
          is_free: true,
          is_approved: isAdmin, // Auto-approve if admin
          view_count: 0,
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
        })
        .select()
        .single();

      if (error) throw error;

      Alert.alert(
        'Success',
        isAdmin ? 'Event created successfully!' : 'Event submitted for approval!',
        [
          {
            text: 'OK',
            onPress: () => debouncedRouter.back(),
          },
        ]
      );

    } catch (error: any) {
      console.error('Error creating event:', error);
      Alert.alert('Error', error.message || 'Failed to create event');
    } finally {
      setSubmitting(false);
    }
  };

  const isAdmin = profile?.is_admin || profile?.role === 'admin';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Event</Text>
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
            keyboardType="email-address" 
            autoCapitalize="none" 
            style={styles.input} 
          />
          <TextInput 
            value={organizerPhone} 
            onChangeText={setOrganizerPhone} 
            placeholder="Contact phone number" 
            placeholderTextColor="#9CA3AF" 
            keyboardType="phone-pad" 
            style={styles.input} 
          />
          
          {/* Event Details */}
          <Text style={styles.sectionLabel}>Event Details</Text>
          
          <TextInput 
            value={capacity} 
            onChangeText={setCapacity} 
            placeholder="Maximum capacity (leave empty for unlimited)" 
            placeholderTextColor="#9CA3AF" 
            keyboardType="number-pad" 
            style={styles.input} 
          />
          <Text style={styles.hintText}>Leave capacity empty for unlimited attendees</Text>
          <TextInput 
            value={registrationUrl} 
            onChangeText={setRegistrationUrl} 
            placeholder="Registration/Ticket URL (optional)" 
            placeholderTextColor="#9CA3AF" 
            autoCapitalize="none" 
            style={styles.input} 
          />
          
          {/* Event Banner */}
          <Text style={styles.sectionLabel}>Event Banner</Text>
          {bannerUrl ? (
            <View style={styles.mediaItem}>
              <Image source={{ uri: bannerUrl }} style={styles.mediaPreview} />
              <View style={styles.mediaItemInfo}>
                <Text style={styles.mediaItemType}>🖼️ Banner Image</Text>
                <Text style={styles.mediaItemUrl} numberOfLines={1}>{bannerUrl}</Text>
              </View>
              <TouchableOpacity onPress={() => setBannerUrl(null)} style={styles.removeBtn}>
                <XCircle size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={onPickBanner} style={styles.uploadBtn}>
              <Plus size={16} color="#4169E1" />
              <Text style={styles.uploadBtnText}>Upload Banner Image</Text>
            </TouchableOpacity>
          )}

          {/* Promo Video */}
          <Text style={styles.sectionLabel}>Promo Video</Text>
          {videoUrl ? (
            <View style={styles.mediaItem}>
              <Video 
                source={{ uri: videoUrl }} 
                style={styles.mediaPreview} 
                resizeMode="cover" 
                shouldPlay={false} 
              />
              <View style={styles.mediaItemInfo}>
                <Text style={styles.mediaItemType}>🎥 Promo Video</Text>
                <Text style={styles.mediaItemUrl} numberOfLines={1}>{videoUrl}</Text>
              </View>
              <TouchableOpacity onPress={() => setVideoUrl(null)} style={styles.removeBtn}>
                <XCircle size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={onPickVideo} style={styles.uploadBtn}>
              <Plus size={16} color="#4169E1" />
              <Text style={styles.uploadBtnText}>Upload Promo Video</Text>
            </TouchableOpacity>
          )}
          
          {/* Media Gallery */}
          <Text style={styles.sectionLabel}>Media Gallery (Images & Videos)</Text>
          <Text style={styles.hintText}>Add multiple images or videos to showcase your event.</Text>
          <TouchableOpacity onPress={onAddGalleryImage} style={styles.uploadBtn}>
            <Plus size={16} color="#4169E1" />
            <Text style={styles.uploadBtnText}>Add Image or Video</Text>
          </TouchableOpacity>
          
          {/* Gallery Items List */}
          {galleryUrls.length > 0 && (
            <View style={styles.galleryList}>
              {galleryUrls.map((item, index) => (
                <View key={index} style={styles.galleryListItem}>
                  <View style={styles.galleryPreview}>
                    {item.type === 'video' ? (
                      <Video 
                        source={{ uri: item.url }} 
                        style={styles.galleryPreviewMedia} 
                        resizeMode="cover" 
                        shouldPlay={false} 
                      />
                    ) : (
                      <Image source={{ uri: item.url }} style={styles.galleryPreviewMedia} />
                    )}
                  </View>
                  <View style={styles.galleryItemInfo}>
                    <Text style={styles.galleryItemType}>
                      {item.type === 'video' ? '🎥 Video' : '🖼️ Image'}
                    </Text>
                    <Text style={styles.galleryItemUrl} numberOfLines={1}>{item.url}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeGalleryItem(index)} style={styles.removeBtn}>
                    <XCircle size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Visibility */}
          <Text style={styles.sectionLabel}>Event Visibility</Text>
          <View style={styles.visibilityOptions}>
            <TouchableOpacity 
              style={[styles.visibilityOption, visibility === 'public' && styles.visibilityOptionActive]}
              onPress={() => setVisibility('public')}
            >
              <Text style={[styles.visibilityOptionText, visibility === 'public' && styles.visibilityOptionTextActive]}>
                Public
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.visibilityOption, visibility === 'alumni_only' && styles.visibilityOptionActive]}
              onPress={() => setVisibility('alumni_only')}
            >
              <Text style={[styles.visibilityOptionText, visibility === 'alumni_only' && styles.visibilityOptionTextActive]}>
                Alumni Only
              </Text>
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
          <TouchableOpacity 
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]} 
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Upload size={18} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>
                  {isAdmin ? 'Create Event' : 'Submit for Approval'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {!isAdmin && (
            <Text style={styles.approvalNote}>
              Your event will be reviewed by administrators before being published.
            </Text>
          )}
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
    paddingTop: 60,
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
    fontWeight: '600',
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
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateIcon: {
    marginRight: 8,
  },
  dateInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  hintText: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: -8,
  },
  formatHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 4,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  uploadBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4169E1',
  },
  mediaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  mediaPreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  mediaItemInfo: {
    flex: 1,
  },
  mediaItemType: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  mediaItemUrl: {
    fontSize: 11,
    color: '#6B7280',
  },
  removeBtn: {
    padding: 4,
  },
  galleryList: {
    gap: 12,
  },
  galleryListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  galleryPreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  galleryPreviewMedia: {
    width: '100%',
    height: '100%',
  },
  galleryItemInfo: {
    flex: 1,
  },
  galleryItemType: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  galleryItemUrl: {
    fontSize: 11,
    color: '#6B7280',
  },
  visibilityOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  visibilityOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
  },
  visibilityOptionActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#4169E1',
  },
  visibilityOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  visibilityOptionTextActive: {
    color: '#4169E1',
    fontWeight: '600',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4169E1',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    marginTop: 16,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  approvalNote: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
  tbaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  tbaToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  tbaToggleActive: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  tbaCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#9CA3AF',
    marginRight: 6,
  },
  tbaCircleActive: {
    borderColor: '#F59E0B',
    backgroundColor: '#F59E0B',
  },
  tbaLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  tbaLabelActive: {
    color: '#92400E',
  },
});
