import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth';
import { LanguageService } from '../../core/services/langauge-service';
import { Capacitor } from '@capacitor/core';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './landing.html',
  styleUrl: './landing.scss'
})
export class Landing implements OnInit, OnDestroy {
  currentYear = new Date().getFullYear();
  showLanguageDropdown = false;
  private clickListener?: (e: Event) => void;

  constructor(
    private authService: AuthService,
    private router: Router,
    public languageService: LanguageService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Redirect mobile app users - they shouldn't see the landing page
      if (Capacitor.isNativePlatform()) {
        if (this.authService.isAuthenticated()) {
          this.router.navigate(['/dashboard']);
        } else {
          this.router.navigate(['/login']);
        }
        return;
      }

      this.setupSmoothScroll();
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId) && this.clickListener) {
      document.removeEventListener('click', this.clickListener);
    }
  }

  get isLoggedIn(): boolean {
    return this.authService.isAuthenticated();
  }

  get currentLang(): string {
    return this.languageService.currentLanguage();
  }

  get availableLanguages() {
    return this.languageService.getAvailableLanguages();
  }

  toggleLanguageDropdown(): void {
    this.showLanguageDropdown = !this.showLanguageDropdown;
  }

  selectLanguage(langCode: string): void {
    this.languageService.use(langCode);
    this.showLanguageDropdown = false;
  }

  getCurrentLanguageFlag(): string {
    const flags: { [key: string]: string } = {
      'en': '',
      'fr': '',
      'it': '',
      'ar': ''
    };
    return flags[this.currentLang] || '🌐';
  }

  private setupSmoothScroll(): void {
    this.clickListener = (e: Event) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a[href^="#"]');

      if (anchor) {
        const href = anchor.getAttribute('href');
        if (href && href.startsWith('#')) {
          e.preventDefault();
          const targetId = href.substring(1);
          const targetElement = document.getElementById(targetId);

          if (targetElement) {
            const navHeight = 80; // Account for fixed nav
            const targetPosition = targetElement.getBoundingClientRect().top + window.scrollY - navHeight;

            window.scrollTo({
              top: targetPosition,
              behavior: 'smooth'
            });
          }
        }
      }

      // Close language dropdown when clicking outside
      if (!target.closest('.language-selector')) {
        this.showLanguageDropdown = false;
      }
    };

    document.addEventListener('click', this.clickListener);
  }
}
