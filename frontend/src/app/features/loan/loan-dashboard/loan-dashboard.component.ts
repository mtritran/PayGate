import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LoanService, LoanResponse, LoanScheduleResponse, RepayType } from '../../../core/services/loan.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { PinModalComponent } from '../../../shared/components/pin-modal/pin-modal.component';


@Component({
  selector: 'app-loan-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CurrencyPipe, DatePipe, PinModalComponent],
  template: `
    <div class="loan-container fade-in">
      <!-- Top Banner Header -->
      <div class="loan-header-card">
        <div class="header-content">
          <div class="header-badge">PAYGATE CONSUMER CREDIT</div>
          <h1>Vay Tiêu Dùng & <span class="highlight-pink">Tín Dụng Nhanh</span></h1>
          <p>Duyệt tự động, giải ngân tức thì về Ví PayGate. Lãi suất ưu đãi chỉ từ 1%/tháng (12%/năm).</p>
        </div>
        <button class="btn-apply-hero" (click)="openApplyModal()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="20" height="20">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Tạo Đơn Vay Mới
        </button>
      </div>

      <!-- Quick Summary Cards -->
      <div class="stats-grid stagger-children">
        <div class="stat-card">
          <div class="stat-icon icon-emerald">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
          </div>
          <div class="stat-info">
            <span class="stat-label">Hạn mức khả dụng</span>
            <strong class="stat-value">20,000,000 ₫</strong>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon icon-blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <div class="stat-info">
            <span class="stat-label">Khoản vay đang mở</span>
            <strong class="stat-value">{{ activeLoansCount() }} khoản</strong>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon icon-purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div class="stat-info">
            <span class="stat-label">Tổng dư nợ còn lại</span>
            <strong class="stat-value text-amber">{{ totalRemainingAmount() | currency:'VND':'symbol':'1.0-0' }}</strong>
          </div>
        </div>
      </div>

      <!-- Tabs Header -->
      <div class="loan-tab-row">
        <div class="tab-buttons">
          <button class="tab-btn" [class.active]="activeTab() === 'my-loans'" (click)="activeTab.set('my-loans')">
            Khoản Vay Của Tôi ({{ myLoans().length }})
          </button>
          <button *ngIf="isAdmin()" class="tab-btn admin-tab" [class.active]="activeTab() === 'admin-loans'" (click)="activeTab.set('admin-loans')">
            ⚡ Admin Quản Lý Đơn Vay ({{ adminLoans().length }})
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading()" class="skeleton-loan">
        <div class="sk-loan-grid">
          <div *ngFor="let _ of [1,2,3]" class="skeleton" style="height:260px; border-radius:22px"></div>
        </div>
      </div>

      <!-- MY LOANS LIST -->
      <div *ngIf="!loading() && activeTab() === 'my-loans'">
        <div *ngIf="myLoans().length === 0" class="empty-state">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48">
              <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
            </svg>
          </div>
          <h3>Bạn chưa có khoản vay nào</h3>
          <p>Tạo khoản vay tiêu dùng linh hoạt từ 500,000 ₫ đến 20,000,000 ₫ với lãi suất ưu đãi.</p>
          <button class="btn-primary-apply" (click)="openApplyModal()">Đăng ký vay ngay</button>
        </div>

        <div class="loans-grid stagger-children" *ngIf="myLoans().length > 0">
          <div *ngFor="let loan of myLoans()" class="loan-card" [class.border-active]="loan.status === 'ACTIVE'">
            <div class="card-top">
              <div>
                <span class="loan-ref font-mono">{{ loan.loanRef }}</span>
                <h3 class="loan-amount">{{ loan.amount | currency:'VND':'symbol':'1.0-0' }}</h3>
              </div>
              <span class="status-badge" [class]="getStatusClass(loan.status)">{{ getStatusLabel(loan.status) }}</span>
            </div>

            <div class="card-details">
              <div class="detail-item">
                <span>Kỳ hạn:</span>
                <strong>{{ loan.termMonths }} tháng</strong>
              </div>
              <div class="detail-item">
                <span>Trả mỗi kỳ:</span>
                <strong>{{ loan.monthlyAmount | currency:'VND':'symbol':'1.0-0' }}</strong>
              </div>
              <div class="detail-item">
                <span>Lãi suất:</span>
                <strong>{{ loan.interestRate }}%/năm</strong>
              </div>
              <div class="detail-item">
                <span>Dư nợ còn lại:</span>
                <strong class="text-emerald">{{ loan.remainingAmount | currency:'VND':'symbol':'1.0-0' }}</strong>
              </div>
            </div>

            <div class="card-reason" *ngIf="loan.reason">
              <span class="reason-label">Lý do vay:</span> {{ loan.reason }}
            </div>

            <!-- Offer Acceptance Banner & PDF Actions if status === OFFERED -->
            <div class="offered-banner" *ngIf="loan.status === 'OFFERED'">
              <div class="offered-title">🎉 Đơn vay của bạn đã được Admin duyệt!</div>
              <p>Vui lòng xem kỹ file Hợp đồng vay tiêu dùng (PDF 3 trang) bên dưới và nhấn <strong>Ký Hợp Đồng</strong> để hoàn tất giải ngân số tiền <strong>{{ loan.amount | currency:'VND':'symbol':'1.0-0' }}</strong> vào Ví PayGate & nhận bản hợp đồng qua Gmail.</p>
              
              <div class="offered-btn-group">
                <button class="btn-pdf-preview" (click)="downloadContractPdf(loan.id)">
                  📄 Xem Hợp Đồng PDF (3 Trang)
                </button>
                <button class="btn-accept-contract" (click)="acceptOffer(loan.id)" [disabled]="accepting()">
                  <span *ngIf="!accepting()">✍️ Đồng Ý & Ký Hợp Đồng</span>
                  <span *ngIf="accepting()">Đang xử lý giải ngân...</span>
                </button>
              </div>
            </div>

            <div class="card-actions" *ngIf="loan.status !== 'OFFERED'">
              <button class="btn-pdf-outline" (click)="downloadContractPdf(loan.id)" *ngIf="loan.status === 'ACTIVE' || loan.status === 'PAID_OFF'">
                📄 Tải Hợp Đồng PDF
              </button>
              <button class="btn-detail" (click)="viewLoanDetail(loan.id)">
                Xem lịch trả nợ & Thanh toán →
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ADMIN LOANS LIST -->
      <div *ngIf="!loading() && activeTab() === 'admin-loans' && isAdmin()">
        <div class="loans-grid stagger-children">
          <div *ngFor="let loan of adminLoans()" class="loan-card admin-card">
            <div class="card-top">
              <div>
                <span class="loan-ref font-mono">{{ loan.loanRef }}</span>
                <h3 class="loan-amount">{{ loan.amount | currency:'VND':'symbol':'1.0-0' }}</h3>
              </div>
              <span class="status-badge" [class]="getStatusClass(loan.status)">{{ getStatusLabel(loan.status) }}</span>
            </div>

            <div class="card-details">
              <div class="detail-item">
                <span>Kỳ hạn:</span> <strong>{{ loan.termMonths }} tháng</strong>
              </div>
              <div class="detail-item">
                <span>Trả hàng tháng:</span> <strong>{{ loan.monthlyAmount | currency:'VND':'symbol':'1.0-0' }}</strong>
              </div>
              <div class="detail-item">
                <span>Tổng phải trả:</span> <strong>{{ loan.totalRepayable | currency:'VND':'symbol':'1.0-0' }}</strong>
              </div>
              <div class="detail-item">
                <span>Ngày tạo:</span> <strong>{{ loan.createdAt | date:'dd/MM/yyyy HH:mm' }}</strong>
              </div>
            </div>

            <div class="card-reason" *ngIf="loan.reason">
              <span class="reason-label">Lý do:</span> {{ loan.reason }}
            </div>

            <!-- Admin action buttons -->
            <div class="admin-actions" *ngIf="loan.status === 'PENDING_APPROVAL'">
              <button class="btn-approve" (click)="approveLoan(loan.id)">✓ Duyệt Đề Nghị Vay</button>
              <button class="btn-reject" (click)="rejectLoan(loan.id)">✕ Từ Chối</button>
            </div>
          </div>
        </div>
      </div>

      <!-- APPLY LOAN MODAL -->
      <div *ngIf="showApplyModal()" class="modal-overlay fade-in">
        <div class="modal-card">
          <div class="modal-header">
            <h2>Tạo Đơn Đăng Ký Vay Tiêu Dùng</h2>
            <button class="btn-close" (click)="showApplyModal.set(false)">✕</button>
          </div>

          <form (ngSubmit)="submitApplyForm()" class="apply-form">
            <!-- Amount Input -->
            <div class="form-group">
              <label class="form-label">SỐ TIỀN CẦN VAY (VND) <span class="required">*</span></label>
              <input
                type="number"
                class="custom-input font-mono"
                min="500000"
                max="20000000"
                step="500000"
                [(ngModel)]="applyAmount"
                name="applyAmount"
                required
              />
              <div class="amount-presets">
                <button type="button" class="preset-btn" (click)="applyAmount = 2000000">2 triệu</button>
                <button type="button" class="preset-btn" (click)="applyAmount = 5000000">5 triệu</button>
                <button type="button" class="preset-btn" (click)="applyAmount = 10000000">10 triệu</button>
                <button type="button" class="preset-btn" (click)="applyAmount = 20000000">20 triệu</button>
              </div>
            </div>

            <!-- Term Months -->
            <div class="form-group">
              <label class="form-label">KỲ HẠN VAY <span class="required">*</span></label>
              <div class="term-grid">
                <button
                  type="button"
                  class="term-btn"
                  [class.active]="applyTermMonths === 3"
                  (click)="applyTermMonths = 3">3 Tháng</button>
                <button
                  type="button"
                  class="term-btn"
                  [class.active]="applyTermMonths === 6"
                  (click)="applyTermMonths = 6">6 Tháng</button>
                <button
                  type="button"
                  class="term-btn"
                  [class.active]="applyTermMonths === 12"
                  (click)="applyTermMonths = 12">12 Tháng</button>
                <button
                  type="button"
                  class="term-btn"
                  [class.active]="applyTermMonths === 24"
                  (click)="applyTermMonths = 24">24 Tháng</button>
              </div>
            </div>

            <!-- Reason -->
            <div class="form-group">
              <label class="form-label">LÝ DO VAY (TÙY CHỌN)</label>
              <input
                type="text"
                class="custom-input"
                placeholder="VD: Mua sắm máy tính, sửa chữa nhà cửa, trả học phí..."
                [(ngModel)]="applyReason"
                name="applyReason"
              />
            </div>

            <!-- Loan Calculation Summary -->
            <div class="calc-box">
              <div class="calc-row">
                <span>Số tiền gốc:</span>
                <strong>{{ applyAmount | currency:'VND':'symbol':'1.0-0' }}</strong>
              </div>
              <div class="calc-row">
                <span>Ước tính trả hàng tháng:</span>
                <strong class="text-emerald">{{ estimateMonthly() | currency:'VND':'symbol':'1.0-0' }} / tháng</strong>
              </div>
              <div class="calc-row">
                <span>Lãi suất cố định:</span>
                <span>12%/năm</span>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-cancel" (click)="showApplyModal.set(false)">Hủy</button>
              <button type="submit" class="btn-submit-apply" [disabled]="submitting()">
                <span *ngIf="!submitting()">Gửi Đơn Đăng Ký Vay</span>
                <span *ngIf="submitting()">Đang xử lý...</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- DETAIL & REPAYMENT MODAL -->
      <div *ngIf="selectedLoan()" class="modal-overlay fade-in">
        <div class="modal-card wide-modal">
          <div class="modal-header">
            <div>
              <span class="loan-ref font-mono">{{ selectedLoan()?.loanRef }}</span>
              <h2>Chi Tiết Khoản Vay & Lịch Trả Nợ</h2>
            </div>
            <button class="btn-close" (click)="selectedLoan.set(null)">✕</button>
          </div>

          <div class="modal-body" *ngIf="selectedLoan() as loan">
            <div class="loan-summary-strip">
              <div>
                <small>Tổng dư nợ còn lại</small>
                <h3 class="text-emerald">{{ loan.remainingAmount | currency:'VND':'symbol':'1.0-0' }}</h3>
              </div>
              <div>
                <small>Kỳ hạn</small>
                <h4>{{ loan.termMonths }} tháng</h4>
              </div>
              <div>
                <small>Trả mỗi kỳ</small>
                <h4>{{ loan.monthlyAmount | currency:'VND':'symbol':'1.0-0' }}</h4>
              </div>
            </div>

            <!-- Repayment actions -->
            <div class="repay-actions-box" *ngIf="loan.status === 'ACTIVE' && loan.remainingAmount > 0">
              <button class="btn-repay-period" (click)="repayLoan(loan.id, 'NEXT_PERIOD')" [disabled]="repaying()">
                💳 Thanh toán kỳ tới
              </button>
              <button class="btn-repay-all" (click)="repayLoan(loan.id, 'FULL_SETTLEMENT')" [disabled]="repaying()">
                ✨ Tất toán toàn bộ ({{ loan.remainingAmount | currency:'VND':'symbol':'1.0-0' }})
              </button>
            </div>

            <!-- Schedule list -->
            <h4 class="schedule-title">Lịch Trả Nợ Chi Tiết ({{ loan.schedules?.length || 0 }} kỳ)</h4>
            <div class="schedule-table-wrap">
              <table class="schedule-table">
                <thead>
                  <tr>
                    <th>Kỳ</th>
                    <th>Hạn thanh toán</th>
                    <th>Gốc</th>
                    <th>Lãi</th>
                    <th>Tổng kỳ</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let s of loan.schedules">
                    <td class="font-mono">Kỳ {{ s.periodNumber }}</td>
                    <td>{{ s.dueDate | date:'dd/MM/yyyy' }}</td>
                    <td>{{ s.principalAmount | currency:'VND':'symbol':'1.0-0' }}</td>
                    <td>{{ s.interestAmount | currency:'VND':'symbol':'1.0-0' }}</td>
                    <td class="font-bold">{{ s.totalAmount | currency:'VND':'symbol':'1.0-0' }}</td>
                    <td>
                      <span class="schedule-badge" [class.schedule-paid]="s.status === 'PAID'" [class.schedule-unpaid]="s.status === 'UNPAID'">
                        {{ s.status === 'PAID' ? 'Đã trả' : 'Chưa trả' }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- OTP Security Modal for Digital Contract Signature -->
      <app-pin-modal
        [isOpen]="showPinModal()"
        [title]="'Xác thực OTP ký hợp đồng vay'"
        (confirmed)="onPinConfirmed($event)"
        (cancelled)="showPinModal.set(false)"
      ></app-pin-modal>
    </div>
  `,
  styles: [`
    @keyframes fadeInUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
    @keyframes scaleIn { from{opacity:0;transform:scale(0.92)} to{opacity:1;transform:scale(1)} }

    .skeleton-loan { display:flex; flex-direction:column; gap:20px; }
    .sk-loan-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(340px,1fr)); gap:24px; }

    .loan-container {
      font-family: 'Roboto', 'Inter', system-ui, -apple-system, sans-serif;
      max-width: 1180px;
      margin: 0 auto;
      display: flex; flex-direction: column; gap: 28px;
      color: #0f172a;
      animation: fadeInUp 0.5s ease-out both;
    }

    /* Hero Header */
    .loan-header-card {
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
    .loan-header-card h1 {
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
    .loan-header-card p {
      font-size: 0.98rem;
      font-weight: 500;
      color: #475569;
      margin: 0;
      max-width: 600px;
      line-height: 1.5;
    }
    .btn-apply-hero {
      display: flex; align-items: center; gap: 10px;
      background: linear-gradient(135deg, #c20067 0%, #0072ce 100%); color: #ffffff; border: none; border-radius: 14px;
      padding: 14px 26px; font-size: 0.92rem; font-weight: 800; cursor: pointer;
      white-space: nowrap; transition: all 0.25s cubic-bezier(.16,1,.3,1);
      box-shadow: 0 8px 22px rgba(194, 0, 103, 0.3);
      animation: scaleIn .5s .3s ease-out both, pulseGlow 2s ease-in-out infinite;
    }
    .btn-apply-hero:hover { transform: translateY(-2px) scale(1.02); box-shadow: 0 12px 28px rgba(194, 0, 103, 0.4); background: linear-gradient(135deg, #e00077 0%, #0084eb 100%); animation:scaleIn .5s .3s ease-out both; }
    .btn-apply-hero:active { transform: scale(0.96); }

    /* Stats Grid */
    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
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
    .icon-blue { background: #fff0f6; color: #c20067; border: 1px solid #f8bbd0; }
    .icon-purple { background: #f3e5f5; color: #7b1fa2; border: 1px solid #e1bee7; }
    .stat-info { display: flex; flex-direction: column; gap: 4px; }
    .stat-label { font-size: 0.75rem; color: #64748b; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; }
    .stat-value { font-size: 1.35rem; font-weight: 900; color: #0d2b5c; letter-spacing: -0.01em; }

    /* Tabs */
    .loan-tab-row { background: linear-gradient(135deg, #fff0f6 0%, #eef6ff 100%); padding: 6px; border-radius: 18px; border: 1px solid rgba(216, 27, 96, 0.2); }
    .tab-buttons { display: flex; gap: 8px; }
    .tab-btn {
      padding: 12px 22px; border: none; background: transparent; font-size: 0.9rem;
      font-weight: 800; color: #64748b; cursor: pointer; border-radius: 14px;
      transition: all 0.2s ease;
    }
    .tab-btn.active { background: linear-gradient(135deg, #c20067 0%, #0072ce 100%); color: #ffffff; box-shadow: 0 8px 20px rgba(194, 0, 103, 0.28); }
    .tab-btn.admin-tab.active { background: linear-gradient(135deg, #0d2b5c 0%, #0072ce 100%); color: #ffffff; box-shadow: 0 8px 20px rgba(13, 43, 92, 0.28); }

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
    .status-pending { background: #fffbeb; color: #b45309; border-color: #fde68a; }
    .status-offered { background: #fff0f6; color: #c20067; border-color: #f8bbd0; }
    .status-active { background: #e3f2fd; color: #0072ce; border-color: #bbdefb; }
    .status-paid { background: #dcfce7; color: #15803d; border-color: #86efac; }
    .status-rejected { background: #fee2e2; color: #b91c1c; border-color: #fca5a5; }

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

    /* Admin actions */
    .admin-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .btn-approve { padding: 12px; background: #0072ce; color: #fff; border: none; border-radius: 14px; font-weight: 800; cursor: pointer; box-shadow: 0 6px 18px rgba(0, 114, 206, 0.25); transition:all .2s ease; }
    .btn-approve:hover { transform: translateY(-1px); box-shadow: 0 8px 22px rgba(0, 114, 206, 0.35); }
    .btn-reject { padding: 12px; background: #ef4444; color: #fff; border: none; border-radius: 14px; font-weight: 800; cursor: pointer; transition:all .2s ease; }
    .btn-reject:hover { transform: translateY(-1px); box-shadow: 0 8px 22px rgba(239, 68, 68, 0.35); }

    /* Modals */
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px);
      z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px;
      animation: fadeIn 0.2s ease-out both;
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

    .apply-form { display: flex; flex-direction: column; gap: 20px; }
    .form-group { display: flex; flex-direction: column; gap: 8px; }
    .form-label { font-size: 0.78rem; font-weight: 800; color: #0d2b5c; letter-spacing: 0.04em; }
    .custom-input { padding: 14px; border: 1px solid #edc6d9; border-radius: 14px; font-size: 1rem; font-family: inherit; background: #fffafd; }
    .custom-input:focus { border-color: #c20067; outline: 3px solid rgba(194, 0, 103, 0.16); background: #fff; }

    .amount-presets { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
    .preset-btn { padding: 10px; background: #fff0f6; border: 1px solid #f8bbd0; border-radius: 12px; font-weight: 800; color: #c20067; cursor: pointer; }
    .preset-btn:hover { background: #ffe1ef; }

    .term-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
    .term-btn { padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; font-weight: 800; color: #475569; cursor: pointer; }
    .term-btn.active { background: #fff0f6; border-color: #f8bbd0; color: #c20067; }

    .calc-box { background: linear-gradient(135deg, #fff0f6 0%, #eef6ff 100%); border: 1px solid #f8bbd0; border-radius: 18px; padding: 18px; display: flex; flex-direction: column; gap: 10px; }
    .calc-row { display: flex; justify-content: space-between; font-size: 0.9rem; font-weight: 700; color: #0d2b5c; }

    .modal-footer { display: flex; justify-content: flex-end; gap: 12px; margin-top: 10px; }
    .btn-cancel { padding: 14px 20px; background: #f1f5f9; border: none; border-radius: 14px; font-weight: 800; color: #475569; cursor: pointer; }
    .btn-submit-apply { padding: 14px 28px; background: linear-gradient(135deg, #c20067 0%, #0072ce 100%); color: #fff; border: none; border-radius: 14px; font-weight: 800; cursor: pointer; box-shadow: 0 8px 22px rgba(194, 0, 103, 0.3); }

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
    .btn-primary-apply { padding: 14px 28px; background: linear-gradient(135deg, #c20067 0%, #0072ce 100%); color: #fff; border: none; border-radius: 14px; font-weight: 800; cursor: pointer; margin-top: 16px; box-shadow: 0 8px 22px rgba(194,0,103,0.3); }
    /* Offered Banner & Action Buttons */
    @keyframes pulseGlow { 0%,100%{box-shadow:0 8px 22px rgba(194,0,103,0.3)} 50%{box-shadow:0 12px 32px rgba(194,0,103,0.45)} }
    .offered-banner {
      background: linear-gradient(135deg, #fff0f6 0%, #eef6ff 100%);
      border: 1.5px solid #f8bbd0; border-radius: 18px; padding: 20px;
      display: flex; flex-direction: column; gap: 10px; color: #0d2b5c;
    }
    .offered-title { font-size: 1.05rem; font-weight: 900; color: #c20067; }
    .offered-banner p { font-size: 0.88rem; margin: 0; line-height: 1.5; color: #475569; font-weight: 500; }
    .offered-btn-group { display: grid; grid-template-columns: 1fr 1.2fr; gap: 12px; margin-top: 6px; }
    .btn-pdf-preview {
      padding: 12px 14px; background: #ffffff; color: #0072ce; border: 1.5px solid #bbdefb;
      border-radius: 14px; font-weight: 800; font-size: 0.85rem; cursor: pointer; transition: all 0.15s;
    }
    .btn-pdf-preview:hover { background: #e3f2fd; }
    .btn-accept-contract {
      padding: 12px 16px; background: linear-gradient(135deg, #c20067 0%, #0072ce 100%); color: #ffffff; border: none;
      border-radius: 14px; font-weight: 800; font-size: 0.88rem; cursor: pointer; transition: all 0.15s;
      box-shadow: 0 8px 22px rgba(194, 0, 103, 0.3);
    }
    .btn-accept-contract:hover { transform: translateY(-1px); }
    .btn-pdf-outline {
      padding: 12px; background: #f8fafc; color: #475569; border: 1.5px solid #cbd5e1;
      border-radius: 14px; font-weight: 800; font-size: 0.85rem; cursor: pointer; transition: all 0.15s;
    }
    .btn-pdf-outline:hover { background: #f1f5f9; border-color: #94a3b8; color: #0f172a; }
    .card-actions { display: grid; grid-template-columns: auto 1fr; gap: 10px; }
  `]
})
export class LoanDashboardComponent implements OnInit {
  private loanService = inject(LoanService);
  private authService = inject(AuthService);
  private notification = inject(NotificationService);

