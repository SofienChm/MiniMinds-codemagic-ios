import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { ReclamationsService, Reclamation, ReclamationUser } from './reclamations.service';
import { AuthService } from '../../core/services/auth';
import { ParentChildHeaderSimpleComponent } from '../../shared/components/parent-child-header-simple/parent-child-header-simple.component';
import Swal from 'sweetalert2';
import { PageTitleService } from '../../core/services/page-title.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IonContent, IonRefresher, IonRefresherContent } from '@ionic/angular/standalone';
import { SimpleToastService } from '../../core/services/simple-toast.service';

@Component({
  selector: 'app-reclamations',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule, ParentChildHeaderSimpleComponent, TranslateModule, IonContent, IonRefresher, IonRefresherContent],
  templateUrl: './reclamations.component.html',
  styleUrls: ['./reclamations.component.scss']
})
export class ReclamationsComponent implements OnInit, OnDestroy {
  users: ReclamationUser[] = [];
  sentReclamations: Reclamation[] = [];
  receivedReclamations: Reclamation[] = [];
  selectedReclamation: Reclamation | null = null;
  showModal = false;
  showNewReclamationModal = false;
  newReclamation = {
    recipientId: '',
    subject: '',
    content: ''
  };
  responseText = '';
  currentUserId = '';
  activeTab: 'inbox' | 'sent' | 'important' | 'trash' | null = 'inbox';
  selectedReclamations: Reclamation[] = [];
  statusFilter: 'all' | 'open' | 'resolved' = 'all';
  showFilterMenu = false;

  constructor(
    private reclamationsService: ReclamationsService,
    public authService: AuthService,
    private pageTitleService: PageTitleService,
    private translateService: TranslateService,
    private route: ActivatedRoute,
    private simpleToastService: SimpleToastService
  ) {}

  ngOnInit(): void {
    this.pageTitleService.setTitle(this.translateService.instant('RECLAMATIONS_PAGE.TITLE'));
    this.currentUserId = this.getCurrentUserId();
    this.loadUsers();
    this.loadReclamationsAndCheckQueryParam();
    this.autoSelectAdminForParents();
  }

  private loadReclamationsAndCheckQueryParam(): void {
    // Load reclamations and then check if we need to auto-open one from query param
    let sentLoaded = false;
    let receivedLoaded = false;

    const checkAndOpenReclamation = () => {
      if (!sentLoaded || !receivedLoaded) return;

      // Check for id query parameter (from notification click)
      this.route.queryParams.subscribe(params => {
        const reclamationId = params['id'];
        if (reclamationId) {
          const id = parseInt(reclamationId, 10);
          // Try to find in received first, then sent
          let reclamation = this.receivedReclamations.find(r => r.id === id);
          if (reclamation) {
            this.activeTab = 'inbox';
            this.selectReclamation(reclamation);
          } else {
            reclamation = this.sentReclamations.find(r => r.id === id);
            if (reclamation) {
              this.activeTab = 'sent';
              this.selectReclamation(reclamation);
            }
          }
        }
      });
    };

    this.reclamationsService.getSentReclamations().subscribe({
      next: (reclamations) => {
        this.sentReclamations = reclamations;
        sentLoaded = true;
        checkAndOpenReclamation();
      },
      error: (err) => {
        console.error('Error loading sent reclamations:', err);
        sentLoaded = true;
        checkAndOpenReclamation();
      }
    });

    this.reclamationsService.getReceivedReclamations().subscribe({
      next: (reclamations) => {
        this.receivedReclamations = reclamations;
        receivedLoaded = true;
        checkAndOpenReclamation();
      },
      error: (err) => {
        console.error('Error loading received reclamations:', err);
        receivedLoaded = true;
        checkAndOpenReclamation();
      }
    });
  }

  private autoSelectAdminForParents(): void {
    if (this.authService.isParent()) {
      this.reclamationsService.getUsers().subscribe({
        next: (users) => {
          const admin = users.find(u => u.email === 'admin@daycare.com');
          if (admin) {
            this.newReclamation.recipientId = admin.id;
            console.log('Set recipientId to admin:', admin.id);
          } else {
            console.error('Admin user not found. Please ensure admin@daycare.com exists.');
          }
        },
        error: (err) => console.error('Error loading users:', err)
      });
    }
  }

  ngOnDestroy(): void {
  }

