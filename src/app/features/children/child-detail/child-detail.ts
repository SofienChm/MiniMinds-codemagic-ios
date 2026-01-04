import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ChildModel } from '../children.interface';
import { ChildrenService } from '../children.service';
import { ParentService } from '../../parent/parent.service';
import { ParentModel } from '../../parent/parent.interface';
import { AuthService } from '../../../core/services/auth';
import { TitlePage, TitleAction, Breadcrumb } from '../../../shared/layouts/title-page/title-page';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';
import { ApiConfig } from '../../../core/config/api.config';
import { ParentChildHeaderComponent } from '../../../shared/components/parent-child-header/parent-child-header.component';
import { Location } from '@angular/common';

@Component({
  selector: 'app-child-detail',
  imports: [CommonModule, TitlePage, FormsModule, ParentChildHeaderComponent, TranslateModule],
  standalone: true,
  templateUrl: './child-detail.html',
  styleUrl: './child-detail.scss'
})
export class ChildDetail implements OnInit {
  child: ChildModel | null = null;
  loading = false;
  childId: number = 0;
  showAddParentModal = false;
  availableParents: ParentModel[] = [];
  selectedParentId: number | null = null;
  relationshipType: string = 'Parent';
  isPrimaryContact: boolean = false;
  currentParentIndex: number = 0;

  breadcrumbs: Breadcrumb[] = [];
  get isParent(): boolean {
      return this.authService.isParent();
  }

  get isActive(): boolean {
    return this.child?.isActive ?? true;
  }

  titleActions: TitleAction[] = [];

  constructor(
    private childrenService: ChildrenService,
    private parentService: ParentService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private location: Location,
    private translate: TranslateService
  ) {}

  ngOnInit() {
    this.childId = Number(this.route.snapshot.paramMap.get('id'));
    this.initBreadcrumbs();
    this.setupTitleActions();
    this.loadChild();

    // Update translations when language changes
    this.translate.onLangChange.subscribe(() => {
      this.initBreadcrumbs();
      this.setupTitleActions();
    });
  }

  private initBreadcrumbs(): void {
    this.breadcrumbs = [
      { label: this.translate.instant('BREADCRUMBS.CHILDREN'), url: '/children' },
      { label: this.translate.instant('CHILD_DETAIL.BREADCRUMB') }
    ];
  }

  back() {
    this.location.back();
  }
  setupTitleActions() {
    this.titleActions = [
      {
        label: this.translate.instant('CHILD_DETAIL.BACK_TO_CHILDREN'),
        class: 'btn-cancel-2',
        icon: 'bi bi-arrow-left',
        action: () => this.goBack()
      }
    ];

    if (this.authService.isAdmin() || this.authService.isTeacher()) {
      this.titleActions.push({
        label: this.translate.instant('CHILD_DETAIL.EDIT_CHILD'),
        class: 'btn-edit-global-2',
        icon: 'bi bi-pencil-square',
        action: () => this.router.navigate(['/children/edit', this.childId])
      });
    }
  }

