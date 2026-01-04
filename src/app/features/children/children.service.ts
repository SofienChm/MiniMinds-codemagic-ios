import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { ChildModel } from './children.interface';
import { ApiConfig } from '../../core/config/api.config';

@Injectable({
  providedIn: 'root'
})
export class ChildrenService {
  private apiUrl = ApiConfig.ENDPOINTS.CHILDREN;
  private children: ChildModel[] = [];
  private childrenSubject = new BehaviorSubject<ChildModel[]>([]);
  public children$ = this.childrenSubject.asObservable();

  constructor(private http: HttpClient) {}

  loadChildren(): Observable<ChildModel[]> {
    return this.http.get<ChildModel[]>(this.apiUrl);
  }

  addChild(child: ChildModel): Observable<ChildModel> {
    return this.http.post<ChildModel>(this.apiUrl, child);
  }

  updateChild(child: ChildModel): Observable<ChildModel> {
    return this.http.put<ChildModel>(`${this.apiUrl}/${child.id}`, child);
  }

  deleteChild(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getChild(id: number): Observable<ChildModel> {
    return this.http.get<ChildModel>(`${this.apiUrl}/${id}`);
  }

  refreshChildren(): void {
    this.loadChildren().subscribe(children => {
      this.children = children;
      this.childrenSubject.next([...this.children]);
    });
  }

  removeParentFromChild(childParentId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/remove-parent/${childParentId}`);
  }

  toggleChildStatus(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/toggle-status`, {});
  }

  getChildProfilePicture(id: number): Observable<{ profilePicture: string }> {
    return this.http.get<{ profilePicture: string }>(`${this.apiUrl}/${id}/profile-picture`);
  }
}