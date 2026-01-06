import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgSelectModule } from '@ng-select/ng-select';
import { FeeService } from '../fee.service';
import { ChildrenService } from '../../children/children.service';
import { FeeModel } from '../fee.interface';
import { ChildModel } from '../../children/children.interface';
import Swal from 'sweetalert2';
import { PageTitleService } from '../../../core/services/page-title.service';
import { Subscription } from 'rxjs';
import { TitlePage, Breadcrumb, TitleAction } from '../../../shared/layouts/title-page/title-page';

@Component({
  selector: 'app-fee-edit',
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, NgSelectModule, TitlePage],
  standalone: true,
  templateUrl: './fee-edit.component.html',
  styleUrls: ['./fee-edit.component.scss']
})
export class FeeEditComponent implements OnInit, OnDestroy {
  feeForm!: FormGroup;
  children: ChildModel[] = [];
  loading = false;
  saving = false;
  feeId: number = 0;
  private langChangeSub?: Subscription;
  breadcrumbs: Breadcrumb[] = [];

  // Options for ng-select
  feeTypes: Array<{ value: string; label: string; icon: string }> = [];
  statuses: Array<{ value: string; label: string; icon: string }> = [];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private feeService: FeeService,
    private childrenService: ChildrenService,
    private translate: TranslateService,
    private pageTitleService: PageTitleService
  ) {}

  ngOnInit() {
    this.pageTitleService.setTitle(this.translate.instant('EDIT_FEE.TITLE'));
    this.feeId = Number(this.route.snapshot.paramMap.get('id'));
    this.updateTranslatedContent();
    this.initForm();
    this.loadChildren();
    this.loadFee();

    this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      this.updateTranslatedContent();
      this.pageTitleService.setTitle(this.translate.instant('EDIT_FEE.TITLE'));
    });
  }

  ngOnDestroy(): void {
    this.langChangeSub?.unsubscribe();
  }

  private updateTranslatedContent(): void {
    this.breadcrumbs = [
      { label: this.translate.instant('FEES_PAGE.DASHBOARD') },
      { label: this.translate.instant('FEES_PAGE.FEES_LABEL'), url: '/fees' },
      { label: this.translate.instant('EDIT_FEE.TITLE') }
    ];

    this.feeTypes = [
      { value: 'monthly', label: this.translate.instant('EDIT_FEE.MONTHLY'), icon: 'bi-calendar-month' },
      { value: 'one-time', label: this.translate.instant('EDIT_FEE.ONE_TIME'), icon: 'bi-1-circle' },
      { value: 'late-fee', label: this.translate.instant('EDIT_FEE.LATE_FEE'), icon: 'bi-exclamation-circle' }
    ];

    this.statuses = [
      { value: 'pending', label: this.translate.instant('EDIT_FEE.PENDING'), icon: 'bi-clock' },
      { value: 'paid', label: this.translate.instant('EDIT_FEE.PAID'), icon: 'bi-check-circle' },
      { value: 'overdue', label: this.translate.instant('EDIT_FEE.OVERDUE'), icon: 'bi-x-circle' }
    ];
  }

  getActions(): TitleAction[] {
    return [
      {
        label: this.translate.instant('FEES_PAGE.BACK'),
        icon: 'bi bi-arrow-left',
        class: 'custom-btn-2 btn-cancel-2',
        action: () => this.cancel()
      }
    ];
  }

  private initForm(): void {
    this.feeForm = this.fb.group({
      id: [0],
      childId: [null, [Validators.required, Validators.min(1)]],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      description: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
      dueDate: ['', [Validators.required]],
      feeType: ['monthly', [Validators.required]],
      status: ['pending', [Validators.required]],
      notes: ['', [Validators.maxLength(500)]]
    });
  }

  loadChildren() {
    this.childrenService.loadChildren().subscribe({
      next: (children: ChildModel[]) => {
        this.children = children;
      },
      error: (error: any) => {
        console.error('Error loading children:', error);
        Swal.fire({
          icon: 'error',
          title: this.translate.instant('MESSAGES.ERROR'),
          text: this.translate.instant('MESSAGES.LOAD_CHILDREN_ERROR')
        });
      }
    });
  }

  loadFee() {
    this.loading = true;
    this.feeService.getFeeById(this.feeId).subscribe({
      next: (fee) => {
        // Format date for input
        let dueDate = fee.dueDate;
        if (dueDate) {
          dueDate = new Date(dueDate).toISOString().split('T')[0];
        }

        this.feeForm.patchValue({
          id: fee.id,
          childId: fee.childId,
          amount: fee.amount,
          description: fee.description,
          dueDate: dueDate,
          feeType: fee.feeType || 'monthly',
          status: fee.status || 'pending',
          notes: fee.notes || ''
        });
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading fee:', error);
        this.loading = false;
        Swal.fire({
          icon: 'error',
          title: this.translate.instant('MESSAGES.ERROR'),
          text: this.translate.instant('EDIT_FEE.LOAD_ERROR')
        }).then(() => {
          this.router.navigate(['/fees']);
        });
      }
    });
  }

  updateFee(): void {
    if (this.feeForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.saving = true;
    const feeData: FeeModel = this.feeForm.value;

    this.feeService.updateFee(this.feeId, feeData).subscribe({
      next: () => {
        this.saving = false;
        Swal.fire({
          icon: 'success',
          title: this.translate.instant('MESSAGES.SUCCESS'),
          text: this.translate.instant('EDIT_FEE.UPDATE_SUCCESS')
        }).then(() => {
          this.router.navigate(['/fees']);
        });
      },
      error: (error) => {
        this.saving = false;
        console.error('Error updating fee:', error);
        Swal.fire({
          icon: 'error',
          title: this.translate.instant('MESSAGES.ERROR'),
          text: this.translate.instant('EDIT_FEE.UPDATE_ERROR')
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
