import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { QrCheckinService } from '../qr-checkin/qr-checkin.service';
import { GeolocationService } from '../../core/services/geolocation.service';
import { AuthService } from '../../core/services/auth';
import { HttpClient } from '@angular/common/http';
import { ApiConfig } from '../../core/config/api.config';

interface ChildInfo {
  id: number;
  firstName: string;
  lastName: string;
  profilePicture?: string;
  isCheckedIn: boolean;
  isCheckedOut: boolean;
}

@Component({
  selector: 'app-qr-action',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="qr-action-container">
      <div class="qr-action-card">
        <!-- Loading State -->
        <div *ngIf="state === 'loading'" class="text-center py-5">
          <div class="spinner-border text-primary mb-3" style="width: 3rem; height: 3rem;"></div>
          <h5>{{ 'QR_ACTION.PROCESSING' | translate }}</h5>
        </div>

        <!-- Select Child State -->
        <div *ngIf="state === 'select-child'" class="text-center">
          <div class="mb-4">
            <i class="bi bi-qr-code-scan display-1" [class.text-success]="qrType === 'CheckIn'" [class.text-danger]="qrType === 'CheckOut'"></i>
          </div>
          <h4 class="mb-4">{{ qrType === 'CheckIn' ? ('QR_ACTION.SELECT_CHECKIN' | translate) : ('QR_ACTION.SELECT_CHECKOUT' | translate) }}</h4>

          <div class="children-list">
            <div *ngFor="let child of eligibleChildren"
                 class="child-item"
                 (click)="selectChild(child)"
                 [class.disabled]="isChildDisabled(child)">
              <img [src]="child.profilePicture || 'assets/child.png'" class="child-avatar" alt="Child">
              <div class="child-info">
                <h6>{{ child.firstName }} {{ child.lastName }}</h6>
                <small *ngIf="child.isCheckedIn && !child.isCheckedOut" class="text-success">
                  {{ 'QR_ACTION.CHECKED_IN' | translate }}
                </small>
                <small *ngIf="child.isCheckedOut" class="text-secondary">
                  {{ 'QR_ACTION.CHECKED_OUT' | translate }}
                </small>
                <small *ngIf="!child.isCheckedIn" class="text-warning">
                  {{ 'QR_ACTION.NOT_CHECKED_IN' | translate }}
                </small>
              </div>
              <i class="bi bi-chevron-right"></i>
            </div>
          </div>

          <div *ngIf="eligibleChildren.length === 0" class="alert alert-info mt-3">
            {{ 'QR_ACTION.NO_CHILDREN' | translate }}
          </div>
        </div>

        <!-- Processing State -->
        <div *ngIf="state === 'processing'" class="text-center py-5">
          <div class="spinner-border text-primary mb-3" style="width: 3rem; height: 3rem;"></div>
          <h5>{{ qrType === 'CheckIn' ? ('QR_ACTION.CHECKING_IN' | translate) : ('QR_ACTION.CHECKING_OUT' | translate) }}</h5>
          <p class="text-muted">{{ selectedChild?.firstName }} {{ selectedChild?.lastName }}</p>
        </div>

        <!-- Success State -->
        <div *ngIf="state === 'success'" class="text-center py-5">
          <div class="success-animation mb-4">
            <i class="bi bi-check-circle-fill text-success display-1"></i>
          </div>
          <h4 class="text-success mb-3">{{ successMessage }}</h4>
          <p class="text-muted mb-4">{{ selectedChild?.firstName }} {{ selectedChild?.lastName }}</p>
          <button class="btn btn-primary btn-lg" (click)="goToDashboard()">
            <i class="bi bi-house me-2"></i>{{ 'QR_ACTION.GO_HOME' | translate }}
          </button>
        </div>

        <!-- Error State -->
        <div *ngIf="state === 'error'" class="text-center py-5">
          <div class="error-animation mb-4">
            <i class="bi bi-x-circle-fill text-danger display-1"></i>
          </div>
          <h4 class="text-danger mb-3">{{ errorMessage }}</h4>
          <div class="d-flex gap-2 justify-content-center">
            <button class="btn btn-outline-secondary" (click)="goToDashboard()">
              {{ 'QR_ACTION.GO_HOME' | translate }}
            </button>
            <button class="btn btn-primary" (click)="retry()">
              <i class="bi bi-arrow-repeat me-2"></i>{{ 'QR_ACTION.TRY_AGAIN' | translate }}
            </button>
          </div>
        </div>

        <!-- Login Required State -->
        <div *ngIf="state === 'login-required'" class="text-center py-5">
          <div class="mb-4">
            <i class="bi bi-person-lock display-1 text-warning"></i>
          </div>
          <h4 class="mb-3">{{ 'QR_ACTION.LOGIN_REQUIRED' | translate }}</h4>
          <p class="text-muted mb-4">{{ 'QR_ACTION.LOGIN_MESSAGE' | translate }}</p>
          <button class="btn btn-primary btn-lg" (click)="goToLogin()">
            <i class="bi bi-box-arrow-in-right me-2"></i>{{ 'QR_ACTION.LOGIN' | translate }}
          </button>
        </div>

        <!-- Location Required State -->
        <div *ngIf="state === 'location-required'" class="text-center py-5">
          <div class="mb-4">
            <i class="bi bi-geo-alt display-1 text-warning"></i>
          </div>
          <h4 class="mb-3">{{ 'QR_ACTION.LOCATION_REQUIRED' | translate }}</h4>
          <p class="text-muted mb-4">{{ 'QR_ACTION.LOCATION_MESSAGE' | translate }}</p>
          <button class="btn btn-primary btn-lg" (click)="requestLocation()">
            <i class="bi bi-geo-alt me-2"></i>{{ 'QR_ACTION.ENABLE_LOCATION' | translate }}
          </button>
        </div>

        <!-- Geofence Error State -->
        <div *ngIf="state === 'geofence-error'" class="text-center py-5">
          <div class="mb-4">
            <i class="bi bi-geo-alt-fill display-1 text-danger"></i>
          </div>
          <h4 class="text-danger mb-3">{{ 'QR_ACTION.OUTSIDE_GEOFENCE' | translate }}</h4>
          <p class="text-muted mb-4">{{ geofenceMessage }}</p>
          <button class="btn btn-outline-secondary" (click)="goToDashboard()">
            {{ 'QR_ACTION.GO_HOME' | translate }}
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
      border-radius: 20px;
      padding: 40px;
      max-width: 500px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }

    .children-list {
      max-height: 400px;
      overflow-y: auto;
    }

    .child-item {
      display: flex;
      align-items: center;
      padding: 15px;
      border: 1px solid #e9ecef;
      border-radius: 12px;
      margin-bottom: 10px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .child-item:hover:not(.disabled) {
      background: #f8f9fa;
      border-color: #667eea;
      transform: translateX(5px);
    }

    .child-item.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .child-avatar {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      object-fit: cover;
      margin-right: 15px;
    }

    .child-info {
      flex: 1;
      text-align: left;
    }

    .child-info h6 {
      margin: 0;
      font-weight: 600;
    }

    .child-info small {
      display: block;
    }

    .success-animation, .error-animation {
      animation: bounceIn 0.5s ease;
    }

    @keyframes bounceIn {
      0% { transform: scale(0.3); opacity: 0; }
      50% { transform: scale(1.1); }
      70% { transform: scale(0.9); }
      100% { transform: scale(1); opacity: 1; }
    }
  `]
})
export class QrActionComponent implements OnInit {
  state: 'loading' | 'select-child' | 'processing' | 'success' | 'error' | 'login-required' | 'location-required' | 'geofence-error' = 'loading';

  qrCode = '';
  qrType: 'CheckIn' | 'CheckOut' = 'CheckIn';
  eligibleChildren: ChildInfo[] = [];
  selectedChild: ChildInfo | null = null;

  successMessage = '';
  errorMessage = '';
  geofenceMessage = '';

  currentPosition: { latitude: number; longitude: number } | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private translate: TranslateService,
    private qrService: QrCheckinService,
    private geolocationService: GeolocationService,
    private authService: AuthService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.qrCode = this.route.snapshot.paramMap.get('code') || '';
    console.log('QR Action - Received code from URL:', this.qrCode);

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

    this.validateAndProcess();
  }

  async validateAndProcess(): Promise<void> {
    console.log('QR Action - Validating code:', this.qrCode);
    // First, validate the QR code
    this.qrService.validateQrCode(this.qrCode).subscribe({
      next: (response) => {
        console.log('QR Action - Validation response:', response);
        if (response.isValid) {
          this.qrType = response.type as 'CheckIn' | 'CheckOut';
          this.requestLocation();
        } else {
          this.state = 'error';
          this.errorMessage = response.message || this.translate.instant('QR_ACTION.INVALID_QR');
        }
      },
      error: (err) => {
        console.error('QR Action - Validation error:', err);
        this.state = 'error';
        this.errorMessage = this.translate.instant('QR_ACTION.VALIDATION_ERROR');
      }
    });
  }

  requestLocation(): void {
    this.state = 'loading';

    this.geolocationService.getCurrentPosition().subscribe({
      next: (position) => {
        this.currentPosition = {
          latitude: position.latitude,
          longitude: position.longitude
        };
        this.checkGeofenceAndLoadChildren();
      },
      error: () => {
        this.state = 'location-required';
      }
    });
  }

  checkGeofenceAndLoadChildren(): void {
    // Get school settings and check geofence
    this.qrService.getSchoolSettings().subscribe({
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

        this.loadChildren();
      },
      error: () => {
        // If can't load settings, proceed anyway
        this.loadChildren();
      }
    });
  }

  loadChildren(): void {
    // For parents, load their children with attendance status
    this.http.get<any[]>(`${ApiConfig.ENDPOINTS.ATTENDANCE}/MyChildren`).subscribe({
      next: (children) => {
        this.eligibleChildren = children.map(c => ({
          id: c.id,
          firstName: c.firstName,
          lastName: c.lastName,
          profilePicture: c.profilePicture,
          isCheckedIn: c.isCheckedIn,
          isCheckedOut: c.isCheckedOut
        }));

        // If only one child and they're eligible, auto-select
        const eligibleForAction = this.eligibleChildren.filter(c => !this.isChildDisabled(c));
        if (eligibleForAction.length === 1) {
          this.selectChild(eligibleForAction[0]);
        } else {
          this.state = 'select-child';
        }
      },
      error: () => {
        this.state = 'error';
        this.errorMessage = this.translate.instant('QR_ACTION.LOAD_CHILDREN_ERROR');
      }
    });
  }

  isChildDisabled(child: ChildInfo): boolean {
    if (this.qrType === 'CheckIn') {
      // Can't check in if already checked in
      return child.isCheckedIn && !child.isCheckedOut;
    } else {
      // Can't check out if not checked in or already checked out
      return !child.isCheckedIn || child.isCheckedOut;
    }
  }

  selectChild(child: ChildInfo): void {
    if (this.isChildDisabled(child)) return;

    this.selectedChild = child;
    this.processAttendance();
  }

  processAttendance(): void {
    if (!this.selectedChild || !this.currentPosition) return;

    this.state = 'processing';

    const request = {
      qrCode: this.qrCode,
      childIds: [this.selectedChild.id],
      latitude: this.currentPosition.latitude,
      longitude: this.currentPosition.longitude
    };

    const action$ = this.qrType === 'CheckIn'
      ? this.qrService.qrCheckIn(request)
      : this.qrService.qrCheckOut(request);

    action$.subscribe({
      next: (result) => {
        if (result.success) {
          this.state = 'success';
          this.successMessage = this.qrType === 'CheckIn'
            ? this.translate.instant('QR_ACTION.CHECKIN_SUCCESS')
            : this.translate.instant('QR_ACTION.CHECKOUT_SUCCESS');
        } else {
          this.state = 'error';
          this.errorMessage = result.message || this.translate.instant('QR_ACTION.ACTION_FAILED');
        }
      },
      error: (err) => {
        this.state = 'error';
        this.errorMessage = err.error?.message || this.translate.instant('QR_ACTION.ACTION_FAILED');
      }
    });
  }

  retry(): void {
    this.state = 'loading';
    this.selectedChild = null;
    this.validateAndProcess();
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  goToLogin(): void {
    this.router.navigate(['/login'], {
      queryParams: { returnUrl: `/qr-action/${this.qrCode}` }
    });
  }
}
