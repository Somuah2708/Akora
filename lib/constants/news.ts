import { NewsCategory, NewsCategoryConfig } from '../types/news';

export const NEWS_CATEGORIES: NewsCategoryConfig[] = [
  { id: 'all', name: 'For You', icon: '🏠', color: '#000000' },
  { id: 'breaking', name: 'Breaking', icon: '⚡', color: '#FF3B30' },
  { id: 'ghana', name: 'Ghana', icon: '🇬🇭', color: '#008751' },
  { id: 'akora', name: 'Akora', icon: '🎓', color: '#007AFF' },
  { id: 'school', name: 'School', icon: '📚', color: '#5856D6' },
  { id: 'world', name: 'World', icon: '🌍', color: '#34C759' },
  { id: 'business', name: 'Business', icon: '💼', color: '#FF9500' },
  { id: 'technology', name: 'Tech', icon: '💻', color: '#5AC8FA' },
  { id: 'science', name: 'Science', icon: '🔬', color: '#AF52DE' },
  { id: 'health', name: 'Health', icon: '❤️', color: '#FF2D55' },
  { id: 'sports', name: 'Sports', icon: '⚽', color: '#4CD964' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬', color: '#FF6482' },
  { id: 'politics', name: 'Politics', icon: '🏛️', color: '#8E8E93' },
  { id: 'education', name: 'Education', icon: '📖', color: '#007AFF' },
  { id: 'environment', name: 'Environment', icon: '🌱', color: '#32D74B' },
  { id: 'travel', name: 'Travel', icon: '✈️', color: '#5AC8FA' },
  { id: 'food', name: 'Food', icon: '🍽️', color: '#FF9F0A' },
  { id: 'lifestyle', name: 'Lifestyle', icon: '✨', color: '#FF375F' },
  { id: 'culture', name: 'Culture', icon: '🎨', color: '#BF5AF2' },
];

export const BREAKING_NEWS_REFRESH_INTERVAL = 60000; // 1 minute
export const NEWS_CACHE_DURATION = 300000; // 5 minutes
export const NEWS_PAGE_SIZE = 20;
export const MAX_SEARCH_HISTORY = 10;

export const DEFAULT_NEWS_IMAGE = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop&q=60';

export const NEWS_SOURCES = [
  { id: 'bbc-news', name: 'BBC News', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/BBC_News_2019.svg/1200px-BBC_News_2019.svg.png' },
  { id: 'cnn', name: 'CNN', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/CNN.svg/1200px-CNN.svg.png' },
  { id: 'reuters', name: 'Reuters', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Reuters_Logo.svg/1200px-Reuters_Logo.svg.png' },
  { id: 'the-guardian', name: 'The Guardian', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/The_Guardian.svg/1200px-The_Guardian.svg.png' },
  { id: 'associated-press', name: 'Associated Press', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Associated_Press_logo_2012.svg/1200px-Associated_Press_logo_2012.svg.png' },
];
