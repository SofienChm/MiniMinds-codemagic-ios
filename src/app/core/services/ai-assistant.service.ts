import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AIMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  data?: any;
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

@Injectable({
  providedIn: 'root'
})
export class AIAssistantService {
  private apiUrl = `${environment.apiUrl}/AIAssistant`;
  private messagesSubject = new BehaviorSubject<AIMessage[]>([]);
  public messages$ = this.messagesSubject.asObservable();

  constructor(private http: HttpClient) {
    this.initializeChat();
  }

  private initializeChat(): void {
    const welcomeMessage: AIMessage = {
      id: this.generateId(),
      content: "Hi! I'm your OpenAI-powered assistant. I provide intelligent, contextual responses using GPT models. If no OpenAI API key is configured, I'll fall back to basic pattern matching. Ask me complex questions about your daycare operations!",
      isUser: false,
      timestamp: new Date()
    };
    this.messagesSubject.next([welcomeMessage]);
  }

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

    // Check for basic patterns first
    const basicResponse = this.handleBasicQueries(query);
    if (basicResponse) {
      const aiMessage: AIMessage = {
        id: this.generateId(),
        content: basicResponse,
        isUser: false,
        timestamp: new Date()
      };
      
      const updatedMessages = this.messagesSubject.value;
      this.messagesSubject.next([...updatedMessages, aiMessage]);
      
      return new Observable(observer => {
        observer.next({ success: true, response: { message: basicResponse } });
        observer.complete();
      });
    }

    // Send to API
    const request: AIQueryRequest = { query };
    const response$ = this.http.post<AIResponse>(`${this.apiUrl}/query`, request);
    
    response$.subscribe({
      next: (response) => {
        const aiMessage: AIMessage = {
          id: this.generateId(),
          content: response.success ? response.response!.message : response.message!,
          isUser: false,
          timestamp: new Date(),
          data: response.success ? response.response!.data : null
        };
        
        const updatedMessages = this.messagesSubject.value;
        this.messagesSubject.next([...updatedMessages, aiMessage]);
      },
      error: (error) => {
        const errorMessage: AIMessage = {
          id: this.generateId(),
          content: "Sorry, I encountered an error processing your request. Please try again.",
          isUser: false,
          timestamp: new Date()
        };
        
        const updatedMessages = this.messagesSubject.value;
        this.messagesSubject.next([...updatedMessages, errorMessage]);
      }
    });

    return response$;
  }

  clearChat(): void {
    this.initializeChat();
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
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

  // Helper methods for common queries
  getSuggestedQueries(): string[] {
    return [
      "What did the children eat today?",
      "Who was present yesterday?",
      "Show me today's activities",
      "List all children",
      "What events are scheduled this week?",
      "Show me nap times for today",
      "Which children have allergies?",
      "Show me attendance report for this month",
      "What medications were given today?",
      "List upcoming parent meetings",
      "Show me children's emergency contacts",
      "What are the meal plans for this week?",
      "Which children need diaper changes?",
      "Show me today's incident reports",
      "What activities are planned for tomorrow?",
      "List children by age group",
      "Show me staff schedules for today"
    ];
  }
}