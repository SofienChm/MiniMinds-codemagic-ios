import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { AuthService } from '../../../core/services/auth';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PrefixPipe } from '../../../core/services/prefix/prefix.pipe';
import { Subscription } from 'rxjs';
import { TenantFeatureService } from '../../../core/services/tenant-feature.service';
import { FeatureCodes } from '../../../core/interfaces/dto/tenant-dto';
import { TranslateModule } from '@ngx-translate/core';

// Menu item interface with optional feature code
interface MenuItem {
  path: string;
  icon: string;
  label: string;
  featureCode?: string;
  usePrefix?: boolean;
}

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterModule, PrefixPipe, TranslateModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss'
})
export class Sidebar implements OnInit, OnDestroy {
  @Output() linkClicked = new EventEmitter<void>();
  menuItemsMain: MenuItem[] = [];
  menuItemsPrincipal: MenuItem[] = [];
  menuItemsChild: MenuItem[] = [];
  menuItemsPeople: MenuItem[] = [];
  menuItemsIa: MenuItem[] = [];
  menuItemsSetting: MenuItem[] = [];
  menuItemsSuperAdmin: MenuItem[] = [];
  userRole: string | null = null;
  private subscriptions: Subscription[] = [];
  private enabledFeatures: string[] = [];
  private featuresLoaded = false;

  constructor(
    private authService: AuthService,
    private featureService: TenantFeatureService
  ) {}

