import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonComponent } from './skeleton.component';

/**
 * Skeleton loader for parent list cards
 * Shows loading placeholder that matches the parent card layout
 *
 * Usage:
 * <app-skeleton-parent-card *ngFor="let i of [1,2,3,4]"></app-skeleton-parent-card>
 */
@Component({
  selector: 'app-skeleton-parent-card',
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
            <app-skeleton [height]="18" [width]="'70%'" class="mb-2"></app-skeleton>
            <app-skeleton [height]="14" [width]="'50%'" class="mb-1"></app-skeleton>
            <app-skeleton [height]="14" [width]="'45%'"></app-skeleton>
          </div>

          <!-- Badge skeleton -->
          <app-skeleton [height]="24" [width]="'60px'" borderRadius="12px"></app-skeleton>
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
export class SkeletonParentCardComponent {}
