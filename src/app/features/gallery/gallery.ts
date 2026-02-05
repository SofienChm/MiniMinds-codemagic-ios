import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Photo, PhotosResponse, PHOTO_CATEGORIES } from './gallery.interface';
import { GalleryService } from './gallery.service';
import { ChildrenService } from '../children/children.service';
import { ChildModel } from '../children/children.interface';
import { AuthService } from '../../core/services/auth';
import { PermissionService } from '../../core/services/permission.service';
import { TitlePage, TitleAction, Breadcrumb } from '../../shared/layouts/title-page/title-page';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiConfig } from '../../core/config/api.config';
import { PageTitleService } from '../../core/services/page-title.service';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { ParentChildHeaderSimpleComponent } from '../../shared/components/parent-child-header-simple/parent-child-header-simple.component';
import { Capacitor } from '@capacitor/core';
import { PullToRefreshComponent } from '../../shared/components/pull-to-refresh/pull-to-refresh.component';
import { ImageDownloadService } from '../../core/services/image-download.service';
import { SkeletonPhotoGridComponent } from '../../shared/components/skeleton/skeleton-photo-grid.component';

// Image compression settings - reduces storage by ~70%
const IMAGE_MAX_WIDTH = 1920;
const IMAGE_MAX_HEIGHT = 1080;
const IMAGE_QUALITY = 0.8; // 80% quality - good balance between size and quality

