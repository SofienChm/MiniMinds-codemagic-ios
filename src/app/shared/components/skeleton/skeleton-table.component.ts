import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonComponent } from './skeleton.component';

/**
 * Skeleton loader for table rows
 * Shows loading placeholder for table data
 *
 * Usage:
 * <app-skeleton-table [rows]="5" [columns]="4"></app-skeleton-table>
 */
@Component({
  selector: 'app-skeleton-table',
  standalone: true,
  imports: [CommonModule, SkeletonComponent],
  template: `
    <div class="table-responsive">
      <table class="table custom-table">
        <thead>
          <tr>
            <th *ngFor="let col of columnArray">
              <app-skeleton [height]="16" [width]="'80%'"></app-skeleton>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let row of rowArray" class="skeleton-row">
            <td *ngFor="let col of columnArray">
              <app-skeleton [height]="14" [width]="getColumnWidth(col)"></app-skeleton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .skeleton-row {
      animation: fadeIn 0.3s ease-out;
    }

    .skeleton-row:nth-child(1) { animation-delay: 0s; }
    .skeleton-row:nth-child(2) { animation-delay: 0.1s; }
    .skeleton-row:nth-child(3) { animation-delay: 0.2s; }
    .skeleton-row:nth-child(4) { animation-delay: 0.3s; }
    .skeleton-row:nth-child(5) { animation-delay: 0.4s; }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateX(-10px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
  `]
})
export class SkeletonTableComponent {
  @Input() rows: number = 5;
  @Input() columns: number = 4;

  get rowArray(): number[] {
    return Array(this.rows).fill(0).map((_, i) => i);
  }

  get columnArray(): number[] {
    return Array(this.columns).fill(0).map((_, i) => i);
  }

  getColumnWidth(col: number): string {
    // Vary width for more realistic appearance
    const widths = ['60%', '70%', '50%', '80%', '65%'];
    return widths[col % widths.length];
  }
}
