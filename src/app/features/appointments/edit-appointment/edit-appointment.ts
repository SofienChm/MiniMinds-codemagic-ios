import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { TitlePage, Breadcrumb, TitleAction } from '../../../shared/layouts/title-page/title-page';
import { AuthService } from '../../../core/services/auth';
import { AppointmentsService, UpdateAppointmentDto, TeacherOption, AppointmentModel } from '../appointments.service';
import { ChildrenService } from '../../children/children.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PageTitleService } from '../../../core/services/page-title.service';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';

interface ChildOption {
  id: number;
  fullName: string;
}

@Component({
  selector: 'app-edit-appointment',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TitlePage, NgSelectModule, TranslateModule],
  templateUrl: './edit-appointment.html',
  styleUrls: ['./edit-appointment.scss']
})
export class EditAppointment implements OnInit, OnDestroy {
  breadcrumbs: Breadcrumb[] = [];
  actions: TitleAction[] = [];
  private langChangeSub?: Subscription;
  private routeSub?: Subscription;

  appointmentForm!: FormGroup;
  submitting = false;
  loading = true;
  errorMessage = '';
  appointmentId: number | null = null;
  appointment: AppointmentModel | null = null;

  // Options for dropdowns
  teachers: TeacherOption[] = [];
  children: ChildOption[] = [];
  appointmentTypes: Array<{ value: string; label: string }> = [];

  // Time options
  timeSlots: string[] = [];

