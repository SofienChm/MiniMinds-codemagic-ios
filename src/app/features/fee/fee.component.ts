import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import localeIt from '@angular/common/locales/it';
import localeAr from '@angular/common/locales/ar';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TitlePage, TitleAction, Breadcrumb } from '../../shared/layouts/title-page/title-page';
import { FeeService } from './fee.service';
import { ChildrenService } from '../children/children.service';
import { FeeModel, FeesSummary, CreateFeeModel } from './fee.interface';
import { ChildModel } from '../children/children.interface';
import Swal from 'sweetalert2';
import { showSuccessToast } from '../../shared/utils/swal.util';
import { Location } from '@angular/common';
import { AuthService } from '../../core/services/auth';
import { PermissionService } from '../../core/services/permission.service';
import { ParentChildHeaderSimpleComponent } from '../../shared/components/parent-child-header-simple/parent-child-header-simple.component';
import { AppCurrencyPipe } from '../../core/services/currency/currency.pipe';
import { PageTitleService } from '../../core/services/page-title.service';
import { Subscription, firstValueFrom } from 'rxjs';
import { StaticFeesService, StaticFeeModel } from '../static-fees/static-fees.service';

@Component({
  selector: 'app-fee',
  imports: [CommonModule, TitlePage, FormsModule, NgSelectModule, ParentChildHeaderSimpleComponent, AppCurrencyPipe, TranslateModule],
  templateUrl: './fee.component.html',
  styleUrls: ['./fee.component.scss']
})
export class FeeComponent implements OnInit, AfterViewInit, OnDestroy {
  private tooltipInstances: any[] = [];
  private langChangeSub?: Subscription;
  fees: FeeModel[] = [];
  displayedFees: FeeModel[] = [];
  staticFees: StaticFeeModel[] = [];
  children: ChildModel[] = [];
  summary: FeesSummary | null = null;
  loading = false;
  showExportDropdown = false;
  showAddFeeModal = false;
  showBulkFeeModal = false;
  showPaymentModal = false;
  selectedFee: FeeModel | null = null;
  feesPerPage = 9;
  currentPage = 1;

  // Filter options
  filterStatus = 'all';
  filterChild = 'all';
  searchTerm = '';

  statusOptions: Array<{ value: string; label: string; icon: string }> = [];

  childOptions: { value: string; label: string; icon: string }[] = [];

  // New fee form
  newFee: CreateFeeModel = {
    childId: 0,
    amount: 0,
    description: '',
    dueDate: '',
    feeType: 'monthly'
  };

  // Bulk fee form
  bulkFee = {
    amount: 0,
    description: '',
    dueDate: ''
  };

  // Payment form
  paymentData = {
    paidDate: new Date().toISOString().split('T')[0],
    paymentNotes: ''
  };

  breadcrumbs: Breadcrumb[] = [];

  titleActions: TitleAction[] = [];

  constructor(
    private router: Router,
    private feeService: FeeService,
    private childrenService: ChildrenService,
    private staticFeesService: StaticFeesService,
    private location: Location,
    private authService: AuthService,
    private permissionService: PermissionService,
    private translateService: TranslateService,
    private pageTitleService: PageTitleService
  ) {
    registerLocaleData(localeFr);
    registerLocaleData(localeIt);
    registerLocaleData(localeAr);
  }

  ngOnInit() {
    this.pageTitleService.setTitle(this.translateService.instant('FEES_PAGE.TITLE'));
    this.updateTranslatedContent();
    this.loadData();

    this.langChangeSub = this.translateService.onLangChange.subscribe(() => {
      this.updateTranslatedContent();
      this.pageTitleService.setTitle(this.translateService.instant('FEES_PAGE.TITLE'));
      this.updateChildOptions();
    });
  }

  ngAfterViewInit() {
    this.initTooltips();
  }

  ngOnDestroy() {
    this.disposeTooltips();
    this.langChangeSub?.unsubscribe();
  }

