import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ClassModel } from './classes.interface';
import { ApiConfig } from '../../core/config/api.config';

@Injectable({
  providedIn: 'root'
})
export class ClassesService {
  private apiUrl = ApiConfig.ENDPOINTS.CLASSES;

  constructor(private http: HttpClient) {}

  getClasses(): Observable<ClassModel[]> {
    return this.http.get<ClassModel[]>(this.apiUrl);
  }

  getClass(id: number): Observable<ClassModel> {
    return this.http.get<ClassModel>(`${this.apiUrl}/${id}`);
  }

  createClass(classData: ClassModel): Observable<ClassModel> {
    return this.http.post<ClassModel>(this.apiUrl, classData);
  }

  updateClass(id: number, classData: ClassModel): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, classData);
  }

  deleteClass(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
