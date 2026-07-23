import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const token = authService.getToken();

  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Avoid infinite refresh loops for auth endpoints
        if (req.url.includes('/auth/login') || req.url.includes('/auth/register') || req.url.includes('/auth/refresh')) {
          authService.clearTokens();
          router.navigate(['/login']);
          return throwError(() => error);
        }

        return handle401Error(authReq, next, authService, router, error);
      }
      return throwError(() => error);
    })
  );
};

function handle401Error(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService,
  router: Router,
  error: HttpErrorResponse
): Observable<HttpEvent<unknown>> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    const refreshToken = authService.getRefreshToken();

    if (refreshToken) {
      return authService.refreshToken(refreshToken).pipe(
        switchMap((res) => {
          isRefreshing = false;
          if (res.success && res.data && res.data.accessToken) {
            refreshTokenSubject.next(res.data.accessToken);
            return next(
              req.clone({
                setHeaders: { Authorization: `Bearer ${res.data.accessToken}` }
              })
            );
          }
          authService.clearTokens();
          router.navigate(['/login']);
          return throwError(() => error);
        }),
        catchError((refreshErr) => {
          isRefreshing = false;
          authService.clearTokens();
          router.navigate(['/login']);
          return throwError(() => refreshErr);
        })
      );
    } else {
      isRefreshing = false;
      authService.clearTokens();
      router.navigate(['/login']);
      return throwError(() => error);
    }
  } else {
    // If a refresh is already in progress, wait for the new access token
    return refreshTokenSubject.pipe(
      filter(t => t !== null),
      take(1),
      switchMap((newJwt) => {
        return next(
          req.clone({
            setHeaders: { Authorization: `Bearer ${newJwt}` }
          })
        );
      })
    );
  }
}
