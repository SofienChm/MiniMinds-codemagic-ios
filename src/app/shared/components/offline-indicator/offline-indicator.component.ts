import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { NetworkService, NetworkState } from '../../../core/services/network.service';

@Component({
  selector: 'app-offline-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="offline-banner" *ngIf="!isConnected" [@slideDown]>
      <div class="offline-content">
        <i class="bi bi-wifi-off"></i>
        <span>No internet connection</span>
      </div>
    </div>
    <div class="online-banner" *ngIf="showOnlineMessage" [@slideDown]>
      <div class="online-content">
        <i class="bi bi-wifi"></i>
        <span>Back online</span>
      </div>
    </div>
  `,
  styles: [`
    .offline-banner {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: white;
      padding: 8px 16px;
      z-index: 9999;
      animation: slideDown 0.3s ease-out;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }

    .online-banner {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      padding: 8px 16px;
      z-index: 9999;
      animation: slideDown 0.3s ease-out;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }

    .offline-content,
    .online-content {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 500;
    }

    .offline-content i,
    .online-content i {
      font-size: 16px;
    }

    @keyframes slideDown {
      from {
        transform: translateY(-100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    @keyframes slideUp {
      from {
        transform: translateY(0);
        opacity: 1;
      }
      to {
        transform: translateY(-100%);
        opacity: 0;
      }
    }

    /* Safe area padding for notched devices */
    @supports (padding-top: env(safe-area-inset-top)) {
      .offline-banner,
      .online-banner {
        padding-top: calc(8px + env(safe-area-inset-top));
      }
    }
  `]
})
export class OfflineIndicatorComponent implements OnInit, OnDestroy {
  isConnected = true;
  showOnlineMessage = false;
  private subscription?: Subscription;
  private wasOffline = false;

  constructor(private networkService: NetworkService) {}

  ngOnInit(): void {
    this.subscription = this.networkService.status$.subscribe((state: NetworkState) => {
      const wasConnected = this.isConnected;
      this.isConnected = state.connected;

      // Show "Back online" message when reconnecting
      if (!wasConnected && state.connected && this.wasOffline) {
        this.showOnlineMessage = true;
        setTimeout(() => {
          this.showOnlineMessage = false;
        }, 3000);
      }

      if (!state.connected) {
        this.wasOffline = true;
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
