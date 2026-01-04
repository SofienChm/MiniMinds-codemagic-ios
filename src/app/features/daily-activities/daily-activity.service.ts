import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { DailyActivity } from './daily-activity.interface';
import { ApiConfig } from '../../core/config/api.config';

@Injectable({
  providedIn: 'root'
})
export class DailyActivityService {
  private apiUrl = ApiConfig.ENDPOINTS.DAILY_ACTIVITIES;

  constructor(private http: HttpClient) {}

  getActivities(date?: string): Observable<DailyActivity[]> {
    if (date) {
      return this.http.get<DailyActivity[]>(`${this.apiUrl}/ByDate?date=${date}`);
    }
    return this.http.get<DailyActivity[]>(this.apiUrl);
  }

  getActivitiesByChild(childId: number, date?: string): Observable<DailyActivity[]> {
    if (date) {
      return this.http.get<DailyActivity[]>(`${this.apiUrl}/ByDate?date=${date}`)
        .pipe(
          map((activities: DailyActivity[]) => 
            activities.filter(a => a.childId === childId)
          )
        );
    }
    return this.http.get<DailyActivity[]>(`${this.apiUrl}/ByChild/${childId}`);
  }

  getActivity(id: number): Observable<DailyActivity> {
    return this.http.get<DailyActivity>(`${this.apiUrl}/${id}`);
  }

  addActivity(activity: DailyActivity): Observable<DailyActivity> {
    return this.http.post<DailyActivity>(this.apiUrl, activity);
  }

  updateActivity(activity: DailyActivity): Observable<DailyActivity> {
    return this.http.put<DailyActivity>(`${this.apiUrl}/${activity.id}`, activity);
  }

  deleteActivity(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
