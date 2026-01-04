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
        this.router.navigate(['/educators']);
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
      },
      error: (error) => {
        this.assigningChild = false;
        console.error('Error assigning child:', error);
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
          next: () => this.loadAssignedChildren(),
          error: (error) => console.error('Error removing child:', error)
        });
      }
    });
  }

  viewChildDetails(childId: number) {
    this.router.navigate(['/children/detail', childId]);
  }
}
