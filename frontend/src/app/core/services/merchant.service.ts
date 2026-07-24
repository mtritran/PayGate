import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { PageResponse } from '../models/page-response.model';
import { Merchant, CreateMerchantRequest, UpdateMerchantRequest, UserMerchantRequest } from '../models/merchant.model';

@Injectable({
  providedIn: 'root'
})
export class MerchantService {
  private readonly baseUrl = '/api/v1/admin/merchants';
  private readonly userBaseUrl = '/api/v1/merchants';

  constructor(private http: HttpClient) {}

  getAll(page: number = 0, size: number = 20, sortBy: string = 'createdAt', sortDir: string = 'DESC'): Observable<ApiResponse<PageResponse<Merchant>>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sortBy', sortBy)
      .set('sortDir', sortDir);

    return this.http.get<ApiResponse<PageResponse<Merchant>>>(this.baseUrl, { params });
  }

  getById(id: number): Observable<ApiResponse<Merchant>> {
    return this.http.get<ApiResponse<Merchant>>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateMerchantRequest): Observable<ApiResponse<Merchant>> {
    return this.http.post<ApiResponse<Merchant>>(this.baseUrl, request);
  }

  update(id: number, request: UpdateMerchantRequest): Observable<ApiResponse<Merchant>> {
    return this.http.put<ApiResponse<Merchant>>(`${this.baseUrl}/${id}`, request);
  }

  approve(id: number): Observable<ApiResponse<Merchant>> {
    return this.http.patch<ApiResponse<Merchant>>(`${this.baseUrl}/${id}/approve`, {});
  }

  reject(id: number): Observable<ApiResponse<Merchant>> {
    return this.http.patch<ApiResponse<Merchant>>(`${this.baseUrl}/${id}/reject`, {});
  }

  getMerchants(page: number = 0, size: number = 20, status?: string, query?: string): Observable<ApiResponse<PageResponse<Merchant>>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    if (status) params = params.set('status', status);
    if (query) params = params.set('query', query);

    return this.http.get<ApiResponse<PageResponse<Merchant>>>(this.baseUrl, { params });
  }

  approveMerchant(id: number): Observable<ApiResponse<Merchant>> {
    return this.http.put<ApiResponse<Merchant>>(`${this.baseUrl}/${id}/approve`, {});
  }

  rejectMerchant(id: number, reason?: string): Observable<ApiResponse<Merchant>> {
    return this.http.put<ApiResponse<Merchant>>(`${this.baseUrl}/${id}/reject`, { reason });
  }

  // User Self-Service APIs
  requestMerchant(request: UserMerchantRequest): Observable<ApiResponse<Merchant>> {
    return this.http.post<ApiResponse<Merchant>>(`${this.userBaseUrl}/request`, request);
  }

  getMyMerchant(): Observable<ApiResponse<Merchant>> {
    return this.http.get<ApiResponse<Merchant>>(`${this.userBaseUrl}/me`);
  }

  getActiveMerchants(): Observable<ApiResponse<Merchant[]>> {
    return this.http.get<ApiResponse<Merchant[]>>(`${this.userBaseUrl}/active`);
  }
}
