import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';

export interface CheckoutInfo {
  token: string;
  merchantName: string;
  merchantCode: string;
  orderId: string;
  amount: number;
  description: string;
  returnUrl: string;
  cancelUrl: string;
  status: string;
  createdAt: string;
  expiresAt: string;
}

export interface CheckoutProcessResult {
  transactionRef: string;
  redirectUrl: string;
}

@Injectable({
  providedIn: 'root'
})
export class CheckoutService {
  private apiUrl = '/api/v1/checkout';

  constructor(private http: HttpClient) {}

  getCheckoutInfo(token: string): Observable<ApiResponse<CheckoutInfo>> {
    return this.http.get<ApiResponse<CheckoutInfo>>(`${this.apiUrl}/info/${token}`);
  }

  processCheckout(token: string, otpCode: string): Observable<ApiResponse<CheckoutProcessResult>> {
    return this.http.post<ApiResponse<CheckoutProcessResult>>(`${this.apiUrl}/process`, { token, otpCode });
  }
}
