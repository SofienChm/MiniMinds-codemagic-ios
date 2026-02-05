import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AttendanceService } from '../attendance.service';
import { Attendance } from '../attendance.interface';
import { TitlePage, TitleAction } from '../../../shared/layouts/title-page/title-page';
import { ChildrenService } from '../../children/children.service';
import { ChildModel } from '../../children/children.interface';
import { Subscription } from 'rxjs';
import { PageTitleService } from '../../../core/services/page-title.service';
import { Html5Qrcode } from 'html5-qrcode';
import { QrCheckinService } from '../../qr-checkin/qr-checkin.service';
import { GeolocationService, GeolocationPosition } from '../../../core/services/geolocation.service';
import { SchoolSettings } from '../../qr-checkin/qr-checkin.interface';
import { QrScannerService } from '../../../core/services/qr-scanner.service';
import { ApiConfig } from '../../../core/config/api.config';

interface ChildAttendanceStatus {
  child: ChildModel;
  attendance?: Attendance;
  isCheckedIn: boolean;
}

@Component({
  selector: 'app-attendance-list',
  imports: [CommonModule, FormsModule, TitlePage, TranslateModule],
  standalone: true,
  templateUrl: './attendance-list.html',
  styleUrl: './attendance-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttendanceList implements OnInit, OnDestroy {
  childrenWithStatus: ChildAttendanceStatus[] = [];
  children: ChildModel[] = [];
  attendances: Attendance[] = [];
  searchTerm = '';
  loading = false;
  private langChangeSub?: Subscription;

  // QR Scanner properties
  showQrScannerModal = false;
  qrScannerState: 'idle' | 'scanning' | 'processing' | 'success' | 'error' | 'getting-location' = 'idle';
  html5QrCode: Html5Qrcode | null = null;
  currentPosition: GeolocationPosition | null = null;
  schoolSettings: SchoolSettings | null = null;
  qrScannerError = '';
  qrScannerSuccess = '';
  isWithinGeofence = false;
  distanceToSchool = 0;
  private locationRetryCount = 0;
  private maxLocationRetries = 3;
  private locationTimeoutId: any = null;

  titleActions: TitleAction[] = [];

  constructor(
    private attendanceService: AttendanceService,
    private childrenService: ChildrenService,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService,
    private pageTitleService: PageTitleService,
    private router: Router,
    private qrService: QrCheckinService,
    private geolocationService: GeolocationService,
    private qrScannerService: QrScannerService,
    private ngZone: NgZone
  ) {
    this.titleActions = [
      {
        label: this.translate.instant('ATTENDANCE_LIST.SCAN_QR'),
        icon: 'bi bi-qr-code-scan',
        class: 'btn-add-global-2',
        action: () => this.scanQrCode()
      }
    ];
  }

  scanQrCode(): void {
    this.openQrScannerModal();
  }

  ngOnInit(): void {
    this.pageTitleService.setTitle(this.translate.instant('ATTENDANCE_LIST.TITLE'));
    this.loadData();

    this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      this.pageTitleService.setTitle(this.translate.instant('ATTENDANCE_LIST.TITLE'));
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.langChangeSub?.unsubscribe();
    this.stopQrScanner();
    if (this.locationTimeoutId) {
      clearTimeout(this.locationTimeoutId);
    }
  }

  loadData(): void {
    this.loading = true;
    this.cdr.detectChanges();

    this.childrenService.loadChildren().subscribe({
      next: (children) => {
        this.children = children;
        this.loadTodayAttendance();
      },
      error: (error) => {
        console.error('Error loading children:', error?.message || error);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadTodayAttendance(): void {
    this.attendanceService.getTodayAttendance().subscribe({
      next: (attendances) => {
        this.attendances = attendances;
        this.buildChildrenWithStatus();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading attendance:', error?.message || error);
        this.buildChildrenWithStatus();
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  buildChildrenWithStatus(): void {
    this.childrenWithStatus = this.children.map(child => {
      const attendance = this.attendances.find(a => a.childId === child.id && !a.checkOutTime);
      return {
        child,
        attendance,
        isCheckedIn: !!attendance
      };
    });
  }

  get filteredChildren(): ChildAttendanceStatus[] {
    if (!this.searchTerm) return this.childrenWithStatus;

    const term = this.searchTerm.toLowerCase();
    return this.childrenWithStatus.filter(item =>
      item.child.firstName.toLowerCase().includes(term) ||
      item.child.lastName.toLowerCase().includes(term)
    );
  }

  checkIn(item: ChildAttendanceStatus): void {
    if (!item.child.id) return;

    this.attendanceService.checkIn(item.child.id).subscribe({
      next: (attendance) => {
        item.attendance = attendance;
        item.isCheckedIn = true;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error checking in:', error?.message || error);
      }
    });
  }

  checkOut(item: ChildAttendanceStatus): void {
    if (!item.attendance) return;

    this.attendanceService.checkOut(item.attendance.id).subscribe({
      next: () => {
        item.isCheckedIn = false;
        item.attendance = undefined;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error checking out:', error?.message || error);
      }
    });
  }

  refresh(): void {
    this.loadData();
  }

  // QR Scanner Methods
  openQrScannerModal(): void {
    this.showQrScannerModal = true;
    this.qrScannerState = 'idle';
    this.qrScannerError = '';
    this.qrScannerSuccess = '';
    this.loadSchoolSettings();
  }

  closeQrScannerModal(): void {
    this.stopQrScanner();
    if (this.locationTimeoutId) {
      clearTimeout(this.locationTimeoutId);
      this.locationTimeoutId = null;
    }
    this.showQrScannerModal = false;
    this.qrScannerState = 'idle';
    this.qrScannerError = '';
    this.qrScannerSuccess = '';
    this.locationRetryCount = 0;
    this.currentPosition = null;
  }

  loadSchoolSettings(): void {
    this.qrService.getSchoolSettings().subscribe({
      next: (settings) => {
        this.schoolSettings = settings;
        if (settings.geofenceEnabled) {
          this.getLocation();
        } else {
          this.isWithinGeofence = true;
          this.currentPosition = { latitude: 0, longitude: 0, accuracy: 0 };
          this.qrScannerState = 'idle';
        }
      },
      error: () => {
        this.isWithinGeofence = true;
        this.currentPosition = { latitude: 0, longitude: 0, accuracy: 0 };
        this.qrScannerState = 'idle';
      }
    });
  }

  getLocation(): void {
    this.qrScannerState = 'getting-location';
    this.qrScannerError = '';
    this.locationRetryCount++;

    if (this.locationTimeoutId) {
      clearTimeout(this.locationTimeoutId);
    }

    this.locationTimeoutId = setTimeout(() => {
      if (this.qrScannerState === 'getting-location') {
        this.qrScannerState = 'idle';
        this.qrScannerError = this.translate.instant('ATTENDANCE_LIST.QR_LOCATION_ERROR');
        this.locationRetryCount = 0;
      }
    }, 12000);

    this.geolocationService.getCurrentPosition({
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 60000
    }).subscribe({
      next: (position) => {
        if (this.locationTimeoutId) {
          clearTimeout(this.locationTimeoutId);
          this.locationTimeoutId = null;
        }
        this.currentPosition = position;
        this.locationRetryCount = 0;
        this.qrScannerState = 'idle';
        this.checkGeofence();
      },
      error: (err) => {
        if (this.locationTimeoutId) {
          clearTimeout(this.locationTimeoutId);
          this.locationTimeoutId = null;
        }
        if (this.locationRetryCount < this.maxLocationRetries) {
          setTimeout(() => this.getLocation(), 1000);
        } else {
          this.qrScannerState = 'idle';
          this.qrScannerError = err.message || this.translate.instant('ATTENDANCE_LIST.QR_LOCATION_ERROR');
          this.locationRetryCount = 0;
        }
      }
    });
  }

  retryLocation(): void {
    this.qrScannerError = '';
    this.getLocation();
  }

  checkGeofence(): void {
    if (!this.currentPosition || !this.schoolSettings) return;
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
      this.qrScannerError = this.translate.instant('ATTENDANCE_LIST.QR_ENABLE_LOCATION');
      return;
    }
    if (this.schoolSettings?.geofenceEnabled && !this.isWithinGeofence) {
      this.qrScannerError = this.translate.instant('ATTENDANCE_LIST.QR_GEOFENCE_ERROR');
      return;
    }
    this.qrScannerError = '';
    if (this.qrScannerService.isNativePlatform()) {
      await this.startNativeScanner();
    } else {
      await this.startWebScanner();
    }
  }

  private async startNativeScanner(): Promise<void> {
    this.qrScannerState = 'scanning';
    try {
      const result = await this.qrScannerService.scanOnce();
      if (result.success && result.code) {
        await this.onQrCodeScanned(result.code);
      } else if (result.error === 'Scan cancelled') {
        this.qrScannerState = 'idle';
      } else {
        this.qrScannerState = 'error';
        this.qrScannerError = result.error || this.translate.instant('ATTENDANCE_LIST.QR_SCAN_FAILED');
      }
    } catch (err: any) {
      this.qrScannerState = 'error';
      this.qrScannerError = err.message || this.translate.instant('ATTENDANCE_LIST.QR_CAMERA_ERROR');
    }
  }

  private async startWebScanner(): Promise<void> {
    this.qrScannerState = 'scanning';
    setTimeout(async () => {
      try {
        const element = document.getElementById('attendance-qr-reader');
        if (!element) {
          this.qrScannerState = 'error';
          this.qrScannerError = this.translate.instant('ATTENDANCE_LIST.QR_CAMERA_ERROR');
          return;
        }
        this.html5QrCode = new Html5Qrcode('attendance-qr-reader');
        await this.html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => this.onQrCodeScanned(decodedText),
          () => {}
        );
      } catch (err: any) {
        this.qrScannerState = 'error';
        this.qrScannerError = err.message || this.translate.instant('ATTENDANCE_LIST.QR_CAMERA_ERROR');
      }
    }, 100);
  }

  async stopQrScanner(): Promise<void> {
    await this.qrScannerService.stopScan();
    if (this.html5QrCode) {
      try {
        await this.html5QrCode.stop();
        this.html5QrCode.clear();
      } catch {}
      this.html5QrCode = null;
    }
  }

  async onQrCodeScanned(scannedValue: string): Promise<void> {
    if (this.qrScannerState !== 'scanning') return;
    await this.stopQrScanner();
    this.qrScannerState = 'processing';

    let code = scannedValue;
    const extractedCode = this.qrScannerService.extractQrCodeFromUrl(scannedValue);
    if (extractedCode) code = extractedCode;

    this.qrService.validateQrCode(code).subscribe({
      next: (response) => {
        this.ngZone.run(() => {
          if (response.isValid) {
            this.qrScannerState = 'success';
            this.qrScannerSuccess = this.translate.instant('ATTENDANCE_LIST.QR_SUCCESS');
            this.loadData();
            this.cdr.detectChanges();
          } else {
            this.qrScannerState = 'error';
            this.qrScannerError = response.message || this.translate.instant('ATTENDANCE_LIST.QR_INVALID');
            this.cdr.detectChanges();
          }
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.qrScannerState = 'error';
          this.qrScannerError = err.error?.message || this.translate.instant('ATTENDANCE_LIST.QR_VALIDATION_ERROR');
          this.cdr.detectChanges();
        });
      }
    });
  }

  /**
   * Get the profile picture URL for a child, preferring file-based URL over Base64
   */
  getChildProfilePictureUrl(child: ChildModel | any | null | undefined, defaultPicture: string = 'assets/child.png'): string {
    if (!child) return defaultPicture;
    if (child.profilePictureUrl && child.profilePictureUrl.trim() !== '') {
      return this.getFullUrl(child.profilePictureUrl);
    }
    if (child.profilePicture && child.profilePicture.trim() !== '') {
      return child.profilePicture;
    }
    return defaultPicture;
  }

  /**
   * Convert a relative path to a full URL with the API base
   */
  private getFullUrl(path: string): string {
    if (!path) return '';
    // If it's already an absolute URL or data URI, return as-is
    if (path.startsWith('http') || path.startsWith('data:')) {
      return path;
    }
    // Prepend the API base URL
    return `${ApiConfig.HUB_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  }
}
