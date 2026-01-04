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

@Injectable({ providedIn: 'root' })
export class MessagesService {
  private apiUrl = ApiConfig.ENDPOINTS.MESSAGES;

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

  sendMessage(data: { recipientId?: string, subject: string, content: string, recipientType: string, parentMessageId?: number }): Observable<any> {
    return this.http.post(`${this.apiUrl}`, data);
  }
}
