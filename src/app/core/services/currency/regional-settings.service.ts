import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ApiConfig } from '../../config/api.config';
import { SKIP_ERROR_HANDLER } from '../../interceptors/error.interceptor';
import { CurrencyService } from './currency.service';

@Injectable({
  providedIn: 'root'
})
export class RegionalSettingsService {
  private http = inject(HttpClient);
  private currencyService = inject(CurrencyService);

  loadRegionalSettings(): void {
    const silentHeaders = new HttpHeaders().set(SKIP_ERROR_HANDLER, 'true');
    this.http.get<any>(`${ApiConfig.ENDPOINTS.SETTINGS}/Currency`, { headers: silentHeaders }).subscribe({
      next: (setting) => {
        if (setting?.value && this.currencyService.getCurrencies().some(c => c.code === setting.value)) {
          this.currencyService.setSelectedCurrency(setting.value);
        }
      },
      error: () => {}
    });
  }
}
