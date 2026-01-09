import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FoodMenuService } from '../food-menu.service';
import { FoodItem, FOOD_CATEGORIES, COMMON_ALLERGENS, DIETARY_TAGS } from '../food-menu.interface';
import { TitlePage, Breadcrumb, TitleAction } from '../../../shared/layouts/title-page/title-page';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PageTitleService } from '../../../core/services/page-title.service';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-food-items',
  standalone: true,
  imports: [CommonModule, FormsModule, TitlePage, TranslateModule],
  templateUrl: './food-items.component.html',
  styleUrl: './food-items.component.scss'
})
export class FoodItemsComponent implements OnInit, OnDestroy {
  foodItems: FoodItem[] = [];
  filteredItems: FoodItem[] = [];
  loading = false;
  searchTerm = '';
  selectedCategory = '';
  showInactive = false;

  // Form state
  showForm = false;
  editingItem: FoodItem | null = null;
  formItem: Partial<FoodItem> = this.getEmptyItem();
  saving = false;

  categories = FOOD_CATEGORIES;
  allergens = COMMON_ALLERGENS;
  dietaryTags = DIETARY_TAGS;

  breadcrumbs: Breadcrumb[] = [];
  titleActions: TitleAction[] = [];
  private langChangeSub?: Subscription;

  constructor(
    private foodMenuService: FoodMenuService,
    private router: Router,
    private translate: TranslateService,
    private pageTitleService: PageTitleService
  ) {}

  ngOnInit() {
    this.pageTitleService.setTitle(this.translate.instant('FOOD_MENU.FOOD_DATABASE'));
    this.setupBreadcrumbs();
    this.setupTitleActions();
    this.loadFoodItems();

    this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      this.pageTitleService.setTitle(this.translate.instant('FOOD_MENU.FOOD_DATABASE'));
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
      { label: this.translate.instant('FOOD_MENU.FOOD_DATABASE') }
    ];
  }

  private setupTitleActions(): void {
    this.titleActions = [
      {
        label: this.translate.instant('COMMON.BACK'),
        class: 'btn-cancel-2 me-2',
        icon: 'bi bi-arrow-left',
        action: () => this.router.navigate(['/food-menu'])
      },
      {
        label: this.translate.instant('FOOD_MENU.ADD_FOOD_ITEM'),
        class: 'btn-add-global-2',
        action: () => this.openAddForm()
      }
    ];
  }

  loadFoodItems() {
    this.loading = true;
    this.foodMenuService.loadFoodItems(undefined, !this.showInactive).subscribe({
      next: (items) => {
        this.foodItems = items;
        this.applyFilter();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading food items:', error);
        this.loading = false;
      }
    });
  }

  applyFilter() {
    let filtered = [...this.foodItems];

    if (this.selectedCategory) {
      filtered = filtered.filter(f => f.category === this.selectedCategory);
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(f =>
        f.name.toLowerCase().includes(term) ||
        f.description?.toLowerCase().includes(term) ||
        f.allergens?.toLowerCase().includes(term)
      );
    }

    if (!this.showInactive) {
      filtered = filtered.filter(f => f.isActive);
    }

    this.filteredItems = filtered;
  }

  getEmptyItem(): Partial<FoodItem> {
    return {
      name: '',
      description: '',
      category: '',
      calories: undefined,
      protein: undefined,
      carbohydrates: undefined,
      fat: undefined,
      fiber: undefined,
      sugar: undefined,
      allergens: '',
      dietaryTags: '',
      isActive: true
    };
  }

  openAddForm() {
    this.editingItem = null;
    this.formItem = this.getEmptyItem();
    this.showForm = true;
  }

  openEditForm(item: FoodItem) {
    this.editingItem = item;
    this.formItem = { ...item };
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
    this.editingItem = null;
    this.formItem = this.getEmptyItem();
  }

  async saveItem() {
    if (!this.formItem.name || !this.formItem.category) {
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
      if (this.editingItem) {
        await this.foodMenuService.updateFoodItem(this.editingItem.id!, this.formItem).toPromise();
      } else {
        await this.foodMenuService.createFoodItem(this.formItem).toPromise();
      }
      this.closeForm();
      this.loadFoodItems();
    } catch (error) {
      console.error('Error saving food item:', error);
      Swal.fire({
        icon: 'error',
        title: this.translate.instant('COMMON.ERROR'),
        text: 'Error saving food item. Please try again.',
        confirmButtonColor: '#7dd3c0'
      });
    } finally {
      this.saving = false;
    }
  }

  async deleteItem(item: FoodItem) {
    const result = await Swal.fire({
      icon: 'warning',
      title: this.translate.instant('COMMON.CONFIRM'),
      text: `Are you sure you want to delete "${item.name}"?`,
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: this.translate.instant('COMMON.DELETE'),
      cancelButtonText: this.translate.instant('COMMON.CANCEL')
    });

    if (result.isConfirmed) {
      try {
        await this.foodMenuService.deleteFoodItem(item.id!).toPromise();
        this.loadFoodItems();
      } catch (error) {
        console.error('Error deleting food item:', error);
        Swal.fire({
          icon: 'error',
          title: this.translate.instant('COMMON.ERROR'),
          text: 'Error deleting food item.',
          confirmButtonColor: '#7dd3c0'
        });
      }
    }
  }

  async toggleStatus(item: FoodItem) {
    try {
      await this.foodMenuService.toggleFoodItemStatus(item.id!).toPromise();
      this.loadFoodItems();
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  }

  toggleAllergen(allergen: string) {
    const current = this.formItem.allergens ? this.formItem.allergens.split(',').map(a => a.trim()) : [];
    const index = current.indexOf(allergen);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(allergen);
    }
    this.formItem.allergens = current.filter(a => a).join(', ');
  }

  hasAllergen(allergen: string): boolean {
    if (!this.formItem.allergens) return false;
    return this.formItem.allergens.split(',').map(a => a.trim()).includes(allergen);
  }

  toggleDietaryTag(tag: string) {
    const current = this.formItem.dietaryTags ? this.formItem.dietaryTags.split(',').map(t => t.trim()) : [];
    const index = current.indexOf(tag);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(tag);
    }
    this.formItem.dietaryTags = current.filter(t => t).join(', ');
  }

  hasDietaryTag(tag: string): boolean {
    if (!this.formItem.dietaryTags) return false;
    return this.formItem.dietaryTags.split(',').map(t => t.trim()).includes(tag);
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

  getCategoryColor(category: string): string {
    const colors: { [key: string]: string } = {
      'Grain': '#ffc107',
      'Protein': '#dc3545',
      'Dairy': '#17a2b8',
      'Fruit': '#28a745',
      'Vegetable': '#20c997',
      'Beverage': '#6610f2',
      'Other': '#6c757d'
    };
    return colors[category] || '#6c757d';
  }
}
