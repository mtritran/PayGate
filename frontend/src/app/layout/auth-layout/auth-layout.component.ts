import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <div class="auth-layout">
      <!-- Ambient Glowing Orbs Background -->
      <div class="auth-bg">
        <div class="auth-bg-shape auth-bg-shape-1"></div>
        <div class="auth-bg-shape auth-bg-shape-2"></div>
        <div class="auth-bg-shape auth-bg-shape-3"></div>
      </div>

      <!-- Header Branding -->
      <header class="auth-header">
        <div class="auth-brand">
          <div class="auth-brand-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div class="auth-brand-text">
            <div class="auth-brand-title">PayGate</div>
            <div class="auth-brand-subtitle">Enterprise Payment Gateway</div>
          </div>
        </div>
      </header>

      <!-- Main Content (Login/Register Card) -->
      <main class="auth-main">
        <router-outlet></router-outlet>
      </main>

      <!-- Footer -->
      <footer class="auth-footer">
        <p>&copy; {{ currentYear }} PayGate Inc. Secure Payment Infrastructure.</p>
      </footer>
    </div>
  `,
  styles: [`
    .auth-layout {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%);
      font-family: 'Inter', system-ui, sans-serif;
      position: relative;
      overflow: hidden;
    }

    .dark .auth-layout {
      background: linear-gradient(135deg, #0f172a 0%, #020617 100%);
    }

    /* Ambient Glow Background Circles */
    .auth-bg {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 0;
    }

    .auth-bg-shape {
      position: absolute;
      border-radius: 50%;
      filter: blur(100px);
      opacity: 0.25;
    }

    .auth-bg-shape-1 {
      width: 450px;
      height: 450px;
      background: #10b981;
      top: -120px;
      right: -100px;
    }

    .auth-bg-shape-2 {
      width: 380px;
      height: 380px;
      background: #0284c7;
      bottom: -80px;
      left: -80px;
    }

    .auth-bg-shape-3 {
      width: 250px;
      height: 250px;
      background: #8b5cf6;
      top: 40%;
      right: 15%;
      opacity: 0.15;
    }

    /* Header */
    .auth-header {
      position: relative;
      z-index: 1;
      padding: 24px 32px;
    }

    .auth-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      max-width: 440px;
      margin: 0 auto;
    }

    .auth-brand-logo {
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 4px 14px rgba(5, 150, 105, 0.3);
    }

    .auth-brand-logo svg {
      width: 24px;
      height: 24px;
      color: #ffffff;
    }

    .auth-brand-title {
      font-weight: 800;
      font-size: 1.35rem;
      color: #0f172a;
      line-height: 1.1;
      letter-spacing: -0.02em;
    }

    .dark .auth-brand-title {
      color: #f8fafc;
    }

    .auth-brand-subtitle {
      font-size: 0.78rem;
      color: #64748b;
      font-weight: 500;
    }

    /* Main Container */
    .auth-main {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px 24px 40px;
      position: relative;
      z-index: 1;
    }

    /* Footer */
    .auth-footer {
      position: relative;
      z-index: 1;
      padding: 16px 24px;
      text-align: center;
      color: #94a3b8;
      font-size: 0.78rem;
      border-top: 1px solid rgba(226, 232, 240, 0.6);
      background-color: rgba(255, 255, 255, 0.4);
      backdrop-filter: blur(10px);
    }

    .dark .auth-footer {
      background-color: rgba(15, 23, 42, 0.4);
      border-color: rgba(51, 65, 85, 0.5);
    }

    .auth-footer p {
      margin: 0;
    }
  `]
})
export class AuthLayoutComponent {
  currentYear = new Date().getFullYear();
}