// News API Types and Interfaces
export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  content: string;
  url: string;
  urlToImage: string;
  publishedAt: string;
  source: NewsSource;
  author?: string;
  category: NewsCategory;
  tags?: string[];
  isBreaking?: boolean;
  isTrending?: boolean;
  readTime?: number;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  /** If article originated from a local RSS source */
  isLocal?: boolean;
  /** Distinguish source type for downstream analytics */
  sourceType?: 'newsapi' | 'rss' | 'custom';
  /** Preserve original URL if different from canonical url property */
  originalUrl?: string;
  /** Short cleaned summary extracted from RSS description */
  summary?: string;
}

export interface NewsSource {
  id: string;
  name: string;
  logo?: string;
  url?: string;
}

export type NewsCategory = 
  | 'all'
  | 'breaking'
  | 'ghana'
  | 'world'
  | 'business'
  | 'technology'
  | 'science'
  | 'health'
  | 'sports'
  | 'entertainment'
  | 'politics'
  | 'education'
  | 'environment'
  | 'travel'
  | 'food'
  | 'lifestyle'
  | 'culture'
  | 'akora'
  | 'school';

export interface NewsCategoryConfig {
  id: NewsCategory;
  name: string;
  icon: string;
  color: string;
}

export interface NewsApiResponse {
  status: string;
  totalResults: number;
  articles: NewsArticle[];
}

export interface NewsFilters {
  category?: NewsCategory;
  searchQuery?: string;
  sources?: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  sortBy?: 'relevancy' | 'popularity' | 'publishedAt';
}

export interface CachedNews {
  data: NewsArticle[];
  timestamp: number;
  category: NewsCategory;
}

export interface UserNewsPreferences {
  userId: string;
  favoriteCategories: NewsCategory[];
  mutedSources: string[];
  notificationsEnabled: boolean;
  breakingNewsAlerts: boolean;
}

export interface NewsBookmark {
  id: string;
  userId: string;
  articleId: string;
  article: NewsArticle;
  createdAt: string;
  tags?: string[];
}

export interface ReadingHistory {
  id: string;
  userId: string;
  articleId: string;
  article: NewsArticle;
  readAt: string;
  readProgress: number; // 0-100
  readDuration: number; // in seconds
}
