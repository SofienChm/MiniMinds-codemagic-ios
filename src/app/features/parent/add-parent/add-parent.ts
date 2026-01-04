import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgSelectModule } from '@ng-select/ng-select';
import { Subscription } from 'rxjs';
import { ParentModel } from '../parent.interface';
import { ParentService } from '../parent.service';
import { TitlePage, Breadcrumb, TitleAction } from '../../../shared/layouts/title-page/title-page';
import { ImageCropperModalComponent } from '../../../shared/components/image-cropper-modal/image-cropper-modal.component';
import { PageTitleService } from '../../../core/services/page-title.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-add-parent',
  imports: [CommonModule, ReactiveFormsModule, TitlePage, TranslateModule, NgSelectModule, ImageCropperModalComponent],
  standalone: true,
  templateUrl: './add-parent.html',
  styleUrl: './add-parent.scss'
})
export class AddParentComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;
  @ViewChild('imageCropper') imageCropper?: ImageCropperModalComponent;

  saving = false;
  imagePreview: string | null = null;
  selectedImageFile: File | null = null;
  parentForm!: FormGroup;
  private langChangeSub?: Subscription;

  // Validation constants
  readonly MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
  readonly ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  readonly PHONE_PATTERN = /^\+?[1-9]\d{0,14}$/; // E.164: 1-15 digits, optionally starting with +
  readonly ZIP_CODE_PATTERN = /^\d{4,10}(-\d{4})?$/;

  // Error message mapping for pattern validation
  private readonly PATTERN_ERROR_FIELDS: Record<string, string> = {
    phoneNumber: 'VALIDATION.INVALID_PHONE',
    emergencyContact: 'VALIDATION.INVALID_PHONE',
    zipCode: 'VALIDATION.INVALID_ZIP_CODE'
  };

  breadcrumbs: Breadcrumb[] = [];
  titleActions: TitleAction[] = [];
  genders: { value: string; label: string; icon: string }[] = [];
  parentTypes: { value: string; label: string; icon: string }[] = [];

  constructor(
    private fb: FormBuilder,
    private parentService: ParentService,
    private router: Router,
    private translate: TranslateService,
    private pageTitleService: PageTitleService
  ) {}

  ngOnInit(): void {
    this.pageTitleService.setTitle(this.translate.instant('PARENTS.ADD_PARENT'));
    this.initBreadcrumbs();
    this.initTitleActions();
    this.initSelectOptions();
    this.initForm();

    this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      this.pageTitleService.setTitle(this.translate.instant('PARENTS.ADD_PARENT'));
      this.initBreadcrumbs();
      this.initTitleActions();
      this.initSelectOptions();
    });
  }

  ngOnDestroy(): void {
    this.langChangeSub?.unsubscribe();
  }

  private initSelectOptions(): void {
    this.genders = [
      { value: 'Male', label: this.translate.instant('COMMON.MALE'), icon: 'bi-gender-male' },
      { value: 'Female', label: this.translate.instant('COMMON.FEMALE'), icon: 'bi-gender-female' }
    ];

    this.parentTypes = [
      { value: 'Father', label: this.translate.instant('PARENTS.FATHER'), icon: 'bi-person' },
      { value: 'Mother', label: this.translate.instant('PARENTS.MOTHER'), icon: 'bi-person' },
      { value: 'Grandfather', label: this.translate.instant('PARENTS.GRANDFATHER'), icon: 'bi-person' },
      { value: 'Grandmother', label: this.translate.instant('PARENTS.GRANDMOTHER'), icon: 'bi-person' },
      { value: 'Guardian', label: this.translate.instant('PARENTS.GUARDIAN'), icon: 'bi-shield-check' }
    ];
  }

  private initBreadcrumbs(): void {
    this.breadcrumbs = [
      { label: this.translate.instant('BREADCRUMBS.PARENTS'), url: '/parents' },
      { label: this.translate.instant('BREADCRUMBS.ADD_PARENT') }
    ];
  }

  private initTitleActions(): void {
    this.titleActions = [
      {
        label: this.translate.instant('COMMON.BACK'),
        icon: 'bi bi-arrow-left',
        class: 'btn-cancel-2',
        action: () => this.back()
      }
    ];
  }

  back(): void {
    this.router.navigate(['/parents']);
  }

  private initForm(): void {
    this.parentForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required, Validators.pattern(this.PHONE_PATTERN)]],
      address: ['', [Validators.maxLength(255)]],
      emergencyContact: ['', [Validators.pattern(this.PHONE_PATTERN)]],
      profilePicture: [''],
      gender: [''],
      dateOfBirth: [''],
      work: ['', [Validators.maxLength(100)]],
      zipCode: ['', [Validators.pattern(this.ZIP_CODE_PATTERN)]],
      parentType: [''],
      isActive: [true]
    });
  }

  saveParent(): void {
    if (this.parentForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.saving = true;
    const parentData: ParentModel = this.parentForm.value;

    this.parentService.addParent(parentData).subscribe({
      next: () => {
        this.saving = false;
        Swal.fire({
          icon: 'success',
          title: this.translate.instant('MESSAGES.SUCCESS'),
          text: this.translate.instant('MESSAGES.PARENT_CREATED')
        }).then(() => {
          this.router.navigate(['/parents']);
        });
      },
      error: (error) => {
        this.saving = false;
        // Sanitize error for logging - remove control characters and newlines
        const sanitizedMessage = this.sanitizeLogMessage(error?.message);
        const sanitizedStatus = typeof error?.status === 'number' ? error.status : 0;
        const sanitizedStatusText = this.sanitizeLogMessage(error?.statusText);
        console.error(`Failed to create parent: status=${sanitizedStatus}, statusText=${sanitizedStatusText}, message=${sanitizedMessage}`);

        // Always use predefined error message - never display raw backend errors
        Swal.fire({
          icon: 'error',
          title: this.translate.instant('MESSAGES.ERROR'),
          text: this.translate.instant('MESSAGES.PARENT_CREATE_ERROR')
        });
      }
    });
  }

  private sanitizeLogMessage(input: unknown): string {
    if (typeof input !== 'string') {
      return 'Unknown';
    }
    // Remove newlines, carriage returns, and other control characters
    return input
      .substring(0, 200)
      .replace(/[\r\n\t]/g, ' ')
      .replace(/[^\x20-\x7E]/g, '');
  }

  cancel(): void {
    if (this.parentForm.dirty) {
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
          this.router.navigate(['/parents']);
        }
      });
    } else {
      this.router.navigate(['/parents']);
    }
  }

  onImageSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    // Validate file type
    if (!this.ALLOWED_IMAGE_TYPES.includes(file.type)) {
      Swal.fire({
        icon: 'error',
        title: this.translate.instant('MESSAGES.INVALID_FILE_TYPE'),
        text: this.translate.instant('MESSAGES.ALLOWED_IMAGE_TYPES')
      });
      this.resetFileInput();
      return;
    }

    // Validate file size
    if (file.size > this.MAX_FILE_SIZE) {
      Swal.fire({
        icon: 'error',
        title: this.translate.instant('MESSAGES.FILE_TOO_LARGE'),
        text: this.translate.instant('MESSAGES.MAX_FILE_SIZE', { size: this.getReadableFileSize() })
      });
      this.resetFileInput();
      return;
    }

    // Open image cropper modal
    this.selectedImageFile = file;
    if (this.imageCropper) {
      this.imageCropper.show();
    }
  }

  onImageCropped(croppedImage: string): void {
    this.imagePreview = croppedImage;
    this.parentForm.patchValue({ profilePicture: croppedImage });
    this.selectedImageFile = null;
  }

  onCropCancelled(): void {
    this.selectedImageFile = null;
    this.resetFileInput();
  }

  removeImage(): void {
    this.resetFileInput();
  }

  private resetFileInput(): void {
    this.imagePreview = null;
    this.parentForm.patchValue({ profilePicture: '' });
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  private getReadableFileSize(): string {
    const sizeInMB = this.MAX_FILE_SIZE / (1024 * 1024);
    return `${sizeInMB}MB`;
  }

  private markFormGroupTouched(): void {
    Object.values(this.parentForm.controls).forEach(control => {
      control.markAsTouched();
    });
  }

  // Getter methods for easy access in template
  get formControls() {
    return this.parentForm.controls;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.parentForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.parentForm.get(fieldName);
    if (!field || !field.errors) return '';

    if (field.errors['required']) {
      return this.translate.instant('VALIDATION.REQUIRED');
    }
    if (field.errors['email']) {
      return this.translate.instant('VALIDATION.INVALID_EMAIL');
    }
    if (field.errors['minlength']) {
      const minLength = field.errors['minlength'].requiredLength;
      return this.translate.instant('VALIDATION.MIN_LENGTH', { length: minLength });
    }
    if (field.errors['maxlength']) {
      const maxLength = field.errors['maxlength'].requiredLength;
      return this.translate.instant('VALIDATION.MAX_LENGTH', { length: maxLength });
    }
    if (field.errors['pattern']) {
      const errorKey = this.PATTERN_ERROR_FIELDS[fieldName];
      if (errorKey) {
        return this.translate.instant(errorKey);
      }
    }
    return this.translate.instant('VALIDATION.INVALID_FIELD');
  }
}
