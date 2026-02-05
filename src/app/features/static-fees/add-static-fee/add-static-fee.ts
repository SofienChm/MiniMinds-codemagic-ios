import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { TitlePage, Breadcrumb, TitleAction } from '../../../shared/layouts/title-page/title-page';
import { StaticFeesService, CreateStaticFeeDto } from '../static-fees.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PageTitleService } from '../../../core/services/page-title.service';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { HttpClient } from '@angular/common/http';
import { ApiConfig } from '../../../core/config/api.config';

interface ParentOption {
  id: number;
  fullName: string;
  email?: string;
}

interface ChildOption {
  id: number;
  fullName: string;
}

@Component({
  selector: 'app-add-static-fee',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TitlePage, NgSelectModule, TranslateModule],
  templateUrl: './add-static-fee.html',
  styleUrls: ['./add-static-fee.scss']
})
export class AddStaticFeeComponent implements OnInit, OnDestroy {
  breadcrumbs: Breadcrumb[] = [];
  actions: TitleAction[] = [];
  private langChangeSub?: Subscription;

  staticFeeForm!: FormGroup;
  submitting = false;
  loading = false;
  errorMessage = '';

  // Options for dropdowns
  parents: ParentOption[] = [];
  children: ChildOption[] = [];
  categories: string[] = [];
  paymentMethods: string[] = [];
  statusOptions = [
    { value: 'Pending', label: 'Pending' },
    { value: 'Paid', label: 'Paid' }
  ];

  constructor(
    private fb: FormBuilder,
    private staticFeesService: StaticFeesService,
    private router: Router,
    private translateService: TranslateService,
    private pageTitleService: PageTitleService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.pageTitleService.setTitle(this.translateService.instant('STATIC_FEES_PAGE.ADD_STATIC_FEE'));
    this.initForm();
    this.loadDropdownData();
    this.updateTranslatedContent();

    this.langChangeSub = this.translateService.onLangChange.subscribe(() => {
      this.updateTranslatedContent();
      this.pageTitleService.setTitle(this.translateService.instant('STATIC_FEES_PAGE.ADD_STATIC_FEE'));
    });
  }

  ngOnDestroy(): void {
    this.langChangeSub?.unsubscribe();
  }

