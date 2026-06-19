import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthService } from './auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  const authService = {
    hasPermission: jest.fn(),
    isAuthenticated: jest.fn(),
  };

  beforeEach(() => {
    authService.isAuthenticated.mockReset();
    authService.hasPermission.mockReset();

    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: authService }],
    });
  });

  it('should allow authenticated users', () => {
    authService.isAuthenticated.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );

    expect(result).toBe(true);
  });

  it('should redirect unauthenticated users to login', () => {
    authService.isAuthenticated.mockReturnValue(false);
    const router = TestBed.inject(Router);

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );

    expect(router.serializeUrl(result as ReturnType<Router['createUrlTree']>)).toBe('/login');
  });

  it('should allow authenticated users with the required permission', () => {
    authService.isAuthenticated.mockReturnValue(true);
    authService.hasPermission.mockReturnValue(true);
    const route = { data: { permission: 'ROLE_MANAGE' } } as unknown as ActivatedRouteSnapshot;

    const result = TestBed.runInInjectionContext(() =>
      authGuard(route, {} as RouterStateSnapshot),
    );

    expect(result).toBe(true);
    expect(authService.hasPermission).toHaveBeenCalledWith('ROLE_MANAGE');
  });

  it('should redirect authenticated users without the required permission', () => {
    authService.isAuthenticated.mockReturnValue(true);
    authService.hasPermission.mockReturnValue(false);
    const router = TestBed.inject(Router);
    const route = { data: { permission: 'ROLE_MANAGE' } } as unknown as ActivatedRouteSnapshot;

    const result = TestBed.runInInjectionContext(() =>
      authGuard(route, {} as RouterStateSnapshot),
    );

    expect(router.serializeUrl(result as ReturnType<Router['createUrlTree']>)).toBe('/dashboard');
  });
});
