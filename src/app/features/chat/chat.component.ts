import { Component, OnInit, OnDestroy, ElementRef, ViewChild, ChangeDetectorRef, HostListener } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { TitlePage, Breadcrumb } from '../../shared/layouts/title-page/title-page';
import { PageTitleService } from '../../core/services/page-title.service';
import { AuthService } from '../../core/services/auth';
import { ApiConfig } from '../../core/config/api.config';
import { NotificationService } from '../../core/services/notification-service';
import { ClassesService } from '../classes/classes.service';
import {
  MessagesService, Conversation, TenantContact, ChatMessage, ConversationPage,
  ChatGroup, ChatGroupDetail, GroupChatMessage, GroupMessagePage
} from '../../core/services/messages.service';
import { ParentChildHeaderSimpleComponent } from '../../shared/components/parent-child-header-simple/parent-child-header-simple.component';
import { IonContent, IonRefresher, IonRefresherContent } from '@ionic/angular/standalone';

interface ChatListItem {
  kind: 'group' | 'conversation';
  name: string;
  profilePictureUrl?: string;
  lastMessage: string;
  lastMessageAt?: string;
  unreadCount: number;
  group?: ChatGroup;
  conversation?: Conversation;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, TitlePage, ParentChildHeaderSimpleComponent, IonContent, IonRefresher, IonRefresherContent],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss'
})
export class ChatComponent implements OnInit, OnDestroy {

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  breadcrumbs: Breadcrumb[] = [];

  conversations: Conversation[] = [];
  groups: ChatGroup[] = [];
  tenantUsers: TenantContact[] = [];
  classes: any[] = [];
  messages: ChatMessage[] = [];
  groupMessages: GroupChatMessage[] = [];

  selectedUserId: string | null = null;
  selectedUserName = '';
  selectedUserPicture: string | null = null;
  selectedUserRole: string | null = null;
  selectedUserParentId: number | null = null;
  selectedUserTeacherId: number | null = null;
  selectedGroupId: number | null = null;
  selectedGroupName = '';
  selectedGroupMemberCount = 0;

  showNewChatModal = false;
  showNewGroupModal = false;
  showGroupMembersModal = false;
  groupMembers: ChatGroupDetail['members'] = [];
  loadingGroupMembers = false;
  groupMode: 'class' | 'manual' = 'class';
  selectedClassId: number | null = null;
  groupName = '';
  selectedMemberIds: string[] = [];

  newMessage = '';
  searchTerm = '';
  contactSearchTerm = '';
  currentUserId = '';

  // Chat attachments (R2-backed)
  pendingFile: File | null = null;
  pendingFilePreviewUrl: string | null = null;
  uploadingAttachment = false;
  attachmentError = '';
  viewerImageUrl: string | null = null;
  viewerImageName: string | null = null;
  private objectUrls: string[] = [];
  static readonly ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx'];
  static readonly ALLOWED_MIME_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  static readonly MAX_FILE_SIZE = 10 * 1024 * 1024;

  loadingConversations = false;
  loadingMessages = false;
  loadingContacts = false;
  loadingOlder = false;
  loadingGroups = false;
  loadingGroupMessages = false;

  conversationPage = 1;
  hasMoreMessages = false;
  pageSize = 30;
  groupPage = 1;
  hasMoreGroupMessages = false;

  isTyping = false;
  isMobile = window.innerWidth < 768;
  private typingTimer: any;

  private pendingSenderId: string | null = null;
  private pendingGroupId: number | null = null;

  private subscriptions: Subscription[] = [];

