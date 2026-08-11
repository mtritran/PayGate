import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { User, UserService } from '../user.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule
  ],
  template: `
    <div class="console-page">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-title-group">
          <h2>User Account Management</h2>
          <p class="header-subtitle">Manage system user accounts, assigned roles, and active statuses (ROLE_ADMIN required).</p>
        </div>
        <a mat-raised-button class="btn-primary" routerLink="/users/new">
          <mat-icon class="btn-icon">person_add</mat-icon> New User
        </a>
      </div>

      <!-- Main Content Card / Table -->
      <div class="table-card">
        <div *ngIf="loading" class="loading-box">
          <mat-spinner diameter="40"></mat-spinner>
        </div>

        <div *ngIf="!loading" class="custom-table-wrapper">
          <table class="paygate-table">
            <thead>
              <tr>
                <th>USER</th>
                <th>USERNAME</th>
                <th>EMAIL ADDRESS</th>
                <th>ASSIGNED ROLE</th>
                <th>STATUS</th>
                <th class="text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let u of users">
                <td>
                  <div class="user-cell">
                    <div class="user-avatar" [class.admin]="u.role === 'ADMIN' || u.role === 'ROLE_ADMIN'">
                      {{ u.username.substring(0, 2).toUpperCase() }}
                    </div>
                    <div>
                      <div class="font-bold">{{ u.fullName || u.username }}</div>
                      <div class="text-muted text-xs">ID: #{{ u.id }}</div>
                    </div>
                  </div>
                </td>
                <td><span class="font-mono font-bold">{{ u.username }}</span></td>
                <td>{{ u.email }}</td>
                <td>
                  <span [class.role-admin]="u.role === 'ADMIN' || u.role === 'ROLE_ADMIN'" class="role-pill">
                    {{ u.role }}
                  </span>
                </td>
                <td>
                  <span [class.active]="u.active" [class.inactive]="!u.active" class="status-pill">
                    {{ u.active ? 'ACTIVE' : 'INACTIVE' }}
                  </span>
                </td>
                <td class="text-right">
                  <a mat-icon-button class="btn-icon-action" [routerLink]="['/users', u.id, 'edit']" title="Edit User">
                    <mat-icon class="icon-action">edit</mat-icon>
                  </a>
                  <button mat-icon-button class="btn-icon-action delete" (click)="onDelete(u)" title="Delete User">
                    <mat-icon class="icon-action">delete</mat-icon>
                  </button>
                </td>
              </tr>

              <tr *ngIf="users.length === 0">
                <td colspan="6" class="text-center py-6 text-muted">
                  No users found in database.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination Bar -->
        <div class="pagination-bar">
          <span class="page-info">Showing page {{ currentPage + 1 }} of {{ totalPages || 1 }} ({{ totalElements }} users)</span>
          <div class="page-buttons">
            <button mat-button class="btn-page" [disabled]="currentPage === 0 || loading" (click)="changePage(currentPage - 1)">Previous</button>
            <button mat-button class="btn-page" [disabled]="currentPage >= totalPages - 1 || loading" (click)="changePage(currentPage + 1)">Next</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .console-page { display: flex; flex-direction: column; gap: 20px; padding: 4px; }
    
    .page-header {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .header-title-group h2 { margin: 0; font-size: 1.4rem; font-weight: 800; color: #0f172a; }
    .header-subtitle { margin: 4px 0 0 0; color: #64748b; font-size: 0.85rem; }

    .btn-primary {
      background-color: #4f46e5;
      color: #ffffff;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.85rem;
      height: 38px;
      padding: 0 16px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .btn-primary:hover { background-color: #4338ca; }
    .btn-icon { font-size: 18px; width: 18px; height: 18px; }

    .table-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); overflow: hidden; }
    .loading-box { display: flex; justify-content: center; padding: 40px; }

    .custom-table-wrapper { overflow-x: auto; }
    .paygate-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.875rem; }
    .paygate-table th { padding: 14px 18px; font-size: 0.72rem; font-weight: 700; color: #64748b; border-bottom: 1px solid #e2e8f0; background: #f8fafc; letter-spacing: 0.04em; }
    .paygate-table td { padding: 16px 18px; border-bottom: 1px solid #f1f5f9; color: #1e293b; }
    
    .user-cell { display: flex; align-items: center; gap: 12px; }
    .user-avatar {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: #e2e8f0;
      color: #334155;
      font-weight: 800;
      font-size: 0.8rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .user-avatar.admin { background: #e0e7ff; color: #4338ca; }

    .role-pill { display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 700; background: #f1f5f9; color: #475569; }
    .role-pill.role-admin { background: #e0e7ff; color: #4338ca; }
    
    .status-pill { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; }
    .status-pill.active { background-color: #dcfce7; color: #15803d; }
    .status-pill.inactive { background-color: #fee2e2; color: #b91c1c; }

    .btn-icon-action { color: #64748b; }
    .btn-icon-action:hover { color: #4338ca; background: #eef2ff; }
    .btn-icon-action.delete:hover { color: #dc2626; background: #fef2f2; }
    .icon-action { font-size: 18px; width: 18px; height: 18px; }

    .pagination-bar { padding: 14px 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
    .page-info { font-size: 0.8rem; color: #64748b; }
    .page-buttons { display: flex; gap: 8px; }
    .btn-page { border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.8rem; height: 32px; color: #334155; }
    
    .font-mono { font-family: monospace; }
    .font-bold { font-weight: 700; color: #0f172a; }
    .text-muted { color: #64748b; }
    .text-xs { font-size: 0.75rem; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .py-6 { padding-top: 24px; padding-bottom: 24px; }
  `]
})
export class UserListComponent implements OnInit {
  users: User[] = [];
  loading = false;

  currentPage = 0;
  pageSize = 10;
  totalPages = 0;
  totalElements = 0;

  constructor(
    private userService: UserService,
    private notification: NotificationService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.userService.getAll(this.currentPage, this.pageSize).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success && res.data) {
          this.users = res.data.content;
          this.totalPages = res.data.totalPages;
          this.totalElements = res.data.totalElements;
        }
      },
      error: () => {
        this.loading = false;
        this.notification.error('Failed to load users');
      }
    });
  }

  changePage(page: number): void {
    this.currentPage = page;
    this.loadUsers();
  }

  onDelete(user: User): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Delete User', message: `Are you sure you want to delete "${user.username}"?` }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.userService.delete(user.id).subscribe({
          next: () => {
            this.notification.success('User deleted');
            this.loadUsers();
          },
          error: () => this.notification.error('Failed to delete user')
        });
      }
    });
  }
}
