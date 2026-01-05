import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { ParentService } from '../parent.service';
import { ParentModel } from '../parent.interface';
import { FeeService } from '../../fee/fee.service';
import { CreateFeeModel } from '../../fee/fee.interface';
import { TitlePage, TitleAction, Breadcrumb } from '../../../shared/layouts/title-page/title-page';
import { ChildrenService } from '../../children/children.service';
import { ChildModel } from '../../children/children.interface';
import Swal from 'sweetalert2';
import { AuthService } from '../../../core/services/auth';
import { Location } from '@angular/common';
import { ParentChildHeaderComponent } from '../../../shared/components/parent-child-header/parent-child-header.component';
import { PageTitleService } from '../../../core/services/page-title.service';

@Component({
  selector: 'app-parent-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, TitlePage, ParentChildHeaderComponent, TranslateModule],
  templateUrl: './parent-detail.html',
  styleUrls: ['./parent-detail.scss']
})
export class ParentDetail implements OnInit, OnDestroy {
  parent: ParentModel | null = null;
  // index of the currently displayed child in the children column
  currentChildIndex = 0;
  loading = true;
  error: string | null = null;
  currentUserProfilePicture: string = '';
  showAddFee = false;
  showAddChildModal = false;
  showSelectChildModal = false;
  availableChildren: ChildModel[] = [];
  filteredChildren: ChildModel[] = [];
  searchTerm = '';
  selectedChildId: number | null = null;
  savingFee = false;
  linkingChild = false;
  isAdmin = true; // TODO: Get from auth service
  breadcrumbs: Breadcrumb[] = [];
  private langChangeSub?: Subscription;

  get isParent(): boolean {
    return this.authService.isParent();
  }
  newFee: CreateFeeModel = {
    childId: 0,
    amount: 0,
    description: '',
    dueDate: '',
    feeType: 'monthly'
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private parentService: ParentService,
    private feeService: FeeService,
    private childrenService: ChildrenService,
    private authService: AuthService,
    private location: Location,
    private translate: TranslateService,
    private pageTitleService: PageTitleService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.currentUserProfilePicture = user?.profilePicture || '';
    this.pageTitleService.setTitle(this.translate.instant('PARENTS.PARENT_DETAILS'));
    this.setupBreadcrumbs();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadParentDetails(+id);
    }

