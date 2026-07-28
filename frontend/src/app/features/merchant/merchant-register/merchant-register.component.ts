import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MerchantService } from '../../../core/services/merchant.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Merchant } from '../../../core/models/merchant.model';

type MerchantTab = 'profile' | 'api-keys' | 'docs';

@Component({
  selector: 'app-merchant-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="paygate-form-wrapper">
      <div class="paygate-form-page fade-in-up">
        <!-- Header -->
        <div class="form-header-group">
          <div class="header-tag">ENTERPRISE MERCHANT ONBOARDING & API PORTAL</div>
          <h2>Merchant Portal & Payment Gateway Integration</h2>
          <p class="subtitle">Quản lý tài khoản doanh nghiệp, lấy API Key bảo mật & Xem tài liệu tích hợp cổng thanh toán.</p>
        </div>

        <!-- Navigation Tabs -->
        <div class="merchant-tabs">
          <button
            class="tab-btn"
            [class.active]="activeTab() === 'profile'"
            (click)="activeTab.set('profile')"
          >
            📋 Thông tin Doanh Nghiệp
          </button>
          <button
            class="tab-btn"
            [class.active]="activeTab() === 'api-keys'"
            (click)="activeTab.set('api-keys'); loadApiKey()"
          >
            🔑 API Integration Keys
          </button>
          <button
            class="tab-btn"
            [class.active]="activeTab() === 'docs'"
            (click)="activeTab.set('docs')"
          >
            📖 Tài Liệu Tích Hợp (API Docs)
          </button>
        </div>

        <!-- TAB 1: PROFILE & STATUS -->
        <div *ngIf="activeTab() === 'profile'">
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
                <span class="label">Merchant Code:</span>
                <strong class="val font-mono text-emerald">{{ existingMerchant.merchantCode }}</strong>
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
                <strong>[Application Under Admin Review]</strong> Hồ sơ doanh nghiệp của bạn đang được Admin duyệt. API Key & Cổng thanh toán sẽ sẵn sàng ngay sau khi kích hoạt.
              </div>
              <div *ngIf="existingMerchant.status === 'ACTIVE' || existingMerchant.active">
                <strong>[Enterprise Account Active]</strong> Tài khoản Merchant của bạn đã hoạt động. Hãy sang tab <strong>API Integration Keys</strong> để lấy Key tích hợp!
              </div>
              <div *ngIf="existingMerchant.status === 'REJECTED'">
                <strong>[Application Declined]</strong> Yêu cầu Merchant của bạn bị từ chối bởi Admin.
              </div>
            </div>
          </div>

          <!-- Form Card if No Existing Request -->
          <div *ngIf="!existingMerchant && !loading" class="content-card form-card">
            <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="custom-form">
              <div class="form-group">
                <label class="form-label required">Tên Công Ty / Cửa Hàng</label>
                <input type="text" class="form-input" formControlName="merchantName" placeholder="e.g. Shopee Vietnam Co., Ltd">
              </div>

              <div class="form-group">
                <label class="form-label required">Mã Doanh Nghiệp (Merchant Code)</label>
                <input type="text" class="form-input font-mono" formControlName="merchantCode" placeholder="e.g. SHOPEE_STORE">
              </div>

              <div class="form-group">
                <label class="form-label required">Webhook URL (Nhận thông báo thanh toán)</label>
                <input type="url" class="form-input" formControlName="webhookUrl" placeholder="e.g. https://api.shopee.vn/v1/webhooks/paygate">
              </div>

              <div class="form-actions">
                <button type="submit" class="btn-emerald-submit" [disabled]="registerForm.invalid || submitting">
                  Submit Merchant Registration Request ↗
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- TAB 2: API KEYS -->
        <div *ngIf="activeTab() === 'api-keys'" class="content-card">
          <div class="key-section-header">
            <h3>🔑 Khóa Tích Hợp API (API Integration Credentials)</h3>
            <p class="subtitle">Sử dụng API Key này để xác thực các request khởi tạo đơn hàng thanh toán từ Server của bạn.</p>
          </div>

          <div *ngIf="!existingMerchant" class="no-key-warning">
            ⚠️ Bạn chưa đăng ký tài khoản Merchant. Vui lòng đăng ký ở tab <strong>Thông tin Doanh Nghiệp</strong> trước.
          </div>

          <div *ngIf="existingMerchant" class="keys-display-box">
            <div class="key-field-group">
              <label>Merchant Code (Mã Đối Tác):</label>
              <div class="key-copy-row">
                <input type="text" readonly [value]="existingMerchant.merchantCode" class="key-input font-mono">
                <button class="btn-copy" (click)="copyText(existingMerchant.merchantCode)">Copy</button>
              </div>
            </div>

            <div class="key-field-group mt-16">
              <label>API Key (Secret Key Kết Nối):</label>
              <div class="key-copy-row">
                <input [type]="showRawKey() ? 'text' : 'password'" readonly [value]="rawApiKey() || '••••••••••••••••••••••••••••••••'" class="key-input font-mono">
                <button class="btn-toggle-key" (click)="showRawKey.set(!showRawKey())">
                  {{ showRawKey() ? '👁️ Ẩn' : '👁️ Hiện' }}
                </button>
                <button class="btn-copy" [disabled]="!rawApiKey()" (click)="copyText(rawApiKey())">Copy API Key</button>
              </div>
              <span class="key-hint">⚠️ Không chia sẻ API Key này ra công khai. Chỉ lưu trữ trên Server phía backend của bạn.</span>
            </div>

            <div class="checkout-endpoint-box mt-24">
              <div class="endpoint-title">🌐 URL Cổng Thanh Toán Checkout API:</div>
              <code class="endpoint-code">POST http://localhost:8080/api/v1/checkout/create</code>
            </div>
          </div>
        </div>

        <!-- TAB 3: API DOCS & INTEGRATION GUIDE -->
        <div *ngIf="activeTab() === 'docs'" class="content-card docs-card">
          <div class="docs-header">
            <h3>📖 Hướng Dẫn Tích Hợp Cổng Thanh Toán PayGate</h3>
            <p class="subtitle">Tích hợp thanh toán PayGate vào Website / App của bạn qua 4 bước đơn giản.</p>
          </div>

          <div class="steps-flow">
            <div class="step-item">
              <div class="step-num">1</div>
              <div class="step-content">
                <h4>Khởi tạo Đơn hàng Thanh Toán (Server-to-Server)</h4>
                <p>Từ Server của bạn, gửi HTTP POST request tới Cổng PayGate kèm <code>apiKey</code> và <code>orderId</code>:</p>
                <pre class="code-snippet"><code>POST http://localhost:8080/api/v1/checkout/create
Content-Type: application/json

&#123;
  "apiKey": "YOUR_API_KEY",
  "orderId": "ORDER_123456",
  "amount": 250000,
  "description": "Thanh toan don hang #123456",
  "returnUrl": "https://website-cua-ban.com/checkout/success"
&#125;</code></pre>
              </div>
            </div>

            <div class="step-item">
              <div class="step-num">2</div>
              <div class="step-content">
                <h4>Nhận Payment URL & Chuyển Hướng Khách Hàng</h4>
                <p>PayGate trả về paymentUrl chứa Token giao dịch. Server của bạn chuyển hướng khách hàng sang URL này:</p>
                <pre class="code-snippet"><code>&#123;
  "success": true,
  "data": &#123;
    "token": "CHK_88F3A29B...",
    "paymentUrl": "http://localhost:4200/checkout?token=CHK_88F3A29B..."
  &#125;
&#125;</code></pre>
              </div>
            </div>

            <div class="step-item">
              <div class="step-num">3</div>
              <div class="step-content">
                <h4>Khách Hàng Nhập OTP Hoàn Tất Thanh Toán</h4>
                <p>Khách hàng đăng nhập Ví PayGate, nhận mã OTP qua Gmail và xác thực thanh toán. Tiền tự động cộng vào Ví Merchant của bạn.</p>
              </div>
            </div>

            <div class="step-item">
              <div class="step-num">4</div>
              <div class="step-content">
                <h4>Xử Lý Kết Quả Trả Về (Callback & Return URL)</h4>
                <p>Khi thanh toán xong, PayGate tự động redirect người dùng về <code>returnUrl</code> của bạn kèm trạng thái:</p>
                <pre class="code-snippet"><code>https://website-cua-ban.com/checkout/success?status=SUCCESS&orderId=ORDER_123456&transactionRef=TXN-PAY-XXXXXX</code></pre>
              </div>
            </div>
          </div>

          <div class="swagger-link-box mt-24">
            <span>🔗 Xem và thử nghiệm trực tiếp trên Swagger UI Interactive Docs:</span>
            <a href="http://localhost:8080/swagger-ui.html" target="_blank" class="btn-swagger">Mở Swagger UI Docs ↗</a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .paygate-form-wrapper { width: 100%; font-family: 'Inter', system-ui, sans-serif; }
    .paygate-form-page { display: flex; flex-direction: column; gap: 20px; max-width: 800px; margin: 0 auto; color: #0f172a; }
    .header-tag { font-size: 0.7rem; font-weight: 800; color: #059669; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .form-header-group h2 { font-size: 1.6rem; font-weight: 800; margin: 0 0 4px 0; }
    .subtitle { font-size: 0.875rem; color: #64748b; margin: 0; }

    /* Tabs */
    .merchant-tabs { display: flex; gap: 8px; border-bottom: 2px solid #e2e8f0; padding-bottom: 2px; }
    .tab-btn {
      padding: 12px 18px; border: none; background: transparent; font-size: 0.9rem;
      font-weight: 700; color: #64748b; cursor: pointer; border-bottom: 3px solid transparent;
      transition: all 0.15s; margin-bottom: -2px; border-radius: 8px 8px 0 0;
    }
    .tab-btn.active { color: #059669; border-bottom-color: #059669; background: #ecfdf5; }
    .tab-btn:hover:not(.active) { background: #f8fafc; color: #0f172a; }

    .content-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 28px; box-shadow: 0 4px 20px -5px rgba(0,0,0,0.04); }
    .custom-form { display: flex; flex-direction: column; gap: 18px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-label { font-size: 0.825rem; font-weight: 700; color: #334155; }
    .form-label.required::after { content: ' *'; color: #ef4444; }
    .form-input { width: 100%; height: 44px; padding: 0 14px; font-size: 0.9rem; font-weight: 600; color: #0f172a; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; box-sizing: border-box; }
    .form-input:focus { border-color: #059669; background-color: #ffffff; outline: none; }
    
    .btn-emerald-submit { height: 46px; border: none; border-radius: 10px; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff; font-size: 0.95rem; font-weight: 700; cursor: pointer; }

    /* API Keys tab */
    .key-section-header h3 { margin: 0 0 4px; font-size: 1.2rem; font-weight: 800; color: #0f172a; }
    .key-field-group label { font-size: 0.85rem; font-weight: 700; color: #475569; display: block; margin-bottom: 6px; }
    .key-copy-row { display: flex; gap: 10px; }
    .key-input { flex: 1; height: 44px; padding: 0 14px; border: 1.5px solid #cbd5e1; border-radius: 10px; background: #f8fafc; font-size: 0.95rem; font-weight: 700; color: #059669; }
    .btn-copy { padding: 0 18px; background: #059669; color: #fff; border: none; border-radius: 10px; font-weight: 700; cursor: pointer; }
    .btn-toggle-key { padding: 0 14px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 10px; font-weight: 700; cursor: pointer; }
    .key-hint { font-size: 0.78rem; color: #ef4444; margin-top: 6px; display: block; }

    .checkout-endpoint-box { background: #0f172a; color: #fff; padding: 18px; border-radius: 14px; }
    .endpoint-title { font-size: 0.85rem; font-weight: 700; color: #a7f3d0; margin-bottom: 6px; }
    .endpoint-code { font-family: monospace; font-size: 1rem; color: #34d399; }

    /* Docs Tab */
    .docs-header h3 { margin: 0 0 4px; font-size: 1.2rem; font-weight: 800; }
    .steps-flow { display: flex; flex-direction: column; gap: 20px; margin-top: 20px; }
    .step-item { display: flex; gap: 16px; }
    .step-num { width: 36px; height: 36px; background: #059669; color: #fff; border-radius: 50%; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .step-content h4 { margin: 0 0 6px; font-size: 1rem; font-weight: 700; color: #0f172a; }
    .step-content p { margin: 0 0 10px; font-size: 0.88rem; color: #475569; }
    .code-snippet { background: #1e293b; color: #e2e8f0; padding: 14px; border-radius: 10px; font-size: 0.82rem; overflow-x: auto; margin: 0; }

    .swagger-link-box { display: flex; align-items: center; justify-content: space-between; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 16px; border-radius: 12px; font-size: 0.88rem; color: #047857; font-weight: 700; }
    .btn-swagger { background: #059669; color: #fff; padding: 8px 16px; border-radius: 8px; text-decoration: none; }
  `]
})
export class MerchantRegisterComponent implements OnInit {
  activeTab = signal<MerchantTab>('profile');
  registerForm!: FormGroup;
  existingMerchant: Merchant | null = null;
  rawApiKey = signal<string>('');
  showRawKey = signal(false);
  loading = true;
  submitting = false;

  constructor(
    private fb: FormBuilder,
    private merchantService: MerchantService,
    private notification: NotificationService
  ) { }

  ngOnInit(): void {
    this.initForm();
    this.checkExistingMerchant();
  }

  private initForm(): void {
    this.registerForm = this.fb.group({
      merchantName: ['', [Validators.required, Validators.maxLength(255)]],
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
      error: () => this.loading = false
    });
  }

  loadApiKey(): void {
    if (!this.existingMerchant || this.rawApiKey()) return;
    this.merchantService.getMyApiKey().subscribe({
      next: (res) => {
        if (res.data) this.rawApiKey.set(res.data);
      }
    });
  }

  copyText(val: string): void {
    if (!val) return;
    navigator.clipboard.writeText(val);
    this.notification.success('Đã sao chép vào bộ nhớ tạm!');
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
          this.notification.success('Gửi yêu cầu đăng ký Merchant thành công!');
          this.existingMerchant = res.data;
        }
      },
      error: (err) => {
        this.submitting = false;
        this.notification.error(err?.error?.message || 'Không thể đăng ký Merchant');
      }
    });
  }
}
