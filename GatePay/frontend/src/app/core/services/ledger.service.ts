import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { LedgerVerificationResponse, LedgerEntry } from '../models/ledger.model';

@Injectable({
  providedIn: 'root'
})
export class LedgerService {
  private readonly baseUrl = '/api/v1/admin/ledger';

  constructor(private http: HttpClient) {}

  verifyLedger(): Observable<ApiResponse<LedgerVerificationResponse>> {
    return this.http.get<ApiResponse<LedgerVerificationResponse>>(`${this.baseUrl}/verify`);
  }

  getEntriesByAccount(accountId: number): Observable<ApiResponse<LedgerEntry[]>> {
    return this.http.get<ApiResponse<LedgerEntry[]>>(`${this.baseUrl}/account/${accountId}`);
  }
}
