import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgSelectModule } from '@ng-select/ng-select';
import { Subscription } from 'rxjs';
import { ParentService } from '../parent.service';
import { ApiConfig } from '../../../core/config/api.config';
import { ChildrenService } from '../../children/children.service';
import { AuthService } from '../../../core/services/auth';
import { ParentModel, ChildInfo } from '../parent.interface';
import { ChildModel } from '../../children/children.interface';
import { Breadcrumb, TitleAction, TitlePage } from '../../../shared/layouts/title-page/title-page';
import { ImageCropperModalComponent } from '../../../shared/components/image-cropper-modal/image-cropper-modal.component';
import { PageTitleService } from '../../../core/services/page-title.service';
import Swal from 'sweetalert2';
import { SimpleToastService } from '../../../core/services/simple-toast.service';

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
  deleting = false;
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
    private authService: AuthService,
    private translate: TranslateService,
    private pageTitleService: PageTitleService,
    private simpleToast: SimpleToastService
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

        // Handle both file-based URL and Base64 for backward compatibility
        if (parent.profilePictureUrl) {
          this.imagePreview = this.getFullImageUrl(parent.profilePictureUrl);
        } else if (parent.profilePicture) {
          this.imagePreview = parent.profilePicture;
        } else {
          this.imagePreview = null;
        }

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
        this.simpleToast.error(this.translate.instant('EDIT_PARENT.LOAD_ERROR'));
        this.router.navigate(['/parents']);
      }
    });
  }


  updateParent(): void {
    if (this.parentForm.invalid) {
      this.markFormGroupTouched(this.parentForm);
      return;
    }

    this.saving = true;
    const parentData: ParentModel = this.parentForm.value;

    // If a new image was selected, upload it separately
    if (this.selectedImageFile && this.parentId) {
      this.parentService.uploadParentProfilePicture(this.parentId, this.selectedImageFile).subscribe({
        next: () => {
          // Clear the profilePicture from the form since it's now file-based
          parentData.profilePicture = undefined;
          this.saveParentData(parentData);
        },
        error: () => {
          // Continue with update even if image upload fails
          this.saveParentData(parentData);
        }
      });
    } else {
      this.saveParentData(parentData);
    }
  }

  private saveParentData(parentData: ParentModel): void {
    this.parentService.updateParent(parentData).subscribe({
      next: () => {
        this.saving = false;
        this.simpleToast.success(this.translate.instant('EDIT_PARENT.UPDATE_SUCCESS'));
        this.router.navigate(['/parents/detail', this.parentId]);
      },
      error: (error) => {
        this.saving = false;
        const sanitizedMessage = this.sanitizeLogMessage(error?.message);
        const sanitizedStatus = typeof error?.status === 'number' ? error.status : 0;
        const sanitizedStatusText = this.sanitizeLogMessage(error?.statusText);
        console.error(`Failed to update parent: status=${sanitizedStatus}, statusText=${sanitizedStatusText}, message=${sanitizedMessage}`);
        this.simpleToast.error(this.translate.instant('EDIT_PARENT.UPDATE_ERROR'));
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
        this.simpleToast.success(this.translate.instant('MESSAGES.CHILD_CREATED'));
        this.loadParent();
      },
      error: (error) => {
        this.saving = false;
        const sanitizedMessage = this.sanitizeLogMessage(error?.message);
        console.error(`Failed to add child: ${sanitizedMessage}`);
        this.simpleToast.error(this.translate.instant('MESSAGES.CHILD_CREATE_ERROR'));
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
      this.simpleToast.error(this.translate.instant('MESSAGES.ALLOWED_IMAGE_TYPES'));
      this.resetFileInput();
      return;
    }

    // Validate file size
    if (file.size > this.MAX_FILE_SIZE) {
      this.simpleToast.error(this.translate.instant('MESSAGES.MAX_FILE_SIZE', { size: this.getReadableFileSize() }));
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
    // Don't store Base64 in form - we'll upload the file separately
    this.parentForm.patchValue({ profilePicture: '' });
    // Convert Base64 to File for upload
    this.selectedImageFile = this.base64ToFile(croppedImage, 'profile.jpg');
  }

  private base64ToFile(base64: string, filename: string): File {
    const arr = base64.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
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
      this.simpleToast.error(this.translate.instant('MESSAGES.ALLOWED_IMAGE_TYPES'));
      if (this.childFileInput?.nativeElement) {
        this.childFileInput.nativeElement.value = '';
      }
      return;
    }

    // Validate file size
    if (file.size > this.MAX_FILE_SIZE) {
      this.simpleToast.error(this.translate.instant('MESSAGES.MAX_FILE_SIZE', { size: this.getReadableFileSize() }));
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
    // If editing an existing parent with a saved profile picture, call API to delete it
    if (this.parentId && this.imagePreview) {
      Swal.fire({
        title: this.translate.instant('MESSAGES.CONFIRM_DELETE'),
        text: this.translate.instant('MESSAGES.DELETE_PROFILE_PICTURE_CONFIRM'),
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: this.translate.instant('COMMON.YES_DELETE'),
        cancelButtonText: this.translate.instant('COMMON.CANCEL')
      }).then((result) => {
        if (result.isConfirmed) {
          this.parentService.deleteParentProfilePicture(this.parentId).subscribe({
            next: () => {
              this.resetFileInput();
              Swal.fire({
                icon: 'success',
                title: this.translate.instant('MESSAGES.SUCCESS'),
                text: this.translate.instant('MESSAGES.PROFILE_PICTURE_DELETED'),
                timer: 2000,
                showConfirmButton: false
              });
            },
            error: (error) => {
              const sanitizedMessage = this.sanitizeLogMessage(error?.message);
              console.error(`Failed to delete profile picture: ${sanitizedMessage}`);
              Swal.fire({
                icon: 'error',
                title: this.translate.instant('MESSAGES.ERROR'),
                text: this.translate.instant('MESSAGES.DELETE_PROFILE_PICTURE_ERROR')
              });
            }
          });
        }
      });
    } else {
      // No saved picture, just clear local state
      this.resetFileInput();
    }
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
    this.selectedImageFile = null;
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

    calculateAge(dateOfBirth: string): { years: number, months: number } {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    if (today.getDate() < birthDate.getDate()) {
      months--;
    }
    if (months < 0) {
      years--;
      months += 12;
    }
    return { years: years < 0 ? 0 : years, months: months < 0 ? 0 : months };
  }

  private getFullImageUrl(path: string): string {
    if (!path) return '';
    // If already a full URL or data URL, return as-is
    if (path.startsWith('http') || path.startsWith('data:')) {
      return path;
    }
    // Get API base URL and construct full path
    const baseUrl = ApiConfig.HUB_URL;
    return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  deleteAccount(): void {
    Swal.fire({
      title: this.translate.instant('SETTINGS.DELETE_ACCOUNT_CONFIRM_TITLE'),
      html: `
        <div class="text-start">
          <p class="text-danger fw-bold mb-3">${this.translate.instant('SETTINGS.DELETE_ACCOUNT_WARNING')}</p>
          <ul class="text-muted small">
            <li>${this.translate.instant('SETTINGS.DELETE_WARNING_1')}</li>
            <li>${this.translate.instant('SETTINGS.DELETE_WARNING_2')}</li>
            <li>${this.translate.instant('SETTINGS.DELETE_WARNING_3')}</li>
            <li>${this.translate.instant('SETTINGS.DELETE_WARNING_4')}</li>
          </ul>
          <p class="mt-3 mb-2">${this.translate.instant('SETTINGS.DELETE_ACCOUNT_TYPE_CONFIRM')}</p>
        </div>
      `,
      input: 'text',
      inputPlaceholder: 'DELETE',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: this.translate.instant('SETTINGS.DELETE_ACCOUNT_BTN'),
      cancelButtonText: this.translate.instant('COMMON.CANCEL'),
      preConfirm: (inputValue) => {
        if (inputValue !== 'DELETE') {
          Swal.showValidationMessage(this.translate.instant('SETTINGS.DELETE_ACCOUNT_TYPE_ERROR'));
          return false;
        }
        return true;
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.deleting = true;
        this.authService.deleteAccount().subscribe({
          next: () => {
            this.deleting = false;
            Swal.fire({
              icon: 'success',
              title: this.translate.instant('SETTINGS.ACCOUNT_DELETED'),
              text: this.translate.instant('SETTINGS.ACCOUNT_DELETED_DESC'),
              allowOutsideClick: false
            }).then(() => {
              this.router.navigate(['/login']);
            });
          },
          error: (error) => {
            this.deleting = false;
            const sanitizedMessage = this.sanitizeLogMessage(error?.message);
            console.error(`Failed to delete account: ${sanitizedMessage}`);
            Swal.fire({
              icon: 'error',
              title: this.translate.instant('MESSAGES.ERROR'),
              text: this.translate.instant('SETTINGS.DELETE_ACCOUNT_ERROR')
            });
          }
        });
      }
    });
  }
}
