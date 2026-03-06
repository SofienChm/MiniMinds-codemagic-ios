import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import {
  PushNotifications,
  PushNotificationSchema,
  ActionPerformed,
  Token,
} from '@capacitor/push-notifications';
import { Preferences } from '@capacitor/preferences';
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

      // Set up listeners BEFORE register() so no events are missed
      this.setupListeners();

      // Register with FCM
      await PushNotifications.register();

      console.log('Push notifications initialized successfully');
    } catch (error) {
      console.error('Error initializing push notifications:', error);
    }
  }

  /**
   * Set up push notification listeners
   */
  private setupListeners(): void {
    // On registration success
    PushNotifications.addListener('registration', async (token: Token) => {
      let registrationToken: string;

      if (Capacitor.getPlatform() === 'ios') {
        // On iOS, token.value is the raw APNs device token (NOT an FCM token).
        // Firebase Messaging exchanges it for an FCM token asynchronously.
        // AppDelegate stores the FCM token in UserDefaults via Capacitor Preferences key.
        const fcmToken = await this.waitForFcmToken();
        if (!fcmToken) {
          console.error('Could not retrieve FCM token on iOS');
          return;
        }
        registrationToken = fcmToken;
      } else {
        // On Android, token.value is already the FCM registration token
        registrationToken = token.value;
      }

      console.log('FCM Token ready:', registrationToken);
      this.fcmToken = registrationToken;
      this.fcmTokenSubject.next(registrationToken);

      // Register token with backend
      await this.registerTokenWithBackend(registrationToken);
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
          let url = data.redirectUrl as string;
          console.log('Navigating to redirectUrl:', url);

          // Handle /reclamations/:id - convert to /reclamations?id=:id since there's no detail page
          const reclamationMatch = url.match(/^\/reclamations\/(\d+)$/);
          if (reclamationMatch) {
            url = `/reclamations?id=${reclamationMatch[1]}`;
            console.log('Converted reclamation URL to:', url);
          }

          // Use navigateByUrl for full path navigation (handles /path/to/page, /page?id=123, etc.)
          this.router.navigateByUrl(url).then(
            (success) => console.log('Navigation success:', success),
            (error) => console.error('Navigation error:', error)
          );
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
      case 'CheckIn':
      case 'CheckOut':
        this.router.navigate(['/daily-activities']);
        break;
      case 'Reclamation':
        this.router.navigate(['/reclamations']);
        break;
      default:
        this.router.navigate(['/notifications']);
        break;
    }
  }

  /**
   * Wait for Firebase to generate and store the FCM token in Preferences.
   * AppDelegate stores it under key 'FCMToken' after receiving it from Firebase Messaging.
   */
  private async waitForFcmToken(maxRetries = 10, delayMs = 1500): Promise<string | null> {
    for (let i = 0; i < maxRetries; i++) {
      const { value } = await Preferences.get({ key: 'FCMToken' });
      if (value) {
        return value;
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    return null;
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
