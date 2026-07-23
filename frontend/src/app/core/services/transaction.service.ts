import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { PageResponse } from '../models/page-response.model';
import { PaymentRequest, TransactionDetailResponse, TransactionResponse, TransactionType, TransactionStatus } from '../models/transaction.model';

export interface TransactionFilters {
  type?: TransactionType;
  status?: TransactionStatus;
  sourceAccountId?: number;
  destAccountId?: number;
  merchantId?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
  page?: number;
  size?: number;
}

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private apiUrl = `${environment.apiUrl}/transactions`;

  constructor(private http: HttpClient) {}

  processPayment(request: PaymentRequest): Observable<ApiResponse<TransactionResponse>> {
    return this.http.post<ApiResponse<TransactionResponse>>(`${this.apiUrl}/pay`, request);
  }

  getTransactionByRef(ref: string): Observable<ApiResponse<TransactionDetailResponse>> {
    return this.http.get<ApiResponse<TransactionDetailResponse>>(`${this.apiUrl}/${ref}`);
  }

  getMyTransactions(filters: TransactionFilters = {}): Observable<ApiResponse<PageResponse<TransactionResponse>>> {
    let params = new HttpParams();

    if (filters.page !== undefined) {
      params = params.set('page', filters.page.toString());
    }
    if (filters.size !== undefined) {
      params = params.set('size', filters.size.toString());
    }
    if (filters.type) {
      params = params.set('type', filters.type);
    }
    if (filters.status) {
      params = params.set('status', filters.status);
    }
    if (filters.sourceAccountId !== undefined) {
      params = params.set('sourceAccountId', filters.sourceAccountId.toString());
    }
    if (filters.destAccountId !== undefined) {
      params = params.set('destAccountId', filters.destAccountId.toString());
    }
    if (filters.merchantId !== undefined) {
      params = params.set('merchantId', filters.merchantId.toString());
    }
    if (filters.sortBy) {
      params = params.set('sortBy', filters.sortBy);
    }
    if (filters.sortDir) {
      params = params.set('sortDir', filters.sortDir);
    }

    return this.http.get<ApiResponse<PageResponse<TransactionResponse>>>(this.apiUrl, { params });
  }

  refund(ref: string): Observable<ApiResponse<TransactionResponse>> {
    return this.http.post<ApiResponse<TransactionResponse>>(`${this.apiUrl}/${ref}/refund`, {});
  }
}