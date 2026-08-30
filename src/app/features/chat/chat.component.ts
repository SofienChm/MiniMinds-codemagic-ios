import { Component, OnInit, OnDestroy, ElementRef, ViewChild, ChangeDetectorRef, HostListener } from '@angular/core';
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
  ChatGroup, GroupChatMessage, GroupMessagePage
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
  selectedGroupId: number | null = null;
  selectedGroupName = '';
  selectedGroupMemberCount = 0;

  showNewChatModal = false;
  showNewGroupModal = false;
  groupMode: 'class' | 'manual' = 'class';
  selectedClassId: number | null = null;
  groupName = '';
  selectedMemberIds: string[] = [];

  newMessage = '';
  searchTerm = '';
  contactSearchTerm = '';
  currentUserId = '';

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

  private subscriptions: Subscription[] = [];

  constructor(
    private pageTitleService: PageTitleService,
    private translateService: TranslateService,
    private authService: AuthService,
    private messagesService: MessagesService,
    private notificationService: NotificationService,
    private classesService: ClassesService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.updateTranslations();
    this.currentUserId = this.authService.getUserId() || '';
    this.loadConversations();
    this.loadGroups();

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
      },
      error: () => {
        this.loadingGroups = false;
      }
    });
  }

  selectConversation(conversation: Conversation): void {
    this.clearSelection();
    this.selectedUserId = conversation.userId;
    this.selectedUserName = conversation.name;
    this.selectedUserPicture = conversation.profilePictureUrl || null;
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

  toggleMemberSelection(userId: string): void {
    const index = this.selectedMemberIds.indexOf(userId);
    if (index > -1) {
      this.selectedMemberIds.splice(index, 1);
    } else {
      this.selectedMemberIds.push(userId);
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
    if (!content || !this.selectedUserId) return;

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

  sendGroupMessage(): void {
    const content = this.newMessage.trim();
    if (!content || this.selectedGroupId === null) return;

    this.messagesService.sendChatGroupMessage(this.selectedGroupId, content).subscribe({
      next: () => {
        this.newMessage = '';
        this.loadGroupMessages(this.selectedGroupId!);
        this.loadGroups();
      },
      error: () => {}
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
          isRead: false
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
        sentAt: data.sentAt
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

  clearSelection(): void {
    this.selectedUserId = null;
    this.selectedUserName = '';
    this.selectedUserPicture = null;
    this.selectedGroupId = null;
    this.selectedGroupName = '';
    this.selectedGroupMemberCount = 0;
    this.messages = [];
    this.groupMessages = [];
    this.isTyping = false;
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
