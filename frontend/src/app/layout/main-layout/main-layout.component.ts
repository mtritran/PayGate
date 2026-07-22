import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule
  ],
  template: `
    <mat-sidenav-container class="sidenav-container">
      <mat-sidenav mode="side" opened class="sidenav">
        <!-- Logo Branding -->
        <div class="brand-header">
          <div class="brand-logo">
            <mat-icon color="primary">shield</mat-icon>
          </div>
          <div class="brand-text">
            <div class="brand-title">PayGate</div>
            <div class="brand-subtitle">Payment Gateway</div>
          </div>
        </div>

        <!-- Sidebar Navigation -->
        <div class="nav-wrapper">
          <!-- Wallet Section -->
          <div class="nav-section-label">Wallet</div>
          <mat-nav-list class="custom-nav-list">
            <a mat-list-item routerLink="/accounts/dashboard" routerLinkActive="active">
              <mat-icon matListItemIcon class="nav-icon">space_dashboard</mat-icon>
              <span matListItemTitle class="nav-title">Dashboard</span>
            </a>
            <a mat-list-item routerLink="/accounts/me" routerLinkActive="active">
              <mat-icon matListItemIcon class="nav-icon">account_balance_wallet</mat-icon>
              <span matListItemTitle class="nav-title">My Account</span>
            </a>
            <a mat-list-item routerLink="/transactions/history" routerLinkActive="active">
              <mat-icon matListItemIcon class="nav-icon">swap_horiz</mat-icon>
              <span matListItemTitle class="nav-title">Transactions</span>
            </a>
            <a mat-list-item routerLink="/transactions/pay" routerLinkActive="active">
              <mat-icon matListItemIcon class="nav-icon">send</mat-icon>
              <span matListItemTitle class="nav-title">Send Payment</span>
            </a>
            <a mat-list-item routerLink="/accounts/topup" routerLinkActive="active">
              <mat-icon matListItemIcon class="nav-icon">add_circle_outline</mat-icon>
              <span matListItemTitle class="nav-title">Top Up</span>
            </a>
          </mat-nav-list>

          <!-- Admin Section -->
          <div class="nav-section-label">Admin</div>
          <mat-nav-list class="custom-nav-list">
            <a mat-list-item routerLink="/dashboard" routerLinkActive="active">
              <mat-icon matListItemIcon class="nav-icon">insights</mat-icon>
              <span matListItemTitle class="nav-title">Overview</span>
            </a>
            <a mat-list-item routerLink="/admin/merchants" routerLinkActive="active">
              <mat-icon matListItemIcon class="nav-icon">storefront</mat-icon>
              <span matListItemTitle class="nav-title">Merchants</span>
            </a>
            <a mat-list-item routerLink="/admin/ledger" routerLinkActive="active">
              <mat-icon matListItemIcon class="nav-icon">account_balance</mat-icon>
              <span matListItemTitle class="nav-title">Ledger</span>
            </a>
            <a mat-list-item routerLink="/users" routerLinkActive="active">
              <mat-icon matListItemIcon class="nav-icon">rss_feed</mat-icon>
              <span matListItemTitle class="nav-title">Webhook Logs</span>
            </a>
          </mat-nav-list>

          <!-- General Section -->
          <div class="nav-section-label">General</div>
          <mat-nav-list class="custom-nav-list">
            <a mat-list-item routerLink="/users" routerLinkActive="active">
              <mat-icon matListItemIcon class="nav-icon">description</mat-icon>
              <span matListItemTitle class="nav-title">API Docs</span>
            </a>
            <a mat-list-item routerLink="/users" routerLinkActive="active">
              <mat-icon matListItemIcon class="nav-icon">settings</mat-icon>
              <span matListItemTitle class="nav-title">Settings</span>
            </a>
          </mat-nav-list>
        </div>
      </mat-sidenav>

      <mat-sidenav-content class="main-content-area">
        <!-- Top Header Bar -->
        <div class="top-header-bar">
          <div class="header-breadcrumb">
            <mat-icon class="breadcrumb-icon">subtitles</mat-icon>
            <span class="breadcrumb-text">PayGate Console</span>
          </div>

          <!-- User Profile Trigger Dropdown Menu -->
          <div class="header-user-info" [matMenuTriggerFor]="userProfileMenu">
            <span class="user-email">{{ authService.getUsername() || 'user@paygate.dev' }}</span>
            <div class="user-avatar" title="Account settings">
              {{ getInitials(authService.getUsername()) }}
            </div>
            <mat-icon class="dropdown-chevron">expand_more</mat-icon>
          </div>

          <!-- Profile MatMenu -->
          <mat-menu #userProfileMenu="matMenu" xPosition="before" class="profile-dropdown-panel">
            <div class="menu-user-header" (click)="$event.stopPropagation()">
              <div class="menu-user-name">{{ authService.getUsername() || 'user@paygate.dev' }}</div>
              <div class="menu-user-role">Role: {{ authService.getRole() || 'USER' }}</div>
            </div>
            <mat-divider></mat-divider>
            <a mat-menu-item routerLink="/accounts/me">
              <mat-icon>account_circle</mat-icon>
              <span>My Account</span>
            </a>
            <a mat-menu-item routerLink="/transactions/history">
              <mat-icon>history</mat-icon>
              <span>Transaction History</span>
            </a>
            <mat-divider></mat-divider>
            <button mat-menu-item (click)="authService.logout()" class="logout-menu-item">
              <mat-icon color="warn">logout</mat-icon>
              <span class="logout-text">Logout</span>
            </button>
          </mat-menu>
        </div>

        <!-- Page View Body -->
        <div class="content-body">
          <router-outlet></router-outlet>
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    :host { display: block; height: 100vh; font-family: 'Inter', system-ui, -apple-system, sans-serif; }
    .sidenav-container { height: 100vh; background-color: #f8fafc; }
    .sidenav { width: 240px; background-color: #ffffff; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; }
    
    .brand-header { display: flex; align-items: center; gap: 10px; padding: 20px 20px 16px 20px; }
    .brand-logo { width: 36px; height: 36px; background-color: #ecfdf5; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
    .brand-logo mat-icon { color: #059669; font-size: 22px; width: 22px; height: 22px; }
    .brand-title { font-weight: 700; font-size: 1.1rem; color: #0f172a; line-height: 1.2; }
    .brand-subtitle { font-size: 0.75rem; color: #64748b; }

    .nav-wrapper { padding: 0 12px; }
    .nav-section-label { font-size: 0.7rem; font-weight: 600; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.05em; padding: 16px 12px 6px 12px; }
    
    .custom-nav-list { padding: 0; }
    .custom-nav-list a { height: 38px; border-radius: 8px; margin-bottom: 2px; color: #475569; font-size: 0.875rem; }
    .custom-nav-list a:hover { background-color: #f1f5f9; }
    .custom-nav-list a.active { background-color: #ecfdf5; color: #059669; font-weight: 600; }
    .custom-nav-list a.active .nav-icon { color: #059669; }
    .nav-icon { color: #64748b; font-size: 18px; width: 18px; height: 18px; margin-right: 12px; }
    .nav-title { font-size: 0.875rem; }

    .main-content-area { background-color: #f8fafc; display: flex; flex-direction: column; min-height: 100vh; }
    .top-header-bar { height: 56px; background-color: #ffffff; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; padding: 0 28px; }
    .header-breadcrumb { display: flex; align-items: center; gap: 8px; color: #334155; font-size: 0.875rem; font-weight: 500; }
    .breadcrumb-icon { font-size: 18px; width: 18px; height: 18px; color: #64748b; }

    .header-user-info { display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 4px 8px; border-radius: 8px; transition: background-color 0.15s; }
    .header-user-info:hover { background-color: #f1f5f9; }
    .user-email { font-size: 0.85rem; color: #475569; font-weight: 500; }
    .user-avatar { width: 30px; height: 30px; background-color: #047857; color: #ffffff; border-radius: 50%; font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; justify-content: center; }
    .dropdown-chevron { font-size: 18px; width: 18px; height: 18px; color: #64748b; }

    .menu-user-header { padding: 12px 16px; min-width: 180px; }
    .menu-user-name { font-weight: 600; font-size: 0.875rem; color: #0f172a; }
    .menu-user-role { font-size: 0.75rem; color: #64748b; margin-top: 2px; }
    .logout-text { color: #ef4444; font-weight: 600; }

    .content-body { padding: 28px; flex: 1; }
  `]
})
export class MainLayoutComponent {
  constructor(public authService: AuthService) {}

  getInitials(username: string | null): string {
    if (!username) return 'NA';
    return username.substring(0, 2).toUpperCase();
  }
}
