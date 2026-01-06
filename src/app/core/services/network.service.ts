import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Network, ConnectionStatus, ConnectionType } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';

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
    this.networkStatus$.next({
      connected: status.connected,
      connectionType: status.connectionType
    });
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
}
