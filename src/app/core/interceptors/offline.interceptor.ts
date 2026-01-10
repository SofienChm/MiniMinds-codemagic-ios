import { HttpInterceptorFn, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError, of, tap } from 'rxjs';
import { NetworkService } from '../services/network.service';
import { OfflineQueueService } from '../services/offline-queue.service';

// Custom header to skip offline queue (for specific requests)
export const SKIP_OFFLINE_QUEUE = 'X-Skip-Offline-Queue';

// Custom header to enable offline queue for specific requests
export const ENABLE_OFFLINE_QUEUE = 'X-Enable-Offline-Queue';

/**
 * Offline Queue Interceptor
 *
 * Handles network failures by queuing write operations (POST, PUT, DELETE, PATCH)
 * for later retry when connection is restored.
 *
 * Read operations (GET) are not queued - they just fail with an error.
 *
 * Usage:
 * - By default, only write operations on certain endpoints are queued
 * - Add SKIP_OFFLINE_QUEUE header to bypass queuing for specific requests
 * - Add ENABLE_OFFLINE_QUEUE header to force queuing for specific requests
 */
export const offlineInterceptor: HttpInterceptorFn = (req, next) => {
  const networkService = inject(NetworkService);
  const offlineQueue = inject(OfflineQueueService);

  // Check if request should skip offline queue
  const skipQueue = req.headers.has(SKIP_OFFLINE_QUEUE);
  const forceQueue = req.headers.has(ENABLE_OFFLINE_QUEUE);

  // Remove custom headers before sending
  let cleanReq = req;
  if (skipQueue || forceQueue) {
    cleanReq = req.clone({
      headers: req.headers
        .delete(SKIP_OFFLINE_QUEUE)
        .delete(ENABLE_OFFLINE_QUEUE)
    });
  }

  // Determine if this request should be queued when offline
  const shouldQueue = !skipQueue && (forceQueue || shouldQueueRequest(cleanReq));

  // If offline and should queue write operations
  if (!networkService.isConnected && shouldQueue) {
    // Queue the request
    const queueId = offlineQueue.addToQueue(cleanReq, getRequestDescription(cleanReq));

    console.log(`[OfflineInterceptor] Request queued: ${getRequestDescription(cleanReq)}`);

    // Return a fake success response to prevent error UI
    // The request will be retried when back online
    return of(new HttpResponse({
      status: 202, // 202 Accepted (queued for processing)
      statusText: 'Queued',
      body: {
        success: true,
        queued: true,
        queueId: queueId,
        message: 'Request saved. Will sync when online.'
      },
      headers: cleanReq.headers
    }));
  }

  // Process request normally
  return next(cleanReq).pipe(
    tap(event => {
      // Log successful requests
      if (event instanceof HttpResponse && shouldQueue) {
        console.log(`[OfflineInterceptor] Request succeeded: ${getRequestDescription(cleanReq)}`);
      }
    }),
    catchError((error: HttpErrorResponse) => {
      // Handle network errors (status 0 = network failure)
      if (error.status === 0 && shouldQueue) {
        console.warn(`[OfflineInterceptor] Network error, queueing request: ${getRequestDescription(cleanReq)}`);

        // Queue the failed request
        const queueId = offlineQueue.addToQueue(cleanReq, getRequestDescription(cleanReq));

        // Return a custom response indicating request was queued
        return of(new HttpResponse({
          status: 202,
          statusText: 'Queued',
          body: {
            success: true,
            queued: true,
            queueId: queueId,
            message: 'Network error. Request saved and will sync when online.'
          },
          headers: cleanReq.headers
        }));
      }

      // For other errors, let error interceptor handle them
      return throwError(() => error);
    })
  );
};

/**
 * Determine if a request should be queued when offline
 */
function shouldQueueRequest(req: any): boolean {
  const method = req.method.toUpperCase();

  // Only queue write operations
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return false;
  }

  // Queue specific endpoints that are critical
  const url = req.url.toLowerCase();

  const queueableEndpoints = [
    '/attendance',        // Check-in/check-out
    '/messages',          // Send messages
    '/daily-activities',  // Upload activities/photos
    '/qr-action',         // QR code actions
    '/leaves',            // Leave requests
    '/reclamations',      // Reclamation submissions
    '/fees'               // Fee updates
  ];

  // Check if URL contains any queueable endpoint
  return queueableEndpoints.some(endpoint => url.includes(endpoint));
}

/**
 * Get human-readable description of request for logging
 */
function getRequestDescription(req: any): string {
  const method = req.method;
  const url = req.url;

  // Extract endpoint name
  const parts = url.split('/');
  const endpoint = parts[parts.length - 1] || parts[parts.length - 2] || 'unknown';

  // Add body info for better context
  let bodyInfo = '';
  if (req.body) {
    if (typeof req.body === 'object') {
      const keys = Object.keys(req.body);
      if (keys.length > 0) {
        bodyInfo = ` (${keys.slice(0, 3).join(', ')})`;
      }
    }
  }

  return `${method} /${endpoint}${bodyInfo}`;
}