  // Min date for appointment (today)
  minDate = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private appointmentsService: AppointmentsService,
    private childrenService: ChildrenService,
    private router: Router,
    private route: ActivatedRoute,
    private translateService: TranslateService,
    private pageTitleService: PageTitleService
  ) {
    this.generateTimeSlots();
    this.setMinDate();
  }

  ngOnInit(): void {
    this.pageTitleService.setTitle(this.translateService.instant('APPOINTMENTS_PAGE.EDIT_APPOINTMENT'));
    this.initForm();
    this.loadTeachers();
    this.loadChildren();
    this.updateTranslatedContent();

    this.routeSub = this.route.params.subscribe(params => {
      this.appointmentId = +params['id'];
      if (this.appointmentId) {
        this.loadAppointment(this.appointmentId);
      }
    });

    this.langChangeSub = this.translateService.onLangChange.subscribe(() => {
      this.updateTranslatedContent();
      this.pageTitleService.setTitle(this.translateService.instant('APPOINTMENTS_PAGE.EDIT_APPOINTMENT'));
    });
  }

  ngOnDestroy(): void {
    this.langChangeSub?.unsubscribe();
    this.routeSub?.unsubscribe();
  }

  private initForm(): void {
    this.appointmentForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
      description: ['', [Validators.maxLength(1000)]],
      type: ['General', Validators.required],
      childId: [null],
      teacherId: [null],
      appointmentDate: ['', Validators.required],
      startTime: ['', Validators.required],
      endTime: ['', Validators.required]
    });
  }

  private generateTimeSlots(): void {
    this.timeSlots = [];
    for (let h = 8; h <= 17; h++) {
      for (let m = 0; m < 60; m += 30) {
        const hour = h.toString().padStart(2, '0');
        const minute = m.toString().padStart(2, '0');
        this.timeSlots.push(`${hour}:${minute}`);
      }
    }
  }

  private setMinDate(): void {
    const today = new Date();
    this.minDate = today.toISOString().split('T')[0];
  }

  updateTranslatedContent(): void {
    this.breadcrumbs = [
      { label: this.translateService.instant('APPOINTMENTS_PAGE.DASHBOARD'), url: '/dashboard' },
      { label: this.translateService.instant('APPOINTMENTS_PAGE.APPOINTMENTS'), url: '/appointments' },
      { label: this.translateService.instant('APPOINTMENTS_PAGE.EDIT_APPOINTMENT') }
    ];

    this.actions = [
      {
        label: this.translateService.instant('APPOINTMENTS_PAGE.BACK_TO_LIST'),
        icon: 'bi bi-arrow-left',
        class: 'btn-cancel-global',
        action: () => this.cancel()
      }
    ];

    this.appointmentTypes = [
      { value: 'General', label: this.translateService.instant('APPOINTMENTS_PAGE.TYPE_GENERAL') },
      { value: 'Academic', label: this.translateService.instant('APPOINTMENTS_PAGE.TYPE_ACADEMIC') },
      { value: 'Behavioral', label: this.translateService.instant('APPOINTMENTS_PAGE.TYPE_BEHAVIORAL') },
      { value: 'Medical', label: this.translateService.instant('APPOINTMENTS_PAGE.TYPE_MEDICAL') },
      { value: 'Other', label: this.translateService.instant('APPOINTMENTS_PAGE.TYPE_OTHER') }
    ];
  }

  loadAppointment(id: number): void {
    this.loading = true;
    this.appointmentsService.getAppointmentById(id).subscribe({
      next: (apt) => {
        this.appointment = apt;

        // Check if can edit (only pending)
        if (apt.status !== 'Pending') {
          Swal.fire({
            icon: 'error',
            title: this.translateService.instant('APPOINTMENTS_PAGE.ERROR'),
            text: this.translateService.instant('APPOINTMENTS_PAGE.CANNOT_EDIT_NON_PENDING')
          }).then(() => {
            this.router.navigate(['/appointments']);
          });
          return;
        }

        // Populate form
        const dateStr = new Date(apt.appointmentDate).toISOString().split('T')[0];
        this.appointmentForm.patchValue({
          title: apt.title,
          description: apt.description || '',
          type: apt.type,
          childId: apt.childId || null,
          teacherId: apt.teacherId || null,
          appointmentDate: dateStr,
          startTime: apt.startTime,
          endTime: apt.endTime
        });

        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || this.translateService.instant('APPOINTMENTS_PAGE.FAILED_TO_LOAD');
        this.loading = false;
      }
    });
  }

  loadTeachers(): void {
    this.appointmentsService.getAvailableTeachers().subscribe({
      next: (list) => this.teachers = list || [],
      error: () => this.teachers = []
    });
  }

  loadChildren(): void {
    // Load children using the ChildrenService
    // The backend filters children based on the user's role (parents only see their own children)
    this.childrenService.loadChildren().subscribe({
      next: (list) => {
        this.children = (list || []).map(c => ({
          id: c.id!,
          fullName: `${c.firstName} ${c.lastName}`
        }));
      },
      error: () => this.children = []
    });
  }

  cancel(): void {
    if (this.appointmentForm.dirty) {
      Swal.fire({
        title: this.translateService.instant('APPOINTMENTS_PAGE.UNSAVED_CHANGES'),
        text: this.translateService.instant('APPOINTMENTS_PAGE.UNSAVED_CHANGES_MESSAGE'),
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: this.translateService.instant('APPOINTMENTS_PAGE.YES_LEAVE'),
        cancelButtonText: this.translateService.instant('APPOINTMENTS_PAGE.NO_STAY')
      }).then((result) => {
        if (result.isConfirmed) {
          this.router.navigate(['/appointments']);
        }
      });
    } else {
      this.router.navigate(['/appointments']);
    }
  }

  onStartTimeChange(): void {
    const startTime = this.appointmentForm.get('startTime')?.value;
    if (startTime) {
      const [hours, minutes] = startTime.split(':').map(Number);
      let endMinutes = minutes + 30;
      let endHours = hours;
      if (endMinutes >= 60) {
        endMinutes -= 60;
        endHours += 1;
      }
      const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
      this.appointmentForm.patchValue({ endTime });
    }
  }

  updateAppointment(): void {
    if (this.appointmentForm.invalid || !this.appointmentId) {
      this.markFormGroupTouched();
      return;
    }

    // Validate end time is after start time
    const startTime = this.appointmentForm.get('startTime')?.value;
    const endTime = this.appointmentForm.get('endTime')?.value;
    if (startTime >= endTime) {
      this.errorMessage = this.translateService.instant('APPOINTMENTS_PAGE.END_TIME_ERROR');
      return;
    }

    this.errorMessage = '';
    this.submitting = true;

    const formValue = this.appointmentForm.value;
    const dto: UpdateAppointmentDto = {
      title: formValue.title.trim(),
      description: formValue.description?.trim() || undefined,
      type: formValue.type,
      childId: formValue.childId || undefined,
      teacherId: formValue.teacherId || undefined,
      appointmentDate: formValue.appointmentDate,
      startTime: formValue.startTime,
      endTime: formValue.endTime
    };

    this.appointmentsService.updateMyAppointment(this.appointmentId, dto).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: this.translateService.instant('APPOINTMENTS_PAGE.SUCCESS'),
          text: this.translateService.instant('APPOINTMENTS_PAGE.APPOINTMENT_UPDATED'),
          timer: 2000,
          showConfirmButton: false
        }).then(() => {
          this.router.navigate(['/appointments']);
        });
      },
      error: (err) => {
        this.errorMessage = err.error?.message || this.translateService.instant('APPOINTMENTS_PAGE.FAILED_TO_UPDATE');
        this.submitting = false;
      }
    });
  }

  private markFormGroupTouched(): void {
    Object.values(this.appointmentForm.controls).forEach(control => {
      control.markAsTouched();
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.appointmentForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.appointmentForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) {
        return this.translateService.instant('APPOINTMENTS_PAGE.FIELD_REQUIRED');
      }
      if (field.errors['minlength']) {
        return this.translateService.instant('APPOINTMENTS_PAGE.MIN_LENGTH', { min: field.errors['minlength'].requiredLength });
      }
      if (field.errors['maxlength']) {
        return this.translateService.instant('APPOINTMENTS_PAGE.MAX_LENGTH', { max: field.errors['maxlength'].requiredLength });
      }
    }
    return '';
  }
}
