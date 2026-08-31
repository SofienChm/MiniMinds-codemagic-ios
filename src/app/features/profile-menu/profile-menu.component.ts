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
  chatUnreadCount = 0;
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

    // Load chat (conversations + groups) unread count
    this.loadChatUnreadCount();

    // Refresh chat unread count on incoming chat/group messages
    this.notificationService.chatMessageReceived$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadChatUnreadCount());

    this.notificationService.groupMessageReceived$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadChatUnreadCount());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadChatUnreadCount(): void {
    this.messagesService.getConversations().subscribe({
      next: (conversations) => {
        const conversationUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
        this.messagesService.getChatGroups().subscribe({
          next: (groups) => {
            const groupUnread = groups.reduce((sum, g) => sum + (g.unreadCount || 0), 0);
            this.chatUnreadCount = conversationUnread + groupUnread;
          },
          error: () => {
            this.chatUnreadCount = conversationUnread;
          }
        });
      },
      error: () => {
        this.messagesService.getChatGroups().subscribe({
          next: (groups) => {
            this.chatUnreadCount = groups.reduce((sum, g) => sum + (g.unreadCount || 0), 0);
          },
          error: () => this.chatUnreadCount = 0
        });
      }
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