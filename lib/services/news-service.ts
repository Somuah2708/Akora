import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  NewsArticle, 
  NewsApiResponse, 
  NewsFilters, 
  CachedNews,
  NewsCategory 
} from '../types/news';
import { 
  NEWS_CACHE_DURATION, 
  NEWS_PAGE_SIZE,
  DEFAULT_NEWS_IMAGE 
} from '../constants/news';

class NewsService {
  private cache: Map<string, CachedNews> = new Map();
  private readonly CACHE_KEY_PREFIX = '@news_cache_';
  private readonly API_KEY = process.env.EXPO_PUBLIC_NEWS_API_KEY || '';
  private readonly NEWS_API_BASE = 'https://newsapi.org/v2';
  private readonly PRIMARY_COUNTRY = (process.env.EXPO_PUBLIC_NEWS_PRIMARY_COUNTRY || 'gh').toLowerCase();
  private readonly SECONDARY_COUNTRIES: string[] = (process.env.EXPO_PUBLIC_NEWS_SECONDARY_COUNTRIES || 'us,gb,ng')
    .toLowerCase()
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  /**
   * Fetch news articles with caching and filtering
   */
  async fetchNews(filters: NewsFilters = {}): Promise<NewsArticle[]> {
    const { category = 'all', searchQuery, sources, sortBy = 'publishedAt' } = filters;
    const cacheKey = this.getCacheKey(filters);

    // Check cache first
    const cached = await this.getFromCache(cacheKey);
    if (cached && Date.now() - cached.timestamp < NEWS_CACHE_DURATION) {
      return cached.data;
    }

    try {
      // Fetch from API
      const articles = await this.fetchFromAPI(filters);
      
      // Cache the results
      await this.saveToCache(cacheKey, {
        data: articles,
        timestamp: Date.now(),
        category,
      });

      return articles;
    } catch (error) {
      console.error('Error fetching news:', error);
      // Return cached data even if expired, or empty array
      return cached?.data || [];
    }
  }

  /**
   * Fetch breaking news
   */
  async fetchBreakingNews(): Promise<NewsArticle[]> {
    try {
      const response = await fetch(
        `${this.NEWS_API_BASE}/top-headlines?country=${this.PRIMARY_COUNTRY}&pageSize=5&apiKey=${this.API_KEY}`
      );
      const data: NewsApiResponse = await response.json();
      
      return this.transformArticles(data.articles || [], true);
    } catch (error) {
      console.error('Error fetching breaking news:', error);
      return this.getMockBreakingNews();
    }
  }

  /**
   * Fetch trending news
   */
  async fetchTrendingNews(): Promise<NewsArticle[]> {
    try {
      // NewsAPI doesn't support sortBy for top-headlines; use everything endpoint for popularity.
      const response = await fetch(
        `${this.NEWS_API_BASE}/everything?q=*&language=en&sortBy=popularity&pageSize=${NEWS_PAGE_SIZE}&apiKey=${this.API_KEY}`
      );
      const data: NewsApiResponse = await response.json();
      
      return this.transformArticles(data.articles || []);
    } catch (error) {
      console.error('Error fetching trending news:', error);
      return [];
    }
  }

  /**
   * Search news articles
   */
  async searchNews(query: string, category?: NewsCategory): Promise<NewsArticle[]> {
    if (!query.trim()) return [];

    try {
      let url = `${this.NEWS_API_BASE}/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=${NEWS_PAGE_SIZE}&apiKey=${this.API_KEY}`;
      
      if (category && category !== 'all') {
        url += `&category=${category}`;
      }

      const response = await fetch(url);
      const data: NewsApiResponse = await response.json();
      
      return this.transformArticles(data.articles || []);
    } catch (error) {
      console.error('Error searching news:', error);
      return [];
    }
  }

