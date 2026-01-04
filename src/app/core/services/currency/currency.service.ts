import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Currency {
  code: string;
  symbol: string;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class CurrencyService {
  private currencies: Currency[] = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'TND', symbol: 'د.ت', name: 'Tunisian Dinar' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'GBP', symbol: '£', name: 'British Pound' }
  ];

  private selectedCurrencySubject = new BehaviorSubject<Currency>(this.getStoredCurrency());

  selectedCurrency$ = this.selectedCurrencySubject.asObservable();

  private getStoredCurrency(): Currency {
    const storedCode = localStorage.getItem('selectedCurrency') || 'USD';
    return this.currencies.find(c => c.code === storedCode) || this.currencies[0];
  }

  getCurrencies(): Currency[] {
    return this.currencies;
  }

  getSelectedCurrency(): Currency {
    return this.selectedCurrencySubject.value;
  }

  getSelectedCurrencyCode(): string {
    return this.selectedCurrencySubject.value.code;
  }

  getSelectedCurrencySymbol(): string {
    return this.selectedCurrencySubject.value.symbol;
  }

  setSelectedCurrency(code: string): void {
    const currency = this.currencies.find(c => c.code === code);
    if (currency) {
      localStorage.setItem('selectedCurrency', code);
      this.selectedCurrencySubject.next(currency);
    }
  }

  formatAmount(amount: number): string {
    const currency = this.selectedCurrencySubject.value;
    return `${currency.symbol}${amount.toFixed(2)}`;
  }
}
