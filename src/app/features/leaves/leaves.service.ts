import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface LeaveRequestModel {
  id: number;
  teacherId: number;
  startDate: string; // ISO date
  endDate: string;   // ISO date
  days: number;
  reason?: string;
  leaveType: 'Annual' | 'Medical' | 'Emergency';
  status: 'Pending' | 'Approved' | 'Rejected';
  requestedAt: string;
  approvedAt?: string | null;
  approvedByUserId?: string | null;
  teacher?: { id: number; firstName: string; lastName: string; email: string; profilePicture?: string };
}

export interface CreateLeaveRequestDto {
  startDate: string; // ISO date
  endDate: string;   // ISO date
  reason?: string;
  leaveType?: 'Annual' | 'Medical' | 'Emergency';
}

export interface LeaveBalanceDto {
  annualAllocation: number;
  annualUsedDays: number;
  annualRemainingDays: number;
  medicalAllocation: number;
  medicalUsedDays: number;
  medicalRemainingDays: number;
}

import { ApiConfig } from '../../core/config/api.config';

@Injectable({ providedIn: 'root' })
export class LeavesService {
  private apiUrl = ApiConfig.ENDPOINTS.LEAVES;

  constructor(private http: HttpClient) {}

  requestLeave(dto: CreateLeaveRequestDto): Observable<LeaveRequestModel> {
    return this.http.post<LeaveRequestModel>(`${this.apiUrl}/request`, dto);
  }

  getMyLeaves(): Observable<LeaveRequestModel[]> {
    return this.http.get<LeaveRequestModel[]>(`${this.apiUrl}/my`);
  }

  getAllLeaves(status?: 'All' | 'Pending' | 'Approved' | 'Rejected'): Observable<LeaveRequestModel[]> {
    const url = status ? `${this.apiUrl}?status=${status}` : this.apiUrl;
    return this.http.get<LeaveRequestModel[]>(url);
  }

  approveLeave(id: number): Observable<LeaveRequestModel> {
    return this.http.put<LeaveRequestModel>(`${this.apiUrl}/${id}/approve`, {});
  }

  rejectLeave(id: number): Observable<LeaveRequestModel> {
    return this.http.put<LeaveRequestModel>(`${this.apiUrl}/${id}/reject`, {});
  }

  getMyBalance(): Observable<LeaveBalanceDto> {
    return this.http.get<LeaveBalanceDto>(`${this.apiUrl}/balance`);
  }

  // Admin: create a leave for a specific teacher
  adminCreateLeave(
    teacherId: number,
    dto: CreateLeaveRequestDto & { approve?: boolean }
  ): Observable<LeaveRequestModel> {
    const payload = { teacherId, ...dto } as any;
    if (dto.approve !== undefined) payload.approve = dto.approve;
    return this.http.post<LeaveRequestModel>(`${this.apiUrl}/admin/create`, payload);
  }
}