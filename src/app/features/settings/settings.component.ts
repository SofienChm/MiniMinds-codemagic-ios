import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { NgSelectModule } from '@ng-select/ng-select';
import { TitlePage, Breadcrumb } from '../../shared/layouts/title-page/title-page';
import { PrefixService } from '../../core/services/prefix/prefix.service';
import { AuthService } from '../../core/services/auth';
import { LanguageService } from '../../core/services/langauge-service';
import { CurrencyService } from '../../core/services/currency/currency.service';
import { ApiConfig } from '../../core/config/api.config';
import { SKIP_ERROR_HANDLER } from '../../core/interceptors/error.interceptor';
import { SimpleToastService } from '../../core/services/simple-toast.service';
import { NotificationPreferencesService, NotificationPreference } from '../../core/services/notification-preferences.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, TranslateModule, FormsModule, TitlePage, NgSelectModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit, OnDestroy {
  private translate = inject(TranslateService);
  private langChangeSub?: Subscription;
  private prefixService = inject(PrefixService);
  private authService = inject(AuthService);
  private http = inject(HttpClient);
  private readonly languageService = inject(LanguageService);
  private readonly currencyService = inject(CurrencyService);
  private simpleToastService = inject(SimpleToastService);
  private notificationPreferencesService = inject(NotificationPreferencesService);
  isAdmin = false;
  selectedLanguage: string = '';
  deletingAccount = false;

  // Notification preferences
  notificationPreferences: NotificationPreference[] = [];
  savingPreferences = false;

  languages = [
    { code: 'en', name: 'English', flag: '/assets/images/us.png', label: '🇪🇳 English' },
    { code: 'fr', name: 'Français', flag: '/assets/images/fr.png', label: '🇫🇷 Français' },
    { code: 'it', name: 'Italiano', flag: '/assets/images/it.png', label: '🇮🇹 Italiano' }
  ];

  currencies = this.currencyService.getCurrencies();

  countries = [
    { code: 'US', name: 'United States', flag: '/assets/images/us.png', label: '🇺🇸 United States' },
    { code: 'FR', name: 'France', flag: '/assets/images/fr.png', label: '🇫🇷 France' },
    { code: 'IT', name: 'Italy', flag: '/assets/images/it.png', label: '🇮🇹 Italy' },
    { code: 'CA', name: 'Canada', flag: '/assets/images/ca.png', label: '🇨🇦 Canada' }
  ];

  selectedCurrency: string = this.currencyService.getSelectedCurrencyCode();
  selectedCountry: string = localStorage.getItem('selectedCountry') || 'US';
  childPrefix: string = this.prefixService.getChildPrefix();
  parentPrefix: string = this.prefixService.getParentPrefix();
  educatorPrefix: string = this.prefixService.getEducatorPrefix();
  defaultAnnualLeaveDays: number = 30;
  defaultMedicalLeaveDays: number = 10;

  breadcrumbs: Breadcrumb[] = [];

  ngOnInit(): void {
    this.isAdmin = this.authService.isAdmin();
    this.selectedLanguage = this.translate.currentLang;
    this.setupBreadcrumbs();
    if (this.isAdmin) {
      this.loadLeaveSettings();
    }
    this.loadNotificationPreferences();

    this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      this.setupBreadcrumbs();
    });
  }

  ngOnDestroy(): void {
    this.langChangeSub?.unsubscribe();
  }

  private setupBreadcrumbs(): void {
    this.breadcrumbs = [
      { label: this.translate.instant('BREADCRUMBS.DASHBOARD'), url: '/dashboard' },
      { label: this.translate.instant('BREADCRUMBS.SETTINGS') }
    ];
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
        this.simpleToastService.success(
          this.translate.instant('SETTINGS.LEAVE_SAVED')
        );
      },
      error: () => {
        this.simpleToastService.error(
          this.translate.instant('SETTINGS.LEAVE_SAVE_FAILED')
        );
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
        this.simpleToastService.success(
          this.translate.instant('SETTINGS.LANGUAGE_SAVED')
        );
        },
        error: () => {
        this.simpleToastService.warning(
          this.translate.instant('sETTINGS.LANGUAGE_SAVE_LOCALLY')
        );
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

  confirmDeleteAccount(): void {
    Swal.fire({
      title: this.translate.instant('SETTINGS.DELETE_ACCOUNT_CONFIRM_TITLE'),
      html: `
        <p class="text-danger fw-bold">${this.translate.instant('SETTINGS.DELETE_ACCOUNT_WARNING')}</p>
        <ul class="text-start small">
          <li>${this.translate.instant('SETTINGS.DELETE_WARNING_1')}</li>
          <li>${this.translate.instant('SETTINGS.DELETE_WARNING_2')}</li>
          <li>${this.translate.instant('SETTINGS.DELETE_WARNING_3')}</li>
          <li>${this.translate.instant('SETTINGS.DELETE_WARNING_4')}</li>
        </ul>
        <p class="mt-3">${this.translate.instant('SETTINGS.DELETE_ACCOUNT_TYPE_CONFIRM')}</p>
      `,
      input: 'text',
      inputPlaceholder: 'DELETE',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: this.translate.instant('SETTINGS.DELETE_ACCOUNT_BTN'),
      cancelButtonText: this.translate.instant('GLOBAL.CANCEL'),
      inputValidator: (value) => {
        if (value !== 'DELETE') {
          return this.translate.instant('SETTINGS.DELETE_ACCOUNT_TYPE_ERROR');
        }
        return null;
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.deleteAccount();
      }
    });
  }

  deleteAccount(): void {
    this.deletingAccount = true;

    this.authService.deleteAccount().subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: this.translate.instant('SETTINGS.ACCOUNT_DELETED'),
          text: this.translate.instant('SETTINGS.ACCOUNT_DELETED_DESC'),
          timer: 3000,
          showConfirmButton: false
        });
      },
      error: (error) => {
        this.deletingAccount = false;
        Swal.fire({
          icon: 'error',
          title: this.translate.instant('SETTINGS.ERROR'),
          text: error.error?.message || this.translate.instant('SETTINGS.DELETE_ACCOUNT_ERROR'),
          confirmButtonColor: '#dc3545'
        });
      }
    });
  }

  // Notification Preferences Methods
  loadNotificationPreferences(): void {
    const silentHeaders = new HttpHeaders().set(SKIP_ERROR_HANDLER, 'true');

    this.notificationPreferencesService.getPreferences().subscribe({
      next: (response) => {
        this.notificationPreferences = response.preferences;
      },
      error: () => {
        console.error('Failed to load notification preferences');
        this.notificationPreferences = [];
      }
    });
  }

  saveNotificationPreferences(): void {
    this.savingPreferences = true;

    const request = {
      preferences: this.notificationPreferences.map(p => ({
        notificationType: p.notificationType,
        isEnabled: p.isEnabled
      }))
    };

    this.notificationPreferencesService.updatePreferences(request).subscribe({
      next: () => {
        this.savingPreferences = false;
        this.simpleToastService.success(
          this.translate.instant('SETTINGS.NOTIFICATION_PREFERENCES_SAVED')
        );
      },
      error: () => {
        this.savingPreferences = false;
        this.simpleToastService.error(
          this.translate.instant('SETTINGS.NOTIFICATION_PREFERENCES_ERROR')
        );
      }
    });
  }

  getNotificationTypeLabel(type: string): string {
    const key = `SETTINGS.NOTIF_TYPE_${type.toUpperCase()}`;
    const translated = this.translate.instant(key);
    // If translation not found, return the type name directly
    return translated === key ? type : translated;
  }

  getNotificationTypeDescription(type: string): string {
    const key = `SETTINGS.NOTIF_TYPE_${type.toUpperCase()}_DESC`;
    const translated = this.translate.instant(key);
    // If translation not found, return empty string
    return translated === key ? '' : translated;
  }
}
