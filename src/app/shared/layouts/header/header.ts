import { Component, OnInit, OnDestroy, Output, EventEmitter, HostListener } from '@angular/core';
import { AuthResponse } from '../../../core/interfaces/dto/auth-response-dto';
import { AuthService } from '../../../core/services/auth';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { NotificationService } from '../../../core/services/notification-service';
import { PushNotificationService } from '../../../core/services/push-notification.service';
import { Notification } from '../../../core/interfaces/notification.interface';
import { CommonModule } from '@angular/common';
import { LanguageSelector } from '../../components/language-selector/language-selector';
import { TranslateModule } from '@ngx-translate/core';
import { MessagesService } from '../../../core/services/messages.service';
import { PageTitleService } from '../../../core/services/page-title.service';
import { HttpClient } from '@angular/common/http';
import { ApiConfig } from '../../../core/config/api.config';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-header',
  imports: [CommonModule, RouterLink, RouterLinkActive, LanguageSelector, TranslateModule],
  templateUrl: './header.html',
  styleUrls: ['./header.scss']
})

export class Header implements OnInit, OnDestroy {
  @Output() mobileMenuToggle = new EventEmitter<void>();
  currentUser: AuthResponse | null = null;
  unreadCount = 0;
  messagesUnreadCount = 0;
  showNotifications = false;
  showUserMenu = false;
  showQuickLinks = false;
  notifications: Notification[] = [];
  isAdmin = false;
  isParent = false;
  pageTitle = '';
  private messageCountIntervalId?: any;
  private apiUrl = ApiConfig.ENDPOINTS.PARENTS;
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private pushNotificationService: PushNotificationService,
    private messagesService: MessagesService,
    private pageTitleService: PageTitleService,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.isAdmin = this.authService.isAdmin();
    this.isParent = this.authService.isParent();
    
    if (this.currentUser) {
      this.loadNotifications();
      this.loadMessagesUnreadCount();
      if (this.isParent) {
        this.loadParentProfilePicture();
      }
      
      const token = localStorage.getItem('token');
      let userId = localStorage.getItem('userId');
      
      // Fallback: Extract userId from token if not in localStorage
      if (!userId && token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          // Use the nameidentifier claim which contains the GUID
          userId = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || payload.nameid || payload.sub;
          if (userId) {
            localStorage.setItem('userId', userId);
          }
        } catch {
          // Token parsing failed - userId will remain null
        }
      }
      
      if (token && userId) {
        this.notificationService.startConnection(userId, token);
      }
      
      if (this.isParent && this.pushNotificationService.getPermission() === 'default') {
        this.pushNotificationService.requestPermission();
      }
    }

    this.notificationService.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        this.unreadCount = count;
      });

    this.notificationService.notificationReceived$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notification => {
        if (notification) {
          this.notifications.unshift(notification);
        }
      });

    this.pageTitleService.title$.subscribe(title => {
      this.pageTitle = title;
    });

    this.notificationService.messageUnreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        this.messagesUnreadCount = count;
      });

    }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.notificationService.stopConnection();
  }

  loadNotifications(): void {
    if (this.currentUser) {
      this.notificationService.getAllNotifications().subscribe({
        next: (notifications) => {
          this.notifications = notifications;
        },
        error: () => {
          this.notifications = [];
        }
      });
    }
  }

  loadMessagesUnreadCount(): void {
    this.messagesService.getUnreadCount().subscribe({
      next: (count) => {
        this.messagesUnreadCount = count;
      },
      error: () => {
        this.messagesUnreadCount = 0;
      }
    });
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
    if (this.showNotifications) {
      this.loadNotifications();
    }
  }

  onNotificationClick(notification: Notification): void {
    this.notificationService.handleNotificationClick(notification);
    const index = this.notifications.findIndex(n => n.id === notification.id);
    if (index !== -1) {
      this.notifications[index].isRead = true;
    }
    this.showNotifications = false;
  }

  markAsRead(id: number): void {
    this.notificationService.markAsRead(id).subscribe(() => {
      this.loadNotifications();
    });
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe(() => {
      this.loadNotifications();
    });
  }

  logout(): void {
    this.authService.logout();
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  closeUserMenu(): void {
    this.showUserMenu = false;
  }

  getInitials(): string {
    if (!this.currentUser) return '';
    return `${this.currentUser.firstName.charAt(0)}${this.currentUser.lastName.charAt(0)}`.toUpperCase();
  }

  toggleMobileMenu(): void {
    this.mobileMenuToggle.emit();
  }

  getNotificationIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'info': 'bi bi-info-circle-fill',
      'success': 'bi bi-check-circle-fill',
      'warning': 'bi bi-exclamation-triangle-fill',
      'error': 'bi bi-x-circle-fill',
      'message': 'bi bi-chat-dots-fill',
      'event': 'bi bi-calendar-event-fill',
      'system': 'bi bi-gear-fill',
      'eventregistration': 'bi bi-patch-question',
      'payment': 'bi bi-currency-dollar',
      'fee': 'bi bi-currency-dollar'
    };
    return icons[type.toLowerCase()] || 'bi bi-bell-fill';
  }

  getNotificationIconClass(type: string): string {
    const classes: { [key: string]: string } = {
      'info': 'icon-info',
      'success': 'icon-success',
      'warning': 'icon-warning',
      'error': 'icon-error',
      'payment': 'icon-error',
      'message': 'icon-message',
      'event': 'icon-event',
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
    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}min ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  }

  toggleQuickLinks(): void {
    this.showQuickLinks = !this.showQuickLinks;
  }

  closeQuickLinks(): void {
    this.showQuickLinks = false;
  }

  @HostListener('document:click', ['$event'])
  handleClickOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    // Close notifications if clicked outside
    if (this.showNotifications && !target.closest('.notification-dropdown') && !target.closest('.btn-header') && !target.closest('.nav-link')) {
      this.showNotifications = false;
    }

    // Close user menu if clicked outside
    if (this.showUserMenu && !target.closest('.dropdown')) {
      this.showUserMenu = false;
    }
  }

  loadParentProfilePicture() {
    const parentId = this.authService.getParentId();
    if (parentId) {
      this.http.get<any>(`${this.apiUrl}/${parentId}`).subscribe({
        next: (parent) => {
          if (parent.profilePicture) {
            this.authService.updateProfilePicture(parent.profilePicture);
          }
        }
      });
    }
  }

  goToParentProfile() {
    this.router.navigate(['/profile-menu']);
  }
}