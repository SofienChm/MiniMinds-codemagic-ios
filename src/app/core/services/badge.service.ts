import { Injectable } from '@angular/core';
import { Badge } from '@capawesome/capacitor-badge';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root'
})
export class BadgeService {
  private isNative = Capacitor.isNativePlatform();
  private isSupported = false;

  constructor() {
    this.checkSupport();
  }

  /**
   * Check if badge is supported on this device
   */
  private async checkSupport(): Promise<void> {
    if (!this.isNative) {
      this.isSupported = false;
      return;
    }

    try {
      const result = await Badge.isSupported();
      this.isSupported = result.isSupported;
    } catch (error) {
      console.warn('Badge support check failed:', error);
      this.isSupported = false;
    }
  }

  /**
   * Set the badge count on the app icon
   * @param count Number to display (0 clears the badge)
   */
  async setBadge(count: number): Promise<void> {
    if (!this.isNative) return;

    try {
      // Request permission first (required on some platforms)
      const permission = await Badge.checkPermissions();
      if (permission.display !== 'granted') {
        const request = await Badge.requestPermissions();
        if (request.display !== 'granted') {
          console.warn('Badge permission not granted');
          return;
        }
      }

      await Badge.set({ count });
    } catch (error) {
      console.warn('Failed to set badge:', error);
    }
  }

  /**
   * Get the current badge count
   */
  async getBadge(): Promise<number> {
    if (!this.isNative) return 0;

    try {
      const result = await Badge.get();
      return result.count;
    } catch (error) {
      console.warn('Failed to get badge:', error);
      return 0;
    }
  }

  /**
   * Increase the badge count by a specified amount
   */
  async increase(by: number = 1): Promise<void> {
    if (!this.isNative) return;

    try {
      const current = await this.getBadge();
      await this.setBadge(current + by);
    } catch (error) {
      console.warn('Failed to increase badge:', error);
    }
  }

  /**
   * Decrease the badge count by a specified amount
   */
  async decrease(by: number = 1): Promise<void> {
    if (!this.isNative) return;

    try {
      const current = await this.getBadge();
      await this.setBadge(Math.max(0, current - by));
    } catch (error) {
      console.warn('Failed to decrease badge:', error);
    }
  }

  /**
   * Clear the badge (set to 0)
   */
  async clear(): Promise<void> {
    if (!this.isNative) return;

    try {
      await Badge.clear();
    } catch (error) {
      console.warn('Failed to clear badge:', error);
    }
  }
}
