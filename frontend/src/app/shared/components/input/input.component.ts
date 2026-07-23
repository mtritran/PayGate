import { Component, input, output, computed, forwardRef, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export type InputType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
export type InputSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'pg-input',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="form-field" [class.form-field-error]="error()">
      <label *ngIf="label()" class="form-label" [for]="id()">
        {{ label() }}
        <span class="form-label-required" *ngIf="required()">*</span>
      </label>

      <div class="input-wrapper">
        <span class="input-prefix" *ngIf="prefixIcon()">
          <span [innerHTML]="prefixIcon()"></span>
        </span>

        <input
          [type]="showPassword() ? 'text' : type()"
          [id]="id()"
          [name]="name()"
          [placeholder]="placeholder()"
          [disabled]="disabled()"
          [required]="required()"
          [readonly]="readonly()"
          [attr.aria-describedby]="describedBy()"
          [attr.aria-invalid]="error() ? 'true' : 'false'"
          [attr.aria-required]="required()"
          [attr.autocomplete]="autocomplete()"
          [attr.min]="min()"
          [attr.max]="max()"
          [attr.step]="step()"
          [attr.pattern]="pattern()"
          [attr.minlength]="minlength()"
          [attr.maxlength]="maxlength()"
          [value]="value()"
          (input)="onInput($event)"
          (blur)="onBlur()"
          (focus)="onFocus()"
          class="input"
          [class.input-sm]="size() === 'sm'"
          [class.input-lg]="size() === 'lg'"
          [class.input-has-prefix]="hasPrefixIcon()"
          [class.input-has-suffix]="hasSuffix()"
        />

        <span class="input-suffix" *ngIf="suffix()">{{ suffix() }}</span>

        <!-- Clear button -->
        <button
          *ngIf="clearable() && value() && !disabled() && !readonly()"
          type="button"
          class="input-clear"
          (click)="clear($event)"
          aria-label="Clear"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <!-- Password toggle -->
        <button
          *ngIf="showPasswordToggle() && type() === 'password' && !disabled() && !readonly()"
          type="button"
          class="input-toggle"
          (click)="togglePassword()"
          [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
        >
          <svg *ngIf="!showPassword()" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <svg *ngIf="showPassword()" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        </button>
      </div>

      <!-- Error message -->
      <div *ngIf="error()" class="input-error-message" role="alert">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>{{ error() }}</span>
      </div>

      <!-- Helper text -->
      <div *ngIf="!error() && helperText()" class="input-helper-text">
        {{ helperText() }}
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
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

    .form-label-required {
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
      font-size: var(--font-size-base);
      font-weight: var(--font-weight-normal);
      line-height: 1;
      color: var(--color-text-primary);
      background-color: var(--color-bg-secondary);
      border: 1px solid var(--color-border-primary);
      border-radius: var(--radius-md);
      transition: all var(--transition-fast);
      outline: none;
    }

    .input::placeholder {
      color: var(--color-text-tertiary);
    }

    .input:hover:not(:disabled):not(.input-error) {
      border-color: var(--color-border-secondary);
    }

    .input:focus {
      border-color: var(--color-border-focus);
      box-shadow: 0 0 0 3px var(--color-primary-100);
    }

    .dark .input:focus {
      box-shadow: 0 0 0 3px var(--color-primary-900);
    }

    .input:disabled {
      background-color: var(--color-bg-tertiary);
      color: var(--color-text-tertiary);
      cursor: not-allowed;
    }

    .input[readonly] {
      background-color: var(--color-bg-tertiary);
    }

    .input-error {
      border-color: var(--color-border-error) !important;
    }

    .input-error:focus {
      box-shadow: 0 0 0 3px var(--color-error-100);
    }

    .dark .input-error:focus {
      box-shadow: 0 0 0 3px var(--color-error-900);
    }

    /* Sizes */
    .input-sm {
      height: var(--input-height-sm);
      padding: 0 var(--space-3);
      font-size: var(--font-size-sm);
    }

    .input-lg {
      height: var(--input-height-lg);
      padding: 0 var(--space-5);
      font-size: var(--font-size-lg);
    }

    /* Prefix/Suffix spacing */
    .input-has-prefix {
      padding-left: var(--space-10);
    }

    .input-has-suffix {
      padding-right: var(--space-10);
    }

    .input-prefix,
    .input-suffix {
      position: absolute;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-text-tertiary);
      pointer-events: none;
      font-size: var(--font-size-sm);
    }

    .input-prefix {
      left: var(--space-3);
    }

    .input-suffix {
      right: var(--space-3);
    }

    /* Clear button */
    .input-clear {
      position: absolute;
      right: var(--space-3);
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      padding: 0;
      background: transparent;
      border: none;
      border-radius: var(--radius-full);
      color: var(--color-text-tertiary);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .input-clear:hover {
      background-color: var(--color-bg-tertiary);
      color: var(--color-text-primary);
    }

    .input-clear:focus-visible {
      outline: none;
      box-shadow: 0 0 0 2px var(--color-primary-500);
    }

    /* Password toggle */
    .input-toggle {
      position: absolute;
      right: var(--space-3);
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      padding: 0;
      background: transparent;
      border: none;
      border-radius: var(--radius-full);
      color: var(--color-text-tertiary);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .input-toggle:hover {
      background-color: var(--color-bg-tertiary);
      color: var(--color-text-primary);
    }

    .input-toggle:focus-visible {
      outline: none;
      box-shadow: 0 0 0 2px var(--color-primary-500);
    }

    /* Error message */
    .input-error-message {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      font-size: var(--font-size-xs);
      color: var(--color-error-500);
    }

    .input-error-message svg {
      flex-shrink: 0;
    }

    /* Helper text */
    .input-helper-text {
      font-size: var(--font-size-xs);
      color: var(--color-text-tertiary);
    }
  `],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true
    }
  ]
})
export class InputComponent implements ControlValueAccessor {
  // Inputs
  id = input('');
  name = input('');
  type = input<InputType>('text');
  label = input('');
  placeholder = input('');
  disabled = signal(false);
  required = input(false);
  readonly = input(false);
  autocomplete = input('off');
  size = input<InputSize>('md');
  error = input('');
  helperText = input('');
  prefixIcon = input('');  // SVG string for prefix icon
  suffix = input('');
  clearable = input(false);
  showPasswordToggle = input(false);  // Show password visibility toggle
  min = input<string | number>('');
  max = input<string | number>('');
  step = input<string | number>('');
  pattern = input('');
  minlength = input<number>(0);
  maxlength = input<number>(0);
  describedBy = input('');

  // Internal state
  value = signal('');
  showPassword = signal(false);
  focused = signal(false);
  private onChange = (value: string) => {};
  private onTouched = () => {};

  // Computed
  hasPrefixIcon = computed(() => !!this.prefixIcon());
  hasSuffix = computed(() => !!this.suffix());
  hasError = computed(() => !!this.error());

  // ControlValueAccessor implementation
  writeValue(value: string): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.update(() => isDisabled);
  }

  // Event handlers
  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const newValue = target.value;
    this.value.set(newValue);
    this.onChange(newValue);
  }

  onBlur(): void {
    this.onTouched();
  }

  onFocus(): void {
    // Focus handling if needed
  }

  onEnter(event: KeyboardEvent): void {
    // Enter key handling
  }

  clear(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    this.value.set('');
    this.onChange('');
  }

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }
}