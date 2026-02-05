import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EducatorModel } from './educator.interface';
import { EducatorService } from './educator.service';
import { TitlePage, TitleAction, Breadcrumb } from '../../shared/layouts/title-page/title-page';
import { ExportUtil } from '../../shared/utils/export.util';
import Swal from 'sweetalert2';
import { SimpleToastService } from '../../core/services/simple-toast.service';

@Component({
  selector: 'app-educator',
  standalone: true,
  imports: [CommonModule, FormsModule, TitlePage, NgSelectModule, TranslateModule],
  templateUrl: './educator.html',
  styleUrl: './educator.scss'
})
export class Educator implements OnInit, OnDestroy {
  private educatorsSub?: Subscription;
  private langChangeSub?: Subscription;
  educators: EducatorModel[] = [];
  filteredEducators: EducatorModel[] = [];
  displayedEducators: EducatorModel[] = [];
  loading = false;
  viewMode: 'grid' | 'list' = 'grid';
  sortBy: string = 'recent-hired';
  showSortMenu = false;
  showExportDropdown = false;
  educatorsPerPage = 9;
  currentPage = 1;
  searchTerm: string = '';

  breadcrumbs: Breadcrumb[] = [];
  sortOptions: { value: string; label: string; icon: string }[] = [];
  titleActions: TitleAction[] = [];

  constructor(
    private educatorService: EducatorService,
    private router: Router,
    private translate: TranslateService,
    private simpleToast: SimpleToastService
  ) {}

