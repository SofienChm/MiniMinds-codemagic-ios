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

  getChildProfilePicture(id: number): Observable<ProfilePictureResponse> {
    return this.http.get<ProfilePictureResponse>(`${this.apiUrl}/${id}/profile-picture`);
  }

  uploadChildProfilePicture(id: number, file: File): Observable<ProfilePictureUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ProfilePictureUploadResponse>(`${this.apiUrl}/${id}/profile-picture`, formData);
  }

  uploadChildProfilePictureBase64(id: number, base64Image: string): Observable<ProfilePictureUploadResponse> {
    const formData = new FormData();
    formData.append('base64Image', base64Image);
    return this.http.post<ProfilePictureUploadResponse>(`${this.apiUrl}/${id}/profile-picture`, formData);
  }

  deleteChildProfilePicture(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}/profile-picture`);
  }
}

// Response types for profile picture
export interface ProfilePictureResponse {
  profilePictureUrl?: string; // File-based URL
  profilePicture?: string;     // Base64 (backward compatibility)
  isFileBased?: boolean;
}

export interface ProfilePictureUploadResponse {
  message: string;
  profilePictureUrl: string;
  path: string;
}