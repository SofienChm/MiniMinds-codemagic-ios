import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { ParentModel } from './parent.interface';
import { ParentService } from './parent.service';
import { TitlePage, TitleAction, Breadcrumb, DropdownItem } from '../../shared/layouts/title-page/title-page';
import { ExportUtil } from '../../shared/utils/export.util';
import { PageTitleService } from '../../core/services/page-title.service';

@Component({
  selector: 'app-parent',
  standalone: true,
  imports: [CommonModule, FormsModule, TitlePage, NgSelectModule, TranslateModule],
  templateUrl: './parent.html',
  styleUrl: './parent.scss'
})
export class Parent implements OnInit, OnDestroy {
  parents: ParentModel[] = [];
  filteredParents: ParentModel[] = [];
  displayedParents: ParentModel[] = [];
  loading = false;
  itemsPerPage = 9;
  currentPage = 1;
  showExportDropdown = false;
  viewMode: 'grid' | 'list' = 'grid';
  sortBy: string = 'recent-added';
  showSortMenu = false;
  isAdmin = true; // TODO: Get from auth service
  searchTerm: string = '';
  breadcrumbs: Breadcrumb[] = [];
  titleActions: TitleAction[] = [];
  sortOptions: { value: string; label: string; icon: string }[] = [];
  private langChangeSub?: Subscription;
  private parentsSub?: Subscription;



  constructor(
    private parentService: ParentService,
    private router: Router,
    private translate: TranslateService,
    private pageTitleService: PageTitleService
  ) {}

