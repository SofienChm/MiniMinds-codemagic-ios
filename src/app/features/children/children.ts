import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgSelectModule } from '@ng-select/ng-select';
import { Subscription } from 'rxjs';
import { ChildModel } from './children.interface';
import { ChildrenService } from './children.service';
import { AuthService } from '../../core/services/auth';
import { PermissionService } from '../../core/services/permission.service';
import { TitlePage, TitleAction, Breadcrumb } from '../../shared/layouts/title-page/title-page';
import { ExportUtil } from '../../shared/utils/export.util';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-children',
  standalone: true,
  imports: [CommonModule, FormsModule, TitlePage, TranslateModule, NgSelectModule],
  templateUrl: './children.html',
  styleUrl: './children.scss'
})
export class Children implements OnInit, OnDestroy {
  private childrenSub?: Subscription;

  children: ChildModel[] = [];
  filteredChildren: ChildModel[] = [];
  displayedChildren: ChildModel[] = [];
  loading = false;
  userRole: string | null = null;
  viewMode: 'grid' | 'list' = 'grid';
  sortBy: string = 'recent-added';
  showSortMenu = false;
  showExportDropdown = false;
  searchTerm: string = '';
  childrenPerPage = 9;
  currentPage = 1;

  // Filter values
  filterGender: string | null = null;
  filterStatus: boolean | null = null;

  // Options for ng-select
  genderOptions = [
    { value: 'Male', label: 'Male', icon: 'bi-gender-male' },
    { value: 'Female', label: 'Female', icon: 'bi-gender-female' }
  ];

  statusOptions = [
    { value: true, label: 'Active', icon: 'bi-check-circle' },
    { value: false, label: 'Inactive', icon: 'bi-x-circle' }
  ];

  sortOptions = [
    { value: 'name-asc', label: 'A to Z', icon: 'bi-sort-alpha-down' },
    { value: 'name-desc', label: 'Z to A', icon: 'bi-sort-alpha-up' },
    { value: 'recent-added', label: 'Recently Added', icon: 'bi-clock-history' },
    { value: 'age-asc', label: 'Sort by Age', icon: 'bi-calendar' }
  ];

  breadcrumbs: Breadcrumb[] = [];
  titleActions: TitleAction[] = [];

  constructor(
    private childrenService: ChildrenService,
    private authService: AuthService,
    private router: Router,
    public permissions: PermissionService,
    private translate: TranslateService
  ) {}

  ngOnInit() {
    this.userRole = this.authService.getUserRole();
    this.initBreadcrumbs();
    this.initSelectOptions();
    this.setupTitleActions();
    this.loadChildren();
    this.childrenSub = this.childrenService.children$.subscribe(children => {
      this.children = children;
    });
  }

  ngOnDestroy(): void {
    this.childrenSub?.unsubscribe();
  }

  isParent(): boolean {
    return this.authService.isParent();
  }

  private initBreadcrumbs(): void {
    this.breadcrumbs = [
      { label: this.translate.instant('BREADCRUMBS.CHILDREN') }
    ];
  }

  private initSelectOptions(): void {
    this.genderOptions = [
      { value: 'Male', label: this.translate.instant('CHILDREN.MALE'), icon: 'bi-gender-male' },
      { value: 'Female', label: this.translate.instant('CHILDREN.FEMALE'), icon: 'bi-gender-female' }
    ];

    this.statusOptions = [
      { value: true, label: this.translate.instant('CHILDREN.ACTIVE'), icon: 'bi-check-circle' },
      { value: false, label: this.translate.instant('CHILDREN.INACTIVE'), icon: 'bi-x-circle' }
    ];

    this.sortOptions = [
      { value: 'name-asc', label: this.translate.instant('CHILDREN.SORT_AZ'), icon: 'bi-sort-alpha-down' },
      { value: 'name-desc', label: this.translate.instant('CHILDREN.SORT_ZA'), icon: 'bi-sort-alpha-up' },
      { value: 'recent-added', label: this.translate.instant('CHILDREN.SORT_RECENT'), icon: 'bi-clock-history' },
      { value: 'age-asc', label: this.translate.instant('CHILDREN.SORT_AGE'), icon: 'bi-calendar' }
    ];
  }

  setupTitleActions() {
    this.titleActions = [
      {
        label: this.translate.instant('CHILDREN.EXPORT'),
        class: 'btn btn-light me-2',
        action: () => {},
        dropdown: {
          items: [
            {
              label: this.translate.instant('CHILDREN.EXPORT_PDF'),
              icon: 'bi bi-file-earmark-pdf',
              action: () => this.exportToPDF()
            },
            {
              label: this.translate.instant('CHILDREN.EXPORT_EXCEL'),
              icon: 'bi bi-file-earmark-excel',
              action: () => this.exportToExcel()
            }
          ]
        }
      }
    ];

    // Only Admin and Teachers can add children
    if (this.authService.isAdmin() || this.authService.isTeacher()) {
      this.titleActions.push({
        label: this.translate.instant('CHILDREN.ADD_CHILD'),
        class: 'btn-add-global-2',
        action: () => this.router.navigate(['/children/add'])
      });
    }
  }

  loadChildren() {
    this.loading = true;
    this.childrenService.loadChildren().subscribe({
      next: (children) => {
        this.children = children;
        this.applyFilters();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading children:', error);
        this.loading = false;
        Swal.fire({
          icon: 'error',
          title: this.translate.instant('MESSAGES.ERROR'),
          text: this.translate.instant('CHILDREN.LOAD_ERROR')
        });
      }
    });
  }

  editChild(child: ChildModel) {
    this.router.navigate(['/children/edit', child.id]);
  }

