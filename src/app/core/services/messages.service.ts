import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiConfig } from '../../core/config/api.config';

export interface MailMessage {
  id: number;
  senderId: string;
  senderName: string;
  recipientId?: string;
  recipientName?: string;
  subject: string;
  content: string;
  sentAt: string;
  isRead: boolean;
  recipientType: string;
  replyCount?: number;
  replies?: any[];
  hasNewReply?: boolean;
}

export interface Recipient {
  id: string;
  name: string;
  email: string;
}

export interface Conversation {
  userId: string;
  name: string;
  profilePictureUrl?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface TenantContact {
  id: string;
  name: string;
  email: string;
  profilePictureUrl?: string;
}

export interface ChatMessage {
  id: number;
  senderId: string;
  content: string;
  sentAt: string;
  isRead: boolean;
}

export interface ConversationPage {
  messages: ChatMessage[];
  hasMore: boolean;
  totalCount: number;
}

export interface ChatGroup {
  id: number;
  name: string;
  avatarPath?: string;
  memberCount: number;
  isAdmin: boolean;
  createdAt: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
}

export interface ChatGroupDetail {
  id: number;
  name: string;
  avatarPath?: string;
  createdAt: string;
  isAdmin: boolean;
  members: { id: string; name: string; profilePictureUrl?: string }[];
}

export interface GroupChatMessage {
  id: number;
  senderId: string;
  senderName: string;
  content: string;
  sentAt: string;
}

export interface GroupMessagePage {
  messages: GroupChatMessage[];
  hasMore: boolean;
  totalCount: number;
}

export interface CreateChatGroupRequest {
  name?: string;
  classId?: number;
  memberIds?: string[];
}

@Injectable({ providedIn: 'root' })
export class MessagesService {
  private apiUrl = ApiConfig.ENDPOINTS.MESSAGES;
  private groupsApiUrl = ApiConfig.ENDPOINTS.CHAT_GROUPS;

  constructor(private http: HttpClient) {}

  getInbox(): Observable<MailMessage[]> {
    return this.http.get<MailMessage[]>(`${this.apiUrl}/inbox`);
  }

  getUnreadCount(): Observable<number> {
    return this.http.get<MailMessage[]>(`${this.apiUrl}/inbox`).pipe(
      map(messages => messages.filter(m => !m.isRead).length)
    );
  }

  getSent(): Observable<MailMessage[]> {
    return this.http.get<MailMessage[]>(`${this.apiUrl}/sent`);
  }

  getMessage(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  getRecipients(): Observable<{ parents: Recipient[], teachers: Recipient[] }> {
    return this.http.get<any>(`${this.apiUrl}/recipients`);
  }

  getContacts(): Observable<TenantContact[]> {
    return this.http.get<TenantContact[]>(`${this.apiUrl}/contacts`);
  }

  getConversations(): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(`${this.apiUrl}/conversations`);
  }

  getConversation(userId: string, page = 1, pageSize = 30): Observable<ConversationPage> {
    return this.http.get<ConversationPage>(`${this.apiUrl}/conversation/${userId}?page=${page}&pageSize=${pageSize}`);
  }

  chatSendMessage(recipientId: string, content: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/chat/send`, { recipientId, content });
  }

  sendMessage(data: { recipientId?: string, subject: string, content: string, recipientType: string, parentMessageId?: number }): Observable<any> {
    return this.http.post(`${this.apiUrl}`, data);
  }

  getChatGroups(): Observable<ChatGroup[]> {
    return this.http.get<ChatGroup[]>(this.groupsApiUrl);
  }

  getChatGroup(id: number): Observable<ChatGroupDetail> {
    return this.http.get<ChatGroupDetail>(`${this.groupsApiUrl}/${id}`);
  }

  getChatGroupMessages(id: number, page = 1, pageSize = 30): Observable<GroupMessagePage> {
    return this.http.get<GroupMessagePage>(`${this.groupsApiUrl}/${id}/messages?page=${page}&pageSize=${pageSize}`);
  }

  sendChatGroupMessage(id: number, content: string): Observable<any> {
    return this.http.post(`${this.groupsApiUrl}/${id}/messages`, { content });
  }

  createChatGroup(data: CreateChatGroupRequest): Observable<any> {
    return this.http.post(this.groupsApiUrl, data);
  }
}