  ngOnInit() {
    this.pageTitleService.setTitle(this.translate.instant('PARENTS.TITLE'));
    this.setupBreadcrumbs();
    this.setupTitleActions();
    this.setupSortOptions();
    this.loadParents();
    this.parentsSub = this.parentService.parents$.subscribe(parents => {
      this.parents = parents;
      this.applySort();
    });

    this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      this.pageTitleService.setTitle(this.translate.instant('PARENTS.TITLE'));
      this.setupBreadcrumbs();
      this.setupTitleActions();
      this.setupSortOptions();
    });
  }

  ngOnDestroy(): void {
    this.langChangeSub?.unsubscribe();
    this.parentsSub?.unsubscribe();
  }

  private setupBreadcrumbs(): void {
    this.breadcrumbs = [
      { label: this.translate.instant('BREADCRUMBS.DASHBOARD'), url: '/dashboard' },
      { label: this.translate.instant('PARENTS.TITLE') }
    ];
  }

  private setupTitleActions(): void {
    this.titleActions = [
      {
        label: this.translate.instant('COMMON.EXPORT'),
        class: 'btn btn-light me-2',
        action: () => {},
        dropdown: {
          items: [
            {
              label: this.translate.instant('COMMON.EXPORT_PDF'),
              icon: 'bi bi-file-earmark-pdf',
              action: () => this.exportToPDF()
            },
            {
              label: this.translate.instant('COMMON.EXPORT_EXCEL'),
              icon: 'bi bi-file-earmark-excel',
              action: () => this.exportToExcel()
            }
          ]
        }
      },
      {
        label: this.translate.instant('PARENTS.ADD_PARENT'),
        class: '',
        action: () => this.router.navigate(['/parents/add'])
      }
    ];
  }

  private setupSortOptions(): void {
    this.sortOptions = [
      { value: 'name-asc', label: this.translate.instant('COMMON.SORT_A_TO_Z'), icon: 'bi-sort-alpha-down' },
      { value: 'name-desc', label: this.translate.instant('COMMON.SORT_Z_TO_A'), icon: 'bi-sort-alpha-up' },
      { value: 'recent-added', label: this.translate.instant('COMMON.RECENTLY_ADDED'), icon: 'bi-calendar-check' },
      { value: 'email-asc', label: this.translate.instant('COMMON.SORT_BY_EMAIL'), icon: 'bi-envelope' }
    ];
  }

  loadParents() {
    this.loading = true;
    this.parentService.loadParents(this.searchTerm).subscribe({
      next: (parents) => {
        this.parents = parents;
        this.applySort();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading parents');
        this.loading = false;
      }
    });
  }

  private searchTimeout: any;

  onSearch() {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.searchTimeout = setTimeout(() => {
      this.loadParents();
    }, 300);
  }



  editParent(parent: ParentModel) {
    this.router.navigate(['/parents/edit', parent.id]);
  }



  async deleteParent(id: number) {
    const { default: Swal } = await import('sweetalert2');
    const result = await Swal.fire({
      title: this.translate.instant('PARENTS.DELETE_CONFIRM_TITLE'),
      text: this.translate.instant('PARENTS.DELETE_CONFIRM_TEXT'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: this.translate.instant('COMMON.YES_DELETE'),
      cancelButtonText: this.translate.instant('COMMON.CANCEL')
    });

    if (result.isConfirmed) {
      this.parentService.deleteParent(id).subscribe({
        next: () => {
          this.loadParents();
        },
        error: () => {
          console.error('Error deleting parent');
        }
      });
    }
  }

  async toggleParentStatus(parent: ParentModel) {
    if (!parent.isActive) {
      // Activating parent - simple confirmation
      const { default: Swal } = await import('sweetalert2');
      const result = await Swal.fire({
        title: this.translate.instant('PARENTS.ACTIVATE_PARENT'),
        text: this.translate.instant('PARENTS.ACTIVATE_CONFIRM', { name: `${parent.firstName} ${parent.lastName}` }),
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#28a745',
        cancelButtonColor: '#6c757d',
        confirmButtonText: this.translate.instant('PARENTS.YES_ACTIVATE')
      });

      if (result.isConfirmed) {
        this.parentService.toggleParentStatus(parent.id!, false).subscribe({
          next: () => this.loadParents(),
          error: () => console.error('Error activating parent')
        });
      }
    } else {
      // Deactivating parent - ask about children
      const { default: Swal } = await import('sweetalert2');
      const hasChildren = parent.children && parent.children.length > 0;

      if (hasChildren) {
        const result = await Swal.fire({
          title: this.translate.instant('PARENTS.DEACTIVATE_PARENT'),
          text: this.translate.instant('PARENTS.DEACTIVATE_WITH_CHILDREN', { name: `${parent.firstName} ${parent.lastName}`, count: parent.children!.length }),
          icon: 'warning',
          showCancelButton: true,
          showDenyButton: true,
          confirmButtonColor: '#dc3545',
          denyButtonColor: '#ffc107',
          cancelButtonColor: '#6c757d',
          confirmButtonText: this.translate.instant('PARENTS.DEACTIVATE_PARENT_AND_CHILDREN'),
          denyButtonText: this.translate.instant('PARENTS.DEACTIVATE_PARENT_ONLY'),
          cancelButtonText: this.translate.instant('COMMON.CANCEL')
        });

        if (result.isConfirmed) {
          // Deactivate parent and children
          this.parentService.toggleParentStatus(parent.id!, true).subscribe({
            next: () => this.loadParents(),
            error: () => console.error('Error deactivating parent and children')
          });
        } else if (result.isDenied) {
          // Deactivate parent only
          this.parentService.toggleParentStatus(parent.id!, false).subscribe({
            next: () => this.loadParents(),
            error: () => console.error('Error deactivating parent')
          });
        }
      } else {
        // No children - simple deactivation
        const result = await Swal.fire({
          title: this.translate.instant('PARENTS.DEACTIVATE_PARENT'),
          text: this.translate.instant('PARENTS.DEACTIVATE_CONFIRM', { name: `${parent.firstName} ${parent.lastName}` }),
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#dc3545',
          cancelButtonColor: '#6c757d',
          confirmButtonText: this.translate.instant('PARENTS.YES_DEACTIVATE')
        });

        if (result.isConfirmed) {
          this.parentService.toggleParentStatus(parent.id!, false).subscribe({
            next: () => this.loadParents(),
            error: () => console.error('Error deactivating parent')
          });
        }
      }
    }
  }

  viewDetails(parent: ParentModel) {
    this.router.navigate(['/parents/detail', parent.id]);
  }

  viewChildDetails(childId: number) {
    this.router.navigate(['/children/detail', childId]);
  }





  setViewMode(mode: 'grid' | 'list') {
    this.viewMode = mode;
  }

  setSortBy(sortBy: string) {
    this.sortBy = sortBy;
    this.showSortMenu = false;
    this.applySort();
  }

  onSortChange() {
    this.applySort();
  }

  toggleSortMenu() {
    this.showSortMenu = !this.showSortMenu;
  }

  applySort() {
    let sorted = [...this.parents];
    
    switch (this.sortBy) {
      case 'name-asc':
        sorted.sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
        break;
      case 'name-desc':
        sorted.sort((a, b) => `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`));
        break;
      case 'recent-added':
        sorted.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
        break;
      case 'email-asc':
        sorted.sort((a, b) => a.email.localeCompare(b.email));
        break;
    }
    
    this.filteredParents = sorted;
    this.currentPage = 1;
    this.updateDisplayedParents();
  }

  updateDisplayedParents() {
    const endIndex = this.currentPage * this.itemsPerPage;
    this.displayedParents = this.filteredParents.slice(0, endIndex);
  }

  loadMore() {
    this.currentPage++;
    this.updateDisplayedParents();
  }

  get hasMoreItems(): boolean {
    return this.displayedParents.length < this.filteredParents.length;
  }

  getSortLabel(): string {
    switch (this.sortBy) {
      case 'name-asc': return this.translate.instant('COMMON.SORT_A_TO_Z');
      case 'name-desc': return this.translate.instant('COMMON.SORT_Z_TO_A');
      case 'recent-added': return this.translate.instant('COMMON.RECENTLY_ADDED');
      case 'email-asc': return this.translate.instant('COMMON.SORT_BY_EMAIL');
      default: return this.translate.instant('COMMON.SORT_A_TO_Z');
    }
  }

  toggleExportDropdown() {
    this.showExportDropdown = !this.showExportDropdown;
  }

  exportToPDF(): void {
    const data = this.filteredParents.map(parent => ({
      [this.translate.instant('PARENTS.NAME')]: `${parent.firstName} ${parent.lastName}`,
      [this.translate.instant('PARENTS.EMAIL')]: parent.email,
      [this.translate.instant('PARENTS.PHONE')]: parent.phoneNumber,
      [this.translate.instant('PARENTS.ADDRESS')]: parent.address || this.translate.instant('COMMON.NA'),
      [this.translate.instant('PARENTS.EMERGENCY_CONTACT')]: parent.emergencyContact || this.translate.instant('COMMON.NA')
    }));

    ExportUtil.exportToPDF(data, this.translate.instant('PARENTS.REPORT_TITLE'));
  }

  exportToExcel(): void {
    const data = this.filteredParents.map(parent => ({
      [this.translate.instant('PARENTS.NAME')]: `${parent.firstName} ${parent.lastName}`,
      [this.translate.instant('PARENTS.EMAIL')]: parent.email,
      [this.translate.instant('PARENTS.PHONE')]: parent.phoneNumber,
      [this.translate.instant('PARENTS.ADDRESS')]: parent.address || this.translate.instant('COMMON.NA'),
      [this.translate.instant('PARENTS.EMERGENCY_CONTACT')]: parent.emergencyContact || this.translate.instant('COMMON.NA')
    }));

    ExportUtil.exportToExcel(data, this.translate.instant('PARENTS.REPORT_TITLE'));
  }

  // TrackBy function for ngFor performance optimization
  trackById(index: number, item: ParentModel): number | undefined {
    return item.id;
  }
}