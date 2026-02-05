import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TitlePage, Breadcrumb, TitleAction } from '../../../shared/layouts/title-page/title-page';
import { AuthService } from '../../../core/services/auth';
import { AppointmentsService, AppointmentModel } from '../appointments.service';
import { PageTitleService } from '../../../core/services/page-title.service';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-appointment-detail',
  standalone: true,
  imports: [CommonModule, TitlePage, TranslateModule, RouterModule],
  templateUrl: './appointment-detail.html',
  styleUrls: ['./appointment-detail.scss']
})
export class AppointmentDetail implements OnInit, OnDestroy {
  breadcrumbs: Breadcrumb[] = [];
  titleActions: TitleAction[] = [];
  private langChangeSub?: Subscription;
  private routeSub?: Subscription;

  appointment: AppointmentModel | null = null;
  loading = true;
  errorMessage = '';

  isAdmin = false;
  isTeacher = false;
  isParent = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private appointmentsService: AppointmentsService,
    private translateService: TranslateService,
    private pageTitleService: PageTitleService
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.authService.isAdmin();
    this.isTeacher = this.authService.isTeacher();
    this.isParent = this.authService.isParent();

    this.routeSub = this.route.params.subscribe(params => {
      const id = +params['id'];
      if (id) {
        this.loadAppointment(id);
      }
    });

    this.updateTranslatedContent();