  updateTranslatedContent(): void {
    this.breadcrumbs = [
      { label: this.translateService.instant('FEES_PAGE.DASHBOARD') },
      { label: this.translateService.instant('FEES_PAGE.FEES_LABEL') }
    ];

    this.titleActions = [
      {
        label: this.translateService.instant('FEES_PAGE.UPDATE_OVERDUE'),
        class: 'custom-btn-2 btn-view-global-2',
        action: () => this.updateOverdueFees()
      },
      {
        label: this.translateService.instant('FEES_PAGE.BULK_MONTHLY_FEE'),
        class: 'custom-btn-2 btn-edit-global-2',
        action: () => this.openBulkFeeModal()
      },
      {
        label: this.translateService.instant('FEES_PAGE.ADD_FEE'),
        class: 'custom-btn-2 btn-add-global-2',
        action: () => this.navigateToAddFee()
      }
    ];

    this.statusOptions = [
      { value: 'all', label: this.translateService.instant('FEES_PAGE.ALL_STATUS'), icon: 'bi-list-ul' },
      { value: 'pending', label: this.translateService.instant('FEES_PAGE.PENDING'), icon: 'bi-hourglass-split' },
      { value: 'paid', label: this.translateService.instant('FEES_PAGE.PAID'), icon: 'bi-check-circle' },
      { value: 'overdue', label: this.translateService.instant('FEES_PAGE.OVERDUE'), icon: 'bi-exclamation-triangle' }
    ];
  }

  updateChildOptions(): void {
    this.childOptions = [
      { value: 'all', label: this.translateService.instant('FEES_PAGE.ALL_CHILDREN'), icon: 'bi-people' },
      ...this.children.map(child => ({
        value: child.id!.toString(),
        label: `${child.firstName} ${child.lastName}`,
        icon: 'bi-person'
      }))
    ];
  }

  initTooltips() {
    setTimeout(() => {
      this.disposeTooltips();
      const tooltipTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
      this.tooltipInstances = tooltipTriggerList.map(el => new (window as any).bootstrap.Tooltip(el, {
        trigger: 'hover'
      }));
    }, 100);
  }

  disposeTooltips() {
    this.tooltipInstances.forEach(tooltip => tooltip?.dispose());
    this.tooltipInstances = [];
  }
  back() {
    this.location.back();
  }

  loadData() {
    this.loading = true;
    const tasks = [this.loadFees(), this.loadChildren(), this.loadSummary()];
    if (this.isParent) tasks.push(this.loadStaticFees());
    Promise.all(tasks).finally(() => {
      this.loading = false;
      this.initTooltips();
    });
  }

  async loadStaticFees(): Promise<void> {
    try {
      this.staticFees = await firstValueFrom(this.staticFeesService.getMyStaticFees());
    } catch {
      this.staticFees = [];
    }
  }

  viewStaticFeeDetail(id: number): void {
    this.router.navigate(['/static-fees', id]);
  }

  get combinedSummary() {
    const feeTotal = this.summary?.totalAmount || 0;
    const feePaid = this.summary?.paidAmount || 0;
    const feePending = this.summary?.pendingAmount || 0;
    const feeOverdue = this.summary?.overdueAmount || 0;
    const feeCount = this.summary?.totalFees || 0;
    const feePaidCount = this.summary?.paidFees || 0;
    const feePendingCount = this.summary?.pendingFees || 0;
    const feeOverdueCount = this.summary?.overdueFees || 0;

    const staticPaid = this.staticFees.filter(f => f.status === 'Paid').reduce((sum, f) => sum + f.amount, 0);
    const staticPending = this.staticFees.filter(f => f.status === 'Pending').reduce((sum, f) => sum + f.amount, 0);
    const staticPaidCount = this.staticFees.filter(f => f.status === 'Paid').length;
    const staticPendingCount = this.staticFees.filter(f => f.status === 'Pending').length;

    return {
      totalFees: feeCount + this.staticFees.length,
      paidFees: feePaidCount + staticPaidCount,
      pendingFees: feePendingCount + staticPendingCount,
      overdueFees: feeOverdueCount,
      totalAmount: feeTotal + staticPaid + staticPending,
      paidAmount: feePaid + staticPaid,
      pendingAmount: feePending + staticPending,
      overdueAmount: feeOverdue
    };
  }

