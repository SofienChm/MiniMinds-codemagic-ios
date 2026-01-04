import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService } from '../../core/services/notification-service';
import { Notification } from '../../core/interfaces/notification.interface';
import { AuthService } from '../../core/services/auth';
import { ParentChildHeaderSimpleComponent } from '../../shared/components/parent-child-header-simple/parent-child-header-simple.component';
import { TitlePage } from '../../shared/layouts/title-page/title-page';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, ParentChildHeaderSimpleComponent, TitlePage],
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
    private router: Router
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
    
    if (seconds < 0) return 'Just now';
    if (seconds < 60) return `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    if (minutes < 60) return `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    if (hours < 24) return `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    if (days === 1) return `Yesterday, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    return date.toLocaleDateString();
  }

  getAvatarText(name: string): string {
    if (!name) return 'SY';
    const words = name.split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
}
