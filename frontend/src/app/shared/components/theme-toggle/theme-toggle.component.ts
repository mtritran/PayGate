import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'pg-theme-toggle',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatMenuModule],
  template: `
    <div class="theme-toggle" [matMenuTriggerFor]="themeMenu">
      <button
        mat-icon-button
        class="theme-toggle-btn"
        [attr.aria-label]="tooltip()"
        (click)="$event.stopPropagation()"
      >
        <mat-icon>{{ icon() }}</mat-icon>
      </button>
    </div>

    <mat-menu #themeMenu="matMenu" xPosition="before" class="theme-menu">
      <button mat-menu-item (click)="themeService.setMode('light')">
        <mat-icon [class.active]="themeService.theme() === 'light'">light_mode</mat-icon>
        <span>Light</span>
      </button>
      <button mat-menu-item (click)="themeService.setMode('dark')">
        <mat-icon [class.active]="themeService.theme() === 'dark'">dark_mode</mat-icon>
        <span>Dark</span>
      </button>
      <button mat-menu-item (click)="themeService.setMode('system')">
        <mat-icon [class.active]="themeService.mode() === 'system'">brightness_auto</mat-icon>
        <span>System</span>
      </button>
    </mat-menu>
  `,
  styles: [`
    .theme-toggle {
      position: relative;
    }

    .theme-toggle-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: var(--radius-md);
      color: var(--color-text-secondary);
      transition: all var(--transition-fast);
    }

    .theme-toggle-btn:hover {
      background-color: var(--color-bg-hover);
      color: var(--color-text-primary);
    }

    .theme-toggle-btn:focus-visible {
      outline: none;
      box-shadow: 0 0 0 2px var(--color-primary-500);
    }

    .theme-menu {
      min-width: 140px;
    }

    .theme-menu ::ng-deep .mat-mdc-menu-item {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }

    .theme-menu ::ng-deep .mat-mdc-menu-item .mat-icon {
      color: var(--color-text-tertiary);
      transition: color var(--transition-fast);
    }

    .theme-menu ::ng-deep .mat-mdc-menu-item .mat-icon.active {
      color: var(--color-primary-500);
    }
  `]
})
export class ThemeToggleComponent {
  themeService = inject(ThemeService);

  icon = computed(() => {
    switch (this.themeService.theme()) {
      case 'dark': return 'dark_mode';
      case 'light': return 'light_mode';
      default: return 'brightness_auto';
    }
  });

  tooltip = computed(() => {
    switch (this.themeService.theme()) {
      case 'dark': return 'Switch to light mode';
      case 'light': return 'Switch to dark mode';
      default: return 'Follow system theme';
    }
  });
}