import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'pg-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [type]="type()"
      [disabled]="disabled() || loading()"
      [class]="computedClasses()"
      (click)="onClick($event)"
    >
      <span *ngIf="loading()" class="btn-spinner" aria-hidden="true"></span>
      <ng-content *ngIf="!loading()"></ng-content>
      <span *ngIf="loading() && loadingText()">{{ loadingText() }}</span>
    </button>
  `,
  styles: [`
    :host {
      display: inline-flex;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      font-family: var(--font-family-sans);
      font-weight: var(--font-weight-semibold);
      line-height: 1;
      border: none;
      border-radius: var(--radius-lg);
      cursor: pointer;
      transition: all var(--transition-fast);
      white-space: nowrap;
      user-select: none;
      text-decoration: none;
      position: relative;
    }

    .btn:disabled,
    .btn[disabled] {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
      transform: none !important;
    }

    /* Sizes */
    .btn-sm {
      height: var(--button-height-sm);
      padding: 0 var(--space-3);
      font-size: var(--font-size-xs);
      gap: var(--space-1);
    }

    .btn-md {
      height: var(--button-height);
      padding: 0 var(--space-4);
      font-size: var(--font-size-sm);
    }

    .btn-lg {
      height: var(--button-height-lg);
      padding: 0 var(--space-6);
      font-size: var(--font-size-base);
      gap: var(--space-3);
    }

    .btn-icon {
      width: var(--button-height);
      height: var(--button-height);
      padding: 0;
    }

    .btn-icon-sm {
      width: var(--button-height-sm);
      height: var(--button-height-sm);
    }

    .btn-icon-lg {
      width: var(--button-height-lg);
      height: var(--button-height-lg);
    }

    /* Variants */
    .btn-primary {
      background-color: var(--color-bg-brand);
      color: var(--color-text-inverse);
      box-shadow: var(--shadow-brand);
    }

    .btn-primary:hover:not(:disabled) {
      background-color: var(--color-bg-brand-hover);
      box-shadow: var(--shadow-lg), var(--shadow-brand);
      transform: translateY(-1px);
    }

    .btn-primary:active:not(:disabled) {
      transform: translateY(0);
    }

    .btn-secondary {
      background-color: var(--color-bg-tertiary);
      color: var(--color-text-primary);
      border: 1px solid var(--color-border-primary);
    }

    .btn-secondary:hover:not(:disabled) {
      background-color: var(--color-bg-hover);
      border-color: var(--color-border-secondary);
    }

    .btn-outline {
      background-color: transparent;
      color: var(--color-text-brand);
      border: 1px solid var(--color-border-primary);
    }

    .btn-outline:hover:not(:disabled) {
      background-color: var(--color-primary-50);
      border-color: var(--color-primary-500);
    }

    .dark .btn-outline:hover:not(:disabled) {
      background-color: var(--color-primary-900);
      border-color: var(--color-primary-400);
    }

    .btn-ghost {
      background-color: transparent;
      color: var(--color-text-secondary);
      border: none;
    }

    .btn-ghost:hover:not(:disabled) {
      background-color: var(--color-bg-hover);
      color: var(--color-text-primary);
    }

    .btn-danger {
      background-color: var(--color-error-500);
      color: var(--color-text-inverse);
    }

    .btn-danger:hover:not(:disabled) {
      background-color: var(--color-error-600);
    }

    .btn-success {
      background-color: var(--color-success-500);
      color: var(--color-text-inverse);
    }

    .btn-success:hover:not(:disabled) {
      background-color: var(--color-success-600);
    }

    /* Full width */
    .btn-block {
      width: 100%;
    }

    /* Loading spinner */
    .btn-spinner {
      position: absolute;
      width: 16px;
      height: 16px;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    .btn-primary .btn-spinner {
      border-color: var(--color-text-inverse);
      border-right-color: transparent;
    }

    .btn-secondary .btn-spinner,
    .btn-outline .btn-spinner {
      border-color: var(--color-text-brand);
      border-right-color: transparent;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `]
})
export class ButtonComponent {
  type = input<'button' | 'submit' | 'reset'>('button');
  variant = input<'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success'>('primary');
  size = input<'sm' | 'md' | 'lg' | 'icon'>('md');
  disabled = input(false);
  loading = input(false);
  loadingText = input('');
  block = input(false);

  onClick(event: MouseEvent): void {
    if (this.disabled() || this.loading()) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  computedClasses = computed(() => {
    const classes = ['btn', `btn-${this.size()}`, `btn-${this.variant()}`];
    if (this.block()) classes.push('btn-block');
    return classes.join(' ');
  });
}