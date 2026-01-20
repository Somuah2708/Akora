import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Share,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import {
  ArrowLeft,
  Download,
  Eye,
  Calendar,
  User,
  FileText,
  ExternalLink,
  Clock,
  Star,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { WebView } from 'react-native-webview';

const { width, height } = Dimensions.get('window');

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
  uploader_title: string;
  uploader_email: string;
  upload_date: string;
  download_count: number;
  view_count: number;
  version: string;
  tags: string[];
}

export default function DocumentViewerScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();

  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadDocument();
      incrementViewCount();
      checkIfFavorited();
    }
  }, [id, user?.id]);

  const loadDocument = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('secretariat_documents')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setDocument(data);
      }
    } catch (error) {
      console.error('Error loading document:', error);
      Alert.alert('Error', 'Failed to load document');
      debouncedRouter.back();
    } finally {
      setLoading(false);
    }
  };

  const incrementViewCount = async () => {
    if (!user?.id) return;

    try {
      await supabase.rpc('increment_document_view_count', {
        document_uuid: id,
        viewer_user_id: user.id,
      });
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }
  };

  const checkIfFavorited = async () => {
    if (!user?.id || !id) return;

    try {
      const { data, error } = await supabase
        .from('document_bookmarks')
        .select('id')
        .eq('user_id', user.id)
        .eq('document_id', id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking favorite status:', error);
      }

      setIsFavorited(!!data);
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };

  const toggleFavorite = async () => {
    if (!user?.id || !id) {
      Alert.alert('Error', 'Please sign in to favorite documents');
      return;
    }

    try {
      setFavoriteLoading(true);

      if (isFavorited) {
        // Remove from favorites
        const { error } = await supabase
          .from('document_bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('document_id', id);

        if (error) throw error;

        setIsFavorited(false);
        Alert.alert('Success', 'Removed from favorites');
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('document_bookmarks')
          .insert({
            user_id: user.id,
            document_id: id,
          });

        if (error) throw error;

        setIsFavorited(true);
        Alert.alert('Success', 'Added to favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Error', 'Failed to update favorites');
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!document) return;

    try {
      setDownloading(true);

      // Increment download count
      if (user?.id) {
        await supabase.rpc('increment_document_download_count', {
          document_uuid: document.id,
          downloader_user_id: user.id,
          downloader_ip: null,
        });
      }

      // Open download URL
      const canOpen = await Linking.canOpenURL(document.file_url);
      if (canOpen) {
        await Linking.openURL(document.file_url);
        Alert.alert('Success', 'Document download started');
        
        // Reload to update download count
        loadDocument();
      } else {
        Alert.alert('Error', 'Unable to open document URL');
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      Alert.alert('Error', 'Failed to download document');
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!document) return;

    try {
      await Share.share({
        message: `${document.title}\n\n${document.description}\n\nDownload: ${document.file_url}`,
        title: document.title,
      });
    } catch (error) {
      console.error('Error sharing document:', error);
    }
  };

  const handleOpenExternal = async () => {
    if (!document) return;

    try {
      const canOpen = await Linking.canOpenURL(document.file_url);
      if (canOpen) {
        await Linking.openURL(document.file_url);
      } else {
        Alert.alert('Error', 'Unable to open document URL');
      }
    } catch (error) {
      console.error('Error opening document:', error);
      Alert.alert('Error', 'Failed to open document');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const isPDF = () => {
    return document?.file_name.toLowerCase().endsWith('.pdf');
  };

  const getPreviewUrl = () => {
    if (!document) return '';
    
    // For PDFs, use Google Docs Viewer
    if (isPDF()) {
      return `https://docs.google.com/viewer?url=${encodeURIComponent(document.file_url)}&embedded=true`;
    }
    
    // For other documents, try Google Docs Viewer
    return `https://docs.google.com/viewer?url=${encodeURIComponent(document.file_url)}&embedded=true`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0F172A" />
        <Text style={styles.loadingText}>Loading document...</Text>
      </View>
    );
  }

  if (!document) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Document not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => debouncedRouter.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
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
          <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.headerButton}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title} numberOfLines={1}>
              {document.title}
            </Text>
          </View>
          <TouchableOpacity 
            onPress={toggleFavorite} 
            style={styles.headerButton}
            disabled={favoriteLoading}
          >
            {favoriteLoading ? (
              <ActivityIndicator size="small" color="#0F172A" />
            ) : (
              <Star 
                size={24} 
                color={isFavorited ? "#ffc857" : "#FFFFFF"}
                fill={isFavorited ? "#ffc857" : "transparent"}
              />
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Document Info Card */}
        <View style={styles.infoCard}>
          {/* Category Badge */}
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{document.category}</Text>
          </View>

          {/* Title */}
          <Text style={styles.documentTitle}>{document.title}</Text>

          {/* Description */}
          {document.description && (
            <Text style={styles.description}>{document.description}</Text>
          )}

          {/* Metadata Grid */}
          <View style={styles.metadataGrid}>
            <View style={styles.metadataItem}>
              <User size={16} color="#666" />
              <View style={styles.metadataContent}>
                <Text style={styles.metadataLabel}>Uploaded by</Text>
                <Text style={styles.metadataValue}>{document.uploader_name}</Text>
                {document.uploader_title && (
                  <Text style={styles.metadataSubvalue}>{document.uploader_title}</Text>
                )}
              </View>
            </View>

            <View style={styles.metadataItem}>
              <Calendar size={16} color="#666" />
              <View style={styles.metadataContent}>
                <Text style={styles.metadataLabel}>Upload Date</Text>
                <Text style={styles.metadataValue}>{formatDate(document.upload_date)}</Text>
              </View>
            </View>

            <View style={styles.metadataItem}>
              <FileText size={16} color="#666" />
              <View style={styles.metadataContent}>
                <Text style={styles.metadataLabel}>File Info</Text>
                <Text style={styles.metadataValue}>{document.file_name}</Text>
                <Text style={styles.metadataSubvalue}>{formatFileSize(document.file_size)}</Text>
              </View>
            </View>
          </View>

          {/* Tags */}
          {document.tags && document.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              <Text style={styles.tagsLabel}>Tags:</Text>
              <View style={styles.tags}>
                {document.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={handleDownload}
            disabled={downloading}
          >
            {downloading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Download size={20} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Download</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={handleOpenExternal}
          >
            <ExternalLink size={20} color="#4169E1" />
            <Text style={styles.secondaryButtonText}>Open External</Text>
          </TouchableOpacity>
        </View>

        {/* Document Preview */}
        <View style={styles.previewSection}>
          <Text style={styles.sectionTitle}>Document Preview</Text>
          <View style={styles.previewContainer}>
            {isPDF() || true ? (
              <WebView
                source={{ uri: getPreviewUrl() }}
                style={styles.webView}
                startInLoadingState={true}
                renderLoading={() => (
                  <View style={styles.webViewLoading}>
                    <ActivityIndicator size="large" color="#0F172A" />
                    <Text style={styles.webViewLoadingText}>Loading preview...</Text>
                  </View>
                )}
                onError={(syntheticEvent) => {
                  const { nativeEvent } = syntheticEvent;
                  console.error('WebView error:', nativeEvent);
                }}
              />
            ) : (
              <View style={styles.noPreview}>
                <FileText size={64} color="#CCCCCC" />
                <Text style={styles.noPreviewText}>Preview not available</Text>
                <Text style={styles.noPreviewSubtext}>
                  Please download the document to view it
                </Text>
              </View>
            )}
          </View>
        </View>

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#0F172A',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
  headerButton: {
    padding: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  categoryBadge: {
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffc857',
  },
  documentTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
    lineHeight: 32,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 20,
  },
  metadataGrid: {
    gap: 16,
  },
  metadataItem: {
    flexDirection: 'row',
    gap: 12,
  },
  metadataContent: {
    flex: 1,
  },
  metadataLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  metadataValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  metadataSubvalue: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  tagsContainer: {
    marginTop: 16,
  },
  tagsLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 12,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryButton: {
    backgroundColor: '#0F172A',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#ffc857',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffc857',
  },
  previewSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  previewContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    height: height * 0.6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  webView: {
    flex: 1,
  },
  webViewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  webViewLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  noPreview: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noPreviewText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  noPreviewSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});
