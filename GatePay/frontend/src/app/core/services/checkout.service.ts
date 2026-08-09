import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';

export interface CheckoutInfo {
  token: string;
  merchantName: string;
  merchantCode: string;
  orderId: string;
  amount: number;
  method?: string;
  upfrontAmount?: number;
  financeAmount?: number;
  merchantCustomerRef?: string;
  customerEmail?: string;
  customerName?: string;
  description: string;
  returnUrl: string;
  cancelUrl: string;
  status: string;
  createdAt: string;
  expiresAt: string;
}

export interface CheckoutProcessResult {
  transactionRef: string;
  redirectUrl: string;
}

export interface BnplCheckoutResult {
  token: string;
  orderId: string;
  customerId: number;
  merchantCustomerRef?: string;
  customerEmail?: string;
  customerName?: string;
  totalAmount: number;
  status: string;
  creditScore?: number;
  riskGrade?: string;
  approvedLimit?: number;
  maximumFinancedAmount?: number;
  assessmentReason?: string;
}

export interface BnplProposalResult {
  proposalRef: string;
  checkoutToken: string;
  customerId: number;
  financedAmount: number;
  upfrontAmount: number;
  tenorMonths: number;
  monthlyInstallment: number;
  status: string;
  loanRef?: string;
  transactionRef?: string;
}

export interface BnplBorrowerProfileRequest {
  fullName: string;
  occupation: string;
  companyName: string;
  monthlyIncome: number;
  relative1Name: string;
  relative1Phone: string;
  relative1Relationship: string;
  relative2Name: string;
  relative2Phone: string;
  relative2Relationship: string;
}

@Injectable({
  providedIn: 'root'
})
export class CheckoutService {
  private apiUrl = '/api/v1/checkout';

  constructor(private http: HttpClient) {}

  getCheckoutInfo(token: string): Observable<ApiResponse<CheckoutInfo>> {
    return this.http.get<ApiResponse<CheckoutInfo>>(`${this.apiUrl}/info/${token}`);
  }

  processCheckout(token: string, otpCode: string): Observable<ApiResponse<CheckoutProcessResult>> {
    return this.http.post<ApiResponse<CheckoutProcessResult>>(`${this.apiUrl}/process`, { token, otpCode });
  }

  selectBnplCustomer(token: string, customerId: number): Observable<ApiResponse<BnplCheckoutResult>> {
    return this.http.post<ApiResponse<BnplCheckoutResult>>(`${this.apiUrl}/${token}/customer`, { customerId });
  }

  submitBorrowerProfile(
    token: string,
    request: BnplBorrowerProfileRequest
  ): Observable<ApiResponse<BnplCheckoutResult>> {
    return this.http.post<ApiResponse<BnplCheckoutResult>>(`${this.apiUrl}/${token}/borrower-profile`, request);
  }

  assessBnplCredit(token: string): Observable<ApiResponse<BnplCheckoutResult>> {
    return this.http.post<ApiResponse<BnplCheckoutResult>>(`${this.apiUrl}/${token}/credit-assessment`, {});
  }

  createBnplProposal(
    token: string,
    financedAmount: number,
    tenorMonths: number
  ): Observable<ApiResponse<BnplProposalResult>> {
    return this.http.post<ApiResponse<BnplProposalResult>>(`${this.apiUrl}/${token}/bnpl-proposals`, {
      financedAmount,
      tenorMonths
    });
  }

  confirmBnplProposal(proposalRef: string): Observable<ApiResponse<BnplProposalResult>> {
    return this.http.post<ApiResponse<BnplProposalResult>>(`${this.apiUrl}/bnpl-proposals/${proposalRef}/confirm`, {});
  }

  cancelCheckout(token: string): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.apiUrl}/cancel/${token}`, {});
  }
}
