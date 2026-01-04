import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { EventModel } from './event.interface';
import { ApiConfig } from '../../core/config/api.config';

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private apiUrl = ApiConfig.ENDPOINTS.EVENTS;
  private events: EventModel[] = [];
  private eventsSubject = new BehaviorSubject<EventModel[]>([]);
  public events$ = this.eventsSubject.asObservable();

  constructor(private http: HttpClient) {}

  loadEvents(): Observable<EventModel[]> {
    return this.http.get<EventModel[]>(this.apiUrl);
  }

  addEvent(event: EventModel): Observable<EventModel> {
    return this.http.post<EventModel>(this.apiUrl, event);
  }

  updateEvent(event: EventModel): Observable<EventModel> {
    return this.http.put<EventModel>(`${this.apiUrl}/${event.id}`, event);
  }

  deleteEvent(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getEvent(id: number): Observable<EventModel> {
    return this.http.get<EventModel>(`${this.apiUrl}/${id}`);
  }

  getEventParticipants(eventId: number): Observable<any[]> {
    return this.http.get<any[]>(`${ApiConfig.ENDPOINTS.EVENT_PARTICIPANTS}/event/${eventId}`);
  }

  refreshEvents(): void {
    this.loadEvents().subscribe(events => {
      this.events = events;
      this.eventsSubject.next([...this.events]);
    });
  }
}