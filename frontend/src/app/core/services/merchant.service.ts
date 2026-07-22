import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { PageResponse } from '../models/page-response.model';
import { Merchant, CreateMerchantRequest, UpdateMerchantRequest } from '../models/merchant.model';

@Injectable({
  providedIn: 'root'
})
export class MerchantService {
  private readonly baseUrl = '/api/v1/admin/merchants';

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
}
