import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiConfig } from '../../core/config/api.config';

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  private apiUrl = ApiConfig.ENDPOINTS.ATTENDANCE;

  constructor(private http: HttpClient) {}

  getWeeklyAttendance(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/weekly`);
  }

  getAllAttendance(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}`);
  }

  getTodayAttendance(): Observable<any> {
    const today = new Date().toISOString().split('T')[0];
    return this.http.get<any>(`${this.apiUrl}/ByDate?date=${today}`);
  }
}
