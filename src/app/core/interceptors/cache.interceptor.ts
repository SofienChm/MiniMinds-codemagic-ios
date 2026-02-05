import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap, of } from 'rxjs';
import { OfflineCacheService } from '../services/offline-cache.service';
import { NetworkService } from '../services/network.service';

// Custom header to skip caching
export const SKIP_CACHE = 'X-Skip-Cache';

// Maximum response size to cache (500KB) - prevents caching large Base64 images
const MAX_CACHE_SIZE = 500 * 1024;

// URL patterns to never cache (image/photo endpoints)
const NO_CACHE_PATTERNS = [
  /\/profile-picture/,
  /\/photos\/\d+$/,          // Individual photo fetch
  /\/photos\/download/,
  /imageData/i,
  /fullImage/i
];

/**
 * Cache Interceptor
 *
 * Caches GET responses and serves them when offline.
 * This allows users to view previously loaded data even without internet.
 *
 * Features:
 * - Caches all GET requests automatically
 * - Serves cached data when offline
 * - 1 hour cache expiration (configurable)
 * - Skippable via SKIP_CACHE header
 * - Excludes large responses and image endpoints to prevent storage issues
 */
export const cacheInterceptor: HttpInterceptorFn = (req, next) => {
  const cacheService = inject(OfflineCacheService);
  const networkService = inject(NetworkService);

  // Only cache GET requests
  if (req.method !== 'GET') {
    return next(req);
  }

  // Check if caching should be skipped
  const skipCache = req.headers.has(SKIP_CACHE);
  if (skipCache) {
    const cleanReq = req.clone({ headers: req.headers.delete(SKIP_CACHE) });
    return next(cleanReq);
  }

  // Skip caching for image/photo endpoints to prevent storage bloat
  const shouldSkipUrl = NO_CACHE_PATTERNS.some(pattern => pattern.test(req.url));
  if (shouldSkipUrl) {
    return next(req);
  }

  // If offline, try to serve from cache
  if (!networkService.isConnected) {
    const cached = cacheService.get(req.url);

    if (cached) {
      console.log(`[Cache] Serving from cache (offline): ${req.url}`);

      // Add custom header to indicate cached response
      const cachedWithHeader = cached.clone({
        headers: cached.headers.set('X-From-Cache', 'true')
      });

      return of(cachedWithHeader);
    }

    // No cache available - let it fail normally
    console.log(`[Cache] No cache available for: ${req.url}`);
  }

  // Online: Make request and cache the response
  return next(req).pipe(
    tap(event => {
      if (event instanceof HttpResponse && event.status === 200) {
        // Check response size before caching - skip large responses (Base64 images)
        const responseSize = JSON.stringify(event.body).length;
        if (responseSize > MAX_CACHE_SIZE) {
          console.log(`[Cache] Skipping large response (${Math.round(responseSize / 1024)}KB): ${req.url}`);
          return;
        }

        // Cache successful GET responses
        cacheService.set(req.url, event);
        console.log(`[Cache] Cached response: ${req.url}`);
      }
    })
  );
};
