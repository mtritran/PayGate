import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

export interface BnplProfileFormData {
  fullName: string;
  occupation: string;
  companyName: string;
  monthlyIncome: number;
  relative1Name: string;
  relative1Phone: string;
  relative1Relationship: string;
  relative2Name: string;
  relative2Phone: string;
  relative2Relationship: string;
}

@Component({
  selector: 'app-bnpl-profile-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="bnpl-form">
      
      <!-- Borrower Information -->
      <div class="form-section">
        <div class="section-header">
          <h4>Borrower Information</h4>
        </div>
        <div class="form-grid two-col">
          <label class="form-field">
            <span class="field-label">Full name</span>
            <input type="text" formControlName="fullName" placeholder="Nguyen Van A" class="input-field"
                   [class.invalid]="isInvalid('fullName')">
            <span class="error-msg" *ngIf="isInvalid('fullName')">Full name is required</span>
          </label>
          <label class="form-field">
            <span class="field-label">Occupation</span>
            <input type="text" formControlName="occupation" placeholder="Software Engineer" class="input-field"
                   [class.invalid]="isInvalid('occupation')">
            <span class="error-msg" *ngIf="isInvalid('occupation')">Occupation is required</span>
          </label>
          <label class="form-field">
            <span class="field-label">Company name</span>
            <input type="text" formControlName="companyName" placeholder="FPT Software" class="input-field"
                   [class.invalid]="isInvalid('companyName')">
            <span class="error-msg" *ngIf="isInvalid('companyName')">Company name is required</span>
          </label>
          <label class="form-field">
            <span class="field-label">Monthly income (VND)</span>
            <input type="number" formControlName="monthlyIncome" min="0" placeholder="15000000" class="input-field"
                   [class.invalid]="isInvalid('monthlyIncome')">
            <span class="error-msg" *ngIf="isInvalid('monthlyIncome')">Valid income is required</span>
          </label>
        </div>
      </div>

      <!-- Relative Contact 1 -->
      <div class="form-section">
        <div class="section-header">
          <h4>Relative Contact 1</h4>
        </div>
        <div class="form-grid three-col">
          <label class="form-field">
            <span class="field-label">Full name</span>
            <input type="text" formControlName="relative1Name" placeholder="Name" class="input-field"
                   [class.invalid]="isInvalid('relative1Name')">
            <span class="error-msg" *ngIf="isInvalid('relative1Name')">Required</span>
          </label>
          <label class="form-field">
            <span class="field-label">Phone</span>
            <input type="text" formControlName="relative1Phone" placeholder="09xxxx" class="input-field"
                   [class.invalid]="isInvalid('relative1Phone')">
            <span class="error-msg" *ngIf="isInvalid('relative1Phone')">Invalid phone number</span>
          </label>
          <label class="form-field">
            <span class="field-label">Relationship</span>
            <div class="select-wrapper">
              <select formControlName="relative1Relationship" class="input-field" [class.invalid]="isInvalid('relative1Relationship')">
                <option value="" disabled selected>Select...</option>
                <option value="Parent">Parent</option>
                <option value="Sibling">Sibling</option>
                <option value="Spouse">Spouse</option>
                <option value="Friend">Friend</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <span class="error-msg" *ngIf="isInvalid('relative1Relationship')">Required</span>
          </label>
        </div>
      </div>

      <!-- Relative Contact 2 -->
      <div class="form-section">
        <div class="section-header">
          <h4>Relative Contact 2</h4>
        </div>
        <div class="form-grid three-col">
          <label class="form-field">
            <span class="field-label">Full name</span>
            <input type="text" formControlName="relative2Name" placeholder="Name" class="input-field"
                   [class.invalid]="isInvalid('relative2Name')">
            <span class="error-msg" *ngIf="isInvalid('relative2Name')">Required</span>
          </label>
          <label class="form-field">
            <span class="field-label">Phone</span>
            <input type="text" formControlName="relative2Phone" placeholder="09xxxx" class="input-field"
                   [class.invalid]="isInvalid('relative2Phone')">
            <span class="error-msg" *ngIf="isInvalid('relative2Phone')">Invalid phone number</span>
          </label>
          <label class="form-field">
            <span class="field-label">Relationship</span>
            <div class="select-wrapper">
              <select formControlName="relative2Relationship" class="input-field" [class.invalid]="isInvalid('relative2Relationship')">
                <option value="" disabled selected>Select...</option>
                <option value="Parent">Parent</option>
                <option value="Sibling">Sibling</option>
                <option value="Spouse">Spouse</option>
                <option value="Friend">Friend</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <span class="error-msg" *ngIf="isInvalid('relative2Relationship')">Required</span>
          </label>
        </div>
        <div *ngIf="form.errors?.['duplicatePhone']" class="error-msg" style="position: relative; bottom: 0; margin-top: 10px;">
          Relative 1 and Relative 2 must have different phone numbers.
        </div>
      </div>

      <div class="form-actions">
        <button type="submit" class="btn-submit" [disabled]="form.invalid || loading">
          <span *ngIf="loading" class="spinner-inline"></span>
          {{ loading ? 'Processing...' : submitLabel }}
        </button>
      </div>
    </form>
  `,
  styles: [`
    .bnpl-form {
      display: flex;
      flex-direction: column;
      gap: 28px;
    }
    
    .form-section {
      background: #fdfdfd;
      border: 1px solid #eef0f4;
      border-radius: 12px;
      padding: 20px 24px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.01);
    }
    
    .section-header {
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #f0f0f0;
    }
    
    .section-header h4 {
      margin: 0;
      color: #0d2b5c;
      font-size: 15px;
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    
    .form-grid {
      display: grid;
      gap: 16px 20px;
    }
    
    .two-col { grid-template-columns: repeat(2, 1fr); }
    .three-col { grid-template-columns: repeat(3, 1fr); }
    
    @media (max-width: 640px) {
      .two-col, .three-col { grid-template-columns: 1fr; }
    }
    
    .form-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      position: relative;
    }
    
    .field-label {
      font-size: 13px;
      font-weight: 600;
      color: #475569;
    }
    
    .input-field {
      width: 100%;
      box-sizing: border-box;
      padding: 12px 14px;
      background: #fff;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-family: inherit;
      font-size: 14px;
      color: #1e293b;
      transition: all 0.2s;
    }
    
    .input-field:focus {
      outline: none;
      border-color: #c20067;
      box-shadow: 0 0 0 3px rgba(194,0,103,0.1);
    }
    
    .input-field.invalid {
      border-color: #ef4444;
      background: #fef2f2;
    }
    
    .select-wrapper {
      position: relative;
    }
    
    .select-wrapper::after {
      content: "▼";
      position: absolute;
      right: 14px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 10px;
      color: #64748b;
      pointer-events: none;
    }
    
    select.input-field {
      appearance: none;
      padding-right: 30px;
    }
    
    .error-msg {
      color: #ef4444;
      font-size: 12px;
      font-weight: 500;
      position: absolute;
      bottom: -18px;
    }
    
    .form-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 8px;
    }
    
    .btn-submit {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: linear-gradient(135deg, #c20067, #e0147f);
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 14px 32px;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(194,0,103,0.2);
      transition: all 0.2s;
    }
    
    .btn-submit:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(194,0,103,0.3);
    }
    
    .btn-submit:disabled {
      opacity: 0.65;
      cursor: not-allowed;
      box-shadow: none;
    }
    
    .spinner-inline {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class BnplProfileFormComponent implements OnInit {
  @Input() initialData: Partial<BnplProfileFormData> | null = null;
  @Input() loading = false;
  @Input() submitLabel = 'Submit Profile';
  @Output() formSubmit = new EventEmitter<BnplProfileFormData>();

  private fb = inject(FormBuilder);
  
  // Phone regex for Vietnam: +84 or 0 followed by 9 digits
  private phoneRegex = /^(0|\+84)[3|5|7|8|9][0-9]{8}$/;

  form = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    occupation: ['', Validators.required],
    companyName: ['', Validators.required],
    monthlyIncome: [15000000, [Validators.required, Validators.min(1000000)]], // Min 1M VND
    relative1Name: ['', Validators.required],
    relative1Phone: ['', [Validators.required, Validators.pattern(this.phoneRegex)]],
    relative1Relationship: ['', Validators.required],
    relative2Name: ['', Validators.required],
    relative2Phone: ['', [Validators.required, Validators.pattern(this.phoneRegex)]],
    relative2Relationship: ['', Validators.required]
  }, { validators: this.duplicatePhoneValidator });

  duplicatePhoneValidator(group: any) {
    const p1 = group.get('relative1Phone')?.value;
    const p2 = group.get('relative2Phone')?.value;
    if (p1 && p2 && p1 === p2) {
      return { duplicatePhone: true };
    }
    return null;
  }

  ngOnInit() {
    if (this.initialData) {
      this.form.patchValue(this.initialData);
    }
  }

  isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  onSubmit() {
    if (this.form.valid) {
      this.formSubmit.emit(this.form.getRawValue() as BnplProfileFormData);
    } else {
      this.form.markAllAsTouched();
    }
  }
}
