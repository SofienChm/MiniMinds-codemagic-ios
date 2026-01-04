import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiConfig } from '../config/api.config';

export interface DashboardStats {
  totalChildren: number;
  activeChildren: number;
  totalParents: number;
  totalEvents: number;
  boysCount: number;
  girlsCount: number;
  newChildrenThisMonth: number;
}

export interface ChildSummary {
  firstName: string;
  lastName: string;
  gender?: string;
  parentName?: string;
  parentPhoneNumber?: string;
  createdAt: string;
}

export interface ChildWithAttendance {
  id: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender?: string;
  isActive: boolean;
  hasProfilePicture: boolean;
  todayAttendance?: {
    checkInTime?: string;
    checkOutTime?: string;
  };
}

export interface EventSummary {
  id: number;
  title: string;
  timeString: string;
  location?: string;
}

export interface DailyAttendance {
  date: string;
  presentCount: number;
}

export interface LeaveSummary {
  id: number;
  childId: number;
  childName: string;
  startDate: string;
  endDate: string;
  leaveType: string;
}

export interface FeeSummary {
  id: number;
  childId: number;
  childName: string;
  amount: number;
  dueDate: string;
  status: string;
}

export interface ActivitySummary {
  id: number;
  activityType: string;
  activityTime: string;
  duration?: string;
  notes?: string;
}

export interface AdminDashboardData {
  stats: DashboardStats;
  recentChildren: ChildSummary[];
  upcomingEvents: EventSummary[];
  weeklyAttendance: DailyAttendance[];
  upcomingLeaves: LeaveSummary[];
  unpaidFees: FeeSummary[];
}

export interface ParentDashboardData {
  parent?: {
    id: number;
    firstName: string;
    lastName: string;
    profilePicture?: string;
  };
  children: ChildWithAttendance[];
  upcomingEvents: EventSummary[];
  todayActivities: ActivitySummary[];
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = `${ApiConfig.BASE_URL}/dashboard`;

  constructor(private http: HttpClient) {}

  getAdminDashboard(): Observable<AdminDashboardData> {
    return this.http.get<AdminDashboardData>(`${this.apiUrl}/admin`);
  }

  getParentDashboard(): Observable<ParentDashboardData> {
    return this.http.get<ParentDashboardData>(`${this.apiUrl}/parent`);
  }
}
