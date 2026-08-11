import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

@Component({
  selector: 'pg-avatar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="avatar"
      [class]="computedClasses()"
      [style.background-color]="backgroundColor()"
      [attr.aria-label]="ariaLabel()"
      role="img"
    >
      <img
        *ngIf="src()"
        [src]="src()"
        [alt]="alt()"
        class="avatar-img"
        (error)="onImageError()"
      />
      <span *ngIf="!src() && !hasImage()" class="avatar-text">{{ initials() }}</span>
      <span *ngIf="!src() && hasImage()" class="avatar-fallback" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M18 10a6 6 0 01-6 6 6 6 0 01-6-6H6a8 8 0 1116 0h-2.586" />
        </svg>
      </span>
    </div>
  `,
  styles: [`
    :host {
      display: inline-flex;
    }

    .avatar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-full);
      background-color: var(--color-primary-100);
      color: var(--color-primary-700);
      font-weight: var(--font-weight-bold);
      overflow: hidden;
      flex-shrink: 0;
    }

    .dark .avatar {
      background-color: var(--color-primary-900);
      color: var(--color-primary-300);
    }

    /* Sizes */
    .avatar-xs {
      width: 24px;
      height: 24px;
      font-size: 10px;
    }

    .avatar-sm {
      width: 32px;
      height: 32px;
      font-size: var(--font-size-xs);
    }

    .avatar-md {
      width: 40px;
      height: 40px;
      font-size: var(--font-size-sm);
    }

    .avatar-lg {
      width: 56px;
      height: 56px;
      font-size: var(--font-size-lg);
    }

    .avatar-xl {
      width: 72px;
      height: 72px;
      font-size: var(--font-size-xl);
    }

    .avatar-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .avatar-text {
      line-height: 1;
      text-transform: uppercase;
    }

    .avatar-fallback {
      width: 50%;
      height: 50%;
      color: currentColor;
    }
  `]
})
export class AvatarComponent {
  src = input('');
  alt = input('');
  name = input('');
  size = input<AvatarSize>('md');
  ariaLabel = input('');
  shape = input<'circle' | 'square'>('circle');

  hasImage = computed(() => !!this.src());
  initials = computed(() => {
    const n = this.name();
    if (!n) return '?';
    const parts = n.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  });

  backgroundColor = computed(() => {
    // Generate consistent color from name
    const n = this.name() || this.src() || '';
    let hash = 0;
    for (let i = 0; i < n.length; i++) {
      hash = n.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 55%, 45%)`;
  });

  computedClasses = computed(() => {
    return ['avatar', `avatar-${this.size()}`, `avatar-${this.shape()}`].join(' ');
  });

  onImageError(): void {
    // Image failed to load, will show initials/fallback
  }
}