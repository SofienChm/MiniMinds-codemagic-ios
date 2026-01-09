import { Component, inject, OnInit, OnDestroy, signal, NgZone } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from './core/services/auth';
import { FcmPushNotificationService } from './core/services/fcm-push-notification.service';
import { NetworkService } from './core/services/network.service';
import { StatusBarService } from './core/services/status-bar.service';
import { OfflineIndicatorComponent } from './shared/components/offline-indicator/offline-indicator.component';
import { Subscription } from 'rxjs';
import { App as CapacitorApp, URLOpenListenerEvent } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { CapacitorSwipeBackPlugin } from '@notnotsamuel/capacitor-swipe-back';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, OfflineIndicatorComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('miniminds-web');
  private translate = inject(TranslateService);
  private authService = inject(AuthService);
  private fcmService = inject(FcmPushNotificationService);
  private networkService = inject(NetworkService); // Initialize network monitoring
  private statusBarService = inject(StatusBarService); // Initialize status bar
  private router = inject(Router);
  private zone = inject(NgZone);
  private userSubscription?: Subscription;

  constructor(private translates: TranslateService) {
    const savedLang = localStorage.getItem('lang') || 'en';
    translates.setDefaultLang('en');
    translates.use(savedLang);

    // Initialize swipe back gesture for iOS
    this.initializeSwipeBack();

    // Initialize deep link listener for mobile
    this.initializeDeepLinks();
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

  private async initializeSwipeBack(): Promise<void> {
    // Enable on both iOS and Android native platforms
    if (Capacitor.isNativePlatform()) {
      try {
        await CapacitorSwipeBackPlugin.enable();
        console.log(`${Capacitor.getPlatform()} swipe back gesture enabled`);
      } catch (error) {
        console.error('Failed to enable swipe back gesture:', error);
      }
    }
  }

  private initializeDeepLinks(): void {
    // Only initialize on native platforms
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    // Listen for app URL open events (deep links)
    CapacitorApp.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
      console.log('Deep link received:', event.url);

      // Parse the URL and navigate
      this.zone.run(() => {
        const url = new URL(event.url);
        let path = url.pathname;

        // Handle custom scheme (miniminds://qr-action/CODE)
        if (event.url.startsWith('miniminds://')) {
          const parts = event.url.replace('miniminds://', '').split('/');
          if (parts[0] === 'qr-action' && parts[1]) {
            path = `/qr-action/${parts[1]}`;
          }
        }

        // Handle https scheme (https://app.miniminds.com/qr-action/CODE)
        if (path && path !== '/') {
          console.log('Navigating to:', path);
          this.router.navigateByUrl(path);
        }
      });
    });

    console.log('Deep link listener initialized');
  }
}
