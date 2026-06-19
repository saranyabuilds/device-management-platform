import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';

export interface AdminUser {
  readonly displayName: string;
  readonly email: string;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
}

const AUTH_STORAGE_KEY = 'admin-portal.session';
const SUPER_ADMIN_USER: AdminUser = {
  displayName: 'Platform Admin',
  email: 'admin@example.com',
  roles: ['SUPER_ADMIN', 'ADMIN'],
  permissions: [
    'DEVICE_READ',
    'DEVICE_WRITE',
    'USER_READ',
    'USER_WRITE',
    'ROLE_MANAGE',
    'AUDIT_READ',
  ],
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);
  private readonly currentUserSubject = new BehaviorSubject<AdminUser | null>(this.readStoredUser());
  private readonly authenticatedSubject = new BehaviorSubject<boolean>(
    this.currentUserSubject.value !== null,
  );

  readonly authenticated$: Observable<boolean> = this.authenticatedSubject.asObservable();
  readonly currentUser$: Observable<AdminUser | null> = this.currentUserSubject.asObservable();

  isAuthenticated(): boolean {
    return this.authenticatedSubject.value;
  }

  hasPermission(permission: string): boolean {
    return this.currentUserSubject.value?.permissions.includes(permission) ?? false;
  }

  login(): void {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(SUPER_ADMIN_USER));
    this.authenticatedSubject.next(true);
    this.currentUserSubject.next(SUPER_ADMIN_USER);
    void this.router.navigateByUrl('/dashboard');
  }

  logout(redirectToLogin = true): void {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    this.authenticatedSubject.next(false);
    this.currentUserSubject.next(null);

    if (redirectToLogin) {
      void this.router.navigateByUrl('/login');
    }
  }

  private readStoredUser(): AdminUser | null {
    const storedSession = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!storedSession) {
      return null;
    }

    try {
      return JSON.parse(storedSession) as AdminUser;
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
  }
}
