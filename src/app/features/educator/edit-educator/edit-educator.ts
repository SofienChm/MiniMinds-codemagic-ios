import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EducatorModel } from '../educator.interface';
import { EducatorService } from '../educator.service';
import { TitlePage, Breadcrumb, TitleAction } from '../../../shared/layouts/title-page/title-page';
import { ImageCropperModalComponent } from '../../../shared/components/image-cropper-modal/image-cropper-modal.component';
import Swal from 'sweetalert2';
import { SimpleToastService } from '../../../core/services/simple-toast.service';

@Component({
  selector: 'app-edit-educator',
  imports: [CommonModule, FormsModule, TitlePage, ImageCropperModalComponent, TranslateModule],
  standalone: true,
  templateUrl: './edit-educator.html',
  styleUrl: './edit-educator.scss'
})
export class EditEducator implements OnInit {
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;
  @ViewChild('imageCropper') imageCropper?: ImageCropperModalComponent;

  saving = false;
  loading = false;
  imagePreview: string | null = null;
  selectedImageFile: File | null = null;
  educatorId: number = 0;

  // Validation constants
  readonly MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
  readonly ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  breadcrumbs: Breadcrumb[] = [];
  titleActions: TitleAction[] = [];

  educator: EducatorModel = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    dateOfBirth: '',
    hireDate: '',
    specialization: '',
    salary: 0,
    profilePicture: ''
  };

  constructor(
    private educatorService: EducatorService,
    private router: Router,
    private route: ActivatedRoute,
    private translate: TranslateService,
    private simpleToastService: SimpleToastService
  ) {}

  ngOnInit() {
    this.initBreadcrumbs();
    this.initTitleActions();
    this.educatorId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadEducator();

    // Update translations when language changes
    this.translate.onLangChange.subscribe(() => {
      this.initBreadcrumbs();
      this.initTitleActions();
    });
  }

  private initBreadcrumbs(): void {
    this.breadcrumbs = [
      { label: this.translate.instant('BREADCRUMBS.EDUCATORS'), url: '/educators' },
      { label: this.translate.instant('EDIT_EDUCATOR.TITLE') }
    ];
  }

  private initTitleActions(): void {
    this.titleActions = [
      {
        label: this.translate.instant('EDIT_EDUCATOR.BACK'),
        icon: 'bi bi-arrow-left',
        class: 'btn-cancel-2',
        action: () => this.back()
      }
    ];
  }

  back(): void {
    this.router.navigate(['/educators']);
  }

  loadEducator() {
    this.loading = true;
    this.educatorService.getEducator(this.educatorId).subscribe({
      next: (educator) => {
        this.educator = { ...educator };
        // Format dates to YYYY-MM-DD for HTML date inputs
        if (educator.dateOfBirth) {
          this.educator.dateOfBirth = this.formatDateForInput(educator.dateOfBirth);
        }
        if (educator.hireDate) {
          this.educator.hireDate = this.formatDateForInput(educator.hireDate);
        }
        this.imagePreview = educator.profilePicture || null;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading educator:', error);
        this.loading = false;
        this.router.navigate(['/educators']);
      }
    });
  }

  private formatDateForInput(dateString: string): string {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return '';
    }
    return date.toISOString().split('T')[0];
  }

  updateEducator() {
    this.saving = true;
    this.educatorService.updateEducator(this.educator).subscribe({
      next: () => {
        this.simpleToastService.success(this.translate.instant('EDIT_EDUCATOR.UPDATE_SUCCESS'));
        setTimeout(() => {
          this.router.navigate(['/educators']);
        }, 200);
        this.saving = false;
      },
      error: (error) => {
        console.error('Error updating educator:', error);
        const errorMessage = this.extractErrorMessage(error);
        Swal.fire({
          icon: 'error',
          title: this.translate.instant('MESSAGES.ERROR'),
          text: errorMessage
        });
        this.saving = false;
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
    return this.translate.instant('EDIT_EDUCATOR.UPDATE_ERROR');
  }

  cancel() {
    this.router.navigate(['/educators']);
  }

  onImageSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    // Validate file type
    if (!this.ALLOWED_IMAGE_TYPES.includes(file.type)) {
        this.simpleToastService.error(
          this.translate.instant('EDIT_EDUCATOR.INVALID_FILE_TYPE')
        );

      this.resetFileInput();
      return;
    }

    // Validate file size
    if (file.size > this.MAX_FILE_SIZE) {
      Swal.fire({
        icon: 'error',
        title: this.translate.instant('MESSAGES.ERROR'),
        text: this.translate.instant('EDIT_EDUCATOR.FILE_TOO_LARGE')
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
    this.educator.profilePicture = croppedImage;
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
    this.educator.profilePicture = '';
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }
}
