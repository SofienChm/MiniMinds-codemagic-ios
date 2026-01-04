import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AIAssistantService, AIMessage } from '../../core/services/ai-assistant.service';

@Component({
  selector: 'app-ai-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-assistant.component.html',
  styleUrls: ['./ai-assistant.component.scss']
})
export class AIAssistantComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  
  messages: AIMessage[] = [];
  currentQuery = '';
  isLoading = false;
  suggestedQueries: string[] = [];
  showSuggestions = true;
  
  private subscription: Subscription = new Subscription();

  constructor(private aiService: AIAssistantService) {}

  ngOnInit(): void {
    this.subscription.add(
      this.aiService.messages$.subscribe(messages => {
        this.messages = messages;
        this.showSuggestions = messages.length <= 1;
      })
    );
    
    this.suggestedQueries = this.aiService.getSuggestedQueries();
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
    
    this.aiService.sendMessage(this.currentQuery).subscribe({
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
    this.aiService.clearChat();
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

  hasData(message: AIMessage): boolean {
    return message.data && Array.isArray(message.data) && message.data.length > 0;
  }
}