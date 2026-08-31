import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { LanguageService } from '../../../core/services/langauge-service';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-language-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './language-selector.html',
  styleUrl: './language-selector.scss'
})
export class LanguageSelector {
  private readonly languageService = inject(LanguageService);
  private readonly authService = inject(AuthService);
  private readonly elementRef = inject(ElementRef);

  availableLanguages = ['en', 'fr', 'it', 'ar'];
  showMenu = signal(false);

  toggleMenu() {
    this.showMenu.update(v => !v);
  }

  @HostListener('document:click', ['$event'])
  handleClickOutside(event: MouseEvent): void {
    if (this.showMenu() && !this.elementRef.nativeElement.contains(event.target)) {
      this.showMenu.set(false);
    }
  }

  changeLanguage(lang: string) {
    this.languageService.use(lang);
    this.showMenu.set(false);

    // Persist the language to the backend so server-side (push) notifications
    // can be localized for this user.
    if (this.authService.isAuthenticated()) {
      this.authService.updateLanguage(lang).subscribe({ error: () => {} });
    }
  }

  getFlag(lang: string): string {
    const map: Record<string, string> = {
      en: '/assets/images/us.png',
      fr: '/assets/images/fr.png',
      it: '/assets/images/it.png',
      ar: '/assets/images/tn.png',
    };
    return map[lang] ?? '/assets/images/us.png';
  }

  get currentLanguage() {
    return this.languageService.currentLanguage();
  }
}
