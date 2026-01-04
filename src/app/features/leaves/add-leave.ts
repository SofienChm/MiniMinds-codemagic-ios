import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { TitlePage, Breadcrumb, TitleAction } from '../../shared/layouts/title-page/title-page';
import { AuthService } from '../../core/services/auth';
import { LeavesService, CreateLeaveRequestDto } from './leaves.service';
import { EducatorService } from '../educator/educator.service';
import { EducatorModel } from '../educator/educator.interface';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PageTitleService } from '../../core/services/page-title.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-add-leave',
  standalone: true,
  imports: [CommonModule, FormsModule, TitlePage, NgSelectModule, TranslateModule],
  templateUrl: './add-leave.html',
  styleUrls: ['./add-leave.scss']
})
export class AddLeave implements OnInit, OnDestroy {
  isAdmin = false;
  isTeacher = false;
  breadcrumbs: Breadcrumb[] = [];
  actions: TitleAction[] = [];
  private langChangeSub?: Subscription;

  // Leave type options for ng-select
  leaveTypeOptions: { value: string; label: string }[] = [];

  // Teacher form
  newLeave: CreateLeaveRequestDto = { startDate: '', endDate: '', reason: '', leaveType: 'Annual' };
  submitting = false;
  errorMessage = '';

  // Admin form
  teachers: EducatorModel[] = [];
  adminSelectedTeacherId: number | null = null;
  adminNewLeave: CreateLeaveRequestDto = { startDate: '', endDate: '', reason: '', leaveType: 'Annual' };
  adminApprove: boolean = true;
  adminSubmitting = false;
  adminError = '';

  constructor(
    private authService: AuthService,
    private leavesService: LeavesService,
    private educatorService: EducatorService,
    private router: Router,
    private translateService: TranslateService,
    private pageTitleService: PageTitleService
  ) {}

  cancel(): void {
    this.router.navigate(['/leaves']);
  }

  ngOnInit(): void {
    this.pageTitleService.setTitle(this.translateService.instant('LEAVES_PAGE.ADD_LEAVE'));
    this.isAdmin = this.authService.isAdmin();
    this.isTeacher = this.authService.isTeacher();
    if (this.isAdmin) {
      this.loadTeachers();
    }

    this.updateTranslatedContent();

    this.langChangeSub = this.translateService.onLangChange.subscribe(() => {
      this.updateTranslatedContent();
      this.pageTitleService.setTitle(this.translateService.instant('LEAVES_PAGE.ADD_LEAVE'));
    });
  }

  ngOnDestroy(): void {
    this.langChangeSub?.unsubscribe();
  }

  updateTranslatedContent(): void {
    this.breadcrumbs = [
      { label: this.translateService.instant('LEAVES_PAGE.DASHBOARD'), url: '/dashboard' },
      { label: this.translateService.instant('LEAVES_PAGE.LEAVES'), url: '/leaves' },
      { label: this.translateService.instant('LEAVES_PAGE.ADD') }
    ];

    this.actions = [
      {
        label: this.translateService.instant('LEAVES_PAGE.BACK_TO_LEAVES'),
        icon: 'bi bi-arrow-left',
        class: 'btn-cancel-global',
        action: () => this.cancel()
      }
    ];

    this.leaveTypeOptions = [
      { value: 'Annual', label: this.translateService.instant('LEAVES_PAGE.ANNUAL_LEAVE') },
      { value: 'Medical', label: this.translateService.instant('LEAVES_PAGE.MEDICAL_LEAVE') },
      { value: 'Emergency', label: this.translateService.instant('LEAVES_PAGE.EMERGENCY_LEAVE') }
    ];
  }

  loadTeachers(): void {
    this.educatorService.loadEducators().subscribe({
      next: (list) => this.teachers = list || [],
      error: () => this.teachers = []
    });
  }

  submitTeacherLeave(): void {
    this.errorMessage = '';
    this.submitting = true;
    const { startDate, endDate, reason } = this.newLeave;
    if (!startDate || !endDate) {
      this.errorMessage = this.translateService.instant('LEAVES_PAGE.DATES_REQUIRED');
      this.submitting = false;
      return;
    }
    this.leavesService.requestLeave({ startDate, endDate, reason: (reason || '').trim(), leaveType: this.newLeave.leaveType }).subscribe({
      next: () => {
        this.submitting = false;
        this.router.navigate(['/leaves']);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || this.translateService.instant('LEAVES_PAGE.FAILED_SUBMIT_REQUEST');
        this.submitting = false;
      }
    });
  }

  submitAdminLeave(): void {
    this.adminError = '';
    this.adminSubmitting = true;
    const tid = this.adminSelectedTeacherId;
    const { startDate, endDate, reason } = this.adminNewLeave;
    if (!tid) {
      this.adminError = this.translateService.instant('LEAVES_PAGE.PLEASE_SELECT_TEACHER');
      this.adminSubmitting = false;
      return;
    }
    if (!startDate || !endDate) {
      this.adminError = this.translateService.instant('LEAVES_PAGE.DATES_REQUIRED');
      this.adminSubmitting = false;
      return;
    }
    this.leavesService.adminCreateLeave(tid, { startDate, endDate, reason: (reason || '').trim(), leaveType: this.adminNewLeave.leaveType, approve: this.adminApprove }).subscribe({
      next: () => {
        this.adminSubmitting = false;
        this.router.navigate(['/leaves']);
      },
      error: (err) => {
        this.adminError = err.error?.message || this.translateService.instant('LEAVES_PAGE.FAILED_CREATE_LEAVE');
        this.adminSubmitting = false;
      }
    });
  }
}