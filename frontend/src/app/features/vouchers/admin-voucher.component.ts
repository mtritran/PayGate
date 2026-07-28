import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VoucherService, VoucherResponse, VoucherCreateRequest } from '../../core/services/voucher.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-admin-voucher',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-voucher-page">

      <!-- Header Section -->
      <div class="page-header">
        <div class="header-content">
          <div class="header-text">
            <h1 class="header-title">Voucher Warehouse</h1>
            <p class="header-subtitle">Manage all promotional vouchers across the system</p>
          </div>
          <button class="btn btn-primary" (click)="openCreateModal()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create Voucher
          </button>
        </div>

        <!-- Stats Summary -->
        <div class="stats-row" *ngIf="vouchers.length">
          <div class="stat-card">
            <span class="stat-value">{{ vouchers.length }}</span>
            <span class="stat-label">Total</span>
          </div>
          <div class="stat-card">
            <span class="stat-value text-brand">{{ getActiveCount() }}</span>
            <span class="stat-label">In Stock</span>
          </div>
          <div class="stat-card">
            <span class="stat-value text-error">{{ getExpiredCount() }}</span>
            <span class="stat-label">Expired</span>
          </div>
        </div>
      </div>

      <!-- Loading Skeleton -->
      <div class="card" *ngIf="loading">
        <div class="card-body" style="padding: 0;">
          <div class="skeleton-row" *ngFor="let _ of [1,2,3,4,5]">
            <div class="skeleton skeleton-text" style="width: 8%"></div>
            <div class="skeleton skeleton-text" style="width: 12%"></div>
            <div class="skeleton skeleton-text" style="width: 20%"></div>
            <div class="skeleton skeleton-text" style="width: 10%"></div>
            <div class="skeleton skeleton-text" style="width: 8%"></div>
          </div>
        </div>
      </div>

      <!-- Voucher Table -->
      <div class="card" *ngIf="!loading">
        <div class="card-table">
          <table class="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Voucher Name</th>
                <th>Discount</th>
                <th>Points</th>
                <th>Min Order</th>
                <th>Stock</th>
                <th>Expires</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let v of vouchers">
                <td>
                  <span class="badge badge-primary badge-lg">{{ v.code }}</span>
                </td>
                <td>
                  <span class="voucher-title">{{ v.title }}</span>
                  <span class="voucher-type">{{ v.applicableType }}</span>
                </td>
                <td>
                  <span class="discount-amount">{{ v.discountAmount | currency:'VND':'symbol':'1.0-0' }}</span>
                </td>
                <td>
                  <span class="points-badge">{{ v.pointsRequired | number }} pts</span>
                </td>
                <td class="text-tertiary">{{ v.minOrderAmount | currency:'VND':'symbol':'1.0-0' }}</td>
                <td>
                  <span class="stock-badge" [class.stock-low]="v.remainingQty <= 0 || v.remainingQty < v.totalQuantity * 0.2">
                    <span class="stock-dot" [class.dot-danger]="v.remainingQty <= 0" [class.dot-warning]="v.remainingQty > 0 && v.remainingQty < v.totalQuantity * 0.2" [class.dot-success]="v.remainingQty >= v.totalQuantity * 0.2"></span>
                    {{ v.remainingQty }}/{{ v.totalQuantity }}
                  </span>
                </td>
                <td class="text-tertiary text-sm">{{ v.expiresAt | date:'dd/MM/yyyy' }}</td>
                <td class="text-right">
                  <div class="action-btns">
                    <button class="btn btn-ghost btn-icon btn-icon-sm" (click)="editVoucher(v)" title="Edit">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button class="btn btn-ghost btn-icon btn-icon-sm btn-icon-danger" (click)="deleteVoucher(v.id)" title="Delete">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="vouchers.length === 0">
                <td colspan="8">
                  <div class="empty-state">
                    <div class="empty-state-icon">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M20 12v8H4v-8M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
                      </svg>
                    </div>
                    <h4 class="empty-state-title">No vouchers yet</h4>
                    <p class="empty-state-message">Click "Create Voucher" to add the first promotional voucher to the system.</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Create / Edit Modal -->
      <div class="modal-overlay" *ngIf="showModal" (click)="closeModal()"></div>
      <div class="modal" *ngIf="showModal">
        <div class="modal-header">
          <h3 class="modal-title">{{ editingId ? 'Edit Voucher' : 'Create New Voucher' }}</h3>
          <button type="button" class="modal-close" (click)="closeModal()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <form (ngSubmit)="saveVoucher()" class="voucher-form">
            <div class="form-row">
              <div class="form-field">
                <label class="form-label form-label-required">Voucher Code</label>
                <input type="text" class="input" [(ngModel)]="form.code" name="code" placeholder="e.g. SALE50K" required [disabled]="!!editingId">
              </div>
              <div class="form-field">
                <label class="form-label form-label-required">Voucher Title</label>
                <input type="text" class="input" [(ngModel)]="form.title" name="title" placeholder="e.g. 50K off Electricity Bill" required>
              </div>
            </div>

            <div class="form-row">
              <div class="form-field">
                <label class="form-label form-label-required">Discount Amount</label>
                <div class="input-wrapper">
                  <input type="number" class="input" [(ngModel)]="form.discountAmount" name="discountAmount" required>
                  <span class="input-suffix">VND</span>
                </div>
              </div>
              <div class="form-field">
                <label class="form-label form-label-required">Points Required</label>
                <div class="input-wrapper">
                  <input type="number" class="input" [(ngModel)]="form.pointsRequired" name="pointsRequired" required>
                  <span class="input-suffix">pts</span>
                </div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-field">
                <label class="form-label form-label-required">Min Order Amount</label>
                <div class="input-wrapper">
                  <input type="number" class="input" [(ngModel)]="form.minOrderAmount" name="minOrderAmount" required>
                  <span class="input-suffix">VND</span>
                </div>
              </div>
              <div class="form-field">
                <label class="form-label form-label-required">Total Quantity</label>
                <input type="number" class="input" [(ngModel)]="form.totalQuantity" name="totalQuantity" required>
              </div>
            </div>

            <div class="form-row">
              <div class="form-field">
                <label class="form-label form-label-required">Applicable Type</label>
                <div class="select-wrapper">
                  <select class="select" [(ngModel)]="form.applicableType" name="applicableType">
                    <option value="ALL">All Transactions</option>
                    <option value="BILL_PAYMENT">Bill Payment</option>
                    <option value="ELECTRICITY">Electricity</option>
                    <option value="WATER">Water</option>
                    <option value="INTERNET">Internet</option>
                  </select>
                </div>
              </div>
              <div class="form-field">
                <label class="form-label form-label-required">Expiry Date</label>
                <input type="datetime-local" class="input" [(ngModel)]="expiresAtLocal" name="expiresAtLocal" required>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="closeModal()">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="saving">
                <span *ngIf="saving" class="spinner"></span>
                {{ saving ? 'Saving...' : (editingId ? 'Update' : 'Create') }}
              </button>
            </div>
          </form>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .admin-voucher-page {
      max-width: 1280px;
    }

    /* ── Page Header ── */
    .page-header {
      margin-bottom: var(--space-8);
    }

    .header-content {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-4);
      margin-bottom: var(--space-6);
    }

    .header-title {
      font-size: 1.625rem;
      font-weight: var(--font-weight-bold);
      color: var(--color-text-primary);
      margin: 0 0 var(--space-1);
      letter-spacing: -0.02em;
    }

    .header-subtitle {
      font-size: var(--font-size-sm);
      color: var(--color-text-tertiary);
      margin: 0;
    }

    /* ── Stats Row ── */
    .stats-row {
      display: flex;
      gap: var(--space-3);
    }

    .stat-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: var(--space-4) var(--space-6);
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border-primary);
      border-radius: var(--radius-lg);
      min-width: 120px;
    }

    .stat-value {
      font-size: var(--font-size-2xl);
      font-weight: var(--font-weight-bold);
      color: var(--color-text-primary);
      line-height: 1;
    }

    .stat-label {
      font-size: var(--font-size-xs);
      color: var(--color-text-tertiary);
      margin-top: var(--space-1);
      font-weight: var(--font-weight-medium);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .text-brand { color: var(--color-text-brand); }
    .text-error { color: var(--color-text-error); }
    .text-tertiary { color: var(--color-text-tertiary); }
    .text-sm { font-size: var(--font-size-sm); }
    .text-right { text-align: right; }

    /* ── Loading Skeleton ── */
    .skeleton-row {
      display: flex;
      gap: var(--space-4);
      padding: var(--space-4) var(--space-6);
      border-bottom: 1px solid var(--color-border-primary);
    }

    .skeleton-row:last-child {
      border-bottom: none;
    }

    .skeleton {
      background: linear-gradient(
        90deg,
        var(--color-bg-tertiary) 25%,
        var(--color-bg-hover, #e8ecf1) 50%,
        var(--color-bg-tertiary) 75%
      );
      background-size: 200% 100%;
      border-radius: var(--radius-sm);
      animation: shimmer 1.5s infinite;
      height: 14px;
    }

    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    /* ── Table ── */
    .card-table {
      overflow-x: auto;
    }

    .table {
      width: 100%;
      border-collapse: collapse;
    }

    .table thead th {
      padding: var(--space-3) var(--space-4);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: var(--color-bg-tertiary);
      border-bottom: 1px solid var(--color-border-primary);
      white-space: nowrap;
    }

    .table tbody td {
      padding: var(--space-3) var(--space-4);
      border-bottom: 1px solid var(--color-border-primary);
      color: var(--color-text-primary);
      font-size: var(--font-size-sm);
      vertical-align: middle;
    }

    .table tbody tr {
      transition: background-color var(--transition-fast);
    }

    .table tbody tr:hover {
      background-color: var(--color-bg-hover);
    }

    .table tbody tr:last-child td {
      border-bottom: none;
    }

    /* ── Badge Styles ── */
    .badge-lg {
      font-size: var(--font-size-sm);
      padding: var(--space-1) var(--space-3);
      font-weight: var(--font-weight-semibold);
    }

    .voucher-title {
      display: block;
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-primary);
      margin-bottom: 2px;
    }

    .voucher-type {
      font-size: var(--font-size-xs);
      color: var(--color-text-tertiary);
    }

    .discount-amount {
      font-weight: var(--font-weight-bold);
      color: var(--color-text-error);
      font-size: var(--font-size-base);
    }

    .points-badge {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      padding: var(--space-1) var(--space-2);
      background: var(--color-bg-info-light, #eff6ff);
      color: var(--color-info-600, #2563eb);
      border-radius: var(--radius-md);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-semibold);
    }

    .stock-badge {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      padding: var(--space-1) var(--space-2);
      background: var(--color-bg-success-light, #ecfdf5);
      border-radius: var(--radius-full);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-success);
    }

    .stock-low {
      background: var(--color-bg-error-light, #fef2f2);
      color: var(--color-text-error);
    }

    .stock-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      display: inline-block;
    }

    .dot-success { background: var(--color-success-500); }
    .dot-warning { background: var(--color-warning-500, #f59e0b); }
    .dot-danger { background: var(--color-error-500); }

    /* ── Action Buttons ── */
    .action-btns {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-1);
    }

    .btn-icon {
      width: 32px;
      height: 32px;
      padding: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-md);
      border: none;
      background: transparent;
      cursor: pointer;
      color: var(--color-text-tertiary);
      transition: all var(--transition-fast);
    }

    .btn-icon:hover {
      background: var(--color-bg-hover);
      color: var(--color-text-primary);
    }

    .btn-icon-danger:hover {
      background: var(--color-bg-error-light);
      color: var(--color-error-500);
    }

    /* ── Form ── */
    .voucher-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-4);
    }

    @media (max-width: 640px) {
      .form-row {
        grid-template-columns: 1fr;
      }
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }

    .form-label {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-primary);
    }

    .form-label-required::after {
      content: ' *';
      color: var(--color-error-500);
    }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input {
      width: 100%;
      height: var(--input-height);
      padding: 0 var(--space-4);
      font-family: var(--font-family-sans);
      font-size: var(--font-size-sm);
      color: var(--color-text-primary);
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border-primary);
      border-radius: var(--radius-lg);
      transition: all var(--transition-fast);
      outline: none;
    }

    .input:focus {
      border-color: var(--color-border-focus);
      box-shadow: 0 0 0 3px var(--color-primary-100);
    }

    .input::placeholder {
      color: var(--color-text-tertiary);
    }

    .input:disabled {
      background: var(--color-bg-tertiary);
      color: var(--color-text-tertiary);
      cursor: not-allowed;
    }

    .input-suffix {
      position: absolute;
      right: var(--space-3);
      color: var(--color-text-tertiary);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-medium);
      pointer-events: none;
    }

    .select-wrapper {
      position: relative;
    }

    .select {
      appearance: none;
      width: 100%;
      height: var(--input-height);
      padding: 0 var(--space-10) 0 var(--space-4);
      font-family: var(--font-family-sans);
      font-size: var(--font-size-sm);
      color: var(--color-text-primary);
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border-primary);
      border-radius: var(--radius-lg);
      cursor: pointer;
      transition: all var(--transition-fast);
      outline: none;
    }

    .select:focus {
      border-color: var(--color-border-focus);
      box-shadow: 0 0 0 3px var(--color-primary-100);
    }

    .select-wrapper::after {
      content: '';
      position: absolute;
      right: var(--space-3);
      top: 50%;
      transform: translateY(-50%);
      width: 0;
      height: 0;
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-top: 6px solid var(--color-text-tertiary);
      pointer-events: none;
    }

    /* ── Modal ── */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.5);
      backdrop-filter: blur(2px);
      z-index: var(--z-modal-backdrop);
      animation: fade-in 120ms ease-out;
    }

    .modal {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 100%;
      max-width: 600px;
      max-height: 90vh;
      overflow: hidden;
      background: var(--color-bg-secondary);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-xl);
      z-index: var(--z-modal);
      animation: slide-up 200ms ease-out;
      display: flex;
      flex-direction: column;
    }

    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slide-up {
      from { opacity: 0; transform: translate(-50%, -50%) translateY(16px); }
      to { opacity: 1; transform: translate(-50%, -50%) translateY(0); }
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-5) var(--space-6);
      border-bottom: 1px solid var(--color-border-primary);
    }

    .modal-title {
      font-size: var(--font-size-xl);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-primary);
      margin: 0;
    }

    .modal-close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      color: var(--color-text-tertiary);
      background: none;
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .modal-close:hover {
      background: var(--color-bg-hover);
      color: var(--color-text-primary);
    }

    .modal-body {
      padding: var(--space-6);
      overflow-y: auto;
      flex: 1;
    }

    .modal-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: var(--space-3);
      padding-top: var(--space-4);
      border-top: 1px solid var(--color-border-primary);
      margin-top: var(--space-2);
    }

    /* ── Buttons ── */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      font-family: var(--font-family-sans);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-semibold);
      line-height: 1;
      border: none;
      border-radius: var(--radius-lg);
      cursor: pointer;
      transition: all var(--transition-fast);
      white-space: nowrap;
      user-select: none;
      text-decoration: none;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }

    .btn-primary {
      height: var(--button-height);
      padding: 0 var(--space-5);
      background: var(--color-bg-brand);
      color: var(--color-text-inverse);
      box-shadow: var(--shadow-brand);
    }

    .btn-primary:hover:not(:disabled) {
      background: var(--color-bg-brand-hover);
      box-shadow: var(--shadow-lg);
      transform: translateY(-1px);
    }

    .btn-secondary {
      height: var(--button-height);
      padding: 0 var(--space-5);
      background: var(--color-bg-tertiary);
      color: var(--color-text-primary);
      border: 1px solid var(--color-border-primary);
    }

    .btn-secondary:hover:not(:disabled) {
      background: var(--color-bg-hover);
      border-color: var(--color-border-secondary);
    }

    .btn-ghost {
      background: transparent;
      color: var(--color-text-secondary);
      border: none;
    }

    .btn-ghost:hover {
      background: var(--color-bg-hover);
      color: var(--color-text-primary);
    }

    .btn-icon-sm {
      width: 32px;
      height: 32px;
      padding: 0;
    }

    .spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* ── Empty State ── */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: var(--space-12) var(--space-4);
      text-align: center;
    }

    .empty-state-icon {
      width: 64px;
      height: 64px;
      border-radius: var(--radius-full);
      background: var(--color-bg-tertiary);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: var(--space-4);
      color: var(--color-text-tertiary);
    }

    .empty-state-title {
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-primary);
      margin: 0 0 var(--space-2);
    }

    .empty-state-message {
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
      max-width: 320px;
      margin: 0;
    }

    /* Global fallbacks for light theme */
    :host {
      --color-bg-hover: var(--color-neutral-100);
      --color-bg-info-light: #eff6ff;
      --color-bg-success-light: #ecfdf5;
      --color-bg-error-light: #fef2f2;
    }
  `]
})
export class AdminVoucherComponent implements OnInit {
  private notification = inject(NotificationService);

  vouchers: VoucherResponse[] = [];
  loading = false;
  saving = false;
  showModal = false;
  editingId: number | null = null;

  form: VoucherCreateRequest = {
    code: '',
    title: '',
    discountAmount: 50000,
    pointsRequired: 200,
    minOrderAmount: 200000,
    applicableType: 'ALL',
    totalQuantity: 100,
    expiresAt: '2026-12-31T23:59:59'
  };

  // Local datetime-local string (YYYY-MM-DDTHH:mm)
  expiresAtLocal: string = '';

  constructor(private voucherService: VoucherService) {}

  ngOnInit(): void {
    this.loadVouchers();
  }

  getActiveCount(): number {
    return this.vouchers.filter(v => v.remainingQty > 0 && new Date(v.expiresAt) > new Date()).length;
  }

  getExpiredCount(): number {
    return this.vouchers.filter(v => new Date(v.expiresAt) <= new Date()).length;
  }

  loadVouchers(): void {
    this.loading = true;
    this.voucherService.getAllVouchersForAdmin(0, 100).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res.success && res.data) {
          this.vouchers = res.data.content || [];
        }
      },
      error: (err: any) => {
        this.loading = false;
        this.notification.error('Failed to load voucher list');
        console.error('Failed to load admin vouchers:', err);
      }
    });
  }

  openCreateModal(): void {
    this.editingId = null;
    this.resetForm();
    this.showModal = true;
  }

  editVoucher(v: VoucherResponse): void {
    this.editingId = v.id;
    this.form = {
      code: v.code,
      title: v.title,
      discountAmount: v.discountAmount,
      pointsRequired: v.pointsRequired,
      minOrderAmount: v.minOrderAmount,
      applicableType: v.applicableType,
      totalQuantity: v.totalQuantity,
      expiresAt: v.expiresAt
    };
    // Convert ISO to datetime-local format
    try {
      const d = new Date(v.expiresAt);
      this.expiresAtLocal = d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0') + 'T' +
        String(d.getHours()).padStart(2, '0') + ':' +
        String(d.getMinutes()).padStart(2, '0');
    } catch {
      this.expiresAtLocal = '';
    }
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  private resetForm(): void {
    this.form = {
      code: '',
      title: '',
      discountAmount: 50000,
      pointsRequired: 200,
      minOrderAmount: 200000,
      applicableType: 'ALL',
      totalQuantity: 100,
      expiresAt: '2026-12-31T23:59:59'
    };
    this.expiresAtLocal = '2026-12-31T23:59';
  }

  saveVoucher(): void {
    if (!this.form.code || !this.form.title) {
      this.notification.warning('Please enter a voucher code and title');
      return;
    }

    // Sync expiresAt from local datetime-local value
    if (this.expiresAtLocal) {
      this.form.expiresAt = this.expiresAtLocal + ':00';
    }

    this.saving = true;

    if (this.editingId) {
      this.voucherService.updateVoucher(this.editingId, this.form).subscribe({
        next: (res: any) => {
          this.saving = false;
          if (res.success) {
            this.notification.success('Voucher updated successfully!');
            this.closeModal();
            this.loadVouchers();
          }
        },
        error: (err: any) => {
          this.saving = false;
          this.notification.error(err.error?.message || 'Update failed');
        }
      });
    } else {
      this.voucherService.createVoucher(this.form).subscribe({
        next: (res: any) => {
          this.saving = false;
          if (res.success) {
            this.notification.success('Voucher created successfully!');
            this.closeModal();
            this.loadVouchers();
          }
        },
        error: (err: any) => {
          this.saving = false;
          this.notification.error(err.error?.message || 'Create failed');
        }
      });
    }
  }

  deleteVoucher(id: number): void {
    if (!confirm('Are you sure you want to delete this voucher?')) return;
    this.voucherService.deleteVoucher(id).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.notification.success('Voucher deleted successfully!');
          this.loadVouchers();
        }
      },
      error: (err: any) => {
        this.notification.error(err.error?.message || 'Delete failed');
      }
    });
  }
}
