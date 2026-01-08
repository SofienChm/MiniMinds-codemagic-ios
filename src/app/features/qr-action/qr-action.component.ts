import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { QrCheckinService } from '../qr-checkin/qr-checkin.service';
import { GeolocationService } from '../../core/services/geolocation.service';
import { AuthService } from '../../core/services/auth';
import { Subscription } from 'rxjs';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

interface ChildInfo {
  id: number;
  firstName: string;
  lastName: string;
  profilePicture?: string;
  isCheckedIn: boolean;
  isCheckedOut: boolean;
}

type QrActionState =
  | 'loading'
  | 'requesting-location'
  | 'processing'
  | 'success'
  | 'error'
  | 'login-required'
  | 'location-required'
  | 'geofence-error'
  | 'select-child'
  | 'no-eligible-children';

@Component({
  selector: 'app-qr-action',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="qr-action-container">
      <div class="qr-action-card">
        <!-- Loading State -->
        <div *ngIf="state === 'loading'" class="state-container">
          <div class="spinner-container">
            <div class="spinner"></div>
          </div>
          <h4>{{ 'QR_ACTION.VALIDATING' | translate }}</h4>
          <p class="text-muted">{{ 'QR_ACTION.PLEASE_WAIT' | translate }}</p>
        </div>

        <!-- Requesting Location State -->
        <div *ngIf="state === 'requesting-location'" class="state-container">
          <div class="spinner-container">
            <div class="spinner"></div>
          </div>
          <h4>{{ 'QR_ACTION.GETTING_LOCATION' | translate }}</h4>
          <p class="text-muted">{{ 'QR_ACTION.LOCATION_WAIT' | translate }}</p>
        </div>

        <!-- Processing State -->
        <div *ngIf="state === 'processing'" class="state-container">
          <div class="spinner-container">
            <div class="spinner"></div>
          </div>
          <h4>{{ qrType === 'CheckIn' ? ('QR_ACTION.CHECKING_IN' | translate) : ('QR_ACTION.CHECKING_OUT' | translate) }}</h4>
          <p class="text-muted" *ngIf="processingChildren.length > 0">
            {{ processingChildren.join(', ') }}
          </p>
        </div>

        <!-- Success State -->
        <div *ngIf="state === 'success'" class="state-container success">
          <div class="icon-container success-icon">
            <i class="bi bi-check-circle-fill"></i>
          </div>
          <h3>{{ successMessage }}</h3>
          <p class="text-muted" *ngIf="processedChildren.length > 0">
            {{ processedChildren.join(', ') }}
          </p>
          <div class="result-details" *ngIf="resultDetails.length > 0">
            <div *ngFor="let detail of resultDetails" class="result-item" [class.success]="detail.success" [class.error]="!detail.success">
              <i class="bi" [class.bi-check-circle]="detail.success" [class.bi-x-circle]="!detail.success"></i>
              <span>{{ detail.childName }}: {{ detail.message }}</span>
            </div>
          </div>
          <button class="btn btn-primary btn-lg mt-4" (click)="goToDashboard()">
            <i class="bi bi-house me-2"></i>{{ 'QR_ACTION.GO_HOME' | translate }}
          </button>
        </div>

        <!-- Error State -->
        <div *ngIf="state === 'error'" class="state-container error">
          <div class="icon-container error-icon">
            <i class="bi bi-x-circle-fill"></i>
          </div>
          <h3>{{ errorMessage }}</h3>
          <div class="button-group mt-4">
            <button class="btn btn-outline-secondary" (click)="goToDashboard()">
              {{ 'QR_ACTION.GO_HOME' | translate }}
            </button>
            <button class="btn btn-primary" (click)="retry()">
              <i class="bi bi-arrow-repeat me-2"></i>{{ 'QR_ACTION.TRY_AGAIN' | translate }}
            </button>
          </div>
        </div>

        <!-- Login Required State -->
        <div *ngIf="state === 'login-required'" class="state-container">
          <div class="icon-container warning-icon">
            <i class="bi bi-person-lock"></i>
          </div>
          <h4>{{ 'QR_ACTION.LOGIN_REQUIRED' | translate }}</h4>
          <p class="text-muted">{{ 'QR_ACTION.LOGIN_MESSAGE' | translate }}</p>
          <button class="btn btn-primary btn-lg mt-4" (click)="goToLogin()">
            <i class="bi bi-box-arrow-in-right me-2"></i>{{ 'QR_ACTION.LOGIN' | translate }}
          </button>
        </div>

        <!-- Location Required State -->
        <div *ngIf="state === 'location-required'" class="state-container">
          <div class="icon-container warning-icon">
            <i class="bi bi-geo-alt"></i>
          </div>
          <h4>{{ 'QR_ACTION.LOCATION_REQUIRED' | translate }}</h4>
          <p class="text-muted">{{ locationErrorMessage || ('QR_ACTION.LOCATION_MESSAGE' | translate) }}</p>
          <button class="btn btn-primary btn-lg mt-4" (click)="retryLocation()">
            <i class="bi bi-arrow-repeat me-2"></i>{{ 'QR_ACTION.TRY_AGAIN' | translate }}
          </button>
          <p class="text-muted small mt-3">{{ 'QR_ACTION.LOCATION_TIP' | translate }}</p>
        </div>

        <!-- Geofence Error State -->
        <div *ngIf="state === 'geofence-error'" class="state-container">
          <div class="icon-container error-icon">
            <i class="bi bi-geo-alt-fill"></i>
          </div>
          <h4>{{ 'QR_ACTION.OUTSIDE_GEOFENCE' | translate }}</h4>
          <p class="text-muted">{{ geofenceMessage }}</p>
          <button class="btn btn-outline-secondary mt-4" (click)="goToDashboard()">
            {{ 'QR_ACTION.GO_HOME' | translate }}
          </button>
        </div>

        <!-- No Eligible Children State -->
        <div *ngIf="state === 'no-eligible-children'" class="state-container">
          <div class="icon-container warning-icon">
            <i class="bi bi-person-x"></i>
          </div>
          <h4>{{ noEligibleMessage }}</h4>
          <button class="btn btn-outline-secondary mt-4" (click)="goToDashboard()">
            {{ 'QR_ACTION.GO_HOME' | translate }}
          </button>
        </div>

        <!-- Select Child State (only when multiple children need selection) -->
        <div *ngIf="state === 'select-child'" class="state-container">
          <div class="icon-container" [class.checkin-icon]="qrType === 'CheckIn'" [class.checkout-icon]="qrType === 'CheckOut'">
            <i class="bi bi-qr-code-scan"></i>
          </div>
          <h4>{{ qrType === 'CheckIn' ? ('QR_ACTION.SELECT_CHECKIN' | translate) : ('QR_ACTION.SELECT_CHECKOUT' | translate) }}</h4>

          <div class="children-list">
            <div *ngFor="let child of eligibleChildren"
                 class="child-item"
                 [class.selected]="isChildSelected(child.id)"
                 [class.disabled]="isChildDisabled(child)"
                 (click)="toggleChildSelection(child)">
              <div class="child-checkbox">
                <i class="bi" [class.bi-check-square-fill]="isChildSelected(child.id)" [class.bi-square]="!isChildSelected(child.id)"></i>
              </div>
              <img [src]="child.profilePicture || 'assets/child.png'" class="child-avatar" alt="Child">
              <div class="child-info">
                <h6>{{ child.firstName }} {{ child.lastName }}</h6>
                <small [class.text-success]="child.isCheckedIn && !child.isCheckedOut"
                       [class.text-secondary]="child.isCheckedOut"
                       [class.text-warning]="!child.isCheckedIn">
                  {{ getChildStatusText(child) }}
                </small>
              </div>
            </div>
          </div>

          <div class="button-group mt-4" *ngIf="eligibleChildren.length > 1">
            <button class="btn btn-outline-secondary" (click)="selectAll()">
              <i class="bi bi-check-all me-2"></i>{{ 'QR_ACTION.SELECT_ALL' | translate }}
            </button>
          </div>

          <button class="btn btn-primary btn-lg w-100 mt-3"
                  [disabled]="selectedChildIds.length === 0"
                  (click)="processSelectedChildren()">
            <i class="bi" [class.bi-box-arrow-in-right]="qrType === 'CheckIn'" [class.bi-box-arrow-right]="qrType === 'CheckOut'" class="me-2"></i>
            {{ qrType === 'CheckIn' ? ('QR_ACTION.CHECK_IN' | translate) : ('QR_ACTION.CHECK_OUT' | translate) }}
            ({{ selectedChildIds.length }})
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .qr-action-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }

    .qr-action-card {
      background: white;
      border-radius: 24px;
      padding: 40px 30px;
      max-width: 420px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }

    .state-container {
      text-align: center;
    }

    .spinner-container {
      margin-bottom: 24px;
    }

    .spinner {
      width: 60px;
      height: 60px;
      border: 4px solid #e9ecef;
      border-top-color: #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .icon-container {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      font-size: 48px;
    }

    .icon-container i {
      animation: bounceIn 0.5s ease;
    }

    @keyframes bounceIn {
      0% { transform: scale(0.3); opacity: 0; }
      50% { transform: scale(1.1); }
      70% { transform: scale(0.9); }
      100% { transform: scale(1); opacity: 1; }
    }

    .success-icon {
      background: #d4edda;
      color: #28a745;
    }

    .error-icon {
      background: #f8d7da;
      color: #dc3545;
    }

    .warning-icon {
      background: #fff3cd;
      color: #ffc107;
    }

    .checkin-icon {
      background: #d4edda;
      color: #28a745;
    }

    .checkout-icon {
      background: #f8d7da;
      color: #dc3545;
    }

    .state-container h3, .state-container h4 {
      margin-bottom: 8px;
      color: #333;
    }

    .text-muted {
      color: #6c757d;
      margin-bottom: 0;
    }

    .button-group {
      display: flex;
      gap: 12px;
      justify-content: center;
    }

    .children-list {
      max-height: 300px;
      overflow-y: auto;
      margin-top: 20px;
    }

    .child-item {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      border: 2px solid #e9ecef;
      border-radius: 12px;
      margin-bottom: 10px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .child-item:hover:not(.disabled) {
      background: #f8f9fa;
      border-color: #667eea;
    }

    .child-item.selected {
      background: #e8f0fe;
      border-color: #667eea;
    }

    .child-item.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .child-checkbox {
      margin-right: 12px;
      font-size: 20px;
      color: #667eea;
    }

    .child-avatar {
      width: 45px;
      height: 45px;
      border-radius: 50%;
      object-fit: cover;
      margin-right: 12px;
    }

    .child-info {
      flex: 1;
      text-align: left;
    }

    .child-info h6 {
      margin: 0;
      font-weight: 600;
      font-size: 15px;
    }

    .child-info small {
      display: block;
      font-size: 12px;
    }

    .result-details {
      margin-top: 16px;
      text-align: left;
    }

    .result-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 8px;
      margin-bottom: 6px;
      font-size: 14px;
    }

    .result-item.success {
      background: #d4edda;
      color: #155724;
    }

    .result-item.error {
      background: #f8d7da;
      color: #721c24;
    }

    .btn-lg {
      padding: 14px 28px;
      font-size: 16px;
      border-radius: 12px;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
    }

    .btn-primary:hover {
      background: linear-gradient(135deg, #5a6fd6 0%, #6a4190 100%);
    }

    .btn-primary:disabled {
      background: #ccc;
    }
  `]
})
export class QrActionComponent implements OnInit, OnDestroy {
  state: QrActionState = 'loading';

  qrCode = '';
  qrType: 'CheckIn' | 'CheckOut' = 'CheckIn';

  // Children
  allChildren: ChildInfo[] = [];
  eligibleChildren: ChildInfo[] = [];
  selectedChildIds: number[] = [];
  processingChildren: string[] = [];
  processedChildren: string[] = [];

  // Messages
  successMessage = '';
  errorMessage = '';
  geofenceMessage = '';
  noEligibleMessage = '';

  // Results
  resultDetails: { childName: string; success: boolean; message: string }[] = [];

  // Location
  currentPosition: { latitude: number; longitude: number } | null = null;
  locationRetryCount = 0;
  maxLocationRetries = 3;
  locationErrorMessage = '';

  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private translate: TranslateService,
    private qrService: QrCheckinService,
    private geolocationService: GeolocationService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.qrCode = this.route.snapshot.paramMap.get('code') || '';

    if (!this.qrCode) {
      this.state = 'error';
      this.errorMessage = this.translate.instant('QR_ACTION.INVALID_QR');
      return;
    }

    // Check if user is logged in
    if (!this.authService.isAuthenticated()) {
      this.state = 'login-required';
      // Store the QR code for after login
      localStorage.setItem('pendingQrAction', this.qrCode);
      return;
    }

    // Clear any pending QR action since we're processing now
    localStorage.removeItem('pendingQrAction');

    // Start the automatic flow
    this.startAutomaticFlow();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Main automatic flow - validates QR, gets location, processes attendance
   */
  private async startAutomaticFlow(): Promise<void> {
    this.state = 'loading';

    // Step 1: Validate QR code
    const sub1 = this.qrService.validateQrCode(this.qrCode).subscribe({
      next: (response) => {
        if (response.isValid) {
          this.qrType = response.type as 'CheckIn' | 'CheckOut';
          this.requestLocation();
        } else {
          this.state = 'error';
          this.errorMessage = response.message || this.translate.instant('QR_ACTION.INVALID_QR');
        }
      },
      error: () => {
        this.state = 'error';
        this.errorMessage = this.translate.instant('QR_ACTION.VALIDATION_ERROR');
      }
    });
    this.subscriptions.push(sub1);
  }

  /**
   * Request location and continue flow
   */
  requestLocation(): void {
    this.state = 'requesting-location';
    this.locationRetryCount++;

    const sub = this.geolocationService.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 5000
    }).subscribe({
      next: (position) => {
        this.currentPosition = {
          latitude: position.latitude,
          longitude: position.longitude
        };
        this.locationRetryCount = 0; // Reset on success
        this.checkGeofenceAndLoadChildren();
      },
      error: (error: any) => {
        console.error('Location error:', error);
        this.locationErrorMessage = error?.message || this.translate.instant('QR_ACTION.LOCATION_MESSAGE');

        if (this.locationRetryCount < this.maxLocationRetries) {
          // Auto-retry with a small delay
          setTimeout(() => {
            this.requestLocation();
          }, 1000);
        } else {
          this.state = 'location-required';
          this.locationRetryCount = 0; // Reset for manual retry
        }
      }
    });
    this.subscriptions.push(sub);
  }

  /**
   * Check geofence and load children
   */
  private checkGeofenceAndLoadChildren(): void {
    this.state = 'loading';

    const sub = this.qrService.getSchoolSettings().subscribe({
      next: (settings) => {
        if (settings.geofenceEnabled && this.currentPosition) {
          const distance = this.geolocationService.calculateDistance(
            this.currentPosition.latitude,
            this.currentPosition.longitude,
            settings.latitude,
            settings.longitude
          );

          if (distance > settings.geofenceRadiusMeters) {
            this.state = 'geofence-error';
            this.geofenceMessage = this.translate.instant('QR_ACTION.GEOFENCE_MESSAGE', {
              distance: Math.round(distance),
              radius: settings.geofenceRadiusMeters
            });
            return;
          }
        }

        this.loadChildrenAndProcess();
      },
      error: () => {
        // If can't load settings, proceed anyway
        this.loadChildrenAndProcess();
      }
    });
    this.subscriptions.push(sub);
  }

  /**
   * Load children and automatically process if only one eligible
   */
  private loadChildrenAndProcess(): void {
    const sub = this.qrService.getMyChildrenStatus().subscribe({
      next: (children) => {
        this.allChildren = children.map(c => ({
          id: c.id,
          firstName: c.firstName,
          lastName: c.lastName,
          profilePicture: c.profilePicture,
          isCheckedIn: c.isCheckedIn,
          isCheckedOut: c.isCheckedOut
        }));

        // Filter eligible children based on QR type
        this.eligibleChildren = this.allChildren.filter(c => !this.isChildDisabled(c));

        if (this.eligibleChildren.length === 0) {
          this.state = 'no-eligible-children';
          this.noEligibleMessage = this.qrType === 'CheckIn'
            ? this.translate.instant('QR_ACTION.ALL_CHECKED_IN')
            : this.translate.instant('QR_ACTION.NONE_TO_CHECKOUT');
          return;
        }

        // Auto-process if only one eligible child
        if (this.eligibleChildren.length === 1) {
          this.selectedChildIds = [this.eligibleChildren[0].id];
          this.processSelectedChildren();
        } else {
          // Multiple children - show selection UI
          this.state = 'select-child';
        }
      },
      error: () => {
        this.state = 'error';
        this.errorMessage = this.translate.instant('QR_ACTION.LOAD_CHILDREN_ERROR');
      }
    });
    this.subscriptions.push(sub);
  }

  /**
   * Check if a child is disabled for selection
   */
  isChildDisabled(child: ChildInfo): boolean {
    if (this.qrType === 'CheckIn') {
      // Can't check in if already checked in today (regardless of checkout status)
      return child.isCheckedIn;
    } else {
      // Can't check out if not checked in or already checked out
      return !child.isCheckedIn || child.isCheckedOut;
    }
  }

  /**
   * Check if child is selected
   */
  isChildSelected(childId: number): boolean {
    return this.selectedChildIds.includes(childId);
  }

  /**
   * Toggle child selection
   */
  toggleChildSelection(child: ChildInfo): void {
    if (this.isChildDisabled(child)) return;

    const index = this.selectedChildIds.indexOf(child.id);
    if (index > -1) {
      this.selectedChildIds.splice(index, 1);
    } else {
      this.selectedChildIds.push(child.id);
    }
  }

  /**
   * Select all eligible children
   */
  selectAll(): void {
    this.selectedChildIds = this.eligibleChildren
      .filter(c => !this.isChildDisabled(c))
      .map(c => c.id);
  }

  /**
   * Get child status text
   */
  getChildStatusText(child: ChildInfo): string {
    if (child.isCheckedOut) {
      return this.translate.instant('QR_ACTION.CHECKED_OUT');
    }
    if (child.isCheckedIn) {
      return this.translate.instant('QR_ACTION.CHECKED_IN');
    }
    return this.translate.instant('QR_ACTION.NOT_CHECKED_IN');
  }

  /**
   * Process attendance for selected children
   */
  processSelectedChildren(): void {
    if (this.selectedChildIds.length === 0 || !this.currentPosition) return;

    this.state = 'processing';
    this.processingChildren = this.allChildren
      .filter(c => this.selectedChildIds.includes(c.id))
      .map(c => c.firstName);

    const request = {
      qrCode: this.qrCode,
      childIds: this.selectedChildIds,
      latitude: this.currentPosition.latitude,
      longitude: this.currentPosition.longitude
    };

    const action$ = this.qrType === 'CheckIn'
      ? this.qrService.qrCheckIn(request)
      : this.qrService.qrCheckOut(request);

    const sub = action$.subscribe({
      next: (result) => {
        // Trigger haptic feedback on success
        this.triggerHaptic(result.success);

        if (result.success) {
          this.state = 'success';
          this.successMessage = this.qrType === 'CheckIn'
            ? this.translate.instant('QR_ACTION.CHECKIN_SUCCESS')
            : this.translate.instant('QR_ACTION.CHECKOUT_SUCCESS');

          this.processedChildren = this.processingChildren;
          this.resultDetails = result.results || [];
        } else {
          this.state = 'error';
          this.errorMessage = result.message || this.translate.instant('QR_ACTION.ACTION_FAILED');
          this.resultDetails = result.results || [];
        }
      },
      error: (err) => {
        this.triggerHaptic(false);
        this.state = 'error';
        this.errorMessage = err.error?.message || this.translate.instant('QR_ACTION.ACTION_FAILED');
      }
    });
    this.subscriptions.push(sub);
  }

  /**
   * Trigger haptic feedback
   */
  private async triggerHaptic(success: boolean): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.impact({
          style: success ? ImpactStyle.Medium : ImpactStyle.Heavy
        });
      } catch {
        // Ignore haptics errors
      }
    }
  }

  /**
   * Retry location manually (after max auto-retries failed)
   */
  retryLocation(): void {
    this.locationErrorMessage = '';
    this.requestLocation();
  }

  /**
   * Retry the flow
   */
  retry(): void {
    this.state = 'loading';
    this.selectedChildIds = [];
    this.resultDetails = [];
    this.startAutomaticFlow();
  }

  /**
   * Navigate to dashboard
   */
  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  /**
   * Navigate to login with return URL
   */
  goToLogin(): void {
    this.router.navigate(['/login'], {
      queryParams: { returnUrl: `/qr-action/${this.qrCode}` }
    });
  }
}
