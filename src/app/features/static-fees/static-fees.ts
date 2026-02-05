import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TitlePage, TitleAction, Breadcrumb } from '../../shared/layouts/title-page/title-page';
import { StaticFeesService, StaticFeeModel, StaticFeeSummary } from './static-fees.service';
import { AppCurrencyPipe } from '../../core/services/currency/currency.pipe';
import { PageTitleService } from '../../core/services/page-title.service';
import { PermissionService } from '../../core/services/permission.service';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';

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

  // Filters
  filterStatus = 'all';
  filterCategory = 'all';
  filterPaymentMethod = 'all';
  searchTerm = '';

  // Dropdown options
  statusOptions: Array<{ value: string; label: string; icon: string }> = [];
  categoryOptions: Array<{ value: string; label: string }> = [];
  paymentMethodOptions: Array<{ value: string; label: string }> = [];

  // Modal for marking as paid
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
  ) {}

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

  loadData() {
    this.loading = true;
    Promise.all([
      this.loadFees(),
      this.loadSummary()
    ]).finally(() => {
      this.loading = false;
    });
  }

  loadFees() {
    const filters: any = {};
    if (this.filterStatus !== 'all') filters.status = this.filterStatus;
    if (this.filterCategory !== 'all') filters.category = this.filterCategory;
    if (this.filterPaymentMethod !== 'all') filters.paymentMethod = this.filterPaymentMethod;

    return this.staticFeesService.getStaticFees(filters).toPromise().then((fees: StaticFeeModel[] | undefined) => {
      this.fees = fees || [];
      this.currentPage = 1;
      this.updateDisplayedFees();
    }).catch((error: any) => {
      console.error('Error loading static fees:', error);
      this.fees = [];
    });
  }

  loadSummary() {
    return this.staticFeesService.getSummary().toPromise().then((summary: StaticFeeSummary | undefined) => {
      this.summary = summary || null;
    }).catch((error: any) => {
      console.error('Error loading summary:', error);
    });
  }

  get filteredFees(): StaticFeeModel[] {
    let filtered = this.fees;

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

  updateDisplayedFees() {
    const endIndex = this.currentPage * this.feesPerPage;
    this.displayedFees = this.filteredFees.slice(0, endIndex);
  }

  onFilterChange() {
    this.loadFees();
  }

  onSearchChange() {
    this.currentPage = 1;
    this.updateDisplayedFees();
  }

  loadMoreFees() {
    this.currentPage++;
    this.updateDisplayedFees();
  }

  hasMoreFees(): boolean {
    return this.displayedFees.length < this.filteredFees.length;
  }

  navigateToAdd() {
    this.router.navigate(['/static-fees/add']);
  }

  navigateToDetail(id: number) {
    this.router.navigate(['/static-fees/detail', id]);
  }

  navigateToEdit(id: number) {
    this.router.navigate(['/static-fees/edit', id]);
  }

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
        Swal.fire({
          icon: 'success',
          title: this.translateService.instant('STATIC_FEES_PAGE.SUCCESS'),
          text: this.translateService.instant('STATIC_FEES_PAGE.FEE_MARKED_PAID'),
          timer: 2000,
          showConfirmButton: false
        });
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
            Swal.fire({
              icon: 'success',
              title: this.translateService.instant('STATIC_FEES_PAGE.SUCCESS'),
              text: this.translateService.instant('STATIC_FEES_PAGE.FEE_MARKED_PENDING'),
              timer: 2000,
              showConfirmButton: false
            });
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
            Swal.fire({
              icon: 'success',
              title: this.translateService.instant('STATIC_FEES_PAGE.DELETED'),
              text: this.translateService.instant('STATIC_FEES_PAGE.FEE_DELETED_SUCCESS'),
              timer: 2000,
              showConfirmButton: false
            });
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

  getStatusClass(status: string): string {
    switch (status) {
      case 'Paid': return 'badge bg-success-2';
      case 'Pending': return 'badge bg-warning-2';
      default: return 'badge bg-secondary';
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

  canEdit(): boolean {
    return this.permissionService.canEdit();
  }

  canDelete(): boolean {
    return this.permissionService.canDelete();
  }
}
