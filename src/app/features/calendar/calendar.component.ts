import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TitlePage } from '../../shared/layouts/title-page/title-page';
import { EventService } from '../event/event.service';
import { EventModel } from '../event/event.interface';
import { HolidayService } from '../holiday/holiday.service';
import { Holiday } from '../holiday/holiday.interface';
import { AuthService } from '../../core/services/auth';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Router } from '@angular/router';
import { ParentChildHeaderSimpleComponent } from '../../shared/components/parent-child-header-simple/parent-child-header-simple.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PageTitleService } from '../../core/services/page-title.service';
import { IonContent, IonRefresher, IonRefresherContent } from '@ionic/angular/standalone';

@Component({
  selector: 'app-calendar-page',
  imports: [CommonModule, TitlePage, FullCalendarModule, ParentChildHeaderSimpleComponent, TranslateModule, IonContent, IonRefresher, IonRefresherContent],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss']
})
export class CalendarPageComponent implements OnInit {
  selectedDate: Date = new Date();
  events: EventModel[] = [];
  holidays: Holiday[] = [];
  selectedEvent: EventModel | null = null;
  selectedDateEvents: EventModel[] = [];
  selectedDateHolidays: Holiday[] = [];
  showDateEventsModal = false;
  showNoEventsModal = false;
  loading = false;
  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    height: 'auto',
    headerToolbar: {
      left: 'prev',
      center: 'title',
      right: 'next'
    },
    events: [],
    dayCellClassNames: (arg) => {
      const cellDate = new Date(arg.date);
      cellDate.setHours(0, 0, 0, 0);
      const classes = [];
      const hasHoliday = this.holidays.some(h => {
        const holidayDate = new Date(h.date);
        holidayDate.setHours(0, 0, 0, 0);
        return cellDate.getTime() === holidayDate.getTime();
      });
      const hasEvent = this.events.some(e => {
        const eventDate = new Date(e.time);
        eventDate.setHours(0, 0, 0, 0);
        return cellDate.getTime() === eventDate.getTime();
      });
      if (hasHoliday) classes.push('holiday');
      if (hasEvent) classes.push('event-day');
      return classes;
    },
    dateClick: (info) => {
      const clickedDate = new Date(info.dateStr);
      this.onDateSelected(clickedDate);
      this.selectedDateEvents = this.getEventsForDate(clickedDate);
      this.selectedDateHolidays = this.getHolidaysForDay(clickedDate);
      if (this.selectedDateEvents.length > 0 || this.selectedDateHolidays.length > 0) {
        this.showDateEventsModal = true;
      } else if (this.isParent) {
        this.showNoEventsModal = true;
      }
    },
    eventClick: (info) => {
      this.selectedEvent = this.events.find(e => e.id === parseInt(info.event.id)) || null;
    }
  };
  get isParent(): boolean {
    return this.authService.isParent();
  }
  closeEventModal() {
    this.selectedEvent = null;
  }

  closeDateEventsModal() {
    this.showDateEventsModal = false;
    this.selectedDateEvents = [];
    this.selectedDateHolidays = [];
  }

  closeNoEventsModal() {
    this.showNoEventsModal = false;
  }
  constructor(
    private authService: AuthService,
    private eventService: EventService,
    private holidayService: HolidayService,
    private router: Router,
    private translateService: TranslateService,
    private pageTitleService: PageTitleService
  ) {}

  ngOnInit() {
    this.pageTitleService.setTitle(this.translateService.instant('CALENDAR_PAGE.TITLE'));
    this.loadEvents();
    this.loadHolidays();
  }

  loadEvents() {
    this.eventService.loadEvents().subscribe(events => {
      this.events = events;
      this.updateCalendarEvents();
    });
  }

  loadHolidays() {
    this.holidayService.getHolidays().subscribe(holidays => {
      this.holidays = holidays;
      this.updateCalendarEvents();
    });
  }

  updateCalendarEvents() {
    const eventItems = this.events.map(e => ({
      id: 'event-' + e.id?.toString(),
      title: e.name,
      start: e.time,
      backgroundColor: e.type === 'Holiday' ? '#dc3545' : '#0d6efd'
    }));

    const holidayItems = this.holidays.map(h => ({
      id: 'holiday-' + h.id?.toString(),
      title: h.name,
      start: h.date,
      backgroundColor: '#dc3545'
    }));

    this.calendarOptions.events = [...eventItems, ...holidayItems];
  }

  onDateSelected(date: Date) {
    this.selectedDate = date;
  }

  getEventsForDate(date: Date): EventModel[] {
    return this.events.filter(event => {
      const eventDate = new Date(event.time);
      return eventDate.toDateString() === date.toDateString();
    });
  }

  getUpcomingEvents(): Array<(EventModel & { itemType: 'event', dateTime: string }) | (Holiday & { itemType: 'holiday', dateTime: string })> {
    const now = new Date();
    
    const upcomingEvents = this.events
      .filter(event => new Date(event.time) > now)
      .map(event => ({ ...event, itemType: 'event' as const, dateTime: event.time }));
    
    const upcomingHolidays = this.holidays
      .filter(holiday => new Date(holiday.date) > now)
      .map(holiday => ({ ...holiday, itemType: 'holiday' as const, dateTime: holiday.date }));
    
    return [...upcomingEvents, ...upcomingHolidays]
      .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
      .slice(0, 5);
  }

  isEvent(item: any): item is EventModel & { itemType: 'event', dateTime: string } {
    return item.itemType === 'event';
  }

  isHoliday(item: any): item is Holiday & { itemType: 'holiday', dateTime: string } {
    return item.itemType === 'holiday';
  }

  getItemDateTime(item: any): string {
    return item.dateTime;
  }

  getHolidaysForDay(date: Date): Holiday[] {
    return this.holidays.filter(holiday => {
      const holidayDate = new Date(holiday.date);
      return holidayDate.toDateString() === date.toDateString();
    });
  }

  goToEventDetail(event: EventModel) {
    this.router.navigate(['/events/detail', event.id]);
  }

  onRefresh(event?: any) {
    this.loadEvents();
    this.loadHolidays();

    // Complete the refresh after a short delay to ensure data is loaded
    setTimeout(() => {
      if (event?.target) {
        event.target.complete();
      }
    }, 1000);
  }

}