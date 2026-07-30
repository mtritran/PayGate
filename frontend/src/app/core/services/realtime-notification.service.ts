import { Injectable, signal, inject, EffectRef, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { AuthService } from './auth.service';
import { NotificationService as ToastService } from './notification.service';

export interface NotificationItem {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class RealtimeNotificationService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private toast = inject(ToastService);
  private apiUrl = `${environment.apiUrl}/notifications`;

  // Signals for state management
  notifications = signal<NotificationItem[]>([]);
  unreadCount = signal<number>(0);
  connected = signal<boolean>(false);

  private socket: WebSocket | null = null;
  private reconnectTimeout: any = null;

  constructor() {
    // Automatically manage connection state based on authentication state
    effect(() => {
      const isAuth = this.authService.isAuthenticated();
      if (isAuth) {
        this.connect();
        this.loadInitialData();
      } else {
        this.disconnect();
      }
    }, { allowSignalWrites: true });
  }

  loadInitialData(): void {
    if (!this.authService.isAuthenticated()) return;

    // Fetch latest 20 notifications
    this.http.get<ApiResponse<NotificationItem[]>>(`${this.apiUrl}/latest`).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.notifications.set(res.data);
        }
      }
    });

    // Fetch unread count
    this.http.get<ApiResponse<number>>(`${this.apiUrl}/unread-count`).subscribe({
      next: (res) => {
        if (res.success && res.data !== undefined) {
          this.unreadCount.set(res.data);
        }
      }
    });
  }

  connect(): void {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const token = this.authService.getToken();
    if (!token) return;

    this.disconnect();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/notifications?token=${token}`;

    console.log('[WEBSOCKET] Connecting to:', wsUrl);
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      console.log('[WEBSOCKET] Connected successfully');
      this.connected.set(true);
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
    };

    this.socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.event === 'NEW_NOTIFICATION' && msg.data) {
          const item: NotificationItem = msg.data;
          
          // Prepend to notifications list signal
          this.notifications.update((list) => [item, ...list.slice(0, 19)]);
          
          // Increment unread count
          this.unreadCount.update((count) => count + 1);

          // Show UI Toast Notification
          this.toast.info(`🔔 ${item.title}: ${item.message}`);
        }
      } catch (err) {
        console.error('[WEBSOCKET] Error parsing message:', err);
      }
    };

    this.socket.onclose = (event) => {
      console.log('[WEBSOCKET] Connection closed', event);
      this.connected.set(false);
      this.socket = null;

      // Reconnect if still authenticated
      if (this.authService.isAuthenticated()) {
        this.scheduleReconnect();
      }
    };

    this.socket.onerror = (err) => {
      console.error('[WEBSOCKET] Socket error:', err);
    };
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.connected.set(false);
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) return;
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      if (this.authService.isAuthenticated()) {
        console.log('[WEBSOCKET] Attempting reconnect...');
        this.connect();
      }
    }, 5000);
  }

  markAsRead(item: NotificationItem): void {
    if (item.read) return;

    this.http.post<ApiResponse<void>>(`${this.apiUrl}/${item.id}/read`, {}).subscribe({
      next: (res) => {
        if (res.success) {
          // Update item state locally
          this.notifications.update((list) => 
            list.map(n => n.id === item.id ? { ...n, read: true } : n)
          );
          // Decrement unread count
          this.unreadCount.update((count) => Math.max(0, count - 1));
        }
      }
    });
  }

  markAllAsRead(): void {
    if (this.unreadCount() === 0) return;

    this.http.post<ApiResponse<void>>(`${this.apiUrl}/read-all`, {}).subscribe({
      next: (res) => {
        if (res.success) {
          // Update all local items state
          this.notifications.update((list) => 
            list.map(n => ({ ...n, read: true }))
          );
          this.unreadCount.set(0);
          this.toast.success('Đã đánh dấu đọc tất cả thông báo');
        }
      }
    });
  }
}
