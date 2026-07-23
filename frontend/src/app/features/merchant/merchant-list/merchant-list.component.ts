import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MerchantService } from '../../../core/services/merchant.service';
import { Merchant } from '../../../core/models/merchant.model';
import { MerchantFormComponent } from '../merchant-form/merchant-form.component';

@Component({
  selector: 'app-merchant-list',
  standalone: true,
  imports: [CommonModule, MerchantFormComponent],
  template: `
    <div class="console-page fade-in-up">
      <!-- Page Header -->
      <div class="page-header flex-between">
        <div>
          <div class="header-tag">ENTERPRISE MERCHANT PROVISIONING</div>
          <h2>Merchant Management</h2>
          <p class="header-subtitle">Manage registered business partners, webhooks, and automatic wallet provisions.</p>
        </div>
        <button class="btn-emerald-primary pulse-glow" (click)="openCreateModal()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Register Merchant ↗</span>
        </button>
      </div>

      <!-- Main Content Card / Table -->
      <div class="table-card">
        <div *ngIf="loading" class="loading-box">
          <div class="spinner"></div>
        </div>

        <div *ngIf="!loading" class="custom-table-wrapper">
          <table class="paygate-table">
            <thead>
              <tr>
                <th>MERCHANT</th>
                <th>CODE</th>
                <th>CONTACT EMAIL</th>
                <th>WEBHOOK URL</th>
                <th>STATUS</th>
                <th class="text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let m of merchants" class="merchant-row">
                <td>
                  <div class="merchant-cell">
                    <div class="merchant-avatar">{{ m.name.substring(0, 2).toUpperCase() }}</div>
                    <div>
                      <div class="merchant-name">{{ m.name }}</div>
                      <div class="account-num font-mono">Account: {{ m.accountNumber || 'Pending' }}</div>
                    </div>
                  </div>
                </td>
                <td><span class="code-badge">{{ m.merchantCode }}</span></td>
                <td>
                  <div class="contact-email">
                    <svg class="email-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    <span>{{ m.contactEmail || 'N/A' }}</span>
                  </div>
                </td>
                <td class="max-w-url" [title]="m.webhookUrl">
                  <span class="webhook-url font-mono">{{ m.webhookUrl }}</span>
                </td>
                <td>
                  <span
                    [class.active]="m.status === 'ACTIVE'"
                    [class.inactive]="m.status === 'INACTIVE'"
                    [class.suspended]="m.status === 'SUSPENDED'"
                    class="status-pill"
                  >
                    <span class="pill-dot"></span>
                    {{ m.status }}
                  </span>
                </td>
                <td class="text-right">
                  <button class="btn-icon-action" (click)="openEditModal(m)" title="Edit Merchant">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                </td>
              </tr>

              <tr *ngIf="merchants.length === 0">
                <td colspan="6" class="text-center py-8 text-muted">
                  No merchants found. Click "Register Merchant" to onboard a business partner.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Custom Pagination Bar -->
        <div class="pagination-bar">
          <span class="page-info">Showing {{ merchants.length }} of {{ totalElements }} items</span>
          <div class="page-buttons">
            <button class="btn-page" [disabled]="currentPage === 0 || loading" (click)="changePage(currentPage - 1)">Previous</button>
            <button class="btn-page" [disabled]="currentPage >= totalPages - 1 || loading" (click)="changePage(currentPage + 1)">Next</button>
          </div>
        </div>
      </div>

      <!-- Merchant Form Modal -->
      <app-merchant-form
        *ngIf="showModal"
        [merchant]="selectedMerchant"
        (saved)="onModalSaved()"
        (close)="showModal = false"
      ></app-merchant-form>
    </div>
  `,
  styles: [`
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(14px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .fade-in-up { animation: fadeInUp 0.4s ease-out forwards; }

    .console-page { display: flex; flex-direction: column; gap: 20px; color: #0f172a; font-family: 'Inter', system-ui, sans-serif; }
    .flex-between { display: flex; justify-content: space-between; align-items: center; }

    .header-tag { font-size: 0.7rem; font-weight: 800; color: #059669; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .page-header h2 { margin: 0; font-size: 1.65rem; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
    .header-subtitle { margin: 4px 0 0 0; color: #64748b; font-size: 0.875rem; }

    .btn-emerald-primary {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      color: #ffffff;
      border: none;
      border-radius: 10px;
      font-weight: 700;
      font-size: 0.875rem;
      height: 42px;
      padding: 0 20px;
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25);
      transition: all 0.2s;
    }
    .btn-emerald-primary:hover { transform: translateY(-1.5px); box-shadow: 0 6px 16px rgba(5, 150, 105, 0.35); }

    .table-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      box-shadow: 0 4px 20px -5px rgba(0,0,0,0.04);
      overflow: hidden;
    }
    
    .loading-box { display: flex; justify-content: center; padding: 48px; }
    .spinner { width: 32px; height: 32px; border: 3px solid #e2e8f0; border-top-color: #059669; border-radius: 50%; animation: spin 0.7s linear infinite; }

    .custom-table-wrapper { overflow-x: auto; }
    .paygate-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.875rem; }
    .paygate-table th { padding: 14px 18px; font-size: 0.72rem; font-weight: 700; color: #64748b; border-bottom: 1px solid #e2e8f0; background: #f8fafc; letter-spacing: 0.04em; text-transform: uppercase; }
    .paygate-table td { padding: 16px 18px; border-bottom: 1px solid #f1f5f9; color: #1e293b; }
    
    .merchant-row { transition: background-color 0.15s; }
    .merchant-row:hover td { background-color: #f8fafc; }

    .merchant-cell { display: flex; align-items: center; gap: 12px; }
    .merchant-avatar {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
      color: #059669;
      font-weight: 800;
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #a7f3d0;
      flex-shrink: 0;
    }
    
    .merchant-name { font-weight: 700; color: #0f172a; font-size: 0.9rem; }
    .account-num { font-size: 0.75rem; color: #059669; font-weight: 600; margin-top: 2px; }

    .code-badge { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 3px 8px; border-radius: 6px; font-family: monospace; font-size: 0.8rem; color: #334155; font-weight: 700; }
    
    .contact-email { display: flex; align-items: center; gap: 6px; color: #475569; font-weight: 500; font-size: 0.85rem; }
    .email-icon { width: 14px; height: 14px; color: #94a3b8; flex-shrink: 0; }
    
    .webhook-url { color: #64748b; font-size: 0.8rem; }
    .max-w-url { max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    
    .status-pill { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 14px; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; }
    .pill-dot { width: 6px; height: 6px; border-radius: 50%; }

    .status-pill.active { background-color: #dcfce7; color: #15803d; }
    .status-pill.active .pill-dot { background-color: #16a34a; }

    .status-pill.inactive { background-color: #fef3c7; color: #b45309; }
    .status-pill.inactive .pill-dot { background-color: #d97706; }

    .status-pill.suspended { background-color: #fee2e2; color: #b91c1c; }
    .status-pill.suspended .pill-dot { background-color: #dc2626; }

    .btn-icon-action { width: 34px; height: 34px; border: 1px solid #e2e8f0; background: #ffffff; border-radius: 8px; color: #64748b; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: all 0.15s; }
    .btn-icon-action:hover { color: #059669; border-color: #a7f3d0; background: #ecfdf5; }
    .btn-icon-action svg { width: 16px; height: 16px; }

    .pagination-bar { padding: 14px 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
    .page-info { font-size: 0.825rem; color: #64748b; font-weight: 500; }
    .page-buttons { display: flex; gap: 8px; }
    .btn-page { border: 1px solid #e2e8f0; background: #ffffff; border-radius: 8px; padding: 0 14px; height: 34px; font-size: 0.825rem; font-weight: 600; color: #475569; cursor: pointer; transition: all 0.15s; }
    .btn-page:hover:not(:disabled) { border-color: #059669; color: #059669; background: #ecfdf5; }
    .btn-page:disabled { opacity: 0.4; cursor: not-allowed; }

    .font-mono { font-family: monospace; }
    .text-muted { color: #64748b; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .py-8 { padding-top: 32px; padding-bottom: 32px; }
  `]
})
export class MerchantListComponent implements OnInit {
  merchants: Merchant[] = [];
  loading = false;
  showModal = false;
  selectedMerchant: Merchant | null = null;

  currentPage = 0;
  pageSize = 10;
  totalPages = 0;
  totalElements = 0;

  constructor(private merchantService: MerchantService) {}

  ngOnInit(): void {
    this.loadMerchants();
  }

  loadMerchants(): void {
    this.loading = true;
    this.merchantService.getAll(this.currentPage, this.pageSize).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success && res.data) {
          this.merchants = res.data.content;
          this.totalPages = res.data.totalPages;
          this.totalElements = res.data.totalElements;
        }
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  openCreateModal(): void {
    this.selectedMerchant = null;
    this.showModal = true;
  }

  openEditModal(merchant: Merchant): void {
    this.selectedMerchant = merchant;
    this.showModal = true;
  }

  onModalSaved(): void {
    this.showModal = false;
    this.loadMerchants();
  }

  changePage(page: number): void {
    this.currentPage = page;
    this.loadMerchants();
  }
}
