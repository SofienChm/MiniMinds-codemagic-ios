import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgSelectModule } from '@ng-select/ng-select';
import { EventModel } from '../event.interface';
import { EventService } from '../event.service';
import { Breadcrumb } from '../../../shared/layouts/title-page/title-page';
import { PageTitleService } from '../../../core/services/page-title.service';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-edit-event',
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, NgSelectModule],
  standalone: true,
  templateUrl: './edit-event.html',
  styleUrl: './edit-event.scss'
})
export class EditEvent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  private langChangeSub?: Subscription;
  saving = false;
  loading = false;
  eventId: number = 0;
  eventForm!: FormGroup;
  imagePreview: string | null = null;

  // Validation constants
  readonly MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
  readonly ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  breadcrumbs: Breadcrumb[] = [];

  // Options for ng-select
  eventTypes: Array<{ value: string; label: string; icon: string }> = [];

  constructor(
    private fb: FormBuilder,
    private eventService: EventService,
    private router: Router,
    private route: ActivatedRoute,
    private translate: TranslateService,
    private pageTitleService: PageTitleService
  ) {}

  ngOnInit(): void {
    this.pageTitleService.setTitle(this.translate.instant('EDIT_EVENT.TITLE'));
    this.eventId = Number(this.route.snapshot.paramMap.get('id'));
    this.updateTranslatedContent();
    this.initForm();
    this.loadEvent();

    this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      this.updateTranslatedContent();
      this.pageTitleService.setTitle(this.translate.instant('EDIT_EVENT.TITLE'));
    });
  }

  ngOnDestroy(): void {
    this.langChangeSub?.unsubscribe();
  }

  private updateTranslatedContent(): void {
    this.initBreadcrumbs();
    this.initSelectOptions();
  }

  private initBreadcrumbs(): void {
    this.breadcrumbs = [
      { label: this.translate.instant('BREADCRUMBS.DASHBOARD') },
      { label: this.translate.instant('BREADCRUMBS.EVENTS'), url: '/events' },
      { label: this.translate.instant('BREADCRUMBS.EDIT_EVENT') }
    ];
  }

  private initForm(): void {
    this.eventForm = this.fb.group({
      id: [0],
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      type: ['', [Validators.required]],
      description: ['', [Validators.required, Validators.maxLength(1000)]],
      price: [0, [Validators.required, Validators.min(0)]],
      capacity: [1, [Validators.required, Validators.min(1), Validators.max(1000)]],
      ageFrom: [0, [Validators.required, Validators.min(0), Validators.max(18)]],
      ageTo: [18, [Validators.required, Validators.min(0), Validators.max(18)]],
      eventDate: ['', [Validators.required]],
      eventTime: ['', [Validators.required]],
      place: ['', [Validators.maxLength(200)]],
      image: ['']
    });
  }

  private initSelectOptions(): void {
    this.eventTypes = [
      { value: 'Workshop', label: this.translate.instant('EDIT_EVENT.TYPE_WORKSHOP'), icon: 'bi-tools' },
      { value: 'Party', label: this.translate.instant('EDIT_EVENT.TYPE_PARTY'), icon: 'bi-balloon' },
      { value: 'Educational', label: this.translate.instant('EDIT_EVENT.TYPE_EDUCATIONAL'), icon: 'bi-book' },
      { value: 'Sports', label: this.translate.instant('EDIT_EVENT.TYPE_SPORTS'), icon: 'bi-trophy' },
      { value: 'Arts & Crafts', label: this.translate.instant('EDIT_EVENT.TYPE_ARTS'), icon: 'bi-palette' },
      { value: 'Music', label: this.translate.instant('EDIT_EVENT.TYPE_MUSIC'), icon: 'bi-music-note-beamed' },
      { value: 'Outdoor', label: this.translate.instant('EDIT_EVENT.TYPE_OUTDOOR'), icon: 'bi-tree' },
      { value: 'Special Event', label: this.translate.instant('EDIT_EVENT.TYPE_SPECIAL'), icon: 'bi-star' }
    ];
  }

  loadEvent(): void {
    this.loading = true;
    this.eventService.getEvent(this.eventId).subscribe({
      next: (event) => {
        // Parse date and time from event.time
        let eventDate = '';
        let eventTime = '';

        if (event.time) {
          let eventDateTime = new Date(event.time);

          if (isNaN(eventDateTime.getTime())) {
            eventDateTime = new Date(event.time + 'T00:00:00');
          }

          if (!isNaN(eventDateTime.getTime())) {
            const year = eventDateTime.getFullYear();
            const month = String(eventDateTime.getMonth() + 1).padStart(2, '0');
            const day = String(eventDateTime.getDate()).padStart(2, '0');
            eventDate = `${year}-${month}-${day}`;

            const hours = String(eventDateTime.getHours()).padStart(2, '0');
            const minutes = String(eventDateTime.getMinutes()).padStart(2, '0');
            eventTime = `${hours}:${minutes}`;
          }
        }

        // Patch form with event data
        this.eventForm.patchValue({
          id: event.id,
          name: event.name,
          type: event.type,
          description: event.description,
          price: event.price,
          capacity: event.capacity,
          ageFrom: event.ageFrom,
          ageTo: event.ageTo,
          eventDate: eventDate,
          eventTime: eventTime,
          place: event.place || '',
          image: event.image || ''
        });

        this.imagePreview = event.image || null;
        this.loading = false;
      },
      error: (error) => {
        const sanitizedMessage = this.sanitizeLogMessage(error?.message);
        console.error(`Error loading event: ${sanitizedMessage}`);
        this.loading = false;
        Swal.fire({
          icon: 'error',
          title: this.translate.instant('MESSAGES.ERROR'),
          text: this.translate.instant('EDIT_EVENT.LOAD_ERROR')
        }).then(() => {
          this.router.navigate(['/events']);
        });
      }
    });
  }

  updateEvent(): void {
    if (this.eventForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    const formValue = this.eventForm.value;

    // Validate age range
    if (formValue.ageFrom > formValue.ageTo) {
      Swal.fire({
        icon: 'error',
        title: this.translate.instant('MESSAGES.ERROR'),
        text: this.translate.instant('EDIT_EVENT.AGE_RANGE_ERROR')
      });
      return;
    }

    this.saving = true;

    // Combine date and time into ISO string
    const combinedDateTime = `${formValue.eventDate}T${formValue.eventTime}:00`;

    const eventData: EventModel = {
      id: formValue.id,
      name: formValue.name,
      type: formValue.type,
      description: formValue.description,
      price: formValue.price,
      capacity: formValue.capacity,
      ageFrom: formValue.ageFrom,
      ageTo: formValue.ageTo,
      time: combinedDateTime,
      place: formValue.place,
      image: formValue.image || this.imagePreview || undefined
    };

    this.eventService.updateEvent(eventData).subscribe({
      next: () => {
        this.saving = false;
        Swal.fire({
          icon: 'success',
          title: this.translate.instant('MESSAGES.SUCCESS'),
          text: this.translate.instant('EDIT_EVENT.UPDATE_SUCCESS')
        }).then(() => {
          this.router.navigate(['/events']);
        });
      },
      error: (error) => {
        this.saving = false;
        const sanitizedMessage = this.sanitizeLogMessage(error?.message);
        console.error(`Failed to update event: ${sanitizedMessage}`);

        Swal.fire({
          icon: 'error',
          title: this.translate.instant('MESSAGES.ERROR'),
          text: this.translate.instant('EDIT_EVENT.UPDATE_ERROR')
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
  }

  get formControls() {
    return this.eventForm.controls;
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
      const minValue = field.errors['min'].min;
      return this.translate.instant('VALIDATION.MIN_VALUE', { value: minValue });
    }
    if (field.errors['max']) {
      const maxValue = field.errors['max'].max;
      return this.translate.instant('VALIDATION.MAX_VALUE', { value: maxValue });
    }
    return this.translate.instant('VALIDATION.INVALID_FIELD');
  }
}
