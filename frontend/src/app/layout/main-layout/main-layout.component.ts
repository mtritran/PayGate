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
      <!-- Sidenav -->
      <aside class="sidenav" [class.sidenav-collapsed]="collapsed()">
        <!-- Brand Header -->
        <div class="brand-header">
          <div class="brand-logo" (click)="collapsed() && toggleCollapse()" [title]="collapsed() ? 'Expand sidebar' : ''">
            <img src="assets/PayGate_Logo.jpg" alt="PayGate Logo" class="brand-logo-img">
          </div>
          <div class="brand-text" *ngIf="!collapsed()">
            <div class="brand-title">PayGate</div>
            <div class="brand-subtitle">Payment Gateway</div>
          </div>
        </div>

        <!-- Navigation -->
        <nav class="nav-wrapper" aria-label="Main navigation">
          <ul class="nav-list" role="list">
            <!-- 1. Dashboard (Top level) -->
            <li class="nav-item">
              <a class="nav-link nav-top-link" routerLink="/accounts/dashboard" routerLinkActive="active" title="Dashboard">
                <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
                <span class="nav-title" *ngIf="!collapsed()">Dashboard</span>
              </a>
            </li>

            <!-- 2. Wallet & Account Group -->
            <li class="nav-group">
              <button type="button" class="nav-group-header" (click)="toggleGroup('wallet')" [title]="collapsed() ? 'Wallet & Account' : ''">
                <div class="group-header-left">
                  <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 12V7H5a2 2 0 01-2-2V3a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 01-2 2" />
                    <path d="M3 17v2a2 2 0 002 2h14a2 2 0 002-2v-2" />
                    <path d="M12 12a2 2 0 100-4 2 2 0 000 4z" />
                  </svg>
                  <span class="nav-title" *ngIf="!collapsed()">Wallet & Account</span>
                </div>
                <svg class="chevron-icon" [class.chevron-open]="isGroupOpen('wallet')" *ngIf="!collapsed()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              <ul class="nav-sub-list" *ngIf="isGroupOpen('wallet') && !collapsed()">
                <li class="nav-sub-item">
                  <a class="nav-sub-link" routerLink="/accounts/me" routerLinkActive="active" title="My Account">
                    <span class="sub-dot"></span>
                    <span class="nav-sub-title">My Account</span>
                  </a>
                </li>
                <li class="nav-sub-item">
                  <a class="nav-sub-link" routerLink="/accounts/topup" routerLinkActive="active" title="Top Up Wallet">
                    <span class="sub-dot"></span>
                    <span class="nav-sub-title">Top Up Wallet</span>
                  </a>
                </li>
                <li class="nav-sub-item">
                  <a class="nav-sub-link" routerLink="/vaults" routerLinkActive="active" title="Savings Vault">
                    <span class="sub-dot"></span>
                    <span class="nav-sub-title">Savings Vault</span>
                  </a>
                </li>
              </ul>
            </li>

            <!-- 3. Transfers & History Group -->
            <li class="nav-group">
              <button type="button" class="nav-group-header" (click)="toggleGroup('transfers')" [title]="collapsed() ? 'Transfers & History' : ''">
                <div class="group-header-left">
                  <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  <span class="nav-title" *ngIf="!collapsed()">Transfers & History</span>
                </div>
                <svg class="chevron-icon" [class.chevron-open]="isGroupOpen('transfers')" *ngIf="!collapsed()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              <ul class="nav-sub-list" *ngIf="isGroupOpen('transfers') && !collapsed()">
                <li class="nav-sub-item">
                  <a class="nav-sub-link" routerLink="/transactions/pay" routerLinkActive="active" title="Send Payment">
                    <span class="sub-dot"></span>
                    <span class="nav-sub-title">Send Payment</span>
                  </a>
                </li>
                <li class="nav-sub-item">
                  <a class="nav-sub-link" routerLink="/transactions/history" routerLinkActive="active" title="Transactions">
                    <span class="sub-dot"></span>
                    <span class="nav-sub-title">Transactions</span>
                  </a>
                </li>
              </ul>
            </li>

            <!-- 4. Bills & Payments Group -->
            <li class="nav-group">
              <button type="button" class="nav-group-header" (click)="toggleGroup('bills')" [title]="collapsed() ? 'Bills & Payments' : ''">
                <div class="group-header-left">
                  <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                  <span class="nav-title" *ngIf="!collapsed()">Bills & Payments</span>
                </div>
                <svg class="chevron-icon" [class.chevron-open]="isGroupOpen('bills')" *ngIf="!collapsed()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              <ul class="nav-sub-list" *ngIf="isGroupOpen('bills') && !collapsed()">
                <li class="nav-sub-item">
                  <a class="nav-sub-link" routerLink="/bills/pay" routerLinkActive="active" title="Pay Bills">
                    <span class="sub-dot"></span>
                    <span class="nav-sub-title">Pay Bills</span>
                  </a>
                </li>
                <li class="nav-sub-item">
                  <a class="nav-sub-link" routerLink="/recurring-payments" routerLinkActive="active" title="Recurring & Bills">
                    <span class="sub-dot"></span>
                    <span class="nav-sub-title">Recurring & Bills</span>
                  </a>
                </li>
                <li class="nav-sub-item">
                  <a class="nav-sub-link" routerLink="/bills/saved" routerLinkActive="active" title="Saved Bills">
                    <span class="sub-dot"></span>
                    <span class="nav-sub-title">Saved Bills</span>
                  </a>
                </li>
              </ul>
            </li>

            <!-- 5. Financial Services Group -->
            <li class="nav-group">
              <button type="button" class="nav-group-header" (click)="toggleGroup('finance')" [title]="collapsed() ? 'Financial Services' : ''">
                <div class="group-header-left">
                  <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                  </svg>
                  <span class="nav-title" *ngIf="!collapsed()">Financial Services</span>
                </div>
                <svg class="chevron-icon" [class.chevron-open]="isGroupOpen('finance')" *ngIf="!collapsed()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              <ul class="nav-sub-list" *ngIf="isGroupOpen('finance') && !collapsed()">
                <li class="nav-sub-item">
                  <a class="nav-sub-link" routerLink="/loans" routerLinkActive="active" title="Consumer Loans">
                    <span class="sub-dot"></span>
                    <span class="nav-sub-title">Consumer Loans</span>
                  </a>
                </li>
              </ul>
            </li>

            <!-- 6. Promotions & Business Group -->
            <li class="nav-group">
              <button type="button" class="nav-group-header" (click)="toggleGroup('promo')" [title]="collapsed() ? 'Promotions & Business' : ''">
                <div class="group-header-left">
                  <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 12v8H4v-8M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
                  </svg>
                  <span class="nav-title" *ngIf="!collapsed()">Promotions & Business</span>
                </div>
                <svg class="chevron-icon" [class.chevron-open]="isGroupOpen('promo')" *ngIf="!collapsed()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              <ul class="nav-sub-list" *ngIf="isGroupOpen('promo') && !collapsed()">
                <li class="nav-sub-item">
                  <a class="nav-sub-link" routerLink="/vouchers" routerLinkActive="active" title="Voucher Store">
                    <span class="sub-dot"></span>
                    <span class="nav-sub-title">Voucher Store</span>
                  </a>
                </li>
                <li class="nav-sub-item">
                  <a class="nav-sub-link" routerLink="/merchant/register" routerLinkActive="active" title="Merchant Partner">
                    <span class="sub-dot"></span>
                    <span class="nav-sub-title">Merchant Partner</span>
                  </a>
                </li>
              </ul>
            </li>

            <!-- 7. Admin Group (Only for ADMIN role) -->
            <li class="nav-group" *ngIf="isAdmin()">
              <button type="button" class="nav-group-header admin-header" (click)="toggleGroup('admin')" [title]="collapsed() ? 'Admin Portal' : ''">
                <div class="group-header-left">
                  <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <span class="nav-title" *ngIf="!collapsed()">Admin Portal</span>
                </div>
                <svg class="chevron-icon" [class.chevron-open]="isGroupOpen('admin')" *ngIf="!collapsed()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              <ul class="nav-sub-list" *ngIf="isGroupOpen('admin') && !collapsed()">
                <li class="nav-sub-item">
                  <a class="nav-sub-link" routerLink="/admin/dashboard" routerLinkActive="active" title="Overview">
                    <span class="sub-dot"></span>
                    <span class="nav-sub-title">Overview</span>
                  </a>
                </li>
                <li class="nav-sub-item">
                  <a class="nav-sub-link" routerLink="/admin/merchants" routerLinkActive="active" title="Merchants">
                    <span class="sub-dot"></span>
                    <span class="nav-sub-title">Merchants</span>
                  </a>
                </li>
                <li class="nav-sub-item">
                  <a class="nav-sub-link" routerLink="/users" routerLinkActive="active" title="Users">
                    <span class="sub-dot"></span>
                    <span class="nav-sub-title">Users</span>
                  </a>
                </li>
                <li class="nav-sub-item">
                  <a class="nav-sub-link" routerLink="/admin/ledger" routerLinkActive="active" title="Ledger">
                    <span class="sub-dot"></span>
                    <span class="nav-sub-title">Ledger</span>
                  </a>
                </li>
                <li class="nav-sub-item">
                  <a class="nav-sub-link" routerLink="/admin/webhooks" routerLinkActive="active" title="Webhook Logs">
                    <span class="sub-dot"></span>
                    <span class="nav-sub-title">Webhook Logs</span>
                  </a>
                </li>
                <li class="nav-sub-item">
                  <a class="nav-sub-link" routerLink="/admin/vouchers" routerLinkActive="active" title="Vouchers">
                    <span class="sub-dot"></span>
                    <span class="nav-sub-title">Vouchers</span>
                  </a>
                </li>
              </ul>
            </li>

            <!-- Collapse/Expand Sidebar Toggle -->
            <li class="nav-item nav-collapse-item">
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
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      border: 1px solid rgba(0, 0, 0, 0.06);
    }

    .brand-logo-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 12px;
    }

    .brand-text {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      flex: 1;
    }

    .brand-title {
      font-weight: var(--font-weight-bold);
      font-size: 1.15rem;
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
      padding: 12px 10px;
      overflow-y: auto;
    }

    .nav-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .nav-item {
      margin-bottom: 2px;
    }

    .nav-top-link {
      font-weight: 800;
      color: #0d2b5c;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      border-radius: 12px;
      color: #475569;
      font-size: 0.88rem;
      font-weight: 700;
      text-decoration: none;
      transition: all 0.2s ease;
      white-space: nowrap;
      width: 100%;
      border: none;
      background: transparent;
      cursor: pointer;
      box-sizing: border-box;
      font-family: inherit;
    }

    .sidenav-collapsed .nav-link {
      justify-content: center;
      padding: 10px 0;
    }

    .nav-link:hover {
      background-color: #fff0f6;
      color: #c20067;
    }

    .nav-link.active {
      background-color: #fff0f6;
      color: #c20067;
      font-weight: 900;
      box-shadow: 0 4px 12px rgba(194, 0, 103, 0.1);
    }

    .nav-icon {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      color: #64748b;
      transition: color 0.2s ease;
    }

    .nav-link:hover .nav-icon,
    .nav-link.active .nav-icon {
      color: #c20067;
    }

    .nav-title {
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Accordion Nav Groups */
    .nav-group {
      margin-bottom: 2px;
    }

    .nav-group-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 10px 14px;
      border: none;
      background: transparent;
      color: #0d2b5c;
      font-weight: 800;
      font-size: 0.88rem;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: inherit;
    }

    .sidenav-collapsed .nav-group-header {
      justify-content: center;
      padding: 10px 0;
    }

    .nav-group-header:hover {
      background: #fff0f6;
      color: #c20067;
    }

    .group-header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .chevron-icon {
      width: 16px;
      height: 16px;
      color: #64748b;
      transition: transform 0.22s ease, color 0.2s ease;
    }

    .chevron-open {
      transform: rotate(90deg);
      color: #c20067;
    }

    /* Sub-list Indentation & Styling */
    .nav-sub-list {
      list-style: none;
      padding: 4px 0 6px 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .nav-sub-item {
      position: relative;
    }

    .nav-sub-link {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px 8px 34px; /* 34px left padding for ~20px indentation */
      color: #475569;
      font-weight: 600;
      font-size: 0.84rem;
      text-decoration: none;
      border-radius: 10px;
      transition: all 0.2s ease;
      border-left: 3px solid transparent;
    }

    .nav-sub-link:hover {
      color: #c20067;
      background: #fff0f6;
    }

    .nav-sub-link.active {
      color: #c20067;
      background: #fff0f6;
      font-weight: 800;
      border-left-color: #c20067;
      box-shadow: 0 4px 12px rgba(194, 0, 103, 0.08);
    }

    .sub-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #cbd5e1;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .nav-sub-link.active .sub-dot,
    .nav-sub-link:hover .sub-dot {
      background: #c20067;
      transform: scale(1.4);
    }

    .admin-header {
      color: #0d2b5c;
    }

    .nav-collapse-btn {
      margin-top: 6px;
      border-top: 1px dashed #e2e8f0;
      border-radius: 0;
      padding-top: 10px;
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
  private router = inject(Router);
  private notification = inject(NotificationService);

  collapsed = signal(false);
  isMobile = signal(false);

  // Accordion open/close state per nav group
  openGroups = signal<Record<string, boolean>>({
    wallet: true,
    transfers: true,
    bills: false,
    finance: false,
    promo: false,
    admin: false
  });

  isAdmin = computed(() => this.authService.getRole() === 'ADMIN' || this.authService.getRole() === 'ROLE_ADMIN');

  constructor() {
    if (typeof window !== 'undefined') {
      this.isMobile.set(window.innerWidth < 1024);
      window.addEventListener('resize', this.onResize.bind(this));
    }

    // Auto expand accordion group matching active route
    this.updateActiveGroupFromUrl(this.router.url);
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: any) => {
      this.updateActiveGroupFromUrl(e.urlAfterRedirects || e.url);
    });
  }

  private updateActiveGroupFromUrl(url: string): void {
    if (url.includes('/accounts/me') || url.includes('/accounts/topup') || url.includes('/vaults')) {
      this.openGroups.update(s => ({ ...s, wallet: true }));
    }
    if (url.includes('/transactions/pay') || url.includes('/transactions/history')) {
      this.openGroups.update(s => ({ ...s, transfers: true }));
    }
    if (url.includes('/bills') || url.includes('/recurring-payments')) {
      this.openGroups.update(s => ({ ...s, bills: true }));
    }
    if (url.includes('/loans')) {
      this.openGroups.update(s => ({ ...s, finance: true }));
    }
    if (url.includes('/vouchers') || url.includes('/merchant/register')) {
      this.openGroups.update(s => ({ ...s, promo: true }));
    }
    if (url.includes('/admin') || url.includes('/users')) {
      this.openGroups.update(s => ({ ...s, admin: true }));
    }
  }

  toggleGroup(groupKey: string): void {
    if (this.collapsed()) {
      this.collapsed.set(false);
    }
    this.openGroups.update(state => ({
      ...state,
      [groupKey]: !state[groupKey]
    }));
  }

  isGroupOpen(groupKey: string): boolean {
    return !!this.openGroups()[groupKey];
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
