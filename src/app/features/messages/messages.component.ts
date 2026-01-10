import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { ActivatedRoute } from '@angular/router';
import { MessagesService, MailMessage, Recipient } from '../../core/services/messages.service';
import { AuthService } from '../../core/services/auth';
import { Location } from '@angular/common';
import { ParentChildHeaderSimpleComponent } from '../../shared/components/parent-child-header-simple/parent-child-header-simple.component';
import { PageTitleService } from '../../core/services/page-title.service';
import { NotificationService } from '../../core/services/notification-service';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PullToRefreshComponent } from '../../shared/components/pull-to-refresh/pull-to-refresh.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { IonContent, IonRefresher, IonRefresherContent } from '@ionic/angular/standalone';

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule, ParentChildHeaderSimpleComponent, TranslateModule, PullToRefreshComponent, SkeletonComponent, IonContent, IonRefresher, IonRefresherContent],
  templateUrl: './messages.component.html',
  styleUrl: './messages.component.scss'
})
export class MessagesComponent implements OnInit, OnDestroy {
  @ViewChild('pullToRefresh') pullToRefresh!: PullToRefreshComponent;
  private destroy$ = new Subject<void>();
  activeTab: 'received' | 'sent' | 'important' | 'trash' = 'received';
  inbox: MailMessage[] = [];
  sent: MailMessage[] = [];
  selectedMessage: any = null;
  isAdmin = false;
  currentUserId = '';
  showNewMessageModal = false;
  showModal = false;
  selectedMessages: MailMessage[] = [];
  statusFilter: 'all' | 'unread' | 'read' = 'all';
  showFilterMenu = false;
  replyText = '';
  loading = true;

  composeForm = {
    recipientType: 'individual',
    recipientId: '',
    subject: '',
    content: ''
  };

  recipients: { parents: Recipient[], teachers: Recipient[] } = { parents: [], teachers: [] };
  groupedRecipients: { id: string; name: string; email: string; displayName: string; group: string }[] = [];

  get activeMessages(): MailMessage[] {
    switch(this.activeTab) {
      case 'received': return this.inbox;
      case 'sent': return this.sent;
      case 'important': return [];
      case 'trash': return [];
      default: return [];
    }
  }

  get filteredMessages(): MailMessage[] {
    return this.filterByStatus(this.activeMessages);
  }

  back() {
    this.location.back();
  }

  constructor(
    private messagesService: MessagesService,
    private authService: AuthService,
    private location: Location,
    private pageTitleService: PageTitleService,
    private notificationService: NotificationService,
    private route: ActivatedRoute,
    private translateService: TranslateService
  ) {}

