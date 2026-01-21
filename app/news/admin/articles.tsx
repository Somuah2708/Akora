import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
  RefreshControl,
  TextInput,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  Search,
  X,
  Save,
  Star,
  Newspaper,
  Globe,
  GraduationCap,
  Users,
  Trophy,
  Briefcase,
  Calendar,
  Cpu,
  Activity,
  Heart,
  MessageCircle,
  BookOpen,
  ImageIcon,
  Camera,
  FileText,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import CachedImage from '@/components/CachedImage';

interface Article {
  id: string;
  title: string;
  subtitle?: string;
  summary: string;
  article_content?: string;
  image_url: string;
  category: string;
  link_url?: string;
  source_name?: string;
  source_author?: string;
  is_active: boolean;
  is_featured: boolean;
  view_count: number;
  reading_time_minutes?: number;
  published_at: string;
  created_at: string;
  author_id?: string;
}

const CATEGORIES = [
  { id: 'school_news', name: 'School News', icon: GraduationCap, color: '#3B82F6' },
  { id: 'alumni_news', name: 'Alumni News', icon: Users, color: '#8B5CF6' },
  { id: 'ghana_news', name: 'Ghana News', icon: Globe, color: '#EF4444' },
  { id: 'international', name: 'International', icon: Globe, color: '#06B6D4' },
  { id: 'business', name: 'Business', icon: Briefcase, color: '#84CC16' },
  { id: 'technology', name: 'Technology', icon: Cpu, color: '#6366F1' },
  { id: 'events', name: 'Events', icon: Calendar, color: '#EC4899' },
  { id: 'achievements', name: 'Achievements', icon: Trophy, color: '#F59E0B' },
  { id: 'education', name: 'Education', icon: BookOpen, color: '#14B8A6' },
  { id: 'health', name: 'Health', icon: Activity, color: '#22C55E' },
  { id: 'lifestyle', name: 'Lifestyle', icon: Heart, color: '#F472B6' },
  { id: 'opinion', name: 'Opinion', icon: MessageCircle, color: '#FB923C' },
];

