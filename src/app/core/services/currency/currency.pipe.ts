import { Pipe, PipeTransform } from '@angular/core';
import { CurrencyService } from './currency.service';

@Pipe({
  name: 'appCurrency',
  standalone: true,
  pure: false
})
export class AppCurrencyPipe implements PipeTransform {
  constructor(private currencyService: CurrencyService) {}

  transform(value: number | string, showCode: boolean = false): string {
    const amount = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(amount)) {
      return '';
    }

    const currency = this.currencyService.getSelectedCurrency();
    const formattedAmount = amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    if (showCode) {
      return `${currency.symbol}${formattedAmount} ${currency.code}`;
    }

    return `${currency.symbol}${formattedAmount}`;
  }
}