@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TitlePage,
    TranslateModule,
    ParentChildHeaderSimpleComponent,
    PullToRefreshComponent,
    SkeletonPhotoGridComponent
  ],
  templateUrl: './gallery.html',
  styleUrl: './gallery.scss'
})
export class Gallery implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;
  @ViewChild('nativeCameraInput') nativeCameraInput!: ElementRef<HTMLInputElement>;
  @ViewChild('pullToRefresh') pullToRefresh!: PullToRefreshComponent;

  photos: Photo[] = [];
  children: ChildModel[] = [];
  loading = false;
  uploading = false;
  userRole: string | null = null;
  viewMode: 'grid' | 'list' = 'grid';

  // Filters
  selectedChildId: number | null = null;
  selectedCategory: string = '';
  categories = PHOTO_CATEGORIES;

  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalPages = 1;
  totalCount = 0;

  // Upload modal
  showUploadModal = false;
  uploadFiles: File[] = [];
  uploadChildId: number | null = null;
  uploadCategory: string = 'Memory';
  uploadTitle: string = '';
  uploadDescription: string = '';

  // Preview modal
  showPreviewModal = false;
  selectedPhoto: Photo | null = null;

  // Edit modal
  showEditModal = false;
  editPhoto: Photo | null = null;
  editTitle: string = '';
  editDescription: string = '';
  editCategory: string = '';

  // Camera modal
  showCameraModal = false;
  cameraStream: MediaStream | null = null;
  capturedImage: string | null = null;
  cameraChildId: number | null = null;
  cameraCategory: string = 'Memory';
  cameraTitle: string = '';
  cameraDescription: string = '';

  // Loading state for preview modal
  loadingFullImage = false;

  breadcrumbs: Breadcrumb[] = [];
  titleActions: TitleAction[] = [];
  private langChangeSub?: Subscription;

  // Download state
  downloadingImage = false;

  constructor(
    private galleryService: GalleryService,
    private childrenService: ChildrenService,
    private authService: AuthService,
    private router: Router,
    public permissions: PermissionService,
    private translate: TranslateService,
    private pageTitleService: PageTitleService,
    private imageDownloadService: ImageDownloadService
  ) {}

  ngOnInit() {
    this.userRole = this.authService.getUserRole();
    this.pageTitleService.setTitle(this.translate.instant('GALLERY.TITLE'));
    this.setupBreadcrumbs();
    this.setupTitleActions();
    this.loadChildren();
    this.loadPhotos();

    this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      this.pageTitleService.setTitle(this.translate.instant('GALLERY.TITLE'));
      this.setupBreadcrumbs();
      this.setupTitleActions();
    });
  }

  ngOnDestroy() {
    this.langChangeSub?.unsubscribe();
    this.stopCamera();
  }

  private setupBreadcrumbs(): void {
    this.breadcrumbs = [
      { label: this.translate.instant('BREADCRUMBS.DASHBOARD'), url: '/dashboard' },
      { label: this.translate.instant('GALLERY.TITLE') }
    ];
  }

  setupTitleActions() {
    // Only Admin and Teachers can upload photos
    if (this.authService.isAdmin() || this.authService.isTeacher()) {
      this.titleActions = [
        {
          label: this.translate.instant('GALLERY.TAKE_PHOTO'),
          class: 'btn-view-global-2 me-2',
          icon: 'bi bi-camera',
          action: () => this.openCameraModal()
        },
        {
          label: this.translate.instant('GALLERY.UPLOAD_PHOTOS'),
          class: 'btn-edit-global-2',
          icon: 'bi bi-upload',
          action: () => this.openUploadModal()
        }
      ];
    }
  }

  loadChildren() {
    this.childrenService.loadChildren().subscribe({
      next: (children) => {
        this.children = children;
      },
      error: (error) => {
        console.error('Error loading children:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to load children list'
        });
      }
    });
  }

  loadPhotos() {
    this.loading = true;
    this.galleryService.getPhotos(
      this.currentPage,
      this.pageSize,
      this.selectedChildId || undefined,
      this.selectedCategory || undefined
    ).subscribe({
      next: (response: PhotosResponse) => {
        this.photos = response.data;
        this.totalCount = response.totalCount;
        this.totalPages = response.totalPages;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading photos:', error);
        this.loading = false;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to load photos'
        });
      }
    });
  }

  onFilterChange() {
    this.currentPage = 1;
    this.loadPhotos();
  }

  clearFilters() {
    this.selectedChildId = null;
    this.selectedCategory = '';
    this.currentPage = 1;
    this.loadPhotos();
  }

  setViewMode(mode: 'grid' | 'list') {
    this.viewMode = mode;
  }

  // Pagination
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadPhotos();
    }
  }

  previousPage() {
    this.goToPage(this.currentPage - 1);
  }

  nextPage() {
    this.goToPage(this.currentPage + 1);
  }

  // Upload modal
  openUploadModal() {
    this.showUploadModal = true;
    this.uploadFiles = [];
    this.uploadChildId = null;
    this.uploadCategory = 'Memory';
    this.uploadTitle = '';
    this.uploadDescription = '';
  }

  closeUploadModal() {
    this.showUploadModal = false;
    this.uploadFiles = [];
  }

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.uploadFiles = Array.from(input.files);
    }
  }

  removeFile(index: number) {
    this.uploadFiles.splice(index, 1);
  }

  uploadPhotos() {
    if (!this.uploadChildId || this.uploadFiles.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Information',
        text: 'Please select a child and at least one photo'
      });
      return;
    }

    this.uploading = true;

    if (this.uploadFiles.length === 1) {
      // Single file upload
      this.galleryService.uploadPhoto(
        this.uploadFiles[0],
        this.uploadChildId,
        this.uploadTitle || undefined,
        this.uploadDescription || undefined,
        this.uploadCategory
      ).subscribe({
        next: () => {
          this.uploading = false;
          this.closeUploadModal();
          this.loadPhotos();
          Swal.fire({
            icon: 'success',
            title: 'Success',
            text: 'Photo uploaded successfully!',
            timer: 2000,
            showConfirmButton: false
          });
        },
        error: (error) => {
          console.error('Error uploading photo:', error);
          this.uploading = false;
          Swal.fire({
            icon: 'error',
            title: 'Upload Failed',
            text: 'Error uploading photo. Please try again.'
          });
        }
      });
    } else {
      // Multiple files upload
      this.galleryService.uploadMultiplePhotos(
        this.uploadFiles,
        this.uploadChildId,
        this.uploadCategory,
        this.uploadDescription || undefined
      ).subscribe({
        next: (response) => {
          this.uploading = false;
          this.closeUploadModal();
          this.loadPhotos();
          if (response.errors && response.errors.length > 0) {
            Swal.fire({
              icon: 'warning',
              title: 'Partial Upload',
              html: `Uploaded ${response.uploaded.length} photos.<br>Errors: ${response.errors.join(', ')}`
            });
          } else {
            Swal.fire({
              icon: 'success',
              title: 'Success',
              text: `${response.uploaded.length} photos uploaded successfully!`,
              timer: 2000,
              showConfirmButton: false
            });
          }
        },
        error: (error) => {
          console.error('Error uploading photos:', error);
          this.uploading = false;
          Swal.fire({
            icon: 'error',
            title: 'Upload Failed',
            text: 'Error uploading photos. Please try again.'
          });
        }
      });
    }
  }

  // Check if running on native mobile platform or mobile browser
  // Use native file input for camera on mobile devices
  private isNativeMobile(): boolean {
    // Check Capacitor native platform first
    if (Capacitor.isNativePlatform()) {
      return true;
    }
    // Fallback: check user agent for mobile devices
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
    // Also check if mediaDevices is not available (iOS WebView)
    const noMediaDevices = !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia;
    return isMobile || noMediaDevices;
  }

  // Camera functions - web browser camera API
  async openCameraModal() {
    // Reset modal state
    this.capturedImage = null;
    this.cameraChildId = null;
    this.cameraCategory = 'Memory';
    this.cameraTitle = '';
    this.cameraDescription = '';

    // On native mobile (Android/iOS), use native file input with capture
    // This properly triggers the native camera app
    if (this.isNativeMobile()) {
      this.nativeCameraInput?.nativeElement.click();
      return;
    }

    // Check HTTPS requirement (camera only works on HTTPS or localhost)
    const isSecure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (!isSecure) {
      Swal.fire({
        icon: 'warning',
        title: 'Secure Connection Required',
        html: 'Camera access requires a secure connection (HTTPS).<br><br>Please use HTTPS or access from localhost.',
      });
      return;
    }

    // Check if camera API is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      Swal.fire({
        icon: 'error',
        title: 'Camera Not Supported',
        text: 'Your browser does not support camera access. Please use a modern browser like Chrome, Firefox, or Safari.'
      });
      return;
    }

    this.showCameraModal = true;
    setTimeout(async () => {
      await this.startCamera();
    }, 100);
  }

  // Start camera with mobile-friendly settings
  async startCamera() {
    try {
      // Try with back camera first (better for mobile), fallback to any camera
      let stream: MediaStream | null = null;

      // First attempt: back camera with ideal resolution
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
      } catch {
        // Second attempt: any camera with basic constraints
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      this.cameraStream = stream;

      if (this.videoElement?.nativeElement) {
        const video = this.videoElement.nativeElement;
        video.srcObject = this.cameraStream;
        video.setAttribute('playsinline', 'true'); // Required for iOS Safari
        video.setAttribute('autoplay', 'true');
        video.setAttribute('muted', 'true');
        video.muted = true;

        // Wait for video to be ready
        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => {
            video.play()
              .then(() => resolve())
              .catch(reject);
          };
          video.onerror = () => reject(new Error('Video failed to load'));
          // Timeout after 10 seconds
          setTimeout(() => reject(new Error('Camera timeout')), 10000);
        });
      }
    } catch (error: any) {
      console.error('Error accessing camera:', error);
      let errorMessage = 'Could not access camera.';
      let errorTitle = 'Camera Error';

      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorTitle = 'Permission Denied';
        errorMessage = 'Camera permission was denied. Please follow these steps:\n\n' +
          '1. Click the camera/lock icon in your browser address bar\n' +
          '2. Allow camera access for this site\n' +
          '3. Refresh the page and try again';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'No camera found on this device.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'Camera is already in use by another application. Please close other apps using the camera.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Camera settings not supported. Please try a different browser.';
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Camera access blocked due to security settings. Please use HTTPS.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      Swal.fire({
        icon: 'error',
        title: errorTitle,
        text: errorMessage
      });
      this.closeCameraModal();
    }
  }

  // Capture photo from web camera with compression
  capturePhoto() {
    if (!this.videoElement?.nativeElement || !this.canvasElement?.nativeElement) return;

    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Calculate dimensions maintaining aspect ratio
    let width = video.videoWidth;
    let height = video.videoHeight;

    // Resize if larger than max dimensions (reduces file size)
    if (width > IMAGE_MAX_WIDTH || height > IMAGE_MAX_HEIGHT) {
      const ratio = Math.min(IMAGE_MAX_WIDTH / width, IMAGE_MAX_HEIGHT / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    canvas.width = width;
    canvas.height = height;
    context.drawImage(video, 0, 0, width, height);

    // Compress with quality setting (0.8 = 80% quality)
    this.capturedImage = canvas.toDataURL('image/jpeg', IMAGE_QUALITY);
    this.stopCamera();
  }

  retakePhoto() {
    this.capturedImage = null;
    setTimeout(async () => {
      await this.startCamera();
    }, 100);
  }

  stopCamera() {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
      this.cameraStream = null;
    }
  }

  closeCameraModal() {
    this.stopCamera();
    this.showCameraModal = false;
    this.capturedImage = null;
    // Reset form fields
    this.cameraChildId = null;
    this.cameraCategory = 'Memory';
    this.cameraTitle = '';
    this.cameraDescription = '';
  }

  // Handle native camera capture (from file input with capture="environment")
  onNativeCameraCapture(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];

    // Read file as base64 and show in modal for child selection
    const reader = new FileReader();
    reader.onload = () => {
      this.capturedImage = reader.result as string;
      // Show modal with captured image for child selection
      this.showCameraModal = true;
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be selected again
    input.value = '';
  }

  async saveCapturedPhoto() {
    if (!this.capturedImage || !this.cameraChildId) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Information',
        text: 'Please capture a photo and select a child'
      });
      return;
    }

    this.uploading = true;

    try {
      // Convert base64 to blob with compression
      const file = await this.base64ToCompressedFile(this.capturedImage);

      this.galleryService.uploadPhoto(
        file,
        this.cameraChildId,
        this.cameraTitle || undefined,
        this.cameraDescription || undefined,
        this.cameraCategory
      ).subscribe({
        next: () => {
          this.uploading = false;
          this.closeCameraModal();
          this.loadPhotos();
          Swal.fire({
            icon: 'success',
            title: 'Success',
            text: 'Photo captured and saved successfully!',
            timer: 2000,
            showConfirmButton: false
          });
        },
        error: (error) => {
          console.error('Error saving captured photo:', error);
          this.uploading = false;
          Swal.fire({
            icon: 'error',
            title: 'Save Failed',
            text: 'Error saving photo. Please try again.'
          });
        }
      });
    } catch (error) {
      console.error('Error processing photo:', error);
      this.uploading = false;
      Swal.fire({
        icon: 'error',
        title: 'Processing Error',
        text: 'Error processing photo. Please try again.'
      });
    }
  }

  // Convert base64 to compressed file
  private async base64ToCompressedFile(base64: string): Promise<File> {
    // Create image element
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = base64;
    });

    // Create canvas for compression
    const canvas = document.createElement('canvas');
    let width = img.width;
    let height = img.height;

    // Resize if needed
    if (width > IMAGE_MAX_WIDTH || height > IMAGE_MAX_HEIGHT) {
      const ratio = Math.min(IMAGE_MAX_WIDTH / width, IMAGE_MAX_HEIGHT / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    ctx.drawImage(img, 0, 0, width, height);

    // Convert to blob with compression
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => b ? resolve(b) : reject(new Error('Failed to create blob')),
        'image/jpeg',
        IMAGE_QUALITY
      );
    });

    return new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
  }

  // Preview modal - fetches full resolution image
  openPreview(photo: Photo) {
    this.selectedPhoto = photo;
    this.showPreviewModal = true;

    // If we have a file-based URL, no need to fetch - image loads directly
    if (photo.imageUrl) {
      this.loadingFullImage = false;
      return;
    }

    // For Base64-based photos, fetch full resolution from API
    this.loadingFullImage = true;
    this.galleryService.getPhoto(photo.id).subscribe({
      next: (fullPhoto) => {
        if (this.selectedPhoto && this.selectedPhoto.id === photo.id) {
          this.selectedPhoto = {
            ...this.selectedPhoto,
            imageData: fullPhoto.imageData,
            imageUrl: fullPhoto.imageUrl
          };
        }
        this.loadingFullImage = false;
      },
      error: (error) => {
        console.error('Error loading full image:', error);
        this.loadingFullImage = false;
      }
    });
  }

  closePreview() {
    this.showPreviewModal = false;
    this.selectedPhoto = null;
  }

  /**
   * Download/save the currently selected photo
   */
  async downloadPhoto(): Promise<void> {
    if (!this.selectedPhoto || this.downloadingImage) return;

    // Prefer file-based URL, fallback to Base64
    const imageUrl = this.selectedPhoto.imageUrl
      ? ApiConfig.HUB_URL + this.selectedPhoto.imageUrl
      : null;
    const imageData = this.selectedPhoto.imageData || this.selectedPhoto.thumbnailData;

    if (!imageUrl && !imageData) {
      Swal.fire({
        icon: 'error',
        title: this.translate.instant('GALLERY.ERROR'),
        text: this.translate.instant('GALLERY.NO_IMAGE_DATA')
      });
      return;
    }

    this.downloadingImage = true;

    try {
      // Generate filename from title or use default
      const fileName = this.selectedPhoto.title ||
                       this.selectedPhoto.fileName ||
                       this.imageDownloadService.generateFileName('miniminds_photo');

      // If we have a URL, fetch it first to get the data
      let downloadData = imageData;
      if (imageUrl && !imageData) {
        try {
          const response = await fetch(imageUrl);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          const blob = await response.blob();
          downloadData = await this.blobToBase64(blob);
        } catch (fetchError) {
          console.error('Error fetching image from URL:', fetchError);
          // On web, try opening in new tab. On mobile, show error (don't use window.open as it triggers deep links)
          if (!this.imageDownloadService.isNativePlatform()) {
            window.open(imageUrl, '_blank');
          } else {
            Swal.fire({
              icon: 'error',
              title: this.translate.instant('GALLERY.ERROR'),
              text: this.translate.instant('GALLERY.DOWNLOAD_FAILED')
            });
          }
          this.downloadingImage = false;
          return;
        }
      }

      if (!downloadData) {
        Swal.fire({
          icon: 'error',
          title: this.translate.instant('GALLERY.ERROR'),
          text: this.translate.instant('GALLERY.NO_IMAGE_DATA')
        });
        this.downloadingImage = false;
        return;
      }

      // Download image - works on both mobile (saves to gallery) and web (downloads)
      const result = await this.imageDownloadService.downloadImage(downloadData, fileName);

      if (result.success) {
        Swal.fire({
          icon: 'success',
          title: this.translate.instant('GALLERY.SUCCESS'),
          text: this.imageDownloadService.isNativePlatform()
            ? this.translate.instant('GALLERY.IMAGE_SAVED_TO_GALLERY')
            : this.translate.instant('GALLERY.IMAGE_DOWNLOADED'),
          timer: 3000,
          timerProgressBar: true,
          showConfirmButton: true,
          confirmButtonText: 'OK'
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: this.translate.instant('GALLERY.ERROR'),
          text: result.message
        });
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

  /**
   * Convert blob to base64 string
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Edit modal
  openEditModal(photo: Photo) {
    this.editPhoto = photo;
    this.editTitle = photo.title || '';
    this.editDescription = photo.description || '';
    this.editCategory = photo.category;
    this.showEditModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
    this.editPhoto = null;
  }

  savePhotoEdit() {
    if (!this.editPhoto) return;

    this.galleryService.updatePhoto(this.editPhoto.id, {
      title: this.editTitle || undefined,
      description: this.editDescription || undefined,
      category: this.editCategory
    }).subscribe({
      next: () => {
        this.closeEditModal();
        this.loadPhotos();
        Swal.fire({
          icon: 'success',
          title: 'Updated',
          text: 'Photo details updated successfully!',
          timer: 2000,
          showConfirmButton: false
        });
      },
      error: (error) => {
        console.error('Error updating photo:', error);
        Swal.fire({
          icon: 'error',
          title: 'Update Failed',
          text: 'Error updating photo. Please try again.'
        });
      }
    });
  }

  // Delete photo
  deletePhoto(photo: Photo) {
    Swal.fire({
      title: 'Delete Photo?',
      text: 'Are you sure you want to delete this photo? This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.galleryService.deletePhoto(photo.id).subscribe({
          next: () => {
            this.loadPhotos();
            if (this.showPreviewModal) {
              this.closePreview();
            }
            Swal.fire({
              icon: 'success',
              title: 'Deleted',
              text: 'Photo has been deleted.',
              timer: 2000,
              showConfirmButton: false
            });
          },
          error: (error) => {
            console.error('Error deleting photo:', error);
            Swal.fire({
              icon: 'error',
              title: 'Delete Failed',
              text: 'Error deleting photo. Please try again.'
            });
          }
        });
      }
    });
  }

  // Helpers - prefers file-based URLs, falls back to Base64
  getPhotoUrl(photo: Photo): string {
    // Prefer file-based URL for gallery view (fast loading)
    if (photo.thumbnailUrl) {
      return ApiConfig.HUB_URL + photo.thumbnailUrl;
    }
    // Fallback to Base64 for backward compatibility
    return photo.thumbnailData || '';
  }

  getFullImageUrl(photo: Photo): string {
    // Prefer file-based URL for full resolution view
    if (photo.imageUrl) {
      return ApiConfig.HUB_URL + photo.imageUrl;
    }
    // Fallback to Base64 for backward compatibility
    return photo.imageData || photo.thumbnailData || '';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  canEdit(): boolean {
    return this.authService.isAdmin() || this.authService.isTeacher();
  }
  get isParent(): boolean {
    return this.authService.isParent();
  }

  // Pull-to-refresh handler
  onRefresh(): void {
    this.loadPhotos();
    setTimeout(() => {
      this.pullToRefresh?.completeRefresh();
    }, 500);
  }
}
