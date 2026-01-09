import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Base skeleton loader component
 * Creates animated placeholder elements while content is loading
 *
 * Usage:
 * <app-skeleton [height]="20" [width]="'100%'"></app-skeleton>
 * <app-skeleton [height]="50" [width]="'50px'" [circle]="true"></app-skeleton>
 */
@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="skeleton"
      [class.skeleton-circle]="circle"
      [class.skeleton-pulse]="pulse"
      [ngStyle]="{
        'height.px': height,
        'width': width,
        'border-radius': borderRadius
      }">
    </div>
  `,
  styles: [`
    .skeleton {
      background: linear-gradient(
        90deg,
        #f0f0f0 0%,
        #f0f0f0 40%,
        #e8e8e8 50%,
        #f0f0f0 60%,
        #f0f0f0 100%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s ease-in-out infinite;
      display: inline-block;
      border-radius: 8px;
      position: relative;
      overflow: hidden;
    }

    .skeleton-circle {
      border-radius: 50% !important;
    }

    .skeleton-pulse {
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes shimmer {
      0% {
        background-position: -200% 0;
      }
      100% {
        background-position: 200% 0;
      }
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.6;
      }
    }

    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      .skeleton {
        background: linear-gradient(
          90deg,
          #2a2a2a 0%,
          #2a2a2a 40%,
          #3a3a3a 50%,
          #2a2a2a 60%,
          #2a2a2a 100%
        );
      }
    }
  `]
})
export class SkeletonComponent {
  @Input() height: number = 20;
  @Input() width: string = '100%';
  @Input() circle: boolean = false;
  @Input() pulse: boolean = false;
  @Input() borderRadius: string = '8px';
}
