import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Html5Qrcode } from 'html5-qrcode';
import { QrCheckinService } from './qr-checkin.service';
import { GeolocationService, GeolocationPosition } from '../../core/services/geolocation.service';
import { AuthService } from '../../core/services/auth';
import { TitlePage } from '../../shared/layouts/title-page/title-page';
import {
  ChildAttendanceStatus,
  QrValidationResponse,
  SchoolSettings,
  QrAttendanceResult
} from './qr-checkin.interface';

type ScanState = 'idle' | 'scanning' | 'validating' | 'selecting' | 'processing' | 'success' | 'error';

@Component({
  selector: 'app-qr-checkin',
  standalone: true,
  imports: [CommonModule, FormsModule, TitlePage],
  templateUrl: './qr-checkin.html',
  styleUrl: './qr-checkin.scss'
})
export class QrCheckin implements OnInit, OnDestroy, AfterViewInit {
  // State
  state: ScanState = 'idle';
  errorMessage = '';
  successMessage = '';

  // Location
  currentPosition: GeolocationPosition | null = null;
  schoolSettings: SchoolSettings | null = null;
  locationError = '';
  isWithinGeofence = false;
  distanceToSchool = 0;

  // QR Scanner
  html5QrCode: Html5Qrcode | null = null;
  scannedCode = '';
  qrType: 'CheckIn' | 'CheckOut' | '' = '';

  // Children
  children: ChildAttendanceStatus[] = [];
  selectedChildIds: number[] = [];

  // Result
  result: QrAttendanceResult | null = null;

