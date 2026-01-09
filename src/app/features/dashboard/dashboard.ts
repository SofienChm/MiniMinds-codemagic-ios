import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth';
import { ChildrenService } from '../children/children.service';
import { ParentService } from '../parent/parent.service';
import { EventService } from '../event/event.service';
import { AttendanceService } from '../../core/services/attendance.service';
import { DailyActivityService } from '../daily-activities/daily-activity.service';
import { DailyActivity } from '../daily-activities/daily-activity.interface';
import { GalleryService } from '../gallery/gallery.service';
import { Photo } from '../gallery/gallery.interface';
import { LeavesService, LeaveRequestModel } from '../leaves/leaves.service';
import { FeeService } from '../fee/fee.service';
import { FeeModel } from '../fee/fee.interface';
import { BaseChartDirective } from 'ng2-charts';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CalendarComponent } from '../../shared/components/calendar/calendar.component';
import { DashboardService, AdminDashboardData, ParentDashboardData } from '../../core/services/dashboard.service';
import type { ChartConfiguration } from 'chart.js';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { SkeletonStatCardComponent } from '../../shared/components/skeleton/skeleton-stat-card.component';
import { SkeletonActivityTimelineComponent } from '../../shared/components/skeleton/skeleton-activity-timeline.component';
import { SkeletonChildCardComponent } from '../../shared/components/skeleton/skeleton-child-card.component';

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    RouterModule,
    BaseChartDirective,
    TranslateModule,
    CalendarComponent,
    SkeletonComponent,
    SkeletonStatCardComponent,
    SkeletonActivityTimelineComponent,
    SkeletonChildCardComponent
  ],
  standalone: true,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit, OnDestroy {
  private langChangeSub?: Subscription;
  userRole: string | null = null;
  userName: string = '';
  userProfilePicture: string = '';
  loading = false; // Changed to false - page loads immediately

  // Individual loading states for progressive loading
  loadingStates = {
    children: true,
    parents: true,
    events: true,
    attendance: true,
    fees: true,
    leaves: true,
    activities: true,
    photos: true
  };

  stats = {
    children: 0,
    parents: 0,
    teachers: 0,
    events: 0,
    activeChildren: 0,
    todayAttendance: 0
  };

  monthlyStats = {
    childrenChange: 0,
    eventsChange: 0,
    incomeChange: 0,
    income: 0
  };

  recentChildren: any[] = [];
  upcomingEvents: any[] = [];
  myChildren: any[] = [];
  upcomingLeaves: LeaveRequestModel[] = [];
  unpaidChildren: FeeModel[] = [];
  selectedChildIndex: number = 0;
  todayActivities: DailyActivity[] = [];
  recentPhotos: Photo[] = [];
  todayStats = {
    meals: { completed: 0, total: 0 },
    napTime: '',
    activities: 0
  };

  // Leave Chart Data
  leavesChartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: ['Present', 'Absent'],
    datasets: [{
      data: [0, 0],
      backgroundColor: ['#202c4b', '#a7a7a7ff'],
      hoverBackgroundColor: ['#1b253dff', '#a7a7a7ff']
    }]
  };

  leavesChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };  


  // Gender Chart Data
  genderChartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: ['Boys', 'Girls'],
    datasets: [{
      data: [0, 0],
          backgroundColor: ['#a8c5ff', '#feccfd'],
          hoverBackgroundColor: ['#9bbaf6ff', '#f0bfefff']
    }]
  };

  genderChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  // Educators Attendance Chart Data
  educatorsAttendanceChartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: ['Present', 'Absent'],
    datasets: [{
      data: [0, 0],
      backgroundColor: ['#7dd3c0', '#e9ecef'],
      hoverBackgroundColor: ['#218838', '#dee2e6']
    }]
  };

  educatorsAttendanceChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  boysCount = 0;
  girlsCount = 0;
  boysPercentage = 0;
  girlsPercentage = 0;

  presentCount = 0;
  absentCount = 0;
  presentPercentage = 0;
  absentPercentage = 0;

  paymentStats = {
    paid: 0,
    pending: 0,
    overdue: 0
  };

  paymentChartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: ['Paid', 'Pending', 'Overdue'],
    datasets: [{
      data: [0, 0, 0],
      backgroundColor: ['#7dd3c0', '#a8c5ff', '#feccfd'],
      hoverBackgroundColor: ['#75cbb9ff', '#9bbaf6ff', '#f0bfefff']
    }]
  };

  paymentChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: false
      }
    }
  };

  attendanceChartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: ['Present', 'Absent'],
    datasets: [{
      data: [0, 0],
      backgroundColor: ['#7dd3c0', '#e9ecef'],
      hoverBackgroundColor: ['#6ec9b6ff', '#dee2e6']
    }]
  };

  attendanceBarChartData: ChartConfiguration<'bar'>['data'] = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
      label: 'Attendance',
      data: [10, 12, 11, 13, 12, 8, 7],
      backgroundColor: '#7db9ff',
      borderColor: '#7db9ff',
      borderWidth: 1,
      borderRadius: 12
    }]
  };

  attendanceChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  attendanceBarChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: true
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 5
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  constructor(
    private authService: AuthService,
    private childrenService: ChildrenService,
    private parentService: ParentService,
    private eventService: EventService,
    private attendanceService: AttendanceService,
    private dailyActivityService: DailyActivityService,
    private leavesService: LeavesService,
    private galleryService: GalleryService,
    private feeService: FeeService,
    private dashboardService: DashboardService,
    private router: Router,
    private translateService: TranslateService
  ) {}

  ngOnInit() {
    this.userRole = this.authService.getUserRole();
    const user = this.authService.getCurrentUser();
    this.userName = user?.firstName || this.userRole!;
    this.userProfilePicture = user?.profilePicture || '';
    this.loadChartJS();
    this.initializeCharts();
    this.updateChartLabels();
    this.loadDashboardData();

    // Update chart labels when language changes
    this.langChangeSub = this.translateService.onLangChange.subscribe(() => {
      this.updateChartLabels();
    });
  }

  ngOnDestroy(): void {
    this.langChangeSub?.unsubscribe();
  }

  loadChartJS() {
    import('chart.js').then(({ Chart, ArcElement, Tooltip, Legend, DoughnutController, BarElement, BarController, LinearScale, CategoryScale }) => {
      Chart.register(ArcElement, Tooltip, Legend, DoughnutController, BarElement, BarController, LinearScale, CategoryScale);
    });
  }

  initializeCharts() {
    this.paymentChartData.datasets[0].data = [1, 1, 1];
    // Doughnut chart should have 2 values: Present and Absent
    this.attendanceChartData.datasets[0].data = [0, 0];
  }

  updateChartLabels() {
    // Update leaves chart labels
    this.leavesChartData.labels = [
      this.translateService.instant('DASHBOARD.PRESENT'),
      this.translateService.instant('DASHBOARD.ABSENT')
    ];

    // Update gender chart labels
    this.genderChartData.labels = [
      this.translateService.instant('DASHBOARD.BOYS'),
      this.translateService.instant('DASHBOARD.GIRLS')
    ];

    // Update educators attendance chart labels
    this.educatorsAttendanceChartData.labels = [
      this.translateService.instant('DASHBOARD.PRESENT'),
      this.translateService.instant('DASHBOARD.ABSENT')
    ];

    // Update payment chart labels
    this.paymentChartData.labels = [
      this.translateService.instant('DASHBOARD.PAID'),
      this.translateService.instant('DASHBOARD.PENDING'),
      this.translateService.instant('DASHBOARD.OVERDUE')
    ];

    // Update attendance chart labels
    this.attendanceChartData.labels = [
      this.translateService.instant('DASHBOARD.PRESENT'),
      this.translateService.instant('DASHBOARD.ABSENT')
    ];

    // Update weekly attendance bar chart labels
    this.attendanceBarChartData.labels = [
      this.translateService.instant('DASHBOARD.MON'),
      this.translateService.instant('DASHBOARD.TUE'),
      this.translateService.instant('DASHBOARD.WED'),
      this.translateService.instant('DASHBOARD.THU'),
      this.translateService.instant('DASHBOARD.FRI'),
      this.translateService.instant('DASHBOARD.SAT'),
      this.translateService.instant('DASHBOARD.SUN')
    ];

    // Update attendance bar chart dataset label
    this.attendanceBarChartData.datasets[0].label = this.translateService.instant('DASHBOARD.ATTENDANCE');
  }

  loadDashboardData() {
    // Reset all loading states
    this.loadingStates = {
      children: true,
      parents: true,
      events: true,
      attendance: true,
      fees: true,
      leaves: true,
      activities: true,
      photos: true
    };

    if (this.userRole === 'Parent') {
      this.loadParentDashboard();
    } else {
      this.loadAdminTeacherDashboard();
    }
  }

  loadParentDashboard() {
    // Use single optimized API call
    this.dashboardService.getParentDashboard().pipe(
      catchError(() => {
        // Fallback to old method if new endpoint fails
        this.loadParentDashboardLegacy();
        return of(null);
      })
    ).subscribe({
      next: (data: ParentDashboardData | null) => {
        if (!data) return;

        // Parent profile
        if (data.parent?.profilePicture) {
          this.authService.updateProfilePicture(data.parent.profilePicture);
          this.userProfilePicture = data.parent.profilePicture;
        }

        // Children with attendance
        this.myChildren = data.children.map(c => ({
          ...c,
          checkInTime: c.todayAttendance?.checkInTime,
          checkOutTime: c.todayAttendance?.checkOutTime
        }));
        this.stats.children = data.children.length;

        // Upcoming events (map timeString to time for template compatibility)
        this.upcomingEvents = data.upcomingEvents.map(e => ({ ...e, time: e.timeString }));

        // Today's activities
        this.todayActivities = data.todayActivities as any;
        this.calculateTodayStats(data.todayActivities as any);

        // Load photos for first child (still separate call for now)
        if (data.children.length > 0) {
          this.loadRecentPhotos(data.children[0].id);
        } else {
          this.loadingStates.photos = false;
        }

        // Mark all as loaded
        this.loadingStates = {
          children: false,
          parents: false,
          events: false,
          attendance: false,
          fees: false,
          leaves: false,
          activities: false,
          photos: this.loadingStates.photos // Keep photo loading state
        };
      },
      error: () => {
        this.loadParentDashboardLegacy();
      }
    });
  }

  // Fallback method using multiple API calls
  loadParentDashboardLegacy() {
    const parentId = this.authService.getParentId();
    let todayAttendances: any[] = [];

    if (parentId) {
      this.parentService.getParentWithChildren(parentId).pipe(catchError(() => of(null))).subscribe({
        next: (parent) => {
          if (parent?.profilePicture) {
            this.authService.updateProfilePicture(parent.profilePicture);
            this.userProfilePicture = parent.profilePicture;
          }
          this.loadingStates.parents = false;
        },
        error: () => {
          this.loadingStates.parents = false;
        }
      });
    } else {
      this.loadingStates.parents = false;
    }

    this.childrenService.loadChildren().pipe(catchError(() => of([]))).subscribe({
      next: (children) => {
        this.myChildren = children;
        this.stats.children = children.length;

        if (todayAttendances.length > 0) {
          this.applyAttendanceToChildren(todayAttendances);
        }

        if (children.length > 0 && children[0].id) {
          this.loadTodayActivities(children[0].id);
        } else {
          this.loadingStates.activities = false;
          this.loadingStates.photos = false;
        }

        this.loadingStates.children = false;
      },
      error: () => {
        this.myChildren = [];
        this.loadingStates.children = false;
        this.loadingStates.activities = false;
        this.loadingStates.photos = false;
      }
    });

    this.eventService.loadEvents().pipe(catchError(() => of([]))).subscribe({
      next: (events) => {
        const now = new Date();
        this.upcomingEvents = events
          .filter(e => new Date(e.time) > now)
          .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
          .slice(0, 3);
        this.loadingStates.events = false;
      },
      error: () => {
        this.loadingStates.events = false;
      }
    });

    this.attendanceService.getTodayAttendance().pipe(catchError(() => of([]))).subscribe({
      next: (attendances) => {
        todayAttendances = attendances;
        if (this.myChildren.length > 0) {
          this.applyAttendanceToChildren(attendances);
        }
        this.loadingStates.attendance = false;
      },
      error: () => {
        this.loadingStates.attendance = false;
      }
    });

    this.loadingStates.fees = false;
    this.loadingStates.leaves = false;
  }

  // Helper method to apply attendance data to children
  private applyAttendanceToChildren(attendances: any[]) {
    this.myChildren.forEach(child => {
      const todayAttendance = attendances.find((att: any) => att.childId === child.id);
      if (todayAttendance) {
        if (todayAttendance.checkInTime) {
          child.checkInTime = todayAttendance.checkInTime;
        }
        if (todayAttendance.checkOutTime) {
          child.checkOutTime = todayAttendance.checkOutTime;
        }
      }
    });
  }

  loadTodayActivities(childId: number) {
    this.loadingStates.activities = true;
    const today = new Date().toISOString().split('T')[0];
    this.dailyActivityService.getActivitiesByChild(childId, today).subscribe({
      next: (activities) => {
        this.todayActivities = activities.sort((a, b) =>
          new Date(a.activityTime).getTime() - new Date(b.activityTime).getTime()
        );
        this.calculateTodayStats(activities);
        this.loadingStates.activities = false;
      },
      error: (error) => {
        console.error('Error loading activities:', error);
        this.todayActivities = [];
        this.loadingStates.activities = false;
      }
    });
    this.loadRecentPhotos(childId);
  }

  loadRecentPhotos(childId: number) {
    this.loadingStates.photos = true;
    this.galleryService.getPhotosByChild(childId, 1, 3).subscribe({
      next: (response) => {
        this.recentPhotos = response.data.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ).slice(0, 3);
        this.loadingStates.photos = false;
      },
      error: (error) => {
        console.error('Error loading recent photos:', error);
        this.recentPhotos = [];
        this.loadingStates.photos = false;
      }
    });
  }

  calculateTodayStats(activities: DailyActivity[]) {
    const meals = activities.filter(a => a.activityType.toLowerCase().includes('meal') || a.activityType.toLowerCase().includes('snack'));
    this.todayStats.meals.completed = meals.length;
    this.todayStats.meals.total = 3;
    
    const napActivity = activities.find(a => a.activityType.toLowerCase().includes('nap'));
    this.todayStats.napTime = napActivity?.duration || '0 hour';
    
    this.todayStats.activities = activities.filter(a => 
      !a.activityType.toLowerCase().includes('meal') && 
      !a.activityType.toLowerCase().includes('snack') &&
      !a.activityType.toLowerCase().includes('nap')
    ).length;
  }

  loadAdminTeacherDashboard() {
    // Use single optimized API call
    this.dashboardService.getAdminDashboard().pipe(
      catchError(() => {
        // Fallback to old method if new endpoint fails
        this.loadAdminTeacherDashboardLegacy();
        return of(null);
      })
    ).subscribe({
      next: (data: AdminDashboardData | null) => {
        if (!data) return;

        // Stats
        this.stats.children = data.stats.totalChildren;
        this.stats.activeChildren = data.stats.activeChildren;
        this.stats.parents = data.stats.totalParents;
        this.stats.events = data.stats.totalEvents;

        // Gender stats
        this.boysCount = data.stats.boysCount;
        this.girlsCount = data.stats.girlsCount;
        const total = this.boysCount + this.girlsCount;
        if (total > 0) {
          this.boysPercentage = Math.round((this.boysCount / total) * 100);
          this.girlsPercentage = Math.round((this.girlsCount / total) * 100);
          this.genderChartData.datasets[0].data = [this.boysCount, this.girlsCount];
        }

        // Recent children
        this.recentChildren = data.recentChildren;

        // Upcoming events (map timeString to time for template compatibility)
        this.upcomingEvents = data.upcomingEvents.map(e => ({ ...e, time: e.timeString }));

        // Weekly attendance
        if (data.weeklyAttendance.length > 0) {
          this.attendanceBarChartData.datasets[0].data = data.weeklyAttendance.map(day => day.presentCount);
        } else {
          this.setDefaultAttendanceData();
        }

        // Upcoming leaves
        this.upcomingLeaves = data.upcomingLeaves as any;

        // Unpaid fees
        this.unpaidChildren = data.unpaidFees as any;

        // Calculate other stats
        this.calculateAttendanceStats();
        this.calculatePaymentStats(data.stats.totalChildren);

        // Monthly changes
        this.monthlyStats.childrenChange = data.stats.newChildrenThisMonth;
        this.monthlyStats.income = data.stats.totalChildren * 150;

        // Mark all as loaded
        this.loadingStates = {
          children: false,
          parents: false,
          events: false,
          attendance: false,
          fees: false,
          leaves: false,
          activities: false,
          photos: false
        };
      },
      error: () => {
        this.loadAdminTeacherDashboardLegacy();
      }
    });
  }

  // Fallback method using multiple API calls
  loadAdminTeacherDashboardLegacy() {
    let loadedChildren: any[] = [];
    let loadedEvents: any[] = [];

    this.childrenService.loadChildren().pipe(catchError(() => of([]))).subscribe({
      next: (children) => {
        loadedChildren = children;
        this.stats.children = children.length;
        this.stats.activeChildren = children.filter(c => c.isActive).length;
        this.recentChildren = children.slice(0, 8);
        this.calculateGenderStats(children);
        this.calculateAttendanceStats();
        if (loadedEvents.length > 0 || !this.loadingStates.events) {
          this.calculateMonthlyChanges(children, loadedEvents);
        }
        this.loadingStates.children = false;
      },
      error: () => {
        this.loadingStates.children = false;
      }
    });

    this.parentService.loadParents().pipe(catchError(() => of([]))).subscribe({
      next: (parents) => {
        this.stats.parents = parents.length;
        this.loadingStates.parents = false;
      },
      error: () => {
        this.loadingStates.parents = false;
      }
    });

    this.eventService.loadEvents().pipe(catchError(() => of([]))).subscribe({
      next: (events) => {
        loadedEvents = events;
        this.stats.events = events.length;
        const now = new Date();
        this.upcomingEvents = events
          .filter(e => new Date(e.time) > now)
          .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
          .slice(0, 2);
        if (loadedChildren.length > 0 || !this.loadingStates.children) {
          this.calculateMonthlyChanges(loadedChildren, events);
        }
        this.loadingStates.events = false;
      },
      error: () => {
        this.loadingStates.events = false;
      }
    });

    this.attendanceService.getWeeklyAttendance().pipe(catchError(() => of([]))).subscribe({
      next: (attendanceData) => {
        if (attendanceData.length > 0) {
          this.attendanceBarChartData.datasets[0].data = attendanceData.map((day: any) => day.presentCount || 0);
        } else {
          this.setDefaultAttendanceData();
        }
        this.loadingStates.attendance = false;
      },
      error: () => {
        this.setDefaultAttendanceData();
        this.loadingStates.attendance = false;
      }
    });

    this.leavesService.getAllLeaves('Approved').pipe(catchError(() => of([]))).subscribe({
      next: (leaves) => {
        const now = new Date();
        this.upcomingLeaves = leaves
          .filter(leave => new Date(leave.startDate) > now)
          .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
          .slice(0, 5);
        this.loadingStates.leaves = false;
      },
      error: () => {
        this.loadingStates.leaves = false;
      }
    });

    this.feeService.getFees().pipe(catchError(() => of([]))).subscribe({
      next: (fees) => {
        this.unpaidChildren = fees
          .filter(fee => fee.status === 'pending' || fee.status === 'overdue')
          .sort((a, b) => {
            if (a.status === 'overdue' && b.status !== 'overdue') return -1;
            if (a.status !== 'overdue' && b.status === 'overdue') return 1;
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          })
          .slice(0, 5);
        this.loadingStates.fees = false;
      },
      error: () => {
        this.loadingStates.fees = false;
      }
    });
  }

  setDefaultAttendanceData() {
    const totalChildren = this.stats.children || 20;
    this.attendanceBarChartData.datasets[0].data = [
      Math.round(totalChildren * 0.90),
      Math.round(totalChildren * 1.00),
      Math.round(totalChildren * 0.98),
      Math.round(totalChildren * 0.95),
      Math.round(totalChildren * 0.92),
      Math.round(totalChildren * 0.85),
      Math.round(totalChildren * 0.80)
    ];
  }

  calculateAttendanceStats() {
    const totalChildren = this.stats.children || 20;
    this.presentCount = Math.round(totalChildren * 0.85);
    this.absentCount = totalChildren - this.presentCount;
    
    if (totalChildren > 0) {
      this.presentPercentage = Math.round((this.presentCount / totalChildren) * 100);
      this.absentPercentage = Math.round((this.absentCount / totalChildren) * 100);
      
      this.attendanceChartData.datasets[0].data = [this.presentCount, this.absentCount];
    }
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return this.translateService.instant('DASHBOARD.GOOD_MORNING');
    if (hour < 18) return this.translateService.instant('DASHBOARD.GOOD_AFTERNOON');
    return this.translateService.instant('DASHBOARD.GOOD_EVENING');
  }

  getAge(dateOfBirth: string): string {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();

    if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
      years--;
      months += 12;
    }

    if (today.getDate() < birthDate.getDate()) {
      months--;
    }

    if (years < 1) {
      const monthLabel = months !== 1
        ? this.translateService.instant('DASHBOARD.MONTHS')
        : this.translateService.instant('DASHBOARD.MONTH');
      return `${months} ${monthLabel}`;
    }

    const yearLabel = years !== 1
      ? this.translateService.instant('DASHBOARD.YEARS')
      : this.translateService.instant('DASHBOARD.YEAR');
    return `${years} ${yearLabel}`;
  }

  getCheckInStatus(child: any): string {
    if (child.checkOutTime) {
      const time = new Date(child.checkOutTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      return `${this.translateService.instant('DASHBOARD.CHECKED_OUT_AT')} ${time} 👋`;
    }
    if (child.checkInTime) {
      const time = new Date(child.checkInTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      return `${this.translateService.instant('DASHBOARD.CHECKED_IN_AT')} ${time} 😊`;
    }
    return this.translateService.instant('DASHBOARD.NOT_CHECKED_IN_YET');
  }

  getSelectedChildName(): string {
    const child = this.getSelectedChild();
    return child ? `${child.firstName} ${child.lastName}` : '';
  }

  calculateGenderStats(children: any[]) {
    this.boysCount = children.filter(c => c.gender?.toLowerCase() === 'male').length;
    this.girlsCount = children.filter(c => c.gender?.toLowerCase() === 'female').length;
    const total = this.boysCount + this.girlsCount;

    if (total > 0) {
      this.boysPercentage = Math.round((this.boysCount / total) * 100);
      this.girlsPercentage = Math.round((this.girlsCount / total) * 100);
      this.genderChartData = {
        labels: [
          this.translateService.instant('DASHBOARD.BOYS'),
          this.translateService.instant('DASHBOARD.GIRLS')
        ],
        datasets: [{
          data: [this.boysCount, this.girlsCount],
          backgroundColor: ['#a8c5ff', '#feccfd'],
          hoverBackgroundColor: ['#9bbaf6ff', '#f0bfefff']
        }]
      };
    }

    this.calculatePaymentStats(children.length);
  }

  calculatePaymentStats(totalChildren: number) {
    if (totalChildren === 0) totalChildren = 1;
    this.paymentStats.paid = Math.floor(totalChildren * 0.6);
    this.paymentStats.pending = Math.floor(totalChildren * 0.25);
    this.paymentStats.overdue = totalChildren - this.paymentStats.paid - this.paymentStats.pending;
    this.paymentChartData.datasets[0].data = [this.paymentStats.paid || 1, this.paymentStats.pending || 1, this.paymentStats.overdue || 1];
  }

  // Child slider methods
  nextChild() {
    if (this.selectedChildIndex < this.myChildren.length - 1) {
      this.selectedChildIndex++;
      this.loadSelectedChildData();
    }
  }

  prevChild() {
    if (this.selectedChildIndex > 0) {
      this.selectedChildIndex--;
      this.loadSelectedChildData();
    }
  }

  selectChild(index: number) {
    this.selectedChildIndex = index;
    this.loadSelectedChildData();
  }

  // Swipe functionality for child carousel
  private touchStartX = 0;
  private touchEndX = 0;
  private readonly swipeThreshold = 50; // Minimum distance for swipe

  onTouchStart(event: TouchEvent) {
    this.touchStartX = event.changedTouches[0].screenX;
  }

  onTouchEnd(event: TouchEvent) {
    this.touchEndX = event.changedTouches[0].screenX;
    this.handleSwipe();
  }

  private handleSwipe() {
    const swipeDistance = this.touchEndX - this.touchStartX;

    if (Math.abs(swipeDistance) > this.swipeThreshold) {
      if (swipeDistance > 0) {
        // Swipe right - go to previous child
        this.prevChild();
      } else {
        // Swipe left - go to next child
        this.nextChild();
      }
    }
  }

  getSelectedChild() {
    return this.myChildren[this.selectedChildIndex] || null;
  }

  loadSelectedChildData() {
    const selectedChild = this.getSelectedChild();
    if (selectedChild?.id) {
      this.loadTodayActivities(selectedChild.id);
    }
  }

  calculateMonthlyChanges(children: any[], events: any[] = []) {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const lastMonthChildren = children.filter(c => new Date(c.createdAt) < thisMonth).length;
    const thisMonthChildren = children.filter(c => new Date(c.createdAt) >= thisMonth).length;

    this.monthlyStats.childrenChange = lastMonthChildren > 0
      ? Math.round((thisMonthChildren / lastMonthChildren) * 100)
      : 0;

    // Use events passed from forkJoin instead of making another API call
    const lastMonthEvents = events.filter(e => new Date(e.time) >= lastMonth && new Date(e.time) < thisMonth).length;
    const thisMonthEvents = events.filter(e => new Date(e.time) >= thisMonth).length;

    this.monthlyStats.eventsChange = lastMonthEvents > 0
      ? Math.round(((thisMonthEvents - lastMonthEvents) / lastMonthEvents) * 100)
      : 0;

    this.monthlyStats.income = children.length * 150;
    this.monthlyStats.incomeChange = Math.floor(Math.random() * 20) - 5;
  }

  goToParentProfile() {
    const parentId = this.authService.getParentId();
    if (parentId) {
      this.router.navigate(['/parents/detail', parentId]);
    }
  }

  getLeaveTypeColor(leaveType: string): string {
    switch (leaveType) {
      case 'Annual':
        return 'rgb(61 94 225 / 75%) !important';
      case 'Medical':
        return 'rgb(220 53 69 / 75%) !important';
      case 'Emergency':
        return 'rgb(44 126 143 / 75%) !important';
      default:
        return '#6c757d !important';
    }
  }

  // TrackBy functions for ngFor performance optimization
  trackById(index: number, item: any): number {
    return item.id;
  }

  trackByIndex(index: number): number {
    return index;
  }
}
