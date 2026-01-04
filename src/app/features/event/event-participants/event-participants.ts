import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgSelectModule } from '@ng-select/ng-select';
import { EventParticipant } from '../event-participants.interface';
import { EventParticipantsService } from '../event-participants.service';
import { ChildrenService } from '../../children/children.service';
import { EventService } from '../event.service';
import { AuthService } from '../../../core/services/auth';
import { ChildModel } from '../../children/children.interface';
import { EventModel } from '../event.interface';
import { TitlePage, Breadcrumb, TitleAction } from '../../../shared/layouts/title-page/title-page';
import { PageTitleService } from '../../../core/services/page-title.service';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-event-participants',
  standalone: true,
  imports: [CommonModule, FormsModule, TitlePage, TranslateModule, NgSelectModule],
  templateUrl: './event-participants.html',
  styleUrl: './event-participants.scss'
})
export class EventParticipants implements OnInit, OnDestroy {
  private langChangeSub?: Subscription;
  eventId: number = 0;
  event: EventModel | null = null;
  participants: EventParticipant[] = [];
  availableChildren: ChildModel[] = [];
  selectedChildId: number = 0;
  loading = false;
  saving = false;

  breadcrumbs: Breadcrumb[] = [];
  titleActions: TitleAction[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private participantsService: EventParticipantsService,
    private childrenService: ChildrenService,
    private eventService: EventService,
    public authService: AuthService,
    private translate: TranslateService,
    private pageTitleService: PageTitleService
  ) {}

