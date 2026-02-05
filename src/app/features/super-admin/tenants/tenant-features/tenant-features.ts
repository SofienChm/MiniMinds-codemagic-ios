import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { TenantFeatureService } from '../../../../core/services/tenant-feature.service';
import { TenantService } from '../../../../core/services/tenant.service';
import { TenantFeature, TenantFeaturesResponse, FeatureToggle } from '../../../../core/interfaces/dto/tenant-dto';
import { TitlePage, TitleAction, Breadcrumb } from '../../../../shared/layouts/title-page/title-page';
import { HeaderSuperadminComponent } from '../../header-superadmin/header';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-tenant-features',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TranslateModule, TitlePage, HeaderSuperadminComponent],
  templateUrl: './tenant-features.html',
  styleUrls: ['./tenant-features.scss']
})
export class TenantFeatures implements OnInit, OnDestroy {
  tenantId!: number;
  tenantName = '';
  features: TenantFeature[] = [];
  groupedFeatures: Map<string, TenantFeature[]> = new Map();
  loading = true;
  saving = false;
  error: string | null = null;

  breadcrumbs: Breadcrumb[] = [];
  private subscriptions: Subscription[] = [];

  // Track pending changes
  pendingChanges: Map<string, boolean> = new Map();
  hasChanges = false;

  constructor(
    private tenantFeatureService: TenantFeatureService,
    private tenantService: TenantService,
    private route: ActivatedRoute,
    private router: Router,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.tenantId = +id;
      this.loadTenantFeatures();
    }

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
      { label: this.tenantName || this.translate.instant('SUPER_ADMIN.DAYCARE_DETAILS'), url: `/super-admin/tenants/detail/${this.tenantId}` },
      { label: this.translate.instant('SUPER_ADMIN.FEATURE_SETTINGS') }
    ];
  }

  private loadTenantFeatures(): void {
    this.loading = true;
    const sub = this.tenantFeatureService.getTenantFeatures(this.tenantId).subscribe({
      next: (response) => {
        this.tenantName = response.tenantName;
        this.features = response.features;
        this.groupedFeatures = this.tenantFeatureService.groupFeaturesByCategory(response.features);
        this.setupBreadcrumbs();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading tenant features:', err);
        this.error = 'Failed to load feature settings';
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

    if (this.hasChanges) {
      actions.push({
        label: this.translate.instant('COMMON.SAVE'),
        icon: 'bi bi-check-lg',
        class: 'btn-edit-global-2',
        action: () => this.saveChanges()
      });
    }

    return actions;
  }

  goBack(): void {
    if (this.hasChanges) {
      Swal.fire({
        title: this.translate.instant('COMMON.UNSAVED_CHANGES'),
        text: this.translate.instant('COMMON.UNSAVED_CHANGES_MESSAGE'),
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#6c757d',
        confirmButtonText: this.translate.instant('COMMON.YES_LEAVE'),
        cancelButtonText: this.translate.instant('COMMON.STAY')
      }).then((result) => {
        if (result.isConfirmed) {
          this.router.navigate(['/super-admin/tenants/detail', this.tenantId]);
        }
      });
    } else {
      this.router.navigate(['/super-admin/tenants/detail', this.tenantId]);
    }
  }

  onFeatureToggle(feature: TenantFeature): void {
    // Show warning for core features but still allow toggle
    if (feature.isCore && feature.isEnabled) {
      Swal.fire({
        title: this.translate.instant('SUPER_ADMIN.DISABLE_CORE_FEATURE'),
        text: this.translate.instant('SUPER_ADMIN.DISABLE_CORE_FEATURE_WARNING'),
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: this.translate.instant('COMMON.YES_DISABLE'),
        cancelButtonText: this.translate.instant('COMMON.CANCEL')
      }).then((result) => {
        if (result.isConfirmed) {
          feature.isEnabled = false;
          this.pendingChanges.set(feature.featureCode, false);
          this.hasChanges = this.pendingChanges.size > 0;
        }
      });
      return;
    }

    // Toggle the feature
    feature.isEnabled = !feature.isEnabled;
    this.pendingChanges.set(feature.featureCode, feature.isEnabled);
    this.hasChanges = this.pendingChanges.size > 0;
  }

  saveChanges(): void {
    if (!this.hasChanges || this.saving) return;

    this.saving = true;
    const toggles: FeatureToggle[] = Array.from(this.pendingChanges.entries()).map(([code, enabled]) => ({
      featureCode: code,
      isEnabled: enabled
    }));

    const sub = this.tenantFeatureService.updateTenantFeatures(this.tenantId, { features: toggles }).subscribe({
      next: (response) => {
        this.features = response.features;
        this.groupedFeatures = this.tenantFeatureService.groupFeaturesByCategory(response.features);
        this.pendingChanges.clear();
        this.hasChanges = false;
        this.saving = false;

        Swal.fire({
          title: this.translate.instant('MESSAGES.SUCCESS'),
          text: this.translate.instant('SUPER_ADMIN.FEATURES_UPDATED'),
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      },
      error: (err) => {
        console.error('Error saving features:', err);
        this.saving = false;
        Swal.fire(
          this.translate.instant('MESSAGES.ERROR'),
          this.translate.instant('SUPER_ADMIN.FEATURES_UPDATE_FAILED'),
          'error'
        );
      }
    });
    this.subscriptions.push(sub);
  }

  getCategoryIcon(category: string): string {
    const icons: { [key: string]: string } = {
      'Core': 'bi-star-fill',
      'Activities': 'bi-activity',
      'Media': 'bi-images',
      'Schedule': 'bi-calendar',
      'Finance': 'bi-currency-dollar',
      'Communication': 'bi-chat',
      'Attendance': 'bi-calendar-check',
      'Education': 'bi-book',
      'AI': 'bi-robot'
    };
    return icons[category] || 'bi-grid';
  }

  getCategoryClass(category: string): string {
    const classes: { [key: string]: string } = {
      'Core': 'bg-primary',
      'Activities': 'bg-success',
      'Media': 'bg-info',
      'Schedule': 'bg-warning',
      'Finance': 'bg-danger',
      'Communication': 'bg-secondary',
      'Attendance': 'bg-primary',
      'Education': 'bg-success',
      'AI': 'bg-dark'
    };
    return classes[category] || 'bg-secondary';
  }
}
