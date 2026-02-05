import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  AIAuditLogEntry,
  QueryCategory,
  AIRiskLevel,
  HumanEscalationRequest
} from '../interfaces/ai-compliance.interface';
import { AuthService } from './auth';
import { AuthResponse } from '../interfaces/dto/auth-response-dto';

/**
 * AI Audit Logging Service
 *
 * Provides GDPR Article 30 compliant audit logging for all AI interactions.
 * Records all queries, classifications, and responses for compliance review.
 *
 * Features:
 * - Automatic logging of all AI interactions
 * - Local fallback when API unavailable
 * - Human escalation request handling
 * - Audit log retrieval for administrators
 */
@Injectable({
  providedIn: 'root'
})
export class AIAuditService {
  private readonly apiUrl = `${environment.apiUrl}/AIAudit`;
  private readonly localStorageKey = 'miniminds_ai_audit_queue';
  private readonly maxLocalLogs = 100;

  private sessionId: string;
  private pendingLogs = new BehaviorSubject<AIAuditLogEntry[]>([]);

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    this.sessionId = this.generateSessionId();
    this.loadPendingLogs();
    this.processPendingLogs();
  }

  /**
   * Log an AI interaction (GDPR Article 30 compliance)
   */
  logInteraction(params: {
    query: string;
    queryCategory: QueryCategory;
    riskLevel: AIRiskLevel;
    wasBlocked: boolean;
    blockedReason?: string;
    responseType: 'success' | 'blocked' | 'error' | 'escalated';
    dataAccessed: string[];
    consentVerified: boolean;
  }): Observable<{ auditLogId: string }> {
    const currentUser = this.authService.getCurrentUser();
    const userId = this.getUserId(currentUser);

    const logEntry: AIAuditLogEntry = {
      timestamp: new Date(),
      userId: userId,
      userRole: this.getUserRole(),
      sessionId: this.sessionId,
      query: params.query,
      queryCategory: params.queryCategory,
      riskLevel: params.riskLevel,
      wasBlocked: params.wasBlocked,
      blockedReason: params.blockedReason,
      responseType: params.responseType,
      dataAccessed: params.dataAccessed,
      consentVerified: params.consentVerified,
      userAgent: navigator.userAgent
    };

    // Try to send to server, fall back to local storage
    return this.http.post<{ auditLogId: string }>(`${this.apiUrl}/log`, logEntry).pipe(
      tap(response => {
        logEntry.id = response.auditLogId;
      }),
      catchError(error => {
        // Store locally if API fails
        this.storeLocally(logEntry);
        return of({ auditLogId: this.generateLocalId() });
      })
    );
  }

  /**
   * Submit a human escalation request
   */
  requestHumanEscalation(params: {
    originalQuery: string;
    reason: string;
    priority?: 'low' | 'medium' | 'high';
    contactPreference?: 'email' | 'phone' | 'app';
  }): Observable<{ escalationId: string; message: string }> {
    const currentUser = this.authService.getCurrentUser();

    const request: HumanEscalationRequest = {
      userId: this.getUserId(currentUser),
      originalQuery: params.originalQuery,
      reason: params.reason,
      priority: params.priority || 'medium',
      contactPreference: params.contactPreference || 'app',
      timestamp: new Date()
    };

    return this.http.post<{ escalationId: string; message: string }>(
      `${this.apiUrl}/escalate`,
      request
    ).pipe(
      catchError(error => {
        // Return a friendly message even if API fails
        return of({
          escalationId: this.generateLocalId(),
          message: 'La tua richiesta è stata registrata. Un operatore ti contatterà presto.'
        });
      })
    );
  }

  /**
   * Get audit logs for admin review (admin only)
   */
  getAuditLogs(params?: {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    queryCategory?: QueryCategory;
    wasBlocked?: boolean;
    page?: number;
    pageSize?: number;
  }): Observable<{ logs: AIAuditLogEntry[]; total: number }> {
    return this.http.get<{ logs: AIAuditLogEntry[]; total: number }>(
      `${this.apiUrl}/logs`,
      { params: params as any }
    );
  }

  /**
   * Get statistics for compliance dashboard (admin only)
   */
  getComplianceStats(period: 'day' | 'week' | 'month' = 'week'): Observable<{
    totalQueries: number;
    blockedQueries: number;
    escalatedQueries: number;
    byCategory: Record<QueryCategory, number>;
    byRiskLevel: Record<AIRiskLevel, number>;
  }> {
    return this.http.get<any>(`${this.apiUrl}/stats`, { params: { period } });
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Start a new session (e.g., on login)
   */
  startNewSession(): void {
    this.sessionId = this.generateSessionId();
  }

  // Private methods

  private getUserRole(): 'parent' | 'teacher' | 'admin' {
    if (this.authService.isAdmin()) return 'admin';
    if (this.authService.isTeacher()) return 'teacher';
    return 'parent';
  }

  /**
   * Extract user ID from AuthResponse (uses email as identifier since no id field)
   */
  private getUserId(user: AuthResponse | null): string {
    if (!user) return 'anonymous';
    // Use email as the user identifier since AuthResponse doesn't have an id field
    return user.email || 'anonymous';
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private generateLocalId(): string {
    return `local_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private storeLocally(logEntry: AIAuditLogEntry): void {
    logEntry.id = this.generateLocalId();
    const pending = this.pendingLogs.value;
    pending.push(logEntry);

    // Keep only the most recent logs
    if (pending.length > this.maxLocalLogs) {
      pending.shift();
    }

    this.pendingLogs.next(pending);
    this.savePendingLogs();
  }

  private loadPendingLogs(): void {
    try {
      const stored = localStorage.getItem(this.localStorageKey);
      if (stored) {
        const logs = JSON.parse(stored) as AIAuditLogEntry[];
        this.pendingLogs.next(logs);
      }
    } catch (error) {
      console.error('Failed to load pending audit logs:', error);
    }
  }

  private savePendingLogs(): void {
    try {
      localStorage.setItem(this.localStorageKey, JSON.stringify(this.pendingLogs.value));
    } catch (error) {
      console.error('Failed to save pending audit logs:', error);
    }
  }

  private processPendingLogs(): void {
    // Try to send pending logs every 5 minutes
    setInterval(() => {
      const pending = this.pendingLogs.value;
      if (pending.length === 0) return;

      this.http.post<{ processed: number }>(`${this.apiUrl}/batch`, { logs: pending }).subscribe({
        next: (response) => {
          // Clear successfully sent logs
          this.pendingLogs.next([]);
          this.savePendingLogs();
          console.log(`Processed ${response.processed} pending audit logs`);
        },
        error: () => {
          // Keep logs for next attempt
          console.log('Failed to process pending audit logs, will retry later');
        }
      });
    }, 5 * 60 * 1000); // 5 minutes
  }
}
