import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NotificationService } from '../../core/services/notification-service';
import { Notification } from '../../core/interfaces/notification.interface';
import { AuthService } from '../../core/services/auth';
import { ParentChildHeaderSimpleComponent } from '../../shared/components/parent-child-header-simple/parent-child-header-simple.component';
import { TitlePage } from '../../shared/layouts/title-page/title-page';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { IonContent, IonRefresher, IonRefresherContent } from '@ionic/angular/standalone';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, TranslateModule, ParentChildHeaderSimpleComponent, TitlePage, SkeletonComponent, IonContent, IonRefresher, IonRefresherContent],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss'
})
export class NotificationsComponent implements OnInit {
  notifications: Notification[] = [];
  filteredNotifications: Notification[] = [];
  displayedNotifications: Notification[] = [];
  activeTab: 'all' | 'unread' = 'all';
  isLoading = false;
  loading = false;
  currentPage = 1;
  pageSize = 10;

  get isParent(): boolean {
    return this.authService.isParent();
  }

  constructor(
    private notificationService: NotificationService,
    private authService: AuthService,
    private router: Router,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    if (!this.authService.isParent()) {
      this.router.navigate(['/dashboard']);
      return;
    }
    this.loadNotifications();
    
    this.notificationService.notificationReceived$.subscribe(notification => {
      if (notification) {
        this.loadNotifications();
      }
    });
  }

  loadNotifications(): void {
    this.isLoading = true;
    this.notificationService.getAllNotifications().subscribe({
      next: (notifications) => {
        this.notifications = notifications;
        this.filterNotifications();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  filterNotifications(): void {
    if (this.activeTab === 'all') {
      this.filteredNotifications = this.notifications;
    } else {
      this.filteredNotifications = this.notifications.filter(n => !n.isRead);
    }
    this.currentPage = 1;
    this.updateDisplayedNotifications();
  }

  updateDisplayedNotifications(): void {
    const endIndex = this.currentPage * this.pageSize;
    this.displayedNotifications = this.filteredNotifications.slice(0, endIndex);
  }

  loadMore(): void {
    this.currentPage++;
    this.updateDisplayedNotifications();
  }

  get hasMoreNotifications(): boolean {
    return this.displayedNotifications.length < this.filteredNotifications.length;
  }

  get hasUnreadNotifications(): boolean {
    return this.filteredNotifications.some(n => !n.isRead);
  }

  setActiveTab(tab: 'all' | 'unread'): void {
    this.activeTab = tab;
    this.filterNotifications();
  }

  onNotificationClick(notification: Notification): void {
    this.notificationService.handleNotificationClick(notification);
    notification.isRead = true;
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe(() => {
      this.notifications.forEach(n => n.isRead = true);
      this.filterNotifications();
    });
  }

  getNotificationIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'info': 'bi bi-info-circle-fill',
      'success': 'bi bi-check-circle-fill',
      'warning': 'bi bi-exclamation-triangle-fill',
      'error': 'bi bi-x-circle-fill',
      'message': 'bi bi-chat-dots-fill',
      'system': 'bi bi-gear-fill'
    };
    return icons[type.toLowerCase()] || 'bi bi-bell-fill';
  }

  getNotificationIconClass(type: string): string {
    const classes: { [key: string]: string } = {
      'info': 'icon-info',
      'success': 'icon-success',
      'warning': 'icon-warning',
      'error': 'icon-error',
      'message': 'icon-message',
      'system': 'icon-system'
    };
    return classes[type.toLowerCase()] || 'icon-default';
  }

  getTimeAgo(dateString: string): string {
    let dateStr = dateString;
    if (!dateString.endsWith('Z') && !dateString.includes('+') && dateString.includes('T')) {
      dateStr = dateString + 'Z';
    }
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    const timeStr = date.toLocaleTimeString(this.translate.currentLang || 'en', { hour: 'numeric', minute: '2-digit', hour12: true });
    const todayLabel = this.translate.instant('NOTIFICATIONS_PAGE.TIME.TODAY');
    const yesterdayLabel = this.translate.instant('NOTIFICATIONS_PAGE.TIME.YESTERDAY');
    const justNowLabel = this.translate.instant('NOTIFICATIONS_PAGE.TIME.JUST_NOW');

    if (seconds < 0) return justNowLabel;
    if (seconds < 60) return `${todayLabel}, ${timeStr}`;
    if (minutes < 60) return `${todayLabel}, ${timeStr}`;
    if (hours < 24) return `${todayLabel}, ${timeStr}`;
    if (days === 1) return `${yesterdayLabel}, ${timeStr}`;
    return date.toLocaleDateString(this.translate.currentLang || 'en');
  }

  /**
   * Get the translated title for a notification.
   * Uses titleKey if available, otherwise falls back to title.
   */
  getTranslatedTitle(notification: Notification): string {
    if (notification.titleKey) {
      const params = this.parseMessageParams(notification.messageParams);
      const translated = this.translate.instant(notification.titleKey, params);
      // If translation key not found, it returns the key itself - fallback to title
      return translated === notification.titleKey ? notification.title : translated;
    }
    return notification.title;
  }

  /**
   * Get the translated message for a notification.
   * Uses messageKey if available, otherwise falls back to message.
   */
  getTranslatedMessage(notification: Notification): string {
    if (notification.messageKey) {
      const params = this.parseMessageParams(notification.messageParams);
      const translated = this.translate.instant(notification.messageKey, params);
      // If translation key not found, it returns the key itself - fallback to message
      return translated === notification.messageKey ? notification.message : translated;
    }
    return notification.message;
  }

  /**
   * Parse messageParams from JSON string or return as-is if already an object
   */
  private parseMessageParams(messageParams?: string | Record<string, string>): Record<string, string> {
    if (!messageParams) return {};
    if (typeof messageParams === 'string') {
      try {
        return JSON.parse(messageParams);
      } catch {
        return {};
      }
    }
    return messageParams;
  }

  getAvatarText(name: string): string {
    if (!name) return 'SY';
    const words = name.split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  // Pull-to-refresh handler for Ionic refresher
  onRefresh(event?: any): void {
    this.loadNotifications();
    setTimeout(() => {
      // Complete the Ionic refresher
      if (event?.target) {
        event.target.complete();
      }
    }, 500);
  }
}
