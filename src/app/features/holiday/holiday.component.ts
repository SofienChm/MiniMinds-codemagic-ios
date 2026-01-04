import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { from, Subscription } from 'rxjs';
import { concatMap, tap, finalize } from 'rxjs/operators';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HolidayService } from './holiday.service';
import { Holiday } from './holiday.interface';
import { TitlePage } from '../../shared/layouts/title-page/title-page';
import { TitleAction } from '../../shared/layouts/title-page/title-page';
import Swal from 'sweetalert2';
import { PageTitleService } from '../../core/services/page-title.service';

@Component({
  selector: 'app-holiday',
  standalone: true,
  imports: [CommonModule, RouterModule, TitlePage, ReactiveFormsModule, TranslateModule],
  templateUrl: './holiday.component.html',
  styleUrls: ['./holiday.component.scss']
})
export class HolidayComponent implements OnInit {
  holidays: Holiday[] = [];
  displayedHolidays: Holiday[] = [];
  selectedHoliday: Holiday | null = null;
  showDetailModal = false;
  showEditModal = false;
  holidayForm: FormGroup;
  holidaysPerPage = 9;
  currentPage = 1;
  selectedCountry: string = localStorage.getItem('selectedCountry') || 'US';
  titleActions: TitleAction[] = [];
  private holidaySub?: Subscription;

