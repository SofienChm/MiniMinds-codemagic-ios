import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiConfig } from '../../core/config/api.config';

export interface AppointmentModel {
  id: number;
  parentId: number;
  parentName?: string;
  childId?: number;
  childName?: string;
  teacherId?: number;
  teacherName?: string;
  title: string;
  description?: string;
  type: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Completed' | 'Cancelled';
  notes?: string;
  rejectionReason?: string;
  processedAt?: string;
  createdAt: string;
}

export interface CreateAppointmentDto {
  childId?: number;
  teacherId?: number;
  title: string;
  description?: string;
  type: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
}

export interface UpdateAppointmentDto {
  childId?: number;
  teacherId?: number;
  title: string;
  description?: string;
  type: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
}

export interface ProcessAppointmentDto {
  notes?: string;
  rejectionReason?: string;
}

export interface TeacherOption {
  id: number;
  fullName: string;
  firstName: string;
  lastName: string;
}

@Injectable({ providedIn: 'root' })
export class AppointmentsService {
  private apiUrl = ApiConfig.ENDPOINTS.APPOINTMENTS;

  private appointmentsSubject = new BehaviorSubject<AppointmentModel[]>([]);
  public appointments$ = this.appointmentsSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Parent: Request a new appointment
  requestAppointment(dto: CreateAppointmentDto): Observable<AppointmentModel> {
    return this.http.post<AppointmentModel>(`${this.apiUrl}/request`, dto);
  }

  // Parent: Get my appointments
  getMyAppointments(status?: string): Observable<AppointmentModel[]> {
    const url = status && status !== 'All'
      ? `${this.apiUrl}/my?status=${status}`
      : `${this.apiUrl}/my`;
    return this.http.get<AppointmentModel[]>(url);
  }

  // Parent: Update my pending appointment
  updateMyAppointment(id: number, dto: UpdateAppointmentDto): Observable<AppointmentModel> {
    return this.http.put<AppointmentModel>(`${this.apiUrl}/my/${id}`, dto);
  }

  // Parent: Cancel my appointment
  cancelMyAppointment(id: number): Observable<AppointmentModel> {
    return this.http.put<AppointmentModel>(`${this.apiUrl}/my/${id}/cancel`, {});
  }

  // Admin/Teacher: Get all appointments
  getAllAppointments(status?: string, teacherId?: number): Observable<AppointmentModel[]> {
    let url = this.apiUrl;
    const params: string[] = [];

    if (status && status !== 'All') {
      params.push(`status=${status}`);
    }
    if (teacherId) {
      params.push(`teacherId=${teacherId}`);
    }

    if (params.length > 0) {
      url += '?' + params.join('&');
    }

    return this.http.get<AppointmentModel[]>(url).pipe(
      tap(appointments => this.appointmentsSubject.next(appointments))
    );
  }

  // Get appointment by ID
  getAppointmentById(id: number): Observable<AppointmentModel> {
    return this.http.get<AppointmentModel>(`${this.apiUrl}/${id}`);
  }

  // Admin/Teacher: Approve appointment
  approveAppointment(id: number, dto?: ProcessAppointmentDto): Observable<AppointmentModel> {
    return this.http.put<AppointmentModel>(`${this.apiUrl}/${id}/approve`, dto || {});
  }

  // Admin/Teacher: Reject appointment
  rejectAppointment(id: number, dto?: ProcessAppointmentDto): Observable<AppointmentModel> {
    return this.http.put<AppointmentModel>(`${this.apiUrl}/${id}/reject`, dto || {});
  }

  // Admin/Teacher: Mark appointment as completed
  completeAppointment(id: number, dto?: ProcessAppointmentDto): Observable<AppointmentModel> {
    return this.http.put<AppointmentModel>(`${this.apiUrl}/${id}/complete`, dto || {});
  }

  // Admin: Delete appointment
  deleteAppointment(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Get appointment types
  getTypes(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/types`);
  }

  // Parent: Get available teachers for booking
  getAvailableTeachers(): Observable<TeacherOption[]> {
    return this.http.get<TeacherOption[]>(`${this.apiUrl}/available-teachers`);
  }

  // Refresh appointments list
  refreshAppointments(status?: string): void {
    this.getAllAppointments(status).subscribe();
  }
}
