import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ScrollingModule, CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
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
    NgSelectModule,
    ScrollingModule
  ],
  templateUrl: './gallery.html',
  styleUrl: './gallery.scss'
})
export class Gallery implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;
  @ViewChild('nativeCameraInput') nativeCameraInput!: ElementRef<HTMLInputElement>;
  @ViewChild('pullToRefresh') pullToRefresh!: PullToRefreshComponent;
  @ViewChild('lightbox') lightboxEl!: ElementRef<HTMLDivElement>;
  @ViewChild('parentGridHost') parentGridHost!: ElementRef<HTMLDivElement>;
  @ViewChild('adminGridHost') adminGridHost!: ElementRef<HTMLDivElement>;
  @ViewChild(CdkVirtualScrollViewport) virtualScroll!: CdkVirtualScrollViewport;

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
  loadingMore = false;

  // Virtual-grid state (CDK virtual scroll over rows of square tiles)
  gridRows: Photo[][] = [];
  gridColumns = 3;
  rowHeight = 1;
  cellWidth = 1;
  gridGap = 2;
  private readonly adminCardInfoHeight = 160;
  private resizeObserver?: ResizeObserver;
  private measureRetries = 0;
  private measurePoll?: ReturnType<typeof setInterval>;

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
  private imgLoadTimer?: ReturnType<typeof setTimeout>;

  breadcrumbs: Breadcrumb[] = [];
  titleActions: TitleAction[] = [];
  private langChangeSub?: Subscription;

  // Download state
  downloadingImage = false;

  // Lightbox swipe gesture state
  private touchStartX = 0;
  private touchStartY = 0;
  private readonly swipeThreshold = 50;

  // Lightbox pin zoom state (1 = fit, up to 3 = max)
  zoomScale = 1;
  zoomOriginX = 50;
  zoomOriginY = 50;
  panX = 0;
  panY = 0;
  private touchMode: 'none' | 'pan' | 'pinch' = 'none';
  private pinchStartDistance = 0;
  private pinchStartScale = 1;
  private panStartX = 0;
  private panStartY = 0;
  private lastTapTime = 0;

  constructor(
    private elementRef: ElementRef<HTMLElement>,
    private galleryService: GalleryService,
    private childrenService: ChildrenService,
    private authService: AuthService,
    private router: Router,
    public permissions: PermissionService,
    private translate: TranslateService,
    private pageTitleService: PageTitleService,
    private imageDownloadService: ImageDownloadService,
    private simpleToastService: SimpleToastService,
    private ngZone: NgZone
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

  ngAfterViewInit() {
    this.setupGridObserver();
    // First measure immediately: the container exists here, so geometry is
    // resolved before photos arrive (never starts from 1px defaults).
    this.applyGridMetricsOnActiveHost();
    this.startMeasurePoll();
  }

  ngOnDestroy() {
    this.langChangeSub?.unsubscribe();
    this.stopCamera();
    this.resizeObserver?.disconnect();
    if (this.measurePoll) clearInterval(this.measurePoll);
    if (this.imgLoadTimer) clearTimeout(this.imgLoadTimer);
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
        this.loadingMore = false;
        this.rebuildGridRows();
        this.frame(() => {
          this.applyGridMetricsOnActiveHost();
          this.setupGridObserver();
          this.fillViewportIfShort();
        });
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
    this.frame(() => this.setupGridObserver());
  }

  // Infinite scroll - appends the next page when the virtual grid nears its end.
  loadMorePhotos() {
    if (this.loading || this.loadingMore || this.currentPage >= this.totalPages) return;

    this.loadingMore = true;
    this.galleryService.getPhotos(
      this.currentPage + 1,
      this.pageSize,
      this.selectedChildId || undefined,
      this.selectedCategory || undefined
    ).subscribe({
      next: (response: PhotosResponse) => {
        this.photos = [...this.photos, ...response.data];
        this.currentPage = response.page;
        this.totalCount = response.totalCount;
        this.totalPages = response.totalPages;
        this.loadingMore = false;
        const start = this.gridRows.length;
        this.rebuildGridRows();
        // Keep pulling pages until the viewport is filled if they fit on screen.
        this.frame(() => {
          this.applyGridMetricsOnActiveHost();
          this.fillViewportIfShort();
        });
      },
      error: (error) => {
        console.error('Error loading more photos:', error);
        this.loadingMore = false;
      }
    });
  }

  // Re-derives the row-based view model from the flat photos array.
  private rebuildGridRows(): void {
    const cols = this.gridColumns;
    const rows: Photo[][] = [];
    for (let i = 0; i < this.photos.length; i += cols) {
      rows.push(this.photos.slice(i, i + cols));
    }
    this.gridRows = rows;
  }

  photoIndex(rowIdx: number, colIdx: number): number {
    return rowIdx * this.gridColumns + colIdx;
  }

  trackRow(index: number): number {
    return index;
  }

  // CDK fires this with the first visible row index as the user scrolls.
  onGridScroll(rowIndex: number): void {
    if (rowIndex >= this.gridRows.length - 3) {
      this.loadMorePhotos();
    }
  }

  // List (admin) view infinite scroll - plain scroll-listener near the end.
  onListScroll(event: Event): void {
    const el = event.target as HTMLElement;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 300) {
      this.loadMorePhotos();
    }
  }

  // If the loaded rows still fit inside the viewport, fetch the next page.
  private fillViewportIfShort(): void {
    if (!this.virtualScroll) return;
    if (this.virtualScroll.measureScrollOffset('bottom') <= 0) {
      this.loadMorePhotos();
    }
  }

  // Virtual-grid geometry: prefer the real grid host (exact tile-box width) and
  // fall back to the always-present page container, then re-measure on any
  // resize/orientation change so CDK's fixed itemSize stays in sync with CSS.
  private setupGridObserver(): void {
    if (typeof ResizeObserver === 'undefined') return;
    if (!this.resizeObserver) {
      // Run the measure inside the zone so the gridRows/cellWidth updates
      // always trigger change detection and re-render with real sizes.
      this.resizeObserver = new ResizeObserver(() => {
        this.ngZone.run(() => this.applyGridMetricsOnActiveHost());
      });
    }
    this.resizeObserver.disconnect();
    const target = this.measureTarget();
    if (target) this.resizeObserver.observe(target.el);
  }

  // Returns the element whose width determines the tile size.
  // Parent view: .ios-grid-scroll (grid host) or .ios-gallery-container (shell).
  // Admin view:  .admin-grid-scroll (grid host) or .gallery-admin-shell (shell).
  // Grid hosts give the exact content width; shells need no measurement dance
  // and exist before any photo renders, so either source always resolves.
  private measureTarget(): { el: HTMLElement; isParent: boolean; isShell: boolean } | null {
    if (this.isParent) {
      const host = this.parentGridHost?.nativeElement;
      if (host?.isConnected) return { el: host, isParent: true, isShell: false };
      const el = this.elementRef.nativeElement.querySelector<HTMLElement>('.ios-gallery-container')
        ?? document.querySelector<HTMLElement>('app-gallery .ios-gallery-container');
      return el ? { el, isParent: true, isShell: true } : null;
    }
    const host = this.adminGridHost?.nativeElement;
    if (host?.isConnected) return { el: host, isParent: false, isShell: false };
    const el = this.elementRef.nativeElement.querySelector<HTMLElement>('.gallery-admin-shell')
      ?? document.querySelector<HTMLElement>('app-gallery .gallery-admin-shell');
    return el ? { el, isParent: false, isShell: true } : null;
  }

  private applyGridMetrics(target: { el: HTMLElement; isParent: boolean; isShell: boolean }): void {
    const { el: host, isParent } = target;
    if (!host.isConnected) return;

    // Shells are Bootstrap containers with 12px gutters on each side; the grid
    // hosts themselves already have their exact content-box width.
    const rawWidth = host.getBoundingClientRect().width;
    const width = target.isParent
      ? rawWidth
      : target.isShell
        ? Math.max(1, rawWidth - 24)
        : rawWidth;
    // Not laid out yet. Retry on the next frame instead of silently keeping the
    // 1px defaults (which renders dot-sized tiles).
    if (!width || width < 40) {
      if (this.measureRetries < 12) {
        this.measureRetries++;
        this.frame(() => this.applyGridMetrics(target));
      } else {
        console.warn('[gallery] measure stuck: container never laid out', width);
      }
      return;
    }
    this.measureRetries = 0;

    const gap = target.isParent
      ? (width >= 1024 ? 4 : width >= 768 ? 3 : 2)
      : 24;
    const cols = this.computeGridColumns(target.isParent, width);

    this.gridColumns = cols;
    this.gridGap = gap;
    this.cellWidth = Math.max(1, Math.floor((width - gap * (cols - 1)) / cols));
    // Parent rows are square tiles; admin rows add a fixed card caption block.
    this.rowHeight = target.isParent
      ? this.cellWidth
      : this.cellWidth + this.adminCardInfoHeight + gap;

    console.log(`[gallery] measured ${Math.round(width)}px (${target.isParent ? 'parent' : 'admin'}) -> ${cols} cols, cell ${this.cellWidth}px`);

    this.rebuildGridRows();

    this.frame(() => {
      this.virtualScroll?.checkViewportSize();
      this.fillViewportIfShort();
    });
  }

  private computeGridColumns(isParentHost: boolean, width: number): number {
    if (isParentHost) {
      if (width >= 1024) return 5;
      if (width >= 768) return 4;
      return 3;
    }
    if (width >= 1140) return 4;
    if (width >= 900) return 3;
    if (width >= 660) return 2;
    return 1;
  }

  private frame(fn: () => void): void {
    setTimeout(() => this.ngZone.run(fn), 0);
  }

  // Measure whichever target is currently rendered (parent or admin).
  private applyGridMetricsOnActiveHost(): void {
    const target = this.measureTarget();
    if (target) this.applyGridMetrics(target);
  }

  // Safety net: if for any reason the frame/observer measurements never land
  // (animations, deferred render, edge-case query misses), poll a few times so
  // the grid always converges to real sizes instead of sitting at 1px dots.
  private startMeasurePoll(): void {
    if (this.measurePoll) return;
    let ticks = 0;
    this.measurePoll = setInterval(() => {
      ticks++;
      if (this.cellWidth > 40 || ticks > 40) {
        clearInterval(this.measurePoll!);
        this.measurePoll = undefined;
        return;
      }
      this.ngZone.run(() => this.applyGridMetricsOnActiveHost());
    }, 250);
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

  // Full-screen gallery lightbox.
  // Only the current photo is rendered (plus a windowed neighbor track for smooth swipes);
  // adjacent full-res images are prefetched in the background so navigation is instant.
  openPreview(index: number) {
    if (!this.photos[index]) return;
    this.previewIndex = index;
    this.selectedPhoto = this.photos[index];
    this.showPreviewModal = true;
    this.loadingFullImage = true;
    this.armImageLoadFallback();
    this.resetZoom();
    this.prefetchNeighbors();

    // Lock background scroll while the viewer is open.
    document.body.style.overflow = 'hidden';

    // Focus the lightbox so keyboard navigation (arrows/escape) works immediately.
    setTimeout(() => this.lightboxEl?.nativeElement?.focus(), 0);
  }

  // Simple carousel navigation (no external dependency)
  private selectPreview(index: number) {
    if (index < 0 || index >= this.photos.length) return;
    this.previewIndex = index;
    this.selectedPhoto = this.photos[index];
    this.loadingFullImage = true;
    this.armImageLoadFallback();
    this.resetZoom();
    this.prefetchNeighbors();
  }

  previewPrev() {
    this.selectPreview(this.previewIndex - 1);
  }

  previewNext() {
    this.selectPreview(this.previewIndex + 1);
  }

  closePreview() {
    this.showPreviewModal = false;
    this.selectedPhoto = null;
    this.resetZoom();
    document.body.style.overflow = '';
  }

  onImageLoaded(offset: number) {
    // Only clear the spinner when the currently-viewed image finishes loading.
    if (offset === this.previewIndex) {
      this.loadingFullImage = false;
    }
  }

  onImageError(offset: number) {
    // A broken/slow image must never trap the viewer on the spinner.
    if (offset === this.previewIndex) {
      this.loadingFullImage = false;
    }
  }

  // If the full image doesn't fire `load` (broken URL, hung response, cache
  // quirk), drop the spinner after 6s rather than leaving the viewer stuck.
  private armImageLoadFallback(): void {
    if (this.imgLoadTimer) clearTimeout(this.imgLoadTimer);
    this.imgLoadTimer = setTimeout(() => {
      this.loadingFullImage = false;
    }, 1000);
  }

  // Render only a window of 3 slides (prev/current/next) to keep DOM & memory low.
  get visibleSlides(): { photo: Photo; offset: number }[] {
    const slides: { photo: Photo; offset: number }[] = [];
    for (let i = this.previewIndex - 1; i <= this.previewIndex + 1; i++) {
      if (i >= 0 && i < this.photos.length) {
        slides.push({ photo: this.photos[i], offset: i });
      }
    }
    return slides;
  }

  trackSlide(index: number, slide: { photo: Photo; offset: number }): number {
    return slide.offset;
  }

  // Preload the adjacent full-res images so swiping feels instant.
  private prefetchNeighbors() {
    [this.previewIndex - 1, this.previewIndex + 1].forEach(i => {
      const photo = this.photos[i];
      if (!photo || !photo.imageUrl) return;
      const img = new Image();
      img.src = this.resolveImageUrl(photo.imageUrl);
    });
  }

  // Return the CSS transform for the currently viewed image (unzoomed = none).
  getViewerTransform(): string {
    if (this.zoomScale <= 1 && this.panX === 0 && this.panY === 0) return '';
    return `translate(${this.panX}px, ${this.panY}px) scale(${this.zoomScale})`;
  }

  private resetZoom() {
    this.zoomScale = 1;
    this.zoomOriginX = 50;
    this.zoomOriginY = 50;
    this.panX = 0;
    this.panY = 0;
    this.touchMode = 'none';
  }

  private touchDistance(event: TouchEvent): number {
    const a = event.touches[0];
    const b = event.touches[1];
    return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
  }

  // Unified touch handling: pinch-to-zoom, one-finger pan when zoomed,
  // swipe navigation when unzoomed, and double-tap zoom.
  onViewerTouchStart(event: TouchEvent) {
    if (event.touches.length === 2) {
      this.touchMode = 'pinch';
      this.pinchStartDistance = this.touchDistance(event);
      this.pinchStartScale = this.zoomScale;
      return;
    }
    if (event.touches.length === 1) {
      this.touchMode = 'pan';
      const t = event.touches[0];
      this.touchStartX = t.clientX;
      this.touchStartY = t.clientY;
      this.panStartX = this.panX;
      this.panStartY = this.panY;
    }
  }

  onViewerTouchMove(event: TouchEvent) {
    if (this.touchMode === 'pinch' && event.touches.length >= 2) {
      event.preventDefault();
      const dist = this.touchDistance(event);
      this.zoomScale = Math.min(3, Math.max(1, this.pinchStartScale * (dist / this.pinchStartDistance)));
      return;
    }
    if (this.touchMode === 'pan' && this.zoomScale > 1 && event.touches.length === 1) {
      event.preventDefault();
      const t = event.touches[0];
      this.panX = this.panStartX + (t.clientX - this.touchStartX);
      this.panY = this.panStartY + (t.clientY - this.touchStartY);
    }
  }

  onViewerTouchEnd(event: TouchEvent) {
    if (this.touchMode === 'pinch') {
      this.touchMode = 'none';
      if (this.zoomScale <= 1) this.resetZoom();
      return;
    }

    // Detect double-tap before swipe logic so a quick tap never triggers navigation.
    const t = event.changedTouches[0];
    const now = Date.now();
    const isTap = t && Math.hypot(t.clientX - this.touchStartX, t.clientY - this.touchStartY) < 10;

    if (isTap && now - this.lastTapTime < 300) {
      this.lastTapTime = 0;
      this.toggleZoomAt(t);
      this.touchMode = 'none';
      return;
    }
    if (isTap) {
      this.lastTapTime = now;
    } else {
      this.lastTapTime = 0;
    }

    if (this.zoomScale > 1) {
      // Pan ends here; never swipe-navigate while zoomed.
      this.touchMode = 'none';
      return;
    }

    // Unzoomed: horizontal swipe navigation.
    const deltaX = t.clientX - this.touchStartX;
    const deltaY = t.clientY - this.touchStartY;
    if (Math.abs(deltaX) < this.swipeThreshold || Math.abs(deltaX) < Math.abs(deltaY)) {
      this.touchMode = 'none';
      return;
    }
    if (deltaX < 0) {
      this.previewNext();
    } else {
      this.previewPrev();
    }
    this.touchMode = 'none';
  }

  private toggleZoomAt(t: Touch) {
    if (this.zoomScale > 1) {
      this.resetZoom();
      return;
    }
    this.zoomScale = 2.5;
    this.zoomOriginX = (t.clientX / window.innerWidth) * 100;
    this.zoomOriginY = (t.clientY / window.innerHeight) * 100;
    this.panX = 0;
    this.panY = 0;
  }

  // Keyboard navigation (arrows + escape).
  onLightboxKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowLeft') {
      this.previewPrev();
    } else if (event.key === 'ArrowRight') {
      this.previewNext();
    } else if (event.key === 'Escape') {
      this.closePreview();
    }
  }

  /**
   * Download/save the currently selected photo
   */
  async downloadPhoto(): Promise<void> {
    if (!this.selectedPhoto || this.downloadingImage) return;

    // Prefer file-based URL, fallback to Base64
    const imageUrl = this.selectedPhoto.imageUrl
      ? this.resolveImageUrl(this.selectedPhoto.imageUrl)
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
      return this.resolveImageUrl(photo.thumbnailUrl);
    }
    // Fallback to Base64 for backward compatibility
    return photo.thumbnailData || '';
  }

  getFullImageUrl(photo: Photo): string {
    // Prefer file-based URL for full resolution view
    if (photo.imageUrl) {
      return this.resolveImageUrl(photo.imageUrl);
    }
    // Fallback to Base64 for backward compatibility
    return photo.imageData || photo.thumbnailData || '';
  }

  // Absolute URLs (e.g. R2 presigned URLs) are used as-is; relative paths get the API host prefix.
  private resolveImageUrl(url: string): string {
    return /^https?:\/\//i.test(url) ? url : ApiConfig.HUB_URL + url;
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
