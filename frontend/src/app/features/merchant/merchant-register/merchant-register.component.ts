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
          <div class="hero-badge">🚀 ENTERPRISE GATEWAY PORTAL</div>
          <h1 class="hero-title">Merchant Partner &amp; API Integration Center</h1>
          <p class="hero-subtitle">Đăng ký tài khoản doanh nghiệp, quản lý API Key bảo mật và tích hợp Cổng thanh toán PayGate vào website của bạn chỉ với vài dòng code.</p>
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
              <svg *ngIf="submitting" class="spinner-xs-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18"><circle cx="12" cy="12" r="10" stroke-dasharray="31.4 31.4" stroke-linecap="round"/></svg>
              {{ submitting ? 'Đang gửi đăng ký...' : 'Gửi Đơn Đăng Ký Merchant  →' }}
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
              <h3>Tài Liệu Tích Hợp Chi Tiết</h3>
              <p class="card-desc">Tài liệu hướng dẫn kỹ thuật — cấu trúc Request, Response, mã lỗi và luồng xử lý giao dịch. Tích hợp PayGate vào website của bạn trong 5 phút.</p>
            </div>
          </div>

          <!-- Integration Overview -->
          <div class="docs-overview mt-20">
            <div class="overview-item">
              <div class="ov-icon ov-icon-endpoint">⚡</div>
              <div>
                <strong>Base URL</strong>
                <code class="code-inline">http://localhost:8080/api/v1</code>
              </div>
            </div>
            <div class="overview-item">
              <div class="ov-icon ov-icon-auth">🔐</div>
              <div>
                <strong>Authentication</strong>
                <span>API Key (truyền trong body)</span>
              </div>
            </div>
            <div class="overview-item">
              <div class="ov-icon ov-icon-format">📄</div>
              <div>
                <strong>Format</strong>
                <span>JSON — Content-Type: application/json</span>
              </div>
            </div>
            <div class="overview-item">
              <div class="ov-icon ov-icon-time">⏱️</div>
              <div>
                <strong>Session Timeout</strong>
                <span>15 phút kể từ khi tạo paymentUrl</span>
              </div>
            </div>
          </div>

          <!-- Quick Start Guide -->
          <div class="guide-card mt-24">
            <div class="guide-header">
              <span class="guide-step-num">1</span>
              <div>
                <h4>Hướng Dẫn Tích Hợp Nhanh (5 bước)</h4>
                <p>Thực hiện tuần tự theo các bước dưới đây để hoàn tất tích hợp</p>
              </div>
            </div>
            <div class="guide-steps">
              <div class="guide-step">
                <div class="gs-badge">B1</div>
                <div class="gs-text"><strong>Đăng ký Merchant</strong> — Điền form ở tab <strong>Hồ Sơ Doanh Nghiệp</strong>, chờ Admin phê duyệt.</div>
              </div>
              <div class="guide-step">
                <div class="gs-badge">B2</div>
                <div class="gs-text"><strong>Lấy API Key</strong> — Sau khi được duyệt, copy Secret Key tại tab <strong>API Integration Keys</strong>.</div>
              </div>
              <div class="guide-step">
                <div class="gs-badge">B3</div>
                <div class="gs-text"><strong>Gọi API tạo đơn hàng</strong> — Gửi <code>POST /api/v1/checkout/create</code> từ server của bạn với API Key và thông tin đơn hàng.</div>
              </div>
              <div class="guide-step">
                <div class="gs-badge">B4</div>
                <div class="gs-text"><strong>Redirect khách hàng</strong> — Chuyển hướng trình duyệt đến <code>paymentUrl</code> nhận được từ response.</div>
              </div>
              <div class="guide-step">
                <div class="gs-badge">B5</div>
                <div class="gs-text"><strong>Nhận callback</strong> — Sau khi thanh toán thành công, khách hàng được redirect về <code>returnUrl</code> của bạn kèm trạng thái.</div>
              </div>
            </div>
          </div>

          <!-- Workflow Visual Steps -->
          <div class="docs-section mt-28">
            <h4 class="section-subtitle">🔄 Luồng Xử Lý Giao Dịch (Payment Flow)</h4>
            <div class="workflow-steps">
              <div class="workflow-card">
                <div class="step-badge">BƯỚC 1</div>
                <h4>1. Khởi Tạo Đơn Hàng</h4>
                <p>Server của bạn gửi <code>POST /api/v1/checkout/create</code> kèm <code>apiKey</code>, <code>amount</code>, <code>orderId</code> và <code>returnUrl</code> để nhận <code>paymentUrl</code>.</p>
                <div class="wf-detail">→ Nhận về token CHK_... và paymentUrl có thời hạn 15 phút</div>
              </div>

              <div class="workflow-card">
                <div class="step-badge">BƯỚC 2</div>
                <h4>2. Chuyển Hướng Khách Hàng</h4>
                <p>Server redirect (hoặc trả về link) cho khách hàng truy cập <code>paymentUrl</code> để tiến hành thanh toán trên PayGate.</p>
                <div class="wf-detail">→ VD: <code>http://localhost:4200/checkout?token=CHK_...</code></div>
              </div>

              <div class="workflow-card">
                <div class="step-badge">BƯỚC 3</div>
                <h4>3. Xác Thực & Thanh Toán</h4>
                <p>Khách hàng kiểm tra thông tin đơn hàng, đăng nhập Ví PayGate, nhập mã OTP 6 số gửi qua Gmail để xác thực giao dịch.</p>
                <div class="wf-detail">→ OTP có hiệu lực 5 phút, được gửi đến email đăng ký</div>
              </div>

              <div class="workflow-card">
                <div class="step-badge">BƯỚC 4</div>
                <h4>4. Nhận Kết Quả Callback</h4>
                <p>Tiền tự động chuyển vào Ví Merchant của bạn. Hệ thống redirect khách hàng về <code>returnUrl</code> với tham số trạng thái.</p>
                <div class="wf-detail">→ Redirect về: <code>{{ returnUrl }}?status=SUCCESS&ref=...</code></div>
              </div>
            </div>
          </div>

          <!-- Parameter Specification Table -->
          <div class="docs-section mt-28">
            <h4 class="section-subtitle">📋 Bảng Tham Số Khởi Tạo Đơn Hàng</h4>
            <p class="docs-desc">Gửi POST request đến <code class="code-inline">http://localhost:8080/api/v1/checkout/create</code> với body JSON như sau:</p>
            <div class="table-responsive">
              <table class="docs-table">
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Kiểu</th>
                    <th>Bắt buộc</th>
                    <th>Mô tả chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>apiKey</code></td>
                    <td><code>String</code></td>
                    <td><span class="badge-req">Bắt buộc</span></td>
                    <td>Secret API Key của Merchant (lấy tại tab <strong>API Keys</strong>). Tối đa 64 ký tự.</td>
                  </tr>
                  <tr>
                    <td><code>orderId</code></td>
                    <td><code>String</code></td>
                    <td><span class="badge-req">Bắt buộc</span></td>
                    <td>Mã đơn hàng duy nhất trên hệ thống của bạn — không được trùng lặp. VD: <code>ORDER_998811</code>, <code>INV_202407_001</code></td>
                  </tr>
                  <tr>
                    <td><code>amount</code></td>
                    <td><code>Number</code></td>
                    <td><span class="badge-req">Bắt buộc</span></td>
                    <td>Số tiền VND, tối thiểu <code>1,000</code>. Không hỗ trợ số thập phân. VD: <code>250000</code> = 250,000₫</td>
                  </tr>
                  <tr>
                    <td><code>description</code></td>
                    <td><code>String</code></td>
                    <td><span class="badge-opt">Tùy chọn</span></td>
                    <td>Mô tả hiển thị cho khách khi thanh toán. Max 255 ký tự. VD: <code>"Thanh toán đơn hàng Shopee"</code></td>
                  </tr>
                  <tr>
                    <td><code>returnUrl</code></td>
                    <td><code>String (URL)</code></td>
                    <td><span class="badge-req">Bắt buộc</span></td>
                    <td>URL để redirect khách hàng về sau khi thanh toán xong. Phải bắt đầu bằng <code>https://</code> hoặc <code>http://</code>. VD: <code>https://shopee.vn/checkout/done</code></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Full Response Structure Section -->
          <div class="docs-section mt-28">
            <h4 class="section-subtitle">📦 Cấu Trúc Response Trả Về</h4>
            <p class="docs-desc">Khi gọi API thành công, bạn nhận được JSON response với cấu trúc như sau:</p>
            <div class="code-with-label">
              <span class="code-label">✅ Response thành công (HTTP 200)</span>
              <pre class="code-box"><code>&#123;
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
            <div class="response-fields mt-16">
              <div class="rf-item"><code>success</code> — <span>Luôn là <code>true</code> nếu request hợp lệ</span></div>
              <div class="rf-item"><code>data.token</code> — <span>Mã phiên giao dịch duy nhất, dùng để truy vấn trạng thái sau này</span></div>
              <div class="rf-item"><code>data.paymentUrl</code> — <span>Link redirect khách hàng (có hiệu lực trong 15 phút)</span></div>
              <div class="rf-item"><code>data.expiresAt</code> — <span>Thời điểm hết hạn của paymentUrl (ISO 8601)</span></div>
            </div>
          </div>

          <!-- Error Response -->
          <div class="docs-section mt-24">
            <h4 class="section-subtitle">❌ Cấu Trúc Lỗi</h4>
            <p class="docs-desc">Khi có lỗi, API trả về HTTP 4xx / 5xx với body:</p>
            <pre class="code-box error-code-box"><code>&#123;
  "success": false,
  "message": "API Key của Merchant không hợp lệ",
  "timestamp": "2026-07-28T16:15:00.000"
