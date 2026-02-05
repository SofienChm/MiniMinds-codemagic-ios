import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IonContent, IonRefresher, IonRefresherContent } from '@ionic/angular/standalone';
import { ParentChildHeaderSimpleComponent } from '../../shared/components/parent-child-header-simple/parent-child-header-simple.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { NotificationPreferencesService, NotificationPreference } from '../../core/services/notification-preferences.service';
import { SimpleToastService } from '../../core/services/simple-toast.service';

@Component({
  selector: 'app-notification-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    ParentChildHeaderSimpleComponent,
    SkeletonComponent
  ],
  templateUrl: './notification-settings.component.html',
  styleUrl: './notification-settings.component.scss'
})
export class NotificationSettingsComponent implements OnInit {
  notificationPreferences: NotificationPreference[] = [];
  isLoading = false;
  isSaving = false;

  constructor(
    private notificationPreferencesService: NotificationPreferencesService,
    private toast: SimpleToastService,
    private translate: TranslateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadPreferences();
  }

  loadPreferences(): void {
    this.isLoading = true;
    this.notificationPreferencesService.getPreferences().subscribe({
      next: (response) => {
        this.notificationPreferences = response.preferences;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading preferences:', error);
        this.isLoading = false;
        this.toast.error(this.translate.instant('SETTINGS.ERROR_LOADING_PREFERENCES'));
      }
    });
  }

  savePreferences(): void {
    this.isSaving = true;
    const updates = this.notificationPreferences.map(p => ({
      notificationType: p.notificationType,
      isEnabled: p.isEnabled
    }));

    this.notificationPreferencesService.updatePreferences({ preferences: updates }).subscribe({
      next: () => {
        this.isSaving = false;
        this.toast.success(this.translate.instant('SETTINGS.NOTIFICATION_PREFERENCES_SAVED'));
      },
      error: (error) => {
        console.error('Error saving preferences:', error);
        this.isSaving = false;
        this.toast.error(this.translate.instant('SETTINGS.ERROR_SAVING_PREFERENCES'));
      }
    });
  }

  getNotificationTypeLabel(type: string): string {
    const key = `SETTINGS.NOTIF_TYPE_${type.toUpperCase()}`;
    const translation = this.translate.instant(key);
    return translation !== key ? translation : type;
  }

  getNotificationTypeDescription(type: string): string {
    const key = `SETTINGS.NOTIF_TYPE_${type.toUpperCase()}_DESC`;
    const translation = this.translate.instant(key);
    return translation !== key ? translation : '';
  }

  getIconClass(type: string): string {
    const icons: { [key: string]: string } = {
      'Event': 'bi bi-calendar-event',
      'Message': 'bi bi-chat-dots',
      'DailyActivity': 'bi bi-bar-chart',
      'Fee': 'bi bi-credit-card',
      'Attendance': 'bi bi-person-check',
      'Reclamation': 'bi bi-exclamation-circle',
      'System': 'bi bi-gear',
      'Appointment': 'bi bi-calendar-check'
    };
    return icons[type] || 'bi bi-bell';
  }

  onRefresh(event?: any): void {
    this.loadPreferences();
    setTimeout(() => {
      if (event?.target) {
        event.target.complete();
      }
    }, 500);
  }

  goBack(): void {
    this.router.navigate(['/profile-menu']);
  }
}
