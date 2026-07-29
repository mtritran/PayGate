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
            <div class="brand-title">PayGate <span class="brand-badge">PRO</span></div>
            <div class="brand-subtitle">Smart Payment & Credit</div>
          </div>
        </div>

        <!-- Navigation -->
        <nav class="nav-wrapper" aria-label="Main navigation">
          <ul class="nav-list" role="list">
            <!-- Section Header: Overview -->
            <div class="nav-section-label" *ngIf="!collapsed()">TỔNG QUAN</div>

            <!-- 1. Dashboard (Top level) -->
            <li class="nav-item">
              <a class="nav-link nav-top-link" routerLink="/accounts/dashboard" routerLinkActive="active" title="Dashboard">
                <div class="nav-icon-box icon-box-navy">
                  <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                  </svg>
                </div>
                <span class="nav-title" *ngIf="!collapsed()">Dashboard</span>
              </a>
            </li>

            <!-- Section Header: Financial Services -->
            <div class="nav-section-label" *ngIf="!collapsed()">DỊCH VỤ TÀI CHÍNH</div>

            <!-- 2. Wallet & Account Group -->
            <li class="nav-group" [class.is-expanded]="isGroupOpen('wallet')">
              <button type="button" class="nav-group-header" (click)="toggleGroup('wallet')" [title]="collapsed() ? 'Wallet & Account' : ''">
                <div class="group-header-left">
                  <div class="nav-icon-box icon-box-pink">
                    <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 12V7H5a2 2 0 01-2-2V3a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 01-2 2" />
                      <path d="M3 17v2a2 2 0 002 2h14a2 2 0 002-2v-2" />
                      <path d="M12 12a2 2 0 100-4 2 2 0 000 4z" />
                    </svg>
                  </div>
                  <span class="nav-title" *ngIf="!collapsed()">Wallet & Account</span>
                </div>
                <svg class="chevron-icon" [class.chevron-open]="isGroupOpen('wallet')" *ngIf="!collapsed()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              <div class="sub-tree-wrapper" *ngIf="isGroupOpen('wallet') && !collapsed()">
                <ul class="nav-sub-list">
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
              </div>
            </li>

            <!-- 3. Transfers & History Group -->
            <li class="nav-group" [class.is-expanded]="isGroupOpen('transfers')">
              <button type="button" class="nav-group-header" (click)="toggleGroup('transfers')" [title]="collapsed() ? 'Transfers & History' : ''">
                <div class="group-header-left">
                  <div class="nav-icon-box icon-box-blue">
                    <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </div>
                  <span class="nav-title" *ngIf="!collapsed()">Transfers & History</span>
                </div>
                <svg class="chevron-icon" [class.chevron-open]="isGroupOpen('transfers')" *ngIf="!collapsed()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              <div class="sub-tree-wrapper" *ngIf="isGroupOpen('transfers') && !collapsed()">
                <ul class="nav-sub-list">
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
              </div>
            </li>

            <!-- 4. Bills & Payments Group -->
            <li class="nav-group" [class.is-expanded]="isGroupOpen('bills')">
              <button type="button" class="nav-group-header" (click)="toggleGroup('bills')" [title]="collapsed() ? 'Bills & Payments' : ''">
                <div class="group-header-left">
                  <div class="nav-icon-box icon-box-teal">
                    <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                  </div>
                  <span class="nav-title" *ngIf="!collapsed()">Bills & Payments</span>
                </div>
                <svg class="chevron-icon" [class.chevron-open]="isGroupOpen('bills')" *ngIf="!collapsed()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              <div class="sub-tree-wrapper" *ngIf="isGroupOpen('bills') && !collapsed()">
                <ul class="nav-sub-list">
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
              </div>
            </li>

            <!-- 5. Financial Services Group -->
            <li class="nav-group" [class.is-expanded]="isGroupOpen('finance')">
              <button type="button" class="nav-group-header" (click)="toggleGroup('finance')" [title]="collapsed() ? 'Financial Services' : ''">
                <div class="group-header-left">
                  <div class="nav-icon-box icon-box-pink">
                    <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                    </svg>
                  </div>
                  <span class="nav-title" *ngIf="!collapsed()">Financial Services</span>
                </div>
                <svg class="chevron-icon" [class.chevron-open]="isGroupOpen('finance')" *ngIf="!collapsed()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              <div class="sub-tree-wrapper" *ngIf="isGroupOpen('finance') && !collapsed()">
                <ul class="nav-sub-list">
                  <li class="nav-sub-item">
                    <a class="nav-sub-link" routerLink="/loans" routerLinkActive="active" title="Consumer Loans">
                      <span class="sub-dot"></span>
                      <span class="nav-sub-title">Consumer Loans</span>
                    </a>
                  </li>
                </ul>
              </div>
            </li>

            <!-- 6. Promotions & Business Group -->
            <li class="nav-group" [class.is-expanded]="isGroupOpen('promo')">
              <button type="button" class="nav-group-header" (click)="toggleGroup('promo')" [title]="collapsed() ? 'Promotions & Business' : ''">
                <div class="group-header-left">
                  <div class="nav-icon-box icon-box-purple">
                    <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M20 12v8H4v-8M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
                    </svg>
                  </div>
                  <span class="nav-title" *ngIf="!collapsed()">Promotions & Business</span>
                </div>
                <svg class="chevron-icon" [class.chevron-open]="isGroupOpen('promo')" *ngIf="!collapsed()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              <div class="sub-tree-wrapper" *ngIf="isGroupOpen('promo') && !collapsed()">
                <ul class="nav-sub-list">
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
              </div>
            </li>

            <!-- Section Header: Admin (Only for ADMIN role) -->
            <div class="nav-section-label" *ngIf="isAdmin() && !collapsed()">QUẢN TRỊ VIÊN</div>

            <!-- 7. Admin Group (Only for ADMIN role) -->
            <li class="nav-group" *ngIf="isAdmin()" [class.is-expanded]="isGroupOpen('admin')">
              <button type="button" class="nav-group-header admin-header" (click)="toggleGroup('admin')" [title]="collapsed() ? 'Admin Portal' : ''">
                <div class="group-header-left">
                  <div class="nav-icon-box icon-box-navy">
                    <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </div>
                  <span class="nav-title" *ngIf="!collapsed()">Admin Portal</span>
                </div>
                <svg class="chevron-icon" [class.chevron-open]="isGroupOpen('admin')" *ngIf="!collapsed()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              <div class="sub-tree-wrapper" *ngIf="isGroupOpen('admin') && !collapsed()">
                <ul class="nav-sub-list">
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
              </div>
            </li>

            <!-- Collapse/Expand Sidebar Toggle -->
            <li class="nav-item nav-collapse-item">
              <button type="button" class="nav-link nav-collapse-btn" (click)="toggleCollapse()" [title]="collapsed() ? 'Expand Sidebar' : 'Collapse Sidebar'">
                <div class="nav-icon-box icon-box-gray">
                  <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" *ngIf="!collapsed()">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" *ngIf="collapsed()">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
                <span class="nav-title" *ngIf="!collapsed()">Thu gọn Menu</span>
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

    /* Sidenav Container */
    .sidenav {
      position: fixed;
      top: 0;
      left: 0;
      height: 100vh;
      width: var(--sidebar-width);
      background: linear-gradient(180deg, #ffffff 0%, #fcf8fa 50%, #f4f8fc 100%);
      border-right: 1px solid rgba(226, 232, 240, 0.8);
      display: flex;
      flex-direction: column;
      z-index: var(--z-fixed);
      transition: width var(--transition-normal), transform var(--transition-normal);
      box-shadow: 4px 0 24px rgba(13, 43, 92, 0.04);
    }

    .sidenav-collapsed {
      width: var(--sidebar-width-collapsed);
    }

    .sidenav-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.4);
      backdrop-filter: blur(4px);
      z-index: var(--z-sticky);
    }

    /* Brand Header */
    .brand-header {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 18px 20px;
      border-bottom: 1px solid rgba(226, 232, 240, 0.8);
      min-height: 72px;
      box-sizing: border-box;
    }

    .sidenav-collapsed .brand-header {
      padding: 16px 0;
      justify-content: center;
    }

    .brand-logo {
      width: 44px;
      height: 44px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      overflow: hidden;
      box-shadow: 0 6px 16px rgba(194, 0, 103, 0.18);
      border: 1.5px solid rgba(244, 114, 182, 0.3);
      cursor: pointer;
      transition: transform 0.2s ease;
    }
    .brand-logo:hover {
      transform: scale(1.04);
    }

    .brand-logo-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .brand-text {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      flex: 1;
    }

    .brand-title {
      font-weight: 900;
      font-size: 1.15rem;
      color: #0d2b5c;
      line-height: 1.2;
      white-space: nowrap;
      letter-spacing: -0.02em;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .brand-badge {
      font-size: 0.65rem;
      font-weight: 800;
      background: linear-gradient(135deg, #c20067 0%, #0072ce 100%);
      color: #ffffff;
      padding: 2px 6px;
      border-radius: 6px;
      letter-spacing: 0.04em;
    }

    .brand-subtitle {
      font-size: 0.72rem;
      font-weight: 600;
      color: #64748b;
      white-space: nowrap;
    }

    /* Navigation Wrapper & Scrollbar */
    .nav-wrapper {
      flex: 1;
      padding: 14px 12px;
      overflow-y: auto;
    }
    .nav-wrapper::-webkit-scrollbar {
      width: 4px;
    }
    .nav-wrapper::-webkit-scrollbar-thumb {
      background: #f472b6;
      border-radius: 999px;
    }

    .nav-section-label {
      font-size: 0.68rem;
      font-weight: 900;
      text-transform: uppercase;
      color: #94a3b8;
      letter-spacing: 0.08em;
      padding: 14px 12px 6px 12px;
    }

    .nav-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    /* Icon Box Badges */
    .nav-icon-box {
      width: 32px;
      height: 32px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.22s ease;
    }
    .nav-icon-box svg {
      width: 17px;
      height: 17px;
      transition: stroke 0.2s ease;
    }

    .icon-box-navy { background: #eef6ff; color: #0d2b5c; border: 1px solid #dbeafe; }
    .icon-box-pink { background: #fff0f6; color: #c20067; border: 1px solid #f8bbd0; }
    .icon-box-blue { background: #e3f2fd; color: #0072ce; border: 1px solid #bbdefb; }
    .icon-box-teal { background: #e6fffa; color: #0d9488; border: 1px solid #99f6e4; }
    .icon-box-purple { background: #f3e5f5; color: #7b1fa2; border: 1px solid #e1bee7; }
    .icon-box-gray { background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; }

    /* Nav Item & Parent Group Header */
    .nav-item, .nav-group {
      margin-bottom: 2px;
    }

    .nav-link, .nav-group-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 8px 12px;
      border-radius: 14px;
      color: #334155;
      font-size: 0.88rem;
      font-weight: 800;
      text-decoration: none;
      transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
      border: 1px solid transparent;
      background: transparent;
      cursor: pointer;
      box-sizing: border-box;
      font-family: inherit;
    }

    .sidenav-collapsed .nav-link,
    .sidenav-collapsed .nav-group-header {
      justify-content: center;
      padding: 8px 0;
    }

    .nav-link:hover, .nav-group-header:hover {
      background: rgba(255, 240, 246, 0.7);
      border-color: rgba(248, 187, 208, 0.5);
      color: #c20067;
      transform: translateX(2px);
    }

    .nav-link.active {
      background: linear-gradient(135deg, #fff0f6 0%, #eef6ff 100%);
      border-color: #f8bbd0;
      color: #c20067;
      box-shadow: 0 4px 16px rgba(194, 0, 103, 0.12);
    }
    .nav-link.active .icon-box-navy,
    .nav-link.active .icon-box-pink {
      background: linear-gradient(135deg, #c20067 0%, #0072ce 100%);
      color: #ffffff;
      border-color: transparent;
      box-shadow: 0 4px 12px rgba(194, 0, 103, 0.3);
    }

    .group-header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .chevron-icon {
      width: 16px;
      height: 16px;
      color: #94a3b8;
      transition: transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.2s ease;
    }

    .chevron-open {
      transform: rotate(90deg);
      color: #c20067;
    }

    /* Sub-Tree Hierarchy Wrapper */
    .sub-tree-wrapper {
      position: relative;
      margin-left: 26px;
      padding-left: 12px;
      margin-top: 4px;
      margin-bottom: 6px;
      border-left: 2px solid #e2e8f0;
      animation: slideDown 0.24s ease-out;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-6px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .nav-sub-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .nav-sub-item {
      position: relative;
    }

    .nav-sub-link {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 14px;
      color: #475569;
      font-weight: 600;
      font-size: 0.84rem;
      text-decoration: none;
      border-radius: 12px;
      transition: all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
      border: 1px solid transparent;
    }

    .nav-sub-link:hover {
      color: #c20067;
      background: #fff0f6;
      border-color: #f8bbd0;
      transform: translateX(4px);
    }

    .nav-sub-link.active {
      color: #c20067;
      background: linear-gradient(135deg, #fff0f6 0%, #eef6ff 100%);
      font-weight: 800;
      border-color: #f8bbd0;
      box-shadow: 0 4px 14px rgba(194, 0, 103, 0.12);
      transform: translateX(4px);
    }

    .sub-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #cbd5e1;
      transition: all 0.22s ease;
      flex-shrink: 0;
    }

    .nav-sub-link.active .sub-dot {
      background: #c20067;
      box-shadow: 0 0 8px rgba(194, 0, 103, 0.6);
      transform: scale(1.4);
    }
    .nav-sub-link:hover .sub-dot {
      background: #c20067;
      transform: scale(1.3);
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
