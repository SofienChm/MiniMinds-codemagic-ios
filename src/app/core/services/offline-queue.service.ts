import { Injectable } from '@angular/core';
import { HttpRequest } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';

export interface QueuedRequest {
  id: string;
  request: HttpRequest<any>;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  description?: string;
}

export interface QueueStatus {
  pending: number;
  syncing: boolean;
  lastSync?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class OfflineQueueService {
  private readonly STORAGE_KEY = 'miniminds_offline_queue';
  private readonly MAX_QUEUE_SIZE = 50;
  private queue: QueuedRequest[] = [];
  private queueStatus$ = new BehaviorSubject<QueueStatus>({
    pending: 0,
    syncing: false
  });

  constructor() {
    this.loadQueue();
  }

  /**
   * Add a request to the offline queue
   */
  addToQueue(request: HttpRequest<any>, description?: string): string {
    const id = this.generateId();
    const queuedRequest: QueuedRequest = {
      id,
      request: this.cloneRequest(request),
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: 3,
      description: description || this.getRequestDescription(request)
    };

    this.queue.push(queuedRequest);
    this.saveQueue();
    this.updateStatus();

    console.log(`[OfflineQueue] Added request to queue: ${queuedRequest.description}`);
    return id;
  }

  /**
   * Get all queued requests
   */
  getQueue(): QueuedRequest[] {
    return [...this.queue];
  }

  /**
   * Get queue status as observable
   */
  getStatus(): Observable<QueueStatus> {
    return this.queueStatus$.asObservable();
  }

  /**
   * Get current queue status synchronously
   */
  getCurrentStatus(): QueueStatus {
    return this.queueStatus$.value;
  }

  /**
   * Remove a request from queue by ID
   */
  removeFromQueue(id: string): void {
    const index = this.queue.findIndex(item => item.id === id);
    if (index > -1) {
      const removed = this.queue.splice(index, 1)[0];
      console.log(`[OfflineQueue] Removed from queue: ${removed.description}`);
      this.saveQueue();
      this.updateStatus();
    }
  }

  /**
   * Clear the entire queue
   */
  clearQueue(): void {
    this.queue = [];
    this.saveQueue();
    this.updateStatus();
    console.log('[OfflineQueue] Queue cleared');
  }

  /**
   * Mark syncing started
   */
  startSync(): void {
    this.queueStatus$.next({
      ...this.queueStatus$.value,
      syncing: true
    });
  }

  /**
   * Mark syncing completed
   */
  endSync(): void {
    this.queueStatus$.next({
      ...this.queueStatus$.value,
      syncing: false,
      lastSync: new Date()
    });
  }

  /**
   * Increment retry count for a request
   */
  incrementRetry(id: string): boolean {
    const item = this.queue.find(req => req.id === id);
    if (item) {
      item.retryCount++;

      // Remove if exceeded max retries
      if (item.retryCount >= item.maxRetries) {
        console.warn(`[OfflineQueue] Max retries exceeded for: ${item.description}`);
        this.removeFromQueue(id);
        return false;
      }

      this.saveQueue();
      return true;
    }
    return false;
  }

  /**
   * Check if queue has requests
   */
  hasQueuedRequests(): boolean {
    return this.queue.length > 0;
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Load queue from localStorage
   */
  private loadQueue(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);

        // Reconstruct HttpRequest objects
        this.queue = parsed.map((item: any) => ({
          ...item,
          request: new HttpRequest(
            item.request.method,
            item.request.url,
            item.request.body,
            {
              headers: item.request.headers,
              params: item.request.params,
              responseType: item.request.responseType,
              withCredentials: item.request.withCredentials
            }
          )
        }));

        console.log(`[OfflineQueue] Loaded ${this.queue.length} queued requests`);
        this.updateStatus();
      }
    } catch (error) {
      console.error('[OfflineQueue] Error loading queue:', error);
      this.queue = [];
    }
  }

  /**
   * Save queue to localStorage
   */
  private saveQueue(): void {
    try {
      // Check queue size limit
      if (this.queue.length > this.MAX_QUEUE_SIZE) {
        console.warn(`[OfflineQueue] Queue size exceeded ${this.MAX_QUEUE_SIZE}, removing oldest`);
        this.queue = this.queue.slice(-this.MAX_QUEUE_SIZE);
      }

      // Serialize queue
      const serializable = this.queue.map(item => ({
        id: item.id,
        request: {
          method: item.request.method,
          url: item.request.url,
          body: item.request.body,
          headers: this.serializeHeaders(item.request.headers),
          params: this.serializeParams(item.request.params),
          responseType: item.request.responseType,
          withCredentials: item.request.withCredentials
        },
        timestamp: item.timestamp,
        retryCount: item.retryCount,
        maxRetries: item.maxRetries,
        description: item.description
      }));

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(serializable));
    } catch (error) {
      console.error('[OfflineQueue] Error saving queue:', error);
    }
  }

  /**
   * Update queue status
   */
  private updateStatus(): void {
    this.queueStatus$.next({
      ...this.queueStatus$.value,
      pending: this.queue.length
    });
  }

  /**
   * Clone HttpRequest (can't store directly in localStorage)
   */
  private cloneRequest(request: HttpRequest<any>): HttpRequest<any> {
    return request.clone();
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
   * Serialize params for storage
   */
  private serializeParams(params: any): any {
    const serialized: any = {};
    params.keys().forEach((key: string) => {
      serialized[key] = params.get(key);
    });
    return serialized;
  }

  /**
   * Generate unique ID for queue item
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get human-readable description of request
   */
  private getRequestDescription(request: HttpRequest<any>): string {
    const method = request.method;
    const url = request.url;

    // Extract endpoint name from URL
    const parts = url.split('/');
    const endpoint = parts[parts.length - 1] || parts[parts.length - 2] || 'unknown';

    return `${method} ${endpoint}`;
  }
}
