import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EducatorModel } from '../educator.interface';
import { EducatorService } from '../educator.service';
import { ChildrenService } from '../../children/children.service';
import { ChildModel } from '../../children/children.interface';
import { AuthService } from '../../../core/services/auth';
import { TitlePage, TitleAction, Breadcrumb } from '../../../shared/layouts/title-page/title-page';
import { HttpClient } from '@angular/common/http';
import { ApiConfig } from '../../../core/config/api.config';
import { AppCurrencyPipe } from '../../../core/services/currency/currency.pipe';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-educator-detail',
  imports: [CommonModule, TitlePage, FormsModule, AppCurrencyPipe, TranslateModule],
  standalone: true,
  templateUrl: './educator-detail.html',
  styleUrl: './educator-detail.scss'
})
export class EducatorDetail implements OnInit {
  educator: EducatorModel | null = null;
  loading = false;
  error = '';
  educatorId: number = 0;
  showAddChildModal = false;
  availableChildren: ChildModel[] = [];
  filteredChildren: ChildModel[] = [];
  assignedChildren: ChildModel[] = [];
  selectedChildId: number | null = null;
  searchTerm = '';
  assigningChild = false;

  breadcrumbs: Breadcrumb[] = [];
  titleActions: TitleAction[] = [];

  constructor(
    private educatorService: EducatorService,
    private childrenService: ChildrenService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private translate: TranslateService
  ) {}

  ngOnInit() {
    this.educatorId = Number(this.route.snapshot.paramMap.get('id'));
    this.initBreadcrumbs();
    this.setupTitleActions();
    this.loadEducator();
    this.loadAssignedChildren();

    // Update translations when language changes
    this.translate.onLangChange.subscribe(() => {
      this.initBreadcrumbs();
      this.setupTitleActions();
    });
  }

  private initBreadcrumbs(): void {
    this.breadcrumbs = [
      { label: this.translate.instant('BREADCRUMBS.EDUCATORS'), url: '/educators' },
      { label: this.translate.instant('EDUCATOR_DETAIL.BREADCRUMB_DETAILS') }
    ];
  }

  setupTitleActions() {
    this.titleActions = [
      {
        label: this.translate.instant('EDUCATOR_DETAIL.BACK_TO_EDUCATORS'),
        class: 'btn-outline-secondary btn-cancel-global',
        icon: 'bi bi-arrow-left',
        action: () => this.goBack()
      }
    ];

    if (this.authService.isAdmin()) {
      this.titleActions.push({
        label: this.translate.instant('EDUCATOR_DETAIL.EDIT_EDUCATOR'),
        class: 'btn-edit-global-2',
        icon: 'bi bi-pencil-square',
        action: () => this.router.navigate(['/educators/edit', this.educatorId])
      });
    }
  }

  loadEducator() {
    this.loading = true;
    this.educatorService.getEducator(this.educatorId).subscribe({
      next: (educator) => {
        this.educator = educator;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading educator:', error);
        this.loading = false;
        const errorMessage = this.extractErrorMessage(error);
        Swal.fire({
          icon: 'error',
          title: this.translate.instant('MESSAGES.ERROR'),
          text: errorMessage
        }).then(() => {
          this.router.navigate(['/educators']);
        });
      }
    });
  }

