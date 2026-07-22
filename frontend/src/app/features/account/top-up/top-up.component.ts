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
import { AccountService } from '../../../core/services/account.service';
import { AccountResponse } from '../../../core/models/account.model';

@Component({
  selector: 'app-top-up',
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
    <div class="topup-container">
      <mat-card class="form-card">
        <mat-card-header>
          <mat-icon mat-card-avatar color="primary">add_card</mat-icon>
          <mat-card-title>Nạp Tiền Vào Ví</mat-card-title>
          <mat-card-subtitle>Số dư ví hiện tại: {{ accountBalance | currency:'VND':'symbol':'1.0-0' }}</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="topUpForm" (ngSubmit)="onSubmit()" class="topup-form">
            <!-- Preset Quick Select Buttons -->
            <div class="preset-buttons">
              <label class="preset-label">Chọn nhanh số tiền:</label>
              <div class="button-group">
                <button type="button" mat-stroked-button *ngFor="let preset of presets" (click)="setPresetAmount(preset)">
                  +{{ preset | currency:'VND':'symbol':'1.0-0' }}
                </button>
              </div>
            </div>

            <!-- Amount Input Field -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Số tiền nạp (VND)</mat-label>
              <input matInput type="number" formControlName="amount" placeholder="Nhập số tiền..." min="10000" max="1000000000">
              <mat-error *ngIf="topUpForm.get('amount')?.hasError('required')">
                Vui lòng nhập số tiền nạp
              </mat-error>
              <mat-error *ngIf="topUpForm.get('amount')?.hasError('min')">
                Số tiền nạp tối thiểu là 10,000 VND
              </mat-error>
              <mat-error *ngIf="topUpForm.get('amount')?.hasError('max')">
                Số tiền nạp tối đa là 1,000,000,000 VND
              </mat-error>
            </mat-form-field>

            <!-- Description Field -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Nội dung nạp tiền</mat-label>
              <input matInput formControlName="description" placeholder="Ví dụ: Top-up tài khoản tháng 7">
            </mat-form-field>

            <div class="actions">
              <button mat-raised-button color="primary" type="submit" [disabled]="topUpForm.invalid || submitting">
                <mat-spinner diameter="20" *ngIf="submitting"></mat-spinner>
                <span *ngIf="!submitting">Xác Nhận Nạp Tiền</span>
              </button>
              <a mat-button routerLink="/accounts/dashboard">Hủy bỏ</a>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .topup-container { display: flex; justify-content: center; padding: 24px; }
    .form-card { width: 100%; max-width: 540px; }
    .topup-form { display: flex; flex-direction: column; gap: 16px; margin-top: 16px; }
    .preset-label { font-size: 0.9rem; color: #666; font-weight: 500; display: block; margin-bottom: 8px; }
    .button-group { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
    .full-width { width: 100%; }
    .actions { display: flex; align-items: center; gap: 12px; margin-top: 8px; }
  `]
})
export class TopUpComponent implements OnInit {
  topUpForm!: FormGroup;
  submitting = false;
  accountBalance = 0;
  presets = [100000, 200000, 500000, 1000000, 5000000];

  constructor(
    private fb: FormBuilder,
    private accountService: AccountService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadAccountBalance();
  }

  private initForm(): void {
    this.topUpForm = this.fb.group({
      amount: [100000, [Validators.required, Validators.min(10000), Validators.max(1000000000)]],
      description: ['Nạp tiền vào ví']
    });
  }

  private loadAccountBalance(): void {
    this.accountService.getAccountMe().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.accountBalance = res.data.balance;
        }
      }
    });
  }

  setPresetAmount(amount: number): void {
    this.topUpForm.patchValue({ amount });
  }

  onSubmit(): void {
    if (this.topUpForm.invalid) return;

    this.submitting = true;
    this.accountService.topUp(this.topUpForm.value).subscribe({
      next: (res) => {
        this.submitting = false;
        if (res.success) {
          this.snackBar.open('Nạp tiền vào ví thành công!', 'Đóng', { duration: 3000 });
          this.router.navigate(['/accounts/dashboard']);
        }
      },
      error: (err) => {
        this.submitting = false;
        const msg = err.error?.message || 'Có lỗi xảy ra khi nạp tiền!';
        this.snackBar.open(msg, 'Đóng', { duration: 4000 });
      }
    });
  }
}