  /**
   * Fetch news by category
   */
  async fetchByCategory(category: NewsCategory): Promise<NewsArticle[]> {
    if (category === 'all') {
      return this.fetchHybridFeed();
    }

    if (category === 'breaking') {
      return this.fetchBreakingNews();
    }

    if (category === 'ghana') {
      return this.fetchTopHeadlinesByCountry(this.PRIMARY_COUNTRY);
    }

    try {
      // Use category with global scope (no country) to broaden results
      const response = await fetch(
        `${this.NEWS_API_BASE}/top-headlines?category=${category}&pageSize=${NEWS_PAGE_SIZE}&apiKey=${this.API_KEY}`
      );
      const data: NewsApiResponse = await response.json();
      
      return this.transformArticles(data.articles || []);
    } catch (error) {
      console.error(`Error fetching ${category} news:`, error);
      return this.getMockNewsByCategory(category);
    }
  }

  /**
   * Fetch top headlines for a specific country code
   */
  private async fetchTopHeadlinesByCountry(country: string, extraParams: Record<string, string> = {}): Promise<NewsArticle[]> {
    const params = new URLSearchParams({
      country,
      pageSize: String(NEWS_PAGE_SIZE),
      apiKey: this.API_KEY,
      ...extraParams,
    });
    const response = await fetch(`${this.NEWS_API_BASE}/top-headlines?${params.toString()}`);
    const data: NewsApiResponse = await response.json();
    return this.transformArticles(data.articles || []);
  }

