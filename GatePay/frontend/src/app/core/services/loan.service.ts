import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { PageResponse } from '../models/page-response.model';

export type LoanStatus = 'PENDING_APPROVAL' | 'OFFERED' | 'ACTIVE' | 'PAID_OFF' | 'REJECTED' | 'OVERDUE';
export type LoanScheduleStatus = 'UNPAID' | 'PENDING' | 'PROCESSING' | 'PAID' | 'OVERDUE';
export type RepayType = 'NEXT_PERIOD' | 'FULL_SETTLEMENT';

export interface LoanScheduleResponse {
  id: number;
  periodNumber: number;
  dueDate: string;
  amountDue: number;
  status: LoanScheduleStatus;
  paidAt?: string;
  transactionRef?: string;
}

export interface LoanResponse {
  id: number;
  loanRef: string;
  amount: number;
  interestRate: number;
  termMonths: number;
  monthlyAmount: number;
  totalRepayable: number;
  remainingAmount: number;
  reason?: string;
  status: LoanStatus;
  adminNote?: string;
  disbursedAt?: string;
  createdAt: string;
  schedules?: LoanScheduleResponse[];
  userId?: number;
  userFullName?: string;
  userEmail?: string;
}

export interface LoanApplyRequest {
  amount: number;
  termMonths: number;
  reason?: string;
}

@Injectable({ providedIn: 'root' })
export class LoanService {
  private apiUrl = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  applyLoan(request: LoanApplyRequest): Observable<ApiResponse<LoanResponse>> {
    return this.http.post<ApiResponse<LoanResponse>>(`${this.apiUrl}/loans/apply`, request);
  }

  getMyLoans(page = 0, size = 20): Observable<ApiResponse<PageResponse<LoanResponse>>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<ApiResponse<PageResponse<LoanResponse>>>(`${this.apiUrl}/loans/my-loans`, { params });
  }

  getLoanById(id: number): Observable<ApiResponse<LoanResponse>> {
    return this.http.get<ApiResponse<LoanResponse>>(`${this.apiUrl}/loans/${id}`);
  }

  acceptLoanOffer(id: number): Observable<ApiResponse<LoanResponse>> {
    return this.http.post<ApiResponse<LoanResponse>>(`${this.apiUrl}/loans/${id}/accept-offer`, {});
  }

  downloadContractPdfBlob(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/loans/${id}/contract-pdf`, { responseType: 'blob' });
  }

  repayLoan(id: number, repayType: RepayType): Observable<ApiResponse<LoanResponse>> {
    return this.http.post<ApiResponse<LoanResponse>>(`${this.apiUrl}/loans/${id}/repay`, { repayType });
  }

  // Admin APIs
  getAllLoansForAdmin(page = 0, size = 20): Observable<ApiResponse<PageResponse<LoanResponse>>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<ApiResponse<PageResponse<LoanResponse>>>(`${this.apiUrl}/admin/loans`, { params });
  }

  approveLoan(id: number, adminNote?: string): Observable<ApiResponse<LoanResponse>> {
    return this.http.post<ApiResponse<LoanResponse>>(`${this.apiUrl}/admin/loans/${id}/approve`, { adminNote });
  }

  rejectLoan(id: number, adminNote?: string): Observable<ApiResponse<LoanResponse>> {
    return this.http.post<ApiResponse<LoanResponse>>(`${this.apiUrl}/admin/loans/${id}/reject`, { adminNote });
  }
}