  private getCurrentUserId(): string {
    const token = localStorage.getItem('token');
    if (!token) return '';
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const claims = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
      return Array.isArray(claims) ? claims[claims.length - 1] : claims || '';
    } catch {
      return '';
    }
  }

  loadUsers(): void {
    this.reclamationsService.getUsers().subscribe({
      next: (users) => this.users = users,
      error: (err) => console.error('Error loading users:', err)
    });
  }

  loadReclamations(): void {
    this.reclamationsService.getSentReclamations().subscribe({
      next: (reclamations) => this.sentReclamations = reclamations,
      error: (err) => console.error('Error loading sent reclamations:', err)
    });
    
    this.reclamationsService.getReceivedReclamations().subscribe({
      next: (reclamations) => this.receivedReclamations = reclamations,
      error: (err) => console.error('Error loading received reclamations:', err)
    });
  }

  selectReclamation(reclamation: Reclamation): void {
    this.selectedReclamation = reclamation;
    this.showModal = true;
    this.showNewReclamationModal = false;
    this.activeTab = null;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedReclamation = null;
    this.activeTab = 'inbox';
  }

  openNewReclamationModal(): void {
    this.showNewReclamationModal = true;
    this.showModal = false;
    this.selectedReclamation = null;
    this.activeTab = null;
  }

  closeNewReclamationModal(): void {
    if (this.hasFormData()) {
      Swal.fire({
        title: this.translateService.instant('RECLAMATIONS_PAGE.UNSAVED_DATA_TITLE'),
        text: this.translateService.instant('RECLAMATIONS_PAGE.UNSAVED_DATA_CLOSE_TEXT'),
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#0e567d',
        cancelButtonColor: '#e5e7eb',
        confirmButtonText: this.translateService.instant('RECLAMATIONS_PAGE.YES_CLOSE'),
        cancelButtonText: this.translateService.instant('RECLAMATIONS_PAGE.CANCEL'),
        customClass: {
          confirmButton: 'swal-confirm-btn',
          cancelButton: 'swal-cancel-btn'
        }
      }).then((result) => {
        if (result.isConfirmed) {
          this.resetForm();
          this.showNewReclamationModal = false;
          this.activeTab = 'inbox';
        }
      });
    } else {
      this.showNewReclamationModal = false;
      this.activeTab = 'inbox';
    }
  }

  hasFormData(): boolean {
    return this.newReclamation.subject.trim() !== '' || this.newReclamation.content.trim() !== '';
  }

  resetForm(): void {
    this.newReclamation.subject = '';
    this.newReclamation.content = '';
  }

  send(): void {
    console.log('Send clicked', this.newReclamation);
    
    if (!this.newReclamation.recipientId || 
        !this.newReclamation.subject.trim() || 
        !this.newReclamation.content.trim()) {
      console.log('Validation failed', {
        recipientId: this.newReclamation.recipientId,
        subject: this.newReclamation.subject,
        content: this.newReclamation.content
      });
      return;
    }
    
    const { recipientId, subject, content } = this.newReclamation;
    
    this.reclamationsService.sendReclamation(recipientId, subject, content).subscribe({
      next: () => {
        console.log('Reclamation sent successfully');
        this.resetForm();
        this.loadReclamations();
        this.closeNewReclamationModal();

        this.simpleToastService.success(
          this.translateService.instant('RECLAMATIONS_PAGE.RECLAMATION_SENT_SUCCESS')
        );
      },
      error: (err) => {
        console.error('Error sending reclamation:', err);
        this.simpleToastService.error(
          this.translateService.instant('RECLAMATIONS_PAGE.RECLAMATION_SEND_FAILED')
        );
      }
    });
  }

  resolve(): void {
    if (!this.selectedReclamation || !this.responseText.trim()) return;
    
    this.reclamationsService.resolveReclamation(this.selectedReclamation.id!, this.responseText).subscribe({
      next: () => {
        this.responseText = '';
        this.loadReclamations();
        // Reload the selected reclamation to get updated status
        if (this.selectedReclamation) {
          this.reclamationsService.getReclamation(this.selectedReclamation.id!).subscribe({
            next: (reclamation) => this.selectedReclamation = reclamation,
            error: (err) => console.error('Error reloading reclamation:', err)
          });
        }
      },
      error: (err) => console.error('Error resolving reclamation:', err)
    });
  }

  formatDate(date: string | Date | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  getUserName(userId: string): string {
    const user = this.users.find(u => u.id === userId);
    return user ? user.name : 'Unknown User';
  }

  switchTab(tab: 'inbox' | 'sent' | 'important' | 'trash'): void {
    if (this.showNewReclamationModal && this.hasFormData()) {
      Swal.fire({
        title: this.translateService.instant('RECLAMATIONS_PAGE.UNSAVED_DATA_TITLE'),
        text: this.translateService.instant('RECLAMATIONS_PAGE.UNSAVED_DATA_TEXT'),
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#0e567d',
        cancelButtonColor: '#e5e7eb',
        confirmButtonText: this.translateService.instant('RECLAMATIONS_PAGE.YES_LEAVE'),
        cancelButtonText: this.translateService.instant('RECLAMATIONS_PAGE.CANCEL'),
        customClass: {
          confirmButton: 'swal-confirm-btn',
          cancelButton: 'swal-cancel-btn'
        }
      }).then((result) => {
        if (result.isConfirmed) {
          this.resetForm();
          this.activeTab = tab;
          this.showNewReclamationModal = false;
          this.showModal = false;
          this.selectedReclamation = null;
        }
      });
    } else {
      this.activeTab = tab;
      this.showNewReclamationModal = false;
      this.showModal = false;
      this.selectedReclamation = null;
    }
  }
  get isParent(): boolean {
      return this.authService.isParent();
  }

  get activeReclamations(): Reclamation[] {
    let reclamations: Reclamation[] = [];
    switch(this.activeTab) {
      case 'inbox': reclamations = this.receivedReclamations; break;
      case 'sent': reclamations = this.sentReclamations; break;
      case 'important': reclamations = []; break;
      case 'trash': reclamations = []; break;
      default: reclamations = [];
    }
    return this.filterByStatus(reclamations);
  }

  filterByStatus(reclamations: Reclamation[]): Reclamation[] {
    if (this.statusFilter === 'all') return reclamations;
    if (this.statusFilter === 'open') return reclamations.filter(r => !r.isResolved);
    if (this.statusFilter === 'resolved') return reclamations.filter(r => r.isResolved);
    return reclamations;
  }

  onFilterChange(): void {
    this.selectedReclamations = [];
  }

  toggleFilterMenu(): void {
    this.showFilterMenu = !this.showFilterMenu;
  }

  setFilter(filter: 'all' | 'open' | 'resolved'): void {
    this.statusFilter = filter;
    this.showFilterMenu = false;
    this.onFilterChange();
  }

  toggleSelection(reclamation: Reclamation): void {
    const index = this.selectedReclamations.findIndex(r => r.id === reclamation.id);
    if (index > -1) {
      this.selectedReclamations.splice(index, 1);
    } else {
      this.selectedReclamations.push(reclamation);
    }
  }

  isSelected(reclamation: Reclamation): boolean {
    return this.selectedReclamations.some(r => r.id === reclamation.id);
  }

  toggleSelectAll(event: any): void {
    if (event.target.checked) {
      this.selectedReclamations = [...this.activeReclamations];
    } else {
      this.selectedReclamations = [];
    }
  }

  isAllSelected(): boolean {
    return this.activeReclamations.length > 0 && this.selectedReclamations.length === this.activeReclamations.length;
  }

  deleteSelected(): void {
    if (this.selectedReclamations.length === 0) return;
    Swal.fire({
      title: this.translateService.instant('RECLAMATIONS_PAGE.DELETE_RECLAMATIONS_TITLE'),
      text: this.translateService.instant('RECLAMATIONS_PAGE.DELETE_RECLAMATIONS_TEXT', { count: this.selectedReclamations.length }),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#0e567d',
      cancelButtonColor: '#e5e7eb',
      confirmButtonText: this.translateService.instant('RECLAMATIONS_PAGE.YES_DELETE'),
      cancelButtonText: this.translateService.instant('RECLAMATIONS_PAGE.CANCEL'),
      customClass: {
        confirmButton: 'swal-confirm-btn',
        cancelButton: 'swal-cancel-btn'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        // TODO: Implement delete API call
        console.log('Deleting:', this.selectedReclamations);
        this.selectedReclamations = [];
      }
    });
  }

  markAsResolved(): void {
    if (this.selectedReclamations.length === 0) return;
    this.selectedReclamations.forEach(reclamation => {
      if (reclamation.id) {
        this.reclamationsService.resolveReclamation(reclamation.id, 'Marked as resolved').subscribe({
          next: () => {
            reclamation.isResolved = true;
            this.loadReclamations();
          },
          error: (err) => console.error('Error resolving reclamation:', err)
        });
      }
    });
    this.selectedReclamations = [];
  }

  markAsOpen(): void {
    if (this.selectedReclamations.length === 0) return;
    // TODO: Implement mark as open API call
    console.log('Marking as open:', this.selectedReclamations);
    this.selectedReclamations.forEach(r => r.isResolved = false);
    this.selectedReclamations = [];
  }

  getOpenCount(): number {
    return this.receivedReclamations.filter(r => !r.isResolved).length;
  }

  // Pull-to-refresh handler for Ionic refresher
  onRefresh(event?: any): void {
    this.loadReclamations();
    setTimeout(() => {
      // Complete the Ionic refresher
      if (event?.target) {
        event.target.complete();
      }
    }, 500);
  }
}