  constructor(
    private holidayService: HolidayService,
    private router: Router,
    private fb: FormBuilder,
    private http: HttpClient,
    private translateService: TranslateService,
    private pageTitleService: PageTitleService
  ) {
    this.holidayForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', Validators.maxLength(500)],
      date: ['', Validators.required],
      isRecurring: [false],
      recurrenceType: [''],
      color: ['#FF6B6B', Validators.required]
    });
  }

  ngOnInit() {
    this.pageTitleService.setTitle(this.translateService.instant('HOLIDAYS_PAGE.TITLE'));
    this.selectedCountry = localStorage.getItem('selectedCountry') || 'US';
    this.updateTitleActions();
    // subscribe to shared holidays observable so the list updates automatically
    this.holidaySub = this.holidayService.holidays$.subscribe(holidays => {
      this.holidays = holidays;
      this.currentPage = 1;
      this.updateDisplayedHolidays();
    });
    // load initial data
    this.holidayService.refreshHolidays();
    // Update title actions when language changes
    this.translateService.onLangChange.subscribe(() => {
      this.updateTitleActions();
    });
  }

  updateTitleActions() {
    this.titleActions = [
      { label: this.translateService.instant('HOLIDAYS_PAGE.CLEAR_HOLIDAYS'), icon: 'bi bi-trash', class: 'custom-btn-2 btn-remove-2', action: () => this.clearImportedHolidays() },
      { label: this.translateService.instant('HOLIDAYS_PAGE.IMPORT_HOLIDAYS'), icon: 'bi bi-download', class: 'custom-btn-2 btn-edit-global-2', action: () => this.importHolidays() },
      { label: this.translateService.instant('HOLIDAYS_PAGE.ADD_HOLIDAY'), icon: 'bi bi-plus-square', class: '', action: () => this.addHoliday() },
    ];
  }

  ngOnDestroy(): void {
    this.holidaySub?.unsubscribe();
  }

  loadHolidays() {
    this.holidayService.getHolidays().subscribe(holidays => {
      this.holidays = holidays;
      this.currentPage = 1;
      this.updateDisplayedHolidays();
    });
  }

  importHolidays() {
    const country = localStorage.getItem('selectedCountry') || this.selectedCountry || 'US';
    const year = new Date().getFullYear();
    const key = `importedHolidays_${country}_${year}`;

    // Check if holidays have already been imported for this country/year
    const existingImport = localStorage.getItem(key);
    if (existingImport) {
      Swal.fire(
        this.translateService.instant('HOLIDAYS_PAGE.ALREADY_IMPORTED_TITLE'),
        this.translateService.instant('HOLIDAYS_PAGE.ALREADY_IMPORTED_TEXT', { country, year }),
        'info'
      );
      return;
    }

    const apiUrl = `https://date.nager.at/api/v3/PublicHolidays/${year}/${country}`;
    this.http.get<any[]>(apiUrl).subscribe({
      next: (data) => {
        if (!data || !data.length) {
          Swal.fire(
            this.translateService.instant('HOLIDAYS_PAGE.NO_HOLIDAYS_TITLE'),
            this.translateService.instant('HOLIDAYS_PAGE.NO_HOLIDAYS_TEXT'),
            'info'
          );
          return;
        }
        const createdIds: number[] = [];
        from(data).pipe(
          concatMap(h => {
            const holiday: Holiday = {
              name: h.localName || h.name,
              description: h.name || '',
              date: h.date,
              isRecurring: false,
              color: '#FFA500'
            };
            return this.holidayService.createHoliday(holiday).pipe(tap(created => createdIds.push(created.id!)));
          }),
          finalize(() => {
            const key = `importedHolidays_${country}_${year}`;
            localStorage.setItem(key, JSON.stringify(createdIds));
            this.holidayService.refreshHolidays();
            // ensure component view is refreshed
            this.loadHolidays();
            Swal.fire(
              this.translateService.instant('HOLIDAYS_PAGE.IMPORTED_TITLE'),
              this.translateService.instant('HOLIDAYS_PAGE.IMPORTED_TEXT', { count: createdIds.length }),
              'success'
            );
          })
        ).subscribe();
      },
      error: (err) => {
        console.error('Error fetching external holidays', err);
        Swal.fire(
          this.translateService.instant('HOLIDAYS_PAGE.IMPORT_ERROR_TITLE'),
          this.translateService.instant('HOLIDAYS_PAGE.IMPORT_ERROR_TEXT'),
          'error'
        );
      }
    });
  }

  clearImportedHolidays() {
    const country = localStorage.getItem('selectedCountry') || this.selectedCountry || 'US';
    const year = new Date().getFullYear();
    const key = `importedHolidays_${country}_${year}`;
    // collect ids from currently loaded holidays (clear entire loaded list)
    const ids: number[] = this.holidays.map(h => h.id!).filter(id => !!id);
    if (!ids.length) {
      Swal.fire(
        this.translateService.instant('HOLIDAYS_PAGE.NOTHING_TO_CLEAR_TITLE'),
        this.translateService.instant('HOLIDAYS_PAGE.NOTHING_TO_CLEAR_TEXT'),
        'info'
      );
      return;
    }

    Swal.fire({
      title: this.translateService.instant('HOLIDAYS_PAGE.CLEAR_CONFIRM_TITLE'),
      text: this.translateService.instant('HOLIDAYS_PAGE.CLEAR_CONFIRM_TEXT'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: this.translateService.instant('HOLIDAYS_PAGE.YES_DELETE_THEM'),
      cancelButtonText: this.translateService.instant('HOLIDAYS_PAGE.CANCEL')
    }).then(result => {
      if (!result.isConfirmed) return;
      // delete sequentially all loaded holidays
      from(ids).pipe(
        concatMap(id => this.holidayService.deleteHoliday(id))
      ).subscribe({
        complete: () => {
          // remove any import tracking key for this country/year
          try { localStorage.removeItem(key); } catch {}
          // clear local arrays to immediately reflect empty table
          this.holidays = [];
          this.displayedHolidays = [];
          this.currentPage = 1;
          this.holidayService.refreshHolidays();
          Swal.fire(
            this.translateService.instant('HOLIDAYS_PAGE.CLEARED_TITLE'),
            this.translateService.instant('HOLIDAYS_PAGE.CLEARED_TEXT'),
            'success'
          );
        },
        error: (err) => {
          console.error('Error clearing holidays', err);
          Swal.fire(
            this.translateService.instant('HOLIDAYS_PAGE.CLEAR_ERROR_TITLE'),
            this.translateService.instant('HOLIDAYS_PAGE.CLEAR_ERROR_TEXT'),
            'error'
          );
          this.holidayService.refreshHolidays();
        }
      });
    });
  }

  updateDisplayedHolidays() {
    const currentYear = new Date().getFullYear();
    // Filter holidays to only show current year and future
    const filteredHolidays = this.holidays.filter(holiday => {
      const holidayYear = new Date(holiday.date).getFullYear();
      return holidayYear >= currentYear;
    });
    const endIndex = this.currentPage * this.holidaysPerPage;
    this.displayedHolidays = filteredHolidays.slice(0, endIndex);
  }

  loadMoreHolidays() {
    this.currentPage++;
    this.updateDisplayedHolidays();
  }

  hasMoreHolidays(): boolean {
    const currentYear = new Date().getFullYear();
    const filteredCount = this.holidays.filter(holiday => {
      const holidayYear = new Date(holiday.date).getFullYear();
      return holidayYear >= currentYear;
    }).length;
    return this.displayedHolidays.length < filteredCount;
  }

  showDetail(holiday: Holiday) {
    this.selectedHoliday = holiday;
    this.showDetailModal = true;
  }

  closeModal() {
    this.showDetailModal = false;
    this.selectedHoliday = null;
  }

  editHoliday(holiday: Holiday) {
    this.selectedHoliday = holiday;
    this.holidayForm.patchValue({
      name: holiday.name,
      description: holiday.description,
      date: holiday.date.split('T')[0],
      isRecurring: holiday.isRecurring,
      recurrenceType: holiday.recurrenceType,
      color: holiday.color
    });
    this.showEditModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
    this.selectedHoliday = null;
    this.holidayForm.reset();
  }

  onSubmit() {
    if (this.holidayForm.valid && this.selectedHoliday?.id) {
      const updatedHoliday = { ...this.holidayForm.value, id: this.selectedHoliday.id };
      this.holidayService.updateHoliday(this.selectedHoliday.id, updatedHoliday).subscribe({
        next: () => {
          this.closeEditModal();
          this.loadHolidays();
          Swal.fire({
            icon: 'success',
            title: this.translateService.instant('HOLIDAYS_PAGE.SUCCESS'),
            text: this.translateService.instant('HOLIDAYS_PAGE.UPDATE_SUCCESS'),
            timer: 2000,
            showConfirmButton: false
          });
        },
        error: (error) => {
          console.error('Error updating holiday:', error);
          Swal.fire({
            icon: 'error',
            title: this.translateService.instant('HOLIDAYS_PAGE.ERROR'),
            text: this.translateService.instant('HOLIDAYS_PAGE.UPDATE_ERROR')
          });
        }
      });
    }
  }

  deleteHoliday(id: number) {
    Swal.fire({
      title: this.translateService.instant('HOLIDAYS_PAGE.DELETE_CONFIRM_TITLE'),
      text: this.translateService.instant('HOLIDAYS_PAGE.DELETE_CONFIRM_TEXT'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: this.translateService.instant('HOLIDAYS_PAGE.YES_DELETE'),
      cancelButtonText: this.translateService.instant('HOLIDAYS_PAGE.CANCEL')
    }).then(result => {
      if (result.isConfirmed) {
        this.holidayService.deleteHoliday(id).subscribe({
          next: () => {
            this.loadHolidays();
            Swal.fire({
              icon: 'success',
              title: this.translateService.instant('HOLIDAYS_PAGE.SUCCESS'),
              text: this.translateService.instant('HOLIDAYS_PAGE.DELETE_SUCCESS'),
              timer: 2000,
              showConfirmButton: false
            });
          },
          error: () => {
            Swal.fire({
              icon: 'error',
              title: this.translateService.instant('HOLIDAYS_PAGE.ERROR'),
              text: this.translateService.instant('HOLIDAYS_PAGE.DELETE_ERROR')
            });
          }
        });
      }
    });
  }

  addHoliday = () => {
    this.router.navigate(['/holidays/add']);
  }
}