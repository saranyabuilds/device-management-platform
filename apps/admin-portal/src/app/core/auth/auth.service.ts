import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';

export interface AdminUser {
  readonly displayName: string;
  readonly email: string;
}

const AUTH_STORAGE_KEY = 'admin-portal.authenticated';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);
  private readonly authenticatedSubject = new BehaviorSubject<boolean>(this.readStoredState());
  private readonly currentUserSubject = new BehaviorSubject<AdminUser | null>(
    this.readStoredState() ? { displayName: 'Admin User', email: 'admin@example.com' } : null,
  );

  readonly authenticated$: Observable<boolean> = this.authenticatedSubject.asObservable();
  readonly currentUser$: Observable<AdminUser | null> = this.currentUserSubject.asObservable();

  isAuthenticated(): boolean {
    return this.authenticatedSubject.value;
  }

  login(): void {
    localStorage.setItem(AUTH_STORAGE_KEY, 'true');
    this.authenticatedSubject.next(true);
    this.currentUserSubject.next({ displayName: 'Admin User', email: 'admin@example.com' });
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

  private readStoredState(): boolean {
    return localStorage.getItem(AUTH_STORAGE_KEY) === 'true';
  }
}
