import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ChildModel } from '../children.interface';
import { ChildrenService } from '../children.service';
import { ParentService } from '../../parent/parent.service';
import { ParentModel } from '../../parent/parent.interface';
import { AuthService } from '../../../core/services/auth';
import { TitlePage, TitleAction, Breadcrumb } from '../../../shared/layouts/title-page/title-page';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';
import { ApiConfig } from '../../../core/config/api.config';
import { ParentChildHeaderComponent } from '../../../shared/components/parent-child-header/parent-child-header.component';
import { Location } from '@angular/common';
import { Html5Qrcode } from 'html5-qrcode';
import { QrCheckinService } from '../../qr-checkin/qr-checkin.service';
import { GeolocationService, GeolocationPosition } from '../../../core/services/geolocation.service';
import { SchoolSettings } from '../../qr-checkin/qr-checkin.interface';

@Component({
  selector: 'app-child-detail',
  imports: [CommonModule, TitlePage, FormsModule, ParentChildHeaderComponent, TranslateModule],
  standalone: true,
  templateUrl: './child-detail.html',
  styleUrl: './child-detail.scss'
})
export class ChildDetail implements OnInit, OnDestroy {
  child: ChildModel | null = null;
  loading = false;
  childId: number = 0;
  showAddParentModal = false;
  availableParents: ParentModel[] = [];
  selectedParentId: number | null = null;
  relationshipType: string = 'Parent';
  isPrimaryContact: boolean = false;
  currentParentIndex: number = 0;

  // QR Scanner properties
  showQrScannerModal = false;
  qrScannerState: 'idle' | 'scanning' | 'processing' | 'success' | 'error' = 'idle';
  html5QrCode: Html5Qrcode | null = null;
  currentPosition: GeolocationPosition | null = null;
  schoolSettings: SchoolSettings | null = null;
  qrScannerError = '';
  qrScannerSuccess = '';
  isWithinGeofence = false;
  distanceToSchool = 0;
  childAttendanceStatus: { isCheckedIn: boolean; isCheckedOut: boolean; checkInTime?: string; checkOutTime?: string } | null = null;
  isLoadingLocation = false;
  locationError = '';

  breadcrumbs: Breadcrumb[] = [];
  get isParent(): boolean {
      return this.authService.isParent();
  }

  get isActive(): boolean {
    return this.child?.isActive ?? true;
  }

  titleActions: TitleAction[] = [];

  constructor(
    private childrenService: ChildrenService,
    private parentService: ParentService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private location: Location,
    private translate: TranslateService,
    private qrService: QrCheckinService,
    private geolocationService: GeolocationService
  ) {}

  ngOnInit() {
    this.childId = Number(this.route.snapshot.paramMap.get('id'));
    this.initBreadcrumbs();
    this.setupTitleActions();
    this.loadChild();

    // Update translations when language changes
    this.translate.onLangChange.subscribe(() => {
      this.initBreadcrumbs();
      this.setupTitleActions();
    });
  }

  private initBreadcrumbs(): void {
    this.breadcrumbs = [
      { label: this.translate.instant('BREADCRUMBS.CHILDREN'), url: '/children' },
      { label: this.translate.instant('CHILD_DETAIL.BREADCRUMB') }
    ];
  }

  back() {
    this.location.back();
  }
  setupTitleActions() {
    this.titleActions = [
      {
        label: this.translate.instant('CHILD_DETAIL.BACK_TO_CHILDREN'),
        class: 'btn-cancel-2',
        icon: 'bi bi-arrow-left',
        action: () => this.goBack()
      }
    ];

    if (this.authService.isAdmin() || this.authService.isTeacher()) {
      this.titleActions.push({
        label: this.translate.instant('CHILD_DETAIL.EDIT_CHILD'),
        class: 'btn-edit-global-2',
        icon: 'bi bi-pencil-square',
        action: () => this.router.navigate(['/children/edit', this.childId])
      });
    }
  }

  loadChild() {
    this.loading = true;
    this.childrenService.getChild(this.childId).subscribe({
      next: (child) => {
        this.child = child;
        console.log('Child loaded:', child);
        console.log('Parent:', child.parent);
        console.log('Parent profilePicture:', child.parent?.profilePicture);
        console.log('ChildParents:', child.childParents);
        this.currentParentIndex = 0;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading child:', error);
        this.loading = false;
        this.router.navigate(['/children']);
      }
    });
  }

