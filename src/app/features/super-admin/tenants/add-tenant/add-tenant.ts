import { Component, OnInit, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgSelectModule } from '@ng-select/ng-select';
import { TenantService } from '../../../../core/services/tenant.service';
import { TitlePage, Breadcrumb } from '../../../../shared/layouts/title-page/title-page';
import { Tenant } from '../../../../core/interfaces/dto/tenant-dto';
import { HeaderSuperadminComponent } from '../../header-superadmin/header';
import { Location } from '@angular/common';

@Component({
  selector: 'app-add-tenant',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, TranslateModule, NgSelectModule, TitlePage, HeaderSuperadminComponent],
  templateUrl: './add-tenant.html',
  styleUrls: ['./add-tenant.scss']
})
export class AddTenant implements OnInit {
  tenantForm!: FormGroup;
  loading = false;
  loadingData = false;
  errorMessage = '';
  isEditMode = false;
  tenantId: number | null = null;
  tenant: Tenant | null = null;

  breadcrumbs: Breadcrumb[] = [];
 isMobile(): boolean {
    return window.innerWidth < 768;
  }

  @HostBinding('class.mobile-mode') get mobileMode() {
    return this.isMobile();
  }
  back() {
    this.location.back();
  } 
  timezones = [
    { value: 'UTC', label: 'UTC' },
    { value: 'Europe/Paris', label: 'Europe/Paris (CET)' },
    { value: 'Europe/London', label: 'Europe/London (GMT)' },
    { value: 'America/New_York', label: 'America/New_York (EST)' },
    { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST)' },
    { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
    { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST)' }
  ];

  currencies = [
    { value: 'USD', label: 'USD ($)' },
    { value: 'EUR', label: 'EUR (\u20AC)' },
    { value: 'GBP', label: 'GBP (\u00A3)' },
    { value: 'CAD', label: 'CAD ($)' },
    { value: 'AUD', label: 'AUD ($)' },
    { value: 'JPY', label: 'JPY (\u00A5)' }
  ];

  languages = [
    { value: 'en', label: 'English' },
    { value: 'fr', label: 'Fran\u00E7ais' },
    { value: 'es', label: 'Espa\u00F1ol' },
    { value: 'de', label: 'Deutsch' },
    { value: 'ar', label: '\u0627\u0644\u0639\u0631\u0628\u064A\u0629' }
  ];

  constructor(
    private fb: FormBuilder,
    private tenantService: TenantService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.tenantId = parseInt(id, 10);
    }

    this.initForm();
    this.updateBreadcrumbs();

    if (this.isEditMode && this.tenantId) {
      this.loadTenantData();
    }
  }

  private updateBreadcrumbs(): void {
    this.breadcrumbs = [
      { label: 'Dashboard', url: '/super-admin/dashboard' },
      { label: 'Daycares', url: '/super-admin/tenants' },
      { label: this.isEditMode ? 'Edit Daycare' : 'Add Daycare' }
    ];
  }

  private loadTenantData(): void {
    if (!this.tenantId) return;

    this.loadingData = true;
    this.tenantService.getTenant(this.tenantId).subscribe({
      next: (tenant) => {
        this.tenant = tenant;
        this.populateForm(tenant);
        this.loadingData = false;
      },
      error: (err) => {
        this.loadingData = false;
        this.errorMessage = err.error?.message || 'Failed to load daycare data.';
        console.error('Error loading tenant:', err);
      }
    });
  }

  private populateForm(tenant: Tenant): void {
    this.tenantForm.patchValue({
      name: tenant.name,
      subdomain: tenant.subdomain || '',
      address: tenant.address || '',
      phone: tenant.phone || '',
      email: tenant.email || '',
      timezone: tenant.timezone || 'UTC',
      currency: tenant.currency || 'USD',
      language: tenant.language || 'en'
    });
  }

  private initForm(): void {
    const formConfig: any = {
      // Daycare Information
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
      subdomain: ['', [Validators.maxLength(100), Validators.pattern(/^[a-z0-9-]*$/)]],
      address: ['', [Validators.maxLength(500)]],
      phone: ['', [Validators.maxLength(20)]],
      email: ['', [Validators.email, Validators.maxLength(255)]],
      timezone: ['UTC'],
      currency: ['USD'],
      language: ['en']
    };

    // Only add admin fields in create mode
    if (!this.isEditMode) {
      formConfig.adminFirstName = ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]];
      formConfig.adminLastName = ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]];
      formConfig.adminEmail = ['', [Validators.required, Validators.email]];
      formConfig.adminPassword = ['', [Validators.required, Validators.minLength(6), Validators.maxLength(100)]];
    }

    this.tenantForm = this.fb.group(formConfig);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.tenantForm.get(fieldName);
    return field ? field.invalid && (field.dirty || field.touched) : false;
  }

  getFieldError(fieldName: string): string {
    const field = this.tenantForm.get(fieldName);
    if (!field || !field.errors) return '';

    if (field.errors['required']) return 'VALIDATION.REQUIRED';
    if (field.errors['email']) return 'VALIDATION.INVALID_EMAIL';
    if (field.errors['minlength']) return 'VALIDATION.MIN_LENGTH';
    if (field.errors['maxlength']) return 'VALIDATION.MAX_LENGTH';
    if (field.errors['pattern']) return 'VALIDATION.INVALID_SUBDOMAIN';

    return 'VALIDATION.INVALID';
  }

  onSubmit(): void {
    if (this.tenantForm.invalid) {
      Object.keys(this.tenantForm.controls).forEach(key => {
        this.tenantForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const formData = this.tenantForm.value;

    if (this.isEditMode && this.tenantId) {
      this.tenantService.updateTenant(this.tenantId, formData).subscribe({
        next: () => {
          this.loading = false;
          this.router.navigate(['/super-admin/tenants/detail', this.tenantId]);
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = err.error?.message || 'Failed to update daycare. Please try again.';
          console.error('Error updating tenant:', err);
        }
      });
    } else {
      this.tenantService.createTenant(formData).subscribe({
        next: (tenant) => {
          this.loading = false;
          this.router.navigate(['/super-admin/tenants/detail', tenant.id]);
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = err.error?.message || 'Failed to create daycare. Please try again.';
          console.error('Error creating tenant:', err);
        }
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/super-admin/tenants']);
  }
}
