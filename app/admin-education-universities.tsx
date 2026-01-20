import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, Plus, Search, Edit, Trash2, GraduationCap, MapPin, Globe, Phone, Mail, Upload, X, Calendar, Users, BookOpen } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { pickMedia, uploadMedia } from '@/lib/media';

interface University {
  id: string;
  title: string;
  name: string;
  description: string;
  image_url: string | null;
  is_approved: boolean;
  created_at: string;
  // Location
  location?: string;
  country?: string;
  city?: string;
  address?: string;
  // Contact
  website_url?: string;
  contact_email?: string;
  phone?: string;
  // Academic
  programs_offered?: string[];
  accreditation?: string;
  ranking?: number;
  // Admission
  admission_requirements?: string;
  application_deadline?: string;
  tuition_fees?: string;
  // Additional
  established_year?: number;
  student_population?: number;
  campus_size?: string;
  is_featured?: boolean;
  view_count?: number;
}

export default function AdminEducationUniversitiesScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUniversity, setEditingUniversity] = useState<University | null>(null);
  const [creatingUniversity, setCreatingUniversity] = useState(false);

  // Form states - Basic
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageUri, setImageUri] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Location
  const [location, setLocation] = useState('');
  const [country, setCountry] = useState('');
  const [address, setAddress] = useState('');
  
  // Contact
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Check admin access
  useEffect(() => {
    if (profile === null) {
      return;
    }
    
    if (!profile?.is_admin) {
      Alert.alert('Access Denied', 'You do not have permission to access this page.');
      debouncedRouter.back();
    }
  }, [profile, router]);

  useEffect(() => {
    fetchUniversities();
  }, []);

  const fetchUniversities = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('universities')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUniversities(data || []);
    } catch (error) {
      console.error('Error fetching universities:', error);
      Alert.alert('Error', 'Failed to load universities.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUniversities();
    setRefreshing(false);
  };

  const openCreateModal = () => {
    resetForm();
    setCreatingUniversity(true);
  };

  const openEditModal = (university: University) => {
    // Basic
    setTitle(university.title || university.name);
    setDescription(university.description || '');
    setImageUrl(university.image_url || '');
    setImageUri(university.image_url || '');
    
    // Location
    setLocation(university.location || '');
    setCountry(university.country || '');
    setAddress(university.address || '');
    
    // Contact
    setWebsiteUrl(university.website_url || '');
    setContactEmail(university.contact_email || '');
    setPhone(university.phone || '');
    
    setEditingUniversity(university);
  };

  const resetForm = () => {
    // Basic
    setTitle('');
    setDescription('');
    setImageUrl('');
    setImageUri('');
    
    // Location
    setLocation('');
    setCountry('');
    setAddress('');
    
    // Contact
    setWebsiteUrl('');
    setContactEmail('');
    setPhone('');
    
    setEditingUniversity(null);
    setCreatingUniversity(false);
  };

  const handlePickImage = async () => {
    if (!profile?.id) return;
    
    const asset = await pickMedia();
    if (asset) {
      setImageUri(asset.uri);
      setUploadingImage(true);
      const publicUrl = await uploadMedia(asset.uri, profile.id, 'image', asset.fileName, asset.mimeType);
      setUploadingImage(false);
      
      if (publicUrl) {
        setImageUrl(publicUrl);
      } else {
        setImageUri('');
      }
    }
  };

  const handleRemoveImage = () => {
    setImageUri('');
    setImageUrl('');
  };

  const handleSaveUniversity = async () => {
    if (!title.trim()) {
      Alert.alert('Validation Error', 'University name/title is required.');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Validation Error', 'Description is required.');
      return;
    }

    try {
      const universityData = {
        user_id: editingUniversity?.user_id || profile!.id,
        title: title.trim(),
        name: title.trim(), // Keep name same as title for compatibility
        description: description.trim(),
        image_url: imageUrl.trim() || null,
        
        // Location
        location: location.trim() || null,
        country: country.trim() || null,
        address: address.trim() || null,
        
        // Contact
        website_url: websiteUrl.trim() && (websiteUrl.trim().startsWith('http://') || websiteUrl.trim().startsWith('https://')) ? websiteUrl.trim() : null,
        contact_email: contactEmail.trim() || null,
        phone: phone.trim() || null,
        
        is_approved: true,
      };

      if (editingUniversity) {
        // Update existing university
        const { error } = await supabase
          .from('universities')
          .update(universityData)
          .eq('id', editingUniversity.id);

        if (error) throw error;
        Alert.alert('Success', 'University updated successfully!');
      } else {
        // Create new university
        const { error } = await supabase
          .from('universities')
          .insert([universityData]);

        if (error) throw error;
        Alert.alert('Success', 'University created successfully!');
      }

      resetForm();
      fetchUniversities();
    } catch (error: any) {
      console.error('Error saving university:', error);
      Alert.alert('Error', error.message || 'Failed to save university.');
    }
  };

  const handleDeleteUniversity = (university: University) => {
    Alert.alert(
      'Delete University',
      `Are you sure you want to delete "${university.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('universities')
                .delete()
                .eq('id', university.id);

              if (error) throw error;
              Alert.alert('Success', 'University deleted successfully!');
              fetchUniversities();
            } catch (error: any) {
              console.error('Error deleting university:', error);
              Alert.alert('Error', error.message || 'Failed to delete university.');
            }
          },
        },
      ]
    );
  };

  const filteredUniversities = universities.filter((university) =>
    (university.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (university.location || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (university.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Manage Universities</Text>
          <Text style={styles.headerSubtitle}>{universities.length} total</Text>
        </View>
        <TouchableOpacity onPress={openCreateModal} style={styles.addButton}>
          <Plus size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#64748B" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search universities..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Universities List */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0F172A" />
            <Text style={styles.loadingText}>Loading universities...</Text>
          </View>
        ) : filteredUniversities.length === 0 ? (
          <View style={styles.emptyContainer}>
            <GraduationCap size={64} color="#CBD5E1" />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No universities found' : 'No universities yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try a different search term' : 'Create your first university'}
            </Text>
          </View>
        ) : (
          filteredUniversities.map((university) => (
            <View key={university.id} style={styles.universityCard}>
              {university.image_url && university.image_url.trim() !== '' && (university.image_url.startsWith('http://') || university.image_url.startsWith('https://')) && (
                <Image
                  source={{ uri: university.image_url }}
                  style={styles.universityImage}
                />
              )}
              <View style={styles.universityContent}>
                <Text style={styles.universityName}>{university.name}</Text>
                {university.location && (
                  <View style={styles.locationRow}>
                    <MapPin size={14} color="#64748B" />
                    <Text style={styles.locationText}>{university.location}</Text>
                  </View>
                )}
                {university.description && (
                  <Text style={styles.universityDescription} numberOfLines={2}>
                    {university.description}
                  </Text>
                )}
                
                <View style={styles.universityMeta}>
                  {university.website_url && (
                    <View style={styles.metaItem}>
                      <Globe size={14} color="#4169E1" />
                      <Text style={styles.metaText}>Website</Text>
                    </View>
                  )}
                  {university.contact_email && (
                    <View style={styles.metaItem}>
                      <Mail size={14} color="#10B981" />
                      <Text style={styles.metaText}>Email</Text>
                    </View>
                  )}
                  {university.contact_phone && (
                    <View style={styles.metaItem}>
                      <Phone size={14} color="#F59E0B" />
                      <Text style={styles.metaText}>Phone</Text>
                    </View>
                  )}
                </View>

                <View style={styles.universityActions}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => openEditModal(university)}
                  >
                    <Edit size={16} color="#4169E1" />
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteUniversity(university)}
                  >
                    <Trash2 size={16} color="#EF4444" />
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal
        visible={creatingUniversity || !!editingUniversity}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingUniversity ? 'Edit University' : 'Create University'}
              </Text>
              <TouchableOpacity onPress={resetForm}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* BASIC INFORMATION */}
              <Text style={styles.sectionHeader}>Basic Information</Text>
              
              <Text style={styles.formLabel}>University Name/Title *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g., University of Ghana"
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.formLabel}>Description *</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                placeholder="Brief description of the university..."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
              />

              {/* Image Upload */}
              <Text style={styles.formLabel}>University Image</Text>
              {imageUri ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                  <TouchableOpacity 
                    style={styles.removeImageButton}
                    onPress={handleRemoveImage}
                  >
                    <X size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={handlePickImage}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <ActivityIndicator size="small" color="#0F172A" />
                  ) : (
                    <>
                      <Upload size={20} color="#4169E1" />
                      <Text style={styles.uploadButtonText}>Upload Image</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {/* LOCATION INFORMATION */}
              <Text style={styles.sectionHeader}>Location</Text>
              
              <Text style={styles.formLabel}>Location/City</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g., Accra"
                value={location}
                onChangeText={setLocation}
              />

              <Text style={styles.formLabel}>Country</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g., Ghana"
                value={country}
                onChangeText={setCountry}
              />

              <Text style={styles.formLabel}>Address</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g., Legon, Accra"
                value={address}
                onChangeText={setAddress}
              />

              {/* CONTACT INFORMATION */}
              <Text style={styles.sectionHeader}>Contact Information</Text>
              
              <Text style={styles.formLabel}>Website URL</Text>
              <TextInput
                style={styles.formInput}
                placeholder="https://www.university.edu.gh"
                value={websiteUrl}
                onChangeText={setWebsiteUrl}
                autoCapitalize="none"
              />

              <Text style={styles.formLabel}>Contact Email</Text>
              <TextInput
                style={styles.formInput}
                placeholder="admissions@university.edu.gh"
                value={contactEmail}
                onChangeText={setContactEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.formLabel}>Phone</Text>
              <TextInput
                style={styles.formInput}
                placeholder="+233 XX XXX XXXX"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveUniversity}
              >
                <Text style={styles.saveButtonText}>
                  {editingUniversity ? 'Update University' : 'Create University'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={resetForm}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  addButton: {
    backgroundColor: '#4169E1',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: '#0F172A',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#475569',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
  },
  universityCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  universityImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#F1F5F9',
  },
  universityContent: {
    padding: 16,
  },
  universityName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#64748B',
  },
  universityDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 12,
  },
  universityMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: '#475569',
  },
  universityActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    paddingVertical: 10,
    borderRadius: 10,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4169E1',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    paddingVertical: 10,
    borderRadius: 10,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalClose: {
    fontSize: 28,
    color: '#94A3B8',
    fontWeight: '300',
  },
  modalBody: {
    padding: 20,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 20,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#4169E1',
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
  },
  formHint: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
    fontStyle: 'italic',
  },
  formInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#EEF2FF',
    borderWidth: 2,
    borderColor: '#4169E1',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 20,
    marginTop: 8,
  },
  uploadButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4169E1',
  },
  imagePreviewContainer: {
    position: 'relative',
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#EF4444',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  saveButton: {
    backgroundColor: '#4169E1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
});
