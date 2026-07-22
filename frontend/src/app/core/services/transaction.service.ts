import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { PageResponse } from '../models/page-response.model';
import { PaymentRequest, TransactionDetailResponse, TransactionResponse } from '../models/transaction.model';

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

  getMyTransactions(page: number = 0, size: number = 20): Observable<ApiResponse<PageResponse<TransactionResponse>>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<ApiResponse<PageResponse<TransactionResponse>>>(this.apiUrl, { params });
  }

  refund(ref: string): Observable<ApiResponse<TransactionResponse>> {
    return this.http.post<ApiResponse<TransactionResponse>>(`${this.apiUrl}/${ref}/refund`, {});
  }
}