    this.langChangeSub = this.translateService.onLangChange.subscribe(() => {
      this.updateTranslatedContent();
    });
  }

  ngOnDestroy(): void {
    this.langChangeSub?.unsubscribe();
    this.routeSub?.unsubscribe();
  }

  updateTranslatedContent(): void {
    this.breadcrumbs = [
      { label: this.translateService.instant('APPOINTMENTS_PAGE.DASHBOARD'), url: '/dashboard' },
      { label: this.translateService.instant('APPOINTMENTS_PAGE.APPOINTMENTS'), url: '/appointments' },
      { label: this.translateService.instant('APPOINTMENTS_PAGE.DETAILS') }
    ];

    this.updateTitleActions();
  }

  updateTitleActions(): void {
    this.titleActions = [
      {
        label: this.translateService.instant('APPOINTMENTS_PAGE.BACK_TO_LIST'),
        icon: 'bi bi-arrow-left',
        class: 'btn-cancel-global',
        action: () => this.router.navigate(['/appointments'])
      }
    ];

    if (this.appointment) {
      // Parent actions
      if (this.isParent && this.appointment.status === 'Pending') {
        this.titleActions.push({
          label: this.translateService.instant('APPOINTMENTS_PAGE.EDIT'),
          icon: 'bi bi-pencil',
          class: 'btn-edit-global',
          action: () => this.router.navigate(['/appointments/edit', this.appointment?.id])
        });
      }

      // Admin/Teacher actions
      if ((this.isAdmin || this.isTeacher) && this.appointment.status === 'Pending') {
        this.titleActions.push({
          label: this.translateService.instant('APPOINTMENTS_PAGE.APPROVE'),
          icon: 'bi bi-check-lg',
          class: 'btn-add-global-2',
          action: () => this.approve()
        });
        this.titleActions.push({
          label: this.translateService.instant('APPOINTMENTS_PAGE.REJECT'),
          icon: 'bi bi-x-lg',
          class: 'btn-remove-global',
          action: () => this.reject()
        });
      }

      if ((this.isAdmin || this.isTeacher) && this.appointment.status === 'Approved') {
        this.titleActions.push({
          label: this.translateService.instant('APPOINTMENTS_PAGE.MARK_COMPLETED'),
          icon: 'bi bi-check-all',
          class: 'btn-add-global-2',
          action: () => this.complete()
        });
      }
    }
  }

  loadAppointment(id: number): void {
    this.loading = true;
    this.errorMessage = '';

    this.appointmentsService.getAppointmentById(id).subscribe({
      next: (apt) => {
        this.appointment = apt;
        this.pageTitleService.setTitle(apt.title);
        this.updateTitleActions();
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || this.translateService.instant('APPOINTMENTS_PAGE.FAILED_TO_LOAD');
        this.loading = false;
      }
    });
  }

  approve(): void {
    if (!this.appointment) return;

    Swal.fire({
      title: this.translateService.instant('APPOINTMENTS_PAGE.CONFIRM_APPROVE'),
      text: this.translateService.instant('APPOINTMENTS_PAGE.APPROVE_MESSAGE'),
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.translateService.instant('APPOINTMENTS_PAGE.YES_APPROVE'),
      cancelButtonText: this.translateService.instant('APPOINTMENTS_PAGE.CANCEL')
    }).then((result) => {
      if (result.isConfirmed && this.appointment) {
        this.appointmentsService.approveAppointment(this.appointment.id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: this.translateService.instant('APPOINTMENTS_PAGE.APPROVED'),
              text: this.translateService.instant('APPOINTMENTS_PAGE.APPOINTMENT_APPROVED'),
              timer: 2000,
              showConfirmButton: false
            });
            this.loadAppointment(this.appointment!.id);
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: this.translateService.instant('APPOINTMENTS_PAGE.ERROR'),
              text: err.error?.message || this.translateService.instant('APPOINTMENTS_PAGE.FAILED_TO_APPROVE')
            });
          }
        });
      }
    });
  }

  reject(): void {
    if (!this.appointment) return;

    Swal.fire({
      title: this.translateService.instant('APPOINTMENTS_PAGE.CONFIRM_REJECT'),
      input: 'textarea',
      inputLabel: this.translateService.instant('APPOINTMENTS_PAGE.REJECTION_REASON'),
      inputPlaceholder: this.translateService.instant('APPOINTMENTS_PAGE.REJECTION_REASON_PLACEHOLDER'),
      showCancelButton: true,
      confirmButtonText: this.translateService.instant('APPOINTMENTS_PAGE.YES_REJECT'),
      cancelButtonText: this.translateService.instant('APPOINTMENTS_PAGE.CANCEL'),
      confirmButtonColor: '#dc3545'
    }).then((result) => {
      if (result.isConfirmed && this.appointment) {
        this.appointmentsService.rejectAppointment(this.appointment.id, { rejectionReason: result.value }).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: this.translateService.instant('APPOINTMENTS_PAGE.REJECTED'),
              text: this.translateService.instant('APPOINTMENTS_PAGE.APPOINTMENT_REJECTED'),
              timer: 2000,
              showConfirmButton: false
            });
            this.loadAppointment(this.appointment!.id);
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: this.translateService.instant('APPOINTMENTS_PAGE.ERROR'),
              text: err.error?.message || this.translateService.instant('APPOINTMENTS_PAGE.FAILED_TO_REJECT')
            });
          }
        });
      }
    });
  }

  complete(): void {
    if (!this.appointment) return;

    Swal.fire({
      title: this.translateService.instant('APPOINTMENTS_PAGE.CONFIRM_COMPLETE'),
      input: 'textarea',
      inputLabel: this.translateService.instant('APPOINTMENTS_PAGE.MEETING_NOTES'),
      inputPlaceholder: this.translateService.instant('APPOINTMENTS_PAGE.NOTES_PLACEHOLDER'),
      showCancelButton: true,
      confirmButtonText: this.translateService.instant('APPOINTMENTS_PAGE.MARK_COMPLETED'),
      cancelButtonText: this.translateService.instant('APPOINTMENTS_PAGE.CANCEL')
    }).then((result) => {
      if (result.isConfirmed && this.appointment) {
        this.appointmentsService.completeAppointment(this.appointment.id, { notes: result.value }).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: this.translateService.instant('APPOINTMENTS_PAGE.COMPLETED'),
              text: this.translateService.instant('APPOINTMENTS_PAGE.APPOINTMENT_COMPLETED'),
              timer: 2000,
              showConfirmButton: false
            });
            this.loadAppointment(this.appointment!.id);
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: this.translateService.instant('APPOINTMENTS_PAGE.ERROR'),
              text: err.error?.message || this.translateService.instant('APPOINTMENTS_PAGE.FAILED_TO_COMPLETE')
            });
          }
        });
      }
    });
  }

  cancelAppointment(): void {
    if (!this.appointment) return;

    Swal.fire({
      title: this.translateService.instant('APPOINTMENTS_PAGE.CONFIRM_CANCEL'),
      text: this.translateService.instant('APPOINTMENTS_PAGE.CANCEL_MESSAGE'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: this.translateService.instant('APPOINTMENTS_PAGE.YES_CANCEL'),
      cancelButtonText: this.translateService.instant('APPOINTMENTS_PAGE.NO'),
      confirmButtonColor: '#dc3545'
    }).then((result) => {
      if (result.isConfirmed && this.appointment) {
        this.appointmentsService.cancelMyAppointment(this.appointment.id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: this.translateService.instant('APPOINTMENTS_PAGE.CANCELLED'),
              text: this.translateService.instant('APPOINTMENTS_PAGE.APPOINTMENT_CANCELLED'),
              timer: 2000,
              showConfirmButton: false
            });
            this.loadAppointment(this.appointment!.id);
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: this.translateService.instant('APPOINTMENTS_PAGE.ERROR'),
              text: err.error?.message || this.translateService.instant('APPOINTMENTS_PAGE.FAILED_TO_CANCEL')
            });
          }
        });
      }
    });
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'Pending': return 'badge-pending';
      case 'Approved': return 'badge-approved';
      case 'Rejected': return 'badge-rejected';
      case 'Completed': return 'badge-completed';
      case 'Cancelled': return 'badge-cancelled';
      default: return 'badge-secondary';
    }
  }

  getTypeBadgeClass(type: string): string {
    switch (type) {
      case 'General': return 'badge-general';
      case 'Academic': return 'badge-academic';
      case 'Behavioral': return 'badge-behavioral';
      case 'Medical': return 'badge-medical';
      case 'Other': return 'badge-other';
      default: return 'badge-secondary';
    }
  }
}
