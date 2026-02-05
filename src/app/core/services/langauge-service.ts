import { Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  // Supported languages
  readonly supportedLanguages = ['en', 'fr', 'it', 'ar'];

  readonly currentLanguage = signal<string>(
    this.getInitialLanguage()
  );

  constructor(private translate: TranslateService) {
    // Init TranslateService
    this.translate.setDefaultLang('en');
    this.translate.addLangs(this.supportedLanguages);
    this.use(this.currentLanguage());
  }

  /**
   * Get initial language - checks localStorage first, then browser language
   */
  private getInitialLanguage(): string {
    // Check localStorage first
    const storedLang = localStorage.getItem('lang');
    if (storedLang && this.supportedLanguages.includes(storedLang)) {
      return storedLang;
    }

    // Detect browser language
    const browserLang = this.detectBrowserLanguage();
    if (browserLang) {
      return browserLang;
    }

    // Default to English
    return 'en';
  }

  /**
   * Detect browser language and return supported language code
   */
  private detectBrowserLanguage(): string | null {
    if (typeof navigator === 'undefined') {
      return null;
    }

    // Get browser language (e.g., 'en-US', 'fr', 'it-IT')
    const browserLang = navigator.language || (navigator as any).userLanguage;

    if (!browserLang) {
      return null;
    }

    // Extract the primary language code (e.g., 'en' from 'en-US')
    const primaryLang = browserLang.split('-')[0].toLowerCase();

    // Check if it's a supported language
    if (this.supportedLanguages.includes(primaryLang)) {
      return primaryLang;
    }

    // Also check navigator.languages for alternatives
    if (navigator.languages && navigator.languages.length > 0) {
      for (const lang of navigator.languages) {
        const primary = lang.split('-')[0].toLowerCase();
        if (this.supportedLanguages.includes(primary)) {
          return primary;
        }
      }
    }

    return null;
  }

  /**
   * Get the detected browser language (for display purposes)
   */
  getBrowserLanguage(): string | null {
    return this.detectBrowserLanguage();
  }

  /**
   * Get all supported languages with their display names
   */
  getAvailableLanguages(): { code: string; name: string; nativeName: string }[] {
    return [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'fr', name: 'French', nativeName: 'Français' },
      { code: 'it', name: 'Italian', nativeName: 'Italiano' },
      { code: 'ar', name: 'Arabic', nativeName: 'العربية' }
    ];
  }

  use(lang: string) {
    if (!this.supportedLanguages.includes(lang)) {
      lang = 'en';
    }
    this.translate.use(lang);
    this.currentLanguage.set(lang);
    localStorage.setItem('lang', lang);

    // Set document direction for RTL languages
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    }
  }
}
