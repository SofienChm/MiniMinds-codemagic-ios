import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgSelectModule } from '@ng-select/ng-select';
import { FeeService } from '../fee.service';
import { ChildrenService } from '../../children/children.service';
import { CreateFeeModel } from '../fee.interface';
import { ChildModel } from '../../children/children.interface';
import { TitlePage, Breadcrumb, TitleAction } from '../../../shared/layouts/title-page/title-page';
import Swal from 'sweetalert2';
import { PageTitleService } from '../../../core/services/page-title.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-add-fee',
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, NgSelectModule, TitlePage],
  standalone: true,
  templateUrl: './add-fee.component.html',
  styleUrls: ['./add-fee.component.scss']
})
export class AddFeeComponent implements OnInit, OnDestroy {
  feeForm!: FormGroup;
  children: ChildModel[] = [];
  loading = false;
  saving = false;
  private langChangeSub?: Subscription;

  breadcrumbs: Breadcrumb[] = [];
  titleActions: TitleAction[] = [];

  // Options for ng-select
  feeTypes: Array<{ value: string; label: string; icon: string }> = [];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private feeService: FeeService,
    private childrenService: ChildrenService,
    private translate: TranslateService,
    private pageTitleService: PageTitleService
  ) {}

  ngOnInit() {
    this.pageTitleService.setTitle(this.translate.instant('ADD_FEE.TITLE'));
    this.updateTranslatedContent();
    this.initForm();
    this.loadChildren();
    this.setDefaultDueDate();

    this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      this.updateTranslatedContent();
      this.pageTitleService.setTitle(this.translate.instant('ADD_FEE.TITLE'));
    });
  }

  ngOnDestroy(): void {
    this.langChangeSub?.unsubscribe();
  }

  private updateTranslatedContent(): void {
    this.breadcrumbs = [
      { label: this.translate.instant('ADD_FEE.FEES'), url: '/fees' },
      { label: this.translate.instant('ADD_FEE.ADD_FEE') }
    ];

    this.titleActions = [
      {
        label: this.translate.instant('ADD_FEE.BACK_TO_FEES'),
        icon: 'bi bi-arrow-left',
        class: 'btn-cancel-global',
        action: () => this.cancel()
      }
    ];

    this.feeTypes = [
      { value: 'monthly', label: this.translate.instant('ADD_FEE.MONTHLY'), icon: 'bi-calendar-month' },
      { value: 'one-time', label: this.translate.instant('ADD_FEE.ONE_TIME'), icon: 'bi-1-circle' },
      { value: 'late-fee', label: this.translate.instant('ADD_FEE.LATE_FEE'), icon: 'bi-exclamation-circle' }
    ];
  }

  private initForm(): void {
    this.feeForm = this.fb.group({
      childId: [null, [Validators.required, Validators.min(1)]],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      description: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
      dueDate: ['', [Validators.required]],
      feeType: ['monthly', [Validators.required]],
      notes: ['', [Validators.maxLength(500)]]
    });
  }

  loadChildren() {
    this.loading = true;
    this.childrenService.loadChildren().subscribe({
      next: (children: ChildModel[]) => {
        this.children = children;
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading children:', error);
        this.loading = false;
        Swal.fire({
          icon: 'error',
          title: this.translate.instant('MESSAGES.ERROR'),
          text: this.translate.instant('MESSAGES.LOAD_CHILDREN_ERROR')
        });
      }
    });
  }

  setDefaultDueDate() {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    this.feeForm.patchValue({
      dueDate: nextMonth.toISOString().split('T')[0]
    });
  }

  createFee(): void {
    if (this.feeForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.saving = true;
    const feeData: CreateFeeModel = this.feeForm.value;

    this.feeService.createFee(feeData).subscribe({
      next: () => {
        this.saving = false;
        Swal.fire({
          icon: 'success',
          title: this.translate.instant('MESSAGES.SUCCESS'),
          text: this.translate.instant('ADD_FEE.CREATE_SUCCESS')
        }).then(() => {
          this.router.navigate(['/fees']);
        });
      },
      error: (error) => {
        this.saving = false;
        console.error('Error creating fee:', error);
        Swal.fire({
          icon: 'error',
          title: this.translate.instant('MESSAGES.ERROR'),
          text: this.translate.instant('ADD_FEE.CREATE_ERROR')
        });
      }
    });
  }

  private markFormGroupTouched(): void {
    Object.values(this.feeForm.controls).forEach(control => {
      control.markAsTouched();
    });
  }

  cancel(): void {
    if (this.feeForm.dirty) {
      Swal.fire({
        title: this.translate.instant('MESSAGES.UNSAVED_CHANGES'),
        text: this.translate.instant('MESSAGES.UNSAVED_CHANGES_TEXT'),
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: this.translate.instant('MESSAGES.YES_LEAVE'),
        cancelButtonText: this.translate.instant('MESSAGES.STAY')
      }).then((result) => {
        if (result.isConfirmed) {
          this.router.navigate(['/fees']);
        }
      });
    } else {
      this.router.navigate(['/fees']);
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.feeForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.feeForm.get(fieldName);
    if (!field || !field.errors) return '';

    if (field.errors['required']) {
      return this.translate.instant('VALIDATION.REQUIRED');
    }
    if (field.errors['minlength']) {
      const minLength = field.errors['minlength'].requiredLength;
      return this.translate.instant('VALIDATION.MIN_LENGTH', { length: minLength });
    }
    if (field.errors['maxlength']) {
      const maxLength = field.errors['maxlength'].requiredLength;
      return this.translate.instant('VALIDATION.MAX_LENGTH', { length: maxLength });
    }
    if (field.errors['min']) {
      return this.translate.instant('VALIDATION.MIN_VALUE');
    }
    return this.translate.instant('VALIDATION.INVALID_FIELD');
  }
}