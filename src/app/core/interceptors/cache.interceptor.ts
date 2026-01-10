import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap, of } from 'rxjs';
import { OfflineCacheService } from '../services/offline-cache.service';
import { NetworkService } from '../services/network.service';

// Custom header to skip caching
export const SKIP_CACHE = 'X-Skip-Cache';

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
        // Cache successful GET responses
        cacheService.set(req.url, event);
        console.log(`[Cache] Cached response: ${req.url}`);
      }
    })
  );
};
