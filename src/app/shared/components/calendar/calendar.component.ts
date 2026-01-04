import { Component, Input, Output, EventEmitter, OnChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Holiday } from '../../../features/holiday/holiday.interface';
import { AppCurrencyPipe } from '../../../core/services/currency/currency.pipe';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-calendar',
  imports: [CommonModule, AppCurrencyPipe, TranslateModule],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss']
})
export class CalendarComponent implements OnChanges {
  @Input() selectedDate: Date = new Date();
  @Input() events: any[] = [];
  @Input() holidays: Holiday[] = [];
  @Output() dateSelected = new EventEmitter<Date>();

  currentMonth: Date = new Date();
  weeks: Date[][] = [];

  constructor(private translateService: TranslateService) {}

  ngOnInit() {
    this.generateCalendar();
    console.log('Calendar component events:', this.events);
  }

  ngOnChanges() {
    console.log('Calendar events changed:', this.events);
  }

  generateCalendar() {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    this.weeks = [];
    let currentWeek: Date[] = [];

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      currentWeek.push(date);
      
      if (currentWeek.length === 7) {
        this.weeks.push(currentWeek);
        currentWeek = [];
      }
    }
  }

  previousMonth() {
    this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
    this.generateCalendar();
  }

  nextMonth() {
    this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
    this.generateCalendar();
  }

  selectDate(date: Date) {
    this.selectedDate = date;
    this.dateSelected.emit(date);
    
    // Show events modal if date has events
    const dayEvents = this.getEventsForDay(date);
    if (dayEvents.length > 0) {
      this.selectedDateEvents = dayEvents;
      this.showDateEventsModal = true;
    }
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  isSelected(date: Date): boolean {
    return date.toDateString() === this.selectedDate.toDateString();
  }

  isCurrentMonth(date: Date): boolean {
    return date.getMonth() === this.currentMonth.getMonth();
  }

  getMonthYear(): string {
    const locale = this.translateService.currentLang || 'en';
    return this.currentMonth.toLocaleDateString(locale, {
      month: 'long',
      year: 'numeric'
    });
  }

  hasEvent(date: Date): boolean {
    return this.events.some(event => {
      const eventDate = new Date(event.time);
      return eventDate.toDateString() === date.toDateString();
    });
  }

  hasHoliday(date: Date): boolean {
    return this.holidays.some(holiday => {
      const holidayDate = new Date(holiday.date);
      return holidayDate.toDateString() === date.toDateString();
    });
  }

  getHolidaysForDay(date: Date): Holiday[] {
    return this.holidays.filter(holiday => {
      const holidayDate = new Date(holiday.date);
      return holidayDate.toDateString() === date.toDateString();
    });
  }

  getEventNames(date: Date): string {
    const dayEvents = this.events.filter(event => {
      const eventDate = new Date(event.time);
      return eventDate.toDateString() === date.toDateString();
    });
    return dayEvents.map(event => event.name).join(', ');
  }

  getEventsForDay(date: Date): any[] {
    const dayEvents = this.events.filter(event => {
      const eventDate = new Date(event.time);
      return eventDate.toDateString() === date.toDateString();
    });
    return dayEvents;
  }

  trackByEventId(index: number, event: any): any {
    return event.id;
  }

  selectedEvent: any = null;
  selectedHoliday: Holiday | null = null;
  showModal: boolean = false;
  showHolidayModal: boolean = false;
  selectedDateEvents: any[] = [];
  showDateEventsModal: boolean = false;

  showEventDetails(event: any, clickEvent: Event) {
    clickEvent.stopPropagation();
    this.selectedEvent = event;
    this.showModal = true;
  }

  closeEventModal() {
    this.selectedEvent = null;
    this.showModal = false;
  }

  showHolidayDetails(holiday: Holiday, clickEvent: Event) {
    clickEvent.stopPropagation();
    this.selectedHoliday = holiday;
    this.showHolidayModal = true;
  }

  closeHolidayModal() {
    this.selectedHoliday = null;
    this.showHolidayModal = false;
  }

  closeDateEventsModal() {
    this.selectedDateEvents = [];
    this.showDateEventsModal = false;
  }
}