&#125;</code></pre>
          </div>

          <!-- Error Codes Specification Table -->
          <div class="docs-section mt-28">
            <h4 class="section-subtitle">⚠️ Bảng Mã Lỗi & Cách Xử Lý</h4>
            <div class="table-responsive">
              <table class="docs-table">
                <thead>
                  <tr>
                    <th>Lỗi (Error Message)</th>
                    <th>Nguyên nhân</th>
                    <th>Giải pháp</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>API Key không hợp lệ</code></td>
                    <td>apiKey sai hoặc Merchant chưa active</td>
                    <td>Kiểm tra lại API Key ở tab API Keys, đảm bảo Merchant đã được Admin duyệt</td>
                  </tr>
                  <tr>
                    <td><code>Merchant đang bị khóa</code></td>
                    <td>Merchant chưa được phê duyệt hoặc đã bị vô hiệu hóa</td>
                    <td>Liên hệ Admin PayGate để kiểm tra trạng thái</td>
                  </tr>
                  <tr>
                    <td><code>Số tiền tối thiểu 1,000 VND</code></td>
                    <td>amount &lt; 1000</td>
                    <td>Đảm bảo amount &gt;= 1000 VND</td>
                  </tr>
                  <tr>
                    <td><code>orderId đã tồn tại</code></td>
                    <td>orderId bị trùng với đơn hàng trước đó</td>
                    <td>Sinh orderId mới (có thể thêm timestamp hoặc ngẫu nhiên)</td>
                  </tr>
                  <tr>
                    <td><code>Phiên thanh toán đã hết hạn</code></td>
                    <td>Quá 15 phút kể từ khi tạo</td>
                    <td>Tạo payment URL mới cho khách hàng</td>
                  </tr>
                  <tr>
                    <td><code>Return URL không hợp lệ</code></td>
                    <td>URL không đúng định dạng hoặc không phải http/https</td>
                    <td>Kiểm tra lại returnUrl, phải bắt đầu bằng http:// hoặc https://</td>
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
                <button class="code-tab" [class.active]="selectedLang() === 'nodejs'" (click)="selectedLang.set('nodejs')">Node.js</button>
                <button class="code-tab" [class.active]="selectedLang() === 'php'" (click)="selectedLang.set('php')">PHP</button>
                <button class="code-tab" [class.active]="selectedLang() === 'python'" (click)="selectedLang.set('python')">Python</button>
              </div>
              <button class="btn-copy-code" (click)="copyText(getCodeSnippet())">📋 Copy Code</button>
            </div>

            <pre class="code-box"><code>{{ getCodeSnippet() }}</code></pre>
          </div>

          <!-- Tips & Best Practices -->
          <div class="tips-section mt-24">
            <div class="tip-card">
              <div class="tip-icon">🔒</div>
              <div class="tip-body">
                <strong>Bảo mật API Key</strong>
                <p>Không bao giờ nhúng API Key trực tiếp trong code frontend (JavaScript trình duyệt). Luôn lưu trữ ở server-side (file .env, environment variables).</p>
              </div>
            </div>
            <div class="tip-card">
              <div class="tip-icon">🔄</div>
              <div class="tip-body">
                <strong>Idempotency & Trùng lặp</strong>
                <p>Luôn tạo orderId duy nhất cho mỗi đơn hàng. Nếu cần retry, sử dụng cùng orderId — hệ thống PayGate tự động chống trùng lặp giao dịch.</p>
              </div>
            </div>
            <div class="tip-card">
              <div class="tip-icon">⏰</div>
              <div class="tip-body">
                <strong>Xử lý timeout</strong>
                <p>Payment URL chỉ có hiệu lực 15 phút. Nếu khách hàng không thanh toán kịp, tạo URL mới. Kiểm tra <code>expiresAt</code> trong response để hiển thị thông báo cho khách.</p>
              </div>
            </div>
            <div class="tip-card">
              <div class="tip-icon">📞</div>
              <div class="tip-body">
                <strong>Webhook Callback</strong>
                <p>Nếu Merchant có cấu hình Webhook URL, PayGate sẽ gửi POST thông báo realtime khi giao dịch hoàn tất (thành công hoặc thất bại).</p>
              </div>
            </div>
          </div>

          <div class="swagger-banner mt-24">
            <div class="swagger-info">
              <span class="swagger-icon">⚡</span>
              <div>
                <strong>Tài liệu API Interactive — Swagger UI</strong>
                <p>Thử nghiệm API trực tiếp trên giao diện Swagger chuẩn OpenAPI 3.0 — kiểm tra request/response ngay trên trình duyệt</p>
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
      background: radial-gradient(circle at 80% 10%, rgba(255,255,255,.98), transparent 30%),
                  linear-gradient(135deg, #fff0f6 0%, #e8f0fe 50%, #fff5f9 100%);
      color: #0d2b5c; border-radius: 20px; padding: 32px 36px 0; margin-bottom: 24px;
      box-shadow: 0 8px 28px -6px rgba(194, 0, 103, 0.08);
      border: 1px solid #f8bbd0;
    }
    .hero-badge { font-size: 0.72rem; font-weight: 800; letter-spacing: 0.08em; color: #c20067; text-transform: uppercase; margin-bottom: 6px; }
    .hero-title { font-size: 1.8rem; font-weight: 900; margin: 0 0 6px; letter-spacing: -0.02em; line-height: 1.2; color: #0d2b5c; }
    .hero-subtitle { font-size: 0.92rem; color: #475569; margin: 0 0 24px; max-width: 680px; line-height: 1.5; }

    /* Portal Tabs */
    .portal-tabs { display: flex; gap: 8px; border-bottom: 1px solid #f3d6e5; }
    .portal-tab {
      padding: 14px 22px; border: none; background: rgba(255,255,255,0.5); font-size: 0.92rem; font-weight: 700;
      color: #64748b; cursor: pointer; border-bottom: 3px solid transparent; transition: all 0.2s; border-radius: 10px 10px 0 0;
    }
    .portal-tab.active { color: #c20067; border-bottom-color: #c20067; background: #ffffff; }
    .portal-tab:hover:not(.active) { color: #c20067; background: rgba(255,255,255,0.8); }

    /* Portal Cards */
    .portal-card { background: #ffffff; border: 1.5px solid #f3d6e5; border-radius: 20px; padding: 32px; box-shadow: 0 4px 20px -4px rgba(194,0,103,0.04); }
    .card-title-group { display: flex; gap: 14px; align-items: flex-start; }
    .icon-box { font-size: 32px; background: #fff0f6; width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .card-title-group h3 { font-size: 1.25rem; font-weight: 800; margin: 0 0 4px; color: #0d2b5c; }
    .card-desc { font-size: 0.88rem; color: #64748b; margin: 0; }

    /* Form & Profile */
    .card-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 20px; font-size: 0.78rem; font-weight: 800; }
    .status-badge.active { background: #fff0f6; color: #c20067; border: 1px solid #f8bbd0; }
    .status-badge.pending { background: #fef3c7; color: #b45309; border: 1px solid #fde047; }
    .status-badge.rejected { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }

    .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; background: #fffafc; padding: 20px; border-radius: 16px; border: 1px solid #f3d6e5; }
    .info-item { display: flex; flex-direction: column; gap: 4px; }
    .info-label { font-size: 0.72rem; font-weight: 800; color: #64748b; letter-spacing: 0.04em; }
    .info-val { font-size: 0.95rem; color: #0f172a; }
    .wallet-badge { background: #fff0f6; color: #c20067; padding: 4px 8px; border-radius: 6px; font-weight: 700; width: fit-content; }

    .notice-box { margin-top: 20px; padding: 16px 20px; border-radius: 12px; font-size: 0.9rem; line-height: 1.5; }
    .notice-box.active { background: #fff0f6; color: #c20067; border: 1px solid #f8bbd0; }
    .notice-box.pending { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }

    /* API Keys Credentials Box */
    .cred-field { display: flex; flex-direction: column; gap: 6px; }
    .cred-label { font-size: 0.8rem; font-weight: 800; color: #475569; letter-spacing: 0.03em; }
    .input-copy-group { display: flex; gap: 10px; flex-wrap: wrap; }
    .cred-input { flex: 1; min-width: 200px; height: 48px; padding: 0 16px; border: 1.5px solid #f3c2da; border-radius: 12px; background: #fffafd; font-size: 1rem; font-weight: 700; color: #0f172a; }
    .cred-input:focus { outline: none; border-color: #c20067; box-shadow: 0 0 0 3px rgba(194,0,103,0.1); }
    .cred-input.api-key-highlight { color: #c20067; background: #fff0f6; border-color: #f8bbd0; }
    .btn-copy { padding: 0 20px; background: #f1f5f9; color: #334155; border: 1.5px solid #cbd5e1; border-radius: 12px; font-weight: 700; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
    .btn-copy:hover { background: #e2e8f0; }
    .btn-copy.primary { background: linear-gradient(135deg, #c20067 0%, #0072ce 100%); color: #ffffff; border: none; }
    .btn-copy.primary:hover { opacity: 0.9; }
    .btn-toggle { padding: 0 16px; background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 12px; font-weight: 700; cursor: pointer; color: #475569; white-space: nowrap; }
    .btn-toggle:hover { background: #f8fafc; }
    .key-security-note { font-size: 0.8rem; color: #64748b; margin-top: 6px; }

    .endpoint-info-card { background: linear-gradient(135deg, #fff0f6 0%, #f0f4ff 100%); color: #0d2b5c; padding: 24px; border-radius: 16px; border: 1px solid #f8bbd0; }
    .endpoint-header { display: flex; align-items: center; gap: 12px; font-family: monospace; font-size: 0.95rem; }
    .http-badge { padding: 4px 10px; border-radius: 6px; font-weight: 800; font-size: 0.78rem; }
    .http-badge.post { background: linear-gradient(135deg, #c20067 0%, #0072ce 100%); color: #ffffff; }
    .endpoint-url { color: #c20067; font-weight: 700; }
    .endpoint-desc { font-size: 0.82rem; color: #64748b; margin: 8px 0 0; }

    /* Workflow Cards */
    .workflow-steps { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    .workflow-card { background: #fffafc; border: 1.5px solid #f3d6e5; border-radius: 16px; padding: 20px; transition: all 0.2s; }
    .workflow-card:hover { border-color: #f8bbd0; box-shadow: 0 4px 16px rgba(194,0,103,0.06); }
    .step-badge { font-size: 0.68rem; font-weight: 800; color: #c20067; background: #fff0f6; padding: 4px 10px; border-radius: 20px; width: fit-content; margin-bottom: 8px; }
    .workflow-card h4 { font-size: 1rem; font-weight: 800; margin: 0 0 6px; color: #0d2b5c; }
    .workflow-card p { font-size: 0.85rem; color: #64748b; margin: 0; line-height: 1.5; }

    /* Parameter Specification Table */
    .section-subtitle { font-size: 1rem; font-weight: 800; color: #0d2b5c; margin: 0 0 12px; }
    .table-responsive { overflow-x: auto; border: 1.5px solid #f3d6e5; border-radius: 14px; }
    .docs-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.88rem; }
    .docs-table th { background: #fff0f6; padding: 12px 16px; font-weight: 800; color: #0d2b5c; border-bottom: 1.5px solid #f3d6e5; }
    .docs-table td { padding: 14px 16px; border-bottom: 1px solid #fce4ec; color: #334155; }
    .docs-table code { background: #fff0f6; color: #c20067; padding: 2px 6px; border-radius: 6px; font-weight: 700; font-family: monospace; }

    /* Code Snippet Box */
    .code-snippets-section { background: #1e293b; border-radius: 16px; overflow: hidden; border: 1px solid #334155; }
    .code-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 18px; background: #1e293b; border-bottom: 1px solid #334155; }
    .code-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
    .code-tab { padding: 6px 14px; background: transparent; border: none; color: #94a3b8; font-size: 0.82rem; font-weight: 700; border-radius: 8px; cursor: pointer; transition: all 0.15s; }
    .code-tab.active { background: linear-gradient(135deg, #c20067 0%, #0072ce 100%); color: #ffffff; }
    .code-tab:hover:not(.active) { color: #e2e8f0; }
    .btn-copy-code { background: rgba(255,255,255,0.1); color: #ffffff; border: none; padding: 6px 12px; border-radius: 8px; font-size: 0.8rem; font-weight: 700; cursor: pointer; }
    .btn-copy-code:hover { background: rgba(255,255,255,0.2); }
    .code-box { padding: 20px; margin: 0; font-family: 'SF Mono', Consolas, monospace; font-size: 0.85rem; color: #e2e8f0; overflow-x: auto; line-height: 1.6; }

    .swagger-banner { display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, #fff0f6 0%, #f0f4ff 100%); border: 1.5px solid #f8bbd0; padding: 20px; border-radius: 16px; }
    .swagger-info { display: flex; gap: 14px; align-items: center; }
    .swagger-icon { font-size: 28px; }
    .swagger-info strong { font-size: 0.95rem; color: #c20067; display: block; }
    .swagger-info p { font-size: 0.82rem; color: #64748b; margin: 2px 0 0; }
    .btn-open-swagger { background: linear-gradient(135deg, #c20067 0%, #0072ce 100%); color: #ffffff; padding: 12px 20px; border-radius: 10px; text-decoration: none; font-weight: 800; font-size: 0.88rem; white-space: nowrap; transition: all 0.2s; box-shadow: 0 4px 14px rgba(194,0,103,0.2); }
    .btn-open-swagger:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(194,0,103,0.3); }

    .mt-16 { margin-top: 16px; }
    .mt-18 { margin-top: 18px; }
    .mt-20 { margin-top: 20px; }
    .mt-24 { margin-top: 24px; }
    .mt-28 { margin-top: 28px; }
    .font-bold { font-weight: 800; }
    .font-mono { font-family: monospace; }
    .text-emerald { color: #c20067; }
    .text-muted { color: #64748b; }
    .warning-banner { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; padding: 16px; border-radius: 12px; font-weight: 600; margin-top: 16px; }

    .portal-form { display: flex; flex-direction: column; gap: 16px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-label { font-size: 0.82rem; font-weight: 700; color: #475569; }
    .form-label.required::after { content: ' *'; color: #ef4444; }
    .form-control { height: 46px; padding: 0 16px; border: 1.5px solid #f3c2da; border-radius: 10px; font-size: 0.95rem; background: #fffafd; }
    .form-control:focus { outline: none; border-color: #c20067; box-shadow: 0 0 0 3px rgba(194,0,103,0.1); }
    .btn-submit-emerald { height: 48px; background: linear-gradient(135deg, #c20067 0%, #0072ce 100%); color: #fff; border: none; border-radius: 10px; font-weight: 800; font-size: 0.95rem; cursor: pointer; box-shadow: 0 6px 18px rgba(194,0,103,0.25); transition: all 0.2s; }
    .btn-submit-emerald:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(194,0,103,0.35); }
    .btn-submit-emerald:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Overview Bar */
    .docs-overview { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; background: #fffafc; border: 1px solid #f3d6e5; border-radius: 14px; padding: 16px; }
    .overview-item { display: flex; align-items: center; gap: 12px; font-size: 0.85rem; color: #334155; }
    .overview-item strong { display: block; color: #0d2b5c; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.03em; margin-bottom: 2px; }
    .overview-item span, .overview-item code { font-size: 0.85rem; }
    .ov-icon { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
    .ov-icon-endpoint { background: #fff0f6; }
    .ov-icon-auth { background: #eef6ff; }
    .ov-icon-format { background: #fff0f6; }
    .ov-icon-time { background: #fffbeb; }
    .code-inline { background: #fff0f6; color: #c20067; padding: 2px 8px; border-radius: 6px; font-weight: 700; font-family: monospace; font-size: 0.82rem; }

    /* Guide Card */
    .guide-card { background: #fffafc; border: 1.5px solid #f3d6e5; border-radius: 16px; padding: 20px; }
    .guide-header { display: flex; gap: 14px; align-items: flex-start; margin-bottom: 16px; }
    .guide-step-num { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #c20067, #0072ce); color: #fff; font-weight: 900; font-size: 0.95rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .guide-header h4 { margin: 0 0 2px; font-size: 1rem; font-weight: 800; color: #0d2b5c; }
    .guide-header p { margin: 0; font-size: 0.82rem; color: #64748b; }
    .guide-steps { display: flex; flex-direction: column; gap: 10px; }
    .guide-step { display: flex; align-items: flex-start; gap: 12px; }
    .gs-badge { width: 30px; height: 24px; border-radius: 6px; background: #fff0f6; color: #c20067; font-weight: 800; font-size: 0.75rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .gs-text { font-size: 0.88rem; color: #475569; line-height: 1.5; }
    .gs-text strong { color: #0f172a; }

    .docs-desc { font-size: 0.85rem; color: #64748b; margin: -6px 0 14px; line-height: 1.5; }
    .wf-detail { font-size: 0.78rem; color: #c20067; font-weight: 600; margin-top: 6px; padding-top: 6px; border-top: 1px dashed #f3d6e5; }
    .badge-req { background: #fee2e2; color: #b91c1c; font-size: 0.72rem; font-weight: 800; padding: 2px 8px; border-radius: 12px; }
    .badge-opt { background: #f1f5f9; color: #64748b; font-size: 0.72rem; font-weight: 800; padding: 2px 8px; border-radius: 12px; }

    .code-with-label { margin-top: 4px; }
    .code-label { display: block; font-size: 0.72rem; font-weight: 800; color: #c20067; background: #fff0f6; padding: 6px 14px; border-radius: 10px 10px 0 0; letter-spacing: 0.03em; }
    .code-with-label pre { border-radius: 0 0 14px 14px !important; margin-top: 0 !important; }
    .error-code-box { border: 1px solid #fecaca !important; }
    .response-fields { display: flex; flex-direction: column; gap: 6px; }
    .rf-item { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: #475569; padding: 8px 12px; background: #f8fafc; border-radius: 8px; }
    .rf-item code { background: #fff0f6; color: #c20067; padding: 2px 8px; border-radius: 6px; font-weight: 700; font-family: monospace; flex-shrink: 0; }
    .rf-item span { line-height: 1.4; }

    .code-box.light-code { background: #f8fafc; color: #334155; border: 1px solid #e2e8f0; border-radius: 14px; margin-top: 8px; }

    /* Tips Section */
    .tips-section { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .tip-card { display: flex; gap: 12px; padding: 16px; background: #fffafc; border: 1px solid #f3d6e5; border-radius: 14px; }
    .tip-icon { font-size: 22px; flex-shrink: 0; }
    .tip-body strong { display: block; font-size: 0.82rem; color: #0d2b5c; margin-bottom: 4px; }
    .tip-body p { margin: 0; font-size: 0.78rem; color: #64748b; line-height: 1.5; }

    .spinner-xs-inline { animation: spin 0.6s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
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