  getAge(dateOfBirth: string): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  getProfilePicture(picture: string | undefined | null, defaultPicture: string = 'assets/default-avatar.svg'): string {
    return picture && picture.trim() !== '' ? picture : defaultPicture;
  }

  goBack() {
    this.router.navigate(['/children']);
  }

  openAddParentModal() {
    this.showAddParentModal = true;
    this.loadAvailableParents();
  }

  closeAddParentModal() {
    this.showAddParentModal = false;
    this.selectedParentId = null;
    this.relationshipType = 'Parent';
    this.isPrimaryContact = false;
  }

  loadAvailableParents() {
    this.parentService.loadParents().subscribe({
      next: (parents) => {
        const existingParentIds = this.child?.childParents?.map(cp => cp.parentId) || [];
        this.availableParents = parents.filter(p => !existingParentIds.includes(p.id!));
      },
      error: (error) => console.error('Error loading parents:', error)
    });
  }

  addParentToChild() {
    if (!this.selectedParentId || !this.child?.id) return;

    const payload = {
      childId: this.child.id,
      parentId: this.selectedParentId,
      relationshipType: this.relationshipType,
      isPrimaryContact: this.isPrimaryContact
    };

    this.http.post(`${ApiConfig.ENDPOINTS.CHILDREN}/add-parent`, payload).subscribe({
      next: () => {
        this.closeAddParentModal();
        this.loadChild();
        Swal.fire({
          icon: 'success',
          title: this.translate.instant('MESSAGES.SUCCESS'),
          text: this.translate.instant('CHILD_DETAIL.PARENT_ADDED_SUCCESS'),
          timer: 2000,
          showConfirmButton: false
        });
      },
      error: (error) => {
        console.error('Error adding parent:', error);
        Swal.fire({
          icon: 'error',
          title: this.translate.instant('MESSAGES.ERROR'),
          text: this.translate.instant('CHILD_DETAIL.PARENT_ADD_ERROR')
        });
      }
    });
  }

