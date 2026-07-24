import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { AvatarComponent } from '../../shared/components/avatar/avatar.component';
import { AiAssistantComponent } from '../../shared/components/ai-assistant/ai-assistant.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ButtonComponent,
    AvatarComponent,
    AiAssistantComponent
  ],
  template: `
    <div class="main-layout">
      <!-- Sidenav -->
      <aside class="sidenav" [class.sidenav-collapsed]="collapsed()">
        <!-- Brand Header -->
        <div class="brand-header">
          <div class="brand-logo" (click)="collapsed() && toggleCollapse()" [title]="collapsed() ? 'Expand sidebar' : ''">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div class="brand-text" *ngIf="!collapsed()">
            <div class="brand-title">PayGate</div>
            <div class="brand-subtitle">Payment Gateway</div>
          </div>
        </div>

        <!-- Navigation -->
        <nav class="nav-wrapper" aria-label="Main navigation">
          <!-- Wallet Section -->
          <div class="nav-section" *ngIf="!collapsed()">
            <div class="nav-section-label">Wallet & Payments</div>
          </div>
          <ul class="nav-list" role="list">
            <li class="nav-item">
              <a class="nav-link" routerLink="/accounts/dashboard" routerLinkActive="active" title="Dashboard">
                <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
                <span class="nav-title" *ngIf="!collapsed()">Dashboard</span>
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" routerLink="/accounts/me" routerLinkActive="active" title="My Account">
                <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 12V7H5a2 2 0 01-2-2V3a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 01-2 2" />
                  <path d="M3 17v2a2 2 0 002 2h14a2 2 0 002-2v-2" />
                  <path d="M12 12a2 2 0 100-4 2 2 0 000 4z" />
                </svg>
                <span class="nav-title" *ngIf="!collapsed()">My Account</span>
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" routerLink="/transactions/history" routerLinkActive="active" title="Transactions">
                <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
                <span class="nav-title" *ngIf="!collapsed()">Transactions</span>
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" routerLink="/transactions/pay" routerLinkActive="active" title="Send Payment">
                <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
                <span class="nav-title" *ngIf="!collapsed()">Send Payment</span>
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" routerLink="/accounts/topup" routerLinkActive="active" title="Top Up Wallet">
                <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span class="nav-title" *ngIf="!collapsed()">Top Up Wallet</span>
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" routerLink="/recurring-payments" routerLinkActive="active" title="Lịch Định Kỳ & Hóa Đơn">
                <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span class="nav-title" *ngIf="!collapsed()">Lịch Định Kỳ & Hóa Đơn</span>
              </a>
            </li>
          </ul>

          <!-- Merchant Section -->
          <div class="nav-section" *ngIf="!collapsed()">
            <div class="nav-section-label">Merchant & Business</div>
          </div>
          <ul class="nav-list" role="list">
            <li class="nav-item">
              <a class="nav-link" routerLink="/merchant/register" routerLinkActive="active" title="Merchant Partner">
                <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                <span class="nav-title" *ngIf="!collapsed()">Merchant Partner</span>
              </a>
            </li>
            <!-- Collapse/Expand Sidebar Toggle directly below Merchant Partner -->
            <li class="nav-item">
              <button type="button" class="nav-link nav-collapse-btn" (click)="toggleCollapse()" [title]="collapsed() ? 'Expand Sidebar' : 'Collapse Sidebar'">
                <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" *ngIf="!collapsed()">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" *ngIf="collapsed()">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                <span class="nav-title" *ngIf="!collapsed()">Collapse Sidebar</span>
              </button>
            </li>
          </ul>

          <!-- Admin Section (only for ADMIN role) -->
          <div class="nav-section" *ngIf="isAdmin() && !collapsed()">
            <div class="nav-section-label">Admin</div>
          </div>
          <ul class="nav-list" role="list" *ngIf="isAdmin()">
            <li class="nav-item">
              <a class="nav-link" routerLink="/admin/dashboard" routerLinkActive="active" title="Admin Dashboard">
                <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 20V10" />
                  <path d="M12 20V4" />
                  <path d="M6 20v-6" />
                </svg>
                <span class="nav-title" *ngIf="!collapsed()">Overview</span>
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" routerLink="/admin/merchants" routerLinkActive="active" title="Merchants">
                <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span class="nav-title" *ngIf="!collapsed()">Merchants</span>
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" routerLink="/users" routerLinkActive="active" title="User Management">
                <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span class="nav-title" *ngIf="!collapsed()">Users</span>
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" routerLink="/admin/ledger" routerLinkActive="active" title="Ledger">
                <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                </svg>
                <span class="nav-title" *ngIf="!collapsed()">Ledger</span>
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" routerLink="/admin/webhooks" routerLinkActive="active" title="Webhook Logs">
                <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                <span class="nav-title" *ngIf="!collapsed()">Webhook Logs</span>
              </a>
            </li>
          </ul>
        </nav>

        <!-- Sidebar Profile Footer -->
        <div class="sidebar-profile-footer">
          <!-- Expanded Profile View -->
          <div *ngIf="!collapsed()" class="profile-expanded">
            <div class="profile-user-card">
              <pg-avatar
                [name]="getDisplayName()"
                size="sm"
                class="profile-avatar"
              ></pg-avatar>
              <span class="profile-name">{{ getDisplayName() }}</span>
            </div>
            
            <button class="btn-sidebar-logout" (click)="logout()" title="Logout">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Logout</span>
            </button>
          </div>

          <!-- Collapsed Profile View -->
          <div *ngIf="collapsed()" class="profile-collapsed">
            <pg-avatar
              [name]="getDisplayName()"
              size="sm"
              class="profile-avatar-sm"
              [title]="getDisplayName()"
            ></pg-avatar>
            <button class="btn-sidebar-logout-sm" (click)="logout()" title="Logout">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <!-- Main Content Container -->
      <main class="main-content" [class.main-content-expanded]="collapsed()">
        <!-- Mobile Floating Menu Toggle (Visible ONLY on Mobile) -->
        <button class="mobile-toggle-btn" *ngIf="isMobile()" (click)="toggleCollapse()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <!-- Page Content Body -->
        <div class="content-body">
          <router-outlet></router-outlet>
        </div>
      </main>

      <!-- Global AI Financial Assistant Chatbot Floating Widget -->
      <pg-ai-assistant />
    </div>

    <!-- Overlay for mobile -->
    <div class="sidenav-overlay" *ngIf="isMobile() && !collapsed()" (click)="closeOnMobile()"></div>
  `,
  styles: [`
    .main-layout {
      display: flex;
      min-height: 100vh;
      background-color: var(--color-bg-primary);
      font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      transition: margin-left var(--transition-normal);
    }

    /* Sidenav */
    .sidenav {
      position: fixed;
      top: 0;
      left: 0;
      height: 100vh;
      width: var(--sidebar-width);
      background-color: var(--color-bg-secondary);
      border-right: 1px solid var(--color-border-primary);
      display: flex;
      flex-direction: column;
      z-index: var(--z-fixed);
      transition: width var(--transition-normal), transform var(--transition-normal);
    }

    .sidenav-collapsed {
      width: var(--sidebar-width-collapsed);
    }

    .sidenav-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.3);
      z-index: var(--z-sticky);
    }

    /* Brand Header */
    .brand-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 16px;
      border-bottom: 1px solid var(--color-border-primary);
      min-height: 64px;
      box-sizing: border-box;
    }

    .sidenav-collapsed .brand-header {
      padding: 16px 0;
      justify-content: center;
    }

    .brand-logo {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 2px 6px rgba(5, 150, 105, 0.25);
    }

    .brand-logo svg {
      width: 22px;
      height: 22px;
      color: #ffffff;
    }

    .brand-text {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      flex: 1;
    }

    .brand-title {
      font-weight: var(--font-weight-bold);
      font-size: 1.05rem;
      color: var(--color-text-primary);
      line-height: 1.2;
      white-space: nowrap;
      letter-spacing: -0.01em;
    }

    .brand-subtitle {
      font-size: var(--font-size-xs);
      color: var(--color-text-tertiary);
      white-space: nowrap;
    }

    /* Navigation */
    .nav-wrapper {
      flex: 1;
      padding: var(--space-3) var(--space-2);
      overflow-y: auto;
    }

    .nav-section-label {
      font-size: 0.65rem;
      font-weight: var(--font-weight-semibold);
      text-transform: uppercase;
      color: var(--color-text-tertiary);
      letter-spacing: 0.05em;
      padding: var(--space-4) var(--space-3) var(--space-2);
    }

    .nav-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .nav-item {
      margin-bottom: var(--space-1);
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-2) var(--space-3);
      border-radius: var(--radius-md);
      color: var(--color-text-secondary);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      text-decoration: none;
      transition: all var(--transition-fast);
      white-space: nowrap;
      width: 100%;
      border: none;
      background: transparent;
      cursor: pointer;
      box-sizing: border-box;
    }

    .sidenav-collapsed .nav-link {
      justify-content: center;
      padding: var(--space-2) 0;
    }

    .nav-link:hover {
      background-color: var(--color-bg-hover);
      color: var(--color-text-primary);
    }

    .nav-link.active {
      background-color: #ecfdf5;
      color: #059669;
      font-weight: var(--font-weight-semibold);
    }

    .dark .nav-link.active {
      background-color: rgba(5, 150, 105, 0.15);
      color: #34d399;
    }

    .nav-icon {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      color: var(--color-text-tertiary);
      transition: color var(--transition-fast);
    }

    .nav-link:hover .nav-icon,
    .nav-link.active .nav-icon {
      color: #059669;
    }

    .dark .nav-link:hover .nav-icon,
    .dark .nav-link.active .nav-icon {
      color: #34d399;
    }

    .nav-title {
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .nav-collapse-btn {
      margin-top: 4px;
      border-top: 1px dashed var(--color-border-primary);
      border-radius: 0;
      padding-top: 8px;
    }

    /* Sidebar Profile Footer */
    .sidebar-profile-footer {
      border-top: 1px solid var(--color-border-primary);
      padding: 14px 12px;
      background-color: var(--color-bg-secondary);
    }

    .profile-expanded {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .profile-user-card {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border-radius: 10px;
      background: var(--color-bg-tertiary);
    }

    .profile-name {
      font-size: 0.9rem;
      font-weight: 700;
      color: var(--color-text-primary);
      word-break: break-word;
      line-height: 1.3;
    }

    .btn-sidebar-logout {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 36px;
      width: 100%;
      border: 1px solid #fee2e2;
      background-color: #fef2f2;
      color: #ef4444;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s;
    }

    .btn-sidebar-logout:hover {
      background-color: #fee2e2;
      color: #dc2626;
    }

    .btn-sidebar-logout svg {
      width: 16px;
      height: 16px;
    }

    /* Collapsed Profile View */
    .profile-collapsed {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }

    .btn-sidebar-logout-sm {
      width: 32px;
      height: 32px;
      border: 1px solid #fee2e2;
      background-color: #fef2f2;
      color: #ef4444;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s;
    }

    .btn-sidebar-logout-sm:hover {
      background-color: #fee2e2;
      color: #dc2626;
    }

    .btn-sidebar-logout-sm svg {
      width: 15px;
      height: 15px;
    }

    /* Main Content Area */
    .main-content {
      flex: 1;
      margin-left: var(--sidebar-width);
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      transition: margin-left var(--transition-normal);
    }

    .main-content-expanded {
      margin-left: var(--sidebar-width-collapsed);
    }

    .mobile-toggle-btn {
      position: fixed;
      top: 14px;
      left: 14px;
      z-index: 9999;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      color: #0f172a;
      padding: 8px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      cursor: pointer;
    }

    .mobile-toggle-btn svg {
      width: 20px;
      height: 20px;
    }

    /* Content Body */
    .content-body {
      flex: 1;
      padding: 32px 40px;
      max-width: 1440px;
      width: 100%;
      margin: 0 auto;
      box-sizing: border-box;
    }

    /* Mobile Responsive */
    @media (max-width: 1024px) {
      .sidenav {
        transform: translateX(-100%);
      }

      .sidenav:not(.sidenav-collapsed) {
        transform: translateX(0);
        box-shadow: var(--shadow-xl);
      }

      .sidenav-overlay {
        display: block;
      }

      .main-content {
        margin-left: 0;
      }

      .main-content-expanded {
        margin-left: 0;
      }
    }

    @media (max-width: 768px) {
      .content-body {
        padding: 20px 16px;
      }
    }

    @media (max-width: 480px) {
      .top-header {
        padding: 0 12px;
      }
      .content-body {
        padding: 16px 12px;
      }
      .header-right {
        gap: 8px;
      }
      .header-user-menu {
        padding: 3px 8px 3px 4px;
      }
    }
  `]
})
export class MainLayoutComponent {
  authService = inject(AuthService);
  collapsed = signal(false);
  isMobile = signal(false);

  isAdmin = computed(() => this.authService.getRole() === 'ADMIN' || this.authService.getRole() === 'ROLE_ADMIN');

  constructor() {
    if (typeof window !== 'undefined') {
      this.isMobile.set(window.innerWidth < 1024);
      window.addEventListener('resize', this.onResize.bind(this));
    }
  }

  getDisplayName(): string {
    const user = this.authService.getUsername();
    if (!user) return 'User';
    return user.split('@')[0];
  }

  onResize(): void {
    this.isMobile.set(window.innerWidth < 1024);
    if (!this.isMobile()) {
      this.collapsed.set(false);
    }
  }

  toggleCollapse(): void {
    this.collapsed.update(v => !v);
  }

  closeOnMobile(): void {
    if (this.isMobile()) {
      this.collapsed.set(true);
    }
  }

  logout(): void {
    this.authService.logout();
  }
}