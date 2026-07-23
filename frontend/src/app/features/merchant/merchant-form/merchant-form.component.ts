import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MerchantService } from '../../../core/services/merchant.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Merchant } from '../../../core/models/merchant.model';
import { User, UserService } from '../../users/user.service';

@Component({
  selector: 'app-merchant-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="modal-backdrop modal-fade-in">
      <div class="modal-card">
        <!-- Header -->
        <div class="modal-header">
          <div class="modal-icon-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            </svg>
          </div>
          <div class="modal-header-text">
            <span class="modal-tag">ENTERPRISE PROVISIONING</span>
            <h3>{{ merchant ? 'Edit Merchant Partner' : 'Register New Merchant Partner' }}</h3>
            <p class="modal-desc">Configure business profile, owner user, and webhook endpoints.</p>
          </div>
          <button type="button" class="btn-close-icon" (click)="close.emit()">✕</button>
        </div>

        <!-- Form Body -->
        <form [formGroup]="merchantForm" (ngSubmit)="onSubmit()" class="modal-body">
          <!-- Searchable User Selection (Create Mode Only) -->
          <div *ngIf="!merchant" class="form-group">
            <label class="form-label required">Merchant Owner User</label>
            <div class="user-search-wrapper">
              <input
                type="text"
                [(ngModel)]="searchUserTerm"
                [ngModelOptions]="{standalone: true}"
                placeholder="🔍 Search user by username or email..."
                class="form-input search-input"
              />
              <select formControlName="userId" class="form-select font-mono mt-1">
                <option value="" disabled>-- Select Owner User --</option>
                <option *ngFor="let u of filteredUsers" [value]="u.id">
                  [ID: #{{ u.id }}] {{ u.username }} ({{ u.email }})
                </option>
              </select>
            </div>
            <p *ngIf="isFieldInvalid('userId')" class="field-error">Owner User selection is required</p>
          </div>

          <!-- Merchant Code -->
          <div class="form-group">
            <label class="form-label required">Merchant Code</label>
            <div class="input-wrapper">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                type="text"
                formControlName="merchantCode"
                placeholder="e.g. TECHMART"
                [readOnly]="!!merchant"
                class="form-input font-mono"
              />
            </div>
            <p *ngIf="isFieldInvalid('merchantCode')" class="field-error">Merchant Code is required (min 3 characters)</p>
          </div>

          <!-- Merchant Name -->
          <div class="form-group">
            <label class="form-label required">Business Name (Merchant Name)</label>
            <div class="input-wrapper">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              </svg>
              <input
                type="text"
                formControlName="merchantName"
                placeholder="e.g. TechMart Electronics Store"
                class="form-input"
              />
            </div>
            <p *ngIf="isFieldInvalid('merchantName')" class="field-error">Business Name is required</p>
          </div>

          <!-- Webhook URL -->
          <div class="form-group">
            <label class="form-label required">Webhook Notification URL</label>
            <div class="input-wrapper">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              <input
                type="url"
                formControlName="webhookUrl"
                placeholder="https://techmart.com/webhook"
                class="form-input font-mono"
              />
            </div>
            <p *ngIf="isFieldInvalid('webhookUrl')" class="field-error">Valid Webhook URL is required</p>
          </div>

          <!-- Status (Edit Mode) -->
          <div *ngIf="merchant" class="form-group">
            <label class="form-label">Account Status</label>
            <select formControlName="status" class="form-select">
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
            </select>
          </div>

          <!-- Footer Action Buttons Bar -->
          <div class="modal-actions-bar">
            <button type="button" class="btn-cancel-outline" (click)="close.emit()">Cancel</button>
            <button type="submit" class="btn-emerald-modal" [disabled]="merchantForm.invalid || loading">
              {{ loading ? 'Saving...' : (merchant ? 'Update Merchant' : 'Register Merchant ↗') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    @keyframes modalFadeIn {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }
    .modal-fade-in { animation: modalFadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

    .modal-backdrop {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      width: 100vw; height: 100vh;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      display: flex; align-items: center; justify-content: center;
      z-index: 99999; padding: 20px; box-sizing: border-box;
      font-family: 'Inter', system-ui, sans-serif;
    }

    .modal-card {
      background: #ffffff;
      border-radius: 20px;
      border: 1px solid rgba(226, 232, 240, 0.9);
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.3);
      width: 100%; max-width: 540px;
      overflow: hidden; display: flex; flex-direction: column;
    }
    
    .modal-header { padding: 22px 26px; background: #ffffff; border-bottom: 1px solid #f1f5f9; display: flex; gap: 14px; align-items: flex-start; position: relative; }
    .modal-icon-badge { width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); color: #059669; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid #a7f3d0; }
    .modal-icon-badge svg { width: 22px; height: 22px; }

    .modal-header-text { flex: 1; }
    .modal-tag { font-size: 0.68rem; font-weight: 800; color: #059669; letter-spacing: 0.05em; display: block; margin-bottom: 2px; }
    .modal-header h3 { margin: 0 0 2px 0; font-size: 1.25rem; font-weight: 800; color: #0f172a; letter-spacing: -0.01em; }
    .modal-desc { margin: 0; font-size: 0.8rem; color: #64748b; }

    .btn-close-icon { background: transparent; border: none; font-size: 1.1rem; color: #94a3b8; cursor: pointer; padding: 4px; border-radius: 6px; }
    .btn-close-icon:hover { color: #0f172a; background-color: #f1f5f9; }

    .modal-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; background-color: #ffffff; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-label { font-size: 0.825rem; font-weight: 700; color: #334155; }
    .form-label.required::after { content: ' *'; color: #ef4444; }

    .input-wrapper { position: relative; display: flex; align-items: center; }
    .input-icon { position: absolute; left: 14px; width: 18px; height: 18px; color: #94a3b8; pointer-events: none; }
    
    .form-input {
      width: 100%; height: 42px; padding: 0 14px 0 42px; border-radius: 10px;
      border: 1px solid #cbd5e1; background-color: #f8fafc; font-size: 0.875rem; color: #0f172a; outline: none; transition: all 0.2s;
    }
    .form-input.search-input { padding: 0 14px; height: 36px; font-size: 0.825rem; margin-bottom: 6px; }
    .form-input:focus { border-color: #10b981; background-color: #ffffff; box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15); }
    .form-input[readonly] { background-color: #f1f5f9; color: #64748b; }

    .form-select {
      width: 100%; height: 42px; padding: 0 14px; border-radius: 10px;
      border: 1px solid #cbd5e1; background-color: #f8fafc; font-size: 0.875rem; color: #0f172a; outline: none; transition: all 0.2s;
    }
    .form-select:focus { border-color: #10b981; background-color: #ffffff; }

    .mt-1 { margin-top: 4px; }
    .font-mono { font-family: monospace; }
    .field-error { font-size: 0.75rem; color: #ef4444; margin: 2px 0 0 0; font-weight: 600; }

    .modal-actions-bar { display: flex; justify-content: flex-end; gap: 12px; margin-top: 10px; padding-top: 16px; border-top: 1px solid #f1f5f9; }
    .btn-cancel-outline { padding: 0 18px; height: 42px; border-radius: 10px; border: 1px solid #cbd5e1; background: #ffffff; color: #475569; font-weight: 700; font-size: 0.875rem; cursor: pointer; }
    .btn-cancel-outline:hover { background-color: #f8fafc; color: #0f172a; }
    
    .btn-emerald-modal {
      padding: 0 22px; height: 42px; border-radius: 10px; border: none;
      background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff;
      font-weight: 700; font-size: 0.875rem; cursor: pointer; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25);
    }
    .btn-emerald-modal:hover:not(:disabled) { background: linear-gradient(135deg, #047857 0%, #064e3b 100%); }
    .btn-emerald-modal:disabled { opacity: 0.6; cursor: not-allowed; }
  `]
})
export class MerchantFormComponent implements OnInit {
  @Input() merchant: Merchant | null = null;
  @Output() saved = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  merchantForm!: FormGroup;
  users: User[] = [];
  searchUserTerm = '';
  loading = false;

  constructor(
    private fb: FormBuilder,
    private merchantService: MerchantService,
    private userService: UserService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.merchantForm = this.fb.group({
      userId: [this.merchant?.userId || '', this.merchant ? [] : [Validators.required]],
      merchantCode: [this.merchant?.merchantCode || '', [Validators.required, Validators.minLength(3)]],
      merchantName: [this.merchant?.merchantName || this.merchant?.name || '', [Validators.required]],
      webhookUrl: [this.merchant?.webhookUrl || '', [Validators.required]],
      status: [this.merchant?.status || 'ACTIVE']
    });

    if (!this.merchant) {
      this.loadUsers();
    }
  }

  loadUsers(): void {
    this.userService.getAll(0, 100).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.users = res.data.content;
          if (this.users.length > 0 && !this.merchantForm.get('userId')?.value) {
            this.merchantForm.patchValue({ userId: this.users[0].id });
          }
        }
      }
    });
  }

  get filteredUsers(): User[] {
    if (!this.searchUserTerm.trim()) {
      return this.users;
    }
    const term = this.searchUserTerm.toLowerCase().trim();
    return this.users.filter(u =>
      u.username.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      String(u.id).includes(term)
    );
  }

  isFieldInvalid(field: string): boolean {
    const control = this.merchantForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  onSubmit(): void {
    if (this.merchantForm.invalid) return;

    this.loading = true;
    const formVal = this.merchantForm.value;

    if (this.merchant) {
      this.merchantService.update(this.merchant.id, {
        name: formVal.merchantName,
        merchantName: formVal.merchantName,
        webhookUrl: formVal.webhookUrl,
        status: formVal.status
      }).subscribe({
        next: (res) => {
          this.loading = false;
          if (res.success) {
            this.notificationService.success('Merchant updated successfully!');
            this.saved.emit();
          } else {
            this.notificationService.error(res.message || 'Failed to update merchant');
          }
        },
        error: (err) => {
          this.loading = false;
          this.notificationService.error(err.error?.message || 'Error updating merchant');
        }
      });
    } else {
      this.merchantService.create({
        userId: Number(formVal.userId),
        merchantName: formVal.merchantName,
        merchantCode: formVal.merchantCode,
        webhookUrl: formVal.webhookUrl
      }).subscribe({
        next: (res) => {
          this.loading = false;
          if (res.success) {
            this.notificationService.success('Merchant registered successfully!');
            this.saved.emit();
          } else {
            this.notificationService.error(res.message || 'Failed to register merchant');
          }
        },
        error: (err) => {
          this.loading = false;
          this.notificationService.error(err.error?.message || 'Error registering merchant');
        }
      });
    }
  }
}
