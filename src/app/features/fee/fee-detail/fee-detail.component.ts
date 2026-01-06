import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TitlePage, Breadcrumb, TitleAction } from '../../../shared/layouts/title-page/title-page';
import { FeeService } from '../fee.service';
import { FeeModel } from '../fee.interface';
import { PaymentService } from '../../../core/services/payment.service';
import { AuthService } from '../../../core/services/auth';
import { ParentChildHeaderSimpleComponent } from '../../../shared/components/parent-child-header-simple/parent-child-header-simple.component';
import { Location } from '@angular/common';
import { AppCurrencyPipe } from '../../../core/services/currency/currency.pipe';
import { PageTitleService } from '../../../core/services/page-title.service';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-fee-detail',
  imports: [CommonModule, TitlePage, ParentChildHeaderSimpleComponent, AppCurrencyPipe, TranslateModule],
  templateUrl: './fee-detail.component.html',
  styleUrls: ['./fee-detail.component.scss']
})
export class FeeDetailComponent implements OnInit, OnDestroy {
  fee: FeeModel | null = null;
  loading = false;
  feeId: number = 0;
  private langChangeSub?: Subscription;

  breadcrumbs: Breadcrumb[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private feeService: FeeService,
    private paymentService: PaymentService,
    private authService: AuthService,
    private location: Location,
    private translateService: TranslateService,
    private pageTitleService: PageTitleService
  ) {}

  ngOnInit() {
    this.pageTitleService.setTitle(this.translateService.instant('FEES_PAGE.FEE_RECEIPT'));
    this.feeId = Number(this.route.snapshot.paramMap.get('id'));
    this.updateTranslatedContent();
    this.loadFee();

    this.langChangeSub = this.translateService.onLangChange.subscribe(() => {
      this.updateTranslatedContent();
      this.pageTitleService.setTitle(this.translateService.instant('FEES_PAGE.FEE_RECEIPT'));
    });
  }

  ngOnDestroy(): void {
    this.langChangeSub?.unsubscribe();
  }

  private updateTranslatedContent(): void {
    this.breadcrumbs = [
      { label: this.translateService.instant('FEES_PAGE.DASHBOARD') },
      { label: this.translateService.instant('FEES_PAGE.FEES_LABEL'), url: '/fees' },
      { label: this.translateService.instant('FEES_PAGE.FEE_DETAIL') }
    ];
  }

  getActions(): TitleAction[] {
    return [
      {
        label: this.translateService.instant('FEES_PAGE.BACK'),
        icon: 'bi bi-arrow-left',
        class: 'custom-btn-2 btn-cancel-2',
        action: () => this.goBack()
      },
      {
        label: this.translateService.instant('FEES_PAGE.EDIT'),
        icon: 'bi bi-pencil',
        class: 'custom-btn-2 btn-edit-global-2',
        action: () => this.editFee()
      },
      {
        label: this.translateService.instant('FEES_PAGE.PRINT'),
        icon: 'bi bi-printer',
        class: 'custom-btn-2 btn-view-global-2',
        action: () => this.print()
      }
    ];
  }

  back() {
    this.location.back();
  }

  loadFee() {
    this.loading = true;
    this.feeService.getFeeById(this.feeId).subscribe({
      next: (fee) => {
        this.fee = fee;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading fee:', error);
        this.loading = false;
      }
    });
  }

  goBack() {
    this.router.navigate(['/fees']);
  }

  editFee() {
    this.router.navigate(['/fees/edit', this.feeId]);
  }

  print() {
    window.print();
  }

  payOnline() {
    if (!this.fee || !this.fee.id) return;

    this.loading = true;
    this.paymentService.createCheckoutSession(this.fee.id).subscribe({
      next: (response) => {
        window.location.href = response.url;
      },
      error: (error) => {
        console.error('Error creating checkout session:', error);
        Swal.fire(
          this.translateService.instant('FEES_PAGE.ERROR'),
          this.translateService.instant('FEES_PAGE.PAYMENT_INITIATE_ERROR'),
          'error'
        );
        this.loading = false;
      }
    });
  }

  get isParent(): boolean {
    return this.authService.isParent();
  }
}
