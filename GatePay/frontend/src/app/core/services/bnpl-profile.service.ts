import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { BnplBorrowerProfileRequest } from './checkout.service';

export interface BnplProfileResponse {
  userId: number;
  occupation: string;
  companyName: string;
  monthlyIncome: number;
  relative1Name: string;
  relative1Phone: string;
  relative1Relationship: string;
  relative2Name: string;
  relative2Phone: string;
  relative2Relationship: string;
  creditScore?: number;
  riskGrade?: string;
  approvedLimit?: number;
  assessmentReason?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BnplProfileService {
  private apiUrl = '/api/v1/bnpl-profile';

  constructor(private http: HttpClient) {}

  getMyProfile(): Observable<ApiResponse<BnplProfileResponse>> {
    return this.http.get<ApiResponse<BnplProfileResponse>>(`${this.apiUrl}/me`);
  }

  updateMyProfile(request: BnplBorrowerProfileRequest): Observable<ApiResponse<BnplProfileResponse>> {
    return this.http.post<ApiResponse<BnplProfileResponse>>(`${this.apiUrl}/me`, request);
  }

  assessCredit(): Observable<ApiResponse<BnplProfileResponse>> {
    return this.http.post<ApiResponse<BnplProfileResponse>>(`${this.apiUrl}/me/assess`, {});
  }
}
