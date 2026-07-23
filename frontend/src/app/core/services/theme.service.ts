import { Injectable, signal, computed, effect, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DOCUMENT } from '@angular/common';

export type ThemeMode = 'light' | 'dark' | 'system';
export type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private platformId = inject(PLATFORM_ID);
  private document = inject(DOCUMENT);

  // Current mode (user preference: light, dark, system)
  mode = signal<ThemeMode>('system');

  // Resolved theme (actual applied theme)
  theme = signal<Theme>('light');

  // Media query for system preference
  mediaQuery: MediaQueryList | null = null;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.initMediaQuery();
      this.loadPreference();
      this.applyTheme();
    }
  }

  private initMediaQuery(): void {
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.mediaQuery.addEventListener('change', this.onSystemThemeChange.bind(this));
  }

  private onSystemThemeChange(event: MediaQueryListEvent): void {
    if (this.mode() === 'system') {
      const newTheme = event.matches ? 'dark' : 'light';
      this.theme.set(newTheme);
      this.applyTheme();
    }
  }

  private loadPreference(): void {
    const saved = localStorage.getItem('theme-mode') as ThemeMode | null;
    if (saved && ['light', 'dark', 'system'].includes(saved)) {
      this.mode.set(saved);
      this.resolveTheme();
    }
  }

  private resolveTheme(): void {
    const m = this.mode();
    if (m === 'system') {
      this.theme.set(this.mediaQuery?.matches ? 'dark' : 'light');
    } else {
      this.theme.set(m);
    }
  }

  private applyTheme(): void {
    const t = this.theme();
    const html = this.document.documentElement;

    if (t === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }

    // Set CSS custom property for dynamic theming
    html.style.setProperty('--current-theme', t);
  }

  setMode(mode: ThemeMode): void {
    this.mode.set(mode);
    localStorage.setItem('theme-mode', mode);
    this.resolveTheme();
    this.applyTheme();
  }

  toggleTheme(): void {
    const current = this.theme();
    const newTheme = current === 'light' ? 'dark' : 'light';
    this.theme.set(newTheme);

    // If toggling manually, set mode to explicit (not system)
    if (this.mode() === 'system') {
      this.mode.set(newTheme);
      localStorage.setItem('theme-mode', newTheme);
    }

    this.applyTheme();
  }

  // Get resolved theme for current mode
  getResolvedTheme(): Theme {
    return this.theme();
  }

  // Check if system preference is dark
  isSystemDark(): boolean {
    return this.mediaQuery?.matches ?? false;
  }
}