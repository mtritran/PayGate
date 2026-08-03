import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
export type BadgeSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'pg-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span
      class="badge"
      [class]="computedClasses()"
      [attr.aria-label]="ariaLabel()"
    >
      <span class="badge-dot" *ngIf="dot()"></span>
      <ng-content></ng-content>
    </span>
  `,
  styles: [`
    .badge {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      font-family: var(--font-family-sans);
      font-weight: var(--font-weight-semibold);
      line-height: 1;
      padding: var(--space-1) var(--space-2);
      border-radius: var(--radius-full);
      white-space: nowrap;
    }

    /* Sizes */
    .badge-sm {
      padding: 2px var(--space-15);
      font-size: 10px;
    }

    .badge-md {
      padding: var(--space-1) var(--space-2);
      font-size: var(--font-size-xs);
    }

    .badge-lg {
      padding: var(--space-15) var(--space-3);
      font-size: var(--font-size-sm);
    }

    /* Variants */
    .badge-primary {
      background-color: var(--color-primary-100);
      color: var(--color-primary-700);
    }

    .dark .badge-primary {
      background-color: var(--color-primary-900);
      color: var(--color-primary-300);
    }

    .badge-success {
      background-color: var(--color-success-100);
      color: var(--color-success-700);
    }

    .dark .badge-success {
      background-color: var(--color-success-900);
      color: var(--color-success-300);
    }

    .badge-warning {
      background-color: var(--color-warning-100);
      color: var(--color-warning-700);
    }

    .dark .badge-warning {
      background-color: var(--color-warning-900);
      color: var(--color-warning-300);
    }

    .badge-error {
      background-color: var(--color-error-100);
      color: var(--color-error-700);
    }

    .dark .badge-error {
      background-color: var(--color-error-900);
      color: var(--color-error-300);
    }

    .badge-info {
      background-color: var(--color-info-100);
      color: var(--color-info-700);
    }

    .dark .badge-info {
      background-color: var(--color-info-900);
      color: var(--color-info-300);
    }

    .badge-neutral {
      background-color: var(--color-neutral-100);
      color: var(--color-neutral-700);
    }

    .dark .badge-neutral {
      background-color: var(--color-neutral-800);
      color: var(--color-neutral-300);
    }

    /* Dot indicator */
    .badge-dot {
      width: 6px;
      height: 6px;
      border-radius: var(--radius-full);
      background-color: currentColor;
    }

    .badge-sm .badge-dot {
      width: 4px;
      height: 4px;
    }
  `]
})
export class BadgeComponent {
  variant = input<BadgeVariant>('neutral');
  size = input<BadgeSize>('md');
  dot = input(false);
  ariaLabel = input('');

  computedClasses = computed(() => {
    return ['badge', `badge-${this.size()}`, `badge-${this.variant()}`].join(' ');
  });
}