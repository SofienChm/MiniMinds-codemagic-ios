import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgSelectModule } from '@ng-select/ng-select';
import { EventModel } from './event.interface';
import { EventService } from './event.service';
import { AuthService } from '../../core/services/auth';
import { TitlePage, TitleAction, Breadcrumb, DropdownItem } from '../../shared/layouts/title-page/title-page';
import { ParentChildHeaderSimpleComponent } from '../../shared/components/parent-child-header-simple/parent-child-header-simple.component';
import { ExportUtil } from '../../shared/utils/export.util';
import { AppCurrencyPipe } from '../../core/services/currency/currency.pipe';
import { PageTitleService } from '../../core/services/page-title.service';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-event',
  standalone: true,
  imports: [CommonModule, FormsModule, TitlePage, ParentChildHeaderSimpleComponent, TranslateModule, NgSelectModule, AppCurrencyPipe],
  templateUrl: './event.html',
  styleUrl: './event.scss'
})
export class Event implements OnInit, OnDestroy {
  private langChangeSub?: Subscription;
  private eventsSub?: Subscription;
  events: EventModel[] = [];
  filteredEvents: EventModel[] = [];
  displayedEvents: EventModel[] = [];
  loading = false;
  userRole: string | null = null;
  viewMode: 'grid' | 'list' = 'grid';
  sortBy: string = 'created-desc';
  showSortMenu = false;
  showExportDropdown = false;
  eventsPerPage = 5;
  currentPage = 1;
  searchTerm: string = '';

  breadcrumbs: Breadcrumb[] = [];
  titleActions: TitleAction[] = [];

  // Options for ng-select
  sortOptions: { value: string; label: string; icon: string }[] = [];

  get isParent(): boolean {
    return this.authService.isParent();
  }

  constructor(
    private eventService: EventService,
    private authService: AuthService,
    private router: Router,
    private translate: TranslateService,
    private pageTitleService: PageTitleService
  ) {}

