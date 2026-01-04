import { Injectable, Injector } from '@angular/core';
import { AuthResponse } from '../interfaces/dto/auth-response-dto';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { LoginRequest } from '../interfaces/dto/login-request-dto';
import { RegisterRequest } from '../interfaces/dto/register-request-dto';
import { ApiConfig } from '../../core/config/api.config';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = ApiConfig.ENDPOINTS.AUTH;
  private currentUserSubject = new BehaviorSubject<AuthResponse | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    private injector: Injector
  ) {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      this.currentUserSubject.next(JSON.parse(storedUser));
    }
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => {
        localStorage.setItem('currentUser', JSON.stringify(response));
        localStorage.setItem('token', response.token);
        
        // Extract and store userId from JWT token
        try {
          const payload = JSON.parse(atob(response.token.split('.')[1]));
          // Use the nameidentifier claim which contains the GUID
          const userId = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || payload.nameid || payload.sub;
          if (userId) {
            localStorage.setItem('userId', userId);
          }
        } catch (e) {
          console.error('Failed to extract userId from token', e);
        }
        
        this.currentUserSubject.next(response);
      })
    );
  }

  register(data: RegisterRequest): Observable<any> {
    // Hit the real ASP.NET Core endpoint for DB-backed signup
    return this.http.post(`${this.apiUrl}/register`, data);
  }

  async logout(): Promise<void> {
    // Unregister FCM push notifications before logout
    try {
      const { FcmPushNotificationService } = await import('./fcm-push-notification.service');
      const fcmService = this.injector.get(FcmPushNotificationService);
      if (fcmService.isSupported()) {
        await fcmService.unregister();
      }
    } catch (error) {
      console.error('Error unregistering push notifications:', error);
    }

    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      // Decode the payload (middle part of JWT)
      const payload = JSON.parse(atob(token.split('.')[1]));

      // exp is in seconds, Date.now() is in milliseconds
      const expiryTime = payload.exp * 1000;

      // Check if token expires in the future (with 60 second buffer)
      return expiryTime > (Date.now() + 60000);
    } catch {
      // If token is malformed, consider it invalid
      return false;
    }
  }

  getCurrentUser(): AuthResponse | null {
    return this.currentUserSubject.value;
  }

  updateCurrentUser(user: AuthResponse): void {
    localStorage.setItem('currentUser', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  getUserRole(): string | null {
    const user = this.getCurrentUser();
    return user?.role || null;
  }

  getParentId(): number | null {
    const user = this.getCurrentUser();
    if (!user?.token) return null;
    
    try {
      const payload = JSON.parse(atob(user.token.split('.')[1]));
      return payload.ParentId ? parseInt(payload.ParentId) : null;
    } catch {
      return null;
    }
  }

  getTeacherId(): number | null {
    const user = this.getCurrentUser();
    if (!user?.token) return null;
    
    try {
      const payload = JSON.parse(atob(user.token.split('.')[1]));
      return payload.TeacherId ? parseInt(payload.TeacherId) : null;
    } catch {
      return null;
    }
  }

  isAdmin(): boolean {
    return this.getUserRole() === 'Admin';
  }

  isParent(): boolean {
    return this.getUserRole() === 'Parent';
  }

  isTeacher(): boolean {
    return this.getUserRole() === 'Teacher';
  }

  getUserId(): string | null {
    return localStorage.getItem('userId');
  }

  updateLanguage(language: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/update-language`, { Language: language }).pipe(
      tap(() => {
        const user = this.getCurrentUser();
        if (user) {
          const updated: AuthResponse = { ...user, preferredLanguage: language };
          this.updateCurrentUser(updated);
        }
        localStorage.setItem('lang', language);
      })
    );
  }

  updateProfilePicture(profilePicture: string): void {
    const user = this.getCurrentUser();
    if (user) {
      const updated: AuthResponse = { ...user, profilePicture };
      this.updateCurrentUser(updated);
    }
  }
}
