import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const router = {
    navigateByUrl: jest.fn(),
  };

  beforeEach(() => {
    localStorage.clear();
    router.navigateByUrl.mockClear();

    TestBed.configureTestingModule({
      providers: [{ provide: Router, useValue: router }],
    });
  });

  it('should start unauthenticated when no stored session exists', () => {
    const service = TestBed.inject(AuthService);

    expect(service.isAuthenticated()).toBe(false);
  });

  it('should simulate login and navigate to dashboard', () => {
    const service = TestBed.inject(AuthService);

    service.login();

    expect(service.isAuthenticated()).toBe(true);
    expect(localStorage.getItem('admin-portal.authenticated')).toBe('true');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });

  it('should clear simulated auth state on logout', () => {
    const service = TestBed.inject(AuthService);

    service.login();
    service.logout();

    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('admin-portal.authenticated')).toBeNull();
    expect(router.navigateByUrl).toHaveBeenLastCalledWith('/login');
  });
});
