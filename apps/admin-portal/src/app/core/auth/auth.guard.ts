import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivateChildFn,
  CanActivateFn,
  Router,
  UrlTree,
} from '@angular/router';
import { AuthService } from './auth.service';

const authorize = (route?: ActivatedRouteSnapshot): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  const requiredPermission = route?.data?.['permission'] as string | undefined;
  if (requiredPermission && !authService.hasPermission(requiredPermission)) {
    return router.createUrlTree(['/dashboard']);
  }

  return true;
};

export const authGuard: CanActivateFn = (route) => authorize(route);
export const authChildGuard: CanActivateChildFn = (route) => authorize(route);