  ngOnInit() {
    this.pageTitleService.setTitle(this.translate.instant('EVENT_PARTICIPANTS.TITLE'));
    this.eventId = Number(this.route.snapshot.paramMap.get('id'));
    this.initBreadcrumbs();
    this.loadEvent();
    this.loadParticipants();

    this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      this.pageTitleService.setTitle(this.translate.instant('EVENT_PARTICIPANTS.TITLE'));
      this.initBreadcrumbs();
      this.setupTitleActions();
    });
  }

  ngOnDestroy(): void {
    this.langChangeSub?.unsubscribe();
  }

  private initBreadcrumbs(): void {
    this.breadcrumbs = [
      { label: this.translate.instant('BREADCRUMBS.DASHBOARD') },
      { label: this.translate.instant('BREADCRUMBS.EVENTS'), url: '/events' },
      { label: this.translate.instant('EVENT_PARTICIPANTS.TITLE') }
    ];
  }

  loadEvent() {
    this.eventService.getEvent(this.eventId).subscribe({
      next: (event) => {
        this.event = event;
        this.setupTitleActions();
      },
      error: (error) => {
        console.error('Error loading event:', error);
        Swal.fire({
          icon: 'error',
          title: this.translate.instant('MESSAGES.ERROR'),
          text: this.translate.instant('EVENT_PARTICIPANTS.LOAD_EVENT_ERROR')
        });
      }
    });
  }

  setupTitleActions(): void {
    this.titleActions = [
      {
        label: this.translate.instant('EVENT_PARTICIPANTS.BACK_TO_EVENT'),
        icon: 'bi bi-arrow-left',
        class: 'btn-outline-primary',
        action: () => this.router.navigate(['/events', this.eventId])
      }
    ];
  }

  loadParticipants() {
    this.loading = true;
    this.participantsService.getEventParticipants(this.eventId).subscribe({
      next: (participants) => {
        this.participants = participants;
        this.loadAvailableChildren();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading participants:', error);
        this.loading = false;
        Swal.fire({
          icon: 'error',
          title: this.translate.instant('MESSAGES.ERROR'),
          text: this.translate.instant('EVENT_PARTICIPANTS.LOAD_ERROR')
        });
      }
    });
  }

  loadAvailableChildren() {
    this.childrenService.loadChildren().subscribe({
      next: (children) => {
        const registeredChildIds = this.participants.map(p => p.childId);
        this.availableChildren = children.filter(c => !registeredChildIds.includes(c.id!));
      },
      error: (error) => {
        console.error('Error loading children:', error);
      }
    });
  }

  addParticipant() {
    if (!this.selectedChildId) return;

    this.saving = true;
    const participant: EventParticipant = {
      eventId: this.eventId,
      childId: Number(this.selectedChildId)
    };

    this.participantsService.registerParticipant(participant).subscribe({
      next: () => {
        this.selectedChildId = 0;
        this.loadParticipants();
        this.saving = false;
        Swal.fire({
          icon: 'success',
          title: this.translate.instant('MESSAGES.SUCCESS'),
          text: this.translate.instant('EVENT_PARTICIPANTS.ADD_SUCCESS')
        });
      },
      error: (error) => {
        console.error('Error adding participant:', error);
        this.saving = false;
        Swal.fire({
          icon: 'error',
          title: this.translate.instant('MESSAGES.ERROR'),
          text: this.translate.instant('EVENT_PARTICIPANTS.ADD_ERROR')
        });
      }
    });
  }

  removeParticipant(participantId: number) {
    Swal.fire({
      title: this.translate.instant('EVENT_PARTICIPANTS.REMOVE_CONFIRM_TITLE'),
      text: this.translate.instant('EVENT_PARTICIPANTS.REMOVE_CONFIRM_TEXT'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: this.translate.instant('EVENT_PARTICIPANTS.YES_REMOVE'),
      cancelButtonText: this.translate.instant('MESSAGES.CANCEL')
    }).then((result) => {
      if (result.isConfirmed) {
        this.participantsService.removeParticipant(participantId).subscribe({
          next: () => {
            this.loadParticipants();
            Swal.fire({
              icon: 'success',
              title: this.translate.instant('MESSAGES.SUCCESS'),
              text: this.translate.instant('EVENT_PARTICIPANTS.REMOVE_SUCCESS')
            });
          },
          error: (error) => {
            console.error('Error removing participant:', error);
            Swal.fire({
              icon: 'error',
              title: this.translate.instant('MESSAGES.ERROR'),
              text: this.translate.instant('EVENT_PARTICIPANTS.REMOVE_ERROR')
            });
          }
        });
      }
    });
  }

  canAddParticipants(): boolean {
    return this.authService.isAdmin() || this.authService.isTeacher() || this.authService.isParent();
  }

  canRemoveParticipant(participant: EventParticipant): boolean {
    if (this.authService.isAdmin() || this.authService.isTeacher()) {
      return true;
    }

    if (this.authService.isParent()) {
      const parentId = this.authService.getParentId();
      return !!(participant.child?.parent?.id && parentId === participant.child.parent.id);
    }

    return false;
  }

  approveParticipant(participantId: number) {
    this.participantsService.approveParticipant(participantId).subscribe({
      next: () => {
        this.loadParticipants();
        Swal.fire({
          icon: 'success',
          title: this.translate.instant('MESSAGES.SUCCESS'),
          text: this.translate.instant('EVENT_PARTICIPANTS.APPROVE_SUCCESS')
        });
      },
      error: (error) => {
        console.error('Error approving participant:', error);
        Swal.fire({
          icon: 'error',
          title: this.translate.instant('MESSAGES.ERROR'),
          text: this.translate.instant('EVENT_PARTICIPANTS.APPROVE_ERROR')
        });
      }
    });
  }

  rejectParticipant(participantId: number) {
    this.participantsService.rejectParticipant(participantId).subscribe({
      next: () => {
        this.loadParticipants();
        Swal.fire({
          icon: 'success',
          title: this.translate.instant('MESSAGES.SUCCESS'),
          text: this.translate.instant('EVENT_PARTICIPANTS.REJECT_SUCCESS')
        });
      },
      error: (error) => {
        console.error('Error rejecting participant:', error);
        Swal.fire({
          icon: 'error',
          title: this.translate.instant('MESSAGES.ERROR'),
          text: this.translate.instant('EVENT_PARTICIPANTS.REJECT_ERROR')
        });
      }
    });
  }

  getStatusLabel(status: string | undefined): string {
    switch (status) {
      case 'Registered':
        return this.translate.instant('EVENT_PARTICIPANTS.STATUS_REGISTERED');
      case 'Pending':
        return this.translate.instant('EVENT_PARTICIPANTS.STATUS_PENDING');
      case 'Rejected':
        return this.translate.instant('EVENT_PARTICIPANTS.STATUS_REJECTED');
      default:
        return status || '';
    }
  }

  goBack() {
    this.router.navigate(['/events']);
  }
}
