import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MerchantService } from '../../../core/services/merchant.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Merchant } from '../../../core/models/merchant.model';

type MerchantTab = 'profile' | 'api-keys' | 'docs';
type CodeLanguage = 'curl' | 'nodejs' | 'php' | 'python';

@Component({
  selector: 'app-merchant-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="merchant-portal-wrapper fade-in-up">
      <!-- Portal Top Hero Header -->
      <div class="portal-hero">
        <div class="hero-content">
          <div class="hero-badge">ENTERPRISE GATEWAY PORTAL</div>
          <h1 class="hero-title">Merchant Partner & API Integration Center</h1>
          <p class="hero-subtitle">Quản lý tài khoản doanh nghiệp, khai thác API Key bảo mật và tích hợp Cổng thanh toán PayGate.</p>
        </div>
        
        <!-- Navigation Tabs -->
        <div class="portal-tabs">
          <button
            class="portal-tab"
            [class.active]="activeTab() === 'profile'"
            (click)="activeTab.set('profile')"
          >
            🏢 Hồ Sơ Doanh Nghiệp
          </button>
          <button
            class="portal-tab"
            [class.active]="activeTab() === 'api-keys'"
            (click)="activeTab.set('api-keys'); loadApiKey()"
          >
            🔑 API Integration Keys
          </button>
          <button
            class="portal-tab"
            [class.active]="activeTab() === 'docs'"
            (click)="activeTab.set('docs')"
          >
            📖 Tài Liệu Tích Hợp & Code Mẫu
          </button>
        </div>
      </div>

      <!-- TAB 1: ENTERPRISE PROFILE -->
      <div *ngIf="activeTab() === 'profile'" class="portal-tab-content">
        <!-- If Request Exists -->
        <div *ngIf="existingMerchant" class="portal-card">
          <div class="card-header-row">
            <div class="status-badge" [ngClass]="existingMerchant.status?.toLowerCase() || 'pending'">
              <span class="status-dot"></span>
              TRẠNG THÁI: {{ existingMerchant.status || (existingMerchant.active ? 'ACTIVE' : 'PENDING') }}
            </div>
            <span class="date-text">Ngày đăng ký: {{ existingMerchant.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">TÊN DOANH NGHIỆP / CỬA HÀNG</span>
              <div class="info-val font-bold">{{ existingMerchant.merchantName }}</div>
            </div>
            <div class="info-item">
              <span class="info-label">MÃ DOANH NGHIỆP (MERCHANT CODE)</span>
              <div class="info-val font-mono text-emerald">{{ existingMerchant.merchantCode }}</div>
            </div>
            <div class="info-item">
              <span class="info-label">WEBHOOK NOTIFICATION ENDPOINT</span>
              <div class="info-val font-mono text-muted">{{ existingMerchant.webhookUrl || 'Chưa cấu hình' }}</div>
            </div>
            <div class="info-item" *ngIf="existingMerchant.accountNumber">
              <span class="info-label">SỐ VÍ DOANH NGHIỆP PAYGATE</span>
              <code class="wallet-badge font-mono">{{ existingMerchant.accountNumber }}</code>
            </div>
          </div>

          <div class="notice-box" [ngClass]="existingMerchant.status?.toLowerCase() || 'pending'">
            <div *ngIf="existingMerchant.status === 'PENDING' || (!existingMerchant.active && existingMerchant.status !== 'REJECTED')">
              ⏳ <strong>Đang chờ Admin phê duyệt:</strong> Hồ sơ của bạn đang được kiểm tra. Ngay sau khi approved, API Key sẽ hoạt động 100%.
            </div>
            <div *ngIf="existingMerchant.status === 'ACTIVE' || existingMerchant.active">
              ✅ <strong>Đã hoạt động:</strong> Tài khoản Merchant của bạn đã được kích hoạt. Hãy sang tab <strong>API Integration Keys</strong> để lấy API Key tích hợp.
            </div>
            <div *ngIf="existingMerchant.status === 'REJECTED'">
              ❌ <strong>Bị từ chối:</strong> Đơn đăng ký Merchant bị từ chối. Vui lòng liên hệ Admin.
            </div>
          </div>
        </div>

        <!-- Registration Form if No Merchant Profile -->
        <div *ngIf="!existingMerchant && !loading" class="portal-card">
          <div class="card-title">Đăng Ký Tài Khoản Doanh Nghiệp (Merchant Partner)</div>
          <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="portal-form mt-20">
            <div class="form-group">
              <label class="form-label required">Tên Công Ty / Thương Hiệu Cửa Hàng</label>
              <input type="text" class="form-control" formControlName="merchantName" placeholder="Ví dụ: Shopee Vietnam Co., Ltd">
            </div>

            <div class="form-group">
              <label class="form-label required">Mã Doanh Nghiệp Duy Nhất (Merchant Code)</label>
              <input type="text" class="form-control font-mono" formControlName="merchantCode" placeholder="Ví dụ: SHOPEE_STORE">
            </div>

            <div class="form-group">
              <label class="form-label required">Webhook Callback URL (Nhận thông báo tự động)</label>
              <input type="url" class="form-control font-mono" formControlName="webhookUrl" placeholder="Ví dụ: https://api.shopee.vn/v1/webhooks/paygate">
            </div>

            <button type="submit" class="btn-submit-emerald" [disabled]="registerForm.invalid || submitting">
              {{ submitting ? 'Đang gửi đăng ký...' : 'Gửi Đơn Đăng Ký Merchant ↗' }}
            </button>
          </form>
        </div>
      </div>

      <!-- TAB 2: API KEYS -->
      <div *ngIf="activeTab() === 'api-keys'" class="portal-tab-content">
        <div class="portal-card">
          <div class="card-title-group">
            <div class="icon-box">🔑</div>
            <div>
              <h3>Khóa Tích Hợp API (Merchant Credentials)</h3>
              <p class="card-desc">API Key này bảo mật cao và đại diện cho doanh nghiệp của bạn khi khởi tạo giao dịch thanh toán.</p>
            </div>
          </div>

          <div *ngIf="!existingMerchant" class="warning-banner">
            ⚠️ Bạn chưa đăng ký tài khoản Merchant. Vui lòng đăng ký ở tab <strong>Hồ Sơ Doanh Nghiệp</strong> trước.
          </div>

          <div *ngIf="existingMerchant" class="credentials-container mt-20">
            <!-- Merchant Code Field -->
            <div class="cred-field">
              <label class="cred-label">MERCHANT CODE (Mã định danh):</label>
              <div class="input-copy-group">
                <input type="text" readonly [value]="existingMerchant.merchantCode" class="cred-input font-mono">
                <button class="btn-copy" (click)="copyText(existingMerchant.merchantCode)">📋 Copy</button>
              </div>
            </div>

            <!-- API Key Field -->
            <div class="cred-field mt-18">
              <label class="cred-label">SECRET API KEY (Khóa kết nối bảo mật):</label>
              <div class="input-copy-group">
                <input
                  [type]="showRawKey() ? 'text' : 'password'"
                  readonly
                  [value]="rawApiKey() || '••••••••••••••••••••••••••••••••'"
                  class="cred-input font-mono api-key-highlight"
                >
                <button class="btn-toggle" (click)="showRawKey.set(!showRawKey())">
                  {{ showRawKey() ? '👁️ Ẩn Key' : '👁️ Hiển Thị Key' }}
                </button>
                <button class="btn-copy primary" [disabled]="!rawApiKey()" (click)="copyText(rawApiKey())">
                  📋 Copy API Key
                </button>
              </div>
              <p class="key-security-note">🔒 <strong>Bảo mật:</strong> Lưu trữ API Key này trên Server của bạn (file <code>.env</code>). Không chia sẻ công khai!</p>
            </div>

            <!-- API Gateway Endpoint Info Box -->
            <div class="endpoint-info-card mt-24">
              <div class="endpoint-header">
                <span class="http-badge post">POST</span>
                <span class="endpoint-url">http://localhost:8080/api/v1/checkout/create</span>
              </div>
              <p class="endpoint-desc">Endpoint chính dùng để gọi khởi tạo đơn hàng thanh toán từ Server của bạn.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 3: INTEGRATION DOCS & CODE SNIPPETS -->
      <div *ngIf="activeTab() === 'docs'" class="portal-tab-content">
        <div class="portal-card">
          <div class="card-title-group">
            <div class="icon-box">🚀</div>
            <div>
              <h3>Tài Liệu Tích Hợp Chi Tiết (Full API Documentation)</h3>
              <p class="card-desc">Tài liệu kỹ thuật quy định cấu trúc Request, Response, Mã lỗi & Luồng xử lý giao dịch.</p>
            </div>
          </div>

          <!-- Workflow Visual Steps -->
          <div class="workflow-steps mt-24">
            <div class="workflow-card">
              <div class="step-badge">BƯỚC 1</div>
              <h4>1. Khởi Tạo Đơn Hàng Thanh Toán</h4>
              <p>Server của bạn gửi <code>POST /api/v1/checkout/create</code> kèm <code>apiKey</code> và số tiền để nhận <code>paymentUrl</code>.</p>
            </div>

            <div class="workflow-card">
              <div class="step-badge">BƯỚC 2</div>
              <h4>2. Redirect Khách Hàng Sang PayGate</h4>
              <p>Chuyển hướng trình duyệt khách hàng sang <code>paymentUrl</code> (VD: <code>http://localhost:4200/checkout?token=CHK_...</code>).</p>
            </div>

            <div class="workflow-card">
              <div class="step-badge">BƯỚC 3</div>
              <h4>3. Khách Hàng Nhập OTP Gmail</h4>
              <p>Khách hàng kiểm tra số tiền, đăng nhập Ví PayGate và nhập mã OTP 6 chữ số gửi về Gmail để xác thực thanh toán.</p>
            </div>

            <div class="workflow-card">
              <div class="step-badge">BƯỚC 4</div>
              <h4>4. Nhận Trạng Thái Callback</h4>
              <p>Tiền tự động chuyển về Ví Merchant của bạn. Khách hàng được redirect về <code>returnUrl</code> với trạng thái <code>SUCCESS</code>.</p>
            </div>
          </div>

          <!-- Parameter Specification Table -->
          <div class="docs-section mt-28">
            <h4 class="section-subtitle">📋 Bảng Tham Số Khởi Tạo Đơn Hàng (POST /api/v1/checkout/create)</h4>
            <div class="table-responsive">
              <table class="docs-table">
                <thead>
                  <tr>
                    <th>Trường (Field)</th>
                    <th>Kiểu dữ liệu</th>
                    <th>Bắt buộc</th>
                    <th>Mô tả chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>apiKey</code></td>
                    <td><code>String</code></td>
                    <td><span class="badge-req">Bắt buộc</span></td>
                    <td>Secret API Key riêng của Merchant (Lấy tại Tab API Keys).</td>
                  </tr>
                  <tr>
                    <td><code>orderId</code></td>
                    <td><code>String</code></td>
                    <td><span class="badge-req">Bắt buộc</span></td>
                    <td>Mã đơn hàng duy nhất trên hệ thống của bạn (Ví dụ: <code>ORDER_998811</code>).</td>
                  </tr>
                  <tr>
                    <td><code>amount</code></td>
                    <td><code>Number</code></td>
                    <td><span class="badge-req">Bắt buộc</span></td>
                    <td>Số tiền thanh toán tính bằng VND (Tối thiểu <code>1,000</code> VND).</td>
                  </tr>
                  <tr>
                    <td><code>description</code></td>
                    <td><code>String</code></td>
                    <td>Tùy chọn</td>
                    <td>Nội dung hiển thị cho khách hàng khi thanh toán.</td>
                  </tr>
                  <tr>
                    <td><code>returnUrl</code></td>
                    <td><code>String</code></td>
                    <td><span class="badge-req">Bắt buộc</span></td>
                    <td>Đường dẫn Website của bạn để PayGate chuyển hướng về sau khi thanh toán thành công.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Full Response Structure Section -->
          <div class="docs-section mt-28">
            <h4 class="section-subtitle">📦 Cấu Trúc Response Trả Về (JSON Response)</h4>
            <pre class="code-box light-code"><code>&#123;
  "success": true,
  "message": "Tạo phiên thanh toán thành công",
  "data": &#123;
    "token": "CHK_3EF6DF2E73B9469093B97BFD47177875",
    "paymentUrl": "http://localhost:4200/checkout?token=CHK_3EF6DF2E73B9469093B97BFD47177875",
    "expiresAt": "2026-07-28T16:30:00.000"
  &#125;,
  "timestamp": "2026-07-28T16:15:00.000"
&#125;</code></pre>
          </div>

          <!-- Error Codes Specification Table -->
          <div class="docs-section mt-28">
            <h4 class="section-subtitle">⚠️ Bảng Mã Lỗi Thường Gặp & Cách Xử Lý (Error Handling)</h4>
            <div class="table-responsive">
              <table class="docs-table">
                <thead>
                  <tr>
                    <th>Mã Lỗi / Error Message</th>
                    <th>Nguyên nhân gốc</th>
                    <th>Giải pháp khắc phục</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>API Key của Merchant không hợp lệ</code></td>
                    <td>Nhập sai apiKey hoặc chưa tạo Merchant.</td>
                    <td>Vào tab API Keys để copy đúng apiKey.</td>
                  </tr>
                  <tr>
                    <td><code>Tài khoản Merchant hiện đang bị khóa</code></td>
                    <td>Merchant chưa được Admin phê duyệt.</td>
                    <td>Liên hệ Admin PayGate để duyệt tài khoản.</td>
                  </tr>
                  <tr>
                    <td><code>Số tiền thanh toán tối thiểu là 1,000 VND</code></td>
                    <td>Giá trị amount &lt; 1000.</td>
                    <td>Truyền giá trị amount &gt;= 1000 VND.</td>
                  </tr>
                  <tr>
                    <td><code>Phiên thanh toán đã hết hạn</code></td>
                    <td>Quá 15 phút chưa hoàn tất thanh toán.</td>
                    <td>Tạo lại đơn thanh toán mới cho khách.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Code Snippets Selector -->
          <div class="code-snippets-section mt-28">
            <div class="code-header">
              <div class="code-tabs">
                <button class="code-tab" [class.active]="selectedLang() === 'curl'" (click)="selectedLang.set('curl')">cURL</button>
                <button class="code-tab" [class.active]="selectedLang() === 'nodejs'" (click)="selectedLang.set('nodejs')">Node.js (Express)</button>
                <button class="code-tab" [class.active]="selectedLang() === 'php'" (click)="selectedLang.set('php')">PHP</button>
                <button class="code-tab" [class.active]="selectedLang() === 'python'" (click)="selectedLang.set('python')">Python</button>
              </div>
              <button class="btn-copy-code" (click)="copyText(getCodeSnippet())">📋 Copy Code Mẫu</button>
            </div>

            <pre class="code-box"><code>{{ getCodeSnippet() }}</code></pre>
          </div>

          <div class="swagger-banner mt-24">
            <div class="swagger-info">
              <span class="swagger-icon">⚡</span>
              <div>
                <strong>Tài liệu API Interactive Swagger UI</strong>
                <p>Thử nghiệm API trực tiếp trên giao diện Swagger chuẩn OpenAPI 3.0</p>
              </div>
            </div>
            <a href="http://localhost:8080/swagger-ui.html" target="_blank" class="btn-open-swagger">Mở Swagger UI ↗</a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .fade-in-up { animation: fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

    .merchant-portal-wrapper { max-width: 960px; margin: 0 auto; padding: 0 0 40px; color: #0f172a; font-family: 'Inter', system-ui, -apple-system, sans-serif; }
    
    /* Hero Banner */
    .portal-hero {
      background: linear-gradient(135deg, #064e3b 0%, #047857 60%, #059669 100%);
      color: #ffffff; border-radius: 20px; padding: 32px 36px 0; margin-bottom: 24px;
      box-shadow: 0 10px 30px -10px rgba(4, 120, 87, 0.3);
    }
    .hero-badge { font-size: 0.72rem; font-weight: 800; letter-spacing: 0.08em; color: #a7f3d0; text-transform: uppercase; margin-bottom: 6px; }
    .hero-title { font-size: 1.8rem; font-weight: 800; margin: 0 0 6px; letter-spacing: -0.02em; }
    .hero-subtitle { font-size: 0.92rem; color: #d1fae5; margin: 0 0 24px; max-width: 680px; line-height: 1.5; }

    /* Portal Tabs */
    .portal-tabs { display: flex; gap: 8px; border-bottom: 1px solid rgba(255,255,255,0.2); }
    .portal-tab {
      padding: 14px 22px; border: none; background: transparent; font-size: 0.92rem; font-weight: 700;
      color: #a7f3d0; cursor: pointer; border-bottom: 3px solid transparent; transition: all 0.2s;
    }
    .portal-tab.active { color: #ffffff; border-bottom-color: #ffffff; background: rgba(255,255,255,0.1); border-radius: 10px 10px 0 0; }
    .portal-tab:hover:not(.active) { color: #ffffff; background: rgba(255,255,255,0.05); border-radius: 10px 10px 0 0; }

    /* Portal Cards */
    .portal-card { background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 20px; padding: 32px; box-shadow: 0 4px 20px -4px rgba(0,0,0,0.04); }
    .card-title-group { display: flex; gap: 14px; align-items: flex-start; }
    .icon-box { font-size: 32px; background: #ecfdf5; width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .card-title-group h3 { font-size: 1.25rem; font-weight: 800; margin: 0 0 4px; color: #0f172a; }
    .card-desc { font-size: 0.88rem; color: #64748b; margin: 0; }

    /* Form & Profile */
    .card-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 20px; font-size: 0.78rem; font-weight: 800; }
    .status-badge.active { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
    .status-badge.pending { background: #fef3c7; color: #b45309; border: 1px solid #fde047; }
    .status-badge.rejected { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }

    .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; background: #f8fafc; padding: 20px; border-radius: 16px; border: 1px solid #e2e8f0; }
    .info-item { display: flex; flex-direction: column; gap: 4px; }
    .info-label { font-size: 0.72rem; font-weight: 800; color: #64748b; letter-spacing: 0.04em; }
    .info-val { font-size: 0.95rem; color: #0f172a; }
    .wallet-badge { background: #ecfdf5; color: #047857; padding: 4px 8px; border-radius: 6px; font-weight: 700; width: fit-content; }

    .notice-box { margin-top: 20px; padding: 16px 20px; border-radius: 12px; font-size: 0.9rem; line-height: 1.5; }
    .notice-box.active { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
    .notice-box.pending { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }

    /* API Keys Credentials Box */
    .cred-field { display: flex; flex-direction: column; gap: 6px; }
    .cred-label { font-size: 0.8rem; font-weight: 800; color: #475569; letter-spacing: 0.03em; }
    .input-copy-group { display: flex; gap: 10px; }
    .cred-input { flex: 1; height: 48px; padding: 0 16px; border: 1.5px solid #cbd5e1; border-radius: 12px; background: #f8fafc; font-size: 1rem; font-weight: 700; color: #0f172a; }
    .cred-input.api-key-highlight { color: #059669; background: #f0fdf4; border-color: #a7f3d0; }
    .btn-copy { padding: 0 20px; background: #f1f5f9; color: #334155; border: 1.5px solid #cbd5e1; border-radius: 12px; font-weight: 700; cursor: pointer; transition: all 0.15s; }
    .btn-copy:hover { background: #e2e8f0; }
    .btn-copy.primary { background: #059669; color: #ffffff; border: none; }
    .btn-copy.primary:hover { background: #047857; }
    .btn-toggle { padding: 0 16px; background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 12px; font-weight: 700; cursor: pointer; color: #475569; }
    .btn-toggle:hover { background: #f8fafc; }
    .key-security-note { font-size: 0.8rem; color: #64748b; margin-top: 6px; }

    .endpoint-info-card { background: #0f172a; color: #ffffff; padding: 20px; border-radius: 16px; }
    .endpoint-header { display: flex; align-items: center; gap: 12px; font-family: monospace; font-size: 0.95rem; }
    .http-badge { padding: 4px 10px; border-radius: 6px; font-weight: 800; font-size: 0.78rem; }
    .http-badge.post { background: #10b981; color: #ffffff; }
    .endpoint-url { color: #34d399; font-weight: 700; }
    .endpoint-desc { font-size: 0.82rem; color: #94a3b8; margin: 8px 0 0; }

    /* Workflow Cards */
    .workflow-steps { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    .workflow-card { background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 16px; padding: 20px; }
    .step-badge { font-size: 0.68rem; font-weight: 800; color: #059669; background: #ecfdf5; padding: 4px 10px; border-radius: 20px; width: fit-content; margin-bottom: 8px; }
    .workflow-card h4 { font-size: 1rem; font-weight: 800; margin: 0 0 6px; color: #0f172a; }
    .workflow-card p { font-size: 0.85rem; color: #64748b; margin: 0; line-height: 1.5; }

    /* Parameter Specification Table */
    .section-subtitle { font-size: 1rem; font-weight: 800; color: #0f172a; margin: 0 0 12px; }
    .table-responsive { overflow-x: auto; border: 1.5px solid #e2e8f0; border-radius: 14px; }
    .docs-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.88rem; }
    .docs-table th { background: #f8fafc; padding: 12px 16px; font-weight: 800; color: #475569; border-bottom: 1.5px solid #e2e8f0; }
    .docs-table td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; color: #334155; }
    .docs-table code { background: #f1f5f9; color: #059669; padding: 2px 6px; border-radius: 6px; font-weight: 700; font-family: monospace; }
    .badge-req { background: #fee2e2; color: #b91c1c; font-size: 0.72rem; font-weight: 800; padding: 2px 8px; border-radius: 12px; }

    /* Code Snippet Box */
    .code-snippets-section { background: #0f172a; border-radius: 16px; overflow: hidden; }
    .code-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 18px; background: #1e293b; border-bottom: 1px solid #334155; }
    .code-tabs { display: flex; gap: 6px; }
    .code-tab { padding: 6px 14px; background: transparent; border: none; color: #94a3b8; font-size: 0.82rem; font-weight: 700; border-radius: 8px; cursor: pointer; }
    .code-tab.active { background: #059669; color: #ffffff; }
    .btn-copy-code { background: rgba(255,255,255,0.1); color: #ffffff; border: none; padding: 6px 12px; border-radius: 8px; font-size: 0.8rem; font-weight: 700; cursor: pointer; }
    .btn-copy-code:hover { background: rgba(255,255,255,0.2); }
    .code-box { padding: 20px; margin: 0; font-family: 'SF Mono', Consolas, monospace; font-size: 0.85rem; color: #34d399; overflow-x: auto; line-height: 1.6; }

    .swagger-banner { display: flex; justify-content: space-between; align-items: center; background: #ecfdf5; border: 1.5px solid #a7f3d0; padding: 20px; border-radius: 16px; }
    .swagger-info { display: flex; gap: 14px; align-items: center; }
    .swagger-icon { font-size: 28px; }
    .swagger-info strong { font-size: 0.95rem; color: #047857; display: block; }
    .swagger-info p { font-size: 0.82rem; color: #059669; margin: 2px 0 0; }
    .btn-open-swagger { background: #059669; color: #ffffff; padding: 12px 20px; border-radius: 10px; text-decoration: none; font-weight: 800; font-size: 0.88rem; white-space: nowrap; }
    .btn-open-swagger:hover { background: #047857; }

    .mt-16 { margin-top: 16px; }
    .mt-18 { margin-top: 18px; }
    .mt-20 { margin-top: 20px; }
    .mt-24 { margin-top: 24px; }
    .mt-28 { margin-top: 28px; }
    .font-bold { font-weight: 800; }
    .font-mono { font-family: monospace; }
    .text-emerald { color: #059669; }
    .text-muted { color: #64748b; }
    .warning-banner { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; padding: 16px; border-radius: 12px; font-weight: 600; margin-top: 16px; }

    .portal-form { display: flex; flex-direction: column; gap: 16px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-label { font-size: 0.82rem; font-weight: 700; color: #475569; }
    .form-label.required::after { content: ' *'; color: #ef4444; }
    .form-control { height: 46px; padding: 0 16px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 0.95rem; }
    .form-control:focus { outline: none; border-color: #059669; }
    .btn-submit-emerald { height: 48px; background: #059669; color: #fff; border: none; border-radius: 10px; font-weight: 800; font-size: 0.95rem; cursor: pointer; }
  `]
})
export class MerchantRegisterComponent implements OnInit {
  activeTab = signal<MerchantTab>('profile');
  selectedLang = signal<CodeLanguage>('curl');
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
      next: (res: any) => {
        this.loading = false;
        if (res && res.data) {
          this.existingMerchant = res.data;
          this.loadApiKey();
        }
      },
      error: () => this.loading = false
    });
  }

  loadApiKey(): void {
    this.merchantService.getMyApiKey().subscribe({
      next: (res: any) => {
        if (res && res.data) {
          this.rawApiKey.set(res.data);
        }
      }
    });
  }

  copyText(val: string): void {
    if (!val) return;
    navigator.clipboard.writeText(val);
    this.notification.success('Đã sao chép vào bộ nhớ tạm!');
  }

  getCodeSnippet(): string {
    const key = this.rawApiKey() || 'YOUR_API_KEY_HERE';
    const lang = this.selectedLang();

    if (lang === 'curl') {
      return `curl -X POST http://localhost:8080/api/v1/checkout/create \\
  -H "Content-Type: application/json" \\
  -d '{
    "apiKey": "${key}",
    "orderId": "SHOPEE_ORDER_1001",
    "amount": 250000,
    "description": "Thanh toan don hang tren Shopee Store",
    "returnUrl": "https://shopee.vn/checkout/callback"
  }'`;
    }

    if (lang === 'nodejs') {
      return `const axios = require('axios');

async function createPayGateCheckout() {
  const response = await axios.post('http://localhost:8080/api/v1/checkout/create', {
    apiKey: '${key}',
    orderId: 'SHOPEE_ORDER_1001',
    amount: 250000,
    description: 'Thanh toan don hang tren Shopee Store',
    returnUrl: 'https://shopee.vn/checkout/callback'
  });

  const { paymentUrl } = response.data.data;
  console.log('Redirect customer to:', paymentUrl);
  return paymentUrl;
}`;
    }

    if (lang === 'php') {
      return `<?php
$ch = curl_init('http://localhost:8080/api/v1/checkout/create');
$payload = json_encode([
    "apiKey" => "${key}",
    "orderId" => "SHOPEE_ORDER_1001",
    "amount" => 250000,
    "description" => "Thanh toan don hang",
    "returnUrl" => "https://shopee.vn/checkout/callback"
]);

curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type:application/json']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$result = json_decode(curl_exec($ch), true);
curl_close($ch);

header('Location: ' . $result['data']['paymentUrl']);
exit;`;
    }

    return `import requests

url = "http://localhost:8080/api/v1/checkout/create"
payload = {
    "apiKey": "${key}",
    "orderId": "SHOPEE_ORDER_1001",
    "amount": 250000,
    "description": "Thanh toan don hang",
    "returnUrl": "https://shopee.vn/checkout/callback"
}

res = requests.post(url, json=payload).json()
payment_url = res['data']['paymentUrl']
print("Redirecting to:", payment_url)`;
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const req = this.registerForm.value;

    this.merchantService.requestMerchant(req).subscribe({
      next: (res: any) => {
        this.submitting = false;
        if (res && res.data) {
          this.notification.success('Gửi yêu cầu đăng ký Merchant thành công!');
          this.existingMerchant = res.data;
          this.loadApiKey();
        }
      },
      error: (err: any) => {
        this.submitting = false;
        this.notification.error(err?.error?.message || 'Không thể đăng ký Merchant');
      }
    });
  }
}
