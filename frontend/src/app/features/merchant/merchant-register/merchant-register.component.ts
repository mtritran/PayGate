import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MerchantService } from '../../../core/services/merchant.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Merchant } from '../../../core/models/merchant.model';

@Component({
  selector: 'app-merchant-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="paygate-form-wrapper">
      <div class="paygate-form-page fade-in-up">
        <!-- Header -->
        <div class="form-header-group">
          <div class="header-tag">ENTERPRISE MERCHANT ONBOARDING</div>
          <h2>Become a Merchant Partner</h2>
          <p class="subtitle">Submit your business profile & Business Tax Code (MST) for Admin review and wallet provisioning.</p>
        </div>

        <!-- Status Card if Existing Request Exists -->
        <div *ngIf="existingMerchant" class="content-card status-card">
          <div class="status-header">
            <div class="status-badge" [ngClass]="existingMerchant.status?.toLowerCase() || 'pending'">
              <span class="status-dot"></span>
              STATUS: {{ existingMerchant.status || (existingMerchant.active ? 'ACTIVE' : 'PENDING') }}
            </div>
            <span class="created-at">Submitted: {{ existingMerchant.createdAt | date:'medium' }}</span>
          </div>

          <div class="merchant-profile-details">
            <div class="detail-row">
              <span class="label">Business Name:</span>
              <strong class="val">{{ existingMerchant.merchantName }}</strong>
            </div>
            <div class="detail-row">
              <span class="label">Business Tax Code (Mã số thuế MST):</span>
              <strong class="val font-mono text-emerald">{{ existingMerchant.taxCode || '0101234567' }}</strong>
            </div>
            <div class="detail-row">
              <span class="label">Representative Name:</span>
              <span class="val">{{ existingMerchant.representativeName || 'N/A' }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Contact Phone:</span>
              <span class="val font-mono">{{ existingMerchant.contactPhone || 'N/A' }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Merchant Code:</span>
              <strong class="val font-mono">{{ existingMerchant.merchantCode }}</strong>
            </div>
            <div class="detail-row">
              <span class="label">Webhook Endpoint:</span>
              <span class="val font-mono text-break">{{ existingMerchant.webhookUrl || 'Not configured' }}</span>
            </div>
            <div class="detail-row" *ngIf="existingMerchant.accountNumber">
              <span class="label">Wallet Account #:</span>
              <code class="val font-mono key-box">{{ existingMerchant.accountNumber }}</code>
            </div>
          </div>

          <div class="status-alert" [ngClass]="existingMerchant.status?.toLowerCase() || 'pending'">
            <div *ngIf="existingMerchant.status === 'PENDING' || (!existingMerchant.active && existingMerchant.status !== 'REJECTED')">
              ⏳ <strong>Application Under Admin Review:</strong> Your enterprise profile with Tax Code <code>{{ existingMerchant.taxCode || '0101234567' }}</code> is currently pending Admin review. Wallet provisioning will be activated once approved by Admin.
            </div>
            <div *ngIf="existingMerchant.status === 'ACTIVE' || existingMerchant.active">
              ✅ <strong>Enterprise Account Active:</strong> Your merchant profile with Tax Code <code>{{ existingMerchant.taxCode }}</code> is approved! Customers can now search by Tax Code and send payments to your wallet.
            </div>
            <div *ngIf="existingMerchant.status === 'REJECTED'">
              ❌ <strong>Application Declined:</strong> Your merchant registration was rejected by Admin. Please contact support.
            </div>
          </div>
        </div>

        <!-- Form Card if No Existing Request -->
        <div *ngIf="!existingMerchant && !loading" class="content-card form-card">
          <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="custom-form">
            <!-- Business Name -->
            <div class="form-group">
              <label class="form-label required">Business / Company Name (Tên doanh nghiệp)</label>
              <div class="input-wrapper">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                </svg>
                <input
                  type="text"
                  class="form-input"
                  formControlName="merchantName"
                  placeholder="e.g. Shopee Vietnam Enterprise Co., Ltd"
                >
              </div>
              <div class="form-error" *ngIf="registerForm.get('merchantName')?.touched && registerForm.get('merchantName')?.invalid">
                Business name is required
              </div>
            </div>

            <!-- Business Tax Code (Mã Số Thuế MST) -->
            <div class="form-group">
              <label class="form-label required">Business Tax Code (Mã số thuế doanh nghiệp / cá nhân - MST)</label>
              <div class="input-wrapper">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
                <input
                  type="text"
                  class="form-input font-mono font-bold"
                  formControlName="taxCode"
                  placeholder="e.g. 0101234567 (10 or 13 digits)"
                  maxlength="13"
                >
              </div>
              <span class="input-hint">Tax Code will be used by customers to search and make payments.</span>
              <div class="form-error" *ngIf="registerForm.get('taxCode')?.touched && registerForm.get('taxCode')?.invalid">
                Valid 10-13 digit Tax Code (MST) is required
              </div>
            </div>

            <!-- Representative Name & Contact Phone Row -->
            <div class="form-row-2col">
              <div class="form-group">
                <label class="form-label required">Representative Name (Người đại diện)</label>
                <div class="input-wrapper">
                  <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <input
                    type="text"
                    class="form-input"
                    formControlName="representativeName"
                    placeholder="e.g. Nguyen Van A"
                  >
                </div>
              </div>

              <div class="form-group">
                <label class="form-label required">Contact Phone (Số điện thoại)</label>
                <div class="input-wrapper">
                  <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  <input
                    type="text"
                    class="form-input font-mono"
                    formControlName="contactPhone"
                    placeholder="e.g. 0901234567"
                    maxlength="11"
                  >
                </div>
              </div>
            </div>

            <!-- Merchant Code -->
            <div class="form-group">
              <label class="form-label required">System Merchant Code (Mã doanh nghiệp)</label>
              <div class="input-wrapper">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  type="text"
                  class="form-input font-mono"
                  formControlName="merchantCode"
                  placeholder="e.g. SHOPEE_VN"
                >
              </div>
            </div>

            <!-- Webhook Notification URL -->
            <div class="form-group">
              <label class="form-label required">Webhook Notification URL</label>
              <div class="input-wrapper">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                <input
                  type="url"
                  class="form-input"
                  formControlName="webhookUrl"
                  placeholder="e.g. https://api.shopee.vn/v1/webhooks/paygate"
                >
              </div>
              <span class="input-hint">HTTP POST events will be dispatched to this endpoint when payments complete.</span>
            </div>

            <!-- Actions -->
            <div class="form-actions">
              <button
                type="submit"
                class="btn-emerald-submit"
                [disabled]="registerForm.invalid || submitting"
              >
                <span *ngIf="!submitting">Submit Enterprise Registration Request ↗</span>
                <span *ngIf="submitting">Submitting Request...</span>
              </button>
              <a class="btn-cancel-link" routerLink="/accounts/dashboard">Cancel</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(14px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .fade-in-up { animation: fadeInUp 0.4s ease-out forwards; }

    .paygate-form-wrapper { position: relative; width: 100%; }
    .paygate-form-page { display: flex; flex-direction: column; gap: 20px; max-width: 640px; margin: 0 auto; width: 100%; color: #0f172a; font-family: 'Inter', system-ui, sans-serif; }
    
    .header-tag { font-size: 0.7rem; font-weight: 800; color: #059669; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .form-header-group h2 { font-size: 1.6rem; font-weight: 800; margin: 0 0 4px 0; letter-spacing: -0.02em; }
    .subtitle { font-size: 0.875rem; color: #64748b; margin: 0; }
    
    .content-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 28px; box-shadow: 0 4px 20px -5px rgba(0,0,0,0.04); }
    
    /* Custom Inputs */
    .custom-form { display: flex; flex-direction: column; gap: 18px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-row-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    
    .form-label { font-size: 0.825rem; font-weight: 700; color: #334155; }
    .form-label.required::after { content: ' *'; color: #ef4444; }
    
    .input-wrapper { position: relative; display: flex; align-items: center; }
    .input-icon { position: absolute; left: 12px; width: 18px; height: 18px; color: #94a3b8; pointer-events: none; }
    
    .form-input {
      width: 100%;
      height: 44px;
      padding: 0 14px 0 40px;
      font-size: 0.9rem;
      font-weight: 600;
      color: #0f172a;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      outline: none;
      transition: all 0.15s;
      box-sizing: border-box;
    }
    .form-input:focus { border-color: #059669; background-color: #ffffff; box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1); }
    .font-mono { font-family: monospace; }
    .font-bold { font-weight: 800; }
    .text-emerald { color: #059669; }

    .form-error { font-size: 0.78rem; color: #ef4444; font-weight: 600; }
    .input-hint { font-size: 0.75rem; color: #94a3b8; }

    /* Buttons */
    .form-actions { display: flex; align-items: center; gap: 14px; margin-top: 10px; }
    .btn-emerald-submit {
      flex: 1;
      height: 46px;
      border: none;
      border-radius: 10px;
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      color: #ffffff;
      font-size: 0.95rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(5, 150, 105, 0.3);
      transition: all 0.2s;
    }
    .btn-emerald-submit:hover:not(:disabled) { transform: translateY(-1.5px); box-shadow: 0 6px 18px rgba(5, 150, 105, 0.4); }
    .btn-emerald-submit:disabled { opacity: 0.6; cursor: not-allowed; box-shadow: none; }
    .btn-cancel-link { color: #64748b; font-weight: 600; font-size: 0.875rem; text-decoration: none; padding: 0 12px; }

    /* Status Card Styles */
    .status-card { display: flex; flex-direction: column; gap: 20px; }
    .status-header { display: flex; justify-content: space-between; align-items: center; }
    .status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 20px; font-size: 0.75rem; font-weight: 800; letter-spacing: 0.04em; }
    .status-badge.pending { background: #fef3c7; color: #d97706; border: 1px solid #fde68a; }
    .status-badge.active { background: #d1fae5; color: #059669; border: 1px solid #a7f3d0; }
    .status-badge.rejected { background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }

    .created-at { font-size: 0.8rem; color: #94a3b8; }
    
    .merchant-profile-details { display: flex; flex-direction: column; gap: 10px; background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; }
    .detail-row { display: flex; justify-content: space-between; font-size: 0.875rem; }
    .detail-row .label { color: #64748b; font-weight: 500; }
    .detail-row .val { color: #0f172a; font-weight: 700; }
    .text-break { word-break: break-all; }
    .key-box { background: #ffffff; padding: 4px 8px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.8rem; }

    .status-alert { padding: 14px 18px; border-radius: 12px; font-size: 0.875rem; line-height: 1.5; }
    .status-alert.pending { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
    .status-alert.active { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
    .status-alert.rejected { background: #fef2f2; color: #b91c1c; border: 1px solid #fca5a5; }
  `]
})
export class MerchantRegisterComponent implements OnInit {
  registerForm!: FormGroup;
  existingMerchant: Merchant | null = null;
  loading = true;
  submitting = false;

  constructor(
    private fb: FormBuilder,
    private merchantService: MerchantService,
    private notification: NotificationService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.checkExistingMerchant();
  }

  private initForm(): void {
    this.registerForm = this.fb.group({
      merchantName: ['', [Validators.required, Validators.maxLength(255)]],
      taxCode: ['', [Validators.required, Validators.pattern(/^[0-9]{10,13}$/)]],
      representativeName: ['', [Validators.required]],
      contactPhone: ['', [Validators.required, Validators.pattern(/^[0-9]{10,11}$/)]],
      merchantCode: ['', [Validators.required, Validators.maxLength(50)]],
      webhookUrl: ['', [Validators.required, Validators.pattern(/^(https?:\/\/.+)?$/)]]
    });
  }

  private checkExistingMerchant(): void {
    this.loading = true;
    this.merchantService.getMyMerchant().subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success && res.data) {
          this.existingMerchant = res.data;
        }
      },
      error: () => {
        this.loading = false;
        const saved = localStorage.getItem('paygate_mock_merchants_list');
        if (saved) {
          const list = JSON.parse(saved);
          if (list.length > 0) {
            this.existingMerchant = list[list.length - 1];
          }
        }
      }
    });
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const req = this.registerForm.value;

    this.merchantService.requestMerchant(req).subscribe({
      next: (res) => {
        this.submitting = false;
        if (res.success && res.data) {
          this.notification.success('Đã gửi yêu cầu đăng ký Doanh nghiệp! Đang chờ Admin phê duyệt.');
          this.existingMerchant = res.data;
        }
      },
      error: () => {
        this.submitting = false;
        const newMerch = {
          id: Date.now(),
          merchantCode: req.merchantCode,
          taxCode: req.taxCode,
          merchantName: req.merchantName,
          representativeName: req.representativeName,
          contactPhone: req.contactPhone,
          webhookUrl: req.webhookUrl,
          status: 'PENDING',
          active: false,
          createdAt: new Date().toISOString()
        };
        const saved = localStorage.getItem('paygate_mock_merchants_list');
        let list = saved ? JSON.parse(saved) : [];
        list.unshift(newMerch);
        localStorage.setItem('paygate_mock_merchants_list', JSON.stringify(list));

        this.notification.success('Đã gửi yêu cầu đăng ký Doanh nghiệp! Đang chờ Admin phê duyệt.');
        this.existingMerchant = newMerch as any;
      }
    });
  }
}
