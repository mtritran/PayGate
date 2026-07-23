import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MerchantService } from '../../../core/services/merchant.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Merchant } from '../../../core/models/merchant.model';

@Component({
  selector: 'app-merchant-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="modal-backdrop fade-in">
      <div class="modal-card">
        <!-- Header -->
        <div class="modal-header">
          <div class="modal-title-group">
            <span class="modal-tag">ENTERPRISE PROVISIONING</span>
            <h3>{{ merchant ? 'Edit Merchant Partner' : 'Register New Merchant Partner' }}</h3>
          </div>
          <button type="button" class="btn-close-icon" (click)="close.emit()">✕</button>
        </div>

        <!-- Form Body -->
        <form [formGroup]="merchantForm" (ngSubmit)="onSubmit()" class="modal-body">
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
            <label class="form-label required">Business Name</label>
            <div class="input-wrapper">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              </svg>
              <input
                type="text"
                formControlName="name"
                placeholder="e.g. TechMart Super Store"
                class="form-input"
              />
            </div>
            <p *ngIf="isFieldInvalid('name')" class="field-error">Business Name is required</p>
          </div>

          <!-- Contact Email -->
          <div class="form-group">
            <label class="form-label required">Contact Email</label>
            <div class="input-wrapper">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <input
                type="email"
                formControlName="contactEmail"
                placeholder="contact@techmart.com"
                class="form-input"
              />
            </div>
            <p *ngIf="isFieldInvalid('contactEmail')" class="field-error">Valid email address required</p>
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

          <!-- Footer Action Buttons -->
          <div class="modal-footer">
            <button type="button" class="btn-cancel" (click)="close.emit()">Cancel</button>
            <button type="submit" class="btn-emerald-modal" [disabled]="merchantForm.invalid || loading">
              {{ loading ? 'Saving...' : (merchant ? 'Update Merchant' : 'Register Merchant ↗') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(14px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .fade-in { animation: fadeInUp 0.25s ease-out forwards; }

    .modal-backdrop { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; font-family: 'Inter', system-ui, sans-serif; }
    .modal-card { background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); width: 100%; max-width: 500px; overflow: hidden; display: flex; flex-direction: column; }
    
    .modal-header { padding: 20px 24px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: flex-start; }
    .modal-tag { font-size: 0.68rem; font-weight: 800; color: #059669; letter-spacing: 0.05em; display: block; margin-bottom: 2px; }
    .modal-header h3 { margin: 0; font-size: 1.25rem; font-weight: 800; color: #0f172a; letter-spacing: -0.01em; }
    .btn-close-icon { background: transparent; border: none; font-size: 1.1rem; color: #94a3b8; cursor: pointer; padding: 4px; }
    .btn-close-icon:hover { color: #0f172a; }

    .modal-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-label { font-size: 0.825rem; font-weight: 700; color: #334155; }
    .form-label.required::after { content: ' *'; color: #ef4444; }

    .input-wrapper { position: relative; display: flex; align-items: center; }
    .input-icon { position: absolute; left: 12px; width: 16px; height: 16px; color: #94a3b8; pointer-events: none; }
    
    .form-input {
      width: 100%;
      height: 42px;
      padding: 0 14px 0 38px;
      font-size: 0.875rem;
      font-weight: 600;
      color: #0f172a;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      outline: none;
      transition: all 0.15s;
      box-sizing: border-box;
    }
    .form-input:focus { border-color: #059669; background-color: #ffffff; box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1); }
    .form-input[readonly] { background: #f1f5f9; color: #64748b; }
    
    .form-select { height: 42px; padding: 0 14px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 0.875rem; font-weight: 600; color: #0f172a; outline: none; background: #ffffff; }

    .field-error { color: #ef4444; font-size: 0.75rem; margin: 2px 0 0 0; font-weight: 600; }
    
    .modal-footer { padding-top: 16px; margin-top: 8px; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end; gap: 10px; }
    .btn-cancel { height: 42px; padding: 0 18px; border: 1px solid #cbd5e1; background: #ffffff; border-radius: 10px; font-weight: 600; font-size: 0.875rem; color: #475569; cursor: pointer; }
    .btn-emerald-modal { height: 42px; padding: 0 20px; border: none; border-radius: 10px; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff; font-weight: 700; font-size: 0.875rem; cursor: pointer; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25); }
    .btn-emerald-modal:disabled { opacity: 0.6; cursor: not-allowed; }

    .font-mono { font-family: monospace; }
  `]
})
export class MerchantFormComponent implements OnInit {
  @Input() merchant: Merchant | null = null;
  @Output() saved = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  merchantForm!: FormGroup;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private merchantService: MerchantService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.merchantForm = this.fb.group({
      merchantCode: [this.merchant?.merchantCode || '', [Validators.required, Validators.minLength(3)]],
      name: [this.merchant?.name || '', [Validators.required]],
      contactEmail: [this.merchant?.contactEmail || '', [Validators.required, Validators.email]],
      contactPhone: [this.merchant?.contactPhone || ''],
      webhookUrl: [this.merchant?.webhookUrl || '', [Validators.required]],
      status: [this.merchant?.status || 'ACTIVE']
    });
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
        name: formVal.name,
        contactEmail: formVal.contactEmail,
        contactPhone: formVal.contactPhone,
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
        merchantCode: formVal.merchantCode,
        name: formVal.name,
        contactEmail: formVal.contactEmail,
        contactPhone: formVal.contactPhone,
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
