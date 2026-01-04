import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiConfig } from '../config/api.config';
import { Capacitor } from '@capacitor/core';

export interface DeviceTokenInfo {
  id: number;
  platform: string;
  deviceModel: string | null;
  isActive: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface RegisterTokenResponse {
  message: string;
  tokenId: number;
}

@Injectable({
  providedIn: 'root',
})
export class DeviceTokenService {
  private apiUrl = ApiConfig.ENDPOINTS.DEVICE_TOKENS;

  constructor(private http: HttpClient) {}

  /**
   * Register a device token for push notifications
   */
  registerToken(
    token: string,
    platform?: string,
    deviceModel?: string
  ): Observable<RegisterTokenResponse> {
    // Auto-detect platform if not provided
    const detectedPlatform = platform || Capacitor.getPlatform();

    return this.http.post<RegisterTokenResponse>(`${this.apiUrl}/register`, {
      token,
      platform: detectedPlatform,
      deviceModel: deviceModel || this.getDeviceModel(),
    });
  }

  /**
   * Unregister a device token (e.g., on logout)
   */
  unregisterToken(token: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/unregister`, {
      token,
    });
  }

  /**
   * Get all device tokens for the current user
   */
  getMyTokens(): Observable<DeviceTokenInfo[]> {
    return this.http.get<DeviceTokenInfo[]>(`${this.apiUrl}/my-tokens`);
  }

  /**
   * Send a test push notification to the current user
   */
  sendTestNotification(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/test`, {});
  }

  /**
   * Try to get device model information
   */
  private getDeviceModel(): string | undefined {
    if (typeof navigator !== 'undefined') {
      const userAgent = navigator.userAgent;

      // Try to extract device model from user agent
      if (userAgent.includes('Android')) {
        const match = userAgent.match(/Android[^;]+;\s*([^)]+)/);
        return match ? match[1].trim() : 'Android Device';
      } else if (userAgent.includes('iPhone')) {
        return 'iPhone';
      } else if (userAgent.includes('iPad')) {
        return 'iPad';
      }
    }
    return undefined;
  }
}
