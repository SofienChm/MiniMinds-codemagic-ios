import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiConfig } from '../../core/config/api.config';
import {
  FoodItem,
  Menu,
  MenuItem,
  MenuSelection,
  ChildMenuView,
  CreateMenuDto,
  UpdateMenuDto,
  CreateMenuItemDto,
  BulkMenuSelectionDto,
  DuplicateMenuDto,
  NutritionSummary
} from './food-menu.interface';

@Injectable({
  providedIn: 'root'
})
export class FoodMenuService {
  private foodItemsUrl = ApiConfig.ENDPOINTS.FOOD_ITEMS;
  private menusUrl = ApiConfig.ENDPOINTS.MENUS;
  private selectionsUrl = ApiConfig.ENDPOINTS.MENU_SELECTIONS;

  private menusSubject = new BehaviorSubject<Menu[]>([]);
  public menus$ = this.menusSubject.asObservable();

  private foodItemsSubject = new BehaviorSubject<FoodItem[]>([]);
  public foodItems$ = this.foodItemsSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Food Items
  loadFoodItems(category?: string, activeOnly: boolean = true, search?: string): Observable<FoodItem[]> {
    let params = new HttpParams();
    if (category) params = params.set('category', category);
    if (activeOnly !== undefined) params = params.set('activeOnly', activeOnly.toString());
    if (search) params = params.set('search', search);

    return this.http.get<FoodItem[]>(this.foodItemsUrl, { params });
  }

  getFoodItem(id: number): Observable<FoodItem> {
    return this.http.get<FoodItem>(`${this.foodItemsUrl}/${id}`);
  }

  getCategories(): Observable<string[]> {
    return this.http.get<string[]>(`${this.foodItemsUrl}/Categories`);
  }

  getAllergens(): Observable<string[]> {
    return this.http.get<string[]>(`${this.foodItemsUrl}/Allergens`);
  }

  createFoodItem(foodItem: Partial<FoodItem>): Observable<FoodItem> {
    return this.http.post<FoodItem>(this.foodItemsUrl, foodItem);
  }

  updateFoodItem(id: number, foodItem: Partial<FoodItem>): Observable<void> {
    return this.http.put<void>(`${this.foodItemsUrl}/${id}`, foodItem);
  }

  deleteFoodItem(id: number): Observable<void> {
    return this.http.delete<void>(`${this.foodItemsUrl}/${id}`);
  }

  toggleFoodItemStatus(id: number): Observable<{ isActive: boolean }> {
    return this.http.put<{ isActive: boolean }>(`${this.foodItemsUrl}/${id}/toggle-status`, {});
  }

  // Menus
  loadMenus(
    startDate?: Date,
    endDate?: Date,
    menuType?: string,
    publishedOnly?: boolean,
    templatesOnly?: boolean
  ): Observable<Menu[]> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate.toISOString());
    if (endDate) params = params.set('endDate', endDate.toISOString());
    if (menuType) params = params.set('menuType', menuType);
    if (publishedOnly !== undefined) params = params.set('publishedOnly', publishedOnly.toString());
    if (templatesOnly !== undefined) params = params.set('templatesOnly', templatesOnly.toString());

    return this.http.get<Menu[]>(this.menusUrl, { params });
  }

  getMenu(id: number): Observable<Menu> {
    return this.http.get<Menu>(`${this.menusUrl}/${id}`);
  }

  getMenuByDate(date: Date): Observable<Menu> {
    const params = new HttpParams().set('date', date.toISOString());
    return this.http.get<Menu>(`${this.menusUrl}/ByDate`, { params });
  }

  getWeekMenus(startDate: Date): Observable<Menu[]> {
    // Format as YYYY-MM-DD to avoid timezone issues
    const dateStr = startDate.toISOString().split('T')[0];
    const params = new HttpParams().set('startDate', dateStr);
    return this.http.get<Menu[]>(`${this.menusUrl}/Week`, { params });
  }

  createMenu(menu: CreateMenuDto): Observable<Menu> {
    return this.http.post<Menu>(this.menusUrl, menu);
  }

  updateMenu(id: number, menu: UpdateMenuDto): Observable<void> {
    return this.http.put<void>(`${this.menusUrl}/${id}`, menu);
  }

  publishMenu(id: number): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.menusUrl}/${id}/publish`, {});
  }

  unpublishMenu(id: number): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.menusUrl}/${id}/unpublish`, {});
  }

  duplicateMenu(dto: DuplicateMenuDto): Observable<Menu> {
    return this.http.post<Menu>(`${this.menusUrl}/duplicate`, dto);
  }

  deleteMenu(id: number): Observable<void> {
    return this.http.delete<void>(`${this.menusUrl}/${id}`);
  }

  // Menu Items
  addMenuItem(menuId: number, dto: CreateMenuItemDto): Observable<MenuItem> {
    return this.http.post<MenuItem>(`${this.menusUrl}/${menuId}/items`, dto);
  }

  updateMenuItem(menuId: number, itemId: number, dto: Partial<CreateMenuItemDto>): Observable<void> {
    return this.http.put<void>(`${this.menusUrl}/${menuId}/items/${itemId}`, dto);
  }

  deleteMenuItem(menuId: number, itemId: number): Observable<void> {
    return this.http.delete<void>(`${this.menusUrl}/${menuId}/items/${itemId}`);
  }

  reorderMenuItems(menuId: number, items: { menuItemId: number; displayOrder: number }[]): Observable<void> {
    return this.http.put<void>(`${this.menusUrl}/${menuId}/items/reorder`, { items });
  }

  getMenuNutrition(menuId: number): Observable<NutritionSummary> {
    return this.http.get<NutritionSummary>(`${this.menusUrl}/${menuId}/nutrition`);
  }

  // Menu Selections
  getChildMenuSelections(childId: number, menuId: number): Observable<ChildMenuView> {
    return this.http.get<ChildMenuView>(`${this.selectionsUrl}/child/${childId}/menu/${menuId}`);
  }

  getMenuSelections(menuId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.selectionsUrl}/menu/${menuId}`);
  }

  createSelection(selection: Partial<MenuSelection>): Observable<MenuSelection> {
    return this.http.post<MenuSelection>(this.selectionsUrl, selection);
  }

  createBulkSelections(dto: BulkMenuSelectionDto): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.selectionsUrl}/bulk`, dto);
  }

  updateSelection(id: number, dto: Partial<MenuSelection>): Observable<void> {
    return this.http.put<void>(`${this.selectionsUrl}/${id}`, dto);
  }

  updateSelectionStatus(id: number, status: string): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.selectionsUrl}/${id}/status`, JSON.stringify(status), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  deleteSelection(id: number): Observable<void> {
    return this.http.delete<void>(`${this.selectionsUrl}/${id}`);
  }

  getMenuReport(menuId: number): Observable<any> {
    return this.http.get<any>(`${this.selectionsUrl}/report/menu/${menuId}`);
  }

  // Helper methods
  refreshMenus(): void {
    this.loadMenus().subscribe(menus => {
      this.menusSubject.next(menus);
    });
  }

  refreshFoodItems(): void {
    this.loadFoodItems().subscribe(items => {
      this.foodItemsSubject.next(items);
    });
  }
}
