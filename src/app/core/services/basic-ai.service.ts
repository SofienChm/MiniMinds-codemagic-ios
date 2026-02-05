import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { QueryCategory } from '../interfaces/ai-compliance.interface';
import { AIQueryClassifierService } from './ai-query-classifier.service';
import { AIAuditService } from './ai-audit.service';

export interface BasicAIMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  data?: any;
  // Compliance metadata
  compliance?: {
    queryCategory: QueryCategory;
    wasBlocked: boolean;
  };
}

export interface BasicAIQueryRequest {
  query: string;
}

export interface BasicAIResponse {
  success: boolean;
  response?: {
    message: string;
    data?: any;
  };
  message?: string;
}

/**
 * Basic AI Service with GDPR & EU AI Act Compliance
 *
 * Pattern-matching based AI with compliance guardrails.
 */
@Injectable({
  providedIn: 'root'
})
export class BasicAIService {
  private apiUrl = `${environment.apiUrl}/BasicAI`;
  private messagesSubject = new BehaviorSubject<BasicAIMessage[]>([]);
  public messages$ = this.messagesSubject.asObservable();
  private currentLang: 'en' | 'it' = 'it';

  constructor(
    private http: HttpClient,
    private queryClassifier: AIQueryClassifierService,
    private auditService: AIAuditService
  ) {
    this.initializeChat();
  }

  private initializeChat(): void {
    const welcomeMessage: BasicAIMessage = {
      id: this.generateId(),
      content: this.currentLang === 'it'
        ? "Ciao! Sono l'assistente AI di base. Posso aiutarti con informazioni generali sull'asilo usando il riconoscimento di parole chiave. Per la privacy dei bambini, non posso accedere a dati individuali. Prova a chiedere 'Quali sono gli orari?' o 'Cosa c'è nel menu?'"
        : "Hi! I'm the basic AI assistant. I can help you with general daycare information using keyword detection. For children's privacy, I cannot access individual data. Try asking 'What are the hours?' or 'What's on the menu?'",
      isUser: false,
      timestamp: new Date()
    };
    this.messagesSubject.next([welcomeMessage]);
  }

  sendMessage(query: string): Observable<BasicAIResponse> {
    const userMessage: BasicAIMessage = {
      id: this.generateId(),
      content: query,
      isUser: true,
      timestamp: new Date()
    };

    const currentMessages = this.messagesSubject.value;
    this.messagesSubject.next([...currentMessages, userMessage]);

    // COMPLIANCE: Classify query first
    const classification = this.queryClassifier.classifyQuery(query);

    // Block unsafe queries
    if (classification.category === QueryCategory.BLOCKED) {
      return this.handleBlockedQuery(query, classification);
    }

    const request: BasicAIQueryRequest = { query };
    const response$ = this.http.post<BasicAIResponse>(`${this.apiUrl}/query`, request);

    response$.subscribe({
      next: (response) => {
        // Log successful interaction
        this.auditService.logInteraction({
          query,
          queryCategory: classification.category,
          riskLevel: classification.riskLevel,
          wasBlocked: false,
          responseType: 'success',
          dataAccessed: classification.dataCategories,
          consentVerified: true
        }).subscribe();

        const aiMessage: BasicAIMessage = {
          id: this.generateId(),
          content: response.success ? response.response!.message : response.message!,
          isUser: false,
          timestamp: new Date(),
          data: response.success ? response.response!.data : null,
          compliance: {
            queryCategory: classification.category,
            wasBlocked: false
          }
        };

        const updatedMessages = this.messagesSubject.value;
        this.messagesSubject.next([...updatedMessages, aiMessage]);
      },
      error: (error) => {
        // Log error
        this.auditService.logInteraction({
          query,
          queryCategory: classification.category,
          riskLevel: classification.riskLevel,
          wasBlocked: false,
          responseType: 'error',
          dataAccessed: [],
          consentVerified: true
        }).subscribe();

        const errorMessage: BasicAIMessage = {
          id: this.generateId(),
          content: this.currentLang === 'it'
            ? "Mi dispiace, si è verificato un errore. Riprova più tardi."
            : "Sorry, I encountered an error processing your request. Please try again.",
          isUser: false,
          timestamp: new Date()
        };

        const updatedMessages = this.messagesSubject.value;
        this.messagesSubject.next([...updatedMessages, errorMessage]);
      }
    });

    return response$;
  }

  private handleBlockedQuery(query: string, classification: any): Observable<BasicAIResponse> {
    // Log blocked attempt
    this.auditService.logInteraction({
      query,
      queryCategory: classification.category,
      riskLevel: classification.riskLevel,
      wasBlocked: true,
      blockedReason: classification.blockedReason,
      responseType: 'blocked',
      dataAccessed: [],
      consentVerified: false
    }).subscribe();

    const blockedMessage = this.queryClassifier.getBlockedResponse(classification, this.currentLang);

    const aiMessage: BasicAIMessage = {
      id: this.generateId(),
      content: blockedMessage,
      isUser: false,
      timestamp: new Date(),
      compliance: {
        queryCategory: QueryCategory.BLOCKED,
        wasBlocked: true
      }
    };

    const updatedMessages = this.messagesSubject.value;
    this.messagesSubject.next([...updatedMessages, aiMessage]);

    return of({
      success: false,
      message: blockedMessage
    });
  }

  clearChat(): void {
    this.initializeChat();
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 11);
  }

  /**
   * Get GDPR-safe suggested queries
   */
  getSuggestedQueries(): string[] {
    const safeQueries = this.queryClassifier.getSafeQueries();
    return safeQueries.slice(0, 7).map(q => this.currentLang === 'it' ? q.queryIt : q.query);
  }

  /**
   * Set language for responses
   */
  setLanguage(lang: 'en' | 'it'): void {
    this.currentLang = lang;
  }
}