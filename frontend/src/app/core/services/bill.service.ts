import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';

export type BillType = 'ELECTRICITY' | 'WATER' | 'INTERNET';

export interface MockCustomerCode {
  customerCode: string;
  customerName: string;
  address: string;
  amount: number;
}

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

export type BillSubscriptionFrequency = 'MINUTELY' | 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface BillSubscriptionResponse {
  id: number;
  providerId: number;
  providerCode: string;
  providerName: string;
  providerType: BillType;
  customerCode: string;
  customerName: string;
  address: string;
  cycleAmount: number;
  frequency: BillSubscriptionFrequency;
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED';
  nextBillAt: string;
  lastBillAt: string;
  createdAt: string;
}

export interface CreateBillSubscriptionRequest {
  providerCode: string;
  customerName: string;
  address: string;
  cycleAmount: number;
  frequency: BillSubscriptionFrequency;
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

  createSubscription(req: CreateBillSubscriptionRequest): Observable<ApiResponse<BillSubscriptionResponse>> {
    return this.http.post<ApiResponse<BillSubscriptionResponse>>(`${this.apiUrl}/subscriptions`, req);
  }

  getSubscriptions(): Observable<ApiResponse<BillSubscriptionResponse[]>> {
    return this.http.get<ApiResponse<BillSubscriptionResponse[]>>(`${this.apiUrl}/subscriptions`);
  }

  getMyCodes(providerCode: string): Observable<ApiResponse<BillSubscriptionResponse[]>> {
    const params = new HttpParams().set('providerCode', providerCode);
    return this.http.get<ApiResponse<BillSubscriptionResponse[]>>(`${this.apiUrl}/my-codes`, { params });
  }

  cancelSubscription(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/subscriptions/${id}`);
  }

  /**
   * Returns local mock customer codes for demo/testing purposes.
   * No backend call needed - data is generated based on providerCode.
   */
  getMockCustomerCodes(providerCode: string): Observable<ApiResponse<MockCustomerCode[]>> {
    const MOCK_MAP: Record<string, MockCustomerCode[]> = {
      // Electricity providers
      'EVN-HCM': [
        { customerCode: 'PE0100112233', customerName: 'NGUYEN VAN AN',     address: '123 Nguyễn Huệ, Q1, HCM',     amount: 320000 },
        { customerCode: 'PE0100223344', customerName: 'TRAN THI BICH',     address: '45 Lê Lợi, Q3, HCM',          amount: 185000 },
        { customerCode: 'PE0100334455', customerName: 'LE VAN CUONG',      address: '88 Đinh Tiên Hoàng, Bình Thạnh', amount: 470000 }
      ],
      'EVN-HN': [
        { customerCode: 'HN0100112233', customerName: 'PHAM THI DUNG',     address: '12 Hoàn Kiếm, Hà Nội',       amount: 250000 },
        { customerCode: 'HN0100223344', customerName: 'NGUYEN MANH HUNG',  address: '99 Xuân Thủy, Cầu Giấy, HN', amount: 410000 }
      ],
      // Water providers
      'SAWACO': [
        { customerCode: 'W0100001122', customerName: 'DO THI HIEN',        address: '7 Cống Quỳnh, Q1, HCM',       amount: 95000 },
        { customerCode: 'W0100002233', customerName: 'VU QUOC TOAN',       address: '33 Phan Văn Hân, Bình Thạnh', amount: 142000 },
        { customerCode: 'W0100003344', customerName: 'HOANG THI LAN',      address: '55 Tân Phú, Q7, HCM',        amount: 78000 }
      ],
      'HAWACOM': [
        { customerCode: 'HW0100001122', customerName: 'TRAN NGOC MINH',    address: '20 Hai Bà Trưng, Hà Nội',    amount: 110000 },
        { customerCode: 'HW0100002233', customerName: 'LY THI NGOC',       address: '15 Thái Hà, Đống Đa, HN',   amount: 88000 }
      ],
      // Internet providers
      'VNPT': [
        { customerCode: 'VNPT00112233', customerName: 'NGUYEN THANH SON',  address: '101 Nguyễn Chí Thanh, HCM', amount: 165000 },
        { customerCode: 'VNPT00223344', customerName: 'PHAM QUANG VINH',   address: '8 Lê Văn Sỹ, Q3, HCM',     amount: 220000 }
      ],
      'VIETTEL': [
        { customerCode: 'VTL00112233',  customerName: 'DANG THU HANG',     address: '200 Trần Duy Hưng, HN',     amount: 199000 },
        { customerCode: 'VTL00223344',  customerName: 'NGO XUAN TRUONG',   address: '50 Đội Cấn, Ba Đình, HN',  amount: 249000 }
      ],
      'FPT': [
        { customerCode: 'FPT00112233',  customerName: 'BUI MINH CHAU',     address: '77 Điện Biên Phủ, Q3, HCM', amount: 189000 },
        { customerCode: 'FPT00223344',  customerName: 'TRINH THI XUAN',    address: '30 Phạm Hùng, HCM',        amount: 299000 }
      ]
    };

    const codes = MOCK_MAP[providerCode] ?? [];
    return of({ success: true, message: 'OK', data: codes } as ApiResponse<MockCustomerCode[]>);
  }
}