  constructor(
    private pageTitleService: PageTitleService,
    private translateService: TranslateService,
    private authService: AuthService,
    private messagesService: MessagesService,
    private notificationService: NotificationService,
    private classesService: ClassesService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.updateTranslations();
    this.currentUserId = this.authService.getUserId() || '';
    this.loadConversations();
    this.loadGroups();

    const routeSub = this.route.queryParams.subscribe(params => {
      this.pendingSenderId = params['senderId'] || null;
      const groupId = params['groupId'];
      this.pendingGroupId = groupId ? Number(groupId) : null;
    });
    this.subscriptions.push(routeSub);

    const langSub = this.translateService.onLangChange.subscribe(() => {
      this.updateTranslations();
    });
    this.subscriptions.push(langSub);

    const msgSub = this.notificationService.chatMessageReceived$.subscribe(data => {
      this.handleIncomingMessage(data);
    });
    this.subscriptions.push(msgSub);

    const groupMsgSub = this.notificationService.groupMessageReceived$.subscribe(data => {
      this.handleGroupMessage(data);
    });
    this.subscriptions.push(groupMsgSub);

    const readSub = this.notificationService.messageRead$.subscribe(data => {
      this.handleMessageRead(data);
    });
    this.subscriptions.push(readSub);

    const typingSub = this.notificationService.typing$.subscribe(data => {
      this.handleTyping(data);
    });
    this.subscriptions.push(typingSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    clearTimeout(this.typingTimer);
    this.releaseObjectUrls();
  }

  get hasActiveChat(): boolean {
    return this.selectedGroupId !== null || !!this.selectedUserId;
  }

  get isParent(): boolean {
    return this.authService.isParent();
  }

  onRefresh(event?: any): void {
    this.loadConversations();
    this.loadGroups();
    if (this.selectedGroupId !== null) {
      this.loadGroupMessages(this.selectedGroupId, true);
    } else if (this.selectedUserId) {
      this.loadConversation(this.selectedUserId, true);
    }
    setTimeout(() => {
      if (event?.target) {
        event.target.complete();
      }
    }, 500);
  }

  loadConversations(): void {
    this.loadingConversations = true;
    this.messagesService.getConversations().subscribe({
      next: (conversations) => {
        this.conversations = conversations;
        this.loadingConversations = false;
        this.autoOpenConversationFromParams();
      },
      error: () => {
        this.loadingConversations = false;
      }
    });
  }

  loadGroups(): void {
    this.loadingGroups = true;
    this.messagesService.getChatGroups().subscribe({
      next: (groups) => {
        this.groups = groups;
        this.loadingGroups = false;
        this.autoOpenGroupFromParams();
      },
      error: () => {
        this.loadingGroups = false;
      }
    });
  }

  private autoOpenConversationFromParams(): void {
    if (!this.pendingSenderId) return;

    const conversation = this.conversations.find(c => c.userId === this.pendingSenderId);
    if (conversation) {
      this.pendingSenderId = null;
      this.pendingGroupId = null;
      this.selectConversation(conversation);
      return;
    }

    if (this.pendingGroupId) return;

    this.messagesService.getContacts().subscribe({
      next: (users) => {
        const contact = users.find(u => u.id === this.pendingSenderId);
        if (contact) {
          this.pendingSenderId = null;
          this.pendingGroupId = null;
          this.startChat(contact);
          this.loadConversation(contact.id);
        } else {
          this.pendingSenderId = null;
        }
      },
      error: () => {
        this.pendingSenderId = null;
      }
    });
  }

  private autoOpenGroupFromParams(): void {
    if (this.pendingGroupId === null) return;
    const group = this.groups.find(g => g.id === this.pendingGroupId);
    if (group) {
      this.pendingSenderId = null;
      this.pendingGroupId = null;
      this.selectGroup(group);
    } else {
      this.pendingGroupId = null;
    }
  }

  selectConversation(conversation: Conversation): void {
    this.clearSelection();
    this.selectedUserId = conversation.userId;
    this.selectedUserName = conversation.name;
    this.selectedUserPicture = conversation.profilePictureUrl || null;
    this.selectedUserRole = conversation.role || null;
    this.selectedUserParentId = conversation.parentId ?? null;
    this.selectedUserTeacherId = conversation.teacherId ?? null;
    this.loadConversation(conversation.userId);
  }

  selectGroup(group: ChatGroup): void {
    this.clearSelection();
    this.selectedGroupId = group.id;
    this.selectedGroupName = group.name;
    this.selectedGroupMemberCount = group.memberCount;
    this.loadGroupMessages(group.id);
  }

  loadConversation(userId: string, silent = false): void {
    if (!silent) this.loadingMessages = true;
    this.conversationPage = 1;
    this.messagesService.getConversation(userId, 1, this.pageSize).subscribe({
      next: (res) => {
        this.messages = res.messages.slice().reverse();
        this.hasMoreMessages = res.hasMore;
        this.loadingMessages = false;
        this.scrollToBottom();
      },
      error: () => {
        this.loadingMessages = false;
      }
    });
  }

  loadGroupMessages(groupId: number, silent = false): void {
    if (!silent) this.loadingGroupMessages = true;
    this.groupPage = 1;
    this.messagesService.getChatGroupMessages(groupId, 1, this.pageSize).subscribe({
      next: (res) => {
        this.groupMessages = res.messages.slice().reverse();
        this.hasMoreGroupMessages = res.hasMore;
        this.loadingGroupMessages = false;
        this.scrollToBottom();
      },
      error: () => {
        this.loadingGroupMessages = false;
      }
    });
  }

  loadOlderMessages(): void {
    if (!this.selectedUserId || this.loadingOlder || !this.hasMoreMessages) return;

    this.loadingOlder = true;
    const nextPage = this.conversationPage + 1;

    this.messagesService.getConversation(this.selectedUserId, nextPage, this.pageSize).subscribe({
      next: (res) => {
        const el = this.messagesContainer?.nativeElement;
        const prevHeight = el?.scrollHeight ?? 0;
        const prevTop = el?.scrollTop ?? 0;

        const older = res.messages.slice().reverse();
        this.messages = [...older, ...this.messages];
        this.conversationPage = nextPage;
        this.hasMoreMessages = res.hasMore;
        this.loadingOlder = false;

        this.cdr.detectChanges();
        const container = this.messagesContainer?.nativeElement;
        if (container) {
          container.scrollTop = container.scrollHeight - prevHeight + prevTop;
        }
      },
      error: () => {
        this.loadingOlder = false;
      }
    });
  }

  loadOlderGroupMessages(): void {
    if (this.selectedGroupId === null || this.loadingOlder || !this.hasMoreGroupMessages) return;

    this.loadingOlder = true;
    const nextPage = this.groupPage + 1;

    this.messagesService.getChatGroupMessages(this.selectedGroupId, nextPage, this.pageSize).subscribe({
      next: (res) => {
        const el = this.messagesContainer?.nativeElement;
        const prevHeight = el?.scrollHeight ?? 0;
        const prevTop = el?.scrollTop ?? 0;

        const older = res.messages.slice().reverse();
        this.groupMessages = [...older, ...this.groupMessages];
        this.groupPage = nextPage;
        this.hasMoreGroupMessages = res.hasMore;
        this.loadingOlder = false;

        this.cdr.detectChanges();
        const container = this.messagesContainer?.nativeElement;
        if (container) {
          container.scrollTop = container.scrollHeight - prevHeight + prevTop;
        }
      },
      error: () => {
        this.loadingOlder = false;
      }
    });
  }

  onMessagesScroll(event: Event): void {
    const el = event.target as HTMLElement;
    if (el.scrollTop <= 40) {
      if (this.selectedGroupId !== null) {
        this.loadOlderGroupMessages();
      } else if (this.selectedUserId) {
        this.loadOlderMessages();
      }
    }
  }

  openNewChatModal(): void {
    this.showNewChatModal = true;
    this.loadingContacts = true;
    this.messagesService.getContacts().subscribe({
      next: (users) => {
        this.tenantUsers = users;
        this.loadingContacts = false;
      },
      error: () => {
        this.loadingContacts = false;
      }
    });
  }

  closeNewChatModal(): void {
    this.showNewChatModal = false;
    this.tenantUsers = [];
    this.searchTerm = '';
  }

  openNewGroupModal(): void {
    this.showNewGroupModal = true;
    this.groupMode = 'class';
    this.selectedClassId = null;
    this.groupName = '';
    this.selectedMemberIds = [];

    if (this.classes.length === 0) {
      this.classesService.getClasses().subscribe({
        next: (classes) => { this.classes = classes; },
        error: () => {}
      });
    }

    if (this.tenantUsers.length === 0) {
      this.messagesService.getContacts().subscribe({
        next: (users) => { this.tenantUsers = users; },
        error: () => {}
      });
    }
  }

  closeNewGroupModal(): void {
    this.showNewGroupModal = false;
  }

  openGroupMembers(): void {
    if (this.selectedGroupId === null) return;
    this.showGroupMembersModal = true;
    this.loadingGroupMembers = true;
    this.messagesService.getChatGroup(this.selectedGroupId).subscribe({
      next: (detail) => {
        this.groupMembers = detail.members;
        this.loadingGroupMembers = false;
      },
      error: () => {
        this.loadingGroupMembers = false;
      }
    });
  }

  closeGroupMembersModal(): void {
    this.showGroupMembersModal = false;
    this.groupMembers = [];
  }

  toggleMemberSelection(userId: string): void {
    const index = this.selectedMemberIds.indexOf(userId);
    if (index > -1) {
      this.selectedMemberIds.splice(index, 1);
    } else {
      this.selectedMemberIds.push(userId);
    }
  }

  get allMembersSelected(): boolean {
    return this.tenantUsers.length > 0 && this.selectedMemberIds.length === this.tenantUsers.length;
  }

  toggleAllMembers(): void {
    if (this.allMembersSelected) {
      this.selectedMemberIds = [];
    } else {
      this.selectedMemberIds = this.tenantUsers.map(u => u.id);
    }
  }

  createGroup(): void {
    if (this.groupMode === 'class') {
      if (!this.selectedClassId) return;
      this.messagesService.createChatGroup({ classId: this.selectedClassId }).subscribe({
        next: (res) => {
          this.closeNewGroupModal();
          this.loadGroups();
          this.openGroupFromCreate(res.groupId, res.name);
        },
        error: () => {}
      });
    } else {
      const name = this.groupName.trim();
      if (!name || this.selectedMemberIds.length === 0) return;
      this.messagesService.createChatGroup({ name, memberIds: this.selectedMemberIds }).subscribe({
        next: (res) => {
          this.closeNewGroupModal();
          this.loadGroups();
          this.openGroupFromCreate(res.groupId, res.name);
        },
        error: () => {}
      });
    }
  }

  openGroupFromCreate(groupId: number, name: string): void {
    this.clearSelection();
    this.selectedGroupId = groupId;
    this.selectedGroupName = name;
    this.loadGroupMessages(groupId);
    this.loadGroups();
  }

  startChat(user: TenantContact): void {
    this.clearSelection();
    this.selectedUserId = user.id;
    this.selectedUserName = user.name;
    this.selectedUserPicture = user.profilePictureUrl || null;
    this.selectedUserRole = user.role || null;
    this.selectedUserParentId = user.parentId ?? null;
    this.selectedUserTeacherId = user.teacherId ?? null;
    this.messages = [];
    this.closeNewChatModal();

    if (!this.conversations.some(c => c.userId === user.id)) {
      this.conversations.unshift({
        userId: user.id,
        name: user.name,
        profilePictureUrl: user.profilePictureUrl,
        lastMessage: '',
        lastMessageAt: new Date().toISOString(),
        unreadCount: 0
      });
    }
  }

  sendMessage(): void {
    const content = this.newMessage.trim();
    if ((!content && !this.pendingFile) || !this.selectedUserId) return;

    if (this.pendingFile) {
      this.uploadThenSendIndividual(content);
      return;
    }

    clearTimeout(this.typingTimer);
    this.notificationService.sendTyping(this.selectedUserId, false);

    this.messagesService.chatSendMessage(this.selectedUserId, content).subscribe({
      next: () => {
        this.newMessage = '';
        this.loadConversation(this.selectedUserId!);
        this.loadConversations();
      },
      error: () => {}
    });
  }

  private uploadThenSendIndividual(content: string): void {
    const file = this.pendingFile;
    if (!file || !this.selectedUserId) return;
    this.uploadingAttachment = true;
    this.attachmentError = '';

    this.messagesService.uploadChatAttachment(file).subscribe({
      next: (res) => {
        this.uploadingAttachment = false;
        this.discardPendingFile();
        this.messagesService.chatSendMessage(this.selectedUserId!, content, {
          attachmentKey: res.attachmentKey,
          attachmentName: res.attachmentName,
          attachmentType: res.attachmentType,
          attachmentSize: res.attachmentSize
        }).subscribe({
          next: () => {
            this.newMessage = '';
            this.loadConversation(this.selectedUserId!);
            this.loadConversations();
          },
          error: () => this.attachmentError = this.translateService.instant('CHAT_PAGE.ATTACH_SEND_FAILED')
        });
      },
      error: (err) => {
        this.uploadingAttachment = false;
        this.attachmentError = err?.error?.error || this.translateService.instant('CHAT_PAGE.ATTACH_UPLOAD_FAILED');
      }
    });
  }

  sendGroupMessage(): void {
    const content = this.newMessage.trim();
    if ((!content && !this.pendingFile) || this.selectedGroupId === null) return;

    if (this.pendingFile) {
      this.uploadThenSendGroup(content);
      return;
    }

    this.messagesService.sendChatGroupMessage(this.selectedGroupId, content).subscribe({
      next: () => {
        this.newMessage = '';
        this.loadGroupMessages(this.selectedGroupId!);
        this.loadGroups();
      },
      error: () => {}
    });
  }

  private uploadThenSendGroup(content: string): void {
    const file = this.pendingFile;
    if (!file || this.selectedGroupId === null) return;
    this.uploadingAttachment = true;
    this.attachmentError = '';

    this.messagesService.uploadChatAttachment(file).subscribe({
      next: (res) => {
        this.uploadingAttachment = false;
        this.discardPendingFile();
        this.messagesService.sendChatGroupMessage(this.selectedGroupId!, content, {
          attachmentKey: res.attachmentKey,
          attachmentName: res.attachmentName,
          attachmentType: res.attachmentType,
          attachmentSize: res.attachmentSize
        }).subscribe({
          next: () => {
            this.newMessage = '';
            this.loadGroupMessages(this.selectedGroupId!);
            this.loadGroups();
          },
          error: () => this.attachmentError = this.translateService.instant('CHAT_PAGE.ATTACH_SEND_FAILED')
        });
      },
      error: (err) => {
        this.uploadingAttachment = false;
        this.attachmentError = err?.error?.error || this.translateService.instant('CHAT_PAGE.ATTACH_UPLOAD_FAILED');
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) return;

    if (!this.validateFile(file)) {
      this.discardPendingFile();
      return;
    }

    this.pendingFile = file;
    this.attachmentError = '';
    this.releaseObjectUrls();
    if (file.type.startsWith('image/')) {
      this.pendingFilePreviewUrl = URL.createObjectURL(file);
      this.objectUrls.push(this.pendingFilePreviewUrl);
    } else {
      this.pendingFilePreviewUrl = null;
    }
  }

  private validateFile(file: File): boolean {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!ChatComponent.ALLOWED_EXTENSIONS.includes(ext)) {
      this.attachmentError = this.translateService.instant('CHAT_PAGE.ATTACH_TYPE_ERROR');
      return false;
    }
    if (!ChatComponent.ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
      this.attachmentError = this.translateService.instant('CHAT_PAGE.ATTACH_TYPE_ERROR');
      return false;
    }
    if (file.size > ChatComponent.MAX_FILE_SIZE) {
      this.attachmentError = this.translateService.instant('CHAT_PAGE.ATTACH_TOO_LARGE');
      return false;
    }
    return true;
  }

  discardPendingFile(): void {
    this.releaseObjectUrls();
    this.pendingFile = null;
    this.pendingFilePreviewUrl = null;
    this.attachmentError = '';
  }

  private releaseObjectUrls(): void {
    this.objectUrls.forEach(u => URL.revokeObjectURL(u));
    this.objectUrls = [];
    this.attachmentBlobUrls.forEach(u => URL.revokeObjectURL(u));
    this.attachmentBlobUrls.clear();
  }

  private saveObjectUrl(url: string): void {
    this.objectUrls.push(url);
  }

  formatFileSize(bytes?: number): string {
    if (bytes == null) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  isImageAttachment(type?: string): boolean {
    return !!type && type.startsWith('image/');
  }

  attachmentUrl(message: any, group = false): string {
    const id = message?.id;
    if (id == null) return '';
    return `${ApiConfig.ENDPOINTS.MESSAGES}/attachment/${id}?group=${group ? 'true' : 'false'}`;
  }

  attachmentIcon(type?: string): string {
    const t = (type || '').toLowerCase();
    if (t.includes('pdf')) return 'bi-file-earmark-pdf';
    if (t.includes('spreadsheet') || t.includes('ms-excel') || t.includes('xls')) return 'bi-file-earmark-excel';
    if (t.includes('word') || t.includes('msword')) return 'bi-file-earmark-word';
    if (t.startsWith('image/')) return 'bi-file-earmark-image';
    return 'bi-file-earmark';
  }

  private attachmentBlobUrls = new Map<number, string>();

  private attachmentKey(message: any, group: boolean): number {
    return message && message.id != null ? (group ? 2000000000 + message.id : message.id) : -1;
  }

  imageSrc(message: any, group = false): string {
    const key = this.attachmentKey(message, group);
    if (key < 0) return '';
    const url = this.attachmentBlobUrls.get(key);
    if (url) return url;
    this.loadImageAttachment(message, group);
    return '';
  }

  private loadImageAttachment(message: any, group: boolean): void {
    const key = this.attachmentKey(message, group);
    if (key < 0 || this.attachmentBlobUrls.has(key)) return;

    this.messagesService.downloadChatAttachment(message.id, group).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        this.attachmentBlobUrls.set(key, url);
        this.saveObjectUrl(url);
        this.cdr.detectChanges();
      },
      error: () => { /* leave blank; image simply won't render */ }
    });
  }

