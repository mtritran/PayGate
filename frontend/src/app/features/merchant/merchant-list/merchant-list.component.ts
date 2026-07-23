import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MerchantService } from '../../../core/services/merchant.service';
import { Merchant } from '../../../core/models/merchant.model';
import { MerchantFormComponent } from '../merchant-form/merchant-form.component';

@Component({
  selector: 'app-merchant-list',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MerchantFormComponent],
  template: `
    <div class="console-page">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-title-group">
          <h2>Merchant Management</h2>
          <p class="header-subtitle">Manage registered business partners, webhooks, and automatic wallet provisions.</p>
        </div>
        <button mat-raised-button class="btn-primary" (click)="openCreateModal()">
          <mat-icon class="btn-icon">add</mat-icon> Register Merchant
        </button>
      </div>

      <!-- Main Content Card / Table -->
      <div class="table-card">
        <div *ngIf="loading" class="loading-box">
          <mat-spinner diameter="40"></mat-spinner>
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
              <tr *ngFor="let m of merchants">
                <td>
                  <div class="merchant-cell">
                    <div class="merchant-avatar">{{ m.name.substring(0, 2).toUpperCase() }}</div>
                    <div>
                      <div class="font-bold">{{ m.name }}</div>
                      <div class="text-muted text-xs">Account: {{ m.accountNumber || 'Pending' }}</div>
                    </div>
                  </div>
                </td>
                <td><span class="code-badge">{{ m.merchantCode }}</span></td>
                <td>{{ m.contactEmail }}</td>
                <td class="max-w-url" [title]="m.webhookUrl"><span class="font-mono text-muted">{{ m.webhookUrl }}</span></td>
                <td>
                  <span
                    [class.active]="m.status === 'ACTIVE'"
                    [class.inactive]="m.status === 'INACTIVE'"
                    [class.suspended]="m.status === 'SUSPENDED'"
                    class="status-pill"
                  >
                    {{ m.status }}
                  </span>
                </td>
                <td class="text-right">
                  <button mat-icon-button class="btn-icon-action" (click)="openEditModal(m)" title="Edit Merchant">
                    <mat-icon class="icon-edit">edit</mat-icon>
                  </button>
                </td>
              </tr>

              <tr *ngIf="merchants.length === 0">
                <td colspan="6" class="text-center py-6 text-muted">
                  No merchants found. Click "Register Merchant" to create one.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination Bar -->
        <div class="pagination-bar">
          <span class="page-info">Showing page {{ currentPage + 1 }} of {{ totalPages || 1 }} ({{ totalElements }} items)</span>
          <div class="page-buttons">
            <button mat-button class="btn-page" [disabled]="currentPage === 0 || loading" (click)="changePage(currentPage - 1)">Previous</button>
            <button mat-button class="btn-page" [disabled]="currentPage >= totalPages - 1 || loading" (click)="changePage(currentPage + 1)">Next</button>
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
    .console-page { display: flex; flex-direction: column; gap: 20px; padding: 4px; }
    
    .page-header {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .header-title-group h2 { margin: 0; font-size: 1.4rem; font-weight: 800; color: #0f172a; }
    .header-subtitle { margin: 4px 0 0 0; color: #64748b; font-size: 0.85rem; }

    .btn-primary {
      background-color: #059669;
      color: #ffffff;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.85rem;
      height: 38px;
      padding: 0 16px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .btn-primary:hover { background-color: #047857; }
    .btn-icon { font-size: 18px; width: 18px; height: 18px; }

    .table-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
      overflow: hidden;
    }
    .loading-box { display: flex; justify-content: center; padding: 40px; }

    .custom-table-wrapper { overflow-x: auto; }
    .paygate-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.875rem; }
    .paygate-table th { padding: 14px 18px; font-size: 0.72rem; font-weight: 700; color: #64748b; border-bottom: 1px solid #e2e8f0; background: #f8fafc; letter-spacing: 0.04em; }
    .paygate-table td { padding: 16px 18px; border-bottom: 1px solid #f1f5f9; color: #1e293b; }
    
    .merchant-cell { display: flex; align-items: center; gap: 12px; }
    .merchant-avatar {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: #e0e7ff;
      color: #4338ca;
      font-weight: 800;
      font-size: 0.8rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .code-badge { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 2px 8px; border-radius: 6px; font-family: monospace; font-size: 0.8rem; color: #334155; font-weight: 700; }
    .max-w-url { max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    
    .status-pill { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; }
    .status-pill.active { background-color: #dcfce7; color: #15803d; }
    .status-pill.inactive { background-color: #fef3c7; color: #b45309; }
    .status-pill.suspended { background-color: #fee2e2; color: #b91c1c; }

    .btn-icon-action { color: #64748b; }
    .btn-icon-action:hover { color: #4338ca; background: #eef2ff; }
    .icon-edit { font-size: 18px; width: 18px; height: 18px; }

    .pagination-bar { padding: 14px 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
    .page-info { font-size: 0.8rem; color: #64748b; }
    .page-buttons { display: flex; gap: 8px; }
    .btn-page { border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.8rem; height: 32px; color: #334155; }
    
    .font-bold { font-weight: 700; color: #0f172a; }
    .text-muted { color: #64748b; }
    .text-xs { font-size: 0.75rem; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .py-6 { padding-top: 24px; padding-bottom: 24px; }
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
