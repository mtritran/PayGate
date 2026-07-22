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
    <div class="payment-container">
      <mat-card class="form-card">
        <mat-card-header>
          <mat-icon mat-card-avatar color="accent">payment</mat-icon>
          <mat-card-title>Thanh Toán / Chuyển Tiền</mat-card-title>
          <mat-card-subtitle>Số dư ví hiện tại: {{ myBalance | currency:'VND':'symbol':'1.0-0' }}</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="paymentForm" (ngSubmit)="openConfirmation()" class="payment-form">
            <!-- Destination Account ID -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>ID Tài Khoản Đích (destAccountId)</mat-label>
              <input matInput type="number" formControlName="destAccountId" placeholder="Nhập ID tài khoản nhận tiền...">
              <mat-error *ngIf="paymentForm.get('destAccountId')?.hasError('required')">
                Vui lòng nhập ID tài khoản nhận tiền
              </mat-error>
            </mat-form-field>

            <!-- Amount Field -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Số tiền (VND)</mat-label>
              <input matInput type="number" formControlName="amount" placeholder="Nhập số tiền..." min="1000">
              <mat-error *ngIf="paymentForm.get('amount')?.hasError('required')">
                Vui lòng nhập số tiền thanh toán
              </mat-error>
              <mat-error *ngIf="paymentForm.get('amount')?.hasError('min')">
                Số tiền tối thiểu là 1,000 VND
              </mat-error>
            </mat-form-field>

            <!-- Merchant ID (Optional) -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Mã Đơn Vị Chấp Nhận Thanh Toán (Merchant ID - Không bắt buộc)</mat-label>
              <input matInput type="number" formControlName="merchantId" placeholder="Nhập Merchant ID nếu có...">
            </mat-form-field>

            <!-- Description Field -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Nội dung thanh toán</mat-label>
              <input matInput formControlName="description" placeholder="Nhập nội dung thanh toán...">
            </mat-form-field>

            <!-- Idempotency Key Field -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Khóa Idempotency Key (Chống trùng lặp)</mat-label>
              <input matInput formControlName="idempotencyKey" readonly>
              <button mat-icon-button matSuffix type="button" (click)="generateIdempotencyKey()" title="Tạo mới khóa">
                <mat-icon>refresh</mat-icon>
              </button>
            </mat-form-field>

            <div class="actions">
              <button mat-raised-button color="accent" type="submit" [disabled]="paymentForm.invalid || submitting">
                Xác Nhận & Xem Lại
              </button>
              <a mat-button routerLink="/accounts/dashboard">Hủy bỏ</a>
            </div>
          </form>

          <!-- Confirmation Overlay Dialog -->
          <div *ngIf="showConfirmModal" class="confirm-modal-overlay">
            <div class="confirm-modal-box">
              <h3><mat-icon color="accent">help_outline</mat-icon> Xác Nhận Giao Dịch</h3>
              <p>Bạn có chắc chắn muốn thực hiện giao dịch chuyển tiền này?</p>

              <div class="confirm-details">
                <p><strong>Tài khoản đích:</strong> #{{ paymentForm.value.destAccountId }}</p>
                <p><strong>Số tiền:</strong> {{ paymentForm.value.amount | currency:'VND':'symbol':'1.0-0' }}</p>
                <p><strong>Nội dung:</strong> {{ paymentForm.value.description || 'Thanh toán ví' }}</p>
                <p class="key-text"><strong>Idempotency Key:</strong> {{ paymentForm.value.idempotencyKey }}</p>
              </div>

              <div class="modal-actions">
                <button mat-raised-button color="accent" (click)="executePayment()" [disabled]="submitting">
                  <mat-spinner diameter="20" *ngIf="submitting"></mat-spinner>
                  <span *ngIf="!submitting">Đồng Ý Thanh Toán</span>
                </button>
                <button mat-button (click)="closeConfirmation()" [disabled]="submitting">Quay Lại Sửa</button>
              </div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .payment-container { display: flex; justify-content: center; padding: 24px; }
    .form-card { width: 100%; max-width: 580px; position: relative; }
    .payment-form { display: flex; flex-direction: column; gap: 12px; margin-top: 16px; }
    .full-width { width: 100%; }
    .actions { display: flex; align-items: center; gap: 12px; margin-top: 8px; }
    .confirm-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; }
    .confirm-modal-box { background: white; padding: 24px; border-radius: 8px; max-width: 440px; width: 90%; box-shadow: 0 4px 20px rgba(0,0,0,0.2); }
    .confirm-details { background: #f5f5f5; padding: 12px 16px; border-radius: 6px; margin: 16px 0; font-size: 0.95rem; }
    .key-text { font-size: 0.8rem; word-break: break-all; color: #666; }
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
          this.snackBar.open(`Thanh toán thành công! Mã GD: ${res.data.transactionRef}`, 'Đóng', { duration: 4000 });
          this.router.navigate(['/transactions/history']);
        }
      },
      error: (err) => {
        this.submitting = false;
        this.showConfirmModal = false;
        const msg = err.error?.message || 'Thanh toán thất bại!';
        this.snackBar.open(msg, 'Đóng', { duration: 4000 });
      }
    });
  }
}
