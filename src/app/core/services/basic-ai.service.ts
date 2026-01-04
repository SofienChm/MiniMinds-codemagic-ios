import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface BasicAIMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  data?: any;
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

@Injectable({
  providedIn: 'root'
})
export class BasicAIService {
  private apiUrl = `${environment.apiUrl}/BasicAI`;
  private messagesSubject = new BehaviorSubject<BasicAIMessage[]>([]);
  public messages$ = this.messagesSubject.asObservable();

  constructor(private http: HttpClient) {
    this.initializeChat();
  }

  private initializeChat(): void {
    const welcomeMessage: BasicAIMessage = {
      id: this.generateId(),
      content: "Hi! I'm your Basic AI assistant using pattern matching. I can help you find information about children's meals, attendance, activities, and events using keyword detection. Try asking something like 'What did the children eat today?' or 'Who was present yesterday?'",
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

    const request: BasicAIQueryRequest = { query };
    const response$ = this.http.post<BasicAIResponse>(`${this.apiUrl}/query`, request);
    
    response$.subscribe({
      next: (response) => {
        const aiMessage: BasicAIMessage = {
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
        const errorMessage: BasicAIMessage = {
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

  getSuggestedQueries(): string[] {
    return [
      "What did the children eat today?",
      "Who was present yesterday?",
      "Show me today's activities",
      "List all children",
      "What events are available?",
      "Show me nap times for today",
      "Which children have allergies?"
    ];
  }
}