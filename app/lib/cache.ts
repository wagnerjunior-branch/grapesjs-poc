interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class MemoryCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTTL,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  getStale<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    return entry?.data ?? null;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

export const cache = new MemoryCache();

export const CACHE_KEYS = {
  BANNERS_LIST: 'banners:list',
  BANNER_BY_ID: (id: string) => `banners:${id}`,
  CREATIVES_LIST: 'creatives:list',
  CREATIVE_BY_ID: (id: string) => `creatives:${id}`,
  EDITOR_SETTINGS: 'editor-settings',
  PUCK_PROJECTS_LIST: 'puck-projects:list',
  PUCK_PROJECT_BY_ID: (id: string) => `puck-projects:${id}`,
};
