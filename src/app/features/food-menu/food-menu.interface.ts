export interface FoodItem {
  id?: number;
  name: string;
  description?: string;
  category: string;
  calories?: number;
  protein?: number;
  carbohydrates?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  allergens?: string;
  dietaryTags?: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Menu {
  id?: number;
  name: string;
  description?: string;
  menuDate: string;
  menuType: string;
  isPublished: boolean;
  isTemplate: boolean;
  notes?: string;
  meetsGrainRequirement: boolean;
  meetsProteinRequirement: boolean;
  meetsDairyRequirement: boolean;
  meetsFruitVegRequirement: boolean;
  createdById?: number;
  createdByName?: string;
  createdAt?: string;
  updatedAt?: string;
  menuItems?: MenuItemWithFood[];
  nutritionSummary?: NutritionSummary;
}

export interface MenuItem {
  id?: number;
  menuId: number;
  foodItemId: number;
  mealType: string;
  servingSize?: string;
  displayOrder: number;
  notes?: string;
  createdAt?: string;
  foodItem?: FoodItem;
}

export interface MenuItemWithFood {
  id: number;
  mealType: string;
  servingSize?: string;
  displayOrder: number;
  notes?: string;
  foodItem: FoodItem;
}

export interface MenuSelection {
  id?: number;
  childId: number;
  menuId: number;
  menuItemId: number;
  parentId: number;
  isSelected: boolean;
  notes?: string;
  selectionStatus: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface NutritionSummary {
  totalCalories: number;
  totalProtein: number;
  totalCarbohydrates: number;
  totalFat: number;
  totalFiber: number;
  totalSugar: number;
}

export interface ChildMenuView {
  childId: number;
  childName: string;
  allergies?: string;
  menu: Menu;
  selections: MenuSelectionDto[];
  allergyWarnings: string[];
}

export interface MenuSelectionDto {
  id: number;
  menuItemId: number;
  isSelected: boolean;
  notes?: string;
  selectionStatus: string;
  createdAt: string;
}

export interface CreateMenuDto {
  name: string;
  description?: string;
  menuDate: string;
  menuType: string;
  isTemplate: boolean;
  notes?: string;
}

export interface UpdateMenuDto extends CreateMenuDto {
  isPublished: boolean;
  meetsGrainRequirement: boolean;
  meetsProteinRequirement: boolean;
  meetsDairyRequirement: boolean;
  meetsFruitVegRequirement: boolean;
}

export interface CreateMenuItemDto {
  menuId: number;
  foodItemId: number;
  mealType: string;
  servingSize?: string;
  displayOrder: number;
  notes?: string;
}

export interface BulkMenuSelectionDto {
  childId: number;
  menuId: number;
  selections: { menuItemId: number; isSelected: boolean; notes?: string }[];
}

export interface DuplicateMenuDto {
  sourceMenuId: number;
  newMenuDate: string;
  newName?: string;
}

export const MEAL_TYPES = ['Breakfast', 'AM Snack', 'Lunch', 'PM Snack', 'Dinner'];

export const FOOD_CATEGORIES = ['Grain', 'Protein', 'Dairy', 'Fruit', 'Vegetable', 'Beverage', 'Other'];

export const COMMON_ALLERGENS = ['Milk', 'Eggs', 'Peanuts', 'Tree Nuts', 'Wheat', 'Soy', 'Fish', 'Shellfish', 'Sesame'];

export const DIETARY_TAGS = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free', 'Organic'];
