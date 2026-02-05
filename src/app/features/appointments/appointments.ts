import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth';
import { AppointmentsService, AppointmentModel } from './appointments.service';
import { TitlePage, Breadcrumb, TitleAction } from '../../shared/layouts/title-page/title-page';
import { Router } from '@angular/router';
import { PageTitleService } from '../../core/services/page-title.service';
import { ParentChildHeaderSimpleComponent } from '../../shared/components/parent-child-header-simple/parent-child-header-simple.component';   
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [CommonModule, FormsModule, TitlePage, NgSelectModule, TranslateModule, ParentChildHeaderSimpleComponent],
  templateUrl: './appointments.html',
  styleUrls: ['./appointments.scss']
})
export class Appointments implements OnInit, OnDestroy {
  isAdmin = false;
  isTeacher = false;
  isParent = false;
  breadcrumbs: Breadcrumb[] = [];
  titleActions: TitleAction[] = [];
  private langChangeSub?: Subscription;

  // Appointments state
  appointments: AppointmentModel[] = [];
  displayedAppointments: AppointmentModel[] = [];
  loading = false;
  errorMessage = '';

  // Filters
  allStatus: string[] = ['All', 'Pending', 'Approved', 'Rejected', 'Completed', 'Cancelled'];
  selectedStatus = 'All';
  statusOptions: Array<{ value: string; label: string; icon: string }> = [];

  // Pagination
  itemsPerPage = 9;
  currentPage = 1;

  constructor(
    public authService: AuthService,
    private appointmentsService: AppointmentsService,
    private router: Router,
    private translateService: TranslateService,
    private pageTitleService: PageTitleService
  ) {}

  ngOnInit(): void {
    this.pageTitleService.setTitle(this.translateService.instant('APPOINTMENTS_PAGE.TITLE'));
    this.isAdmin = this.authService.isAdmin();
    this.isTeacher = this.authService.isTeacher();
    this.isParent = this.authService.isParent();

    this.loadAppointments();
    this.updateTranslatedContent();

    this.langChangeSub = this.translateService.onLangChange.subscribe(() => {
      this.updateTranslatedContent();
      this.pageTitleService.setTitle(this.translateService.instant('APPOINTMENTS_PAGE.TITLE'));
    });
  }

  ngOnDestroy(): void {
    this.langChangeSub?.unsubscribe();
  }

  navigateToAdd() {
    this.router.navigate(['/appointments/add']);
  }
  updateTranslatedContent(): void {
    this.breadcrumbs = [
      { label: this.translateService.instant('APPOINTMENTS_PAGE.DASHBOARD'), url: '/dashboard' },
      { label: this.translateService.instant('APPOINTMENTS_PAGE.APPOINTMENTS') }
    ];

    // Only parents can add appointments
    
    if (this.isParent) {
      this.titleActions = [
        {
          label: this.translateService.instant('APPOINTMENTS_PAGE.BOOK_APPOINTMENT'),
          class: 'btn-add-global-2',
          action: () => this.router.navigate(['/appointments/add'])
        }
      ];
    } else {
      this.titleActions = [];
    }

    this.statusOptions = [
      { value: 'All', label: this.translateService.instant('APPOINTMENTS_PAGE.ALL_STATUS'), icon: 'bi-list-ul' },
      { value: 'Pending', label: this.translateService.instant('APPOINTMENTS_PAGE.PENDING'), icon: 'bi-hourglass-split' },
      { value: 'Approved', label: this.translateService.instant('APPOINTMENTS_PAGE.APPROVED'), icon: 'bi-check-circle' },
      { value: 'Rejected', label: this.translateService.instant('APPOINTMENTS_PAGE.REJECTED'), icon: 'bi-x-circle' },
      { value: 'Completed', label: this.translateService.instant('APPOINTMENTS_PAGE.COMPLETED'), icon: 'bi-check-all' },
      { value: 'Cancelled', label: this.translateService.instant('APPOINTMENTS_PAGE.CANCELLED'), icon: 'bi-slash-circle' }
    ];
  }

  loadAppointments(): void {
    this.loading = true;
    this.errorMessage = '';

    const loadFn = this.isParent
      ? this.appointmentsService.getMyAppointments(this.selectedStatus)
      : this.appointmentsService.getAllAppointments(this.selectedStatus);

    loadFn.subscribe({
      next: (list) => {
        this.appointments = list;
        this.currentPage = 1;
        this.updateDisplayedAppointments();
        this.loading = false;
      },
      error: (err) => {
        this.appointments = [];
        this.displayedAppointments = [];
        this.errorMessage = err.error?.message || this.translateService.instant('APPOINTMENTS_PAGE.FAILED_TO_LOAD');
        this.loading = false;
      }
    });
  }