  constructor(
    private qrService: QrCheckinService,
    private geolocationService: GeolocationService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.authService.isParent()) {
      this.router.navigate(['/dashboard']);
      return;
    }
    this.loadInitialData();
  }

  ngAfterViewInit(): void {
    // Scanner will be initialized when user clicks start
  }

  ngOnDestroy(): void {
    this.stopScanner();
  }

  async loadInitialData(): Promise<void> {
    // Load school settings for geofence
    this.qrService.getSchoolSettings().subscribe({
      next: (settings) => {
        this.schoolSettings = settings;
        this.getLocation();
      },
      error: () => {
        this.getLocation();
      }
    });

    // Load children status
    this.loadChildrenStatus();
  }

  loadChildrenStatus(): void {
    this.qrService.getMyChildrenStatus().subscribe({
      next: (children) => {
        this.children = children;
      },
      error: (err) => {
        console.error('Failed to load children status:', err);
      }
    });
  }

  getLocation(): void {
    this.locationError = '';
    this.geolocationService.getCurrentPosition().subscribe({
      next: (position) => {
        this.currentPosition = position;
        this.checkGeofence();
      },
      error: (err) => {
        this.locationError = err.message;
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

  async startScanner(): Promise<void> {
    if (!this.currentPosition) {
      this.errorMessage = 'Please enable location access to continue';
      return;
    }

    if (this.schoolSettings?.geofenceEnabled && !this.isWithinGeofence) {
      this.errorMessage = `You must be within ${this.schoolSettings.geofenceRadiusMeters}m of the school. Current distance: ${Math.round(this.distanceToSchool)}m`;
      return;
    }

    this.state = 'scanning';
    this.errorMessage = '';

    try {
      this.html5QrCode = new Html5Qrcode('qr-reader');

      await this.html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          this.onQrCodeScanned(decodedText);
        },
        (errorMessage) => {
          // Ignore scan errors (happens while searching for QR code)
        }
      );
    } catch (err: any) {
      this.state = 'error';
      this.errorMessage = err.message || 'Failed to start camera. Please ensure camera permissions are granted.';
    }
  }

  async stopScanner(): Promise<void> {
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

  async onQrCodeScanned(code: string): Promise<void> {
    if (this.state !== 'scanning') return;

    await this.stopScanner();
    this.scannedCode = code;
    this.state = 'validating';

    // Validate the QR code
    this.qrService.validateQrCode(code).subscribe({
      next: (response) => {
        if (response.isValid) {
          this.qrType = response.type as 'CheckIn' | 'CheckOut';
          this.prepareChildSelection();
        } else {
          this.state = 'error';
          this.errorMessage = response.message || 'Invalid QR code';
        }
      },
      error: (err) => {
        this.state = 'error';
        this.errorMessage = err.error?.message || 'Failed to validate QR code';
      }
    });
  }

  prepareChildSelection(): void {
    // Filter children based on QR type
    const eligibleChildren = this.qrType === 'CheckIn'
      ? this.children.filter(c => !c.isCheckedIn)
      : this.children.filter(c => c.isCheckedIn && !c.isCheckedOut);

    if (eligibleChildren.length === 0) {
      this.state = 'error';
      this.errorMessage = this.qrType === 'CheckIn'
        ? 'All your children are already checked in today'
        : 'No children are currently checked in';
      return;
    }

    if (eligibleChildren.length === 1) {
      // Auto-select if only one child
      this.selectedChildIds = [eligibleChildren[0].id];
      this.confirmAction();
    } else {
      // Show selection UI
      this.state = 'selecting';
    }
  }

  toggleChildSelection(childId: number): void {
    const index = this.selectedChildIds.indexOf(childId);
    if (index > -1) {
      this.selectedChildIds.splice(index, 1);
    } else {
      this.selectedChildIds.push(childId);
    }
  }

  isChildSelected(childId: number): boolean {
    return this.selectedChildIds.includes(childId);
  }

  isChildEligible(child: ChildAttendanceStatus): boolean {
    if (this.qrType === 'CheckIn') {
      return !child.isCheckedIn;
    } else {
      return child.isCheckedIn && !child.isCheckedOut;
    }
  }

  selectAllEligible(): void {
    this.selectedChildIds = this.children
      .filter(c => this.isChildEligible(c))
      .map(c => c.id);
  }

  confirmAction(): void {
    if (this.selectedChildIds.length === 0) {
      this.errorMessage = 'Please select at least one child';
      return;
    }

    if (!this.currentPosition) {
      this.errorMessage = 'Location not available';
      return;
    }

    this.state = 'processing';
    this.errorMessage = '';

    const request = {
      qrCode: this.scannedCode,
      childIds: this.selectedChildIds,
      latitude: this.currentPosition.latitude,
      longitude: this.currentPosition.longitude
    };

    const action$ = this.qrType === 'CheckIn'
      ? this.qrService.qrCheckIn(request)
      : this.qrService.qrCheckOut(request);

    action$.subscribe({
      next: (result) => {
        this.result = result;
        this.state = result.success ? 'success' : 'error';
        if (result.success) {
          this.successMessage = result.message;
          this.loadChildrenStatus(); // Refresh status
        } else {
          this.errorMessage = result.message;
        }
      },
      error: (err) => {
        this.state = 'error';
        this.errorMessage = err.error?.message || 'Operation failed. Please try again.';
      }
    });
  }

  reset(): void {
    this.state = 'idle';
    this.scannedCode = '';
    this.qrType = '';
    this.selectedChildIds = [];
    this.result = null;
    this.errorMessage = '';
    this.successMessage = '';
    this.loadChildrenStatus();
  }

  formatTime(dateString?: string): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getChildStatusText(child: ChildAttendanceStatus): string {
    if (child.isCheckedOut) {
      return `Checked out at ${this.formatTime(child.checkOutTime)}`;
    }
    if (child.isCheckedIn) {
      return `Checked in at ${this.formatTime(child.checkInTime)}`;
    }
    return 'Not checked in';
  }

  getChildStatusClass(child: ChildAttendanceStatus): string {
    if (child.isCheckedOut) return 'status-checked-out';
    if (child.isCheckedIn) return 'status-checked-in';
    return 'status-not-checked-in';
  }
}
