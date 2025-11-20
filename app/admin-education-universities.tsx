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
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Search, Edit, Trash2, GraduationCap, MapPin, Globe, Phone, Mail } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface University {
  id: string;
  name: string;
  description: string;
  price: string;
  image_url: string | null;
  category_name: string;
  is_approved: boolean;
  created_at: string;
  location?: string;
  website_url?: string;
  contact_email?: string;
  contact_phone?: string;
  programs_offered?: string;
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

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [programsOffered, setProgramsOffered] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Check admin access
  useEffect(() => {
    if (profile === null) {
      return;
    }
    
    if (!profile?.is_admin) {
      Alert.alert('Access Denied', 'You do not have permission to access this page.');
      router.back();
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
    setName(university.name);
    setDescription(university.description || '');
    setLocation(university.location || '');
    setWebsiteUrl(university.website_url || '');
    setContactEmail(university.contact_email || '');
    setContactPhone(university.contact_phone || '');
    setProgramsOffered(university.programs_offered || '');
    setImageUrl(university.image_url || '');
    setEditingUniversity(university);
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setLocation('');
    setWebsiteUrl('');
    setContactEmail('');
    setContactPhone('');
    setProgramsOffered('');
    setImageUrl('');
    setEditingUniversity(null);
    setCreatingUniversity(false);
  };

  const handleSaveUniversity = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'University name is required.');
      return;
    }

    try {
      const universityData = {
        user_id: editingUniversity?.user_id || profile!.id,
        title: name.trim(),
        name: name.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        website_url: websiteUrl.trim() || null,
        contact_email: contactEmail.trim() || null,
        phone: contactPhone.trim() || null,
        programs_offered: programsOffered.trim() ? [programsOffered.trim()] : null,
        image_url: imageUrl.trim() || null,
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
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
            <ActivityIndicator size="large" color="#4169E1" />
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
              {university.image_url && (
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

            <ScrollView style={styles.modalBody}>
              <Text style={styles.formLabel}>University Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g., University of Ghana"
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.formLabel}>Location</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g., Accra, Ghana"
                value={location}
                onChangeText={setLocation}
              />

              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                placeholder="Brief description of the university..."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
              />

              <Text style={styles.formLabel}>Website URL</Text>
              <TextInput
                style={styles.formInput}
                placeholder="https://..."
                value={websiteUrl}
                onChangeText={setWebsiteUrl}
                autoCapitalize="none"
              />

              <Text style={styles.formLabel}>Contact Email</Text>
              <TextInput
                style={styles.formInput}
                placeholder="admissions@university.edu"
                value={contactEmail}
                onChangeText={setContactEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.formLabel}>Contact Phone</Text>
              <TextInput
                style={styles.formInput}
                placeholder="+233 XX XXX XXXX"
                value={contactPhone}
                onChangeText={setContactPhone}
                keyboardType="phone-pad"
              />

              <Text style={styles.formLabel}>Programs Offered</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                placeholder="List of programs or faculties..."
                value={programsOffered}
                onChangeText={setProgramsOffered}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.formLabel}>Image URL</Text>
              <TextInput
                style={styles.formInput}
                placeholder="https://..."
                value={imageUrl}
                onChangeText={setImageUrl}
                autoCapitalize="none"
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
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
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
