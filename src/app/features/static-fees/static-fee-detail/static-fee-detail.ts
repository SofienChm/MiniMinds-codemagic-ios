import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import localeIt from '@angular/common/locales/it';
import localeAr from '@angular/common/locales/ar';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TitlePage, Breadcrumb, TitleAction } from '../../../shared/layouts/title-page/title-page';
import { StaticFeesService, StaticFeeModel } from '../static-fees.service';
import { AppCurrencyPipe } from '../../../core/services/currency/currency.pipe';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ApiConfig } from '../../../core/config/api.config';
import { SKIP_ERROR_HANDLER } from '../../../core/interceptors/error.interceptor';
import { PageTitleService } from '../../../core/services/page-title.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-static-fee-detail',
  standalone: true,
  imports: [CommonModule, TitlePage, AppCurrencyPipe, TranslateModule],
  templateUrl: './static-fee-detail.html',
  styleUrls: ['./static-fee-detail.scss']
})
export class StaticFeeDetailComponent implements OnInit, OnDestroy {
  fee: StaticFeeModel | null = null;
  loading = false;
  feeId: number = 0;
  daycareName = 'MiniMinds Daycare';
  private langChangeSub?: Subscription;

  breadcrumbs: Breadcrumb[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private staticFeesService: StaticFeesService,
    private http: HttpClient,
    private translateService: TranslateService,
    private pageTitleService: PageTitleService
  ) {
    registerLocaleData(localeFr);
    registerLocaleData(localeIt);
    registerLocaleData(localeAr);
  }

  ngOnInit(): void {
    this.pageTitleService.setTitle(this.translateService.instant('STATIC_FEES_PAGE.FEE_RECEIPT'));
    this.feeId = Number(this.route.snapshot.paramMap.get('id'));
    this.updateTranslatedContent();
    this.loadFee();

    const silentHeaders = new HttpHeaders().set(SKIP_ERROR_HANDLER, 'true');
    this.http.get<{ value: string }>(`${ApiConfig.ENDPOINTS.SETTINGS}/DaycareName`, { headers: silentHeaders }).subscribe({
      next: (s) => { if (s?.value) this.daycareName = s.value; },
      error: () => {}
    });

    this.langChangeSub = this.translateService.onLangChange.subscribe(() => {
      this.updateTranslatedContent();
      this.pageTitleService.setTitle(this.translateService.instant('STATIC_FEES_PAGE.FEE_RECEIPT'));
    });
  }

  ngOnDestroy(): void {
    this.langChangeSub?.unsubscribe();
  }

  private updateTranslatedContent(): void {
    this.breadcrumbs = [
      { label: this.translateService.instant('STATIC_FEES_PAGE.DASHBOARD'), url: '/dashboard' },
      { label: this.translateService.instant('STATIC_FEES_PAGE.TITLE'), url: '/static-fees' },
      { label: this.translateService.instant('STATIC_FEES_PAGE.FEE_DETAIL') }
    ];
  }

  getActions(): TitleAction[] {
    return [
      {
        label: this.translateService.instant('STATIC_FEES_PAGE.BACK_TO_LIST'),
        icon: 'bi bi-arrow-left',
        class: 'custom-btn-2 btn-cancel-2',
        action: () => this.goBack()
      },
      {
        label: this.translateService.instant('STATIC_FEES_PAGE.PRINT'),
        icon: 'bi bi-printer',
        class: 'custom-btn-2 btn-view-global-2',
        action: () => this.print()
      }
    ];
  }

  loadFee(): void {
    this.loading = true;
    this.staticFeesService.getStaticFeeById(this.feeId).subscribe({
      next: (fee) => {
        this.fee = fee;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/static-fees']);
  }

  print(): void {
    window.print();
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'Paid': return 'badge bg-success';
      case 'Pending': return 'badge bg-warning text-dark';
      default: return 'badge bg-secondary';
    }
  }

  getCategoryBadgeClass(category: string | undefined): string {
    switch (category) {
      case 'Tuition': return 'badge bg-primary';
      case 'Supplies': return 'badge bg-info';
      case 'Events': return 'badge bg-purple';
      case 'Meals': return 'badge bg-orange';
      case 'Transportation': return 'badge bg-teal';
      case 'Registration': return 'badge bg-indigo';
      case 'Late Pickup': return 'badge bg-danger';
      default: return 'badge bg-secondary';
    }
  }

  getPaymentMethodIcon(method: string): string {
    switch (method) {
      case 'Cash': return 'bi-cash-stack';
      case 'Check': return 'bi-file-earmark-text';
      case 'BankTransfer': return 'bi-bank';
      default: return 'bi-credit-card';
    }
  }

  get currentLocale(): string {
    return this.translateService.currentLang || this.translateService.defaultLang || 'en';
  }

  translateStatus(status: string): string {
    switch (status) {
      case 'Paid': return this.translateService.instant('STATIC_FEES_PAGE.PAID');
      case 'Pending': return this.translateService.instant('STATIC_FEES_PAGE.PENDING');
      default: return status;
    }
  }

  translateCategory(category: string | undefined): string {
    switch (category) {
      case 'Tuition': return this.translateService.instant('STATIC_FEES_PAGE.CATEGORY_TUITION');
      case 'Supplies': return this.translateService.instant('STATIC_FEES_PAGE.CATEGORY_SUPPLIES');
      case 'Events': return this.translateService.instant('STATIC_FEES_PAGE.CATEGORY_EVENTS');
      case 'Meals': return this.translateService.instant('STATIC_FEES_PAGE.CATEGORY_MEALS');
      case 'Transportation': return this.translateService.instant('STATIC_FEES_PAGE.CATEGORY_TRANSPORTATION');
      case 'Registration': return this.translateService.instant('STATIC_FEES_PAGE.CATEGORY_REGISTRATION');
      case 'Late Pickup': return this.translateService.instant('STATIC_FEES_PAGE.CATEGORY_LATE_PICKUP');
      case 'Other': return this.translateService.instant('STATIC_FEES_PAGE.CATEGORY_OTHER');
      default: return category || '';
    }
  }

  translatePaymentMethod(method: string | undefined): string {
    switch (method) {
      case 'Cash': return this.translateService.instant('STATIC_FEES_PAGE.METHOD_CASH');
      case 'Check': return this.translateService.instant('STATIC_FEES_PAGE.METHOD_CHECK');
      case 'BankTransfer': return this.translateService.instant('STATIC_FEES_PAGE.METHOD_BANK_TRANSFER');
      case 'Other': return this.translateService.instant('STATIC_FEES_PAGE.METHOD_OTHER');
      default: return method || '';
    }
  }
}
