import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { Location } from '@angular/common';
import { AuthService } from '../../core/services/auth';
import { PermissionService } from '../../core/services/permission.service';
import { ParentChildHeaderSimpleComponent } from '../../shared/components/parent-child-header-simple/parent-child-header-simple.component';
import { AppCurrencyPipe } from '../../core/services/currency/currency.pipe';
import { PageTitleService } from '../../core/services/page-title.service';
import { Subscription } from 'rxjs';

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
    private location: Location,
    private authService: AuthService,
    private permissionService: PermissionService,
    private translateService: TranslateService,
    private pageTitleService: PageTitleService
  ) {}

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
    Promise.all([
      this.loadFees(),
      this.loadChildren(),
      this.loadSummary()
    ]).finally(() => {
      this.loading = false;
      this.initTooltips();
    });
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
          Swal.fire(
            this.translateService.instant('FEES_PAGE.SUCCESS'),
            this.translateService.instant('FEES_PAGE.BULK_FEES_CREATED', { count: result.count }),
            'success'
          );
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
            Swal.fire(
              this.translateService.instant('FEES_PAGE.UPDATED'),
              this.translateService.instant('FEES_PAGE.FEES_MARKED_OVERDUE', { count: result.count }),
              'success'
            );
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
            Swal.fire(
              this.translateService.instant('FEES_PAGE.DELETED'),
              this.translateService.instant('FEES_PAGE.FEE_DELETED_SUCCESS'),
              'success'
            );
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