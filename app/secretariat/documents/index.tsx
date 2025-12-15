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
import { useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import {
  ArrowLeft,
  Search,
  Filter,
  FileText,
  Download,
  Eye,
  Calendar,
  User,
  Plus,
  File,
  FileSpreadsheet,
  Folder,
  FolderOpen,
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
  uploader_title: string;
  upload_date: string;
  download_count: number;
  view_count: number;
}

const CATEGORIES = [
  'All',
  'Forms',
  'Reports',
  'Policies',
  'Minutes',
  'Financial',
  'Academic',
  'Legal',
  'Newsletters',
  'Guidelines',
  'Templates',
  'Other',
];

const DOCUMENT_TYPES = [
  { label: 'All Types', value: 'all' },
  { label: 'PDF', value: 'pdf' },
  { label: 'Word', value: 'doc' },
  { label: 'Excel', value: 'xls' },
  { label: 'Other', value: 'other' },
];

const SORT_OPTIONS = [
  { label: 'Newest First', value: 'newest' },
  { label: 'Oldest First', value: 'oldest' },
  { label: 'A-Z', value: 'title_asc' },
  { label: 'Z-A', value: 'title_desc' },
];

const DATE_RANGES = [
  { label: 'All Time', value: 'all' },
  { label: 'Last 7 Days', value: '7days' },
  { label: 'Last 30 Days', value: '30days' },
  { label: 'Last 3 Months', value: '3months' },
  { label: 'Last Year', value: '1year' },
];

const FILE_SIZES = [
  { label: 'All Sizes', value: 'all' },
  { label: 'Small (<1MB)', value: 'small' },
  { label: 'Medium (1-10MB)', value: 'medium' },
  { label: 'Large (>10MB)', value: 'large' },
];

export default function DocumentCenterScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedSort, setSelectedSort] = useState('newest');
  const [selectedDateRange, setSelectedDateRange] = useState('all');
  const [selectedFileSize, setSelectedFileSize] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadDocuments();
    checkAdminStatus();
  }, [user?.id]);

  useEffect(() => {
    filterDocuments();
  }, [searchQuery, selectedCategory, selectedType, selectedSort, selectedDateRange, selectedFileSize, documents]);

  const checkAdminStatus = async () => {
    if (!user?.id) return;

    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('is_admin, role')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      const adminStatus = profileData?.is_admin === true || profileData?.role === 'admin';
      setIsAdmin(adminStatus);
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  };

  const loadDocuments = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('secretariat_documents')
        .select('*')
        .eq('is_public', true)
        .eq('is_approved', true)
        .order('upload_date', { ascending: false });

      if (error) throw error;

      if (data) {
        setDocuments(data);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      Alert.alert('Error', 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadDocuments(), checkAdminStatus()]);
    setRefreshing(false);
  };

  const filterDocuments = () => {
    let filtered = [...documents];

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter((doc) => doc.category === selectedCategory);
    }

    // Filter by document type
    if (selectedType !== 'all') {
      filtered = filtered.filter((doc) => {
        const ext = doc.file_name.split('.').pop()?.toLowerCase() || '';
        if (selectedType === 'pdf') return ext === 'pdf';
        if (selectedType === 'doc') return ['doc', 'docx'].includes(ext);
        if (selectedType === 'xls') return ['xls', 'xlsx', 'csv'].includes(ext);
        if (selectedType === 'other')
          return !['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv'].includes(ext);
        return true;
      });
    }

    // Filter by date range
    if (selectedDateRange !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();
      
      switch (selectedDateRange) {
        case '7days':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case '30days':
          cutoffDate.setDate(now.getDate() - 30);
          break;
        case '3months':
          cutoffDate.setMonth(now.getMonth() - 3);
          break;
        case '1year':
          cutoffDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      filtered = filtered.filter((doc) => new Date(doc.upload_date) >= cutoffDate);
    }

    // Filter by file size
    if (selectedFileSize !== 'all') {
      filtered = filtered.filter((doc) => {
        const sizeInMB = doc.file_size / (1024 * 1024);
        if (selectedFileSize === 'small') return sizeInMB < 1;
        if (selectedFileSize === 'medium') return sizeInMB >= 1 && sizeInMB <= 10;
        if (selectedFileSize === 'large') return sizeInMB > 10;
        return true;
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (doc) =>
          doc.title.toLowerCase().includes(query) ||
          doc.description?.toLowerCase().includes(query) ||
          doc.category.toLowerCase().includes(query) ||
          doc.uploader_name?.toLowerCase().includes(query)
      );
    }

    // Sort documents
    filtered.sort((a, b) => {
      switch (selectedSort) {
        case 'newest':
          return new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime();
        case 'oldest':
          return new Date(a.upload_date).getTime() - new Date(b.upload_date).getTime();
        case 'views':
          return b.view_count - a.view_count;
        case 'downloads':
          return b.download_count - a.download_count;
        case 'title_asc':
          return a.title.localeCompare(b.title);
        case 'title_desc':
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });

    setFilteredDocuments(filtered);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedType('all');
    setSelectedSort('newest');
    setSelectedDateRange('all');
    setSelectedFileSize('all');
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (selectedCategory !== 'All') count++;
    if (selectedType !== 'all') count++;
    if (selectedSort !== 'newest') count++;
    if (selectedDateRange !== 'all') count++;
    if (selectedFileSize !== 'all') count++;
    return count;
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
      month: 'short',
      day: 'numeric',
    });
  };

  const getDocumentIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (ext === 'pdf') return FileText;
    if (['doc', 'docx'].includes(ext)) return FileText;
    if (['xls', 'xlsx', 'csv'].includes(ext)) return FileSpreadsheet;
    return File;
  };

  const getDocumentIconColor = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (ext === 'pdf') return '#EF4444'; // Red for PDF
    if (['doc', 'docx'].includes(ext)) return '#3B82F6'; // Blue for Word
    if (['xls', 'xlsx', 'csv'].includes(ext)) return '#10B981'; // Green for Excel
    return '#ffc857'; // Gold for others
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffc857" />
        <Text style={styles.loadingText}>Loading documents...</Text>
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
          <DebouncedTouchable onPress={() => debouncedRouter.push('/secretariat')} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </DebouncedTouchable>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>Document Center</Text>
            <Text style={styles.subtitle}>{filteredDocuments.length} documents</Text>
          </View>
          <View style={styles.headerActions}>
            <DebouncedTouchable
              style={styles.myDocumentsButton}
              onPress={() => debouncedRouter.push('/secretariat/documents/favorites')}
            >
              <FolderOpen size={24} color="#FFFFFF" />
            </DebouncedTouchable>
            {isAdmin && (
              <DebouncedTouchable
                style={styles.addButton}
                onPress={() => debouncedRouter.push('/secretariat/documents/admin')}
              >
                <Plus size={24} color="#FFFFFF" />
              </DebouncedTouchable>
            )}
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search documents..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
          </View>
          <TouchableOpacity
            style={[styles.filterButton, showFilters && styles.filterButtonActive]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Filter size={20} color={showFilters ? '#4169E1' : '#666'} />
            {getActiveFiltersCount() > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{getActiveFiltersCount()}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Advanced Filters */}
        {showFilters && (
          <View style={styles.advancedFilters}>
            {/* Sort By */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Sort By</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {SORT_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.filterChip,
                      selectedSort === option.value && styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedSort(option.value)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedSort === option.value && styles.filterChipTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Document Type Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Document Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {DOCUMENT_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.filterChip,
                      selectedType === type.value && styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedType(type.value)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedType === type.value && styles.filterChipTextActive,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Date Range Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Upload Date</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {DATE_RANGES.map((range) => (
                  <TouchableOpacity
                    key={range.value}
                    style={[
                      styles.filterChip,
                      selectedDateRange === range.value && styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedDateRange(range.value)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedDateRange === range.value && styles.filterChipTextActive,
                      ]}
                    >
                      {range.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* File Size Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>File Size</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {FILE_SIZES.map((size) => (
                  <TouchableOpacity
                    key={size.value}
                    style={[
                      styles.filterChip,
                      selectedFileSize === size.value && styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedFileSize(size.value)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedFileSize === size.value && styles.filterChipTextActive,
                      ]}
                    >
                      {size.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Filter Actions */}
            <View style={styles.filterActions}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={resetFilters}
              >
                <Text style={styles.resetButtonText}>Reset All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => setShowFilters(false)}
              >
                <Text style={styles.applyButtonText}>
                  Apply {getActiveFiltersCount() > 0 && `(${getActiveFiltersCount()})`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
        >
          {CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryChip,
                selectedCategory === category && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === category && styles.categoryChipTextActive,
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
            <Folder size={64} color="#CCCCCC" />
            <Text style={styles.emptyTitle}>No Documents Found</Text>
            <Text style={styles.emptyText}>
              {searchQuery
                ? 'Try a different search term'
                : selectedCategory !== 'All'
                ? 'No documents in this category'
                : 'No documents available'}
            </Text>
          </View>
        ) : (
          filteredDocuments.map((document) => {
            const IconComponent = getDocumentIcon(document.file_name);
            const iconColor = getDocumentIconColor(document.file_name);

            return (
              <DebouncedTouchable
                key={document.id}
                style={styles.documentCard}
                onPress={() => debouncedRouter.push(`/secretariat/documents/${document.id}`)}
              >
                {/* Document Icon */}
                <View style={styles.documentIcon}>
                  <IconComponent size={32} color={iconColor} />
                </View>

                {/* Document Details */}
                <View style={styles.documentDetails}>
                  {/* Category Badge */}
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{document.category}</Text>
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
                      <Text style={styles.metaText}>{document.uploader_name}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Calendar size={14} color="#666" />
                      <Text style={styles.metaText}>{formatDate(document.upload_date)}</Text>
                    </View>
                  </View>
                </View>
              </DebouncedTouchable>
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
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
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  myDocumentsButton: {
    padding: 8,
  },
  addButton: {
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
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
  },
  filterButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#FFF9E6',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  advancedFilters: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 12,
    borderRadius: 12,
    marginHorizontal: 16,
  },
  filterSection: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    opacity: 0.9,
  },
  filterChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#FFFFFF',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  filterChipTextActive: {
    color: '#0F172A',
  },
  filterActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  resetButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  applyButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  categoriesContainer: {
    paddingHorizontal: 16,
  },
  categoriesContent: {
    gap: 8,
    paddingRight: 16,
  },
  categoryChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  categoryChipActive: {
    backgroundColor: '#FFFFFF',
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  categoryChipTextActive: {
    color: '#0F172A',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  documentCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  documentIcon: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#FFF9E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  documentDetails: {
    flex: 1,
  },
  categoryBadge: {
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffc857',
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 6,
    lineHeight: 22,
  },
  documentDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 10,
  },
  metadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: '#666',
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#666',
  },
  fileSize: {
    fontSize: 12,
    color: '#999',
    marginLeft: 'auto',
  },
});
