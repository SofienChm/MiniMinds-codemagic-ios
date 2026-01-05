import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import {
  PushNotifications,
  PushNotificationSchema,
  ActionPerformed,
  Token,
} from '@capacitor/push-notifications';
import { BehaviorSubject } from 'rxjs';
import { DeviceTokenService } from './device-token.service';

@Injectable({
  providedIn: 'root',
})
export class FcmPushNotificationService {
  private fcmToken: string | null = null;
  private fcmTokenSubject = new BehaviorSubject<string | null>(null);
  public fcmToken$ = this.fcmTokenSubject.asObservable();

  private notificationReceivedSubject = new BehaviorSubject<PushNotificationSchema | null>(null);
  public notificationReceived$ = this.notificationReceivedSubject.asObservable();

  constructor(
    private router: Router,
    private deviceTokenService: DeviceTokenService
  ) {}

  /**
   * Check if push notifications are supported (native mobile only)
   */
  isSupported(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Get the current platform
   */
  getPlatform(): string {
    return Capacitor.getPlatform(); // 'android', 'ios', or 'web'
  }

  /**
   * Initialize push notifications
   * Should be called after user login
   */
  async initialize(): Promise<void> {
    if (!this.isSupported()) {
      console.log('Push notifications not supported on this platform');
      return;
    }

    try {
      // Request permission
      const permissionStatus = await PushNotifications.checkPermissions();

      if (permissionStatus.receive === 'prompt') {
        const result = await PushNotifications.requestPermissions();
        if (result.receive !== 'granted') {
          console.log('Push notification permission denied');
          return;
        }
      } else if (permissionStatus.receive !== 'granted') {
        console.log('Push notification permission not granted');
        return;
      }

      // Register with FCM
      await PushNotifications.register();

      // Set up listeners
      this.setupListeners();

      console.log('Push notifications initialized successfully');
    } catch (error) {
      console.error('Error initializing push notifications:', error);
    }
  }

  /**
   * Set up push notification listeners
   */
  private setupListeners(): void {
    // On registration success - receive FCM token
    PushNotifications.addListener('registration', async (token: Token) => {
      console.log('FCM Token received:', token.value);
      this.fcmToken = token.value;
      this.fcmTokenSubject.next(token.value);

      // Register token with backend
      await this.registerTokenWithBackend(token.value);
    });

    // On registration error
    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Push notification registration error:', error);
    });

    // On notification received while app is in foreground
    PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        console.log('Push notification received in foreground:', notification);
        this.notificationReceivedSubject.next(notification);

        // You can show an in-app notification here if desired
        // The notification is automatically displayed by the system on Android
      }
    );

    // On notification tapped (app opened from notification)
    PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action: ActionPerformed) => {
        console.log('Push notification action performed:', action);

        const data = action.notification.data;

        // Navigate to the appropriate page based on notification data
        if (data?.redirectUrl) {
          // Handle URLs with query parameters (e.g., /messages?id=123)
          const url = data.redirectUrl as string;
          if (url.includes('?')) {
            const [path, queryString] = url.split('?');
            const queryParams: { [key: string]: string } = {};
            queryString.split('&').forEach(param => {
              const [key, value] = param.split('=');
              if (key && value) {
                queryParams[key] = value;
              }
            });
            this.router.navigate([path], { queryParams });
          } else {
            this.router.navigate([url]);
          }
        } else if (data?.type) {
          this.handleNotificationNavigation(data.type, data);
        }
      }
    );
  }

  /**
   * Handle navigation based on notification type
   */
  private handleNotificationNavigation(type: string, data: any): void {
    switch (type) {
      case 'Event':
        if (data.eventId) {
          this.router.navigate(['/events/detail', data.eventId]);
        } else {
          this.router.navigate(['/events']);
        }
        break;
      case 'Fee':
        this.router.navigate(['/fees']);
        break;
      case 'Message':
        this.router.navigate(['/messages']);
        break;
      case 'Attendance':
        this.router.navigate(['/daily-activities']);
        break;
      default:
        this.router.navigate(['/notifications']);
        break;
    }
  }

  /**
   * Register the FCM token with the backend
   */
  private async registerTokenWithBackend(token: string): Promise<void> {
    try {
      const platform = this.getPlatform();
      await this.deviceTokenService.registerToken(token, platform).toPromise();
      console.log('FCM token registered with backend successfully');
    } catch (error: any) {
      console.error('Failed to register FCM token with backend:', JSON.stringify(error));
      if (error?.error) {
        console.error('Error details:', JSON.stringify(error.error));
      }
      if (error?.status) {
        console.error('HTTP Status:', error.status);
      }
    }
  }

  /**
   * Unregister from push notifications (call on logout)
   */
  async unregister(): Promise<void> {
    if (!this.isSupported()) {
      return;
    }

    try {
      // Unregister token from backend
      if (this.fcmToken) {
        await this.deviceTokenService.unregisterToken(this.fcmToken).toPromise();
      }

      // Remove all listeners
      await PushNotifications.removeAllListeners();

      this.fcmToken = null;
      this.fcmTokenSubject.next(null);

      console.log('Push notifications unregistered');
    } catch (error) {
      console.error('Error unregistering push notifications:', error);
    }
  }

  /**
   * Get the current FCM token
   */
  getToken(): string | null {
    return this.fcmToken;
  }

  /**
   * Check if notifications are enabled
   */
  async checkPermissions(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    const status = await PushNotifications.checkPermissions();
    return status.receive === 'granted';
  }

  /**
   * Get delivered notifications (Android only)
   */
  async getDeliveredNotifications(): Promise<PushNotificationSchema[]> {
    if (!this.isSupported()) {
      return [];
    }

    const result = await PushNotifications.getDeliveredNotifications();
    return result.notifications;
  }

  /**
   * Remove all delivered notifications
   */
  async removeAllDeliveredNotifications(): Promise<void> {
    if (!this.isSupported()) {
      return;
    }

    await PushNotifications.removeAllDeliveredNotifications();
  }
}