  ngOnInit() {
    this.initBreadcrumbs();
    this.initSortOptions();
    this.initTitleActions();
    this.loadEducators();
    this.educatorsSub = this.educatorService.educators$.subscribe(educators => {
      this.educators = educators;
      this.filteredEducators = educators;
    });

    // Update translations when language changes
    this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      this.initBreadcrumbs();
      this.initSortOptions();
      this.initTitleActions();
    });
  }

  ngOnDestroy(): void {
    this.educatorsSub?.unsubscribe();
    this.langChangeSub?.unsubscribe();
  }

  private initBreadcrumbs(): void {
    this.breadcrumbs = [
      { label: this.translate.instant('BREADCRUMBS.DASHBOARD') },
      { label: this.translate.instant('BREADCRUMBS.EDUCATORS') }
    ];
  }

  private initSortOptions(): void {
    this.sortOptions = [
      { value: 'name-asc', label: this.translate.instant('EDUCATORS.SORT_AZ'), icon: 'bi-sort-alpha-down' },
      { value: 'name-desc', label: this.translate.instant('EDUCATORS.SORT_ZA'), icon: 'bi-sort-alpha-up' },
      { value: 'recent-hired', label: this.translate.instant('EDUCATORS.RECENTLY_HIRED'), icon: 'bi-calendar-check' }
    ];
  }

  private initTitleActions(): void {
    this.titleActions = [
      {
        label: this.translate.instant('EDUCATORS.EXPORT'),
        class: 'btn btn-light me-2',
        action: () => {},
        dropdown: {
          items: [
            {
              label: this.translate.instant('EDUCATORS.EXPORT_PDF'),
              icon: 'bi bi-file-earmark-pdf',
              action: () => this.exportToPDF()
            },
            {
              label: this.translate.instant('EDUCATORS.EXPORT_EXCEL'),
              icon: 'bi bi-file-earmark-excel',
              action: () => this.exportToExcel()
            }
          ]
        }
      },
      {
        label: this.translate.instant('EDUCATORS.ADD_EDUCATOR'),
        class: 'btn-add-global-2',
        action: () => this.router.navigate(['/educators/add'])
      }
    ];
  }

  loadEducators() {
    this.loading = true;
    this.educatorService.loadEducators(this.searchTerm).subscribe({
      next: (educators) => {
        this.educators = educators;
        this.applySort();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading educators:', error);
        this.loading = false;
        const errorMessage = this.extractErrorMessage(error);
        this.simpleToast.error(errorMessage);
      }
    });
  }

  private searchTimeout: any;

  onSearch() {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.searchTimeout = setTimeout(() => {
      this.loadEducators();
    }, 300);
  }

  editEducator(educator: EducatorModel) {
    this.router.navigate(['/educators/edit', educator.id]);
  }

  deleteEducator(id: number) {
    Swal.fire({
      title: this.translate.instant('EDUCATORS.DELETE_CONFIRM_TITLE'),
      text: this.translate.instant('EDUCATORS.DELETE_CONFIRM_TEXT'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: this.translate.instant('EDUCATORS.YES_DELETE'),
      cancelButtonText: this.translate.instant('COMMON.CANCEL')
    }).then((result) => {
      if (result.isConfirmed) {
        this.educatorService.deleteEducator(id).subscribe({
          next: () => {
            this.simpleToast.success(this.translate.instant('EDUCATORS.DELETE_SUCCESS_TEXT'));
            this.loadEducators();
          },
          error: (error) => {
            console.error('Error deleting educator:', error);
            const errorMessage = this.extractErrorMessage(error, 'delete');
            Swal.fire({
              icon: 'error',
              title: this.translate.instant('MESSAGES.ERROR'),
              text: errorMessage
            });
          }
        });
      }
    });
  }

  viewDetails(educator: EducatorModel) {
    this.router.navigate(['/educators/detail', educator.id]);
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
    let sorted = [...this.educators];

    switch (this.sortBy) {
      case 'name-asc':
        sorted.sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
        break;
      case 'name-desc':
        sorted.sort((a, b) => `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`));
        break;
      case 'recent-hired':
        sorted.sort((a, b) => new Date(b.hireDate).getTime() - new Date(a.hireDate).getTime());
        break;
    }

    this.filteredEducators = sorted;
    this.currentPage = 1;
    this.updateDisplayedEducators();
  }

  updateDisplayedEducators() {
    const endIndex = this.currentPage * this.educatorsPerPage;
    this.displayedEducators = this.filteredEducators.slice(0, endIndex);
  }

  loadMoreEducators() {
    this.currentPage++;
    this.updateDisplayedEducators();
  }

  hasMoreEducators(): boolean {
    return this.displayedEducators.length < this.filteredEducators.length;
  }

  getSortLabel(): string {
    switch (this.sortBy) {
      case 'name-asc': return this.translate.instant('EDUCATORS.SORT_AZ');
      case 'name-desc': return this.translate.instant('EDUCATORS.SORT_ZA');
      case 'recent-hired': return this.translate.instant('EDUCATORS.RECENTLY_HIRED');
      default: return this.translate.instant('EDUCATORS.SORT_AZ');
    }
  }

  toggleExportDropdown() {
    this.showExportDropdown = !this.showExportDropdown;
  }

  exportToPDF(): void {
    const data = this.filteredEducators.map(educator => ({
      [this.translate.instant('EDUCATORS.NAME')]: `${educator.firstName} ${educator.lastName}`,
      [this.translate.instant('EDUCATORS.EMAIL')]: educator.email,
      [this.translate.instant('EDUCATORS.PHONE')]: educator.phone || this.translate.instant('COMMON.NA'),
      [this.translate.instant('EDUCATORS.SPECIALIZATION')]: educator.specialization || this.translate.instant('COMMON.NA'),
      [this.translate.instant('EDUCATORS.HIRE_DATE')]: new Date(educator.hireDate).toLocaleDateString(),
      [this.translate.instant('EDUCATORS.STATUS')]: educator.isActive ? this.translate.instant('EDUCATORS.ACTIVE') : this.translate.instant('EDUCATORS.INACTIVE')
    }));

    if (data.length === 0) {
      this.simpleToast.warning(this.translate.instant('EDUCATORS.NO_DATA_EXPORT'));
      return;
    }

    ExportUtil.exportToPDF(data, this.translate.instant('EDUCATORS.REPORT_TITLE'));
  }

  exportToExcel(): void {
    const data = this.filteredEducators.map(educator => ({
      [this.translate.instant('EDUCATORS.NAME')]: `${educator.firstName} ${educator.lastName}`,
      [this.translate.instant('EDUCATORS.EMAIL')]: educator.email,
      [this.translate.instant('EDUCATORS.PHONE')]: educator.phone || this.translate.instant('COMMON.NA'),
      [this.translate.instant('EDUCATORS.SPECIALIZATION')]: educator.specialization || this.translate.instant('COMMON.NA'),
      [this.translate.instant('EDUCATORS.HIRE_DATE')]: new Date(educator.hireDate).toLocaleDateString(),
      [this.translate.instant('EDUCATORS.STATUS')]: educator.isActive ? this.translate.instant('EDUCATORS.ACTIVE') : this.translate.instant('EDUCATORS.INACTIVE')
    }));

    if (data.length === 0) {
      this.simpleToast.warning(this.translate.instant('EDUCATORS.NO_DATA_EXPORT'));
      return;
    }

    ExportUtil.exportToExcel(data, this.translate.instant('EDUCATORS.REPORT_TITLE'));
  }

  // TrackBy function for ngFor performance optimization
  trackById(index: number, item: EducatorModel): number | undefined {
    return item.id;
  }

  /**
   * Extract user-friendly error message from HTTP error response
   */
  private extractErrorMessage(error: any, operation: 'load' | 'delete' = 'load'): string {
    const defaultMessage = operation === 'delete'
      ? this.translate.instant('EDUCATORS.DELETE_ERROR')
      : this.translate.instant('EDUCATORS.LOAD_ERROR');

    // Handle network errors (no internet, server unreachable)
    if (error?.status === 0) {
      return this.translate.instant('ERRORS.NETWORK_ERROR') || 'Network error. Please check your internet connection.';
    }

    // Handle timeout errors
    if (error?.name === 'TimeoutError' || error?.message?.includes('timeout')) {
      return this.translate.instant('ERRORS.TIMEOUT') || 'Request timed out. Please try again.';
    }

    // Handle server errors (500+)
    if (error?.status >= 500) {
      return this.translate.instant('ERRORS.SERVER_ERROR') || 'Server error. Please try again later.';
    }

    // Handle 403 Forbidden
    if (error?.status === 403) {
      return this.translate.instant('ERRORS.FORBIDDEN') || 'You do not have permission to perform this action.';
    }

    // Handle 401 Unauthorized
    if (error?.status === 401) {
      return this.translate.instant('ERRORS.UNAUTHORIZED') || 'Your session has expired. Please log in again.';
    }

    // Handle 404 Not Found
    if (error?.status === 404) {
      return this.translate.instant('ERRORS.EDUCATOR_NOT_FOUND') || 'Educator not found. They may have been deleted.';
    }

    if (error?.error) {
      // Handle custom error message format
      if (error.error.message) {
        return error.error.message;
      }

      // Handle title property
      if (error.error.title) {
        return error.error.title;
      }

      // Handle string error
      if (typeof error.error === 'string') {
        return error.error;
      }

      // Handle .NET validation errors format
      if (error.error.errors) {
        const errorMessages: string[] = [];
        for (const key in error.error.errors) {
          if (error.error.errors.hasOwnProperty(key)) {
            const messages = error.error.errors[key];
            if (Array.isArray(messages)) {
              errorMessages.push(...messages);
            }
          }
        }
        if (errorMessages.length > 0) {
          return errorMessages.join('. ');
        }
      }
    }

    // Default fallback with status code for debugging
    if (error?.status) {
      return `${defaultMessage} (Error ${error.status})`;
    }

    return defaultMessage;
  }
}
