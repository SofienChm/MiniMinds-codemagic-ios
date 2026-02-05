import { Component, OnInit, OnDestroy, HostBinding, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { TenantService } from '../../../core/services/tenant.service';
import { Tenant, TenantStats } from '../../../core/interfaces/dto/tenant-dto';
import { AuthService } from '../../../core/services/auth';
import { AuthResponse } from '../../../core/interfaces/dto/auth-response-dto';
import { Capacitor } from '@capacitor/core';
import { HeaderSuperadminComponent } from '../header-superadmin/header';

@Component({
  selector: 'app-super-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TranslateModule, HeaderSuperadminComponent],
  templateUrl: './super-admin-dashboard.html',
  styleUrl: './super-admin-dashboard.scss'
})
export class SuperAdminDashboard implements OnInit, OnDestroy {
  stats: TenantStats = {
    totalTenants: 0,
    activeTenants: 0,
    inactiveTenants: 0,
    totalParents: 0,
    totalTeachers: 0,
    totalChildren: 0,
    subscriptionBreakdown: []
  };

  tenants: Tenant[] = [];
  recentTenants: Tenant[] = [];
  userName: string = '';
  currentUser: AuthResponse | null = null;

  isMobile(): boolean {
    return window.innerWidth < 768;
  }

  @HostBinding('class.mobile-mode') get mobileMode() {
    return this.isMobile();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    this.openDropdownId = null;
  }

  loadingStates = {
    stats: true,
    tenants: true
  };

  searchTerm: string = '';
  filteredTenants: Tenant[] = [];
  pendingRequestsCount: number = 0;
  searchResults: Tenant[] = [];
  showSearchResults: boolean = false;
  openDropdownId: number | null = null;

  private subscriptions: Subscription[] = [];

  constructor(
    private tenantService: TenantService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.userName = this.currentUser?.firstName || 'Admin';

    this.loadStats();
    this.loadTenants();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadStats(): void {
    this.loadingStates.stats = true;
    const sub = this.tenantService.getStats().subscribe({
      next: (stats) => {
        this.stats = stats;
        this.loadingStates.stats = false;
      },
      error: (err) => {
        console.error('Error loading stats:', err);
        this.loadingStates.stats = false;
      }
    });
    this.subscriptions.push(sub);
  }

  private loadTenants(): void {
    this.loadingStates.tenants = true;
    const sub = this.tenantService.loadTenants().subscribe({
      next: (tenants) => {
        this.tenants = tenants;
        this.filteredTenants = tenants;
        this.recentTenants = tenants
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5);
        this.loadingStates.tenants = false;
      },
      error: (err) => {
        console.error('Error loading tenants:', err);
        this.loadingStates.tenants = false;
      }
    });
    this.subscriptions.push(sub);
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredTenants = this.tenants;
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredTenants = this.tenants.filter(t =>
      t.name.toLowerCase().includes(term) ||
      t.email?.toLowerCase().includes(term) ||
      t.subdomain?.toLowerCase().includes(term)
    );
  }

  onSearchInput(): void {
    if (!this.searchTerm.trim()) {
      this.searchResults = [];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.searchResults = this.tenants.filter(t =>
      t.name.toLowerCase().includes(term) ||
      t.email?.toLowerCase().includes(term) ||
      t.subdomain?.toLowerCase().includes(term)
    ).slice(0, 5);
  }

  hideSearchResults(): void {
    setTimeout(() => {
      this.showSearchResults = false;
    }, 200);
  }

  goToTenantDetail(tenantId: number): void {
    this.showSearchResults = false;
    this.searchTerm = '';
    this.router.navigate(['/super-admin/tenants/detail', tenantId]);
  }

  toggleTenantStatus(tenant: Tenant): void {
    const newStatus = !tenant.isActive;
    this.tenantService.updateTenantStatus(tenant.id, newStatus).subscribe({
      next: () => {
        tenant.isActive = newStatus;
      },
      error: (err) => {
        console.error('Error updating tenant status:', err);
      }
    });
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }

  trackById(index: number, item: any): number {
    return item.id;
  }

  toggleDropdown(tenantId: number, event: Event): void {
    event.stopPropagation();
    this.openDropdownId = this.openDropdownId === tenantId ? null : tenantId;
  }

  closeDropdown(): void {
    this.openDropdownId = null;
  }
}