  private initForm(): void {
    const today = new Date().toISOString().split('T')[0];

    this.staticFeeForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
      description: ['', [Validators.maxLength(1000)]],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      payerName: ['', [Validators.maxLength(200)]],
      payerEmail: ['', [Validators.email, Validators.maxLength(100)]],
      payerPhone: ['', [Validators.maxLength(50)]],
      parentId: [null],
      childId: [null],
      status: ['Pending', Validators.required],
      paymentMethod: ['Cash', Validators.required],
      referenceNumber: ['', [Validators.maxLength(100)]],
      feeDate: [today, Validators.required],
      paidDate: [null],
      notes: ['', [Validators.maxLength(1000)]],
      category: [null]
    });

    // Watch status to enable/disable paidDate
    this.staticFeeForm.get('status')?.valueChanges.subscribe(status => {
      const paidDateControl = this.staticFeeForm.get('paidDate');
      if (status === 'Paid') {
        paidDateControl?.setValue(paidDateControl?.value || today);
      }
    });
  }

  private loadDropdownData(): void {
    this.loading = true;

    // Load categories
    this.staticFeesService.getCategories().subscribe({
      next: (cats) => this.categories = cats,
      error: () => this.categories = []
    });

    // Load payment methods
    this.staticFeesService.getPaymentMethods().subscribe({
      next: (methods) => this.paymentMethods = methods,
      error: () => this.paymentMethods = ['Cash', 'Check', 'BankTransfer', 'Other']
    });

    // Load parents
    this.http.get<any[]>(`${ApiConfig.ENDPOINTS.PARENTS}`).subscribe({
      next: (list) => {
        this.parents = list.map(p => ({
          id: p.id,
          fullName: `${p.firstName} ${p.lastName}`,
          email: p.email
        }));
      },
      error: () => this.parents = []
    });

    // Load children
    this.http.get<any[]>(`${ApiConfig.ENDPOINTS.CHILDREN}`).subscribe({
      next: (list) => {
        this.children = list.map(c => ({
          id: c.id,
          fullName: `${c.firstName} ${c.lastName}`
        }));
        this.loading = false;
      },
      error: () => {
        this.children = [];
        this.loading = false;
      }
    });
  }

  updateTranslatedContent(): void {
    this.breadcrumbs = [
      { label: this.translateService.instant('STATIC_FEES_PAGE.DASHBOARD'), url: '/dashboard' },
      { label: this.translateService.instant('STATIC_FEES_PAGE.TITLE'), url: '/static-fees' },
      { label: this.translateService.instant('STATIC_FEES_PAGE.ADD_STATIC_FEE') }
    ];

    this.actions = [
      {
        label: this.translateService.instant('STATIC_FEES_PAGE.BACK_TO_LIST'),
        icon: 'bi bi-arrow-left',
        class: 'btn-cancel-global',
        action: () => this.cancel()
      }
    ];

    this.statusOptions = [
      { value: 'Pending', label: this.translateService.instant('STATIC_FEES_PAGE.PENDING') },
      { value: 'Paid', label: this.translateService.instant('STATIC_FEES_PAGE.PAID') }
    ];
  }

  cancel(): void {
    if (this.staticFeeForm.dirty) {
      Swal.fire({
        title: this.translateService.instant('STATIC_FEES_PAGE.UNSAVED_CHANGES'),
        text: this.translateService.instant('STATIC_FEES_PAGE.UNSAVED_CHANGES_MESSAGE'),
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: this.translateService.instant('STATIC_FEES_PAGE.YES_LEAVE'),
        cancelButtonText: this.translateService.instant('STATIC_FEES_PAGE.NO_STAY')
      }).then((result) => {
        if (result.isConfirmed) {
          this.router.navigate(['/static-fees']);
        }
      });
    } else {
      this.router.navigate(['/static-fees']);
    }
  }

  createStaticFee(): void {
    if (this.staticFeeForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.errorMessage = '';
    this.submitting = true;

    const formValue = this.staticFeeForm.value;
    const dto: CreateStaticFeeDto = {
      title: formValue.title.trim(),
      description: formValue.description?.trim() || undefined,
      amount: formValue.amount,
      payerName: formValue.payerName?.trim() || undefined,
      payerEmail: formValue.payerEmail?.trim() || undefined,
      payerPhone: formValue.payerPhone?.trim() || undefined,
      parentId: formValue.parentId || undefined,
      childId: formValue.childId || undefined,
      status: formValue.status,
      paymentMethod: formValue.paymentMethod,
      referenceNumber: formValue.referenceNumber?.trim() || undefined,
      feeDate: formValue.feeDate,
      paidDate: formValue.status === 'Paid' ? formValue.paidDate : undefined,
      notes: formValue.notes?.trim() || undefined,
      category: formValue.category || undefined
    };

    this.staticFeesService.createStaticFee(dto).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: this.translateService.instant('STATIC_FEES_PAGE.SUCCESS'),
          text: this.translateService.instant('STATIC_FEES_PAGE.FEE_CREATED'),
          timer: 2000,
          showConfirmButton: false
        }).then(() => {
          this.router.navigate(['/static-fees']);
        });
      },
      error: (err) => {
        this.errorMessage = err.error?.message || this.translateService.instant('STATIC_FEES_PAGE.FAILED_TO_CREATE');
        this.submitting = false;
      }
    });
  }

  private markFormGroupTouched(): void {
    Object.values(this.staticFeeForm.controls).forEach(control => {
      control.markAsTouched();
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.staticFeeForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.staticFeeForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) {
        return this.translateService.instant('STATIC_FEES_PAGE.FIELD_REQUIRED');
      }
      if (field.errors['minlength']) {
        return this.translateService.instant('STATIC_FEES_PAGE.MIN_LENGTH', { min: field.errors['minlength'].requiredLength });
      }
      if (field.errors['maxlength']) {
        return this.translateService.instant('STATIC_FEES_PAGE.MAX_LENGTH', { max: field.errors['maxlength'].requiredLength });
      }
      if (field.errors['min']) {
        return this.translateService.instant('STATIC_FEES_PAGE.MIN_AMOUNT');
      }
      if (field.errors['email']) {
        return this.translateService.instant('STATIC_FEES_PAGE.INVALID_EMAIL');
      }
    }
    return '';
  }

  onParentChange(parentId: number | null): void {
    // Auto-fill payer info from parent
    if (parentId) {
      const parent = this.parents.find(p => p.id === parentId);
      if (parent) {
        this.staticFeeForm.patchValue({
          payerName: parent.fullName,
          payerEmail: parent.email || ''
        });
      }
    }
  }
}