  get combinedFees(): Array<{ id: number; type: string; title: string; amount: number; date: string; status: string; statusClass: string; navigate: () => void }> {
    const normal = this.fees.map(f => ({
      id: f.id!,
      type: 'Fee',
      title: f.description || f.childName || '',
      amount: f.amount,
      date: f.dueDate,
      status: f.status,
      statusClass: this.getStatusClass(f.status),
      navigate: () => this.navigateToDetail(f.id!)
    }));
    const staticItems = this.staticFees.map(s => ({
      id: s.id,
      type: 'Invoice',
      title: s.title,
      amount: s.amount,
      date: s.feeDate,
      status: s.status,
      statusClass: s.status === 'Paid' ? 'badge bg-success-2' : 'badge bg-warning-2',
      navigate: () => this.viewStaticFeeDetail(s.id)
    }));
    return [...normal, ...staticItems].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  loadFees() {
    return this.feeService.getFees().toPromise().then((fees: FeeModel[] | undefined) => {
      this.fees = fees || [];
    }).catch((error: any) => {
      console.error('Error loading fees:', error);
      this.fees = [];
    });
  }

  loadChildren() {
    return this.childrenService.loadChildren().toPromise().then((children: ChildModel[] | undefined) => {
      this.children = children || [];
      this.updateChildOptions();
    }).catch((error: any) => {
      console.error('Error loading children:', error);
      this.children = [];
      this.childOptions = [{ value: 'all', label: this.translateService.instant('FEES_PAGE.ALL_CHILDREN'), icon: 'bi-people' }];
    });
  }

  loadSummary() {
    return this.feeService.getFeesSummary().toPromise().then((summary: FeesSummary | undefined) => {
      this.summary = summary || null;
    }).catch((error: any) => {
      console.error('Error loading summary:', error);
    });
  }

  get filteredFees() {
    const filtered = this.fees.filter(fee => {
      const matchesStatus = this.filterStatus === 'all' || fee.status === this.filterStatus;
      const matchesChild = this.filterChild === 'all' || fee.childId.toString() === this.filterChild;
      const matchesSearch = !this.searchTerm || 
        fee.childName?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        fee.parentName?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        fee.description.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      return matchesStatus && matchesChild && matchesSearch;
    });
    
    this.updateDisplayedFees(filtered);
    return this.displayedFees;
  }

  updateDisplayedFees(filtered: FeeModel[]) {
    const endIndex = this.currentPage * this.feesPerPage;
    this.displayedFees = filtered.slice(0, endIndex);
  }

  loadMoreFees() {
    this.currentPage++;
    // Trigger getter to update displayed fees
    const _ = this.filteredFees;
  }

  hasMoreFees(): boolean {
    const filtered = this.fees.filter(fee => {
      const matchesStatus = this.filterStatus === 'all' || fee.status === this.filterStatus;
      const matchesChild = this.filterChild === 'all' || fee.childId.toString() === this.filterChild;
      const matchesSearch = !this.searchTerm || 
        fee.childName?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        fee.parentName?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        fee.description.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      return matchesStatus && matchesChild && matchesSearch;
    });
    return this.displayedFees.length < filtered.length;
  }

  navigateToAddFee() {
    this.router.navigate(['/fees/add']);
  }

  navigateToDetail(feeId: number) {
    this.router.navigate(['/fees/detail', feeId]);
  }

  navigateToEdit(feeId: number) {
    this.router.navigate(['/fees/edit', feeId]);
  }

  openBulkFeeModal() {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);

    const currentLang = this.translateService.currentLang || 'en';
    const monthYear = nextMonth.toLocaleDateString(currentLang, { month: 'long', year: 'numeric' });

    this.bulkFee = {
      amount: 0,
      description: `${this.translateService.instant('FEES_PAGE.MONTHLY_FEE')} - ${monthYear}`,
      dueDate: nextMonth.toISOString().split('T')[0]
    };
    this.showBulkFeeModal = true;
  }

  openPaymentModal(fee: FeeModel) {
    this.selectedFee = fee;
    this.paymentData = {
      paidDate: new Date().toISOString().split('T')[0],
      paymentNotes: ''
    };
    this.showPaymentModal = true;
  }

  createFee() {
    if (this.newFee.childId && this.newFee.amount && this.newFee.description && this.newFee.dueDate) {
      this.feeService.createFee(this.newFee).subscribe({
        next: () => {
          this.showAddFeeModal = false;
          this.loadData();
        },
        error: (error) => {
          console.error('Error creating fee:', error);
        }
      });
    }
  }

  createBulkFees() {
    if (this.bulkFee.amount && this.bulkFee.description && this.bulkFee.dueDate) {
      this.feeService.createMonthlyFeesForAll(
        this.bulkFee.amount,
        this.bulkFee.description,
        this.bulkFee.dueDate
      ).subscribe({
        next: (result) => {
          this.showBulkFeeModal = false;
          this.loadData();
          showSuccessToast(this.translateService.instant('FEES_PAGE.SUCCESS'));
        },
        error: (error) => {
          console.error('Error creating bulk fees:', error);
          Swal.fire(
            this.translateService.instant('FEES_PAGE.ERROR'),
            this.translateService.instant('FEES_PAGE.BULK_FEES_ERROR'),
            'error'
          );
        }
      });
    }
  }

  payFee() {
    if (this.selectedFee) {
      this.feeService.payFee(this.selectedFee.id!, {
        feeId: this.selectedFee.id!,
        paidDate: this.paymentData.paidDate,
        paymentNotes: this.paymentData.paymentNotes
      }).subscribe({
        next: () => {
          this.showPaymentModal = false;
          this.loadData();
        },
        error: (error) => {
          console.error('Error paying fee:', error);
        }
      });
    }
  }