    this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      this.pageTitleService.setTitle(this.translate.instant('PARENTS.PARENT_DETAILS'));
      this.setupBreadcrumbs();
    });
  }

  ngOnDestroy(): void {
    this.langChangeSub?.unsubscribe();
  }

  private setupBreadcrumbs(): void {
    this.breadcrumbs = [
      { label: this.translate.instant('BREADCRUMBS.DASHBOARD'), url: '/dashboard' },
      { label: this.translate.instant('PARENTS.TITLE'), url: '/parents' },
      { label: this.parent?.firstName ? `${this.parent.firstName} ${this.parent.lastName}` : this.translate.instant('PARENTS.PARENT_DETAILS') }
    ];
  }

  // move to next child (wraps around)
  nextChild(): void {
    if (!this.parent?.children || this.parent.children.length === 0) return;
    this.currentChildIndex = (this.currentChildIndex + 1) % this.parent.children.length;
  }

  // move to previous child (wraps around)
  prevChild(): void {
    if (!this.parent?.children || this.parent.children.length === 0) return;
    this.currentChildIndex = (this.currentChildIndex - 1 + this.parent.children.length) % this.parent.children.length;
  }

  // current child getter
  get currentChild(): ChildModel | null {
    if (!this.parent?.children || this.parent.children.length === 0) return null;
    return this.parent.children[this.currentChildIndex] || null;
  }

  loadParentDetails(id: number): void {
    this.loading = true;
    this.parentService.getParentWithChildren(id).subscribe({
      next: (parent) => {
        this.parent = parent;
        if (this.isParent && this.currentUserProfilePicture) {
          this.parent.profilePicture = this.currentUserProfilePicture;
        }
        
        // Calculate age for each child
        if (this.parent?.children) {
          this.parent.children = this.parent.children.map(child => ({
            ...child,
            age: this.calculateAge(child.dateOfBirth)
          }));
          // reset current child index when loading children
          this.currentChildIndex = 0;
        }
        
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Failed to load parent details';
        this.loading = false;
        console.error('Error loading parent:', error);
      }
    });
  }

  calculateAge(dateOfBirth: string): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  formatDate(dateString?: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  goBack(): void {
    this.router.navigate(['/parents']);
  }

  editParent(): void {
    console.log('editParent() called, parent:', this.parent?.id, 'isParent:', this.isParent);
    if (this.parent?.id) {
      if (this.isParent) {
        console.log('Navigating to /profile/edit');
        this.router.navigate(['/profile/edit']).then(
          (success) => console.log('Navigation success:', success),
          (error) => console.error('Navigation error:', error)
        );
      } else {
        console.log('Navigating to /parents/edit/', this.parent.id);
        this.router.navigate(['/parents/edit', this.parent.id]);
      }
    } else {
      console.log('editParent() - no parent id');
    }
  }

  viewChildDetails(childId: number): void {
    this.router.navigate(['/children/detail', childId]);
  }
  addChild(): void {
    Swal.fire({
      title: this.translate.instant('PARENTS.ADD_CHILD'),
      text: this.translate.instant('PARENTS.CHOOSE_OPTION'),
      icon: 'question',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: `<i class="bi bi-plus-square"></i> ${this.translate.instant('PARENTS.CREATE_NEW_CHILD')}`,
      denyButtonText: `<i class="bi bi-list-ul"></i> ${this.translate.instant('PARENTS.SELECT_EXISTING_CHILD')}`,
      cancelButtonText: this.translate.instant('COMMON.CANCEL'),
      confirmButtonColor: '#3085d6',
      denyButtonColor: '#6c757d',
      cancelButtonColor: '#d33',
      customClass: {
        confirmButton: 'btn btn-primary me-2',
        denyButton: 'btn btn-secondary me-2',
        cancelButton: 'btn btn-outline-secondary btn-cancel-global'
      },
      buttonsStyling: false
    }).then((result) => {
      if (result.isConfirmed) {
        this.createNewChild();
      } else if (result.isDenied) {
        this.selectExistingChild();
      }
    });
  }

  selectExistingChild(): void {
    this.loadAvailableChildren();
    this.showSelectChildModal = true;
  }

  loadAvailableChildren(): void {
    this.childrenService.loadChildren().subscribe({
      next: (children) => {
        const currentChildIds = this.parent?.children?.map(c => c.id).filter(id => id !== undefined) || [];
        this.availableChildren = children.filter(c => c.id && !currentChildIds.includes(c.id));
        this.filteredChildren = [...this.availableChildren];
      },
      error: () => {
        Swal.fire(this.translate.instant('MESSAGES.ERROR'), this.translate.instant('PARENTS.FAILED_LOAD_CHILDREN'), 'error');
      }
    });
  }

  filterChildren(): void {
    const term = this.searchTerm.toLowerCase();
    this.filteredChildren = this.availableChildren.filter(child =>
      `${child.firstName} ${child.lastName}`.toLowerCase().includes(term)
    );
  }

  linkChildToParent(childId: number): void {
    if (!this.parent?.id) return;
    this.linkingChild = true;

    this.childrenService.getChild(childId).subscribe({
      next: (child) => {
        const updatedChild = { ...child, parentId: this.parent!.id! };
        this.childrenService.updateChild(updatedChild).subscribe({
          next: () => {
            this.linkingChild = false;
            this.showSelectChildModal = false;
            this.loadParentDetails(this.parent!.id!);
            Swal.fire(this.translate.instant('MESSAGES.SUCCESS'), this.translate.instant('PARENTS.CHILD_LINKED_SUCCESS'), 'success');
          },
          error: () => {
            this.linkingChild = false;
            Swal.fire(this.translate.instant('MESSAGES.ERROR'), this.translate.instant('PARENTS.FAILED_LINK_CHILD'), 'error');
          }
        });
      },
      error: () => {
        this.linkingChild = false;
        Swal.fire(this.translate.instant('MESSAGES.ERROR'), this.translate.instant('PARENTS.FAILED_LOAD_CHILD_DETAILS'), 'error');
      }
    });
  }

  closeSelectChildModal(): void {
    this.showSelectChildModal = false;
    this.searchTerm = '';
  }

  createNewChild(): void {
    this.showAddChildModal = false;
    this.router.navigate(['/children/add'], { queryParams: { parentId: this.parent?.id } });
  }

  addFeeForChild(childId: number, childName: string): void {
    this.selectedChildId = childId;
    this.newFee = {
      childId: childId,
      amount: 0,
      description: `Monthly fee for ${childName}`,
      dueDate: this.getNextMonthDate(),
      feeType: 'monthly'
    };
    this.showAddFee = true;
  }

  saveFee(): void {
    this.savingFee = true;
    this.feeService.createFee(this.newFee).subscribe({
      next: () => {
        this.savingFee = false;
        this.showAddFee = false;
        Swal.fire(this.translate.instant('MESSAGES.SUCCESS'), this.translate.instant('PARENTS.FEE_ADDED_SUCCESS'), 'success');
      },
      error: () => {
        this.savingFee = false;
        Swal.fire(this.translate.instant('MESSAGES.ERROR'), this.translate.instant('PARENTS.FEE_ADD_ERROR'), 'error');
      }
    });
  }

  cancelAddFee(): void {
    this.showAddFee = false;
    this.selectedChildId = null;
  }
  back() {
    this.location.back();
  }

  logout(): void {
    this.authService.logout();
  }
  removeChildFromParent(childId: number, childName: string): void {
    if (!this.parent?.id) return;

    Swal.fire({
      title: this.translate.instant('COMMON.ARE_YOU_SURE'),
      text: this.translate.instant('PARENTS.REMOVE_CHILD_CONFIRM', { name: childName }),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: this.translate.instant('COMMON.YES_REMOVE'),
      cancelButtonText: this.translate.instant('COMMON.CANCEL')
    }).then((result) => {
      if (result.isConfirmed) {
        this.childrenService.deleteChild(childId).subscribe({
          next: () => {
            this.loadParentDetails(this.parent!.id!);
            Swal.fire(this.translate.instant('COMMON.REMOVED'), this.translate.instant('PARENTS.CHILD_REMOVED_SUCCESS'), 'success');
          },
          error: () => {
            Swal.fire(this.translate.instant('MESSAGES.ERROR'), this.translate.instant('PARENTS.FAILED_REMOVE_CHILD'), 'error');
          }
        });
      }
    });
  }

  toggleParentStatus(): void {
    if (!this.parent) return;

    const isActive = this.parent.isActive;
    const actionText = isActive
      ? this.translate.instant('PARENTS.DEACTIVATE_PARENT_CONFIRM')
      : this.translate.instant('PARENTS.ACTIVATE_PARENT_CONFIRM');
    const confirmText = isActive
      ? this.translate.instant('PARENTS.YES_DEACTIVATE')
      : this.translate.instant('PARENTS.YES_ACTIVATE');

    Swal.fire({
      title: this.translate.instant('COMMON.ARE_YOU_SURE'),
      text: actionText,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: confirmText,
      cancelButtonText: this.translate.instant('COMMON.CANCEL')
    }).then((result) => {
      if (result.isConfirmed) {
        const request = this.parent!.isActive
          ? this.parentService.deactivateParent(this.parent!.id!)
          : this.parentService.activateParent(this.parent!.id!);

        request.subscribe({
          next: () => {
            if (this.parent) {
              this.parent.isActive = !this.parent.isActive;
              this.updateChildrenStatus(this.parent.isActive);
            }
            const successMsg = isActive
              ? this.translate.instant('PARENTS.PARENT_DEACTIVATED_SUCCESS')
              : this.translate.instant('PARENTS.PARENT_ACTIVATED_SUCCESS');
            Swal.fire(this.translate.instant('MESSAGES.SUCCESS'), successMsg, 'success');
          },
          error: () => {
            const errorMsg = isActive
              ? this.translate.instant('PARENTS.FAILED_DEACTIVATE_PARENT')
              : this.translate.instant('PARENTS.FAILED_ACTIVATE_PARENT');
            Swal.fire(this.translate.instant('MESSAGES.ERROR'), errorMsg, 'error');
          }
        });
      }
    });
  }

  private getNextMonthDate(): string {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date.toISOString().split('T')[0];
  }

  private updateChildrenStatus(isActive: boolean): void {
    if (!this.parent?.children) return;
    
    this.parent.children.forEach(child => {
      if (child.id) {
        const updatedChild = { ...child, isActive, parentId: this.parent!.id! };
        this.childrenService.updateChild(updatedChild).subscribe({
          next: () => {
            child.isActive = isActive;
          },
          error: (error) => {
            console.error(`Failed to update child ${child.firstName} status:`, error);
          }
        });
      }
    });
  }

  getActions(): TitleAction[] {
    const actions: TitleAction[] = [
      {
        label: this.translate.instant('COMMON.BACK'),
        icon: 'bi bi-arrow-left',
        class: 'btn-outline-secondary btn-cancel-global',
        action: () => this.goBack()
      }
    ];

    if (this.parent) {
      if (this.isAdmin) {
        actions.push({
          label: this.parent.isActive ? this.translate.instant('COMMON.DEACTIVATE') : this.translate.instant('COMMON.ACTIVATE'),
          icon: this.parent.isActive ? 'bi bi-pause-circle' : 'bi bi-play',
          class: this.parent.isActive ? 'btn-view-global-2' : 'btn-edit-global-2',
          action: () => this.toggleParentStatus()
        });
      }
      actions.push({
        label: this.translate.instant('COMMON.EDIT'),
        icon: 'bi bi-pencil-square me-2',
        class: 'btn-edit-global-2',
        action: () => this.editParent()
      });
    }

    return actions;
  }
}