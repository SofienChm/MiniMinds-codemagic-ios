import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subscription, debounceTime, Subject } from 'rxjs';
import { AIAssistantService, AIMessage } from '../../core/services/ai-assistant.service';
import { QueryCategory } from '../../core/interfaces/ai-compliance.interface';

/**
 * AI Assistant Component with EU AI Act & GDPR Compliance
 *
 * Features:
 * - AI disclosure banner (EU AI Act requirement)
 * - Human escalation option
 * - Query pre-checking with warnings
 * - Blocked query handling
 * - Privacy-safe suggested queries
 */
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

  // Compliance features
  queryWarning: string | null = null;
  humanContact: { email: string; phone?: string } = { email: 'support@miniminds.it' };

  private subscription: Subscription = new Subscription();
  private queryCheck$ = new Subject<string>();

  constructor(
    private aiService: AIAssistantService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    // Subscribe to messages
    this.subscription.add(
      this.aiService.messages$.subscribe(messages => {
        this.messages = messages;
        this.showSuggestions = messages.length <= 1;
      })
    );

    // Get safe suggested queries
    this.suggestedQueries = this.aiService.getSuggestedQueries();

    // Get human contact info
    this.humanContact = this.aiService.getHumanContactInfo();

    // Setup query pre-check with debounce
    this.subscription.add(
      this.queryCheck$.pipe(debounceTime(300)).subscribe(query => {
        this.checkQuerySafety(query);
      })
    );
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  /**
   * Send message with compliance checking
   */
  sendMessage(): void {
    if (!this.currentQuery.trim() || this.isLoading) return;

    this.isLoading = true;
    this.showSuggestions = false;
    this.queryWarning = null;

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

  /**
   * Use a suggested query (all pre-verified as safe)
   */
  useSuggestedQuery(query: string): void {
    this.currentQuery = query;
    this.queryWarning = null;
    this.sendMessage();
  }

  /**
   * Clear chat and reset
   */
  clearChat(): void {
    this.aiService.clearChat();
    this.showSuggestions = true;
    this.queryWarning = null;
  }

  /**
   * Handle query input changes - pre-check for warnings
   */
  onQueryChange(): void {
    if (this.currentQuery.trim()) {
      this.queryCheck$.next(this.currentQuery);
    } else {
      this.queryWarning = null;
    }
  }

  /**
   * Handle Enter key press
   */
  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  /**
   * Request human assistance (EU AI Act compliance)
   */
  requestHumanHelp(): void {
    this.aiService.requestHumanAssistance(
      this.currentQuery || 'Richiesta assistenza generale',
      'Utente ha richiesto assistenza umana'
    ).subscribe();
  }

  /**
   * Pre-check query safety and show warning if needed
   */
  private checkQuerySafety(query: string): void {
    const classification = this.aiService.preCheckQuery(query);

    if (classification.category === QueryCategory.BLOCKED) {
      this.queryWarning = 'Questa domanda potrebbe riguardare dati individuali dei bambini e verrà bloccata per privacy.';
    } else if (classification.category === QueryCategory.INDIVIDUAL) {
      this.queryWarning = 'Questa domanda richiede accesso a dati individuali - potrebbe richiedere consenso.';
    } else {
      this.queryWarning = null;
    }
  }

  /**
   * Scroll to bottom of messages
   */
  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  /**
   * Format message text with line breaks preserved
   */
  formatMessageText(content: string): SafeHtml {
    // Convert newlines to <br> and sanitize
    const formatted = content
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    return this.sanitizer.bypassSecurityTrustHtml(formatted);
  }

  /**
   * Format data for display
   */
  formatData(data: any): string {
    if (!data || !Array.isArray(data)) return '';

    return data.map(item => {
      const entries = Object.entries(item);
      return entries.map(([key, value]) => {
        const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        let formattedValue = value;

        if (value instanceof Date || (typeof value === 'string' && value.includes('T'))) {
          formattedValue = new Date(value as string).toLocaleString('it-IT');
        }

        return `${formattedKey}: ${formattedValue}`;
      }).join('\n');
    }).join('\n\n');
  }

  /**
   * Check if message has data
   */
  hasData(message: AIMessage): boolean {
    return message.data && Array.isArray(message.data) && message.data.length > 0;
  }
}