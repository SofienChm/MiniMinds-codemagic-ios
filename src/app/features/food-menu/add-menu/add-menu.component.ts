import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { FoodMenuService } from '../food-menu.service';
import { FoodItem, Menu, CreateMenuItemDto, MEAL_TYPES, FOOD_CATEGORIES } from '../food-menu.interface';
import { TitlePage, Breadcrumb } from '../../../shared/layouts/title-page/title-page';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PageTitleService } from '../../../core/services/page-title.service';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-add-menu',
  standalone: true,
  imports: [CommonModule, FormsModule, TitlePage, TranslateModule],
  templateUrl: './add-menu.component.html',
  styleUrl: './add-menu.component.scss'
})
export class AddMenuComponent implements OnInit, OnDestroy {
  menu: Partial<Menu> = {
    name: '',
    description: '',
    menuDate: new Date().toISOString().split('T')[0],
    menuType: 'Daily',
    isTemplate: false,
    notes: ''
  };

  menuItems: { mealType: string; foodItemId: number; servingSize?: string; notes?: string; foodItem?: FoodItem }[] = [];
  foodItems: FoodItem[] = [];
  filteredFoodItems: FoodItem[] = [];
  loading = false;
  saving = false;
  showFoodPicker = false;
  selectedMealType = '';
  foodSearchTerm = '';
  selectedCategory = '';

  mealTypes = MEAL_TYPES;
  categories = FOOD_CATEGORIES;

  breadcrumbs: Breadcrumb[] = [];
  private langChangeSub?: Subscription;

  constructor(
    private foodMenuService: FoodMenuService,
    private router: Router,
    private route: ActivatedRoute,
    private translate: TranslateService,
    private pageTitleService: PageTitleService
  ) {}

  ngOnInit() {
    this.pageTitleService.setTitle(this.translate.instant('FOOD_MENU.ADD_MENU'));
    this.setupBreadcrumbs();

    // Check for date query param
    this.route.queryParams.subscribe(params => {
      if (params['date']) {
        this.menu.menuDate = params['date'];
      }
    });

    this.loadFoodItems();

    this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      this.pageTitleService.setTitle(this.translate.instant('FOOD_MENU.ADD_MENU'));
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
      { label: this.translate.instant('FOOD_MENU.ADD_MENU') }
    ];
  }

  loadFoodItems() {
    this.loading = true;
    this.foodMenuService.loadFoodItems().subscribe({
      next: (items) => {
        this.foodItems = items;
        this.filteredFoodItems = items;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading food items:', error);
        this.loading = false;
      }
    });
  }

  openFoodPicker(mealType: string) {
    this.selectedMealType = mealType;
    this.showFoodPicker = true;
    this.filterFoodItems();
  }

  closeFoodPicker() {
    this.showFoodPicker = false;
    this.selectedMealType = '';
    this.foodSearchTerm = '';
    this.selectedCategory = '';
  }

  filterFoodItems() {
    let filtered = [...this.foodItems];

    if (this.selectedCategory) {
      filtered = filtered.filter(f => f.category === this.selectedCategory);
    }

    if (this.foodSearchTerm.trim()) {
      const term = this.foodSearchTerm.toLowerCase();
      filtered = filtered.filter(f =>
        f.name.toLowerCase().includes(term) ||
        f.description?.toLowerCase().includes(term)
      );
    }

    this.filteredFoodItems = filtered;
  }

  addFoodToMeal(foodItem: FoodItem) {
    this.menuItems.push({
      mealType: this.selectedMealType,
      foodItemId: foodItem.id!,
      foodItem: foodItem
    });
    this.closeFoodPicker();
  }

  removeMenuItem(index: number) {
    this.menuItems.splice(index, 1);
  }

  getItemsForMealType(mealType: string): typeof this.menuItems {
    return this.menuItems.filter(mi => mi.mealType === mealType);
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

  getCategoryIcon(category: string): string {
    const icons: { [key: string]: string } = {
      'Grain': 'bi-basket2',
      'Protein': 'bi-egg',
      'Dairy': 'bi-droplet',
      'Fruit': 'bi-apple',
      'Vegetable': 'bi-flower1',
      'Beverage': 'bi-cup-straw',
      'Other': 'bi-three-dots'
    };
    return icons[category] || 'bi-egg-fried';
  }

  async saveMenu() {
    if (!this.menu.name || !this.menu.menuDate) {
      Swal.fire({
        icon: 'warning',
        title: this.translate.instant('COMMON.WARNING'),
        text: 'Please fill in the required fields',
        confirmButtonColor: '#7dd3c0'
      });
      return;
    }

    this.saving = true;

    try {
      // First create the menu
      const createdMenu = await this.foodMenuService.createMenu({
        name: this.menu.name!,
        description: this.menu.description,
        menuDate: this.menu.menuDate!,
        menuType: this.menu.menuType!,
        isTemplate: this.menu.isTemplate!,
        notes: this.menu.notes
      }).toPromise();

      // Then add menu items
      for (let i = 0; i < this.menuItems.length; i++) {
        const item = this.menuItems[i];
        await this.foodMenuService.addMenuItem(createdMenu!.id!, {
          menuId: createdMenu!.id!,
          foodItemId: item.foodItemId,
          mealType: item.mealType,
          servingSize: item.servingSize,
          displayOrder: i,
          notes: item.notes
        }).toPromise();
      }

      this.router.navigate(['/food-menu']);
    } catch (error) {
      console.error('Error saving menu:', error);
      Swal.fire({
        icon: 'error',
        title: this.translate.instant('COMMON.ERROR'),
        text: 'Error saving menu. Please try again.',
        confirmButtonColor: '#7dd3c0'
      });
    } finally {
      this.saving = false;
    }
  }

  cancel() {
    this.router.navigate(['/food-menu']);
  }
}
