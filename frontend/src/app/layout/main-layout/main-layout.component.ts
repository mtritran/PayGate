import { Component, signal, inject, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { AvatarComponent } from '../../shared/components/avatar/avatar.component';
import { AiAssistantComponent } from '../../shared/components/ai-assistant/ai-assistant.component';

import { NotificationService } from '../../core/services/notification.service';
import { RealtimeNotificationService, NotificationItem } from '../../core/services/realtime-notification.service';

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
          <!-- Notification Bell Container -->
          <div class="notification-container" (click)="$event.stopPropagation()">
            <button class="notification-btn" (click)="toggleDropdown($event)" title="Thông báo">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
              </svg>
              <span class="notification-badge" *ngIf="unreadCount() > 0">{{ unreadCount() }}</span>
            </button>
            
            <!-- Notification Dropdown Menu -->
            <div class="notification-dropdown" *ngIf="showDropdown()">
              <div class="dropdown-header">
                <h3>Thông báo</h3>
                <button class="btn-mark-all" (click)="markAllAsRead($event)" *ngIf="unreadCount() > 0">
                  Đọc tất cả
                </button>
              </div>
              <div class="dropdown-body">
                <div class="no-notifications" *ngIf="notifications().length === 0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
                  </svg>
                  <p>Không có thông báo mới</p>
                </div>
                <div class="notification-list" *ngIf="notifications().length > 0">
                  <div 
                    *ngFor="let item of notifications()" 
                    class="notification-item" 
                    [class.unread]="!item.read"
                    (click)="markAsRead(item, $event)"
                  >
                    <span class="item-badge-dot" *ngIf="!item.read"></span>
                    <div class="item-content">
                      <div class="item-title">{{ item.title }}</div>
                      <div class="item-message">{{ item.message }}</div>
                      <div class="item-time">{{ item.createdAt | date:'HH:mm dd/MM/yyyy' }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

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
    
    /* Notification container and button */
    .notification-container {
      position: relative;
      display: inline-block;
    }
    .notification-btn {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      color: #64748b;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      position: relative;
      transition: all 0.2s ease;
      padding: 0;
    }
    .notification-btn:hover {
      background: #fff0f6;
      color: #c20067;
      border-color: #f8bbd0;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(194, 0, 103, 0.08);
    }
    .notification-btn svg {
      width: 18px;
      height: 18px;
    }
    .notification-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: #ef4444;
      color: #ffffff;
      font-size: 0.65rem;
      font-weight: 800;
      min-width: 16px;
      height: 16px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
      border: 2px solid #ffffff;
      box-shadow: 0 2px 5px rgba(239, 68, 68, 0.4);
      animation: pulse-ring-badge 2s infinite;
    }

    @keyframes pulse-ring-badge {
      0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
      70% { box-shadow: 0 0 0 5px rgba(239, 68, 68, 0); }
      100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
    }

    /* Notification Dropdown */
    .notification-dropdown {
      position: absolute;
      top: 48px;
      right: -80px;
      width: 320px;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.02);
      border: 1px solid #f1f5f9;
      z-index: 1010;
      overflow: hidden;
      animation: fadeInDropdown 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    @keyframes fadeInDropdown {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .dropdown-header {
      padding: 14px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #f1f5f9;
      background: #fafafc;
    }
    .dropdown-header h3 {
      margin: 0;
      font-size: 0.9rem;
      font-weight: 800;
      color: #0f172a;
    }
    .btn-mark-all {
      background: none;
      border: none;
      color: #c20067;
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 6px;
      transition: background 0.15s;
    }
    .btn-mark-all:hover {
      background: #fff0f6;
    }

    .dropdown-body {
      max-height: 360px;
      overflow-y: auto;
    }

    /* Scrollbar */
    .dropdown-body::-webkit-scrollbar {
      width: 5px;
    }
    .dropdown-body::-webkit-scrollbar-track {
      background: transparent;
    }
    .dropdown-body::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 4px;
    }

    .no-notifications {
      padding: 40px 20px;
      text-align: center;
      color: #94a3b8;
    }
    .no-notifications svg {
      width: 32px;
      height: 32px;
      margin-bottom: 8px;
      opacity: 0.4;
    }
    .no-notifications p {
      margin: 0;
      font-size: 0.8rem;
      font-weight: 500;
    }

    /* Notification Items */
    .notification-list {
      display: flex;
      flex-direction: column;
    }
    .notification-item {
      padding: 14px 18px;
      display: flex;
      gap: 10px;
      border-bottom: 1px solid #f8fafc;
      cursor: pointer;
      position: relative;
      transition: background 0.15s;
      text-align: left;
    }
    .notification-item:last-child {
      border-bottom: none;
    }
    .notification-item:hover {
      background: #f8fafc;
    }
    .notification-item.unread {
      background: #fff8fb;
    }
    .notification-item.unread:hover {
      background: #fff0f6;
    }
    
    .item-badge-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #c20067;
      margin-top: 5px;
      flex-shrink: 0;
    }
    
    .item-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .item-title {
      font-size: 0.825rem;
      font-weight: 700;
      color: #0f172a;
    }
    .notification-item.unread .item-title {
      color: #c20067;
    }
    .item-message {
      font-size: 0.775rem;
      color: #475569;
      line-height: 1.4;
    }
    .item-time {
      font-size: 0.7rem;
      color: #94a3b8;
      font-weight: 500;
      margin-top: 2px;
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
  realtimeNotification = inject(RealtimeNotificationService);

  showDropdown = signal(false);
  notifications = this.realtimeNotification.notifications;
  unreadCount = this.realtimeNotification.unreadCount;

  isAdmin = computed(() => this.authService.getRole() === 'ADMIN' || this.authService.getRole() === 'ROLE_ADMIN');

  @HostListener('document:click')
  onDocumentClick(): void {
    this.showDropdown.set(false);
  }

  toggleDropdown(event: Event): void {
    event.stopPropagation();
    this.showDropdown.update(v => !v);
  }

  markAsRead(item: NotificationItem, event: Event): void {
    event.stopPropagation();
    this.realtimeNotification.markAsRead(item);
  }

  markAllAsRead(event: Event): void {
    event.stopPropagation();
    this.realtimeNotification.markAllAsRead();
  }

  getDisplayName(): string {
    const user = this.authService.getUsername();
    if (!user) return 'User';
    return user.split('@')[0];
  }

  logout(): void {
    this.authService.logout();
  }
}
