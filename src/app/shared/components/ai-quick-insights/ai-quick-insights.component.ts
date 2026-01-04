import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AIAssistantService } from '../../../core/services/ai-assistant.service';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-ai-quick-insights',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="showWidget" class="ai-insights-widget">
      <div class="widget-header">
        <i class="bi bi-robot"></i>
        <h5>AI Quick Insights</h5>
      </div>
      <div class="widget-body">
        <p class="widget-description">
          Get instant answers about your daycare operations
        </p>
        <div class="quick-actions">
          <button 
            *ngFor="let query of quickQueries" 
            class="quick-action-btn"
            (click)="askQuestion(query)">
            {{ query }}
          </button>
        </div>
        <div class="widget-footer">
          <button class="btn btn-primary btn-sm" (click)="openFullChat()">
            <i class="bi bi-chat"></i> Open AI Chat
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
      padding: 1rem;
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

    .widget-body {
      padding: 1rem;
    }

    .widget-description {
      color: #6c757d;
      font-size: 0.9rem;
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
    }

    .quick-action-btn:hover {
      background: #e9ecef;
      border-color: #adb5bd;
    }

    .widget-footer {
      text-align: center;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }
  `]
})
export class AIQuickInsightsComponent implements OnInit {
  showWidget = false;
  quickQueries = [
    "What did children eat today?",
    "Who is present today?",
    "Show today's activities"
  ];

  constructor(
    private router: Router,
    private aiService: AIAssistantService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Only show for admin users
    this.authService.currentUser$.subscribe(() => {
      this.showWidget = this.authService.isAdmin();
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
}