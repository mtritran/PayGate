import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'pg-empty-state',
  standalone: true,
  imports: [CommonModule, MatIconModule, ButtonComponent],
  template: `
    <div class="empty-state">
      <div class="empty-state-icon" [ngClass]="iconVariant()">
        <mat-icon *ngIf="icon(); else customIcon">{{ icon() }}</mat-icon>
        <ng-template #customIcon>
          <span [innerHTML]="svgIcon()"></span>
        </ng-template>
      </div>

      <h3 class="empty-state-title">{{ title() }}</h3>
      <p class="empty-state-message">{{ message() }}</p>

      <div class="empty-state-actions" *ngIf="actionLabel()">
        <pg-button
          variant="primary"
          size="md"
          (clicked)="actionClick.emit()"
        >
          {{ actionLabel() }}
        </pg-button>
      </div>
    </div>
  `,
  styles: [`
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--space-12) var(--space-4);
      text-align: center;
    }

    .empty-state-icon {
      width: 80px;
      height: 80px;
      border-radius: var(--radius-full);
      background-color: var(--color-bg-tertiary);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: var(--space-6);
      color: var(--color-text-tertiary);
    }

    .empty-state-icon.warning {
      background-color: var(--color-warning-100);
      color: var(--color-warning-700);
    }

    .empty-state-icon.error {
      background-color: var(--color-error-100);
      color: var(--color-error-700);
    }

    .empty-state-icon.info {
      background-color: var(--color-info-100);
      color: var(--color-info-700);
    }

    .empty-state-icon.success {
      background-color: var(--color-success-100);
      color: var(--color-success-700);
    }

    .dark .empty-state-icon.warning {
      background-color: var(--color-warning-900);
      color: var(--color-warning-300);
    }

    .dark .empty-state-icon.error {
      background-color: var(--color-error-900);
      color: var(--color-error-300);
    }

    .dark .empty-state-icon.info {
      background-color: var(--color-info-900);
      color: var(--color-info-300);
    }

    .dark .empty-state-icon.success {
      background-color: var(--color-success-900);
      color: var(--color-success-300);
    }

    .empty-state-icon mat-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
    }

    .empty-state-icon svg {
      width: 36px;
      height: 36px;
    }

    .empty-state-title {
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-primary);
      margin: 0 0 var(--space-2);
    }

    .empty-state-message {
      font-size: var(--font-size-sm);
      color: var(--color-text-tertiary);
      margin: 0 0 var(--space-6);
      max-width: 320px;
      line-height: var(--line-height-relaxed);
    }

    .empty-state-actions {
      margin-top: var(--space-2);
    }
  `]
})
export class EmptyStateComponent {
  icon = input<string>('');
  svgIcon = input<string>('');
  title = input('No data found');
  message = input('There is nothing to display at the moment.');
  actionLabel = input<string>('');
  variant = input<'default' | 'warning' | 'error' | 'info' | 'success'>('default');
  actionClick = output<void>();

  iconVariant = computed(() => this.variant());
}