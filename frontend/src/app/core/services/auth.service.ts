import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  username: string;
  role: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient, private router: Router) {
    // Purge any legacy refresh_token from localStorage upon app initialization
    localStorage.removeItem('refresh_token');
  }

  login(credentials: { username: string; password: string }): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/login`, credentials, { withCredentials: true }).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.storeTokens(res.data);
        }
      })
    );
  }

  register(data: { username: string; email: string; password: string; fullName: string }): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/register`, data, { withCredentials: true }).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.storeTokens(res.data);
        }
      })
    );
  }

  /**
   * Refreshes Access Token on-demand when 401 occurs.
   * Browser automatically transmits the HttpOnly Cookie.
   */
  refreshToken(): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/refresh`, {}, { withCredentials: true }).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.storeTokens(res.data);
        }
      })
    );
  }

  logout(): void {
    this.http.post(`${this.apiUrl}/logout`, {}, { withCredentials: true }).pipe(
      catchError(() => of(null))
    ).subscribe(() => {
      this.clearTokens();
      this.router.navigate(['/login']);
    });
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  getUsername(): string | null {
    return localStorage.getItem('username');
  }

  getRole(): string | null {
    return localStorage.getItem('role');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  clearTokens(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
  }

  private storeTokens(auth: AuthResponse): void {
    // Ensure refresh_token is NEVER stored in localStorage
    localStorage.removeItem('refresh_token');

    if (auth.accessToken) {
      localStorage.setItem('access_token', auth.accessToken);
    }
    if (auth.username) {
      localStorage.setItem('username', auth.username);
    }
    if (auth.role) {
      localStorage.setItem('role', auth.role);
    }
  }
}
