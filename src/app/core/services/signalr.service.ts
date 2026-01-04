import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../../environments/environment';
import { NotificationService } from './notification-service';

@Injectable({
  providedIn: 'root'
})
export class SignalRService {
  private hubConnection?: signalR.HubConnection;
  private isConnecting = false;

  constructor(private notificationService: NotificationService) {}

  startConnection(): void {
    const token = localStorage.getItem('token');
    if (!token || this.isConnecting) return;

    this.isConnecting = true;

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.apiUrl}/notificationHub`, {
        accessTokenFactory: () => token,
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.hubConnection.onreconnecting(() => {
      console.log('SignalR reconnecting...');
    });

    this.hubConnection.onreconnected(() => {
      console.log('SignalR reconnected');
    });

    this.hubConnection.onclose(() => {
      console.log('SignalR connection closed');
      this.isConnecting = false;
    });

    this.hubConnection.on('ReceiveNotification', (notification: any) => {
      console.log('Received notification:', notification);
      this.notificationService.loadUnreadCount();
    });

    this.hubConnection
      .start()
      .then(() => {
        console.log('SignalR Connected');
        this.isConnecting = false;
      })
      .catch(err => {
        console.warn('SignalR Connection Error (notifications will still work via polling):', err);
        this.isConnecting = false;
      });
  }

  stopConnection(): void {
    if (this.hubConnection) {
      this.hubConnection.stop();
      this.hubConnection = undefined;
    }
    this.isConnecting = false;
  }

  onAttendanceUpdate(callback: () => void): void {
    this.hubConnection?.on('AttendanceUpdated', callback);
  }

  offAttendanceUpdate(): void {
    this.hubConnection?.off('AttendanceUpdated');
  }
}
