import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { PageResponse } from '../models/page-response.model';
import { AccountResponse, AccountLookupResponse, TopUpRequest } from '../models/account.model';
import { TransactionResponse } from '../models/transaction.model';

export interface LinkedBankRequestDTO {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  balance: number;
  iconType?: string;
}

export interface LinkedBankResponseDTO {
  id: string | number;
  userId?: number;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  balance: number;
  iconType: 'BANK' | 'CARD' | 'MOMO';
  status?: string;
  createdAt?: string;
}

@Injectable({ providedIn: 'root' })
export class AccountService {
  private apiUrl = `${environment.apiUrl}/accounts`;

  private accountSubject = new BehaviorSubject<AccountResponse | null>(null);
  public account$ = this.accountSubject.asObservable();

  private linkedBanksSubject = new BehaviorSubject<LinkedBankResponseDTO[]>([]);
  public linkedBanks$ = this.linkedBanksSubject.asObservable();

  constructor(private http: HttpClient) {
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => this.refreshAccountState());
    }
  }

  refreshAccountState(): void {
    this.getAccountMe().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.accountSubject.next(res.data);
        }
      }
    });

    this.getLinkedBanks().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.linkedBanksSubject.next(res.data);
        }
      }
    });
  }

  getAccountMe(): Observable<ApiResponse<AccountResponse>> {
    return this.http.get<ApiResponse<AccountResponse>>(`${this.apiUrl}/me`).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.accountSubject.next(res.data);
        }
      })
    );
  }

  getAccountBalance(id: number): Observable<ApiResponse<AccountResponse>> {
    return this.http.get<ApiResponse<AccountResponse>>(`${this.apiUrl}/${id}/balance`).pipe(
      tap(res => {
        if (res.success && res.data) {
          const current = this.accountSubject.value;
          if (current) {
            this.accountSubject.next({ ...current, balance: res.data.balance });
          }
        }
      })
    );
  }

  topUp(request: TopUpRequest): Observable<ApiResponse<TransactionResponse>> {
    return this.http.post<ApiResponse<TransactionResponse>>(`${this.apiUrl}/topup`, request).pipe(
      tap(res => {
        if (res.success) {
          this.refreshAccountState();
        }
      })
    );
  }

  getAccountHistory(id: number, page: number = 0, size: number = 20): Observable<ApiResponse<PageResponse<TransactionResponse>>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<ApiResponse<PageResponse<TransactionResponse>>>(`${this.apiUrl}/${id}/history`, { params });
  }

  getLinkedBanks(): Observable<ApiResponse<LinkedBankResponseDTO[]>> {
    return this.http.get<ApiResponse<LinkedBankResponseDTO[]>>(`${this.apiUrl}/linked-banks`).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.linkedBanksSubject.next(res.data);
        }
      })
    );
  }

  linkBank(request: LinkedBankRequestDTO): Observable<ApiResponse<LinkedBankResponseDTO>> {
    return this.http.post<ApiResponse<LinkedBankResponseDTO>>(`${this.apiUrl}/linked-banks`, request).pipe(
      tap(res => {
        if (res.success) {
          this.refreshAccountState();
        }
      })
    );
  }

  unlinkBank(id: string | number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/linked-banks/${id}`).pipe(
      tap(res => {
        if (res.success) {
          this.refreshAccountState();
        }
      })
    );
  }

  lookupAccount(query: string): Observable<ApiResponse<AccountLookupResponse>> {
    const params = new HttpParams().set('query', query);
    return this.http.get<ApiResponse<AccountLookupResponse>>(`${this.apiUrl}/lookup`, { params });
  }
}
