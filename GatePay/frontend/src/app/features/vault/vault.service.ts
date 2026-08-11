import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../core/models/api-response.model';

export interface VaultResponse {
  id: number;
  name: string;
  description?: string;
  targetAmount: number;
  currentBalance: number;
  progress: number;
  deadline?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CLOSED';
  createdAt: string;
  updatedAt?: string;
}

export interface CreateVaultRequest {
  name: string;
  targetAmount: number;
  deadline?: string;
  description?: string;
}

export type UpdateVaultRequest = CreateVaultRequest;

export interface DepositWithdrawRequest {
  amount: number;
  description?: string;
}

export interface VaultTransactionResponse {
  transactionRef: string;
  amount: number;
  vaultBalance: number;
  status: string;
}

@Injectable({ providedIn: 'root' })
export class VaultService {
  private apiUrl = `${environment.apiUrl}/vaults`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiResponse<VaultResponse[]>> {
    return this.http.get<ApiResponse<VaultResponse[]>>(this.apiUrl);
  }

  getById(id: number): Observable<ApiResponse<VaultResponse>> {
    return this.http.get<ApiResponse<VaultResponse>>(`${this.apiUrl}/${id}`);
  }

  create(req: CreateVaultRequest): Observable<ApiResponse<VaultResponse>> {
    return this.http.post<ApiResponse<VaultResponse>>(this.apiUrl, req);
  }

  update(id: number, req: UpdateVaultRequest): Observable<ApiResponse<VaultResponse>> {
    return this.http.put<ApiResponse<VaultResponse>>(`${this.apiUrl}/${id}`, req);
  }

  deposit(id: number, req: DepositWithdrawRequest): Observable<ApiResponse<VaultTransactionResponse>> {
    return this.http.post<ApiResponse<VaultTransactionResponse>>(`${this.apiUrl}/${id}/deposit`, req);
  }

  withdraw(id: number, req: DepositWithdrawRequest): Observable<ApiResponse<VaultTransactionResponse>> {
    return this.http.post<ApiResponse<VaultTransactionResponse>>(`${this.apiUrl}/${id}/withdraw`, req);
  }

  close(id: number): Observable<ApiResponse<VaultResponse>> {
    return this.http.patch<ApiResponse<VaultResponse>>(`${this.apiUrl}/${id}/close`, {});
  }

  reopen(id: number): Observable<ApiResponse<VaultResponse>> {
    return this.http.patch<ApiResponse<VaultResponse>>(`${this.apiUrl}/${id}/reopen`, {});
  }
}
