import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {
  private permission: NotificationPermission = 'default';

  constructor(private router: Router) {
    this.permission = this.isSupported() ? Notification.permission : 'denied';
  }

  isSupported(): boolean {
    return 'Notification' in window;
  }

  requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      return Promise.resolve('denied');
    }

    return Notification.requestPermission().then(permission => {
      this.permission = permission;
      return permission;
    });
  }

  showNotification(title: string, options?: NotificationOptions): void {
    if (!this.isSupported() || this.permission !== 'granted') {
      return;
    }

    const notification = new Notification(title, {
      icon: '/assets/favicon.ico',
      badge: '/assets/favicon.ico',
      ...options
    });

    notification.onclick = () => {
      window.focus();
      if (options?.data?.redirectUrl) {
        this.router.navigate([options.data.redirectUrl]);
      }
      notification.close();
    };
  }

  getPermission(): NotificationPermission {
    return this.permission;
  }
}
