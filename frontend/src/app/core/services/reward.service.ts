import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PointsResponse {
  totalPoints: number;
  earnedThisMonth: number;
  tier: string;
}

export interface PointTransactionResponse {
  id: number;
  points: number;
  type: 'EARN' | 'REDEEM';
  description: string;
  transactionRef?: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class RewardService {
  private apiUrl = `${environment.apiUrl}/rewards`;

  constructor(private http: HttpClient) {}

  getMyPoints(): Observable<ApiResponse<PointsResponse>> {
    return this.http.get<ApiResponse<PointsResponse>>(`${this.apiUrl}/my-points`);
  }

  getPointsHistory(page: number = 0, size: number = 20): Observable<ApiResponse<PageResponse<PointTransactionResponse>>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<ApiResponse<PageResponse<PointTransactionResponse>>>(`${this.apiUrl}/history`, { params });
  }
}
