import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FeeModel, CreateFeeModel, PayFeeModel, FeesSummary } from './fee.interface';
import { ApiConfig } from '../../core/config/api.config';

@Injectable({
  providedIn: 'root'
})
export class FeeService {
  private apiUrl = ApiConfig.ENDPOINTS.FEES;

  constructor(private http: HttpClient) {}

  // Get all fees
  getFees(): Observable<FeeModel[]> {
    return this.http.get<FeeModel[]>(this.apiUrl);
  }

  // Get fees by child
  getFeesByChild(childId: number): Observable<FeeModel[]> {
    return this.http.get<FeeModel[]>(`${this.apiUrl}/child/${childId}`);
  }

  // Get fees by parent
  getFeesByParent(parentId: number): Observable<FeeModel[]> {
    return this.http.get<FeeModel[]>(`${this.apiUrl}/parent/${parentId}`);
  }

  // Get single fee
  getFee(id: number): Observable<FeeModel> {
    return this.http.get<FeeModel>(`${this.apiUrl}/${id}`);
  }

  // Get fee by id (alias)
  getFeeById(id: number): Observable<FeeModel> {
    return this.http.get<FeeModel>(`${this.apiUrl}/${id}`);
  }

  // Update fee
  updateFee(id: number, fee: FeeModel): Observable<FeeModel> {
    return this.http.put<FeeModel>(`${this.apiUrl}/${id}`, fee);
  }

  // Create new fee
  createFee(fee: CreateFeeModel): Observable<FeeModel> {
    return this.http.post<FeeModel>(this.apiUrl, fee);
  }

  // Create monthly fees for all children
  createMonthlyFeesForAll(amount: number, description: string, dueDate: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/bulk-monthly`, {
      amount,
      description,
      dueDate
    });
  }

  // Pay fee
  payFee(feeId: number, paymentData: PayFeeModel): Observable<any> {
    return this.http.put(`${this.apiUrl}/${feeId}/pay`, paymentData);
  }

  // Update overdue fees
  updateOverdueFees(): Observable<any> {
    return this.http.put(`${this.apiUrl}/update-overdue`, {});
  }

  // Get fees summary
  getFeesSummary(): Observable<FeesSummary> {
    return this.http.get<FeesSummary>(`${this.apiUrl}/summary`);
  }

  // Delete fee
  deleteFee(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}