import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EventService } from '../event.service';
import { EventModel } from '../event.interface';
import { EventParticipantsService } from '../event-participants.service';
import { ChildrenService } from '../../children/children.service';
import { ChildModel } from '../../children/children.interface';
import { EventParticipant } from '../event-participants.interface';
import { TitlePage, TitleAction } from '../../../shared/layouts/title-page/title-page';
import { AuthService } from '../../../core/services/auth';
import { Location } from '@angular/common';
import { AppCurrencyPipe } from '../../../core/services/currency/currency.pipe';
import { PageTitleService } from '../../../core/services/page-title.service';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { IonContent, IonRefresher, IonRefresherContent } from '@ionic/angular/standalone';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TitlePage, AppCurrencyPipe, TranslateModule, IonContent, IonRefresher, IonRefresherContent],
  templateUrl: './event-detail.component.html',
  styleUrls: ['./event-detail.component.scss']
})
export class EventDetailComponent implements OnInit, OnDestroy {
  private langChangeSub?: Subscription;
  event: EventModel | null = null;
  loading = true;
  eventId: number = 0;
  registeredCount = 0;
  uploading = false;
  titleActions: TitleAction[] = [];

  // Modal properties
  showAddParticipantModal = false;
  loadingStudents = false;
  addingParticipants = false;
  students: ChildModel[] = [];
  filteredStudents: ChildModel[] = [];
  selectedStudents: number[] = [];
  searchTerm = '';
  get isParent(): boolean {
      return this.authService.isParent();
  }
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private eventService: EventService,
    private eventParticipantsService: EventParticipantsService,
    private childrenService: ChildrenService,
    private authService: AuthService,
    private location: Location,
    private translate: TranslateService,
    private pageTitleService: PageTitleService
  ) {}

  ngOnInit(): void {
    this.pageTitleService.setTitle(this.translate.instant('EVENT_DETAIL.EVENT_DETAILS'));
    this.route.params.subscribe(params => {
      this.eventId = +params['id'];
      this.loadEvent();
    });

    this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      this.pageTitleService.setTitle(this.translate.instant('EVENT_DETAIL.EVENT_DETAILS'));
      this.setupTitleActions();
    });
  }

  ngOnDestroy(): void {
    this.langChangeSub?.unsubscribe();
  }
  back() {
    this.location.back();
  }

  loadEvent(): void {
    this.loading = true;
    this.eventService.getEvent(this.eventId).subscribe({
      next: (event) => {
        this.event = event;
        this.loadParticipantsCount();
      },
      error: (error) => {
        console.error('Error loading event:', error);
        this.loading = false;
      }
    });
  }

  loadParticipantsCount(): void {
    this.eventService.getEventParticipants(this.eventId).subscribe({
      next: (participants) => {
        this.registeredCount = participants.filter(p => p.status === 'Registered').length;
        if (this.event) {
          this.event.participants = participants;
        }
        this.setupTitleActions();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading participants:', error);
        this.loading = false;
      }
    });
  }

  setupTitleActions(): void {
    this.titleActions = [
      {
        label: this.translate.instant('EVENT_DETAIL.BACK_TO_EVENTS'),
        icon: 'bi bi-arrow-left',
        class: 'btn-cancel-global',
        action: () => this.goBack()
      },
      {
        label: this.translate.instant('EVENT_DETAIL.VIEW_PARTICIPANTS'),
        icon: 'bi bi-people',
        class: 'btn-add-global-2',
        action: () => this.router.navigate(['/events', this.eventId, 'participants'])
      },
      {
        label: this.translate.instant('EVENT_DETAIL.EDIT_EVENT'),
        icon: 'bi bi-pencil',
        class: 'btn-edit-global-2',
        action: () => this.router.navigate(['/events/edit', this.eventId])
      }
    ];
  }

  goBack(): void {
    this.router.navigate(['/events']);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  getTotalRevenue(): number {
    return this.event ? this.event.price * this.registeredCount : 0;
  }

  triggerImageUpload(): void {
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fileInput?.click();
  }

  onImageSelected(event: any): void {
    const file = event.target.files[0];
    if (file && this.event) {
      this.uploading = true;
      
      const reader = new FileReader();
      reader.onload = () => {
        const imageBase64 = reader.result as string;
        this.updateEventImage(imageBase64);
      };
      reader.readAsDataURL(file);
    }
  }

  private updateEventImage(imageBase64: string): void {
    if (!this.event) return;
    
    const updatedEvent = { ...this.event, image: imageBase64 };
    
    this.eventService.updateEvent(updatedEvent).subscribe({
      next: () => {
        this.event!.image = imageBase64;
        this.uploading = false;
      },
      error: (error) => {
        console.error('Error updating event image:', error);
        this.uploading = false;
        Swal.fire({
          icon: 'error',
          title: this.translate.instant('COMMON.ERROR'),
          text: 'Failed to update image. Please try again.',
          confirmButtonColor: '#7dd3c0'
        });
      }
    });
  }

  openAddParticipantModal(): void {
    this.showAddParticipantModal = true;
    this.loadStudents();
  }

  closeAddParticipantModal(): void {
    this.showAddParticipantModal = false;
    this.selectedStudents = [];
    this.searchTerm = '';
    this.filteredStudents = [];
  }

  loadStudents(): void {
    this.loadingStudents = true;
    this.childrenService.loadChildren().subscribe({
      next: (students) => {
        // Filter out students who are already participants
        const participantChildIds = this.event?.participants?.map(p => p.child.id) || [];
        this.students = students.filter(student => student.id && !participantChildIds.includes(student.id));
        this.filteredStudents = [...this.students];
        this.loadingStudents = false;
      },
      error: (error) => {
        console.error('Error loading students:', error);
        this.loadingStudents = false;
      }
    });
  }

  filterStudents(): void {
    if (!this.searchTerm.trim()) {
      this.filteredStudents = [...this.students];
      return;
    }
    
    const term = this.searchTerm.toLowerCase();
    this.filteredStudents = this.students.filter(student => 
      student.firstName.toLowerCase().includes(term) || 
      student.lastName.toLowerCase().includes(term)
    );
  }

  toggleStudentSelection(student: ChildModel): void {
    if (!student.id) return;
    
    const studentId = student.id;
    const index = this.selectedStudents.indexOf(studentId);
    
    if (index > -1) {
      this.selectedStudents.splice(index, 1);
    } else {
      this.selectedStudents.push(studentId);
    }
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

  addSelectedParticipants(): void {
    if (this.selectedStudents.length === 0) return;
    
    this.addingParticipants = true;
    const participantPromises = this.selectedStudents.map(childId => {
      const participant: EventParticipant = {
        eventId: this.eventId,
        childId: childId,
        status: this.isParent ? 'Pending' : 'Registered',
        registeredAt: new Date().toISOString()
      };
      return this.eventParticipantsService.registerParticipant(participant);
    });

    Promise.all(participantPromises.map(p => p.toPromise())).then(() => {
      this.addingParticipants = false;
      this.closeAddParticipantModal();
      this.loadEvent(); // Reload event to get updated participants
    }).catch(error => {
      console.error('Error adding participants:', error);
      this.addingParticipants = false;
      Swal.fire({
        icon: 'error',
        title: this.translate.instant('COMMON.ERROR'),
        text: 'Failed to add participants. Please try again.',
        confirmButtonColor: '#7dd3c0'
      });
    });
  }

  hasChildInEvent(): boolean {
    if (!this.event?.participants) return false;
    return this.event.participants.some(p => p.child);
  }

  getChildStatus(): string {
    if (!this.event?.participants) return '';
    const participant = this.event.participants.find(p => p.child);
    return participant?.status || '';
  }

  // Pull-to-refresh handler for Ionic refresher
  onRefresh(event?: any): void {
    this.loadEvent();
    setTimeout(() => {
      // Complete the Ionic refresher
      if (event?.target) {
        event.target.complete();
      }
    }, 500);
  }
}