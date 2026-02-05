import { Injectable } from '@angular/core';
import { HttpResponse } from '@angular/common/http';

export interface CachedResponse {
  url: string;
  response: HttpResponse<any>;
  timestamp: number;
  expiresAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class OfflineCacheService {
  private readonly STORAGE_KEY = 'miniminds_http_cache';
  private readonly DEFAULT_TTL = 3600000; // 1 hour in milliseconds
  private readonly MAX_CACHE_ENTRIES = 50; // Limit cache entries to prevent quota issues
  private cache = new Map<string, CachedResponse>();

  constructor() {
    this.loadCache();
    this.cleanExpiredCache();
  }

  /**
   * Cache a GET response
   */
  set(url: string, response: HttpResponse<any>, ttl: number = this.DEFAULT_TTL): void {
    // Enforce max cache size
    if (this.cache.size >= this.MAX_CACHE_ENTRIES && !this.cache.has(url)) {
      this.clearOldest(5);
    }

    const cached: CachedResponse = {
      url,
      response,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl
    };

    this.cache.set(url, cached);
    this.saveCache();
  }

  /**
   * Get cached response
   */
  get(url: string): HttpResponse<any> | null {
    const cached = this.cache.get(url);

    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(url);
      this.saveCache();
      return null;
    }

    return cached.response;
  }

  /**
   * Check if URL has cached response
   */
  has(url: string): boolean {
    return this.get(url) !== null;
  }

  /**
   * Get cache age in milliseconds
   */
  getCacheAge(url: string): number | null {
    const cached = this.cache.get(url);
    if (!cached) {
      return null;
    }
    return Date.now() - cached.timestamp;
  }

  /**
   * Get human-readable cache age
   */
  getCacheAgeString(url: string): string | null {
    const age = this.getCacheAge(url);
    if (age === null) {
      return null;
    }

    const minutes = Math.floor(age / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
      return 'just now';
    }
  }

  /**
   * Clear cache for specific URL
   */
  delete(url: string): void {
    this.cache.delete(url);
    this.saveCache();
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Get all cached URLs
   */
  getCachedUrls(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size
   */
  getSize(): number {
    return this.cache.size;
  }

  /**
   * Load cache from localStorage
   */
  private loadCache(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return;
      }

      const parsed = JSON.parse(stored);

      // Reconstruct cache map
      parsed.forEach((item: any) => {
        // Reconstruct HttpResponse
        const response = new HttpResponse({
          body: item.response.body,
          headers: item.response.headers,
          status: item.response.status,
          statusText: item.response.statusText,
          url: item.response.url
        });

        this.cache.set(item.url, {
          url: item.url,
          response,
          timestamp: item.timestamp,
          expiresAt: item.expiresAt
        });
      });

      console.log(`[OfflineCache] Loaded ${this.cache.size} cached responses`);
    } catch (error) {
      console.error('[OfflineCache] Error loading cache:', error);
      this.cache.clear();
    }
  }

  /**
   * Save cache to localStorage
   */
  private saveCache(retryCount: number = 0): void {
    const MAX_RETRIES = 3;

    try {
      const serializable = Array.from(this.cache.values()).map(item => ({
        url: item.url,
        response: {
          body: item.response.body,
          headers: this.serializeHeaders(item.response.headers),
          status: item.response.status,
          statusText: item.response.statusText,
          url: item.response.url
        },
        timestamp: item.timestamp,
        expiresAt: item.expiresAt
      }));

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(serializable));
    } catch (error) {
      // If localStorage is full, clear old cache and retry
      if (error instanceof DOMException &&
          (error.name === 'QuotaExceededError' || error.code === 22)) {

        if (retryCount < MAX_RETRIES) {
          console.warn(`[OfflineCache] Storage quota exceeded, clearing old cache (attempt ${retryCount + 1}/${MAX_RETRIES})`);
          this.clearOldest(10); // Clear more entries each retry
          this.saveCache(retryCount + 1);
        } else {
          // Give up and clear all cache
          console.warn('[OfflineCache] Storage quota still exceeded after retries, clearing all cache');
          this.cache.clear();
          localStorage.removeItem(this.STORAGE_KEY);
        }
      } else {
        console.error('[OfflineCache] Error saving cache:', error);
      }
    }
  }

  /**
   * Serialize headers for storage
   */
  private serializeHeaders(headers: any): any {
    const serialized: any = {};
    headers.keys().forEach((key: string) => {
      serialized[key] = headers.get(key);
    });
    return serialized;
  }

  /**
   * Clean expired cache entries
   */
  private cleanExpiredCache(): void {
    let expiredCount = 0;
    const now = Date.now();

    this.cache.forEach((cached, url) => {
      if (now > cached.expiresAt) {
        this.cache.delete(url);
        expiredCount++;
      }
    });

    if (expiredCount > 0) {
      console.log(`[OfflineCache] Cleaned ${expiredCount} expired entries`);
      this.saveCache();
    }
  }

  /**
   * Clear oldest cache entries
   */
  private clearOldest(count: number): void {
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);

    for (let i = 0; i < Math.min(count, entries.length); i++) {
      this.cache.delete(entries[i][0]);
    }
  }
}