  updateDisplayedAppointments(): void {
    const endIndex = this.currentPage * this.itemsPerPage;
    this.displayedAppointments = this.appointments.slice(0, endIndex);
  }

  loadMore(): void {
    this.currentPage++;
    this.updateDisplayedAppointments();
  }

  hasMore(): boolean {
    return this.displayedAppointments.length < this.appointments.length;
  }

  viewDetails(appointment: AppointmentModel): void {
    this.router.navigate(['/appointments/detail', appointment.id]);
  }

  // Admin/Teacher actions
  approve(appointment: AppointmentModel): void {
    Swal.fire({
      title: this.translateService.instant('APPOINTMENTS_PAGE.CONFIRM_APPROVE'),
      text: this.translateService.instant('APPOINTMENTS_PAGE.APPROVE_MESSAGE'),
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.translateService.instant('APPOINTMENTS_PAGE.YES_APPROVE'),
      cancelButtonText: this.translateService.instant('APPOINTMENTS_PAGE.CANCEL')
    }).then((result) => {
      if (result.isConfirmed) {
        this.appointmentsService.approveAppointment(appointment.id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: this.translateService.instant('APPOINTMENTS_PAGE.APPROVED'),
              text: this.translateService.instant('APPOINTMENTS_PAGE.APPOINTMENT_APPROVED'),
              timer: 2000,
              showConfirmButton: false
            });
            this.loadAppointments();
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

  reject(appointment: AppointmentModel): void {
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
      if (result.isConfirmed) {
        this.appointmentsService.rejectAppointment(appointment.id, { rejectionReason: result.value }).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: this.translateService.instant('APPOINTMENTS_PAGE.REJECTED'),
              text: this.translateService.instant('APPOINTMENTS_PAGE.APPOINTMENT_REJECTED'),
              timer: 2000,
              showConfirmButton: false
            });
            this.loadAppointments();
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

  complete(appointment: AppointmentModel): void {
    Swal.fire({
      title: this.translateService.instant('APPOINTMENTS_PAGE.CONFIRM_COMPLETE'),
      input: 'textarea',
      inputLabel: this.translateService.instant('APPOINTMENTS_PAGE.MEETING_NOTES'),
      inputPlaceholder: this.translateService.instant('APPOINTMENTS_PAGE.NOTES_PLACEHOLDER'),
      showCancelButton: true,
      confirmButtonText: this.translateService.instant('APPOINTMENTS_PAGE.MARK_COMPLETED'),
      cancelButtonText: this.translateService.instant('APPOINTMENTS_PAGE.CANCEL')
    }).then((result) => {
      if (result.isConfirmed) {
        this.appointmentsService.completeAppointment(appointment.id, { notes: result.value }).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: this.translateService.instant('APPOINTMENTS_PAGE.COMPLETED'),
              text: this.translateService.instant('APPOINTMENTS_PAGE.APPOINTMENT_COMPLETED'),
              timer: 2000,
              showConfirmButton: false
            });
            this.loadAppointments();
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

  // Parent actions
  cancelAppointment(appointment: AppointmentModel): void {
    Swal.fire({
      title: this.translateService.instant('APPOINTMENTS_PAGE.CONFIRM_CANCEL'),
      text: this.translateService.instant('APPOINTMENTS_PAGE.CANCEL_MESSAGE'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: this.translateService.instant('APPOINTMENTS_PAGE.YES_CANCEL'),
      cancelButtonText: this.translateService.instant('APPOINTMENTS_PAGE.NO'),
      confirmButtonColor: '#dc3545'
    }).then((result) => {
      if (result.isConfirmed) {
        this.appointmentsService.cancelMyAppointment(appointment.id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: this.translateService.instant('APPOINTMENTS_PAGE.CANCELLED'),
              text: this.translateService.instant('APPOINTMENTS_PAGE.APPOINTMENT_CANCELLED'),
              timer: 2000,
              showConfirmButton: false
            });
            this.loadAppointments();
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

  editAppointment(appointment: AppointmentModel): void {
    this.router.navigate(['/appointments/edit', appointment.id]);
  }

  navigateToAddAppointment(): void {
    this.router.navigate(['/appointments/add']);
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

  trackById(index: number, item: AppointmentModel): number {
    return item.id;
  }
}
