import { Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  readonly currentLanguage = signal<string>(
    localStorage.getItem('lang') || 'en'
  );

  constructor(private translate: TranslateService) {
    // Init TranslateService
    this.translate.setDefaultLang('en');
    this.use(this.currentLanguage());
  }

  use(lang: string) {
    this.translate.use(lang);
    this.currentLanguage.set(lang);
    localStorage.setItem('lang', lang);
  }
}