  updateOverdueFees() {
    Swal.fire({
      title: this.translateService.instant('FEES_PAGE.UPDATE_OVERDUE_TITLE'),
      text: this.translateService.instant('FEES_PAGE.UPDATE_OVERDUE_TEXT'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: this.translateService.instant('FEES_PAGE.YES_UPDATE'),
      cancelButtonText: this.translateService.instant('FEES_PAGE.CANCEL')
    }).then((result) => {
      if (result.isConfirmed) {
        this.feeService.updateOverdueFees().subscribe({
          next: (result) => {
            this.loadData();
            showSuccessToast(this.translateService.instant('FEES_PAGE.UPDATED'));
          },
          error: (error) => {
            console.error('Error updating overdue fees:', error);
            Swal.fire(
              this.translateService.instant('FEES_PAGE.ERROR'),
              this.translateService.instant('FEES_PAGE.UPDATE_OVERDUE_ERROR'),
              'error'
            );
          }
        });
      }
    });
  }

  deleteFee(fee: FeeModel) {
    Swal.fire({
      title: this.translateService.instant('FEES_PAGE.DELETE_CONFIRM_TITLE'),
      text: this.translateService.instant('FEES_PAGE.DELETE_CONFIRM_TEXT', { childName: fee.childName }),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: this.translateService.instant('FEES_PAGE.YES_DELETE'),
      cancelButtonText: this.translateService.instant('FEES_PAGE.CANCEL')
    }).then((result) => {
      if (result.isConfirmed) {
        this.feeService.deleteFee(fee.id!).subscribe({
          next: () => {
            this.loadData();
            showSuccessToast(this.translateService.instant('FEES_PAGE.DELETED'));
          },
          error: (error) => {
            console.error('Error deleting fee:', error);
            Swal.fire(
              this.translateService.instant('FEES_PAGE.ERROR'),
              this.translateService.instant('FEES_PAGE.DELETE_ERROR'),
              'error'
            );
          }
        });
      }
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'paid': return 'badge bg-success-2';
      case 'overdue': return 'badge bg-danger-2';
      case 'pending': return 'badge bg-warning-2';
      default: return 'badge bg-secondary';
    }
  }

  getFeeTypeClass(feeType: string): string {
    switch (feeType) {
      case 'monthly': return 'badge bg-primary';
      case 'one-time': return 'badge bg-info';
      case 'late-fee': return 'badge bg-danger';
      default: return 'badge bg-secondary';
    }
  }

  get currentLocale(): string {
    return this.translateService.currentLang || this.translateService.defaultLang || 'en';
  }

  translateStatus(status: string): string {
    switch (status) {
      case 'paid': return this.translateService.instant('FEES_PAGE.PAID');
      case 'pending': return this.translateService.instant('FEES_PAGE.PENDING');
      case 'overdue': return this.translateService.instant('FEES_PAGE.OVERDUE');
      case 'Paid': return this.translateService.instant('STATIC_FEES_PAGE.PAID');
      case 'Pending': return this.translateService.instant('STATIC_FEES_PAGE.PENDING');
      default: return status;
    }
  }

  translateFeeType(feeType: string): string {
    switch (feeType) {
      case 'monthly': return this.translateService.instant('FEES_PAGE.MONTHLY_FEE');
      case 'one-time': return this.translateService.instant('FEES_PAGE.ONE_TIME');
      case 'late-fee': return this.translateService.instant('FEES_PAGE.LATE_FEE');
      case 'Monthly': return this.translateService.instant('STATIC_FEES_PAGE.CATEGORY_TUITION');
      default: return feeType;
    }
  }

  translateType(type: string): string {
    return this.translateService.instant('FEES_PAGE.TYPE_' + type.toUpperCase());
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
      case 'Monthly': return this.translateService.instant('FEES_PAGE.MONTHLY_FEE');
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

  toggleExportDropdown() {
    this.showExportDropdown = !this.showExportDropdown;
  }

  exportAsPDF() {
    console.log('Exporting fees as PDF...');
    this.showExportDropdown = false;
  }

  exportAsExcel() {
    console.log('Exporting fees as Excel...');
    this.showExportDropdown = false;
  }
  get isParent(): boolean {
    return this.authService.getUserRole() === 'Parent';
  }

  canEdit(): boolean {
    return this.permissionService.canEdit();
  } 
  canDelete(): boolean {
    return this.permissionService.canDelete();
  }

  canView(): boolean {
    return this.permissionService.canView();
  }
}