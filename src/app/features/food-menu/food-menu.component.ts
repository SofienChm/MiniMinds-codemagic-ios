import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FoodMenuService } from './food-menu.service';
import { AuthService } from '../../core/services/auth';
import { Menu, MEAL_TYPES } from './food-menu.interface';
import { TitlePage, Breadcrumb, TitleAction } from '../../shared/layouts/title-page/title-page';
import { ExportUtil } from '../../shared/utils/export.util';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PageTitleService } from '../../core/services/page-title.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-food-menu',
  standalone: true,
  imports: [CommonModule, FormsModule, TitlePage, TranslateModule],
  templateUrl: './food-menu.component.html',
  styleUrl: './food-menu.component.scss'
})
export class FoodMenuComponent implements OnInit, OnDestroy {
  menus: Menu[] = [];
  filteredMenus: Menu[] = [];
  displayedMenus: Menu[] = [];
  loading = false;
  viewMode: 'grid' | 'list' | 'calendar' = 'grid';
  filterType: 'all' | 'published' | 'draft' | 'templates' = 'all';
  selectedWeekStart: Date = this.getMonday(new Date());
  searchTerm = '';
  menusPerPage = 9;
  currentPage = 1;

  breadcrumbs: Breadcrumb[] = [];

  titleActions: TitleAction[] = [];

  mealTypes = MEAL_TYPES;
  private langChangeSub?: Subscription;

  constructor(
    private foodMenuService: FoodMenuService,
    private authService: AuthService,
    public router: Router,
    private translate: TranslateService,
    private pageTitleService: PageTitleService
  ) {}

