import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AIAssistantService } from '../../../core/services/ai-assistant.service';
import { AuthService } from '../../../core/services/auth';

/**
 * AI Quick Insights Widget
 *
 * GDPR & EU AI Act Compliant
 * - Shows AI disclosure
 * - Only provides safe, pre-verified queries
 * - No individual child data access
 */
@Component({
  selector: 'app-ai-quick-insights',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="showWidget" class="ai-insights-widget">
      <div class="widget-header">
        <div class="header-left">
          <i class="bi bi-robot"></i>
          <h5>Assistente AI</h5>
        </div>
        <span class="ai-badge">
          <i class="bi bi-shield-check"></i>
          GDPR
        </span>
      </div>

      <!-- AI Disclosure (EU AI Act) -->
      <div class="ai-disclosure">
        <i class="bi bi-info-circle"></i>
        <span>Assistente AI - Non accede a dati individuali dei bambini</span>
      </div>

      <div class="widget-body">
        <p class="widget-description">
          Risposte rapide sulle operazioni dell'asilo
        </p>
        <div class="quick-actions">
          <button
            *ngFor="let query of quickQueries"
            class="quick-action-btn"
            (click)="askQuestion(query)">
            <i class="bi bi-chat-dots"></i>
            {{ query }}
          </button>
        </div>
        <div class="widget-footer">
          <button class="btn btn-primary btn-sm" (click)="openFullChat()">
            <i class="bi bi-chat"></i> Apri Chat AI
          </button>
          <button class="btn btn-outline-secondary btn-sm" (click)="contactHuman()">
            <i class="bi bi-person"></i> Assistenza Umana
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ai-insights-widget {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      margin-bottom: 1rem;
    }

    .widget-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 0.75rem 1rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .widget-header i {
      font-size: 1.2rem;
    }

    .widget-header h5 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
    }

    .ai-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      background: rgba(255, 255, 255, 0.2);
      padding: 0.15rem 0.5rem;
      border-radius: 10px;
      font-size: 0.65rem;
      font-weight: 600;
    }

    .ai-badge i {
      font-size: 0.7rem;
    }

    .ai-disclosure {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: #f0f9ff;
      border-bottom: 1px solid #e0f2fe;
      font-size: 0.75rem;
      color: #0369a1;
    }

    .ai-disclosure i {
      font-size: 0.85rem;
    }

    .widget-body {
      padding: 1rem;
    }

    .widget-description {
      color: #6c757d;
      font-size: 0.85rem;
      margin-bottom: 1rem;
    }

    .quick-actions {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .quick-action-btn {
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 6px;
      padding: 0.5rem 0.75rem;
      font-size: 0.8rem;
      color: #495057;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: left;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .quick-action-btn i {
      color: #667eea;
    }

    .quick-action-btn:hover {
      background: #e9ecef;
      border-color: #adb5bd;
    }

    .widget-footer {
      display: flex;
      gap: 0.5rem;
      justify-content: center;
      flex-wrap: wrap;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8rem;
    }
  `]
})
export class AIQuickInsightsComponent implements OnInit {
  showWidget = false;

  // GDPR-safe queries only (no individual child data)
  quickQueries = [
    "Quali sono gli orari dell'asilo?",
    "Cosa c'è nel menu di oggi?",
    "Mostra i prossimi eventi"
  ];

  constructor(
    private router: Router,
    private aiService: AIAssistantService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Show for admin and teacher users
    this.authService.currentUser$.subscribe(() => {
      this.showWidget = this.authService.isAdmin() || this.authService.isTeacher();
    });
  }

  askQuestion(query: string): void {
    // Send the query and navigate to AI assistant
    this.aiService.sendMessage(query);
    this.router.navigate(['/ai-assistant']);
  }

  openFullChat(): void {
    this.router.navigate(['/ai-assistant']);
  }

  contactHuman(): void {
    // Open email client with support address
    const contactInfo = this.aiService.getHumanContactInfo();
    window.location.href = `mailto:${contactInfo.email}?subject=Richiesta%20Assistenza%20MiniMinds`;
  }
}