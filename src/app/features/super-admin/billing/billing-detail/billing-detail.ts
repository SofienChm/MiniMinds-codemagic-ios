import { Component, OnInit, OnDestroy, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { BillingService } from '../../../../core/services/billing.service';
import { TenantBillingHistory, TenantBilling } from '../../../../core/interfaces/dto/billing-dto';
import { TitlePage, Breadcrumb } from '../../../../shared/layouts/title-page/title-page';
import { HeaderSuperadminComponent } from '../../header-superadmin/header';
import { Location } from '@angular/common';

import Swal from 'sweetalert2';

@Component({
  selector: 'app-billing-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TranslateModule, TitlePage, HeaderSuperadminComponent],
  templateUrl: './billing-detail.html',
  styleUrls: ['./billing-detail.scss']
})
export class BillingDetail implements OnInit, OnDestroy {
  tenantId!: number;
  billingHistory: TenantBillingHistory | null = null;
  loading = true;
  error: string | null = null;

  breadcrumbs: Breadcrumb[] = [];
  private subscriptions: Subscription[] = [];
 isMobile(): boolean {
    return window.innerWidth < 768;
  }

  @HostBinding('class.mobile-mode') get mobileMode() {
    return this.isMobile();
  }
  back() {
    this.location.back();
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private billingService: BillingService,
    private location: Location,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.tenantId = parseInt(id, 10);
      this.loadData();
    } else {
      this.router.navigate(['/super-admin/billing']);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadData(): void {
    this.loading = true;
    const sub = this.billingService.getByTenant(this.tenantId).subscribe({
      next: (history) => {
        this.billingHistory = history;
        this.updateBreadcrumbs();
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to load billing history';
        this.loading = false;
        console.error('Error loading billing history:', err);
      }
    });
    this.subscriptions.push(sub);
  }

  private updateBreadcrumbs(): void {
    this.breadcrumbs = [
      { label: 'Dashboard', url: '/super-admin/dashboard' },
      { label: 'Billing', url: '/super-admin/billing' },
      { label: this.billingHistory?.tenant.name || 'Billing History' }
    ];
  }

  updateStatus(billing: TenantBilling, newStatus: string): void {
    Swal.fire({
      title: this.translate.instant('BILLING.CONFIRM_STATUS_CHANGE'),
      text: this.translate.instant('BILLING.CHANGE_STATUS_TO', { status: newStatus }),
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.translate.instant('BILLING.YES_CHANGE'),
      cancelButtonText: this.translate.instant('BILLING.CANCEL')
    }).then((result) => {
      if (result.isConfirmed) {
        this.billingService.updateStatus(billing.id, newStatus).subscribe({
          next: () => {
            billing.status = newStatus;
            Swal.fire({
              icon: 'success',
              title: this.translate.instant('BILLING.STATUS_UPDATED'),
              showConfirmButton: false,
              timer: 1500
            });
          },
          error: (err) => {
            console.error('Error updating status:', err);
            Swal.fire({
              icon: 'error',
              title: this.translate.instant('BILLING.ERROR'),
              text: err.error?.message || 'Failed to update status'
            });
          }
        });
      }
    });
  }

  deleteBilling(billing: TenantBilling): void {
    Swal.fire({
      title: this.translate.instant('BILLING.CONFIRM_DELETE'),
      text: this.translate.instant('BILLING.DELETE_WARNING'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      confirmButtonText: this.translate.instant('BILLING.YES_DELETE'),
      cancelButtonText: this.translate.instant('BILLING.CANCEL')
    }).then((result) => {
      if (result.isConfirmed) {
        this.billingService.delete(billing.id).subscribe({
          next: () => {
            this.loadData();
            Swal.fire({
              icon: 'success',
              title: this.translate.instant('BILLING.DELETED'),
              showConfirmButton: false,
              timer: 1500
            });
          },
          error: (err) => {
            console.error('Error deleting billing:', err);
            Swal.fire({
              icon: 'error',
              title: this.translate.instant('BILLING.ERROR'),
              text: err.error?.message || 'Failed to delete'
            });
          }
        });
      }
    });
  }

  formatCurrency(amount: number, currency: string = 'EUR'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString();
  }

  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'paid': return 'bg-success';
      case 'pending': return 'bg-warning text-dark';
      case 'failed': return 'bg-danger';
      case 'refunded': return 'bg-secondary';
      default: return 'bg-secondary';
    }
  }

  trackById(index: number, item: any): number {
    return item.id;
  }
}
