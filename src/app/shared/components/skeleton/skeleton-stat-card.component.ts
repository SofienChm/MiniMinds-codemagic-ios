import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonComponent } from './skeleton.component';

/**
 * Skeleton loader for dashboard stat cards
 * Shows loading placeholder for statistics cards
 *
 * Usage:
 * <app-skeleton-stat-card></app-skeleton-stat-card>
 */
@Component({
  selector: 'app-skeleton-stat-card',
  standalone: true,
  imports: [CommonModule, SkeletonComponent],
  template: `
    <div class="card-general skeleton-card">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start mb-3">
          <div class="flex-grow-1">
            <app-skeleton [height]="16" [width]="'60%'" class="mb-2"></app-skeleton>
            <app-skeleton [height]="32" [width]="'80%'"></app-skeleton>
          </div>
          <app-skeleton [height]="40" [width]="'40px'" [circle]="true"></app-skeleton>
        </div>
        <app-skeleton [height]="12" [width]="'50%'"></app-skeleton>
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
export class SkeletonStatCardComponent {}
