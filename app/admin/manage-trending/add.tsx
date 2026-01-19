import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  TrendingUp,
  Briefcase,
  GraduationCap,
  Calendar,
  Heart,
  MessageSquare,
  Users,
  Sparkles,
  Newspaper,
  Bell,
  ShoppingBag,
  Radio,
  Search,
  X,
  Check,
  Image as ImageIcon,
  ChevronDown,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { debouncedRouter } from '@/utils/navigationDebounce';
import * as ImagePicker from 'expo-image-picker';

const ITEM_TYPES = [
  { value: 'job', label: 'Job', icon: Briefcase, color: '#10B981', searchable: true },
  { value: 'event', label: 'Event', icon: Calendar, color: '#8B5CF6', searchable: true },
  { value: 'education', label: 'Education', icon: GraduationCap, color: '#F59E0B', searchable: true },
  { value: 'donation', label: 'Donation', icon: Heart, color: '#EF4444', searchable: true },
  { value: 'forum', label: 'Forum', icon: MessageSquare, color: '#3B82F6', searchable: true },
  { value: 'circle', label: 'Circle', icon: Users, color: '#F97316', searchable: true },
  { value: 'news', label: 'News', icon: Newspaper, color: '#06B6D4', searchable: true },
  { value: 'notice', label: 'Notice', icon: Bell, color: '#EC4899', searchable: true },
  { value: 'shop', label: 'Shop', icon: ShoppingBag, color: '#14B8A6', searchable: true },
  { value: 'live', label: 'Live', icon: Radio, color: '#DC2626', searchable: true },
  { value: 'custom', label: 'Custom', icon: Sparkles, color: '#6366F1', searchable: false },
];

interface SearchResult {
  id: string;
  displayTitle: string;
  displaySubtitle: string;
  image_url?: string;
}

// Helper to validate image URLs
const isValidImageUrl = (url: string | undefined | null): boolean => {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return false;
  return trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('file://');
};

