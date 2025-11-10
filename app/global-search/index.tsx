import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import type { Profile, Post, TrendingArticle, ProductService, Job, Campaign, Livestream } from '../../lib/supabase';
import { Search, X, User, FileText, TrendingUp, ShoppingBag, Briefcase, Heart, Radio, ChevronRight } from 'lucide-react-native';

const { width } = Dimensions.get('window');

type SearchResult = {
  type: 'user' | 'post' | 'article' | 'product' | 'job' | 'campaign' | 'livestream';
  id: string;
  title: string;
  subtitle?: string;
  image?: string;
  data: any;
};

export default function GlobalSearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'users' | 'posts' | 'articles' | 'products' | 'jobs' | 'campaigns' | 'livestreams'>('all');

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    const debounceTimer = setTimeout(() => {
      performSearch(searchQuery);
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, selectedFilter]);

  const performSearch = async (query: string) => {
    if (!query || query.length < 2) return;

    setIsSearching(true);
    try {
      const searchResults: SearchResult[] = [];
      const lowerQuery = query.toLowerCase();

      // Search Users/Profiles
      if (selectedFilter === 'all' || selectedFilter === 'users') {
        const { data: users } = await supabase
          .from('profiles')
          .select('*')
          .or(`username.ilike.%${query}%,full_name.ilike.%${query}%,first_name.ilike.%${query}%,surname.ilike.%${query}%,bio.ilike.%${query}%`)
          .limit(10);

        if (users) {
          users.forEach((user: Profile) => {
            searchResults.push({
              type: 'user',
              id: user.id,
              title: user.full_name || user.username,
              subtitle: user.bio || `@${user.username}`,
              image: user.avatar_url,
              data: user,
            });
          });
        }
      }

      // Search Posts
      if (selectedFilter === 'all' || selectedFilter === 'posts') {
        const { data: posts } = await supabase
          .from('posts')
          .select(`
            *,
            user:profiles(*)
          `)
          .ilike('content', `%${query}%`)
          .order('created_at', { ascending: false })
          .limit(15);

        if (posts) {
          posts.forEach((post: any) => {
            const preview = post.content.length > 100 
              ? post.content.substring(0, 100) + '...' 
              : post.content;
            
            searchResults.push({
              type: 'post',
              id: post.id,
              title: preview,
              subtitle: `By ${post.user?.full_name || 'Unknown'} • ${new Date(post.created_at).toLocaleDateString()}`,
              image: post.image_url || post.image_urls?.[0],
              data: post,
            });
          });
        }
      }

      // Search Trending Articles
      if (selectedFilter === 'all' || selectedFilter === 'articles') {
        const { data: articles } = await supabase
          .from('trending_articles')
          .select('*')
          .eq('is_active', true)
          .or(`title.ilike.%${query}%,subtitle.ilike.%${query}%,summary.ilike.%${query}%,article_content.ilike.%${query}%`)
          .limit(10);

        if (articles) {
          articles.forEach((article: TrendingArticle) => {
            searchResults.push({
              type: 'article',
              id: article.id,
              title: article.title,
              subtitle: article.subtitle || article.summary,
              image: article.image_url,
              data: article,
            });
          });
        }
      }

      // Search Products/Services
      if (selectedFilter === 'all' || selectedFilter === 'products') {
        const { data: products } = await supabase
          .from('products_services')
          .select(`
            *,
            user:profiles(*)
          `)
          .or(`title.ilike.%${query}%,description.ilike.%${query}%,category_name.ilike.%${query}%`)
          .limit(10);

        if (products) {
          products.forEach((product: any) => {
            searchResults.push({
              type: 'product',
              id: product.id,
              title: product.title,
              subtitle: product.price ? `GH₵${product.price.toLocaleString()} • ${product.category_name}` : product.category_name,
              image: product.image_url,
              data: product,
            });
          });
        }
      }

      // Search Jobs
      if (selectedFilter === 'all' || selectedFilter === 'jobs') {
        const { data: jobs } = await supabase
          .from('jobs')
          .select(`
            *,
            user:profiles(*)
          `)
          .or(`title.ilike.%${query}%,company.ilike.%${query}%,description.ilike.%${query}%,location.ilike.%${query}%`)
          .eq('is_approved', true)
          .limit(10);

        if (jobs) {
          jobs.forEach((job: any) => {
            searchResults.push({
              type: 'job',
              id: job.id,
              title: job.title,
              subtitle: `${job.company} • ${job.location}`,
              image: job.image_url,
              data: job,
            });
          });
        }
      }

      // Search Campaigns
      if (selectedFilter === 'all' || selectedFilter === 'campaigns') {
        const { data: campaigns } = await supabase
          .from('campaigns')
          .select('*')
          .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
          .eq('status', 'active')
          .limit(10);

        if (campaigns) {
          campaigns.forEach((campaign: Campaign) => {
            const progress = (campaign.raised_amount / campaign.target_amount) * 100;
            searchResults.push({
              type: 'campaign',
              id: campaign.id,
              title: campaign.title,
              subtitle: `${progress.toFixed(0)}% funded • GH₵${campaign.raised_amount.toLocaleString()} raised`,
              image: campaign.image_urls?.[0],
              data: campaign,
            });
          });
        }
      }

      // Search Livestreams
      if (selectedFilter === 'all' || selectedFilter === 'livestreams') {
        const { data: livestreams } = await supabase
          .from('livestreams')
          .select('*')
          .or(`title.ilike.%${query}%,description.ilike.%${query}%,host_name.ilike.%${query}%`)
          .limit(10);

        if (livestreams) {
          livestreams.forEach((stream: Livestream) => {
            searchResults.push({
              type: 'livestream',
              id: stream.id,
              title: stream.title,
              subtitle: `${stream.host_name} • ${stream.is_live ? '🔴 Live' : 'Recorded'}`,
              image: stream.thumbnail_url,
              data: stream,
            });
          });
        }
      }

      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Search Error', 'Failed to perform search. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleResultPress = (result: SearchResult) => {
    switch (result.type) {
      case 'user':
        router.push(`/profile-view/${result.id}` as any);
        break;
      case 'post':
        router.push(`/post-comments/${result.id}`);
        break;
      case 'article':
        router.push(`/trending-article/${result.id}`);
        break;
      case 'product':
        router.push(`/product-details/${result.id}` as any);
        break;
      case 'job':
        router.push(`/job-details/${result.id}` as any);
        break;
      case 'campaign':
        router.push(`/campaign-details/${result.id}` as any);
        break;
      case 'livestream':
        router.push(`/livestream/${result.id}` as any);
        break;
    }
  };

  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'user':
        return <User size={20} color="#6B7280" />;
      case 'post':
        return <FileText size={20} color="#6B7280" />;
      case 'article':
        return <TrendingUp size={20} color="#6B7280" />;
      case 'product':
        return <ShoppingBag size={20} color="#6B7280" />;
      case 'job':
        return <Briefcase size={20} color="#6B7280" />;
      case 'campaign':
        return <Heart size={20} color="#6B7280" />;
      case 'livestream':
        return <Radio size={20} color="#6B7280" />;
      default:
        return null;
    }
  };

  const getResultTypeLabel = (type: SearchResult['type']) => {
    const labels = {
      user: 'Profile',
      post: 'Post',
      article: 'Article',
      product: 'Product',
      job: 'Job',
      campaign: 'Campaign',
      livestream: 'Livestream',
    };
    return labels[type];
  };

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'users', label: 'People' },
    { id: 'posts', label: 'Posts' },
    { id: 'articles', label: 'Articles' },
    { id: 'products', label: 'Products' },
    { id: 'jobs', label: 'Jobs' },
    { id: 'campaigns', label: 'Campaigns' },
    { id: 'livestreams', label: 'Streams' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <X size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search Everything</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Search size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search anything..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Chips */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.filterChip,
              selectedFilter === filter.id && styles.filterChipActive,
            ]}
            onPress={() => setSelectedFilter(filter.id as any)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === filter.id && styles.filterChipTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Results */}
      <ScrollView 
        style={styles.resultsContainer}
        contentContainerStyle={styles.resultsContent}
      >
        {isSearching ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#000000" />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        ) : searchQuery.length < 2 ? (
          <View style={styles.centerContent}>
            <Search size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Start Searching</Text>
            <Text style={styles.emptySubtitle}>
              Find people, posts, articles, products, jobs, campaigns, and more
            </Text>
          </View>
        ) : results.length === 0 ? (
          <View style={styles.centerContent}>
            <Search size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No results found</Text>
            <Text style={styles.emptySubtitle}>
              Try adjusting your search or filters
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.resultsCount}>
              {results.length} result{results.length !== 1 ? 's' : ''} found
            </Text>
            {results.map((result, index) => (
              <TouchableOpacity
                key={`${result.type}-${result.id}-${index}`}
                style={styles.resultCard}
                onPress={() => handleResultPress(result)}
              >
                <View style={styles.resultLeft}>
                  {result.image ? (
                    <Image
                      source={{ uri: result.image }}
                      style={styles.resultImage}
                    />
                  ) : (
                    <View style={styles.resultImagePlaceholder}>
                      {getResultIcon(result.type)}
                    </View>
                  )}
                  <View style={styles.resultTextContainer}>
                    <View style={styles.resultTitleRow}>
                      <Text style={styles.resultTitle} numberOfLines={1}>
                        {result.title}
                      </Text>
                      <View style={styles.resultTypeBadge}>
                        <Text style={styles.resultTypeBadgeText}>
                          {getResultTypeLabel(result.type)}
                        </Text>
                      </View>
                    </View>
                    {result.subtitle && (
                      <Text style={styles.resultSubtitle} numberOfLines={1}>
                        {result.subtitle}
                      </Text>
                    )}
                  </View>
                </View>
                <ChevronRight size={20} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  placeholder: {
    width: 32,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    height: '100%',
  },
  filtersContainer: {
    maxHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  filtersContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#000000',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  resultsContainer: {
    flex: 1,
  },
  resultsContent: {
    paddingVertical: 16,
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  resultLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  resultImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  resultImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTextContainer: {
    flex: 1,
    gap: 4,
  },
  resultTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },
  resultTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
  },
  resultTypeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  resultSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
