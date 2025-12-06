import { router } from 'expo-router';

/**
 * NavigationDebouncer prevents duplicate screen openings from rapid taps
 * 
 * Usage:
 * - Replace `router.push(href)` with `debouncedRouter.push(href)`
 * - Replace `router.replace(href)` with `debouncedRouter.replace(href)`
 * - Replace `router.back()` with `debouncedRouter.back()`
 * 
 * This ensures only ONE navigation happens even if user taps multiple times
 */
class NavigationDebouncer {
  private pendingNavigations = new Map<string, boolean>();
  private readonly defaultDebounceMs = 500;

  /**
   * Debounced push navigation - prevents duplicate screen openings
   */
  push(href: string, debounceMs: number = this.defaultDebounceMs) {
    if (this.pendingNavigations.get(href)) {
      console.log('⏸️ Navigation blocked (debounce):', href);
      return;
    }

    console.log('✅ Navigation allowed:', href);
    this.pendingNavigations.set(href, true);
    
    router.push(href as any);

    setTimeout(() => {
      this.pendingNavigations.delete(href);
    }, debounceMs);
  }

  /**
   * Debounced replace navigation
   */
  replace(href: string, debounceMs: number = this.defaultDebounceMs) {
    if (this.pendingNavigations.get(href)) {
      console.log('⏸️ Replace blocked (debounce):', href);
      return;
    }

    console.log('✅ Replace navigation allowed:', href);
    this.pendingNavigations.set(href, true);
    
    router.replace(href as any);

    setTimeout(() => {
      this.pendingNavigations.delete(href);
    }, debounceMs);
  }

  /**
   * Debounced back navigation
   */
  back(debounceMs: number = this.defaultDebounceMs) {
    const backKey = '__back__';
    if (this.pendingNavigations.get(backKey)) {
      console.log('⏸️ Back navigation blocked (debounce)');
      return;
    }

    console.log('✅ Back navigation allowed');
    this.pendingNavigations.set(backKey, true);
    
    router.back();

    setTimeout(() => {
      this.pendingNavigations.delete(backKey);
    }, debounceMs);
  }

  /**
   * Navigate with params using push
   */
  navigate(params: { pathname: string; params?: any }, debounceMs: number = this.defaultDebounceMs) {
    const key = JSON.stringify(params);
    if (this.pendingNavigations.get(key)) {
      console.log('⏸️ Navigate blocked (debounce):', params.pathname);
      return;
    }

    console.log('✅ Navigate allowed:', params.pathname);
    this.pendingNavigations.set(key, true);
    
    router.push(params as any);

    setTimeout(() => {
      this.pendingNavigations.delete(key);
    }, debounceMs);
  }

  /**
   * Clear all pending navigations (useful for debugging)
   */
  clear() {
    this.pendingNavigations.clear();
  }
}

export const debouncedRouter = new NavigationDebouncer();
