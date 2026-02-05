import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgSelectModule } from '@ng-select/ng-select';
import { AuthService } from '../../../core/services/auth';
import { LanguageService } from '../../../core/services/langauge-service';
import { TitlePage, Breadcrumb } from '../../../shared/layouts/title-page/title-page';
import { CustomValidators } from '../../../shared/validators/custom.validators';
import { environment } from '../../../../environments/environment';
import { ParentChildHeaderComponent } from '../../../shared/components/parent-child-header/parent-child-header.component';
import { ImageCropperModalComponent } from '../../../shared/components/image-cropper-modal/image-cropper-modal.component';
import { Location } from '@angular/common';
import { SimpleToastService } from '../../../core/services/simple-toast.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-edit-profile',
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, NgSelectModule, TitlePage, ParentChildHeaderComponent, ImageCropperModalComponent],
  standalone: true,
  templateUrl: './edit-profile.html',
  styleUrl: './edit-profile.scss'
})
export class EditProfile implements OnInit {
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;
  @ViewChild('imageCropper') imageCropper?: ImageCropperModalComponent;

  profileForm!: FormGroup;
  securityForm!: FormGroup;
  preferencesForm!: FormGroup;
  saving = false;
  imagePreview: string | null = null;
  selectedImageFile: File | null = null;
  errorMessage = '';
  activeTab = 'personal';
  userRole = '';

