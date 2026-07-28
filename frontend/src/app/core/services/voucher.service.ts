import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PageResponse } from './reward.service';
import { ApiResponse } from '../models/api-response.model';

export interface VoucherResponse {
  id: number;
  code: string;
  title: string;
  discountAmount: number;
  pointsRequired: number;
  minOrderAmount: number;
  applicableType: string;
  totalQuantity: number;
  remainingQty: number;
  expiresAt: string;
  createdAt: string;
}

export interface UserVoucherResponse {
  userVoucherId: number;
  voucherId: number;
  voucherCode: string;
  title: string;
  discountAmount: number;
  status: 'AVAILABLE' | 'USED' | 'EXPIRED';
  redeemedAt: string;
  usedAt?: string;
  expiresAt: string;
}

export interface VoucherApplyResponse {
  valid: boolean;
  discountAmount: number;
  finalAmount: number;
  userVoucherId?: number;
  message?: string;
}

export interface VoucherCreateRequest {
  code: string;
  title: string;
  discountAmount: number;
  pointsRequired: number;
  minOrderAmount: number;
  applicableType: string;
  totalQuantity: number;
  expiresAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class VoucherService {
  private apiUrl = `${environment.apiUrl}/vouchers`;
  private adminApiUrl = `${environment.apiUrl}/admin/vouchers`;

  constructor(private http: HttpClient) {}

  getShopVouchers(page: number = 0, size: number = 20): Observable<ApiResponse<PageResponse<VoucherResponse>>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<ApiResponse<PageResponse<VoucherResponse>>>(`${this.apiUrl}/shop`, { params });
  }

  redeemVoucher(voucherId: number): Observable<ApiResponse<UserVoucherResponse>> {
    return this.http.post<ApiResponse<UserVoucherResponse>>(`${this.apiUrl}/redeem`, { voucherId });
  }

  getMyVouchers(): Observable<ApiResponse<UserVoucherResponse[]>> {
    return this.http.get<ApiResponse<UserVoucherResponse[]>>(`${this.apiUrl}/my-vouchers`);
  }

  applyVoucher(voucherCode: string, originalAmount: number, transactionType: string): Observable<ApiResponse<VoucherApplyResponse>> {
    return this.http.post<ApiResponse<VoucherApplyResponse>>(`${this.apiUrl}/apply`, {
      voucherCode,
      originalAmount,
      transactionType
    });
  }

  // --- ADMIN APIs ---
  getAllVouchersForAdmin(page: number = 0, size: number = 20): Observable<ApiResponse<PageResponse<VoucherResponse>>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<ApiResponse<PageResponse<VoucherResponse>>>(this.adminApiUrl, { params });
  }

  createVoucher(req: VoucherCreateRequest): Observable<ApiResponse<VoucherResponse>> {
    return this.http.post<ApiResponse<VoucherResponse>>(this.adminApiUrl, req);
  }

  updateVoucher(id: number, req: VoucherCreateRequest): Observable<ApiResponse<VoucherResponse>> {
    return this.http.put<ApiResponse<VoucherResponse>>(`${this.adminApiUrl}/${id}`, req);
  }

  deleteVoucher(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.adminApiUrl}/${id}`);
  }
}
