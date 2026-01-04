import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FoodMenuService } from '../food-menu.service';
import { AuthService } from '../../../core/services/auth';
import { ChildrenService } from '../../children/children.service';
import { Menu, ChildMenuView, MenuItemWithFood, MEAL_TYPES } from '../food-menu.interface';
import { ParentChildHeaderSimpleComponent } from '../../../shared/components/parent-child-header-simple/parent-child-header-simple.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PageTitleService } from '../../../core/services/page-title.service';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-parent-menu-view',
  standalone: true,
  imports: [CommonModule, FormsModule, ParentChildHeaderSimpleComponent, TranslateModule],
  templateUrl: './parent-menu-view.component.html',
  styleUrl: './parent-menu-view.component.scss'
})
export class ParentMenuViewComponent implements OnInit, OnDestroy {
  children: any[] = [];
  selectedChildId: number | null = null;
  selectedDate: Date = new Date();
  weekMenus: Menu[] = [];
  selectedMenu: Menu | null = null;
  childMenuView: ChildMenuView | null = null;
  loading = false;
  savingSelections = false;

  // Selection state
  selections: { [menuItemId: number]: { isSelected: boolean; notes: string } } = {};

  mealTypes = MEAL_TYPES;
  private langChangeSub?: Subscription;

  constructor(
    private foodMenuService: FoodMenuService,
    private childrenService: ChildrenService,
    private authService: AuthService,
    private translate: TranslateService,
    private pageTitleService: PageTitleService
  ) {}

  ngOnInit() {
    this.pageTitleService.setTitle(this.translate.instant('FOOD_MENU.PARENT_MENU_VIEW'));
    this.loadChildren();

    this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      this.pageTitleService.setTitle(this.translate.instant('FOOD_MENU.PARENT_MENU_VIEW'));
    });
  }

  ngOnDestroy(): void {
    this.langChangeSub?.unsubscribe();
  }

  loadChildren() {
    this.childrenService.loadChildren().subscribe({
      next: (children) => {
        this.children = children;
        if (children.length > 0 && children[0].id) {
          this.selectedChildId = children[0].id;
          this.loadWeekMenus();
        }
      },
      error: (error) => console.error('Error loading children:', error)
    });
  }

  onChildChange() {
    if (this.selectedMenu && this.selectedChildId) {
      this.loadChildMenuView();
    }
  }

  loadWeekMenus() {
    const monday = this.getMonday(this.selectedDate);
    this.loading = true;

    this.foodMenuService.getWeekMenus(monday).subscribe({
      next: (menus) => {
        this.weekMenus = menus;
        this.loading = false;

        // Auto-select today's menu if available
        const today = new Date();
        const todayMenu = menus.find(m =>
          new Date(m.menuDate).toDateString() === today.toDateString()
        );
        if (todayMenu) {
          this.selectMenu(todayMenu);
        } else if (menus.length > 0) {
          this.selectMenu(menus[0]);
        } else {
          this.selectedMenu = null;
        }
      },
      error: (error) => {
        console.error('Error loading menus:', error);
        this.loading = false;
      }
    });
  }

  onDayClick(day: Date) {
    const menu = this.getMenuForDay(day);
    if (menu) {
      this.selectMenu(menu);
    }
  }

  selectMenu(menu: Menu) {
    this.selectedMenu = menu;
    this.loadChildMenuView();
  }

  loadChildMenuView() {
    if (!this.selectedChildId || !this.selectedMenu) return;

    this.loading = true;
    this.foodMenuService.getChildMenuSelections(this.selectedChildId, this.selectedMenu.id!).subscribe({
      next: (view) => {
        this.childMenuView = view;
        // Update selectedMenu with the full menu data including items
        this.selectedMenu = view.menu;
        // Initialize selections from existing data
        this.selections = {};
        view.menu.menuItems?.forEach(item => {
          const existing = view.selections.find(s => s.menuItemId === item.id);
          this.selections[item.id] = {
            isSelected: existing ? existing.isSelected : true,
            notes: existing?.notes || ''
          };
        });
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading child menu view:', error);
        this.loading = false;
      }
    });
  }

  toggleSelection(menuItemId: number) {
    if (this.selections[menuItemId]) {
      this.selections[menuItemId].isSelected = !this.selections[menuItemId].isSelected;
    }
  }

  async saveSelections() {
    if (!this.selectedChildId || !this.selectedMenu) return;

    this.savingSelections = true;

    const selectionsArray = Object.entries(this.selections).map(([menuItemId, sel]) => ({
      menuItemId: parseInt(menuItemId),
      isSelected: sel.isSelected,
      notes: sel.notes || undefined
    }));

    try {
      await this.foodMenuService.createBulkSelections({
        childId: this.selectedChildId,
        menuId: this.selectedMenu.id!,
        selections: selectionsArray
      }).toPromise();

      Swal.fire({
        icon: 'success',
        title: this.translate.instant('COMMON.SUCCESS'),
        text: 'Meal preferences saved successfully!',
        timer: 2000,
        showConfirmButton: false
      });
      this.loadChildMenuView();
    } catch (error) {
      console.error('Error saving selections:', error);
      Swal.fire({
        icon: 'error',
        title: this.translate.instant('COMMON.ERROR'),
        text: 'Error saving preferences. Please try again.',
        confirmButtonColor: '#7dd3c0'
      });
    } finally {
      this.savingSelections = false;
    }
  }

  getMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  getWeekDays(): Date[] {
    const monday = this.getMonday(this.selectedDate);
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(day.getDate() + i);
      days.push(day);
    }
    return days;
  }

  getMenuForDay(date: Date): Menu | undefined {
    return this.weekMenus.find(m =>
      new Date(m.menuDate).toDateString() === date.toDateString()
    );
  }

  previousWeek() {
    this.selectedDate = new Date(this.selectedDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    this.loadWeekMenus();
  }

  nextWeek() {
    this.selectedDate = new Date(this.selectedDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    this.loadWeekMenus();
  }

  getItemsForMealType(mealType: string): MenuItemWithFood[] {
    if (!this.selectedMenu?.menuItems) return [];
    return this.selectedMenu.menuItems.filter(mi => mi.mealType === mealType);
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

  hasAllergyWarning(item: MenuItemWithFood): boolean {
    return this.childMenuView?.allergyWarnings?.some(w =>
      w.includes(item.foodItem.name)
    ) || false;
  }

  getSelectedChild(): any {
    return this.children.find(c => c.id === this.selectedChildId);
  }

  isToday(date: Date): boolean {
    return date.toDateString() === new Date().toDateString();
  }

  isMenuSelected(menu: Menu): boolean {
    return this.selectedMenu?.id === menu.id;
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }
}
