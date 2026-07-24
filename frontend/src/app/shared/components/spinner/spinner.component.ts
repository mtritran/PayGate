import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

@Component({
  selector: 'pg-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="spinner"
      [class]="computedClasses()"
      [attr.aria-label]="ariaLabel()"
      role="status"
      [style.width.px]="sizePx()"
      [style.height.px]="sizePx()"
    >
      <svg viewBox="0 0 24 24" fill="none" class="spinner-svg">
        <circle
          class="spinner-track"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="3"
          stroke-opacity="0.15"
        />
        <circle
          class="spinner-path"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="3"
          stroke-linecap="round"
          stroke-dasharray="31.4 31.4"
        />
      </svg>
    </div>
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .spinner {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--color-primary-500);
    }

    .spinner-svg {
      width: 100%;
      height: 100%;
      animation: spin 1s linear infinite;
    }

    .spinner-path {
      stroke-dashoffset: 0;
      animation: dash 1.5s ease-in-out infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @keyframes dash {
      0% { stroke-dasharray: 1, 150; stroke-dashoffset: 0; }
      50% { stroke-dasharray: 90, 150; stroke-dashoffset: -35; }
      100% { stroke-dasharray: 90, 150; stroke-dashoffset: -124; }
    }

    /* Size variants */
    .spinner-xs { width: 16px; height: 16px; }
    .spinner-sm { width: 20px; height: 20px; }
    .spinner-md { width: 24px; height: 24px; }
    .spinner-lg { width: 32px; height: 32px; }
    .spinner-xl { width: 48px; height: 48px; }
  `]
})
export class SpinnerComponent {
  size = input<SpinnerSize>('md');
  ariaLabel = input('Loading');

  private sizeMap: Record<SpinnerSize, number> = {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 32,
    xl: 48
  };

  sizePx = computed(() => this.sizeMap[this.size()]);

  computedClasses = computed(() => `spinner spinner-${this.size()}`);
}