  loadChild() {
    this.loading = true;
    this.childrenService.getChild(this.childId).subscribe({
      next: (child) => {
        this.child = child;
        console.log('Child loaded:', child);
        console.log('Parent:', child.parent);
        console.log('Parent profilePicture:', child.parent?.profilePicture);
        console.log('ChildParents:', child.childParents);
        this.currentParentIndex = 0;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading child:', error);
        this.loading = false;
        this.router.navigate(['/children']);
      }
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

  getProfilePicture(picture: string | undefined | null, defaultPicture: string = 'assets/default-avatar.svg'): string {
    return picture && picture.trim() !== '' ? picture : defaultPicture;
  }

  goBack() {
    this.router.navigate(['/children']);
  }

  openAddParentModal() {
    this.showAddParentModal = true;
    this.loadAvailableParents();
  }

  closeAddParentModal() {
    this.showAddParentModal = false;
    this.selectedParentId = null;
    this.relationshipType = 'Parent';
    this.isPrimaryContact = false;
  }

  loadAvailableParents() {
    this.parentService.loadParents().subscribe({
      next: (parents) => {
        const existingParentIds = this.child?.childParents?.map(cp => cp.parentId) || [];
        this.availableParents = parents.filter(p => !existingParentIds.includes(p.id!));
      },
      error: (error) => console.error('Error loading parents:', error)
    });
  }

  addParentToChild() {
    if (!this.selectedParentId || !this.child?.id) return;

    const payload = {
      childId: this.child.id,
      parentId: this.selectedParentId,
      relationshipType: this.relationshipType,
      isPrimaryContact: this.isPrimaryContact
    };

    this.http.post(`${ApiConfig.ENDPOINTS.CHILDREN}/add-parent`, payload).subscribe({
      next: () => {
        this.closeAddParentModal();
        this.loadChild();
        Swal.fire({
          icon: 'success',
          title: this.translate.instant('MESSAGES.SUCCESS'),
          text: this.translate.instant('CHILD_DETAIL.PARENT_ADDED_SUCCESS'),
          timer: 2000,
          showConfirmButton: false
        });
      },
      error: (error) => {
        console.error('Error adding parent:', error);
        Swal.fire({
          icon: 'error',
          title: this.translate.instant('MESSAGES.ERROR'),
          text: this.translate.instant('CHILD_DETAIL.PARENT_ADD_ERROR')
        });
      }
    });
  }

  removeParent(childParentId: number) {
    Swal.fire({
      title: this.translate.instant('CHILD_DETAIL.CONFIRM_REMOVE_TITLE'),
      text: this.translate.instant('CHILD_DETAIL.CONFIRM_REMOVE_TEXT'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: this.translate.instant('CHILD_DETAIL.YES_REMOVE'),
      cancelButtonText: this.translate.instant('COMMON.CANCEL')
    }).then((result) => {
      if (result.isConfirmed) {
        this.http.delete(`${ApiConfig.ENDPOINTS.CHILDREN}/remove-parent/${childParentId}`).subscribe({
          next: () => {
            this.loadChild();
            Swal.fire({
              icon: 'success',
              title: this.translate.instant('CHILD_DETAIL.REMOVED_TITLE'),
              text: this.translate.instant('CHILD_DETAIL.PARENT_REMOVED_SUCCESS'),
              timer: 2000,
              showConfirmButton: false
            });
          },
          error: (error) => {
            console.error('Error removing parent:', error);
            Swal.fire({
              icon: 'error',
              title: this.translate.instant('MESSAGES.ERROR'),
              text: this.translate.instant('CHILD_DETAIL.PARENT_REMOVE_ERROR')
            });
          }
        });
      }
    });
  }

  viewParentDetails(parentId: number) {
    this.router.navigate(['/parents/detail', parentId]);
  }

  openAddFeeModal() {
    this.router.navigate(['/fees/create'], { queryParams: { childId: this.childId } });
  }

  navigateToParentDetail() {
    if (this.child?.parent?.id) {
      this.router.navigate(['/parents/detail', this.child.parent.id]);
    }
  }

  editChild() {
    this.router.navigate(['/children/edit', this.childId]);
  }

  get currentChildParent() {
    if (!this.child?.childParents || this.child.childParents.length === 0) return null;
    const idx = Math.max(0, Math.min(this.currentParentIndex, this.child.childParents.length - 1));
    return this.child.childParents[idx];
  }

  nextParent() {
    if (!this.child?.childParents || this.child.childParents.length <= 1) return;
    this.currentParentIndex = (this.currentParentIndex + 1) % this.child.childParents.length;
  }

  prevParent() {
    if (!this.child?.childParents || this.child.childParents.length <= 1) return;
    this.currentParentIndex = (this.currentParentIndex - 1 + this.child.childParents.length) % this.child.childParents.length;
  }
}