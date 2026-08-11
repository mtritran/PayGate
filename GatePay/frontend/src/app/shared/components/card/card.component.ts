import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'filled';

@Component({
  selector: 'pg-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <article [class]="computedClasses()">
      <header class="card-header" *ngIf="hasHeader()">
        <h3 class="card-title">{{ title() }}</h3>
        <p class="card-subtitle" *ngIf="subtitle()">{{ subtitle() }}</p>
        <ng-content select="[slot=header-action]" *ngIf="hasHeaderAction()"></ng-content>
      </header>

      <div class="card-body">
        <ng-content></ng-content>
      </div>

      <footer class="card-footer" *ngIf="hasFooter()">
        <ng-content select="[slot=footer]"></ng-content>
      </footer>
    </article>
  `,
  styles: [`
    :host {
      display: block;
    }

    .card {
      background-color: var(--color-bg-secondary);
      border: 1px solid var(--color-border-primary);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-sm);
      transition: box-shadow var(--transition-normal), border-color var(--transition-normal);
      overflow: hidden;
    }

    .card:hover {
      box-shadow: var(--shadow-md);
      border-color: var(--color-border-secondary);
    }

    /* Variants */
    .card-elevated {
      box-shadow: var(--shadow-lg);
    }

    .card-elevated:hover {
      box-shadow: var(--shadow-xl);
    }

    .card-outlined {
      box-shadow: none;
      border-width: 2px;
    }

    .card-filled {
      background-color: var(--color-bg-tertiary);
      border: none;
    }

    .card-filled:hover {
      background-color: var(--color-bg-tertiary);
    }

    /* Header */
    .card-header {
      padding: var(--space-6) var(--space-6) var(--space-4);
      border-bottom: 1px solid var(--color-border-primary);
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-4);
    }

    .card-title {
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-primary);
      margin: 0;
      line-height: var(--line-height-tight);
    }

    .card-subtitle {
      font-size: var(--font-size-sm);
      color: var(--color-text-tertiary);
      margin: var(--space-1) 0 0;
      line-height: var(--line-height-normal);
    }

    /* Body */
    .card-body {
      padding: var(--space-6);
    }

    /* Footer */
    .card-footer {
      padding: var(--space-4) var(--space-6);
      border-top: 1px solid var(--color-border-primary);
      background-color: var(--color-bg-tertiary);
    }
  `]
})
export class CardComponent {
  title = input('');
  subtitle = input('');
  variant = input<CardVariant>('default');
  hasHeaderAction = input(false);
  hasFooter = input(false);

  hasHeader = computed(() => !!this.title() || !!this.subtitle() || this.hasHeaderAction());

  computedClasses = computed(() => {
    return ['card', `card-${this.variant()}`].join(' ');
  });
}