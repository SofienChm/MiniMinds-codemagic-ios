import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgSelectModule } from '@ng-select/ng-select';
import { AttendanceService } from './attendance.service';
import { Attendance, AttendanceStats } from './attendance.interface';
import { TitlePage } from '../../shared/layouts/title-page/title-page';
import { ChildrenService } from '../children/children.service';
import { ChildModel } from '../children/children.interface';
import { interval, Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth';
import { SignalRService } from '../../core/services/signalr.service';
import { PageTitleService } from '../../core/services/page-title.service';
import { ApiConfig } from '../../core/config/api.config';

@Component({
  selector: 'app-attendance-sheet',
  imports: [CommonModule, FormsModule, TitlePage, TranslateModule, NgSelectModule],
  standalone: true,
  templateUrl: './attendance-sheet.html',
  styleUrl: './attendance-sheet.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttendanceSheet implements OnInit, OnDestroy {
  attendances: Attendance[] = [];
  stats: AttendanceStats = { totalPresent: 0, totalAbsent: 0, checkInsToday: 0, checkOutsToday: 0 };
  selectedDate = new Date().toISOString().split('T')[0];
  searchTerm = '';
  loading = false;
  currentTime = new Date();
  children: ChildModel[] = [];
  availableChildren: ChildModel[] = [];
  selectedChildId: number | null = null;
  checkInNotes = '';
  showCheckInForm = false;
  private refreshSubscription?: Subscription;
  private clockSubscription?: Subscription;
  private langChangeSub?: Subscription;

  get isParent(): boolean {
      return this.authService.isParent();
  }

  constructor(
    private authService: AuthService,
    private attendanceService: AttendanceService,
    private childrenService: ChildrenService,
    private signalRService: SignalRService,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService,
    private pageTitleService: PageTitleService
  ) {}

  ngOnInit(): void {
    this.pageTitleService.setTitle(this.translate.instant('ATTENDANCE_PAGE.TITLE'));
    this.loadTodayData();
    this.loadChildren();
    this.setupRealtimeUpdates();
    this.startClock();

    this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      this.pageTitleService.setTitle(this.translate.instant('ATTENDANCE_PAGE.TITLE'));
      this.cdr.detectChanges();
    });
  }

  loadChildren(): void {
    this.childrenService.loadChildren().subscribe({
      next: (children) => {
        this.children = children;
        this.updateAvailableChildren();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading children:', error?.message || error);
      }
    });
  }

  ngOnDestroy(): void {
    this.refreshSubscription?.unsubscribe();
    this.clockSubscription?.unsubscribe();
    this.langChangeSub?.unsubscribe();
    this.signalRService.offAttendanceUpdate();
  }

  setupRealtimeUpdates(): void {
    // Listen for real-time updates via WebSocket
    this.signalRService.onAttendanceUpdate(() => {
      if (this.selectedDate === new Date().toISOString().split('T')[0]) {
        this.loadTodayData();
      }
    });

    // Fallback: Poll every 2 minutes in case WebSocket fails
    this.refreshSubscription = interval(120000).subscribe(() => {
      if (this.selectedDate === new Date().toISOString().split('T')[0]) {
        this.loadTodayData();
      }
    });
  }

  startClock(): void {
    // Update current time every second
    this.clockSubscription = interval(1000).subscribe(() => {
      this.currentTime = new Date();
      this.cdr.detectChanges();
    });
  }

  loadTodayData(): void {
    this.loading = true;
    this.cdr.detectChanges();
    this.attendanceService.getTodayAttendance().subscribe({
      next: (data) => {
        this.attendances = data;
        this.updateAvailableChildren();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading attendance:', error?.message || error);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });

    this.attendanceService.getTodayStats().subscribe({
      next: (stats) => {
        this.stats = stats;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading stats:', error?.message || error);
      }
    });
  }

  onDateChange(): void {
    this.loading = true;
    this.cdr.detectChanges();
    this.attendanceService.getAttendanceByDate(this.selectedDate).subscribe({
      next: (data) => {
        this.attendances = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading attendance by date:', error?.message || error);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  checkOut(attendance: Attendance, notes?: string): void {
    this.attendanceService.checkOut(attendance.id, notes).subscribe({
      next: () => {
        // Update locally for immediate feedback
        attendance.checkOutTime = new Date().toISOString();
        attendance.checkOutNotes = notes;
        // Refresh data to get server state
        setTimeout(() => this.loadTodayData(), 500);
      }
    });
  }

  get filteredAttendances(): Attendance[] {
    if (!this.searchTerm) return this.attendances;

    return this.attendances.filter(a =>
      a.child?.firstName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      a.child?.lastName.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  getStatusClass(attendance: Attendance): string {
    if (attendance.checkOutTime) return 'status-checked-out';
    return 'status-present';
  }

  getStatusText(attendance: Attendance): string {
    if (attendance.checkOutTime) return this.translate.instant('ATTENDANCE_PAGE.STATUS_CHECKED_OUT');
    return this.translate.instant('ATTENDANCE_PAGE.STATUS_PRESENT');
  }

  /**
   * Parse a date string from the API as UTC time.
   * The API returns UTC times without the 'Z' suffix, so we need to add it.
   */
  private parseUtcDate(dateString: string): Date {
    if (!dateString) return new Date();
    // If the date string doesn't end with 'Z' and doesn't have timezone info, treat it as UTC
    if (!dateString.endsWith('Z') && !dateString.includes('+') && !dateString.includes('-', 10)) {
      return new Date(dateString + 'Z');
    }
    return new Date(dateString);
  }

  formatTime(dateString: string): string {
    return this.parseUtcDate(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  calculateDuration(checkIn: string, checkOut?: string): number {
    const checkInTime = this.parseUtcDate(checkIn).getTime();
    const endTime = checkOut ? this.parseUtcDate(checkOut).getTime() : Date.now();
    return (endTime - checkInTime) / (1000 * 60 * 60);
  }

  getCurrentTime(): string {
    return this.currentTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  getActiveDuration(checkIn: string): string {
    const duration = this.calculateDuration(checkIn);
    const hours = Math.floor(duration);
    const minutes = Math.floor((duration - hours) * 60);
    return `${hours}h ${minutes}m`;
  }

  updateAvailableChildren(): void {
    const checkedInIds = this.attendances
      .filter(a => !a.checkOutTime)
      .map(a => a.childId);
    this.availableChildren = this.children.filter(c => !checkedInIds.includes(c.id!));
  }

  // Custom search function for ng-select to search by first and last name
  searchChild = (term: string, item: ChildModel): boolean => {
    const searchTerm = term.toLowerCase();
    const fullName = `${item.firstName} ${item.lastName}`.toLowerCase();
    return fullName.includes(searchTerm) ||
           item.firstName.toLowerCase().includes(searchTerm) ||
           item.lastName.toLowerCase().includes(searchTerm);
  }

  toggleCheckInForm(): void {
    this.showCheckInForm = !this.showCheckInForm;
    if (!this.showCheckInForm) {
      this.resetCheckInForm();
    }
  }

  resetCheckInForm(): void {
    this.selectedChildId = null;
    this.checkInNotes = '';
  }

  checkInChild(): void {
    if (!this.selectedChildId) return;

    this.attendanceService.checkIn(this.selectedChildId, this.checkInNotes).subscribe({
      next: () => {
        this.loadTodayData();
        this.resetCheckInForm();
        this.showCheckInForm = false;
      }
    });
  }

  /**
   * Get the profile picture URL for a child, preferring file-based URL over Base64
   */
  getChildProfilePictureUrl(child: Attendance['child']): string {
    const defaultPicture = 'assets/child.png';
    if (!child) return defaultPicture;

    // Prefer file-based URL
    if (child.profilePictureUrl && child.profilePictureUrl.trim() !== '') {
      // Prepend the API base URL if it's a relative path
      if (child.profilePictureUrl.startsWith('/')) {
        return ApiConfig.HUB_URL + child.profilePictureUrl;
      }
      return child.profilePictureUrl;
    }

    // Fallback to Base64
    if (child.profilePicture && child.profilePicture.trim() !== '') {
      return child.profilePicture;
    }

    return defaultPicture;
  }
}
