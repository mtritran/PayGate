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
          <p class="hero-subtitle">Register a business account, manage secure API keys, and integrate PayGate checkout into your website with a few lines of code.</p>
        </div>
        
        <!-- Navigation Tabs -->
        <div class="portal-tabs">
          <button
            class="portal-tab"
            [class.active]="activeTab() === 'profile'"
            (click)="activeTab.set('profile')"
          >
            🏢 Business Profile
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
            📖 Integration Docs & Sample Code
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
              STATUS: {{ existingMerchant.status || (existingMerchant.active ? 'ACTIVE' : 'PENDING') }}
            </div>
            <span class="date-text">Registered at: {{ existingMerchant.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">BUSINESS / STORE NAME</span>
              <div class="info-val font-bold">{{ existingMerchant.merchantName }}</div>
            </div>
            <div class="info-item">
              <span class="info-label">MERCHANT CODE (MERCHANT CODE)</span>
              <div class="info-val font-mono text-emerald">{{ existingMerchant.merchantCode }}</div>
            </div>
            <div class="info-item">
              <span class="info-label">WEBHOOK NOTIFICATION ENDPOINT</span>
              <div class="info-val font-mono text-muted">{{ existingMerchant.webhookUrl || 'Not configured' }}</div>
            </div>
            <div class="info-item" *ngIf="existingMerchant.accountNumber">
              <span class="info-label">PAYGATE BUSINESS WALLET</span>
              <code class="wallet-badge font-mono">{{ existingMerchant.accountNumber }}</code>
            </div>
          </div>

          <div class="notice-box" [ngClass]="existingMerchant.status?.toLowerCase() || 'pending'">
            <div *ngIf="existingMerchant.status === 'PENDING' || (!existingMerchant.active && existingMerchant.status !== 'REJECTED')">
              ⏳ <strong>Pending Admin approval:</strong> Your profile is under review. Once approved, the API key will become fully active.
            </div>
            <div *ngIf="existingMerchant.status === 'ACTIVE' || existingMerchant.active">
              ✅ <strong>Active:</strong> Your merchant account is active. Go to the <strong>API Integration Keys</strong> tab to get your integration API key.
            </div>
            <div *ngIf="existingMerchant.status === 'REJECTED'">
              ❌ <strong>Rejected:</strong> Your merchant application was rejected. Please contact Admin.
            </div>
          </div>
        </div>

        <!-- Registration Form if No Merchant Profile -->
        <div *ngIf="!existingMerchant && !loading" class="portal-card">
          <div class="card-title">Register Business Account (Merchant Partner)</div>
          <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="portal-form mt-20">
            <div class="form-group">
              <label class="form-label required">Company / Store Brand Name</label>
              <input type="text" class="form-control" formControlName="merchantName" placeholder="Example: Shopee Vietnam Co., Ltd">
            </div>

            <div class="form-group">
              <label class="form-label required">Unique Merchant Code (Merchant Code)</label>
              <input type="text" class="form-control font-mono" formControlName="merchantCode" placeholder="Example: SHOPEE_STORE">
            </div>

            <div class="form-group">
              <label class="form-label required">Webhook Callback URL</label>
              <input type="url" class="form-control font-mono" formControlName="webhookUrl" placeholder="Example: https://api.shopee.vn/v1/webhooks/paygate">
            </div>

            <button type="submit" class="btn-submit-emerald" [disabled]="registerForm.invalid || submitting">
              <svg *ngIf="submitting" class="spinner-xs-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18"><circle cx="12" cy="12" r="10" stroke-dasharray="31.4 31.4" stroke-linecap="round"/></svg>
              {{ submitting ? 'Submitting application...' : 'Submit Merchant Application  →' }}
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
              <h3>API Integration Keys (Merchant Credentials)</h3>
              <p class="card-desc">This secure API key represents your business when creating payment transactions.</p>
            </div>
          </div>

          <div *ngIf="!existingMerchant" class="warning-banner">
            ⚠️ Bạn chưa đăng ký tài loans Merchant. Please đăng ký ở tab <strong>Business Profile</strong> tab first.
          </div>

          <div *ngIf="existingMerchant" class="credentials-container mt-20">
            <!-- Merchant Code Field -->
            <div class="cred-field">
              <label class="cred-label">MERCHANT CODE (Identifier):</label>
              <div class="input-copy-group">
                <input type="text" readonly [value]="existingMerchant.merchantCode" class="cred-input font-mono">
                <button class="btn-copy" (click)="copyText(existingMerchant.merchantCode)">📋 Copy</button>
              </div>
            </div>

            <!-- API Key Field -->
            <div class="cred-field mt-18">
              <label class="cred-label">SECRET API KEY (Secure connection key):</label>
              <div class="input-copy-group">
                <input
                  [type]="showRawKey() ? 'text' : 'password'"
                  readonly
                  [value]="rawApiKey() || '••••••••••••••••••••••••••••••••'"
                  class="cred-input font-mono api-key-highlight"
                >
                <button class="btn-toggle" (click)="showRawKey.set(!showRawKey())">
                  {{ showRawKey() ? '👁️ Hide Key' : '👁️ Show Key' }}
                </button>
                <button class="btn-copy primary" [disabled]="!rawApiKey()" (click)="copyText(rawApiKey())">
                  📋 Copy API Key
                </button>
              </div>
              <p class="key-security-note">🔒 <strong>Security:</strong> Store this API key on your server (file <code>.env</code>). Do not share it publicly!</p>
            </div>

            <!-- API Gateway Endpoint Info Box -->
            <div class="endpoint-info-card mt-24">
              <div class="endpoint-header">
                <span class="http-badge post">POST</span>
                <span class="endpoint-url">http://localhost:8080/api/v1/checkout/create</span>
              </div>
              <p class="endpoint-desc">Primary endpoint used by your server to create payment orders.</p>
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
              <h3>Detailed Integration Docs</h3>
              <p class="card-desc">Technical guide — request and response structure, error codes, and transaction flow. Integrate PayGate into your website in 5 minutes.</p>
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
                <span>API Key (sent in request body)</span>
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
                <span>15 minutes after paymentUrl creation</span>
              </div>
            </div>
          </div>

          <!-- Quick Start Guide -->
          <div class="guide-card mt-24">
            <div class="guide-header">
              <span class="guide-step-num">1</span>
              <div>
                <h4>Quick Integration Guide (5 bước)</h4>
                <p>Follow these steps to complete the integration</p>
              </div>
            </div>
            <div class="guide-steps">
              <div class="guide-step">
                <div class="gs-badge">B1</div>
                <div class="gs-text"><strong>Đăng ký Merchant</strong> — Fill in the form in <strong>Business Profile</strong>, wait for Admin approval.</div>
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
                <h4>1. Khởi Create Đơn Hàng</h4>
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
                <p>Customer kiểm tra thông tin đơn hàng, đăng nhập Ví PayGate, nhập mã OTP 6 số gửi qua Gmail để xác thực giao dịch.</p>
                <div class="wf-detail">→ OTP có hiệu lực 5 phút, được gửi đến email đăng ký</div>
              </div>

              <div class="workflow-card">
                <div class="step-badge">BƯỚC 4</div>
                <h4>4. Nhận Kết Quả Callback</h4>
                <p>Tiền tự động chuyển vào Ví Merchant của bạn. Hệ thống redirect khách hàng về <code>returnUrl</code> với tham số trạng thái.</p>
                <div class="wf-detail">→ Redirect về: <code>returnUrl?status=SUCCESS&ref=...</code></div>
              </div>
            </div>
          </div>

          <!-- Parameter Specification Table -->
          <div class="docs-section mt-28">
            <h4 class="section-subtitle">📋 Bảng Tham Số Khởi Create Đơn Hàng</h4>
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
                    <td>Order ID duy nhất trên hệ thống của bạn — không được trùng lặp. VD: <code>ORDER_998811</code>, <code>INV_202407_001</code></td>
                  </tr>
                  <tr>
                    <td><code>amount</code></td>
                    <td><code>Number</code></td>
                    <td><span class="badge-req">Bắt buộc</span></td>
                    <td>Amount VND, tối thiểu <code>1,000</code>. Không hỗ trợ số thập phân. VD: <code>250000</code> = 250,000₫</td>
                  </tr>
                  <tr>
                    <td><code>description</code></td>
                    <td><code>String</code></td>
                    <td><span class="badge-opt">Tùy chọn</span></td>
                    <td>Mô tả hiển thị cho khách khi thanh toán. Max 255 ký tự. VD: <code>"Payment đơn hàng Shopee"</code></td>
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
              <span class="code-label success-label">✅ Response thành công (HTTP 200)</span>
              <pre class="code-box dark-soft-box"><code>&#123;
  <span class="json-key">"success"</span>: <span class="json-bool">true</span>,
  <span class="json-key">"message"</span>: <span class="json-str">"Create phiên thanh toán thành công"</span>,
  <span class="json-key">"data"</span>: &#123;
    <span class="json-key">"token"</span>: <span class="json-str">"CHK_3EF6DF2E73B9469093B97BFD47177875"</span>,
    <span class="json-key">"paymentUrl"</span>: <span class="json-str">"http://localhost:4200/checkout?token=CHK_3EF6DF2E73B9469093B97BFD47177875"</span>,
    <span class="json-key">"expiresAt"</span>: <span class="json-str">"2026-07-28T16:30:00.000"</span>
  &#125;,
  <span class="json-key">"timestamp"</span>: <span class="json-str">"2026-07-28T16:15:00.000"</span>
&#125;</code></pre>
            </div>
            <div class="response-fields mt-16">
              <div class="rf-item"><code>success</code> — <span>Always <code>true</code> when the request is valid</span></div>
              <div class="rf-item"><code>data.token</code> — <span>Unique session token used for later status lookup</span></div>
              <div class="rf-item"><code>data.paymentUrl</code> — <span>Customer redirect link (valid for 15 minutes)</span></div>
              <div class="rf-item"><code>data.expiresAt</code> — <span>paymentUrl expiry timestamp (ISO 8601)</span></div>
            </div>
          </div>

          <!-- Error Response -->
          <div class="docs-section mt-24">
            <h4 class="section-subtitle">❌ Error Structure</h4>
            <p class="docs-desc">When an error occurs, the API returns HTTP 4xx / 5xx with this body:</p>
            <div class="code-with-label">
              <span class="code-label error-label">❌ Error Response (HTTP 4xx / 5xx)</span>
              <pre class="code-box dark-soft-box error-code-box"><code>&#123;
  <span class="json-key">"success"</span>: <span class="json-bool">false</span>,
  <span class="json-key">"message"</span>: <span class="json-str">"Invalid merchant API key"</span>,
  <span class="json-key">"timestamp"</span>: <span class="json-str">"2026-07-28T16:15:00.000"</span>
&#125;</code></pre>
            </div>
          </div>

          <!-- Error Codes Specification Table -->
          <div class="docs-section mt-28">
            <h4 class="section-subtitle">⚠️ Error Codes & Handling</h4>
            <div class="table-responsive">
              <table class="docs-table">
                <thead>
                  <tr>
                    <th>Error Message</th>
                    <th>Cause</th>
                    <th>Solution</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>Invalid API key</code></td>
                    <td>apiKey is wrong or Merchant is not active</td>
                    <td>Check the API key and make sure the Merchant has been approved</td>
                  </tr>
                  <tr>
                    <td><code>Merchant is locked</code></td>
                    <td>Merchant is not approved or has been disabled</td>
                    <td>Contact PayGate Admin to check status</td>
                  </tr>
                  <tr>
                    <td><code>Minimum amount is 1,000 VND</code></td>
                    <td>amount &lt; 1000</td>
                    <td>Make sure amount &gt;= 1000 VND</td>
                  </tr>
                  <tr>
                    <td><code>orderId already exists</code></td>
                    <td>orderId duplicates a previous order</td>
                    <td>Generate a new orderId (you can add a timestamp or random suffix)</td>
                  </tr>
                  <tr>
                    <td><code>Payment session expired</code></td>
                    <td>More than 15 minutes after creation</td>
                    <td>Create a new payment URL for the customer</td>
                  </tr>
                  <tr>
                    <td><code>Invalid return URL</code></td>
                    <td>URL is malformed or not http/https</td>
                    <td>Check returnUrl; it must start with http:// or https://</td>
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
                <strong>Security API Key</strong>
                <p>Never embed API keys directly in frontend code (browser JavaScript). Always store it server-side (file .env, environment variables).</p>
              </div>
            </div>
            <div class="tip-card">
              <div class="tip-icon">🔄</div>
              <div class="tip-body">
                <strong>Idempotency & Duplicates</strong>
                <p>Always create a unique orderId for each order. If retrying, reuse the same orderId; PayGate prevents duplicate transactions.</p>
              </div>
            </div>
            <div class="tip-card">
              <div class="tip-icon">⏰</div>
              <div class="tip-body">
                <strong>Timeout handling</strong>
                <p>Payment URLs are valid for 15 minutes. Create a new URL if the customer does not pay in time. Check <code>expiresAt</code> in the response to notify the customer.</p>
              </div>
            </div>
            <div class="tip-card">
              <div class="tip-icon">📞</div>
              <div class="tip-body">
                <strong>Webhook Callback</strong>
                <p>If the Merchant has a Webhook URL, PayGate sends a realtime POST when the transaction completes (successfully or unsuccessfully).</p>
              </div>
            </div>
          </div>

          <div class="swagger-banner mt-24">
            <div class="swagger-info">
              <span class="swagger-icon">⚡</span>
              <div>
                <strong>Interactive API Docs - Swagger UI</strong>
                <p>Test APIs directly in the OpenAPI 3.0 Swagger UI and inspect request/response in the browser</p>
              </div>
            </div>
            <a href="http://localhost:8080/swagger-ui.html" target="_blank" class="btn-open-swagger">Open Swagger UI ↗</a>
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
    .code-label { display: block; font-size: 0.75rem; font-weight: 800; padding: 8px 16px; border-radius: 12px 12px 0 0; letter-spacing: 0.03em; }
    .code-label.success-label { background: #064e3b; color: #6ee7b7; border: 1px solid #047857; border-bottom: none; }
    .code-label.error-label { background: #451a03; color: #fca5a5; border: 1px solid #7f1d1d; border-bottom: none; }
    .code-with-label pre { border-radius: 0 0 14px 14px !important; margin-top: 0 !important; }

    .dark-soft-box { background: #0f172a !important; border: 1px solid #1e293b !important; color: #e2e8f0 !important; }
    .error-code-box { border: 1px solid #7f1d1d !important; background: #0f172a !important; }

    .json-key { color: #38bdf8; font-weight: 700; }
    .json-str { color: #34d399; }
    .json-bool { color: #fbbf24; font-weight: 800; }

    .response-fields { display: flex; flex-direction: column; gap: 6px; }
    .rf-item { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: #475569; padding: 8px 12px; background: #fffafc; border: 1px solid #f3d6e5; border-radius: 8px; }
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
    this.notification.success('Copied to clipboard!');
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
          this.notification.success('Merchant registration request submitted!');
          this.existingMerchant = res.data;
          this.loadApiKey();
        }
      },
      error: (err: any) => {
        this.submitting = false;
        this.notification.error(err?.error?.message || 'Unable to register Merchant');
      }
    });
  }
}
