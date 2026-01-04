import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import * as QRCode from 'qrcode';
import { QrCheckinService } from '../qr-checkin/qr-checkin.service';
import { AuthService } from '../../core/services/auth';
import { TitlePage, Breadcrumb } from '../../shared/layouts/title-page/title-page';
import { QrCodeInfo, SchoolSettings } from '../qr-checkin/qr-checkin.interface';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PageTitleService } from '../../core/services/page-title.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-qr-management',
  standalone: true,
  imports: [CommonModule, FormsModule, TitlePage, TranslateModule],
  templateUrl: './qr-management.html',
  styleUrl: './qr-management.scss'
})
export class QrManagement implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('checkInCanvas') checkInCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('checkOutCanvas') checkOutCanvas!: ElementRef<HTMLCanvasElement>;

  // QR Codes
  checkInQrCode: QrCodeInfo | null = null;
  checkOutQrCode: QrCodeInfo | null = null;
  loadingQrCodes = true;
  regenerating = false;

  // School Settings
  settings: SchoolSettings = {
    id: 0,
    schoolName: 'MiniMinds Daycare',
    latitude: 0,
    longitude: 0,
    geofenceRadiusMeters: 100,
    geofenceEnabled: true
  };
  savingSettings = false;
  settingsSaved = false;

  // Messages
  errorMessage = '';
  successMessage = '';

  breadcrumbs: Breadcrumb[] = [];
  private langChangeSub?: Subscription;

  constructor(
    private qrService: QrCheckinService,
    private authService: AuthService,
    private router: Router,
    private translate: TranslateService,
    private pageTitleService: PageTitleService
  ) {}

  ngOnInit(): void {
    if (!this.authService.isAdmin()) {
      this.router.navigate(['/dashboard']);
      return;
    }
    this.pageTitleService.setTitle(this.translate.instant('QR_MANAGEMENT.TITLE'));
    this.setupBreadcrumbs();
    this.loadData();

    this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      this.pageTitleService.setTitle(this.translate.instant('QR_MANAGEMENT.TITLE'));
      this.setupBreadcrumbs();
    });
  }

  ngAfterViewInit(): void {
    // QR codes will be generated after data loads
  }

  ngOnDestroy(): void {
    this.langChangeSub?.unsubscribe();
  }

  private setupBreadcrumbs(): void {
    this.breadcrumbs = [
      { label: this.translate.instant('BREADCRUMBS.DASHBOARD'), url: '/dashboard' },
      { label: this.translate.instant('QR_MANAGEMENT.TITLE') }
    ];
  }

  loadData(): void {
    this.loadQrCodes();
    this.loadSettings();
  }

  loadQrCodes(): void {
    this.loadingQrCodes = true;

    // Load both QR codes in parallel
    this.qrService.getCheckInQrCode().subscribe({
      next: (qr) => {
        this.checkInQrCode = qr;
        this.generateQrCodeImage('checkIn', qr.code);
      },
      error: (err) => {
        console.error('Failed to load check-in QR code:', err);
      }
    });

    this.qrService.getCheckOutQrCode().subscribe({
      next: (qr) => {
        this.checkOutQrCode = qr;
        this.generateQrCodeImage('checkOut', qr.code);
        this.loadingQrCodes = false;
      },
      error: (err) => {
        console.error('Failed to load check-out QR code:', err);
        this.loadingQrCodes = false;
      }
    });
  }

  loadSettings(): void {
    this.qrService.getSchoolSettings().subscribe({
      next: (settings) => {
        this.settings = settings;
      },
      error: (err) => {
        console.error('Failed to load settings:', err);
      }
    });
  }

  async generateQrCodeImage(type: 'checkIn' | 'checkOut', code: string): Promise<void> {
    // Wait for view to be ready
    setTimeout(async () => {
      const canvas = type === 'checkIn' ? this.checkInCanvas : this.checkOutCanvas;
      if (!canvas?.nativeElement) return;

      try {
        await QRCode.toCanvas(canvas.nativeElement, code, {
          width: 280,
          margin: 2,
          color: {
            dark: type === 'checkIn' ? '#4caf50' : '#f44336',
            light: '#ffffff'
          }
        });
      } catch (err) {
        console.error(`Failed to generate ${type} QR code:`, err);
      }
    }, 100);
  }

  regenerateQrCodes(): void {
    if (!confirm('Are you sure you want to regenerate all QR codes? The old codes will stop working immediately.')) {
      return;
    }

    this.regenerating = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.qrService.regenerateQrCodes().subscribe({
      next: (result) => {
        this.checkInQrCode = result.checkIn;
        this.checkOutQrCode = result.checkOut;
        this.generateQrCodeImage('checkIn', result.checkIn.code);
        this.generateQrCodeImage('checkOut', result.checkOut.code);
        this.successMessage = 'QR codes regenerated successfully! Please print new QR codes.';
        this.regenerating = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to regenerate QR codes';
        this.regenerating = false;
      }
    });
  }

  saveSettings(): void {
    this.savingSettings = true;
    this.settingsSaved = false;
    this.errorMessage = '';

    this.qrService.updateSchoolSettings({
      schoolName: this.settings.schoolName,
      latitude: this.settings.latitude,
      longitude: this.settings.longitude,
      geofenceRadiusMeters: this.settings.geofenceRadiusMeters,
      geofenceEnabled: this.settings.geofenceEnabled
    }).subscribe({
      next: (settings) => {
        this.settings = settings;
        this.settingsSaved = true;
        this.savingSettings = false;
        setTimeout(() => this.settingsSaved = false, 3000);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to save settings';
        this.savingSettings = false;
      }
    });
  }

  getCurrentLocation(): void {
    if (!navigator.geolocation) {
      this.errorMessage = 'Geolocation is not supported by your browser';
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.settings.latitude = position.coords.latitude;
        this.settings.longitude = position.coords.longitude;
      },
      (error) => {
        this.errorMessage = 'Failed to get current location: ' + error.message;
      },
      { enableHighAccuracy: true }
    );
  }

  printQrCode(type: 'checkIn' | 'checkOut'): void {
    const canvas = type === 'checkIn' ? this.checkInCanvas : this.checkOutCanvas;
    if (!canvas?.nativeElement) return;

    const title = type === 'checkIn' ? 'CHECK IN' : 'CHECK OUT';
    const color = type === 'checkIn' ? '#4caf50' : '#f44336';
    const dataUrl = canvas.nativeElement.toDataURL('image/png');

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title} QR Code - ${this.settings.schoolName}</title>
        <style>
          body {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            font-family: Arial, sans-serif;
            text-align: center;
          }
          .container {
            padding: 40px;
            border: 4px solid ${color};
            border-radius: 20px;
          }
          h1 {
            color: ${color};
            font-size: 48px;
            margin: 0 0 10px;
          }
          h2 {
            color: #333;
            font-size: 24px;
            margin: 0 0 30px;
            font-weight: normal;
          }
          img {
            width: 300px;
            height: 300px;
          }
          .instructions {
            margin-top: 30px;
            color: #666;
            font-size: 18px;
          }
          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>${title}</h1>
          <h2>${this.settings.schoolName}</h2>
          <img src="${dataUrl}" alt="${title} QR Code">
          <p class="instructions">
            Scan this QR code with the MiniMinds app<br>
            to ${type === 'checkIn' ? 'check in' : 'check out'} your child
          </p>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  formatDate(dateString?: string): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
