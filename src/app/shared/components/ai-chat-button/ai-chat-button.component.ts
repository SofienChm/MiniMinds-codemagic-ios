import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth';
import { TenantFeatureService } from '../../../core/services/tenant-feature.service';

@Component({
  selector: 'app-ai-chat-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="showButton" class="ai-chat-button" (click)="openAIAssistant()">
      <i class="bi bi-robot"></i>
      <div class="tooltip">Ask AI Assistant</div>
    </div>
  `,
  styles: [`
    .ai-chat-button {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
      transition: all 0.3s ease;
      z-index: 1000;
      color: white;
      font-size: 24px;
    }

    .ai-chat-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 25px rgba(0, 0, 0, 0.3);
    }

    .ai-chat-button:hover .tooltip {
      opacity: 1;
      visibility: visible;
    }

    .tooltip {
      position: absolute;
      bottom: 70px;
      right: 0;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      white-space: nowrap;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s ease;
    }

    .tooltip::after {
      content: '';
      position: absolute;
      top: 100%;
      right: 20px;
      border: 5px solid transparent;
      border-top-color: rgba(0, 0, 0, 0.8);
    }
  `]
})
export class AIChatButtonComponent implements OnInit, OnDestroy {
  showButton = false;
  private subs: Subscription[] = [];

  constructor(
    private router: Router,
    private authService: AuthService,
    private tenantFeatureService: TenantFeatureService
  ) {}

  ngOnInit(): void {
    const sub = this.tenantFeatureService.enabledFeatures$.subscribe(features => {
      this.showButton = this.authService.isAdmin() && features.includes('ai_assistant');
    });
    this.subs.push(sub);
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  openAIAssistant(): void {
    this.router.navigate(['/ai-assistant']);
  }
}