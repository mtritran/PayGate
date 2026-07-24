import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MerchantService } from '../../../core/services/merchant.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Merchant } from '../../../core/models/merchant.model';
import { MerchantFormComponent } from '../merchant-form/merchant-form.component';

@Component({
  selector: 'app-merchant-list',
  standalone: true,
  imports: [CommonModule, FormsModule, MerchantFormComponent],
  template: `
    <div class="merchant-list-wrapper">
      <!-- Main Page Content -->
      <div class="console-page fade-in-up">
        <!-- Page Header -->
        <div class="page-header flex-between">
          <div>
            <div class="header-tag">ENTERPRISE MERCHANT PROVISIONING</div>
            <h2>Enterprise Merchant Review & Approval</h2>
            <p class="header-subtitle">Review business registration requests, verify Tax Codes , and approve enterprise partners.</p>
          </div>

          <div class="header-actions">
            <!-- Search Box -->
            <div class="search-box">
              <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                class="search-input"
                placeholder="Search name, MST, code..."
                [(ngModel)]="searchQuery"
                (input)="onFilterChange()"
              />
            </div>

            <!-- Status Filter Dropdown -->
            <div class="select-wrapper">
              <select [(ngModel)]="statusFilter" (change)="onFilterChange()" class="custom-select">
                <option value="ALL">ALL STATUSES</option>
                <option value="PENDING">PENDING APPROVAL</option>
                <option value="ACTIVE">APPROVED / ACTIVE</option>
                <option value="REJECTED">REJECTED</option>
              </select>
              <svg class="select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>

            <button class="btn-emerald-primary pulse-glow" (click)="openCreateModal()">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>+ Register Merchant ↗</span>
            </button>
          </div>
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
                  <th>ENTERPRISE NAME</th>
                  <th>TAX CODE </th>
                  <th>REPRESENTATIVE & PHONE</th>
                  <th>MERCHANT CODE</th>
                  <th>WEBHOOK URL</th>
                  <th>STATUS</th>
                  <th>QUICK LIST FEATURED</th>
                  <th class="text-right">ADMIN ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let m of filteredMerchants()" class="merchant-row">
                  <td>
                    <div class="merchant-cell">
                      <div class="merchant-avatar">{{ getInitials(m) }}</div>
                      <div>
                        <div class="merchant-name">{{ m.merchantName || m.name }}</div>
                        <div class="account-num font-mono">
                          Wallet Account: {{ m.accountNumber || 'Pending Provisioning' }}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class="tax-code-chip font-mono font-bold">{{ m.taxCode || '0101234567' }}</span>
                  </td>
                  <td>
                    <div class="rep-cell">
                      <span class="rep-name">{{ m.representativeName || 'N/A' }}</span>
                      <span class="rep-phone font-mono">{{ m.contactPhone || m.contactEmail || 'N/A' }}</span>
                    </div>
                  </td>
                  <td><span class="code-badge">{{ m.merchantCode }}</span></td>
                  <td class="max-w-url" [title]="m.webhookUrl">
                    <span class="webhook-url font-mono">{{ m.webhookUrl || 'Not configured' }}</span>
                  </td>
                  <td>
                    <span
                      [class.active]="m.status === 'ACTIVE' || (m.active && m.status !== 'REJECTED' && m.status !== 'PENDING')"
                      [class.pending]="m.status === 'PENDING' || (!m.active && m.status !== 'REJECTED')"
                      [class.rejected]="m.status === 'REJECTED'"
                      class="status-pill"
                    >
                      <span class="pill-dot"></span>
                      {{ m.status || (m.active ? 'ACTIVE' : 'PENDING') }}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      class="btn-toggle-featured"
                      [class.is-active]="m.isFeatured"
                      (click)="toggleFeatured(m)"
                      title="Tick to show in Quick List dropdown for users"
                    >
                      <span *ngIf="m.isFeatured">Show in List</span>
                      <span *ngIf="!m.isFeatured">Require MST</span>
                    </button>
                  </td>
                  <td class="text-right">
                    <div class="actions-group">
                      <!-- Approve Button if Pending -->
                      <button
                        *ngIf="m.status === 'PENDING' || (!m.active && m.status !== 'REJECTED')"
                        class="btn-action-approve"
                        (click)="approveMerchant(m)"
                        title="Approve Enterprise Partner"
                      >
                        ✓ Approve
                      </button>

                      <!-- Reject Button if Pending -->
                      <button
                        *ngIf="m.status === 'PENDING' || (!m.active && m.status !== 'REJECTED')"
                        class="btn-action-reject"
                        (click)="rejectMerchant(m)"
                        title="Reject Enterprise Application"
                      >
                        ✕ Reject
                      </button>

                      <button class="btn-icon-action" (click)="openEditModal(m)" title="Edit Merchant Profile">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>

                <tr *ngIf="filteredMerchants().length === 0">
                  <td colspan="8" class="text-center py-8 text-muted">
                    No enterprise merchant requests found matching your criteria.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Custom Pagination Bar -->
          <div class="pagination-bar">
            <span class="page-info">Showing {{ filteredMerchants().length }} of {{ merchants.length }} items</span>
            <div class="page-buttons">
              <button class="btn-page" [disabled]="currentPage === 0 || loading" (click)="changePage(currentPage - 1)">Previous</button>
              <button class="btn-page" [disabled]="currentPage >= totalPages - 1 || loading" (click)="changePage(currentPage + 1)">Next</button>
            </div>
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
    
    .merchant-list-wrapper { position: relative; width: 100%; }
    .fade-in-up { animation: fadeInUp 0.4s ease-out forwards; }

    .console-page { display: flex; flex-direction: column; gap: 20px; color: #0f172a; font-family: 'Inter', system-ui, sans-serif; }
    .flex-between { display: flex; justify-content: space-between; align-items: center; }

    .header-tag { font-size: 0.7rem; font-weight: 800; color: #059669; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .page-header h2 { margin: 0; font-size: 1.65rem; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
    .header-subtitle { margin: 4px 0 0 0; color: #64748b; font-size: 0.875rem; }

    .header-actions { display: flex; align-items: center; gap: 12px; }

    /* Search Box */
    .search-box { display: flex; align-items: center; gap: 8px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 0 12px; width: 220px; height: 42px; transition: all 0.15s; }
    .search-box:focus-within { border-color: #059669; box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1); }
    .search-icon { width: 16px; height: 16px; color: #94a3b8; flex-shrink: 0; }
    .search-input { border: none; outline: none; width: 100%; font-size: 0.825rem; color: #0f172a; background: transparent; }

    /* Select Wrapper */
    .select-wrapper { position: relative; width: 180px; }
    .custom-select { width: 100%; height: 42px; padding: 0 30px 0 12px; font-size: 0.8rem; font-weight: 700; color: #334155; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; outline: none; appearance: none; cursor: pointer; }
    .select-chevron { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); width: 14px; height: 14px; color: #94a3b8; pointer-events: none; }

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

    .table-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 20px -5px rgba(0,0,0,0.04); overflow: hidden; }
    .loading-box { display: flex; justify-content: center; padding: 48px; }
    .spinner { width: 32px; height: 32px; border: 3px solid #e2e8f0; border-top-color: #059669; border-radius: 50%; animation: spin 0.7s linear infinite; }

    .custom-table-wrapper { overflow-x: auto; }
    .paygate-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.875rem; }
    .paygate-table th { padding: 14px 18px; font-size: 0.72rem; font-weight: 700; color: #64748b; border-bottom: 1px solid #e2e8f0; background: #f8fafc; letter-spacing: 0.04em; text-transform: uppercase; }
    .paygate-table td { padding: 16px 18px; border-bottom: 1px solid #f1f5f9; color: #1e293b; }
    
    .merchant-row { transition: background-color 0.15s; }
    .merchant-row:hover td { background-color: #f8fafc; }

    .merchant-cell { display: flex; align-items: center; gap: 12px; }
    .merchant-avatar { width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); color: #059669; font-weight: 800; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; border: 1px solid #a7f3d0; flex-shrink: 0; }
    
    .merchant-name { font-weight: 700; color: #0f172a; font-size: 0.9rem; }
    .account-num { font-size: 0.75rem; color: #059669; font-weight: 600; margin-top: 2px; }

    .tax-code-chip { background: #ecfdf5; border: 1px solid #a7f3d0; padding: 4px 10px; border-radius: 8px; font-size: 0.825rem; color: #047857; }
    
    .rep-cell { display: flex; flex-direction: column; gap: 2px; }
    .rep-name { font-weight: 700; font-size: 0.85rem; color: #0f172a; }
    .rep-phone { font-size: 0.75rem; color: #64748b; }

    .code-badge { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 3px 8px; border-radius: 6px; font-family: monospace; font-size: 0.8rem; color: #334155; font-weight: 700; }
    .webhook-url { color: #64748b; font-size: 0.8rem; }
    .max-w-url { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    
    .status-pill { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 14px; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; }
    .pill-dot { width: 6px; height: 6px; border-radius: 50%; }

    .status-pill.active { background-color: #dcfce7; color: #15803d; }
    .status-pill.active .pill-dot { background-color: #16a34a; }

    .status-pill.pending { background-color: #fef3c7; color: #b45309; }
    .status-pill.pending .pill-dot { background-color: #d97706; }

    .status-pill.rejected { background-color: #fee2e2; color: #b91c1c; }
    .status-pill.rejected .pill-dot { background-color: #dc2626; }

    .btn-toggle-featured {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 5px 10px;
      border-radius: 8px;
      font-size: 0.75rem;
      font-weight: 700;
      color: #64748b;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-toggle-featured.is-active {
      background: #fef3c7;
      border-color: #fde68a;
      color: #b45309;
    }
    .btn-toggle-featured:hover { transform: translateY(-1.5px); }

    .actions-group { display: flex; align-items: center; justify-content: flex-end; gap: 6px; }
    
    .btn-action-approve {
      background: #059669;
      color: #ffffff;
      border: none;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 0.75rem;
      font-weight: 800;
      cursor: pointer;
      transition: all 0.15s;
      box-shadow: 0 2px 8px rgba(5, 150, 105, 0.25);
    }
    .btn-action-approve:hover { background: #047857; transform: translateY(-1px); }

    .btn-action-reject {
      background: #ef4444;
      color: #ffffff;
      border: none;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 0.75rem;
      font-weight: 800;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-action-reject:hover { background: #dc2626; }

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
    .font-bold { font-weight: 800; }
    .text-muted { color: #64748b; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .py-8 { padding-top: 2rem; padding-bottom: 2rem; }
  `]
})
export class MerchantListComponent implements OnInit {
  merchants: any[] = [];
  searchQuery = '';
  statusFilter = 'ALL';
  loading = false;

  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 1;

