import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap, of, catchError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Notification } from '../interfaces/notification.interface';
import { ApiConfig } from '../../core/config/api.config';
import { PushNotificationService } from './push-notification.service';
import * as signalR from '@microsoft/signalr';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = ApiConfig.ENDPOINTS.NOTIFICATIONS;
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();
  private messageUnreadCountSubject = new BehaviorSubject<number>(0);
  public messageUnreadCount$ = this.messageUnreadCountSubject.asObservable();
  private hubConnection?: signalR.HubConnection;
  private notificationReceivedSubject = new BehaviorSubject<Notification | null>(null);
  public notificationReceived$ = this.notificationReceivedSubject.asObservable();

  constructor(
    private http: HttpClient, 
    private router: Router,
    private pushNotificationService: PushNotificationService
  ) {
    this.loadUnreadCount();
  }

  getNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(this.apiUrl);
  }

  getAllNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}?includeRead=true`);
  }

  getUnreadNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}/Unread`).pipe(
      catchError(() => of([]))
    );
  }

  loadUnreadCount(): void {
    this.http.get<{ count: number }>(`${this.apiUrl}/Count`).pipe(
      catchError(() => of({ count: 0 }))
    ).subscribe(
      response => this.unreadCountSubject.next(response.count)
    );
  }

  markAsRead(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/MarkAsRead/${id}`, {}).pipe(
      catchError(() => of({})),
      tap(() => this.loadUnreadCount())
    );
  }

  markAllAsRead(): Observable<any> {
    return this.http.post(`${this.apiUrl}/MarkAllAsRead`, {}).pipe(
      catchError(() => of({})),
      tap(() => this.unreadCountSubject.next(0))
    );
  }

  deleteNotification(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.loadUnreadCount())
    );
  }

  handleNotificationClick(notification: Notification): void {
    this.markAsRead(notification.id).subscribe();
    
    if (notification.redirectUrl) {
      this.router.navigate([notification.redirectUrl]);
    }
  }

  startConnection(userId: string, token: string): void {
    if (this.hubConnection) {
      this.stopConnection();
    }

    const hubUrl = `${ApiConfig.HUB_URL}/notificationHub`;
    
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token
      })
      .withAutomaticReconnect()
      .build();

    this.hubConnection.on('ReceiveNotification', (data: any) => {
      const notification: Notification = {
        id: data.id,
        type: data.type,
        title: data.title,
        message: data.message,
        redirectUrl: data.redirectUrl,
        userId: data.userId,
        isRead: data.isRead,
        createdAt: data.createdAt
      };
      
      this.notificationReceivedSubject.next(notification);
      
      if (!notification.isRead) {
        const currentCount = this.unreadCountSubject.value;
        this.unreadCountSubject.next(currentCount + 1);
      }
      
      if (this.pushNotificationService.getPermission() === 'granted') {
        this.pushNotificationService.showNotification(notification.title, {
          body: notification.message,
          tag: notification.id.toString(),
          requireInteraction: false,
          data: { redirectUrl: notification.redirectUrl }
        });
      }
    });

    this.hubConnection.on('ReceiveMessageCount', (count: number) => {
      this.messageUnreadCountSubject.next(count);
    });

    this.hubConnection.on('ReceiveNewMessage', (data: any) => {
      if (this.pushNotificationService.getPermission() === 'granted') {
        this.pushNotificationService.showNotification('New Message', {
          body: `${data.senderName}: ${data.subject}`,
          icon: '/assets/icons/icon-192x192.png',
          tag: `message-${data.messageId}`,
          requireInteraction: false,
          data: { redirectUrl: '/messages' }
        });
      }
    });

    this.hubConnection
      .start()
      .then(() => this.hubConnection?.invoke('JoinUserGroup', userId))
      .catch(err => console.error('SignalR connection error:', err));
  }

  stopConnection(): void {
    this.hubConnection?.stop();
  }
}