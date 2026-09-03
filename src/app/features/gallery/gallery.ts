import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import Swiper from 'swiper/bundle';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
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
import { showSuccessToast } from '../../shared/utils/swal.util';
import { ParentChildHeaderSimpleComponent } from '../../shared/components/parent-child-header-simple/parent-child-header-simple.component';
import { Capacitor } from '@capacitor/core';
import { PullToRefreshComponent } from '../../shared/components/pull-to-refresh/pull-to-refresh.component';
import { ImageDownloadService } from '../../core/services/image-download.service';
import { SkeletonPhotoGridComponent } from '../../shared/components/skeleton/skeleton-photo-grid.component';
import { SimpleToastService } from '../../core/services/simple-toast.service';

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
    SkeletonPhotoGridComponent,
    NgSelectModule
  ],
  templateUrl: './gallery.html',
  styleUrl: './gallery.scss'
})
export class Gallery implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;
  @ViewChild('nativeCameraInput') nativeCameraInput!: ElementRef<HTMLInputElement>;
  @ViewChild('pullToRefresh') pullToRefresh!: PullToRefreshComponent;
  @ViewChild('swiperContainer', { static: false }) swiperContainer!: ElementRef<HTMLDivElement>;

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
  previewIndex = 0;
  private previewSwiper: any = null;

  // Tag people modal
  showTagModal = false;
  tagPhoto: Photo | null = null;
  tagChildIds: number[] = [];
  tagSaving = false;

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
    private imageDownloadService: ImageDownloadService,
    private simpleToastService: SimpleToastService
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
    this.destroyPreviewSwiper();
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
          title: this.translate.instant('GALLERY.ERROR'),
          text: this.translate.instant('GALLERY.FAILED_TO_LOAD_CHILDREN')
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
          title: this.translate.instant('GALLERY.ERROR'),
          text: this.translate.instant('GALLERY.FAILED_TO_LOAD_PHOTOS')
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
    if (this.uploadFiles.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: this.translate.instant('GALLERY.MISSING_INFO'),
        text: this.translate.instant('GALLERY.SELECT_AT_LEAST_ONE_PHOTO')
      });
      return;
    }

    this.uploading = true;

    if (this.uploadFiles.length === 1) {
      // Single file upload
      this.galleryService.uploadPhoto(
        this.uploadFiles[0],
        this.uploadChildId || undefined,
        this.uploadTitle || undefined,
        this.uploadDescription || undefined,
        this.uploadCategory
      ).subscribe({
        next: () => {
          this.uploading = false;
          this.closeUploadModal();
          this.loadPhotos();
          this.simpleToastService.success(this.translate.instant('GALLERY.SUCCESS'));
        },
        error: (error) => {
          console.error('Error uploading photo:', error);
          this.uploading = false;
          this.simpleToastService.error(this.translate.instant('GALLERY.UPLOAD_PHOTO_ERROR'));
        }
      });
    } else {
      // Multiple files upload
      this.galleryService.uploadMultiplePhotos(
        this.uploadFiles,
        this.uploadChildId || undefined,
        this.uploadCategory,
        this.uploadDescription || undefined
      ).subscribe({
        next: (response) => {
          this.uploading = false;
          this.closeUploadModal();
          this.loadPhotos();
          if (response.errors && response.errors.length > 0) {
            this.simpleToastService.warning(
              `${this.translate.instant('GALLERY.UPLOADED_PHOTOS_COUNT', { count: response.uploaded.length })} — ${this.translate.instant('GALLERY.ERRORS')}: ${response.errors.join(', ')}`
            );
          } else {
            this.simpleToastService.success(this.translate.instant('GALLERY.SUCCESS'));
          }
        },
        error: (error) => {
          console.error('Error uploading photos:', error);
          this.uploading = false;
          this.simpleToastService.error(this.translate.instant('GALLERY.UPLOAD_PHOTOS_ERROR'));
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
        title: this.translate.instant('GALLERY.SECURE_CONNECTION_REQUIRED'),
        html: this.translate.instant('GALLERY.SECURE_CONNECTION_DETAILS'),
      });
      return;
    }

    // Check if camera API is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      Swal.fire({
        icon: 'error',
        title: this.translate.instant('GALLERY.CAMERA_NOT_SUPPORTED'),
        text: this.translate.instant('GALLERY.CAMERA_NOT_SUPPORTED_DETAILS')
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
      let errorMessage = this.translate.instant('GALLERY.CAMERA_COULD_NOT_ACCESS');
      let errorTitle = this.translate.instant('GALLERY.CAMERA_ERROR');

      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorTitle = this.translate.instant('GALLERY.CAMERA_PERMISSION_DENIED');
        errorMessage = this.translate.instant('GALLERY.CAMERA_PERMISSION_DENIED_DETAILS');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = this.translate.instant('GALLERY.CAMERA_NOT_FOUND');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = this.translate.instant('GALLERY.CAMERA_IN_USE');
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = this.translate.instant('GALLERY.CAMERA_SETTINGS_NOT_SUPPORTED');
      } else if (error.name === 'SecurityError') {
        errorMessage = this.translate.instant('GALLERY.CAMERA_SECURITY_BLOCKED');
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
    if (!this.capturedImage) {
      Swal.fire({
        icon: 'warning',
        title: this.translate.instant('GALLERY.MISSING_INFO'),
        text: this.translate.instant('GALLERY.CAPTURE_A_PHOTO')
      });
      return;
    }

    this.uploading = true;

    try {
      // Convert base64 to blob with compression
      const file = await this.base64ToCompressedFile(this.capturedImage);

      this.galleryService.uploadPhoto(
        file,
        this.cameraChildId || undefined,
        this.cameraTitle || undefined,
        this.cameraDescription || undefined,
        this.cameraCategory
      ).subscribe({
        next: () => {
          this.uploading = false;
          this.closeCameraModal();
          this.loadPhotos();
          showSuccessToast(this.translate.instant('GALLERY.SUCCESS'));
        },
        error: (error) => {
          console.error('Error saving captured photo:', error);
          this.uploading = false;
          Swal.fire({
            icon: 'error',
            title: this.translate.instant('GALLERY.SAVE_FAILED'),
            text: this.translate.instant('GALLERY.SAVE_PHOTO_ERROR')
          });
        }
      });
    } catch (error) {
      console.error('Error processing photo:', error);
      this.uploading = false;
      Swal.fire({
        icon: 'error',
        title: this.translate.instant('GALLERY.PROCESSING_ERROR'),
        text: this.translate.instant('GALLERY.PROCESSING_PHOTO_ERROR')
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

  // Preview modal - no full-resolution fetch needed (full file URLs are already loaded)
  openPreview(index: number) {
    if (!this.photos[index]) return;
    this.previewIndex = index;
    this.selectedPhoto = this.photos[index];
    this.showPreviewModal = true;

    // Images load directly from their file URLs (available in the loaded photos list),
    // so there is no extra per-image API call and no large response payload.
    this.loadingFullImage = false;
    this.previewSwiper = null;

    // Wait for the viewer DOM (swiper) to render before initializing.
    this.initPreviewSwiper();
  }

  private initPreviewSwiper() {
    if (this.previewSwiper) return;

    // The viewer mounts asynchronously (it's behind an *ngIf), so wait until the
    // container exists and has a real size before initializing the carousel.
    const container = this.swiperContainer?.nativeElement;
    if (!container || !this.showPreviewModal || container.clientHeight === 0) {
      setTimeout(() => this.initPreviewSwiper(), 30);
      return;
    }
    if (this.photos.length === 0) return;

    this.previewSwiper = new Swiper(container, {
      initialSlide: this.previewIndex,
      direction: 'horizontal',
      slidesPerView: 1,
      loop: false,
      spaceBetween: 0,
      speed: 250,
      // Native lazy image loading with adjacent-slide preload. Only images near the
      // active slide load, keeping the DOM light and avoiding large simultaneous fetches.
      lazyPreload: true,
      watchSlidesProgress: true,
      on: {
        init: () => {
          // Re-measure once layout settles so slides get their real dimensions.
          setTimeout(() => this.previewSwiper?.update(), 50);
        },
        slideChange: (swiper: any) => {
          const realIndex = swiper.realIndex ?? swiper.activeIndex;
          if (this.photos[realIndex]) {
            this.selectedPhoto = this.photos[realIndex];
            this.previewIndex = realIndex;
          }
        }
      }
    });
  }

  private destroyPreviewSwiper() {
    if (this.previewSwiper) {
      this.previewSwiper.destroy(true, true);
      this.previewSwiper = null;
    }
  }

  closePreview() {
    this.showPreviewModal = false;
    this.selectedPhoto = null;
    this.destroyPreviewSwiper();
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
        // Use SimpleToastService for better mobile visibility
        this.simpleToastService.success(
          this.imageDownloadService.isNativePlatform()
            ? this.translate.instant('GALLERY.IMAGE_SAVED_TO_GALLERY')
            : this.translate.instant('GALLERY.IMAGE_DOWNLOADED')
        );
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
        showSuccessToast(this.translate.instant('GALLERY.SUCCESS'));
      },
      error: (error) => {
        console.error('Error updating photo:', error);
        Swal.fire({
          icon: 'error',
          title: this.translate.instant('GALLERY.UPDATE_FAILED'),
          text: this.translate.instant('GALLERY.UPDATE_PHOTO_ERROR')
        });
      }
    });
  }

  // Tag people
  openTagModal(photo: Photo) {
    this.tagPhoto = photo;
    this.tagSaving = false;
    this.tagChildIds = (photo.taggedChildren || []).map(t => t.childId);
    this.showTagModal = true;

    // Refresh tags from server to ensure accuracy
    this.galleryService.getPhotoTags(photo.id).subscribe({
      next: (tags) => {
        this.tagChildIds = tags.map(t => t.childId);
      },
      error: (error) => console.error('Error loading photo tags:', error)
    });
  }

  closeTagModal() {
    this.showTagModal = false;
    this.tagPhoto = null;
    this.tagChildIds = [];
  }

  saveTags() {
    if (!this.tagPhoto) return;

    const photoId = this.tagPhoto.id;
    const childIds = this.tagChildIds;

    this.tagSaving = true;
    this.galleryService.setPhotoTags(photoId, childIds).subscribe({
      next: () => {
        this.tagSaving = false;
        this.closeTagModal();
        this.loadPhotos();
        if (this.selectedPhoto && this.selectedPhoto.id === photoId) {
          this.selectedPhoto.taggedChildren = childIds.map(id => {
            const child = this.children.find(c => c.id === id);
            return { childId: id, firstName: child?.firstName, lastName: child?.lastName };
          });
        }
        showSuccessToast(this.translate.instant('GALLERY.SUCCESS'));
      },
      error: (error) => {
        console.error('Error saving tags:', error);
        this.tagSaving = false;
        Swal.fire({
          icon: 'error',
          title: this.translate.instant('GALLERY.UPDATE_FAILED'),
          text: this.translate.instant('GALLERY.UPDATE_TAGS_ERROR')
        });
      }
    });
  }

  getTaggedNames(photo: Photo): string {
    const tags = photo.taggedChildren || [];
    if (tags.length > 0) {
      return tags.map(t => `${t.firstName || ''} ${t.lastName || ''}`.trim()).filter(Boolean).join(', ');
    }
    return photo.childName || '';
  }

  hasTaggedPeople(photo: Photo): boolean {
    return (photo.taggedChildren && photo.taggedChildren.length > 0) || !!photo.childName;
  }

  // Delete photo
  deletePhoto(photo: Photo) {
    Swal.fire({
      title: this.translate.instant('GALLERY.DELETE_CONFIRM_TITLE'),
      text: this.translate.instant('GALLERY.DELETE_CONFIRM_TEXT'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: this.translate.instant('GALLERY.YES_DELETE'),
      cancelButtonText: this.translate.instant('GALLERY.CANCEL')
    }).then((result) => {
      if (result.isConfirmed) {
        this.galleryService.deletePhoto(photo.id).subscribe({
          next: () => {
            this.loadPhotos();
            if (this.showPreviewModal) {
              this.closePreview();
            }
            showSuccessToast(this.translate.instant('GALLERY.SUCCESS'));
          },
          error: (error) => {
            console.error('Error deleting photo:', error);
            Swal.fire({
              icon: 'error',
              title: this.translate.instant('GALLERY.DELETE_FAILED'),
              text: this.translate.instant('GALLERY.DELETE_PHOTO_ERROR')
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
