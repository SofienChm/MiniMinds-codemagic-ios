export interface QrCheckInRequest {
  qrCode: string;
  childIds: number[];
  latitude: number;
  longitude: number;
  notes?: string;
}

export interface QrCheckOutRequest {
  qrCode: string;
  childIds: number[];
  latitude: number;
  longitude: number;
  notes?: string;
}

export interface AttendanceResultItem {
  childId: number;
  childName: string;
  success: boolean;
  message: string;
  attendanceId?: number;
}

export interface QrAttendanceResult {
  success: boolean;
  message: string;
  results: AttendanceResultItem[];
}

export interface QrCodeInfo {
  id: number;
  code: string;
  type: string;
  isActive: boolean;
  createdAt: string;
}

export interface QrValidationResponse {
  isValid: boolean;
  type: string;
  message?: string;
}

export interface SchoolSettings {
  id: number;
  schoolName: string;
  latitude: number;
  longitude: number;
  geofenceRadiusMeters: number;
  geofenceEnabled: boolean;
}

export interface ChildAttendanceStatus {
  id: number;
  firstName: string;
  lastName: string;
  profilePicture?: string;
  isCheckedIn: boolean;
  isCheckedOut: boolean;
  checkInTime?: string;
  checkOutTime?: string;
  attendanceId?: number;
}
