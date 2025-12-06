import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import {
  ArrowLeft,
  FileText,
  Download,
  Eye,
  Edit3,
  Trash2,
  Calendar,
  File,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface Document {
  id: string;
  title: string;
  description: string;
  category: string;
  document_type: string;
  file_url: string;
  file_name: string;
  file_size: number;
  uploader_name: string;
  upload_date: string;
  download_count: number;
  view_count: number;
  is_approved: boolean;
  is_public: boolean;
  created_at: string;
}

export default function MyDocumentsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMyDocuments();
  }, [user?.id]);

  const loadMyDocuments = async () => {
    if (!user) return;

    try {
      setLoading(true);
      console.log('[My Documents] Loading documents for user:', user.id);

      const { data, error } = await supabase
        .from('secretariat_documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[My Documents] Error loading documents:', error);
        throw error;
      }

      console.log('[My Documents] Loaded documents:', data?.length || 0);
      setDocuments(data || []);
    } catch (error) {
      console.error('[My Documents] Error:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to load your documents. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to load your documents. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    const confirmDelete = () => {
      return new Promise<boolean>((resolve) => {
        if (Platform.OS === 'web') {
          const confirmed = window.confirm(
            `Are you sure you want to delete "${title}"?\n\nThis action cannot be undone.`
          );
          resolve(confirmed);
        } else {
          Alert.alert(
            'Delete Document',
            `Are you sure you want to delete "${title}"?\n\nThis action cannot be undone.`,
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => resolve(false),
              },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => resolve(true),
              },
            ]
          );
        }
      });
    };

    const confirmed = await confirmDelete();
    if (!confirmed) return;

    try {
      console.log('[My Documents] Deleting document:', id);

      const { error } = await supabase
        .from('secretariat_documents')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id); // Security: only delete own documents

      if (error) throw error;

      console.log('[My Documents] Document deleted successfully');

      if (Platform.OS === 'web') {
        window.alert('✓ Document deleted successfully!');
      } else {
        Alert.alert('Success', '✓ Document deleted successfully!');
      }

      // Reload documents
      loadMyDocuments();
    } catch (error) {
      console.error('[My Documents] Error deleting document:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to delete document. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to delete document. Please try again.');
      }
    }
  };

  const handleEdit = (id: string) => {
    debouncedRouter.push(`/secretariat/documents/edit/${id}`);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (doc: Document) => {
    if (!doc.is_approved) {
      return (
        <View style={[styles.statusBadge, styles.statusPending]}>
          <Clock size={12} color="#F59E0B" />
          <Text style={styles.statusText}>Pending Review</Text>
        </View>
      );
    }
    if (doc.is_public && doc.is_approved) {
      return (
        <View style={[styles.statusBadge, styles.statusPublished]}>
          <CheckCircle size={12} color="#10B981" />
          <Text style={styles.statusText}>Published</Text>
        </View>
      );
    }
    return (
      <View style={[styles.statusBadge, styles.statusDraft]}>
        <XCircle size={12} color="#6B7280" />
        <Text style={styles.statusText}>Draft</Text>
      </View>
    );
  };

  const getFileIcon = (fileType: string) => {
    const type = fileType.toLowerCase();
    if (type.includes('pdf')) return <FileText size={20} color="#EF4444" />;
    if (type.includes('doc')) return <FileText size={20} color="#3B82F6" />;
    if (type.includes('xls') || type.includes('sheet')) return <FileText size={20} color="#10B981" />;
    return <File size={20} color="#6B7280" />;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#4169E1', '#5B7FE8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => debouncedRouter.push('/secretariat/documents')} style={styles.backButton}>
              <ArrowLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.title}>My Documents</Text>
            </View>
            <View style={styles.placeholder} />
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4169E1" />
          <Text style={styles.loadingText}>Loading your documents...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#4169E1', '#5B7FE8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => debouncedRouter.push('/secretariat/documents')} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>My Documents</Text>
            <Text style={styles.subtitle}>{documents.length} documents</Text>
          </View>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {documents.length === 0 ? (
          <View style={styles.emptyState}>
            <FileText size={64} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Documents Yet</Text>
            <Text style={styles.emptyText}>
              Documents you upload will appear here.{'\n'}
              You can edit or delete them anytime.
            </Text>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => debouncedRouter.push('/secretariat/documents/upload')}
            >
              <Text style={styles.uploadButtonText}>Upload Document</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.documentList}>
            {documents.map((doc) => (
              <View key={doc.id} style={styles.documentCard}>
                {/* Header Row */}
                <View style={styles.cardHeader}>
                  <View style={styles.fileIconContainer}>
                    {getFileIcon(doc.document_type)}
                  </View>
                  {getStatusBadge(doc)}
                </View>

                {/* Title and Category */}
                <TouchableOpacity onPress={() => debouncedRouter.push(`/secretariat/documents/${doc.id}`)}>
                  <Text style={styles.documentTitle}>{doc.title}</Text>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{doc.category}</Text>
                  </View>
                </TouchableOpacity>

                {/* Description */}
                {doc.description && (
                  <Text style={styles.documentDescription} numberOfLines={2}>
                    {doc.description}
                  </Text>
                )}

                {/* File Info */}
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName}>{doc.file_name}</Text>
                  <Text style={styles.fileSize}>{formatFileSize(doc.file_size)}</Text>
                </View>

                {/* Stats */}
                <View style={styles.stats}>
                  <View style={styles.stat}>
                    <Eye size={14} color="#666" />
                    <Text style={styles.statText}>{doc.view_count || 0} views</Text>
                  </View>
                  <View style={styles.stat}>
                    <Download size={14} color="#666" />
                    <Text style={styles.statText}>{doc.download_count || 0} downloads</Text>
                  </View>
                  <View style={styles.stat}>
                    <Calendar size={14} color="#666" />
                    <Text style={styles.statText}>{formatDate(doc.created_at)}</Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => handleEdit(doc.id)}
                  >
                    <Edit3 size={18} color="#4169E1" />
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(doc.id, doc.title)}
                  >
                    <Trash2 size={18} color="#EF4444" />
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 2,
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  uploadButton: {
    backgroundColor: '#4169E1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  documentList: {
    padding: 16,
    gap: 16,
  },
  documentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  fileIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPublished: {
    backgroundColor: '#D1FAE5',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusDraft: {
    backgroundColor: '#F3F4F6',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  documentTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E4EAFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4169E1',
  },
  documentDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 12,
  },
  fileName: {
    fontSize: 13,
    color: '#1A1A1A',
    fontWeight: '500',
    flex: 1,
  },
  fileSize: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  stats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#666',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#E4EAFF',
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
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
});
