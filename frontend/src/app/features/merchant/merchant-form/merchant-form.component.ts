import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MerchantService } from '../../../core/services/merchant.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Merchant } from '../../../core/models/merchant.model';

@Component({
  selector: 'app-merchant-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule],
  template: `
    <div class="modal-backdrop">
      <div class="modal-card">
        <!-- Header -->
        <div class="modal-header">
          <h3>{{ merchant ? 'Edit Merchant Details' : 'Register New Merchant Partner' }}</h3>
          <button mat-icon-button (click)="close.emit()"><mat-icon>close</mat-icon></button>
        </div>

        <!-- Form Body -->
        <form [formGroup]="merchantForm" (ngSubmit)="onSubmit()" class="modal-body">
          <!-- Merchant Code -->
          <div class="form-group">
            <label class="form-label">Merchant Code *</label>
            <input
              type="text"
              formControlName="merchantCode"
              placeholder="e.g. TECHMART"
              [readOnly]="!!merchant"
              class="form-input font-mono"
            />
            <p *ngIf="isFieldInvalid('merchantCode')" class="field-error">Merchant Code is required (min 3 characters)</p>
          </div>

          <!-- Merchant Name -->
          <div class="form-group">
            <label class="form-label">Business Name *</label>
            <input
              type="text"
              formControlName="name"
              placeholder="e.g. TechMart Super Store"
              class="form-input"
            />
            <p *ngIf="isFieldInvalid('name')" class="field-error">Business Name is required</p>
          </div>

          <!-- Contact Email -->
          <div class="form-group">
            <label class="form-label">Contact Email *</label>
            <input
              type="email"
              formControlName="contactEmail"
              placeholder="contact@techmart.com"
              class="form-input"
            />
            <p *ngIf="isFieldInvalid('contactEmail')" class="field-error">Valid email address required</p>
          </div>

          <!-- Webhook URL -->
          <div class="form-group">
            <label class="form-label">Webhook Notification URL *</label>
            <input
              type="url"
              formControlName="webhookUrl"
              placeholder="https://techmart.com/webhook"
              class="form-input font-mono"
            />
            <p *ngIf="isFieldInvalid('webhookUrl')" class="field-error">Valid Webhook URL is required</p>
          </div>

          <!-- Status (Only in Edit Mode) -->
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
            <button type="button" mat-button class="btn-cancel" (click)="close.emit()">Cancel</button>
            <button type="submit" mat-raised-button class="btn-save" [disabled]="merchantForm.invalid || loading">
              {{ loading ? 'Saving...' : (merchant ? 'Update Merchant' : 'Register Merchant') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 16px; }
    .modal-card { background: #ffffff; border-radius: 12px; border: 1px solid #cbd5e1; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); width: 100%; max-width: 520px; overflow: hidden; display: flex; flex-direction: column; }
    .modal-header { padding: 16px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
    .modal-header h3 { margin: 0; font-size: 1.1rem; font-weight: 700; color: #0f172a; }
    
    .modal-body { padding: 20px; display: flex; flex-direction: column; gap: 14px; }
    .form-group { display: flex; flex-direction: column; gap: 4px; }
    .form-label { font-size: 0.78rem; font-weight: 700; color: #475569; }
    .form-input { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; font-size: 0.875rem; color: #0f172a; outline: none; transition: border-color 0.2s; }
    .form-input:focus { border-color: #4f46e5; }
    .form-input[readonly] { background: #f1f5f9; color: #64748b; }
    .form-select { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; font-size: 0.875rem; color: #0f172a; outline: none; background: #ffffff; }

    .field-error { color: #dc2626; font-size: 0.75rem; margin: 2px 0 0 0; }
    
    .modal-footer { padding-top: 12px; margin-top: 8px; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end; gap: 8px; }
    .btn-cancel { border: 1px solid #cbd5e1; color: #475569; font-weight: 600; font-size: 0.85rem; border-radius: 6px; }
    .btn-save { background-color: #059669; color: #ffffff; font-weight: 600; font-size: 0.85rem; border-radius: 6px; }
    .btn-save:hover { background-color: #047857; }

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