export default function ArticleAdminScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const isAdmin = !!(profile?.is_admin || profile?.role === 'admin' || profile?.can_publish_articles);

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formSubtitle, setFormSubtitle] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formImageUri, setFormImageUri] = useState<string | null>(null);
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formCategory, setFormCategory] = useState('school_news');
  const [formLinkUrl, setFormLinkUrl] = useState('');
  const [formSourceName, setFormSourceName] = useState('');
  const [formSourceAuthor, setFormSourceAuthor] = useState('');
  const [formIsFeatured, setFormIsFeatured] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (isAdmin) {
        fetchArticles();
      }
    }, [isAdmin])
  );

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('trending_articles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setArticles(data || []);
    } catch (error) {
      console.error('Error fetching articles:', error);
      Alert.alert('Error', 'Failed to load articles');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchArticles();
    setRefreshing(false);
  };

  const filteredArticles = articles.filter(article =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setFormTitle('');
    setFormSubtitle('');
    setFormSummary('');
    setFormContent('');
    setFormImageUri(null);
    setFormImageUrl('');
    setFormCategory('school_news');
    setFormLinkUrl('');
    setFormSourceName('');
    setFormSourceAuthor('');
    setFormIsFeatured(false);
    setEditingArticle(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (article: Article) => {
    setEditingArticle(article);
    setFormTitle(article.title);
    setFormSubtitle(article.subtitle || '');
    setFormSummary(article.summary);
    // Convert stored content back to plain text (strip any HTML if present)
    const plainContent = (article.article_content || '')
      .replace(/<\/p>\s*<p>/g, '\n\n')
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
    setFormContent(plainContent);
    setFormImageUrl(article.image_url);
    setFormImageUri(null);
    setFormCategory(article.category);
    setFormLinkUrl(article.link_url || '');
    setFormSourceName(article.source_name || '');
    setFormSourceAuthor(article.source_author || '');
    setFormIsFeatured(article.is_featured);
    setShowAddModal(true);
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setFormImageUri(result.assets[0].uri);
        setFormImageUrl(''); // Clear URL when picking new image
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadImage = async (uri: string): Promise<string | null> => {
    try {
      setUploadingImage(true);

      // Fetch the image
      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Generate unique filename
      const timestamp = Date.now();
      const fileName = `articles/${user?.id}/${timestamp}.jpg`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('post-media')
        .upload(fileName, uint8Array, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('post-media')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Upload Error', 'Failed to upload image. Please try again.');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  // Convert plain text to simple HTML for storage (paragraphs only)
  const convertToSimpleHTML = (text: string): string => {
    if (!text.trim()) return '';
    
    // Split by double newlines for paragraphs
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
    
    // Convert each paragraph, preserving single line breaks within paragraphs
    return paragraphs
      .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
      .join('\n');
  };

  const handleSaveArticle = async () => {
    if (!formTitle.trim() || !formSummary.trim()) {
      Alert.alert('Error', 'Title and summary are required');
      return;
    }

    // Require either an image URL or a selected image
    if (!formImageUri && !formImageUrl.trim()) {
      Alert.alert('Error', 'Please select an image for the article');
      return;
    }

    setSaving(true);
    try {
      let finalImageUrl = formImageUrl;

      // Upload new image if selected
      if (formImageUri) {
        const uploadedUrl = await uploadImage(formImageUri);
        if (!uploadedUrl) {
          setSaving(false);
          return;
        }
        finalImageUrl = uploadedUrl;
      }

      // Calculate reading time based on all text content
      const allText = `${formTitle} ${formSubtitle} ${formSummary} ${formContent}`.trim();
      const wordCount = allText.split(/\s+/).filter(word => word.length > 0).length;
      const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

      // Convert plain text content to simple HTML paragraphs
      const htmlContent = convertToSimpleHTML(formContent);

      const articleData = {
        title: formTitle.trim(),
        subtitle: formSubtitle.trim() || null,
        summary: formSummary.trim(),
        article_content: htmlContent || null,
        image_url: finalImageUrl,
        category: formCategory,
        link_url: formLinkUrl.trim() || null,
        source_name: formSourceName.trim() || null,
        source_author: formSourceAuthor.trim() || null,
        is_featured: formIsFeatured,
        author_id: user?.id,
        reading_time_minutes: readingTimeMinutes,
      };

      if (editingArticle) {
        const { error } = await supabase
          .from('trending_articles')
          .update(articleData)
          .eq('id', editingArticle.id);

        if (error) throw error;
        Alert.alert('Success', 'Article updated successfully');
      } else {
        const { error } = await supabase
          .from('trending_articles')
          .insert({
            ...articleData,
            is_active: true,
            view_count: 0,
            published_at: new Date().toISOString(),
          });

        if (error) throw error;
        Alert.alert('Success', 'Article created successfully');
      }

      setShowAddModal(false);
      resetForm();
      fetchArticles();
    } catch (error) {
      console.error('Error saving article:', error);
      Alert.alert('Error', 'Failed to save article');
    } finally {
      setSaving(false);
    }
  };

  const toggleArticleActive = async (article: Article) => {
    try {
      const { error } = await supabase
        .from('trending_articles')
        .update({ is_active: !article.is_active })
        .eq('id', article.id);

      if (error) throw error;
      
      setArticles(prev =>
        prev.map(a => a.id === article.id ? { ...a, is_active: !a.is_active } : a)
      );
    } catch (error) {
      console.error('Error toggling article:', error);
      Alert.alert('Error', 'Failed to update article');
    }
  };

  const toggleArticleFeatured = async (article: Article) => {
    try {
      const { error } = await supabase
        .from('trending_articles')
        .update({ is_featured: !article.is_featured })
        .eq('id', article.id);

      if (error) throw error;
      
      setArticles(prev =>
        prev.map(a => a.id === article.id ? { ...a, is_featured: !a.is_featured } : a)
      );
    } catch (error) {
      console.error('Error toggling featured:', error);
      Alert.alert('Error', 'Failed to update article');
    }
  };

  const deleteArticle = async (article: Article) => {
    Alert.alert(
      'Delete Article',
      `Are you sure you want to delete "${article.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('trending_articles')
                .delete()
                .eq('id', article.id);

              if (error) throw error;
              
              setArticles(prev => prev.filter(a => a.id !== article.id));
              Alert.alert('Success', 'Article deleted');
            } catch (error) {
              console.error('Error deleting article:', error);
              Alert.alert('Error', 'Failed to delete article');
            }
          },
        },
      ]
    );
  };

  const getCategoryInfo = (categoryId: string) => {
    return CATEGORIES.find(c => c.id === categoryId) || CATEGORIES[0];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderArticleCard = ({ item }: { item: Article }) => {
    const categoryInfo = getCategoryInfo(item.category);
    const CategoryIcon = categoryInfo.icon;

    return (
      <View style={[styles.card, !item.is_active && styles.cardInactive]}>
        <View style={styles.cardHeader}>
          <CachedImage
            source={{ uri: item.image_url }}
            style={styles.cardImage}
          />
          <View style={styles.cardInfo}>
            <View style={styles.cardBadges}>
              <View style={[styles.categoryBadge, { backgroundColor: `${categoryInfo.color}20` }]}>
                <CategoryIcon size={12} color={categoryInfo.color} />
                <Text style={[styles.categoryText, { color: categoryInfo.color }]}>
                  {categoryInfo.name}
                </Text>
              </View>
              {item.is_featured && (
                <View style={styles.featuredBadge}>
                  <Star size={10} color="#F59E0B" fill="#F59E0B" />
                  <Text style={styles.featuredText}>Featured</Text>
                </View>
              )}
            </View>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.cardMeta}>
              {formatDate(item.published_at)} • {item.view_count || 0} views
            </Text>
            {item.source_name && (
              <Text style={styles.cardSource} numberOfLines={1}>
                Source: {item.source_name}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.cardActions}>
          <View style={styles.toggleGroup}>
            <Text style={styles.toggleLabel}>Active</Text>
            <Switch
              value={item.is_active}
              onValueChange={() => toggleArticleActive(item)}
              trackColor={{ false: '#E5E7EB', true: '#BBF7D0' }}
              thumbColor={item.is_active ? '#22C55E' : '#9CA3AF'}
            />
          </View>
          
          <View style={styles.toggleGroup}>
            <Text style={styles.toggleLabel}>Featured</Text>
            <Switch
              value={item.is_featured}
              onValueChange={() => toggleArticleFeatured(item)}
              trackColor={{ false: '#E5E7EB', true: '#FEF3C7' }}
              thumbColor={item.is_featured ? '#F59E0B' : '#9CA3AF'}
            />
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => openEditModal(item)}
            >
              <Edit2 size={18} color="#3B82F6" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => deleteArticle(item)}
            >
              <Trash2 size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (!isAdmin) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Article Management</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>You don't have permission to access this page.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Articles</Text>
        <TouchableOpacity onPress={openAddModal} style={styles.addBtn}>
          <Plus size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#6B7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search articles..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9CA3AF"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{articles.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{articles.filter(a => a.is_active).length}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{articles.filter(a => a.is_featured).length}</Text>
          <Text style={styles.statLabel}>Featured</Text>
        </View>
      </View>

      {/* Article List */}
      <FlatList
        data={filteredArticles}
        renderItem={renderArticleCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ffc857"
          />
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0F172A" />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Newspaper size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No articles found</Text>
            </View>
          )
        }
      />

      {/* Add/Edit Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalHeader, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <X size={24} color="#0F172A" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingArticle ? 'Edit Article' : 'New Article'}
            </Text>
            <TouchableOpacity 
              onPress={handleSaveArticle}
              disabled={saving || uploadingImage}
            >
              {(saving || uploadingImage) ? (
                <ActivityIndicator size="small" color="#ffc857" />
              ) : (
                <Save size={24} color="#ffc857" />
              )}
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Image Picker */}
            <Text style={styles.inputLabel}>Article Image *</Text>
            <TouchableOpacity 
              style={styles.imagePicker}
              onPress={pickImage}
              disabled={uploadingImage}
            >
              {(formImageUri || formImageUrl) ? (
                <Image
                  source={{ uri: formImageUri || formImageUrl }}
                  style={styles.previewImage}
                />
              ) : (
                <View style={styles.imagePickerPlaceholder}>
                  <ImageIcon size={40} color="#9CA3AF" />
                  <Text style={styles.imagePickerText}>Tap to select image</Text>
                  <Text style={styles.imagePickerHint}>Recommended: 16:9 aspect ratio</Text>
                </View>
              )}
              {(formImageUri || formImageUrl) && (
                <View style={styles.imageOverlay}>
                  <Camera size={20} color="#FFFFFF" />
                  <Text style={styles.imageOverlayText}>Change</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.inputLabel}>Title *</Text>
            <TextInput
              style={styles.input}
              value={formTitle}
              onChangeText={setFormTitle}
              placeholder="Article title"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.inputLabel}>Subtitle</Text>
            <TextInput
              style={styles.input}
              value={formSubtitle}
              onChangeText={setFormSubtitle}
              placeholder="Optional subtitle"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.inputLabel}>Summary *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formSummary}
              onChangeText={setFormSummary}
              placeholder="Brief summary of the article (shown in previews)"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
            />

            <Text style={styles.inputLabel}>Full Content</Text>
            <Text style={styles.inputHint}>
              Write naturally with paragraphs. Press Enter twice to start a new paragraph.
            </Text>
            <TextInput
              style={[styles.input, styles.textAreaLarge]}
              value={formContent}
              onChangeText={setFormContent}
              placeholder="Write your article content here...

Start a new paragraph by pressing Enter twice.

You can write as much as you need - the reading time will be calculated automatically."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={12}
            />

            {/* Citation/Source Section */}
            <View style={styles.sectionHeader}>
              <FileText size={18} color="#6B7280" />
              <Text style={styles.sectionTitle}>Source & Attribution</Text>
            </View>
            <Text style={styles.sectionHint}>
              Add source information to give proper credit and avoid copyright issues
            </Text>

            <Text style={styles.inputLabel}>Source/Publication Name</Text>
            <TextInput
              style={styles.input}
              value={formSourceName}
              onChangeText={setFormSourceName}
              placeholder="e.g., BBC News, The Guardian, Original Content"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.inputLabel}>Author Name</Text>
            <TextInput
              style={styles.input}
              value={formSourceAuthor}
              onChangeText={setFormSourceAuthor}
              placeholder="e.g., John Doe, Staff Writer"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.inputLabel}>Original Article URL</Text>
            <TextInput
              style={styles.input}
              value={formLinkUrl}
              onChangeText={setFormLinkUrl}
              placeholder="https://example.com/original-article"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              keyboardType="url"
            />

            <Text style={styles.inputLabel}>Category</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScroll}
            >
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = formCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryOption,
                      isSelected && { backgroundColor: cat.color, borderColor: cat.color }
                    ]}
                    onPress={() => setFormCategory(cat.id)}
                  >
                    <Icon size={14} color={isSelected ? '#FFFFFF' : cat.color} />
                    <Text style={[
                      styles.categoryOptionText,
                      isSelected && { color: '#FFFFFF' }
                    ]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Mark as Featured</Text>
              <Switch
                value={formIsFeatured}
                onValueChange={setFormIsFeatured}
                trackColor={{ false: '#E5E7EB', true: '#FEF3C7' }}
                thumbColor={formIsFeatured ? '#F59E0B' : '#9CA3AF'}
              />
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>
        </KeyboardAvoidingView>
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
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffc857',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#0F172A',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardInactive: {
    opacity: 0.6,
  },
  cardHeader: {
    flexDirection: 'row',
    padding: 12,
  },
  cardImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  cardBadges: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  featuredText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F59E0B',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    lineHeight: 20,
  },
  cardMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  cardSource: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
    fontStyle: 'italic',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 16,
  },
  toggleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toggleLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  actionButtons: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  inputHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 8,
    marginTop: -4,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#0F172A',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  textAreaLarge: {
    height: 250,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  imagePicker: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePickerPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePickerText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 12,
  },
  imagePickerHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  imageOverlayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 28,
    marginBottom: 4,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  sectionHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  categoryScroll: {
    marginTop: 8,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    marginRight: 8,
    gap: 6,
  },
  categoryOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
});
