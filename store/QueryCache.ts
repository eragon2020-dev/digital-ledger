/**
 * Query result cache for reducing redundant database calls
 * TTL-based cache with automatic expiration
 */

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

class QueryCache {
  private cache = new Map<string, CacheEntry<any>>();

  /**
   * Get cached value if still valid
   * @param key Cache key
   * @returns Cached value or null if expired/missing
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Set cache value with TTL
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time to live in milliseconds (default: 30s)
   */
  set<T>(key: string, value: T, ttl: number = 30000): void {
    this.cache.set(key, { value, timestamp: Date.now(), ttl });
  }

  /**
   * Delete specific cache entry
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear entries matching a pattern
   */
  clearMatching(pattern: string | RegExp): void {
    for (const key of this.cache.keys()) {
      if (typeof pattern === 'string' ? key.includes(pattern) : pattern.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache stats
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export const queryCache = new QueryCache();

/**
 * Cache helper for async database functions
 * @param key Cache key
 * @param fn Async function to execute
 * @param ttl Cache TTL in ms (default: 30s)
 * @returns Cached or fresh result
 */
export async function cachedQuery<T>(
  key: string,
  fn: () => Promise<T>,
  ttl: number = 30000
): Promise<T> {
  // Try cache first
  const cached = queryCache.get<T>(key);
  if (cached !== null) return cached;

  // Execute query
  const result = await fn();

  // Cache result
  queryCache.set(key, result, ttl);

  return result;
}
