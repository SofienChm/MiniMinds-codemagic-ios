import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  QueryCategory,
  AIRiskLevel,
  QueryClassification,
  CompliantAIResponse,
  AIDisclosureConfig,
  SafeQuery
} from '../interfaces/ai-compliance.interface';
import { AIQueryClassifierService } from './ai-query-classifier.service';
import { AIAuditService } from './ai-audit.service';

export interface AIMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  data?: any;
  // Compliance metadata
  compliance?: {
    queryCategory: QueryCategory;
    wasBlocked: boolean;
    auditLogId?: string;
  };
  isDisclosure?: boolean;
  isEscalation?: boolean;
}

export interface AIQueryRequest {
  query: string;
}

export interface AIResponse {
  success: boolean;
  response?: {
    message: string;
    data?: any;
  };
  message?: string;
}

/**
 * AI Assistant Service with GDPR & EU AI Act Compliance
 *
 * This service ensures all AI interactions comply with:
 * - GDPR Article 8 (Children's consent)
 * - GDPR Article 30 (Records of processing)
 * - EU AI Act 2026 (Transparency & Human Oversight)
 */
@Injectable({
  providedIn: 'root'
})
export class AIAssistantService {
  private apiUrl = `${environment.apiUrl}/AIAssistant`;
  private messagesSubject = new BehaviorSubject<AIMessage[]>([]);
  public messages$ = this.messagesSubject.asObservable();

  // AI Disclosure configuration (EU AI Act compliance)
  private readonly disclosureConfig: AIDisclosureConfig = {
    enabled: true,
    message: {
      en: '🤖 AI Assistant | You are interacting with an artificial intelligence system. This AI cannot access individual child data. For personal assistance, contact the daycare administration.',
      it: '🤖 Assistente AI | Stai interagendo con un sistema di intelligenza artificiale. Questa AI non può accedere ai dati individuali dei bambini. Per assistenza personale, contatta l\'amministrazione dell\'asilo.'
    },
    humanContact: {
      email: 'support@miniminds.it',
      phone: '+39 051 000 0000'
    },
    showOnEveryMessage: false,
    requireAcknowledgment: false
  };

  // Current language (can be updated based on user preference)
  private currentLang: 'en' | 'it' = 'it';

  constructor(
    private http: HttpClient,
    private queryClassifier: AIQueryClassifierService,
    private auditService: AIAuditService
  ) {
    this.initializeChat();
  }

  /**
   * Set the current language for AI responses
   */
  setLanguage(lang: 'en' | 'it'): void {
    this.currentLang = lang;
  }

  /**
   * Get the AI disclosure configuration
   */
  getDisclosureConfig(): AIDisclosureConfig {
    return this.disclosureConfig;
  }

  /**
   * Get the current disclosure message
   */
  getDisclosureMessage(): string {
    return this.disclosureConfig.message[this.currentLang];
  }

  private initializeChat(): void {
    const welcomeMessage: AIMessage = {
      id: this.generateId(),
      content: this.currentLang === 'it'
        ? "Ciao! Sono il tuo assistente AI per MiniMinds. Posso aiutarti con informazioni generali sull'asilo, orari, procedure e domande frequenti. Per la privacy dei bambini, non posso accedere a dati individuali - per queste informazioni, consulta direttamente le sezioni dell'app o contatta gli educatori."
        : "Hi! I'm your MiniMinds AI assistant. I can help you with general daycare information, schedules, procedures, and FAQs. For children's privacy, I cannot access individual data - for this information, please check the app sections directly or contact the teachers.",
      isUser: false,
      timestamp: new Date(),
      isDisclosure: true
    };
    this.messagesSubject.next([welcomeMessage]);
  }

