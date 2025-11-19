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
import { ArrowLeft, Plus, Search, Edit, Trash2, Award, DollarSign, Calendar, Globe, ExternalLink } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface Scholarship {
  id: string;
  name: string;
  description: string;
  price: string;
  image_url: string | null;
  category_name: string;
  is_approved: boolean;
  created_at: string;
  deadline?: string;
  website_url?: string;
  eligibility?: string;
  amount?: string;
}

export default function AdminEducationScholarshipsScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingScholarship, setEditingScholarship] = useState<Scholarship | null>(null);
  const [creatingScholarship, setCreatingScholarship] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [eligibility, setEligibility] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    checkAdminAccess();
    fetchScholarships();
  }, []);

  const checkAdminAccess = async () => {
    if (!user) {
      Alert.alert('Access Denied', 'You must be logged in to access this page.');
      router.back();
      return;
    }

    const { data } = await supabase
      .from('profiles')
      .select('is_admin, role')
      .eq('id', user.id)
      .single();

    if (!data?.is_admin && data?.role !== 'admin') {
      Alert.alert('Access Denied', 'You need admin privileges to access this page.');
      router.back();
    }
  };

  const fetchScholarships = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products_services')
        .select('*')
        .eq('category_name', 'Scholarships')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setScholarships(data || []);
    } catch (error) {
      console.error('Error fetching scholarships:', error);
      Alert.alert('Error', 'Failed to load scholarships.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchScholarships();
    setRefreshing(false);
  };

  const openCreateModal = () => {
    resetForm();
    setCreatingScholarship(true);
  };

  const openEditModal = (scholarship: Scholarship) => {
    setName(scholarship.name);
    setDescription(scholarship.description || '');
    setAmount(scholarship.amount || scholarship.price || '');
    setDeadline(scholarship.deadline || '');
    setWebsiteUrl(scholarship.website_url || '');
    setEligibility(scholarship.eligibility || '');
    setImageUrl(scholarship.image_url || '');
    setEditingScholarship(scholarship);
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setAmount('');
    setDeadline('');
    setWebsiteUrl('');
    setEligibility('');
    setImageUrl('');
    setEditingScholarship(null);
    setCreatingScholarship(false);
  };

  const handleSaveScholarship = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Scholarship name is required.');
      return;
    }

    try {
      const scholarshipData = {
        name: name.trim(),
        description: description.trim() || null,
        price: amount.trim() || '0',
        amount: amount.trim() || null,
        deadline: deadline.trim() || null,
        website_url: websiteUrl.trim() || null,
        eligibility: eligibility.trim() || null,
        image_url: imageUrl.trim() || null,
        category_name: 'Scholarships',
        is_approved: true,
      };

      if (editingScholarship) {
        // Update existing scholarship
        const { error } = await supabase
          .from('products_services')
          .update(scholarshipData)
          .eq('id', editingScholarship.id);

        if (error) throw error;
        Alert.alert('Success', 'Scholarship updated successfully!');
      } else {
        // Create new scholarship
        const { error } = await supabase
          .from('products_services')
          .insert([scholarshipData]);

        if (error) throw error;
        Alert.alert('Success', 'Scholarship created successfully!');
      }

      resetForm();
      fetchScholarships();
    } catch (error: any) {
      console.error('Error saving scholarship:', error);
      Alert.alert('Error', error.message || 'Failed to save scholarship.');
    }
  };

  const handleDeleteScholarship = (scholarship: Scholarship) => {
    Alert.alert(
      'Delete Scholarship',
      `Are you sure you want to delete "${scholarship.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('products_services')
                .delete()
                .eq('id', scholarship.id);

              if (error) throw error;
              Alert.alert('Success', 'Scholarship deleted successfully!');
              fetchScholarships();
            } catch (error: any) {
              console.error('Error deleting scholarship:', error);
              Alert.alert('Error', error.message || 'Failed to delete scholarship.');
            }
          },
        },
      ]
    );
  };

  const filteredScholarships = scholarships.filter((scholarship) =>
    scholarship.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (scholarship.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Manage Scholarships</Text>
          <Text style={styles.headerSubtitle}>{scholarships.length} total</Text>
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
          placeholder="Search scholarships..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Scholarships List */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4169E1" />
            <Text style={styles.loadingText}>Loading scholarships...</Text>
          </View>
        ) : filteredScholarships.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Award size={64} color="#CBD5E1" />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No scholarships found' : 'No scholarships yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try a different search term' : 'Create your first scholarship'}
            </Text>
          </View>
        ) : (
          filteredScholarships.map((scholarship) => (
            <View key={scholarship.id} style={styles.scholarshipCard}>
              {scholarship.image_url && (
                <Image
                  source={{ uri: scholarship.image_url }}
                  style={styles.scholarshipImage}
                />
              )}
              <View style={styles.scholarshipContent}>
                <Text style={styles.scholarshipName}>{scholarship.name}</Text>
                {scholarship.description && (
                  <Text style={styles.scholarshipDescription} numberOfLines={2}>
                    {scholarship.description}
                  </Text>
                )}
                
                <View style={styles.scholarshipMeta}>
                  {scholarship.amount && (
                    <View style={styles.metaItem}>
                      <DollarSign size={14} color="#10B981" />
                      <Text style={styles.metaText}>{scholarship.amount}</Text>
                    </View>
                  )}
                  {scholarship.deadline && (
                    <View style={styles.metaItem}>
                      <Calendar size={14} color="#F59E0B" />
                      <Text style={styles.metaText}>{scholarship.deadline}</Text>
                    </View>
                  )}
                  {scholarship.website_url && (
                    <View style={styles.metaItem}>
                      <Globe size={14} color="#4169E1" />
                      <Text style={styles.metaText}>Website</Text>
                    </View>
                  )}
                </View>

                <View style={styles.scholarshipActions}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => openEditModal(scholarship)}
                  >
                    <Edit size={16} color="#4169E1" />
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteScholarship(scholarship)}
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
        visible={creatingScholarship || !!editingScholarship}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingScholarship ? 'Edit Scholarship' : 'Create Scholarship'}
              </Text>
              <TouchableOpacity onPress={resetForm}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.formLabel}>Scholarship Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g., MasterCard Foundation Scholarship"
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                placeholder="Brief description of the scholarship..."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
              />

              <Text style={styles.formLabel}>Amount</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g., $10,000 per year"
                value={amount}
                onChangeText={setAmount}
              />

              <Text style={styles.formLabel}>Deadline</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g., June 30, 2025"
                value={deadline}
                onChangeText={setDeadline}
              />

              <Text style={styles.formLabel}>Website URL</Text>
              <TextInput
                style={styles.formInput}
                placeholder="https://..."
                value={websiteUrl}
                onChangeText={setWebsiteUrl}
                autoCapitalize="none"
              />

              <Text style={styles.formLabel}>Eligibility</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                placeholder="Who can apply for this scholarship?"
                value={eligibility}
                onChangeText={setEligibility}
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
                onPress={handleSaveScholarship}
              >
                <Text style={styles.saveButtonText}>
                  {editingScholarship ? 'Update Scholarship' : 'Create Scholarship'}
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
  scholarshipCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  scholarshipImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#F1F5F9',
  },
  scholarshipContent: {
    padding: 16,
  },
  scholarshipName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  scholarshipDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 12,
  },
  scholarshipMeta: {
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
  scholarshipActions: {
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