  ngOnInit(): void {
    this.userRole = this.authService.getUserRole();

    // SuperAdmin doesn't need feature filtering
    if (this.authService.isSuperAdmin()) {
      this.setupMenuItems();
      return;
    }

    // Load enabled features then setup menu
    const featureSub = this.featureService.loadFeaturesIfNeeded().subscribe({
      next: (features) => {
        this.enabledFeatures = features;
        this.featuresLoaded = true;
        this.setupMenuItems();
      },
      error: () => {
        // On error, show no features (fail closed for security)
        // This forces the user to reload or re-login
        this.enabledFeatures = [];
        this.featuresLoaded = true;
        this.setupMenuItems();
      }
    });
    this.subscriptions.push(featureSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Check if a feature is enabled for the current tenant
   */
  private isFeatureEnabled(featureCode?: string): boolean {
    // If no feature code specified, always show (core items without feature code)
    if (!featureCode) return true;
    // If features not loaded yet, hide optional features (fail closed for security)
    if (!this.featuresLoaded) return false;
    // Check if feature is in enabled list
    return this.enabledFeatures.includes(featureCode);
  }

  /**
   * Filter menu items by enabled features
   */
  private filterByFeatures(items: MenuItem[]): MenuItem[] {
    return items.filter(item => this.isFeatureEnabled(item.featureCode));
  }

  private setupMenuItems(): void {
    const isParent = this.authService.isParent();
    const isAdmin = this.authService.isAdmin();
    const isTeacher = this.authService.isTeacher();
    const isSuperAdmin = this.authService.isSuperAdmin();

    // SuperAdmin has a completely different menu
    if (isSuperAdmin) {
      this.setupSuperAdminMenu();
      return;
    }

    // Main items - available to all roles (core features)
    const mainItems: MenuItem[] = [
      { path: '/dashboard', icon: 'bi-speedometer2', label: 'SIDEBAR.MENU.DASHBOARD', featureCode: FeatureCodes.DASHBOARD },
      { path: '/messages', icon: 'bi-envelope', label: 'SIDEBAR.MENU.MESSAGES', featureCode: FeatureCodes.MESSAGES },
      { path: '/appointments', icon: 'bi-calendar-plus', label: 'SIDEBAR.MENU.APPOINTMENTS', featureCode: FeatureCodes.APPOINTMENTS },
      { path: '/reclamations', icon: 'bi-exclamation-circle', label: 'SIDEBAR.MENU.RECLAMATIONS', featureCode: FeatureCodes.RECLAMATIONS },
      { path: '/calendar', icon: 'bi-calendar', label: 'SIDEBAR.MENU.CALENDAR', featureCode: FeatureCodes.CALENDAR }
    ];
    this.menuItemsMain = this.filterByFeatures(mainItems);

    // Principal items - role-based
    const principalItems: MenuItem[] = [
      { path: '/holidays', icon: 'bi-calendar-heart', label: 'SIDEBAR.MENU.HOLIDAYS', featureCode: FeatureCodes.HOLIDAYS },
      { path: '/fees', icon: 'bi-currency-dollar', label: 'SIDEBAR.MENU.FEES', featureCode: FeatureCodes.FEES },
      { path: '/events', icon: 'bi-calendar-event', label: 'SIDEBAR.MENU.EVENTS', featureCode: FeatureCodes.EVENTS }
    ];

    // Leaves - Admin & Teacher only (not Parent)
    if (!isParent) {
      principalItems.splice(1, 0, { path: '/leaves', icon: 'bi-person-raised-hand', label: 'SIDEBAR.MENU.LEAVES', featureCode: FeatureCodes.LEAVES });
    }

    // Static Fees - Admin & Teacher only (for tracking offline payments)
    if (!isParent) {
      // Find the index of Fees and insert Static Fees right after it
      const feesIndex = principalItems.findIndex(item => item.path === '/fees');
      if (feesIndex !== -1) {
        principalItems.splice(feesIndex + 1, 0, { path: '/static-fees', icon: 'bi-cash-coin', label: 'SIDEBAR.MENU.STATIC_FEES', featureCode: FeatureCodes.STATIC_FEES });
      }
    }
    this.menuItemsPrincipal = this.filterByFeatures(principalItems);

    // Child items - role-based
    const childItems: MenuItem[] = [
      { path: '/activities', icon: 'bi-activity', label: 'SIDEBAR.MENU.DAILY_REPORT', featureCode: FeatureCodes.DAILY_ACTIVITIES },
      { path: isParent ? '/food-menu/parent' : '/food-menu', icon: 'bi-egg-fried', label: 'SIDEBAR.MENU.FOOD_MENU', featureCode: FeatureCodes.FOOD_MENU },
      { path: '/gallery', icon: 'bi-images', label: 'SIDEBAR.MENU.GALLERY', featureCode: FeatureCodes.GALLERY },
      { path: '/learning-games', icon: 'bi-controller', label: 'SIDEBAR.MENU.LEARNING_GAMES', featureCode: FeatureCodes.LEARNING_GAMES }
    ];

    // Attendance - Admin & Teacher only (not Parent)
    if (!isParent) {
      childItems.unshift(
        { path: '/attendance-list', icon: 'bi-list-check', label: 'SIDEBAR.MENU.ATTENDANCE_HISTORY', featureCode: FeatureCodes.ATTENDANCE },
        { path: '/attendance', icon: 'bi-calendar-check', label: 'SIDEBAR.MENU.ATTENDANCE', featureCode: FeatureCodes.ATTENDANCE }
      );
    }

    // Classes - Admin & Teacher only (not Parent)
    if (!isParent) {
      childItems.push(
        { path: '/classes', icon: 'bi-book', label: 'SIDEBAR.MENU.CLASSES', featureCode: FeatureCodes.CLASSES }
      );
    }

    // Add QR Check-in for parents only
    if (isParent) {
      childItems.unshift(
        { path: '/qr-checkin', icon: 'bi-qr-code-scan', label: 'SIDEBAR.MENU.QR_CHECKIN', featureCode: FeatureCodes.QR_CHECKIN }
      );
    }

    // Add QR Management for Admin & Teacher only
    if (isAdmin || isTeacher) {
      childItems.push(
        { path: '/qr-management', icon: 'bi-qr-code', label: 'SIDEBAR.MENU.QR_MANAGEMENT', featureCode: FeatureCodes.QR_CHECKIN }
      );
    }
    this.menuItemsChild = this.filterByFeatures(childItems);

    // People items - Admin & Teacher only (not Parent) - core features
    const peopleItems: MenuItem[] = [];
    if (isAdmin) {
      peopleItems.push(
        { path: '/parents', icon: 'bi-people', label: 'SIDEBAR.MENU.PARENTS', featureCode: FeatureCodes.PARENTS },
        { path: '/educators', icon: 'bi-person-workspace', label: 'SIDEBAR.MENU.EDUCATORS', featureCode: FeatureCodes.TEACHERS },
        { path: '/children', icon: 'bi-person-hearts', label: 'SIDEBAR.MENU.CHILDREN', usePrefix: true, featureCode: FeatureCodes.CHILDREN }
      );
    } else if (isTeacher) {
      peopleItems.push(
        { path: '/parents', icon: 'bi-people', label: 'SIDEBAR.MENU.PARENTS', featureCode: FeatureCodes.PARENTS },
        { path: '/children', icon: 'bi-person-hearts', label: 'SIDEBAR.MENU.CHILDREN', usePrefix: true, featureCode: FeatureCodes.CHILDREN }
      );
    }
    this.menuItemsPeople = this.filterByFeatures(peopleItems);

    // IA items - available to admin users only
    const iaItems: MenuItem[] = [];
    if (isAdmin) {
      iaItems.push(
        { path: '/basic-ai', icon: 'bi-search', label: 'SIDEBAR.MENU.BASIC_AI', featureCode: FeatureCodes.BASIC_AI },
        { path: '/ai-assistant', icon: 'bi-robot', label: 'SIDEBAR.MENU.OPENAI_ASSISTANT', featureCode: FeatureCodes.AI_ASSISTANT }
      );
    }
    this.menuItemsIa = this.filterByFeatures(iaItems);

    // Setting items - Admin & Teacher only (not Parent)
    if (!isParent) {
      this.menuItemsSetting = [
        { path: '/settings', icon: 'bi-gear', label: 'SIDEBAR.MENU.SETTINGS' }
      ];
    } else {
      this.menuItemsSetting = [];
    }
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  isParent(): boolean {
    return this.authService.isParent();
  }

  isTeacher(): boolean {
    return this.authService.isTeacher();
  }

  isSuperAdmin(): boolean {
    return this.authService.isSuperAdmin();
  }

  private setupSuperAdminMenu(): void {
    // SuperAdmin main items
    this.menuItemsMain = [
      { path: '/super-admin/dashboard', icon: 'bi-speedometer2', label: 'SIDEBAR.MENU.DASHBOARD' }
    ];

    // SuperAdmin tenants management
    this.menuItemsSuperAdmin = [
      { path: '/super-admin/tenants', icon: 'bi-building', label: 'SIDEBAR.MENU.DAYCARES' },
      { path: '/super-admin/tenants/add', icon: 'bi-plus-circle', label: 'SIDEBAR.MENU.ADD_DAYCARE' },
      { path: '/super-admin/billing', icon: 'bi-cash-stack', label: 'SIDEBAR.MENU.BILLING' }
    ];

    // Clear other menus for SuperAdmin
    this.menuItemsPrincipal = [];
    this.menuItemsChild = [];
    this.menuItemsPeople = [];
    this.menuItemsIa = [];
    this.menuItemsSetting = [];
  }

  onLinkClick(): void {
    this.linkClicked.emit();
  }
}