  /**
   * Send a message with full compliance checking
   */
  sendMessage(query: string): Observable<AIResponse> {
    // Add user message
    const userMessage: AIMessage = {
      id: this.generateId(),
      content: query,
      isUser: true,
      timestamp: new Date()
    };

    const currentMessages = this.messagesSubject.value;
    this.messagesSubject.next([...currentMessages, userMessage]);

    // STEP 1: Classify the query for safety
    const classification = this.queryClassifier.classifyQuery(query);

    // STEP 2: Handle blocked queries (GDPR compliance)
    if (classification.category === QueryCategory.BLOCKED) {
      return this.handleBlockedQuery(query, classification);
    }

    // STEP 3: Check for basic patterns
    const basicResponse = this.handleBasicQueries(query);
    if (basicResponse) {
      return this.handleSafeResponse(query, basicResponse, classification);
    }

    // STEP 4: Send to API (for aggregate or safe queries only)
    const request: AIQueryRequest = { query };
    const response$ = this.http.post<AIResponse>(`${this.apiUrl}/query`, request);

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

        const aiMessage: AIMessage = {
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

        const errorMessage: AIMessage = {
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

  /**
   * Handle a blocked query (GDPR compliance)
   */
  private handleBlockedQuery(query: string, classification: QueryClassification): Observable<AIResponse> {
    // Log the blocked attempt
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

    // Get localized blocked response
    const blockedMessage = this.queryClassifier.getBlockedResponse(classification, this.currentLang);

    const aiMessage: AIMessage = {
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

  /**
   * Handle a safe response (basic queries)
   */
  private handleSafeResponse(query: string, response: string, classification: QueryClassification): Observable<AIResponse> {
    // Log the interaction
    this.auditService.logInteraction({
      query,
      queryCategory: classification.category,
      riskLevel: classification.riskLevel,
      wasBlocked: false,
      responseType: 'success',
      dataAccessed: classification.dataCategories,
      consentVerified: true
    }).subscribe();

    const aiMessage: AIMessage = {
      id: this.generateId(),
      content: response,
      isUser: false,
      timestamp: new Date(),
      compliance: {
        queryCategory: classification.category,
        wasBlocked: false
      }
    };

    const updatedMessages = this.messagesSubject.value;
    this.messagesSubject.next([...updatedMessages, aiMessage]);

    return of({ success: true, response: { message: response } });
  }

  /**
   * Request human assistance (EU AI Act compliance)
   */
  requestHumanAssistance(originalQuery: string, reason?: string): Observable<{ success: boolean; message: string }> {
    return this.auditService.requestHumanEscalation({
      originalQuery,
      reason: reason || 'User requested human assistance',
      priority: 'medium',
      contactPreference: 'app'
    }).pipe(
      tap(() => {
        const escalationMessage: AIMessage = {
          id: this.generateId(),
          content: this.currentLang === 'it'
            ? `✅ La tua richiesta di assistenza è stata inviata.\n\n📧 Email: ${this.disclosureConfig.humanContact.email}\n📞 Telefono: ${this.disclosureConfig.humanContact.phone}\n\nUn operatore ti contatterà il prima possibile.`
            : `✅ Your assistance request has been submitted.\n\n📧 Email: ${this.disclosureConfig.humanContact.email}\n📞 Phone: ${this.disclosureConfig.humanContact.phone}\n\nAn operator will contact you as soon as possible.`,
          isUser: false,
          timestamp: new Date(),
          isEscalation: true
        };

        const updatedMessages = this.messagesSubject.value;
        this.messagesSubject.next([...updatedMessages, escalationMessage]);
      }),
      map(response => ({
        success: true,
        message: response.message
      })),
      catchError(() => {
        return of({
          success: false,
          message: this.currentLang === 'it'
            ? 'Si è verificato un errore. Contatta direttamente support@miniminds.it'
            : 'An error occurred. Please contact support@miniminds.it directly'
        });
      })
    );
  }

  clearChat(): void {
    this.initializeChat();
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 11);
  }

  private handleBasicQueries(query: string): string | null {
    const lowerQuery = query.toLowerCase().trim();
    
    if (lowerQuery.match(/^(hello|hi|hey)$/)) {
      return "Hello! How can I help you with your daycare today?";
    }
    
    if (lowerQuery.match(/^(thank you|thanks)$/)) {
      return "You're welcome! Is there anything else I can help you with?";
    }
    
    if (lowerQuery.match(/^(bye|goodbye)$/)) {
      return "Goodbye! Have a great day at the daycare!";
    }
    
    return null;
  }

  /**
   * Get safe suggested queries (GDPR compliant)
   */
  getSuggestedQueries(): string[] {
    const safeQueries = this.queryClassifier.getSafeQueries();
    return safeQueries.map(q => this.currentLang === 'it' ? q.queryIt : q.query);
  }

  /**
   * Get safe queries with full metadata
   */
  getSafeQueriesWithMetadata(): SafeQuery[] {
    return this.queryClassifier.getSafeQueries();
  }

  /**
   * Check if a query would be blocked before sending
   */
  preCheckQuery(query: string): QueryClassification {
    return this.queryClassifier.classifyQuery(query);
  }

  /**
   * Get human contact information
   */
  getHumanContactInfo(): { email: string; phone?: string } {
    return this.disclosureConfig.humanContact;
  }
}