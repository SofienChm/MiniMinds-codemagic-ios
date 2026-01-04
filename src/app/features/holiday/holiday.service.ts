import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { Holiday } from './holiday.interface';
import { ApiConfig } from '../../core/config/api.config';

@Injectable({
  providedIn: 'root'
})
export class HolidayService {
  private apiUrl = ApiConfig.ENDPOINTS.HOLIDAYS;
  private holidaysSubject = new BehaviorSubject<Holiday[]>([]);
  public holidays$ = this.holidaysSubject.asObservable();

  constructor(private http: HttpClient) {}

  getHolidays(): Observable<Holiday[]> {
    return this.http.get<Holiday[]>(this.apiUrl);
  }

  getHoliday(id: number): Observable<Holiday> {
    return this.http.get<Holiday>(`${this.apiUrl}/${id}`);
  }

  createHoliday(holiday: Holiday): Observable<Holiday> {
    return this.http.post<Holiday>(this.apiUrl, holiday);
  }

  updateHoliday(id: number, holiday: Holiday): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, holiday);
  }

  deleteHoliday(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  refreshHolidays(): void {
    this.getHolidays().subscribe(holidays => {
      this.holidaysSubject.next(holidays);
    });
  }
}