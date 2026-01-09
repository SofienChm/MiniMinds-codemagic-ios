import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonComponent } from './skeleton.component';

/**
 * Skeleton loader for photo gallery grid
 * Shows loading placeholder for photo grid items
 *
 * Usage:
 * <app-skeleton-photo-grid [count]="12"></app-skeleton-photo-grid>
 */
@Component({
  selector: 'app-skeleton-photo-grid',
  standalone: true,
  imports: [CommonModule, SkeletonComponent],
  template: `
    <div class="photo-grid">
      <div class="photo-item skeleton-photo" *ngFor="let i of items">
        <app-skeleton [height]="200" [width]="'100%'" borderRadius="12px"></app-skeleton>
        <div class="p-2">
          <app-skeleton [height]="14" [width]="'70%'" class="mb-1"></app-skeleton>
          <app-skeleton [height]="12" [width]="'50%'"></app-skeleton>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .photo-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 20px;
      padding: 20px 0;
    }

    .photo-item {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .skeleton-photo {
      animation: fadeIn 0.3s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    @media (max-width: 768px) {
      .photo-grid {
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 12px;
      }
    }
  `]
})
export class SkeletonPhotoGridComponent {
  @Input() count: number = 12;

  get items(): number[] {
    return Array(this.count).fill(0).map((_, i) => i);
  }
}
