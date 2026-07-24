import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  RecurringPaymentService,
  CreateRecurringPaymentRequest,
  RecurringType,
  RecurringCategory,
  RecurringFrequency
} from '../../../core/services/recurring-payment.service';

@Component({
  selector: 'pg-recurring-payment-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="form-container fade-in">
      <div class="form-card">
        <!-- Card Header -->
        <div class="card-header">
          <div class="header-icon-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <h2>Tạo Lịch Định Kỳ & Hóa Đơn Tự Động</h2>
          <p>Thiết lập tự động chuyển tiền hoặc thanh toán hóa đơn Điện, Nước, Internet.</p>
        </div>

        <form (ngSubmit)="submitForm()">
          <!-- Category Tabs -->
          <div class="tab-group">
            <button
              type="button"
              class="tab-btn"
              [class.active]="category === 'TRANSFER'"
              (click)="selectCategory('TRANSFER')"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
              <span>Chuyển Tiền</span>
            </button>
            <button
              type="button"
              class="tab-btn"
              [class.active]="category === 'ELECTRICITY'"
              (click)="selectCategory('ELECTRICITY')"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
              <span>Hóa Đơn Điện</span>
            </button>
            <button
              type="button"
              class="tab-btn"
              [class.active]="category === 'WATER'"
              (click)="selectCategory('WATER')"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"></path>
              </svg>
              <span>Hóa Đơn Nước</span>
            </button>
            <button
              type="button"
              class="tab-btn"
              [class.active]="category === 'INTERNET'"
              (click)="selectCategory('INTERNET')"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" y1="12" x2="22" y2="12"></line>
              </svg>
              <span>Internet / TV</span>
            </button>
          </div>

          <!-- Target Dest Account (if TRANSFER) -->
          <div class="form-group" *ngIf="category === 'TRANSFER'">
            <label class="form-label">TÀI KHOẢN ĐÍCH (ID / SỐ TÀI KHOẢN) <span class="required">*</span></label>
            <input
              type="number"
              class="pg-input font-mono"
              placeholder="Nhập ID tài khoản nhận (VD: 2)"
              [(ngModel)]="destAccountId"
              name="destAccountId"
              required
            />
          </div>

          <!-- Provider & Bill Code (if BILL) -->
          <div class="form-grid" *ngIf="category !== 'TRANSFER'">
            <div class="form-group">
              <label class="form-label">NHÀ CUNG CẤP</label>
              <select class="pg-select" [(ngModel)]="providerCode" name="providerCode">
                <option value="EVN_HANOI" *ngIf="category === 'ELECTRICITY'">EVN Hà Nội</option>
                <option value="EVN_HCM" *ngIf="category === 'ELECTRICITY'">EVN TP.HCM</option>
                <option value="EVN_MIENTRUNG" *ngIf="category === 'ELECTRICITY'">EVN Miền Trung</option>
                <option value="VIWACO" *ngIf="category === 'WATER'">Nước Viwaco</option>
                <option value="SAWACO" *ngIf="category === 'WATER'">Nước Sawaco</option>
                <option value="VNPT" *ngIf="category === 'INTERNET'">VNPT Internet</option>
                <option value="FPT" *ngIf="category === 'INTERNET'">FPT Telecom</option>
                <option value="VIETTEL" *ngIf="category === 'INTERNET'">Viettel Internet</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">MÃ HÓA ĐƠN / KHÁCH HÀNG <span class="required">*</span></label>
              <input
                type="text"
                class="pg-input font-mono"
                placeholder="VD: PA1201009988"
                [(ngModel)]="billCode"
                name="billCode"
                required
              />
            </div>
          </div>

          <!-- Amount -->
          <div class="form-group">
            <label class="form-label">SỐ TIỀN THANH TOÁN (VND) <span class="required">*</span></label>
            <input
              type="number"
              class="pg-input font-mono"
              placeholder="Nhập số tiền (tối thiểu 1,000 VND)"
              [(ngModel)]="amount"
              name="amount"
              min="1000"
              required
            />
            <div class="quick-amounts">
              <button type="button" class="btn-quick" (click)="amount = 50000">50,000đ</button>
              <button type="button" class="btn-quick" (click)="amount = 200000">200,000đ</button>
              <button type="button" class="btn-quick" (click)="amount = 500000">500,000đ</button>
              <button type="button" class="btn-quick" (click)="amount = 1000000">1,000,000đ</button>
            </div>
          </div>

          <!-- Frequency -->
          <div class="form-group">
            <label class="form-label">CHU KỲ TỰ ĐỘNG <span class="required">*</span></label>
            <select class="pg-select" [(ngModel)]="frequency" name="frequency">
              <option value="DAILY">Hàng Ngày (Mỗi 24 giờ)</option>
              <option value="WEEKLY">Hàng Tuần (Mỗi tuần 1 lần)</option>
              <option value="MONTHLY">Hàng Tháng (Mỗi tháng 1 lần)</option>
              <option value="MINUTELY">Mỗi 1 Phút (Dùng thử nghiệm / Demo)</option>
              <option value="ONCE">1 Lần Duy Nhất (Chờ ngày đến hạn)</option>
            </select>
          </div>

          <!-- Description -->
          <div class="form-group">
            <label class="form-label">GHI CHÚ GIAO DỊCH</label>
            <input
              type="text"
              class="pg-input"
              placeholder="Ghi chú thêm cho lịch hẹn này..."
              [(ngModel)]="description"
              name="description"
            />
          </div>

          <!-- Error Alert -->
          <div *ngIf="errorMsg()" class="error-alert">
            {{ errorMsg() }}
          </div>

          <!-- Submit Buttons -->
          <div class="form-actions">
            <button type="button" class="btn-cancel" (click)="goBack()">Hủy Bỏ</button>
            <button type="submit" class="btn-submit" [disabled]="isSubmitting()">
              <span>{{ isSubmitting() ? 'Đang Tạo Lịch...' : 'Xác Nhận Tạo Lịch' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .form-container {
      padding: 36px 20px;
      max-width: 680px;
      margin: 0 auto;
    }
    .form-card {
      background: #ffffff;
      padding: 36px;
      border-radius: 20px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 10px 30px rgba(0,0,0,0.03);
    }
    .card-header {
      margin-bottom: 28px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .header-icon-box {
      width: 52px;
      height: 52px;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      color: #059669;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 14px;
    }
    .header-icon-box svg { width: 26px; height: 26px; }
    .card-header h2 {
      font-size: 1.4rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 6px 0;
      letter-spacing: -0.01em;
    }
    .card-header p { color: #64748b; font-size: 0.9rem; margin: 0; }

    /* Tab Group */
    .tab-group {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      margin-bottom: 28px;
    }
    .tab-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      color: #475569;
      font-weight: 700;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .tab-btn svg { width: 16px; height: 16px; color: #64748b; }
    .tab-btn.active {
      background: #059669;
      color: #ffffff;
      border-color: #059669;
      box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25);
    }
    .tab-btn.active svg { color: #ffffff; }

    .form-group { margin-bottom: 22px; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .form-label {
      display: block;
      font-size: 0.75rem;
      font-weight: 800;
      color: #475569;
      margin-bottom: 8px;
      letter-spacing: 0.04em;
    }
    .required { color: #ef4444; }

    .pg-input, .pg-select {
      width: 100%;
      padding: 12px 16px;
      border-radius: 12px;
      border: 1px solid #cbd5e1;
      font-size: 0.92rem;
      outline: none;
      color: #0f172a;
      background: #ffffff;
      transition: all 0.2s ease;
      box-sizing: border-box;
    }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .pg-input:focus, .pg-select:focus {
      border-color: #059669;
      box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.15);
    }

    .quick-amounts { display: flex; gap: 8px; margin-top: 10px; }
    .btn-quick {
      padding: 6px 12px;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 0.78rem;
      font-weight: 700;
      color: #475569;
      cursor: pointer;
      font-family: ui-monospace, monospace;
      transition: all 0.15s ease;
    }
    .btn-quick:hover { background: #e2e8f0; color: #0f172a; }

    .error-alert {
      padding: 12px 16px;
      background: #fef2f2;
      color: #b91c1c;
      border: 1px solid #fecaca;
      border-radius: 12px;
      margin-bottom: 20px;
      font-size: 0.88rem;
    }

    .form-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 32px; }
    .btn-cancel {
      padding: 12px 22px;
      border-radius: 12px;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #475569;
      font-weight: 700;
      font-size: 0.88rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-cancel:hover { background: #f8fafc; color: #0f172a; }

    .btn-submit {
      padding: 12px 28px;
      border-radius: 12px;
      border: none;
      background: #059669;
      color: #ffffff;
      font-weight: 700;
      font-size: 0.88rem;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(5, 150, 105, 0.25);
      transition: all 0.15s ease;
    }
    .btn-submit:hover {
      background: #047857;
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(5, 150, 105, 0.35);
    }
  `]
})
export class RecurringPaymentFormComponent implements OnInit {
  private service = inject(RecurringPaymentService);
  private router = inject(Router);

  category: RecurringCategory = 'TRANSFER';
  destAccountId?: number;
  providerCode = 'EVN_HANOI';
  billCode = '';
  amount = 50000;
  frequency: RecurringFrequency = 'DAILY';
  description = '';

  isSubmitting = signal<boolean>(false);
  errorMsg = signal<string>('');

  ngOnInit(): void {}

  selectCategory(cat: RecurringCategory): void {
    this.category = cat;
    if (cat === 'ELECTRICITY') this.providerCode = 'EVN_HANOI';
    if (cat === 'WATER') this.providerCode = 'VIWACO';
    if (cat === 'INTERNET') this.providerCode = 'VNPT';
  }

  submitForm(): void {
    if (this.category === 'TRANSFER' && !this.destAccountId) {
      this.errorMsg.set('Vui lòng nhập ID tài khoản nhận.');
      return;
    }
    if (this.category !== 'TRANSFER' && !this.billCode) {
      this.errorMsg.set('Vui lòng nhập mã hóa đơn / mã khách hàng.');
      return;
    }
    if (!this.amount || this.amount < 1000) {
      this.errorMsg.set('Số tiền tối thiểu là 1,000 VND.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMsg.set('');

    const payload: CreateRecurringPaymentRequest = {
      type: this.category === 'TRANSFER' ? 'RECURRING_TRANSFER' : 'BILL_PAYMENT',
      category: this.category,
      providerCode: this.category !== 'TRANSFER' ? this.providerCode : undefined,
      billCode: this.category !== 'TRANSFER' ? this.billCode : undefined,
      destAccountId: this.category === 'TRANSFER' ? this.destAccountId : undefined,
      amount: this.amount,
      frequency: this.frequency,
      description: this.description || (this.category === 'TRANSFER' ? 'Chuyển tiền định kỳ' : `Thanh toán hóa đơn ${this.category}`)
    };

    this.service.create(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.router.navigate(['/recurring-payments']);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMsg.set(err?.error?.message || 'Có lỗi xảy ra khi tạo lịch thanh toán.');
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/recurring-payments']);
  }
}
