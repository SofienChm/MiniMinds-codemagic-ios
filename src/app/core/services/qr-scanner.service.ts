import { Injectable, NgZone } from '@angular/core';
import { Observable, Subject, from, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Capacitor } from '@capacitor/core';
import {
  BarcodeScanner,
  BarcodeFormat,
  LensFacing
} from '@capacitor-mlkit/barcode-scanning';
import { Html5Qrcode } from 'html5-qrcode';

export interface QrScanResult {
  success: boolean;
  code?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class QrScannerService {
  private html5QrCode: Html5Qrcode | null = null;
  private scanSubject = new Subject<QrScanResult>();

  constructor(private zone: NgZone) {}

  /**
   * Check if we're running on a native platform
   */
  isNativePlatform(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Check if the scanner is supported
   */
  async isSupported(): Promise<boolean> {
    if (this.isNativePlatform()) {
      try {
        const result = await BarcodeScanner.isSupported();
        return result.supported;
      } catch {
        return false;
      }
    }
    return true; // Web always supports via html5-qrcode
  }

  /**
   * Request camera permission
   */
  async requestPermission(): Promise<boolean> {
    if (this.isNativePlatform()) {
      try {
        const status = await BarcodeScanner.requestPermissions();
        return status.camera === 'granted';
      } catch {
        return false;
      }
    }
    // For web, permission is requested when starting the scanner
    return true;
  }

  /**
   * Check if camera permission is granted
   */
  async checkPermission(): Promise<boolean> {
    if (this.isNativePlatform()) {
      try {
        const status = await BarcodeScanner.checkPermissions();
        return status.camera === 'granted';
      } catch {
        return false;
      }
    }
    return true;
  }

  /**
   * Start scanning - uses native scanner on mobile, html5-qrcode on web
   * For native: Opens full-screen scanner overlay
   * For web: Starts scanning in the provided element
   */
  async startScan(elementId?: string): Promise<Observable<QrScanResult>> {
    if (this.isNativePlatform()) {
      return this.startNativeScan();
    } else {
      if (!elementId) {
        return of({ success: false, error: 'Element ID required for web scanning' });
      }
      return this.startWebScan(elementId);
    }
  }

  /**
   * Native barcode scanning using MLKit
   */
  private async startNativeScan(): Promise<Observable<QrScanResult>> {
    try {
      // Request permission first
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        return of({ success: false, error: 'Camera permission denied' });
      }

      // Start the scanner
      const result = await BarcodeScanner.scan({
        formats: [BarcodeFormat.QrCode],
      });

      if (result.barcodes && result.barcodes.length > 0) {
        const code = result.barcodes[0].rawValue;
        return of({ success: true, code });
      }

      return of({ success: false, error: 'No QR code detected' });
    } catch (error: any) {
      return of({ success: false, error: error.message || 'Scan failed' });
    }
  }

  /**
   * Web-based scanning using html5-qrcode
   */
  private startWebScan(elementId: string): Observable<QrScanResult> {
    return new Observable(observer => {
      // Small delay to ensure DOM element is ready
      setTimeout(async () => {
        try {
          const element = document.getElementById(elementId);
          if (!element) {
            observer.next({ success: false, error: 'Scanner element not found' });
            observer.complete();
            return;
          }

          this.html5QrCode = new Html5Qrcode(elementId);

          await this.html5QrCode.start(
            { facingMode: 'environment' },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 }
            },
            (decodedText) => {
              this.zone.run(() => {
                observer.next({ success: true, code: decodedText });
                // Don't complete - allow multiple scans
              });
            },
            () => {
              // Ignore scan errors while searching
            }
          );
        } catch (error: any) {
          this.zone.run(() => {
            observer.next({ success: false, error: error.message || 'Failed to start camera' });
            observer.complete();
          });
        }
      }, 100);

      // Cleanup on unsubscribe
      return () => {
        this.stopWebScan();
      };
    });
  }

  /**
   * Stop the web scanner
   */
  async stopWebScan(): Promise<void> {
    if (this.html5QrCode) {
      try {
        const state = this.html5QrCode.getState();
        if (state === 2) { // Html5QrcodeScannerState.SCANNING
          await this.html5QrCode.stop();
        }
        this.html5QrCode.clear();
      } catch (err) {
        // Ignore stop errors
      }
      this.html5QrCode = null;
    }
  }

  /**
   * Stop scanning (both native and web)
   */
  async stopScan(): Promise<void> {
    if (this.isNativePlatform()) {
      try {
        await BarcodeScanner.stopScan();
      } catch {
        // Ignore
      }
    } else {
      await this.stopWebScan();
    }
  }

  /**
   * Single scan - scans once and returns result
   * Best for native platforms
   */
  async scanOnce(): Promise<QrScanResult> {
    if (!this.isNativePlatform()) {
      return { success: false, error: 'Use startScan() for web platform' };
    }

    try {
      // On Android, check and install Google Barcode Scanner module if needed
      if (Capacitor.getPlatform() === 'android') {
        const moduleAvailable = await this.checkAndInstallGoogleModule();
        if (!moduleAvailable) {
          return {
            success: false,
            error: 'Google Barcode Scanner is being installed. Please try again in a moment.'
          };
        }
      }

      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        return { success: false, error: 'Camera permission denied' };
      }

      const result = await BarcodeScanner.scan({
        formats: [BarcodeFormat.QrCode],
      });

      if (result.barcodes && result.barcodes.length > 0) {
        return { success: true, code: result.barcodes[0].rawValue };
      }

      return { success: false, error: 'No QR code detected' };
    } catch (error: any) {
      if (error.message?.includes('canceled')) {
        return { success: false, error: 'Scan cancelled' };
      }
      // Handle Google module not available error
      if (error.message?.includes('Google Barcode Scanner') || error.message?.includes('installGoogleBarcodeScanner')) {
        // Try to install the module
        this.installGoogleBarcodeModule();
        return {
          success: false,
          error: 'Installing barcode scanner. Please try again in a few seconds.'
        };
      }
      return { success: false, error: error.message || 'Scan failed' };
    }
  }

  /**
   * Check if Google module is available and install if needed
   */
  private async checkAndInstallGoogleModule(): Promise<boolean> {
    try {
      const result = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
      if (!result.available) {
        // Start installation in background
        BarcodeScanner.installGoogleBarcodeScannerModule();
        // Return false to indicate module is being installed
        return false;
      }
      return true;
    } catch {
      // If check fails, assume it's available and let scan fail naturally
      return true;
    }
  }

  /**
   * Extract QR code from a URL (for deep linking)
   * Supports both https://app.miniminds.com/qr-action/CODE and miniminds://qr-action/CODE
   */
  extractQrCodeFromUrl(url: string): string | null {
    try {
      // Handle custom scheme
      if (url.startsWith('miniminds://')) {
        const parts = url.replace('miniminds://', '').split('/');
        if (parts[0] === 'qr-action' && parts[1]) {
          return parts[1];
        }
        return null;
      }

      // Handle https scheme
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(p => p);

      if (pathParts[0] === 'qr-action' && pathParts[1]) {
        return pathParts[1];
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Check if Google Barcode Scanner module is available (Android only)
   */
  async installGoogleBarcodeModule(): Promise<boolean> {
    if (!this.isNativePlatform()) {
      return true;
    }

    try {
      const result = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
      if (!result.available) {
        await BarcodeScanner.installGoogleBarcodeScannerModule();
        return true;
      }
      return true;
    } catch {
      return false;
    }
  }
}
