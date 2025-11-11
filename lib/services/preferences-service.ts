import AsyncStorage from '@react-native-async-storage/async-storage';
import { NewsCategory } from '../types/news';

/**
 * PreferencesService stores lightweight personalization settings client-side.
 */
class PreferencesService {
  private readonly KEY_FAVORITES = '@news_favorite_categories';
  private readonly KEY_MUTED_SOURCES = '@news_muted_sources';

  async getFavoriteCategories(): Promise<NewsCategory[]> {
    try {
      const raw = await AsyncStorage.getItem(this.KEY_FAVORITES);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as NewsCategory[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async setFavoriteCategories(categories: NewsCategory[]): Promise<void> {
    try {
      const uniq = Array.from(new Set(categories));
      await AsyncStorage.setItem(this.KEY_FAVORITES, JSON.stringify(uniq));
    } catch {
      // no-op
    }
  }

  async getMutedSources(): Promise<string[]> {
    try {
      const raw = await AsyncStorage.getItem(this.KEY_MUTED_SOURCES);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as string[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async setMutedSources(sourceIds: string[]): Promise<void> {
    try {
      const uniq = Array.from(new Set(sourceIds));
      await AsyncStorage.setItem(this.KEY_MUTED_SOURCES, JSON.stringify(uniq));
    } catch {
      // no-op
    }
  }
}

export const preferencesService = new PreferencesService();
