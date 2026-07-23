import { Component, input, output, signal, effect, inject, HostListener, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { AvatarComponent } from '../../shared/components/avatar/avatar.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ThemeToggleComponent,
    ButtonComponent,
    AvatarComponent
  ],
  template: `
    <div class="main-layout">
      <!-- Sidenav -->
      <aside class="sidenav" [class.sidenav-collapsed]="collapsed()">
        <!-- Brand Header -->
        <div class="brand-header">
          <div class="brand-logo">
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
            <div class="nav-section-label">Wallet</div>
          </div>
          <ul class="nav-list" role="list">
            <li class="nav-item">
              <a class="nav-link" routerLink="/accounts/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: false }" title="Dashboard">
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
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <polyline points="19 12 12 19 5 12" />
                </svg>
                <span class="nav-title" *ngIf="!collapsed()">Send Payment</span>
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" routerLink="/accounts/topup" routerLinkActive="active" title="Top Up">
                <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
                <span class="nav-title" *ngIf="!collapsed()">Top Up</span>
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" routerLink="/merchant/register" routerLinkActive="active" title="Merchant Partner Registration">
                <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                <span class="nav-title" *ngIf="!collapsed()">Merchant Partner</span>
              </a>
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

          <!-- General Section -->
          <div class="nav-section" *ngIf="!collapsed()">
            <div class="nav-section-label">General</div>
          </div>
          <ul class="nav-list" role="list">
            <li class="nav-item">
              <a class="nav-link" routerLink="/users" routerLinkActive="active" title="API Docs">
                <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                <span class="nav-title" *ngIf="!collapsed()">API Docs</span>
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" routerLink="/settings" routerLinkActive="active" title="Settings">
                <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
                </svg>
                <span class="nav-title" *ngIf="!collapsed()">Settings</span>
              </a>
            </li>
          </ul>
        </nav>

        <!-- Collapse Toggle -->
        <button class="collapse-toggle" (click)="toggleCollapse()" aria-label="Toggle sidebar" aria-expanded="!collapsed()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" *ngIf="!collapsed()">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" *ngIf="collapsed()">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </aside>

      <!-- Main Content Container -->
      <main class="main-content" [class.main-content-expanded]="collapsed()">
        <!-- Top Header Navigation Bar -->
        <header class="top-header">
          <!-- Left Section: Breadcrumb & Mobile Menu Button -->
          <div class="header-left">
            <button class="mobile-toggle-btn" *ngIf="isMobile()" (click)="toggleCollapse()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            <div class="header-breadcrumb">
              <div class="breadcrumb-icon-wrapper">
                <svg class="breadcrumb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              </div>
              <span class="breadcrumb-brand">PayGate Console</span>
            </div>
          </div>

          <!-- Right Section: Action Controls & User Profile Dropdown -->
          <div class="header-right">
            <!-- Search Bar Input -->
            <div class="header-search-box">
              <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input type="text" placeholder="Search transactions..." class="search-input" />
            </div>

            <!-- Notifications Icon Button -->
            <button class="icon-btn" title="Notifications">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
              <span class="notif-dot"></span>
            </button>

            <!-- Theme Toggle Component -->
            <div class="theme-wrapper">
              <pg-theme-toggle class="theme-toggle" />
            </div>

            <!-- Vertical Divider -->
            <div class="header-divider"></div>

            <!-- User Profile Menu Pill -->
            <div class="header-user-menu" (click)="toggleUserDropdown($event)">
              <pg-avatar
                [name]="getDisplayName()"
                size="sm"
                class="user-avatar"
              ></pg-avatar>

              <div class="user-info">
                <span class="user-name">{{ getDisplayName() }}</span>
                <span class="user-role-badge" [class.admin-role]="isAdmin()">{{ authService.getRole() || 'USER' }}</span>
              </div>

              <svg class="dropdown-chevron" [class.rotated]="showUserDropdown()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>

              <!-- User Dropdown Menu -->
              <div class="user-dropdown" *ngIf="showUserDropdown()" (click)="$event.stopPropagation()">
                <div class="dropdown-header">
                  <span class="dropdown-name">{{ authService.getUsername() || 'user@paygate.dev' }}</span>
                  <span class="dropdown-role">Role: {{ authService.getRole() || 'USER' }}</span>
                </div>
                <hr class="dropdown-divider" />
                <a class="dropdown-item" routerLink="/accounts/me" (click)="showUserDropdown.set(false)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span>My Account</span>
                </a>
                <a class="dropdown-item" routerLink="/transactions/history" (click)="showUserDropdown.set(false)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                  </svg>
                  <span>Transaction History</span>
                </a>
                <hr class="dropdown-divider" />
                <button class="dropdown-item dropdown-item-danger" (click)="logout()">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <!-- Page Content Body -->
        <div class="content-body">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>

    <!-- Overlay for mobile -->
    <div class="sidenav-overlay" *ngIf="isMobile() && !collapsed()" (click)="closeOnMobile()"></div>
  `,
  styles: [`
    .main-layout {
      display: flex;
      min-height: 100vh;
      background-color: var(--color-bg-primary);
      font-family: var(--font-family-sans);
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
      gap: var(--space-3);
      padding: var(--space-4) var(--space-4);
      border-bottom: 1px solid var(--color-border-primary);
      min-height: var(--header-height);
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

    /* Collapse Toggle */
    .collapse-toggle {
      position: absolute;
      bottom: var(--space-4);
      left: 50%;
      transform: translateX(-50%);
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--color-bg-tertiary);
      border: 1px solid var(--color-border-primary);
      border-radius: var(--radius-full);
      color: var(--color-text-tertiary);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .collapse-toggle:hover {
      background-color: var(--color-bg-hover);
      color: var(--color-text-primary);
    }

    .collapse-toggle svg {
      width: 16px;
      height: 16px;
    }

    /* Main Content */
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

    /* Top Header Bar */
    .top-header {
      height: var(--header-height);
      background-color: #ffffff;
      border-bottom: 1px solid var(--color-border-primary);
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 var(--space-6);
      position: sticky;
      top: 0;
      z-index: var(--z-sticky);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
    }

    .dark .top-header {
      background-color: var(--color-bg-secondary);
    }

    /* Header Left Section */
    .header-left {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }

    .mobile-toggle-btn {
      background: none;
      border: none;
      color: var(--color-text-secondary);
      cursor: pointer;
      padding: var(--space-1);
      display: flex;
      align-items: center;
    }

    .mobile-toggle-btn svg {
      width: 22px;
      height: 22px;
    }

    .header-breadcrumb {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .breadcrumb-icon-wrapper {
      width: 28px;
      height: 28px;
      border-radius: var(--radius-sm);
      background-color: #ecfdf5;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .breadcrumb-icon {
      width: 16px;
      height: 16px;
      color: #059669;
    }

    .breadcrumb-brand {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-primary);
    }

    /* Header Right Section */
    .header-right {
      display: flex;
      align-items: center;
      gap: var(--space-4);
    }

    /* Search Box */
    .header-search-box {
      display: flex;
      align-items: center;
      gap: 8px;
      background-color: #f8fafc;
      border: 1px solid var(--color-border-primary);
      border-radius: var(--radius-full);
      padding: 6px 14px;
      width: 220px;
      transition: all var(--transition-fast);
    }

    .dark .header-search-box {
      background-color: var(--color-bg-tertiary);
    }

    .header-search-box:focus-within {
      border-color: #059669;
      background-color: #ffffff;
      box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1);
    }

    .search-icon {
      width: 16px;
      height: 16px;
      color: var(--color-text-tertiary);
      flex-shrink: 0;
    }

    .search-input {
      border: none;
      background: none;
      outline: none;
      font-size: 0.8rem;
      color: var(--color-text-primary);
      width: 100%;
    }

    .search-input::placeholder {
      color: var(--color-text-tertiary);
    }

    /* Icon Buttons (Notifications, Theme Toggle) */
    .icon-btn {
      position: relative;
      background: none;
      border: none;
      width: 36px;
      height: 36px;
      border-radius: var(--radius-full);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-text-secondary);
      cursor: pointer;
      transition: background-color var(--transition-fast);
    }

    .icon-btn:hover {
      background-color: var(--color-bg-hover);
      color: var(--color-text-primary);
    }

    .icon-btn svg {
      width: 20px;
      height: 20px;
    }

    .notif-dot {
      position: absolute;
      top: 7px;
      right: 7px;
      width: 8px;
      height: 8px;
      background-color: #ef4444;
      border-radius: 50%;
      border: 2px solid #ffffff;
    }

    .theme-wrapper {
      display: flex;
      align-items: center;
    }

    .header-divider {
      width: 1px;
      height: 24px;
      background-color: var(--color-border-primary);
    }

    /* User Profile Pill */
    .header-user-menu {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      padding: 4px 10px 4px 6px;
      border: 1px solid var(--color-border-primary);
      border-radius: var(--radius-full);
      background-color: #ffffff;
      transition: all var(--transition-fast);
      position: relative;
      user-select: none;
    }

    .dark .header-user-menu {
      background-color: var(--color-bg-tertiary);
    }

    .header-user-menu:hover {
      background-color: var(--color-bg-hover);
      border-color: var(--color-border-secondary);
      box-shadow: var(--shadow-sm);
    }

    .user-avatar {
      flex-shrink: 0;
    }

    .user-info {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    .user-name {
      font-size: 0.8rem;
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-primary);
      line-height: 1.1;
    }

    .user-role-badge {
      font-size: 0.65rem;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .user-role-badge.admin-role {
      color: #059669;
    }

    .dropdown-chevron {
      width: 16px;
      height: 16px;
      color: var(--color-text-tertiary);
      transition: transform var(--transition-fast);
    }

    .dropdown-chevron.rotated {
      transform: rotate(180deg);
    }

    /* User Dropdown */
    .user-dropdown {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      min-width: 220px;
      background-color: var(--color-bg-secondary);
      border: 1px solid var(--color-border-primary);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      padding: var(--space-2);
      z-index: var(--z-dropdown);
      animation: slideInDown var(--transition-fast) ease-out;
    }

    @keyframes slideInDown {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .dropdown-header {
      padding: var(--space-2) var(--space-3) var(--space-3);
    }

    .dropdown-name {
      display: block;
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-primary);
      font-size: var(--font-size-sm);
    }

    .dropdown-role {
      display: block;
      font-size: var(--font-size-xs);
      color: var(--color-text-tertiary);
      margin-top: var(--space-1);
    }

    .dropdown-divider {
      height: 1px;
      background-color: var(--color-border-primary);
      border: none;
      margin: var(--space-2) 0;
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      width: 100%;
      padding: var(--space-2) var(--space-3);
      font-size: var(--font-size-sm);
      color: var(--color-text-primary);
      background: none;
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      text-align: left;
      text-decoration: none;
      transition: background-color var(--transition-fast);
    }

    .dropdown-item:hover {
      background-color: var(--color-bg-hover);
    }

    .dropdown-item svg {
      width: 18px;
      height: 18px;
      color: var(--color-text-tertiary);
    }

    .dropdown-item-danger {
      color: var(--color-error-500);
    }

    .dropdown-item-danger:hover {
      background-color: var(--color-error-50);
    }

    .dark .dropdown-item-danger:hover {
      background-color: var(--color-error-900);
    }

    /* Content Body */
    .content-body {
      flex: 1;
      padding: var(--space-6);
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

      .collapse-toggle {
        display: none;
      }

      .header-search-box {
        display: none;
      }
    }

    @media (max-width: 768px) {
      .top-header {
        padding: 0 var(--space-4);
      }

      .header-breadcrumb {
        display: none;
      }

      .content-body {
        padding: var(--space-4);
      }
    }
  `]
})
export class MainLayoutComponent {
  authService = inject(AuthService);
  collapsed = signal(false);
  showUserDropdown = signal(false);
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

  toggleUserDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.showUserDropdown.update(v => !v);
  }

  closeOnMobile(): void {
    if (this.isMobile()) {
      this.collapsed.set(true);
    }
  }

  logout(): void {
    this.authService.logout();
    this.showUserDropdown.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.header-user-menu')) {
      this.showUserDropdown.set(false);
    }
  }
}