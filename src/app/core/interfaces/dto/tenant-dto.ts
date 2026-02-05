export interface Tenant {
  id: number;
  name: string;
  subdomain?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  timezone?: string;
  currency?: string;
  language?: string;
  subscriptionPlan: string;
  subscriptionExpiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
  userCount: number;
  childCount: number;
}

export interface CreateTenantRequest {
  name: string;
  subdomain?: string;
  address?: string;
  phone?: string;
  email?: string;
  timezone?: string;
  currency?: string;
  language?: string;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminPassword: string;
}

export interface UpdateTenantRequest {
  name: string;
  subdomain?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  timezone?: string;
  currency?: string;
  language?: string;
  subscriptionPlan?: string;
  isActive?: boolean;
}

export interface TenantStats {
  totalTenants: number;
  activeTenants: number;
  inactiveTenants: number;
  totalParents: number;
  totalTeachers: number;
  totalChildren: number;
  subscriptionBreakdown: { plan: string; count: number }[];
}

// Tenant Feature interfaces
export interface TenantFeature {
  id: number;
  featureCode: string;
  featureName: string;
  description: string;
  category: string;
  isEnabled: boolean;
  isCore: boolean;
}

export interface TenantFeaturesResponse {
  tenantId: number;
  tenantName: string;
  features: TenantFeature[];
}

export interface FeatureToggle {
  featureCode: string;
  isEnabled: boolean;
}

export interface UpdateTenantFeaturesRequest {
  features: FeatureToggle[];
}

export interface AvailableFeature {
  code: string;
  name: string;
  description: string;
  category: string;
  isCore: boolean;
}

// Feature codes enum for type safety
export const FeatureCodes = {
  // Core Features
  DASHBOARD: 'dashboard',
  MESSAGES: 'messages',
  CALENDAR: 'calendar',
  CHILDREN: 'children',
  PARENTS: 'parents',
  TEACHERS: 'teachers',
  CLASSES: 'classes',
  ATTENDANCE: 'attendance',

  // Optional Features
  DAILY_ACTIVITIES: 'daily_activities',
  GALLERY: 'gallery',
  EVENTS: 'events',
  HOLIDAYS: 'holidays',
  LEAVES: 'leaves',
  FEES: 'fees',
  STATIC_FEES: 'static_fees',
  FOOD_MENU: 'food_menu',
  QR_CHECKIN: 'qr_checkin',
  RECLAMATIONS: 'reclamations',
  LEARNING_GAMES: 'learning_games',
  AI_ASSISTANT: 'ai_assistant',
  BASIC_AI: 'basic_ai',
  APPOINTMENTS: 'appointments'
} as const;

export type FeatureCode = typeof FeatureCodes[keyof typeof FeatureCodes];
