import { Component, OnInit, OnDestroy, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { NgSelectModule } from '@ng-select/ng-select';
import { Subscription } from 'rxjs';
import { TenantService } from '../../../core/services/tenant.service';
import { Tenant } from '../../../core/interfaces/dto/tenant-dto';
import { TitlePage, TitleAction, Breadcrumb } from '../../../shared/layouts/title-page/title-page';
import { HeaderSuperadminComponent } from '../header-superadmin/header';
import { Location } from '@angular/common';

@Component({
  selector: 'app-tenants',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TranslateModule, NgSelectModule, TitlePage, HeaderSuperadminComponent],
  templateUrl: './tenants.html',
  styleUrl: './tenants.scss'
})
export class Tenants implements OnInit, OnDestroy {
  tenants: Tenant[] = [];
  filteredTenants: Tenant[] = [];
  displayedTenants: Tenant[] = [];

  loading = true;
  searchTerm = '';
  statusFilter: string = 'all';
  sortBy = 'recent';

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;
  isMobile(): boolean {
    return window.innerWidth < 768;
  }

  @HostBinding('class.mobile-mode') get mobileMode() {
    return this.isMobile();
  }

  // Title page config
  breadcrumbs: Breadcrumb[] = [
    { label: 'Dashboard', url: '/super-admin/dashboard' },
    { label: 'Daycares', url: '/super-admin/tenants' }
  ];
  back() {
    this.location.back();
  }
  titleActions: TitleAction[] = [];

  private initTitleActions(): void {
    this.titleActions = [
      {
        label: 'Add Daycare',
        icon: 'bi-plus-circle',
        class: 'btn-add-global-2',
        action: () => this.router.navigate(['/super-admin/tenants/add'])
      }
    ];
  }

  statusOptions = [
    { value: 'all', label: 'All Status', icon: 'bi-list' },
    { value: 'active', label: 'Active', icon: 'bi-check-circle' },
    { value: 'inactive', label: 'Inactive', icon: 'bi-x-circle' }
  ];

  sortOptions = [
    { value: 'recent', label: 'Recently Added', icon: 'bi-clock' },
    { value: 'name-asc', label: 'Name (A-Z)', icon: 'bi-sort-alpha-down' },
    { value: 'name-desc', label: 'Name (Z-A)', icon: 'bi-sort-alpha-up' },
    { value: 'users', label: 'Most Users', icon: 'bi-people' },
    { value: 'children', label: 'Most Children', icon: 'bi-person' }
  ];

  private subscriptions: Subscription[] = [];

  constructor(
    private tenantService: TenantService,
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
  ) {}

  ngOnInit(): void {
    this.initTitleActions();

    // Check for query params (e.g., ?status=inactive)
    this.route.queryParams.subscribe(params => {
      if (params['status']) {
        this.statusFilter = params['status'];
      }
    });

    this.loadTenants();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadTenants(): void {
    this.loading = true;
    const sub = this.tenantService.loadTenants().subscribe({
      next: (tenants) => {
        this.tenants = tenants;
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading tenants:', err);
        this.loading = false;
      }
    });
    this.subscriptions.push(sub);
  }

  applyFilters(): void {
    let result = [...this.tenants];

    // Search filter
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(t =>
        t.name.toLowerCase().includes(term) ||
        t.email?.toLowerCase().includes(term) ||
        t.subdomain?.toLowerCase().includes(term) ||
        t.phone?.includes(term)
      );
    }

    // Status filter
    if (this.statusFilter !== 'all') {
      const isActive = this.statusFilter === 'active';
      result = result.filter(t => t.isActive === isActive);
    }

    // Sort
    result = this.sortTenants(result);

    this.filteredTenants = result;
    this.totalPages = Math.ceil(result.length / this.itemsPerPage);
    this.currentPage = 1;
    this.updateDisplayedTenants();
  }

  private sortTenants(tenants: Tenant[]): Tenant[] {
    switch (this.sortBy) {
      case 'name-asc':
        return tenants.sort((a, b) => a.name.localeCompare(b.name));
      case 'name-desc':
        return tenants.sort((a, b) => b.name.localeCompare(a.name));
      case 'users':
        return tenants.sort((a, b) => b.userCount - a.userCount);
      case 'children':
        return tenants.sort((a, b) => b.childCount - a.childCount);
      case 'recent':
      default:
        return tenants.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  }

  updateDisplayedTenants(): void {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.displayedTenants = this.filteredTenants.slice(start, end);
  }

  onSearch(): void {
    this.applyFilters();
  }

  onStatusChange(): void {
    this.applyFilters();
  }

  onSortChange(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = 'all';
    this.applyFilters();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updateDisplayedTenants();
    }
  }

  toggleStatus(tenant: Tenant, event: Event): void {
    event.stopPropagation();
    const newStatus = !tenant.isActive;
    this.tenantService.updateTenantStatus(tenant.id, newStatus).subscribe({
      next: () => {
        tenant.isActive = newStatus;
      },
      error: (err) => {
        console.error('Error updating status:', err);
      }
    });
  }

  deleteTenant(tenant: Tenant, event: Event): void {
    event.stopPropagation();
    if (confirm(`Are you sure you want to delete "${tenant.name}"? This action cannot be undone and will delete all associated data.`)) {
      this.tenantService.deleteTenant(tenant.id).subscribe({
        next: () => {
          this.tenants = this.tenants.filter(t => t.id !== tenant.id);
          this.applyFilters();
        },
        error: (err) => {
          console.error('Error deleting tenant:', err);
        }
      });
    }
  }

  trackById(index: number, item: Tenant): number {
    return item.id;
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }
}
