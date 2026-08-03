import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map } from 'rxjs/operators';

export const authGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Attempt silent refresh via HttpOnly refresh_token cookie before denying access
  return authService.trySilentRefresh().pipe(
    map((isSuccess) => {
      if (isSuccess) {
        return true;
      }
      router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    })
  );
};

export const userOnlyGuard: CanActivateFn = () => {
  const router = inject(Router);
  const authService = inject(AuthService);

  if (authService.isAdmin()) {
    router.navigate(['/admin/dashboard']);
    return false;
  }

  return true;
};
