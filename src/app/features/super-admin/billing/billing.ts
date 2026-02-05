import { Component, OnInit, OnDestroy, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgSelectModule } from '@ng-select/ng-select';
import { Subscription } from 'rxjs';
import { BillingService } from '../../../core/services/billing.service';
import { TenantService } from '../../../core/services/tenant.service';
import { BillingSummary, TenantBillingSummary, CreateBillingRequest } from '../../../core/interfaces/dto/billing-dto';
import { Tenant } from '../../../core/interfaces/dto/tenant-dto';
import { TitlePage, Breadcrumb } from '../../../shared/layouts/title-page/title-page';
import { HeaderSuperadminComponent } from '../header-superadmin/header';
import { Location } from '@angular/common';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    NgSelectModule,
    TitlePage,
    HeaderSuperadminComponent
  ],
  templateUrl: './billing.html',
  styleUrls: ['./billing.scss']
})
export class Billing implements OnInit, OnDestroy {
  summary: BillingSummary | null = null;
  tenants: Tenant[] = [];
  loading = true;
  showAddModal = false;
  billingForm!: FormGroup;
  submitting = false;

  searchTerm = '';
  statusFilter = '';
  filteredTenants: TenantBillingSummary[] = [];

  breadcrumbs: Breadcrumb[] = [
    { label: 'Dashboard', url: '/super-admin/dashboard' },
    { label: 'Billing Management' }
  ];

  paymentMethods = [
    { value: 'BankTransfer', label: 'Bank Transfer' },
    { value: 'CreditCard', label: 'Credit Card' },
    { value: 'Cash', label: 'Cash' },
    { value: 'Check', label: 'Check' },
    { value: 'Other', label: 'Other' }
  ];

  statuses = [
    { value: 'Pending', label: 'Pending' },
    { value: 'Paid', label: 'Paid' },
    { value: 'Failed', label: 'Failed' },
    { value: 'Refunded', label: 'Refunded' }
  ];

  private subscriptions: Subscription[] = [];

  constructor(
    private billingService: BillingService,
    private tenantService: TenantService,
    private fb: FormBuilder,
    private location: Location,
    private translate: TranslateService
  ) {}

  isMobile(): boolean {
    return window.innerWidth < 768;
  }

  @HostBinding('class.mobile-mode') get mobileMode() {
    return this.isMobile();
  }
  back() {
    this.location.back();
  }
  ngOnInit(): void {
    this.initForm();
    this.loadData();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private initForm(): void {
    this.billingForm = this.fb.group({
      tenantId: [null, Validators.required],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      currency: ['EUR'],
      paymentDate: [this.formatDate(new Date()), Validators.required],
      periodStart: [''],
      periodEnd: [''],
      status: ['Paid'],
      paymentMethod: ['BankTransfer'],
      invoiceNumber: [''],
      notes: ['']
    });
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private loadData(): void {
    this.loading = true;

    const summarySubscription = this.billingService.getSummary().subscribe({
      next: (summary) => {
        this.summary = summary;
        this.filteredTenants = summary.tenants;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading billing summary:', err);
        this.loading = false;
      }
    });
    this.subscriptions.push(summarySubscription);

    const tenantsSubscription = this.tenantService.loadTenants().subscribe({
      next: (tenants) => {
        this.tenants = tenants;
      },
      error: (err) => {
        console.error('Error loading tenants:', err);
      }
    });
    this.subscriptions.push(tenantsSubscription);
  }

  onSearch(): void {
    this.applyFilters();
  }

  onStatusFilterChange(): void {
    this.applyFilters();
  }

  private applyFilters(): void {
    if (!this.summary) return;

    let filtered = [...this.summary.tenants];

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(t => t.name.toLowerCase().includes(term));
    }

    if (this.statusFilter === 'paid') {
      filtered = filtered.filter(t => t.totalPaid > 0);
    } else if (this.statusFilter === 'unpaid') {
      filtered = filtered.filter(t => t.totalPaid === 0);
    } else if (this.statusFilter === 'pending') {
      filtered = filtered.filter(t => t.totalPending > 0);
    }

    this.filteredTenants = filtered;
  }

  openAddModal(): void {
    this.billingForm.reset({
      currency: 'EUR',
      paymentDate: this.formatDate(new Date()),
      status: 'Paid',
      paymentMethod: 'BankTransfer'
    });
    this.showAddModal = true;
  }

  closeAddModal(): void {
    this.showAddModal = false;
  }

  onSubmit(): void {
    if (this.billingForm.invalid) {
      Object.keys(this.billingForm.controls).forEach(key => {
        this.billingForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.submitting = true;
    const formData = this.billingForm.value;

    const billing: CreateBillingRequest = {
      tenantId: formData.tenantId,
      amount: formData.amount,
      currency: formData.currency,
      paymentDate: new Date(formData.paymentDate),
      periodStart: formData.periodStart ? new Date(formData.periodStart) : undefined,
      periodEnd: formData.periodEnd ? new Date(formData.periodEnd) : undefined,
      status: formData.status,
      paymentMethod: formData.paymentMethod,
      invoiceNumber: formData.invoiceNumber,
      notes: formData.notes
    };

    this.billingService.create(billing).subscribe({
      next: () => {
        this.submitting = false;
        this.showAddModal = false;
        this.loadData();
        Swal.fire({
          icon: 'success',
          title: this.translate.instant('BILLING.PAYMENT_ADDED'),
          showConfirmButton: false,
          timer: 1500
        });
      },
      error: (err) => {
        this.submitting = false;
        console.error('Error creating billing:', err);
        Swal.fire({
          icon: 'error',
          title: this.translate.instant('BILLING.ERROR'),
          text: err.error?.message || 'Failed to add payment'
        });
      }
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.billingForm.get(fieldName);
    return field ? field.invalid && (field.dirty || field.touched) : false;
  }

  formatCurrency(amount: number, currency: string = 'EUR'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  formatDateDisplay(date: Date | string | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString();
  }

  getStatusClass(tenant: TenantBillingSummary): string {
    if (tenant.totalPending > 0) return 'status-pending';
    if (tenant.totalPaid > 0) return 'status-paid';
    return 'status-unpaid';
  }

  getStatusLabel(tenant: TenantBillingSummary): string {
    if (tenant.totalPending > 0) return 'BILLING.HAS_PENDING';
    if (tenant.totalPaid > 0) return 'BILLING.PAID';
    return 'BILLING.NO_PAYMENTS';
  }

  trackById(index: number, item: any): number {
    return item.id;
  }
}
