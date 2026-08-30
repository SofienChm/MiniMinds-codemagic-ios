import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth';
import { AuthResponse } from '../../core/interfaces/dto/auth-response-dto';
import { NotificationService } from '../../core/services/notification-service';
import { MessagesService } from '../../core/services/messages.service';
import { Subject, takeUntil } from 'rxjs';
import { ApiConfig } from '../../core/config/api.config';

@Component({
  selector: 'app-profile-menu',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './profile-menu.component.html',
  styleUrl: './profile-menu.component.scss'
})
export class ProfileMenuComponent implements OnInit, OnDestroy {
  currentUser: AuthResponse | null = null;
  messageUnreadCount = 0;
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService,
    private messagesService: MessagesService
  ) {}

  ngOnInit(): void {
    if (!this.authService.isParent()) {
      this.router.navigate(['/dashboard']);
      return;
    }
    this.currentUser = this.authService.getCurrentUser();

    // Load initial unread count
    this.loadMessageUnreadCount();

    // Subscribe to real-time updates via SignalR
    this.notificationService.messageUnreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        this.messageUnreadCount = count;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadMessageUnreadCount(): void {
    this.messagesService.getUnreadCount().subscribe({
      next: (count) => this.messageUnreadCount = count,
      error: () => this.messageUnreadCount = 0
    });
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  goBack(): void {
    window.history.back();
  }

  /**
   * Get the current user's profile picture URL, preferring file-based URL over Base64
   */
  getProfilePictureUrl(): string {
    if (!this.currentUser) return 'assets/default-avatar.svg';
    if (this.currentUser.profilePictureUrl && this.currentUser.profilePictureUrl.trim() !== '') {
      return this.getFullUrl(this.currentUser.profilePictureUrl);
    }
    if (this.currentUser.profilePicture && this.currentUser.profilePicture.trim() !== '') {
      return this.getFullUrl(this.currentUser.profilePicture);
    }
    return 'assets/default-avatar.svg';
  }

  private getFullUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    return `${ApiConfig.HUB_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  logout(): void {
    this.authService.logout();
  }
}