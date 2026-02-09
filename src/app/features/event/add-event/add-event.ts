import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgSelectModule } from '@ng-select/ng-select';
import { EventModel } from '../event.interface';
import { EventService } from '../event.service';
import { TitlePage, Breadcrumb, TitleAction } from '../../../shared/layouts/title-page/title-page';
import { PageTitleService } from '../../../core/services/page-title.service';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-add-event',
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, NgSelectModule, TitlePage],
  standalone: true,
  templateUrl: './add-event.html',
  styleUrl: './add-event.scss'
})
export class AddEvent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  private langChangeSub?: Subscription;
  saving = false;
  imagePreview: string | null = null;
  eventForm!: FormGroup;

  // Validation constants
  readonly MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
  readonly ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  breadcrumbs: Breadcrumb[] = [];
  titleActions: TitleAction[] = [];

  // Options for ng-select
  eventTypes: Array<{ value: string; label: string; icon: string }> = [];

  constructor(
    private fb: FormBuilder,
    private eventService: EventService,
    private router: Router,
    private translate: TranslateService,
    private pageTitleService: PageTitleService
  ) {}

  ngOnInit(): void {
    this.pageTitleService.setTitle(this.translate.instant('ADD_EVENT.TITLE'));
    this.updateTranslatedContent();
    this.initForm();

    this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      this.updateTranslatedContent();
      this.pageTitleService.setTitle(this.translate.instant('ADD_EVENT.TITLE'));
    });
  }

  ngOnDestroy(): void {
    this.langChangeSub?.unsubscribe();
  }

  private updateTranslatedContent(): void {
    this.initBreadcrumbs();
    this.initEventTypes();
    this.initTitleActions();
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
    this.router.navigate(['/events']);
  }

  private initEventTypes(): void {
    this.eventTypes = [
      { value: 'Workshop', label: this.translate.instant('ADD_EVENT.TYPE_WORKSHOP'), icon: 'bi-tools' },
      { value: 'Party', label: this.translate.instant('ADD_EVENT.TYPE_PARTY'), icon: 'bi-balloon' },
      { value: 'Educational', label: this.translate.instant('ADD_EVENT.TYPE_EDUCATIONAL'), icon: 'bi-book' },
      { value: 'Sports', label: this.translate.instant('ADD_EVENT.TYPE_SPORTS'), icon: 'bi-dribbble' },
      { value: 'Arts & Crafts', label: this.translate.instant('ADD_EVENT.TYPE_ARTS'), icon: 'bi-palette' },
      { value: 'Music', label: this.translate.instant('ADD_EVENT.TYPE_MUSIC'), icon: 'bi-music-note-beamed' },
      { value: 'Outdoor', label: this.translate.instant('ADD_EVENT.TYPE_OUTDOOR'), icon: 'bi-tree' },
      { value: 'Special Event', label: this.translate.instant('ADD_EVENT.TYPE_SPECIAL'), icon: 'bi-star' }
    ];
  }

  private initBreadcrumbs(): void {
    this.breadcrumbs = [
      { label: this.translate.instant('BREADCRUMBS.DASHBOARD') },
      { label: this.translate.instant('BREADCRUMBS.EVENTS'), url: '/events' },
      { label: this.translate.instant('BREADCRUMBS.ADD_EVENT') }
    ];
  }

  private initForm(): void {
    this.eventForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      type: ['', [Validators.required]],
      description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]],
      includeAllChildren: [false],
      price: [0, [Validators.min(0)]],
      capacity: [1, [Validators.required, Validators.min(1)]],
      ageFrom: [0, [Validators.required, Validators.min(0), Validators.max(18)]],
      ageTo: [18, [Validators.required, Validators.min(0), Validators.max(18)]],
      eventDate: ['', [Validators.required]],
      eventTime: ['', [Validators.required]],
      place: ['', [Validators.maxLength(200)]],
      image: ['']
    });
  }

  onIncludeAllChildrenChange(): void {
    const includeAll = this.eventForm.get('includeAllChildren')?.value;
    const capacityControl = this.eventForm.get('capacity');
    const ageFromControl = this.eventForm.get('ageFrom');
    const ageToControl = this.eventForm.get('ageTo');

    if (includeAll) {
      capacityControl?.disable();
      ageFromControl?.disable();
      ageToControl?.disable();
      // Clear validators when disabled
      capacityControl?.clearValidators();
      ageFromControl?.clearValidators();
      ageToControl?.clearValidators();
    } else {
      capacityControl?.enable();
      ageFromControl?.enable();
      ageToControl?.enable();
      // Restore validators when enabled
      capacityControl?.setValidators([Validators.required, Validators.min(1)]);
      ageFromControl?.setValidators([Validators.required, Validators.min(0), Validators.max(18)]);
      ageToControl?.setValidators([Validators.required, Validators.min(0), Validators.max(18)]);
    }
    capacityControl?.updateValueAndValidity();
    ageFromControl?.updateValueAndValidity();
    ageToControl?.updateValueAndValidity();
  }

  saveEvent(): void {
    if (this.eventForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.saving = true;
    const formValue = this.eventForm.getRawValue(); // getRawValue to include disabled fields

    // Combine date and time into ISO string
    const combinedDateTime = `${formValue.eventDate}T${formValue.eventTime}:00`;

    const eventData: EventModel = {
      name: formValue.name,
      type: formValue.type,
      description: formValue.description,
      price: formValue.price,
      capacity: formValue.includeAllChildren ? 0 : formValue.capacity,
      ageFrom: formValue.includeAllChildren ? 0 : formValue.ageFrom,
      ageTo: formValue.includeAllChildren ? 99 : formValue.ageTo,
      time: combinedDateTime,
      place: formValue.place,
      image: formValue.image,
      includeAllChildren: formValue.includeAllChildren
    };

    this.eventService.addEvent(eventData).subscribe({
      next: () => {
        this.saving = false;
        Swal.fire({
          icon: 'success',
          title: this.translate.instant('MESSAGES.SUCCESS'),
          text: this.translate.instant('MESSAGES.EVENT_CREATED')
        }).then(() => {
          this.router.navigate(['/events']);
        });
      },
      error: (error) => {
        this.saving = false;
        const sanitizedMessage = this.sanitizeLogMessage(error?.message);
        const sanitizedStatus = typeof error?.status === 'number' ? error.status : 0;
        const sanitizedStatusText = this.sanitizeLogMessage(error?.statusText);
        console.error(`Failed to create event: status=${sanitizedStatus}, statusText=${sanitizedStatusText}, message=${sanitizedMessage}`);

        Swal.fire({
          icon: 'error',
          title: this.translate.instant('MESSAGES.ERROR'),
          text: this.translate.instant('MESSAGES.EVENT_CREATE_ERROR')
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
    if (this.eventForm.dirty) {
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
          this.router.navigate(['/events']);
        }
      });
    } else {
      this.router.navigate(['/events']);
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

    // Read and preview image
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const result = e.target?.result;
      if (typeof result === 'string' && result.startsWith('data:image/')) {
        this.imagePreview = result;
        this.eventForm.patchValue({ image: result });
      } else {
        Swal.fire({
          icon: 'error',
          title: this.translate.instant('MESSAGES.ERROR'),
          text: this.translate.instant('MESSAGES.IMAGE_READ_ERROR')
        });
        this.resetFileInput();
      }
    };
    reader.onerror = () => {
      Swal.fire({
        icon: 'error',
        title: this.translate.instant('MESSAGES.ERROR'),
        text: this.translate.instant('MESSAGES.IMAGE_READ_ERROR')
      });
      this.resetFileInput();
    };
    reader.readAsDataURL(file);
  }

  removeImage(): void {
    this.resetFileInput();
  }

  private resetFileInput(): void {
    this.imagePreview = null;
    this.eventForm.patchValue({ image: '' });
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  private getReadableFileSize(): string {
    const sizeInMB = this.MAX_FILE_SIZE / (1024 * 1024);
    return `${sizeInMB}MB`;
  }

  private markFormGroupTouched(): void {
    Object.values(this.eventForm.controls).forEach(control => {
      control.markAsTouched();
    });
    setTimeout(() => {
      const firstInvalid = document.querySelector('.is-invalid') as HTMLElement;
      if (firstInvalid) {
        const formGroup = firstInvalid.closest('.form-group') as HTMLElement;
        (formGroup || firstInvalid).scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (firstInvalid.tagName === 'INPUT' || firstInvalid.tagName === 'TEXTAREA') {
          firstInvalid.focus();
        }
      }
    });
  }

  get formControls() {
    return this.eventForm.controls;
  }

  dismissKeyboard(event: Event): void {
    const target = event.target as HTMLElement;
    const tag = target.tagName;
    if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT' && !target.closest('ng-select')) {
      (document.activeElement as HTMLElement)?.blur();
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.eventForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.eventForm.get(fieldName);
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
      return this.translate.instant('VALIDATION.MIN_VALUE', { value: field.errors['min'].min });
    }
    if (field.errors['max']) {
      return this.translate.instant('VALIDATION.MAX_VALUE', { value: field.errors['max'].max });
    }
    return this.translate.instant('VALIDATION.INVALID_FIELD');
  }
}
