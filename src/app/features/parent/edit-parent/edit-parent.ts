import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgSelectModule } from '@ng-select/ng-select';
import { Subscription } from 'rxjs';
import { ParentService } from '../parent.service';
import { ChildrenService } from '../../children/children.service';
import { ParentModel, ChildInfo } from '../parent.interface';
import { ChildModel } from '../../children/children.interface';
import { Breadcrumb, TitleAction, TitlePage } from '../../../shared/layouts/title-page/title-page';
import { ImageCropperModalComponent } from '../../../shared/components/image-cropper-modal/image-cropper-modal.component';
import { PageTitleService } from '../../../core/services/page-title.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-edit-parent',
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TranslateModule, NgSelectModule, ImageCropperModalComponent, TitlePage],
  standalone: true,
  templateUrl: './edit-parent.html',
  styleUrl: './edit-parent.scss'
})
export class EditParent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;
  @ViewChild('childFileInput') childFileInput?: ElementRef<HTMLInputElement>;
  @ViewChild('imageCropper') imageCropper?: ImageCropperModalComponent;
  @ViewChild('childImageCropper') childImageCropper?: ImageCropperModalComponent;

  loading = true;
  saving = false;
  showAddChild = false;
  imagePreview: string | null = null;
  childImagePreview: string | null = null;
  selectedImageFile: File | null = null;
  selectedChildImageFile: File | null = null;
  parentId: number = 0;
  parentForm!: FormGroup;
  childForm!: FormGroup;
  children: ChildInfo[] = [];
  private langChangeSub?: Subscription;

  // Validation constants
  readonly MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
  readonly ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  readonly PHONE_PATTERN = /^\+?[1-9]\d{0,14}$/;
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
    private route: ActivatedRoute,
    private router: Router,
    private parentService: ParentService,
    private childrenService: ChildrenService,
    private translate: TranslateService,
    private pageTitleService: PageTitleService
  ) {}

  ngOnInit(): void {
    this.parentId = Number(this.route.snapshot.paramMap.get('id'));
    this.pageTitleService.setTitle(this.translate.instant('PARENTS.EDIT_PARENT'));
    this.initBreadcrumbs();
    this.initTitleActions();
    this.initSelectOptions();
    this.initForm();
    this.initChildForm();
    this.loadParent();

    this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      this.pageTitleService.setTitle(this.translate.instant('PARENTS.EDIT_PARENT'));
      this.initBreadcrumbs();
      this.initTitleActions();
      this.initSelectOptions();
    });
  }

  ngOnDestroy(): void {
    this.langChangeSub?.unsubscribe();
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
      { label: this.translate.instant('BREADCRUMBS.DASHBOARD') },
      { label: this.translate.instant('BREADCRUMBS.PARENTS'), url: '/parents' },
      { label: this.translate.instant('BREADCRUMBS.EDIT_PARENT') }
    ];
  }

  private initForm(): void {
    this.parentForm = this.fb.group({
      id: [0],
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

  private initChildForm(): void {
    this.childForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      dateOfBirth: ['', [Validators.required]],
      gender: ['', [Validators.required]],
      allergies: ['', [Validators.maxLength(500)]],
      medicalNotes: ['', [Validators.maxLength(1000)]],
      profilePicture: [''],
      parentId: [0]
    });
  }

  loadParent(): void {
    this.loading = true;
    this.parentService.getParentWithChildren(this.parentId).subscribe({
      next: (parent) => {
        // Format date for input
        let dateOfBirth = parent.dateOfBirth;
        if (dateOfBirth) {
          dateOfBirth = new Date(dateOfBirth).toISOString().split('T')[0];
        }

        // Patch form with parent data
        this.parentForm.patchValue({
          id: parent.id,
          firstName: parent.firstName,
          lastName: parent.lastName,
          email: parent.email,
          phoneNumber: parent.phoneNumber,
          address: parent.address || '',
          emergencyContact: parent.emergencyContact || '',
          profilePicture: parent.profilePicture || '',
          gender: parent.gender || '',
          dateOfBirth: dateOfBirth || '',
          work: parent.work || '',
          zipCode: parent.zipCode || '',
          parentType: parent.parentType || '',
          isActive: parent.isActive
        });

        this.imagePreview = parent.profilePicture || null;

        // Calculate age for each child
        if (parent.children) {
          this.children = parent.children.map(child => ({
            ...child,
            age: this.calculateAge(child.dateOfBirth)
          }));
        }

        this.childForm.patchValue({ parentId: parent.id });
        this.loading = false;
      },
      error: (error) => {
        const sanitizedMessage = this.sanitizeLogMessage(error?.message);
        console.error(`Error loading parent: ${sanitizedMessage}`);
        this.loading = false;
        Swal.fire({
          icon: 'error',
          title: this.translate.instant('MESSAGES.ERROR'),
          text: this.translate.instant('EDIT_PARENT.LOAD_ERROR')
        }).then(() => {
          this.router.navigate(['/parents']);
        });
      }
    });
  }

  calculateAge(dateOfBirth: string): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  updateParent(): void {
    if (this.parentForm.invalid) {
      this.markFormGroupTouched(this.parentForm);
      return;
    }

    this.saving = true;
    const parentData: ParentModel = this.parentForm.value;

    this.parentService.updateParent(parentData).subscribe({
      next: () => {
        this.saving = false;
        Swal.fire({
          icon: 'success',
          title: this.translate.instant('MESSAGES.SUCCESS'),
          text: this.translate.instant('EDIT_PARENT.UPDATE_SUCCESS')
        }).then(() => {
          this.router.navigate(['/parents/detail', this.parentId]);
        });
      },
      error: (error) => {
        this.saving = false;
        const sanitizedMessage = this.sanitizeLogMessage(error?.message);
        const sanitizedStatus = typeof error?.status === 'number' ? error.status : 0;
        const sanitizedStatusText = this.sanitizeLogMessage(error?.statusText);
        console.error(`Failed to update parent: status=${sanitizedStatus}, statusText=${sanitizedStatusText}, message=${sanitizedMessage}`);

        Swal.fire({
          icon: 'error',
          title: this.translate.instant('MESSAGES.ERROR'),
          text: this.translate.instant('EDIT_PARENT.UPDATE_ERROR')
        });
      }
    });
  }

  addChild(): void {
    if (this.childForm.invalid) {
      this.markFormGroupTouched(this.childForm);
      return;
    }

    this.saving = true;
    const childData: ChildModel = this.childForm.value;

    this.childrenService.addChild(childData).subscribe({
      next: () => {
        this.saving = false;
        this.showAddChild = false;
        this.resetChildForm();
        Swal.fire({
          icon: 'success',
          title: this.translate.instant('MESSAGES.SUCCESS'),
          text: this.translate.instant('MESSAGES.CHILD_CREATED')
        });
        this.loadParent();
      },
      error: (error) => {
        this.saving = false;
        const sanitizedMessage = this.sanitizeLogMessage(error?.message);
        console.error(`Failed to add child: ${sanitizedMessage}`);

        Swal.fire({
          icon: 'error',
          title: this.translate.instant('MESSAGES.ERROR'),
          text: this.translate.instant('MESSAGES.CHILD_CREATE_ERROR')
        });
      }
    });
  }

  resetChildForm(): void {
    this.childForm.reset({
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      gender: '',
      allergies: '',
      medicalNotes: '',
      profilePicture: '',
      parentId: this.parentId
    });
    this.childImagePreview = null;
    if (this.childFileInput?.nativeElement) {
      this.childFileInput.nativeElement.value = '';
    }
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
          this.router.navigate(['/parents/detail', this.parentId]);
        }
      });
    } else {
      this.router.navigate(['/parents/detail', this.parentId]);
    }
  }

  toggleAddChild(): void {
    this.showAddChild = !this.showAddChild;
    if (this.showAddChild) {
      this.resetChildForm();
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

  onChildImageSelect(event: Event): void {
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
      if (this.childFileInput?.nativeElement) {
        this.childFileInput.nativeElement.value = '';
      }
      return;
    }

    // Validate file size
    if (file.size > this.MAX_FILE_SIZE) {
      Swal.fire({
        icon: 'error',
        title: this.translate.instant('MESSAGES.FILE_TOO_LARGE'),
        text: this.translate.instant('MESSAGES.MAX_FILE_SIZE', { size: this.getReadableFileSize() })
      });
      if (this.childFileInput?.nativeElement) {
        this.childFileInput.nativeElement.value = '';
      }
      return;
    }

    // Open child image cropper modal
    this.selectedChildImageFile = file;
    if (this.childImageCropper) {
      this.childImageCropper.show();
    }
  }

  onChildImageCropped(croppedImage: string): void {
    this.childImagePreview = croppedImage;
    this.childForm.patchValue({ profilePicture: croppedImage });
    this.selectedChildImageFile = null;
  }

  onChildCropCancelled(): void {
    this.selectedChildImageFile = null;
    if (this.childFileInput?.nativeElement) {
      this.childFileInput.nativeElement.value = '';
    }
  }

  removeImage(): void {
    this.resetFileInput();
  }

  removeChildImage(): void {
    this.childImagePreview = null;
    this.childForm.patchValue({ profilePicture: '' });
    if (this.childFileInput?.nativeElement) {
      this.childFileInput.nativeElement.value = '';
    }
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

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
    });
  }

  get formControls() {
    return this.parentForm.controls;
  }

  get childFormControls() {
    return this.childForm.controls;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.parentForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  isChildFieldInvalid(fieldName: string): boolean {
    const field = this.childForm.get(fieldName);
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

  getChildFieldError(fieldName: string): string {
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
    return this.translate.instant('VALIDATION.INVALID_FIELD');
  }
}
