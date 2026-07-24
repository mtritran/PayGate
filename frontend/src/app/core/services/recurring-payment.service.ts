import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';

export type RecurringType = 'RECURRING_TRANSFER' | 'BILL_PAYMENT';
export type RecurringCategory = 'TRANSFER' | 'ELECTRICITY' | 'WATER' | 'INTERNET';
export type RecurringFrequency = 'ONCE' | 'MINUTELY' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type RecurringStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export interface CreateRecurringPaymentRequest {
  type: RecurringType;
  category: RecurringCategory;
  providerCode?: string;
  billCode?: string;
  destAccountId?: number;
  amount: number;
  description?: string;
  frequency: RecurringFrequency;
  startDate?: string;
}

export interface RecurringPaymentResponse {
  id: number;
  userId: number;
  type: RecurringType;
  category: RecurringCategory;
  providerCode?: string;
  billCode?: string;
  destAccountId?: number;
  destAccountNumber?: string;
  amount: number;
  currency: string;
  description?: string;
  frequency: RecurringFrequency;
  status: RecurringStatus;
  startDate: string;
  nextRunAt: string;
  lastRunAt?: string;
  failureCount: number;
  createdAt: string;
}

export interface RecurringPaymentLogResponse {
  id: number;
  recurringPaymentId: number;
  transactionRef?: string;
  status: string;
  message: string;
  executedAt: string;
}

@Injectable({ providedIn: 'root' })
export class RecurringPaymentService {
  private apiUrl = `${environment.apiUrl}/recurring-payments`;

  constructor(private http: HttpClient) {}

  create(data: CreateRecurringPaymentRequest): Observable<ApiResponse<RecurringPaymentResponse>> {
    return this.http.post<ApiResponse<RecurringPaymentResponse>>(this.apiUrl, data);
  }

  getMyPayments(): Observable<ApiResponse<RecurringPaymentResponse[]>> {
    return this.http.get<ApiResponse<RecurringPaymentResponse[]>>(this.apiUrl);
  }

  getById(id: number): Observable<ApiResponse<RecurringPaymentResponse>> {
    return this.http.get<ApiResponse<RecurringPaymentResponse>>(`${this.apiUrl}/${id}`);
  }

  updateStatus(id: number, status: RecurringStatus): Observable<ApiResponse<RecurringPaymentResponse>> {
    return this.http.patch<ApiResponse<RecurringPaymentResponse>>(`${this.apiUrl}/${id}/status`, { status });
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`);
  }

  getLogs(id: number): Observable<ApiResponse<RecurringPaymentLogResponse[]>> {
    return this.http.get<ApiResponse<RecurringPaymentLogResponse[]>>(`${this.apiUrl}/${id}/logs`);
  }
}
