import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiConfig } from '../../core/config/api.config';

export interface Reclamation {
  id?: number;
  senderId: string;
  recipientId: string;
  subject: string;
  content: string;
  response?: string;
  isResolved: boolean;
  sentAt?: string | Date;
  resolvedAt?: string | Date;
  sender?: any;
  recipient?: any;
}

export interface ReclamationUser {
  id: string;
  name: string;
  email: string;
  role?: string;
}

@Injectable({ providedIn: 'root' })
export class ReclamationsService {
  private apiUrl = ApiConfig.ENDPOINTS.RECLAMATION;

  constructor(private http: HttpClient) {}

  getSentReclamations(): Observable<Reclamation[]> {
    return this.http.get<Reclamation[]>(`${this.apiUrl}/sent`);
  }

  getReceivedReclamations(): Observable<Reclamation[]> {
    return this.http.get<Reclamation[]>(`${this.apiUrl}/received`);
  }

  getReclamation(id: number): Observable<Reclamation> {
    return this.http.get<Reclamation>(`${this.apiUrl}/${id}`);
  }

  getUsers(): Observable<ReclamationUser[]> {
    return this.http.get<ReclamationUser[]>(`${this.apiUrl}/users`);
  }

  getAdminUser(): Observable<ReclamationUser> {
    return this.http.get<ReclamationUser>(`${this.apiUrl}/admin`);
  }

  sendReclamation(recipientId: string, subject: string, content: string): Observable<any> {
    return this.http.post(`${this.apiUrl}`, { recipientId, subject, content });
  }

  resolveReclamation(id: number, response: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}/resolve`, response);
  }
}