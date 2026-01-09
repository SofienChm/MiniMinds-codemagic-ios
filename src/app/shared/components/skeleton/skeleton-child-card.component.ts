import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonComponent } from './skeleton.component';

/**
 * Skeleton loader for child list cards
 * Shows loading placeholder that matches the child card layout
 *
 * Usage:
 * <app-skeleton-child-card *ngFor="let i of [1,2,3,4]"></app-skeleton-child-card>
 */
@Component({
  selector: 'app-skeleton-child-card',
  standalone: true,
  imports: [CommonModule, SkeletonComponent],
  template: `
    <div class="card-general mb-3 skeleton-card">
      <div class="card-body">
        <div class="d-flex align-items-center gap-3">
          <!-- Avatar skeleton -->
          <app-skeleton [height]="45" [width]="'45px'" [circle]="true"></app-skeleton>

          <!-- Content skeleton -->
          <div class="flex-grow-1">
            <app-skeleton [height]="18" [width]="'60%'" class="mb-2"></app-skeleton>
            <app-skeleton [height]="14" [width]="'40%'"></app-skeleton>
          </div>

          <!-- Action buttons skeleton -->
          <div class="d-flex gap-2">
            <app-skeleton [height]="32" [width]="'32px'" [circle]="true"></app-skeleton>
            <app-skeleton [height]="32" [width]="'32px'" [circle]="true"></app-skeleton>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .skeleton-card {
      animation: fadeIn 0.3s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class SkeletonChildCardComponent {}
