import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * RegionService detects and caches the user's primary country (ISO 3166-1 alpha-2, lowercase)
 * without requiring native modules. It uses IP geolocation as a safe fallback.
 */
class RegionService {
  private readonly KEY_COUNTRY = '@region_primary_country';
  private readonly KEY_TS = '@region_primary_country_ts';
  private readonly TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

  private envDefault(): string {
    return (process.env.EXPO_PUBLIC_NEWS_PRIMARY_COUNTRY || 'gh').toLowerCase();
  }

  async getPrimaryCountry(forceRefresh = false): Promise<string> {
    try {
      if (!forceRefresh) {
        const [stored, ts] = await Promise.all([
          AsyncStorage.getItem(this.KEY_COUNTRY),
          AsyncStorage.getItem(this.KEY_TS),
        ]);
        if (stored && ts && Date.now() - Number(ts) < this.TTL) {
          return stored.toLowerCase();
        }
      }

      const detected = await this.detectViaIP();
      if (detected) {
        await this.setPrimaryCountry(detected);
        return detected;
      }
    } catch (e) {
      console.warn('RegionService.getPrimaryCountry fallback:', e);
    }
    return this.envDefault();
  }

  async setPrimaryCountry(country: string): Promise<void> {
    try {
      const val = country.toLowerCase();
      await Promise.all([
        AsyncStorage.setItem(this.KEY_COUNTRY, val),
        AsyncStorage.setItem(this.KEY_TS, String(Date.now())),
      ]);
    } catch (e) {
      console.warn('RegionService.setPrimaryCountry error:', e);
    }
  }

  private async detectViaIP(): Promise<string | null> {
    try {
      // ipapi.co is simple and anonymous for country detection
      const resp = await fetch('https://ipapi.co/json/');
      if (!resp.ok) return null;
      const data = await resp.json();
      const code = (data?.country_code || '').toString().toLowerCase();
      if (code && code.length === 2) return code;
      return null;
    } catch {
      return null;
    }
  }
}

export const regionService = new RegionService();
