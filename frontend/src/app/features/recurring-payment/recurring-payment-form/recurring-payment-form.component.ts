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
        <div class="card-header">
          <h2>📅 Tạo Lịch Định Kỳ & Hóa Đơn Tự Động</h2>
          <p>Thiết lập tự động chuyển tiền hoặc thanh toán hóa đơn Điện, Nước, Internet.</p>
        </div>

        <form (ngSubmit)="submitForm()">
          <!-- Mode Tabs: Transfer vs Bill -->
          <div class="tab-group">
            <button
              type="button"
              class="tab-btn"
              [class.active]="category === 'TRANSFER'"
              (click)="selectCategory('TRANSFER')"
            >
              💸 Chuyển Tiền Định Kỳ
            </button>
            <button
              type="button"
              class="tab-btn"
              [class.active]="category === 'ELECTRICITY'"
              (click)="selectCategory('ELECTRICITY')"
            >
              ⚡ Hóa Đơn Điện (EVN)
            </button>
            <button
              type="button"
              class="tab-btn"
              [class.active]="category === 'WATER'"
              (click)="selectCategory('WATER')"
            >
              💧 Hóa Đơn Nước
            </button>
            <button
              type="button"
              class="tab-btn"
              [class.active]="category === 'INTERNET'"
              (click)="selectCategory('INTERNET')"
            >
              🌐 Internet / TV
            </button>
          </div>

          <!-- Target Dest Account (if TRANSFER) -->
          <div class="form-group" *ngIf="category === 'TRANSFER'">
            <label class="form-label">Tài Khoản Đích (ID / Số tài khoản đệm) <span class="required">*</span></label>
            <input
              type="number"
              class="pg-input"
              placeholder="Nhập ID tài khoản nhận (Ví dụ: 2)"
              [(ngModel)]="destAccountId"
              name="destAccountId"
              required
            />
          </div>

          <!-- Provider & Bill Code (if BILL) -->
          <div class="form-grid" *ngIf="category !== 'TRANSFER'">
            <div class="form-group">
              <label class="form-label">Nhà Cung Cấp</label>
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
              <label class="form-label">Mã Hóa Đơn / Mã Khách Hàng <span class="required">*</span></label>
              <input
                type="text"
                class="pg-input"
                placeholder="VD: PA1201009988"
                [(ngModel)]="billCode"
                name="billCode"
                required
              />
            </div>
          </div>

          <!-- Amount -->
          <div class="form-group">
            <label class="form-label">Số Tiền (VND) <span class="required">*</span></label>
            <input
              type="number"
              class="pg-input"
              placeholder="Nhập số tiền (tối thiểu 1,000 VND)"
              [(ngModel)]="amount"
              name="amount"
              min="1000"
              required
            />
            <div class="quick-amounts">
              <button type="button" class="btn-quick" (click)="amount = 50000">50K</button>
              <button type="button" class="btn-quick" (click)="amount = 200000">200K</button>
              <button type="button" class="btn-quick" (click)="amount = 500000">500K</button>
              <button type="button" class="btn-quick" (click)="amount = 1000000">1 Triệu</button>
            </div>
          </div>

          <!-- Frequency -->
          <div class="form-group">
            <label class="form-label">Chu Kỳ Tự Động <span class="required">*</span></label>
            <select class="pg-select" [(ngModel)]="frequency" name="frequency">
              <option value="DAILY">Hàng Ngày (Mỗi 24 giờ)</option>
              <option value="WEEKLY">Hàng Tuần (Mỗi tuần 1 lần)</option>
              <option value="MONTHLY">Hàng Tháng (Mỗi tháng 1 lần)</option>
              <option value="MINUTELY">Mỗi 1 Phút (Dùng để Thử Nghiệm / Demo)</option>
              <option value="ONCE">1 Lần Duy Nhất (Chờ đến ngày)</option>
            </select>
          </div>

          <!-- Description -->
          <div class="form-group">
            <label class="form-label">Ghi Chú</label>
            <input
              type="text"
              class="pg-input"
              placeholder="Nội dung ghi chú cho lịch hẹn này..."
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
              {{ isSubmitting() ? 'Đang Tạo Lịch...' : '📅 Xác Nhận Tạo Lịch' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .form-container {
      padding: 30px 20px;
      max-width: 650px;
      margin: 0 auto;
    }
    .form-card {
      background: #ffffff;
      padding: 32px;
      border-radius: 20px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 10px 30px rgba(0,0,0,0.04);
    }
    .card-header {
      margin-bottom: 24px;
      text-align: center;
    }
    .card-header h2 { font-size: 1.5rem; font-weight: 800; color: #0f172a; margin-bottom: 6px; }
    .card-header p { color: #64748b; font-size: 0.9rem; }

    .tab-group {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      margin-bottom: 24px;
    }
    .tab-btn {
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
    .tab-btn.active {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      color: #ffffff;
      border-color: #059669;
      box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25);
    }

    .form-group { margin-bottom: 20px; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .form-label { display: block; font-size: 0.88rem; font-weight: 700; color: #334155; margin-bottom: 8px; }
    .required { color: #ef4444; }

    .pg-input, .pg-select {
      width: 100%;
      padding: 12px 16px;
      border-radius: 12px;
      border: 1px solid #cbd5e1;
      font-size: 0.95rem;
      outline: none;
      transition: border-color 0.2s ease;
    }
    .pg-input:focus, .pg-select:focus { border-color: #059669; box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.15); }

    .quick-amounts { display: flex; gap: 8px; margin-top: 10px; }
    .btn-quick {
      padding: 6px 12px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-quick:hover { background: #e2e8f0; }

    .error-alert {
      padding: 14px;
      background: #fee2e2;
      color: #b91c1c;
      border-radius: 12px;
      margin-bottom: 20px;
      font-size: 0.9rem;
    }

    .form-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 28px; }
    .btn-cancel {
      padding: 12px 24px;
      border-radius: 12px;
      border: 1px solid #cbd5e1;
      background: #fff;
      color: #475569;
      font-weight: 700;
      cursor: pointer;
    }
    .btn-submit {
      padding: 12px 28px;
      border-radius: 12px;
      border: none;
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      color: #fff;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(5, 150, 105, 0.3);
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
