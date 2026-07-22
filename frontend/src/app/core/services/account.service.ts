import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { PageResponse } from '../models/page-response.model';
import { AccountResponse, TopUpRequest } from '../models/account.model';
import { TransactionResponse } from '../models/transaction.model';

@Injectable({ providedIn: 'root' })
export class AccountService {
  private apiUrl = `${environment.apiUrl}/accounts`;

  constructor(private http: HttpClient) {}

  getAccountMe(): Observable<ApiResponse<AccountResponse>> {
    return this.http.get<ApiResponse<AccountResponse>>(`${this.apiUrl}/me`);
  }

  getAccountBalance(id: number): Observable<ApiResponse<AccountResponse>> {
    return this.http.get<ApiResponse<AccountResponse>>(`${this.apiUrl}/${id}/balance`);
  }

  topUp(request: TopUpRequest): Observable<ApiResponse<TransactionResponse>> {
    return this.http.post<ApiResponse<TransactionResponse>>(`${this.apiUrl}/topup`, request);
  }

  getAccountHistory(id: number, page: number = 0, size: number = 20): Observable<ApiResponse<PageResponse<TransactionResponse>>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<ApiResponse<PageResponse<TransactionResponse>>>(`${this.apiUrl}/${id}/history`, { params });
  }
}
