import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LoanService, LoanResponse, RepayType } from '../../../core/services/loan.service';
import { NotificationService } from '../../../core/services/notification.service';
import { BnplProfileService, BnplProfileResponse } from '../../../core/services/bnpl-profile.service';
import { BnplProfileFormComponent, BnplProfileFormData } from '../../../shared/components/bnpl-profile-form/bnpl-profile-form.component';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';

@Component({
  selector: 'app-bnpl-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, CurrencyPipe, DatePipe, ReactiveFormsModule, BnplProfileFormComponent],
  template: `
    <div class="bnpl-container fade-in">
      <!-- Top Banner Header -->
      <div class="bnpl-header-card">
        <div class="header-content">
          <div class="header-badge">BUY NOW, PAY LATER</div>
          <h1>BNPL Installment <span class="highlight-pink">Manager</span></h1>
          <p>Review your 0% interest PayGate BNPL checkout plans and seamlessly settle your upcoming payments.</p>
        </div>
      </div>

      <!-- Quick Summary Cards -->
      <div class="stats-grid stagger-children">
        <div class="stat-card">
          <div class="stat-icon icon-emerald">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
          </div>
          <div class="stat-info">
            <span class="stat-label">Active BNPL Orders</span>
            <strong class="stat-value">{{ activeLoansCount() }} orders</strong>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon icon-purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div class="stat-info">
            <span class="stat-label">Total BNPL balance</span>
            <strong class="stat-value text-amber">{{ totalRemainingAmount() | currency:'VND':'symbol':'1.0-0' }}</strong>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon icon-purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.64-2.25 1.64-1.74 0-2.32-.98-2.39-1.75H7.81c.14 1.62 1.38 2.64 3.09 2.94V19h2.32v-1.67c1.69-.32 2.78-1.41 2.78-2.96 0-2.12-1.78-2.69-3.69-3.23z"/></svg>
          </div>
          <div class="stat-info">
            <span class="stat-label">Approved Limit</span>
            <strong class="stat-value text-purple">{{ myProfile()?.approvedLimit || 0 | currency:'VND':'symbol':'1.0-0' }}</strong>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon icon-emerald">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.64-2.25 1.64-1.74 0-2.32-.98-2.39-1.75H7.81c.14 1.62 1.38 2.64 3.09 2.94V19h2.32v-1.67c1.69-.32 2.78-1.41 2.78-2.96 0-2.12-1.78-2.69-3.69-3.23z"/></svg>
          </div>
          <div class="stat-info">
            <span class="stat-label">Available BNPL Limit</span>
            <strong class="stat-value text-emerald">{{ availableLimit() | currency:'VND':'symbol':'1.0-0' }}</strong>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button [class.active]="activeTab() === 'INSTALLMENTS'" (click)="activeTab.set('INSTALLMENTS')">My Installments</button>
        <button [class.active]="activeTab() === 'PROFILE'" (click)="activeTab.set('PROFILE')">BNPL Profile & Pre-Approval</button>
      </div>

      <!-- MY BNPL LIST -->
      <div *ngIf="activeTab() === 'INSTALLMENTS'">
        <!-- Loading State -->
        <div *ngIf="loading()" class="skeleton-loan">
          <div class="sk-loan-grid">
            <div *ngFor="let _ of [1,2]" class="skeleton" style="height:260px; border-radius:22px"></div>
          </div>
        </div>

        <div *ngIf="!loading()">
        <div *ngIf="myLoans().length === 0" class="empty-state">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>
            </svg>
          </div>
          <h3>No BNPL installments yet</h3>
          <p>When you checkout with Buy Now Pay Later on partner MarketPlaces, your installment plans will appear here.</p>
        </div>

        <div class="loans-grid stagger-children" *ngIf="myLoans().length > 0">
          <div *ngFor="let loan of myLoans(); trackBy: trackByLoanId" class="loan-card" [class.border-active]="loan.status === 'ACTIVE'">
            <div class="card-top">
              <div>
                <span class="loan-ref font-mono">{{ loan.loanRef }}</span>
                <h3 class="loan-amount">{{ loan.totalRepayable | currency:'VND':'symbol':'1.0-0' }}</h3>
              </div>
              <span class="status-badge" [class]="getStatusClass(loan.status)">{{ getStatusLabel(loan.status) }}</span>
            </div>

            <div class="card-details">
              <div class="detail-item">
                <span>Term:</span>
                <strong>{{ loan.termMonths }} months</strong>
              </div>
              <div class="detail-item">
                <span>Payment per period:</span>
                <strong>{{ loan.monthlyAmount | currency:'VND':'symbol':'1.0-0' }}</strong>
              </div>
              <div class="detail-item">
                <span>Interest rate:</span>
                <strong>{{ loan.interestRate }}%/year</strong>
              </div>
              <div class="detail-item">
                <span>Remaining balance:</span>
                <strong class="text-emerald">{{ loan.remainingAmount | currency:'VND':'symbol':'1.0-0' }}</strong>
              </div>
            </div>

            <div class="card-reason" *ngIf="loan.reason">
              <span class="reason-label">Order info:</span> {{ loan.reason }}
            </div>

            <div class="card-actions">
              <button class="btn-detail" (click)="viewLoanDetail(loan.id)">
                View repayment schedule & pay →
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>
      
      <!-- BNPL PROFILE -->
      <div *ngIf="activeTab() === 'PROFILE'" class="profile-tab">
        <div *ngIf="profileLoading()" class="skeleton" style="height:400px; border-radius:20px"></div>
        <div *ngIf="!profileLoading()">
          <app-bnpl-profile-form
            [initialData]="myProfile()"
            [loading]="profileSaving()"
            (formSubmit)="onProfileSubmit($event)"
            (assessRequested)="assessCredit()">
          </app-bnpl-profile-form>
        </div>
      </div>
    </div>
    
    <!-- DETAIL & REPAYMENT MODAL (Moved outside of .bnpl-container to fix position: fixed issue) -->
    <div *ngIf="selectedLoan()" class="modal-overlay fade-in">
      <div class="modal-card wide-modal">
        <div class="modal-header">
          <div>
            <span class="loan-ref font-mono">{{ selectedLoan()?.loanRef }}</span>
            <h2>BNPL Details & Repayment Schedule</h2>
          </div>
          <button class="btn-close" (click)="selectedLoan.set(null)">✕</button>
        </div>

        <div class="modal-body" *ngIf="selectedLoan() as loan">
          <div class="loan-summary-strip">
            <div>
              <small>Total outstanding balance</small>
              <strong>{{ loan.remainingAmount | currency:'VND':'symbol':'1.0-0' }}</strong>
            </div>
            <div>
              <small>Term</small>
              <strong>{{ loan.termMonths }} months</strong>
            </div>
            <div>
              <small>Payment per period</small>
              <strong>{{ loan.monthlyAmount | currency:'VND':'symbol':'1.0-0' }}</strong>
            </div>
          </div>

          <!-- Repayment actions -->
          <div class="repay-actions-box" *ngIf="loan.status === 'ACTIVE' && loan.remainingAmount > 0">
            <button class="btn-repay-period" (click)="repayLoan(loan.id, 'NEXT_PERIOD')" [disabled]="repaying()">
              💳 Pay next period
            </button>
            <button class="btn-repay-all" (click)="repayLoan(loan.id, 'FULL_SETTLEMENT')" [disabled]="repaying()">
              ✨ Full settlement ({{ loan.remainingAmount | currency:'VND':'symbol':'1.0-0' }})
            </button>
          </div>

          <!-- Schedule list -->
          <h4 class="schedule-title">Detailed Repayment Schedule ({{ loan.schedules?.length || 0 }} periods)</h4>
          <div class="schedule-table-wrap">
            <table class="schedule-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Due date</th>
                  <th>Principal</th>
                  <th>Interest</th>
                  <th>Period total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let s of loan.schedules; trackBy: trackByScheduleId">
                  <td class="font-mono">Period {{ s.periodNumber }}</td>
                  <td>{{ s.dueDate | date:'dd/MM/yyyy' }}</td>
                  <td>{{ s.amountDue | currency:'VND':'symbol':'1.0-0' }}</td>
                  <td>{{ 0 | currency:'VND':'symbol':'1.0-0' }}</td>
                  <td class="font-bold">{{ s.amountDue | currency:'VND':'symbol':'1.0-0' }}</td>
                  <td>
                    <span class="schedule-badge" 
                          [class.schedule-paid]="s.status === 'PAID' || s.status === 'PROCESSING'" 
                          [class.schedule-unpaid]="s.status === 'PENDING' || s.status === 'UNPAID'">
                      {{ (s.status === 'PAID' || s.status === 'PROCESSING') ? 'Paid' : 'Unpaid' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
    
    <!-- CREATE LOAN MODAL -->
    <div *ngIf="showCreateLoanModal()" class="modal-overlay fade-in">
      <div class="modal-card wide-modal" style="max-width: 500px;">
        <div class="modal-header">
          <div>
            <h2>Create New Loan</h2>
          </div>
          <button class="btn-close" (click)="showCreateLoanModal.set(false)">✕</button>
        </div>
        <form [formGroup]="createLoanForm" (ngSubmit)="submitCreateLoan()" class="panel" style="padding: 24px;">
          <div class="grid one" style="display: flex; flex-direction: column; gap: 16px;">
            <div class="slider-group">
              <label>Amount to borrow: <strong style="color: #c20067; font-size: 1.1rem;">{{ createLoanForm.value.amount | currency:'VND':'symbol':'1.0-0' }}</strong></label>
              <input type="range" formControlName="amount" min="500000" [max]="myProfile()?.approvedLimit || 500000" step="100000" style="width: 100%; cursor: pointer; accent-color: #c20067; margin-top: 8px;">
            </div>
            <label style="display: flex; flex-direction: column; gap: 8px;">Tenor
              <select formControlName="tenorMonths" style="padding: 12px; border-radius: 8px; border: 1px solid #cbd5e1;">
                <option [ngValue]="3">3 months (1.5%/month)</option>
                <option [ngValue]="6">6 months (1.5%/month)</option>
                <option [ngValue]="9">9 months (1.5%/month)</option>
                <option [ngValue]="12">12 months (1.5%/month)</option>
              </select>
            </label>
          </div>
          
          <div class="notice" style="margin-top: 16px; background: #fdf2f8; border: 1px solid #fbcfe8; color: #831843; padding: 16px; border-radius: 8px; display: flex; justify-content: space-between;">
            <span>Monthly installment (includes 1.5% interest)</span>
            <strong>{{ monthlyInstallmentPreview() | currency:'VND':'symbol':'1.0-0' }}</strong>
          </div>

          <button type="submit" class="btn-assess" style="margin-top: 24px;" [disabled]="createLoanForm.invalid || createLoanLoading()">
            {{ createLoanLoading() ? 'Creating...' : 'Create Loan' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    @keyframes fadeInUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
    @keyframes scaleIn { from{opacity:0;transform:scale(0.92)} to{opacity:1;transform:scale(1)} }

    .skeleton-loan { display:flex; flex-direction:column; gap:20px; }
    .sk-loan-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(340px,1fr)); gap:24px; }

    .bnpl-container {
      font-family: 'Roboto', 'Inter', system-ui, -apple-system, sans-serif;
      max-width: 1180px;
      margin: 0 auto;
      display: flex; flex-direction: column; gap: 28px;
      color: #0f172a;
      animation: fadeInUp 0.5s ease-out both;
    }

    /* Tabs */
    .tabs { display: flex; gap: 12px; margin-bottom: 24px; padding: 6px; background: #f1f5f9; border-radius: 14px; width: fit-content; }
    .tabs button { 
      background: transparent; border: none; padding: 12px 24px; font-weight: 800; color: #64748b; 
      font-size: 0.95rem; cursor: pointer; border-radius: 10px; 
      transition: all 0.2s; 
    }
    .tabs button:hover { color: #0d2b5c; background: #e2e8f0; }
    .tabs button.active { color: #c20067; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
    
    .credit-assessment-card { 
      background: linear-gradient(135deg, #f8fafc, #f1f5f9); border: 1px solid #cbd5e1; 
      padding: 24px; border-radius: 16px; margin-bottom: 24px; 
    }
    .ca-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .ca-header h3 { margin: 0; font-size: 1.1rem; color: #475569; }
    .ca-limit { font-size: 2.2rem; font-weight: 900; color: #c20067; letter-spacing: -0.02em; }
    .ca-reason { margin: 12px 0 0; font-size: 0.9rem; color: #64748b; }
    .ca-badge { padding: 4px 12px; border-radius: 999px; background: #dcfce7; color: #15803d; font-size: 0.8rem; font-weight: 800; }
    .ca-badge.declined { background: #fee2e2; color: #b91c1c; }
    
    .pending-ca { background: #fff0f6; border-color: #f8bbd0; }
    .pending-ca h3 { color: #c20067; }
    .pending-ca p { color: #0d2b5c; margin: 8px 0 16px; font-weight: 500; }
    .btn-assess { padding: 12px 24px; background: #c20067; color: white; border: none; border-radius: 12px; font-weight: 700; cursor: pointer; }
    .btn-assess:disabled { opacity: 0.6; cursor: not-allowed; }

    .profile-form-wrapper { background: white; padding: 32px; border-radius: 20px; border: 1px solid #e2e8f0; }
    .profile-form-wrapper h3 { margin: 0 0 8px 0; color: #0d2b5c; font-size: 1.3rem; }
    .text-muted { color: #64748b; margin-bottom: 24px; }

    /* Hero Header */
    .bnpl-header-card {
      position: relative;
      background: radial-gradient(circle at 82% 18%, rgba(255,255,255,.9), transparent 28%), linear-gradient(135deg, #fff7fb 0%, #ffe1ef 46%, #e9fbf1 100%);
      color: #0f172a;
      border-radius: 28px;
      padding: 34px 44px;
      display: flex; justify-content: space-between; align-items: center; gap: 24px;
      border: 1px solid rgba(244,114,182,.24);
      box-shadow: 0 24px 60px rgba(190, 24, 93, .12);
      animation: fadeInUp 0.6s ease-out both;
    }
    .header-badge {
      font-size: 0.78rem; font-weight: 900; letter-spacing: 0.08em;
      color: #c20067; text-transform: uppercase; margin-bottom: 6px;
      display: inline-block; padding: 4px 12px; border-radius: 999px;
      background: #fff0f6; border: 1px solid #f8bbd0;
    }
    .bnpl-header-card h1 {
      font-size: clamp(1.8rem, 3.2vw, 2.6rem);
      font-weight: 900;
      color: #0d2b5c;
      letter-spacing: -0.02em;
      line-height: 1.15;
      margin: 8px 0 10px 0;
    }
    .highlight-pink {
      background: linear-gradient(135deg, #c20067 0%, #0072ce 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .bnpl-header-card p {
      font-size: 0.98rem;
      font-weight: 500;
      color: #475569;
      margin: 0;
      max-width: 600px;
      line-height: 1.5;
    }

    /* Stats Grid */
    .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
    @media (max-width: 860px) { .stats-grid { grid-template-columns: 1fr; } }
    .stat-card {
      background: #ffffff; border: 1px solid #f3d6e5; border-radius: 20px;
      padding: 22px 24px; display: flex; align-items: center; gap: 16px;
      box-shadow: 0 14px 34px rgba(99, 24, 75, .07);
    }
    .stat-icon {
      width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .stat-icon svg { width: 26px; height: 26px; }
    .icon-emerald { background: #e3f2fd; color: #0072ce; border: 1px solid #bbdefb; }
    .icon-purple { background: #f3e5f5; color: #7b1fa2; border: 1px solid #e1bee7; }
    .stat-info { display: flex; flex-direction: column; gap: 4px; }
    .stat-label { font-size: 0.75rem; color: #64748b; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; }
    .stat-value { font-size: 1.35rem; font-weight: 900; color: #0d2b5c; letter-spacing: -0.01em; }

    /* Loans Grid */
    .loans-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 24px; }
    .loan-card {
      background: #ffffff; border: 1px solid #f3d6e5; border-radius: 22px;
      padding: 24px; display: flex; flex-direction: column; gap: 18px;
      box-shadow: 0 14px 34px rgba(99, 24, 75, .07);
      transition: transform .25s cubic-bezier(.16,1,.3,1), box-shadow .25s ease, border-color .25s ease;
    }
    .loan-card:hover { transform: translateY(-4px) scale(1.01); box-shadow: 0 20px 42px rgba(190, 24, 93, .13); border-color: #c20067; }
    .border-active { border-color: #c20067; }
    .card-top { display: flex; justify-content: space-between; align-items: flex-start; }
    .loan-ref { font-size: 0.75rem; color: #64748b; font-weight: 800; letter-spacing: 0.04em; }
    .loan-amount { font-size: 1.5rem; font-weight: 900; color: #c20067; letter-spacing: -0.01em; margin: 4px 0 0 0; }

    .status-badge {
      padding: 5px 12px; border-radius: 999px; font-size: 0.75rem; font-weight: 800; letter-spacing: 0.03em; border: 1px solid transparent;
    }
    .status-active { background: #e3f2fd; color: #0072ce; border-color: #bbdefb; }
    .status-paid { background: #dcfce7; color: #15803d; border-color: #86efac; }

    .card-details { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: linear-gradient(135deg, #fff0f6 0%, #eef6ff 100%); border: 1px solid #f8bbd0; padding: 16px; border-radius: 16px; }
    .detail-item { display: flex; flex-direction: column; gap: 2px; }
    .detail-item span { font-size: 0.75rem; color: #64748b; font-weight: 800; text-transform: uppercase; letter-spacing: 0.03em; }
    .detail-item strong { font-size: 0.95rem; color: #0d2b5c; font-weight: 900; }

    .card-reason { font-size: 0.85rem; color: #475569; background: #f8fafc; padding: 10px 14px; border-radius: 12px; border: 1px solid #e2e8f0; }
    .reason-label { font-weight: 800; color: #0d2b5c; }

    .btn-detail {
      width: 100%; padding: 12px; background: linear-gradient(135deg, #c20067 0%, #0072ce 100%); color: #ffffff; border: none;
      border-radius: 14px; font-weight: 800; font-size: 0.88rem; cursor: pointer; transition: all 0.2s ease;
      box-shadow: 0 8px 22px rgba(194, 0, 103, 0.25);
    }
    .btn-detail:hover { transform: translateY(-1px) scale(1.01); box-shadow: 0 12px 26px rgba(194, 0, 103, 0.35); }
    .btn-detail:active { transform: scale(0.97); }

    /* Modals */
    .modal-overlay {
      position: fixed !important; inset: 0 !important; background: rgba(15, 23, 42, 0.6) !important; backdrop-filter: blur(4px) !important;
      z-index: 99999 !important; display: flex !important; align-items: center !important; justify-content: center !important; padding: 20px !important;
      animation: fadeIn 0.2s ease-out both !important; margin: 0 !important;
    }
    @keyframes fadeIn { from{opacity:0} to{opacity:1} }
    .modal-card {
      background: #fff; border-radius: 26px; width: 100%; max-width: 580px; padding: 36px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.2); max-height: 90vh; overflow-y: auto;
      border: 1px solid #f3d6e5;
      animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    .wide-modal { max-width: 760px; }
    .modal-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .modal-header h2 { font-size: 1.4rem; font-weight: 900; margin: 4px 0 0 0; color: #0d2b5c; letter-spacing: -0.01em; }
    .btn-close { background: #f1f5f9; border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-weight: 800; }

    /* Repay box */
    .loan-summary-strip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; background: linear-gradient(135deg, #fff0f6 0%, #eef6ff 100%); padding: 20px; border-radius: 18px; border: 1px solid #f8bbd0; margin-bottom: 24px; }
    .repay-actions-box { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 28px; }
    .btn-repay-period { padding: 16px; background: linear-gradient(135deg, #c20067 0%, #0072ce 100%); color: #fff; border: none; border-radius: 16px; font-weight: 800; cursor: pointer; box-shadow: 0 8px 22px rgba(194, 0, 103, 0.3); }
    .btn-repay-all { padding: 16px; background: linear-gradient(135deg, #0d2b5c 0%, #0072ce 100%); color: #fff; border: none; border-radius: 16px; font-weight: 800; cursor: pointer; box-shadow: 0 8px 22px rgba(13, 43, 92, 0.3); }

    .schedule-title { font-size: 1.1rem; font-weight: 900; color: #0d2b5c; margin-bottom: 12px; letter-spacing: -0.01em; }
    .schedule-table-wrap { overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 16px; }
    .schedule-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.88rem; }
    .schedule-table th { background: #f8fafc; padding: 12px 16px; font-weight: 800; color: #475569; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.03em; }
    .schedule-table td { padding: 14px 16px; border-top: 1px solid #e2e8f0; }
    .schedule-badge { padding: 4px 10px; border-radius: 999px; font-size: 0.75rem; font-weight: 800; }
    .schedule-paid { background: #e3f2fd; color: #0072ce; }
    .schedule-unpaid { background: #fff0f6; color: #c20067; }

    /* Empty state */
    .empty-state { text-align: center; padding: 60px 20px; background: #fff; border-radius: 24px; border: 1.5px dashed #f3d6e5; animation:scaleIn .4s cubic-bezier(.16,1,.3,1) both; }
    .empty-icon { width: 80px; height: 80px; background: #fff0f6; color: #c20067; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
  `]
})
export class BnplDashboardComponent implements OnInit, OnDestroy {
  private loanService = inject(LoanService);
  private notification = inject(NotificationService);
  private profileService = inject(BnplProfileService);

