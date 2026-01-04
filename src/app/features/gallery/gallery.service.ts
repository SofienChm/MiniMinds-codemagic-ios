import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiConfig } from '../../core/config/api.config';
import {
  Photo,
  PhotosResponse,
  PhotosByChildResponse,
  UpdatePhotoRequest,
  MultipleUploadResponse
} from './gallery.interface';

@Injectable({
  providedIn: 'root'
})
export class GalleryService {
  private apiUrl = ApiConfig.ENDPOINTS.PHOTOS;

  private photosSubject = new BehaviorSubject<Photo[]>([]);
  public photos$ = this.photosSubject.asObservable();

  constructor(private http: HttpClient) {}

  getPhotos(
    page: number = 1,
    pageSize: number = 20,
    childId?: number,
    category?: string
  ): Observable<PhotosResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (childId) {
      params = params.set('childId', childId.toString());
    }
    if (category) {
      params = params.set('category', category);
    }

    return this.http.get<PhotosResponse>(this.apiUrl, { params }).pipe(
      tap(response => this.photosSubject.next(response.data))
    );
  }

  getPhoto(id: number): Observable<Photo> {
    return this.http.get<Photo>(`${this.apiUrl}/${id}`);
  }

  getPhotosByChild(
    childId: number,
    page: number = 1,
    pageSize: number = 20,
    category?: string
  ): Observable<PhotosByChildResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (category) {
      params = params.set('category', category);
    }

    return this.http.get<PhotosByChildResponse>(`${this.apiUrl}/by-child/${childId}`, { params });
  }

  uploadPhoto(
    file: File,
    childId: number,
    title?: string,
    description?: string,
    category: string = 'Memory',
    relatedEntityType?: string,
    relatedEntityId?: number
  ): Observable<Photo> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('childId', childId.toString());
    formData.append('category', category);

    if (title) {
      formData.append('title', title);
    }
    if (description) {
      formData.append('description', description);
    }
    if (relatedEntityType) {
      formData.append('relatedEntityType', relatedEntityType);
    }
    if (relatedEntityId) {
      formData.append('relatedEntityId', relatedEntityId.toString());
    }

    return this.http.post<Photo>(`${this.apiUrl}/upload`, formData);
  }

  uploadMultiplePhotos(
    files: File[],
    childId: number,
    category: string = 'Memory',
    description?: string
  ): Observable<MultipleUploadResponse> {
    const formData = new FormData();

    files.forEach(file => {
      formData.append('files', file);
    });
    formData.append('childId', childId.toString());
    formData.append('category', category);

    if (description) {
      formData.append('description', description);
    }

    return this.http.post<MultipleUploadResponse>(`${this.apiUrl}/upload-multiple`, formData);
  }

  updatePhoto(id: number, data: UpdatePhotoRequest): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  deletePhoto(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  permanentlyDeletePhoto(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}/permanent`);
  }

  restorePhoto(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/restore`, {});
  }

  getCategories(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/categories`);
  }

  refreshPhotos(childId?: number, category?: string): void {
    this.getPhotos(1, 20, childId, category).subscribe();
  }
}
