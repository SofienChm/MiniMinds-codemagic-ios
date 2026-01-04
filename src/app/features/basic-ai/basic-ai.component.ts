import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { BasicAIService, BasicAIMessage } from '../../core/services/basic-ai.service';

@Component({
  selector: 'app-basic-ai',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="ai-assistant-container">
      <div class="chat-header">
        <div class="header-content">
          <i class="bi bi-search"></i>
          <h3>Basic AI (Pattern Matching)</h3>
        </div>
        <button class="btn btn-sm btn-outline-secondary" (click)="clearChat()">
          <i class="bi bi-trash3"></i> Clear
        </button>
      </div>

      <div class="messages-container" #messagesContainer>
        <div *ngFor="let message of messages" class="message" [ngClass]="{'user-message': message.isUser, 'ai-message': !message.isUser}">
          <div class="message-content">
            <div class="message-text">{{ message.content }}</div>
            <div *ngIf="hasData(message)" class="message-data">
              <div class="data-header">
                <i class="bi bi-table"></i> Data Results:
              </div>
              <pre class="data-content">{{ formatData(message.data) }}</pre>
            </div>
            <div class="message-time">{{ message.timestamp | date:'short' }}</div>
          </div>
        </div>

        <div *ngIf="isLoading" class="message ai-message">
          <div class="message-content">
            <div class="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>

      <div *ngIf="showSuggestions" class="suggestions-container">
        <div class="suggestions-header">Try asking:</div>
        <div class="suggestions-grid">
          <button 
            *ngFor="let suggestion of suggestedQueries" 
            class="suggestion-btn"
            (click)="useSuggestedQuery(suggestion)">
            {{ suggestion }}
          </button>
        </div>
      </div>

      <div class="input-container">
        <div class="input-group">
          <input 
            type="text" 
            class="form-control" 
            [(ngModel)]="currentQuery"
            (keypress)="onKeyPress($event)"
            placeholder="Ask me anything using simple keywords..."
            [disabled]="isLoading">
          <button 
            class="btn btn-success" 
            (click)="sendMessage()"
            [disabled]="!currentQuery.trim() || isLoading">
            <i class="bi bi-send-fill"></i>
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['../ai-assistant/ai-assistant.component.scss']
})
export class BasicAIComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  
  messages: BasicAIMessage[] = [];
  currentQuery = '';
  isLoading = false;
  suggestedQueries: string[] = [];
  showSuggestions = true;
  
  private subscription: Subscription = new Subscription();

  constructor(private basicAIService: BasicAIService) {}

  ngOnInit(): void {
    this.subscription.add(
      this.basicAIService.messages$.subscribe(messages => {
        this.messages = messages;
        this.showSuggestions = messages.length <= 1;
      })
    );
    
    this.suggestedQueries = this.basicAIService.getSuggestedQueries();
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  sendMessage(): void {
    if (!this.currentQuery.trim() || this.isLoading) return;

    this.isLoading = true;
    this.showSuggestions = false;
    
    this.basicAIService.sendMessage(this.currentQuery).subscribe({
      next: () => {
        this.currentQuery = '';
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  useSuggestedQuery(query: string): void {
    this.currentQuery = query;
    this.sendMessage();
  }

  clearChat(): void {
    this.basicAIService.clearChat();
    this.showSuggestions = true;
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  formatData(data: any): string {
    if (!data || !Array.isArray(data)) return '';
    
    return data.map(item => {
      const entries = Object.entries(item);
      return entries.map(([key, value]) => {
        const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        let formattedValue = value;
        
        if (value instanceof Date || (typeof value === 'string' && value.includes('T'))) {
          formattedValue = new Date(value as string).toLocaleString();
        }
        
        return `${formattedKey}: ${formattedValue}`;
      }).join('\n');
    }).join('\n\n');
  }

  hasData(message: BasicAIMessage): boolean {
    return message.data && Array.isArray(message.data) && message.data.length > 0;
  }
}