  ngOnInit(): void {
    this.pageTitleService.setTitle(this.translateService.instant('MESSAGES_PAGE.TITLE'));
    this.currentUserId = this.getCurrentUserId();
    this.isAdmin = this.getUserRole() === 'Admin';
    this.loadInbox();
    this.loadSent();
    if (this.isAdmin) {
      this.loadRecipients();
    }

    // Listen for new messages via SignalR
    this.notificationService.messageUnreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // Reload inbox when new message count changes
        this.loadInbox();
      });

    // Check for message ID in query params (from notification click)
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const messageId = params['id'];
      if (messageId) {
        this.openMessageById(parseInt(messageId, 10));
      }
    });
  }

  private openMessageById(messageId: number): void {
    this.messagesService.getMessage(messageId).subscribe({
      next: (data) => {
        this.selectedMessage = data;
        this.showModal = true;
        this.showNewMessageModal = false;
      },
      error: (err) => console.error('Error loading message:', err)
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private getCurrentUserId(): string {
    const token = localStorage.getItem('token');
    if (!token) return '';
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const claims = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
      return Array.isArray(claims) ? claims[claims.length - 1] : claims || '';
    } catch {
      return '';
    }
  }

  private getUserRole(): string {
    const token = localStorage.getItem('token');
    if (!token) return '';
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || '';
    } catch {
      return '';
    }
  }

  loadInbox(): void {
    this.messagesService.getInbox().subscribe({
      next: (messages) => {
        this.inbox = messages;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading inbox:', err);
        this.loading = false;
      }
    });
  }

  loadSent(): void {
    this.messagesService.getSent().subscribe({
      next: (messages) => {
        this.sent = messages;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading sent:', err);
        this.loading = false;
      }
    });
  }

  loadRecipients(): void {
    this.messagesService.getRecipients().subscribe({
      next: (data) => {
        this.recipients = data;
        this.buildGroupedRecipients();
      },
      error: (err) => console.error('Error loading recipients:', err)
    });
  }

  private buildGroupedRecipients(): void {
    const parentsLabel = this.translateService.instant('MESSAGES_PAGE.PARENTS');
    const teachersLabel = this.translateService.instant('MESSAGES_PAGE.TEACHERS');

    const parents = this.recipients.parents.map(p => ({
      id: p.id,
      name: p.name,
      email: p.email,
      displayName: `${p.name} (${p.email})`,
      group: parentsLabel
    }));

    const teachers = this.recipients.teachers.map(t => ({
      id: t.id,
      name: t.name,
      email: t.email,
      displayName: `${t.name} (${t.email})`,
      group: teachersLabel
    }));

    this.groupedRecipients = [...parents, ...teachers];
  }

  switchTab(tab: 'received' | 'sent' | 'important' | 'trash'): void {
    if (this.showNewMessageModal && this.hasFormData()) {
      Swal.fire({
        title: this.translateService.instant('MESSAGES_PAGE.UNSAVED_DATA_TITLE'),
        text: this.translateService.instant('MESSAGES_PAGE.UNSAVED_DATA_TEXT'),
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#0e567d',
        cancelButtonColor: '#e5e7eb',
        confirmButtonText: this.translateService.instant('MESSAGES_PAGE.YES_LEAVE'),
        cancelButtonText: this.translateService.instant('MESSAGES_PAGE.CANCEL'),
        customClass: {
          confirmButton: 'swal-confirm-btn',
          cancelButton: 'swal-cancel-btn'
        }
      }).then((result) => {
        if (result.isConfirmed) {
          this.resetComposeForm();
          this.activeTab = tab;
          this.showNewMessageModal = false;
          this.showModal = false;
          this.selectedMessage = null;
        }
      });
    } else {
      this.activeTab = tab;
      this.showNewMessageModal = false;
      this.showModal = false;
      this.selectedMessage = null;
    }
    if (tab === 'received') this.loadInbox();
    if (tab === 'sent') this.loadSent();
  }

  selectMessage(message: MailMessage): void {
    this.messagesService.getMessage(message.id).subscribe({
      next: (data) => {
        this.selectedMessage = data;
        this.showModal = true;
        this.showNewMessageModal = false;
        this.activeTab = this.activeTab;
      },
      error: (err) => console.error('Error loading message:', err)
    });
  }

  resetComposeForm(): void {
    this.composeForm = {
      recipientType: 'individual',
      recipientId: '',
      subject: '',
      content: ''
    };
  }

  hasFormData(): boolean {
    return this.composeForm.subject.trim() !== '' || this.composeForm.content.trim() !== '';
  }

  sendMessage(): void {
    if (!this.composeForm.subject || !this.composeForm.content) return;

    this.messagesService.sendMessage(this.composeForm).subscribe({
      next: () => {
        this.resetComposeForm();
        this.closeNewMessageModal();
        this.loadSent();
        this.activeTab = 'sent';
        Swal.fire({
          icon: 'success',
          title: this.translateService.instant('MESSAGES_PAGE.SUCCESS'),
          text: this.translateService.instant('MESSAGES_PAGE.MESSAGE_SENT_SUCCESS'),
          confirmButtonColor: '#0E567D'
        });
      },
      error: (err) => {
        console.error('Error sending message:', err);
        Swal.fire({
          icon: 'error',
          title: this.translateService.instant('MESSAGES_PAGE.ERROR'),
          text: this.translateService.instant('MESSAGES_PAGE.MESSAGE_SEND_FAILED'),
          confirmButtonColor: '#0E567D'
        });
      }
    });
  }

  sendReply(): void {
    if (!this.replyText.trim() || !this.selectedMessage) return;

    const replyData = {
      recipientType: 'individual',
      recipientId: this.selectedMessage.senderId,
      subject: 'Re: ' + this.selectedMessage.subject,
      content: this.replyText,
      parentMessageId: this.selectedMessage.id
    };

    this.messagesService.sendMessage(replyData).subscribe({
      next: () => {
        this.replyText = '';
        this.loadInbox();
        this.loadSent();
        // Reload the selected message to get updated replies
        if (this.selectedMessage) {
          this.messagesService.getMessage(this.selectedMessage.id).subscribe({
            next: (message) => this.selectedMessage = message,
            error: (err) => console.error('Error reloading message:', err)
          });
        }
        Swal.fire({
          icon: 'success',
          title: this.translateService.instant('MESSAGES_PAGE.SUCCESS'),
          text: this.translateService.instant('MESSAGES_PAGE.REPLY_SENT_SUCCESS'),
          confirmButtonColor: '#0E567D'
        });
      },
      error: (err) => {
        console.error('Error sending reply:', err);
        Swal.fire({
          icon: 'error',
          title: this.translateService.instant('MESSAGES_PAGE.ERROR'),
          text: this.translateService.instant('MESSAGES_PAGE.REPLY_SEND_FAILED'),
          confirmButtonColor: '#0E567D'
        });
      }
    });
  }

  reply(): void {
    this.composeForm = {
      recipientType: 'individual',
      recipientId: this.selectedMessage.senderId,
      subject: 'Re: ' + this.selectedMessage.subject,
      content: ''
    };
    this.closeModal();
    if (this.isParent) {
      this.openNewMessageModal();
    }
  }

  getRecipientsList(): Recipient[] {
    return [...this.recipients.parents, ...this.recipients.teachers];
  }

  get isParent(): boolean {
    return this.authService.isParent();
  }

  openNewMessageModal(): void {
    this.showNewMessageModal = true;
    this.showModal = false;
    this.selectedMessage = null;
  }

  closeNewMessageModal(): void {
    if (this.hasFormData()) {
      Swal.fire({
        title: this.translateService.instant('MESSAGES_PAGE.UNSAVED_DATA_TITLE'),
        text: this.translateService.instant('MESSAGES_PAGE.UNSAVED_DATA_CLOSE_TEXT'),
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#0e567d',
        cancelButtonColor: '#e5e7eb',
        confirmButtonText: this.translateService.instant('MESSAGES_PAGE.YES_CLOSE'),
        cancelButtonText: this.translateService.instant('MESSAGES_PAGE.CANCEL'),
        customClass: {
          confirmButton: 'swal-confirm-btn',
          cancelButton: 'swal-cancel-btn'
        }
      }).then((result) => {
        if (result.isConfirmed) {
          this.resetComposeForm();
          this.showNewMessageModal = false;
          this.activeTab = 'received';
        }
      });
    } else {
      this.showNewMessageModal = false;
      this.activeTab = 'received';
    }
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedMessage = null;
    this.replyText = '';
    this.activeTab = 'received';
  }

  formatDate(date: string | Date | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Filter methods
  filterByStatus(messages: MailMessage[]): MailMessage[] {
    if (this.statusFilter === 'all') return messages;
    if (this.statusFilter === 'unread') return messages.filter(m => !m.isRead);
    if (this.statusFilter === 'read') return messages.filter(m => m.isRead);
    return messages;
  }

  toggleFilterMenu(): void {
    this.showFilterMenu = !this.showFilterMenu;
  }

  setFilter(filter: 'all' | 'unread' | 'read'): void {
    this.statusFilter = filter;
    this.showFilterMenu = false;
    this.selectedMessages = [];
  }

  // Selection methods
  toggleSelection(message: MailMessage): void {
    const index = this.selectedMessages.findIndex(m => m.id === message.id);
    if (index > -1) {
      this.selectedMessages.splice(index, 1);
    } else {
      this.selectedMessages.push(message);
    }
  }

  isSelected(message: MailMessage): boolean {
    return this.selectedMessages.some(m => m.id === message.id);
  }

  toggleSelectAll(event: any): void {
    if (event.target.checked) {
      this.selectedMessages = [...this.filteredMessages];
    } else {
      this.selectedMessages = [];
    }
  }

  isAllSelected(): boolean {
    return this.filteredMessages.length > 0 && this.selectedMessages.length === this.filteredMessages.length;
  }

  // Bulk actions
  deleteSelected(): void {
    if (this.selectedMessages.length === 0) return;
    Swal.fire({
      title: this.translateService.instant('MESSAGES_PAGE.DELETE_MESSAGES_TITLE'),
      text: this.translateService.instant('MESSAGES_PAGE.DELETE_MESSAGES_TEXT', { count: this.selectedMessages.length }),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#0e567d',
      cancelButtonColor: '#e5e7eb',
      confirmButtonText: this.translateService.instant('MESSAGES_PAGE.YES_DELETE'),
      cancelButtonText: this.translateService.instant('MESSAGES_PAGE.CANCEL'),
      customClass: {
        confirmButton: 'swal-confirm-btn',
        cancelButton: 'swal-cancel-btn'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        // TODO: Implement delete API call
        console.log('Deleting:', this.selectedMessages);
        this.selectedMessages = [];
      }
    });
  }

  markAsRead(): void {
    if (this.selectedMessages.length === 0) return;
    // TODO: Implement mark as read API call
    console.log('Marking as read:', this.selectedMessages);
    this.selectedMessages.forEach(msg => msg.isRead = true);
    this.selectedMessages = [];
  }

  markAsUnread(): void {
    if (this.selectedMessages.length === 0) return;
    // TODO: Implement mark as unread API call
    console.log('Marking as unread:', this.selectedMessages);
    this.selectedMessages.forEach(msg => msg.isRead = false);
    this.selectedMessages = [];
  }
  getUnreadCount(): number {
    return this.inbox.filter(m => !m.isRead).length;
  }

  // Pull-to-refresh handler for Ionic refresher
  onRefresh(event?: any): void {
    this.loadInbox();
    this.loadSent();
    setTimeout(() => {
      // Complete the Ionic refresher
      if (event?.target) {
        event.target.complete();
      }
      // Fallback for custom pull-to-refresh (if still used elsewhere)
      this.pullToRefresh?.completeRefresh();
    }, 500);
  }
}
