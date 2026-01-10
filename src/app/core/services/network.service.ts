import { Injectable, NgZone, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { Network, ConnectionStatus, ConnectionType } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';
import { OfflineQueueService } from './offline-queue.service';

export interface NetworkState {
  connected: boolean;
  connectionType: ConnectionType;
}

@Injectable({
  providedIn: 'root'
})
export class NetworkService {
  private networkStatus$ = new BehaviorSubject<NetworkState>({
    connected: true,
    connectionType: 'unknown'
  });

  private isInitialized = false;
  private isSyncing = false;
  private offlineQueue = inject(OfflineQueueService);
  private http = inject(HttpClient);

  constructor(private ngZone: NgZone) {
    this.initNetworkListener();
  }

  /**
   * Initialize network status listener
   */
  private async initNetworkListener(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Get initial status
    try {
      const status = await Network.getStatus();
      this.updateStatus(status);
    } catch (error) {
      console.warn('Could not get initial network status:', error);
      // Fallback to browser online status
      this.updateStatus({
        connected: navigator.onLine,
        connectionType: 'unknown'
      });
    }

    // Listen for changes
    Network.addListener('networkStatusChange', (status: ConnectionStatus) => {
      this.ngZone.run(() => {
        this.updateStatus(status);
        console.log('Network status changed:', status);
      });
    });

    // Also listen to browser events as fallback
    window.addEventListener('online', () => {
      this.ngZone.run(() => {
        this.networkStatus$.next({
          ...this.networkStatus$.value,
          connected: true
        });
      });
    });

    window.addEventListener('offline', () => {
      this.ngZone.run(() => {
        this.networkStatus$.next({
          ...this.networkStatus$.value,
          connected: false
        });
      });
    });
  }

  private updateStatus(status: ConnectionStatus): void {
    const wasConnected = this.networkStatus$.value.connected;
    const isNowConnected = status.connected;

    this.networkStatus$.next({
      connected: status.connected,
      connectionType: status.connectionType
    });

    // If connection restored, process offline queue
    if (!wasConnected && isNowConnected) {
      console.log('[NetworkService] Connection restored, processing offline queue...');
      this.processOfflineQueue();
    }
  }

  /**
   * Get current network status as observable
   */
  get status$(): Observable<NetworkState> {
    return this.networkStatus$.asObservable();
  }

  /**
   * Get current connection status synchronously
   */
  get isConnected(): boolean {
    return this.networkStatus$.value.connected;
  }

  /**
   * Get current connection type
   */
  get connectionType(): ConnectionType {
    return this.networkStatus$.value.connectionType;
  }

  /**
   * Check if on WiFi
   */
  get isOnWifi(): boolean {
    return this.networkStatus$.value.connectionType === 'wifi';
  }

  /**
   * Check if on cellular
   */
  get isOnCellular(): boolean {
    return this.networkStatus$.value.connectionType === 'cellular';
  }

  /**
   * Get current status (async)
   */
  async getStatus(): Promise<ConnectionStatus> {
    try {
      return await Network.getStatus();
    } catch {
      return {
        connected: navigator.onLine,
        connectionType: 'unknown'
      };
    }
  }

  /**
   * Process offline queue when connection is restored
   */
  async processOfflineQueue(): Promise<void> {
    // Prevent concurrent sync attempts
    if (this.isSyncing || !this.isConnected) {
      return;
    }

    const queue = this.offlineQueue.getQueue();
    if (queue.length === 0) {
      console.log('[NetworkService] No queued requests to process');
      return;
    }

    this.isSyncing = true;
    this.offlineQueue.startSync();

    console.log(`[NetworkService] Processing ${queue.length} queued requests...`);

    let successCount = 0;
    let failCount = 0;

    for (const item of queue) {
      try {
        // Execute the queued request
        const request = item.request;
        await firstValueFrom(
          this.http.request(request.method, request.url, {
            body: request.body,
            headers: request.headers,
            params: request.params,
            responseType: request.responseType as any,
            withCredentials: request.withCredentials
          })
        );

        console.log(`[NetworkService] ✓ Synced: ${item.description}`);
        this.offlineQueue.removeFromQueue(item.id);
        successCount++;

      } catch (error) {
        console.error(`[NetworkService] ✗ Failed to sync: ${item.description}`, error);

        // Increment retry count
        const shouldRetry = this.offlineQueue.incrementRetry(item.id);

        if (!shouldRetry) {
          console.warn(`[NetworkService] Removing from queue (max retries): ${item.description}`);
          failCount++;
        }
      }
    }

    this.isSyncing = false;
    this.offlineQueue.endSync();

    console.log(`[NetworkService] Queue processing complete: ${successCount} succeeded, ${failCount} failed`);
  }

  /**
   * Get offline queue service (for components to access)
   */
  getOfflineQueue(): OfflineQueueService {
    return this.offlineQueue;
  }
}
