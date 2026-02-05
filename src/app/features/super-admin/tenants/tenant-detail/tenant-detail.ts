import { Component, OnInit, OnDestroy, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { TenantService } from '../../../../core/services/tenant.service';
import { Tenant } from '../../../../core/interfaces/dto/tenant-dto';
import { TitlePage, TitleAction, Breadcrumb } from '../../../../shared/layouts/title-page/title-page';
import { HeaderSuperadminComponent } from '../../header-superadmin/header';
import { Location } from '@angular/common';

import Swal from 'sweetalert2';

@Component({
  selector: 'app-tenant-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TranslateModule, TitlePage, HeaderSuperadminComponent],
  templateUrl: './tenant-detail.html',
  styleUrls: ['./tenant-detail.scss']
})
export class TenantDetail implements OnInit, OnDestroy {
  tenant: Tenant | null = null;
  loading = true;
  error: string | null = null;
  isMobile(): boolean {
    return window.innerWidth < 768;
  }

  @HostBinding('class.mobile-mode') get mobileMode() {
    return this.isMobile();
  }
  back() {
    this.location.back();
  }
  breadcrumbs: Breadcrumb[] = [];
  private subscriptions: Subscription[] = [];

  constructor(
    private tenantService: TenantService,
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.setupBreadcrumbs();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadTenantDetails(+id);
    }

    // Update breadcrumbs on language change
    const langSub = this.translate.onLangChange.subscribe(() => {
      this.setupBreadcrumbs();
    });
    this.subscriptions.push(langSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private setupBreadcrumbs(): void {
    this.breadcrumbs = [
      { label: this.translate.instant('SUPER_ADMIN.DASHBOARD'), url: '/super-admin/dashboard' },
      { label: this.translate.instant('SUPER_ADMIN.DAYCARES'), url: '/super-admin/tenants' },
      { label: this.tenant?.name || this.translate.instant('SUPER_ADMIN.DAYCARE_DETAILS') }
    ];
  }

  private loadTenantDetails(id: number): void {
    this.loading = true;
    const sub = this.tenantService.getTenant(id).subscribe({
      next: (tenant) => {
        this.tenant = tenant;
        this.setupBreadcrumbs();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading tenant:', err);
        this.error = 'Failed to load daycare details';
        this.loading = false;
      }
    });
    this.subscriptions.push(sub);
  }

  getActions(): TitleAction[] {
    const actions: TitleAction[] = [
      {
        label: this.translate.instant('COMMON.BACK'),
        icon: 'bi bi-arrow-left',
        class: 'btn-outline-secondary btn-cancel-global',
        action: () => this.goBack()
      }
    ];

    if (this.tenant) {
      actions.push({
        label: this.tenant.isActive
          ? this.translate.instant('SUPER_ADMIN.DEACTIVATE')
          : this.translate.instant('SUPER_ADMIN.ACTIVATE'),
        icon: this.tenant.isActive ? 'bi bi-pause-circle' : 'bi bi-play-circle',
        class: this.tenant.isActive ? 'btn-view-global-2' : 'btn-edit-global-2',
        action: () => this.toggleStatus()
      });

      actions.push({
        label: this.translate.instant('SUPER_ADMIN.MANAGE_FEATURES'),
        icon: 'bi bi-toggles',
        class: 'btn-view-global-2',
        action: () => this.manageFeatures()
      });

      actions.push({
        label: this.translate.instant('COMMON.EDIT'),
        icon: 'bi bi-pencil-square',
        class: 'btn-edit-global-2',
        action: () => this.editTenant()
      });

      actions.push({
        label: this.translate.instant('SUPER_ADMIN.DELETE'),
        icon: 'bi bi-trash',
        class: 'btn-remove-2',
        action: () => this.deleteTenant()
      });
    }

    return actions;
  }

  goBack(): void {
    this.router.navigate(['/super-admin/tenants']);
  }

  editTenant(): void {
    if (this.tenant) {
      this.router.navigate(['/super-admin/tenants/edit', this.tenant.id]);
    }
  }

  manageFeatures(): void {
    if (this.tenant) {
      this.router.navigate(['/super-admin/tenants', this.tenant.id, 'features']);
    }
  }

  toggleStatus(): void {
    if (!this.tenant) return;

    const isActive = this.tenant.isActive;
    const actionText = isActive
      ? this.translate.instant('SUPER_ADMIN.DEACTIVATE_CONFIRM')
      : this.translate.instant('SUPER_ADMIN.ACTIVATE_CONFIRM');
    const confirmText = isActive
      ? this.translate.instant('SUPER_ADMIN.YES_DEACTIVATE')
      : this.translate.instant('SUPER_ADMIN.YES_ACTIVATE');

    Swal.fire({
      title: this.translate.instant('COMMON.ARE_YOU_SURE'),
      text: actionText,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: isActive ? '#d33' : '#3085d6',
      cancelButtonColor: '#6c757d',
      confirmButtonText: confirmText,
      cancelButtonText: this.translate.instant('COMMON.CANCEL')
    }).then((result) => {
      if (result.isConfirmed) {
        this.tenantService.updateTenantStatus(this.tenant!.id, !isActive).subscribe({
          next: () => {
            this.tenant!.isActive = !isActive;
            const successMsg = isActive
              ? this.translate.instant('SUPER_ADMIN.DAYCARE_DEACTIVATED')
              : this.translate.instant('SUPER_ADMIN.DAYCARE_ACTIVATED');
            Swal.fire(this.translate.instant('MESSAGES.SUCCESS'), successMsg, 'success');
          },
          error: () => {
            Swal.fire(
              this.translate.instant('MESSAGES.ERROR'),
              this.translate.instant('SUPER_ADMIN.STATUS_UPDATE_FAILED'),
              'error'
            );
          }
        });
      }
    });
  }

  deleteTenant(): void {
    if (!this.tenant) return;

    Swal.fire({
      title: this.translate.instant('COMMON.ARE_YOU_SURE'),
      text: this.translate.instant('SUPER_ADMIN.DELETE_WARNING', { name: this.tenant.name }),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: this.translate.instant('SUPER_ADMIN.YES_DELETE'),
      cancelButtonText: this.translate.instant('COMMON.CANCEL')
    }).then((result) => {
      if (result.isConfirmed) {
        this.tenantService.deleteTenant(this.tenant!.id).subscribe({
          next: () => {
            Swal.fire(
              this.translate.instant('MESSAGES.SUCCESS'),
              this.translate.instant('SUPER_ADMIN.DAYCARE_DELETED'),
              'success'
            ).then(() => {
              this.router.navigate(['/super-admin/tenants']);
            });
          },
          error: () => {
            Swal.fire(
              this.translate.instant('MESSAGES.ERROR'),
              this.translate.instant('SUPER_ADMIN.DELETE_FAILED'),
              'error'
            );
          }
        });
      }
    });
  }

  formatDate(dateString?: string | Date): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getTimezoneDisplay(timezone?: string): string {
    return timezone || 'UTC';
  }

  getCurrencyDisplay(currency?: string): string {
    return currency || 'USD';
  }

  getLanguageDisplay(language?: string): string {
    const languages: { [key: string]: string } = {
      'en': 'English',
      'fr': 'French',
      'it': 'Italian'
    };
    return languages[language || 'en'] || language || 'English';
  }
}
