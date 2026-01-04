import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgSelectModule } from '@ng-select/ng-select';
import { ChildModel } from '../children.interface';
import { ChildrenService } from '../children.service';
import { ParentService } from '../../parent/parent.service';
import { ParentModel } from '../../parent/parent.interface';
import { AuthService } from '../../../core/services/auth';
import { TitlePage, Breadcrumb, TitleAction } from '../../../shared/layouts/title-page/title-page';
import { ImageCropperModalComponent } from '../../../shared/components/image-cropper-modal/image-cropper-modal.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-add-children',
  imports: [CommonModule, ReactiveFormsModule, TitlePage, TranslateModule, NgSelectModule, ImageCropperModalComponent],
  standalone: true,
  templateUrl: './add-children.html',
  styleUrl: './add-children.scss'
})
export class AddChildren implements OnInit {
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;
  @ViewChild('imageCropper') imageCropper?: ImageCropperModalComponent;

  saving = false;
  imagePreview: string | null = null;
  selectedImageFile: File | null = null;
  parents: ParentModel[] = [];
  childForm!: FormGroup;

  // Validation constants
  readonly MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
  readonly ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  breadcrumbs: Breadcrumb[] = [];
  titleActions: TitleAction[] = [];

  // Options for ng-select
  genders: { value: string; label: string; icon: string }[] = [];

  constructor(
    private fb: FormBuilder,
    private childrenService: ChildrenService,
    private parentService: ParentService,
    private authService: AuthService,
    private router: Router,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.initGenders();
    this.initBreadcrumbs();
    this.initTitleActions();
    this.initForm();
    this.loadParents();

    // If current user is a parent, auto-select their ID
    const currentParentId = this.authService.getParentId();
    if (currentParentId) {
      this.childForm.patchValue({ parentId: currentParentId });
    }

    // Update translations when language changes
    this.translate.onLangChange.subscribe(() => {
      this.initGenders();
      this.initBreadcrumbs();
      this.initTitleActions();
    });
  }

  private initGenders(): void {
    this.genders = [
      { value: 'Male', label: this.translate.instant('COMMON.MALE'), icon: 'bi-gender-male' },
      { value: 'Female', label: this.translate.instant('COMMON.FEMALE'), icon: 'bi-gender-female' }
    ];
  }

  private initBreadcrumbs(): void {
    this.breadcrumbs = [
      { label: this.translate.instant('BREADCRUMBS.CHILDREN'), url: '/children' },
      { label: this.translate.instant('BREADCRUMBS.ADD_CHILD') }
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
    this.router.navigate(['/children']);
  }

  private initForm(): void {
    this.childForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      dateOfBirth: ['', [Validators.required]],
      gender: ['', [Validators.required]],
      allergies: ['', [Validators.maxLength(500)]],
      medicalNotes: ['', [Validators.maxLength(1000)]],
      profilePicture: [''],
      parentId: [0, [Validators.required, Validators.min(1)]],
      isActive: [true]
    });
  }

  loadParents(): void {
    // Only load parents if user is admin or teacher
    if (this.authService.isAdmin() || this.authService.isTeacher()) {
      this.parentService.loadParents().subscribe({
        next: (parents) => {
          this.parents = parents;
        },
        error: (error) => {
          const sanitizedMessage = this.sanitizeLogMessage(error?.message);
          console.error(`Error loading parents: ${sanitizedMessage}`);
          Swal.fire({
            icon: 'error',
            title: this.translate.instant('MESSAGES.ERROR'),
            text: this.translate.instant('MESSAGES.LOAD_PARENTS_ERROR')
          });
        }
      });
    }
  }

  saveChild(): void {
    if (this.childForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.saving = true;
    const childData: ChildModel = this.childForm.value;

    this.childrenService.addChild(childData).subscribe({
      next: () => {
        this.saving = false;
        Swal.fire({
          icon: 'success',
          title: this.translate.instant('MESSAGES.SUCCESS'),
          text: this.translate.instant('MESSAGES.CHILD_CREATED')
        }).then(() => {
          this.router.navigate(['/children']);
        });
      },
      error: (error) => {
        this.saving = false;
        const sanitizedMessage = this.sanitizeLogMessage(error?.message);
        const sanitizedStatus = typeof error?.status === 'number' ? error.status : 0;
        const sanitizedStatusText = this.sanitizeLogMessage(error?.statusText);
        console.error(`Failed to create child: status=${sanitizedStatus}, statusText=${sanitizedStatusText}, message=${sanitizedMessage}`);

        Swal.fire({
          icon: 'error',
          title: this.translate.instant('MESSAGES.ERROR'),
          text: this.translate.instant('MESSAGES.CHILD_CREATE_ERROR')
        });
      }
    });
  }

  private sanitizeLogMessage(input: unknown): string {
    if (typeof input !== 'string') {
      return 'Unknown';
    }
    return input
      .substring(0, 200)
      .replace(/[\r\n\t]/g, ' ')
      .replace(/[^\x20-\x7E]/g, '');
  }

  cancel(): void {
    if (this.childForm.dirty) {
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
          this.router.navigate(['/children']);
        }
      });
    } else {
      this.router.navigate(['/children']);
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
    this.childForm.patchValue({ profilePicture: croppedImage });
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
    this.childForm.patchValue({ profilePicture: '' });
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  private getReadableFileSize(): string {
    const sizeInMB = this.MAX_FILE_SIZE / (1024 * 1024);
    return `${sizeInMB}MB`;
  }

  private markFormGroupTouched(): void {
    Object.values(this.childForm.controls).forEach(control => {
      control.markAsTouched();
    });
  }

  get formControls() {
    return this.childForm.controls;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.childForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.childForm.get(fieldName);
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
      return this.translate.instant('VALIDATION.REQUIRED');
    }
    return this.translate.instant('VALIDATION.INVALID_FIELD');
  }

  isParent(): boolean {
    return this.authService.isParent();
  }
}
