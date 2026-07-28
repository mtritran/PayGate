import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from './reward.service';

export interface BillProviderResponse {
  id: number;
  code: string;
  name: string;
  type: 'ELECTRICITY' | 'WATER' | 'INTERNET';
  merchantId: number;
  active: boolean;
}

export interface BillResponse {
  id: number;
  providerCode: string;
  providerName: string;
  customerCode: string;
  customerName: string;
  address: string;
  amount: number;
  period: string;
  status: 'UNPAID' | 'PAID';
  transactionRef?: string;
  paidAt?: string;
}

export interface SavedBillResponse {
  id: number;
  providerCode: string;
  providerName: string;
  customerCode: string;
  nickname?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BillService {
  private apiUrl = `${environment.apiUrl}/bills`;

  constructor(private http: HttpClient) {}

  getProviders(): Observable<ApiResponse<BillProviderResponse[]>> {
    return this.http.get<ApiResponse<BillProviderResponse[]>>(`${this.apiUrl}/providers`);
  }

  lookupBill(providerCode: string, customerCode: string): Observable<ApiResponse<BillResponse>> {
    return this.http.post<ApiResponse<BillResponse>>(`${this.apiUrl}/lookup`, { providerCode, customerCode });
  }

  payBill(billId: number, voucherCode?: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/pay`, { billId, voucherCode });
  }

  getSavedBills(): Observable<ApiResponse<SavedBillResponse[]>> {
    return this.http.get<ApiResponse<SavedBillResponse[]>>(`${this.apiUrl}/saved`);
  }

  saveBill(providerCode: string, customerCode: string, nickname?: string): Observable<ApiResponse<SavedBillResponse>> {
    return this.http.post<ApiResponse<SavedBillResponse>>(`${this.apiUrl}/saved`, { providerCode, customerCode, nickname });
  }
}
