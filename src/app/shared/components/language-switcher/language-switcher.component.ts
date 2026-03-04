import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../../../core/services/langauge-service';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="language-switcher">
      <button
        *ngFor="let lang of languages"
        (click)="switchLanguage(lang.code)"
        [class.active]="currentLang === lang.code"
        class="btn btn-sm btn-outline-secondary btn-cancel-global mx-1">
        {{ lang.flag }} {{ lang.name }}
      </button>
    </div>
  `,
  styles: [`
    .language-switcher {
      display: flex;
      align-items: center;
    }
    .btn.active {
      background-color: #0d6efd;
      color: white;
    }
  `]
})
export class LanguageSwitcherComponent {
  private translate = inject(TranslateService);
  private languageService = inject(LanguageService);

  languages = [
    { code: 'en', name: 'EN', flag: '🇪🇳' },
    { code: 'fr', name: 'FR', flag: '🇫🇷' },
    { code: 'it', name: 'IT', flag: '🇮🇹' },
    { code: 'ar', name: 'AR', flag: '🇸🇦' }
  ];

  get currentLang(): string {
    return this.translate.currentLang;
  }

  switchLanguage(lang: string): void {
    this.languageService.use(lang);
  }
}
