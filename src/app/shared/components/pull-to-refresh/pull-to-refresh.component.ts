import { Component, EventEmitter, Input, Output, ElementRef, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Capacitor } from '@capacitor/core';

@Component({
  selector: 'app-pull-to-refresh',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pull-to-refresh-container"
         (touchstart)="onTouchStart($event)"
         (touchmove)="onTouchMove($event)"
         (touchend)="onTouchEnd()">

      <!-- Pull indicator -->
      <div class="pull-indicator" [class.visible]="pullDistance > 0" [class.refreshing]="isRefreshing">
        <div class="pull-indicator-content" [style.transform]="'translateY(' + Math.min(pullDistance, maxPullDistance) + 'px)'">
          <div class="spinner-container" [style.transform]="'rotate(' + (pullDistance * 2) + 'deg)'">
            <svg *ngIf="!isRefreshing" class="pull-arrow" viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M12 4l-8 8h5v8h6v-8h5z" [style.opacity]="pullProgress"/>
            </svg>
            <div *ngIf="isRefreshing" class="spinner"></div>
          </div>
          <span class="pull-text">{{ pullText }}</span>
        </div>
      </div>

      <!-- Content -->
      <div class="pull-content" [style.transform]="'translateY(' + Math.min(pullDistance, maxPullDistance) + 'px)'">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    .pull-to-refresh-container {
      position: relative;
      overflow: hidden;
      min-height: 100%;
    }

    .pull-indicator {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      transform: translateY(-100%);
      transition: opacity 0.2s ease;
      opacity: 0;
      z-index: 10;
    }

    .pull-indicator.visible {
      opacity: 1;
    }

    .pull-indicator-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      color: #7dd3c0;
    }

    .spinner-container {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .pull-arrow {
      color: #7dd3c0;
      transition: transform 0.2s ease;
    }

    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid #e0e0e0;
      border-top-color: #7dd3c0;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .pull-text {
      font-size: 12px;
      color: #666;
      font-weight: 500;
    }

    .pull-content {
      transition: transform 0.2s ease;
    }

    .pull-indicator.refreshing .pull-content {
      transition: none;
    }
  `]
})
export class PullToRefreshComponent implements OnInit, OnDestroy {
  @Input() threshold = 70; // Distance to trigger refresh
  @Input() maxPullDistance = 100; // Max pull distance
  @Input() disabled = false;
  @Output() refresh = new EventEmitter<void>();

  pullDistance = 0;
  isRefreshing = false;
  private startY = 0;
  private isTouching = false;
  private canPull = false;

  // Expose Math to template
  Math = Math;

  get pullProgress(): number {
    return Math.min(this.pullDistance / this.threshold, 1);
  }

  get pullText(): string {
    if (this.isRefreshing) return 'Refreshing...';
    if (this.pullDistance >= this.threshold) return 'Release to refresh';
    return 'Pull to refresh';
  }

  constructor(private el: ElementRef, private ngZone: NgZone) {}

  ngOnInit(): void {
    // Only enable on mobile/Capacitor
    if (!this.isMobile()) {
      this.disabled = true;
    }
  }

  ngOnDestroy(): void {}

  private isMobile(): boolean {
    if (Capacitor.isNativePlatform()) return true;
    const userAgent = navigator.userAgent || navigator.vendor;
    return /android|iphone|ipad|ipod/i.test(userAgent.toLowerCase());
  }

  onTouchStart(event: TouchEvent): void {
    if (this.disabled || this.isRefreshing) return;

    // Check if we're at the top of the scroll container
    const scrollTop = this.getScrollTop();
    this.canPull = scrollTop <= 0;

    if (this.canPull) {
      this.startY = event.touches[0].clientY;
      this.isTouching = true;
    }
  }

  onTouchMove(event: TouchEvent): void {
    if (!this.isTouching || this.disabled || this.isRefreshing || !this.canPull) return;

    const currentY = event.touches[0].clientY;
    const diff = currentY - this.startY;

    // Only pull down, not up
    if (diff > 0) {
      // Apply resistance (gets harder to pull further)
      this.pullDistance = diff * 0.5;

      // Prevent default scroll when pulling
      if (this.pullDistance > 10) {
        event.preventDefault();
      }
    }
  }

  onTouchEnd(): void {
    if (!this.isTouching || this.disabled) return;

    this.isTouching = false;

    if (this.pullDistance >= this.threshold && !this.isRefreshing) {
      this.triggerRefresh();
    } else {
      this.resetPull();
    }
  }

  private triggerRefresh(): void {
    this.isRefreshing = true;
    this.pullDistance = 60; // Hold at refresh position

    this.refresh.emit();
  }

  // Call this from parent component when refresh is complete
  completeRefresh(): void {
    this.ngZone.run(() => {
      this.isRefreshing = false;
      this.resetPull();
    });
  }

  private resetPull(): void {
    this.pullDistance = 0;
  }

  private getScrollTop(): number {
    // Check the scroll position of the container or window
    const container = this.el.nativeElement.closest('.pull-content, .scrollable, [scrollable]');
    if (container) {
      return container.scrollTop;
    }
    return window.scrollY || document.documentElement.scrollTop;
  }
}
