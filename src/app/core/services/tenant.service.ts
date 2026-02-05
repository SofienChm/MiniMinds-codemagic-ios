import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { ApiConfig } from '../config/api.config';
import { Tenant, CreateTenantRequest, UpdateTenantRequest, TenantStats } from '../interfaces/dto/tenant-dto';

@Injectable({
  providedIn: 'root'
})
export class TenantService {
  private apiUrl = ApiConfig.ENDPOINTS.TENANTS;
  private tenantsSubject = new BehaviorSubject<Tenant[]>([]);
  public tenants$ = this.tenantsSubject.asObservable();

  constructor(private http: HttpClient) {}

  loadTenants(): Observable<Tenant[]> {
    return this.http.get<Tenant[]>(this.apiUrl).pipe(
      tap(tenants => this.tenantsSubject.next(tenants))
    );
  }

  getTenant(id: number): Observable<Tenant> {
    return this.http.get<Tenant>(`${this.apiUrl}/${id}`);
  }

  createTenant(tenant: CreateTenantRequest): Observable<Tenant> {
    return this.http.post<Tenant>(this.apiUrl, tenant).pipe(
      tap(newTenant => {
        const current = this.tenantsSubject.value;
        this.tenantsSubject.next([...current, newTenant]);
      })
    );
  }

  updateTenant(id: number, tenant: UpdateTenantRequest): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, tenant).pipe(
      tap(() => {
        const current = this.tenantsSubject.value;
        const index = current.findIndex(t => t.id === id);
        if (index !== -1) {
          current[index] = { ...current[index], ...tenant };
          this.tenantsSubject.next([...current]);
        }
      })
    );
  }

  updateTenantStatus(id: number, isActive: boolean): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/status`, isActive).pipe(
      tap(() => {
        const current = this.tenantsSubject.value;
        const index = current.findIndex(t => t.id === id);
        if (index !== -1) {
          current[index] = { ...current[index], isActive };
          this.tenantsSubject.next([...current]);
        }
      })
    );
  }

  deleteTenant(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        const current = this.tenantsSubject.value;
        this.tenantsSubject.next(current.filter(t => t.id !== id));
      })
    );
  }

  getStats(): Observable<TenantStats> {
    return this.http.get<TenantStats>(`${this.apiUrl}/stats`);
  }
}
