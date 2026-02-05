import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiConfig } from '../config/api.config';

export interface NotificationPreference {
  notificationType: string;
  name: string;
  description: string;
  isEnabled: boolean;
  isCore: boolean;
}

export interface NotificationPreferencesResponse {
  userId: string;
  preferences: NotificationPreference[];
}

export interface UpdatePreferencesRequest {
  preferences: { notificationType: string; isEnabled: boolean }[];
}

@Injectable({
  providedIn: 'root'
})
export class NotificationPreferencesService {
  private http = inject(HttpClient);
  private apiUrl = ApiConfig.ENDPOINTS.NOTIFICATION_PREFERENCES;

  private preferencesSubject = new BehaviorSubject<NotificationPreference[]>([]);
  public preferences$ = this.preferencesSubject.asObservable();

  /**
   * Get current user's notification preferences
   */
  getPreferences(): Observable<NotificationPreferencesResponse> {
    return this.http.get<NotificationPreferencesResponse>(this.apiUrl).pipe(
      tap(response => this.preferencesSubject.next(response.preferences))
    );
  }

  /**
   * Update notification preferences
   */
  updatePreferences(preferences: UpdatePreferencesRequest): Observable<NotificationPreferencesResponse> {
    return this.http.put<NotificationPreferencesResponse>(this.apiUrl, preferences).pipe(
      tap(response => this.preferencesSubject.next(response.preferences))
    );
  }

  /**
   * Get all available notification types
   */
  getAvailableTypes(): Observable<NotificationPreference[]> {
    return this.http.get<NotificationPreference[]>(`${this.apiUrl}/types`);
  }

  /**
   * Check if a specific notification type is enabled
   */
  checkPreference(notificationType: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/check/${notificationType}`);
  }
}