  removeParent(childParentId: number) {
    Swal.fire({
      title: this.translate.instant('CHILD_DETAIL.CONFIRM_REMOVE_TITLE'),
      text: this.translate.instant('CHILD_DETAIL.CONFIRM_REMOVE_TEXT'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: this.translate.instant('CHILD_DETAIL.YES_REMOVE'),
      cancelButtonText: this.translate.instant('COMMON.CANCEL')
    }).then((result) => {
      if (result.isConfirmed) {
        this.http.delete(`${ApiConfig.ENDPOINTS.CHILDREN}/remove-parent/${childParentId}`).subscribe({
          next: () => {
            this.loadChild();
            Swal.fire({
              icon: 'success',
              title: this.translate.instant('CHILD_DETAIL.REMOVED_TITLE'),
              text: this.translate.instant('CHILD_DETAIL.PARENT_REMOVED_SUCCESS'),
              timer: 2000,
              showConfirmButton: false
            });
          },
          error: (error) => {
            console.error('Error removing parent:', error);
            Swal.fire({
              icon: 'error',
              title: this.translate.instant('MESSAGES.ERROR'),
              text: this.translate.instant('CHILD_DETAIL.PARENT_REMOVE_ERROR')
            });
          }
        });
      }
    });
  }

  viewParentDetails(parentId: number) {
    this.router.navigate(['/parents/detail', parentId]);
  }

  openAddFeeModal() {
    this.router.navigate(['/fees/create'], { queryParams: { childId: this.childId } });
  }

  navigateToParentDetail() {
    if (this.child?.parent?.id) {
      this.router.navigate(['/parents/detail', this.child.parent.id]);
    }
  }

  editChild() {
    this.router.navigate(['/children/edit', this.childId]);
  }

  get currentChildParent() {
    if (!this.child?.childParents || this.child.childParents.length === 0) return null;
    const idx = Math.max(0, Math.min(this.currentParentIndex, this.child.childParents.length - 1));
    return this.child.childParents[idx];
  }

  nextParent() {
    if (!this.child?.childParents || this.child.childParents.length <= 1) return;
    this.currentParentIndex = (this.currentParentIndex + 1) % this.child.childParents.length;
  }

  prevParent() {
    if (!this.child?.childParents || this.child.childParents.length <= 1) return;
    this.currentParentIndex = (this.currentParentIndex - 1 + this.child.childParents.length) % this.child.childParents.length;
  }

  ngOnDestroy(): void {
    this.stopQrScanner();
  }

  // QR Scanner Methods
  openQrScannerModal(): void {
    this.showQrScannerModal = true;
    this.qrScannerState = 'idle';
    this.qrScannerError = '';
    this.qrScannerSuccess = '';
    this.locationError = '';
    this.isLoadingLocation = true;
    this.currentPosition = null;
    this.loadChildAttendanceStatus();
    this.loadSchoolSettings();
  }

  closeQrScannerModal(): void {
    this.stopQrScanner();
    this.showQrScannerModal = false;
    this.qrScannerState = 'idle';
    this.qrScannerError = '';
    this.qrScannerSuccess = '';
  }

  loadChildAttendanceStatus(): void {
    this.http.get<any>(`${ApiConfig.ENDPOINTS.ATTENDANCE}/ChildStatus/${this.childId}`).subscribe({
      next: (status) => {
        this.childAttendanceStatus = status;
      },
      error: () => {
        this.childAttendanceStatus = { isCheckedIn: false, isCheckedOut: false };
      }
    });
  }

  loadSchoolSettings(): void {
    this.qrService.getSchoolSettings().subscribe({
      next: (settings) => {
        this.schoolSettings = settings;
        this.getLocation();
      },
      error: () => {
        this.getLocation();
      }
    });
  }

  getLocation(): void {
    this.isLoadingLocation = true;
    this.locationError = '';
    this.geolocationService.getCurrentPosition().subscribe({
      next: (position) => {
        this.currentPosition = position;
        this.isLoadingLocation = false;
        this.checkGeofence();
      },
      error: (err) => {
        this.isLoadingLocation = false;
        this.locationError = err.message || this.translate.instant('CHILD_DETAIL.QR_LOCATION_ERROR');
      }
    });
  }

  checkGeofence(): void {
    if (!this.currentPosition || !this.schoolSettings) {
      return;
    }

    if (!this.schoolSettings.geofenceEnabled) {
      this.isWithinGeofence = true;
      return;
    }

    this.distanceToSchool = this.geolocationService.calculateDistance(
      this.currentPosition.latitude,
      this.currentPosition.longitude,
      this.schoolSettings.latitude,
      this.schoolSettings.longitude
    );

    this.isWithinGeofence = this.distanceToSchool <= this.schoolSettings.geofenceRadiusMeters;
  }

  async startQrScanner(): Promise<void> {
    if (!this.currentPosition) {
      this.qrScannerError = this.translate.instant('CHILD_DETAIL.QR_ENABLE_LOCATION');
      return;
    }

    if (this.schoolSettings?.geofenceEnabled && !this.isWithinGeofence) {
      this.qrScannerError = this.translate.instant('CHILD_DETAIL.QR_GEOFENCE_ERROR', {
        radius: this.schoolSettings.geofenceRadiusMeters,
        distance: Math.round(this.distanceToSchool)
      });
      return;
    }

    this.qrScannerState = 'scanning';
    this.qrScannerError = '';

    // Wait for DOM element to be rendered
    setTimeout(async () => {
      try {
        const element = document.getElementById('child-qr-reader');
        if (!element) {
          this.qrScannerState = 'error';
          this.qrScannerError = this.translate.instant('CHILD_DETAIL.QR_CAMERA_ERROR');
          return;
        }

        this.html5QrCode = new Html5Qrcode('child-qr-reader');

        await this.html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 }
          },
          (decodedText) => {
            this.onQrCodeScanned(decodedText);
          },
          () => {
            // Ignore scan errors while searching
          }
        );
      } catch (err: any) {
        this.qrScannerState = 'error';
        this.qrScannerError = err.message || this.translate.instant('CHILD_DETAIL.QR_CAMERA_ERROR');
      }
    }, 100);
  }

  async stopQrScanner(): Promise<void> {
    if (this.html5QrCode) {
      try {
        await this.html5QrCode.stop();
        this.html5QrCode.clear();
      } catch (err) {
        // Ignore stop errors
      }
      this.html5QrCode = null;
    }
  }

  async onQrCodeScanned(scannedData: string): Promise<void> {
    if (this.qrScannerState !== 'scanning') return;

    await this.stopQrScanner();
    this.qrScannerState = 'processing';

    // Extract the code from URL if needed (QR codes contain URLs like https://app.miniminds.com/qr-action/MINIMINDS-CHECKIN-xxx)
    let code = scannedData;
    if (scannedData.includes('/qr-action/')) {
      const parts = scannedData.split('/qr-action/');
      code = parts[parts.length - 1];
    }

    // First validate the QR code
    this.qrService.validateQrCode(code).subscribe({
      next: (response) => {
        if (response.isValid) {
          this.processAttendance(code, response.type as 'CheckIn' | 'CheckOut');
        } else {
          this.qrScannerState = 'error';
          this.qrScannerError = response.message || this.translate.instant('CHILD_DETAIL.QR_INVALID');
        }
      },
      error: (err) => {
        this.qrScannerState = 'error';
        this.qrScannerError = err.error?.message || this.translate.instant('CHILD_DETAIL.QR_VALIDATION_ERROR');
      }
    });
  }

  processAttendance(qrCode: string, qrType: 'CheckIn' | 'CheckOut'): void {
    if (!this.currentPosition) {
      this.qrScannerState = 'error';
      this.qrScannerError = this.translate.instant('CHILD_DETAIL.QR_LOCATION_ERROR');
      return;
    }

    // Check if the action is valid for current status
    if (qrType === 'CheckIn' && this.childAttendanceStatus?.isCheckedIn) {
      this.qrScannerState = 'error';
      this.qrScannerError = this.translate.instant('CHILD_DETAIL.QR_ALREADY_CHECKED_IN');
      return;
    }

    if (qrType === 'CheckOut' && (!this.childAttendanceStatus?.isCheckedIn || this.childAttendanceStatus?.isCheckedOut)) {
      this.qrScannerState = 'error';
      this.qrScannerError = this.translate.instant('CHILD_DETAIL.QR_NOT_CHECKED_IN');
      return;
    }

    const request = {
      qrCode: qrCode,
      childIds: [this.childId],
      latitude: this.currentPosition.latitude,
      longitude: this.currentPosition.longitude
    };

    const action$ = qrType === 'CheckIn'
      ? this.qrService.qrCheckIn(request)
      : this.qrService.qrCheckOut(request);

    action$.subscribe({
      next: (result) => {
        if (result.success) {
          this.qrScannerState = 'success';
          this.qrScannerSuccess = qrType === 'CheckIn'
            ? this.translate.instant('CHILD_DETAIL.QR_CHECKIN_SUCCESS', { name: this.child?.firstName })
            : this.translate.instant('CHILD_DETAIL.QR_CHECKOUT_SUCCESS', { name: this.child?.firstName });
          this.loadChildAttendanceStatus();
        } else {
          this.qrScannerState = 'error';
          this.qrScannerError = result.message || this.translate.instant('CHILD_DETAIL.QR_ACTION_FAILED');
        }
      },
      error: (err) => {
        this.qrScannerState = 'error';
        this.qrScannerError = err.error?.message || this.translate.instant('CHILD_DETAIL.QR_ACTION_FAILED');
      }
    });
  }

  getAttendanceStatusText(): string {
    if (!this.childAttendanceStatus) return this.translate.instant('CHILD_DETAIL.QR_STATUS_LOADING');
    if (this.childAttendanceStatus.isCheckedOut) {
      return this.translate.instant('CHILD_DETAIL.QR_STATUS_CHECKED_OUT', { time: this.formatTime(this.childAttendanceStatus.checkOutTime) });
    }
    if (this.childAttendanceStatus.isCheckedIn) {
      return this.translate.instant('CHILD_DETAIL.QR_STATUS_CHECKED_IN', { time: this.formatTime(this.childAttendanceStatus.checkInTime) });
    }
    return this.translate.instant('CHILD_DETAIL.QR_STATUS_NOT_CHECKED_IN');
  }

  formatTime(dateString?: string): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}