  // Validation constants
  readonly MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
  readonly ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  // Language options
  languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' }
  ];

  breadcrumbs: Breadcrumb[] = [];

  isParent(): boolean {
    return this.authService.isParent();
  }

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private router: Router,
    private fb: FormBuilder,
    private location: Location,
    private translate: TranslateService,
    private languageService: LanguageService,
    private simpleToastService: SimpleToastService
  ) {
    this.initBreadcrumbs();
  }

  get currentLang(): string {
    return this.translate.currentLang;
  }

  private initBreadcrumbs(): void {
    this.breadcrumbs = [
      { label: this.translate.instant('BREADCRUMBS.DASHBOARD') },
      { label: this.translate.instant('EDIT_PROFILE.TITLE') }
    ];
  }

  ngOnInit() {
    this.initForms();
    const user = this.authService.getCurrentUser();
    if (user) {
      this.userRole = user.role;
      if (this.isParent()) {
        this.loadParentData();
      } else {
        this.profileForm.patchValue({
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email
        });
        this.imagePreview = user.profilePicture || null;
      }
    }
  }

  loadParentData() {
    const parentId = this.authService.getParentId();
    if (parentId) {
      this.http.get<any>(`${environment.apiUrl}/parents/${parentId}`).subscribe({
        next: (parent) => {
          this.profileForm.patchValue({
            firstName: parent.firstName,
            lastName: parent.lastName,
            email: parent.email,
            phoneNumber: parent.phoneNumber,
            address: parent.address,
            emergencyContact: parent.emergencyContact
          });
          // Use profilePictureUrl (file-based) if available, otherwise fall back to profilePicture (base64)
          if (parent.profilePictureUrl) {
            this.imagePreview = parent.profilePictureUrl.startsWith('/')
              ? environment.apiUrl.replace('/api', '') + parent.profilePictureUrl
              : parent.profilePictureUrl;
          } else {
            this.imagePreview = parent.profilePicture || null;
          }
        },
        error: (err) => {
          console.error('Failed to load parent data:', err);
          this.errorMessage = 'Failed to load profile data';
        }
      });
    }
  }

  initForms() {
    // Phone number is only required for Parents
    const phoneValidators = this.isParent() ? [Validators.required, CustomValidators.phone] : [];

    this.profileForm = this.fb.group({
      firstName: ['', [Validators.required, CustomValidators.noWhitespace, CustomValidators.alphaOnly]],
      lastName: ['', [Validators.required, CustomValidators.noWhitespace, CustomValidators.alphaOnly]],
      email: ['', [Validators.required, CustomValidators.email]],
      phoneNumber: ['', phoneValidators],
      address: [''],
      emergencyContact: [''],
      profilePicture: ['']
    });

    this.securityForm = this.fb.group({
      currentPassword: ['', [Validators.required, Validators.minLength(6)]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required, CustomValidators.matchPassword('newPassword')]]
    });

    // Initialize with current language from localStorage or TranslateService
    const currentLang = localStorage.getItem('lang') || this.translate.currentLang || 'en';
    this.preferencesForm = this.fb.group({
      language: [currentLang],
      timezone: ['UTC']
    });
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
  }

  getInitials(): string {
    const firstName = this.profileForm.get('firstName')?.value || '';
    const lastName = this.profileForm.get('lastName')?.value || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }

  get firstName() { return this.profileForm.get('firstName')!; }
  get lastName() { return this.profileForm.get('lastName')!; }
  get email() { return this.profileForm.get('email')!; }
  get phoneNumber() { return this.profileForm.get('phoneNumber')!; }
  get address() { return this.profileForm.get('address')!; }
  get emergencyContact() { return this.profileForm.get('emergencyContact')!; }

  updateProfile() {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = '';

    const parentId = this.authService.getParentId();
    if (parentId) {
      // Parent profile update - uses parent API
      this.http.get<any>(`${environment.apiUrl}/parents/${parentId}`).subscribe({
        next: (parent) => {
          const updatedData = {
            ...parent,
            firstName: this.profileForm.value.firstName,
            lastName: this.profileForm.value.lastName,
            email: this.profileForm.value.email,
            phoneNumber: this.profileForm.value.phoneNumber,
            address: this.profileForm.value.address,
            emergencyContact: this.profileForm.value.emergencyContact,
            profilePicture: this.imagePreview || parent.profilePicture
          };

          this.http.put(`${environment.apiUrl}/parents/${parentId}`, updatedData).subscribe({
            next: () => {
              const currentUser = this.authService.getCurrentUser();
              if (currentUser) {
                this.authService.updateCurrentUser({
                  ...currentUser,
                  firstName: updatedData.firstName,
                  lastName: updatedData.lastName,
                  email: updatedData.email,
                  profilePicture: updatedData.profilePicture
                });
              }
              this.router.navigate(['/dashboard']);
              this.saving = false;
            },
            error: (error) => {
              this.errorMessage = error.error?.message || 'Failed to update profile';
              this.saving = false;
            }
          });
        },
        error: (error) => {
          this.errorMessage = 'Failed to load profile data';
          this.saving = false;
        }
      });
    } else {
      // Admin/Teacher profile update - uses auth API
      const updatedData = {
        firstName: this.profileForm.value.firstName,
        lastName: this.profileForm.value.lastName,
        email: this.profileForm.value.email,
        profilePicture: this.imagePreview || ''
      };

      this.http.put(`${environment.apiUrl}/auth/update-profile`, updatedData).subscribe({
        next: () => {
          const currentUser = this.authService.getCurrentUser();
          if (currentUser) {
            this.authService.updateCurrentUser({
              ...currentUser,
              firstName: updatedData.firstName,
              lastName: updatedData.lastName,
              email: updatedData.email,
              profilePicture: updatedData.profilePicture || currentUser.profilePicture
            });
          }
          Swal.fire({
            icon: 'success',
            title: this.translate.instant('EDIT_PROFILE.SUCCESS'),
            timer: 2000,
            showConfirmButton: false
          });
          this.router.navigate(['/dashboard']);
          this.saving = false;
        },
        error: (error) => {
          this.errorMessage = error.error?.message || 'Failed to update profile';
          this.saving = false;
        }
      });
    }
  }

  updatePassword() {
    if (this.securityForm.invalid) {
      this.securityForm.markAllAsTouched();
      return;
    }
    // Implement password update logic
    console.log('Update password:', this.securityForm.value);
  }

  switchLanguage(lang: string | undefined): void {
    if (lang) {
      this.translate.use(lang);
      this.preferencesForm.patchValue({ language: lang });
    }
  }

  updatePreferences() {
    if (this.preferencesForm.invalid) {
      this.preferencesForm.markAllAsTouched();
      return;
    }

    const selectedLang = this.preferencesForm.get('language')?.value;

    // Save language using LanguageService (persists to localStorage)
    this.languageService.use(selectedLang);

    // Update language on server
    this.authService.updateLanguage(selectedLang).subscribe({
      next: () => {
        // Update breadcrumbs after language change
        this.initBreadcrumbs();

        this.simpleToastService.success(
          this.translate.instant('SETTINGS.LANGUAGE_SAVED')
        );
      },
      error: () => {
        this.simpleToastService.warning(
          this.translate.instant('SETTINGS.LANGUAGE_SAVED_LOCALLY')
        );
      }
    });
  }

  cancel() {
    this.router.navigate(['/dashboard']);
  }

  back() {
    this.location.back();
  }

  getErrorMessage(formGroup: FormGroup, fieldName: string): string {
    const control = formGroup.get(fieldName);
    if (!control || !control.errors || !control.touched) return '';

    const fieldKeyMap: { [key: string]: string } = {
      'firstName': 'FIRST_NAME',
      'lastName': 'LAST_NAME',
      'email': 'EMAIL',
      'phoneNumber': 'PHONE'
    };

    if (control.errors['required']) {
      const fieldKey = fieldKeyMap[fieldName];
      if (fieldKey) {
        return this.translate.instant(`EDIT_PROFILE.VALIDATION.${fieldKey}_REQUIRED`);
      }
      return this.translate.instant('VALIDATION.REQUIRED');
    }
    if (control.errors['invalidEmail']) return this.translate.instant('EDIT_PROFILE.VALIDATION.EMAIL_INVALID');
    if (control.errors['invalidPhone']) return this.translate.instant('EDIT_PROFILE.VALIDATION.PHONE_INVALID');
    if (control.errors['minlength']) return this.translate.instant('EDIT_PROFILE.VALIDATION.PASSWORD_MIN_LENGTH', { length: control.errors['minlength'].requiredLength });
    if (control.errors['notAlpha']) return this.translate.instant('EDIT_PROFILE.VALIDATION.LETTERS_ONLY');
    if (control.errors['whitespace']) return this.translate.instant('EDIT_PROFILE.VALIDATION.NO_WHITESPACE');
    if (control.errors['passwordMismatch']) return this.translate.instant('EDIT_PROFILE.VALIDATION.PASSWORD_MISMATCH');
    return this.translate.instant('VALIDATION.INVALID_FIELD');
  }

  openPhotoModal(): void {
    Swal.fire({
      title: this.translate.instant('EDIT_PROFILE.CHANGE_PHOTO'),
      showCancelButton: true,
      showDenyButton: this.imagePreview ? true : false,
      confirmButtonText: `<i class="bi bi-upload me-2"></i>${this.translate.instant('EDIT_PROFILE.UPLOAD_PHOTO')}`,
      denyButtonText: `<i class="bi bi-trash me-2"></i>${this.translate.instant('EDIT_PROFILE.REMOVE_PHOTO')}`,
      cancelButtonText: this.translate.instant('EDIT_PROFILE.CANCEL'),
      confirmButtonColor: '#7dd3c0',
      denyButtonColor: '#ff6b6b',
      cancelButtonColor: '#6c757d',
      customClass: {
        popup: 'profile-photo-modal',
        confirmButton: 'swal-btn-upload',
        denyButton: 'swal-btn-remove',
        cancelButton: 'swal-btn-cancel'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.fileInput?.nativeElement.click();
      } else if (result.isDenied) {
        this.removeImage();
      }
    });
  }

  onImageSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    // Validate file type
    if (!this.ALLOWED_IMAGE_TYPES.includes(file.type)) {
        this.simpleToastService.error(
          this.translate.instant('EDIT_PROFILE.INVALID_FILE_TYPE_TEXT')
        );
      
      this.resetFileInput();
      return;
    }

    // Validate file size
    if (file.size > this.MAX_FILE_SIZE) {
        this.simpleToastService.error(
          this.translate.instant('EDIT_PROFILE.FILE_TOO_LARGE_TEXT')
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
    this.profileForm.patchValue({ profilePicture: croppedImage });
    this.selectedImageFile = null;
  }

  onCropCancelled(): void {
    this.selectedImageFile = null;
    this.resetFileInput();
  }

  removeImage(): void {
    this.imagePreview = null;
    this.profileForm.patchValue({ profilePicture: '' });
    this.resetFileInput();
        this.simpleToastService.success(
          this.translate.instant('EDIT_PROFILE.PHOTO_REMOVED_TEXT')
        );
  }

  private resetFileInput(): void {
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }
}