  /**
   * Hybrid feed: prioritize primary country (e.g., Ghana) and blend with global
   */
  private async fetchHybridFeed(): Promise<NewsArticle[]> {
    try {
      const [primary, secondaryBatches] = await Promise.all([
        this.fetchTopHeadlinesByCountry(this.PRIMARY_COUNTRY),
        Promise.all(this.SECONDARY_COUNTRIES.map((c) => this.fetchTopHeadlinesByCountry(c).catch(() => []))),
      ]);

      const secondary = ([] as NewsArticle[]).concat(...secondaryBatches);
      // De-duplicate by id/url
      const seen = new Set<string>();
      const uniq = (list: NewsArticle[]) => list.filter((a) => {
        const key = a.id || a.url;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const pri = uniq(primary);
      const sec = uniq(secondary);

      // Weight: 60% primary, 40% global
      const target = NEWS_PAGE_SIZE;
      const priCount = Math.min(pri.length, Math.ceil(target * 0.6));
      const secCount = Math.min(sec.length, target - priCount);
      const blended = [...pri.slice(0, priCount), ...sec.slice(0, secCount)];

      // Sort by recency
      blended.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
      return blended;
    } catch (e) {
      console.error('Hybrid feed error:', e);
      return this.getMockNewsByCategory('world');
    }
  }

  /**
   * Transform API articles to our format
   */
  private transformArticles(articles: any[], isBreaking: boolean = false): NewsArticle[] {
    return articles.map((article, index) => ({
      id: this.generateArticleId(article),
      title: article.title || 'Untitled',
      description: article.description || '',
      content: article.content || article.description || '',
      url: article.url || '',
      urlToImage: article.urlToImage || DEFAULT_NEWS_IMAGE,
      publishedAt: article.publishedAt || new Date().toISOString(),
      source: {
        id: article.source?.id || 'unknown',
        name: article.source?.name || 'Unknown Source',
      },
      author: article.author,
      category: this.inferCategory(article),
      isBreaking,
      isTrending: !isBreaking && index < 5,
      readTime: this.calculateReadTime(article.content || article.description || ''),
      viewCount: Math.floor(Math.random() * 10000) + 1000,
      likeCount: Math.floor(Math.random() * 1000) + 50,
      commentCount: Math.floor(Math.random() * 100) + 5,
      shareCount: Math.floor(Math.random() * 500) + 10,
    }));
  }

  /**
   * Generate unique article ID
   */
  private generateArticleId(article: any): string {
    return `${article.source?.id || 'unknown'}_${Date.parse(article.publishedAt || new Date().toISOString())}`;
  }

  /**
   * Calculate reading time based on content length
   */
  private calculateReadTime(content: string): number {
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
  }

  /**
   * Infer category from article content
   */
  private inferCategory(article: any): NewsCategory {
    const content = (article.title + ' ' + article.description).toLowerCase();
    
    if (content.includes('sport') || content.includes('football') || content.includes('basketball')) {
      return 'sports';
    }
    if (content.includes('tech') || content.includes('ai') || content.includes('software')) {
      return 'technology';
    }
    if (content.includes('business') || content.includes('economy') || content.includes('market')) {
      return 'business';
    }
    if (content.includes('health') || content.includes('medical') || content.includes('covid')) {
      return 'health';
    }
    if (content.includes('science') || content.includes('research') || content.includes('study')) {
      return 'science';
    }
    if (content.includes('entertainment') || content.includes('movie') || content.includes('music')) {
      return 'entertainment';
    }
    
    return 'world';
  }

  /**
   * Generate cache key from filters
   */
  private getCacheKey(filters: NewsFilters): string {
    const { category = 'all', searchQuery = '', sources = [] } = filters;
    return `${this.CACHE_KEY_PREFIX}${category}_${searchQuery}_${sources.join(',')}`;
  }

  /**
   * Get data from cache
   */
  private async getFromCache(key: string): Promise<CachedNews | null> {
    try {
      const cached = this.cache.get(key);
      if (cached) return cached;

      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.cache.set(key, parsed);
        return parsed;
      }
    } catch (error) {
      console.error('Error reading from cache:', error);
    }
    return null;
  }

  /**
   * Save data to cache
   */
  private async saveToCache(key: string, data: CachedNews): Promise<void> {
    try {
      this.cache.set(key, data);
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  }

  /**
   * Clear all cache
   */
  async clearCache(): Promise<void> {
    try {
      this.cache.clear();
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_KEY_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Fetch from API (implements actual API calls)
   */
  private async fetchFromAPI(filters: NewsFilters): Promise<NewsArticle[]> {
    const { category = 'all', searchQuery, sortBy = 'publishedAt' } = filters;

    // If no API key, return mock data
    if (!this.API_KEY) {
      return this.getMockNewsByCategory(category);
    }

    try {
      let url = `${this.NEWS_API_BASE}/top-headlines?pageSize=${NEWS_PAGE_SIZE}&apiKey=${this.API_KEY}`;
      
      if (category !== 'all') {
        url += `&category=${category}`;
      }
      
      if (searchQuery) {
        url = `${this.NEWS_API_BASE}/everything?q=${encodeURIComponent(searchQuery)}&sortBy=${sortBy}&pageSize=${NEWS_PAGE_SIZE}&apiKey=${this.API_KEY}`;
      }

      const response = await fetch(url);
      const data: NewsApiResponse = await response.json();
      
      if (data.status !== 'ok') {
        throw new Error(data.status);
      }

      return this.transformArticles(data.articles || []);
    } catch (error) {
      console.error('API fetch error:', error);
      return this.getMockNewsByCategory(category);
    }
  }

  /**
   * Get mock breaking news (fallback)
   */
  private getMockBreakingNews(): NewsArticle[] {
    return [
      {
        id: 'breaking-1',
        title: 'Breaking: Major Technology Breakthrough Announced',
        description: 'Scientists unveil revolutionary quantum computing advancement',
        content: 'In a groundbreaking announcement today, researchers have achieved a major milestone in quantum computing technology...',
        url: 'https://example.com/breaking-1',
        urlToImage: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&auto=format&fit=crop&q=60',
        publishedAt: new Date().toISOString(),
        source: { id: 'tech-news', name: 'Tech News' },
        author: 'Sarah Johnson',
        category: 'technology',
        isBreaking: true,
        readTime: 5,
        viewCount: 15420,
        likeCount: 892,
        commentCount: 67,
        shareCount: 234,
      },
      {
        id: 'breaking-2',
        title: 'Global Summit Reaches Historic Climate Agreement',
        description: 'World leaders commit to ambitious carbon reduction targets',
        content: 'After days of intense negotiations, leaders from around the world have reached a landmark agreement on climate action...',
        url: 'https://example.com/breaking-2',
        urlToImage: 'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=800&auto=format&fit=crop&q=60',
        publishedAt: new Date(Date.now() - 3600000).toISOString(),
        source: { id: 'world-news', name: 'World News' },
        author: 'Michael Chen',
        category: 'environment',
        isBreaking: true,
        readTime: 6,
        viewCount: 23150,
        likeCount: 1456,
        commentCount: 128,
        shareCount: 567,
      },
    ];
  }

  /**
   * Get mock news by category (fallback)
   */
  private getMockNewsByCategory(category: NewsCategory): NewsArticle[] {
    const mockArticles: Record<string, Partial<NewsArticle>[]> = {
      ghana: [
        {
          title: 'Accra Tech Hub Announces New Startup Accelerator',
          description: 'A new wave of funding and mentorship for Ghanaian founders',
          urlToImage: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&auto=format&fit=crop&q=60',
          category: 'ghana',
        },
        {
          title: 'Ghana Premier League: Weekend Highlights',
          description: 'Thrilling matches and standout performances across the league',
          urlToImage: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&auto=format&fit=crop&q=60',
          category: 'ghana',
        },
      ],
      technology: [
        {
          title: 'AI Revolution: New Language Model Surpasses Human Performance',
          description: 'Latest AI model shows unprecedented capabilities in natural language understanding',
          urlToImage: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&auto=format&fit=crop&q=60',
          category: 'technology',
        },
        {
          title: 'Smartphone Innovation: Foldable Displays Become Mainstream',
          description: 'Major manufacturers announce new lineup of foldable devices',
          urlToImage: 'https://images.unsplash.com/photo-1592286927505-c0d6b5c63c7e?w=800&auto=format&fit=crop&q=60',
          category: 'technology',
        },
      ],
      business: [
        {
          title: 'Stock Market Hits Record High Amid Economic Recovery',
          description: 'Major indices reach new peaks as economy shows strong growth',
          urlToImage: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop&q=60',
          category: 'business',
        },
      ],
      sports: [
        {
          title: 'Championship Finals: Underdog Team Clinches Victory',
          description: 'Historic upset as underdogs win championship in thrilling finish',
          urlToImage: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&auto=format&fit=crop&q=60',
          category: 'sports',
        },
      ],
      health: [
        {
          title: 'Medical Breakthrough: New Treatment Shows Promise',
          description: 'Researchers develop innovative approach to treating chronic disease',
          urlToImage: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&auto=format&fit=crop&q=60',
          category: 'health',
        },
      ],
      world: [
        {
          title: 'International Cooperation Strengthens Global Security',
          description: 'Nations unite on new framework for peace and stability',
          urlToImage: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&auto=format&fit=crop&q=60',
          category: 'world',
        },
      ],
    };

    const categoryArticles = mockArticles[category] || mockArticles.world;
    
    return categoryArticles.map((article, index) => ({
      id: `mock-${category}-${index}`,
      title: article.title || 'Mock Article',
      description: article.description || '',
      content: article.description || '',
      url: 'https://example.com',
      urlToImage: article.urlToImage || DEFAULT_NEWS_IMAGE,
      publishedAt: new Date(Date.now() - index * 3600000).toISOString(),
      source: { id: 'mock', name: 'News Source' },
      category: article.category || category,
      readTime: 4,
      viewCount: Math.floor(Math.random() * 10000) + 1000,
      likeCount: Math.floor(Math.random() * 1000) + 50,
      commentCount: Math.floor(Math.random() * 100) + 5,
      shareCount: Math.floor(Math.random() * 500) + 10,
    }));
  }
}

export const newsService = new NewsService();
