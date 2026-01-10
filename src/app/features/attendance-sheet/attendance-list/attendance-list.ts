import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AttendanceService } from '../attendance.service';
import { Attendance } from '../attendance.interface';
import { TitlePage } from '../../../shared/layouts/title-page/title-page';
import { ChildrenService } from '../../children/children.service';
import { ChildModel } from '../../children/children.interface';
import { Subscription } from 'rxjs';
import { PageTitleService } from '../../../core/services/page-title.service';

interface ChildAttendanceStatus {
  child: ChildModel;
  attendance?: Attendance;
  isCheckedIn: boolean;
}

@Component({
  selector: 'app-attendance-list',
  imports: [CommonModule, FormsModule, TitlePage, TranslateModule],
  standalone: true,
  templateUrl: './attendance-list.html',
  styleUrl: './attendance-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttendanceList implements OnInit, OnDestroy {
  childrenWithStatus: ChildAttendanceStatus[] = [];
  children: ChildModel[] = [];
  attendances: Attendance[] = [];
  searchTerm = '';
  loading = false;
  private langChangeSub?: Subscription;

  constructor(
    private attendanceService: AttendanceService,
    private childrenService: ChildrenService,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService,
    private pageTitleService: PageTitleService
  ) {}

  ngOnInit(): void {
    this.pageTitleService.setTitle(this.translate.instant('ATTENDANCE_LIST.TITLE'));
    this.loadData();

    this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      this.pageTitleService.setTitle(this.translate.instant('ATTENDANCE_LIST.TITLE'));
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.langChangeSub?.unsubscribe();
  }

  loadData(): void {
    this.loading = true;
    this.cdr.detectChanges();

    this.childrenService.loadChildren().subscribe({
      next: (children) => {
        this.children = children;
        this.loadTodayAttendance();
      },
      error: (error) => {
        console.error('Error loading children:', error?.message || error);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadTodayAttendance(): void {
    this.attendanceService.getTodayAttendance().subscribe({
      next: (attendances) => {
        this.attendances = attendances;
        this.buildChildrenWithStatus();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading attendance:', error?.message || error);
        this.buildChildrenWithStatus();
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  buildChildrenWithStatus(): void {
    this.childrenWithStatus = this.children.map(child => {
      const attendance = this.attendances.find(a => a.childId === child.id && !a.checkOutTime);
      return {
        child,
        attendance,
        isCheckedIn: !!attendance
      };
    });
  }

  get filteredChildren(): ChildAttendanceStatus[] {
    if (!this.searchTerm) return this.childrenWithStatus;

    const term = this.searchTerm.toLowerCase();
    return this.childrenWithStatus.filter(item =>
      item.child.firstName.toLowerCase().includes(term) ||
      item.child.lastName.toLowerCase().includes(term)
    );
  }

  checkIn(item: ChildAttendanceStatus): void {
    if (!item.child.id) return;

    this.attendanceService.checkIn(item.child.id).subscribe({
      next: (attendance) => {
        item.attendance = attendance;
        item.isCheckedIn = true;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error checking in:', error?.message || error);
      }
    });
  }

  checkOut(item: ChildAttendanceStatus): void {
    if (!item.attendance) return;

    this.attendanceService.checkOut(item.attendance.id).subscribe({
      next: () => {
        item.isCheckedIn = false;
        item.attendance = undefined;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error checking out:', error?.message || error);
      }
    });
  }

  refresh(): void {
    this.loadData();
  }
}
