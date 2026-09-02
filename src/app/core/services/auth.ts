import { Injectable, Injector } from '@angular/core';
import { AuthResponse } from '../interfaces/dto/auth-response-dto';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, throwError, firstValueFrom } from 'rxjs';
import { LoginRequest } from '../interfaces/dto/login-request-dto';
import { RegisterRequest } from '../interfaces/dto/register-request-dto';
import { ApiConfig } from '../../core/config/api.config';

// Single-flight guard so concurrent trySilentRefresh() calls share one refresh
// request instead of double-submitting (the backend rotates/revokes tokens).
let silentRefreshInFlight: Promise<boolean> | null = null;

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = ApiConfig.ENDPOINTS.AUTH;
  private mailApiUrl = ApiConfig.ENDPOINTS.MAIL;
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

    sendPasswordResetEmail(email: string): Observable<any> {
      return this.http.post(`${this.mailApiUrl}/send-password-reset`, { email });
    }
  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(async response => {
        // Store token and user FIRST (synchronously) so the auth guard passes on navigation
        localStorage.setItem('currentUser', JSON.stringify(response));
        localStorage.setItem('token', response.token);
        if (response.refreshToken) {
          localStorage.setItem('refreshToken', response.refreshToken);
        }

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

        // Unregister FCM for the PREVIOUS user BEFORE emitting the new one.
        // Order matters: emitting first triggers app.ts's initialize() while the
        // FCM service is still flagged `initialized` from the prior session, so
        // it would silently skip and never re-bind the token to the new user.
        // Unregistering first resets that state so initialize() re-registers
        // the device token under the new user's identity.
        const existingUser = this.getCurrentUser();
        if (existingUser) {
          try {
            const { FcmPushNotificationService } = await import('./fcm-push-notification.service');
            const fcmService = this.injector.get(FcmPushNotificationService);
            if (fcmService.isSupported()) {
              await fcmService.unregister();
            }
          } catch (error) {
            console.error('Error unregistering FCM on account switch:', error);
          }
        }

        this.currentUserSubject.next(response);

        // Pre-load tenant features for non-SuperAdmin users
        // This ensures features are loaded before navigation and sidebar rendering
        if (response.role !== 'SuperAdmin') {
          try {
            const { TenantFeatureService } = await import('./tenant-feature.service');
            const featureService = this.injector.get(TenantFeatureService);
            featureService.getMyFeatures().subscribe({
              next: () => console.log('Tenant features loaded successfully'),
              error: (err) => console.error('Failed to load tenant features:', err)
            });
          } catch (error) {
            console.error('Error loading tenant features:', error);
          }
        }
      })
    );
  }

  register(data: RegisterRequest): Observable<any> {
    // Hit the real ASP.NET Core endpoint for DB-backed signup
    return this.http.post(`${this.apiUrl}/register`, data);
  }

  async logout(): Promise<void> {
    // Revoke the refresh token server-side (best-effort)
    const refreshToken = this.getRefreshToken();
    if (refreshToken) {
      try {
        await firstValueFrom(this.http.post(`${this.apiUrl}/logout`, { refreshToken }));
      } catch (error) {
        console.error('Error revoking refresh token:', error);
      }
    }

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

    // Clear tenant feature cache on logout
    try {
      const { TenantFeatureService } = await import('./tenant-feature.service');
      const featureService = this.injector.get(TenantFeatureService);
      featureService.clearCache();
    } catch (error) {
      console.error('Error clearing feature cache:', error);
    }

    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userId');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  /**
   * Exchange the refresh token for a new access + refresh token pair.
   * Called by the auth interceptor when the access token is expired or a 401 is received.
   */
  refreshSession(): Observable<AuthResponse> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }
    return this.http.post<AuthResponse>(`${this.apiUrl}/refresh`, { refreshToken }).pipe(
      tap(response => {
        localStorage.setItem('currentUser', JSON.stringify(response));
        localStorage.setItem('token', response.token);
        if (response.refreshToken) {
          localStorage.setItem('refreshToken', response.refreshToken);
        }
        this.currentUserSubject.next(response);
      })
    );
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (token) {
      try {
        // Decode the payload (middle part of JWT)
        const payload = JSON.parse(atob(token.split('.')[1]));

        // exp is in seconds, Date.now() is in milliseconds
        const expiryTime = payload.exp * 1000;

        // Check if token expires in the future (with 60 second buffer)
        if (expiryTime > (Date.now() + 60000)) {
          return true;
        }
      } catch {
        // If token is malformed, fall through to the refresh-token check below
      }
    }

    // Access token is missing/expired, but a refresh token can silently renew the session
    return !!this.getRefreshToken();
  }

  /**
   * True when the access token is expired (or nearly so) but a refresh token is
   * still available to recover the session. Used to decide whether a proactive
   * refresh is needed on app startup/resume.
   */
  isAccessTokenExpiredWithRefreshAvailable(): boolean {
    const token = this.getToken();
    if (!token) {
      return !!this.getRefreshToken();
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiryTime = payload.exp * 1000;
      // Sixty-second buffer: treat as expired a bit before the hard limit
      return expiryTime <= (Date.now() + 60000);
    } catch {
      return true;
    }
  }

  /**
   * Best-effort silent session renewal. Refreshes the access token when it is
   * expired/missing but a refresh token exists, so the user never gets logged out.
   *
   * Hardened so a user is ONLY logged out when the session is genuinely gone
   * (refresh token truly expired/revoked by the server). Transient network or
   * server errors NEVER clear the session - they are retried, and if the device
   * is offline the existing (expired) tokens are kept so the user stays on the
   * app and is re-synced once connectivity returns.
   *
   * Resolves true when the session is healthy/recoverable, false only when the
   * refresh token is genuinely invalid (so callers may fall back to logout).
   */
  async trySilentRefresh(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return false;
    }
    // Access token still valid - nothing to do
    if (!this.isAccessTokenExpiredWithRefreshAvailable()) {
      return true;
    }

    const { NetworkService } = await import('./network.service');
    const network = this.injector.get(NetworkService);
    if (!network.isConnected) {
      // Offline - never log the user out. Keep the local session so they stay in
      // the app and will be re-authenticated seamlessly when connectivity returns.
      console.warn('[Auth] Offline - keeping session, will refresh when back online');
      return true;
    }

    // The backend rotates tokens. Guard the request against double-submit from
    // any in-flight refresh so a concurrent call doesn't use a just-revoked token.
    const promise = (() => {
      if (silentRefreshInFlight) {
        return silentRefreshInFlight;
      }
      const p = this.performSilentRefresh();
      silentRefreshInFlight = p.finally(() => (silentRefreshInFlight = null));
      return silentRefreshInFlight;
    })();

    return promise;
  }

  /**
   * Execute a refresh session with retry/backoff. Never clears the session on
   * network/server errors - only when the server definitively rejects the token
   * (i.e. it is truly expired or revoked).
   */
  private async performSilentRefresh(): Promise<boolean> {
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await firstValueFrom(this.refreshSession());
        return true;
      } catch (error: any) {
        const status = error?.status;
        const isNetworkError = status === 0 || error instanceof ErrorEvent;

        if (status === 401 || status === 400) {
          // Server definitively rejected the token - session is truly gone.
          // Only now is it safe (and correct) to log the user out.
          console.error('[Auth] Refresh token rejected by server, session expired:', error);
          this.clearSession();
          return false;
        }

        // Network or server hiccup (5xx, timeout, offline). Do NOT log out.
        console.warn(`[Auth] Silent refresh attempt ${attempt}/${maxAttempts} failed`, error);
        if (attempt < maxAttempts) {
          const delayMs = 1000 * Math.pow(2, attempt - 1); // 1s, 2s backoff
          await this.delay(delayMs);
        } else {
          // Give up for now but keep the session so a later refresh can recover.
          console.warn('[Auth] Silent refresh retries exhausted - keeping session for later recovery');
          return true;
        }
      }
    }
    return true;
  }

  private clearSession(): void {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userId');
    this.currentUserSubject.next(null);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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

  isSuperAdmin(): boolean {
    return this.getUserRole() === 'SuperAdmin';
  }

  getTenantId(): number | null {
    const user = this.getCurrentUser();
    return user?.tenantId || null;
  }

  getTenantName(): string | null {
    const user = this.getCurrentUser();
    return user?.tenantName || null;
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

  /**
   * Delete user account and all associated data (Google Play Store requirement)
   */
  deleteAccount(): Observable<any> {
    return this.http.delete(`${this.apiUrl}/delete-account`).pipe(
      tap(async () => {
        // Unregister FCM push notifications
        try {
          const { FcmPushNotificationService } = await import('./fcm-push-notification.service');
          const fcmService = this.injector.get(FcmPushNotificationService);
          if (fcmService.isSupported()) {
            await fcmService.unregister();
          }
        } catch (error) {
          console.error('Error unregistering push notifications:', error);
        }

        // Clear all local data
        localStorage.removeItem('currentUser');
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userId');
        localStorage.removeItem('lang');
        this.currentUserSubject.next(null);
        this.router.navigate(['/login']);
      })
    );
  }
}
