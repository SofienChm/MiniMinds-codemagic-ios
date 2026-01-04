import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from './core/services/auth';
import { FcmPushNotificationService } from './core/services/fcm-push-notification.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('miniminds-web');
  private translate = inject(TranslateService);
  private authService = inject(AuthService);
  private fcmService = inject(FcmPushNotificationService);
  private userSubscription?: Subscription;

  constructor(private translates: TranslateService) {
    const savedLang = localStorage.getItem('lang') || 'en';
    translates.setDefaultLang('en');
    translates.use(savedLang);
  }

  ngOnInit(): void {
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      if (user?.preferredLanguage) {
        this.translate.use(user.preferredLanguage);
        localStorage.setItem('lang', user.preferredLanguage);
      }

      // Initialize FCM push notifications when user logs in
      if (user && this.fcmService.isSupported()) {
        this.initializePushNotifications();
      }
    });

    // Also check if already logged in on app start
    if (this.authService.isAuthenticated() && this.fcmService.isSupported()) {
      this.initializePushNotifications();
    }
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
  }

  private async initializePushNotifications(): Promise<void> {
    try {
      await this.fcmService.initialize();
      console.log('FCM Push notifications initialized');
    } catch (error) {
      console.error('Failed to initialize FCM push notifications:', error);
    }
  }
}