  activeTab = signal<'INSTALLMENTS' | 'PROFILE'>('INSTALLMENTS');

  loading = signal(true);
  repaying = signal(false);
  profileLoading = signal(true);
  profileSaving = signal(false);
  assessing = signal(false);
  
  showCreateLoanModal = signal(false);
  createLoanLoading = signal(false);

  createLoanForm = new FormGroup({
    amount: new FormControl(500000, [Validators.required, Validators.min(500000)]),
    tenorMonths: new FormControl(3, [Validators.required])
  });

  myLoans = signal<LoanResponse[]>([]);
  selectedLoan = signal<LoanResponse | null>(null);
  myProfile = signal<any>(null);

  /** SWR: subscription handle for background revalidation polling */
  private revalidationSub: any = null;

  ngOnInit(): void {
    this.loadBnplLoans();
    this.loadProfile();
  }

  ngOnDestroy(): void {
    this.stopRevalidation();
  }

  loadProfile(): void {
    this.profileLoading.set(true);
    this.profileService.getMyProfile().subscribe({
      next: (res) => {
        this.myProfile.set(res.data);
        this.profileLoading.set(false);
      },
      error: () => this.profileLoading.set(false)
    });
  }

  onProfileSubmit(data: BnplProfileFormData): void {
    this.profileSaving.set(true);
    this.profileService.updateMyProfile(data).subscribe({
      next: (res) => {
        this.profileSaving.set(false);
        this.myProfile.set(res.data);
        this.notification.success('Profile saved successfully');
      },
      error: (err) => {
        this.profileSaving.set(false);
        this.notification.error(err?.error?.message || 'Failed to save profile');
      }
    });
  }

