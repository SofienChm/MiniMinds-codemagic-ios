import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgSelectModule } from '@ng-select/ng-select';
import { EducatorModel } from '../educator.interface';
import { EducatorService } from '../educator.service';
import { Breadcrumb, TitleAction, TitlePage } from '../../../shared/layouts/title-page/title-page';
import { ImageCropperModalComponent } from '../../../shared/components/image-cropper-modal/image-cropper-modal.component';
import { SimpleToastService } from '../../../core/services/simple-toast.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-add-educator',
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, NgSelectModule, ImageCropperModalComponent, TitlePage],
  standalone: true,
  templateUrl: './add-educator.html',
  styleUrl: './add-educator.scss'
})
export class AddEducator implements OnInit {
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;
  @ViewChild('imageCropper') imageCropper?: ImageCropperModalComponent;

  saving = false;
  imagePreview: string | null = null;
  selectedImageFile: File | null = null;
  educatorForm!: FormGroup;

  // Validation constants
  readonly MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
  readonly ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  readonly PHONE_PATTERN = /^\+?[1-9]\d{0,14}$/;
  readonly EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  breadcrumbs: Breadcrumb[] = [];
  titleActions: TitleAction[] = [];

  // Options for ng-select
  specializations = [
    { value: 'Early Childhood Education', label: 'Early Childhood Education', icon: 'bi-mortarboard' },
    { value: 'Special Education', label: 'Special Education', icon: 'bi-heart' },
    { value: 'Montessori', label: 'Montessori', icon: 'bi-puzzle' },
    { value: 'Music', label: 'Music', icon: 'bi-music-note-beamed' },
    { value: 'Art', label: 'Art', icon: 'bi-palette' },
    { value: 'Physical Education', label: 'Physical Education', icon: 'bi-dribbble' },
    { value: 'Language', label: 'Language', icon: 'bi-translate' },
    { value: 'Other', label: 'Other', icon: 'bi-three-dots' }
  ];

  constructor(
    private fb: FormBuilder,
    private educatorService: EducatorService,
    private router: Router,
    private translate: TranslateService,
    private simpleToastService: SimpleToastService,
  ) {}

  ngOnInit(): void {
    this.initBreadcrumbs();
    this.initTitleActions();
    this.initForm();
  }

  private initBreadcrumbs(): void {
    this.breadcrumbs = [
      { label: this.translate.instant('BREADCRUMBS.DASHBOARD') },
      { label: this.translate.instant('BREADCRUMBS.EDUCATORS'), url: '/educators' },
      { label: this.translate.instant('BREADCRUMBS.ADD_EDUCATOR') }
    ];
  }

  private initTitleActions(): void {
    this.titleActions = [
      {
        label: this.translate.instant('COMMON.BACK'),
        icon: 'bi bi-arrow-left',
        class: 'btn-cancel-2',
        action: () => this.cancel()
      }
    ];
  }

  private initForm(): void {
    this.educatorForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      phone: ['', [Validators.pattern(this.PHONE_PATTERN)]],
      dateOfBirth: ['', [Validators.required]],
      hireDate: ['', [Validators.required]],
      specialization: [''],
      salary: [0, [Validators.required, Validators.min(0)]],
      address: ['', [Validators.maxLength(500)]],
      profilePicture: [''],
      isActive: [true]
    });
  }

  saveEducator(): void {
    if (this.educatorForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.saving = true;
    const educatorData: EducatorModel = this.educatorForm.value;

    this.educatorService.addEducator(educatorData).subscribe({
      next: () => {
        this.saving = false;
        this.simpleToastService.success(this.translate.instant('MESSAGES.EDUCATOR_CREATED'));
        setTimeout(() => {
          this.router.navigate(['/educators']);
        }, 200);
      },
      error: (error) => {
        this.saving = false;
        console.error('Failed to create educator:', error);

        const errorMessage = this.extractErrorMessage(error);

        Swal.fire({
          icon: 'error',
          title: this.translate.instant('MESSAGES.ERROR'),
          text: errorMessage
        });
      }
    });
  }

  private extractErrorMessage(error: any): string {
    if (error?.error) {
      // Handle .NET validation errors format
      if (error.error.errors) {
        const errorMessages: string[] = [];
        for (const key in error.error.errors) {
          if (error.error.errors.hasOwnProperty(key)) {
            const messages = error.error.errors[key];
            if (Array.isArray(messages)) {
              errorMessages.push(...messages);
            }
          }
        }
        if (errorMessages.length > 0) {
          return errorMessages.join('\n');
        }
      }

      // Handle custom error message format
      if (error.error.message) {
        return error.error.message;
      }

      // Handle string error
      if (typeof error.error === 'string') {
        return error.error;
      }
    }

    // Handle duplicate email
    if (error?.status === 409 || error?.error?.message?.includes('already exists')) {
      return this.translate.instant('MESSAGES.EMAIL_ALREADY_EXISTS');
    }

    // Default fallback
    return this.translate.instant('MESSAGES.EDUCATOR_CREATE_ERROR');
  }

  cancel(): void {
    if (this.educatorForm.dirty) {
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
          this.router.navigate(['/educators']);
        }
      });
    } else {
      this.router.navigate(['/educators']);
    }
  }

  onImageSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    // Validate file type
    if (!this.ALLOWED_IMAGE_TYPES.includes(file.type)) {
        this.simpleToastService.error(
          this.translate.instant('MESSAGES.ALLOWED_IMAGE_TYPES')
        );
      
      this.resetFileInput();
      return;
    }

    // Validate file size
    if (file.size > this.MAX_FILE_SIZE) {
        this.simpleToastService.error(
          this.translate.instant('MESSAGES.MAX_FILE_SIZE', { size: this.getReadableFileSize() })
        );
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
    this.educatorForm.patchValue({ profilePicture: croppedImage });
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
    this.educatorForm.patchValue({ profilePicture: '' });
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  private getReadableFileSize(): string {
    const sizeInMB = this.MAX_FILE_SIZE / (1024 * 1024);
    return `${sizeInMB}MB`;
  }

  private markFormGroupTouched(): void {
    Object.values(this.educatorForm.controls).forEach(control => {
      control.markAsTouched();
    });
  }

  get formControls() {
    return this.educatorForm.controls;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.educatorForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.educatorForm.get(fieldName);
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
    if (field.errors['min']) {
      return this.translate.instant('VALIDATION.MIN_VALUE', { value: field.errors['min'].min });
    }
    if (field.errors['pattern']) {
      if (fieldName === 'phone') {
        return this.translate.instant('VALIDATION.INVALID_PHONE');
      }
    }
    return this.translate.instant('VALIDATION.INVALID_FIELD');
  }
}
