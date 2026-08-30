import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import localeIt from '@angular/common/locales/it';
import localeAr from '@angular/common/locales/ar';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TitlePage, TitleAction, Breadcrumb } from '../../shared/layouts/title-page/title-page';
import { StaticFeesService, StaticFeeModel, StaticFeeSummary } from './static-fees.service';
import { AppCurrencyPipe } from '../../core/services/currency/currency.pipe';
import { PageTitleService } from '../../core/services/page-title.service';
import { PermissionService } from '../../core/services/permission.service';
import { Subscription, firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';
import { showSuccessToast } from '../../shared/utils/swal.util';
import { ExportUtil } from '../../shared/utils/export.util';

@Component({
  selector: 'app-static-fees',
  standalone: true,
  imports: [CommonModule, TitlePage, FormsModule, NgSelectModule, AppCurrencyPipe, TranslateModule],
  templateUrl: './static-fees.html',
  styleUrls: ['./static-fees.scss']
})
export class StaticFeesComponent implements OnInit, OnDestroy {
  private langChangeSub?: Subscription;

  fees: StaticFeeModel[] = [];
  displayedFees: StaticFeeModel[] = [];
  summary: StaticFeeSummary | null = null;
  loading = false;
  feesPerPage = 10;
  currentPage = 1;
  private _totalFilteredCount = 0;

  // Filters
  filterStatus = 'all';
  filterCategory = 'all';
  filterPaymentMethod = 'all';
  filterDate = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`; // defaults to current month
  searchTerm = '';

  // Dropdown options
  statusOptions: Array<{ value: string; label: string; icon: string }> = [];
  categoryOptions: Array<{ value: string; label: string }> = [];
  paymentMethodOptions: Array<{ value: string; label: string }> = [];

  // Bulk modal
  showBulkFeeModal = false;
  bulkSubmitting = false;
  bulkFee = {
    title: '',
    amount: 0,
    feeDate: '',
    paymentMethod: 'Cash',
    category: 'Monthly'
  };

  // Payment modal
  showPaymentModal = false;
  selectedFee: StaticFeeModel | null = null;
  paymentData = {
    paidDate: new Date().toISOString().split('T')[0],
    notes: ''
  };

  breadcrumbs: Breadcrumb[] = [];
  titleActions: TitleAction[] = [];

  constructor(
    private router: Router,
    private staticFeesService: StaticFeesService,
    private translateService: TranslateService,
    private pageTitleService: PageTitleService,
    private permissionService: PermissionService
  ) {
    registerLocaleData(localeFr);
    registerLocaleData(localeIt);
    registerLocaleData(localeAr);
  }

  ngOnInit() {
    this.pageTitleService.setTitle(this.translateService.instant('STATIC_FEES_PAGE.TITLE'));
    this.updateTranslatedContent();
    this.loadData();

    this.langChangeSub = this.translateService.onLangChange.subscribe(() => {
      this.updateTranslatedContent();
      this.pageTitleService.setTitle(this.translateService.instant('STATIC_FEES_PAGE.TITLE'));
    });
  }

  ngOnDestroy() {
    this.langChangeSub?.unsubscribe();
  }

  updateTranslatedContent(): void {
    this.breadcrumbs = [
      { label: this.translateService.instant('STATIC_FEES_PAGE.DASHBOARD'), url: '/dashboard' },
      { label: this.translateService.instant('STATIC_FEES_PAGE.TITLE') }
    ];

    this.titleActions = [
      {
        label: this.translateService.instant('COMMON.EXPORT'),
        class: 'btn btn-light me-2',
        action: () => {},
        dropdown: {
          items: [
            {
              label: this.translateService.instant('COMMON.EXPORT_PDF'),
              icon: 'bi bi-file-earmark-pdf',
              action: () => this.exportToPDF()
            },
            {
              label: this.translateService.instant('COMMON.EXPORT_EXCEL'),
              icon: 'bi bi-file-earmark-excel',
              action: () => this.exportToExcel()
            }
          ]
        }
      },
      {
        label: this.translateService.instant('STATIC_FEES_PAGE.BULK_MONTHLY_FEE'),
        icon: 'bi bi-calendar-plus',
        class: 'custom-btn-2 btn-edit-global-2 me-2',
        action: () => this.openBulkFeeModal()
      },
      {
        label: this.translateService.instant('STATIC_FEES_PAGE.ADD_STATIC_FEE'),
        icon: 'bi bi-plus-lg',
        class: 'custom-btn-2 btn-add-global-2',
        action: () => this.navigateToAdd()
      }
    ];

    this.statusOptions = [
      { value: 'all', label: this.translateService.instant('STATIC_FEES_PAGE.ALL_STATUS'), icon: 'bi-list-ul' },
      { value: 'Pending', label: this.translateService.instant('STATIC_FEES_PAGE.PENDING'), icon: 'bi-hourglass-split' },
      { value: 'Paid', label: this.translateService.instant('STATIC_FEES_PAGE.PAID'), icon: 'bi-check-circle' }
    ];

    this.categoryOptions = [
      { value: 'all', label: this.translateService.instant('STATIC_FEES_PAGE.ALL_CATEGORIES') },
      { value: 'Tuition', label: this.translateService.instant('STATIC_FEES_PAGE.CATEGORY_TUITION') },
      { value: 'Supplies', label: this.translateService.instant('STATIC_FEES_PAGE.CATEGORY_SUPPLIES') },
      { value: 'Events', label: this.translateService.instant('STATIC_FEES_PAGE.CATEGORY_EVENTS') },
      { value: 'Meals', label: this.translateService.instant('STATIC_FEES_PAGE.CATEGORY_MEALS') },
      { value: 'Transportation', label: this.translateService.instant('STATIC_FEES_PAGE.CATEGORY_TRANSPORTATION') },
      { value: 'Registration', label: this.translateService.instant('STATIC_FEES_PAGE.CATEGORY_REGISTRATION') },
      { value: 'Late Pickup', label: this.translateService.instant('STATIC_FEES_PAGE.CATEGORY_LATE_PICKUP') },
      { value: 'Other', label: this.translateService.instant('STATIC_FEES_PAGE.CATEGORY_OTHER') }
    ];

    this.paymentMethodOptions = [
      { value: 'all', label: this.translateService.instant('STATIC_FEES_PAGE.ALL_METHODS') },
      { value: 'Cash', label: this.translateService.instant('STATIC_FEES_PAGE.METHOD_CASH') },
      { value: 'Check', label: this.translateService.instant('STATIC_FEES_PAGE.METHOD_CHECK') },
      { value: 'BankTransfer', label: this.translateService.instant('STATIC_FEES_PAGE.METHOD_BANK_TRANSFER') },
      { value: 'Other', label: this.translateService.instant('STATIC_FEES_PAGE.METHOD_OTHER') }
    ];
  }

  // ── Data loading ────────────────────────────────────────────────────────────

  loadData() {
    this.loading = true;
    Promise.all([
      this.loadFees(),
      this.loadSummary()
    ]).finally(() => {
      this.loading = false;
    });
  }

  async loadFees() {
    const filters: any = {};
    if (this.filterStatus !== 'all') filters.status = this.filterStatus;
    if (this.filterCategory !== 'all') filters.category = this.filterCategory;
    if (this.filterPaymentMethod !== 'all') filters.paymentMethod = this.filterPaymentMethod;

    try {
      const fees = await firstValueFrom(this.staticFeesService.getStaticFees(filters));
      this.fees = fees || [];
      this.currentPage = 1;
      this.updateDisplayedFees();
    } catch {
      this.fees = [];
    }
  }

  async loadSummary() {
    try {
      const summary = await firstValueFrom(this.staticFeesService.getSummary());
      this.summary = summary || null;
    } catch {
      // summary stays null
    }
  }

  // ── Filtering ───────────────────────────────────────────────────────────────

  private getFilteredFees(): StaticFeeModel[] {
    let filtered = this.fees;

    // Month filter  e.g. "2026-03"
    if (this.filterDate) {
      filtered = filtered.filter(fee => fee.feeDate && fee.feeDate.substring(0, 7) === this.filterDate);
    }

    // Search
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(fee =>
        fee.title.toLowerCase().includes(term) ||
        fee.payerName?.toLowerCase().includes(term) ||
        fee.parentName?.toLowerCase().includes(term) ||
        fee.childName?.toLowerCase().includes(term) ||
        fee.referenceNumber?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }

  get computedSummary() {
    const fees = this.getFilteredFees();
    const paid = fees.filter(f => f.status === 'Paid');
    const pending = fees.filter(f => f.status === 'Pending');
    return {
      totalFees: fees.length,
      paidFees: paid.length,
      pendingFees: pending.length,
      totalAmount: fees.reduce((sum, f) => sum + f.amount, 0),
      paidAmount: paid.reduce((sum, f) => sum + f.amount, 0),
      pendingAmount: pending.reduce((sum, f) => sum + f.amount, 0)
    };
  }

  get hasNoFees(): boolean {
    return this.getFilteredFees().length === 0;
  }

  updateDisplayedFees() {
    const allFiltered = this.getFilteredFees();
    const endIndex = this.currentPage * this.feesPerPage;
    this.displayedFees = allFiltered.slice(0, endIndex);
    this._totalFilteredCount = allFiltered.length;
  }

  onFilterChange() {
    this.currentPage = 1;
    this.loadFees();
  }

  onDateFilterChange() {
    this.currentPage = 1;
    this.updateDisplayedFees();
  }

  onSearchChange() {
    this.currentPage = 1;
    this.updateDisplayedFees();
  }

  clearDateFilter() {
    this.filterDate = '';
    this.currentPage = 1;
    this.updateDisplayedFees();
  }

  loadMoreFees() {
    this.currentPage++;
    this.updateDisplayedFees();
  }

  hasMoreFees(): boolean {
    return this.displayedFees.length < this._totalFilteredCount;
  }

  // ── Export ──────────────────────────────────────────────────────────────────

  exportToPDF(): void {
    const fees = this.getFilteredFees();
    const data = fees.map(fee => ({
      [this.translateService.instant('STATIC_FEES_PAGE.TITLE_COLUMN')]: fee.title,
      [this.translateService.instant('STATIC_FEES_PAGE.PAYER')]: fee.payerName || fee.parentName || '-',
      [this.translateService.instant('STATIC_FEES_PAGE.AMOUNT')]: fee.amount,
      [this.translateService.instant('STATIC_FEES_PAGE.FEE_DATE')]: fee.feeDate,
      [this.translateService.instant('STATIC_FEES_PAGE.PAYMENT_METHOD')]: fee.paymentMethod,
      [this.translateService.instant('STATIC_FEES_PAGE.STATUS')]: fee.status,
      [this.translateService.instant('STATIC_FEES_PAGE.REFERENCE_NUMBER')]: fee.referenceNumber || '-'
    }));
    const month = this.filterDate || new Date().toISOString().substring(0, 7);
    ExportUtil.exportToPDF(data, `${this.translateService.instant('STATIC_FEES_PAGE.TITLE')} - ${month}`);
  }

  exportToExcel(): void {
    const fees = this.getFilteredFees();
    const data = fees.map(fee => ({
      [this.translateService.instant('STATIC_FEES_PAGE.TITLE_COLUMN')]: fee.title,
      [this.translateService.instant('STATIC_FEES_PAGE.PAYER')]: fee.payerName || fee.parentName || '-',
      [this.translateService.instant('STATIC_FEES_PAGE.AMOUNT')]: fee.amount,
      [this.translateService.instant('STATIC_FEES_PAGE.FEE_DATE')]: fee.feeDate,
      [this.translateService.instant('STATIC_FEES_PAGE.PAYMENT_METHOD')]: fee.paymentMethod,
      [this.translateService.instant('STATIC_FEES_PAGE.STATUS')]: fee.status,
      [this.translateService.instant('STATIC_FEES_PAGE.REFERENCE_NUMBER')]: fee.referenceNumber || '-'
    }));
    const month = this.filterDate || new Date().toISOString().substring(0, 7);
    ExportUtil.exportToExcel(data, `${this.translateService.instant('STATIC_FEES_PAGE.TITLE')} - ${month}`);
  }

  // ── Bulk monthly fee ────────────────────────────────────────────────────────

  openBulkFeeModal(): void {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);

    const currentLang = this.translateService.getCurrentLang() || 'en';
    const monthYear = nextMonth.toLocaleDateString(currentLang, { month: 'long', year: 'numeric' });

    this.bulkFee = {
      title: `${this.translateService.instant('STATIC_FEES_PAGE.MONTHLY_FEE')} - ${monthYear}`,
      amount: 0,
      feeDate: nextMonth.toISOString().split('T')[0],
      paymentMethod: 'Cash',
      category: 'Monthly'
    };
    this.showBulkFeeModal = true;
  }

  createBulkFees(): void {
    if (!this.bulkFee.title || !this.bulkFee.amount || !this.bulkFee.feeDate) return;

    this.bulkSubmitting = true;
    this.staticFeesService.createBulkMonthlyFees({
      title: this.bulkFee.title,
      amount: this.bulkFee.amount,
      feeDate: this.bulkFee.feeDate,
      paymentMethod: this.bulkFee.paymentMethod,
      category: this.bulkFee.category
    }).subscribe({
      next: (result) => {
        this.showBulkFeeModal = false;
        this.bulkSubmitting = false;
        this.loadData();
        showSuccessToast(
          this.translateService.instant('STATIC_FEES_PAGE.BULK_CREATED', { count: result.count })
        );
      },
      error: (err) => {
        this.bulkSubmitting = false;
        Swal.fire({
          icon: 'error',
          title: this.translateService.instant('STATIC_FEES_PAGE.ERROR'),
          text: err.error?.message || this.translateService.instant('STATIC_FEES_PAGE.BULK_ERROR')
        });
      }
    });
  }

  // ── Navigation ──────────────────────────────────────────────────────────────

  navigateToAdd() {
    this.router.navigate(['/static-fees/add']);
  }

  viewDetail(fee: StaticFeeModel) {
    this.router.navigate(['/static-fees', fee.id]);
  }

  // ── Payment modal ───────────────────────────────────────────────────────────

  openPaymentModal(fee: StaticFeeModel) {
    this.selectedFee = fee;
    this.paymentData = {
      paidDate: new Date().toISOString().split('T')[0],
      notes: ''
    };
    this.showPaymentModal = true;
  }

  markAsPaid() {
    if (!this.selectedFee) return;

    this.staticFeesService.markAsPaid(this.selectedFee.id, {
      paidDate: this.paymentData.paidDate,
      notes: this.paymentData.notes || undefined
    }).subscribe({
      next: () => {
        this.showPaymentModal = false;
        this.loadData();
        showSuccessToast(this.translateService.instant('STATIC_FEES_PAGE.SUCCESS'));
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: this.translateService.instant('STATIC_FEES_PAGE.ERROR'),
          text: err.error?.message || this.translateService.instant('STATIC_FEES_PAGE.FAILED_TO_UPDATE')
        });
      }
    });
  }

  markAsPending(fee: StaticFeeModel) {
    Swal.fire({
      title: this.translateService.instant('STATIC_FEES_PAGE.CONFIRM_MARK_PENDING'),
      text: this.translateService.instant('STATIC_FEES_PAGE.MARK_PENDING_MESSAGE'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f0ad4e',
      cancelButtonColor: '#6c757d',
      confirmButtonText: this.translateService.instant('STATIC_FEES_PAGE.YES_MARK_PENDING'),
      cancelButtonText: this.translateService.instant('STATIC_FEES_PAGE.CANCEL')
    }).then((result) => {
      if (result.isConfirmed) {
        this.staticFeesService.markAsPending(fee.id).subscribe({
          next: () => {
            this.loadData();
            showSuccessToast(this.translateService.instant('STATIC_FEES_PAGE.SUCCESS'));
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: this.translateService.instant('STATIC_FEES_PAGE.ERROR'),
              text: err.error?.message || this.translateService.instant('STATIC_FEES_PAGE.FAILED_TO_UPDATE')
            });
          }
        });
      }
    });
  }

  deleteFee(fee: StaticFeeModel) {
    Swal.fire({
      title: this.translateService.instant('STATIC_FEES_PAGE.DELETE_CONFIRM_TITLE'),
      text: this.translateService.instant('STATIC_FEES_PAGE.DELETE_CONFIRM_MESSAGE', { title: fee.title }),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: this.translateService.instant('STATIC_FEES_PAGE.YES_DELETE'),
      cancelButtonText: this.translateService.instant('STATIC_FEES_PAGE.CANCEL')
    }).then((result) => {
      if (result.isConfirmed) {
        this.staticFeesService.deleteStaticFee(fee.id).subscribe({
          next: () => {
            this.loadData();
            showSuccessToast(this.translateService.instant('STATIC_FEES_PAGE.DELETED'));
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: this.translateService.instant('STATIC_FEES_PAGE.ERROR'),
              text: err.error?.message || this.translateService.instant('STATIC_FEES_PAGE.DELETE_ERROR')
            });
          }
        });
      }
    });
  }

  // ── Style helpers ───────────────────────────────────────────────────────────

  getStatusClass(status: string): string {
    switch (status) {
      case 'Paid': return 'badge bg-success-2';
      case 'Pending': return 'badge bg-warning-2';
      default: return 'badge bg-secondary';
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

  getCategoryClass(category: string | undefined): string {
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

  // ── Permissions ─────────────────────────────────────────────────────────────

  canEdit(): boolean {
    return this.permissionService.canEdit();
  }

  canDelete(): boolean {
    return this.permissionService.canDelete();
  }
}
