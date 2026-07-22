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
    <div class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-slate-700/60 flex items-center justify-between bg-slate-800/80">
          <h3 class="text-xl font-semibold text-white flex items-center gap-2">
            <span class="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h6m-6 4h6m-6 4h6" />
              </svg>
            </span>
            {{ merchant ? 'Edit Merchant' : 'Register New Merchant' }}
          </h3>
          <button (click)="close.emit()" class="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-700/50">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Form Body -->
        <form [formGroup]="merchantForm" (ngSubmit)="onSubmit()" class="p-6 space-y-4">
          <!-- Merchant Code -->
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-1">Merchant Code *</label>
            <input
              type="text"
              formControlName="merchantCode"
              placeholder="e.g. MCH_SHOPEE_01"
              [readOnly]="!!merchant"
              class="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50"
            />
            <p *ngIf="isFieldInvalid('merchantCode')" class="text-rose-400 text-xs mt-1">Merchant Code is required (min 3 chars)</p>
          </div>

          <!-- Merchant Name -->
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-1">Business Name *</label>
            <input
              type="text"
              formControlName="name"
              placeholder="e.g. Shopee Vietnam Co."
              class="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
            <p *ngIf="isFieldInvalid('name')" class="text-rose-400 text-xs mt-1">Business Name is required</p>
          </div>

          <!-- Contact Email & Phone Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-1">Contact Email *</label>
              <input
                type="email"
                formControlName="contactEmail"
                placeholder="contact@shopee.vn"
                class="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              <p *ngIf="isFieldInvalid('contactEmail')" class="text-rose-400 text-xs mt-1">Valid email required</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-1">Contact Phone</label>
              <input
                type="text"
                formControlName="contactPhone"
                placeholder="0901234567"
                class="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <!-- Webhook URL -->
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-1">Webhook Notification URL *</label>
            <input
              type="url"
              formControlName="webhookUrl"
              placeholder="https://api.shopee.vn/v1/webhook"
              class="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
            <p *ngIf="isFieldInvalid('webhookUrl')" class="text-rose-400 text-xs mt-1">Webhook URL is required</p>
          </div>

          <!-- Status (Only in Edit Mode) -->
          <div *ngIf="merchant">
            <label class="block text-sm font-medium text-slate-300 mb-1">Status</label>
            <select
              formControlName="status"
              class="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
            </select>
          </div>

          <!-- Buttons -->
          <div class="pt-4 flex items-center justify-end gap-3 border-t border-slate-700/60">
            <button
              type="button"
              (click)="close.emit()"
              class="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-700/50 hover:text-white transition-all font-medium text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              [disabled]="merchantForm.invalid || loading"
              class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium text-sm shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <svg *ngIf="loading" class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ loading ? 'Saving...' : (merchant ? 'Update Merchant' : 'Register Merchant') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `
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
      // Edit Mode
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
      // Create Mode
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