  loadAssignedChildren() {
    this.http.get<ChildModel[]>(`${ApiConfig.ENDPOINTS.EDUCATORS}/${this.educatorId}/children`).subscribe({
      next: (children) => this.assignedChildren = children,
      error: (error) => console.error('Error loading assigned children:', error)
    });
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

  goBack() {
    this.router.navigate(['/educators']);
  }

  openAddChildModal() {
    this.showAddChildModal = true;
    this.loadAvailableChildren();
  }

  closeAddChildModal() {
    this.showAddChildModal = false;
    this.selectedChildId = null;
    this.searchTerm = '';
    this.filteredChildren = [];
  }

  loadAvailableChildren() {
    this.childrenService.loadChildren().subscribe({
      next: (children) => {
        const assignedIds = this.assignedChildren.map(c => c.id);
        this.availableChildren = children.filter(c => !assignedIds.includes(c.id));
        this.filteredChildren = [...this.availableChildren];
      },
      error: (error) => console.error('Error loading children:', error)
    });
  }

  filterChildren() {
    if (!this.searchTerm.trim()) {
      this.filteredChildren = [...this.availableChildren];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredChildren = this.availableChildren.filter(child =>
        `${child.firstName} ${child.lastName}`.toLowerCase().includes(term)
      );
    }
  }

  assignChildToEducator(childId?: number) {
    const idToAssign = childId || this.selectedChildId;
    if (!idToAssign) return;

    this.assigningChild = true;
    this.http.post(`${ApiConfig.ENDPOINTS.EDUCATORS}/${this.educatorId}/assign-child`, {
      childId: idToAssign
    }).subscribe({
      next: () => {
        this.assigningChild = false;
        this.closeAddChildModal();
        this.loadAssignedChildren();
        Swal.fire({
          icon: 'success',
          title: this.translate.instant('MESSAGES.SUCCESS'),
          text: this.translate.instant('EDUCATOR_DETAIL.CHILD_ASSIGNED_SUCCESS'),
          timer: 2000,
          showConfirmButton: false
        });
      },
      error: (error) => {
        this.assigningChild = false;
        console.error('Error assigning child:', error);
        const errorMessage = this.extractErrorMessage(error);
        Swal.fire({
          icon: 'error',
          title: this.translate.instant('MESSAGES.ERROR'),
          text: errorMessage
        });
      }
    });
  }

  removeChild(childId: number) {
    Swal.fire({
      title: this.translate.instant('COMMON.ARE_YOU_SURE'),
      text: this.translate.instant('EDUCATOR_DETAIL.REMOVE_CHILD_CONFIRM'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: this.translate.instant('COMMON.YES_REMOVE'),
      cancelButtonText: this.translate.instant('COMMON.CANCEL')
    }).then((result) => {
      if (result.isConfirmed) {
        this.http.delete(`${ApiConfig.ENDPOINTS.EDUCATORS}/${this.educatorId}/remove-child/${childId}`).subscribe({
          next: () => {
            this.loadAssignedChildren();
            Swal.fire({
              icon: 'success',
              title: this.translate.instant('MESSAGES.SUCCESS'),
              text: this.translate.instant('EDUCATOR_DETAIL.CHILD_REMOVED_SUCCESS'),
              timer: 2000,
              showConfirmButton: false
            });
          },
          error: (error) => {
            console.error('Error removing child:', error);
            const errorMessage = this.extractErrorMessage(error);
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

  viewChildDetails(childId: number) {
    this.router.navigate(['/children/detail', childId]);
  }

  /**
   * Extract user-friendly error message from HTTP error response
   */
  private extractErrorMessage(error: any): string {
    console.log('Full error object:', error); // Debug log to see actual error

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
      const errorMessage = error?.error?.message || error?.error || '';
      if (typeof errorMessage === 'string') {
        if (errorMessage.toLowerCase().includes('child')) {
          return this.translate.instant('ERRORS.CHILD_NOT_FOUND') || 'Child not found.';
        }
        if (errorMessage.toLowerCase().includes('teacher') || errorMessage.toLowerCase().includes('educator')) {
          return this.translate.instant('ERRORS.EDUCATOR_NOT_FOUND') || 'Educator not found.';
        }
      }
      return this.translate.instant('ERRORS.NOT_FOUND') || 'The requested resource was not found.';
    }

    // Handle 400 Bad Request with specific messages
    if (error?.status === 400) {
      const errorBody = error?.error;

      // Handle string error directly from backend
      if (typeof errorBody === 'string') {
        return this.mapBackendErrorMessage(errorBody);
      }

      // Handle object with message property
      if (errorBody?.message) {
        return this.mapBackendErrorMessage(errorBody.message);
      }

      // Handle .NET validation errors format
      if (errorBody?.errors) {
        const errorMessages: string[] = [];
        for (const key in errorBody.errors) {
          if (errorBody.errors.hasOwnProperty(key)) {
            const messages = errorBody.errors[key];
            if (Array.isArray(messages)) {
              errorMessages.push(...messages);
            }
          }
        }
        if (errorMessages.length > 0) {
          return errorMessages.join('. ');
        }
      }

      // Handle title property (ASP.NET problem details)
      if (errorBody?.title) {
        return errorBody.title;
      }
    }

    if (error?.error) {
      // Handle custom error message format
      if (error.error.message) {
        return this.mapBackendErrorMessage(error.error.message);
      }

      // Handle title property
      if (error.error.title) {
        return error.error.title;
      }

      // Handle string error
      if (typeof error.error === 'string') {
        return this.mapBackendErrorMessage(error.error);
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
      return `${this.translate.instant('MESSAGES.ERROR')} (Error ${error.status})`;
    }

    return this.translate.instant('MESSAGES.GENERIC_ERROR') || 'An unexpected error occurred. Please try again.';
  }

  /**
   * Map backend error messages to user-friendly translated messages
   */
  private mapBackendErrorMessage(message: string): string {
    if (!message) return '';

    const lowerMessage = message.toLowerCase();

    // Handle "Teacher has no active classes" error
    if (lowerMessage.includes('no active classes')) {
      return this.translate.instant('ERRORS.NO_ACTIVE_CLASSES') ||
        'This educator has no active classes. Please assign them to a class first before adding children.';
    }

    // Handle "Child is already assigned" error
    if (lowerMessage.includes('already assigned') || lowerMessage.includes('already enrolled')) {
      return this.translate.instant('ERRORS.CHILD_ALREADY_ASSIGNED') ||
        'This child is already assigned to this educator\'s class.';
    }

    // Handle "Child not found" error
    if (lowerMessage.includes('child not found')) {
      return this.translate.instant('ERRORS.CHILD_NOT_FOUND') || 'Child not found.';
    }

    // Handle "Teacher not found" error
    if (lowerMessage.includes('teacher not found') || lowerMessage.includes('educator not found')) {
      return this.translate.instant('ERRORS.EDUCATOR_NOT_FOUND') || 'Educator not found.';
    }

    // Return original message if no mapping found
    return message;
  }
}
