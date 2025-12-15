import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';
import {
  ArrowLeft,
  Plus,
  Search,
  Edit2,
  Trash2,
  FileText,
  File,
  FileSpreadsheet,
  Calendar,
  User,
  Eye,
  Download,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface Document {
  id: string;
  title: string;
  description: string | null;
  category: string;
  file_name: string;
  file_url: string;
  file_size: number;
  upload_date: string;
  uploader_name: string;
  uploader_title: string | null;
  is_public: boolean;
  is_approved: boolean;
  view_count: number;
  download_count: number;
}

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    filterDocuments();
  }, [searchQuery, documents]);

  const loadDocuments = async () => {
    try {
      console.log('[Load] Starting to load documents...');
      console.log('[Load] Current user:', user?.id);
      setLoading(true);

      const { data, error } = await supabase
        .from('secretariat_documents')
        .select('*')
        .order('upload_date', { ascending: false });

      console.log('[Load] Database response:', { 
        dataCount: data?.length, 
        error: error,
        firstDoc: data?.[0]?.id 
      });

      if (error) {
        console.error('[Load] Error fetching documents:', error);
        throw error;
      }

      if (data) {
        console.log('[Load] Successfully loaded', data.length, 'documents');
        console.log('[Load] Document IDs:', data.map(d => d.id));
        setDocuments(data);
      }
    } catch (error) {
      console.error('[Load] Fatal error loading documents:', error);
      Alert.alert('Error', 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDocuments();
    setRefreshing(false);
  };

  const filterDocuments = () => {
    if (searchQuery.trim() === '') {
      setFilteredDocuments(documents);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = documents.filter(
      (doc) =>
        doc.title.toLowerCase().includes(query) ||
        doc.description?.toLowerCase().includes(query) ||
        doc.category.toLowerCase().includes(query) ||
        doc.uploader_name.toLowerCase().includes(query)
    );
    setFilteredDocuments(filtered);
  };

  const handleDeleteDocument = async (documentId: string, fileName: string) => {
    console.log('[Delete] Starting delete process for document:', documentId);
    console.log('[Delete] File name:', fileName);
    
    Alert.alert(
      'Delete Document',
      'Are you sure you want to delete this document? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('[Delete] User confirmed deletion');
              setDeletingId(documentId);

              // Delete file from storage
              const filePath = fileName.split('/').pop();
              console.log('[Delete] Extracted file path:', filePath);
              
              if (filePath) {
                console.log('[Delete] Attempting to delete from storage...');
                const { data: storageData, error: storageError } = await supabase.storage
                  .from('chat-media')
                  .remove([`documents/${filePath}`]);

                if (storageError) {
                  console.error('[Delete] Storage error:', storageError);
                  console.error('[Delete] Storage error details:', JSON.stringify(storageError, null, 2));
                } else {
                  console.log('[Delete] Storage deletion successful:', storageData);
                }
              }

              // Delete document record from database
              console.log('[Delete] Attempting to delete from database...');
              console.log('[Delete] Document ID to delete:', documentId);
              console.log('[Delete] Current user ID:', user?.id);
              
              const { data: deleteData, error: dbError } = await supabase
                .from('secretariat_documents')
                .delete()
                .eq('id', documentId);

              console.log('[Delete] Database delete response:', { data: deleteData, error: dbError });

              if (dbError) {
                console.error('[Delete] Database error:', dbError);
                console.error('[Delete] Error code:', dbError.code);
                console.error('[Delete] Error message:', dbError.message);
                console.error('[Delete] Error details:', JSON.stringify(dbError, null, 2));
                throw dbError;
              }

              console.log('[Delete] Database deletion successful');
              console.log('[Delete] Reloading documents...');
              
              await loadDocuments();
              
              console.log('[Delete] Documents reloaded, deletion complete');
              Alert.alert('Success', 'Document deleted successfully');
            } catch (error: any) {
              console.error('[Delete] Fatal error during deletion:', error);
              console.error('[Delete] Error name:', error?.name);
              console.error('[Delete] Error message:', error?.message);
              console.error('[Delete] Full error:', JSON.stringify(error, null, 2));
              Alert.alert('Error', `Failed to delete document: ${error?.message || 'Unknown error'}`);
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const getDocumentIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (ext === 'pdf') return FileText;
    if (['doc', 'docx'].includes(ext)) return File;
    if (['xls', 'xlsx', 'csv'].includes(ext)) return FileSpreadsheet;
    return File;
  };

  const getDocumentIconColor = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (ext === 'pdf') return '#EF4444';
    if (['doc', 'docx'].includes(ext)) return '#3B82F6';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return '#10B981';
    return '#ffc857';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffc857" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#1a1a1a', '#2d2d2d']} style={styles.header}>
        <View style={styles.headerTop}>
          <DebouncedTouchable onPress={() => debouncedRouter.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </DebouncedTouchable>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <DebouncedTouchable 
            onPress={() => debouncedRouter.push('/secretariat/documents/upload')}
            style={styles.addButton}
          >
            <Plus size={24} color="#FFFFFF" />
          </DebouncedTouchable>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search documents..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearButton}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{documents.length}</Text>
            <Text style={styles.statLabel}>Total Documents</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {documents.filter((d) => d.is_public).length}
            </Text>
            <Text style={styles.statLabel}>Public</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {documents.filter((d) => !d.is_public).length}
            </Text>
            <Text style={styles.statLabel}>Private</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Documents List */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#ffc857']}
            tintColor="#ffc857"
          />
        }
      >
        {filteredDocuments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FileText size={64} color="#CCCCCC" />
            <Text style={styles.emptyTitle}>No Documents Found</Text>
            <Text style={styles.emptyText}>
              {searchQuery
                ? 'Try a different search term'
                : 'Upload your first document to get started'}
            </Text>
          </View>
        ) : (
          filteredDocuments.map((document) => {
            const IconComponent = getDocumentIcon(document.file_name);
            const iconColor = getDocumentIconColor(document.file_name);

            return (
              <View key={document.id} style={styles.documentCard}>
                {/* Document Info */}
                <View style={styles.documentMain}>
                  <View style={styles.documentIcon}>
                    <IconComponent size={32} color={iconColor} />
                  </View>

                  <View style={styles.documentDetails}>
                    {/* Status Badge */}
                    <View style={styles.badges}>
                      <View
                        style={[
                          styles.statusBadge,
                          document.is_public
                            ? styles.statusPublic
                            : styles.statusPrivate,
                        ]}
                      >
                        <Text style={styles.statusBadgeText}>
                          {document.is_public ? 'Public' : 'Private'}
                        </Text>
                      </View>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>
                          {document.category}
                        </Text>
                      </View>
                    </View>

                    {/* Title */}
                    <Text style={styles.documentTitle} numberOfLines={2}>
                      {document.title}
                    </Text>

                    {/* Description */}
                    {document.description && (
                      <Text style={styles.documentDescription} numberOfLines={2}>
                        {document.description}
                      </Text>
                    )}

                    {/* Metadata */}
                    <View style={styles.metadata}>
                      <View style={styles.metaItem}>
                        <User size={14} color="#666" />
                        <Text style={styles.metaText}>
                          {document.uploader_name}
                        </Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Calendar size={14} color="#666" />
                        <Text style={styles.metaText}>
                          {formatDate(document.upload_date)}
                        </Text>
                      </View>
                    </View>

                    {/* Stats */}
                    <View style={styles.statsRow}>
                      <View style={styles.statItem}>
                        <Eye size={14} color="#666" />
                        <Text style={styles.statText}>{document.view_count} views</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Download size={14} color="#666" />
                        <Text style={styles.statText}>
                          {document.download_count} downloads
                        </Text>
                      </View>
                      <Text style={styles.statText}>
                        {formatFileSize(document.file_size)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actions}>
                  <DebouncedTouchable
                    style={styles.actionButton}
                    onPress={() =>
                      debouncedRouter.push(`/secretariat/documents/edit/${document.id}`)
                    }
                  >
                    <Edit2 size={20} color="#ffc857" />
                    <Text style={styles.actionButtonText}>Edit</Text>
                  </DebouncedTouchable>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() =>
                      handleDeleteDocument(document.id, document.file_url)
                    }
                    disabled={deletingId === document.id}
                  >
                    {deletingId === document.id ? (
                      <ActivityIndicator size="small" color="#EF4444" />
                    ) : (
                      <>
                        <Trash2 size={20} color="#EF4444" />
                        <Text style={[styles.actionButtonText, styles.deleteText]}>
                          Delete
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffc857',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#FFFFFF',
  },
  clearButton: {
    color: '#ffc857',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffc857',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#CCCCCC',
  },
  content: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F5F5F5',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  documentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  documentMain: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  documentIcon: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  documentDetails: {
    flex: 1,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusPublic: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  statusPrivate: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#000000',
  },
  categoryBadge: {
    backgroundColor: 'rgba(255, 200, 87, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffc857',
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 5,
  },
  documentDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  metadata: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 12,
    color: '#666',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statText: {
    fontSize: 12,
    color: '#666',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 15,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 200, 87, 0.1)',
    paddingVertical: 12,
    borderRadius: 8,
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffc857',
  },
  deleteText: {
    color: '#EF4444',
  },
});
