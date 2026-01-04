import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { Attendance, AttendanceStats } from './attendance.interface';

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  private apiUrl = `${environment.apiUrl}/attendance`;

  constructor(private http: HttpClient) {}

  getTodayAttendance(): Observable<Attendance[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.http.get<Attendance[]>(`${this.apiUrl}/ByDate?date=${today}`);
  }

  getTodayStats(): Observable<AttendanceStats> {
    return this.http.get<AttendanceStats>(`${this.apiUrl}/Today`);
  }

  checkIn(childId: number, notes?: string): Observable<Attendance> {
    return this.http.post<Attendance>(`${this.apiUrl}/CheckIn`, {
      childId,
      checkInNotes: notes
    });
  }

  checkOut(attendanceId: number, notes?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/CheckOut/${attendanceId}`, notes);
  }

  getAttendanceByDate(date: string): Observable<Attendance[]> {
    return this.http.get<Attendance[]>(`${this.apiUrl}/ByDate?date=${date}`);
  }
}