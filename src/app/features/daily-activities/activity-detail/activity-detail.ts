import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DailyActivityService } from '../daily-activity.service';
import { DailyActivity, ActivityTemplate } from '../daily-activity.interface';
import { TitlePage, TitleAction, Breadcrumb } from '../../../shared/layouts/title-page/title-page';
import { AuthService } from '../../../core/services/auth';
import { ApiConfig } from '../../../core/config/api.config';
import { PageTitleService } from '../../../core/services/page-title.service';
import { ImageDownloadService } from '../../../core/services/image-download.service';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { ParentChildHeaderSimpleComponent } from "../../../shared/components/parent-child-header-simple/parent-child-header-simple.component";

interface ActivityComment {
  id: number;
  content: string;
  createdAt: string;
  updatedAt?: string;
  parentCommentId?: number;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    profilePicture?: string;
  };
  replies?: ActivityComment[];
}

interface ActivityPhoto {
  id: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  title?: string;
  description?: string;
  thumbnailData: string;
  createdAt: string;
  uploadedByName?: string;
}

@Component({
  selector: 'app-activity-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TranslateModule, TitlePage, ParentChildHeaderSimpleComponent],
  templateUrl: './activity-detail.html',
  styleUrls: ['./activity-detail.scss']
})
export class ActivityDetail implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('cameraInput') cameraInput!: ElementRef<HTMLInputElement>;

  private langChangeSub?: Subscription;
  activity: DailyActivity | null = null;
  loading = true;
  activityId: number = 0;
  titleActions: TitleAction[] = [];
  breadcrumbs: Breadcrumb[] = [];

  // Comments
  comments: ActivityComment[] = [];
  loadingComments = false;
  newCommentText = '';
  replyingTo: ActivityComment | null = null;
  replyText = '';
  editingComment: ActivityComment | null = null;
  editCommentText = '';
  submittingComment = false;

  // Gallery
  photos: ActivityPhoto[] = [];
  loadingPhotos = false;
  uploadingPhoto = false;
  selectedPhoto: ActivityPhoto | null = null;
  showPhotoModal = false;
  fullImageData: string | null = null;
  loadingFullImage = false;
  downloadingImage = false;

  // Activity templates for icon/color mapping
  activityTemplates: ActivityTemplate[] = [
    { type: 'Nap', icon: 'bi-moon-stars', color: 'primary', label: 'Nap Time', defaultDuration: 60 },
    { type: 'Meal', icon: 'bi-egg-fried', color: 'success', label: 'Meal', requiresFood: true },
    { type: 'Snack', icon: 'bi-cup-hot', color: 'warning', label: 'Snack', requiresFood: true },
    { type: 'Play', icon: 'bi-controller', color: 'info', label: 'Play Time', defaultDuration: 30 },
    { type: 'Diaper', icon: 'bi-baby', color: 'secondary', label: 'Diaper Change' },
    { type: 'Outdoor', icon: 'bi-tree', color: 'success', label: 'Outdoor Activity', defaultDuration: 45 },
    { type: 'Learning', icon: 'bi-book', color: 'primary', label: 'Learning', defaultDuration: 30 },
    { type: 'Bathroom', icon: 'bi-droplet', color: 'info', label: 'Bathroom' }
  ];

  // Mood emojis
  moodEmojis: { [key: string]: string } = {
    'Happy': '😊',
    'Sad': '😢',
    'Cranky': '😤',
    'Sleepy': '😴',
    'Energetic': '⚡',
    'Calm': '😌'
  };

  get isParent(): boolean {
    return this.authService.isParent();
  }

  get currentUserId(): string {
    return this.authService.getUserId() || '';
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dailyActivityService: DailyActivityService,
    private authService: AuthService,
    private location: Location,
    private http: HttpClient,
    private translate: TranslateService,
    private pageTitleService: PageTitleService,
    private imageDownloadService: ImageDownloadService
  ) {}

  ngOnInit(): void {
    this.pageTitleService.setTitle(this.translate.instant('DAILY_REPORT.ACTIVITY_DETAIL'));
    this.route.params.subscribe(params => {
      this.activityId = +params['id'];
      this.loadActivity();
      this.loadComments();
      this.loadPhotos();
    });

    this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      this.pageTitleService.setTitle(this.translate.instant('DAILY_REPORT.ACTIVITY_DETAIL'));
      this.setupBreadcrumbs();
      this.setupTitleActions();
    });
  }

  ngOnDestroy(): void {
    this.langChangeSub?.unsubscribe();
  }

  back(): void {
    this.location.back();
  }

  loadActivity(): void {
    this.loading = true;
    this.dailyActivityService.getActivity(this.activityId).subscribe({
      next: (activity) => {
        this.activity = activity;
        this.setupBreadcrumbs();
        this.setupTitleActions();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading activity:', error);
        this.loading = false;
      }
    });
  }

  // Comments functionality
  loadComments(): void {
    this.loadingComments = true;
    this.http.get<ActivityComment[]>(`${ApiConfig.ENDPOINTS.ACTIVITY_COMMENTS}/ByActivity/${this.activityId}`)
      .subscribe({
        next: (comments) => {
          this.comments = comments;
          this.loadingComments = false;
        },
        error: (error) => {
          console.error('Error loading comments:', error);
          this.loadingComments = false;
        }
      });
  }

  submitComment(): void {
    if (!this.newCommentText.trim()) return;

    this.submittingComment = true;
    this.http.post<ActivityComment>(`${ApiConfig.ENDPOINTS.ACTIVITY_COMMENTS}`, {
      activityId: this.activityId,
      content: this.newCommentText
    }).subscribe({
      next: (comment) => {
        this.comments.unshift({ ...comment, replies: [] });
        this.newCommentText = '';
        this.submittingComment = false;
      },
      error: (error) => {
        console.error('Error posting comment:', error);
        this.submittingComment = false;
        Swal.fire({
          icon: 'error',
          title: this.translate.instant('COMMON.ERROR'),
          text: 'Failed to post comment. Please try again.',
          confirmButtonColor: '#7dd3c0'
        });
      }
    });
  }

  startReply(comment: ActivityComment): void {
    this.replyingTo = comment;
    this.replyText = '';
  }

  cancelReply(): void {
    this.replyingTo = null;
    this.replyText = '';
  }

  submitReply(): void {
    if (!this.replyText.trim() || !this.replyingTo) return;

    this.submittingComment = true;
    this.http.post<ActivityComment>(`${ApiConfig.ENDPOINTS.ACTIVITY_COMMENTS}`, {
      activityId: this.activityId,
      content: this.replyText,
      parentCommentId: this.replyingTo.id
    }).subscribe({
      next: (reply) => {
        const parentComment = this.comments.find(c => c.id === this.replyingTo?.id);
        if (parentComment) {
          if (!parentComment.replies) parentComment.replies = [];
          parentComment.replies.push(reply);
        }
        this.cancelReply();
        this.submittingComment = false;
      },
      error: (error) => {
        console.error('Error posting reply:', error);
        this.submittingComment = false;
        Swal.fire({
          icon: 'error',
          title: this.translate.instant('COMMON.ERROR'),
          text: 'Failed to post reply. Please try again.',
          confirmButtonColor: '#7dd3c0'
        });
      }
    });
  }

  startEditComment(comment: ActivityComment): void {
    this.editingComment = comment;
    this.editCommentText = comment.content;
  }

  cancelEditComment(): void {
    this.editingComment = null;
    this.editCommentText = '';
  }

  saveEditComment(): void {
    if (!this.editCommentText.trim() || !this.editingComment) return;

    this.http.put(`${ApiConfig.ENDPOINTS.ACTIVITY_COMMENTS}/${this.editingComment.id}`, {
      content: this.editCommentText
    }).subscribe({
      next: () => {
        if (this.editingComment) {
          this.editingComment.content = this.editCommentText;
          this.editingComment.updatedAt = new Date().toISOString();
        }
        this.cancelEditComment();
      },
      error: (error) => {
        console.error('Error updating comment:', error);
        Swal.fire({
          icon: 'error',
          title: this.translate.instant('COMMON.ERROR'),
          text: 'Failed to update comment. Please try again.',
          confirmButtonColor: '#7dd3c0'
        });
      }
    });
  }

  async deleteComment(comment: ActivityComment): Promise<void> {
    const result = await Swal.fire({
      icon: 'warning',
      title: this.translate.instant('COMMON.CONFIRM'),
      text: 'Are you sure you want to delete this comment?',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: this.translate.instant('COMMON.DELETE'),
      cancelButtonText: this.translate.instant('COMMON.CANCEL')
    });

    if (!result.isConfirmed) return;

    this.http.delete(`${ApiConfig.ENDPOINTS.ACTIVITY_COMMENTS}/${comment.id}`).subscribe({
      next: () => {
        // Remove from comments array
        const index = this.comments.findIndex(c => c.id === comment.id);
        if (index > -1) {
          this.comments.splice(index, 1);
        } else {
          // Check in replies
          for (const c of this.comments) {
            if (c.replies) {
              const replyIndex = c.replies.findIndex(r => r.id === comment.id);
              if (replyIndex > -1) {
                c.replies.splice(replyIndex, 1);
                break;
              }
            }
          }
        }
      },
      error: (error) => {
        console.error('Error deleting comment:', error);
        Swal.fire({
          icon: 'error',
          title: this.translate.instant('COMMON.ERROR'),
          text: 'Failed to delete comment. Please try again.',
          confirmButtonColor: '#7dd3c0'
        });
      }
    });
  }

  canEditComment(comment: ActivityComment): boolean {
    return comment.user.id === this.currentUserId || this.authService.isAdmin();
  }

  // Gallery functionality
  loadPhotos(): void {
    this.loadingPhotos = true;
    this.http.get<{ data: ActivityPhoto[], totalCount: number }>(`${ApiConfig.ENDPOINTS.PHOTOS}/by-activity/${this.activityId}`)
      .subscribe({
        next: (response) => {
          this.photos = response.data;
          this.loadingPhotos = false;
        },
        error: (error) => {
          console.error('Error loading photos:', error);
          this.loadingPhotos = false;
        }
      });
  }

  triggerFileUpload(): void {
    this.fileInput?.nativeElement.click();
  }

  triggerCameraCapture(): void {
    this.cameraInput?.nativeElement.click();
  }

  onCameraCapture(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    this.uploadPhotos([file]);
    input.value = '';
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const files = Array.from(input.files);
    this.uploadPhotos(files);
    input.value = '';
  }

  uploadPhotos(files: File[]): void {
    if (files.length === 0) return;

    this.uploadingPhoto = true;

    if (files.length === 1) {
      const formData = new FormData();
      formData.append('file', files[0]);
      formData.append('activityId', this.activityId.toString());

      this.http.post<ActivityPhoto>(`${ApiConfig.ENDPOINTS.PHOTOS}/upload-activity`, formData)
        .subscribe({
          next: (photo) => {
            this.photos.unshift(photo);
            this.uploadingPhoto = false;
          },
          error: (error) => {
            console.error('Error uploading photo:', error);
            this.uploadingPhoto = false;
            Swal.fire({
              icon: 'error',
              title: this.translate.instant('COMMON.ERROR'),
              text: 'Failed to upload photo. Please try again.',
              confirmButtonColor: '#7dd3c0'
            });
          }
        });
    } else {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      formData.append('activityId', this.activityId.toString());

      this.http.post<{ uploaded: ActivityPhoto[] }>(`${ApiConfig.ENDPOINTS.PHOTOS}/upload-activity-multiple`, formData)
        .subscribe({
          next: (response) => {
            this.photos = [...response.uploaded, ...this.photos];
            this.uploadingPhoto = false;
          },
          error: (error) => {
            console.error('Error uploading photos:', error);
            this.uploadingPhoto = false;
            Swal.fire({
              icon: 'error',
              title: this.translate.instant('COMMON.ERROR'),
              text: 'Failed to upload photos. Please try again.',
              confirmButtonColor: '#7dd3c0'
            });
          }
        });
    }
  }

  openPhotoModal(photo: ActivityPhoto): void {
    this.selectedPhoto = photo;
    this.showPhotoModal = true;
    this.loadFullImage(photo.id);
  }

  closePhotoModal(): void {
    this.showPhotoModal = false;
    this.selectedPhoto = null;
    this.fullImageData = null;
  }

  /**
   * Download/save the currently selected photo
   */
  async downloadPhoto(): Promise<void> {
    if (!this.selectedPhoto || this.downloadingImage) return;

    const imageData = this.fullImageData || this.selectedPhoto.thumbnailData;
    if (!imageData) {
      Swal.fire({
        icon: 'error',
        title: this.translate.instant('GALLERY.ERROR'),
        text: this.translate.instant('GALLERY.NO_IMAGE_DATA')
      });
      return;
    }

    this.downloadingImage = true;

    try {
      const fileName = this.selectedPhoto.title ||
                       this.selectedPhoto.fileName ||
                       this.imageDownloadService.generateFileName('activity_photo');

      // On mobile, use share to give user option to save to gallery
      if (this.imageDownloadService.isNativePlatform()) {
        const result = await this.imageDownloadService.shareImage(
          imageData,
          fileName,
          this.selectedPhoto.title || 'Save Photo'
        );

        if (!result.success) {
          Swal.fire({
            icon: 'error',
            title: this.translate.instant('GALLERY.ERROR'),
            text: result.message
          });
        }
      } else {
        // On web, download directly
        const result = await this.imageDownloadService.downloadImage(imageData, fileName);

        if (result.success) {
          Swal.fire({
            icon: 'success',
            title: this.translate.instant('GALLERY.SUCCESS'),
            text: this.translate.instant('GALLERY.IMAGE_DOWNLOADED'),
            timer: 2000,
            showConfirmButton: false
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: this.translate.instant('GALLERY.ERROR'),
            text: result.message
          });
        }
      }
    } catch (error: any) {
      console.error('Error downloading photo:', error);
      Swal.fire({
        icon: 'error',
        title: this.translate.instant('GALLERY.ERROR'),
        text: error.message || this.translate.instant('GALLERY.DOWNLOAD_FAILED')
      });
    } finally {
      this.downloadingImage = false;
    }
  }

  loadFullImage(photoId: number): void {
    this.loadingFullImage = true;
    this.http.get<{ id: number, imageData: string }>(`${ApiConfig.ENDPOINTS.PHOTOS}/${photoId}`)
      .subscribe({
        next: (photo) => {
          this.fullImageData = photo.imageData;
          this.loadingFullImage = false;
        },
        error: (error) => {
          console.error('Error loading full image:', error);
          this.loadingFullImage = false;
        }
      });
  }

  async deletePhoto(photo: ActivityPhoto): Promise<void> {
    const result = await Swal.fire({
      icon: 'warning',
      title: this.translate.instant('COMMON.CONFIRM'),
      text: 'Are you sure you want to delete this photo?',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: this.translate.instant('COMMON.DELETE'),
      cancelButtonText: this.translate.instant('COMMON.CANCEL')
    });

    if (!result.isConfirmed) return;

    this.http.delete(`${ApiConfig.ENDPOINTS.PHOTOS}/${photo.id}`).subscribe({
      next: () => {
        const index = this.photos.findIndex(p => p.id === photo.id);
        if (index > -1) {
          this.photos.splice(index, 1);
        }
        if (this.selectedPhoto?.id === photo.id) {
          this.closePhotoModal();
        }
      },
      error: (error) => {
        console.error('Error deleting photo:', error);
        Swal.fire({
          icon: 'error',
          title: this.translate.instant('COMMON.ERROR'),
          text: 'Failed to delete photo. Please try again.',
          confirmButtonColor: '#7dd3c0'
        });
      }
    });
  }

  formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    return date.toLocaleDateString();
  }

  setupBreadcrumbs(): void {
    this.breadcrumbs = [
      { label: this.translate.instant('BREADCRUMBS.DASHBOARD'), url: '/dashboard' },
      { label: this.translate.instant('DAILY_REPORT.TITLE'), url: '/activities' },
      { label: this.activity?.activityType || this.translate.instant('DAILY_REPORT.ACTIVITY_DETAIL') }
    ];
  }

  setupTitleActions(): void {
    const actions: TitleAction[] = [
      {
        label: this.translate.instant('DAILY_REPORT.BACK_TO_DAILY_REPORT'),
        icon: 'bi bi-arrow-left',
        class: 'custom-btn-2 btn-cancel-2',
        action: () => this.goBack()
      }
    ];

    if (this.canEdit()) {
      actions.push({
        label: this.translate.instant('DAILY_REPORT.DELETE'),
        icon: 'bi bi-trash',
        class: 'custom-btn-2 btn-remove-2',
        action: () => this.deleteActivityAction()
      });
      actions.push({
        label: this.translate.instant('DAILY_REPORT.EDIT'),
        icon: 'bi bi-pencil',
        class: 'custom-btn-2 btn-edit-global-2',
        action: () => this.editActivity()
      });
    }

    this.titleActions = actions;
  }

  goBack(): void {
    this.router.navigate(['/activities']);
  }

  editActivity(): void {
    this.router.navigate(['/activities'], { queryParams: { edit: this.activityId } });
  }

  async deleteActivityAction(): Promise<void> {
    if (!this.activity?.id) return;

    const result = await Swal.fire({
      icon: 'warning',
      title: this.translate.instant('COMMON.CONFIRM'),
      text: 'Are you sure you want to delete this activity?',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: this.translate.instant('COMMON.DELETE'),
      cancelButtonText: this.translate.instant('COMMON.CANCEL')
    });

    if (result.isConfirmed) {
      this.dailyActivityService.deleteActivity(this.activity.id).subscribe({
        next: () => {
          this.router.navigate(['/activities']);
        },
        error: (error) => {
          console.error('Error deleting activity:', error);
          Swal.fire({
            icon: 'error',
            title: this.translate.instant('COMMON.ERROR'),
            text: 'Failed to delete activity. Please try again.',
            confirmButtonColor: '#7dd3c0'
          });
        }
      });
    }
  }

  canEdit(): boolean {
    return this.authService.isAdmin() || this.authService.isTeacher();
  }

  getActivityTemplate(): ActivityTemplate | undefined {
    return this.activityTemplates.find(t => t.type === this.activity?.activityType);
  }

  getActivityIcon(): string {
    const template = this.getActivityTemplate();
    return template?.icon || 'bi-activity';
  }

  getActivityColor(): string {
    const template = this.getActivityTemplate();
    return template?.color || 'secondary';
  }

  getActivityLabel(): string {
    const template = this.getActivityTemplate();
    return template?.label || this.activity?.activityType || 'Activity';
  }

  getMoodEmoji(): string {
    if (!this.activity?.mood) return '';
    return this.moodEmojis[this.activity.mood] || '';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDuration(duration: string | undefined): string {
    if (!duration) return 'N/A';

    if (duration.includes(':')) {
      const parts = duration.split(':');
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);

      if (hours > 0 && minutes > 0) {
        return `${hours}h ${minutes}m`;
      } else if (hours > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''}`;
      } else if (minutes > 0) {
        return `${minutes} minute${minutes > 1 ? 's' : ''}`;
      }
    }

    return duration;
  }

  getChildFullName(): string {
    if (!this.activity?.child) return 'Unknown Child';
    return `${this.activity.child.firstName} ${this.activity.child.lastName}`;
  }

  getActivityEmoji(): string {
    const emojiMap: { [key: string]: string } = {
      'Nap': '😴',
      'Meal': '🍽️',
      'Snack': '🍎',
      'Play': '🎮',
      'Diaper': '👶',
      'Outdoor': '🌳',
      'Learning': '📚',
      'Bathroom': '🚽'
    };
    return emojiMap[this.activity?.activityType || ''] || '📋';
  }
}
