import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DailyActivityService } from './daily-activity.service';
import { ChildrenService } from '../children/children.service';
import { DailyActivity, ActivityTemplate } from './daily-activity.interface';
import { TitlePage } from '../../shared/layouts/title-page/title-page';
import { AuthService } from '../../core/services/auth';
import { BaseChartDirective } from 'ng2-charts';
import type { ChartConfiguration } from 'chart.js';
import { Chart, ArcElement, Tooltip, Legend, DoughnutController, LineElement, LineController, LinearScale, CategoryScale, PointElement } from 'chart.js';
import { Location } from '@angular/common';
import { ParentChildHeaderComponent } from '../../shared/components/parent-child-header/parent-child-header.component';
import { PageTitleService } from '../../core/services/page-title.service';
import { Subscription } from 'rxjs';
import { PullToRefreshComponent } from '../../shared/components/pull-to-refresh/pull-to-refresh.component';

// Register Chart.js components
Chart.register(ArcElement, Tooltip, Legend, DoughnutController, LineElement, LineController, LinearScale, CategoryScale, PointElement);

@Component({
  selector: 'app-daily-activities',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgSelectModule, TranslateModule, TitlePage, BaseChartDirective, ParentChildHeaderComponent, PullToRefreshComponent],
  templateUrl: './daily-activities.html',
  styleUrls: ['./daily-activities.scss']
})
export class DailyActivities implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('activityChart') activityChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('timelineChart') timelineChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('pullToRefresh') pullToRefresh!: PullToRefreshComponent;
  
  activities: DailyActivity[] = [];
  children: any[] = [];
  selectedDate: string = new Date().toISOString().split('T')[0];
  selectedChildId: number | null = null;
  loading = false;
  showBulkAdd = false;
  userRole: string | null = null;
  viewMode: 'timeline' | 'grid' = 'timeline';
  currentChildIndex: number = 0;
  get isParent(): boolean {
      return this.authService.isParent();
  }
  // Chart data
  activityChartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: [],
    datasets: []
  };
  
  timelineChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: []
  };
  
  chartOptions: ChartConfiguration<'doughnut'>['options'] = {};
  timelineChartOptions: ChartConfiguration<'line'>['options'] = {};
  


  activityTemplates: ActivityTemplate[] = [];
  private langChangeSub?: Subscription;

  back() {
    this.location.back();
  }
  moods = ['Happy', 'Sad', 'Cranky', 'Sleepy', 'Energetic', 'Calm'];

  newActivity: DailyActivity = this.getEmptyActivity();

  constructor(
    private activityService: DailyActivityService,
    private childrenService: ChildrenService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private location: Location,
    private translate: TranslateService,
    private pageTitleService: PageTitleService
  ) {}

  ngOnInit() {
    this.pageTitleService.setTitle(this.translate.instant('DAILY_REPORT.TITLE'));
    this.userRole = this.authService.getUserRole();
    this.initActivityTemplates();
    this.loadChildren();

    this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      this.pageTitleService.setTitle(this.translate.instant('DAILY_REPORT.TITLE'));
      this.initActivityTemplates();
      this.cdr.detectChanges();
    });
  }

  private initActivityTemplates(): void {
    this.activityTemplates = [
      { type: 'Nap', icon: 'bi-moon-stars', color: 'primary', label: this.translate.instant('DAILY_REPORT.ACTIVITY_TYPES.NAP'), defaultDuration: 60 },
      { type: 'Meal', icon: 'bi-egg-fried', color: 'success', label: this.translate.instant('DAILY_REPORT.ACTIVITY_TYPES.MEAL'), requiresFood: true },
      { type: 'Snack', icon: 'bi-cup-hot', color: 'warning', label: this.translate.instant('DAILY_REPORT.ACTIVITY_TYPES.SNACK'), requiresFood: true },
      { type: 'Play', icon: 'bi-controller', color: 'info', label: this.translate.instant('DAILY_REPORT.ACTIVITY_TYPES.PLAY'), defaultDuration: 30 },
      { type: 'Diaper', icon: 'bi-table', color: 'secondary', label: this.translate.instant('DAILY_REPORT.ACTIVITY_TYPES.DIAPER') },
      { type: 'Outdoor', icon: 'bi-tree', color: 'success', label: this.translate.instant('DAILY_REPORT.ACTIVITY_TYPES.OUTDOOR'), defaultDuration: 45 },
      { type: 'Learning', icon: 'bi-book', color: 'primary', label: this.translate.instant('DAILY_REPORT.ACTIVITY_TYPES.LEARNING'), defaultDuration: 30 },
      { type: 'Bathroom', icon: 'bi-badge-wc', color: 'info', label: this.translate.instant('DAILY_REPORT.ACTIVITY_TYPES.BATHROOM') }
    ];
  }
  
  ngAfterViewInit() {
    this.setupChartOptions();
    this.updateChartData();
  }
  
  setupChartOptions() {
    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 15,
            usePointStyle: true
          }
        }
      }
    };
    
    this.timelineChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      }
    };
  }

  loadChildren() {
    this.childrenService.loadChildren().subscribe({
      next: (children) => {
        this.children = children;
        console.log('Loaded children:', this.children);
        if (children.length > 0 && !this.selectedChildId) {
          this.selectedChildId = children[0].id!;
          this.currentChildIndex = 0;
        }
        // Load activities after children are loaded and selectedChildId is set
        this.loadActivities();
      }
    });
  }

  loadActivities() {
    this.loading = true;
    if (this.selectedChildId) {
      this.activityService.getActivitiesByChild(this.selectedChildId, this.selectedDate).subscribe({
        next: (activities) => {
          this.activities = activities.sort((a, b) => 
            new Date(b.activityTime).getTime() - new Date(a.activityTime).getTime()
          );
          this.loading = false;
          this.updateChartData();
        },
        error: () => this.loading = false
      });
    } else {
      this.activityService.getActivities(this.selectedDate).subscribe({
        next: (activities) => {
          this.activities = activities.sort((a, b) => 
            new Date(b.activityTime).getTime() - new Date(a.activityTime).getTime()
          );
          this.loading = false;
          this.updateChartData();
        },
        error: () => this.loading = false
      });
    }
  }

  onDateChange() {
    this.loadActivities();
  }

  onChildChange() {
    this.loadActivities();
  }

  selectTemplate(template: ActivityTemplate) {
    this.newActivity = {
      ...this.getEmptyActivity(),
      activityType: template.type,
      childId: this.selectedChildId!,
      activityTime: new Date().toISOString(),
      duration: template.defaultDuration ? `${template.defaultDuration}` : undefined
    };
  }

  saveActivity() {
    if (!this.newActivity.childId || !this.newActivity.activityType) return;

    // Prepare activity data with correct format
    const activityData = {
      ...this.newActivity,
      // Convert duration minutes to TimeSpan format (HH:mm:ss)
      duration: this.newActivity.duration ? 
        `${Math.floor(parseInt(this.newActivity.duration) / 60).toString().padStart(2, '0')}:${(parseInt(this.newActivity.duration) % 60).toString().padStart(2, '0')}:00` 
        : undefined
    };

    console.log('Sending activity data:', activityData);

    this.activityService.addActivity(activityData).subscribe({
      next: () => {
        this.showBulkAdd = false;
        this.newActivity = this.getEmptyActivity();
        this.loadActivities();
      },
      error: (err) => {
        console.error('Error saving activity:', err);
        console.error('Error details:', err.error);
      }
    });
  }

  editActivity(activity: DailyActivity) {
    this.newActivity = { ...activity };
    this.showBulkAdd = true;
  }

  updateChartData() {
    const activityCounts = this.getActivityCounts();
    
    // Activity Distribution Chart
    this.activityChartData = {
      labels: Object.keys(activityCounts),
      datasets: [{
        data: Object.values(activityCounts),
        backgroundColor: [
          '#7dd3c0', // Primary
          '#7db9ff ', // Secondary  
          '#cdeaf0', // Accent
          '#10b981', // Green
          '#f59e0b', // Yellow
          '#ef4444', // Red
          '#8b5cf6', // Purple
          '#06b6d4'  // Cyan
        ],
        borderWidth: 0
      }]
    };
    
    // Timeline Chart
    const timelineData = this.getTimelineData();
    this.timelineChartData = {
      labels: timelineData.labels,
      datasets: [{
        label: 'Activities',
        data: timelineData.data,
        borderColor: '#7dd3c0',
        backgroundColor: '#7dd3c01a',
        fill: true,
        tension: 0.4
      }]
    };
  }
  
  getActivityCounts(): { [key: string]: number } {
    const counts: { [key: string]: number } = {};
    this.activities.forEach(activity => {
      counts[activity.activityType] = (counts[activity.activityType] || 0) + 1;
    });
    return counts;
  }
  
  getTimelineData(): { labels: string[], data: number[] } {
    const hourCounts: { [key: string]: number } = {};
    
    // Initialize hours
    for (let i = 6; i <= 18; i++) {
      const hour = i.toString().padStart(2, '0') + ':00';
      hourCounts[hour] = 0;
    }
    
    // Count activities by hour
    this.activities.forEach(activity => {
      const hour = new Date(activity.activityTime).getHours();
      if (hour >= 6 && hour <= 18) {
        const hourKey = hour.toString().padStart(2, '0') + ':00';
        hourCounts[hourKey]++;
      }
    });
    
    return {
      labels: Object.keys(hourCounts),
      data: Object.values(hourCounts)
    };
  }

  getActivityCount(type: string): number {
    return this.activities.filter(a => a.activityType === type).length;
  }

  exportReport() {
    // Implementation for exporting daily report
    const reportData = {
      date: this.selectedDate,
      child: this.selectedChildId ? this.children.find(c => c.id === this.selectedChildId) : null,
      activities: this.activities,
      summary: {
        totalActivities: this.activities.length,
        meals: this.getActivityCount('Meal') + this.getActivityCount('Snack'),
        naps: this.getActivityCount('Nap'),
        activities: this.getActivityCount('Play') + this.getActivityCount('Learning')
      }
    };
    
    console.log('Exporting report:', reportData);
    // Here you would implement actual export functionality (PDF, Excel, etc.)
  }

  deleteActivity(id: number) {
    if (!confirm('Delete this activity?')) return;

    this.activityService.deleteActivity(id).subscribe({
      next: () => this.loadActivities(),
      error: (err) => console.error('Error deleting activity:', err)
    });
  }

  getTemplate(type: string): ActivityTemplate {
    return this.activityTemplates.find(t => t.type === type) || this.activityTemplates[0];
  }

  getEmptyActivity(): DailyActivity {
    return {
      childId: this.selectedChildId || 0,
      activityType: '',
      activityTime: new Date().toISOString(),
      notes: '',
      mood: 'Happy'
    };
  }

  getTimelineGroups(): { [key: string]: DailyActivity[] } {
    const groups: { [key: string]: DailyActivity[] } = {};
    this.activities.forEach(activity => {
      const hour = new Date(activity.activityTime).getHours();
      const period = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';
      if (!groups[period]) groups[period] = [];
      groups[period].push(activity);
    });
    return groups;
  }

  canEdit(): boolean {
    return this.userRole === 'Admin' || this.userRole === 'Teacher';
  }

  getSelectedChildName(): string {
    if (!this.selectedChildId || !this.children.length) return 'Child';
    const child = this.children.find(c => c.id === this.selectedChildId);
    return child ? `${child.firstName} ${child.lastName}` : 'Child';
  }

  getActivityRows(): DailyActivity[][] {
    const rows: DailyActivity[][] = [];
    for (let i = 0; i < this.activities.length; i += 2) {
      rows.push(this.activities.slice(i, i + 2));
    }
    return rows;
  }

  getActivityIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'Meal': '🍽️ 🥪',
      'Snack': '🍎 🥨',
      'Nap': '🛏️ 😴',
      'Play': '🎮 ⚽',
      'Learning': '📚 ✏️',
      'Outdoor': '🌳 🌈',
      'Diaper': '👶 🧷',
      'Bathroom': '🚽 🧻'
    };
    return icons[type] || '📝 ✨';
  }

  getCurrentChild() {
    return this.children[this.currentChildIndex] || this.children[0];
  }

  prevChild() {
    if (this.currentChildIndex > 0) {
      this.currentChildIndex--;
      this.selectedChildId = this.children[this.currentChildIndex].id;
      this.loadActivities();
    }
  }

  nextChild() {
    if (this.currentChildIndex < this.children.length - 1) {
      this.currentChildIndex++;
      this.selectedChildId = this.children[this.currentChildIndex].id;
      this.loadActivities();
    }
  }

  selectChildByIndex(index: number) {
    this.currentChildIndex = index;
    this.selectedChildId = this.children[this.currentChildIndex].id;
    this.loadActivities();
  }

  getAge(dateOfBirth: string | undefined): string {
    if (!dateOfBirth) return 'N/A';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    const years = today.getFullYear() - birthDate.getFullYear();
    const months = today.getMonth() - birthDate.getMonth();
    
    if (years < 1) {
      return `${months + (years * 12)} months`;
    } else if (years === 1) {
      return '1 year';
    } else {
      return `${years} years`;
    }
  }

  trackByChildId(index: number, child: any): number {
    return child.id;
  }

  // Pull-to-refresh handler
  onRefresh(): void {
    this.loadActivities();
    // Complete refresh after data loads
    setTimeout(() => {
      this.pullToRefresh?.completeRefresh();
    }, 500);
  }

  ngOnDestroy() {
    this.langChangeSub?.unsubscribe();
    // Charts are handled by ng2-charts
  }
}
