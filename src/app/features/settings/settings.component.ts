import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { NgSelectModule } from '@ng-select/ng-select';
import { TitlePage, Breadcrumb } from '../../shared/layouts/title-page/title-page';
import { PrefixService } from '../../core/services/prefix/prefix.service';
import { AuthService } from '../../core/services/auth';
import { LanguageService } from '../../core/services/langauge-service';
import { CurrencyService } from '../../core/services/currency/currency.service';
import { ApiConfig } from '../../core/config/api.config';
import { SKIP_ERROR_HANDLER } from '../../core/interceptors/error.interceptor';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, TranslateModule, FormsModule, TitlePage, NgSelectModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  private translate = inject(TranslateService);
  private prefixService = inject(PrefixService);
  private authService = inject(AuthService);
  private http = inject(HttpClient);
  private readonly languageService = inject(LanguageService);
  private readonly currencyService = inject(CurrencyService);

  isAdmin = false;
  selectedLanguage: string = '';

  languages = [
    { code: 'en', name: 'English', flag: '🇪🇳', label: '🇪🇳 English' },
    { code: 'fr', name: 'Français', flag: '🇫🇷', label: '🇫🇷 Français' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹', label: '🇮🇹 Italiano' }
  ];

  currencies = this.currencyService.getCurrencies();

  countries = [
    { code: 'US', name: 'United States', flag: '🇺🇸', label: '🇺🇸 United States' },
    { code: 'FR', name: 'France', flag: '🇫🇷', label: '🇫🇷 France' },
    { code: 'IT', name: 'Italy', flag: '🇮🇹', label: '🇮🇹 Italy' },
    { code: 'CA', name: 'Canada', flag: '🇨🇦', label: '🇨🇦 Canada' }
  ];

  selectedCurrency: string = this.currencyService.getSelectedCurrencyCode();
  selectedCountry: string = localStorage.getItem('selectedCountry') || 'US';
  childPrefix: string = this.prefixService.getChildPrefix();
  parentPrefix: string = this.prefixService.getParentPrefix();
  educatorPrefix: string = this.prefixService.getEducatorPrefix();
  defaultAnnualLeaveDays: number = 30;
  defaultMedicalLeaveDays: number = 10;

  breadcrumbs: Breadcrumb[] = [
    { label: 'Dashboard' },
    { label: 'Settings' }
  ];

  ngOnInit(): void {
    this.isAdmin = this.authService.isAdmin();
    this.selectedLanguage = this.translate.currentLang;
    if (this.isAdmin) {
      this.loadLeaveSettings();
    }
  }

  loadLeaveSettings(): void {
    // Use silent requests - these settings are optional and have defaults
    const silentHeaders = new HttpHeaders().set(SKIP_ERROR_HANDLER, 'true');

    this.http.get<any>(`${ApiConfig.ENDPOINTS.SETTINGS}/DefaultAnnualLeaveDays`, { headers: silentHeaders }).subscribe({
      next: (setting) => this.defaultAnnualLeaveDays = parseInt(setting.value),
      error: () => this.defaultAnnualLeaveDays = 30
    });
    this.http.get<any>(`${ApiConfig.ENDPOINTS.SETTINGS}/DefaultMedicalLeaveDays`, { headers: silentHeaders }).subscribe({
      next: (setting) => this.defaultMedicalLeaveDays = parseInt(setting.value),
      error: () => this.defaultMedicalLeaveDays = 10
    });
  }

  saveLeaveSettings(): void {
    this.http.put(`${ApiConfig.ENDPOINTS.SETTINGS}/DefaultAnnualLeaveDays`, { value: this.defaultAnnualLeaveDays.toString() }).subscribe();
    this.http.put(`${ApiConfig.ENDPOINTS.SETTINGS}/DefaultMedicalLeaveDays`, { value: this.defaultMedicalLeaveDays.toString() }).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: this.translate.instant('SETTINGS.SUCCESS'),
          text: this.translate.instant('SETTINGS.LEAVE_SAVED'),
          timer: 2000,
          showConfirmButton: false
        });
      },
      error: () => {
        Swal.fire({
          icon: 'error',
          title: this.translate.instant('SETTINGS.ERROR'),
          text: this.translate.instant('SETTINGS.LEAVE_SAVE_FAILED'),
          confirmButtonColor: '#d33'
        });
      }
    });
  }

  get currentLang(): string {
    return this.translate.currentLang;
  }

  switchLanguage(lang: string): void {
    this.translate.use(lang);
  }

  onCurrencyChange(): void {
    this.currencyService.setSelectedCurrency(this.selectedCurrency);
  }

  onCountryChange(): void {
    localStorage.setItem('selectedCountry', this.selectedCountry);
  }

  onPrefixChange(type: string): void {
    if (type === 'child') localStorage.setItem('childPrefix', this.childPrefix);
    if (type === 'parent') localStorage.setItem('parentPrefix', this.parentPrefix);
    if (type === 'educator') localStorage.setItem('educatorPrefix', this.educatorPrefix);
  }

  saveLanguage(): void {
    this.languageService.use(this.currentLang);

    this.authService.updateLanguage(this.currentLang)
      .subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: this.translate.instant('SETTINGS.SUCCESS'),
            text: this.translate.instant('SETTINGS.LANGUAGE_SAVED'),
            timer: 2000,
            showConfirmButton: false
          });
        },
        error: () => {
          Swal.fire({
            icon: 'warning',
            title: this.translate.instant('SETTINGS.PARTIAL_SUCCESS'),
            text: this.translate.instant('SETTINGS.LANGUAGE_SAVED_LOCALLY'),
            timer: 2000
          });
        }
      });
  }

  saveSettings(): void {
    this.currencyService.setSelectedCurrency(this.selectedCurrency);
    localStorage.setItem('selectedCountry', this.selectedCountry);
    this.prefixService.setChildPrefix(this.childPrefix);
    this.prefixService.setParentPrefix(this.parentPrefix);
    this.prefixService.setEducatorPrefix(this.educatorPrefix);
    Swal.fire({
      icon: 'success',
      title: this.translate.instant('SETTINGS.SUCCESS'),
      text: this.translate.instant('SETTINGS.SETTINGS_SAVED'),
      timer: 2000,
      showConfirmButton: false
    });
  }
}
