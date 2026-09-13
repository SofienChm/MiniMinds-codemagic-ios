import { Component, OnInit, OnDestroy, ElementRef, ViewChild, ChangeDetectorRef, HostListener } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { TitlePage, Breadcrumb } from '../../shared/layouts/title-page/title-page';
import { PageTitleService } from '../../core/services/page-title.service';
import { AuthService } from '../../core/services/auth';
import { ApiConfig } from '../../core/config/api.config';
import { NotificationService } from '../../core/services/notification-service';
import { SimpleToastService } from '../../core/services/simple-toast.service';
import { ClassesService } from '../classes/classes.service';
import {
  MessagesService, Conversation, TenantContact, ChatMessage, ConversationPage,
  ChatGroup, ChatGroupDetail, GroupChatMessage, GroupMessagePage
} from '../../core/services/messages.service';
import { ParentChildHeaderSimpleComponent } from '../../shared/components/parent-child-header-simple/parent-child-header-simple.component';
import { IonContent, IonRefresher, IonRefresherContent } from '@ionic/angular/standalone';
import { SkeletonComponent } from '../../shared/components/skeleton';

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

interface AttachmentUrlEntry {
  url: string;
  expiresAt: number;
}

const GROUP_KEY_OFFSET = 2000000000;
const TYPING_THROTTLE_MS = 1000;
const TYPING_STOP_MS = 1500;

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, TitlePage, ParentChildHeaderSimpleComponent, IonContent, IonRefresher, IonRefresherContent, SkeletonComponent],
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

  // Chat attachments (R2-backed, served via short-lived presigned URLs)
  pendingFile: File | null = null;
  pendingFilePreviewUrl: string | null = null;
  uploadingAttachment = false;
  attachmentError = '';
  viewerImageUrl: string | null = null;
  viewerImageName: string | null = null;
  private objectUrls: string[] = [];
  private sentImageUrls = new Set<string>();
  private attachmentUrlCache = new Map<number, AttachmentUrlEntry>();
  private attachmentUrlLoading = new Set<number>();
  private attachmentFailedKeys = new Set<number>();
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
  private lastTypingSentAt = 0;
  private tempIdCounter = 0;

  private pendingSenderId: string | null = null;
  private pendingGroupId: number | null = null;

  private subscriptions: Subscription[] = [];

  constructor(
    private pageTitleService: PageTitleService,
    private translateService: TranslateService,
    private authService: AuthService,
    private messagesService: MessagesService,
    private notificationService: NotificationService,
    private simpleToastService: SimpleToastService,
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
    this.objectUrls.forEach(u => URL.revokeObjectURL(u));
    this.sentImageUrls.forEach(u => URL.revokeObjectURL(u));
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

  // ===== Send (optimistic: the message appears instantly, then reconciles with the server) =====

  sendMessage(): void {
    const content = this.newMessage.trim();
    if ((!content && !this.pendingFile) || !this.selectedUserId) return;

    if (this.pendingFile) {
      this.uploadThenSendIndividual(content);
      return;
    }

    const temp: ChatMessage = {
      id: this.nextTempId(),
      senderId: this.currentUserId,
      content,
      sentAt: new Date().toISOString(),
      isRead: false
    };
    this.messages = [...this.messages, temp];
    this.newMessage = '';
    this.stopTyping();
    this.scrollToBottom();

    this.messagesService.chatSendMessage(this.selectedUserId, content).subscribe({
      next: (res) => {
        this.replaceTempMessage(temp.id, res?.messageId);
        this.upsertConversationPreview({ userId: this.selectedUserId! }, content, temp.sentAt);
      },
      error: () => {
        this.removeTempMessage(temp.id);
        this.simpleToastService.error(this.translateService.instant('CHAT_PAGE.SEND_FAILED'));
      }
    });
  }

  private uploadThenSendIndividual(content: string): void {
    const file = this.pendingFile;
    if (!file || !this.selectedUserId) return;
    this.uploadingAttachment = true;
    this.attachmentError = '';

    this.messagesService.uploadChatAttachment(file).subscribe({
      next: (res) => {
        const temp = this.buildOptimisticIndividualAttachment(file, res, content);
        this.messages = [...this.messages, temp];
        this.cacheSentImageUrl(temp, false);
        this.discardPendingFile();
        this.uploadingAttachment = false;
        this.newMessage = '';
        this.stopTyping();
        this.scrollToBottom();

        this.messagesService.chatSendMessage(this.selectedUserId!, content, {
          attachmentKey: res.attachmentKey,
          attachmentName: res.attachmentName,
          attachmentType: res.attachmentType,
          attachmentSize: res.attachmentSize
        }).subscribe({
          next: (sendRes) => {
            this.replaceTempMessage(temp.id, sendRes?.messageId);
            this.upsertConversationPreview({ userId: this.selectedUserId! }, content || '[Attachment]', temp.sentAt);
          },
          error: () => {
            this.removeTempMessage(temp.id);
            this.simpleToastService.error(this.translateService.instant('CHAT_PAGE.ATTACH_SEND_FAILED'));
          }
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

    const temp: GroupChatMessage = {
      id: this.nextTempId(),
      senderId: this.currentUserId,
      senderName: '',
      content,
      sentAt: new Date().toISOString()
    };
    this.groupMessages = [...this.groupMessages, temp];
    this.newMessage = '';
    this.stopTyping();
    this.scrollToBottom();

    this.messagesService.sendChatGroupMessage(this.selectedGroupId, content).subscribe({
      next: (res) => {
        this.replaceTempMessage(temp.id, res?.messageId);
        this.upsertGroupPreview(this.selectedGroupId!, content, temp.sentAt);
      },
      error: () => {
        this.removeTempMessage(temp.id);
        this.simpleToastService.error(this.translateService.instant('CHAT_PAGE.SEND_FAILED'));
      }
    });
  }

  private uploadThenSendGroup(content: string): void {
    const file = this.pendingFile;
    if (!file || this.selectedGroupId === null) return;
    this.uploadingAttachment = true;
    this.attachmentError = '';

    this.messagesService.uploadChatAttachment(file).subscribe({
      next: (res) => {
        const temp = this.buildOptimisticGroupAttachment(file, res, content);
        this.groupMessages = [...this.groupMessages, temp];
        this.cacheSentImageUrl(temp, true);
        this.discardPendingFile();
        this.uploadingAttachment = false;
        this.newMessage = '';
        this.stopTyping();
        this.scrollToBottom();

        this.messagesService.sendChatGroupMessage(this.selectedGroupId!, content, {
          attachmentKey: res.attachmentKey,
          attachmentName: res.attachmentName,
          attachmentType: res.attachmentType,
          attachmentSize: res.attachmentSize
        }).subscribe({
          next: (sendRes) => {
            this.replaceTempMessage(temp.id, sendRes?.messageId);
            this.upsertGroupPreview(this.selectedGroupId!, content || '[Attachment]', temp.sentAt);
          },
          error: () => {
            this.removeTempMessage(temp.id);
            this.simpleToastService.error(this.translateService.instant('CHAT_PAGE.ATTACH_SEND_FAILED'));
          }
        });
      },
      error: (err) => {
        this.uploadingAttachment = false;
        this.attachmentError = err?.error?.error || this.translateService.instant('CHAT_PAGE.ATTACH_UPLOAD_FAILED');
      }
    });
  }

  private buildOptimisticIndividualAttachment(file: File, res: any, content: string): ChatMessage {
    const isImage = file.type.startsWith('image/');
    return {
      id: this.nextTempId(),
      senderId: this.currentUserId,
      content,
      sentAt: new Date().toISOString(),
      isRead: false,
      attachmentUrl: isImage ? URL.createObjectURL(file) : 'attached',
      attachmentName: res.attachmentName,
      attachmentType: res.attachmentType,
      attachmentSize: res.attachmentSize
    };
  }

  private buildOptimisticGroupAttachment(file: File, res: any, content: string): GroupChatMessage {
    const isImage = file.type.startsWith('image/');
    return {
      id: this.nextTempId(),
      senderId: this.currentUserId,
      senderName: '',
      content,
      sentAt: new Date().toISOString(),
      attachmentUrl: isImage ? URL.createObjectURL(file) : 'attached',
      attachmentName: res.attachmentName,
      attachmentType: res.attachmentType,
      attachmentSize: res.attachmentSize
    };
  }

  private cacheSentImageUrl(message: ChatMessage | GroupChatMessage, group: boolean): void {
    if (!message.attachmentUrl || !this.isImageAttachment(message.attachmentType)) return;
    this.attachmentUrlCache.set(
      this.keyFor(message.id, group),
      { url: message.attachmentUrl, expiresAt: Number.MAX_SAFE_INTEGER }
    );
    if (message.attachmentUrl.startsWith('blob:')) {
      this.sentImageUrls.add(message.attachmentUrl);
    }
  }

  private replaceTempMessage(tempId: number, realId?: number): void {
    if (realId == null) {
      this.removeTempMessage(tempId);
      return;
    }
    // Migrate any locally-cached optimistic image URL to the server message id.
    for (const group of [false, true]) {
      const entry = this.attachmentUrlCache.get(this.keyFor(tempId, group));
      if (entry) {
        this.attachmentUrlCache.set(this.keyFor(realId, group), entry);
        this.attachmentUrlCache.delete(this.keyFor(tempId, group));
      }
    }

    const idx = this.messages.findIndex(m => m.id === tempId);
    if (idx >= 0) {
      const msg = this.messages[idx];
      this.messages[idx] = { ...msg, id: realId, attachmentUrl: msg.attachmentUrl || (msg.attachmentName ? 'attached' : undefined) };
      this.messages = [...this.messages];
    }

    const gIdx = this.groupMessages.findIndex(m => m.id === tempId);
    if (gIdx >= 0) {
      const msg = this.groupMessages[gIdx];
      this.groupMessages[gIdx] = { ...msg, id: realId, attachmentUrl: msg.attachmentUrl || (msg.attachmentName ? 'attached' : undefined) };
      this.groupMessages = [...this.groupMessages];
    }
  }

  private removeTempMessage(tempId: number): void {
    this.messages = this.messages.filter(m => m.id !== tempId);
    this.groupMessages = this.groupMessages.filter(m => m.id !== tempId);
  }

  private nextTempId(): number {
    this.tempIdCounter--;
    return this.tempIdCounter;
  }

  private stopTyping(): void {
    if (!this.selectedUserId) return;
    clearTimeout(this.typingTimer);
    this.lastTypingSentAt = 0;
    this.notificationService.sendTyping(this.selectedUserId, false);
  }

  private upsertConversationPreview(contact: Partial<Conversation>, content: string, sentAt: string, unread = false): void {
    const userId = contact.userId ?? this.selectedUserId;
    if (!userId || userId === this.currentUserId) return;

    const lastMessage = content || '[Attachment]';
    const existing = this.conversations.find(c => c.userId === userId);
    if (existing) {
      existing.lastMessage = lastMessage;
      existing.lastMessageAt = sentAt;
      existing.unreadCount = unread ? (existing.unreadCount || 0) + 1 : 0;
    } else {
      this.conversations.push({
        userId,
        name: contact.name || this.selectedUserName || 'Unknown',
        profilePictureUrl: contact.profilePictureUrl || this.selectedUserPicture || undefined,
        lastMessage,
        lastMessageAt: sentAt,
        unreadCount: unread ? 1 : 0,
        role: contact.role || this.selectedUserRole || undefined,
        parentId: contact.parentId ?? this.selectedUserParentId ?? undefined,
        teacherId: contact.teacherId ?? this.selectedUserTeacherId ?? undefined
      });
    }
    this.conversations = [...this.conversations].sort(this.byLastMessageDesc);
  }

  private upsertGroupPreview(groupId: number, content: string, sentAt: string, unread = false): void {
    const existing = this.groups.find(g => g.id === groupId);
    const lastMessage = content || '[Attachment]';
    if (existing) {
      existing.lastMessage = lastMessage;
      existing.lastMessageAt = sentAt;
      existing.unreadCount = unread ? (existing.unreadCount || 0) + 1 : 0;
      this.groups = [...this.groups].sort(this.byLastMessageDesc);
    }
  }

  private byLastMessageDesc(a: { lastMessageAt?: string }, b: { lastMessageAt?: string }): number {
    return (b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0) - (a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0);
  }

  // ===== Attachments (presigned URLs, never proxied bytes) =====

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
    this.objectUrls.forEach(u => {
      if (!this.sentImageUrls.has(u)) {
        URL.revokeObjectURL(u);
      }
    });
    this.objectUrls = [...this.sentImageUrls];
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

  attachmentIcon(type?: string): string {
    const t = (type || '').toLowerCase();
    if (t.includes('pdf')) return 'bi-file-earmark-pdf';
    if (t.includes('spreadsheet') || t.includes('ms-excel') || t.includes('xls')) return 'bi-file-earmark-excel';
    if (t.includes('word') || t.includes('msword')) return 'bi-file-earmark-word';
    if (t.startsWith('image/')) return 'bi-file-earmark-image';
    return 'bi-file-earmark';
  }

  private keyFor(id: number, group: boolean): number {
    return group ? GROUP_KEY_OFFSET + id : id;
  }

  private attachmentKey(message: any, group: boolean): number {
    return message && message.id != null ? this.keyFor(message.id, group) : -1;
  }

  imageUrl(message: any, group = false): string {
    if (!message || message.id == null) return '';
    const key = this.attachmentKey(message, group);
    if (key < 0) return '';
    const cached = this.attachmentUrlCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.url;
    this.ensureAttachmentUrl(message, group);
    return '';
  }

  imageLoading(message: any, group = false): boolean {
    return this.attachmentUrlLoading.has(this.attachmentKey(message, group));
  }

  imageFailed(message: any, group = false): boolean {
    return this.attachmentFailedKeys.has(this.attachmentKey(message, group));
  }

  private ensureAttachmentUrl(message: any, group: boolean): void {
    const key = this.attachmentKey(message, group);
    if (key < 0 || this.attachmentUrlLoading.has(key)) return;
    const cached = this.attachmentUrlCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return;

    this.attachmentUrlLoading.add(key);
    this.attachmentFailedKeys.delete(key);
    this.messagesService.getChatAttachmentUrl(message.id, group).subscribe({
      next: (res) => {
        this.attachmentUrlCache.set(key, {
          url: res.url,
          expiresAt: Date.now() + (res.expiresInSeconds || 900) * 1000
        });
        this.attachmentUrlLoading.delete(key);
        this.cdr.detectChanges();
      },
      error: () => {
        this.attachmentUrlLoading.delete(key);
        this.attachmentFailedKeys.add(key);
        this.cdr.detectChanges();
      }
    });
  }

  private resolveAttachmentUrl(message: any, group: boolean): Observable<string> {
    if (!message || message.id == null) return of('');
    const key = this.attachmentKey(message, group);
    const cached = this.attachmentUrlCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return of(cached.url);

    return this.messagesService.getChatAttachmentUrl(message.id, group).pipe(
      map(res => {
        this.attachmentUrlCache.set(key, {
          url: res.url,
          expiresAt: Date.now() + (res.expiresInSeconds || 900) * 1000
        });
        return res.url;
      })
    );
  }

  openAttachment(message: any, group = false): void {
    if (!message || message.id == null) return;
    // Pending message (id still negative): nothing to open yet.
    if (message.id < 0) return;

    // Images open full-screen inside the chat (Messenger-style lightbox).
    if (this.isImageAttachment(message.attachmentType)) {
      this.openImageViewer(message, group);
      return;
    }

    this.resolveAttachmentUrl(message, group).subscribe({
      next: (url) => {
        if (!url) {
          this.simpleToastService.error(this.translateService.instant('CHAT_PAGE.ATTACH_OPEN_FAILED'));
          return;
        }
        window.open(url, '_blank');
      },
      error: () => {
        this.simpleToastService.error(this.translateService.instant('CHAT_PAGE.ATTACH_OPEN_FAILED'));
      }
    });
  }

  openImageViewer(message: any, group = false): void {
    if (!message || message.id == null) return;
    if (message.id < 0) return;

    const cached = this.resolveAttachmentCache(message, group);
    if (cached) {
      this.viewerImageUrl = cached;
      this.viewerImageName = message.attachmentName || 'image';
      return;
    }
    this.resolveAttachmentUrl(message, group).subscribe({
      next: (url) => {
        if (!url) return;
        this.viewerImageUrl = url;
        this.viewerImageName = message.attachmentName || 'image';
      },
      error: () => {
        this.simpleToastService.error(this.translateService.instant('CHAT_PAGE.ATTACH_OPEN_FAILED'));
      }
    });
  }

  private resolveAttachmentCache(message: any, group: boolean): string | null {
    const key = this.attachmentKey(message, group);
    const cached = this.attachmentUrlCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.url;
    if (cached) this.attachmentUrlCache.delete(key);
    return null;
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
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  downloadAttachment(message: any, group = false): void {
    if (!message || message.id == null || message.id < 0) return;
    this.resolveAttachmentUrl(message, group).subscribe({
      next: (url) => {
        if (!url) return;
        const a = document.createElement('a');
        a.href = url;
        a.download = message.attachmentName || 'attachment';
        a.target = '_blank';
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      },
      error: () => {
        this.simpleToastService.error(this.translateService.instant('CHAT_PAGE.ATTACH_OPEN_FAILED'));
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
    if (data?.senderId) {
      const active = this.selectedUserId !== null && data.senderId === this.selectedUserId;
      this.upsertConversationPreview(
        { userId: data.senderId, name: data.senderName },
        data.content || (data.attachmentUrl ? '[Attachment]' : ''),
        data.sentAt ?? new Date().toISOString(),
        !active
      );
    }

    if (data?.senderId && this.selectedUserId && data.senderId === this.selectedUserId) {
      if (data.content || data.attachmentUrl) {
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
    const active = data?.groupId != null && this.selectedGroupId !== null && data.groupId === this.selectedGroupId;
    if (data?.groupId != null) {
      this.upsertGroupPreview(
        data.groupId,
        data.content || (data.attachmentUrl ? '[Attachment]' : ''),
        data.sentAt ?? new Date().toISOString(),
        !active
      );
    }

    if (active) {
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
    const now = Date.now();
    if (now - this.lastTypingSentAt >= TYPING_THROTTLE_MS) {
      this.lastTypingSentAt = now;
      this.notificationService.sendTyping(this.selectedUserId, true);
    }
    clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout(() => {
      this.notificationService.sendTyping(this.selectedUserId!, false);
      this.lastTypingSentAt = 0;
    }, TYPING_STOP_MS);
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

  trackByContact(_: number, item: ChatListItem): string {
    return item.kind === 'group'
      ? `g-${item.group!.id}`
      : `c-${item.conversation!.userId}`;
  }

  trackByMessage(_: number, message: ChatMessage): number {
    return message.id;
  }

  trackByGroupMessage(_: number, message: GroupChatMessage): number {
    return message.id;
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
    this.stopTyping();
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