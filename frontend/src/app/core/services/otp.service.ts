import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';

export interface OtpResponse {
  sent: boolean;
  maskedEmail: string;
  message: string;
  expiresInSeconds: number;
}

@Injectable({
  providedIn: 'root'
})
export class OtpService {
  private apiUrl = '/api/v1/auth/otp';

  constructor(private http: HttpClient) {}

  sendOtp(action: string = 'Verify transaction'): Observable<ApiResponse<OtpResponse>> {
    return this.http.post<ApiResponse<OtpResponse>>(`${this.apiUrl}/send`, { action });
  }

  verifyOtp(otpCode: string, action: string = 'Verify transaction'): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/verify`, { otpCode, action });
  }
}
