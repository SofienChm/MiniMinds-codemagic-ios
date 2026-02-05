import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { LanguageService } from '../../../core/services/langauge-service';

@Component({
  selector: 'app-language-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './language-selector.html',
  styleUrl: './language-selector.scss'
})
export class LanguageSelector {
  private readonly languageService = inject(LanguageService);
  private readonly elementRef = inject(ElementRef);

  availableLanguages = ['en', 'fr', 'it'];
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
  }

  getFlag(lang: string): string {
    const map: Record<string, string> = {
      en: '/assets/images/us.png',
      fr: '/assets/images/fr.png',
      it: '/assets/images/it.png',
    };
    return map[lang] ?? '/assets/images/us.png';
  }

  get currentLanguage() {
    return this.languageService.currentLanguage();
  }
}