  deleteChild(id: number) {
    Swal.fire({
      title: this.translate.instant('CHILDREN.DELETE_CONFIRM_TITLE'),
      text: this.translate.instant('CHILDREN.DELETE_CONFIRM_TEXT'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: this.translate.instant('CHILDREN.YES_DELETE'),
      cancelButtonText: this.translate.instant('MESSAGES.CANCEL')
    }).then((result) => {
      if (result.isConfirmed) {
        this.childrenService.deleteChild(id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: this.translate.instant('MESSAGES.SUCCESS'),
              text: this.translate.instant('CHILDREN.DELETE_SUCCESS')
            });
            this.loadChildren();
          },
          error: (error) => {
            console.error('Error deleting child:', error);
            Swal.fire({
              icon: 'error',
              title: this.translate.instant('MESSAGES.ERROR'),
              text: this.translate.instant('CHILDREN.DELETE_ERROR')
            });
          }
        });
      }
    });
  }

  viewDetails(child: ChildModel) {
    this.router.navigate(['/children/detail', child.id]);
  }

  setViewMode(mode: 'grid' | 'list') {
    this.viewMode = mode;
  }

  onSortChange() {
    this.applyFilters();
  }

  onFilterChange() {
    this.applyFilters();
  }

  toggleSortMenu() {
    this.showSortMenu = !this.showSortMenu;
  }

  setSortBy(sortBy: string) {
    this.sortBy = sortBy;
    this.showSortMenu = false;
    this.applyFilters();
  }

  applyFilters() {
    let sorted = [...this.children];

    // Apply search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      sorted = sorted.filter(child =>
        `${child.firstName} ${child.lastName}`.toLowerCase().includes(term) ||
        child.gender?.toLowerCase().includes(term) ||
        (child.parent && `${child.parent.firstName} ${child.parent.lastName}`.toLowerCase().includes(term))
      );
    }

    // Apply gender filter
    if (this.filterGender) {
      sorted = sorted.filter(child => child.gender === this.filterGender);
    }

    // Apply status filter
    if (this.filterStatus !== null) {
      sorted = sorted.filter(child => child.isActive === this.filterStatus);
    }

    // Apply sorting
    switch (this.sortBy) {
      case 'name-asc':
        sorted.sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
        break;
      case 'name-desc':
        sorted.sort((a, b) => `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`));
        break;
      case 'recent-added':
        sorted.sort((a, b) => new Date(b.enrollmentDate || '').getTime() - new Date(a.enrollmentDate || '').getTime());
        break;
      case 'age-asc':
        sorted.sort((a, b) => this.getAge(a.dateOfBirth) - this.getAge(b.dateOfBirth));
        break;
    }

    this.filteredChildren = sorted;
    this.currentPage = 1;
    this.updateDisplayedChildren();
  }

  // Keep for backwards compatibility
  applySort() {
    this.applyFilters();
  }

  clearFilters() {
    this.searchTerm = '';
    this.filterGender = null;
    this.filterStatus = null;
    this.sortBy = 'recent-added';
    this.applyFilters();
  }

  updateDisplayedChildren() {
    const endIndex = this.currentPage * this.childrenPerPage;
    this.displayedChildren = this.filteredChildren.slice(0, endIndex);
  }

  loadMoreChildren() {
    this.currentPage++;
    this.updateDisplayedChildren();
  }

  hasMoreChildren(): boolean {
    return this.displayedChildren.length < this.filteredChildren.length;
  }

  onSearchChange() {
    this.applyFilters();
  }

  getSortLabel(): string {
    const option = this.sortOptions.find(o => o.value === this.sortBy);
    return option ? option.label : this.translate.instant('CHILDREN.SORT_AZ');
  }

  getAge(dateOfBirth: string): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  toggleExportDropdown() {
    this.showExportDropdown = !this.showExportDropdown;
  }

  exportToPDF(): void {
    const data = this.filteredChildren.map(child => ({
      'Name': `${child.firstName} ${child.lastName}`,
      'Age': this.getAge(child.dateOfBirth),
      'Gender': child.gender,
      'Parent': child.parent ? `${child.parent.firstName} ${child.parent.lastName}` : 'N/A',
      'Enrollment Date': child.enrollmentDate ? new Date(child.enrollmentDate).toLocaleDateString() : 'N/A',
      'Allergies': child.allergies || 'None'
    }));

    ExportUtil.exportToPDF(data, 'Children Report');
  }

  exportToExcel(): void {
    const data = this.filteredChildren.map(child => ({
      'Name': `${child.firstName} ${child.lastName}`,
      'Age': this.getAge(child.dateOfBirth),
      'Gender': child.gender,
      'Parent': child.parent ? `${child.parent.firstName} ${child.parent.lastName}` : 'N/A',
      'Enrollment Date': child.enrollmentDate ? new Date(child.enrollmentDate).toLocaleDateString() : 'N/A',
      'Allergies': child.allergies || 'None'
    }));

    ExportUtil.exportToExcel(data, 'Children Report');
  }

  toggleChildStatus(id: number) {
    this.childrenService.toggleChildStatus(id).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: this.translate.instant('MESSAGES.SUCCESS'),
          text: this.translate.instant('CHILDREN.STATUS_UPDATED')
        });
        this.loadChildren();
      },
      error: (error) => {
        console.error('Error toggling child status:', error);
        Swal.fire({
          icon: 'error',
          title: this.translate.instant('MESSAGES.ERROR'),
          text: this.translate.instant('CHILDREN.STATUS_ERROR')
        });
      }
    });
  }

  // TrackBy function for ngFor performance optimization
  trackById(index: number, item: ChildModel): number | undefined {
    return item.id;
  }
}
