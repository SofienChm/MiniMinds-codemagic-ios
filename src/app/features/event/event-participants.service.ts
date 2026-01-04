import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EventParticipant } from './event-participants.interface';
import { ApiConfig } from '../../core/config/api.config';

@Injectable({
  providedIn: 'root'
})
export class EventParticipantsService {
  private apiUrl = ApiConfig.ENDPOINTS.EVENT_PARTICIPANTS;

  constructor(private http: HttpClient) {}

  getEventParticipants(eventId: number): Observable<EventParticipant[]> {
    return this.http.get<EventParticipant[]>(`${this.apiUrl}/event/${eventId}`);
  }

  getChildParticipations(childId: number): Observable<EventParticipant[]> {
    return this.http.get<EventParticipant[]>(`${this.apiUrl}/child/${childId}`);
  }

  registerParticipant(participant: EventParticipant): Observable<EventParticipant> {
    return this.http.post<EventParticipant>(this.apiUrl, participant);
  }

  removeParticipant(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  approveParticipant(id: number): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}/approve`, {});
  }

  rejectParticipant(id: number): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}/reject`, {});
  }
}