  assessCredit(): void {
    this.assessing.set(true);
    this.profileService.assessCredit().subscribe({
      next: (res) => {
        this.assessing.set(false);
        this.myProfile.set(res.data);
        if (res.data?.riskGrade === 'POOR') {
          this.notification.error('Credit assessment failed. Reason: ' + res.data.assessmentReason);
        } else {
          this.notification.success('Credit assessed successfully! Limit: ' + res.data?.approvedLimit);
        }
      },
      error: (err) => {
        this.assessing.set(false);
        this.notification.error(err?.error?.message || 'Assessment failed');
      }
    });
  }

  loadBnplLoans(): void {
    this.loading.set(true);
    this.loanService.getMyLoans().subscribe({
      next: (res) => {
        // Filter strictly for BNPL loans
        const allLoans = res.data?.content ?? [];
        const bnplLoans = allLoans.filter(l => l.reason && l.reason.startsWith('BNPL'));
        this.myLoans.set(bnplLoans);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  /**
   * SWR: Silently revalidate loan list + selected loan detail in the background.
   * Unlike loadBnplLoans(), this does NOT set loading=true so the UI remains interactive.
   */
  private revalidateLoans(): void {
    this.loanService.getMyLoans().subscribe({
      next: (res) => {
        const allLoans = res.data?.content ?? [];
        const bnplLoans = allLoans.filter(l => l.reason && l.reason.startsWith('BNPL'));
        this.myLoans.set(bnplLoans);
      }
    });

    // Revalidate BNPL profile so Approved Limit & Available Limit update automatically
    this.profileService.getMyProfile().subscribe({
      next: (res) => {
        if (res.data) {
          this.myProfile.set(res.data);
        }
      }
    });

    // Also revalidate the selected loan detail if the modal is open
    const current = this.selectedLoan();
    if (current) {
      this.loanService.getLoanById(current.id).subscribe({
        next: (res) => {
          if (res.data) {
            this.selectedLoan.set(res.data);
          }
        }
      });
    }
  }

  /**
   * SWR: Start background polling after a mutation (payment).
   * Polls every 3s for up to 30s to catch async status updates,
   * then stops automatically to conserve resources.
   */
  private startRevalidation(): void {
    this.stopRevalidation();
    let elapsed = 0;
    this.revalidationSub = setInterval(() => {
      elapsed += 3000;
      this.revalidateLoans();
      if (elapsed >= 30000) {
        this.stopRevalidation();
      }
    }, 3000);
  }

  private stopRevalidation(): void {
    if (this.revalidationSub) {
      clearInterval(this.revalidationSub);
      this.revalidationSub = null;
    }
  }

  activeLoansCount(): number {
    return this.myLoans().filter(l => l.status === 'ACTIVE').length;
  }

  totalRemainingAmount(): number {
    return this.myLoans().reduce((sum, l) => sum + (l.remainingAmount || 0), 0);
  }

  availableLimit(): number {
    const limit = this.myProfile()?.approvedLimit || 0;
    const available = limit - this.totalRemainingAmount();
    return available > 0 ? available : 0;
  }

  viewLoanDetail(loanId: number): void {
    this.loanService.getLoanById(loanId).subscribe({
      next: (res) => {
        if (res.data) {
          this.selectedLoan.set(res.data);
        }
      }
    });
  }

  repayLoan(loanId: number, type: RepayType): void {
    this.repaying.set(true);
    this.loanService.repayLoan(loanId, type).subscribe({
      next: (res) => {
        this.repaying.set(false);
        this.notification.success('BNPL installment paid successfully!');
        if (res.data) {
          // Instant optimistic update of modal and background list
          this.selectedLoan.set(res.data);
          this.myLoans.set(this.myLoans().map(l => l.id === res.data!.id ? { ...l, ...res.data! } : l));
        }
        // Single silent background revalidation after 1.5s to sync final async DB state
        setTimeout(() => this.revalidateLoans(), 1500);
      },
      error: (err) => {
        this.repaying.set(false);
        this.notification.error(err?.error?.message || 'Payment failed');
      }
    });
  }

  trackByLoanId(index: number, loan: LoanResponse): number {
    return loan.id;
  }

  trackByScheduleId(index: number, s: any): number {
    return s.id || index;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'status-active';
      case 'PAID_OFF': return 'status-paid';
      default: return 'status-active';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'Active';
      case 'PAID_OFF': return 'Paid Off';
      default: return status;
    }
  }

  openCreateLoanModal(): void {
    this.createLoanForm.patchValue({ amount: this.myProfile()?.approvedLimit || 500000, tenorMonths: 3 });
    this.showCreateLoanModal.set(true);
  }

  monthlyInstallmentPreview(): number {
    const amount = this.createLoanForm.value.amount || 0;
    const months = this.createLoanForm.value.tenorMonths || 3;
    if (amount <= 0 || months <= 0) return 0;
    const principalPerMonth = amount / months;
    const interestPerMonth = amount * 0.015;
    return principalPerMonth + interestPerMonth;
  }

  submitCreateLoan(): void {
    if (this.createLoanForm.invalid) return;
    this.createLoanLoading.set(true);
    const { amount, tenorMonths } = this.createLoanForm.value;
    this.loanService.applyLoan({
      amount: amount || 0,
      termMonths: tenorMonths || 3,
      reason: 'Standalone Cash Loan'
    }).subscribe({
      next: (res) => {
        this.notification.success('Loan created successfully!');
        this.showCreateLoanModal.set(false);
        this.createLoanLoading.set(false);
        this.loadBnplLoans();
        this.activeTab.set('INSTALLMENTS');
      },
      error: (err) => {
        this.notification.error(err.error?.message || 'Failed to create loan');
        this.createLoanLoading.set(false);
      }
    });
  }
}
