import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiConfig } from '../../core/config/api.config';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiUrl = ApiConfig.ENDPOINTS.PAYMENT;

  constructor(private http: HttpClient) {}

  createCheckoutSession(feeId: number): Observable<{ sessionId: string; url: string }> {
    return this.http.post<{ sessionId: string; url: string }>(
      `${this.apiUrl}/create-checkout-session/${feeId}`,
      {}
    );
  }
}
