import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TransactionService } from '../../../core/services/transaction.service';
import { AccountService } from '../../../core/services/account.service';

@Component({
  selector: 'app-payment-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    CurrencyPipe,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  template: `
    <div class="paygate-form-page">
      <div class="form-header-group">
        <h2>Send Payment</h2>
        <p class="subtitle">Execute secure payment with double-entry ledger & idempotency protection.</p>
      </div>

      <div class="content-card form-card">
        <div class="balance-strip">
          <span>Available Wallet Balance:</span>
          <strong>{{ myBalance | currency:'VND':'symbol':'1.0-0' }}</strong>
        </div>

        <form [formGroup]="paymentForm" (ngSubmit)="openConfirmation()" class="custom-form">
          <!-- Destination Account ID -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Destination Account ID (destAccountId)</mat-label>
            <input matInput type="number" formControlName="destAccountId" placeholder="e.g. 2">
            <mat-error *ngIf="paymentForm.get('destAccountId')?.hasError('required')">
              Destination account ID is required
            </mat-error>
          </mat-form-field>

          <!-- Amount Field -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Amount (VND)</mat-label>
            <input matInput type="number" formControlName="amount" placeholder="e.g. 100000" min="1000">
            <mat-error *ngIf="paymentForm.get('amount')?.hasError('required')">
              Amount is required
            </mat-error>
            <mat-error *ngIf="paymentForm.get('amount')?.hasError('min')">
              Minimum amount is 1,000 VND
            </mat-error>
          </mat-form-field>

          <!-- Merchant ID (Optional) -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Merchant ID (Optional)</mat-label>
            <input matInput type="number" formControlName="merchantId" placeholder="e.g. 1">
          </mat-form-field>

          <!-- Description Field -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Payment Description</mat-label>
            <input matInput formControlName="description" placeholder="Payment for PayGate service">
          </mat-form-field>

          <!-- Idempotency Key Field -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Idempotency Key (Auto-generated UUID)</mat-label>
            <input matInput formControlName="idempotencyKey" readonly>
            <button mat-icon-button matSuffix type="button" (click)="generateIdempotencyKey()" title="Regenerate Key">
              <mat-icon>refresh</mat-icon>
            </button>
          </mat-form-field>

          <div class="form-actions">
            <button mat-raised-button class="btn-emerald-primary" type="submit" [disabled]="paymentForm.invalid || submitting">
              Review Payment ↗
            </button>
            <a mat-button class="btn-cancel" routerLink="/accounts/dashboard">Cancel</a>
          </div>
        </form>

        <!-- Confirmation Overlay Dialog -->
        <div *ngIf="showConfirmModal" class="confirm-modal-overlay">
          <div class="confirm-modal-box">
            <h3><mat-icon class="emerald-icon">help_outline</mat-icon> Confirm Payment Transaction</h3>
            <p class="modal-desc">Please review transaction details before processing:</p>

            <div class="confirm-details">
              <div class="detail-row"><span>Destination Account:</span> <strong>#{{ paymentForm.value.destAccountId }}</strong></div>
              <div class="detail-row"><span>Amount:</span> <strong>{{ paymentForm.value.amount | currency:'VND':'symbol':'1.0-0' }}</strong></div>
              <div class="detail-row"><span>Description:</span> <strong>{{ paymentForm.value.description || 'PayGate Payment' }}</strong></div>
              <div class="detail-row key"><span class="key-text">Idempotency Key: {{ paymentForm.value.idempotencyKey }}</span></div>
            </div>

            <div class="modal-actions">
              <button mat-raised-button class="btn-emerald-primary" (click)="executePayment()" [disabled]="submitting">
                <mat-spinner diameter="20" *ngIf="submitting"></mat-spinner>
                <span *ngIf="!submitting">Confirm & Pay</span>
              </button>
              <button mat-button class="btn-cancel" (click)="closeConfirmation()" [disabled]="submitting">Edit</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .paygate-form-page { display: flex; flex-direction: column; gap: 20px; max-width: 640px; margin: 0 auto; width: 100%; color: #0f172a; }
    .form-header-group h2 { font-size: 1.5rem; font-weight: 700; margin: 0 0 4px 0; }
    .subtitle { font-size: 0.875rem; color: #64748b; margin: 0; }
    
    .content-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; box-shadow: 0 1px 2px rgba(0,0,0,0.03); }
    .balance-strip { background-color: #ecfdf5; color: #047857; padding: 12px 16px; border-radius: 8px; font-size: 0.875rem; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border: 1px solid #a7f3d0; }
    
    .custom-form { display: flex; flex-direction: column; gap: 12px; }
    .full-width { width: 100%; }
    
    .form-actions { display: flex; align-items: center; gap: 12px; margin-top: 12px; }
    .btn-emerald-primary { background-color: #059669 !important; color: #ffffff !important; border-radius: 8px; font-weight: 600; font-size: 0.875rem; height: 42px; padding: 0 20px; }
    .btn-cancel { color: #64748b; font-weight: 600; font-size: 0.875rem; }

    .confirm-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.6); display: flex; justify-content: center; align-items: center; z-index: 1000; }
    .confirm-modal-box { background: white; padding: 28px; border-radius: 12px; max-width: 460px; width: 90%; box-shadow: 0 10px 25px rgba(0,0,0,0.15); }
    .emerald-icon { color: #059669; vertical-align: middle; }
    .modal-desc { font-size: 0.875rem; color: #64748b; margin-top: 4px; }
    .confirm-details { background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 20px 0; font-size: 0.9rem; display: flex; flex-direction: column; gap: 8px; }
    .detail-row { display: flex; justify-content: space-between; }
    .key-text { font-size: 0.78rem; font-family: monospace; color: #64748b; word-break: break-all; }
    .modal-actions { display: flex; gap: 12px; justify-content: flex-end; }
  `]
})
export class PaymentFormComponent implements OnInit {
  paymentForm!: FormGroup;
  myBalance = 0;
  submitting = false;
  showConfirmModal = false;

  constructor(
    private fb: FormBuilder,
    private transactionService: TransactionService,
    private accountService: AccountService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadMyBalance();
    this.generateIdempotencyKey();
  }

  private initForm(): void {
    this.paymentForm = this.fb.group({
      destAccountId: ['', [Validators.required]],
      amount: ['', [Validators.required, Validators.min(1000)]],
      merchantId: [null],
      description: ['Thanh toán dịch vụ PayGate'],
      idempotencyKey: ['', [Validators.required]]
    });
  }

  private loadMyBalance(): void {
    this.accountService.getAccountMe().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.myBalance = res.data.balance;
        }
      }
    });
  }

  generateIdempotencyKey(): void {
    const uuid = 'IDEM-' + Math.random().toString(36).substring(2, 9).toUpperCase() + '-' + Date.now();
    this.paymentForm.patchValue({ idempotencyKey: uuid });
  }

  openConfirmation(): void {
    if (this.paymentForm.invalid) return;
    this.showConfirmModal = true;
  }

  closeConfirmation(): void {
    this.showConfirmModal = false;
  }

  executePayment(): void {
    this.submitting = true;
    this.transactionService.processPayment(this.paymentForm.value).subscribe({
      next: (res) => {
        this.submitting = false;
        this.showConfirmModal = false;
        if (res.success && res.data) {
          this.snackBar.open(`Thanh toán thành công! Mã Ref: ${res.data.transactionRef}`, 'Close', { duration: 4000 });
          this.router.navigate(['/transactions/history']);
        }
      },
      error: (err) => {
        this.submitting = false;
        this.showConfirmModal = false;
        const msg = err.error?.message || 'Thanh toán thất bại!';
        this.snackBar.open(msg, 'Close', { duration: 4000 });
      }
    });
  }
}
