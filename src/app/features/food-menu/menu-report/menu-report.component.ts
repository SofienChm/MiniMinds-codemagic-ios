import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FoodMenuService } from '../food-menu.service';
import { Menu, MEAL_TYPES } from '../food-menu.interface';
import { TitlePage, Breadcrumb } from '../../../shared/layouts/title-page/title-page';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PageTitleService } from '../../../core/services/page-title.service';
import { Subscription } from 'rxjs';

interface SelectionSummary {
  childId: number;
  childName: string;
  allergies?: string;
  selections: {
    menuItemId: number;
    foodItemName: string;
    mealType: string;
    isSelected: boolean;
    notes?: string;
    selectionStatus: string;
  }[];
}

@Component({
  selector: 'app-menu-report',
  standalone: true,
  imports: [CommonModule, FormsModule, TitlePage, TranslateModule],
  templateUrl: './menu-report.component.html',
  styleUrl: './menu-report.component.scss'
})
export class MenuReportComponent implements OnInit, OnDestroy {
  menuId: number | null = null;
  menu: Menu | null = null;
  report: any = null;
  loading = false;
  selectedMealType = '';

  mealTypes = MEAL_TYPES;

  breadcrumbs: Breadcrumb[] = [];
  private langChangeSub?: Subscription;

  constructor(
    private foodMenuService: FoodMenuService,
    private route: ActivatedRoute,
    private router: Router,
    private translate: TranslateService,
    private pageTitleService: PageTitleService
  ) {}

  ngOnInit() {
    this.pageTitleService.setTitle(this.translate.instant('FOOD_MENU.MENU_REPORT'));
    this.setupBreadcrumbs();

    this.route.params.subscribe(params => {
      if (params['id']) {
        this.menuId = +params['id'];
        this.loadReport();
      }
    });

    this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      this.pageTitleService.setTitle(this.translate.instant('FOOD_MENU.MENU_REPORT'));
      this.setupBreadcrumbs();
    });
  }

  ngOnDestroy(): void {
    this.langChangeSub?.unsubscribe();
  }

  private setupBreadcrumbs(): void {
    this.breadcrumbs = [
      { label: this.translate.instant('BREADCRUMBS.DASHBOARD'), url: '/dashboard' },
      { label: this.translate.instant('FOOD_MENU.TITLE'), url: '/food-menu' },
      { label: this.translate.instant('FOOD_MENU.MENU_REPORT') }
    ];
  }

  loadReport() {
    if (!this.menuId) return;

    this.loading = true;

    // Load menu details
    this.foodMenuService.getMenu(this.menuId).subscribe({
      next: (menu) => {
        this.menu = menu;
      },
      error: (error) => console.error('Error loading menu:', error)
    });

    // Load report
    this.foodMenuService.getMenuReport(this.menuId).subscribe({
      next: (report) => {
        this.report = report;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading report:', error);
        this.loading = false;
      }
    });
  }

  getDeclinedItems(): any[] {
    if (!this.report?.mealBreakdown) return [];
    return this.report.mealBreakdown.filter((item: any) => item.totalDeclined > 0);
  }

  getItemsByMealType(mealType: string): any[] {
    if (!this.report?.mealBreakdown) return [];
    if (!mealType) return this.report.mealBreakdown;
    return this.report.mealBreakdown.filter((item: any) => item.mealType === mealType);
  }

  getTotalSelected(): number {
    if (!this.report?.mealBreakdown) return 0;
    return this.report.mealBreakdown.reduce((sum: number, item: any) => sum + item.totalSelected, 0);
  }

  getTotalDeclined(): number {
    if (!this.report?.mealBreakdown) return 0;
    return this.report.mealBreakdown.reduce((sum: number, item: any) => sum + item.totalDeclined, 0);
  }

  goBack() {
    this.router.navigate(['/food-menu']);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}