  openAttachment(message: any, group = false): void {
    if (!message || message.id == null) return;

    // Images open full-screen inside the chat (Messenger-style lightbox).
    if (this.isImageAttachment(message.attachmentType)) {
      this.openImageViewer(message, group);
      return;
    }

    this.messagesService.downloadChatAttachment(message.id, group).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        this.saveObjectUrl(url);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 30000);
      },
      error: () => {
        this.attachmentError = this.translateService.instant('CHAT_PAGE.ATTACH_OPEN_FAILED');
      }
    });
  }

  openImageViewer(message: any, group = false): void {
    const existing = this.attachmentBlobUrls.get(this.attachmentKey(message, group));
    if (existing) {
      this.viewerImageUrl = existing;
      this.viewerImageName = message.attachmentName || 'image';
      return;
    }
    this.messagesService.downloadChatAttachment(message.id, group).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        this.saveObjectUrl(url);
        this.viewerImageUrl = url;
        this.viewerImageName = message.attachmentName || 'image';
      },
      error: () => {
        this.attachmentError = this.translateService.instant('CHAT_PAGE.ATTACH_OPEN_FAILED');
      }
    });
  }

  closeImageViewer(): void {
    this.viewerImageUrl = null;
    this.viewerImageName = null;
  }

  downloadImageFromViewer(): void {
    if (!this.viewerImageUrl) return;
    const a = document.createElement('a');
    a.href = this.viewerImageUrl;
    a.download = this.viewerImageName || 'image';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  downloadAttachment(message: any, group = false): void {
    if (!message || message.id == null) return;
    this.messagesService.downloadChatAttachment(message.id, group).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        this.saveObjectUrl(url);
        const a = document.createElement('a');
        a.href = url;
        a.download = message.attachmentName || 'attachment';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 30000);
      },
      error: () => {
        this.attachmentError = this.translateService.instant('CHAT_PAGE.ATTACH_OPEN_FAILED');
      }
    });
  }

  isMyMessage(message: ChatMessage): boolean {
    return message.senderId === this.currentUserId;
  }

  isMyGroupMessage(message: GroupChatMessage): boolean {
    return message.senderId === this.currentUserId;
  }

  private handleIncomingMessage(data: any): void {
    console.log('[Chat] incoming message event', data);
    this.loadConversations();

    if (data?.senderId && this.selectedUserId && data.senderId === this.selectedUserId) {
      if (data.content) {
        this.messages.push({
          id: data.messageId,
          senderId: data.senderId,
          content: data.content,
          sentAt: data.sentAt,
          isRead: false,
          attachmentUrl: data.attachmentUrl,
          attachmentName: data.attachmentName,
          attachmentType: data.attachmentType,
          attachmentSize: data.attachmentSize,
          attachmentExpiresAt: data.attachmentExpiresAt
        });
        this.scrollToBottom();
      } else {
        this.loadConversation(this.selectedUserId);
      }
    }
  }

  private handleGroupMessage(data: any): void {
    this.loadGroups();

    if (data?.groupId && this.selectedGroupId !== null && data.groupId === this.selectedGroupId) {
      this.groupMessages.push({
        id: data.messageId,
        senderId: data.senderId,
        senderName: data.senderName,
        content: data.content,
        sentAt: data.sentAt,
        attachmentUrl: data.attachmentUrl,
        attachmentName: data.attachmentName,
        attachmentType: data.attachmentType,
        attachmentSize: data.attachmentSize,
        attachmentExpiresAt: data.attachmentExpiresAt
      });
      this.scrollToBottom();
    }
  }

  private handleMessageRead(data: any): void {
    if (data?.readerId && data.readerId === this.selectedUserId) {
      this.messages = this.messages.map(m =>
        this.isMyMessage(m) ? { ...m, isRead: true } : m
      );
      this.cdr.detectChanges();
    }
  }

  private handleTyping(data: any): void {
    if (this.selectedUserId && data?.senderId === this.selectedUserId) {
      this.isTyping = !!data.isTyping;
      this.cdr.detectChanges();
    }
  }

  onTypingInput(): void {
    if (!this.selectedUserId) return;
    this.notificationService.sendTyping(this.selectedUserId, true);
    clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout(() => {
      this.notificationService.sendTyping(this.selectedUserId!, false);
    }, 1500);
  }

  isLastSentMessage(message: ChatMessage): boolean {
    if (!this.isMyMessage(message)) return false;
    const sent = this.messages.filter(m => this.isMyMessage(m));
    const last = sent[sent.length - 1];
    return !!last && last.id === message.id;
  }

  get filteredUsers(): TenantContact[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.tenantUsers;
    return this.tenantUsers.filter(user =>
      user.name.toLowerCase().includes(term) || user.email.toLowerCase().includes(term)
    );
  }

  get filteredContacts(): ChatListItem[] {
    const term = this.contactSearchTerm.trim().toLowerCase();

    const conversations: ChatListItem[] = this.conversations
      .filter(c => !term || c.name.toLowerCase().includes(term))
      .map(c => ({
        kind: 'conversation' as const,
        name: c.name,
        profilePictureUrl: c.profilePictureUrl,
        lastMessage: c.lastMessage,
        lastMessageAt: c.lastMessageAt,
        unreadCount: c.unreadCount,
        conversation: c
      }));

    const groups: ChatListItem[] = this.groups
      .filter(g => !term || g.name.toLowerCase().includes(term))
      .map(g => ({
        kind: 'group' as const,
        name: g.name,
        profilePictureUrl: undefined,
        lastMessage: g.lastMessage || '',
        lastMessageAt: g.lastMessageAt,
        unreadCount: g.unreadCount || 0,
        group: g
      }));

    return [...conversations, ...groups].sort((a, b) => {
      const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return tb - ta;
    });
  }

  isActiveContact(item: ChatListItem): boolean {
    return item.kind === 'group'
      ? item.group!.id === this.selectedGroupId
      : item.conversation!.userId === this.selectedUserId;
  }

  selectContact(item: ChatListItem): void {
    if (item.kind === 'group') {
      this.selectGroup(item.group!);
    } else {
      this.selectConversation(item.conversation!);
    }
  }

  initials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .map(word => word[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  avatarColor(name: string): string {
    const palette = ['#7db9ff', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#ec4899'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
    }
    return palette[hash % palette.length];
  }

  getFullUrl(path: string | null | undefined): string {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    return `${ApiConfig.HUB_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  formatTime(date: string | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString();
  }

  @HostListener('window:focus')
  onWindowFocus(): void {
    this.loadConversations();
    this.loadGroups();
    if (this.selectedGroupId !== null) {
      this.loadGroupMessages(this.selectedGroupId, true);
    } else if (this.selectedUserId) {
      this.loadConversation(this.selectedUserId, true);
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    this.isMobile = window.innerWidth < 768;
  }

  goBack(): void {
    this.clearSelection();
  }

  goToSelectedUserDetail(): void {
    if (this.selectedGroupId !== null || !this.selectedUserId) return;

    if (this.selectedUserRole === 'Parent' && this.selectedUserParentId != null) {
      this.router.navigate(['/parents/detail', this.selectedUserParentId]);
    } else if (this.selectedUserRole === 'Teacher' && this.selectedUserTeacherId != null) {
      this.router.navigate(['/educators/detail', this.selectedUserTeacherId]);
    }
  }

  clearSelection(): void {
    this.selectedUserId = null;
    this.selectedUserName = '';
    this.selectedUserPicture = null;
    this.selectedUserRole = null;
    this.selectedUserParentId = null;
    this.selectedUserTeacherId = null;
    this.selectedGroupId = null;
    this.selectedGroupName = '';
    this.selectedGroupMemberCount = 0;
    this.messages = [];
    this.groupMessages = [];
    this.isTyping = false;
    this.discardPendingFile();
  }

  private scrollToBottom(): void {
    this.cdr.detectChanges();
    const el = this.messagesContainer?.nativeElement;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }

  private updateTranslations(): void {
    this.pageTitleService.setTitle(this.translateService.instant('CHAT_PAGE.TITLE'));
    this.breadcrumbs = [
      { label: this.translateService.instant('BREADCRUMBS.DASHBOARD'), url: '/dashboard' },
      { label: this.translateService.instant('CHAT_PAGE.TITLE') }
    ];
  }
}
