import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiConfig } from '../config/api.config';

@Injectable({
  providedIn: 'root'
})
export class PasswordResetService {
  private apiUrl = `${ApiConfig.BASE_URL}/PasswordReset`;

  constructor(private http: HttpClient) {}

  resetPassword(email: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset`, {
      email,
      newPassword
    });
  }
}