import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FoodMenuService } from '../food-menu.service';
import { Menu, MenuItemWithFood, MEAL_TYPES } from '../food-menu.interface';
import { TitlePage, Breadcrumb, TitleAction } from '../../../shared/layouts/title-page/title-page';
import { AuthService } from '../../../core/services/auth';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PageTitleService } from '../../../core/services/page-title.service';
import { Subscription } from 'rxjs';

interface ChildSelection {
  childId: number;
  childName: string;
  allergies?: string;
  parentName: string;
  selections: {
    menuItemId: number;
    foodItemName: string;
    mealType: string;
    isSelected: boolean;
    notes?: string;
    selectionStatus: string;
  }[];
  totalSelected: number;
  totalDeclined: number;
  hasSubmitted: boolean;
}

@Component({
  selector: 'app-menu-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, TitlePage, TranslateModule],
  templateUrl: './menu-detail.component.html',
  styleUrl: './menu-detail.component.scss'
})
export class MenuDetailComponent implements OnInit, OnDestroy {
  menuId: number | null = null;
  menu: Menu | null = null;
  childSelections: ChildSelection[] = [];
  loading = false;
  expandedChildId: number | null = null;
  selectedMealTypeFilter = '';

  mealTypes = MEAL_TYPES;
  titleActions: TitleAction[] = [];

  breadcrumbs: Breadcrumb[] = [];
  private langChangeSub?: Subscription;

  constructor(
    private foodMenuService: FoodMenuService,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private translate: TranslateService,
    private pageTitleService: PageTitleService
  ) {}

  ngOnInit() {
    this.pageTitleService.setTitle(this.translate.instant('FOOD_MENU.MENU_DETAILS'));
    this.setupBreadcrumbs();
    this.setupTitleActions();
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.menuId = +params['id'];
        this.loadMenuDetails();
      }
    });

    this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      this.pageTitleService.setTitle(this.translate.instant('FOOD_MENU.MENU_DETAILS'));
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
      { label: this.translate.instant('FOOD_MENU.TITLE'), url: '/food-menu' },
      { label: this.menu?.name || this.translate.instant('FOOD_MENU.MENU_DETAILS') }
    ];
  }

  setupTitleActions() {
    this.titleActions = [
      {
        label: this.translate.instant('FOOD_MENU.BACK_TO_MENU_LIST'),
        class: 'btn-outline-secondary btn-cancel-global',
        icon: 'bi bi-arrow-left',
        action: () => this.router.navigate(['/food-menu'])
      }
    ];

    if (this.authService.isAdmin() || this.authService.isTeacher()) {
      this.titleActions.push({
        label: this.translate.instant('FOOD_MENU.EDIT_MENU'),
        class: 'btn-edit-global-2',
        icon: 'bi bi-pencil-square',
        action: () => this.router.navigate(['/food-menu/edit', this.menuId])
      });
    }
  }
  loadMenuDetails() {
    if (!this.menuId) return;

    this.loading = true;

    // Load menu details
    this.foodMenuService.getMenu(this.menuId).subscribe({
      next: (menu) => {
        this.menu = menu;
        this.setupBreadcrumbs();
      },
      error: (error) => console.error('Error loading menu:', error)
    });

    // Load selections report
    this.foodMenuService.getMenuSelections(this.menuId).subscribe({
      next: (selections) => {
        this.processSelections(selections);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading selections:', error);
        this.loading = false;
      }
    });
  }

  processSelections(selections: any[]) {
    // Group selections by child
    const childMap = new Map<number, ChildSelection>();

    selections.forEach(sel => {
      if (!childMap.has(sel.childId)) {
        childMap.set(sel.childId, {
          childId: sel.childId,
          childName: sel.childName,
          allergies: sel.childAllergies,
          parentName: sel.parentName,
          selections: [],
          totalSelected: 0,
          totalDeclined: 0,
          hasSubmitted: true
        });
      }

      const child = childMap.get(sel.childId)!;
      child.selections.push({
        menuItemId: sel.menuItemId,
        foodItemName: sel.foodItemName,
        mealType: sel.mealType,
        isSelected: sel.isSelected,
        notes: sel.notes,
        selectionStatus: sel.selectionStatus
      });

      if (sel.isSelected) {
        child.totalSelected++;
      } else {
        child.totalDeclined++;
      }
    });

    this.childSelections = Array.from(childMap.values())
      .sort((a, b) => a.childName.localeCompare(b.childName));
  }

  toggleChildExpand(childId: number) {
    this.expandedChildId = this.expandedChildId === childId ? null : childId;
  }

  isChildExpanded(childId: number): boolean {
    return this.expandedChildId === childId;
  }

  getChildSelectionsByMealType(child: ChildSelection, mealType: string) {
    return child.selections.filter(s => s.mealType === mealType);
  }

  getMenuItemsByMealType(mealType: string): MenuItemWithFood[] {
    if (!this.menu?.menuItems) return [];
    return this.menu.menuItems.filter(mi => mi.mealType === mealType);
  }

  getMealTypeIcon(mealType: string): string {
    const icons: { [key: string]: string } = {
      'Breakfast': 'bi-sunrise',
      'AM Snack': 'bi-cup-hot',
      'Lunch': 'bi-sun',
      'PM Snack': 'bi-cookie',
      'Dinner': 'bi-moon-stars'
    };
    return icons[mealType] || 'bi-egg-fried';
  }

  getTotalChildren(): number {
    return this.childSelections.length;
  }

  getChildrenWithDeclines(): ChildSelection[] {
    return this.childSelections.filter(c => c.totalDeclined > 0);
  }

  getChildrenWithAllergies(): ChildSelection[] {
    return this.childSelections.filter(c => c.allergies);
  }

  goBack() {
    this.router.navigate(['/food-menu']);
  }

  editMenu() {
    if (this.menuId) {
      this.router.navigate(['/food-menu/edit', this.menuId]);
    }
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
