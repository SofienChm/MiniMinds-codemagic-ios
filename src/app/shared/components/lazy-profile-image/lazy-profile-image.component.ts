import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ApiConfig } from '../../../core/config/api.config';

interface ProfilePictureResponse {
  profilePictureUrl?: string;
  profilePicture?: string;
  isFileBased?: boolean;
}

@Component({
  selector: 'app-lazy-profile-image',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="profile-image-container" [ngStyle]="containerStyle">
      <!-- Loading skeleton -->
      <div *ngIf="loading" class="skeleton-loader" [ngStyle]="skeletonStyle"></div>

      <!-- Actual image -->
      <img
        *ngIf="!loading && imageUrl"
        [src]="imageUrl"
        [alt]="alt"
        class="profile-image"
        [ngStyle]="imageStyle"
      />

      <!-- Default avatar if no image -->
      <div *ngIf="!loading && !imageUrl" class="default-avatar" [ngStyle]="defaultAvatarStyle">
        <span>{{ initials }}</span>
      </div>
    </div>
  `,
  styles: [`
    .profile-image-container {
      position: relative;
      overflow: hidden;
      border-radius: 50%;
      background-color: #f0f0f0;
    }

    .skeleton-loader {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 50%;
    }

    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    .profile-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
    }

    .default-avatar {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #6366f1;
      color: white;
      font-weight: 600;
      border-radius: 50%;
    }
  `]
})
export class LazyProfileImageComponent implements OnInit, OnChanges {
  @Input() entityType: 'parent' | 'child' = 'parent';
  @Input() entityId?: number;
  @Input() hasProfilePicture: boolean = false;
  @Input() firstName: string = '';
  @Input() lastName: string = '';
  @Input() size: number = 40;
  @Input() alt: string = 'Profile picture';
  @Input() cachedImage?: string; // If image is already loaded (e.g., from detail view)
  @Input() profilePictureUrl?: string; // File-based URL (new)

  loading: boolean = false;
  imageUrl: string | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadImage();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['entityId'] || changes['hasProfilePicture'] || changes['cachedImage'] || changes['profilePictureUrl']) {
      this.loadImage();
    }
  }

  private loadImage(): void {
    // Priority 1: Use profilePictureUrl if available (file-based storage)
    if (this.profilePictureUrl) {
      this.imageUrl = this.getFullUrl(this.profilePictureUrl);
      this.loading = false;
      return;
    }

    // Priority 2: Use cachedImage (Base64 or URL from parent component)
    if (this.cachedImage) {
      this.imageUrl = this.cachedImage;
      this.loading = false;
      return;
    }

    // If no profile picture flag, don't load
    if (!this.hasProfilePicture || !this.entityId) {
      this.imageUrl = null;
      this.loading = false;
      return;
    }

    // Load image from API
    this.loading = true;
    const endpoint = this.entityType === 'parent'
      ? `${ApiConfig.ENDPOINTS.PARENTS}/${this.entityId}/profile-picture`
      : `${ApiConfig.ENDPOINTS.CHILDREN}/${this.entityId}/profile-picture`;

    this.http.get<ProfilePictureResponse>(endpoint).subscribe({
      next: (response) => {
        // Prefer file-based URL, fallback to Base64
        if (response.profilePictureUrl) {
          this.imageUrl = this.getFullUrl(response.profilePictureUrl);
        } else if (response.profilePicture) {
          this.imageUrl = response.profilePicture;
        } else {
          this.imageUrl = null;
        }
        this.loading = false;
      },
      error: () => {
        this.imageUrl = null;
        this.loading = false;
      }
    });
  }

  private getFullUrl(path: string): string {
    // If already a full URL or data URL, return as-is
    if (path.startsWith('http') || path.startsWith('data:')) {
      return path;
    }
    // Prepend API base URL for relative paths
    return `${ApiConfig.HUB_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  get initials(): string {
    const first = this.firstName?.charAt(0)?.toUpperCase() || '';
    const last = this.lastName?.charAt(0)?.toUpperCase() || '';
    return first + last || '?';
  }

  get containerStyle() {
    return {
      width: `${this.size}px`,
      height: `${this.size}px`
    };
  }

  get skeletonStyle() {
    return {
      width: `${this.size}px`,
      height: `${this.size}px`
    };
  }

  get imageStyle() {
    return {
      width: `${this.size}px`,
      height: `${this.size}px`
    };
  }

  get defaultAvatarStyle() {
    return {
      width: `${this.size}px`,
      height: `${this.size}px`,
      fontSize: `${this.size * 0.4}px`
    };
  }
}
