export interface Attendance {
  id: number;
  childId: number;
  checkInTime: string;
  checkOutTime?: string;
  date: string;
  checkInNotes?: string;
  checkOutNotes?: string;
  createdAt: string;
  updatedAt?: string;
  child?: {
    id: number;
    firstName: string;
    lastName: string;
    profilePictureUrl?: string | null; // File-based URL (preferred)
    profilePicture?: string | null;     // Base64 fallback
    parent?: {
      firstName: string;
      lastName: string;
    };
  };
}

export interface AttendanceStats {
  totalPresent: number;
  totalAbsent: number;
  checkInsToday: number;
  checkOutsToday: number;
}