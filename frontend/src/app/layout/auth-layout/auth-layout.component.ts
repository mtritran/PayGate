import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <div class="auth-layout">
      <!-- Background decoration -->
      <div class="auth-bg">
        <div class="auth-bg-shape auth-bg-shape-1"></div>
        <div class="auth-bg-shape auth-bg-shape-2"></div>
        <div class="auth-bg-shape auth-bg-shape-3"></div>
      </div>

      <!-- Brand header -->
      <header class="auth-header">
        <div class="auth-brand">
          <div class="auth-brand-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div class="auth-brand-text">
            <div class="auth-brand-title">PayGate</div>
            <div class="auth-brand-subtitle">Payment Gateway</div>
          </div>
        </div>
      </header>

      <!-- Main content -->
      <main class="auth-main">
        <router-outlet></router-outlet>
      </main>

      <!-- Footer -->
      <footer class="auth-footer">
        <p>&copy; {{ currentYear }} PayGate. All rights reserved.</p>
      </footer>
    </div>
  `,
  styles: [`
    .auth-layout {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background-color: var(--color-bg-primary);
      font-family: var(--font-family-sans);
      position: relative;
      overflow: hidden;
    }

    /* Background decorations */
    .auth-bg {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 0;
    }

    .auth-bg-shape {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      opacity: 0.15;
    }

    .auth-bg-shape-1 {
      width: 400px;
      height: 400px;
      background-color: var(--color-primary-500);
      top: -100px;
      right: -100px;
    }

    .auth-bg-shape-2 {
      width: 300px;
      height: 300px;
      background-color: var(--color-purple-500);
      bottom: 20%;
      left: -50px;
    }

    .auth-bg-shape-3 {
      width: 200px;
      height: 200px;
      background-color: var(--color-info-500);
      top: 40%;
      right: 10%;
    }

    .dark .auth-bg-shape-1 {
      background-color: var(--color-primary-400);
    }

    .dark .auth-bg-shape-2 {
      background-color: var(--color-purple-400);
    }

    .dark .auth-bg-shape-3 {
      background-color: var(--color-info-400);
    }

    /* Header */
    .auth-header {
      position: relative;
      z-index: 1;
      padding: var(--space-6) var(--space-4);
    }

    .auth-brand {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      max-width: 420px;
      margin: 0 auto;
    }

    .auth-brand-logo {
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-700));
      border-radius: var(--radius-lg);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .auth-brand-logo svg {
      width: 24px;
      height: 24px;
      color: white;
    }

    .auth-brand-title {
      font-weight: var(--font-weight-bold);
      font-size: var(--font-size-xl);
      color: var(--color-text-primary);
      line-height: 1.2;
    }

    .auth-brand-subtitle {
      font-size: var(--font-size-sm);
      color: var(--color-text-tertiary);
    }

    /* Main */
    .auth-main {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-6) var(--space-4);
      position: relative;
      z-index: 1;
    }

    /* Footer */
    .auth-footer {
      position: relative;
      z-index: 1;
      padding: var(--space-4);
      text-align: center;
      color: var(--color-text-tertiary);
      font-size: var(--font-size-xs);
      border-top: 1px solid var(--color-border-primary);
      background-color: var(--color-bg-secondary);
    }

    /* Card container for child routes */
    .auth-card-container {
      width: 100%;
      max-width: 440px;
    }

    @media (max-width: 480px) {
      .auth-header {
        padding: var(--space-4);
      }

      .auth-main {
        padding: var(--space-4);
      }
    }
  `]
})
export class AuthLayoutComponent {
  currentYear = new Date().getFullYear();
}