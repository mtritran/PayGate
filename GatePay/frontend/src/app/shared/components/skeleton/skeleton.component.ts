import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export type SkeletonVariant = 'text' | 'circular' | 'rectangular' | 'card';

@Component({
  selector: 'pg-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="skeleton"
      [class]="computedClasses()"
      [style.width]="width()"
      [style.height]="height()"
      [style.border-radius]="borderRadius()"
      aria-hidden="true"
    ></div>
  `,
  styles: [`
    .skeleton {
      background: linear-gradient(
        90deg,
        var(--color-bg-tertiary) 25%,
        var(--color-bg-hover) 50%,
        var(--color-bg-tertiary) 75%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: var(--radius-md);
    }

    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    .skeleton-text {
      height: 1rem;
      border-radius: var(--radius-sm);
    }

    .skeleton-text-lg {
      height: 1.25rem;
    }

    .skeleton-circular {
      border-radius: var(--radius-full);
    }

    .skeleton-rectangular {
      border-radius: var(--radius-md);
    }

    .skeleton-card {
      border-radius: var(--radius-xl);
    }
  `]
})
export class SkeletonComponent {
  variant = input<SkeletonVariant>('text');
  width = input('100%');
  height = input('');
  customBorderRadius = input('');

  borderRadius = computed(() => this.customBorderRadius() || this.getDefaultBorderRadius());

  getDefaultBorderRadius(): string {
    switch (this.variant()) {
      case 'circular': return 'var(--radius-full)';
      case 'text': return 'var(--radius-sm)';
      case 'rectangular': return 'var(--radius-md)';
      case 'card': return 'var(--radius-xl)';
      default: return 'var(--radius-md)';
    }
  }

  computedClasses = computed(() => `skeleton skeleton-${this.variant()}`);
}