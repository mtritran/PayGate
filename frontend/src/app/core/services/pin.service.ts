import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';

export interface PinStatusResponse {
  hasPin: boolean;
  pinEnabled: boolean;
}

@Injectable({ providedIn: 'root' })
export class PinService {
  private apiUrl = `${environment.apiUrl}/users/pin`;

  constructor(private http: HttpClient) {}

  getPinStatus(): Observable<ApiResponse<PinStatusResponse>> {
    return this.http.get<ApiResponse<PinStatusResponse>>(`${this.apiUrl}/status`);
  }

  setupPin(newPin: string, oldPin?: string): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.apiUrl}/setup`, { oldPin, newPin });
  }

  verifyPin(pin: string): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/verify`, { pin });
  }
}
