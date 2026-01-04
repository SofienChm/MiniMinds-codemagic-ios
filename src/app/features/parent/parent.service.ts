import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ParentModel } from './parent.interface';
import { ApiConfig } from '../../core/config/api.config';

@Injectable({
  providedIn: 'root'
})
export class ParentService {
  private apiUrl = ApiConfig.ENDPOINTS.PARENTS;
  private parents: ParentModel[] = [];
  private parentsSubject = new BehaviorSubject<ParentModel[]>([]);
  public parents$ = this.parentsSubject.asObservable();

  constructor(private http: HttpClient) {}

  loadParents(search?: string): Observable<ParentModel[]> {
    if (search && search.trim()) {
      return this.http.get<ParentModel[]>(this.apiUrl, { params: { search: search.trim() } });
    }
    return this.http.get<ParentModel[]>(this.apiUrl);
  }

  addParent(parent: ParentModel): Observable<ParentModel> {
    return this.http.post<ParentModel>(this.apiUrl, parent);
  }

  updateParent(parent: ParentModel): Observable<ParentModel> {
    return this.http.put<ParentModel>(`${this.apiUrl}/${parent.id}`, parent);
  }

  deleteParent(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  toggleParentStatus(id: number, deactivateChildren: boolean = false): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/toggle-status`, { deactivateChildren });
  }

  getParent(id: number): Observable<ParentModel> {
    return this.http.get<ParentModel>(`${this.apiUrl}/${id}`);
  }

  getParentWithChildren(id: number): Observable<ParentModel> {
    return this.http.get<ParentModel>(`${this.apiUrl}/${id}`);
  }

  activateParent(id: number): Observable<any> {
    return this.getParent(id).pipe(
      switchMap(parent => this.updateParent({ ...parent, isActive: true }))
    );
  }

  deactivateParent(id: number): Observable<any> {
    return this.getParent(id).pipe(
      switchMap(parent => this.updateParent({ ...parent, isActive: false }))
    );
  }

  linkChildToParent(parentId: number, childId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${parentId}/children/${childId}`, {});
  }

  refreshParents(): void {
    this.loadParents().subscribe(parents => {
      this.parents = parents;
      this.parentsSubject.next([...this.parents]);
    });
  }

  getParentProfilePicture(id: number): Observable<{ profilePicture: string }> {
    return this.http.get<{ profilePicture: string }>(`${this.apiUrl}/${id}/profile-picture`);
  }
}