export default function AddTrendingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [selectedType, setSelectedType] = useState('job');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SearchResult | null>(null);
  
  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formSubtitle, setFormSubtitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formPriority, setFormPriority] = useState('1');
  const [submitting, setSubmitting] = useState(false);
  const [nextAvailablePriority, setNextAvailablePriority] = useState(1);

  // Fetch next available priority on mount
  useEffect(() => {
    fetchNextPriority();
  }, []);

  const fetchNextPriority = async () => {
    try {
      const { count, error } = await supabase
        .from('trending_items')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      if (error) throw error;
      
      const nextPriority = (count || 0) + 1;
      setNextAvailablePriority(nextPriority);
      setFormPriority(String(nextPriority));
    } catch (error) {
      console.error('Error fetching priority count:', error);
    }
  };

  const currentTypeConfig = ITEM_TYPES.find(t => t.value === selectedType) || ITEM_TYPES[0];

  const searchItems = async (query: string, loadAll: boolean = false) => {
    // If not loading all and no query, clear results
    if (!loadAll && !query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      let results: SearchResult[] = [];
      
      switch (selectedType) {
        case 'job':
          let jobQuery = supabase
            .from('jobs')
            .select('id, title, company, location, image_url')
            .eq('is_approved', true)
            .limit(50);
          if (query.trim()) {
            jobQuery = jobQuery.ilike('title', `%${query}%`);
          }
          const { data: jobs } = await jobQuery;
          results = jobs?.map(j => ({ 
            id: j.id, 
            displayTitle: j.title, 
            displaySubtitle: j.company || j.location || 'Job',
            image_url: j.image_url 
          })) || [];
          break;
          
        case 'event':
          let eventQuery = supabase
            .from('akora_events')
            .select('id, title, location, banner_url')
            .in('status', ['published', 'approved'])
            .limit(50);
          if (query.trim()) {
            eventQuery = eventQuery.ilike('title', `%${query}%`);
          }
          const { data: events } = await eventQuery;
          results = events?.map(e => ({ 
            id: e.id, 
            displayTitle: e.title, 
            displaySubtitle: e.location || 'Event',
            image_url: e.banner_url 
          })) || [];
          break;
          
        case 'donation':
          let donationQuery = supabase
            .from('donation_campaigns')
            .select('id, title, description, campaign_image, category')
            .limit(50);
          if (query.trim()) {
            donationQuery = donationQuery.ilike('title', `%${query}%`);
          }
          const { data: donations } = await donationQuery;
          results = donations?.map(d => ({ 
            id: d.id, 
            displayTitle: d.title, 
            displaySubtitle: d.category || 'Donation Campaign',
            image_url: d.campaign_image 
          })) || [];
          break;
          
        case 'forum':
          let forumQuery = supabase
            .from('forum_discussions')
            .select('id, title, category')
            .limit(50);
          if (query.trim()) {
            forumQuery = forumQuery.ilike('title', `%${query}%`);
          }
          const { data: forumPosts } = await forumQuery;
          results = forumPosts?.map(p => ({ 
            id: p.id, 
            displayTitle: p.title, 
            displaySubtitle: p.category || 'Forum Discussion',
          })) || [];
          break;
          
        case 'circle':
          let circleQuery = supabase
            .from('circles')
            .select('id, name, description, image_url')
            .limit(50);
          if (query.trim()) {
            circleQuery = circleQuery.ilike('name', `%${query}%`);
          }
          const { data: circles } = await circleQuery;
          results = circles?.map(c => ({ 
            id: c.id, 
            displayTitle: c.name, 
            displaySubtitle: c.description || 'Circle',
            image_url: c.image_url 
          })) || [];
          break;
          
        case 'news':
          let newsQuery = supabase
            .from('news')
            .select('id, title, description, image_url')
            .eq('is_approved', true)
            .limit(50);
          if (query.trim()) {
            newsQuery = newsQuery.ilike('title', `%${query}%`);
          }
          const { data: articles } = await newsQuery;
          results = articles?.map(a => ({ 
            id: a.id, 
            displayTitle: a.title, 
            displaySubtitle: a.description?.substring(0, 50) || 'News Article',
            image_url: a.image_url 
          })) || [];
          break;
          
        case 'shop':
          let shopQuery = supabase
            .from('secretariat_shop_products')
            .select('id, name, description, category, images')
            .eq('in_stock', true)
            .limit(50);
          if (query.trim()) {
            shopQuery = shopQuery.ilike('name', `%${query}%`);
          }
          const { data: shopItems } = await shopQuery;
          results = shopItems?.map(s => ({ 
            id: s.id, 
            displayTitle: s.name, 
            displaySubtitle: s.category || 'Shop Item',
            image_url: s.images?.[0] 
          })) || [];
          break;
          
        case 'live':
          let liveQuery = supabase
            .from('livestreams')
            .select('id, title, host_name, thumbnail_url, is_live')
            .limit(50);
          if (query.trim()) {
            liveQuery = liveQuery.ilike('title', `%${query}%`);
          }
          const { data: liveItems } = await liveQuery;
          results = liveItems?.map(l => ({ 
            id: l.id, 
            displayTitle: l.title, 
            displaySubtitle: `${l.is_live ? '🔴 LIVE' : '📺 Past'} • ${l.host_name || 'Unknown Host'}`,
            image_url: l.thumbnail_url 
          })) || [];
          break;
          
        case 'education':
          // Fetch both scholarships and mentors
          let scholarshipQuery = supabase
            .from('scholarships')
            .select('id, title, description, image_url')
            .eq('is_approved', true)
            .limit(25);
          if (query.trim()) {
            scholarshipQuery = scholarshipQuery.ilike('title', `%${query}%`);
          }
          
          let mentorQuery = supabase
            .from('alumni_mentors')
            .select('id, full_name, current_title, company, profile_image_url')
            .eq('status', 'approved')
            .limit(25);
          if (query.trim()) {
            mentorQuery = mentorQuery.ilike('full_name', `%${query}%`);
          }
          
          const [{ data: scholarships }, { data: mentors }] = await Promise.all([
            scholarshipQuery,
            mentorQuery
          ]);
          
          const scholarshipResults = scholarships?.map(s => ({ 
            id: s.id, 
            displayTitle: s.title, 
            displaySubtitle: '📚 Scholarship',
            image_url: s.image_url 
          })) || [];
          
          const mentorResults = mentors?.map(m => ({ 
            id: m.id, 
            displayTitle: m.full_name, 
            displaySubtitle: `👨‍🏫 Mentor${m.current_title ? ' • ' + m.current_title : ''}`,
            image_url: m.profile_image_url 
          })) || [];
          
          results = [...scholarshipResults, ...mentorResults];
          break;
          
        case 'notice':
          let noticeQuery = supabase
            .from('secretariat_announcements')
            .select('id, title, description, images')
            .limit(50);
          if (query.trim()) {
            noticeQuery = noticeQuery.ilike('title', `%${query}%`);
          }
          const { data: announcements } = await noticeQuery;
          results = announcements?.map(a => ({ 
            id: a.id, 
            displayTitle: a.title, 
            displaySubtitle: a.description?.substring(0, 50) || 'Announcement',
            image_url: a.images?.[0] || undefined 
          })) || [];
          break;
      }
      
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching items:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectItem = (item: SearchResult) => {
    setSelectedItem(item);
    setFormTitle(item.displayTitle);
    setFormSubtitle(item.displaySubtitle);
    setFormImageUrl(item.image_url || '');
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleClearSelection = () => {
    setSelectedItem(null);
    setFormTitle('');
    setFormSubtitle('');
    setFormDescription('');
    setFormImageUrl('');
  };

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    handleClearSelection();
    setSearchQuery('');
    setSearchResults([]);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      // For now just use the local URI - in production you'd upload to Supabase storage
      setFormImageUrl(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!(formTitle || '').trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    setSubmitting(true);
    try {
      const newPriority = parseInt(formPriority) || 1;

      // Shift priorities: increment all active items with priority >= newPriority
      // Fetch items to shift (starting from highest to avoid conflicts)
      const { data: existingItems } = await supabase
        .from('trending_items')
        .select('id, priority')
        .gte('priority', newPriority)
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (existingItems && existingItems.length > 0) {
        // Shift each item's priority up by 1 (starting from highest to avoid conflicts)
        for (const item of existingItems) {
          await supabase
            .from('trending_items')
            .update({ priority: item.priority + 1 })
            .eq('id', item.id);
        }
      }

      const { error } = await supabase
        .from('trending_items')
        .insert({
          item_type: selectedType,
          item_id: selectedItem?.id || null,
          title: (formTitle || '').trim(),
          subtitle: (formSubtitle || '').trim() || null,
          description: (formDescription || '').trim() || null,
          image_url: (formImageUrl || '').trim() || null,
          source_type: 'curated',
          priority: newPriority,
          is_active: true,
          start_date: new Date().toISOString(),
          created_by: user?.id,
        });

      if (error) throw error;

      Alert.alert('Success', 'Item added to trending!', [
        { text: 'OK', onPress: () => debouncedRouter.back() }
      ]);
    } catch (error: any) {
      console.error('Error adding trending item:', error);
      Alert.alert('Error', error.message || 'Failed to add trending item');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add to Trending</Text>
        <TouchableOpacity 
          onPress={handleSubmit}
          disabled={submitting || !(formTitle || '').trim()}
          style={[styles.saveButton, (!(formTitle || '').trim() || submitting) && styles.saveButtonDisabled]}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Check size={18} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Add</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Type Selection */}
          <Text style={styles.sectionTitle}>Item Type</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.typeScrollView}
            contentContainerStyle={styles.typeScrollContent}
          >
            {ITEM_TYPES.map((type) => {
              const IconComponent = type.icon;
              const isSelected = selectedType === type.value;
              return (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeOption,
                    isSelected && { backgroundColor: type.color, borderColor: type.color }
                  ]}
                  onPress={() => handleTypeChange(type.value)}
                >
                  <IconComponent size={16} color={isSelected ? '#FFFFFF' : type.color} />
                  <Text style={[
                    styles.typeOptionText,
                    isSelected && { color: '#FFFFFF' }
                  ]}>{type.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Search for existing item (if searchable type) */}
          {currentTypeConfig.searchable && !selectedItem && (
            <>
              <Text style={styles.sectionTitle}>Search Existing {currentTypeConfig.label}</Text>
              <Text style={styles.sectionHint}>Tap to browse all {currentTypeConfig.label.toLowerCase()}s or type to search</Text>
              <View style={styles.searchContainer}>
                <Search size={18} color="#64748B" />
                <TextInput
                  style={styles.searchInput}
                  placeholder={`Search for a ${currentTypeConfig.label.toLowerCase()}...`}
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onFocus={() => {
                    // Auto-load all items when user taps on search
                    if (searchResults.length === 0) {
                      searchItems('', true);
                    }
                  }}
                  onChangeText={(text) => {
                    setSearchQuery(text);
                    searchItems(text, text.trim() === '');
                  }}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => { setSearchQuery(''); searchItems('', true); }}>
                    <X size={18} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>

              {searchLoading && (
                <ActivityIndicator size="small" color="#ffc857" style={{ marginTop: 12 }} />
              )}

              {searchResults.length > 0 && (
                <View style={styles.searchResultsContainer}>
                  {searchResults.map((result) => (
                    <TouchableOpacity
                      key={result.id}
                      style={styles.searchResultItem}
                      onPress={() => handleSelectItem(result)}
                    >
                      {isValidImageUrl(result.image_url) ? (
                        <Image source={{ uri: result.image_url }} style={styles.searchResultImage} />
                      ) : (
                        <View style={[styles.searchResultPlaceholder, { backgroundColor: currentTypeConfig.color + '20' }]}>
                          <currentTypeConfig.icon size={16} color={currentTypeConfig.color} />
                        </View>
                      )}
                      <View style={styles.searchResultContent}>
                        <Text style={styles.searchResultTitle} numberOfLines={1}>{result.displayTitle}</Text>
                        <Text style={styles.searchResultSubtitle} numberOfLines={1}>{result.displaySubtitle}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or create custom</Text>
                <View style={styles.dividerLine} />
              </View>
            </>
          )}

          {/* Selected Item Preview */}
          {selectedItem && (
            <View style={styles.selectedItemContainer}>
              <Text style={styles.sectionTitle}>Selected Item</Text>
              <View style={styles.selectedItemCard}>
                {isValidImageUrl(selectedItem.image_url) ? (
                  <Image source={{ uri: selectedItem.image_url }} style={styles.selectedItemImage} />
                ) : (
                  <View style={[styles.selectedItemPlaceholder, { backgroundColor: currentTypeConfig.color + '20' }]}>
                    <currentTypeConfig.icon size={24} color={currentTypeConfig.color} />
                  </View>
                )}
                <View style={styles.selectedItemContent}>
                  <Text style={styles.selectedItemTitle}>{selectedItem.displayTitle}</Text>
                  <Text style={styles.selectedItemSubtitle}>{selectedItem.displaySubtitle}</Text>
                </View>
                <TouchableOpacity onPress={handleClearSelection} style={styles.clearButton}>
                  <X size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Form Fields */}
          <Text style={styles.sectionTitle}>Display Information</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter title"
              placeholderTextColor="#94A3B8"
              value={formTitle}
              onChangeText={setFormTitle}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Subtitle</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter subtitle (optional)"
              placeholderTextColor="#94A3B8"
              value={formSubtitle}
              onChangeText={setFormSubtitle}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Image URL</Text>
            <View style={styles.imageInputContainer}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Enter image URL or pick image"
                placeholderTextColor="#94A3B8"
                value={formImageUrl}
                onChangeText={setFormImageUrl}
              />
              <TouchableOpacity style={styles.imagePickButton} onPress={pickImage}>
                <ImageIcon size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            {formImageUrl ? (
              <Image source={{ uri: formImageUrl }} style={styles.imagePreview} />
            ) : null}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Priority Position</Text>
            <TextInput
              style={styles.input}
              placeholder={String(nextAvailablePriority)}
              placeholderTextColor="#94A3B8"
              value={formPriority}
              onChangeText={setFormPriority}
              keyboardType="number-pad"
            />
            <Text style={styles.helperText}>
              Position in trending list (1 = first). Currently {nextAvailablePriority - 1} active items.
              {'\n'}Setting a lower number will shift existing items down.
            </Text>
          </View>

          {/* Bottom padding */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
    marginTop: 8,
  },
  sectionHint: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 12,
  },
  typeScrollView: {
    marginBottom: 16,
  },
  typeScrollContent: {
    gap: 10,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  typeOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
  },
  searchResultsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchResultImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  searchResultPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchResultContent: {
    flex: 1,
    marginLeft: 12,
  },
  searchResultTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  searchResultSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: 12,
    color: '#94A3B8',
    marginHorizontal: 12,
  },
  selectedItemContainer: {
    marginBottom: 8,
  },
  selectedItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: '#ffc857',
  },
  selectedItemImage: {
    width: 50,
    height: 50,
    borderRadius: 10,
  },
  selectedItemPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  selectedItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  selectedItemSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  clearButton: {
    padding: 8,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: '#0F172A',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  imageInputContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  imagePickButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    marginTop: 12,
  },
  helperText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 6,
  },
});
