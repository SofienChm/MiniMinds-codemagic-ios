import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { EducatorModel } from './educator.interface';
import { ApiConfig } from '../../core/config/api.config';

@Injectable({
  providedIn: 'root'
})
export class EducatorService {
  private apiUrl = ApiConfig.ENDPOINTS.EDUCATORS;
  private educators: EducatorModel[] = [];
  private educatorsSubject = new BehaviorSubject<EducatorModel[]>([]);
  public educators$ = this.educatorsSubject.asObservable();

  constructor(private http: HttpClient) {}

  loadEducators(search?: string): Observable<EducatorModel[]> {
    if (search && search.trim()) {
      return this.http.get<EducatorModel[]>(this.apiUrl, { params: { search: search.trim() } });
    }
    return this.http.get<EducatorModel[]>(this.apiUrl);
  }

  addEducator(educator: EducatorModel): Observable<EducatorModel> {
    return this.http.post<EducatorModel>(this.apiUrl, educator);
  }

  updateEducator(educator: EducatorModel): Observable<EducatorModel> {
    return this.http.put<EducatorModel>(`${this.apiUrl}/${educator.id}`, educator);
  }

  deleteEducator(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getEducator(id: number): Observable<EducatorModel> {
    return this.http.get<EducatorModel>(`${this.apiUrl}/${id}`);
  }

  refreshEducators(): void {
    this.loadEducators().subscribe(educators => {
      this.educators = educators;
      this.educatorsSubject.next([...this.educators]);
    });
  }
}