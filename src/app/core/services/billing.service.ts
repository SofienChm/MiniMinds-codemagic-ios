import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiConfig } from '../config/api.config';
import {
  TenantBilling,
  CreateBillingRequest,
  UpdateBillingRequest,
  BillingSummary,
  TenantBillingHistory,
  BillingStats
} from '../interfaces/dto/billing-dto';

@Injectable({
  providedIn: 'root'
})
export class BillingService {
  private apiUrl = `${ApiConfig.BASE_URL}/tenantbilling`;

  constructor(private http: HttpClient) {}

  getAll(filters?: { tenantId?: number; status?: string; year?: number; month?: number }): Observable<TenantBilling[]> {
    let params = new HttpParams();
    if (filters?.tenantId) params = params.set('tenantId', filters.tenantId.toString());
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.year) params = params.set('year', filters.year.toString());
    if (filters?.month) params = params.set('month', filters.month.toString());

    return this.http.get<TenantBilling[]>(this.apiUrl, { params });
  }

  getById(id: number): Observable<TenantBilling> {
    return this.http.get<TenantBilling>(`${this.apiUrl}/${id}`);
  }

  getSummary(): Observable<BillingSummary> {
    return this.http.get<BillingSummary>(`${this.apiUrl}/summary`);
  }

  getByTenant(tenantId: number): Observable<TenantBillingHistory> {
    return this.http.get<TenantBillingHistory>(`${this.apiUrl}/tenant/${tenantId}`);
  }

  getStats(year?: number): Observable<BillingStats> {
    let params = new HttpParams();
    if (year) params = params.set('year', year.toString());

    return this.http.get<BillingStats>(`${this.apiUrl}/stats`, { params });
  }

  create(billing: CreateBillingRequest): Observable<TenantBilling> {
    return this.http.post<TenantBilling>(this.apiUrl, billing);
  }

  update(id: number, billing: UpdateBillingRequest): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, billing);
  }

  updateStatus(id: number, status: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/status`, JSON.stringify(status), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
