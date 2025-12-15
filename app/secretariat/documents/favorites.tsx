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
  Calendar,
  File,
  Star,
  Folder,
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

export default function FavoritesScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFavoriteDocuments();
  }, [user?.id]);

  const loadFavoriteDocuments = async () => {
    if (!user) return;

    try {
      setLoading(true);
      console.log('[Favorites] Loading favorite documents for user:', user.id);

      // Get bookmarked document IDs
      const { data: bookmarks, error: bookmarksError } = await supabase
        .from('document_bookmarks')
        .select('document_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (bookmarksError) {
        console.error('[Favorites] Error loading bookmarks:', bookmarksError);
        throw bookmarksError;
      }

      if (!bookmarks || bookmarks.length === 0) {
        console.log('[Favorites] No bookmarks found');
        setDocuments([]);
        setLoading(false);
        return;
      }

      const documentIds = bookmarks.map(b => b.document_id);

      // Get the actual documents
      const { data, error } = await supabase
        .from('secretariat_documents')
        .select('*')
        .in('id', documentIds)
        .eq('is_public', true)
        .eq('is_approved', true);

      if (error) {
        console.error('[Favorites] Error loading documents:', error);
        throw error;
      }

      console.log('[Favorites] Loaded documents:', data?.length || 0);
      setDocuments(data || []);
    } catch (error) {
      console.error('[Favorites] Error:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to load your favorite documents. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to load your favorite documents. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUnfavorite = async (documentId: string, title: string) => {
    const confirmUnfavorite = () => {
      return new Promise<boolean>((resolve) => {
        if (Platform.OS === 'web') {
          const confirmed = window.confirm(
            `Remove "${title}" from favorites?`
          );
          resolve(confirmed);
        } else {
          Alert.alert(
            'Remove Favorite',
            `Remove "${title}" from favorites?`,
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => resolve(false),
              },
              {
                text: 'Remove',
                style: 'destructive',
                onPress: () => resolve(true),
              },
            ]
          );
        }
      });
    };

    const confirmed = await confirmUnfavorite();
    if (!confirmed) return;

    try {
      console.log('[Favorites] Removing bookmark:', documentId);

      const { error } = await supabase
        .from('document_bookmarks')
        .delete()
        .eq('user_id', user?.id)
        .eq('document_id', documentId);

      if (error) throw error;

      console.log('[Favorites] Bookmark removed successfully');

      if (Platform.OS === 'web') {
        window.alert('✓ Removed from favorites!');
      } else {
        Alert.alert('Success', '✓ Removed from favorites!');
      }

      // Reload documents
      loadFavoriteDocuments();
    } catch (error) {
      console.error('[Favorites] Error removing bookmark:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to remove from favorites. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to remove from favorites. Please try again.');
      }
    }
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
          colors={['#0F172A', '#1E293B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <DebouncedTouchable onPress={() => debouncedRouter.push('/secretariat/documents')} style={styles.backButton}>
              <ArrowLeft size={24} color="#FFFFFF" />
            </DebouncedTouchable>
            <View style={styles.headerCenter}>
              <Text style={styles.title}>Favorite Documents</Text>
            </View>
            <View style={styles.placeholder} />
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffc857" />
          <Text style={styles.loadingText}>Loading your favorites...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#0F172A', '#1E293B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <DebouncedTouchable onPress={() => debouncedRouter.push('/secretariat/documents')} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </DebouncedTouchable>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>Favorite Documents</Text>
            <Text style={styles.subtitle}>{documents.length} documents</Text>
          </View>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {documents.length === 0 ? (
          <View style={styles.emptyState}>
            <Folder size={64} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Favorites Yet</Text>
            <Text style={styles.emptyText}>
              Documents you favorite will appear here.{'\n'}
              Browse documents and tap the heart icon to save them.
            </Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => debouncedRouter.push('/secretariat/documents')}
            >
              <Text style={styles.browseButtonText}>Browse Documents</Text>
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
                  <TouchableOpacity
                    style={styles.favoriteButton}
                    onPress={() => handleUnfavorite(doc.id, doc.title)}
                  >
                    <Star size={20} color="#ffc857" fill="#ffc857" />
                  </TouchableOpacity>
                </View>

                {/* Title and Category */}
                <DebouncedTouchable onPress={() => debouncedRouter.push(`/secretariat/documents/${doc.id}`)}>
                  <Text style={styles.documentTitle}>{doc.title}</Text>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{doc.category}</Text>
                  </View>
                </DebouncedTouchable>

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

                {/* Metadata */}
                <View style={styles.metadata}>
                  <View style={styles.metaItem}>
                    <Calendar size={14} color="#666" />
                    <Text style={styles.metaText}>{formatDate(doc.upload_date)}</Text>
                  </View>
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
    backgroundColor: '#FFFFFF',
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
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
  browseButton: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  browseButtonText: {
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
  favoriteButton: {
    padding: 8,
  },
  documentTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffc857',
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
  metadata: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#666',
  },
});
