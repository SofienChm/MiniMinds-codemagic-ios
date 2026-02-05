import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiConfig } from '../../core/config/api.config';

export interface StaticFeeModel {
  id: number;
  title: string;
  description?: string;
  amount: number;
  payerName?: string;
  payerEmail?: string;
  payerPhone?: string;
  parentId?: number;
  parentName?: string;
  childId?: number;
  childName?: string;
  status: string;
  paymentMethod: string;
  referenceNumber?: string;
  feeDate: string;
  paidDate?: string;
  notes?: string;
  category?: string;
  createdAt: string;
  updatedAt?: string;
  createdByUserName?: string;
}

export interface StaticFeeSummary {
  totalFees: number;
  paidFees: number;
  pendingFees: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  byCategory: Array<{ category: string; count: number; total: number }>;
  byPaymentMethod: Array<{ method: string; count: number; total: number }>;
}

export interface CreateStaticFeeDto {
  title: string;
  description?: string;
  amount: number;
  payerName?: string;
  payerEmail?: string;
  payerPhone?: string;
  parentId?: number;
  childId?: number;
  status?: string;
  paymentMethod?: string;
  referenceNumber?: string;
  feeDate?: string;
  paidDate?: string;
  notes?: string;
  category?: string;
}

export interface UpdateStaticFeeDto {
  title?: string;
  description?: string;
  amount?: number;
  payerName?: string;
  payerEmail?: string;
  payerPhone?: string;
  parentId?: number;
  childId?: number;
  paymentMethod?: string;
  referenceNumber?: string;
  feeDate?: string;
  notes?: string;
  category?: string;
}

export interface MarkPaidDto {
  paidDate?: string;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class StaticFeesService {
  private readonly apiUrl = ApiConfig.ENDPOINTS.STATIC_FEES;

  private staticFeesSubject = new BehaviorSubject<StaticFeeModel[]>([]);
  public staticFees$ = this.staticFeesSubject.asObservable();

  private summarySubject = new BehaviorSubject<StaticFeeSummary | null>(null);
  public summary$ = this.summarySubject.asObservable();

  constructor(private http: HttpClient) {}

  // Get all static fees with optional filters
  getStaticFees(filters?: { status?: string; category?: string; paymentMethod?: string }): Observable<StaticFeeModel[]> {
    let params = new HttpParams();
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.category) params = params.set('category', filters.category);
    if (filters?.paymentMethod) params = params.set('paymentMethod', filters.paymentMethod);

    return this.http.get<StaticFeeModel[]>(this.apiUrl, { params }).pipe(
      tap(fees => this.staticFeesSubject.next(fees))
    );
  }

  // Get summary
  getSummary(): Observable<StaticFeeSummary> {
    return this.http.get<StaticFeeSummary>(`${this.apiUrl}/summary`).pipe(
      tap(summary => this.summarySubject.next(summary))
    );
  }

  // Get single static fee by ID
  getStaticFeeById(id: number): Observable<StaticFeeModel> {
    return this.http.get<StaticFeeModel>(`${this.apiUrl}/${id}`);
  }

  // Create new static fee
  createStaticFee(dto: CreateStaticFeeDto): Observable<StaticFeeModel> {
    return this.http.post<StaticFeeModel>(this.apiUrl, dto).pipe(
      tap(() => this.refreshData())
    );
  }

  // Update static fee
  updateStaticFee(id: number, dto: UpdateStaticFeeDto): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, dto).pipe(
      tap(() => this.refreshData())
    );
  }

  // Mark as paid
  markAsPaid(id: number, dto?: MarkPaidDto): Observable<{ message: string; paidDate: string }> {
    return this.http.put<{ message: string; paidDate: string }>(`${this.apiUrl}/${id}/mark-paid`, dto || {}).pipe(
      tap(() => this.refreshData())
    );
  }

  // Mark as pending
  markAsPending(id: number): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/${id}/mark-pending`, {}).pipe(
      tap(() => this.refreshData())
    );
  }

  // Delete static fee
  deleteStaticFee(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.refreshData())
    );
  }

  // Get categories
  getCategories(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/categories`);
  }

  // Get payment methods
  getPaymentMethods(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/payment-methods`);
  }

  // Refresh data
  private refreshData(): void {
    this.getStaticFees().subscribe();
    this.getSummary().subscribe();
  }

  // Get current fees value
  get currentFees(): StaticFeeModel[] {
    return this.staticFeesSubject.getValue();
  }

  // Get current summary value
  get currentSummary(): StaticFeeSummary | null {
    return this.summarySubject.getValue();
  }
}
