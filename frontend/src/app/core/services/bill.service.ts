import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';

export type BillType = 'ELECTRICITY' | 'WATER' | 'INTERNET';

export interface BillProviderResponse {
  id: number;
  code: string;
  name: string;
  type: BillType;
}

export interface BillLookupResponse {
  billId: number;
  providerCode: string;
  providerName: string;
  customerCode: string;
  customerName: string;
  address: string;
  period: string;
  amount: number;
  status: 'UNPAID' | 'PAID';
}

export interface BillPayResponse {
  billId: number;
  status: string;
  originalAmount: number;
  discountAmount: number;
  paidAmount: number;
  transactionRef: string;
  paidAt: string;
}

export interface SavedBillResponse {
  id: number;
  providerId: number;
  providerCode: string;
  providerName: string;
  providerType: BillType;
  customerCode: string;
  nickname?: string;
}

export interface LookupBillRequest {
  providerCode: string;
  customerCode: string;
}

export interface PayBillRequest {
  billId: number;
  voucherCode?: string;
}

export interface CreateSavedBillRequest {
  providerCode: string;
  customerCode: string;
  nickname?: string;
}

@Injectable({ providedIn: 'root' })
export class BillService {
  private apiUrl = `${environment.apiUrl}/bills`;

  constructor(private http: HttpClient) {}

  getProviders(type?: BillType): Observable<ApiResponse<BillProviderResponse[]>> {
    let params = new HttpParams();
    if (type) params = params.set('type', type);
    return this.http.get<ApiResponse<BillProviderResponse[]>>(`${this.apiUrl}/providers`, { params });
  }

  lookup(req: LookupBillRequest): Observable<ApiResponse<BillLookupResponse>> {
    return this.http.post<ApiResponse<BillLookupResponse>>(`${this.apiUrl}/lookup`, req);
  }

  pay(req: PayBillRequest): Observable<ApiResponse<BillPayResponse>> {
    return this.http.post<ApiResponse<BillPayResponse>>(`${this.apiUrl}/pay`, req);
  }

  getSaved(): Observable<ApiResponse<SavedBillResponse[]>> {
    return this.http.get<ApiResponse<SavedBillResponse[]>>(`${this.apiUrl}/saved`);
  }

  createSaved(req: CreateSavedBillRequest): Observable<ApiResponse<SavedBillResponse>> {
    return this.http.post<ApiResponse<SavedBillResponse>>(`${this.apiUrl}/saved`, req);
  }

  getMockCustomerCodes(providerCode: string): Observable<ApiResponse<MockCustomerCode[]>> {
    const params = new HttpParams().set('providerCode', providerCode);
    return this.http.get<ApiResponse<MockCustomerCode[]>>(`${this.apiUrl}/mock/list`, { params });
  }
}

export interface MockCustomerCode {
  customerCode: string;
  customerName: string;
  address: string;
  amount: number;
  period: string;
  type: BillType;
}
