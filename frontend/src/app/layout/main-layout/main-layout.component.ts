import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { AvatarComponent } from '../../shared/components/avatar/avatar.component';
import { AiAssistantComponent } from '../../shared/components/ai-assistant/ai-assistant.component';

import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ButtonComponent,
    AvatarComponent,
    AiAssistantComponent,

  ],
  template: `
    <div class="main-layout">
      <!-- Top Header Bar -->
      <header class="top-header">
        <div class="header-left clickable-brand" routerLink="/accounts/dashboard">
          <div class="header-logo">
            <img src="assets/PayGate_Logo.jpg" alt="PayGate" class="header-logo-img">
          </div>
          <div class="header-brand-text">
            <span class="header-brand-title">PayGate <span class="header-brand-badge">PRO</span></span>
            <span class="header-brand-sub">Smart Payment & Credit</span>
          </div>
        </div>



        <div class="header-right">
          <pg-avatar
            [name]="getDisplayName()"
            size="sm"
            class="header-avatar"
          ></pg-avatar>
          <div class="header-user-info">
            <span class="header-user-name">{{ getDisplayName() }}</span>
          </div>
          <button class="header-logout-btn" (click)="logout()" title="Logout">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      <!-- Main Content Container -->
      <main class="main-content">
        <div class="content-body">
          <router-outlet></router-outlet>
        </div>
      </main>

      <!-- Global AI Financial Assistant Chatbot Floating Widget -->
      <pg-ai-assistant />
    </div>
  `,
  styles: [`
    .main-layout {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      background-color: #f8fafc;
      font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    /* Top Header */
    .top-header {
      position: sticky;
      top: 0;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      padding: 0 28px;
      height: 64px;
      background: rgba(255,255,255,0.92);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-bottom: 1px solid #f3d6e5;
      box-shadow: 0 2px 20px rgba(194,0,103,0.04);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
      cursor: pointer;
      user-select: none;
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;
    }
    .header-left:hover {
      transform: translateY(-1px);
      opacity: 0.9;
    }

    .header-logo {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(194,0,103,0.18);
      border: 1px solid rgba(244,114,182,0.3);
      flex-shrink: 0;
    }
    .header-logo-img { width: 100%; height: 100%; object-fit: cover; }

    .header-brand-text { display: flex; flex-direction: column; }
    .header-brand-title {
      font-weight: 900;
      font-size: 1.05rem;
      color: #0d2b5c;
      line-height: 1.2;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .header-brand-badge {
      font-size: 0.6rem;
      font-weight: 800;
      background: linear-gradient(135deg, #c20067 0%, #0072ce 100%);
      color: #fff;
      padding: 1px 5px;
      border-radius: 5px;
    }
    .header-brand-sub {
      font-size: 0.68rem;
      color: #94a3b8;
      font-weight: 600;
    }

    /* Header Nav */
    .header-nav {
      display: flex;
      align-items: center;
      gap: 4px;
      flex: 1;
      justify-content: center;
    }
    .header-nav-link {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 10px;
      font-size: 0.82rem;
      font-weight: 700;
      color: #64748b;
      text-decoration: none;
      transition: all 0.15s;
      border: 1px solid transparent;
    }
    .header-nav-link:hover {
      color: #c20067;
      background: #fff0f6;
      border-color: #f8bbd0;
    }
    .header-nav-link.active {
      color: #c20067;
      background: #fff0f6;
      border-color: #f8bbd0;
      box-shadow: 0 2px 10px rgba(194,0,103,0.08);
    }

    /* Header Right */
    .header-right {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }
    .header-user-info {
      display: flex;
      flex-direction: column;
    }
    .header-user-name {
      font-size: 0.85rem;
      font-weight: 700;
      color: #0d2b5c;
    }
    .header-logout-btn {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      border: 1px solid #fee2e2;
      background: #fef2f2;
      color: #ef4444;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s;
    }
    .header-logout-btn:hover {
      background: #fee2e2;
      color: #dc2626;
    }
    .header-logout-btn svg {
      width: 16px;
      height: 16px;
    }

    /* Main Content */
    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .content-body {
      flex: 1;
      padding: 28px 32px;
      max-width: 1440px;
      width: 100%;
      margin: 0 auto;
      box-sizing: border-box;
    }

    @media (max-width: 1024px) {
      .header-nav { display: none; }
      .top-header { padding: 0 16px; }
      .content-body { padding: 20px 16px; }
    }
    @media (max-width: 480px) {
      .header-user-info { display: none; }
      .content-body { padding: 16px 12px; }
    }
  `]
})
export class MainLayoutComponent {
  authService = inject(AuthService);
  private router = inject(Router);
  private notification = inject(NotificationService);

  isAdmin = computed(() => this.authService.getRole() === 'ADMIN' || this.authService.getRole() === 'ROLE_ADMIN');

  getDisplayName(): string {
    const user = this.authService.getUsername();
    if (!user) return 'User';
    return user.split('@')[0];
  }

  logout(): void {
    this.authService.logout();
  }
}