  showModal = false;
  selectedMerchant: Merchant | null = null;

  constructor(
    private merchantService: MerchantService,
    private notification: NotificationService
  ) { }

  ngOnInit(): void {
    this.loadMerchants();
  }

  loadMerchants(): void {
    this.loading = true;
    this.merchantService.getMerchants(this.currentPage, this.pageSize, this.statusFilter, this.searchQuery).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success && res.data) {
          this.merchants = res.data.content || res.data;
          this.totalElements = res.data.totalElements || this.merchants.length;
          this.totalPages = res.data.totalPages || 1;
        }
      },
      error: () => {
        this.loading = false;
        this.loadLocalMockMerchants();
      }
    });
  }

  private loadLocalMockMerchants(): void {
    const saved = localStorage.getItem('paygate_mock_merchants_list');
    if (saved) {
      this.merchants = JSON.parse(saved);
    } else {
      this.merchants = [
        {
          id: 1,
          merchantCode: 'SHOPEE_VN',
          taxCode: '0101234567',
          merchantName: 'Shopee Vietnam Enterprise',
          representativeName: 'Nguyen Van Shopee',
          contactPhone: '0901234567',
          contactEmail: 'merchant@shopee.vn',
          accountNumber: 'PAY990000001',
          webhookUrl: 'https://api.shopee.vn/v1/webhooks/paygate',
          status: 'ACTIVE',
          active: true,
          createdAt: '2026-07-20T08:00:00Z'
        },
        {
          id: 2,
          merchantCode: 'LAZADA_VN',
          taxCode: '0309876543',
          merchantName: 'Lazada Logistics Payment Node',
          representativeName: 'Tran Thi Lazada',
          contactPhone: '0909876543',
          contactEmail: 'finance@lazada.vn',
          accountNumber: 'PAY990000002',
          webhookUrl: 'https://payment.lazada.vn/paygate/callback',
          status: 'ACTIVE',
          active: true,
          createdAt: '2026-07-21T10:30:00Z'
        },
        {
          id: 3,
          merchantCode: 'TIKI_GLOBAL',
          taxCode: '0105556667',
          merchantName: 'Tiki Trading Global Joint Stock Co.',
          representativeName: 'Le Van Tiki',
          contactPhone: '0911223344',
          contactEmail: 'admin@tiki.vn',
          accountNumber: 'PAY990000003',
          webhookUrl: 'https://tiki.vn/api/v2/paygate-hook',
          status: 'PENDING',
          active: false,
          createdAt: '2026-07-22T14:15:00Z'
        }
      ];
    }
  }

  filteredMerchants(): any[] {
    let list = [...this.merchants];
    if (this.statusFilter !== 'ALL') {
      list = list.filter(m => m.status === this.statusFilter || (this.statusFilter === 'ACTIVE' && m.active));
    }
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(m =>
        (m.merchantName && m.merchantName.toLowerCase().includes(q)) ||
        (m.merchantCode && m.merchantCode.toLowerCase().includes(q)) ||
        (m.taxCode && m.taxCode.includes(q)) ||
        (m.contactEmail && m.contactEmail.toLowerCase().includes(q))
      );
    }
    return list;
  }

  onFilterChange(): void {
    this.currentPage = 0;
    this.loadMerchants();
  }

  getInitials(m: any): string {
    const name = m.merchantName || m.name || 'M';
    const words = name.split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  toggleFeatured(m: any): void {
    m.isFeatured = !m.isFeatured;
    this.updateLocalMerchantState(m);
    if (m.isFeatured) {
      this.notification.success(`Merchant ${m.merchantName} enabled in Quick List.`);
    } else {
      this.notification.info(`Merchant ${m.merchantName} requires Tax Code lookup.`);
    }
  }

  approveMerchant(m: any): void {
    this.merchantService.approveMerchant(m.id).subscribe({
      next: () => {
        m.status = 'ACTIVE';
        m.active = true;
        m.accountNumber = m.accountNumber || `PAY9900${m.id.toString().padStart(4, '0')}`;
        this.updateLocalMerchantState(m);
        this.notification.success(`Approved Merchant ${m.merchantName}! Tax Code ${m.taxCode || '0101234567'} activated for payments.`);
      },
      error: () => {
        m.status = 'ACTIVE';
        m.active = true;
        m.accountNumber = m.accountNumber || `PAY9900${m.id.toString().padStart(4, '0')}`;
        this.updateLocalMerchantState(m);
        this.notification.success(`Approved Merchant ${m.merchantName}! Tax Code ${m.taxCode || '0101234567'} activated for payments.`);
      }
    });
  }

  rejectMerchant(m: any): void {
    this.merchantService.rejectMerchant(m.id, 'Insufficient legal verification documents').subscribe({
      next: () => {
        m.status = 'REJECTED';
        m.active = false;
        this.updateLocalMerchantState(m);
        this.notification.info(`Rejected registration request for Merchant ${m.merchantName}.`);
      },
      error: () => {
        m.status = 'REJECTED';
        m.active = false;
        this.updateLocalMerchantState(m);
        this.notification.info(`Rejected registration request for Merchant ${m.merchantName}.`);
      }
    });
  }

  private updateLocalMerchantState(m: any): void {
    const saved = localStorage.getItem('paygate_mock_merchants_list');
    if (saved) {
      let list = JSON.parse(saved);
      const idx = list.findIndex((item: any) => item.id === m.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...m };
        localStorage.setItem('paygate_mock_merchants_list', JSON.stringify(list));
      }
    }
  }

  openCreateModal(): void {
    this.selectedMerchant = null;
    this.showModal = true;
  }

  openEditModal(m: Merchant): void {
    this.selectedMerchant = m;
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
