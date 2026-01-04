import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiConfig } from '../../core/config/api.config';
import {
  QrCheckInRequest,
  QrCheckOutRequest,
  QrAttendanceResult,
  QrCodeInfo,
  QrValidationResponse,
  SchoolSettings,
  ChildAttendanceStatus
} from './qr-checkin.interface';

@Injectable({
  providedIn: 'root'
})
export class QrCheckinService {
  private attendanceUrl = ApiConfig.ENDPOINTS.ATTENDANCE;
  private qrCodeUrl = `${ApiConfig.BASE_URL}/qrcode`;

  constructor(private http: HttpClient) {}

  /**
   * Perform QR check-in for children
   */
  qrCheckIn(request: QrCheckInRequest): Observable<QrAttendanceResult> {
    return this.http.post<QrAttendanceResult>(`${this.attendanceUrl}/QrCheckIn`, request);
  }

  /**
   * Perform QR check-out for children
   */
  qrCheckOut(request: QrCheckOutRequest): Observable<QrAttendanceResult> {
    return this.http.post<QrAttendanceResult>(`${this.attendanceUrl}/QrCheckOut`, request);
  }

  /**
   * Get my children's attendance status for today
   */
  getMyChildrenStatus(): Observable<ChildAttendanceStatus[]> {
    return this.http.get<ChildAttendanceStatus[]>(`${this.attendanceUrl}/MyChildren`);
  }

  /**
   * Validate a QR code
   */
  validateQrCode(code: string): Observable<QrValidationResponse> {
    return this.http.get<QrValidationResponse>(`${this.qrCodeUrl}/Validate/${encodeURIComponent(code)}`);
  }

  /**
   * Get school settings (for geofencing)
   */
  getSchoolSettings(): Observable<SchoolSettings> {
    return this.http.get<SchoolSettings>(`${this.qrCodeUrl}/Settings`);
  }

  /**
   * Get check-in QR code (admin)
   */
  getCheckInQrCode(): Observable<QrCodeInfo> {
    return this.http.get<QrCodeInfo>(`${this.qrCodeUrl}/CheckIn`);
  }

  /**
   * Get check-out QR code (admin)
   */
  getCheckOutQrCode(): Observable<QrCodeInfo> {
    return this.http.get<QrCodeInfo>(`${this.qrCodeUrl}/CheckOut`);
  }

  /**
   * Regenerate all QR codes (admin)
   */
  regenerateQrCodes(): Observable<{ checkIn: QrCodeInfo; checkOut: QrCodeInfo }> {
    return this.http.post<{ checkIn: QrCodeInfo; checkOut: QrCodeInfo }>(`${this.qrCodeUrl}/RegenerateAll`, {});
  }

  /**
   * Update school settings (admin)
   */
  updateSchoolSettings(settings: Partial<SchoolSettings>): Observable<SchoolSettings> {
    return this.http.put<SchoolSettings>(`${this.qrCodeUrl}/Settings`, settings);
  }
}