  ngOnInit() {
    this.pageTitleService.setTitle(this.translate.instant('FOOD_MENU.TITLE'));
    this.setupBreadcrumbs();
    this.setupTitleActions();
    this.loadMenus();

    this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      this.pageTitleService.setTitle(this.translate.instant('FOOD_MENU.TITLE'));
      this.setupBreadcrumbs();
      this.setupTitleActions();
    });
  }

  ngOnDestroy(): void {
    this.langChangeSub?.unsubscribe();
  }

  private setupBreadcrumbs(): void {
    this.breadcrumbs = [
      { label: this.translate.instant('BREADCRUMBS.DASHBOARD'), url: '/dashboard' },
      { label: this.translate.instant('FOOD_MENU.TITLE') }
    ];
  }

  setupTitleActions() {
    this.titleActions = [
      {
        label: this.translate.instant('FOOD_MENU.EXPORT'),
        class: 'btn btn-light me-2',
        action: () => {},
        dropdown: {
          items: [
            { label: this.translate.instant('FOOD_MENU.EXPORT_PDF'), icon: 'bi bi-file-earmark-pdf', action: () => this.exportToPDF() },
            { label: this.translate.instant('FOOD_MENU.EXPORT_EXCEL'), icon: 'bi bi-file-earmark-excel', action: () => this.exportToExcel() }
          ]
        }
      }
    ];

    if (this.canEdit()) {
      this.titleActions.push(
        {
          label: this.translate.instant('FOOD_MENU.FOOD_DATABASE'),
          class: 'btn-view-global-2 me-2',
          action: () => this.router.navigate(['/food-menu/food-items'])
        },
        {
          label: this.translate.instant('FOOD_MENU.ADD_MENU'),
          class: 'btn-add-global-2',
          action: () => this.router.navigate(['/food-menu/add'])
        }
      );
    }
  }

  loadMenus() {
    this.loading = true;
    let publishedOnly: boolean | undefined;
    let templatesOnly: boolean | undefined;

    if (this.filterType === 'published') publishedOnly = true;
    if (this.filterType === 'templates') templatesOnly = true;

    this.foodMenuService.loadMenus(undefined, undefined, undefined, publishedOnly, templatesOnly).subscribe({
      next: (menus) => {
        this.menus = menus;
        this.applyFilter();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading menus:', error);
        this.loading = false;
      }
    });
  }

  applyFilter() {
    let filtered = [...this.menus];

    // Filter by type
    if (this.filterType === 'published') {
      filtered = filtered.filter(m => m.isPublished && !m.isTemplate);
    } else if (this.filterType === 'draft') {
      filtered = filtered.filter(m => !m.isPublished && !m.isTemplate);
    } else if (this.filterType === 'templates') {
      filtered = filtered.filter(m => m.isTemplate);
    }

    // Search
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(m =>
        m.name.toLowerCase().includes(term) ||
        m.description?.toLowerCase().includes(term)
      );
    }

    // Sort by date descending
    filtered.sort((a, b) => new Date(b.menuDate).getTime() - new Date(a.menuDate).getTime());

    this.filteredMenus = filtered;
    this.currentPage = 1;
    this.updateDisplayedMenus();
  }

  updateDisplayedMenus() {
    const endIndex = this.currentPage * this.menusPerPage;
    this.displayedMenus = this.filteredMenus.slice(0, endIndex);
  }

  loadMore() {
    this.currentPage++;
    this.updateDisplayedMenus();
  }

  hasMoreMenus(): boolean {
    return this.displayedMenus.length < this.filteredMenus.length;
  }

  setViewMode(mode: 'grid' | 'list' | 'calendar') {
    this.viewMode = mode;
    if (mode === 'calendar') {
      this.loadWeekMenus();
    }
  }

  setFilterType(type: 'all' | 'published' | 'draft' | 'templates') {
    this.filterType = type;
    this.loadMenus();
  }

  loadWeekMenus() {
    this.loading = true;
    this.foodMenuService.getWeekMenus(this.selectedWeekStart).subscribe({
      next: (menus) => {
        this.menus = menus;
        this.filteredMenus = menus;
        this.displayedMenus = menus;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading week menus:', error);
        this.loading = false;
      }
    });
  }

  previousWeek() {
    this.selectedWeekStart = new Date(this.selectedWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    this.loadWeekMenus();
  }

  nextWeek() {
    this.selectedWeekStart = new Date(this.selectedWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    this.loadWeekMenus();
  }

  getMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  getWeekDays(): Date[] {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(this.selectedWeekStart);
      day.setDate(day.getDate() + i);
      days.push(day);
    }
    return days;
  }

  getMenuForDay(date: Date): Menu | undefined {
    return this.menus.find(m => {
      const menuDate = new Date(m.menuDate);
      return menuDate.toDateString() === date.toDateString();
    });
  }

  viewMenu(menu: Menu) {
    this.router.navigate(['/food-menu/detail', menu.id]);
  }

  editMenu(menu: Menu) {
    this.router.navigate(['/food-menu/edit', menu.id]);
  }

  duplicateMenu(menu: Menu) {
    const newDate = prompt(this.translate.instant('FOOD_MENU.ENTER_NEW_DATE'));
    if (newDate) {
      this.foodMenuService.duplicateMenu({
        sourceMenuId: menu.id!,
        newMenuDate: newDate,
        newName: `${menu.name} (${this.translate.instant('FOOD_MENU.COPY')})`
      }).subscribe({
        next: (newMenu) => {
          this.loadMenus();
          this.router.navigate(['/food-menu/edit', newMenu.id]);
        },
        error: (error) => console.error('Error duplicating menu:', error)
      });
    }
  }

  togglePublish(menu: Menu) {
    const action = menu.isPublished
      ? this.foodMenuService.unpublishMenu(menu.id!)
      : this.foodMenuService.publishMenu(menu.id!);

    action.subscribe({
      next: () => this.loadMenus(),
      error: (error) => console.error('Error toggling publish status:', error)
    });
  }

  deleteMenu(menu: Menu) {
    if (confirm(this.translate.instant('FOOD_MENU.DELETE_CONFIRM', { name: menu.name }))) {
      this.foodMenuService.deleteMenu(menu.id!).subscribe({
        next: () => this.loadMenus(),
        error: (error) => console.error('Error deleting menu:', error)
      });
    }
  }

  viewReport(menu: Menu) {
    this.router.navigate(['/food-menu/report', menu.id]);
  }

  canEdit(): boolean {
    return this.authService.isAdmin() || this.authService.isTeacher();
  }

  canDelete(): boolean {
    return this.authService.isAdmin();
  }

  getComplianceBadges(menu: Menu): { label: string; class: string }[] {
    const badges: { label: string; class: string }[] = [];
    if (menu.meetsGrainRequirement) badges.push({ label: 'Grain', class: 'bg-warning text-dark' });
    if (menu.meetsProteinRequirement) badges.push({ label: 'Protein', class: 'bg-danger' });
    if (menu.meetsDairyRequirement) badges.push({ label: 'Dairy', class: 'bg-info' });
    if (menu.meetsFruitVegRequirement) badges.push({ label: 'Fruit/Veg', class: 'bg-success' });
    return badges;
  }

  getMealItemsCount(menu: Menu, mealType: string): number {
    return menu.menuItems?.filter(mi => mi.mealType === mealType).length || 0;
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  }

  exportToPDF(): void {
    const data = this.filteredMenus.map(menu => ({
      [this.translate.instant('FOOD_MENU.NAME')]: menu.name,
      [this.translate.instant('FOOD_MENU.DATE')]: this.formatDate(menu.menuDate),
      [this.translate.instant('FOOD_MENU.TYPE')]: menu.menuType,
      [this.translate.instant('FOOD_MENU.STATUS')]: menu.isPublished ? this.translate.instant('FOOD_MENU.PUBLISHED') : this.translate.instant('FOOD_MENU.DRAFT'),
      [this.translate.instant('FOOD_MENU.ITEMS')]: menu.menuItems?.length || 0,
      'Grain': menu.meetsGrainRequirement ? 'Yes' : 'No',
      'Protein': menu.meetsProteinRequirement ? 'Yes' : 'No',
      'Dairy': menu.meetsDairyRequirement ? 'Yes' : 'No',
      'Fruit/Veg': menu.meetsFruitVegRequirement ? 'Yes' : 'No'
    }));
    ExportUtil.exportToPDF(data, this.translate.instant('FOOD_MENU.REPORT_TITLE'));
  }

  exportToExcel(): void {
    const data = this.filteredMenus.map(menu => ({
      [this.translate.instant('FOOD_MENU.NAME')]: menu.name,
      [this.translate.instant('FOOD_MENU.DATE')]: this.formatDate(menu.menuDate),
      [this.translate.instant('FOOD_MENU.TYPE')]: menu.menuType,
      [this.translate.instant('FOOD_MENU.STATUS')]: menu.isPublished ? this.translate.instant('FOOD_MENU.PUBLISHED') : this.translate.instant('FOOD_MENU.DRAFT'),
      [this.translate.instant('FOOD_MENU.ITEMS')]: menu.menuItems?.length || 0,
      'Grain': menu.meetsGrainRequirement ? 'Yes' : 'No',
      'Protein': menu.meetsProteinRequirement ? 'Yes' : 'No',
      'Dairy': menu.meetsDairyRequirement ? 'Yes' : 'No',
      'Fruit/Veg': menu.meetsFruitVegRequirement ? 'Yes' : 'No'
    }));
    ExportUtil.exportToExcel(data, this.translate.instant('FOOD_MENU.REPORT_TITLE'));
  }
}