  loading = signal(true);
  submitting = signal(false);
  repaying = signal(false);
  accepting = signal(false);

  myLoans = signal<LoanResponse[]>([]);
  adminLoans = signal<LoanResponse[]>([]);
  selectedLoan = signal<LoanResponse | null>(null);

  activeTab = signal<'my-loans' | 'admin-loans'>('my-loans');
  showApplyModal = signal(false);

  // Apply Form state
  applyAmount = 5000000;
  applyTermMonths = 6;
  applyReason = '';

  isAdmin(): boolean {
    const role = this.authService.getRole();
    return role === 'ADMIN' || role === 'ROLE_ADMIN';
  }

  ngOnInit(): void {
    this.loadLoans();
  }

  loadLoans(): void {
    this.loading.set(true);
    this.loanService.getMyLoans().subscribe({
      next: (res) => {
        this.myLoans.set(res.data?.content ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });

    if (this.isAdmin()) {
      this.loanService.getAllLoansForAdmin().subscribe({
        next: (res) => this.adminLoans.set(res.data?.content ?? [])
      });
    }
  }

  activeLoansCount(): number {
    return this.myLoans().filter(l => l.status === 'ACTIVE' || l.status === 'PENDING_APPROVAL' || l.status === 'OFFERED').length;
  }

  totalRemainingAmount(): number {
    return this.myLoans().reduce((sum, l) => sum + (l.remainingAmount || 0), 0);
  }

  estimateMonthly(): number {
    if (!this.applyAmount || !this.applyTermMonths) return 0;
    const rate = 0.12 / 12;
    const n = this.applyTermMonths;
    const monthly = (this.applyAmount * rate * Math.pow(1 + rate, n)) / (Math.pow(1 + rate, n) - 1);
    return Math.round(monthly);
  }

  openApplyModal(): void {
    this.applyAmount = 5000000;
    this.applyTermMonths = 6;
    this.applyReason = '';
    this.showApplyModal.set(true);
  }

  submitApplyForm(): void {
    if (!this.applyAmount || this.applyAmount < 500000) {
      this.notification.error('Số tiền vay tối thiểu là 500,000 ₫');
      return;
    }
    this.submitting.set(true);
    this.loanService.applyLoan({
      amount: this.applyAmount,
      termMonths: this.applyTermMonths,
      reason: this.applyReason
    }).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.showApplyModal.set(false);
        this.notification.success('Gửi đơn vay thành công! Vui lòng chờ Admin xem xét phê duyệt.');
        this.loadLoans();
      },
      error: (err) => {
        this.submitting.set(false);
        this.notification.error(err?.error?.message || 'Không thể tạo đơn vay');
      }
    });
  }

  downloadContractPdf(loanId: number): void {
    this.notification.info('Đang tạo tệp Hợp đồng PDF...');
    this.loanService.downloadContractPdfBlob(loanId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `HopDongVay_PayGate_${loanId}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => this.notification.error('Không thể tải tệp PDF hợp đồng')
    });
  }

  showPinModal = signal(false);
  pendingLoanToAccept = signal<number | null>(null);

  acceptOffer(loanId: number): void {
    this.pendingLoanToAccept.set(loanId);
    // Open OTP modal — auto-sends OTP email on open
    this.showPinModal.set(true);
  }

  onPinConfirmed(_otpStr?: string): void {
    // OTP already verified inside PinModalComponent before emitting confirmed
    this.proceedAcceptLoan();
  }

  private proceedAcceptLoan(): void {
    this.showPinModal.set(false);
    const loanId = this.pendingLoanToAccept();
    if (!loanId) return;

    this.accepting.set(true);
    this.loanService.acceptLoanOffer(loanId).subscribe({
      next: (res) => {
        this.accepting.set(false);
        this.notification.success('Ký hợp đồng thành công! Tiền đã giải ngân vào Ví PayGate và bản sao PDF đã gửi tới Gmail của bạn.');
        this.loadLoans();
      },
      error: (err) => {
        this.accepting.set(false);
        this.notification.error(err?.error?.message || 'Không thể chấp nhận hợp đồng');
      }
    });
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
        this.notification.success('Thanh toán khoản vay thành công!');
        if (res.data) {
          this.selectedLoan.set(res.data);
        }
        this.loadLoans();
      },
      error: (err) => {
        this.repaying.set(false);
        this.notification.error(err?.error?.message || 'Thanh toán khoản vay thất bại');
      }
    });
  }

  approveLoan(loanId: number): void {
    this.loanService.approveLoan(loanId, 'Approved loan offer by Admin').subscribe({
      next: () => {
        this.notification.success('Đã duyệt đề nghị vay! Đơn vay chuyển sang trạng thái chờ User ký hợp đồng.');
        this.loadLoans();
      },
      error: (err) => this.notification.error(err?.error?.message || 'Phê duyệt thất bại')
    });
  }

  rejectLoan(loanId: number): void {
    this.loanService.rejectLoan(loanId, 'Rejected by admin').subscribe({
      next: () => {
        this.notification.success('Đã từ chối đơn vay!');
        this.loadLoans();
      },
      error: (err) => this.notification.error(err?.error?.message || 'Thao tác thất bại')
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PENDING_APPROVAL': return 'status-pending';
      case 'OFFERED': return 'status-offered';
      case 'ACTIVE': return 'status-active';
      case 'PAID_OFF': return 'status-paid';
      case 'REJECTED': return 'status-rejected';
      default: return '';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'PENDING_APPROVAL': return 'Đang chờ duyệt';
      case 'OFFERED': return 'Đã duyệt - Chờ ký HĐ';
      case 'ACTIVE': return 'Đang vay (Hoạt động)';
      case 'PAID_OFF': return 'Đã tất toán';
      case 'REJECTED': return 'Đã từ chối';
      default: return status;
    }
  }
}
