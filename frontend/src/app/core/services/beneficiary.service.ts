import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';

export interface BeneficiaryResponse {
  id: number;
  userId: number;
  beneficiaryUserId?: number;
  accountNumber: string;
  accountHolderName: string;
  nickName?: string;
  bankName: string;
  createdAt: string;
}

export interface CreateBeneficiaryRequest {
  accountNumber: string;
  accountHolderName: string;
  nickName?: string;
  bankName?: string;
}

@Injectable({ providedIn: 'root' })
export class BeneficiaryService {
  private apiUrl = `${environment.apiUrl}/beneficiaries`;

  constructor(private http: HttpClient) {}

  getMyBeneficiaries(): Observable<ApiResponse<BeneficiaryResponse[]>> {
    return this.http.get<ApiResponse<BeneficiaryResponse[]>>(this.apiUrl);
  }

  create(data: CreateBeneficiaryRequest): Observable<ApiResponse<BeneficiaryResponse>> {
    return this.http.post<ApiResponse<BeneficiaryResponse>>(this.apiUrl, data);
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`);
  }
}