  ngOnInit() {
    this.pageTitleService.setTitle(this.translate.instant('EVENTS.TITLE'));
    this.userRole = this.authService.getUserRole();
    this.updateTranslatedContent();
    this.loadEvents();
    this.eventsSub = this.eventService.events$.subscribe(events => {
      this.events = events;
    });

    this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      this.updateTranslatedContent();
      this.pageTitleService.setTitle(this.translate.instant('EVENTS.TITLE'));
    });
  }

  ngOnDestroy(): void {
    this.langChangeSub?.unsubscribe();
    this.eventsSub?.unsubscribe();
  }

  private updateTranslatedContent(): void {
    this.initBreadcrumbs();
    this.initSortOptions();
    this.setupTitleActions();
  }

  private initBreadcrumbs(): void {
    this.breadcrumbs = [
      { label: this.translate.instant('BREADCRUMBS.DASHBOARD') },
      { label: this.translate.instant('BREADCRUMBS.EVENTS') }
    ];
  }

  private initSortOptions(): void {
    this.sortOptions = [
      { value: 'name-asc', label: this.translate.instant('EVENTS.SORT_AZ'), icon: 'bi-sort-alpha-down' },
      { value: 'name-desc', label: this.translate.instant('EVENTS.SORT_ZA'), icon: 'bi-sort-alpha-up' },
      { value: 'price-asc', label: this.translate.instant('EVENTS.SORT_PRICE_LOW'), icon: 'bi-sort-numeric-down' },
      { value: 'price-desc', label: this.translate.instant('EVENTS.SORT_PRICE_HIGH'), icon: 'bi-sort-numeric-up' },
      { value: 'created-desc', label: this.translate.instant('EVENTS.SORT_NEWEST'), icon: 'bi-clock-history' },
      { value: 'created-asc', label: this.translate.instant('EVENTS.SORT_OLDEST'), icon: 'bi-clock' }
    ];
  }

  setupTitleActions() {
    this.titleActions = [
      {
        label: this.translate.instant('EVENTS.EXPORT'),
        class: 'btn btn-light me-2',
        action: () => {},
        dropdown: {
          items: [
            {
              label: this.translate.instant('EVENTS.EXPORT_PDF'),
              icon: 'bi bi-file-earmark-pdf',
              action: () => this.exportToPDF()
            },
            {
              label: this.translate.instant('EVENTS.EXPORT_EXCEL'),
              icon: 'bi bi-file-earmark-excel',
              action: () => this.exportToExcel()
            }
          ]
        }
      }
    ];

    if (this.authService.isAdmin() || this.authService.isTeacher()) {
      this.titleActions.push({
        label: this.translate.instant('EVENTS.ADD_EVENT'),
        class: 'btn-add-global-2',
        action: () => this.router.navigate(['/events/add'])
      });
    }
  }

  loadEvents() {
    this.loading = true;
    this.eventService.loadEvents().subscribe({
      next: (events) => {
        // For Parent role, filter out expired events (additional frontend safety)
        if (this.isParent) {
          const now = new Date();
          this.events = events.filter(event => new Date(event.time) > now);
        } else {
          this.events = events;
        }
        this.applyFilter();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading events:', error);
        this.loading = false;
        Swal.fire({
          icon: 'error',
          title: this.translate.instant('MESSAGES.ERROR'),
          text: this.translate.instant('EVENTS.LOAD_ERROR')
        });
      }
    });
  }

  editEvent(event: EventModel) {
    this.router.navigate(['/events/edit', event.id]);
  }

  deleteEvent(id: number) {
    Swal.fire({
      title: this.translate.instant('EVENTS.DELETE_CONFIRM_TITLE'),
      text: this.translate.instant('EVENTS.DELETE_CONFIRM_TEXT'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: this.translate.instant('EVENTS.YES_DELETE'),
      cancelButtonText: this.translate.instant('MESSAGES.CANCEL')
    }).then((result) => {
      if (result.isConfirmed) {
        this.eventService.deleteEvent(id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: this.translate.instant('MESSAGES.SUCCESS'),
              text: this.translate.instant('EVENTS.DELETE_SUCCESS')
            });
            this.loadEvents();
          },
          error: (error) => {
            console.error('Error deleting event:', error);
            Swal.fire({
              icon: 'error',
              title: this.translate.instant('MESSAGES.ERROR'),
              text: this.translate.instant('EVENTS.DELETE_ERROR')
            });
          }
        });
      }
    });
  }

  canEdit(): boolean {
    return this.authService.isAdmin() || this.authService.isTeacher();
  }

  canDelete(): boolean {
    return this.authService.isAdmin();
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

  applyFilter() {
    let filtered = [...this.events];

    // Apply search filter
    if (this.searchTerm.trim()) {
      filtered = filtered.filter(event =>
        event.name.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    if (this.isParent) {
      filtered.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    } else {
      switch (this.sortBy) {
        case 'name-asc':
          filtered.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case 'name-desc':
          filtered.sort((a, b) => b.name.localeCompare(a.name));
          break;
        case 'price-asc':
          filtered.sort((a, b) => a.price - b.price);
          break;
        case 'price-desc':
          filtered.sort((a, b) => b.price - a.price);
          break;
        case 'created-desc':
          filtered.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
          break;
        case 'created-asc':
          filtered.sort((a, b) => new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime());
          break;
      }
    }

    this.filteredEvents = filtered;
    this.currentPage = 1;
    this.updateDisplayedEvents();
  }

  applySort() {
    this.applyFilter();
  }

  updateDisplayedEvents() {
    const endIndex = this.currentPage * this.eventsPerPage;
    this.displayedEvents = this.filteredEvents.slice(0, endIndex);
  }

  loadMore() {
    this.currentPage++;
    this.updateDisplayedEvents();
  }

  hasMoreEvents(): boolean {
    return this.displayedEvents.length < this.filteredEvents.length;
  }

  getSortLabel(): string {
    const option = this.sortOptions.find(o => o.value === this.sortBy);
    return option ? option.label : this.translate.instant('EVENTS.SORT_NEWEST');
  }

  viewParticipants(event: EventModel) {
    this.router.navigate(['/events', event.id, 'participants']);
  }

  viewEventDetail(event: EventModel) {
    this.router.navigate(['/events/detail', event.id]);
  }

  isEventActive(event: EventModel): boolean {
    const eventDate = new Date(event.time);
    const now = new Date();
    return eventDate > now;
  }

  getEventStatus(event: EventModel): string {
    return this.isEventActive(event)
      ? this.translate.instant('EVENTS.STATUS_ACTIVE')
      : this.translate.instant('EVENTS.STATUS_EXPIRED');
  }

  getEventStatusClass(event: EventModel): string {
    return this.isEventActive(event) ? 'bg-success' : 'bg-danger';
  }

  toggleExportDropdown() {
    this.showExportDropdown = !this.showExportDropdown;
  }

  exportToPDF(): void {
    const data = this.filteredEvents.map(event => ({
      'Name': event.name,
      'Type': event.type,
      'Price': `$${event.price}`,
      'Age Range': `${event.ageFrom}-${event.ageTo} years`,
      'Capacity': event.capacity,
      'Date & Time': new Date(event.time).toLocaleString(),
      'Status': this.getEventStatus(event),
      'Participants': event.participants?.length || 0
    }));

    ExportUtil.exportToPDF(data, this.translate.instant('EVENTS.REPORT_TITLE'));
  }

  exportToExcel(): void {
    const data = this.filteredEvents.map(event => ({
      'Name': event.name,
      'Type': event.type,
      'Price': `$${event.price}`,
      'Age Range': `${event.ageFrom}-${event.ageTo} years`,
      'Capacity': event.capacity,
      'Date & Time': new Date(event.time).toLocaleString(),
      'Status': this.getEventStatus(event),
      'Participants': event.participants?.length || 0
    }));

    ExportUtil.exportToExcel(data, this.translate.instant('EVENTS.REPORT_TITLE'));
  }

  // TrackBy function for ngFor performance optimization
  trackById(index: number, item: EventModel): number | undefined {
    return item.id;
  }
}
