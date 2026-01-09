import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonComponent } from './skeleton.component';

/**
 * Skeleton loader for activity timeline
 * Shows loading placeholder for daily activities list
 *
 * Usage:
 * <app-skeleton-activity-timeline [count]="5"></app-skeleton-activity-timeline>
 */
@Component({
  selector: 'app-skeleton-activity-timeline',
  standalone: true,
  imports: [CommonModule, SkeletonComponent],
  template: `
    <div class="activity-timeline">
      <div class="timeline-item skeleton-activity" *ngFor="let i of items; let idx = index">
        <div class="timeline-marker">
          <app-skeleton [height]="40" [width]="'40px'" [circle]="true"></app-skeleton>
        </div>
        <div class="timeline-content">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <app-skeleton [height]="18" [width]="'40%'"></app-skeleton>
            <app-skeleton [height]="14" [width]="'20%'"></app-skeleton>
          </div>
          <app-skeleton [height]="14" [width]="'80%'" class="mb-1"></app-skeleton>
          <app-skeleton [height]="14" [width]="'60%'"></app-skeleton>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .activity-timeline {
      position: relative;
      padding-left: 60px;
    }

    .timeline-item {
      position: relative;
      margin-bottom: 30px;
      animation: fadeIn 0.3s ease-out;
    }

    .timeline-item:nth-child(1) { animation-delay: 0s; }
    .timeline-item:nth-child(2) { animation-delay: 0.1s; }
    .timeline-item:nth-child(3) { animation-delay: 0.2s; }
    .timeline-item:nth-child(4) { animation-delay: 0.3s; }
    .timeline-item:nth-child(5) { animation-delay: 0.4s; }

    .timeline-marker {
      position: absolute;
      left: -60px;
      top: 0;
    }

    .timeline-content {
      background: white;
      padding: 15px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .timeline-item:not(:last-child)::before {
      content: '';
      position: absolute;
      left: -40px;
      top: 50px;
      width: 2px;
      height: calc(100% + 10px);
      background: #e0e0e0;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class SkeletonActivityTimelineComponent {
  @Input() count: number = 5;

  get items(): number[] {
    return Array(this.count).fill(0).map((_, i) => i);
  }
}
