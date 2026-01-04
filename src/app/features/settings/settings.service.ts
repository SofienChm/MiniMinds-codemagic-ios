import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AppSetting {
  id: number;
  key: string;
  value: string;
  updatedAt: string;
}

import { ApiConfig } from '../../core/config/api.config';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private apiUrl = ApiConfig.ENDPOINTS.SETTINGS;

  constructor(private http: HttpClient) {}

  getAll(): Observable<AppSetting[]> {
    return this.http.get<AppSetting[]>(this.apiUrl);
  }

  getByKey(key: string): Observable<AppSetting> {
    return this.http.get<AppSetting>(`${this.apiUrl}/${key}`);
  }

  update(key: string, value: string): Observable<AppSetting> {
    return this.http.put<AppSetting>(`${this.apiUrl}/${key}`, { value });
  }
}
